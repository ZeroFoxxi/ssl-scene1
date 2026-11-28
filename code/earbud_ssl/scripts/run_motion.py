"""说话人移动、佩戴者转头时的持续定位（mentor 11-17"说话人移动场景下的动态定位与持续跟踪"；方案中的"转头跟住"）。

场景：混响 RT60 0.5 s + 2 个固定的干扰说话人（全程说话）+ 扩散噪声；阵列 2+1，5° 网格，GEVD-MUSIC。
目标前 1 s 不说话（用来估计背景），1–6 s 一直在说。从 1.5 s 起每 0.25 s 输出一次目标方位（头部坐标，交给增强）。
声源方向随时间变化：每个 STFT 帧按当时的头部坐标方位取直达声传递函数（1° 表），混响尾按扩散场近似。

  --test moving：头不动，目标以 0 / 10 / 20 / 40 °/s 绕佩戴者移动（1.5 m 处步行约 1 m/s ≈ 38 °/s）。
  --test turn  ：目标与干扰不动，佩戴者在 3.0–3.5 s 内转头 30° / 60°（另测 0°）。

比较的做法：
  逐窗 0.5 s / 0.25 s：每次只用最近一段做 GEVD-MUSIC，取峰值；
  跟踪：在世界坐标里做圆周卡尔曼（方位 + 角速度），观测 = 逐窗 0.5 s 的峰值 + IMU 转角；输出 = 预测方位 − IMU 转角；
  跟踪 + 视觉：观测改为与人脸软融合后的方位；
  （turn）不用 IMU：在头部坐标里直接跟踪，背景不旋转；用 IMU：世界坐标跟踪 + 背景协方差按转角旋转。

用法：python scripts/run_motion.py --test moving|turn [--trials 60] [--seed 51]
"""
import argparse, json, os, sys, time
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1"); os.environ.setdefault("OMP_NUM_THREADS", "1")
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
sys.path.insert(0, os.path.join(os.path.dirname(ROOT), "ssl_baseline"))
import run_algo_selection as RA
from earbud_ssl import methods as M
from earbud_ssl.sphere import sphere_tf, earbud_mic_set, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import stft, ltas, render_source, diffuse_noise, NFFT, HOP
from run_min_validation import pick_segment, angdiff
from ssl_baseline.tracker import CircularKalman, TrackerConfig, wrap180

FS = 16000; FPS = FS / HOP
T_TOT, T_ON = 6.0, 1.0
EVAL = np.arange(1.5, T_TOT - 1e-6, 0.25)
SOFT = {"lam": 0.1, "mu": 0.05}
CONDS = {"S2 干扰低 6 dB": (0.5, 0.0, 10.0, 2, 6.0), "S4 干扰一样响": (0.5, 0.0, 10.0, 2, 0.0)}


def frame_times(T):
    return (np.arange(T) * HOP + NFFT / 2) / FS


def render_moving(S, az_head, Htab, H_diff, rng, rt60, drr):
    """az_head: 每帧的头部坐标方位（°）。直达声逐帧取 1° 表；混响尾按扩散场（与方向无关）近似。"""
    idx = np.round(wrap180(az_head)).astype(int) % 360
    direct = np.transpose(Htab[idx], (1, 2, 0)) * S[None]          # (M,F,T)
    H0 = Htab[0]
    full0 = render_source(S, H0, H_diff, rng, rt60, drr)            # 用固定方向生成同能量比例的混响尾
    tail = full0 - H0[:, :, None] * S[None]
    return direct + tail


def scene(rng, cond, ctx, test, param):
    rt60, drr, snr, n_int, sir = cond
    n_tot = int(T_TOT * FS)
    sig = np.zeros(n_tot); sig[int(T_ON * FS):] = pick_segment(ctx["speech"], n_tot - int(T_ON * FS), rng)
    S_t = stft(sig); T = S_t.shape[1]; tt = frame_times(T)
    yaw = np.zeros(T)
    az0 = rng.uniform(-30, 30)
    if test == "moving":
        sgn = rng.choice([-1, 1]); w = param
        az_w = az0 + sgn * w * np.clip(tt - T_ON, 0, None)
        az_w = np.clip(az_w, -80, 80)
    else:
        az_w = np.full(T, az0)
        yaw = param * np.clip((tt - 3.0) / 0.5, 0, 1) * rng.choice([-1, 1])
    tgt = render_moving(S_t, az_w - yaw, ctx["Htab"], ctx["H_diff"], rng, rt60, drr)
    act = np.abs(S_t).sum(0) > 0
    p_dir = np.mean(np.abs(ctx["Htab"][0][:, :, None] * S_t[None][:, :, act]) ** 2)
    y = tgt.copy()
    az_i = RA.place(rng, n_int, [az0], sep=25)
    for a in az_i:
        S_i = stft(pick_segment(ctx["speech"], n_tot, rng))
        p_i = np.mean(np.abs(ctx["Htab"][0][:, :, None] * S_i[None]) ** 2)
        d_i = rng.uniform(1.5, 3.0)
        y += render_moving(S_i * np.sqrt(p_dir / p_i * 10 ** (-sir / 10)), np.full(T, a) - yaw, ctx["Htab"], ctx["H_diff"], rng, rt60, drr - 20 * np.log10(d_i / 1.5))
    noise = diffuse_noise(ctx["H_diff"], T, rng, ctx["psd"])
    p_s = np.mean(np.abs(tgt[:, :, act]) ** 2)
    y += noise * np.sqrt(p_s / np.mean(np.abs(noise) ** 2) * 10 ** (-snr / 10))
    bystander = RA.place(rng, 1, [az0] + az_i, -60, 60)[0]
    return y, tt, az_w, yaw, az_i, bystander


