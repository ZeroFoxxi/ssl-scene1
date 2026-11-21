# -*- coding: utf-8 -*-
"""实录回放 demo 的图与视频（读取 run_realman_replay_demo.py 的输出）。

1. 每个场景一段示例会议：真实方位（灰）与摄像头朝向（蓝），上下两栏为传统方法与小网络，点为每次测向判决（绿：置信度 ≥ 门限，红：低于门限不转）；
2. 汇总图：各方法的对准比例（静止 / 走动）与每分钟误转；
3. --video SCENE：该场景示例会议的动画（俯视图：阵列、说话人方向、摄像头朝向；下方滚动时间轴），配参考麦克风的原始录音。
运行：python scripts/plot_realman_replay_demo.py --video LivingRoom2
输出：out/demo/fig_replay_<场景>.png、out/demo/fig_replay_summary.png、out/demo/replay_<场景>.mp4
"""
import argparse, json, os, subprocess, sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out", "demo")
NAVY, GRAY, GREEN, RED, LIGHT = "#134074", "#9AA3AD", "#2E8B57", "#C0392B", "#C9CED6"
TRAD, NN, TH = "GEVD-MUSIC", "小网络（+实录微调）|置信≥0.7", 0.7
LABEL = {"SRP-PHAT": "SRP-PHAT", "GEVD-MUSIC": "GEVD-MUSIC", "小网络（仿真训练）": "小网络\n仿真训练",
         "小网络（仿真训练）|置信≥0.7": "小网络\n仿真训练\n+置信度", "小网络（+实录微调）": "小网络\n实录微调",
         "小网络（+实录微调）|置信≥0.7": "小网络\n实录微调\n+置信度",
         "小网络（+实录微调+纯噪声）|置信≥0.53": "小网络\n+纯噪声训练\n+置信度",
         "小网络（+实录微调+有人判断）|置信≥0.7": "小网络\n+有人判断\n+置信度"}


def setup_font():
    names = {f.name for f in font_manager.fontManager.ttflist}
    for fnt in ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei"]:
        if fnt in names:
            plt.rcParams["font.sans-serif"] = [fnt]; break
    plt.rcParams["axes.unicode_minus"] = False
    import logging; logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)


w180 = lambda a: (np.asarray(a, float) + 180) % 360 - 180


def truth_lines(ax, turns):
    for t in turns:
        if t["kind"] == "moving":
            tt = t["start"] + np.arange(len(t["traj"])) * 0.1; keep = tt <= t["end"]
            ax.plot(tt[keep], np.array(t["traj"])[keep], color=GRAY, lw=6, alpha=0.45, solid_capstyle="butt")
        else:
            ax.plot([t["start"], t["end"]], [t["traj"][0]] * 2, color=GRAY, lw=6, alpha=0.45, solid_capstyle="butt")


def fig_example(ex, path):
    fig, axs = plt.subplots(2, 1, figsize=(12, 5.6), sharex=True, dpi=150)
    for ax, m, name in [(axs[0], TRAD, "传统方法（GEVD-MUSIC）"), (axs[1], NN, "小网络（实录微调）+ 置信度门限 0.7")]:
        truth_lines(ax, ex["turns"])
        tb = (np.arange(len(ex["pans"][m])) + 1) * 0.1
        ax.plot(tb, w180(ex["pans"][m]), color=NAVY, lw=1.6)
        for t, a, c in ex["decisions"][m]:
            ok = not (c == c) or c >= TH or m == TRAD
            ax.scatter(t, w180(a), s=12, color=GREEN if ok else RED, zorder=5, lw=0)
        ax.set_ylim(-90, 90); ax.set_yticks([-90, -45, 0, 45, 90]); ax.grid(color="#E3E8EF", lw=0.7)
        ax.set_ylabel("方位（°）"); ax.spines[["top", "right"]].set_visible(False)
        ax.set_title(name, loc="left", fontsize=10.5, fontweight="bold", color=NAVY)
    axs[1].set_xlabel("时间（s）"); axs[1].set_xlim(0, 60)
    h = [plt.Line2D([], [], color=GRAY, lw=6, alpha=0.45), plt.Line2D([], [], color=NAVY, lw=1.6),
         plt.Line2D([], [], marker="o", ls="", color=GREEN, ms=4), plt.Line2D([], [], marker="o", ls="", color=RED, ms=4)]
    axs[0].legend(h, ["说话人真实方位", "摄像头朝向", "测向判决", "置信度低，不转"], ncol=4, fontsize=8, frameon=False, loc="upper right")
    fig.suptitle(f"实录回放：RealMAN {ex['scene']}（60 s 连续会议，真实录音）", fontsize=11, x=0.01, ha="left")
    fig.tight_layout(); fig.savefig(path); plt.close(fig)


