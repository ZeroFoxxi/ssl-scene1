"""稳健性验证（T4b）：① 背景估计之后用户转头；② 对话轮流时背景段混入目标上一句；
③ 带墙面反射的房间（镜像声源法）；④ 视觉指标更差。
条件：混响 RT60 0.5 s、直达混响比 0 dB、SNR 10 dB，2 个干扰说话人（各比目标低 6 dB），视觉为模拟。
用法：python scripts/run_robustness.py --test turn|turntaking|room|vision [--trials 100]
"""
import argparse, json, os, sys, time
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
from earbud_ssl.sphere import sphere_tf, earbud_mics, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import stft, ltas, render_source, diffuse_noise, diffuse_tail, NFFT, HOP
from earbud_ssl.room import hrtf_table, early_ir, sabine_beta
from scipy.signal import fftconvolve
import run_algo_selection as RA
from earbud_ssl import methods as M
from run_min_validation import load_speech, pick_segment, angdiff, wrap
from run_algo_selection import place, lip_score, VIS, summarize

FS = 16000
OUT = os.path.join(ROOT, "out")
RT60, DRR, SNR, N_INT, SIR = 0.5, 0.0, 10.0, 2, 6.0
SOFT = {"lam": 0.1, "mu": 0.05}
FPS = FS / HOP


def sec2f(t):
    return int(round(t * FPS))


class Ctx:
    def __init__(self):
        self.freqs = np.fft.rfftfreq(NFFT, 1 / FS)
        self.mics = earbud_mics()
        self.fm = (self.freqs >= 200) & (self.freqs <= 7000)
        self.grid = np.arange(-180, 180, 5.0)
        self.Hg = sphere_tf(azimuth_points(self.grid, 1.5), self.mics, self.freqs)
        self.H_diff = sphere_tf(fibonacci_sphere(32, 2.0), self.mics, self.freqs)
        self.Gamma = M.diffuse_coherence(self.H_diff, self.fm)
        self.speech = load_speech()
        self.psd = ltas(self.speech, FS)

    def H(self, az, d):
        return sphere_tf(azimuth_points([az], d), self.mics, self.freqs)[0]


def render_scene(ctx, rng, sources, n_tot, poses, k_switch):
    """sources: [(信号, 世界方位, 距离, 增益)]；poses: [头部偏航角0, 偏航角1]，k_switch 帧起换姿态。
    两种姿态用同一组混响随机数渲染后拼接。"""
    y = None
    for sig, az, d, g in sources:
        S = stft(sig) * g
        seed = int(rng.integers(1 << 31))
        parts = []
        for yaw in poses:
            parts.append(render_source(S, ctx.H(wrap(az - yaw), d), ctx.H_diff, np.random.default_rng(seed), RT60, DRR - 20 * np.log10(d / 1.5)))
        r = parts[0].copy()
        if len(parts) > 1:
            r[:, :, k_switch:] = parts[1][:, :, k_switch:]
        y = r if y is None else y + r
    return y


def scale_for_sir(ctx, S_t, az_t, d_t, sig_i, az_i, d_i):
    p_t = np.mean(np.abs(ctx.H(az_t, d_t)[:, :, None] * S_t[None]) ** 2)
    S_i = stft(sig_i)
    p_i = np.mean(np.abs(ctx.H(az_i, d_i)[:, :, None] * S_i[None]) ** 2)
    return np.sqrt(p_t / p_i * 10 ** (-SIR / 10))


def add_noise(ctx, rng, y, act_frames):
    noise = diffuse_noise(ctx.H_diff, y.shape[2], rng, ctx.psd)
    p_s = np.mean(np.abs(y[:, :, act_frames]) ** 2)
    return y + noise * np.sqrt(p_s / np.mean(np.abs(noise) ** 2) * 10 ** (-SNR / 10))


