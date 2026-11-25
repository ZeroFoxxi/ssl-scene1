"""示意图风格对比（给 mentor 选）：A 单色图标（Material Symbols）、B 彩色表情图（Noto Color Emoji，SIL OFL）。
输出 figures/style_compare/*.png。用法：python _build/make_style_compare.py
"""
import os, sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Polygon, Wedge, Arc, Ellipse
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_summary_figures as M   # 复用 icon()、lobe()、waves()、canvas()、配色

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "figures", "style_compare")
os.makedirs(OUT, exist_ok=True)
EMOJI_FONT = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
NAVY, GRAY, DGRAY, FS = M.NAVY, M.GRAY, M.DGRAY, M.FS
_cache = {}


def emoji(ax, ch, x, y, size, alpha=1.0):
    """彩色表情图，中心 (x, y)，边长 size（坐标单位）。"""
    if ch not in _cache:
        f = ImageFont.truetype(EMOJI_FONT, 109)
        im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((10, 10), ch, font=f, embedded_color=True)
        _cache[ch] = np.asarray(im.crop(im.getbbox()))
    img = _cache[ch]
    h, w = img.shape[:2]; k = size / max(h, w)
    ax.imshow(img, extent=(x - w * k / 2, x + w * k / 2, y - h * k / 2, y + h * k / 2), alpha=alpha, zorder=5, interpolation="lanczos")


def save(fig, name):
    fig.savefig(os.path.join(OUT, name), dpi=220, transparent=True, bbox_inches="tight", pad_inches=0.05)
    plt.close(fig)


def room(ax, color="#FBF6EE"):
    ax.add_patch(FancyBboxPatch((-3.1, -2.15), 6.2, 4.3, boxstyle="round,pad=0,rounding_size=0.12", fc=color, ec=GRAY, lw=1.2, zorder=0))


# ---------- B：会议室（彩色） ----------
def meeting_color():
    fig, ax = M.canvas(6.0, 4.2, (-3.2, 3.2), (-2.25, 2.25))
    room(ax)
    ax.add_patch(FancyBboxPatch((-0.95, 1.55), 1.9, 0.5, boxstyle="round,pad=0.02", color="#3A3A3A", lw=0, zorder=1))
    emoji(ax, "🎥", -0.5, 1.8, 0.42); emoji(ax, "🎙", 0.1, 1.8, 0.38); emoji(ax, "🎙", 0.5, 1.8, 0.38)
    ax.text(-1.75, 1.2, "摄像头 + 麦克风阵列", ha="center", va="center", fontsize=FS + 1, color=NAVY)
    ax.add_patch(Polygon([[-1.3, -0.3], [1.3, -0.3], [1.9, -1.35], [-1.9, -1.35]], color="#C8A27A", lw=0, zorder=1))
    for ch, (x, y) in zip(["👨", "👩", "🧑", "👱", "🧔"], [(-2.35, -0.6), (-1.05, 0.25), (1.05, 0.25), (-0.55, -1.8), (0.75, -1.8)]):
        emoji(ax, ch, x, y, 0.72)
    xt, yt = 2.35, -0.6
    ang = np.degrees(np.arctan2(yt - 1.55, xt))
    ax.add_patch(Wedge((0, 1.55), float(np.hypot(xt, yt - 1.55)) - 0.35, ang - 9, ang + 9, color="#F2B134", alpha=0.35, lw=0, zorder=2))
    emoji(ax, "👩", xt, yt, 0.8)
    emoji(ax, "💬", xt + 0.55, yt + 0.5, 0.5)
    ax.text(2.35, 0.25, "发言人", ha="center", fontsize=FS + 2, color=NAVY, weight="bold")
    save(fig, "B_scene_meeting.png")


