# -*- coding: utf-8 -*-
"""会议室阵列选型仿真：同一批会议室、同样四种条件下，比较候选阵列（麦克风数、圆阵 / 线阵、孔径、安装朝向）。

安装：摄像头在前墙电视上方，阵列中心距墙 8 cm（与 run_meeting_eval.py 相同）；线阵平行于前墙。
候选阵列参照竞品量级：2 麦（萤石 RK3 为 2 麦）、3 麦（萤石 C6Wi 为 3 麦）、4 麦（乐鑫方案为 4 麦）、
6 麦、8 麦线阵（思必驰 C60 为 8 麦线阵，孔径未公开，这里取 17.5 cm）。
方法：SRP-PHAT、GEVD-MUSIC（固定背景段）、自适应背景 GEVD-MUSIC（turn.py）。
运行：python scripts/run_array_study.py --trials 100
输出：out/array_study.csv、out/array_study_summary.json、out/fig_array_study.png
"""
import argparse, csv, json, os, sys, time
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_meeting_eval as R
from ssl_baseline import metrics
from ssl_baseline.geometry import ring_array, aliasing_frequency
from ssl_baseline.wake import WakeDOA, WakeDOAConfig
from ssl_baseline.turn import TurnDOA, TurnDOAConfig
from ssl_baseline.doa import SRPConfig

FS = R.FS
WINS = [0.5, 1.0]


def lin(n, d):
    return np.stack([np.zeros(n), (np.arange(n) - (n - 1) / 2) * d], 0)