def faces_now(rng, az_t_head, int_heads, ref_taken):
    faces = []
    bystander = place(rng, 1, ref_taken, -60, 60)[0]
    for a, speaking in [(az_t_head, True)] + [(a, True) for a in int_heads] + [(bystander, False)]:
        if abs(a) <= VIS["fov"] and rng.random() < VIS["p_detect"]:
            faces.append((a + rng.normal(0, VIS["az_sigma"]), lip_score(rng, speaking)))
    return faces


def decide(ctx, Yd, Rb_dict, faces):
    e = M.frame_energy_db(Yd, ctx.fm)
    Rs = M.covariance(Yd, ctx.fm, M.onset_weights(e, e.max() - 30))
    est = {}
    for name, Rb in Rb_dict.items():
        p = M.music(Rs, ctx.Hg, ctx.fm, Rb)
        est[name] = M.peak(p, ctx.grid, 5.0)
        est[name + " + 视觉"] = M.fuse_soft(p, ctx.grid, faces, **SOFT)
    return est


def trial_turn(ctx, rng, delta):
    n_tot = int(1.5 * FS)
    az_t_head = rng.uniform(-60, 60)
    az_t = wrap(az_t_head + delta)  # 世界方位：转头 delta 后落在头部前方 ±60°
    d_t = rng.uniform(1.0, 2.0)
    sig_t = np.zeros(n_tot); sig_t[int(0.5 * FS):] = pick_segment(ctx.speech, n_tot - int(0.5 * FS), rng)
    S_t = stft(sig_t)
    ints = [(float(a), rng.uniform(1.5, 3.0)) for a in place(rng, N_INT, [az_t, wrap(az_t - delta)])]
    srcs = [(sig_t, az_t, d_t, 1.0)]
    for a, d in ints:
        sig = pick_segment(ctx.speech, n_tot, rng)
        srcs.append((sig, a, d, scale_for_sir(ctx, S_t[:, sec2f(0.5):], az_t, d_t, sig, a, d)))
    k_rot = sec2f(0.42)
    y = render_scene(ctx, rng, srcs, n_tot, [0.0, delta], k_rot)
    y = add_noise(ctx, rng, y, np.abs(S_t).sum(0) > 0)
    k_on = sec2f(0.5 + rng.uniform(-0.1, 0.1))
    n_win = 1 + (int(0.5 * FS) - NFFT) // HOP
    Yd = y[:, :, k_on:k_on + n_win]
    Yb = y[:, :, :max(4, k_on - sec2f(0.15))]
    Rb = M.covariance(Yb, ctx.fm, np.ones(Yb.shape[2]))
    meas = delta + rng.normal(0, 2.0)  # IMU 测得的转角（误差 2°）
    Rb_dict = {"GEVD-MUSIC（转头前的背景）": Rb,
               "GEVD-MUSIC + IMU 旋转背景": M.rotate_background(Rb, ctx.Hg, ctx.grid, ctx.fm, ctx.Gamma, meas),
               "MUSIC（不白化）": None}
    faces = faces_now(rng, az_t_head, [wrap(a - delta) for a, _ in ints], [az_t_head] + [wrap(a - delta) for a, _ in ints])
    return az_t_head, decide(ctx, Yd, Rb_dict, faces)


