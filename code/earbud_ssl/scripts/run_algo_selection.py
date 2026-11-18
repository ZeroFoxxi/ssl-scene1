"""算法选型（T4）：两耳组阵下的候选测向方法 + 音视频融合，说话人固定、头部不动。

场景：目标在前方 ±60°（1–2 m），开口前 0.5 s 不说话；2 个干扰说话人全程说话（任意方位，1.5–3 m）；
扩散噪声 + 混响；视野内另有 1 个不说话的旁人。开口时刻由唇动给出（含 ±0.1 s 误差）。
判决：开口后 0.5 s。视觉为按假设模拟。

用法：python scripts/run_algo_selection.py [--trials 120]
"""
import argparse, csv, json, os, sys, time
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from earbud_ssl.sphere import sphere_tf, earbud_mics, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import stft, ltas, render_source, diffuse_noise, NFFT, HOP
from earbud_ssl import methods as M
from run_min_validation import load_speech, pick_segment, angdiff, wrap

FS = 16000
OUT = os.path.join(ROOT, "out")
CONDS = {  # 名称: (RT60, 目标 DRR dB, SNR dB, 干扰人数, 每个干扰的 SIR dB)
    "S1 混响，无干扰说话人": (0.5, 0.0, 10.0, 0, None),
    "S2 混响 + 2 个干扰（SIR 6 dB）": (0.5, 0.0, 10.0, 2, 6.0),
    "S3 强混响 + 嘈杂 + 2 个干扰（SIR 6 dB）": (0.8, -3.0, 5.0, 2, 6.0),
    "S4 混响 + 2 个干扰（SIR 0 dB）": (0.5, 0.0, 10.0, 2, 0.0),
}
VIS = {"fov": 70.0, "az_sigma": 2.0, "p_detect": 0.95, "lip_err": 0.10}
ACOUSTIC = ["SRP-PHAT", "SRP-PHAT 5° 网格", "SRP-PHAT + 起始段加权", "MUSIC", "GEVD-MUSIC + 起始段加权", "GEVD-MUSIC 5° 网格"]
FUSED = ["仅视觉（唇动最高的人脸）", "SRP-PHAT + 视觉", "GEVD-MUSIC + 视觉（硬规则）", "GEVD-MUSIC 5° + 视觉（软融合）"]
SOFT = {"lam": 0.1, "mu": 0.05}  # 在开发种子 7 上调得（scripts/tune_fusion.py），评测种子为 1


def place(rng, n, taken, lo=-180, hi=180, sep=20):
    out = []
    while len(out) < n:
        a = rng.uniform(lo, hi)
        if all(angdiff(a, b) >= sep for b in taken + out):
            out.append(float(a))
    return out


def lip_score(rng, speaking):
    wrong = rng.random() < VIS["lip_err"]
    hi = speaking != wrong
    return float(rng.uniform(0.6, 1.0) if hi else rng.uniform(0.0, 0.4))


