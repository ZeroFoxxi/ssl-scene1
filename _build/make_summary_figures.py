"""两份技术总结 PPT 的示意图（俯视示意，不按比例）：mentor 11-25 反馈"全是文字，加一些图片"。
输出 figures/summary/*.png（透明底）。用法：python _build/make_summary_figures.py
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import re
from matplotlib.patches import Circle, Ellipse, FancyBboxPatch, Polygon, Wedge, Arc, PathPatch
from matplotlib.transforms import Affine2D
from svgpath2mpl import parse_path   # pip install svgpath2mpl

plt.rcParams["font.family"] = ["Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans CJK JP", "WenQuanYi Zen Hei", "SimHei", "sans-serif"]
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "figures", "summary")
os.makedirs(OUT, exist_ok=True)
NAVY, LT, GRAY, DGRAY, PALE = "#134074", "#8DA9C4", "#B5B5B5", "#595959", "#EAF2F8"
FS = 13
ICONS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")   # Material Symbols（Apache 2.0）


def icon(ax, name, x, y, size, color):
    """在 (x, y) 处画一个图标（中心对齐，边长 size）。"""
    d = re.search(r' d="([^"]+)"', open(os.path.join(ICONS, name + ".svg"), encoding="utf-8").read()).group(1)
    pth = parse_path(d).transformed(Affine2D().translate(-480, 480).scale(size / 960, -size / 960).translate(x, y))
    ax.add_patch(PathPatch(pth, color=color, lw=0))


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


# ---------- 场景一：摄像头自动转向说话人（会议室） ----------
def meeting():
    fig, ax = canvas(6.0, 4.2, (-3.2, 3.2), (-2.25, 2.25))
    ax.add_patch(FancyBboxPatch((-3.1, -2.15), 6.2, 4.3, boxstyle="round,pad=0,rounding_size=0.12", fill=False, ec=GRAY, lw=1.2))
    ax.add_patch(FancyBboxPatch((-0.85, 1.6), 1.7, 0.42, boxstyle="round,pad=0.02", color=NAVY, lw=0))
    icon(ax, "videocam-fill", -0.45, 1.81, 0.38, "white"); icon(ax, "mic-fill", 0.05, 1.81, 0.34, "white"); icon(ax, "mic-fill", 0.45, 1.81, 0.34, "white")
    ax.text(-1.75, 1.2, "摄像头 + 麦克风阵列", ha="center", va="center", fontsize=FS + 1, color=NAVY)
    ax.add_patch(Polygon([[-1.3, -0.3], [1.3, -0.3], [1.9, -1.35], [-1.9, -1.35]], color="#E6E6E6", lw=0))
    for (x, y) in [(-2.35, -0.6), (-1.05, 0.25), (1.05, 0.25), (-0.55, -1.8), (0.75, -1.8)]:
        icon(ax, "person-fill", x, y, 0.85, GRAY)
    xt, yt = 2.35, -0.6
    ang = np.degrees(np.arctan2(yt - 1.6, xt))
    ax.add_patch(Wedge((0, 1.6), float(np.hypot(xt, yt - 1.6)) - 0.35, ang - 9, ang + 9, color=NAVY, alpha=0.16, lw=0))
    icon(ax, "record_voice_over-fill", xt, yt, 0.9, NAVY)
    ax.text(2.35, 0.1, "发言人", ha="center", fontsize=FS + 2, color=NAVY, weight="bold")
    save(fig, "scene_meeting.png")


# ---------- 场景二：智能家居语音交互（客厅） ----------
def home():
    fig, ax = canvas(6.0, 4.2, (-3.2, 3.2), (-2.25, 2.25))
    ax.add_patch(FancyBboxPatch((-3.1, -2.15), 6.2, 4.3, boxstyle="round,pad=0,rounding_size=0.12", fill=False, ec=GRAY, lw=1.2))
    xd, yd = 0.0, 1.45
    xu, yu = -1.9, -1.1
    ang = np.degrees(np.arctan2(yu - yd, xu - xd))
    lobe(ax, xd, yd, ang, float(np.hypot(xu - xd, yu - yd)) - 0.2, order=14, alpha=0.16)
    icon(ax, "speaker-fill", xd, yd, 0.75, NAVY)
    ax.text(xd + 0.5, yd, "智能设备\n（麦克风阵列）", ha="left", va="center", fontsize=FS + 1, color=NAVY)
    icon(ax, "record_voice_over-fill", xu, yu, 0.9, NAVY)
    ax.text(xu + 0.15, yu - 0.75, "说唤醒词的用户", ha="center", fontsize=FS + 1, color=NAVY, weight="bold")
    icon(ax, "tv-fill", 2.35, -0.2, 0.95, DGRAY)
    waves(ax, 2.0, -0.2, 180, GRAY, n=2, r0=0.3)
    ax.text(2.35, -0.9, "电视", ha="center", fontsize=FS + 1, color=DGRAY)
    icon(ax, "person-fill", 0.7, -1.35, 0.8, GRAY)
    waves(ax, 0.7, -1.05, 90, GRAY, n=2, r0=0.25)
    ax.text(-2.95, 0.35, "增强用户方向\n压低其他方向", ha="left", fontsize=FS + 1, color=NAVY)
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


# ---------- 会议：定位原理（时间差） ----------
def doa_principle():
    fig, ax = canvas(5.6, 3.4, (-2.4, 3.4), (-1.05, 2.45))
    R, th = 1.25, np.deg2rad(35)
    u = np.array([np.sin(th), np.cos(th)])                       # 来波方向（θ 从阵列法向量起）
    xs = np.linspace(-R, R, 6)
    ax.add_patch(FancyBboxPatch((-R - 0.2, -0.13), 2 * R + 0.4, 0.26, boxstyle="round,pad=0.01", color=PALE, ec=NAVY, lw=1))
    for x in xs:
        ax.add_patch(Circle((x, 0), 0.07, color=NAVY, lw=0))
    # 平面波波前（垂直于 u），最后一条过最右端麦克风
    for k in range(4):
        c0 = np.array([R, 0]) + u * (0.5 * k)
        t = np.array([-u[1], u[0]])
        a, b = c0 - 0.9 * t, c0 + 2.4 * t
        ax.plot([a[0], b[0]], [a[1], b[1]], color=LT, lw=1.6, alpha=1 - 0.2 * k)
    icon(ax, "record_voice_over-fill", R + u[0] * 2.3 + 0.2, u[1] * 2.3, 0.75, NAVY)
    ax.annotate("", xy=(R + u[0] * 0.35, u[1] * 0.35), xytext=(R + u[0] * 1.8, u[1] * 1.8), arrowprops=dict(arrowstyle="-|>", color=NAVY, lw=1.6))
    # 法向与角度
    ax.plot([-R, -R], [0, 1.6], color=DGRAY, lw=1, ls="--")
    ax.add_patch(Arc((-R, 0), 1.6, 1.6, theta1=90 - np.degrees(th), theta2=90, color=DGRAY, lw=1.2))
    ax.text(-R + 0.12, 1.0, "θ", fontsize=FS + 1, color=DGRAY)
    # 程差
    e = np.array([-R, 0]) + u * (2 * R * np.sin(th))
    ax.plot([-R, e[0]], [0, e[1]], color="#B22222", lw=2.4)
    ax.text(-R - 0.12, 0.45, "多走\nd·sinθ", fontsize=FS - 1, color="#B22222", ha="right")
    ax.annotate("", xy=(R, -0.35), xytext=(-R, -0.35), arrowprops=dict(arrowstyle="<->", color=DGRAY, lw=1))
    ax.text(0, -0.62, "孔径 d = 17.5 cm（6 麦）", ha="center", fontsize=FS - 2, color=DGRAY)
    ax.text(0.3, -0.98, "时间差 τ = d·sinθ / c，最大 0.51 ms", ha="center", fontsize=FS - 1, color=NAVY, weight="bold")
    save(fig, "doa_principle.png")


# ---------- 会议：波束图（6 麦线阵，计算） ----------
def beam_patterns():
    C0 = 343.0
    pos = (np.arange(6) - 2.5) * 0.035
    phi = np.deg2rad(np.linspace(0, 180, 721))
    A = lambda f, ph: np.exp(2j * np.pi * f * np.outer(np.cos(ph), pos) / C0)     # 行：方向
    db = lambda w, f: np.clip(20 * np.log10(np.abs(A(f, phi) @ w.conj()) + 1e-9), -30, 0) + 30
    fig = plt.figure(figsize=(9.0, 3.7))
    # 固定波束：延迟求和，目标在正前方 90°
    ax = fig.add_subplot(121, projection="polar")
    for f, c, lab in [(500, "#B5C7DA", "500 Hz"), (1000, LT, "1 kHz"), (4000, NAVY, "4 kHz")]:
        a0 = A(f, np.array([np.pi / 2]))[0]
        ax.plot(phi, db(a0 / 6, f), color=c, lw=2, label=lab)
    ax.set_title("固定波束：延迟求和", fontsize=FS, color=NAVY, weight="bold", pad=4)
    ax.legend(loc="lower center", bbox_to_anchor=(0.5, 0.0), ncol=3, fontsize=FS - 3, frameon=False)
    # 自适应：MVDR，干扰在 30°（偏离目标 60°）
    ax2 = fig.add_subplot(122, projection="polar")
    f = 2000
    a0, ai = A(f, np.array([np.pi / 2]))[0], A(f, np.array([np.deg2rad(30)]))[0]
    d = np.abs(pos[:, None] - pos[None])
    Rn = np.sinc(2 * f * d / C0) + 100 * np.outer(ai, ai.conj()) + 0.01 * np.eye(6)
    w = np.linalg.solve(Rn, a0); w = w / (a0.conj() @ w)
    ax2.plot(phi, db(a0 / 6, f), color=GRAY, lw=1.5, ls="--", label="延迟求和")
    ax2.plot(phi, db(w, f), color=NAVY, lw=2, label="MVDR")
    ax2.annotate("干扰", xy=(np.deg2rad(30), 4), xytext=(np.deg2rad(22), 33), fontsize=FS - 2, color="#B22222",
                 arrowprops=dict(arrowstyle="-|>", color="#B22222", lw=1.2), ha="center")
    ax2.set_title("自适应波束：MVDR（2 kHz）", fontsize=FS, color=NAVY, weight="bold", pad=4)
    ax2.legend(loc="lower center", bbox_to_anchor=(0.5, 0.0), ncol=2, fontsize=FS - 3, frameon=False)
    for a in (ax, ax2):
        a.set_thetamin(0); a.set_thetamax(180); a.set_ylim(0, 30)
        a.set_yticks([10, 20, 30]); a.set_yticklabels(["−20", "−10", "0 dB"], fontsize=FS - 5, color=DGRAY)
        a.set_xticks(np.deg2rad([0, 30, 60, 90, 120, 150, 180]))
        a.set_xticklabels(["", "", "", "正前方", "", "", ""], fontsize=FS - 3, color=DGRAY)
        a.grid(color="#DDDDDD", lw=0.6); a.spines["polar"].set_color("#BBBBBB")
    fig.subplots_adjust(wspace=0.15)
    save(fig, "beam_patterns.png")


if __name__ == "__main__":
    meeting(); home(); ear_cases(); beams(); positioning(); doa_principle(); beam_patterns()
    for f in sorted(os.listdir(OUT)):
        print(f)