def trial_turntaking(ctx, rng, pause):
    t1, len1 = 1.0, 1.0
    t2 = t1 + len1 + pause
    n_tot = int((t2 + 0.7) * FS)
    az_t = rng.uniform(-60, 60); d_t = rng.uniform(1.0, 2.0)
    sig_t = np.zeros(n_tot)
    sig_t[int(t1 * FS):int((t1 + len1) * FS)] = pick_segment(ctx.speech, int(len1 * FS), rng)
    sig_t[int(t2 * FS):] = pick_segment(ctx.speech, n_tot - int(t2 * FS), rng)
    S_t = stft(sig_t)
    ints = [(float(a), rng.uniform(1.5, 3.0)) for a in place(rng, N_INT, [az_t])]
    srcs = [(sig_t, az_t, d_t, 1.0)]
    for a, d in ints:
        sig = pick_segment(ctx.speech, n_tot, rng)
        srcs.append((sig, a, d, scale_for_sir(ctx, S_t, az_t, d_t, sig, a, d)))
    y = render_scene(ctx, rng, srcs, n_tot, [0.0], 0)
    y = add_noise(ctx, rng, y, np.abs(S_t).sum(0) > 0)
    jit = lambda: rng.uniform(-0.1, 0.1)
    on1, off1, on2 = t1 + jit(), t1 + len1 + jit(), t2 + jit()  # 唇动给出的起止（含误差）
    k_on2 = sec2f(on2)
    n_win = 1 + (int(0.5 * FS) - NFFT) // HOP
    Yd = y[:, :, k_on2:k_on2 + n_win]
    k_end = k_on2 - sec2f(0.15)
    # 固定窗口：开口前 0.35 s
    k0 = max(0, k_end - sec2f(0.35))
    Rb_win = M.covariance(y[:, :, k0:k_end], ctx.fm, np.ones(k_end - k0))
    # 唇动门控递推：只用"嘴闭上超过 0.2 s"的帧，时间常数 1 s 指数遗忘
    t = np.arange(k_end) / FPS
    closed = (t < on1 - 0.05) | (t > off1 + 0.2)
    w = np.where(closed, np.exp(-(t[-1] - t) / 1.0), 0.0)
    Rb_gate = M.covariance(y[:, :, :k_end], ctx.fm, w) if w.sum() > 0 else None
    Rb_dict = {"GEVD-MUSIC（开口前固定窗口）": Rb_win, "GEVD-MUSIC（唇动门控背景）": Rb_gate, "MUSIC（不白化）": None}
    faces = faces_now(rng, az_t, [a for a, _ in ints], [az_t] + [a for a, _ in ints])
    return az_t, decide(ctx, Yd, Rb_dict, faces)


def room_render(ctx, rng, sig, room, src, head, yaw, rt60):
    """镜像声源法早期反射（≤3 阶，经头部模型）+ 后期扩散尾；后期能量按 Sabine 临界距离补足。"""
    beta = sabine_beta(room, rt60)
    ir0, _, _ = early_ir(room, src, head, yaw, ctx.mics, ctx.table, beta, max_order=0)
    ir3, _, _ = early_ir(room, src, head, yaw, ctx.mics, ctx.table, beta, max_order=3)
    n = len(sig)
    Y0 = stft(np.stack([fftconvolve(sig, h)[:n] for h in ir0]))
    Y3 = stft(np.stack([fftconvolve(sig, h)[:n] for h in ir3]))
    act = np.abs(stft(sig)).sum(0) > 0
    p_dir = np.mean(np.abs(Y0[:, :, act]) ** 2)
    p_early = np.mean(np.abs(Y3[:, :, act]) ** 2) - p_dir
    V = np.prod(room); rc = 0.057 * np.sqrt(V / rt60)
    d = np.linalg.norm(src - head)
    p_late = max(p_dir * (d / rc) ** 2 - p_early, 0.1 * max(p_early, 1e-12))
    S = stft(sig)
    tail = diffuse_tail(S, ctx.H_diff, rng, rt60)
    p_t = np.mean(np.abs(tail[:, :, act]) ** 2)
    return Y3 + tail * np.sqrt(p_late / p_t), p_dir, p_early / p_dir


