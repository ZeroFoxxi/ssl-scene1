# -*- coding: utf-8 -*-
"""唤醒词定向：唤醒（KWS）给出唤醒词起止样点后，从多通道环形缓存取出该片段，输出方位 + 置信度。

接口（建议，待和唤醒 / 波束成形侧确认）：
    loc = WakeWordLocalizer(mic_xy, fs)
    loc.push(block)                                  # 每来一块多通道音频（M x n）就推入，缓存 >= 2.5 s
    res = loc.on_wake(start_sample, end_sample)      # 唤醒回调：起止为自开机以来的绝对样点号
    res.az, res.conf, res.candidates                 # 方位（°）、置信度（[0, 1]）、候选方位

也可以不经环形缓存，直接对一段多通道音频调用 localize_wake_segment(x, fs, mic_xy, start, end)。

方法（默认 method="gevd_music"）：
1. 片段两端各放宽 0.1 s（KWS 起止点通常有 0.1 s 量级误差）；
2. 起始段加权：能量上升的帧以直达声为主，权重大；
3. 背景协方差：用唤醒词之前约 1 s（只有噪声 / 电视）估计各频点空间协方差 R_b。
   用户说唤醒词前通常不说话，所以 R_b 基本不含目标声；
4. GEVD-MUSIC：用 R_b 白化唤醒词片段的协方差 R_s，取其主特征向量为信号子空间、其余为噪声子空间，
   在白化后的导向向量上做 MUSIC 扫描。电视等背景里的定向干扰被白化掉，小孔径下也能分开说话人和电视。
   （同类做法见 HARK 机器人听觉中的 GEVD-MUSIC。）
备选 method="srp_sub"：互谱扣除背景后再做 SRP-PHAT，计算量更小、但电视同等响度时精度明显较差。

已知局限：若唤醒前的背景段里用户本人也在说话，目标会被一起白化掉，测向失效；可用 snr_db 过低识别。
"""
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
import numpy as np

from .doa import SRPPHAT, SRPConfig, stft
from .geometry import far_field_delays


@dataclass
class WakeDOAConfig:
    method: str = "gevd_music"  # "gevd_music" | "srp_sub"
    nfft: int = 512
    hop: int = 256
    pad_pre: float = 0.10       # 唤醒词起点前多取（s）
    pad_post: float = 0.10      # 唤醒词终点后多取（s）
    bg_len: float = 1.00        # 背景段长度（s），位于起点之前
    bg_gap: float = 0.15        # 背景段终点距唤醒词片段起点（含 pad_pre）的间隔（s），避免混入语音前沿
    onset: bool = True          # 起始段加权
    bg_subtract: bool = True    # 使用背景段（gevd_music：白化；srp_sub：互谱扣除）
    loading: float = 1e-2       # 背景协方差对角加载（相对迹的比例）
    frame_floor_db: float = -30.0   # 帧能量低于片段最大值这么多 dB 的帧不参与
    exclude: Tuple[Tuple[float, float], ...] = ()   # 屏蔽方位区间（如云台的干扰方向表），[(lo, hi), ...]，度
    n_candidates: int = 3
    min_sep: float = 25.0       # 候选方位之间的最小间隔（°）
    srp: SRPConfig = field(default_factory=SRPConfig)


