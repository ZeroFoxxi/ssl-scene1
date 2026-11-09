# -*- coding: utf-8 -*-
"""根据仿真结果生成 PPT / 手册用图（统一配色与字体；尺寸按 PPT 中的实际放置尺寸设定，字号即实际字号）"""
import json, os, sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
FIG = os.path.join(HERE, "figs"); os.makedirs(FIG, exist_ok=True)
plt.rcParams.update({"font.sans-serif": ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei", "DejaVu Sans"], "axes.unicode_minus": False, "font.size": 9,
                     "axes.edgecolor": "#AEB9C7", "axes.labelcolor": "#1F2937", "xtick.color": "#5B6B7F", "ytick.color": "#5B6B7F"})
NAVY, TEAL, RED, AMBER, BLUE, GRAY = "#17375E", "#1F7A68", "#C7000B", "#B8691A", "#2F6EB5", "#5B6B7F"
COL = {"2麦线阵": AMBER, "3麦三角阵": BLUE, "4麦方阵": TEAL}
GRID = np.arange(0, 360, 1.0)
R = 0.0283
DPI = 220

st = json.load(open(os.path.join(OUT, "static.json"), encoding="utf-8"))
mp = json.load(open(os.path.join(OUT, "maps.json"), encoding="utf-8"))
tr = json.load(open(os.path.join(OUT, "track.json"), encoding="utf-8"))

def norm(m):
    m = np.asarray(m); return (m - m.min()) / (m.max() - m.min() + 1e-12)

def style_polar(ax, title, sub=None, subcolor=GRAY, tfs=11, sfs=9):
    ax.set_yticklabels([]); ax.set_rticks([0.5, 1.0])
    ax.set_xticks(np.deg2rad([0, 90, 180, 270])); ax.set_xticklabels(["0°", "90°", "180°", "270°"], fontsize=7.5)
    ax.tick_params(axis="x", pad=-1)
    ax.grid(color="#D5DCE5", lw=0.7)
    ax.set_title(title, fontsize=tfs, fontweight="bold", color="#1F2937", pad=9)
    if sub: ax.text(0.5, -0.3, sub, transform=ax.transAxes, ha="center", fontsize=sfs, color=subcolor)

def polar_panel(ax, m, az, color, title, sub=None, subcolor=GRAY):
    th = np.deg2rad(np.r_[GRID, GRID[0]]); v = norm(m); v = np.r_[v, v[0]]
    ax.plot(th, v, color=color, lw=1.8); ax.fill(th, v, color=color, alpha=0.18)
    ax.plot([np.deg2rad(az)] * 2, [0, 1.08], color=RED, lw=1.3, ls="--")
    ax.set_ylim(0, 1.12)
    style_polar(ax, title, sub, subcolor)

# 1) 2/3/4 麦同一声源 SRP 图（PPT 内约 5.1" 宽）
ex = st["example"]; az = ex["az"]
fig = plt.figure(figsize=(5.4, 2.45), dpi=DPI)
subs = {"2麦线阵": "镜像双峰（前后模糊）", "3麦三角阵": "单峰", "4麦方阵": "单峰，主瓣最窄"}
for i, k in enumerate(["2麦线阵", "3麦三角阵", "4麦方阵"]):
    ax = fig.add_subplot(1, 3, i + 1, projection="polar")
    polar_panel(ax, ex["maps"][k], az, COL[k], k.replace("麦", " 麦"), subs[k], RED if i == 0 else GRAY)
fig.subplots_adjust(left=0.07, right=0.93, top=0.83, bottom=0.2, wspace=0.6)
fig.savefig(os.path.join(FIG, "fig_srp_2v3v4.png"), facecolor="white"); plt.close(fig)

# 2) 4 麦 SRP 图随 RT60 变化（PPT 内约 8.6" 宽）
fig = plt.figure(figsize=(8.6, 2.55), dpi=DPI)
for i, rt in enumerate(["0.0", "0.3", "0.6", "0.9"]):
    ax = fig.add_subplot(1, 4, i + 1, projection="polar")
    fe = np.array(mp["maps"][rt]["frame_err"]); acc = (fe <= 10).mean() * 100
    lab = "无混响" if rt == "0.0" else f"RT60 = {rt} s"
    colr = TEAL if i < 2 else (AMBER if i == 2 else RED)
    polar_panel(ax, mp["maps"][rt]["map"], mp["az"], colr, lab, f"逐帧误差 ≤10°：{acc:.0f}%", colr if i >= 2 else GRAY)
fig.subplots_adjust(left=0.05, right=0.95, top=0.83, bottom=0.2, wspace=0.65)
fig.savefig(os.path.join(FIG, "fig_srp_rt60.png"), facecolor="white"); plt.close(fig)

