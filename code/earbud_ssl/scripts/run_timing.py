"""协同时序仿真：给第 5 页（耳机与摄像头协同时序）定数字。

场景同算法选型 S2 / S4（混响 RT60 0.5 s + 2 个干扰说话人全程说话 + 扩散噪声），但时间轴拉长：
目标前 2.5 s 不说话，t = 2.5 s 开口，说 1 s。阵列为推荐配置 2+1（主耳 2 路 + 副耳 1 路），5° 网格，GEVD-MUSIC。

回答四个问题：
  E1 判决窗：开口后要听多久才能锁定（开口时刻已知，唇动给出，±0.1 s 误差）；
  E2 开口时刻误差：唇动给的开口时刻偏早 / 偏晚多少还能用（决定对视觉时间精度的要求）；
  E3 背景长度：开口前要有多长的背景（决定环形缓存长度）；
  E4 声学开口检测：摄像头在监测档、看不到开口时，用"新方向能量"（白化后的最大广义特征值）检测开口，
     给出检出率、检出时延、误报率，以及用声学开口时刻测向的准确率。

用法：python scripts/run_timing.py [--trials 100] [--seed 31]
"""
import argparse, json, os, sys, time
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_algo_selection as RA
from earbud_ssl import methods as M
from earbud_ssl.sphere import sphere_tf, earbud_mic_set, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import stft, ltas, render_source, diffuse_noise, NFFT, HOP
from run_min_validation import pick_segment, angdiff

FS = 16000
FPS = FS / HOP  # 62.5 帧/s
T_ON = 2.5      # 真实开口时刻（s）：前面留足背景递推与误报统计的时间
T_TOT = 3.5
CONDS = {"S2 混响 + 2 个干扰（SIR 6 dB）": (0.5, 0.0, 10.0, 2, 6.0), "S4 混响 + 2 个干扰（SIR 0 dB）": (0.5, 0.0, 10.0, 2, 0.0)}
SOFT = {"lam": 0.1, "mu": 0.05}
WINDOWS = [0.1, 0.2, 0.3, 0.5, 0.8]
OFFSETS = [-0.3, -0.2, -0.1, 0.0, 0.1, 0.2, 0.3]   # 估计开口时刻 − 真实开口时刻（s），负 = 偏早
BG_LENS = [0.1, 0.25, 0.5, 1.0]
THRESH_DB = [2.0, 2.5, 3.0, 3.5]                   # 声学开口检测阈值：新方向能量相对背景（dB）
TAU_BG, TAU_ST = 1.0, 0.25                         # 背景 / 短时协方差的时间常数（s）


def scene(rng, cond, ctx):
    rt60, drr, snr, n_int, sir = cond
    freqs, mics, H_diff, speech, psd = ctx["freqs"], ctx["mics"], ctx["H_diff"], ctx["speech"], ctx["psd"]
    n_tot, n_on = int(T_TOT * FS), int(T_ON * FS)
    az_t = rng.uniform(-60, 60); d_t = rng.uniform(1.0, 2.0)
    sig_t = np.zeros(n_tot); sig_t[n_on:] = pick_segment(speech, n_tot - n_on, rng)
    S_t = stft(sig_t)
    H_t = sphere_tf(azimuth_points([az_t], d_t), mics, freqs)[0]
    tgt = render_source(S_t, H_t, H_diff, rng, rt60, drr)
    act = np.abs(S_t).sum(0) > 0
    p_dir = np.mean(np.abs(H_t[:, :, None] * S_t[None][:, :, act]) ** 2)
    y = tgt.copy()
    az_i = RA.place(rng, n_int, [az_t])
    for a in az_i:
        d_i = rng.uniform(1.5, 3.0)
        S_i = stft(pick_segment(speech, n_tot, rng))
        H_i = sphere_tf(azimuth_points([a], d_i), mics, freqs)[0]
        p_i = np.mean(np.abs(H_i[:, :, None] * S_i[None]) ** 2)
        y += render_source(S_i * np.sqrt(p_dir / p_i * 10 ** (-sir / 10)), H_i, H_diff, rng, rt60, drr - 20 * np.log10(d_i / d_t))
    noise = diffuse_noise(H_diff, y.shape[2], rng, psd)
    p_s = np.mean(np.abs(tgt[:, :, act]) ** 2)
    y += noise * np.sqrt(p_s / np.mean(np.abs(noise) ** 2) * 10 ** (-snr / 10))
    faces = []
    bystander = RA.place(rng, 1, [az_t] + az_i, -60, 60)[0]
    for a, speaking in [(az_t, True)] + [(a, True) for a in az_i] + [(bystander, False)]:
        if abs(a) <= RA.VIS["fov"] and rng.random() < RA.VIS["p_detect"]:
            faces.append((a + rng.normal(0, RA.VIS["az_sigma"]), RA.lip_score(rng, speaking)))
    # 真实开口帧：第一帧窗口末端越过 T_ON
    k_true = int(np.ceil((T_ON * FS - NFFT) / HOP)) + 1
    return az_t, y, faces, k_true


