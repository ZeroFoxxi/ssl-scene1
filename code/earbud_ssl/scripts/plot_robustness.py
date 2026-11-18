"""画稳健性验证结果图：out/fig_robustness.png"""
import json, os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out")
for name in ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei"]:
    if any(name in f.name for f in font_manager.fontManager.ttflist):
        plt.rcParams["font.sans-serif"] = [name]; break
plt.rcParams["axes.unicode_minus"] = False
T = json.load(open(os.path.join(OUT, "robust_turn_summary.json"), encoding="utf-8"))["results"]
C = json.load(open(os.path.join(OUT, "robust_turntaking_summary.json"), encoding="utf-8"))["results"]
fig, (a1, a2) = plt.subplots(1, 2, figsize=(12, 4.2))
for k, lab, col, ls in [("GEVD-MUSIC（转头前的背景）", "GEVD-MUSIC，转头前的背景", "#134074", "-"),
                        ("GEVD-MUSIC + IMU 旋转背景", "GEVD-MUSIC，IMU 旋转背景", "#2e86ab", "--"),
                        ("MUSIC（不白化）", "MUSIC，不白化", "#999999", "-")]:
    xs = [int(x) for x in T]
    a1.plot(xs, [T[x][k]["acc10"] * 100 for x in T], "o" + ls, color=col, label=lab)
    a1.plot(xs, [T[x][k + " + 视觉"]["acc10"] * 100 for x in T], "s:", color=col, alpha=0.6, label=lab + " + 视觉")
a1.set_xticks([0, 15, 30, 60]); a1.set_xlabel("背景估计后、对方开口前的转头角度（°）"); a1.set_ylabel("≤10° 的比例（%）")
a1.set_ylim(30, 102); a1.set_title("① 转头", fontsize=11); a1.legend(fontsize=7, loc="lower left")
labels = [f"{x} s" for x in C]
ks = [("GEVD-MUSIC（开口前固定窗口）", "GEVD-MUSIC，开口前固定窗口", "#e07a1f"),
      ("GEVD-MUSIC（唇动门控背景）", "GEVD-MUSIC，唇动门控背景", "#134074"),
      ("MUSIC（不白化）", "MUSIC，不白化", "#999999")]
w = 0.26
for i, (k, lab, col) in enumerate(ks):
    v = [C[x][k]["acc10"] * 100 for x in C]
    xs = [j + (i - 1) * w for j in range(len(C))]
    a2.bar(xs, v, w, color=col, label=lab)
    for x, y in zip(xs, v):
        a2.text(x, y + 1, f"{y:.0f}", ha="center", fontsize=8)
a2.set_xticks(range(len(C)), labels); a2.set_xlabel("对方两句话之间的停顿"); a2.set_ylabel("≤10° 的比例（%）")
a2.set_ylim(0, 130); a2.set_yticks(range(0, 101, 20)); a2.set_title("② 对话轮流（测第二句）", fontsize=11); a2.legend(fontsize=8, loc="upper center", ncol=2)
fig.text(0.01, 0.01, "仿真：刚性球头部模型，两耳组阵 4 麦；混响 RT60 0.5 s + 2 个干扰说话人（各低 6 dB）+ SNR 10 dB；开口后 0.5 s 判决；每档 100 次", fontsize=8, color="gray")
fig.tight_layout(rect=(0, 0.04, 1, 1)); fig.savefig(os.path.join(OUT, "fig_robustness.png"), dpi=150); print("saved")
