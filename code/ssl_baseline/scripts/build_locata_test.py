# -*- coding: utf-8 -*-
"""LOCATA 真实录音测试集（DICIT 阵列中间 5 麦：-8/-4/0/4/8 cm），用于验证"仿真训练 → 真实录音"。

数据：LOCATA 开发集与评测集的任务 1–3（固定喇叭单声源 / 固定多喇叭 / 单人走动），DICIT 阵列静止；许可 ODC-BY。
真值：官方声源位置 → 阵列局部坐标 → 本仓库方位约定（0° = 阵列法向，沿阵列轴为 ±90°）；仅保留前方 |方位| ≤ 80° 的样本。

两类样本（都取开口前 1.0 s 到开口后 0.5 s，另存开口前 2.0 s 起的长片段给传统方法用作背景段）：
  R1 纯实录起始：某声源静音 ≥0.3 s 后开口（官方 VAD）；若片段内有其他声源在说话，记为"实录多声源"，否则"实录单声源"。
  R2 实录叠加换人：B 取自单声源录音（任务 1、3）的一个开口；A 取自另一条单声源录音（同一房间、同一阵列位置），
     以 A 在录音中自然说完的时刻对齐——换人：A 在 B 开口前 0.2–0.6 s 说完；抢话：A 在 B 开口后 0.2–0.8 s 说完。
     两段真实录音直接相加（声学叠加成立；底噪也相加，比单段高约 3 dB）。A、B 方位至少相差 10°。
输出：work/locata_test/locata_test.npz
运行：python scripts/build_locata_test.py
"""
import glob, os, sys
import numpy as np
import scipy.signal as sps
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "work", "locata")
FS0, FS = 48000, 16000
SUB = [9, 8, 6, 5, 4]                      # 0 起通道号：局部 x = -0.08, -0.04, 0, 0.04, 0.08
PRE_L, PRE, POST = 2.0, 1.0, 0.5           # 长片段开口前 2.0 s；网络用开口前 1.0 s；开口后 0.5 s
COND_NAMES = ["实录单声源", "实录多声源", "叠加换人", "叠加抢话"]


def read_table(f, max_rows=None):
    hdr = open(f).readline().split()
    return hdr, np.loadtxt(f, skiprows=1, max_rows=max_rows, ndmin=2)


def sec_of_day(A, hdr):
    i = hdr.index("hour")
    return A[:, i] * 3600 + A[:, i + 1] * 60 + A[:, i + 2]


def load_recording(rec):
    hdr, A = read_table(os.path.join(rec, "position_array_dicit.txt"), max_rows=1)
    d = dict(zip(hdr, A[0]))
    c = np.array([d["x"], d["y"], d["z"]])
    Rm = np.array([[d[f"rotation_{i}{j}"] for j in (1, 2, 3)] for i in (1, 2, 3)])
    x, fs = sf.read(os.path.join(rec, "audio_array_dicit.wav"))
    assert fs == FS0 and x.shape[1] == 15
    x = sps.resample_poly(x[:, SUB].T, 1, 3, axis=1)                         # 5 x N，16 kHz
    ht, T = read_table(os.path.join(rec, "audio_array_timestamps_dicit.txt"))
    t_audio = sec_of_day(T, ht)[::3][: x.shape[1]]                          # 与 16 kHz 样点对应的时刻
    srcs = {}
    for vf in sorted(glob.glob(os.path.join(rec, "VAD_dicit_*.txt"))):
        name = os.path.basename(vf)[len("VAD_dicit_"):-4]
        vad = np.loadtxt(vf, skiprows=1)[::3][: x.shape[1]] > 0
        hp, P = read_table(os.path.join(rec, f"position_source_{name}.txt"))
        tp = sec_of_day(P, hp); pos = P[:, [hp.index("x"), hp.index("y"), hp.index("z")]]
        srcs[name] = (vad, tp, pos)
    return {"x": x, "c": c, "R": Rm, "t": t_audio, "srcs": srcs, "rec": rec}


def az_at(r, name, i0, i1):
    """样点区间 [i0, i1) 内声源的平均方位（本仓库约定）与距离。"""
    vad, tp, pos = r["srcs"][name]
    ta, tb = r["t"][i0], r["t"][min(i1, len(r["t"]) - 1)]
    m = (tp >= ta) & (tp <= tb)
    p = pos[m].mean(0) if m.any() else pos[np.argmin(np.abs(tp - ta))]
    loc = (p - r["c"]) @ r["R"]
    return float(np.rad2deg(np.arctan2(loc[0], loc[1]))), float(np.hypot(loc[0], loc[1]))