def run_trial(rng, cond, ctx):
    rt60, drr, snr, n_int, sir = cond
    freqs, mics, H_diff, speech, psd = ctx["freqs"], ctx["mics"], ctx["H_diff"], ctx["speech"], ctx["psd"]
    n_tot = int(1.5 * FS)
    az_t = rng.uniform(-60, 60); d_t = rng.uniform(1.0, 2.0)
    sig_t = np.zeros(n_tot); sig_t[int(0.5 * FS):] = pick_segment(speech, n_tot - int(0.5 * FS), rng)
    S_t = stft(sig_t)
    tgt = render_source(S_t, sphere_tf(azimuth_points([az_t], d_t), mics, freqs)[0], H_diff, rng, rt60, drr)
    act = np.abs(S_t).sum(0) > 0
    p_dir = np.mean(np.abs(ctx_direct(S_t, az_t, d_t, ctx)[:, :, act]) ** 2)
    y = tgt.copy()
    az_i = place(rng, n_int, [az_t])
    for a in az_i:
        d_i = rng.uniform(1.5, 3.0)
        S_i = stft(pick_segment(speech, n_tot, rng))
        H_i = sphere_tf(azimuth_points([a], d_i), mics, freqs)[0]
        p_i = np.mean(np.abs(H_i[:, :, None] * S_i[None]) ** 2)
        S_i = S_i * np.sqrt(p_dir / p_i * 10 ** (-sir / 10))
        y += render_source(S_i, H_i, H_diff, rng, rt60, drr - 20 * np.log10(d_i / d_t))
    noise = diffuse_noise(H_diff, y.shape[2], rng, psd)
    p_s = np.mean(np.abs(tgt[:, :, act]) ** 2)
    y += noise * np.sqrt(p_s / np.mean(np.abs(noise) ** 2) * 10 ** (-snr / 10))

    # 视觉：目标、视野内的干扰说话人、1 个不说话的旁人
    faces = []
    bystander = place(rng, 1, [az_t] + az_i, -60, 60)[0]
    for a, speaking in [(az_t, True)] + [(a, True) for a in az_i] + [(bystander, False)]:
        if abs(a) <= VIS["fov"] and rng.random() < VIS["p_detect"]:
            faces.append((a + rng.normal(0, VIS["az_sigma"]), lip_score(rng, speaking)))

    # 开口时刻（唇动给出，±0.1 s 误差）→ 判决窗与背景段
    k_on = int(round((0.5 + rng.uniform(-0.1, 0.1)) * FS / HOP))
    n_win = 1 + (int(0.5 * FS) - NFFT) // HOP
    Yd = y[:, :, k_on : k_on + n_win]
    Yb = y[:, :, : max(4, k_on - int(0.15 * FS / HOP))]
    return az_t, Yd, Yb, faces


def ctx_direct(S, az, d, ctx):
    return sphere_tf(azimuth_points([az], d), ctx["mics"], ctx["freqs"])[0][:, :, None] * S[None]


def estimate(Yd, Yb, faces, ctx, timing):
    fm, G, G5 = ctx["fmask"], ctx["grid"], ctx["grid5"]
    Hg, Hg5 = ctx["Hgrid"], ctx["Hgrid5"]
    e = M.frame_energy_db(Yd, fm)
    w_floor = M.floor_weights(e, e.max() - 30)
    w_on = M.onset_weights(e, e.max() - 30)
    est, spec = {}, {}

    def timed(name, fn):
        t = time.perf_counter(); r = fn(); timing.setdefault(name, []).append(time.perf_counter() - t); return r

    spec["SRP-PHAT"] = timed("SRP-PHAT", lambda: M.srp_phat(Yd, Hg, fm, w_floor))
    est["SRP-PHAT"] = M.peak(spec["SRP-PHAT"], G)
    p5 = timed("SRP-PHAT 5° 网格", lambda: M.srp_phat(Yd, Hg5, fm, w_floor))
    est["SRP-PHAT 5° 网格"] = M.peak(p5, G5, 5.0)
    p = timed("SRP-PHAT + 起始段加权", lambda: M.srp_phat(Yd, Hg, fm, w_on))
    est["SRP-PHAT + 起始段加权"] = M.peak(p, G)
    p = timed("MUSIC", lambda: M.music(M.covariance(Yd, fm, w_floor), Hg, fm))
    est["MUSIC"] = M.peak(p, G)
    Rb = M.covariance(Yb, fm, np.ones(Yb.shape[2]))
    spec["GEVD"] = timed("GEVD-MUSIC + 起始段加权", lambda: M.music(M.covariance(Yd, fm, w_on), Hg, fm, Rb))
    est["GEVD-MUSIC + 起始段加权"] = M.peak(spec["GEVD"], G)
    spec["GEVD5"] = timed("GEVD-MUSIC 5° 网格", lambda: M.music(M.covariance(Yd, fm, w_on), Hg5, fm, Rb))
    est["GEVD-MUSIC 5° 网格"] = M.peak(spec["GEVD5"], G5, 5.0)
    est["仅视觉（唇动最高的人脸）"] = max(faces, key=lambda f: f[1])[0] if faces else float("nan")
    est["SRP-PHAT + 视觉"] = M.fuse_with_faces(spec["SRP-PHAT"], G, faces)
    est["GEVD-MUSIC + 视觉（硬规则）"] = M.fuse_with_faces(spec["GEVD"], G, faces)
    est["GEVD-MUSIC 5° + 视觉（软融合）"] = M.fuse_soft(spec["GEVD5"], G5, faces, **SOFT)
    return est