def fig_summary(summ, path):
    ms = [m for m in LABEL if m in summ]
    fig, axs = plt.subplots(1, 2, figsize=(13, 4.2), dpi=150, gridspec_kw={"width_ratios": [1.5, 1.15]})
    x = np.arange(len(ms)); w = 0.27
    for k, (key, lb, c) in enumerate([("framed_static", "静止说话人 ≤10°", NAVY), ("framed_moving", "走动说话人 ≤10°", "#5B7FA6"),
                                      ("framed20_moving", "走动说话人 ≤20°", LIGHT)]):
        v = [summ[m][key] * 100 for m in ms]
        b = axs[0].bar(x + (k - 1) * w, v, w * 0.92, color=c, label=lb)
        for bb, vv in zip(b, v):
            axs[0].text(bb.get_x() + bb.get_width() / 2, vv + 1, f"{vv:.0f}", ha="center", fontsize=7.5)
    axs[0].set_xticks(x); axs[0].set_xticklabels([LABEL[m] for m in ms], fontsize=8); axs[0].set_ylim(0, 105)
    axs[0].set_ylabel("发言时间中画面对准的比例（%）"); axs[0].legend(fontsize=8, frameon=False, ncol=3, loc="upper left")
    v = [summ[m]["wrong_per_min"] for m in ms]
    b = axs[1].bar(x, v, 0.6, color=[LIGHT if "小网络" not in m else NAVY for m in ms])
    for bb, vv in zip(b, v):
        axs[1].text(bb.get_x() + bb.get_width() / 2, vv + 0.05, f"{vv:.1f}", ha="center", fontsize=8)
    axs[1].set_xticks(x); axs[1].set_xticklabels([LABEL[m].replace("-", "-\n", 1) if "小网络" not in m else LABEL[m] for m in ms], fontsize=7.5); axs[1].set_ylabel("每分钟误转次数")
    for ax in axs:
        ax.spines[["top", "right"]].set_visible(False); ax.grid(axis="y", color="#E3E8EF", lw=0.7); ax.set_axisbelow(True)
    fig.tight_layout(); fig.savefig(path); plt.close(fig)