def onsets(vad, min_sil=0.3):
    d = np.diff(np.r_[0, vad.astype(int), 0])
    on, off = np.where(d == 1)[0], np.where(d == -1)[0]
    return [o for i, o in enumerate(on) if i == 0 or o - off[i - 1] >= min_sil * FS], list(off)


def clip(x, start, n):
    """取 [start, start+n)，开头不足的部分补零；返回 (片段, 实际开始的偏移)。"""
    out = np.zeros((x.shape[0], n)); a = max(0, start); b = min(x.shape[1], start + n)
    out[:, a - start: b - start] = x[:, a:b]
    return out, a - start


def main():
    parts = sys.argv[1:] or ["dev", "eval"]                                # 可只用 dev 或 eval 试跑
    recs = sorted(r for p in parts for r in glob.glob(os.path.join(D, p, "task[123]", "recording*", "dicit")))
    R_ = [load_recording(r) for r in recs]
    print("录音条数", len(R_), flush=True)
    rng = np.random.default_rng(7)
    n_long = int((PRE_L + POST) * FS)
    X, meta = [], []

    def add(seg, valid_from, az, cond, src, extra=""):
        X.append(seg.astype(np.float32))
        meta.append({"az": az, "cond": cond, "valid_from": valid_from, "src": src, "extra": extra})

    # R1 纯实录起始
    b_pool = []
    for r in R_:
        for name, (vad, tp, pos) in r["srcs"].items():
            for o in onsets(vad)[0]:
                if o < PRE * FS or o + POST * FS > r["x"].shape[1]:
                    continue
                az, dist = az_at(r, name, o, o + int(POST * FS))
                if abs(az) > 80:
                    continue
                others = any(v[o - int(PRE * FS): o + int(POST * FS)].any() for n2, (v, _, _) in r["srcs"].items() if n2 != name)
                seg, vf = clip(r["x"], o - int(PRE_L * FS), n_long)
                add(seg, vf, az, 1 if others else 0, f"{r['rec'].split('locata/')[1]}:{name}@{o / FS:.2f}s")
                if len(r["srcs"]) == 1:
                    b_pool.append((r, name, o, az))
    # R2 叠加换人 / 抢话：A 的"说完"时刻来自 A 所在录音的自然结束点
    a_pool = []
    for r in R_:
        if len(r["srcs"]) != 1:
            continue
        name, (vad, tp, pos) = next(iter(r["srcs"].items()))
        for f in onsets(vad)[1]:
            if f >= int(2.5 * FS) and f + int(1.0 * FS) <= r["x"].shape[1] and vad[f - int(1.0 * FS): f].mean() > 0.6:
                a_pool.append((r, name, f, az_at(r, name, f - FS, f)[0]))
    print("可作新发言人 B 的开口", len(b_pool), "；可作上一位 A 的结束点", len(a_pool), flush=True)
    for (rb, nb, ob, azb) in b_pool:
        for cond, (lo, hi) in [(2, (-0.6, -0.2)), (3, (0.2, 0.8))]:
            cands = [a for a in a_pool if a[0] is not rb and abs(((a[3] - azb + 180) % 360) - 180) >= 10]
            if not cands:
                continue
            for k in rng.choice(len(cands), min(2, len(cands)), replace=False):
                ra, na, fa, aza = cands[k]
                shift = fa - (ob + int(rng.uniform(lo, hi) * FS))          # A 的样点 = B 的样点 + shift
                sb, vfb = clip(rb["x"], ob - int(PRE_L * FS), n_long)
                sa, vfa = clip(ra["x"], ob - int(PRE_L * FS) + shift, n_long)
                add(sb + sa, max(vfb, vfa), azb, cond, f"B={rb['rec'].split('locata/')[1]}@{ob / FS:.2f}s",
                    f"A={ra['rec'].split('locata/')[1]} 方位 {aza:.1f}°")
    out = os.path.join(ROOT, "work", "locata_test"); os.makedirs(out, exist_ok=True)
    np.savez(os.path.join(out, "locata_test.npz"), x=np.stack(X), onset=int(PRE_L * FS),
             az=np.array([m["az"] for m in meta]), cond=np.array([m["cond"] for m in meta]),
             valid_from=np.array([m["valid_from"] for m in meta]), src=np.array([m["src"] for m in meta]),
             extra=np.array([m["extra"] for m in meta]), cond_names=np.array(COND_NAMES))
    cond = np.array([m["cond"] for m in meta]); az = np.array([m["az"] for m in meta])
    print("样本数", len(X), {COND_NAMES[c]: int((cond == c).sum()) for c in range(4)},
          "方位范围", round(float(az.min()), 1), round(float(az.max()), 1))


if __name__ == "__main__":
    main()
