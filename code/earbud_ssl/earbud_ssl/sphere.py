"""刚性球头部模型（Duda & Martens 1998, JASA 104(5)）：点声源到球面附近任意点的传递函数。

约定：返回值已按"头部不存在时球心处的自由场声压"归一化，并换成 numpy FFT 的符号约定，
即纯延迟 tau 对应 exp(-j 2 pi f tau)。
"""
import numpy as np
from scipy.special import spherical_jn, spherical_yn, eval_legendre

SOUND_SPEED = 343.0
HEAD_RADIUS = 0.0875


def sphere_tf(src_xyz, mic_xyz, freqs, a=HEAD_RADIUS, c=SOUND_SPEED):
    """src_xyz: (S,3) 声源位置（m，头心为原点）；mic_xyz: (M,3) 麦克风位置（|m| >= a）；
    freqs: (F,) Hz。返回 (S,M,F) 复数传递函数。a 取极小值时退化为自由场。"""
    src = np.atleast_2d(np.asarray(src_xyz, float))
    mic = np.atleast_2d(np.asarray(mic_xyz, float))
    rs = np.linalg.norm(src, axis=1)
    rm = np.linalg.norm(mic, axis=1)
    assert np.all(rm >= a - 1e-9) and np.all(rs > rm.max())
    cosg = np.clip((src @ mic.T) / (rs[:, None] * rm[None, :]), -1, 1)  # (S,M)
    out = np.ones((len(src), len(mic), len(freqs)), complex)
    for fi, f in enumerate(freqs):
        if f < 20:
            continue
        k = 2 * np.pi * f / c
        N = int(np.ceil(k * rm.max() * 1.5)) + 15
        n = np.arange(N + 1)
        ka = k * a
        hd_a = spherical_jn(n, ka, derivative=True) + 1j * spherical_yn(n, ka, derivative=True)
        ratio = spherical_jn(n, ka, derivative=True) / hd_a
        h_s = spherical_jn(n[:, None], k * rs[None]) + 1j * spherical_yn(n[:, None], k * rs[None])  # (N,S)
        j_m = spherical_jn(n[:, None], k * rm[None])
        h_m = j_m + 1j * spherical_yn(n[:, None], k * rm[None])
        radial = j_m - ratio[:, None] * h_m  # (N,M)
        P = eval_legendre(n[:, None, None], cosg[None])  # (N,S,M)
        p = 1j * k * np.sum((2 * n + 1)[:, None, None] * P * h_s[:, :, None] * radial[:, None, :], axis=0)
        p0 = np.exp(1j * k * rs) / rs
        out[:, :, fi] = np.conj(p / p0[:, None])
    return out


def freefield_tf(src_xyz, mic_xyz, freqs, c=SOUND_SPEED):
    """不考虑头部的自由场传递函数（同样按球心处归一化），用于对照"忽略头部"的测向。"""
    src = np.atleast_2d(np.asarray(src_xyz, float))
    mic = np.atleast_2d(np.asarray(mic_xyz, float))
    rs = np.linalg.norm(src, axis=1)
    d = np.linalg.norm(src[:, None, :] - mic[None, :, :], axis=2)  # (S,M)
    tau = (d - rs[:, None]) / c
    gain = rs[:, None] / d
    return gain[..., None] * np.exp(-2j * np.pi * np.asarray(freqs)[None, None, :] * tau[..., None])


def earbud_mics(spacing=0.015, out=0.008, down=0.012, a=HEAD_RADIUS):
    """每耳 2 麦（耳柄上前后排列）的位置，顺序：左前、左后、右前、右后。
    坐标：x 正前、y 左、z 上；耳朵在 y = ±a。"""
    h = spacing / 2
    y = a + out
    return np.array([[h, y, -down], [-h, y, -down], [h, -y, -down], [-h, -y, -down]])


def azimuth_points(az_deg, r, el_deg=0.0):
    az = np.deg2rad(np.atleast_1d(az_deg))
    el = np.deg2rad(el_deg)
    return np.stack([r * np.cos(az) * np.cos(el), r * np.sin(az) * np.cos(el), np.full_like(az, r * np.sin(el))], 1)


def fibonacci_sphere(n, r):
    """球面上近似均匀的 n 个方向（用于扩散噪声与混响尾）。"""
    i = np.arange(n) + 0.5
    phi = np.arccos(1 - 2 * i / n)
    theta = np.pi * (1 + 5 ** 0.5) * i
    return r * np.stack([np.cos(theta) * np.sin(phi), np.sin(theta) * np.sin(phi), np.cos(phi)], 1)