def video(ex, wav, path, fps=10):
    from matplotlib.animation import FFMpegWriter
    tb = (np.arange(len(ex["pans"][NN])) + 1) * 0.1
    pans = {m: w180(ex["pans"][m]) for m in (TRAD, NN)}

    def truth_at(t):
        for tr in reversed(ex["turns"]):
            if tr["start"] <= t < tr["end"]:
                i = int(np.clip((t - tr["start"]) / 0.1, 0, len(tr["traj"]) - 1)); return tr["traj"][i]
        return None

    fig = plt.figure(figsize=(9.6, 5.4), dpi=100)
    axp = fig.add_axes([0.02, 0.36, 0.46, 0.56]); axq = fig.add_axes([0.52, 0.36, 0.46, 0.56]); axt = fig.add_axes([0.07, 0.12, 0.9, 0.19])
    truth_lines(axt, ex["turns"])
    axt.plot(tb, pans[NN], color=NAVY, lw=1.3); axt.set_xlim(0, 60); axt.set_ylim(-90, 90); axt.set_yticks([-90, 0, 90])
    axt.set_xlabel("时间（s）", fontsize=9); axt.set_ylabel("方位（°）", fontsize=9); axt.spines[["top", "right"]].set_visible(False)
    axt.set_title("灰：说话人真实方位　蓝：摄像头朝向（小网络 + 置信度）", fontsize=9, loc="left", color="#555")
    cur = axt.axvline(0, color=RED, lw=1)
    arts = {}
    for ax, m, name in [(axp, TRAD, "传统方法（GEVD-MUSIC）"), (axq, NN, "小网络 + 置信度")]:
        ax.set_xlim(-1.15, 1.15); ax.set_ylim(-0.25, 1.15); ax.set_aspect("equal"); ax.axis("off")
        th = np.linspace(0, np.pi, 100); ax.plot(np.cos(th), np.sin(th), color="#E3E8EF", lw=1)
        for a in (-60, -30, 0, 30, 60):
            r = np.deg2rad(90 - a); ax.plot([0, np.cos(r)], [0, np.sin(r)], color="#F0F2F5", lw=0.8)
        ax.plot([-0.08, 0.08], [0, 0], color="#333", lw=4)
        ax.set_title(name, fontsize=11, color=NAVY, fontweight="bold")
        arts[m] = {"spk": ax.scatter([], [], s=160, color=GRAY, zorder=3), "cam": ax.plot([], [], color=NAVY, lw=3)[0],
                   "fan": ax.fill([0, 0, 0], [0, 0, 0], color=NAVY, alpha=0.12)[0], "txt": ax.text(0, -0.18, "", ha="center", fontsize=10)}
    title = fig.text(0.02, 0.96, f"RealMAN {ex['scene']} 真实录音回放（俯视，0° 为阵列正前方）", fontsize=11)

    def upd(i):
        t = (i + 1) / fps; b = min(len(tb) - 1, int(round(t / 0.1)) - 1)
        tr = truth_at(t)
        for m in (TRAD, NN):
            p = pans[m][b]; r = np.deg2rad(90 - p)
            arts[m]["cam"].set_data([0, 0.95 * np.cos(r)], [0, 0.95 * np.sin(r)])
            r1, r2 = np.deg2rad(90 - p - 10), np.deg2rad(90 - p + 10)
            arts[m]["fan"].set_xy([[0, 0], [np.cos(r1), np.sin(r1)], [np.cos(r2), np.sin(r2)]])
            if tr is None:
                arts[m]["spk"].set_offsets(np.empty((0, 2))); arts[m]["txt"].set_text("无人说话")
            else:
                rs = np.deg2rad(90 - tr); arts[m]["spk"].set_offsets([[np.cos(rs), np.sin(rs)]])
                e = abs(w180(p - tr)); arts[m]["txt"].set_text(f"误差 {e:.0f}°" + ("（已对准）" if e <= 10 else ""))
                arts[m]["txt"].set_color(GREEN if e <= 10 else RED)
        cur.set_xdata([t, t])
        return []

    tmp = path.replace(".mp4", "_noaudio.mp4")
    wr = FFMpegWriter(fps=fps, bitrate=1800)
    with wr.saving(fig, tmp, dpi=100):
        for i in range(int(60 * fps)):
            upd(i); wr.grab_frame()
    plt.close(fig)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-i", wav, "-c:v", "copy", "-c:a", "aac", "-b:a", "96k", "-shortest", path], check=True)
    os.remove(tmp)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=os.path.join(ROOT, "out", "realman_replay_test.json"))
    ap.add_argument("--video", default=None, help="生成该场景示例会议的视频")
    a = ap.parse_args()
    setup_font(); os.makedirs(OUT, exist_ok=True)
    d = json.load(open(a.data, encoding="utf-8"))
    for ex in d["examples"]:
        fig_example(ex, os.path.join(OUT, f"fig_replay_{ex['scene']}.png"))
    fig_summary(d["summary"], os.path.join(OUT, "fig_replay_summary.png"))
    if a.video:
        ex = next(e for e in d["examples"] if e["scene"] == a.video)
        wav = os.path.join(OUT, f"replay_{d['config']['split']}_{ex['scene']}_{ex['k']}.wav")
        video(ex, wav, os.path.join(OUT, f"replay_{ex['scene']}.mp4"))
    print("完成：", OUT)


if __name__ == "__main__":
    main()
