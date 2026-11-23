"""mentor 11-23 的两种情况：面前 3 个人，1 个人在跟你说话。
  情况 1：另外 2 个人不说话；
  情况 2：另外 2 个人在互相说话（两人轮流，各说 1.5–4 s，换人间隔 0.1–0.5 s），与目标一样响或低 6 dB。

场景：3 人都在正前方，中间那人在 ±30° 内，相邻两人隔 20–30°，距离 1–2 m；目标是 3 人中随机一个。
3 s 片段，目标第 2.0 s 开口，开口后 0.5 s 判决；混响 RT60 0.5 s、扩散噪声 SNR 10 dB；刚性球头部，阵列 2+1。
视觉按假设模拟（同算法选型）：3 张脸都在视野内，检出 95%、方位误差 2°、唇动判反 10%；在说话的人唇动分数高。

比较（摄像头两档的叫法见 摄像头使用策略.md）：
  不开摄像头：声学检测开口（新声源能量 3.5 dB）→ GEVD-MUSIC；没检出时用最近 0.5 s 的 MUSIC
  只开低帧率档：同上，再与人脸位置软融合（唇动无信息）
  高帧率档：唇动给开口时刻（±0.1 s 误差）→ GEVD-MUSIC，与人脸 + 唇动软融合
  仅视觉：唇动分数最高的人脸
另统计声学开口检测：开口后 0.3 s 内检出的比例、开口前 1.0–2.0 s 的误报次数。

用法：python scripts/run_two_cases.py [--trials 200] [--seed 41]
"""
import argparse, json, os, sys, time
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_algo_selection as RA
import run_camera_policy as RC
from run_onset_pauses import ramp_mask
from run_min_validation import pick_segment, angdiff
from earbud_ssl import methods as M
from earbud_ssl.sphere import sphere_tf, earbud_mic_set, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import ltas, stft, render_source, diffuse_noise, NFFT

FS, FPS = RC.FS, RC.FPS
T_TOT, T_ON, T_DEC = 3.0, 2.0, 0.5
RT60, DRR, SNR = 0.5, 0.0, 10.0
CONDS = {"情况 1：另外 2 人不说话": None, "情况 2：另外 2 人互相说，低 6 dB": 6.0, "情况 2：另外 2 人互相说，一样响": 0.0}
METHODS = ["不开摄像头（纯声学）", "只开低帧率档", "高帧率档（唇动 + 声学）", "仅视觉（唇动最高）"]
THRESH = 3.5


def chat_schedule(rng):
    """另外 2 人互相说：[(谁, 开始, 结束)]，从 0 s 开始轮流到片段结束。"""
    turns, t, who = [], rng.uniform(-1.0, 0.0), int(rng.integers(2))
    while t < T_TOT:
        e = t + rng.uniform(1.5, 4.0)
        if min(e, T_TOT) - max(t, 0.0) >= 0.3:              # 太短的片段不计（避免能量为 0 的段）
            turns.append((who, max(t, 0.0), min(e, T_TOT)))
        t = e + rng.uniform(0.1, 0.5); who = 1 - who
    return turns


def scene(rng, sir, ctx):
    n = int(T_TOT * FS)
    c = rng.uniform(-30, 30)
    az3 = [c - rng.uniform(20, 30), c, c + rng.uniform(20, 30)]
    ti = int(rng.integers(3)); others = [a for i, a in enumerate(az3) if i != ti]
    d3 = rng.uniform(1.0, 2.0, 3)
    x_t = np.zeros(n); x_t[int(T_ON * FS):] = pick_segment(ctx["speech"], n - int(T_ON * FS), rng)
    S_t = stft(x_t); H_t = sphere_tf(azimuth_points([az3[ti]], d3[ti]), ctx["mics"], ctx["freqs"])[0]
    act = np.abs(S_t).sum(0) > 1e-9
    p_t = np.mean(np.abs(H_t[:, :, None] * S_t[None][:, :, act]) ** 2)
    y = render_source(S_t, H_t, ctx["H_diff"], rng, RT60, DRR)
    turns = []
    if sir is not None:
        turns = chat_schedule(rng)
        oi = [i for i in range(3) if i != ti]
        for k in range(2):
            segs = [(s, e) for w, s, e in turns if w == k]
            x = pick_segment(ctx["speech"], n, rng) * ramp_mask(n, segs)
            if not np.any(x):
                continue
            S = stft(x); H = sphere_tf(azimuth_points([others[k]], d3[oi[k]]), ctx["mics"], ctx["freqs"])[0]
            a2 = np.abs(S).sum(0) > 1e-9
            if not a2.any():
                continue
            p = np.mean(np.abs(H[:, :, None] * S[None][:, :, a2]) ** 2)
            y = y + render_source(S * np.sqrt(p_t / p * 10 ** (-sir / 10)), H, ctx["H_diff"], rng, RT60, DRR)
    noise = diffuse_noise(ctx["H_diff"], y.shape[2], rng, ctx["psd"])
    y = y + noise * np.sqrt(p_t / np.mean(np.abs(noise) ** 2) * 10 ** (-SNR / 10))
    return y, az3[ti], others, turns