def locate(y, k_on, win_s, bg_s, ctx, guard_s=0.05):
    fm, Hg, grid = ctx["fmask"], ctx["Hg"], ctx["grid"]
    n_win = max(2, int(round(win_s * FPS)))
    k_on = int(np.clip(k_on, 4, y.shape[2] - n_win))
    k_b1 = k_on - int(round(guard_s * FPS)); k_b0 = max(0, k_b1 - max(2, int(round(bg_s * FPS))))
    Yd, Yb = y[:, :, k_on:k_on + n_win], y[:, :, k_b0:k_b1]
    e = M.frame_energy_db(Yd, fm)
    p = M.music(M.covariance(Yd, fm, M.onset_weights(e, e.max() - 30)), Hg, fm, M.covariance(Yb, fm, np.ones(Yb.shape[2])))
    return p


def novelty(y, ctx, step=2, gate_deg=15.0):
    """逐帧"新声源能量"（dB），返回两条曲线：
    raw：短时协方差（时间常数 0.25 s）用递推背景（时间常数 1 s）白化后的最大广义特征值，频点取中位数——"比背景多出的能量"；
    gated：同上，但只有当这部分能量的方向（GEVD-MUSIC 峰值）离背景里已有声源（背景 MUSIC 谱前 3 个峰）都超过 15° 时才计分，
           否则记 0 dB，用来排除干扰说话人自身的音量起伏。
    递推均值做了起始偏差校正。每 step 帧算一次。"""
    fm, Hg, grid = ctx["fmask"], ctx["Hg"], ctx["grid"]
    Z = y[:, fm]
    a_b, a_s = np.exp(-1 / (TAU_BG * FPS)), np.exp(-1 / (TAU_ST * FPS))
    Mm, F, T = Z.shape
    Sb = np.zeros((F, Mm, Mm), complex); Ss = np.zeros_like(Sb)
    raw = np.full(T, np.nan); gated = np.full(T, np.nan)
    for t in range(T):
        x = Z[:, :, t].T
        inst = x[:, :, None] * x[:, None, :].conj()
        Ss = a_s * Ss + (1 - a_s) * inst
        if t >= int(0.3 * FPS) and t % step == 0:
            Rb = Sb / (1 - a_b ** t); Rs = Ss / (1 - a_s ** (t + 1))
            L = Rb + (1e-2 * np.trace(Rb, axis1=1, axis2=2).real / Mm + 1e-12)[:, None, None] * np.eye(Mm)
            Li = np.linalg.inv(np.linalg.cholesky(L))
            lam = np.linalg.eigvalsh(Li @ Rs @ Li.conj().transpose(0, 2, 1))
            e_db = 10 * np.log10(np.median(lam[:, -1]))
            th_new = grid[np.argmax(M.music(Rs, Hg, fm, Rb))]
            pb = M.music(Rb, Hg, fm)
            pk = [k for k in range(len(grid)) if pb[k] >= pb[k - 1] and pb[k] >= pb[(k + 1) % len(grid)]]
            pk = sorted(pk, key=lambda k: -pb[k])[:3]
            known = any(angdiff(th_new, grid[k]) < gate_deg for k in pk)
            raw[t] = e_db; gated[t] = 0.0 if known else e_db
        elif t >= int(0.3 * FPS):
            raw[t] = raw[t - 1]; gated[t] = gated[t - 1]
        Sb = a_b * Sb + (1 - a_b) * inst
    return {"raw": raw, "gated": gated}


