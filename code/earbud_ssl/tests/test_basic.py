"""耳机声源定位最小验证的单元测试：python tests/test_basic.py"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from earbud_ssl.sphere import sphere_tf, freefield_tf, earbud_mics, azimuth_points, fibonacci_sphere, SOUND_SPEED, HEAD_RADIUS
from earbud_ssl.sim import stft, simulate, apply_sync_error
from earbud_ssl.doa import estimate_all, ild_model

FREQS = np.fft.rfftfreq(512, 1 / 16000)


def test_freefield_limit():
    f = np.array([300.0, 1000, 4000, 7000])
    src = azimuth_points([40], 1.5)
    assert np.abs(sphere_tf(src, earbud_mics(), f, a=1e-4) - freefield_tf(src, earbud_mics(), f)).max() < 1e-4


def test_low_freq_itd():
    """球头低频耳间时差 ≈ 3a/c·sinθ（麦克风略离开球面，允许 15% 偏差）。"""
    for az in (30, 60, 90):
        H = sphere_tf(azimuth_points([az], 1.5), earbud_mics(), np.array([200.0]))[0]
        itd = -np.angle(H[0, 0] * np.conj(H[2, 0])) / (2 * np.pi * 200)
        ref = -3 * HEAD_RADIUS / SOUND_SPEED * np.sin(np.deg2rad(az))
        assert abs(itd - ref) / abs(ref) < 0.15, (az, itd, ref)


def test_ild_sign():
    H = sphere_tf(azimuth_points([60], 1.5), earbud_mics(), np.array([5000.0]))[0]
    assert abs(H[0, 0]) > abs(H[2, 0])  # 左侧声源，左耳更响


def test_route_A_quiet():
    rng = np.random.default_rng(0)
    fmask = (FREQS >= 200) & (FREQS <= 7000)
    bands = [np.where((FREQS >= lo) & (FREQS < hi))[0] for lo, hi in [(1000, 3000), (3000, 7000)]]
    grid = np.arange(-180, 180, 2.0)
    mics = earbud_mics()
    Hg = sphere_tf(azimuth_points(grid, 1.5), mics, FREQS)
    Hd = sphere_tf(fibonacci_sphere(8, 2.0), mics, FREQS)
    for az in (-150.0, -20.0, 70.0, 160.0):
        S = stft(rng.standard_normal(16000))
        Y = simulate(S, sphere_tf(azimuth_points([az], 1.5), mics, FREQS)[0], Hd, rng, snr_db=30)
        est = estimate_all(Y, Hg, Hg, fmask, bands, ild_model(Hg, bands), grid)
        assert abs((est["A_双耳组阵"] - az + 180) % 360 - 180) <= 4, (az, est)


def test_sync_error_shifts_phase():
    Y = np.ones((4, len(FREQS), 3), complex)
    Ys = apply_sync_error(Y, FREQS, [2, 3], 1e-4)
    assert np.allclose(Ys[:2], 1) and not np.allclose(Ys[2:], 1)


def test_methods_quiet_and_fusion():
    """安静单声源下 SRP-PHAT、MUSIC、GEVD-MUSIC 都应测准；融合应选中在说话且声学支持的人脸。"""
    from earbud_ssl import methods as Mth
    rng = np.random.default_rng(1)
    fmask = (FREQS >= 200) & (FREQS <= 7000)
    grid = np.arange(-180, 180, 2.0)
    mics = earbud_mics()
    Hg = sphere_tf(azimuth_points(grid, 1.5), mics, FREQS)
    Hd = sphere_tf(fibonacci_sphere(8, 2.0), mics, FREQS)
    az = 24.0
    Y = simulate(stft(rng.standard_normal(16000)), sphere_tf(azimuth_points([az], 1.5), mics, FREQS)[0], Hd, rng, snr_db=25)
    from earbud_ssl.sim import diffuse_noise
    Yb = diffuse_noise(Hd, Y.shape[2], rng, np.ones(len(FREQS))) * np.sqrt(np.mean(np.abs(Y) ** 2)) * 0.05
    w = np.ones(Y.shape[2])
    p_srp = Mth.srp_phat(Y, Hg, fmask, w)
    p_mu = Mth.music(Mth.covariance(Y, fmask, w), Hg, fmask)
    p_gevd = Mth.music(Mth.covariance(Y, fmask, w), Hg, fmask, Mth.covariance(Yb, fmask, np.ones(Yb.shape[2])))
    for p in (p_srp, p_mu, p_gevd):
        assert abs(Mth.peak(p, grid) - az) <= 4
    faces = [(-30.0, 0.9), (25.0, 0.8), (5.0, 0.1)]  # 只有 25° 那张脸在说话且有声学支持
    assert Mth.fuse_with_faces(p_srp, grid, faces) == 25.0
    assert Mth.fuse_with_faces(p_srp, grid, [(5.0, 0.1)]) == Mth.peak(p_srp, grid)  # 没有在说话的人脸 → 退回声学


if __name__ == "__main__":
    tests = [v for k, v in dict(globals()).items() if k.startswith("test_")]
    for t in tests:
        t()
        print("ok", t.__name__)
    print(f"{len(tests)} 项全部通过")
