"""画稳健性验证 ③④ 结果图：out/fig_robustness2.png"""
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
R = json.load(open(os.path.join(OUT, "robust_room_summary.json"), encoding="utf-8"))["results"]
V = json.load(open(os.path.join(OUT, "robust_vision_summary.json"), encoding="utf-8"))["results"]
fig, (a1, a2) = plt.subplots(1, 2, figsize=(12.5, 4.4), gridspec_kw={"width_ratios": [1, 1.3]})
ms = [("SRP-PHAT", "#8da9c4"), ("MUSIC（不白化）", "#b8b8b8"), ("GEVD-MUSIC", "#134074"), ("仅视觉", "#f2b880"), ("GEVD-MUSIC + 视觉", "#9c2c13")]
w = 0.16
for i, (m, col) in enumerate(ms):
    v = [R[k][m]["acc10"] * 100 for k in R]
    xs = [j + (i - 2) * w for j in range(len(R))]
    a1.bar(xs, v, w, color=col, label=m)
    for x, y in zip(xs, v):
        a1.text(x, y + 1, f"{y:.0f}", ha="center", fontsize=7)
a1.set_xticks(range(len(R)), [f"RT60 {k} s" for k in R]); a1.set_ylim(0, 125); a1.set_yticks(range(0, 101, 20))
a1.set_ylabel("≤10° 的比例（%）"); a1.set_title("③ 带墙面反射的房间（镜像声源法，3 阶）", fontsize=11); a1.legend(fontsize=7, ncol=3, loc="upper center")
levels = ["基线", "较差", "很差"]
for cond, ls in [("S2 混响 + 2 个干扰（SIR 6 dB）", "-"), ("S4 混响 + 2 个干扰（SIR 0 dB）", "--")]:
    tag = "干扰低 6 dB" if cond.startswith("S2") else "干扰同样响"
    for m, col in [("GEVD-MUSIC + 视觉", "#9c2c13"), ("GEVD-MUSIC", "#134074"), ("MUSIC（不白化）", "#999999"), ("仅视觉", "#e0a060")]:
        a2.plot(range(3), [V[f"{cond}|{l}"][m]["acc10"] * 100 for l in levels], "o" + ls, color=col, label=f"{m}（{tag}）")
a2.set_xticks(range(3), ["基线\n唇动错 10%、2°、检出 95%、±0.1 s", "较差\n20%、4°、85%、±0.2 s", "很差\n30%、6°、70%、±0.3 s"], fontsize=8)
a2.set_ylim(0, 100); a2.set_ylabel("≤10° 的比例（%）"); a2.set_title("④ 视觉指标更差", fontsize=11)
a2.legend(fontsize=6.5, ncol=2, loc="lower left")
fig.text(0.01, 0.01, "仿真：刚性球头部模型，两耳组阵 4 麦；2 个干扰说话人；开口后 0.5 s 判决；每档 100 次", fontsize=8, color="gray")
fig.tight_layout(rect=(0, 0.04, 1, 1)); fig.savefig(os.path.join(OUT, "fig_robustness2.png"), dpi=150); print("saved")