def acc(err):
    err = np.asarray(err, float)
    return float(np.mean(err <= 10) * 100)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=100)
    ap.add_argument("--seed", type=int, default=31)
    a = ap.parse_args()
    mics = earbud_mic_set("2+1")
    freqs = np.fft.rfftfreq(NFFT, 1 / FS)
    grid = np.arange(-180, 180, 5.0)
    speech = RA.load_speech()
    ctx = {"freqs": freqs, "mics": mics, "fmask": (freqs >= 200) & (freqs <= 7000), "grid": grid,
           "Hg": sphere_tf(azimuth_points(grid, 1.5), mics, freqs),
           "H_diff": sphere_tf(fibonacci_sphere(32, 2.0), mics, freqs), "speech": speech, "psd": ltas(speech, FS)}
    t0 = time.time(); res = {}
    for cname, cond in CONDS.items():
        rng = np.random.default_rng(a.seed)
        r = {"E1": {w: [] for w in WINDOWS}, "E1v": {w: [] for w in WINDOWS}, "E2": {o: [] for o in OFFSETS},
             "E3": {b: [] for b in BG_LENS},
             "E4": {dn: {th: {"det": [], "delay": [], "fa_per_min": [], "err": [], "errv": []} for th in THRESH_DB} for dn in ("raw", "gated")},
             "nov_pre": {"raw": [], "gated": []}, "nov_post": {"raw": [], "gated": []}}
        for _ in range(a.trials):
            az, y, faces, k_true = scene(rng, cond, ctx)
            jit = rng.uniform(-0.1, 0.1)
            k_vis = k_true + int(round(jit * FPS))
            for w in WINDOWS:   # E1：唇动开口（±0.1 s），背景 1 s
                p = locate(y, k_vis, w, 1.0, ctx)
                r["E1"][w].append(angdiff(M.peak(p, grid, 5.0), az))
                r["E1v"][w].append(angdiff(M.fuse_soft(p, grid, faces, **SOFT), az))
            for o in OFFSETS:   # E2：开口时刻固定偏差，窗 0.5 s，背景 1 s
                r["E2"][o].append(angdiff(M.peak(locate(y, k_true + int(round(o * FPS)), 0.5, 1.0, ctx), grid, 5.0), az))
            for b in BG_LENS:   # E3：背景长度，唇动开口，窗 0.5 s
                r["E3"][b].append(angdiff(M.peak(locate(y, k_vis, 0.5, b, ctx), grid, 5.0), az))
            novs = novelty(y, ctx)
            k_w0 = int(1.0 * FPS)                  # 误报统计区间：1.0 s 到开口前 0.1 s（只有干扰与噪声）
            for dn, nov in novs.items():
                pre = nov[k_w0:k_true - int(0.1 * FPS)]
                r["nov_pre"][dn].append(float(np.nanmax(pre))); r["nov_post"][dn].append(float(np.nanmax(nov[k_true:k_true + int(0.5 * FPS)])))
                for th in THRESH_DB:
                    e4 = r["E4"][dn][th]
                    above = pre > th
                    n_fa = int(np.sum(above[1:] & ~above[:-1]) + above[0])      # 上穿次数
                    e4["fa_per_min"].append(n_fa / (len(pre) / FPS) * 60)
                    post = np.where(nov[k_true:k_true + int(0.5 * FPS)] > th)[0]
                    if len(post) == 0:
                        e4["det"].append(0); continue
                    k_det = k_true + int(post[0])
                    e4["det"].append(1); e4["delay"].append((k_det - k_true) / FPS)
                    # 回溯：从检出帧往前找到新声源能量回落到阈值一半以下的位置，作为开口时刻估计
                    k_on = k_det
                    while k_on > k_w0 and nov[k_on - 1] > th / 2:
                        k_on -= 1
                    p = locate(y, k_on, 0.5, 1.0, ctx)
                    e4["err"].append(angdiff(M.peak(p, grid, 5.0), az))
                    e4["errv"].append(angdiff(M.fuse_soft(p, grid, faces, **SOFT), az))
        res[cname] = {
            "E1_window_s": {str(w): {"acoustic": acc(r["E1"][w]), "with_vision": acc(r["E1v"][w])} for w in WINDOWS},
            "E2_onset_offset_s": {str(o): acc(r["E2"][o]) for o in OFFSETS},
            "E3_background_s": {str(b): acc(r["E3"][b]) for b in BG_LENS},
            "E4_acoustic_onset": {dn: {str(th): {"detect_rate": float(np.mean(v["det"]) * 100),
                                                 "delay_median_s": float(np.median(v["delay"])) if v["delay"] else None,
                                                 "delay_p90_s": float(np.percentile(v["delay"], 90)) if v["delay"] else None,
                                                 "false_alarm_per_min": float(np.mean(v["fa_per_min"])),
                                                 "acc10_detected": acc(v["err"]) if v["err"] else None,
                                                 "acc10_detected_with_vision": acc(v["errv"]) if v["errv"] else None}
                                       for th, v in d.items()} for dn, d in r["E4"].items()},
            "novelty_db": {dn: {"pre_max_median": float(np.median(r["nov_pre"][dn])), "post_max_median": float(np.median(r["nov_post"][dn]))} for dn in ("raw", "gated")},
        }
        print(f"{cname} 完成 {time.time() - t0:.0f} s", flush=True)
    out = {"setup": {"array": "2+1", "grid_deg": 5, "onset_s": T_ON, "trials": a.trials, "seed": a.seed,
                     "vision_onset_jitter_s": 0.1, "tau_background_s": TAU_BG, "tau_short_s": TAU_ST,
                     "guard_s": 0.05, "note": "E4 误报统计区间为 1.0 s 至开口前 0.1 s（只有干扰与噪声）"},
           "results": res}
    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
    with open(os.path.join(ROOT, "out", "timing.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
