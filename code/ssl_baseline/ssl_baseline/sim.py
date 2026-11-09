# -*- coding: utf-8 -*-
"""房间声学仿真（pyroomacoustics 镜像源法）：静止声源、沿轨迹移动的声源、近场云台电机噪声。

注意：pyroomacoustics 0.10 的预编译包与 numpy 1.x 不兼容（会段错误）；numpy 1.x 环境请用 0.7.x。
"""
import numpy as np
import scipy.signal as sps
import pyroomacoustics as pra


def make_room(dims, fs, rt60, max_order_cap=40):
    if rt60 <= 0:
        return pra.ShoeBox(dims, fs=fs, max_order=0)
    e_abs, mo = pra.inverse_sabine(rt60, dims)
    return pra.ShoeBox(dims, fs=fs, materials=pra.Material(e_abs), max_order=min(mo, max_order_cap))


def mics_3d(mic_xy, center_xyz):
    return np.vstack([mic_xy + np.asarray(center_xyz[:2])[:, None], np.full((1, mic_xy.shape[1]), center_xyz[2])])


def simulate_static(sig, fs, dims, rt60, mic_xy, center, src_xyz):
    room = make_room(dims, fs, rt60)
    room.add_source(list(src_xyz), signal=sig)
    room.add_microphone_array(pra.MicrophoneArray(mics_3d(mic_xy, center), fs))
    room.simulate()
    return room.mic_array.signals


def simulate_trajectory(sig, fs, dims, rt60, mic_xy, center, traj_fn, block=4096, max_order_cap=30):
    """traj_fn(t) -> 声源 xyz。分块计算 RIR，汉宁窗 50% 重叠相加，近似连续移动。"""
    hop = block // 2; win = np.hanning(block + 1)[:-1]
    N = len(sig); M = mic_xy.shape[1]
    y = np.zeros((M, N + 50000))
    mics = mics_3d(mic_xy, center)
    for st in range(0, N - block, hop):
        tc = (st + block / 2) / fs
        room = make_room(dims, fs, rt60, max_order_cap)
        room.add_source(list(traj_fn(tc))); room.add_microphone_array(pra.MicrophoneArray(mics, fs))
        room.compute_rir()
        seg = sig[st: st + block] * win
        for m in range(M):
            c = np.convolve(seg, room.rir[m][0]); y[m, st: st + len(c)] += c
    return y[:, :N]


def motor_noise(n, fs, rng, f0=420.0):
    """云台电机噪声：谐波 + 带限噪声（示意）。"""
    t = np.arange(n) / fs
    harm = sum(np.sin(2 * np.pi * f0 * (k + 1) * t + rng.uniform(0, 2 * np.pi)) / (k + 1) for k in range(4))
    b, a = sps.butter(4, [300 / (fs / 2), 2500 / (fs / 2)], "band")
    return 0.6 * harm + 0.8 * sps.lfilter(b, a, rng.normal(0, 1, n))


def simulate_near_field(sig, fs, mic_xy, offset_xyz):
    """近场点源（如阵列下方的电机），自由场传播；offset_xyz 为相对阵列中心的位置（米）。"""
    c = np.array([10.0, 10.0, 5.0])
    room = pra.ShoeBox([20, 20, 10], fs=fs, max_order=0)
    room.add_source(list(c + np.asarray(offset_xyz)), signal=sig)
    room.add_microphone_array(pra.MicrophoneArray(mics_3d(mic_xy, c), fs))
    room.simulate()
    return room.mic_array.signals[:, :len(sig)]


def highpass(x, fs, fc=100.0, order=4):
    """去直流与低频隆隆声（TTS / 录音常带直流偏置，会抬高总功率、拉低带内信噪比）。"""
    b, a = sps.butter(order, fc / (fs / 2), "high")
    return sps.filtfilt(b, a, x)