# ---------- B：智能家居（彩色） ----------
def home_color():
    fig, ax = M.canvas(6.0, 4.2, (-3.2, 3.2), (-2.25, 2.25))
    room(ax)
    xd, yd, xu, yu = 0.0, 1.45, -1.9, -1.1
    ang = np.degrees(np.arctan2(yu - yd, xu - xd))
    th = np.linspace(-np.pi / 2, np.pi / 2, 181); r = (np.hypot(xu - xd, yu - yd) - 0.2) * np.cos(th) ** 14
    ax.add_patch(Polygon(np.c_[xd + r * np.cos(th + np.deg2rad(ang)), yd + r * np.sin(th + np.deg2rad(ang))], color="#F2B134", alpha=0.35, lw=0, zorder=2))
    emoji(ax, "🔊", xd, yd, 0.7)
    ax.text(xd + 0.5, yd, "智能设备\n（麦克风阵列）", ha="left", va="center", fontsize=FS + 1, color=NAVY)
    emoji(ax, "🙋", xu, yu, 0.85)
    emoji(ax, "💬", xu + 0.6, yu + 0.55, 0.5)
    ax.text(xu + 0.15, yu - 0.75, "说唤醒词的用户", ha="center", fontsize=FS + 1, color=NAVY, weight="bold")
    emoji(ax, "📺", 2.35, -0.2, 0.9)
    emoji(ax, "🎵", 1.75, 0.25, 0.35, alpha=0.8)
    ax.text(2.35, -0.85, "电视", ha="center", fontsize=FS + 1, color=DGRAY)
    emoji(ax, "🛋", 0.75, -1.55, 0.85)
    emoji(ax, "👨", 0.75, -1.05, 0.6)
    emoji(ax, "💬", 1.25, -0.7, 0.35, alpha=0.7)
    ax.text(-2.95, 0.35, "增强用户方向\n压低其他方向", ha="left", fontsize=FS + 1, color=NAVY)
    save(fig, "B_scene_home.png")


# ---------- 波束：固定方向 / 可转向（A 图标、B 彩色） ----------
def beams(style):
    fig, ax = M.canvas(9.0, 4.0, (-2.6, 7.4), (-1.5, 3.0))
    def person(x, y, tgt, face_ch):
        if style == "A":
            M.icon(ax, "record_voice_over-fill" if tgt else "person-fill", x, y, 0.85 if tgt else 0.75, NAVY if tgt else GRAY)
        else:
            emoji(ax, face_ch, x, y, 0.7)
            if tgt:
                emoji(ax, "💬", x + 0.5, y + 0.45, 0.42)
    def wearer(x):
        if style == "A":
            M.icon(ax, "headphones-fill", x, 0, 0.85, DGRAY)
        else:
            emoji(ax, "🎧", x, 0, 0.8)
        ax.text(x, -0.65, "你（戴耳机）", ha="center", fontsize=FS - 1, color=DGRAY)
    col = NAVY if style == "A" else "#F2B134"
    al = 0.16 if style == "A" else 0.35
    # 固定方向
    th = np.linspace(-np.pi / 2, np.pi / 2, 181)
    r = 2.1 * np.cos(th) ** 3
    ax.add_patch(Polygon(np.c_[r * np.cos(th + np.pi / 2), 0.3 + r * np.sin(th + np.pi / 2)], color=col, alpha=al, lw=0, zorder=1))
    person(0, 2.1, True, "👩")
    person(1.7, 1.25, False, "👨")
    wearer(0)
    ax.text(0, -1.15, "固定方向：一直朝正前方", ha="center", fontsize=FS + 1, color=NAVY, weight="bold")
    # 可转向
    x0, a = 5.0, 45
    xt, yt = x0 + 2.0 * np.cos(np.deg2rad(a)), 0.3 + 2.0 * np.sin(np.deg2rad(a))
    r = 2.1 * np.cos(th) ** 14
    ax.add_patch(Polygon(np.c_[x0 + r * np.cos(th + np.deg2rad(a)), 0.3 + r * np.sin(th + np.deg2rad(a))], color=col, alpha=al, lw=0, zorder=1))
    person(x0, 2.1, False, "🧑")
    person(xt, yt, True, "👩")
    wearer(x0)
    ax.text(x0, -1.15, "可转向：按定位结果对准说话人", ha="center", fontsize=FS + 1, color=NAVY, weight="bold")
    save(fig, f"{style}_beams.png")


if __name__ == "__main__":
    meeting_color(); home_color(); beams("A"); beams("B")
    print(sorted(os.listdir(OUT)))
