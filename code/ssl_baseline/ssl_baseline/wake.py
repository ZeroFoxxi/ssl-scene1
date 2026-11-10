# -*- coding: utf-8 -*-
"""唤醒词定向：唤醒（KWS）给出唤醒词起止样点后，从多通道环形缓存取出该片段，输出方位 + 置信度。

接口（建议，待和唤醒 / 波束成形侧确认）：
    loc = WakeWordLocalizer(mic_xy, fs)
    loc.push(block)                                  # 每来一块多通道音频（M x n）就推入，缓存 >= 2 s
    res = loc.on_wake(start_sample, end_sample)      # 唤醒回调：起止为自开机以来的绝对样点号
    res.az, res.conf, res.candidates                 # 方位（°）、置信度（[0, 1]）、候选方位

也可以不经环形缓存，直接对一段多通道音频调用 localize_wake_segment(x, fs, mic_xy, start, end)。

测向方法（在 SRP-PHAT 上做三处针对唤醒词的处理）：
1. 片段两端各放宽一点（KWS 起止点通常有 0.1 s 量级误差）；
2. 起始段加权：能量上升的帧以直达声为主，权重大；
3. 背景互谱扣除：唤醒词之前的一小段（只有噪声 / 电视）估计背景互谱，从唤醒词片段的互谱中减掉，
   再做 PHAT 归一化与方位扫描。用户说唤醒词前通常不说话，所以这段背景基本不含目标声；
   电视等持续声源在两段里都存在，扣除后被削弱。
"""
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
import numpy as np

from .doa import SRPPHAT, SRPConfig, stft


@dataclass
class WakeDOAConfig:
    nfft: int = 512
    hop: int = 256
    pad_pre: float = 0.10       # 唤醒词起点前多取（s）
    pad_post: float = 0.10      # 唤醒词终点后多取（s）
    bg_len: float = 0.60        # 背景段长度（s），位于起点之前
    bg_gap: float = 0.15        # 背景段终点距唤醒词起点（含 pad_pre）的间隔（s），避免混入语音前沿
    onset: bool = True          # 起始段加权
    bg_subtract: bool = True    # 背景互谱扣除
    bg_beta: float = 1.0        # 扣除系数
    frame_floor_db: float = -30.0   # 帧能量低于片段最大值这么多 dB 的帧不参与
    exclude: Tuple[Tuple[float, float], ...] = ()   # 屏蔽方位区间（如云台的干扰方向表），[(lo, hi), ...]，度
    n_candidates: int = 3
    min_sep: float = 25.0       # 候选方位之间的最小间隔（°）
    srp: SRPConfig = field(default_factory=SRPConfig)


@dataclass
class WakeDOAResult:
    az: float                                   # 方位（°，0° 为阵列 x 轴，逆时针）
    conf: float                                 # 置信度：归一化 SRP 峰值，裁到 [0, 1]
    candidates: List[Tuple[float, float]]       # [(方位, 归一化 SRP 值), ...]，按值降序，第一个即 az
    margin: float                               # 第一、第二候选的差值，越大越不易混淆
    snr_db: float                               # 唤醒词片段相对背景段的带内能量比（dB），背景段缺失时为 nan
    n_frames: int                               # 参与测向的帧数
    bg_used: bool                               # 是否做了背景扣除


def _circular_peaks(p: np.ndarray, grid: np.ndarray, n: int, min_sep: float, valid: np.ndarray = None):
    """圆周上的局部极大值，按值降序，彼此至少相隔 min_sep。"""
    is_max = (p >= np.roll(p, 1)) & (p >= np.roll(p, -1))
    if valid is not None:
        is_max &= valid
    idx = np.where(is_max)[0]
    idx = idx[np.argsort(-p[idx])]
    out = []
    for k in idx:
        if all(abs((grid[k] - grid[j] + 180) % 360 - 180) >= min_sep for j in out):
            out.append(k)
        if len(out) >= n:
            break
    return out


def _refine(p: np.ndarray, k: int, step: float, grid: np.ndarray) -> float:
    y0, y1, y2 = p[k - 1], p[k], p[(k + 1) % len(p)]
    den = y0 - 2 * y1 + y2
    d = 0.5 * (y0 - y2) / den if abs(den) > 1e-12 else 0.0
    return float((grid[k] + np.clip(d, -0.5, 0.5) * step) % 360.0)


