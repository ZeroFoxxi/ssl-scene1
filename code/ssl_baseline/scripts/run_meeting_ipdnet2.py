# -*- coding: utf-8 -*-
"""会议室换人测向：IPDnet2（官方预训练 Small 版，1.26 M 参数，RealMAN 实录训练）与传统方法在同一仿真、同一阵列上比较。

阵列：IPDnet2 预训练模型对应的 5 麦（半径 3 cm 圆周 4 麦 + 中心 1 麦），传统方法用同样 5 路。
场景、条件、指标与 run_meeting_eval.py 相同（同一随机种子 → 同一批房间与座位）。

方法：
  S    SRP-PHAT
  G    GEVD-MUSIC（固定背景段：开口前约 1 s）
  T    自适应背景 GEVD-MUSIC（ssl_baseline/turn.py）
  N    IPDnet2：判决窗口内两条轨迹的方位按匹配误差加权投票
  N2   IPDnet2 + 扣除开口前已存在的方位（开口前 0.6 s 内的投票视为上一位 / 持续干扰）

运行（需要 torch 与官方仓库）：
  git clone https://github.com/Audio-WestlakeU/FN-SSL
  IPDNET2_DIR=FN-SSL/IPDnet2 python scripts/run_meeting_ipdnet2.py --trials 100
输出：out/meeting_ipdnet2.csv、out/meeting_ipdnet2_summary.json、out/fig_meeting_ipdnet2.png
"""
import argparse, csv, json, os, sys, time
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_meeting_eval as R
from ssl_baseline import metrics
from ssl_baseline.wake import WakeDOA, WakeDOAConfig
from ssl_baseline.turn import TurnDOA, TurnDOAConfig
from ssl_baseline.ipdnet2_adapter import IPDnet2Localizer, ARRAY_XY

