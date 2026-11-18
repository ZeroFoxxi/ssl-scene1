"""画算法选型结果图：out/fig_algo_selection.png"""
import json, os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out")
for name in ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei"]:
    if any(name in f.name for f in font_manager.fontManager.ttflist):
        plt.rcParams["font.sans-serif"] = [name]
        break
plt.rcParams["axes.unicode_minus"] = False
S = json.load(open(os.path.join(OUT, "algo_selection_summary.json"), encoding="utf-8"))
conds = list(S["results"])
methods = [("SRP-PHAT", "#8da9c4"), ("SRP-PHAT + 起始段加权", "#5b7fa6"), ("MUSIC", "#b8b8b8"),
           ("GEVD-MUSIC + 起始段加权", "#134074"), ("仅视觉（唇动最高的人脸）", "#f2b880"),
           ("SRP-PHAT + 视觉", "#e07a1f"), ("GEVD-MUSIC 5° + 视觉（软融合）", "#9c2c13")]
fig, ax = plt.subplots(figsize=(13, 4.6))
w = 0.12
for i, (m, col) in enumerate(methods):
    v = [S["results"][c][m]["acc10"] * 100 for c in conds]
    xs = [j + (i - 3) * w for j in range(len(conds))]
    ax.bar(xs, v, w, label=m, color=col)
    for x, y in zip(xs, v):
        ax.text(x, y + 1, f"{y:.0f}", ha="center", fontsize=7)
labels = [c.split(" ", 1)[0] + "\n" + c.split(" ", 1)[1].replace("（", "\n（") for c in conds]
ax.set_xticks(range(len(conds)), labels, fontsize=9)
ax.set_ylabel("目标方位误差 ≤10° 的比例（%）")
ax.set_ylim(0, 128)
ax.set_yticks(range(0, 101, 20))
ax.set_title("候选测向方法与音视频融合（两耳组阵，开口后 0.5 s 判决）", fontsize=11)
ax.legend(fontsize=8, ncol=4, loc="upper center")
n = S["setup"]["trials_per_condition"]
fig.text(0.01, 0.01, f"仿真：刚性球头部模型，每耳 2 麦；目标在前方 ±60°，视野内另有 1 个不说话的旁人；视觉为模拟（方位误差 2°、唇动错误 10%）；每条件 {n} 次", fontsize=8, color="gray")
fig.tight_layout(rect=(0, 0.04, 1, 1))
fig.savefig(os.path.join(OUT, "fig_algo_selection.png"), dpi=150)
print("saved")