def faces_at(rng, t_idx, az_w, yaw, az_i, bystander):
    """t 时刻摄像头看到的人脸（头部坐标）：目标、干扰（在说）、旁人（不说）。"""
    out = []
    for a, speaking in [(az_w[t_idx], True)] + [(a, True) for a in az_i] + [(bystander, False)]:
        h = float(wrap180(a - yaw[t_idx]))
        if abs(h) <= RA.VIS["fov"] and rng.random() < RA.VIS["p_detect"]:
            out.append((h + rng.normal(0, RA.VIS["az_sigma"]), RA.lip_score(rng, speaking)))
    return out


def spectrum(y, k_end, win_s, Rb, ctx):
    fm = ctx["fmask"]; n = max(2, int(round(win_s * FPS)))
    Yd = y[:, :, max(0, k_end - n):k_end]
    e = M.frame_energy_db(Yd, fm)
    return M.music(M.covariance(Yd, fm, M.onset_weights(e, e.max() - 30)), ctx["Hg"], fm, Rb)


TRK = {"q_az": 0.5, "q_vel": 4.0, "gate_deg": 30.0}   # 场景一默认值；可用 --tune 在开发种子上比较


def new_tracker():
    return CircularKalman(TrackerConfig(dt=0.25, **TRK))


def track_step(trk, z_world):
    """第一次观测直接起始；之后预测 + 更新。航迹因长时间无采纳观测被清空时，用当前观测重新起始。"""
    if trk.active:
        trk.predict()
    if not trk.active:
        trk.x = np.array([z_world % 360.0, 0.0]); trk.P = np.diag([trk.cfg.r_audio, 100.0]); trk.since_update = 0.0; return
    trk.update(z_world)