# 3) 跟踪示意（PPT 内约 8.9" 宽）
t = np.array(tr["t"]); raw = np.array(tr["raw"]); truth = np.array(tr["truth"])
trk = np.array([np.nan if v is None else v for v in tr["trk"]])
act = np.array(tr["active"]); mot = np.array(tr["motor"])
fig, ax = plt.subplots(figsize=(8.9, 3.75), dpi=DPI)
ax.axvspan(6.0, 7.5, color=RED, alpha=0.08, lw=0)
ax.text(6.75, 352, "云台电机转动\n（测向冻结）", ha="center", va="top", fontsize=9.5, color=RED)
sil = ~act
ax.scatter(t[act & ~mot], raw[act & ~mot], s=11, color=NAVY, alpha=0.55, label="逐块原始测向（有语音）", zorder=2)
ax.scatter(t[sil & ~mot], raw[sil & ~mot], s=8, color="#AEB9C7", alpha=0.75, label="逐块原始测向（静音）", zorder=1)
ax.scatter(t[mot], raw[mot], s=18, marker="x", color=RED, label="电机噪声期间的测向", zorder=3)
ax.plot(t, truth, color=GRAY, lw=1.4, ls="--", label="真实方位")
ax.plot(t, trk, color=TEAL, lw=2.4, label="跟踪输出（圆周卡尔曼）", zorder=4)
ax.set_xlim(0, t.max()); ax.set_ylim(0, 360); ax.set_yticks([0, 90, 180, 270, 360])
ax.set_xlabel("时间（s）", fontsize=9.5); ax.set_ylabel("方位角（°）", fontsize=9.5)
ax.grid(color="#E3E8EF", lw=0.7); ax.spines[["top", "right"]].set_visible(False)
ax.legend(loc="upper left", fontsize=9, frameon=False, ncol=3, bbox_to_anchor=(0, 1.2))
fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig_tracking.png"), facecolor="white"); plt.close(fig)

# 4) 空间混叠：4 麦方阵（相邻间距 4 cm）延迟求和波束图（手册内约 6.3" 宽）
c = 343.0; ang = np.deg2rad([45, 135, 225, 315]); pos = R * np.stack([np.cos(ang), np.sin(ang)], 1)
look = np.deg2rad(60); th = np.deg2rad(np.arange(0, 360.5, 0.5))
fig = plt.figure(figsize=(6.3, 2.5), dpi=DPI)
for i, f in enumerate([1000, 3000, 6000]):
    u = np.stack([np.cos(th), np.sin(th)], 1); u0 = np.array([np.cos(look), np.sin(look)])
    ph = 2 * np.pi * f / c * (pos @ (u.T - u0[:, None]))
    bp = np.abs(np.exp(1j * ph).sum(0)) / 4
    ax = fig.add_subplot(1, 3, i + 1, projection="polar")
    colr = TEAL if f < 4300 else RED
    ax.plot(th, bp, color=colr, lw=1.8); ax.fill(th, bp, color=colr, alpha=0.15)
    ax.plot([look] * 2, [0, 1.05], color=NAVY, ls="--", lw=1.2); ax.set_ylim(0, 1.08)
    note = "主瓣宽，分辨率低" if f == 1000 else ("主瓣变窄" if f == 3000 else "出现栅瓣（空间混叠）")
    style_polar(ax, f"{f/1000:g} kHz", note, colr)
fig.subplots_adjust(left=0.07, right=0.93, top=0.83, bottom=0.2, wspace=0.6)
fig.savefig(os.path.join(FIG, "fig_aliasing.png"), facecolor="white"); plt.close(fig)

# 5) GCC vs GCC-PHAT（手册内约 6.3" 宽）
sys.path.insert(0, os.path.join(HERE, "..", "pylib"))
import pyroomacoustics as pra, scipy.io.wavfile as wavfile
fs, sp = wavfile.read(os.path.join(HERE, "speech_zh.wav")); sp = sp.astype(float) / 32768
e_abs, mo = pra.inverse_sabine(0.3, [5, 4, 2.8])
room = pra.ShoeBox([5, 4, 2.8], fs=fs, materials=pra.Material(e_abs), max_order=min(mo, 40))
d = 0.20; ac = np.array([1.5, 2.0]); a_true = 50.0
srcp = ac + 2.0 * np.array([np.cos(np.deg2rad(a_true)), np.sin(np.deg2rad(a_true))])
room.add_source([srcp[0], srcp[1], 1.5], signal=sp[16000:16000 * 4])
mics = np.array([[ac[0] - d / 2, ac[0] + d / 2], [ac[1], ac[1]], [1.5, 1.5]])
room.add_microphone_array(pra.MicrophoneArray(mics, fs)); room.simulate()
x1, x2 = room.mic_array.signals
n = 1 << 16; X1 = np.fft.rfft(x1, n); X2 = np.fft.rfft(x2, n)
G = X1 * np.conj(X2); up = 8
cc = np.fft.irfft(G, n * up); ccp = np.fft.irfft(G / (np.abs(G) + 1e-12), n * up)
L = int(0.0008 * fs * up); lags = np.arange(-L, L + 1) / (fs * up) * 1e3
def seg(z): z = np.r_[z[-L:], z[:L + 1]]; return z / np.abs(z).max()
tau_true = d * np.cos(np.deg2rad(a_true)) / c * 1e3
fig, axs = plt.subplots(1, 2, figsize=(6.3, 2.4), dpi=DPI, sharey=True)
for ax, z, ttl, colr in [(axs[0], seg(cc), "普通互相关（GCC）", AMBER), (axs[1], seg(ccp), "PHAT 加权（GCC-PHAT）", TEAL)]:
    ax.plot(lags, z, color=colr, lw=1.6); ax.axvline(tau_true, color=RED, ls="--", lw=1.2)
    ax.set_title(ttl, fontsize=10.5, fontweight="bold"); ax.set_xlabel("时延（ms）")
    ax.grid(color="#E3E8EF"); ax.spines[["top", "right"]].set_visible(False)
axs[0].set_ylabel("归一化相关值")
fig.tight_layout(rect=(0, 0, 1, 0.88))
fig.legend(handles=[Line2D([0], [0], color=RED, ls="--", label="真实时延（两麦间距 20 cm，RT60 = 0.3 s 仿真）")], loc="upper center", frameon=False, fontsize=9)
fig.savefig(os.path.join(FIG, "fig_gccphat.png"), facecolor="white"); plt.close(fig)
print("phat peak", lags[np.argmax(seg(ccp))], "true", tau_true)
print("figs ok:", sorted(os.listdir(FIG)))
