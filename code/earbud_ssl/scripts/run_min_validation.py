"""最小验证：双耳组阵（路线 A）vs 只传参数（路线 B），刚性球头部模型，固定说话人。

用法：python scripts/run_min_validation.py [--reps 2]
输出：out/min_validation_trials.csv、out/min_validation_summary.json、out/min_validation_log.txt、out/fig_min_validation.png
"""
import argparse, csv, json, os, sys, time
import numpy as np
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from earbud_ssl.sphere import sphere_tf, freefield_tf, earbud_mics, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import stft, highpass, ltas, simulate, apply_sync_error, NFFT
from earbud_ssl.doa import estimate_all, ild_model

FS = 16000
DATA = os.path.join(ROOT, "..", "ssl_baseline", "data")
OUT = os.path.join(ROOT, "out")
CONDS = {  # 名称: (RT60 s, DRR dB, SNR dB)
    "C1 安静": (0.0, np.inf, 20.0),
    "C2 嘈杂 SNR 5 dB": (0.0, np.inf, 5.0),
    "C3 混响 RT60 0.5 s": (0.5, 0.0, 10.0),
    "C4 混响+嘈杂 RT60 0.8 s": (0.8, -3.0, 5.0),
}
SYNC_US = [0, 10, 25, 50, 100, 200]


def angdiff(a, b):
    return np.abs((np.asarray(a) - np.asarray(b) + 180) % 360 - 180)


def wrap(a):
    return (np.asarray(a) + 180) % 360 - 180


def load_speech():
    xs = []
    for f in ["speech_zh.wav", "tv_en.wav"]:
        fs, x = wavfile.read(os.path.join(DATA, f))
        assert fs == FS
        xs.append(highpass(x.astype(float) / 32768, FS))
    return np.concatenate(xs)


