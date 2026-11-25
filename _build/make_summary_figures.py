"""两份技术总结 PPT 的示意图（俯视示意，不按比例）：mentor 11-25 反馈"全是文字，加一些图片"。
输出 figures/summary/*.png（透明底）。用法：python _build/make_summary_figures.py
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, FancyBboxPatch, Polygon, Wedge, Arc

plt.rcParams["font.family"] = ["Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans CJK JP", "WenQuanYi Zen Hei", "SimHei", "sans-serif"]
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "figures", "summary")
os.makedirs(OUT, exist_ok=True)
NAVY, LT, GRAY, DGRAY, PALE = "#134074", "#8DA9C4", "#B5B5B5", "#595959", "#EAF2F8"
FS = 13


def canvas(w, h, xlim, ylim):
    fig, ax = plt.subplots(figsize=(w, h))
    ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.set_aspect("equal"); ax.axis("off")
    return fig, ax


def person(ax, x, y, color, face=90, r=0.22):
    """俯视的人：肩（椭圆）+ 头（圆）；face 为面朝方向（度）。"""
    a = np.deg2rad(face)
    ax.add_patch(Ellipse((x - 0.12 * np.cos(a), y - 0.12 * np.sin(a)), 2.6 * r, 1.3 * r, angle=face - 90, color=color, alpha=0.55, lw=0))
    ax.add_patch(Circle((x, y), r, color=color, lw=0))


def waves(ax, x, y, ang, color, n=3, r0=0.35, dr=0.17, span=50):
    for k in range(n):
        ax.add_patch(Arc((x, y), 2 * (r0 + k * dr), 2 * (r0 + k * dr), theta1=ang - span / 2, theta2=ang + span / 2, color=color, lw=2.2))


def lobe(ax, x, y, ang, length, order=1, color=NAVY, alpha=0.18, kind="card"):
    """波束示意：只画前半个主瓣，r = L·cos(θ)^p，p 越大越窄。"""
    th = np.linspace(-np.pi / 2, np.pi / 2, 181)
    r = length * np.cos(th) ** order
    pts = np.c_[x + r * np.cos(th + np.deg2rad(ang)), y + r * np.sin(th + np.deg2rad(ang))]
    ax.add_patch(Polygon(pts, closed=True, color=color, alpha=alpha, lw=0))
    ax.add_patch(Polygon(pts, closed=True, fill=False, ec=color, lw=1.2, alpha=0.9))


def wearer(ax, x, y, cam=True):
    """佩戴者俯视：头 + 两耳耳机（深色小块）+ 耳机上的摄像头（小三角朝前）。"""
    ax.add_patch(Ellipse((x, y - 0.2), 1.1, 0.5, color=DGRAY, alpha=0.5, lw=0))
    ax.add_patch(Circle((x, y), 0.3, color=DGRAY, lw=0))
    for s in (-1, 1):
        ax.add_patch(FancyBboxPatch((x + s * 0.33 - 0.06, y - 0.08), 0.12, 0.2, boxstyle="round,pad=0.01", color=NAVY, lw=0))
        if cam:
            ax.add_patch(Polygon([[x + s * 0.33, y + 0.13], [x + s * 0.33 - 0.07, y + 0.25], [x + s * 0.33 + 0.07, y + 0.25]], color=NAVY, lw=0))


def save(fig, name):
    fig.savefig(os.path.join(OUT, name), dpi=220, transparent=True, bbox_inches="tight", pad_inches=0.05)
    plt.close(fig)


# ---------- 场景一：摄像头自动转向说话人（会议室俯视） ----------
def meeting():
    fig, ax = canvas(6.0, 4.2, (-3.2, 3.2), (-2.3, 2.3))
    ax.add_patch(FancyBboxPatch((-3.0, -2.1), 6.0, 4.2, boxstyle="round,pad=0.02,rounding_size=0.1", fill=False, ec=GRAY, lw=1.2))
    ax.add_patch(FancyBboxPatch((-1.25, 1.72), 2.5, 0.32, boxstyle="round,pad=0.02", color=NAVY, lw=0))
    ax.text(0, 1.88, "摄像头 + 麦克风阵列", color="white", ha="center", va="center", fontsize=FS - 3)
    ax.add_patch(Ellipse((0, -0.45), 2.4, 1.5, color="#E6E6E6", lw=0))
    seats = [(-1.65, 0.05, 0), (-1.65, -0.95, 0), (1.65, 0.05, 180), (1.65, -0.95, 180), (-0.55, -1.6, 90), (0.55, -1.6, 90)]
    tgt = 2
    for i, (x, y, f) in enumerate(seats):
        person(ax, x, y, NAVY if i == tgt else GRAY, face=f)
    xt, yt = seats[tgt][:2]
    waves(ax, xt, yt, 180, NAVY)
    ang = np.degrees(np.arctan2(yt - 1.75, xt - 0.0))
    ax.add_patch(Wedge((0, 1.72), float(np.hypot(xt, yt - 1.72)) + 0.3, ang - 10, ang + 10, color=NAVY, alpha=0.15, lw=0))
    ax.text(1.95, 1.1, "转向发言人", color=NAVY, fontsize=FS - 1, ha="center")
    save(fig, "scene_meeting.png")


# ---------- 场景二：智能家居语音交互（客厅俯视） ----------
def home():
    fig, ax = canvas(6.0, 4.2, (-3.2, 3.2), (-2.3, 2.3))
    ax.add_patch(FancyBboxPatch((-3.0, -2.1), 6.0, 4.2, boxstyle="round,pad=0.02,rounding_size=0.1", fill=False, ec=GRAY, lw=1.2))
    ax.add_patch(Circle((0, 1.55), 0.28, color=NAVY, lw=0))
    ax.text(0.45, 1.5, "智能设备\n（麦克风阵列）", color=NAVY, ha="left", va="center", fontsize=FS - 3)
    xu, yu = -1.6, -1.1
    lobe(ax, 0, 1.55, np.degrees(np.arctan2(yu - 1.55, xu)), float(np.hypot(xu, yu - 1.55)) + 0.3, order=12)
    person(ax, xu, yu, NAVY, face=60)
    waves(ax, xu, yu, 60, NAVY)
    ax.text(xu - 0.15, yu - 0.62, "唤醒词", color=NAVY, fontsize=FS - 1, ha="center")
    ax.add_patch(FancyBboxPatch((2.2, -0.9), 0.35, 1.3, boxstyle="round,pad=0.02", color=DGRAY, lw=0))
    ax.text(2.37, -1.25, "电视", color=DGRAY, ha="center", fontsize=FS - 3)
    waves(ax, 2.2, -0.25, 180, GRAY)
    person(ax, 1.0, -1.55, GRAY, face=90)
    waves(ax, 1.0, -1.55, 90, GRAY, n=2)
    ax.text(-1.9, 0.9, "增强用户方向\n压低其他方向", color=NAVY, fontsize=FS - 2, ha="center")
    save(fig, "scene_home.png")


# ---------- 耳机：情况 1 / 情况 2 ----------
def ear_case(ax, x0, talk_others, beam, title):
    pos = [(-1.1, 2.0), (0.0, 2.3), (1.1, 2.0)]
    for i, (x, y) in enumerate(pos):
        person(ax, x0 + x, y, NAVY if i == 1 else GRAY, face=-90)
        if i == 1:
            waves(ax, x0 + x, y, -90, NAVY)
        elif talk_others:
            waves(ax, x0 + x, y, -90 + (25 if x < 0 else -25), GRAY, n=2)
    if beam:
        lobe(ax, x0, 0.3, 90, 2.1, order=14)
    wearer(ax, x0, 0)
    ax.text(x0, -0.85, title, ha="center", fontsize=FS, color=NAVY, weight="bold")


def ear_cases():
    fig, ax = canvas(8.0, 3.6, (-2.0, 6.4), (-1.1, 2.9))
    ear_case(ax, 0.0, False, False, "情况 1：只有他在说")
    ear_case(ax, 4.4, True, True, "情况 2：其他人也在说")
    ax.text(1.65, 0.15, "定位", fontsize=FS - 2, color=DGRAY)
    ax.text(6.05, 0.15, "定位 + 增强", fontsize=FS - 2, color=DGRAY)
    save(fig, "earbud_cases.png")


# ---------- 耳机：固定方向 vs 可转向 ----------
def beams():
    fig, ax = canvas(8.0, 3.9, (-2.2, 6.6), (-1.3, 3.0))
    # 固定方向：波束朝正前方
    lobe(ax, 0, 0.3, 90, 2.0, order=3)
    person(ax, 0, 2.0, NAVY, face=-90); waves(ax, 0, 2.0, -90, NAVY, n=2)
    person(ax, 1.5, 1.2, GRAY, face=-150)
    wearer(ax, 0, 0)
    ax.text(0, -0.8, "固定方向：一直朝正前方", ha="center", fontsize=FS, color=NAVY, weight="bold")
    ax.text(0, -1.2, "对方在正前方时够用（助听器、耳机通话）", ha="center", fontsize=FS - 3, color=DGRAY)
    # 可转向：波束转到侧面的说话人
    x0 = 4.4
    a = 40
    xt, yt = x0 + 1.9 * np.cos(np.deg2rad(a)), 1.9 * np.sin(np.deg2rad(a))
    lobe(ax, x0, 0.3, a, 1.9, order=14)
    person(ax, x0, 2.0, GRAY, face=-90)
    person(ax, xt, yt, NAVY, face=a + 180); waves(ax, xt, yt, a + 180, NAVY, n=2)
    wearer(ax, x0, 0)
    ax.text(x0, -0.8, "可转向：按定位结果对准说话人", ha="center", fontsize=FS, color=NAVY, weight="bold")
    ax.text(x0, -1.2, "对方在侧面、多人轮流说话（会议设备、本方案）", ha="center", fontsize=FS - 3, color=DGRAY)
    save(fig, "earbud_beams.png")


# ---------- 耳机：产品定位示意 ----------
def positioning():
    fig, ax = canvas(5.6, 4.2, (-2.6, 2.6), (-1.3, 2.9))
    ax.add_patch(Wedge((0, 0.25), 2.75, 58, 122, color=LT, alpha=0.15, lw=0))
    pos = [(-1.2, 2.0, False), (0.0, 2.35, True), (1.2, 2.0, False)]
    for x, y, tgt in pos:
        person(ax, x, y, NAVY if tgt else GRAY, face=-90)
        waves(ax, x, y, -90 if tgt else (-65 if x < 0 else -115), NAVY if tgt else GRAY, n=3 if tgt else 2)
    lobe(ax, 0, 0.3, 90, 2.15, order=14, alpha=0.25)
    wearer(ax, 0, 0)
    ax.text(0, -0.8, "锁定正在和你说话的人，压低其他人", ha="center", fontsize=FS, color=NAVY, weight="bold")
    ax.text(-1.95, 0.75, "摄像头：\n人脸 + 唇动", fontsize=FS - 3, color=DGRAY, ha="center")
    ax.text(1.95, 0.75, "两只耳机：\n定位 + 增强", fontsize=FS - 3, color=DGRAY, ha="center")
    save(fig, "earbud_positioning.png")


if __name__ == "__main__":
    meeting(); home(); ear_cases(); beams(); positioning()
    for f in sorted(os.listdir(OUT)):
        print(f)
