# -*- coding: utf-8 -*-
"""静态测向评测：随机房间 × 多档 RT60，比较阵列构型与“起始段加权”的效果。

运行：python scripts/run_static_eval.py --trials 100 → 输出 out/static_eval.csv 并打印汇总表
"""
import argparse, csv, os, sys, time
import numpy as np
import scipy.io.wavfile as wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from ssl_baseline import PRESETS, SRPPHAT, stft, metrics
from ssl_baseline.sim import simulate_static, highpass

FS, NFFT, HOP = 16000, 512, 256


def one_trial(rng, sp, rt60, arrays, seg_s=1.0):
    L, W, H = rng.uniform(3.5, 7.0), rng.uniform(3.0, 6.0), rng.uniform(2.5, 3.2)
    ac = np.array([rng.uniform(0.8, L - 0.8), rng.uniform(0.8, W - 0.8), rng.uniform(1.0, 2.0)])
    for _ in range(200):
        az = rng.uniform(0, 360); d = rng.uniform(1.0, 3.5)
        p = ac[:2] + d * np.array([np.cos(np.deg2rad(az)), np.sin(np.deg2rad(az))])
        if 0.4 < p[0] < L - 0.4 and 0.4 < p[1] < W - 0.4:
            break
    st = rng.integers(0, len(sp) - 2 * FS)
    sig = sp[st: st + int(seg_s * FS)]
    allxy = np.concatenate([PRESETS[a] for a in arrays], 1)
    y = simulate_static(sig, FS, [L, W, H], rt60, allxy, ac, [p[0], p[1], rng.uniform(1.0, 1.7)])
    pw = np.mean(y ** 2); y = y + rng.normal(0, np.sqrt(pw / 10 ** 1.5), y.shape)
    f, Z = stft(y, FS, NFFT, HOP)
    out = {}; s = 0
    for a in arrays:
        m = PRESETS[a].shape[1]; Za = Z[s:s + m]; s += m
        srp = SRPPHAT(PRESETS[a], FS, NFFT)
        P = srp.map(Za); e = srp.band_energy_db(Za)
        floor = e.max() - 30
        est_plain, _ = srp.peak(srp.aggregate(P, (e > floor).astype(float)))
        est_onset, _ = srp.peak(srp.aggregate(P, srp.onset_weights(e, floor_db=floor)))
        out[a] = (az, est_plain, est_onset)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=100)
    ap.add_argument("--rt60", type=float, nargs="+", default=[0.2, 0.4, 0.6, 0.8])
    ap.add_argument("--seg", type=float, default=1.0, help="每次测向使用的语音长度（s）")
    a = ap.parse_args()
    fs, sp = wavfile.read(os.path.join(ROOT, "data", "speech_zh.wav")); sp = highpass(sp.astype(float) / 32768, FS)
    arrays = ["linear2", "tri3", "square4"]
    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
    rows = []
    rng = np.random.default_rng(2026)
    for rt in a.rt60:
        t0 = time.time(); res = {k: ([], [], []) for k in arrays}
        for _ in range(a.trials):
            o = one_trial(rng, sp, rt, arrays, a.seg)
            for k in arrays:
                for i in range(3): res[k][i].append(o[k][i])
        for k in arrays:
            tr, ep, eo = map(np.array, res[k])
            for name, est in [("SRP-PHAT", ep), ("SRP-PHAT+起始段加权", eo)]:
                m = metrics.doa_metrics(est, tr)
                rows.append({"rt60": rt, "array": k, "method": name, **{kk: round(v, 4) for kk, v in m.items()}})
        print(f"RT60={rt}s 用时 {time.time() - t0:.0f}s")
    with open(os.path.join(ROOT, "out", "static_eval.csv"), "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    print(f"{'RT60':>5} {'阵列':>8} {'方法':<22} {'MAE':>6} {'Acc@10':>7} {'粗大错误':>6}")
    for r in rows:
        print(f"{r['rt60']:>5} {r['array']:>8} {r['method']:<22} {r['mae']:>6.1f} {r['acc10']*100:>6.1f}% {r['gross']*100:>6.1f}%")


if __name__ == "__main__":
    main()
