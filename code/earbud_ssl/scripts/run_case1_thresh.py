"""情况 1 补充：只用声音时，降低开口检测阈值能否改善远距离（嘈杂环境）。
情况 1 没有其他人说话，误检只来自噪声，阈值可以比多人场景（3.5 dB）低。场景与 run_case1.py 相同（2+1，嘈杂，1.5 m 处 SNR 10 dB）。
统计：只用声音、加低帧率档人脸位置（软融合，唇动无信息）的定位准确率（≤ 10°）、开口后 0.3 s 内检出率、开口前 1.0–2.0 s 内的误检次数。

用法：python scripts/run_case1_thresh.py [--trials 150] [--seed 51]
"""
import argparse, json, os, sys, time
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_algo_selection as RA
import run_camera_policy as RC
import run_case1 as C
from run_min_validation import angdiff
from earbud_ssl import methods as M
from earbud_ssl.sphere import sphere_tf, earbud_mic_set, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import ltas, NFFT

THRESHS = [3.5, 2.0, 1.0]
DISTS = [0.5, 1.0, 2.0, 3.0, 4.0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=150)
    ap.add_argument("--seed", type=int, default=51)
    a = ap.parse_args()
    mics = earbud_mic_set("2+1"); freqs = np.fft.rfftfreq(NFFT, 1 / C.FS); grid = np.arange(-180, 180, 5.0)
    fm = (freqs >= 200) & (freqs <= 7000); speech = RA.load_speech()
    ctx = {"freqs": freqs, "mics": mics, "fmask": fm, "grid": grid, "Hg": sphere_tf(azimuth_points(grid, C.D_REF), mics, freqs),
           "H_diff": sphere_tf(fibonacci_sphere(32, 2.0), mics, freqs), "speech": speech, "psd": ltas(speech, C.FS)}
    k_dec = RC.time_frame(C.T_ON + C.T_DEC); t0 = time.time(); res = {}
    for d in DISTS:
        rng = np.random.default_rng([a.seed, 10, int(d * 10)])       # 与 run_case1.py 嘈杂环境同一批场景
        acc = {t: [] for t in THRESHS}; acc_lo = {t: [] for t in THRESHS}; det = {t: [] for t in THRESHS}; fa = {t: [] for t in THRESHS}
        for i in range(a.trials):
            y, az3, ti = C.scene(rng, d, 10.0, ctx)
            rng.uniform(-RA.ONSET_JIT, RA.ONSET_JIT); f_lo = C.faces(rng, az3, ti, d, False); C.faces(rng, az3, ti, d, True)   # 保持随机数序列一致（同一批人脸检测结果）
            nov = RC.novelty_raw(y, ctx)
            for t in THRESHS:
                ev = RC.acoustic_onsets(nov, t, int(1.0 * C.FPS))
                det[t].append(any(C.T_ON <= RC.frame_time(kd) <= C.T_ON + 0.3 for kd, ko in ev))
                fa[t].append(sum(1 for kd, ko in ev if RC.frame_time(kd) < C.T_ON))
                usable = [(kd, ko) for kd, ko in ev if RC.frame_time(kd) <= C.T_ON + C.T_DEC]
                spec = RC.gevd_spec(y, k_dec, usable[-1][1], ctx) if usable else None
                if spec is None:
                    spec = RC.music_plain(y, k_dec, ctx)
                acc[t].append(angdiff(M.peak(spec, grid, 5.0), az3[ti]) <= 10)
                z_lo = M.fuse_soft(spec, grid, f_lo, **RA.SOFT) if f_lo else M.peak(spec, grid, 5.0)
                acc_lo[t].append(angdiff(z_lo, az3[ti]) <= 10)
        res[f"{d:g} m"] = {f"{t:g} dB": {"acc10_pct": float(np.mean(acc[t]) * 100), "acc10_low_frame_pct": float(np.mean(acc_lo[t]) * 100), "detect_within_0p3s_pct": float(np.mean(det[t]) * 100),
                                         "false_per_s": float(np.mean(fa[t]) / (C.T_ON - 1.0))} for t in THRESHS}
        print(d, json.dumps(res[f"{d:g} m"], ensure_ascii=False), f"{time.time() - t0:.0f} s", flush=True)
    with open(os.path.join(ROOT, "out", "case1_thresh.json"), "w", encoding="utf-8") as f:
        json.dump({"setup": {"env": "嘈杂（1.5 m 处 SNR 10 dB）", "array": "2+1", "threshs_db": THRESHS, "trials": a.trials, "seed": a.seed},
                   "results": res}, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
