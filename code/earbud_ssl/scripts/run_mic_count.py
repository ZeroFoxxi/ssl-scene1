"""麦克风数量对比：4 / 6 / 8 麦（每耳 2 / 3 / 4 麦，副耳全部传到主耳），以及只转发 1 路的 3 麦、4 麦。
场景同算法选型 S2、S4（混响 + 2 个干扰说话人），同一随机种子 → 各配置用同一批场景。
用法：python scripts/run_mic_count.py --config 2+2 [--trials 100]
"""
import argparse, json, os, sys, time
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_algo_selection as RA
from earbud_ssl import methods as M
from earbud_ssl.sphere import sphere_tf, earbud_mic_set, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import ltas, NFFT

CONDS = ["S2 混响 + 2 个干扰（SIR 6 dB）", "S4 混响 + 2 个干扰（SIR 0 dB）"]
SOFT = {"lam": 0.1, "mu": 0.05}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    ap.add_argument("--trials", type=int, default=100)
    ap.add_argument("--seed", type=int, default=21)
    a = ap.parse_args()
    mics = earbud_mic_set(a.config)
    freqs = np.fft.rfftfreq(NFFT, 1 / 16000)
    grid = np.arange(-180, 180, 5.0)
    fm = (freqs >= 200) & (freqs <= 7000)
    speech = RA.load_speech()
    ctx = {"freqs": freqs, "mics": mics, "H_diff": sphere_tf(fibonacci_sphere(32, 2.0), mics, freqs), "speech": speech, "psd": ltas(speech, 16000)}
    Hg = sphere_tf(azimuth_points(grid, 1.5), mics, freqs)
    t0 = time.time(); res = {}; tm = []
    for c in CONDS:
        rng = np.random.default_rng(a.seed)  # 各配置同一批场景
        rows = []
        for _ in range(a.trials):
            az, Yd, Yb, faces = RA.run_trial(rng, RA.CONDS[c], ctx)
            e = M.frame_energy_db(Yd, fm)
            t = time.perf_counter()
            p_g = M.music(M.covariance(Yd, fm, M.onset_weights(e, e.max() - 30)), Hg, fm, M.covariance(Yb, fm, np.ones(Yb.shape[2])))
            tm.append(time.perf_counter() - t)
            p_m = M.music(M.covariance(Yd, fm, M.floor_weights(e, e.max() - 30)), Hg, fm)
            rows.append({"truth": az, "GEVD-MUSIC": M.peak(p_g, grid, 5.0), "GEVD-MUSIC + 视觉": M.fuse_soft(p_g, grid, faces, **SOFT),
                         "MUSIC（不白化）": M.peak(p_m, grid, 5.0)})
        res[c] = RA.summarize(rows, ["GEVD-MUSIC", "GEVD-MUSIC + 视觉", "MUSIC（不白化）"])
        print(f"{a.config} {c} 完成 {time.time() - t0:.0f} s", flush=True)
    nL, nR = (int(x) for x in a.config.split("+"))
    out = {"config": a.config, "mics_total_used": len(mics), "forwarded_channels": nR, "trials": a.trials, "seed": a.seed,
           "python_ms_per_decision_gevd": float(np.mean(tm) * 1000), "results": res}
    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
    with open(os.path.join(ROOT, "out", f"mic_count_{a.config.replace('+', 'p')}.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(json.dumps({c: {k: round(v["acc10"] * 100, 1) for k, v in r.items()} for c, r in res.items()}, ensure_ascii=False))


if __name__ == "__main__":
    main()
