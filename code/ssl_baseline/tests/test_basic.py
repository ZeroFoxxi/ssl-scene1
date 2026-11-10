# -*- coding: utf-8 -*-
"""基础单元测试：python -m pytest -q tests  或  python tests/test_basic.py"""
import os, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from ssl_baseline import PRESETS, SRPPHAT, stft, gcc_phat, CircularKalman, TrackerConfig, EnergyFluxTrigger, \
    PTZController, PTZConfig, State, angdiff, aliasing_frequency
from ssl_baseline.geometry import far_field_delays
from ssl_baseline.wake import WakeDOA, WakeDOAConfig, WakeWordLocalizer, RingBuffer

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


def _two_source_scene(mic, az_t, az_i, sir_db=0.0, seed=3):
    """1.3 s 只有干扰（白噪声定向源）+ 1.0 s 目标与干扰同时存在；返回 (x, start, end)。"""
    pre, wake = int(1.6 * FS), FS
    n = pre + wake + int(0.2 * FS)
    xi = _plane_wave(mic, az_i, n, seed)
    xt = np.zeros_like(xi); xt[:, pre:pre + wake] = _plane_wave(mic, az_t, wake, seed + 1)
    xt *= 10 ** (sir_db / 20)
    rng = np.random.default_rng(seed + 2)
    return xt + xi + rng.normal(0, 0.03, xi.shape), pre, pre + wake


def test_wake_doa_clean_plane_wave():
    mic = PRESETS["square4"]
    for method in ["gevd_music", "srp_sub"]:
        wd = WakeDOA(mic, FS, WakeDOAConfig(method=method))
        for az in [20.0, 200.0, 305.0]:
            x = np.zeros((4, int(2.6 * FS))); s0 = int(1.5 * FS)
            x[:, s0:s0 + FS] = _plane_wave(mic, az)
            x += np.random.default_rng(0).normal(0, 0.01, x.shape)
            r = wd.localize(x, s0, s0 + FS)
            assert angdiff(r.az, az) < 3.0, (method, az, r.az)
            assert 0.0 <= r.conf <= 1.0 and r.bg_used and r.n_frames > 0


def test_wake_doa_suppresses_background_interferer():
    """干扰在唤醒前就存在且与目标同样响：GEVD-MUSIC 应给出目标方位，不用背景段的 MUSIC 会被干扰拉偏或锁定。"""
    mic = PRESETS["square4"]
    x, s, e = _two_source_scene(mic, az_t=60.0, az_i=150.0, sir_db=0.0)
    r = WakeDOA(mic, FS).localize(x, s, e)
    assert angdiff(r.az, 60.0) < 5.0, r.az
    assert any(angdiff(c[0], 60.0) < 5 for c in r.candidates)


def test_wake_doa_exclude_sector():
    mic = PRESETS["square4"]
    x, s, e = _two_source_scene(mic, az_t=60.0, az_i=150.0, sir_db=0.0)
    r = WakeDOA(mic, FS, WakeDOAConfig(bg_subtract=False, exclude=((40.0, 80.0),))).localize(x, s, e)
    assert angdiff(r.az, 60.0) > 20.0  # 屏蔽区间内的方位不会被选中


def test_ring_buffer_and_streaming_localizer():
    rb = RingBuffer(2, 100)
    data = np.vstack([np.arange(250), -np.arange(250)]).astype(float)
    for i in range(0, 250, 30):
        rb.push(data[:, i:i + 30])
    x, a = rb.read(120, 260)
    assert a == 150 and np.array_equal(x, data[:, 150:250])  # 超出缓存的部分被截掉
    mic = PRESETS["square4"]
    x, s, e = _two_source_scene(mic, az_t=250.0, az_i=10.0, sir_db=3.0)
    loc = WakeWordLocalizer(mic, FS, buffer_s=3.0)
    for i in range(0, x.shape[1], 256):
        loc.push(x[:, i:i + 256])
    r_stream = loc.on_wake(s, e)
    r_off = WakeDOA(mic, FS).localize(x, s, e)
    assert abs(r_stream.az - r_off.az) < 1e-6 and angdiff(r_stream.az, 250.0) < 5.0


if __name__ == "__main__":
    fns = [v for k, v in dict(globals()).items() if k.startswith("test_")]
    for fn in fns:
        fn(); print("PASS", fn.__name__)
    print(f"{len(fns)} tests passed")
