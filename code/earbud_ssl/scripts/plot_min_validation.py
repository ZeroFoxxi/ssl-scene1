"""画最小验证结果图：out/fig_min_validation.png"""
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

S = json.load(open(os.path.join(OUT, "min_validation_summary.json"), encoding="utf-8"))
conds = ["C1 安静", "C2 嘈杂 SNR 5 dB", "C3 混响 RT60 0.5 s", "C4 混响+嘈杂 RT60 0.8 s"]
methods = [("A_双耳组阵", "A 双耳组阵（头部模板）", "#134074"), ("B_只传参数", "B 只传参数", "#e07a1f"),
           ("A_忽略头部模板", "A 双耳组阵（忽略头部的模板）", "#8da9c4")]
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4.2), gridspec_kw={"width_ratios": [2.2, 1]})
w = 0.26
for i, (k, lab, col) in enumerate(methods):
    v = [S["results"][f"{c} | 0.5 s"][k]["acc10"] * 100 for c in conds]
    xs = [j + (i - 1) * w for j in range(len(conds))]
    ax1.bar(xs, v, w, label=lab, color=col)
    for x, y in zip(xs, v):
        ax1.text(x, y + 1, f"{y:.0f}", ha="center", fontsize=8)
ax1.set_xticks(range(len(conds)), [c.replace(" ", "\n", 1) for c in conds], fontsize=9)
ax1.set_ylabel("方位误差 ≤10° 的比例（%）")
ax1.set_ylim(0, 108)
ax1.set_title("两种双耳路线的测向精度（开口后 0.5 s 判决）", fontsize=11)
ax1.legend(fontsize=8, loc="upper right")
us = [int(u) for u in S["sync_error"]]
ax2.plot(us, [S["sync_error"][str(u)]["A_双耳组阵"]["acc10"] * 100 for u in us], "o-", color="#134074", label="A 双耳组阵")
ax2.plot(us, [S["sync_error"][str(u)]["B_只传参数"]["acc10"] * 100 for u in us], "s--", color="#e07a1f", label="B 只传参数（不受同步影响）")
ax2.axvline(62.5, color="gray", lw=0.8, ls=":")
ax2.text(58, 75, "1 个采样点\n(16 kHz)", fontsize=8, color="gray", ha="right")
ax2.set_xscale("symlog", linthresh=10)
ax2.set_xticks(us, [str(u) for u in us])
ax2.set_xlabel("两耳采样同步误差（µs）")
ax2.set_ylabel("≤10° 的比例（%）")
ax2.set_ylim(0, 100)
ax2.set_title("同步误差的影响（C3 混响）", fontsize=11)
ax2.legend(fontsize=8)
fig.text(0.01, 0.01, "仿真：刚性球头部模型，每耳 2 麦（间距 1.5 cm），单声源 1–2 m，每条件 144 次", fontsize=8, color="gray")
fig.tight_layout(rect=(0, 0.04, 1, 1))
fig.savefig(os.path.join(OUT, "fig_min_validation.png"), dpi=150)
print("saved")