# 名称: (几何, 说明)
ARRAYS = {
    "2麦线阵 6cm": (lin(2, 0.06), "2 麦，孔径 6 cm"),
    "3麦圆阵 r2.8": (ring_array(3, 0.0283, 0.0), "3 麦三角，孔径约 4.9 cm，一个麦朝向房间"),
    "4麦圆阵 r3 0°": (ring_array(4, 0.03, 0.0), "4 麦，孔径 6 cm，两个麦正对前墙 / 房间"),
    "4麦圆阵 r3 45°": (ring_array(4, 0.03, 45.0), "4 麦，孔径 6 cm，旋转 45°"),
    "4麦圆阵 r5 45°": (ring_array(4, 0.05, 45.0), "4 麦，孔径 10 cm，旋转 45°"),
    "4麦线阵 3.5cm": (lin(4, 0.035), "4 麦线阵，孔径 10.5 cm"),
    "6麦圆阵 r4 30°": (ring_array(6, 0.04, 30.0), "6 麦，孔径 8 cm，旋转 30°"),
    "8麦线阵 2.5cm": (lin(8, 0.025), "8 麦线阵，孔径 17.5 cm"),
}
METHODS = ["S SRP-PHAT", "G GEVD-MUSIC", "T 自适应背景"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=100)
    ap.add_argument("--rt60", type=float, nargs="+", default=[0.3, 0.6])
    a = ap.parse_args()
    sp, en = R.load("speech_zh.wav"), R.load("tv_en.wav")
    names = list(ARRAYS)
    xys = [ARRAYS[n][0] for n in names]
    idx = np.cumsum([0] + [x.shape[1] for x in xys])
    allxy = np.hstack(xys)
    est = {}
    for n, xy in zip(names, xys):
        srp = SRPConfig(fmax=min(4000.0, 0.95 * aliasing_frequency(xy)))   # 频带不超过空间混叠频率
        base = dict(pad_post=0.0, exclude=R.FRONT, srp=srp)
        est[n] = {METHODS[0]: WakeDOA(xy, FS, WakeDOAConfig(method="srp_sub", bg_subtract=False, **base)),
                  METHODS[1]: WakeDOA(xy, FS, WakeDOAConfig(**base)),
                  METHODS[2]: TurnDOA(xy, FS, TurnDOAConfig(exclude=R.FRONT, srp=srp))}
    rng = np.random.default_rng(2026)
    raw = []
    for rt in a.rt60:
        t0 = time.time()
        for k in range(a.trials):
            r = R.render_trial(rng, sp, en, rt, mic_xy=allxy)
            for cond in R.CONDS:
                y, ynoise = R.mix(rng, r, cond)
                s0 = r["start"]
                for i, n in enumerate(names):
                    x, xn = y[idx[i]:idx[i + 1]], ynoise[idx[i]:idx[i + 1]]
                    est[n][METHODS[2]].set_noise(xn)
                    for w in WINS:
                        e = s0 + int(w * FS)
                        for m in METHODS:
                            az = est[n][m].localize(x, s0, e).az
                            raw.append({"rt60": rt, "cond": cond, "array": n, "win": w, "method": m,
                                        "err": float(metrics.angdiff(az, r["azB"]))})
            if (k + 1) % 20 == 0:
                print(f"RT60={rt}s  {k + 1}/{a.trials}  {time.time() - t0:.0f}s", flush=True)
    summary = []
    for rt in a.rt60:
        for cond in R.CONDS:
            for n in names:
                for w in WINS:
                    for m in METHODS:
                        e = np.array([x["err"] for x in raw if x["rt60"] == rt and x["cond"] == cond and x["array"] == n and x["win"] == w and x["method"] == m])
                        summary.append({"rt60": rt, "cond": cond, "array": n, "win": w, "method": m, "mae": round(float(e.mean()), 2),
                                        "acc10": round(float((e <= 10).mean()), 3), "wrong20": round(float((e > 20).mean()), 3), "n": len(e)})
    out = os.path.join(ROOT, "out"); os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, "array_study.csv"), "w", newline="", encoding="utf-8-sig") as fh:
        wr = csv.DictWriter(fh, fieldnames=list(summary[0].keys())); wr.writeheader(); wr.writerows(summary)
    json.dump({"config": {"trials_per_rt60": a.trials, "rt60": a.rt60, "windows_s": WINS, "wall_distance_m": 0.08,
                          "arrays": {n: {"desc": ARRAYS[n][1], "n_mics": int(ARRAYS[n][0].shape[1]),
                                         "xy_m": np.round(ARRAYS[n][0], 4).tolist()} for n in names}},
               "summary": summary}, open(os.path.join(out, "array_study_summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    g = lambda **kw: next(x for x in summary if all(x[k] == v for k, v in kw.items()))
    print(f"\n{'阵列':<16}" + "".join(f"{m.split(' ')[1]:>14}" for m in METHODS) + "   （四种条件、两档 RT60 平均的 ≤10° 比例：0.5 s / 1.0 s）")
    for n in names:
        cells = []
        for m in METHODS:
            v = [np.mean([g(rt60=rt, cond=c, array=n, win=w, method=m)["acc10"] for rt in a.rt60 for c in R.CONDS]) * 100 for w in WINS]
            cells.append(f"{v[0]:5.1f}/{v[1]:5.1f}")
        print(f"{n:<16}" + "".join(f"{c:>14}" for c in cells))
    plot(summary, names, a.rt60, os.path.join(out, "fig_array_study.png"))


def plot(summary, names, rts, path):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import logging; logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
    plt.rcParams.update({"font.sans-serif": ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei", "DejaVu Sans"],
                         "axes.unicode_minus": False, "font.size": 9})
    NAVY, TEAL, LIGHT = "#134074", "#1F7A68", "#B9C7D6"
    g = lambda **kw: next(x for x in summary if all(x[k] == v for k, v in kw.items()))
    fig, ax = plt.subplots(figsize=(11.5, 3.9), dpi=200)
    xs = np.arange(len(names)); bw = 0.26
    for i, (m, c, lb) in enumerate(zip(METHODS, [LIGHT, TEAL, NAVY], ["SRP-PHAT", "GEVD-MUSIC（固定背景段）", "自适应背景 GEVD-MUSIC"])):
        v = [np.mean([g(rt60=rt, cond=cn, array=n, win=0.5, method=m)["acc10"] for rt in rts for cn in R.CONDS]) * 100 for n in names]
        bars = ax.bar(xs + (i - 1) * bw, v, bw * 0.92, color=c, label=lb)
        for b, vv in zip(bars, v):
            ax.text(b.get_x() + b.get_width() / 2, vv + 1, f"{vv:.0f}", ha="center", fontsize=7, color="#333")
    ax.set_xticks(xs); ax.set_xticklabels(names, fontsize=8.5); ax.set_ylim(0, 100)
    ax.set_ylabel("误差 ≤10° 的比例（%）")
    ax.set_title("候选阵列对比：四种会议条件、两档 RT60 平均，B 开口后 0.5 s 判决（仿真）", fontsize=10.5, fontweight="bold", color=NAVY)
    ax.legend(fontsize=8, frameon=False, loc="upper left", ncol=3)
    ax.grid(axis="y", color="#E3E8EF", lw=0.7); ax.spines[["top", "right"]].set_visible(False); ax.set_axisbelow(True)
    fig.tight_layout(); fig.savefig(path, facecolor="white"); plt.close(fig)


if __name__ == "__main__":
    main()
