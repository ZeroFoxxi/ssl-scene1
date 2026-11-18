"""带墙面反射的房间：鞋盒房间镜像声源法（Allen & Berkley 1979）+ 头部模型。

早期反射（≤ max_order 阶）按各镜像声源的来向，查刚性球头部传递函数表（方位 5°、仰角 15° 最近邻）；
直达声用精确的刚性球解；更晚的混响仍用扩散尾补足（见 sim.render_source）。
"""
import os
import numpy as np
from .sphere import sphere_tf, SOUND_SPEED

NFFT_IR = 2048  # 早期部分冲激响应长度（128 ms @16 kHz）


def hrtf_table(mics, cache_dir, fs=16000, r=2.0):
    """(方位 72 × 仰角 13) 个方向在 NFFT_IR 频点上的头部传递函数（球心处归一化），带磁盘缓存。"""
    path = os.path.join(cache_dir, f"sphere_table_{NFFT_IR}.npz")
    if os.path.exists(path):
        d = np.load(path)
        return d["az"], d["el"], d["H"]
    az = np.arange(-180, 180, 5.0); el = np.arange(-90, 91, 15.0)
    A, E = np.meshgrid(np.deg2rad(az), np.deg2rad(el), indexing="ij")
    pts = r * np.stack([np.cos(A) * np.cos(E), np.sin(A) * np.cos(E), np.sin(E)], -1).reshape(-1, 3)
    freqs = np.fft.rfftfreq(NFFT_IR, 1 / fs)
    H = sphere_tf(pts, mics, freqs).astype(np.complex64).reshape(len(az), len(el), len(mics), len(freqs))
    os.makedirs(cache_dir, exist_ok=True)
    np.savez(path, az=az, el=el, H=H)
    return az, el, H


def image_sources(room, src, max_order, beta):
    """鞋盒房间 room=(Lx,Ly,Lz)，声源 src（房间坐标）。返回 [(镜像位置, 反射系数乘积, 阶数)]。"""
    out = []
    L = np.asarray(room, float)
    rng_n = range(-max_order, max_order + 1)
    for nx in rng_n:
        for ny in rng_n:
            for nz in rng_n:
                for px in (0, 1):
                    for py in (0, 1):
                        for pz in (0, 1):
                            p = np.array([px, py, pz]); n = np.array([nx, ny, nz])
                            order = int(np.sum(np.abs(n - p) + np.abs(n)))  # 反射次数
                            if order > max_order:
                                continue
                            pos = (1 - 2 * p) * src + 2 * n * L
                            out.append((pos, beta ** order, order))
    return out


def early_ir(room, src, head, yaw_deg, mics, table, beta, max_order=3, fs=16000, exact_direct=True):
    """头部在 head（房间坐标）、朝向 yaw 时，声源 src 到各麦的早期冲激响应 (M, NFFT_IR)，以及直达声与早期反射能量。
    幅度按 1/r 衰减并以直达声距离归一化（直达声增益 1）。"""
    az_t, el_t, H = table
    freqs = np.fft.rfftfreq(NFFT_IR, 1 / fs)
    c, s = np.cos(np.deg2rad(-yaw_deg)), np.sin(np.deg2rad(-yaw_deg))
    Rz = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
    d0 = np.linalg.norm(src - head)
    t_ref = d0 / SOUND_SPEED - 0.004  # 直达声放在 4 ms 处
    TF = np.zeros((len(mics), len(freqs)), complex)
    e_dir = e_early = 0.0
    for pos, g, order in image_sources(room, src, max_order, beta):
        v = Rz @ (pos - head)
        r = np.linalg.norm(v)
        if r / SOUND_SPEED - t_ref > NFFT_IR / fs * 0.9:
            continue
        if order == 0 and exact_direct:
            Hd = sphere_tf(v[None], mics, freqs)[0]
        else:
            az = np.degrees(np.arctan2(v[1], v[0])); el = np.degrees(np.arcsin(v[2] / r))
            Hd = H[int(round((az + 180) / 5)) % 72, int(round((el + 90) / 15))]
        amp = g * d0 / r
        TF += amp * Hd * np.exp(-2j * np.pi * freqs * (r / SOUND_SPEED - t_ref))[None]
        if order == 0:
            e_dir += amp ** 2
        else:
            e_early += amp ** 2
    return np.fft.irfft(TF, NFFT_IR, axis=1), e_dir, e_early


def sabine_beta(room, rt60):
    L = np.asarray(room, float)
    V = L.prod(); S = 2 * (L[0] * L[1] + L[0] * L[2] + L[1] * L[2])
    alpha = min(0.99, 0.161 * V / (S * rt60))
    return np.sqrt(1 - alpha)
