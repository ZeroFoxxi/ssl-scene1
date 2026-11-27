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


def test_rotate_background():
    """背景里有一个 40° 的干扰；头向左转 20° 后，旋转后的背景协方差应与"转头后直接测得的背景"接近。"""
    from earbud_ssl import methods as Mth
    from earbud_ssl.sim import render_source
    rng = np.random.default_rng(3)
    fmask = (FREQS >= 200) & (FREQS <= 7000)
    grid = np.arange(-180, 180, 5.0)
    mics = earbud_mics()
    Hg = sphere_tf(azimuth_points(grid, 1.5), mics, FREQS)
    Hd = sphere_tf(fibonacci_sphere(16, 2.0), mics, FREQS)
    Gam = Mth.diffuse_coherence(Hd, fmask)
    S = stft(rng.standard_normal(16000))
    def bg(yaw):
        y = render_source(S, sphere_tf(azimuth_points([40 - yaw], 1.5), mics, FREQS)[0], Hd, rng)
        return Mth.covariance(y, fmask, np.ones(y.shape[2]))
    R0, R20 = bg(0.0), bg(20.0)
    Rrot = Mth.rotate_background(R0, Hg, grid, fmask, Gam, 20.0, n_dirs=1)
    err_rot = np.linalg.norm(Rrot - R20) / np.linalg.norm(R20)
    err_stale = np.linalg.norm(R0 - R20) / np.linalg.norm(R20)
    assert err_rot < 0.5 * err_stale, (err_rot, err_stale)


def test_room_early_ir():
    """镜像声源法：直达声在约 4 ms 处；加墙面反射后早期能量增加；Sabine 反射系数在 (0,1)。"""
    from earbud_ssl.room import early_ir, sabine_beta, image_sources
    mics = earbud_mics()
    f = np.fft.rfftfreq(2048, 1 / 16000)
    H = sphere_tf(azimuth_points(np.arange(-180, 180, 5.0), 2.0, 0.0), mics, f)  # 只含仰角 0 的小表（测试用）
    table = (None, None, np.repeat(H[:, None], 13, axis=1))
    room = np.array([6.0, 5.0, 3.0]); head = np.array([3.0, 2.5, 1.2]); src = np.array([4.5, 2.5, 1.2])
    beta = sabine_beta(room, 0.5)
    assert 0 < beta < 1
    ir0, e0, _ = early_ir(room, src, head, 0.0, mics, table, beta, max_order=0)
    ir2, _, ee = early_ir(room, src, head, 0.0, mics, table, beta, max_order=2)
    assert abs(np.argmax(np.abs(ir0[0])) - 64) <= 3
    assert np.sum(ir2 ** 2) > 1.2 * np.sum(ir0 ** 2) and ee > 0
    assert len(image_sources(room, src, 2, beta)) == 1 + 6 + 18



def test_scene60():
    """60 s 场景生成器：目标真值只落在正在说话的人身上；渲染形状正确；两种类型都能生成。"""
    from earbud_ssl import scene60 as SC
    from earbud_ssl.sphere import earbud_mic_set
    rng = np.random.default_rng(3)
    for kind in ("turns", "case2"):
        sc = SC.make_scene(rng, {"kind": kind, "duration_s": 20.0})
        for p in sc.persons:
            m = sc.target == p.pid
            assert np.all(p.speaking[m]), (kind, p.pid)
        assert sc.yaw.shape == (sc.T,) and len(sc.persons) == 5
        assert np.all(sc.partner[sc.target >= 0] == sc.target[sc.target >= 0])   # 有人说话时对话对象就是他
        for p in sc.persons:   # 旁桌到耳机处的直达声比 1.5 m 处对面说话人低 side_sir_db
            if p.role == "side":
                assert abs(p.gain_db - 20 * np.log10(p.dist / 1.5) + sc.cfg["side_sir_db"]) < 1e-9
        if kind == "case2":
            tg = set(sc.target[sc.target >= 0].tolist())
            assert len(tg) == 1
            t0 = sc.persons[next(iter(tg))]
            for p in sc.persons:   # 情况 2：另外两人到耳机处与目标一样响
                if p.role == "partner" and p is not t0:
                    assert abs((p.gain_db - 20 * np.log10(p.dist / 1.5)) - (t0.gain_db - 20 * np.log10(t0.dist / 1.5)) - sc.cfg["case2_sir_db"]) < 1e-9
    mics = earbud_mic_set("2+1")
    ctx = {"Htab": sphere_tf(azimuth_points(np.arange(0, 360, 1.0), 1.5), mics, FREQS),
           "H_diff": sphere_tf(fibonacci_sphere(8, 2.0), mics, FREQS),
           "H_self": sphere_tf(azimuth_points([0.0], 0.115, el_deg=-40.0), mics, FREQS)[0], "psd": np.ones(len(FREQS))}
    sc = SC.make_scene(rng, {"kind": "turns", "duration_s": 12.0, "rt60": 0.3})
    Y, parts = SC.render(sc, ctx, rng, lambda n, r: r.standard_normal(n))
    assert Y.shape == (3, len(FREQS), sc.T) and np.isfinite(Y).all() and "noise" in parts

if __name__ == "__main__":
    tests = [v for k, v in dict(globals()).items() if k.startswith("test_")]
    for t in tests:
        t()
        print("ok", t.__name__)
    print(f"{len(tests)} 项全部通过")