def trial_room(ctx, rng, rt60):
    snr = 10.0 if rt60 <= 0.5 else 5.0
    n_tot = int(1.5 * FS)
    while True:
        room = np.array([rng.uniform(6, 10), rng.uniform(5, 8), rng.uniform(2.8, 3.5)])
        head = np.array([rng.uniform(1.2, room[0] - 1.2), rng.uniform(1.2, room[1] - 1.2), 1.2])
        yaw = rng.uniform(-180, 180)
        def place_src(az_head, d):
            a = np.deg2rad(az_head + yaw)
            p = head + np.array([d * np.cos(a), d * np.sin(a), rng.uniform(0.0, 0.4)])
            return p if np.all(p[:2] > 0.3) and np.all(p[:2] < room[:2] - 0.3) else None
        az_t = rng.uniform(-60, 60); src_t = place_src(az_t, rng.uniform(1.0, 2.0))
        int_az = place(rng, N_INT, [az_t])
        src_i = [place_src(a, rng.uniform(1.5, 3.0)) for a in int_az]
        if src_t is not None and all(p is not None for p in src_i):
            break
    sig_t = np.zeros(n_tot); sig_t[int(0.5 * FS):] = pick_segment(ctx.speech, n_tot - int(0.5 * FS), rng)
    y, p_dir_t, er = room_render(ctx, rng, sig_t, room, src_t, head, yaw, rt60)
    for p in src_i:
        sig = pick_segment(ctx.speech, n_tot, rng)
        yi, p_dir_i, _ = room_render(ctx, rng, sig, room, p, head, yaw, rt60)
        y = y + yi * np.sqrt(p_dir_t / p_dir_i * 10 ** (-SIR / 10))
    act = np.abs(stft(sig_t)).sum(0) > 0
    y = add_noise(ctx, rng, y, act)
    k_on = sec2f(0.5 + rng.uniform(-0.1, 0.1))
    n_win = 1 + (int(0.5 * FS) - NFFT) // HOP
    Yd = y[:, :, k_on:k_on + n_win]
    Yb = y[:, :, :max(4, k_on - sec2f(0.15))]
    faces = faces_now(rng, az_t, list(int_az), [az_t] + list(int_az))
    e = M.frame_energy_db(Yd, ctx.fm)
    w_on = M.onset_weights(e, e.max() - 30); w_fl = M.floor_weights(e, e.max() - 30)
    p_srp = M.srp_phat(Yd, ctx.Hg, ctx.fm, w_fl)
    p_mu = M.music(M.covariance(Yd, ctx.fm, w_fl), ctx.Hg, ctx.fm)
    p_g = M.music(M.covariance(Yd, ctx.fm, w_on), ctx.Hg, ctx.fm, M.covariance(Yb, ctx.fm, np.ones(Yb.shape[2])))
    est = {"SRP-PHAT": M.peak(p_srp, ctx.grid, 5.0), "MUSIC（不白化）": M.peak(p_mu, ctx.grid, 5.0),
           "GEVD-MUSIC": M.peak(p_g, ctx.grid, 5.0), "仅视觉": max(faces, key=lambda f: f[1])[0] if faces else float("nan"),
           "MUSIC（不白化） + 视觉": M.fuse_soft(p_mu, ctx.grid, faces, **SOFT), "GEVD-MUSIC + 视觉": M.fuse_soft(p_g, ctx.grid, faces, **SOFT),
           "_early_to_direct_db": 10 * np.log10(er)}
    return az_t, est


VIS_LEVELS = {"基线": ({"fov": 70.0, "az_sigma": 2.0, "p_detect": 0.95, "lip_err": 0.10}, 0.1),
              "较差": ({"fov": 70.0, "az_sigma": 4.0, "p_detect": 0.85, "lip_err": 0.20}, 0.2),
              "很差": ({"fov": 70.0, "az_sigma": 6.0, "p_detect": 0.70, "lip_err": 0.30}, 0.3)}


