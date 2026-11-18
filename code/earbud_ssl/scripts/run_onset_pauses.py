"""干扰说话人有停顿时的声学开口检测（接 run_timing.py 的 E4）。

run_timing.py 中干扰一直在说话（最坏情况），只靠声学检测开口时检出与误报无法兼顾。
这里换成更接近真实对话的两种情况，用同一个检测器（白化后的最大广义特征值，频点中位数）：
  pauses：干扰各自说一段停一段（说 1–3 s，停 0.3–1.5 s），与目标是否开口无关，会有重叠；
  turn  ：轮流说话。开口前干扰轮流说，上一个人停下后隔 0.1–0.5 s 目标开口；目标说话期间干扰不说。
对比 continuous（干扰一直说，同 run_timing.py）。

输出：检出率（开口后 0.5 s 内）、每分钟误报、检出时延，以及用声学开口时刻测向的准确率（纯声学 / 加视觉），
并与"唇动给开口时刻（±0.1 s）"对照。

用法：python scripts/run_onset_pauses.py [--trials 100] [--seed 41]
"""
import argparse, json, os, sys, time
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1"); os.environ.setdefault("OMP_NUM_THREADS", "1")  # 本环境多线程 BLAS 的批量特征分解偶发不收敛
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_algo_selection as RA
import run_timing as RT
from earbud_ssl import methods as M
from earbud_ssl.sphere import sphere_tf, earbud_mic_set, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import stft, ltas, render_source, diffuse_noise, NFFT, HOP
from run_min_validation import pick_segment, angdiff

FS, FPS, T_ON, T_TOT = RT.FS, RT.FPS, RT.T_ON, RT.T_TOT
MODES = ["continuous", "pauses", "turn"]
THRESH_DB = [2.0, 2.5, 3.0, 3.5]


