# -*- coding: utf-8 -*-
"""阵列几何与远场时延。

坐标约定：阵列平面为水平面，方位角 0° 指向 x 轴正方向、逆时针增大（与 numpy.arctan2 一致）。
"""
import numpy as np

SOUND_SPEED = 343.0


def ring_array(n_mics: int, radius: float, start_deg: float = 0.0) -> np.ndarray:
    """均匀圆阵，返回 2 x M 的阵元平面坐标（米）。n_mics=2 即线阵。"""
    ang = np.deg2rad(start_deg + 360.0 * np.arange(n_mics) / n_mics)
    return np.stack([radius * np.cos(ang), radius * np.sin(ang)], 0)


PRESETS = {
    # 同孔径（外接圆半径 2.83 cm，孔径约 5.7 cm）的三种构型，便于公平对比
    "linear2": ring_array(2, 0.0283, 0.0),
    "tri3": ring_array(3, 0.0283, 90.0),
    "square4": ring_array(4, 0.0283, 45.0),
}


def far_field_delays(mic_xy: np.ndarray, az_deg: np.ndarray, c: float = SOUND_SPEED) -> np.ndarray:
    """远场平面波到达各阵元的相对时延 tau[m, g]（秒）。离声源更近的阵元时延更小（先收到）。"""
    az = np.deg2rad(np.atleast_1d(az_deg))
    u = np.stack([np.cos(az), np.sin(az)], 0)  # 2 x G
    return -(mic_xy.T @ u) / c


def min_spacing(mic_xy: np.ndarray) -> float:
    d = np.linalg.norm(mic_xy[:, :, None] - mic_xy[:, None, :], axis=0)
    return float(d[d > 0].min())


def max_spacing(mic_xy: np.ndarray) -> float:
    d = np.linalg.norm(mic_xy[:, :, None] - mic_xy[:, None, :], axis=0)
    return float(d.max())


def aliasing_frequency(mic_xy: np.ndarray, c: float = SOUND_SPEED) -> float:
    """空间混叠起始频率的保守估计：f = c / (2 * 最小阵元间距)。"""
    return c / (2.0 * min_spacing(mic_xy))
