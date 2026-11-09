# -*- coding: utf-8 -*-
"""圆周卡尔曼跟踪器：状态 [方位(°), 角速度(°/s)]，处理 0/360° 回绕，带门控、静音保持与航迹管理。"""
from dataclasses import dataclass, field
import numpy as np


def wrap180(a):
    return (np.asarray(a) + 180.0) % 360.0 - 180.0


@dataclass
class TrackerConfig:
    dt: float = 0.1               # 块长（s）
    q_az: float = 0.5             # 过程噪声（方位，°²）
    q_vel: float = 4.0            # 过程噪声（角速度，(°/s)²）
    r_audio: float = 36.0         # 声学观测噪声方差（°²），约 6° 标准差
    r_vision: float = 4.0         # 视觉观测噪声方差（°²），约 2° 标准差
    gate_deg: float = 30.0        # 新息门限（°）
    confirm_hits: int = 3         # 起始确认所需的一致观测数（M）
    confirm_window: int = 6       # 起始确认的观测窗口（N）
    confirm_spread: float = 20.0  # 一致观测的最大离散（°）
    hold_s: float = 3.0           # 无观测时保持航迹的时间（s）
    max_vel: float = 120.0        # 角速度上限（°/s）


@dataclass
class CircularKalman:
    cfg: TrackerConfig = field(default_factory=TrackerConfig)

    def __post_init__(self):
        self.reset()

    def reset(self):
        self.x = None
        self.P = np.eye(2) * 100.0
        self.pending = []
        self.since_update = 0.0

    @property
    def active(self) -> bool:
        return self.x is not None

    @property
    def az(self):
        return None if self.x is None else float(self.x[0] % 360.0)

    def predict(self):
        if self.x is None:
            return
        dt = self.cfg.dt
        F = np.array([[1.0, dt], [0.0, 1.0]])
        self.x = F @ self.x
        self.x[1] = np.clip(self.x[1], -self.cfg.max_vel, self.cfg.max_vel)
        self.P = F @ self.P @ F.T + np.diag([self.cfg.q_az, self.cfg.q_vel])
        self.since_update += dt
        if self.since_update > self.cfg.hold_s:
            self.reset()

    def _try_start(self, z):
        """M-of-N 起始：最近 confirm_window 个观测里，有 confirm_hits 个落在 ±confirm_spread/2 内即起始。"""
        self.pending.append(float(z))
        self.pending = self.pending[-self.cfg.confirm_window:]
        obs = np.array(self.pending)
        best, best_n = None, 0
        for ref in obs:
            d = wrap180(obs - ref)
            m = np.abs(d) <= self.cfg.confirm_spread / 2
            if m.sum() > best_n:
                best_n, best = int(m.sum()), (ref + np.mean(d[m])) % 360.0
        if best_n >= self.cfg.confirm_hits:
            self.x = np.array([best, 0.0]); self.P = np.diag([self.cfg.r_audio, 100.0])
            self.since_update = 0.0; self.pending = []
            return True
        return False

    def update(self, z_deg: float, r: float = None) -> bool:
        """返回观测是否被采纳。未起始时累积观测，满足一致性后起始航迹。"""
        if self.x is None:
            return self._try_start(float(z_deg))
        r = self.cfg.r_audio if r is None else r
        inn = float(wrap180(z_deg - self.x[0]))
        S = self.P[0, 0] + r
        if abs(inn) > max(self.cfg.gate_deg, 3 * np.sqrt(S)) and r >= self.cfg.r_audio:
            return False
        K = self.P[:, 0] / S
        self.x = self.x + K * inn
        self.P = self.P - np.outer(K, self.P[0, :])
        self.since_update = 0.0
        return True
