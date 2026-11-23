"""耳间转发的 1 路音频经过编码后，对测向有多大影响（阵列 2+1：主耳 2 路 + 副耳转发 1 路）。

做法：场景同算法选型 S2、S4（混响 + 2 个干扰说话人，1.5 s，目标 0.5 s 开口）。STFT 域仿真后逆变换回时域，
3 路统一按 16 bit 量化（副耳那一路的均方根设为 −30 dBFS，三路同一增益），只对副耳那一路做编码 → 解码，
再变换回 STFT 域，用 GEVD-MUSIC（起始段加权，5° 网格）和软融合测向。各编码用同一批场景。

编码（ffmpeg 实现）：
  PCM 16 bit（256 kbps，参照）
  IMA ADPCM 4 bit（64 kbps，adpcm_ima_wav）
  G.722（64 kbps，子带 ADPCM）
  Opus 32 kbps（感知编码；LC3 在当前环境无法安装，用 Opus 作同类感知编码的替代，结果仅作参考）
编码器自身的固定时延用白噪声探测后按整数样点补偿（实际系统中该时延已知、可补偿）。

用法：python scripts/run_codec.py [--trials 200] [--seed 21]
"""
import argparse, json, os, subprocess, sys, tempfile, time
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_algo_selection as RA
from earbud_ssl import methods as M
from earbud_ssl.sphere import sphere_tf, earbud_mic_set, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import ltas, stft, render_source, diffuse_noise, NFFT, HOP
from run_min_validation import angdiff

FS = 16000
FWD = 2                       # 副耳转发的那一路（右前）
LEVEL_DBFS = -30.0
CONDS = ["S2 混响 + 2 个干扰（SIR 6 dB）", "S4 混响 + 2 个干扰（SIR 0 dB）"]
CODECS = {
    "PCM 16 bit": None,
    "IMA ADPCM 4 bit（64 kbps）": (["-c:a", "adpcm_ima_wav"], "wav"),
    "G.722（64 kbps）": (["-c:a", "g722"], "wav"),
    "Opus 32 kbps（感知编码）": (["-c:a", "libopus", "-b:a", "32k", "-application", "audio", "-frame_duration", "10"], "ogg"),
}


def istft(X, n, nfft=NFFT, hop=HOP):
    """与 sim.stft 配对（汉宁窗，50% 重叠）：逐帧逆变换后重叠相加，再除以窗的叠加。X: (..., F, T)"""
    w = np.hanning(nfft + 1)[:-1]
    fr = np.fft.irfft(np.swapaxes(X, -1, -2), n=nfft, axis=-1)          # (..., T, nfft)
    T = fr.shape[-2]
    out = np.zeros(X.shape[:-2] + (n,)); ws = np.zeros(n)
    for t in range(T):
        out[..., t * hop:t * hop + nfft] += fr[..., t, :]
        ws[t * hop:t * hop + nfft] += w
    return np.where(ws >= 0.5, out / np.maximum(ws, 1e-3), out)   # 首尾不足一帧的地方窗和接近 0，不做除法，避免放大成尖峰


def codec_roundtrip(x16, spec):
    """x16: int16 一维；经 ffmpeg 编码再解码回 16 kHz int16。"""
    args, ext = spec
    with tempfile.TemporaryDirectory() as d:
        src, enc, dec = (os.path.join(d, f) for f in ("in.raw", f"enc.{ext}", "out.raw"))
        x16.astype("<i2").tofile(src)
        base = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
        subprocess.run(base + ["-f", "s16le", "-ar", str(FS), "-ac", "1", "-i", src] + args + [enc], check=True)
        subprocess.run(base + ["-i", enc, "-f", "s16le", "-ar", str(FS), "-ac", "1", dec], check=True)
        return np.fromfile(dec, dtype="<i2")