def summarize(rows, names):
    out = {}
    for m in names:
        est = np.array([r[m] for r in rows], float); tru = np.array([r["truth"] for r in rows])
        err = np.where(np.isnan(est), 180.0, angdiff(est, tru))
        out[m] = {"acc10": float(np.mean(err <= 10)), "acc5": float(np.mean(err <= 5)),
                  "gross30": float(np.mean(err > 30)), "mae": float(np.mean(err)), "n": len(rows)}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=120)
    ap.add_argument("--seed", type=int, default=1)
    args = ap.parse_args()
    rng = np.random.default_rng(args.seed)
    t0 = time.time()
    freqs = np.fft.rfftfreq(NFFT, 1 / FS)
    mics = earbud_mics()
    grid = np.arange(-180, 180, 1.0)
    Hgrid = sphere_tf(azimuth_points(grid, 1.5), mics, freqs)
    speech = load_speech()
    ctx = {"freqs": freqs, "mics": mics, "fmask": (freqs >= 200) & (freqs <= 7000), "grid": grid, "Hgrid": Hgrid,
           "grid5": grid[::5], "Hgrid5": Hgrid[::5], "H_diff": sphere_tf(fibonacci_sphere(32, 2.0), mics, freqs),
           "speech": speech, "psd": ltas(speech, FS)}
    rows, timing = [], {}
    for cname, cond in CONDS.items():
        for _ in range(args.trials):
            az, Yd, Yb, faces = run_trial(rng, cond, ctx)
            rows.append({"cond": cname, "truth": az, "n_faces": len(faces), **estimate(Yd, Yb, faces, ctx, timing)})
        print(f"{cname} 完成，用时 {time.time() - t0:.0f} s", flush=True)

    names = ACOUSTIC + FUSED
    summary = {"setup": {"scene": __doc__.strip().splitlines()[2:4], "conditions": {k: list(v) for k, v in CONDS.items()},
                         "vision": VIS, "decision_window_s": 0.5, "trials_per_condition": args.trials,
                         "fusion": {"hard": {"lip_thr": 0.5, "gate_deg": 8.0}, "soft": {**SOFT, "gate_deg": 8.0, "tuned_on": "seed 7（开发集）"}}, "gevd_loading": 1e-2,
                         "note": "除软融合的 lam、mu 在开发种子上调过外，参数均按场景一沿用或事先设定；均未在评测数据上调参"},
               "results": {c: summarize([r for r in rows if r["cond"] == c], names) for c in CONDS},
               "python_ms_per_decision": {k: float(np.mean(v) * 1000) for k, v in timing.items()}}
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "algo_selection_trials.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    with open(os.path.join(OUT, "algo_selection_summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=1)
    lines = [f"算法选型（每条件 {args.trials} 次，开口后 0.5 s 判决），用时 {time.time() - t0:.0f} s", ""]
    for c, res in summary["results"].items():
        lines.append(c)
        for m in names:
            r = res[m]
            lines.append(f"  {m:<16s} ≤10°: {r['acc10']*100:5.1f}%  ≤5°: {r['acc5']*100:5.1f}%  >30°: {r['gross30']*100:5.1f}%  平均误差 {r['mae']:5.1f}°")
    lines.append("")
    lines.append("Python 每次判决耗时（ms，仅作相对比较）")
    for k, v in summary["python_ms_per_decision"].items():
        lines.append(f"  {k:<16s} {v:6.1f}")
    txt = "\n".join(lines)
    print(txt)
    with open(os.path.join(OUT, "algo_selection_log.txt"), "w", encoding="utf-8") as f:
        f.write(txt + "\n")


if __name__ == "__main__":
    main()