FS = R.FS
METHODS = ["S SRP-PHAT", "G GEVD-MUSIC", "T 自适应背景", "N IPDnet2", "N2 IPDnet2+扣除开口前方向"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=100)
    ap.add_argument("--rt60", type=float, nargs="+", default=[0.3, 0.6])
    ap.add_argument("--ipdnet2-dir", default=None)
    a = ap.parse_args()
    sp, en = R.load("speech_zh.wav"), R.load("tv_en.wav")
    base = dict(pad_post=0.0, exclude=R.FRONT)
    srp = WakeDOA(ARRAY_XY, FS, WakeDOAConfig(method="srp_sub", bg_subtract=False, **base))
    gev = WakeDOA(ARRAY_XY, FS, WakeDOAConfig(**base))
    turn = TurnDOA(ARRAY_XY, FS, TurnDOAConfig(exclude=R.FRONT))
    net = IPDnet2Localizer(a.ipdnet2_dir)
    rng = np.random.default_rng(2026)
    raw, tnet = [], []
    for rt in a.rt60:
        t0 = time.time()
        for k in range(a.trials):
            r = R.render_trial(rng, sp, en, rt, mic_xy=ARRAY_XY)
            for cond in R.CONDS:
                y, ynoise = R.mix(rng, r, cond)
                rng.normal()   # 与 run_meeting_eval 的随机数消耗对齐（起点误差抽样）
                turn.set_noise(ynoise)
                s0 = r["start"]; ton = s0 / FS
                tt = time.perf_counter(); tr = net.tracks(y[:, : s0 + int(max(R.WINDOWS) * FS)]); tnet.append(time.perf_counter() - tt)
                for win in R.WINDOWS:
                    e = s0 + int(win * FS)
                    res = {METHODS[0]: srp.localize(y, s0, e).az, METHODS[1]: gev.localize(y, s0, e).az,
                           METHODS[2]: turn.localize(y, s0, e).az,
                           METHODS[3]: net.decide(tr, ton - 0.1, ton + win, exclude=R.FRONT, max_mse=0.2),
                           METHODS[4]: net.decide(tr, ton - 0.1, ton + win, exclude=R.FRONT, max_mse=0.2, prev=(ton - 0.7, ton - 0.1))}
                    for m, az in res.items():
                        if not np.isfinite(az):
                            az = 180.0  # 无有效输出：记为背后方向（必然判错）
                        eB, eA = float(metrics.angdiff(az, r["azB"])), float(metrics.angdiff(az, r["azA"]))
                        raw.append({"rt60": rt, "cond": cond, "win": win, "method": m, "truth": round(r["azB"], 2),
                                    "est": round(az, 2), "err": round(eB, 2), "stuck_prev": int(eA < eB)})
            if (k + 1) % 10 == 0:
                print(f"RT60={rt}s  {k + 1}/{a.trials}  {time.time() - t0:.0f}s", flush=True)
    summary = []
    for rt in a.rt60:
        for cond in R.CONDS:
            for win in R.WINDOWS:
                for m in METHODS:
                    sel = [x for x in raw if x["rt60"] == rt and x["cond"] == cond and x["win"] == win and x["method"] == m]
                    e = np.array([x["err"] for x in sel])
                    summary.append({"rt60": rt, "cond": cond, "win": win, "method": m, "mae": round(float(e.mean()), 2),
                                    "median": round(float(np.median(e)), 2), "acc10": round(float((e <= 10).mean()), 3),
                                    "wrong20": round(float((e > 20).mean()), 3),
                                    "stuck_prev": round(float(np.mean([x["stuck_prev"] for x in sel])), 3), "n": len(sel)})
    out = os.path.join(ROOT, "out"); os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, "meeting_ipdnet2.csv"), "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=list(summary[0].keys())); w.writeheader(); w.writerows(summary)
    audio_s = (R.T_ON + max(R.WINDOWS))
    json.dump({"config": {"trials_per_rt60": a.trials, "rt60": a.rt60, "windows_s": R.WINDOWS,
                          "array": "5 麦：半径 3 cm 圆周 4 麦 + 中心（IPDnet2 预训练模型对应几何）",
                          "ipdnet2": {"checkpoint": "ipdnet2_small.ckpt（官方，RealMAN 训练）", "params": net.n_params,
                                      "cpu_pytorch_s_per_clip": round(float(np.mean(tnet)), 3), "clip_s": audio_s}},
               "summary": summary}, open(os.path.join(out, "meeting_ipdnet2_summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\n{'RT60':>4} {'窗口':>4} {'条件':<10} {'方法':<24} {'MAE':>6} {'≤10°':>6} {'>20°':>6} {'停上一位':>6}")
    for r in summary:
        if r["win"] == 0.5:
            print(f"{r['rt60']:>4} {r['win']:>4} {r['cond']:<10} {r['method']:<24} {r['mae']:>6.1f} {r['acc10']*100:>5.0f}% {r['wrong20']*100:>5.0f}% {r['stuck_prev']*100:>5.0f}%")
    print("IPDnet2 参数量", net.n_params, "；CPU（纯 PyTorch Mamba）每段", audio_s, "s 音频耗时", round(float(np.mean(tnet)), 2), "s")
    plot(summary, a.rt60, os.path.join(out, "fig_meeting_ipdnet2.png"))


def plot(summary, rts, path):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import logging; logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
    plt.rcParams.update({"font.sans-serif": ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei", "DejaVu Sans"],
                         "axes.unicode_minus": False, "font.size": 9})
    NAVY, TEAL, GRAY, LIGHT, ORANGE = "#134074", "#1F7A68", "#5B6B7F", "#B9C7D6", "#D9822B"
    get = lambda **kw: next(r for r in summary if all(r[k] == v for k, v in kw.items()))
    fig, axs = plt.subplots(1, len(rts) + 1, figsize=(4.6 * len(rts) + 4.0, 3.7), dpi=200,
                            gridspec_kw={"width_ratios": [1.25] * len(rts) + [1]})
    show = [METHODS[0], METHODS[1], METHODS[2], METHODS[3], METHODS[4]]
    cols = [LIGHT, GRAY, TEAL, ORANGE, NAVY]
    labels = ["SRP-PHAT", "GEVD-MUSIC（固定背景段）", "自适应背景 GEVD-MUSIC", "IPDnet2", "IPDnet2 + 扣除开口前方向"]
    xs = np.arange(len(R.CONDS)); bw = 0.16
    for ax, rt in zip(axs[:-1], rts):
        for i, (m, c, lb) in enumerate(zip(show, cols, labels)):
            v = [get(rt60=rt, cond=cn, win=0.5, method=m)["acc10"] * 100 for cn in R.CONDS]
            bars = ax.bar(xs + (i - 2) * bw, v, bw * 0.92, color=c, label=lb)
            for b, vv in zip(bars, v):
                ax.text(b.get_x() + b.get_width() / 2, vv + 1, f"{vv:.0f}", ha="center", fontsize=6, color="#333")
        ax.set_xticks(xs); ax.set_xticklabels([c.split(" ")[1] for c in R.CONDS]); ax.set_ylim(0, 118)
        ax.set_title(f"RT60 {rt} s：B 开口后 0.5 s 判决", fontsize=10, fontweight="bold", color=NAVY)
        ax.grid(axis="y", color="#E3E8EF", lw=0.7); ax.spines[["top", "right"]].set_visible(False); ax.set_axisbelow(True)
    axs[0].set_ylabel("误差 ≤10° 的比例（%）")
    axs[0].legend(fontsize=6.5, frameon=False, loc="upper right", ncol=2)
    ax = axs[-1]
    for m, c, lb in zip(show, cols, labels):
        v = [np.mean([get(rt60=rt, cond=cn, win=w, method=m)["acc10"] for rt in rts for cn in R.CONDS]) * 100 for w in R.WINDOWS]
        ax.plot(R.WINDOWS, v, "-", color=c, marker="o", ms=4, lw=1.6, label=lb)
    ax.set_xticks(R.WINDOWS); ax.set_xlabel("判决窗口：B 开口后（s）"); ax.set_ylim(0, 100)
    ax.set_title("各条件、各 RT60 平均", fontsize=10, fontweight="bold", color=NAVY)
    ax.legend(fontsize=6.5, frameon=False, loc="lower right"); ax.grid(color="#E3E8EF", lw=0.7); ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout(); fig.savefig(path, facecolor="white"); plt.close(fig)


if __name__ == "__main__":
    main()
