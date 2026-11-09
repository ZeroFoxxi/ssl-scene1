# -*- coding: utf-8 -*-
"""精简版 PPT 用的紧凑图（约 3.9" 宽，字号按实际放置尺寸设定）"""
import json, os, sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "ssl_baseline")
FIG = os.path.join(HERE, "figs")
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts")); sys.path.insert(0, os.path.join(HERE, "..", "pylib"))
plt.rcParams.update({"font.sans-serif": ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei", "DejaVu Sans"], "axes.unicode_minus": False, "font.size": 8.5,
                     "axes.edgecolor": "#AEB9C7", "xtick.color": "#5B6B7F", "ytick.color": "#5B6B7F"})
NAVY, TEAL, RED, AMBER, GRAY = "#17375E", "#1F7A68", "#C7000B", "#B8691A", "#5B6B7F"
W, H = 3.9, 2.15

# ---- 闭环 ----
rec = json.load(open(os.path.join(ROOT, "out", "closed_loop.json"), encoding="utf-8"))["rec"]
t = np.array(rec["t"]); truth = np.array(rec["truth"]); pan = np.rad2deg(np.unwrap(np.deg2rad(rec["pan"])))
while np.median(pan - truth) > 180: pan -= 360
while np.median(pan - truth) < -180: pan += 360
fig, ax = plt.subplots(figsize=(W, H), dpi=250)
ax.fill_between(t, pan - 45, pan + 45, color=TEAL, alpha=0.13, lw=0, label="画面视场")
ax.plot(t, truth, color=GRAY, ls="--", lw=1.3, label="说话人方位")
ax.plot(t, pan, color=NAVY, lw=1.6, label="云台朝向")
ax.set_xlim(0, t.max()); ax.set_ylim(-110, 250); ax.set_xlabel("时间（s）"); ax.set_ylabel("方位（°）")
ax.grid(color="#E3E8EF", lw=0.6); ax.spines[["top", "right"]].set_visible(False)
ax.annotate("0.3 s 开始转", xy=(0.55, -55), xytext=(3.0, -90), fontsize=8, color=RED, arrowprops=dict(arrowstyle="->", color=RED, lw=0.8))
ax.legend(loc="upper left", fontsize=7.5, frameon=False, ncol=3, bbox_to_anchor=(0, 1.2))
fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig_short_loop.png"), facecolor="white"); plt.close(fig)

# ---- 电视干扰（单图对比）----
import run_tv_interference_demo as tvd
mic, fZ, Zm = tvd.render()
r0, s0 = tvd.run(mic, fZ, Zm, False)
r1, s1 = tvd.run(mic, fZ, Zm, True)
fig, ax = plt.subplots(figsize=(W, H), dpi=250)
def plot_pan(rr, col, lab, lw):
    tt = np.array(rr["t"]); p = np.array(rr["pan"]) % 360
    jump = np.r_[False, np.abs(np.diff(p)) > 180]; p = p.copy(); p[jump] = np.nan
    ax.plot(tt, p, color=col, lw=lw, label=lab)
    return tt
tt = plot_pan(r0, RED, "不启用干扰表", 1.6)
plot_pan(r1, TEAL, "启用干扰表", 1.6)
ax.axhline(tvd.TV_AZ, color=AMBER, ls=":", lw=1.3, label="电视方向")
ax.plot([tvd.PERSON_T0, tt.max()], [tvd.PERSON_AZ] * 2, color=GRAY, ls="--", lw=1.2, label="真人方向")
ax.axvline(tvd.PERSON_T0, color=GRAY, lw=0.6)
ax.text(tvd.PERSON_T0 + 0.3, 20, "真人开口", fontsize=7.5, color=GRAY)
ax.set_xlim(0, tt.max()); ax.set_ylim(0, 360); ax.set_yticks([0, 90, 180, 270, 360])
ax.set_xlabel("时间（s）"); ax.set_ylabel("云台朝向（°）")
ax.grid(color="#E3E8EF", lw=0.6); ax.spines[["top", "right"]].set_visible(False)
ax.legend(loc="upper left", fontsize=7.2, frameon=False, ncol=2, bbox_to_anchor=(0, 1.27))
fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig_short_tv.png"), facecolor="white"); plt.close(fig)
print("ok", s0, s1)
