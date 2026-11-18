"""明显问题排查用：已知干扰方位时，自适应置零（MVDR，干扰协方差 = 直达 + 扩散混响）对相邻说话人的抑制。
设计时用带误差的方位（目标偏 TGT_ERR°、干扰偏 INT_ERR°，与定位 / 视觉精度同量级），评估时用真实方位。
理论计算，不是增强算法实现。约束：白噪声增益（相对单个麦克风）≥ WNG_MIN dB，用对角加载满足。
输出：相对参考麦（左前麦）的信干比提升 dB。用法：python scripts/null_rejection.py → out/null_rejection.json"""
import json, os, sys
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from earbud_ssl.sphere import sphere_tf, earbud_mics, azimuth_points, fibonacci_sphere

WNG_MIN = -10.0
TGT_ERR, INT_ERR = 2.0, 3.0
freqs = np.array([250, 500, 1000, 2000, 3000, 4000.0])
mics = earbud_mics()
Hd = sphere_tf(fibonacci_sphere(64, 2.0), mics, freqs)
Gam = np.einsum("kmf,knf->fmn", Hd, Hd.conj()) / Hd.shape[0]


def tf(az, r, idx, fi):
    return sphere_tf(azimuth_points([az], r), mics, freqs[fi:fi + 1])[0][idx, 0]


def sir_gain(idx, tgt, intf, drr_db, fi):
    G = Gam[fi][np.ix_(idx, idx)]
    def cov(h):
        rev = 0.0 if np.isinf(drr_db) else 10 ** (-drr_db / 10) * np.real(h.conj() @ h) / np.real(np.trace(G))
        return np.outer(h, h.conj()) + rev * G  # 干扰协方差：直达 + 扩散混响
    d_true, h_true = tf(tgt, 1.5, idx, fi), tf(intf, 2.0, idx, fi)
    d, Rd = tf(tgt + TGT_ERR, 1.5, idx, fi), cov(tf(intf + INT_ERR, 2.0, idx, fi))  # 设计用（带误差）
    Ri = cov(h_true)  # 评估用（真实）
    best = None
    for load in np.logspace(-6, 2, 49):  # 从小到大找满足白噪声增益约束的最小加载
        R = Rd + load * np.real(np.trace(Rd)) / len(idx) * np.eye(len(idx))
        w = np.linalg.solve(R, d); w = w / (d.conj() @ w)
        wng = 10 * np.log10(abs(w.conj() @ d_true) ** 2 / np.real(w.conj() @ w) / (abs(d_true[0]) ** 2))
        if wng >= WNG_MIN:
            best = (w, wng); break
    w, wng = best
    out_t = abs(w.conj() @ d_true) ** 2; out_i = np.real(w.conj() @ Ri @ w)
    ref_t = abs(d_true[0]) ** 2; ref_i = np.real(Ri[0, 0])
    return 10 * np.log10((out_t / out_i) / (ref_t / ref_i)), wng


res = {}
for name, idx in [("左耳本地 2 麦", [0, 1]), ("两耳 4 麦组阵", [0, 1, 2, 3])]:
    for drr in (np.inf, 0.0):
        for sep in (15, 25, 45):
            key = f"{name} | {'消声' if np.isinf(drr) else '直达混响比 0 dB'} | 目标 0°、干扰 {sep}°"
            res[key] = {f"{int(f)} Hz": round(float(sir_gain(idx, 0.0, sep, drr, i)[0]), 1) for i, f in enumerate(freqs)}
json.dump({"note": f"已知干扰方位的 MVDR（置零）相对参考麦的信干比提升 dB；设计方位误差：目标 {TGT_ERR}°、干扰 {INT_ERR}°；白噪声增益约束 ≥ {WNG_MIN} dB；刚性球头部模型；理论值，未含时变与估计噪声",
           "results": res}, open(os.path.join(ROOT, "out", "null_rejection.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for k, v in res.items():
    print(k, v, "平均(0.5–4k):", round(np.mean([v[x] for x in ["500 Hz", "1000 Hz", "2000 Hz", "3000 Hz", "4000 Hz"]]), 1))
