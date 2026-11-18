"""画麦克风数量对比图：out/fig_mic_count.png"""
import glob, json, os
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
order = ["2p1", "2p2", "3p1", "3p3", "4p4"]
lab = {"2p1": "主耳 2 + 副耳 1\n（3 麦，转发 1 路）", "2p2": "每耳 2\n（4 麦，转发 2 路）", "3p1": "主耳 3 + 副耳 1\n（4 麦，转发 1 路）",
       "3p3": "每耳 3\n（6 麦，转发 3 路）", "4p4": "每耳 4\n（8 麦，转发 4 路）"}
D = {k: json.load(open(os.path.join(OUT, f"mic_count_{k}.json"), encoding="utf-8")) for k in order}
conds = list(D["2p2"]["results"])
fig, ax = plt.subplots(figsize=(11, 4.4))
w = 0.2
series = [(conds[0], "GEVD-MUSIC", "干扰低 6 dB：纯声学", "#5b7fa6"), (conds[0], "GEVD-MUSIC + 视觉", "干扰低 6 dB：+ 视觉", "#134074"),
          (conds[1], "GEVD-MUSIC", "干扰同样响：纯声学", "#e8a87c"), (conds[1], "GEVD-MUSIC + 视觉", "干扰同样响：+ 视觉", "#9c2c13")]
for i, (c, m, l, col) in enumerate(series):
    v = [D[k]["results"][c][m]["acc10"] * 100 for k in order]
    xs = [j + (i - 1.5) * w for j in range(len(order))]
    ax.bar(xs, v, w, color=col, label=l)
    for x, y in zip(xs, v):
        ax.text(x, y + 1, f"{y:.0f}", ha="center", fontsize=7)
ax.set_xticks(range(len(order)), [lab[k] for k in order], fontsize=8)
ax.set_ylim(0, 118); ax.set_yticks(range(0, 101, 20)); ax.set_ylabel("≤10° 的比例（%）")
ax.set_title("麦克风数量对比（GEVD-MUSIC，开口后 0.5 s 判决）", fontsize=11); ax.legend(fontsize=8, ncol=4, loc="upper center")
fig.text(0.01, 0.01, "仿真：刚性球头部模型；混响 RT60 0.5 s + 2 个干扰说话人 + SNR 10 dB；各配置用同一批 100 个场景", fontsize=8, color="gray")
fig.tight_layout(rect=(0, 0.04, 1, 1)); fig.savefig(os.path.join(OUT, "fig_mic_count.png"), dpi=150); print("saved")
