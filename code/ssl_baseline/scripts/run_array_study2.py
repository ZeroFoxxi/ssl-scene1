# -*- coding: utf-8 -*-
"""阵列选型第二轮（会议室，摄像头贴前墙安装）。

第一部分：线阵"麦克风数 × 孔径"拆开比较（2 / 4 / 6 / 8 麦 × 6 / 10.5 / 17.5 / 24.5 cm），并记录每次判决的计算耗时。
          阵元间距大于约 4.3 cm 时 4 kHz 以下就会出现空间混叠，测向频带上限自动降到混叠频率的 0.95 倍（这是大间距的真实代价）。
第二部分：离墙距离（4 / 8 / 15 / 50 cm）对候选阵列的影响（4 麦线阵 10.5 cm、8 麦线阵 17.5 cm、4 麦圆阵 6 cm 旋转 45°）。

方法：SRP-PHAT、GEVD-MUSIC（固定背景段）、自适应背景 GEVD-MUSIC；场景与条件同 run_meeting_eval.py。
运行：python scripts/run_array_study2.py --trials 100
输出：out/array_study2_count_aperture.csv、out/array_study2_wall.csv、out/array_study2_summary.json、out/fig_array_study2.png
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
METHODS = ["S SRP-PHAT", "G GEVD-MUSIC", "T 自适应背景"]


def lin(n, aperture):
    return np.stack([np.zeros(n), (np.arange(n) - (n - 1) / 2) * aperture / (n - 1)], 0)


PART1 = {f"{n}麦线阵 {ap*100:g}cm": lin(n, ap) for n, aps in [(2, [0.06, 0.105, 0.175]), (4, [0.06, 0.105, 0.175]),
                                                                (6, [0.105, 0.175]), (8, [0.105, 0.175, 0.245])] for ap in aps}
PART2 = {"4麦线阵 10.5cm": lin(4, 0.105), "8麦线阵 17.5cm": lin(8, 0.175), "4麦圆阵 6cm 45°": ring_array(4, 0.03, 45.0)}
WALLS = [0.04, 0.08, 0.15, 0.5]   # 圆阵半径 3 cm，最近只能放到 4 cm


def make_est(xy):
    srp = SRPConfig(fmax=min(4000.0, 0.95 * aliasing_frequency(xy)))
    base = dict(pad_post=0.0, exclude=R.FRONT, srp=srp)
    return {METHODS[0]: WakeDOA(xy, FS, WakeDOAConfig(method="srp_sub", bg_subtract=False, **base)),
            METHODS[1]: WakeDOA(xy, FS, WakeDOAConfig(**base)),
            METHODS[2]: TurnDOA(xy, FS, TurnDOAConfig(exclude=R.FRONT, srp=srp))}, srp.fmax


def run(arrays, trials, rts, wall, rng, sp, en, label, timing=None):
    R.WALL_D = wall
    names = list(arrays); xys = [arrays[n] for n in names]
    idx = np.cumsum([0] + [x.shape[1] for x in xys]); allxy = np.hstack(xys)
    est = {n: make_est(arrays[n])[0] for n in names}
    raw = []
    for rt in rts:
        t0 = time.time()
        for k in range(trials):
            r = R.render_trial(rng, sp, en, rt, mic_xy=allxy)
            for cond in R.CONDS:
                y, ynoise = R.mix(rng, r, cond)
                s0 = r["start"]
                for i, n in enumerate(names):
                    x, xn = y[idx[i]:idx[i + 1]], ynoise[idx[i]:idx[i + 1]]
                    est[n][METHODS[2]].set_noise(xn)
                    for w in WINS:
                        for m in METHODS:
                            tt = time.perf_counter()
                            az = est[n][m].localize(x, s0, s0 + int(w * FS)).az
                            if timing is not None and w == 0.5:
                                timing.setdefault((n, m), []).append(time.perf_counter() - tt)
                            raw.append({"rt60": rt, "cond": cond, "array": n, "win": w, "method": m, "wall": wall,
                                        "err": float(metrics.angdiff(az, r["azB"]))})
            if (k + 1) % 20 == 0:
                print(f"[{label}] RT60={rt}s  {k + 1}/{trials}  {time.time() - t0:.0f}s", flush=True)
    return raw


def summarize(raw, keys):
    out = []
    groups = {}
    for x in raw:
        groups.setdefault(tuple(x[k] for k in keys), []).append(x["err"])
    for g, e in groups.items():
        e = np.array(e)
        out.append({**dict(zip(keys, g)), "mae": round(float(e.mean()), 2), "acc10": round(float((e <= 10).mean()), 3),
                    "wrong20": round(float((e > 20).mean()), 3), "n": int(len(e))})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=100)
    ap.add_argument("--rt60", type=float, nargs="+", default=[0.3, 0.6])
    ap.add_argument("--wall-trials", type=int, default=50)
    a = ap.parse_args()
    sp, en = R.load("speech_zh.wav"), R.load("tv_en.wav")
    keys = ["rt60", "cond", "array", "win", "method", "wall"]
    timing = {}
    raw1 = run(PART1, a.trials, a.rt60, 0.08, np.random.default_rng(2026), sp, en, "数量×孔径", timing)
    raw2 = []
    for wd in WALLS:
        raw2 += run(PART2, a.wall_trials, a.rt60, wd, np.random.default_rng(2026), sp, en, f"离墙 {wd} m")
    R.WALL_D = 0.08
    s1, s2 = summarize(raw1, keys), summarize(raw2, keys)
    out = os.path.join(ROOT, "out"); os.makedirs(out, exist_ok=True)
    for fn, s in [("array_study2_count_aperture.csv", s1), ("array_study2_wall.csv", s2)]:
        with open(os.path.join(out, fn), "w", newline="", encoding="utf-8-sig") as fh:
            wr = csv.DictWriter(fh, fieldnames=keys + ["mae", "acc10", "wrong20", "n"]); wr.writeheader(); wr.writerows(s)
    tm = {f"{n} | {m}": round(1000 * float(np.mean(v)), 2) for (n, m), v in timing.items()}
    fmax = {n: round(make_est(xy)[1]) for n, xy in PART1.items()}
    json.dump({"config": {"trials_part1": a.trials, "trials_wall": a.wall_trials, "rt60": a.rt60, "windows_s": WINS, "walls_m": WALLS,
                          "fmax_hz": fmax}, "timing_ms_python_0.5s": tm, "count_aperture": s1, "wall": s2},
              open(os.path.join(out, "array_study2_summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    def avg(S, **kw):
        sel = [x["acc10"] for x in S if all(x[k] == v for k, v in kw.items())]
        return 100 * float(np.mean(sel))
    print("\n第一部分：线阵 麦克风数 × 孔径（四种条件、两档 RT60 平均的 ≤10° 比例，0.5 s / 1.0 s；GEVD 耗时 ms）")
    for n in PART1:
        cells = "  ".join(f"{m.split(' ')[1]} {avg(s1, array=n, method=m, win=0.5):5.1f}/{avg(s1, array=n, method=m, win=1.0):5.1f}" for m in METHODS)
        print(f"{n:<14} fmax {fmax[n]:>5}Hz  {cells}   GEVD {tm[f'{n} | {METHODS[1]}']:.1f} ms")
    print("\n第二部分：离墙距离（GEVD-MUSIC 固定背景段 / 自适应背景，0.5 s）")
    for n in PART2:
        print(f"{n:<16}" + "  ".join(f"{wd*100:g}cm: {avg(s2, array=n, method=METHODS[1], win=0.5, wall=wd):5.1f}/{avg(s2, array=n, method=METHODS[2], win=0.5, wall=wd):5.1f}" for wd in WALLS))
    plot(s1, s2, fmax, tm, os.path.join(out, "fig_array_study2.png"))


def plot(s1, s2, fmax, tm, path):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import logging; logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
    plt.rcParams.update({"font.sans-serif": ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei", "DejaVu Sans"],
                         "axes.unicode_minus": False, "font.size": 9})
    NAVY, TEAL, ORANGE, GRAY = "#134074", "#1F7A68", "#D9822B", "#5B6B7F"

    def best(S, **kw):
        return max(100 * float(np.mean([x["acc10"] for x in S if x["method"] == m and all(x[k] == v for k, v in kw.items())])) for m in METHODS[1:])
    fig, axs = plt.subplots(1, 2, figsize=(11.5, 3.8), dpi=200)
    ax = axs[0]
    for n_m, c in zip([2, 4, 6, 8], [GRAY, TEAL, ORANGE, NAVY]):
        names = [n for n in PART1 if n.startswith(f"{n_m}麦")]
        aps = [float(n.split(" ")[1][:-2]) for n in names]
        ax.plot(aps, [best(s1, array=n, win=0.5) for n in names], "-o", color=c, ms=4, lw=1.6, label=f"{n_m} 麦线阵")
    ax.set_xlabel("孔径（cm）"); ax.set_ylabel("误差 ≤10° 的比例（%）"); ax.set_ylim(30, 100)
    ax.set_title("线阵：麦克风数 × 孔径（GEVD 类方法中较好者，0.5 s 判决）", fontsize=10, fontweight="bold", color=NAVY)
    ax.legend(fontsize=8, frameon=False); ax.grid(color="#E3E8EF", lw=0.7); ax.spines[["top", "right"]].set_visible(False)
    ax = axs[1]
    for n, c in zip(PART2, [TEAL, NAVY, ORANGE]):
        ax.plot([w * 100 for w in WALLS], [best(s2, array=n, win=0.5, wall=w) for w in WALLS], "-o", color=c, ms=4, lw=1.6, label=n)
    ax.set_xscale("log"); ax.set_xticks([w * 100 for w in WALLS]); ax.set_xticklabels([f"{w*100:g}" for w in WALLS])
    ax.set_xlabel("阵列中心到前墙的距离（cm）"); ax.set_ylim(30, 100)
    ax.set_title("离墙距离的影响（0.5 s 判决）", fontsize=10, fontweight="bold", color=NAVY)
    ax.legend(fontsize=8, frameon=False); ax.grid(color="#E3E8EF", lw=0.7); ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout(); fig.savefig(path, facecolor="white"); plt.close(fig)


if __name__ == "__main__":
    main()