def run(test, params, trials, seed, ctx):
    grid = ctx["grid"]; res = {}
    for cname, cond in CONDS.items():
        res[cname] = {}
        for prm in params:
            rng = np.random.default_rng(seed)
            names = (["逐窗 0.5 s", "逐窗 0.25 s", "跟踪", "跟踪 + 视觉"] if test == "moving"
                     else ["不用 IMU（逐窗 0.5 s）", "不用 IMU（跟踪）", "用 IMU（跟踪）", "用 IMU（跟踪 + 视觉）"])
            err = {n: [] for n in names}
            for _ in range(trials):
                y, tt, az_w, yaw, az_i, by = scene(rng, cond, ctx, test, prm)
                k0 = int(np.searchsorted(tt, T_ON - 0.05))
                Rb0 = M.covariance(y[:, :, 2:k0], ctx["fmask"], np.ones(k0 - 2))
                trk = {n: new_tracker() for n in names}
                rb_cache = {}
                for te in EVAL:
                    k = int(np.searchsorted(tt, te))
                    truth_h = float(wrap180(az_w[k - 1] - yaw[k - 1]))
                    ymeas = float(yaw[k - 1] + rng.normal(0, 0.5))           # IMU 读数（0.5° 噪声）
                    p05 = spectrum(y, k, 0.5, Rb0, ctx)
                    if test == "moving":
                        p025 = spectrum(y, k, 0.25, Rb0, ctx)
                        z = M.peak(p05, grid, 5.0)
                        err["逐窗 0.5 s"].append(angdiff(z, truth_h))
                        err["逐窗 0.25 s"].append(angdiff(M.peak(p025, grid, 5.0), truth_h))
                        track_step(trk["跟踪"], z); err["跟踪"].append(angdiff(trk["跟踪"].az, truth_h))
                        zv = M.fuse_soft(p05, grid, faces_at(rng, k - 1, az_w, yaw, az_i, by), **SOFT)
                        track_step(trk["跟踪 + 视觉"], zv); err["跟踪 + 视觉"].append(angdiff(trk["跟踪 + 视觉"].az, truth_h))
                    else:
                        z = M.peak(p05, grid, 5.0)
                        err["不用 IMU（逐窗 0.5 s）"].append(angdiff(z, truth_h))
                        track_step(trk["不用 IMU（跟踪）"], z); err["不用 IMU（跟踪）"].append(angdiff(trk["不用 IMU（跟踪）"].az, truth_h))
                        key = int(round(ymeas / 5.0)) * 5
                        if key not in rb_cache:
                            rb_cache[key] = Rb0 if key == 0 else M.rotate_background(Rb0, ctx["Hg"], grid, ctx["fmask"], ctx["Gamma"], key)
                        pr = spectrum(y, k, 0.5, rb_cache[key], ctx)
                        zi = M.peak(pr, grid, 5.0)
                        track_step(trk["用 IMU（跟踪）"], zi + ymeas)
                        err["用 IMU（跟踪）"].append(angdiff(trk["用 IMU（跟踪）"].az - ymeas, truth_h))
                        zv = M.fuse_soft(pr, grid, faces_at(rng, k - 1, az_w, yaw, az_i, by), **SOFT)
                        track_step(trk["用 IMU（跟踪 + 视觉）"], zv + ymeas)
                        err["用 IMU（跟踪 + 视觉）"].append(angdiff(trk["用 IMU（跟踪 + 视觉）"].az - ymeas, truth_h))
            seg = {}
            n_eval = len(EVAL)
            for n, e in err.items():
                e = np.array(e).reshape(trials, n_eval)
                d = {"acc10": float(np.mean(e <= 10) * 100), "mae": float(np.mean(e))}
                if test == "turn":
                    during = (EVAL >= 3.0) & (EVAL <= 3.75); after = EVAL > 3.75
                    d["acc10_during_turn"] = float(np.mean(e[:, during] <= 10) * 100)
                    d["acc10_after_turn"] = float(np.mean(e[:, after] <= 10) * 100)
                seg[n] = d
            res[cname][str(prm)] = seg
            print(cname, prm, {n: round(v["acc10"]) for n, v in seg.items()}, flush=True)
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--test", required=True, choices=["moving", "turn"])
    ap.add_argument("--trials", type=int, default=60)
    ap.add_argument("--seed", type=int, default=51)
    ap.add_argument("--tune", action="store_true")
    ap.add_argument("--q-az", type=float); ap.add_argument("--q-vel", type=float); ap.add_argument("--gate", type=float)
    a = ap.parse_args()
    if a.q_az is not None: TRK.update({"q_az": a.q_az, "q_vel": a.q_vel, "gate_deg": a.gate})
    mics = earbud_mic_set("2+1")
    freqs = np.fft.rfftfreq(NFFT, 1 / FS)
    grid = np.arange(-180, 180, 5.0)
    speech = RA.load_speech()
    fm = (freqs >= 200) & (freqs <= 7000)
    H_diff = sphere_tf(fibonacci_sphere(32, 2.0), mics, freqs)
    ctx = {"freqs": freqs, "mics": mics, "fmask": fm, "grid": grid, "Hg": sphere_tf(azimuth_points(grid, 1.5), mics, freqs),
           "Htab": sphere_tf(azimuth_points(np.arange(0, 360, 1.0), 1.5), mics, freqs), "H_diff": H_diff,
           "Gamma": M.diffuse_coherence(H_diff, fm), "speech": speech, "psd": ltas(speech, FS)}
    params = [0, 10, 20, 40] if a.test == "moving" else [0, 30, 60]
    if a.tune:   # 开发种子上比较跟踪参数，不用评测种子
        for cfg in [{"q_az": 0.5, "q_vel": 4.0, "gate_deg": 30.0}, {"q_az": 2.0, "q_vel": 25.0, "gate_deg": 30.0},
                    {"q_az": 2.0, "q_vel": 25.0, "gate_deg": 45.0}, {"q_az": 4.0, "q_vel": 100.0, "gate_deg": 45.0}]:
            TRK.clear(); TRK.update(cfg); print("TRK", cfg, flush=True)
            run(a.test, [20, 40] if a.test == "moving" else [30, 60], a.trials, 999, ctx)
        return
    t0 = time.time()
    res = run(a.test, params, a.trials, a.seed, ctx)
    out = {"setup": {"test": a.test, "params": params, "param_unit": "°/s" if a.test == "moving" else "转头角度（°），3.0–3.5 s 内完成",
                     "array": "2+1", "grid_deg": 5, "eval_times_s": EVAL.tolist(), "trials": a.trials, "seed": a.seed,
                     "tracker": {"base": "场景一圆周卡尔曼，块长 0.25 s；第一次观测直接起始", **TRK}, "imu_noise_deg": 0.5,
                     "metric": "每 0.25 s 一次输出的头部坐标方位误差 ≤ 10° 的比例"},
           "results": res, "elapsed_s": time.time() - t0}
    with open(os.path.join(ROOT, "out", f"motion_{a.test}.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