def pick_segment(x, n, rng):
    while True:
        s = rng.integers(0, len(x) - n)
        seg = x[s : s + n]
        # 要求片段里至少一半的 32 ms 帧有语音能量
        fr = seg[: n // 512 * 512].reshape(-1, 512)
        e = 10 * np.log10(np.mean(fr ** 2, 1) + 1e-12)
        if np.mean(e > e.max() - 30) > 0.5:
            return seg


def summarize(rows, methods):
    out = {}
    for m in methods:
        est = np.array([r[m] for r in rows]); tru = np.array([r["truth"] for r in rows])
        err = angdiff(est, tru)
        fb_ok = angdiff(tru, 180 - tru) >= 30
        fb = (angdiff(est, wrap(180 - tru)) <= 15) & (err > 15)  # 落在前后镜像方向附近
        lr_ok = angdiff(tru, -tru) >= 30
        lr = (angdiff(est, -tru) <= 15) & (err > 15)  # 落在左右镜像方向附近
        out[m] = {
            "acc10": float(np.mean(err <= 10)), "acc5": float(np.mean(err <= 5)),
            "mae": float(np.mean(err)), "median": float(np.median(err)),
            "front_back_confusion": float(np.mean(fb[fb_ok])), "left_right_confusion": float(np.mean(lr[lr_ok])),
            "n": len(rows),
        }
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reps", type=int, default=2, help="每个方位（5° 间隔）重复次数")
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    rng = np.random.default_rng(args.seed)
    t0 = time.time()

    freqs = np.fft.rfftfreq(NFFT, 1 / FS)
    fmask = (freqs >= 200) & (freqs <= 7000)
    edges = [500, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 7500]
    bands_idx = [np.where((freqs >= lo) & (freqs < hi))[0] for lo, hi in zip(edges[:-1], edges[1:])]
    mics = earbud_mics()
    grid = np.arange(-180, 180, 1.0)
    Hgrid = sphere_tf(azimuth_points(grid, 1.5), mics, freqs)
    Hgrid_ff = freefield_tf(azimuth_points(grid, 1.5), mics, freqs)
    ild_tab = ild_model(Hgrid, bands_idx)
    H_diff = sphere_tf(fibonacci_sphere(32, 2.0), mics, freqs)
    speech = load_speech()
    noise_psd = ltas(speech, FS)
    seg_len = int(1.05 * FS)
    n05 = 1 + (int(0.5 * FS) - NFFT) // 256

    rows, sync_rows = [], []
    azs = np.arange(-180, 180, 5.0)
    for cname, (rt60, drr, snr) in CONDS.items():
        for rep in range(args.reps):
            for az0 in azs:
                az = float(wrap(az0 + rng.uniform(-2.5, 2.5)))
                dist = rng.uniform(1.0, 2.0)
                H_t = sphere_tf(azimuth_points([az], dist), mics, freqs)[0]
                S = stft(pick_segment(speech, seg_len, rng))
                Y = simulate(S, H_t, H_diff, rng, rt60, drr, snr, noise_psd)
                for win, Yw in (("0.5 s", Y[:, :, :n05]), ("1.0 s", Y)):
                    est = estimate_all(Yw, Hgrid, Hgrid_ff, fmask, bands_idx, ild_tab, grid)
                    rows.append({"cond": cname, "win": win, "truth": az, "dist": dist, **est})
                if cname.startswith("C3") and rep == 0:
                    for us in SYNC_US:
                        Ys = apply_sync_error(Y[:, :, :n05], freqs, [2, 3], us * 1e-6)
                        est = estimate_all(Ys, Hgrid, Hgrid_ff, fmask, bands_idx, ild_tab, grid)
                        sync_rows.append({"sync_us": us, "truth": az, **est})
        print(f"{cname} 完成，用时 {time.time() - t0:.0f} s", flush=True)

    methods = ["A_双耳组阵", "B_只传参数", "仅本地两对", "仅耳间电平差", "A_忽略头部模板"]
    summary = {"setup": {
        "head_model": "刚性球（半径 8.75 cm），Duda & Martens 1998", "mics": "每耳 2 麦，前后间距 1.5 cm，离头表面 0.8 cm、低 1.2 cm",
        "fs": FS, "nfft": NFFT, "grid_deg": 1, "template_distance_m": 1.5, "source_distance_m": "1–2 随机",
        "srp_band_hz": [200, 7000], "ild_bands_hz": edges, "diffuse_dirs": 32,
        "trials_per_condition": len(azs) * args.reps, "B_weights": {"beta": 3.0, "sigma_db": 3.0, "tuned_on": "seed 123 开发集，与评测 seed 0 分开"},
    }, "results": {}, "sync_error": {}}
    for cname in CONDS:
        for win in ("0.5 s", "1.0 s"):
            summary["results"][f"{cname} | {win}"] = summarize([r for r in rows if r["cond"] == cname and r["win"] == win], methods)
    for us in SYNC_US:
        summary["sync_error"][str(us)] = summarize([r for r in sync_rows if r["sync_us"] == us], ["A_双耳组阵", "B_只传参数"])

    with open(os.path.join(OUT, "min_validation_trials.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    with open(os.path.join(OUT, "min_validation_summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=1)

    lines = [f"最小验证（刚性球头部模型），每条件 {len(azs) * args.reps} 次，用时 {time.time() - t0:.0f} s", ""]
    for key, res in summary["results"].items():
        lines.append(key)
        for m in methods:
            r = res[m]
            lines.append(f"  {m:<10s} ≤10°: {r['acc10']*100:5.1f}%  ≤5°: {r['acc5']*100:5.1f}%  平均误差 {r['mae']:5.1f}°  前后混淆 {r['front_back_confusion']*100:5.1f}%  左右混淆 {r['left_right_confusion']*100:5.1f}%")
    lines.append("")
    lines.append("两耳同步误差（C3，0.5 s 判决）")
    for us, res in summary["sync_error"].items():
        lines.append(f"  {us:>4s} µs  A ≤10°: {res['A_双耳组阵']['acc10']*100:5.1f}%  平均误差 {res['A_双耳组阵']['mae']:5.1f}°  |  B ≤10°: {res['B_只传参数']['acc10']*100:5.1f}%")
    txt = "\n".join(lines)
    print(txt)
    with open(os.path.join(OUT, "min_validation_log.txt"), "w", encoding="utf-8") as f:
        f.write(txt + "\n")


if __name__ == "__main__":
    main()