def faces(rng, az_t, others, turns, t, with_lip):
    talking = {k for k, s, e in turns if s <= t < e}
    out = []
    for a, speaking in [(az_t, True)] + [(a, k in talking) for k, a in enumerate(others)]:
        if rng.random() < RA.VIS["p_detect"]:
            out.append((a + rng.normal(0, RA.VIS["az_sigma"]), RA.lip_score(rng, speaking) if with_lip else 0.5))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=200)
    ap.add_argument("--seed", type=int, default=41)
    a = ap.parse_args()
    mics = earbud_mic_set("2+1"); freqs = np.fft.rfftfreq(NFFT, 1 / FS); grid = np.arange(-180, 180, 5.0)
    speech = RA.load_speech()
    ctx = {"freqs": freqs, "mics": mics, "fmask": (freqs >= 200) & (freqs <= 7000), "grid": grid,
           "Hg": sphere_tf(azimuth_points(grid, 1.5), mics, freqs), "H_diff": sphere_tf(fibonacci_sphere(32, 2.0), mics, freqs),
           "speech": speech, "psd": ltas(speech, FS)}
    k_dec = RC.time_frame(T_ON + T_DEC); t_dec = T_ON + T_DEC
    t0 = time.time(); res = {}
    for cname, sir in CONDS.items():
        rng = np.random.default_rng([a.seed, list(CONDS).index(cname)])
        rows = []; det = []; fa = []; front_back = {m: 0 for m in METHODS}
        for i in range(a.trials):
            y, az_t, others, turns = scene(rng, sir, ctx)
            # 声学开口检测
            ev = RC.acoustic_onsets(RC.novelty_raw(y, ctx), THRESH, int(1.0 * FPS))
            pre = [kd for kd, ko in ev if RC.frame_time(kd) < T_ON]
            post = [(kd, ko) for kd, ko in ev if T_ON <= RC.frame_time(kd) <= T_ON + 0.3]
            det.append(bool(post)); fa.append(len(pre))
            usable = [(kd, ko) for kd, ko in ev if RC.frame_time(kd) <= t_dec]
            k_on_ac = usable[-1][1] if usable else None
            spec_ac = RC.gevd_spec(y, k_dec, k_on_ac, ctx) if k_on_ac is not None else None
            if spec_ac is None:
                spec_ac = RC.music_plain(y, k_dec, ctx)
            k_on_lip = RC.time_frame(T_ON + rng.uniform(-RA.ONSET_JIT, RA.ONSET_JIT))
            spec_lip = RC.gevd_spec(y, k_dec, k_on_lip, ctx)
            f_lo = faces(rng, az_t, others, turns, t_dec, False)
            f_hi = faces(rng, az_t, others, turns, t_dec, True)
            est = {"不开摄像头（纯声学）": M.peak(spec_ac, grid, 5.0),
                   "只开低帧率档": M.fuse_soft(spec_ac, grid, f_lo, **RA.SOFT) if f_lo else M.peak(spec_ac, grid, 5.0),
                   "高帧率档（唇动 + 声学）": M.fuse_soft(spec_lip, grid, f_hi, **RA.SOFT) if f_hi else M.peak(spec_lip, grid, 5.0),
                   "仅视觉（唇动最高）": (max(f_hi, key=lambda f: f[1])[0] if f_hi else np.nan)}
            for m, z in est.items():
                if z is not None and not np.isnan(z) and abs(angdiff(z, 180 - az_t)) < abs(angdiff(z, az_t)) and angdiff(z, az_t) > 30:
                    front_back[m] += 1
            # 判到了另外两人中的某一个
            rows.append(dict(truth=az_t, **est, _others=others))
            if (i + 1) % 50 == 0:
                print(f"{cname} {i + 1}/{a.trials} {time.time() - t0:.0f} s", flush=True)
        summ = RA.summarize(rows, METHODS)
        for m in METHODS:
            wrong_person = 0
            for r in rows:
                z = r[m]
                if z is None or np.isnan(z) or angdiff(z, r["truth"]) <= 10:
                    continue
                if min(angdiff(z, o) for o in r["_others"]) <= 10:
                    wrong_person += 1
            summ[m]["wrong_person_pct"] = wrong_person / len(rows) * 100
            summ[m]["front_back_pct"] = front_back[m] / len(rows) * 100
        res[cname] = {"methods": summ, "onset_detect_within_0p3s_pct": float(np.mean(det) * 100),
                      "false_onsets_per_trial_before": float(np.mean(fa)), "false_window_s": T_ON - 1.0}
        print(cname, json.dumps({m: round(v["acc10"] * 100, 1) for m, v in summ.items()}, ensure_ascii=False),
              f"开口检出 {res[cname]['onset_detect_within_0p3s_pct']:.1f}% 误报/段 {res[cname]['false_onsets_per_trial_before']:.2f}", flush=True)
    out = {"setup": {"what": "mentor 11-23 两种情况", "array": "2+1", "t_total_s": T_TOT, "target_onset_s": T_ON, "decide_after_s": T_DEC,
                     "rt60": RT60, "snr_db": SNR, "acoustic_threshold_db": THRESH, "trials": a.trials, "seed": a.seed},
           "results": res, "elapsed_s": time.time() - t0}
    with open(os.path.join(ROOT, "out", "two_cases.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