def trial_vision(ctx, rng, level):
    cname, vlev = level.split("|")
    RA.VIS, RA.ONSET_JIT = VIS_LEVELS[vlev]
    rctx = {"freqs": ctx.freqs, "mics": ctx.mics, "H_diff": ctx.H_diff, "speech": ctx.speech, "psd": ctx.psd}
    az, Yd, Yb, faces = RA.run_trial(rng, RA.CONDS[cname], rctx)
    e = M.frame_energy_db(Yd, ctx.fm)
    p_mu = M.music(M.covariance(Yd, ctx.fm, M.floor_weights(e, e.max() - 30)), ctx.Hg, ctx.fm)
    p_g = M.music(M.covariance(Yd, ctx.fm, M.onset_weights(e, e.max() - 30)), ctx.Hg, ctx.fm, M.covariance(Yb, ctx.fm, np.ones(Yb.shape[2])))
    return az, {"GEVD-MUSIC": M.peak(p_g, ctx.grid, 5.0), "GEVD-MUSIC + 视觉": M.fuse_soft(p_g, ctx.grid, faces, **SOFT),
                "MUSIC（不白化）": M.peak(p_mu, ctx.grid, 5.0), "MUSIC（不白化） + 视觉": M.fuse_soft(p_mu, ctx.grid, faces, **SOFT),
                "仅视觉": max(faces, key=lambda f: f[1])[0] if faces else float("nan")}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--test", choices=["turn", "turntaking", "room", "vision"], required=True)
    ap.add_argument("--trials", type=int, default=100)
    ap.add_argument("--seed", type=int, default=11)
    a = ap.parse_args()
    rng = np.random.default_rng(a.seed)
    ctx = Ctx()
    t0 = time.time()
    if a.test == "room":
        ctx.table = hrtf_table(ctx.mics, os.path.join(ROOT, "cache"))
    levels = {"turn": [0, 15, 30, 60], "turntaking": [0.2, 0.5, 1.0], "room": [0.5, 0.8],
              "vision": [f"{c}|{v}" for c in ["S2 混响 + 2 个干扰（SIR 6 dB）", "S4 混响 + 2 个干扰（SIR 0 dB）"] for v in VIS_LEVELS]}[a.test]
    fn = {"turn": trial_turn, "turntaking": trial_turntaking, "room": trial_room, "vision": trial_vision}[a.test]
    rows = []
    for lv in levels:
        for _ in range(a.trials):
            truth, est = fn(ctx, rng, lv)
            rows.append({"level": lv, "truth": truth, **est})
        print(f"{a.test} {lv} 完成，用时 {time.time() - t0:.0f} s", flush=True)
    names = [k for k in rows[0] if k not in ("level", "truth") and not k.startswith("_")]
    res = {str(lv): summarize([r for r in rows if r["level"] == lv], names) for lv in levels}
    unit = {"turn": "° 转头", "turntaking": " s 停顿", "room": " s RT60（镜像声源房间）", "vision": ""}[a.test]
    if a.test == "room":
        for lv in levels:
            v = [r["_early_to_direct_db"] for r in rows if r["level"] == lv]
            res[str(lv)]["早期反射/直达声能量比_dB_中位数"] = float(np.median(v))
    out = {"test": a.test, "trials": a.trials, "seed": a.seed, "condition": {"RT60": RT60, "DRR": DRR, "SNR": SNR, "interferers": N_INT, "SIR": SIR},
           "vision": VIS, "soft_fusion": SOFT, "results": res}
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, f"robust_{a.test}_summary.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    lines = [f"稳健性验证：{a.test}（每档 {a.trials} 次，≤10° 的比例 / 平均误差），用时 {time.time() - t0:.0f} s"]
    for lv in levels:
        lines.append(f"{lv}{unit}")
        for m in names:
            r = res[str(lv)][m]
            lines.append(f"  {m:<28s} {r['acc10']*100:5.1f}%  {r['mae']:5.1f}°")
    txt = "\n".join(lines); print(txt)
    with open(os.path.join(OUT, f"robust_{a.test}_log.txt"), "w", encoding="utf-8") as f:
        f.write(txt + "\n")


if __name__ == "__main__":
    main()
