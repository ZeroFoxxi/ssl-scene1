# -*- coding: utf-8 -*-
"""L0 常开触发：能量 + 谱通量，自适应噪声底。只用单通道，计算量极低。"""
import numpy as np


class EnergyFluxTrigger:
    def __init__(self, snr_db: float = 8.0, flux_k: float = 2.5, alpha_noise: float = 0.98, hang_blocks: int = 3):
        self.snr_db = snr_db
        self.flux_k = flux_k
        self.alpha = alpha_noise
        self.hang = hang_blocks
        self.noise_db = None
        self.prev_spec = None
        self.flux_mean, self.flux_var = 0.0, 1.0
        self._hang_left = 0

    def step(self, spec_mag: np.ndarray) -> bool:
        """spec_mag: 当前块单通道幅度谱（F 维，块内平均）。返回是否处于激活状态。"""
        e_db = 10 * np.log10(np.mean(spec_mag ** 2) + 1e-12)
        if self.noise_db is None:
            self.noise_db = e_db
        flux = 0.0 if self.prev_spec is None else float(np.sum(np.maximum(spec_mag - self.prev_spec, 0)))
        self.prev_spec = spec_mag
        z = (flux - self.flux_mean) / np.sqrt(self.flux_var + 1e-12)
        active = (e_db - self.noise_db > self.snr_db) or (z > self.flux_k and e_db - self.noise_db > self.snr_db / 2)
        if active:
            self._hang_left = self.hang
        elif self._hang_left > 0:
            self._hang_left -= 1
            active = True
        if not active:  # 只在非激活时更新噪声底与谱通量统计
            self.noise_db = self.alpha * self.noise_db + (1 - self.alpha) * e_db
            self.flux_mean = 0.95 * self.flux_mean + 0.05 * flux
            self.flux_var = 0.95 * self.flux_var + 0.05 * (flux - self.flux_mean) ** 2
        else:
            self.noise_db = min(self.noise_db, e_db)
        return bool(active)
