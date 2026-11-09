# -*- coding: utf-8 -*-
"""基础单元测试：python -m pytest -q tests  或  python tests/test_basic.py"""
import os, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from ssl_baseline import PRESETS, SRPPHAT, stft, gcc_phat, CircularKalman, TrackerConfig, EnergyFluxTrigger, \
    PTZController, PTZConfig, State, angdiff, aliasing_frequency
from ssl_baseline.geometry import far_field_delays

FS = 16000


def _plane_wave(mic_xy, az, n=FS, seed=0):
    """频域施加分数时延，生成理想远场平面波（白噪声源）。"""
    rng = np.random.default_rng(seed)
    s = rng.normal(0, 1, n)
    S = np.fft.rfft(s); f = np.fft.rfftfreq(n, 1 / FS)
    tau = far_field_delays(mic_xy, np.array([az]))[:, 0]
    return np.stack([np.fft.irfft(S * np.exp(-1j * 2 * np.pi * f * t), n) for t in tau])


def test_srp_plane_wave_accuracy():
    for name in ["tri3", "square4"]:
        mic = PRESETS[name]; srp = SRPPHAT(mic, FS)
        for az in [10.0, 137.0, 251.5, 333.0]:
            f, Z = stft(_plane_wave(mic, az), FS)
            est, conf = srp.peak(srp.aggregate(srp.map(Z)))
            assert angdiff(est, az) < 2.0, (name, az, est)
            assert conf > 0.9  # 理想平面波相干度接近 1


def test_linear2_front_back_ambiguity():
    mic = PRESETS["linear2"]; srp = SRPPHAT(mic, FS)
    f, Z = stft(_plane_wave(mic, 60.0), FS)
    p = srp.aggregate(srp.map(Z))
    assert abs(p[60] - p[300]) < 1e-6  # 关于阵列轴镜像对称


def test_gcc_phat_integer_delay():
    rng = np.random.default_rng(1); s = rng.normal(0, 1, 8000)
    x1 = np.r_[np.zeros(5), s[:-5]]  # x1 比 x2 晚 5 个采样
    tau, _ = gcc_phat(x1, s, FS, max_tau=0.001)
    assert abs(tau * FS - 5) < 0.2


def test_aliasing_frequency():
    f = aliasing_frequency(PRESETS["square4"])
    assert 4000 < f < 4500  # 相邻间距 4 cm → 约 4.3 kHz


def test_tracker_wraparound():
    trk = CircularKalman(TrackerConfig(dt=0.1))
    truth = (350 + np.arange(40) * 1.0) % 360  # 从 350° 匀速跨过 0°
    for z in truth:
        trk.predict(); trk.update(z)
    assert trk.active and angdiff(trk.az, truth[-1]) < 3.0


def test_tracker_rejects_outlier_and_holds():
    trk = CircularKalman(TrackerConfig(dt=0.1, hold_s=1.0))
    for _ in range(5):
        trk.predict(); trk.update(90.0)
    trk.predict(); assert not trk.update(270.0)  # 门控拒绝野值
    for _ in range(5):
        trk.predict()
    assert trk.active  # 静音 0.5 s 仍保持
    for _ in range(10):
        trk.predict()
    assert not trk.active  # 超过 hold_s 后释放


def test_trigger_detects_onset():
    trig = EnergyFluxTrigger()
    quiet = [trig.step(np.full(100, 1e-3)) for _ in range(20)]
    loud = [trig.step(np.full(100, 1e-1)) for _ in range(3)]
    assert not any(quiet) and all(loud)


def test_ptz_dead_zone_no_move():
    ctl = PTZController(PTZConfig(hfov=90, dead_zone=15), TrackerConfig(dt=0.1), pan=0.0)
    for _ in range(10):
        ctl.step(0.1, True, 8.0, 0.5, person_az=8.0)  # 目标在死区内
    assert angdiff(ctl.pan, 0.0) < 1e-6 and ctl.state == State.TRACK


def test_ptz_turns_to_out_of_view_source():
    ctl = PTZController(PTZConfig(hfov=90), TrackerConfig(dt=0.1), pan=0.0)
    for _ in range(40):
        motor = ctl.motor_on
        ctl.step(0.1, True, 150.0, 0.5, person_az=150.0 if angdiff(ctl.pan, 150) < 40 else None)
    assert angdiff(ctl.pan, 150.0) < 5.0


if __name__ == "__main__":
    fns = [v for k, v in dict(globals()).items() if k.startswith("test_")]
    for fn in fns:
        fn(); print("PASS", fn.__name__)
    print(f"{len(fns)} tests passed")