@dataclass
class WakeDOAResult:
    az: float                                   # 方位（°，0° 为阵列 x 轴，逆时针）
    conf: float                                 # 置信度 [0, 1]：gevd_music 为各频点在该方位一致的程度；srp_sub 为归一化 SRP 峰值
    candidates: List[Tuple[float, float]]       # [(方位, 空间谱值), ...]，按值降序，第一个即 az
    margin: float                               # 第一、第二候选的差值，越大越不易混淆
    snr_db: float                               # 唤醒词片段相对背景段的带内能量比（dB），背景段缺失时为 nan
    n_frames: int                               # 参与测向的帧数
    bg_used: bool                               # 是否用到了背景段
    spectrum: Optional[np.ndarray] = field(default=None, repr=False)   # 方位谱（与 grid 对应），调试 / 画图用


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
        if self.cfg.method not in ("gevd_music", "srp_sub"):
            raise ValueError(f"未知方法 {self.cfg.method}")
        self.fs = fs
        self.mic_xy = mic_xy
        self.srp = SRPPHAT(mic_xy, fs, self.cfg.nfft, self.cfg.srp)
        g = self.srp.grid
        fb = np.fft.rfftfreq(self.cfg.nfft, 1.0 / fs)[self.srp.band]
        tau = far_field_delays(mic_xy, g, self.cfg.srp.c)                      # M x G
        self.A = np.exp(-1j * 2 * np.pi * fb[:, None, None] * tau[None])        # Fb x M x G 导向向量
        valid = np.ones(len(g), bool)
        for lo, hi in self.cfg.exclude:
            lo, hi = lo % 360, hi % 360
            valid &= ~(((g >= lo) & (g <= hi)) if lo <= hi else ((g >= lo) | (g <= hi)))
        self.valid = valid

    # ---------- 协方差 / 互谱 ----------
    @staticmethod
    def _cov(Zb: np.ndarray, w: np.ndarray) -> np.ndarray:
        """Zb: M x Fb x T，w: T 帧权重 -> 加权平均空间协方差 Fb x M x M。"""
        ws = w / max(w.sum(), 1e-12)
        return np.einsum("mft,nft,t->fmn", Zb, Zb.conj(), ws)

    def _srp_scan(self, R: np.ndarray) -> np.ndarray:
        """协方差 Fb x M x M -> 取各麦克风对互谱 -> PHAT 归一化 -> 方位谱，取值 [-1, 1]。"""
        out = 0.0
        for (i, j), st in zip(self.srp.pairs, self.srp.steer):
            c = R[:, i, j]
            out = out + np.real((c / (np.abs(c) + 1e-12)) @ st)
        return out / (len(self.srp.pairs) * R.shape[0])

    def _gevd_music(self, Rs: np.ndarray, Rb: Optional[np.ndarray]) -> np.ndarray:
        """GEVD-MUSIC 空间谱：各频点归一化到峰值为 1 后对频点平均，取值 (0, 1]。"""
        M = Rs.shape[1]
        if Rb is None:  # 无背景段：退化为普通 MUSIC（白噪声假设）
            Rb = np.broadcast_to(np.eye(M), Rs.shape) * (np.trace(Rs, axis1=1, axis2=2).real / M)[:, None, None]
        Rb = Rb + self.cfg.loading * (np.trace(Rb, axis1=1, axis2=2).real / M)[:, None, None] * np.eye(M)
        Li = np.linalg.inv(np.linalg.cholesky(Rb))
        Rw = Li @ Rs @ Li.conj().transpose(0, 2, 1)
        _, E = np.linalg.eigh(Rw)                    # 特征值升序：最后一个为信号子空间
        En = E[:, :, :-1]
        Aw = Li @ self.A                             # 白化后的导向向量 Fb x M x G
        num = np.sum(np.abs(Aw) ** 2, axis=1)
        den = np.sum(np.abs(En.conj().transpose(0, 2, 1) @ Aw) ** 2, axis=1)
        P = num / (den + 1e-12)
        P = P / P.max(axis=1, keepdims=True)
        return P.mean(axis=0)

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
        b1 = int(s0 - cfg.bg_gap * fs); b0 = max(0, int(b1 - cfg.bg_len * fs))
        Zbg = None
        if cfg.bg_subtract and b1 - b0 >= 2 * cfg.nfft:
            _, Zbg = stft(x[:, b0:b1], fs, cfg.nfft, cfg.hop)
            Zbg = Zbg[:, self.srp.band, :]

        # 帧权重：能量门限 + 起始段加权
        floor = e.max() + cfg.frame_floor_db
        w = SRPPHAT.onset_weights(e, floor_db=floor) if cfg.onset else (e > floor).astype(float)
        Rs = self._cov(Zs, w)
        Rb = None if Zbg is None else self._cov(Zbg, np.ones(Zbg.shape[2]))
        if cfg.method == "gevd_music":
            p = self._gevd_music(Rs, Rb)
        else:
            p = self._srp_scan(Rs if Rb is None else Rs - Rb)

        ks = _circular_peaks(p, self.srp.grid, cfg.n_candidates, cfg.min_sep, self.valid)
        if not ks:  # 全被屏蔽或无极大值
            ks = [int(np.argmax(np.where(self.valid, p, -np.inf)))]
        step = cfg.srp.grid_step
        cands = [(_refine(p, k, step, self.srp.grid), float(p[k])) for k in ks]
        margin = cands[0][1] - cands[1][1] if len(cands) > 1 else cands[0][1]
        sel = w > 0
        e_seg = 10 * np.log10(np.mean(np.abs(Zs[..., sel]) ** 2) + 1e-12) if sel.any() else -120.0
        e_bg = None if Zbg is None else 10 * np.log10(np.mean(np.abs(Zbg) ** 2) + 1e-12)
        return WakeDOAResult(
            az=cands[0][0], conf=float(np.clip(cands[0][1], 0.0, 1.0)), candidates=cands,
            margin=float(margin), snr_db=float("nan") if e_bg is None else float(e_seg - e_bg),
            n_frames=int(sel.sum()), bg_used=Rb is not None, spectrum=p)


def localize_wake_segment(x, fs, mic_xy, start, end, cfg: WakeDOAConfig = None) -> WakeDOAResult:
    """一次性调用版本：x 为 M x N 多通道音频（应包含唤醒词之前约 1.3 s 的背景），start/end 为样点号。"""
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
    """流式封装：持续推入多通道音频，唤醒回调时从环形缓存取唤醒词片段测向。

    缓存长度需覆盖：背景段（1.0 s）+ 间隔（0.15 s）+ 前放宽（0.1 s）+ 唤醒词（约 1 s）+ 回调延迟，默认 3 s。"""

    def __init__(self, mic_xy: np.ndarray, fs: int, cfg: WakeDOAConfig = None, buffer_s: float = 3.0):
        self.doa = WakeDOA(mic_xy, fs, cfg)
        self.fs = fs
        self.ring = RingBuffer(mic_xy.shape[1], int(buffer_s * fs))

    def push(self, block: np.ndarray):
        self.ring.push(block)

    def on_wake(self, start_sample: int, end_sample: int, kws_conf: Optional[float] = None) -> WakeDOAResult:
        """kws_conf 目前不参与计算，保留给后续“唤醒置信度 × 定位置信度”的联合判决。"""
        cfg = self.doa.cfg
        lead = int((cfg.pad_pre + cfg.bg_gap + cfg.bg_len) * self.fs)
        tail = int(cfg.pad_post * self.fs)
        x, a = self.ring.read(start_sample - lead, end_sample + tail)
        return self.doa.localize(x, start_sample - a, end_sample - a)
