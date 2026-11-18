"""明显问题排查用：增强一侧的空间分辨力（理论波束图，不是增强算法实现）。
比较"每只耳机本地 2 麦"与"两耳 4 麦组阵"做超指向（扩散场 MVDR）时，对相隔 15–45° 的相邻说话人的抑制量。
用法：python scripts/beam_rejection.py → out/beam_rejection.json"""
import json, os, sys
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from earbud_ssl.sphere import sphere_tf, earbud_mics, azimuth_points, fibonacci_sphere

freqs = np.array([250, 500, 1000, 2000, 4000, 6000.0])
mics = earbud_mics()
Hd = sphere_tf(fibonacci_sphere(64, 2.0), mics, freqs)            # (K,M,F)
Gam = np.einsum("kmf,knf->fmn", Hd, Hd.conj()) / Hd.shape[0]
out = {}
for name, idx in [("左耳本地 2 麦", [0, 1]), ("两耳 4 麦组阵", [0, 1, 2, 3])]:
    res = {}
    for tgt in (0.0, 30.0):
        for sep in (15, 25, 45):
            rows = []
            for fi in range(len(freqs)):
                G = Gam[fi][np.ix_(idx, idx)]
                G = G + 1e-2 * np.trace(G).real / len(idx) * np.eye(len(idx))   # 对角加载（控制白噪声增益）
                d = sphere_tf(azimuth_points([tgt], 1.5), mics[idx], freqs[fi:fi + 1])[0][:, 0]
                w = np.linalg.solve(G, d); w = w / (d.conj() @ w)
                vals = []
                for s in (+sep, -sep):
                    h = sphere_tf(azimuth_points([tgt + s], 1.5), mics[idx], freqs[fi:fi + 1])[0][:, 0]
                    vals.append(abs(w.conj() @ h) ** 2)
                rows.append(round(float(-10 * np.log10(np.mean(vals))), 1))
            res[f"目标 {tgt:.0f}°，相邻 ±{sep}°"] = dict(zip([f"{int(f)} Hz" for f in freqs], rows))
    out[name] = res
os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
json.dump({"note": "扩散场 MVDR（超指向）对相邻方向的抑制量 dB（正值 = 被压低），刚性球头部模型，理论值，未含混响与估计误差", "results": out},
          open(os.path.join(ROOT, "out", "beam_rejection.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for n, r in out.items():
    print(n)
    for k, v in r.items():
        print("  ", k, v)