def ramp_mask(n, segs, fade=0.02):
    """按 (起点 s, 终点 s) 段生成 0/1 包络，边缘 20 ms 渐变。"""
    m = np.zeros(n); f = int(fade * FS)
    for a, b in segs:
        i, j = max(0, int(a * FS)), min(n, int(b * FS))
        if j <= i: continue
        m[i:j] = 1.0
        k = min(f, (j - i) // 2)
        if k > 0:
            m[i:i + k] *= np.linspace(0, 1, k); m[j - k:j] *= np.linspace(1, 0, k)
    return m


def interferer_segments(rng, mode, n_int):
    if mode == "continuous":
        return [[(0.0, T_TOT)] for _ in range(n_int)]
    if mode == "pauses":
        out = []
        for _ in range(n_int):
            t = -rng.uniform(0, 3.0); segs = []
            while t < T_TOT:
                on = rng.uniform(1.0, 3.0); off = rng.uniform(0.3, 1.5)
                segs.append((max(t, 0.0), t + on)); t += on + off
            out.append(segs)
        return out
    # turn：开口前干扰轮流说，最后一个人在开口前 0.1–0.5 s 停下；目标说话期间干扰不说
    gap = rng.uniform(0.1, 0.5); t_end = T_ON - gap
    segs = [[] for _ in range(n_int)]
    t, who = 0.0, int(rng.integers(n_int))
    while t < t_end:
        d = rng.uniform(1.0, 2.5)
        segs[who].append((t, min(t + d, t_end))); t += d + rng.uniform(0.1, 0.5); who = (who + 1) % n_int
    return segs


def scene(rng, cond, ctx, mode):
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
    for a, segs in zip(az_i, interferer_segments(rng, mode, n_int)):
        d_i = rng.uniform(1.5, 3.0)
        x = pick_segment(speech, n_tot, rng) * ramp_mask(n_tot, segs)
        if not np.any(x):
            continue                                             # 轮流说话时某个干扰可能整段不说
        S_i = stft(x)
        H_i = sphere_tf(azimuth_points([a], d_i), mics, freqs)[0]
        S_ref = stft(pick_segment(speech, n_tot, rng))           # 按"说话时"的功率定 SIR，与停顿多少无关
        p_i = np.mean(np.abs(H_i[:, :, None] * S_ref[None]) ** 2)
        y += render_source(S_i * np.sqrt(p_dir / p_i * 10 ** (-sir / 10)), H_i, H_diff, rng, rt60, drr - 20 * np.log10(d_i / d_t))
    noise = diffuse_noise(H_diff, y.shape[2], rng, psd)
    p_s = np.mean(np.abs(tgt[:, :, act]) ** 2)
    y += noise * np.sqrt(p_s / np.mean(np.abs(noise) ** 2) * 10 ** (-snr / 10))
    faces = []
    bystander = RA.place(rng, 1, [az_t] + az_i, -60, 60)[0]
    for a, speaking in [(az_t, True)] + [(a, True) for a in az_i] + [(bystander, False)]:
        if abs(a) <= RA.VIS["fov"] and rng.random() < RA.VIS["p_detect"]:
            faces.append((a + rng.normal(0, RA.VIS["az_sigma"]), RA.lip_score(rng, speaking)))
    k_true = int(np.ceil((T_ON * FS - NFFT) / HOP)) + 1
    return az_t, y, faces, k_true


def acc(e):
    return float(np.mean(np.asarray(e) <= 10) * 100) if len(e) else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=100)
    ap.add_argument("--seed", type=int, default=41)
    a = ap.parse_args()
    mics = earbud_mic_set("2+1")
    freqs = np.fft.rfftfreq(NFFT, 1 / FS)
    grid = np.arange(-180, 180, 5.0)
    speech = RA.load_speech()
    ctx = {"freqs": freqs, "mics": mics, "fmask": (freqs >= 200) & (freqs <= 7000), "grid": grid,
           "Hg": sphere_tf(azimuth_points(grid, 1.5), mics, freqs),
           "H_diff": sphere_tf(fibonacci_sphere(32, 2.0), mics, freqs), "speech": speech, "psd": ltas(speech, FS)}
    t0 = time.time(); res = {}
    for cname, cond in RT.CONDS.items():
        res[cname] = {}
        for mode in MODES:
            rng = np.random.default_rng(a.seed)
            r = {th: {"det": [], "delay": [], "fa": [], "err": [], "errv": []} for th in THRESH_DB}
            vis_err, vis_errv = [], []
            for _ in range(a.trials):
                az, y, faces, k_true = scene(rng, cond, ctx, mode)
                k_vis = k_true + int(round(rng.uniform(-0.1, 0.1) * FPS))
                p = RT.locate(y, k_vis, 0.5, 1.0, ctx)
                vis_err.append(angdiff(M.peak(p, grid, 5.0), az)); vis_errv.append(angdiff(M.fuse_soft(p, grid, faces, **RT.SOFT), az))
                nov = RT.novelty(y, ctx)["raw"]
                k_w0 = int(1.0 * FPS)
                pre = nov[k_w0:k_true - int(0.1 * FPS)]
                for th in THRESH_DB:
                    e = r[th]; above = pre > th
                    e["fa"].append((int(np.sum(above[1:] & ~above[:-1]) + above[0])) / (len(pre) / FPS) * 60)
                    post = np.where(nov[k_true:k_true + int(0.5 * FPS)] > th)[0]
                    if len(post) == 0:
                        e["det"].append(0); continue
                    k_det = k_true + int(post[0]); e["det"].append(1); e["delay"].append((k_det - k_true) / FPS)
                    k_on = k_det
                    while k_on > k_w0 and nov[k_on - 1] > th / 2:
                        k_on -= 1
                    p = RT.locate(y, k_on, 0.5, 1.0, ctx)
                    e["err"].append(angdiff(M.peak(p, grid, 5.0), az)); e["errv"].append(angdiff(M.fuse_soft(p, grid, faces, **RT.SOFT), az))
            res[cname][mode] = {
                "lip_onset_acc10": {"acoustic": acc(vis_err), "with_vision": acc(vis_errv)},
                "acoustic_onset": {str(th): {"detect_rate": float(np.mean(v["det"]) * 100), "false_alarm_per_min": float(np.mean(v["fa"])),
                                             "delay_median_s": float(np.median(v["delay"])) if v["delay"] else None,
                                             "acc10_detected": acc(v["err"]), "acc10_detected_with_vision": acc(v["errv"])}
                                   for th, v in r.items()}}
            print(f"{cname} {mode} 完成 {time.time() - t0:.0f} s", flush=True)
    out = {"setup": {"array": "2+1", "trials": a.trials, "seed": a.seed, "modes": {
        "continuous": "干扰一直说话", "pauses": "干扰说 1–3 s、停 0.3–1.5 s，与目标无关", "turn": "轮流说话：上一个人停下 0.1–0.5 s 后目标开口，目标说话时干扰不说"},
        "detector": "同 run_timing.py 的 raw：白化后最大广义特征值（频点中位数），背景时间常数 1 s、短时 0.25 s"}, "results": res}
    with open(os.path.join(ROOT, "out", "onset_pauses.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    for c, v in res.items():
        print(c)
        for mode, x in v.items():
            print(" ", mode, "唇动开口:", x["lip_onset_acc10"], "|", {k: (round(y["detect_rate"]), round(y["false_alarm_per_min"], 1), y["acc10_detected_with_vision"] and round(y["acc10_detected_with_vision"])) for k, y in x["acoustic_onset"].items()})


if __name__ == "__main__":
    main()
