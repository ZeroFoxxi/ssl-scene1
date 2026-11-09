# -*- coding: utf-8 -*-
"""测向：GCC-PHAT（麦克风对）与 SRP-PHAT（全向网格扫描）。"""
from dataclasses import dataclass
import numpy as np
import scipy.signal as sps

from .geometry import far_field_delays, SOUND_SPEED


def stft(x: np.ndarray, fs: int, nfft: int = 512, hop: int = 256):
    """x: M x N 多通道信号 -> (频率 f[F], Z[M, F, T])"""
    f, _, Z = sps.stft(x, fs=fs, nperseg=nfft, noverlap=nfft - hop, boundary=None, padded=False)
    return f, Z


def gcc_phat(x1: np.ndarray, x2: np.ndarray, fs: int, max_tau: float = None, interp: int = 8):
    """两通道 GCC-PHAT，返回 (tau, cc)。tau>0 表示 x1 比 x2 晚到。"""
    n = len(x1) + len(x2)
    X1 = np.fft.rfft(x1, n); X2 = np.fft.rfft(x2, n)
    G = X1 * np.conj(X2)
    cc = np.fft.irfft(G / (np.abs(G) + 1e-12), n * interp)
    max_shift = int(interp * n / 2)
    if max_tau is not None:
        max_shift = min(int(interp * fs * max_tau), max_shift)
    cc = np.concatenate((cc[-max_shift:], cc[:max_shift + 1]))
    shift = np.argmax(np.abs(cc)) - max_shift
    return shift / float(interp * fs), cc


@dataclass
class SRPConfig:
    fmin: float = 300.0
    fmax: float = 4000.0      # 建议不超过空间混叠频率（geometry.aliasing_frequency）
    grid_step: float = 1.0    # 方位网格（度）
    c: float = SOUND_SPEED


class SRPPHAT:
    """SRP-PHAT：对每个候选方位，把各麦克风对在该方位对应时延下的 PHAT 互谱相干相加。

    用法：
        srp = SRPPHAT(mic_xy, fs, nfft)
        f, Z = stft(x, fs)
        P = srp.map(Z)            # T x G 逐帧空间谱
        az, conf = srp.peak(P.sum(0))
    """

    def __init__(self, mic_xy: np.ndarray, fs: int, nfft: int = 512, cfg: SRPConfig = SRPConfig()):
        self.cfg = cfg
        self.grid = np.arange(0.0, 360.0, cfg.grid_step)
        f = np.fft.rfftfreq(nfft, 1.0 / fs)
        self.band = (f >= cfg.fmin) & (f <= cfg.fmax)
        fb = f[self.band]
        tau = far_field_delays(mic_xy, self.grid, cfg.c)  # M x G
        M = mic_xy.shape[1]
        self.pairs = [(i, j) for i in range(M) for j in range(i + 1, M)]
        # 预计算每个麦克风对的导向相位 F x G
        self.steer = [np.exp(1j * 2 * np.pi * fb[:, None] * (tau[i] - tau[j])[None, :]) for i, j in self.pairs]

    def map(self, Z: np.ndarray) -> np.ndarray:
        """Z: M x F x T -> T x G。已按（麦克风对数 × 频点数）归一化，取值 [-1, 1]，1 表示理想平面波完全相干。"""
        Zb = Z[:, self.band, :]
        out = 0.0
        for (i, j), st in zip(self.pairs, self.steer):
            cross = Zb[i] * np.conj(Zb[j])
            cross = cross / (np.abs(cross) + 1e-12)
            out = out + np.real(cross.T @ st)
        return out / (len(self.pairs) * Zb.shape[1])

    def band_energy_db(self, Z: np.ndarray) -> np.ndarray:
        """逐帧带内能量（dB，各通道平均），用于起始段加权与帧级 VAD。"""
        return 10 * np.log10(np.mean(np.abs(Z[:, self.band, :]) ** 2, axis=(0, 1)) + 1e-12)

    @staticmethod
    def onset_weights(e_db: np.ndarray, prev_db: float = None, floor_db: float = None, base: float = 0.2) -> np.ndarray:
        """起始段加权（优先效应）：能量上升的帧以直达声为主，给更大权重；能量下降的混响尾部只给小权重。
        e_db: 逐帧能量；prev_db: 上一帧能量（跨块延续）；floor_db: 低于此能量的帧权重为 0。"""
        prev = np.r_[e_db[0] if prev_db is None else prev_db, e_db[:-1]]
        w = base + np.clip(e_db - prev, 0.0, 10.0) / 10.0
        if floor_db is not None:
            w = np.where(e_db > floor_db, w, 0.0)
        return w

    def aggregate(self, P: np.ndarray, w: np.ndarray = None) -> np.ndarray:
        """把 T x G 的逐帧谱按权重合成为一个块级谱（加权平均，仍在 [-1, 1]）。"""
        if w is None:
            return P.mean(0)
        if w.sum() <= 0:
            return np.zeros(P.shape[1])
        return (w[:, None] * P).sum(0) / w.sum()

    def peak(self, p: np.ndarray, refine: bool = True):
        """返回 (方位角, 置信度)。置信度 = 归一化 SRP 峰值（空间相干度，[-1, 1]）。抛物线插值细化到亚网格。"""
        k = int(np.argmax(p))
        az = self.grid[k]
        if refine and len(p) > 2:
            y0, y1, y2 = p[k - 1], p[k], p[(k + 1) % len(p)]
            den = y0 - 2 * y1 + y2
            if abs(den) > 1e-12:
                az = (az + 0.5 * (y0 - y2) / den * self.cfg.grid_step) % 360.0
        return float(az), float(p[k])


def mirror_about_axis(az_deg: float, axis_deg: float = 0.0) -> float:
    """线阵的前后镜像方位：关于阵列轴对称。"""
    return float((2 * axis_deg - az_deg) % 360.0)
