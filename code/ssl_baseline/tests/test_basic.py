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
from ssl_baseline.turn import TurnDOA

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


def test_turn_doa_adaptive_background():
    """换人测向：干扰持续到开口后 → 判为 interf 并压掉干扰；上一位在开口前已停 → 判为 quiet，不白化上一位。"""
    mic = PRESETS["square4"]
    # 1) 干扰一直在（同 SIR 0 dB）
    x, s, e = _two_source_scene(mic, az_t=60.0, az_i=150.0, sir_db=0.0)
    r = TurnDOA(mic, FS).localize(x, s, s + FS // 2)
    assert r.mode == "interf" and angdiff(r.az, 60.0) < 5.0, (r.mode, r.az)
    # 2) 上一位（150°）在开口前 0.4 s 停止，新发言人在 60°
    n = int(2.8 * FS); s0 = int(1.8 * FS)
    xa = np.zeros((4, n)); xa[:, :s0 - int(0.4 * FS)] = _plane_wave(mic, 150.0, s0 - int(0.4 * FS), 5)
    xb = np.zeros((4, n)); xb[:, s0:s0 + FS // 2] = _plane_wave(mic, 60.0, FS // 2, 6)
    rng = np.random.default_rng(7); noise = rng.normal(0, 0.01, (4, n))
    loc = TurnDOA(mic, FS); loc.set_noise(rng.normal(0, 0.01, (4, FS)))
    r = loc.localize(xa + xb + noise, s0, s0 + FS // 2)
    assert r.mode == "quiet" and angdiff(r.az, 60.0) < 3.0, (r.mode, r.az)


def test_nn_decode_and_confidence():
    """小网络输出：峰值处解码出方位（抛物线插值），尖峰置信度高、平坦分布置信度低。"""
    from ssl_baseline.nn_doa import AZ_GRID, decode, confidence, soft_label
    lg = np.log(soft_label(np.array([31.0, -64.0])) + 1e-9)
    az = decode(lg)
    assert abs(az[0] - 31.0) < 1.0 and abs(az[1] + 64.0) < 1.0, az
    c = confidence(np.vstack([lg[:1], np.zeros((1, len(AZ_GRID)))]))
    assert c[0] > 0.9 and c[1] < 0.1, c


def test_finetune_sample_composition():
    """实录微调样本合成（build_own_finetune.compose，与 build_realman_finetune.py 同一做法）：
    格式与长度、换人 / 抢话的上一位方位差 ≥10°、同一随机种子结果完全相同。"""
    sys.path.insert(0, os.path.join(ROOT, "scripts"))
    import build_own_finetune as B
    r0 = np.random.default_rng(0)
    audio = {f"u{i}": r0.normal(0, 0.1, (6, int(r0.integers(8000, 30000)))) for i in range(6)}
    utts = [(f"u{i}", a) for i, a in enumerate([-60.0, -30.0, -5.0, 0.0, 25.0, 70.0])]
    bank = r0.normal(0, 0.01, (6, 16000 * 5))
    run = lambda: B.compose(utts, bank, audio.__getitem__, 200, np.random.default_rng(101))
    X, meta = run()
    assert len(X) == 200 and X[0].shape == (6, B.N) and X[0].dtype == np.int16
    conds = np.array([m["cond"] for m in meta])
    assert set(conds.tolist()) == {0, 1, 2}
    for m in meta:
        if m["cond"] in (0, 1):
            assert abs(m["az"] - m["az_prev"]) >= 10
        else:
            assert m["az"] == m["az_prev"]
    X2, meta2 = run()
    assert all(np.array_equal(a, b) for a, b in zip(X, X2)) and meta == meta2


def test_data_amount_report_formats():
    """数据量实验汇总：单起点（旧格式）与多起点（取平均）两种结果文件都能正确汇总。"""
    import tempfile
    sys.path.insert(0, os.path.join(ROOT, "scripts"))
    import run_realman_data_amount as R
    sc = {"A": {"utts": 10, "minutes": 6.0}, "B": {"utts": 10, "minutes": 6.0}}
    row = {"name": "f025", "group": "A", "seed": 0, "scenes": sc, "sel_acc10_best": 0.85, "acc10": 0.85, "acc20": 0.9, "mae": 3.0}
    old = {"steps": 1128, "base_model": R.BASE, "ref": {"base": {"acc10": 0.8}, "f1": {"acc10": 0.87}}, "rows": [row]}
    new = {"steps": 1128, "bases": ["b0", "b1"], "base_model": "b0.pt",
           "ref": {"b0": {"base": {"acc10": 0.76}, "f1": {"acc10": 0.86}}, "b1": {"base": {"acc10": 0.82}, "f1": {"acc10": 0.88}}},
           "rows": [dict(row, base="b0"), dict(row, base="b1", acc10=0.81)]}
    root0 = R.ROOT
    with tempfile.TemporaryDirectory() as d:
        os.makedirs(os.path.join(d, "out")); R.ROOT = d
        try:
            R.report(old, "_old"); R.report(new, "_new")
            t_old = open(os.path.join(d, "out", "realman_data_amount_old.txt"), encoding="utf-8").read()
            t_new = open(os.path.join(d, "out", "realman_data_amount_new.txt"), encoding="utf-8").read()
        finally:
            R.ROOT = root0
    assert "80.0%" in t_old and "87.0%" in t_old and "12 分钟" in t_old and "85.0%" in t_old
    assert "79.0%" in t_new and "87.0%" in t_new and "83.0%" in t_new and "85.0% / 81.0%" in t_new


if __name__ == "__main__":
    fns = [v for k, v in dict(globals()).items() if k.startswith("test_")]
    for fn in fns:
        fn(); print("PASS", fn.__name__)
    print(f"{len(fns)} tests passed")