class WakeDOA:
    """唤醒词片段测向器（无状态，可复用；导向向量只算一次）。"""

    def __init__(self, mic_xy: np.ndarray, fs: int, cfg: WakeDOAConfig = None):
        self.cfg = cfg or WakeDOAConfig()
        self.fs = fs
        self.mic_xy = mic_xy
        self.srp = SRPPHAT(mic_xy, fs, self.cfg.nfft, self.cfg.srp)
        g = self.srp.grid
        valid = np.ones(len(g), bool)
        for lo, hi in self.cfg.exclude:
            lo, hi = lo % 360, hi % 360
            valid &= ~(((g >= lo) & (g <= hi)) if lo <= hi else ((g >= lo) | (g <= hi)))
        self.valid = valid

    # ---------- 互谱 ----------
    def _cross(self, Zb: np.ndarray, w: np.ndarray) -> np.ndarray:
        """Zb: M x Fb x T（带内），w: T 帧权重 -> 加权平均互谱 P x Fb（未归一化）。"""
        ws = w / max(w.sum(), 1e-12)
        return np.stack([(Zb[i] * np.conj(Zb[j])) @ ws for i, j in self.srp.pairs])

    def _scan(self, C: np.ndarray) -> np.ndarray:
        """互谱 P x Fb -> PHAT 归一化 -> 方位谱 G，取值 [-1, 1]。"""
        Cn = C / (np.abs(C) + 1e-12)
        out = sum(np.real(Cn[k] @ st) for k, st in enumerate(self.srp.steer))
        return out / (len(self.srp.pairs) * C.shape[1])

    # ---------- 主函数 ----------
    def localize(self, x: np.ndarray, start: int, end: int) -> WakeDOAResult:
        """x: M x N 多通道音频；start/end: 唤醒词在 x 中的起止样点（KWS 给出，可有误差）。"""
        cfg, fs = self.cfg, self.fs
        N = x.shape[1]
        s0 = max(0, int(start - cfg.pad_pre * fs))
        s1 = min(N, int(end + cfg.pad_post * fs))
        if s1 - s0 < cfg.nfft:
            raise ValueError("唤醒词片段太短")
        _, Zs = stft(x[:, s0:s1], fs, cfg.nfft, cfg.hop)
        Zs = Zs[:, self.srp.band, :]
        e = 10 * np.log10(np.mean(np.abs(Zs) ** 2, axis=(0, 1)) + 1e-12)

        # 背景段：[s0 - gap - bg_len, s0 - gap)
        b1 = int(s0 - cfg.bg_gap * fs); b0 = int(b1 - cfg.bg_len * fs)
        Zbg = None
        if b0 >= 0 and b1 - b0 >= cfg.nfft:
            _, Zbg = stft(x[:, b0:b1], fs, cfg.nfft, cfg.hop)
            Zbg = Zbg[:, self.srp.band, :]
        e_bg = None if Zbg is None else 10 * np.log10(np.mean(np.abs(Zbg) ** 2) + 1e-12)

        # 帧权重：能量门限 + 起始段加权
        floor = e.max() + cfg.frame_floor_db
        w = SRPPHAT.onset_weights(e, floor_db=floor) if cfg.onset else (e > floor).astype(float)
        C = self._cross(Zs, w)
        bg_used = False
        if cfg.bg_subtract and Zbg is not None:
            Cbg = self._cross(Zbg, np.ones(Zbg.shape[2]))
            # onset 加权时片段互谱是加权平均，背景按帧均匀平均；两者对平稳背景的期望相同
            C = C - cfg.bg_beta * Cbg
            bg_used = True
        p = self._scan(C)

        ks = _circular_peaks(p, self.srp.grid, cfg.n_candidates, cfg.min_sep, self.valid)
        if not ks:  # 全被屏蔽或无极大值
            k = int(np.argmax(np.where(self.valid, p, -np.inf)))
            ks = [k]
        step = cfg.srp.grid_step
        cands = [(_refine(p, k, step, self.srp.grid), float(p[k])) for k in ks]
        margin = cands[0][1] - cands[1][1] if len(cands) > 1 else cands[0][1]
        e_seg = 10 * np.log10(np.mean(np.abs(Zs[..., w > 0]) ** 2) + 1e-12) if (w > 0).any() else -120.0
        return WakeDOAResult(
            az=cands[0][0], conf=float(np.clip(cands[0][1], 0.0, 1.0)), candidates=cands,
            margin=float(margin), snr_db=float("nan") if e_bg is None else float(e_seg - e_bg),
            n_frames=int((w > 0).sum()), bg_used=bg_used)


def localize_wake_segment(x, fs, mic_xy, start, end, cfg: WakeDOAConfig = None) -> WakeDOAResult:
    """一次性调用版本：x 为 M x N 多通道音频（应包含唤醒词之前约 1 s 的背景），start/end 为样点号。"""
    return WakeDOA(mic_xy, fs, cfg).localize(np.asarray(x, float), int(start), int(end))


class RingBuffer:
    """多通道环形缓存，按“自开机以来的绝对样点号”取数。"""

    def __init__(self, n_ch: int, capacity: int):
        self.buf = np.zeros((n_ch, capacity))
        self.cap = capacity
        self.total = 0  # 已写入的样点总数

    def push(self, block: np.ndarray):
        block = np.atleast_2d(block)
        n = block.shape[1]
        if n >= self.cap:
            block = block[:, -self.cap:]; self.total += n - self.cap; n = self.cap
        i = self.total % self.cap
        k = min(n, self.cap - i)
        self.buf[:, i:i + k] = block[:, :k]
        self.buf[:, :n - k] = block[:, k:]
        self.total += n

    def read(self, a: int, b: int) -> Tuple[np.ndarray, int]:
        """取 [a, b) 中仍在缓存里的部分，返回 (数据, 实际起点)。"""
        a = max(a, self.total - self.cap, 0); b = min(b, self.total)
        if b <= a:
            return np.zeros((self.buf.shape[0], 0)), a
        idx = np.arange(a, b) % self.cap
        return self.buf[:, idx], a


class WakeWordLocalizer:
    """流式封装：持续推入多通道音频，唤醒回调时从环形缓存取唤醒词片段测向。"""

    def __init__(self, mic_xy: np.ndarray, fs: int, cfg: WakeDOAConfig = None, buffer_s: float = 3.0):
        self.doa = WakeDOA(mic_xy, fs, cfg)
        self.fs = fs
        self.ring = RingBuffer(mic_xy.shape[1], int(buffer_s * fs))

    def push(self, block: np.ndarray):
        self.ring.push(block)

    def on_wake(self, start_sample: int, end_sample: int, kws_conf: Optional[float] = None) -> WakeDOAResult:
        cfg = self.doa.cfg
        lead = int((cfg.pad_pre + cfg.bg_gap + cfg.bg_len) * self.fs)
        tail = int(cfg.pad_post * self.fs)
        x, a = self.ring.read(start_sample - lead, end_sample + tail)
        return self.doa.localize(x, start_sample - a, end_sample - a)