def codec_delay(spec):
    """白噪声探测编码器的固定时延（整数样点）。"""
    if spec is None:
        return 0
    x = (np.random.default_rng(0).standard_normal(FS) * 3000).astype(np.int16)
    y = codec_roundtrip(x, spec).astype(float)
    L, K = len(x) - 2000, 2000
    y = np.pad(y, (0, max(0, L + K - len(y))))
    c = [np.dot(y[k:k + L], x[:L].astype(float)) for k in range(K)]
    return int(np.argmax(c))


def apply_codec(x, spec, delay):
    """x: float 一维（已按满量程 1.0 归一）。返回同长度 float。"""
    x16 = np.clip(np.round(x * 32767), -32768, 32767).astype(np.int16)
    if spec is None:
        return x16 / 32767.0
    y = codec_roundtrip(x16, spec).astype(float) / 32767.0
    y = y[delay:delay + len(x)]
    return np.pad(y, (0, len(x) - len(y)))


def make_scene(rng, cond, ctx):
    """与 run_algo_selection.run_trial 相同的场景，但返回整段 STFT 与开口帧。"""
    rt60, drr, snr, n_int, sir = cond
    freqs, mics, H_diff, speech, psd = ctx["freqs"], ctx["mics"], ctx["H_diff"], ctx["speech"], ctx["psd"]
    n_tot = int(1.5 * FS)
    az_t = rng.uniform(-60, 60); d_t = rng.uniform(1.0, 2.0)
    sig_t = np.zeros(n_tot); sig_t[int(0.5 * FS):] = RA.pick_segment(speech, n_tot - int(0.5 * FS), rng)
    S_t = stft(sig_t)
    tgt = render_source(S_t, sphere_tf(azimuth_points([az_t], d_t), mics, freqs)[0], H_diff, rng, rt60, drr)
    act = np.abs(S_t).sum(0) > 0
    p_dir = np.mean(np.abs(RA.ctx_direct(S_t, az_t, d_t, ctx)[:, :, act]) ** 2)
    y = tgt.copy()
    az_i = RA.place(rng, n_int, [az_t])
    for a in az_i:
        d_i = rng.uniform(1.5, 3.0)
        S_i = stft(RA.pick_segment(speech, n_tot, rng))
        H_i = sphere_tf(azimuth_points([a], d_i), mics, freqs)[0]
        p_i = np.mean(np.abs(H_i[:, :, None] * S_i[None]) ** 2)
        S_i = S_i * np.sqrt(p_dir / p_i * 10 ** (-sir / 10))
        y += render_source(S_i, H_i, H_diff, rng, rt60, drr - 20 * np.log10(d_i / d_t))
    noise = diffuse_noise(H_diff, y.shape[2], rng, psd)
    p_s = np.mean(np.abs(tgt[:, :, act]) ** 2)
    y += noise * np.sqrt(p_s / np.mean(np.abs(noise) ** 2) * 10 ** (-snr / 10))
    faces = []
    bystander = RA.place(rng, 1, [az_t] + az_i, -60, 60)[0]
    for a, speaking in [(az_t, True)] + [(a, True) for a in az_i] + [(bystander, False)]:
        if abs(a) <= RA.VIS["fov"] and rng.random() < RA.VIS["p_detect"]:
            faces.append((a + rng.normal(0, RA.VIS["az_sigma"]), RA.lip_score(rng, speaking)))
    k_on = int(round((0.5 + rng.uniform(-RA.ONSET_JIT, RA.ONSET_JIT)) * FS / HOP))
    return az_t, y, k_on, faces


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=200)
    ap.add_argument("--seed", type=int, default=21)
    a = ap.parse_args()
    mics = earbud_mic_set("2+1")
    freqs = np.fft.rfftfreq(NFFT, 1 / FS); grid = np.arange(-180, 180, 5.0); fm = (freqs >= 200) & (freqs <= 7000)
    speech = RA.load_speech()
    ctx = {"freqs": freqs, "mics": mics, "H_diff": sphere_tf(fibonacci_sphere(32, 2.0), mics, freqs), "speech": speech, "psd": ltas(speech, FS)}
    Hg = sphere_tf(azimuth_points(grid, 1.5), mics, freqs)
    delays = {k: codec_delay(v) for k, v in CODECS.items()}
    print("编码时延（样点）", delays, flush=True)
    n_win = 1 + (int(0.5 * FS) - NFFT) // HOP
    t0 = time.time(); res = {}; per_trial = {}; snr_db = {k: [] for k in CODECS}
    for c in CONDS:
        rng = np.random.default_rng(a.seed)
        rows = {k: [] for k in CODECS}
        for i in range(a.trials):
            az, Y, k_on, faces = make_scene(rng, RA.CONDS[c], ctx)
            n = HOP * (Y.shape[2] - 1) + NFFT
            x = istft(Y, n)
            g = 10 ** (LEVEL_DBFS / 20) / np.sqrt(np.mean(x[FWD, NFFT:-NFFT] ** 2))   # 电平按中间段计
            x = x * g
            for name, spec in CODECS.items():
                xc = np.stack([apply_codec(x[m], None, 0) if m != FWD else apply_codec(x[m], spec, delays[name]) for m in range(x.shape[0])])
                ref = x[FWD]; err = xc[FWD] - ref
                snr_db[name].append(10 * np.log10(np.sum(ref[NFFT:-NFFT] ** 2) / max(np.sum(err[NFFT:-NFFT] ** 2), 1e-20)))
                Yc = stft(xc)
                Yd = Yc[:, :, k_on:k_on + n_win]; Yb = Yc[:, :, :max(4, k_on - int(0.15 * FS / HOP))]
                e = M.frame_energy_db(Yd, fm)
                p_g = M.music(M.covariance(Yd, fm, M.onset_weights(e, e.max() - 30)), Hg, fm, M.covariance(Yb, fm, np.ones(Yb.shape[2])))
                rows[name].append({"truth": az, "GEVD-MUSIC": M.peak(p_g, grid, 5.0), "GEVD-MUSIC + 视觉": M.fuse_soft(p_g, grid, faces, **RA.SOFT)})
            if (i + 1) % 20 == 0:
                print(f"{c} {i + 1}/{a.trials} {time.time() - t0:.0f} s", flush=True)
        res[c] = {k: RA.summarize(v, ["GEVD-MUSIC", "GEVD-MUSIC + 视觉"]) for k, v in rows.items()}
        for k in CODECS:                                    # 与 PCM 逐段配对：估计方位差多少、对错翻转几次
            for m in ["GEVD-MUSIC", "GEVD-MUSIC + 视觉"]:
                ref = [r[m] for r in rows["PCM 16 bit"]]; est = [r[m] for r in rows[k]]; tru = [r["truth"] for r in rows[k]]
                d = np.array([angdiff(x, y) for x, y in zip(est, ref)])
                okr = np.array([angdiff(x, t) <= 10 for x, t in zip(ref, tru)]); okc = np.array([angdiff(x, t) <= 10 for x, t in zip(est, tru)])
                res[c][k][m].update({"vs_pcm_same_within_2deg_pct": float(np.mean(d <= 2) * 100), "vs_pcm_median_diff_deg": float(np.median(d)),
                                     "right_to_wrong": int(np.sum(okr & ~okc)), "wrong_to_right": int(np.sum(~okr & okc))})
        per_trial[c] = rows
        print(json.dumps({k: {m: round(r["acc10"] * 100, 1) for m, r in v.items()} for k, v in res[c].items()}, ensure_ascii=False), flush=True)
    out = {"setup": {"array": "2+1", "forwarded_channel": FWD, "level_dbfs": LEVEL_DBFS, "trials": a.trials, "seed": a.seed,
                     "codec_delay_samples": delays, "note": "Opus 作为感知编码（如 LC3）的替代"},
           "codec_snr_db_median": {k: float(np.median(v)) for k, v in snr_db.items()},
           "results": res, "elapsed_s": time.time() - t0}
    with open(os.path.join(ROOT, "out", "codec.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    with open(os.path.join(ROOT, "out", "codec_trials.json"), "w", encoding="utf-8") as f:
        json.dump(per_trial, f, ensure_ascii=False)


if __name__ == "__main__":
    main()
