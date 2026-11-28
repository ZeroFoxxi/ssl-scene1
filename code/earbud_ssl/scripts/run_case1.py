"""情况 1（mentor 11-23）细化：面前 3 个人，只有 1 个人在跟你说话，另外 2 个不说话。
回答三个问题：
  ① 拾音距离：说话人在 0.5 / 1 / 2 / 3 / 4 m 时精度各多少；
  ② 不同定位算法（SRP-PHAT、MUSIC、GEVD-MUSIC）在各距离下的精度；
  ③ 单只耳机 2 麦（不需要左右耳机互传声音）够不够，对比 2+1（主耳 2 + 副耳转发 1 路）。

场景：3 人都在正前方（中间一人在 ±30° 内，相邻隔 20–30°），3 人到佩戴者的距离相同 = d；目标是其中随机一个。
3 s 片段，目标第 2.0 s 开口（第一个有声帧对齐），开口后 0.5 s 判决。刚性球头部；方向模板按 1.5 m 制作。
距离的影响（物理）：噪声声级固定，目标声级 ∝ 1/d，故 SNR(d) = SNR(1.5 m) − 20·lg(d/1.5)；
  混响声级近似不随位置变，直达声 ∝ 1/d，故直达混响比 DRR(d) = 0 dB − 20·lg(d/1.5)；RT60 0.5 s。
  两档环境：嘈杂（1.5 m 处 SNR 10 dB）、安静（1.5 m 处 SNR 25 dB）。
视觉随距离变差（假设，待视觉同事给真实指标）：2 m 以内检出 95%、唇动判反 10%；
  3 m 检出 90%、判反 20%；4 m 检出 85%、判反 30%；方位误差 2°。依据：720p 时嘴宽像素约与距离成反比（2 m 约 19 像素）。

算法（全部 5° 网格 + 抛物线插值，方向模板含头部影响）：
  算法对比（开口时刻由唇动给，只用声音）：SRP-PHAT、MUSIC、GEVD-MUSIC
  系统（GEVD-MUSIC）：不开摄像头（声学检测开口）、低帧率档（+ 人脸位置）、高帧率档（+ 人脸 + 唇动）、仅视觉

用法：python scripts/run_case1.py [--trials 150] [--seed 51]
"""
import argparse, json, os, sys, time
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_algo_selection as RA
import run_camera_policy as RC
from run_two_cases import voiced_start
from run_min_validation import angdiff
from earbud_ssl import methods as M
from earbud_ssl.sphere import sphere_tf, earbud_mic_set, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import ltas, stft, render_source, diffuse_noise, NFFT

FS, FPS = RC.FS, RC.FPS
T_TOT, T_ON, T_DEC = 3.0, 2.0, 0.5
RT60, D_REF = 0.5, 1.5
DISTS = [0.5, 1.0, 2.0, 3.0, 4.0]
ENVS = {"嘈杂（1.5 m 处 SNR 10 dB）": 10.0, "安静（1.5 m 处 SNR 25 dB）": 25.0}
ARRAYS = {"2+1（两耳）": [0, 1, 2], "单耳 2 麦": [0, 1]}
THRESH = 3.5
ALGOS = ["SRP-PHAT", "MUSIC", "GEVD-MUSIC"]
SYSTEM = ["不开摄像头", "低帧率档", "高帧率档"]


def vision(d):
    if d <= 2.0:
        return 0.95, 0.10
    return 0.95 - 0.05 * (d - 2.0), 0.10 + 0.10 * (d - 2.0)


def faces(rng, az3, ti, d, with_lip):
    p_det, lip_err = vision(d)
    out = []
    for i, a in enumerate(az3):
        if rng.random() < p_det:
            speaking = i == ti
            lip = (float(rng.uniform(0.6, 1.0) if (speaking != (rng.random() < lip_err)) else rng.uniform(0.0, 0.4))) if with_lip else 0.5
            out.append((a + rng.normal(0, RA.VIS["az_sigma"]), lip))
    return out


def scene(rng, d, snr_ref, ctx):
    n = int(T_TOT * FS)
    c = rng.uniform(-30, 30)
    az3 = [c - rng.uniform(20, 30), c, c + rng.uniform(20, 30)]
    ti = int(rng.integers(3))
    x = np.zeros(n); x[int(T_ON * FS):] = voiced_start(ctx["speech"], n - int(T_ON * FS), rng)
    S = stft(x); H = sphere_tf(azimuth_points([az3[ti]], d), ctx["mics"], ctx["freqs"])[0]
    act = np.abs(S).sum(0) > 1e-9
    # 目标声级 ∝ 1/d：以 1.5 m 处的直达声功率为参考
    H_ref = sphere_tf(azimuth_points([az3[ti]], D_REF), ctx["mics"], ctx["freqs"])[0]
    p_ref = np.mean(np.abs(H_ref[:, :, None] * S[None][:, :, act]) ** 2)
    drr = 0.0 - 20 * np.log10(d / D_REF)
    y = render_source(S * (D_REF / d), H, ctx["H_diff"], rng, RT60, drr)   # 传递函数相对头心自由场归一化，不含 1/r，这里显式按距离衰减
    noise = diffuse_noise(ctx["H_diff"], y.shape[2], rng, ctx["psd"])
    y = y + noise * np.sqrt(p_ref / np.mean(np.abs(noise) ** 2) * 10 ** (-snr_ref / 10))
    return y, az3, ti


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=150)
    ap.add_argument("--seed", type=int, default=51)
    a = ap.parse_args()
    mics = earbud_mic_set("2+1"); freqs = np.fft.rfftfreq(NFFT, 1 / FS); grid = np.arange(-180, 180, 5.0)
    fm = (freqs >= 200) & (freqs <= 7000)
    speech = RA.load_speech()
    Hg_all = sphere_tf(azimuth_points(grid, D_REF), mics, freqs)
    ctx = {"freqs": freqs, "mics": mics, "fmask": fm, "grid": grid, "H_diff": sphere_tf(fibonacci_sphere(32, 2.0), mics, freqs),
           "speech": speech, "psd": ltas(speech, FS)}
    k_dec = RC.time_frame(T_ON + T_DEC); n_win = int(T_DEC * FPS)
    t0 = time.time(); res = {}
    for ename, snr_ref in ENVS.items():
        res[ename] = {}
        for d in DISTS:
            rng = np.random.default_rng([a.seed, int(snr_ref), int(d * 10)])
            rows = {arr: [] for arr in ARRAYS}; det = {arr: [] for arr in ARRAYS}
            for i in range(a.trials):
                y, az3, ti = scene(rng, d, snr_ref, ctx)
                truth = az3[ti]
                k_on_lip = RC.time_frame(T_ON + rng.uniform(-RA.ONSET_JIT, RA.ONSET_JIT))
                f_lo = faces(rng, az3, ti, d, False); f_hi = faces(rng, az3, ti, d, True)
                vis_only = max(f_hi, key=lambda f: f[1])[0] if f_hi else np.nan
                for arr, idx in ARRAYS.items():
                    ya = y[idx]
                    cx = dict(ctx, Hg=Hg_all[:, idx], mics=mics[idx])
                    # 算法对比：开口时刻由唇动给
                    Yd = ya[:, :, k_on_lip:k_on_lip + n_win]
                    kb1 = k_on_lip - int(0.05 * FPS); Yb = ya[:, :, max(0, kb1 - int(1.0 * FPS)):kb1]
                    e = M.frame_energy_db(Yd, fm)
                    w_floor, w_on = M.floor_weights(e, e.max() - 30), M.onset_weights(e, e.max() - 30)
                    est = {"SRP-PHAT": M.peak(M.srp_phat(Yd, cx["Hg"], fm, w_floor), grid, 5.0),
                           "MUSIC": M.peak(M.music(M.covariance(Yd, fm, w_floor), cx["Hg"], fm), grid, 5.0)}
                    spec_lip = M.music(M.covariance(Yd, fm, w_on), cx["Hg"], fm, M.covariance(Yb, fm, np.ones(Yb.shape[2])))
                    est["GEVD-MUSIC"] = M.peak(spec_lip, grid, 5.0)
                    # 系统：声学检测开口
                    ev = RC.acoustic_onsets(RC.novelty_raw(ya, cx), THRESH, int(1.0 * FPS))
                    det[arr].append(any(T_ON <= RC.frame_time(kd) <= T_ON + 0.3 for kd, ko in ev))
                    usable = [(kd, ko) for kd, ko in ev if RC.frame_time(kd) <= T_ON + T_DEC]
                    spec_ac = RC.gevd_spec(ya, k_dec, usable[-1][1], cx) if usable else None
                    if spec_ac is None:
                        spec_ac = RC.music_plain(ya, k_dec, cx)
                    est["不开摄像头"] = M.peak(spec_ac, grid, 5.0)
                    est["低帧率档"] = M.fuse_soft(spec_ac, grid, f_lo, **RA.SOFT) if f_lo else est["不开摄像头"]
                    est["高帧率档"] = M.fuse_soft(spec_lip, grid, f_hi, **RA.SOFT) if f_hi else est["GEVD-MUSIC"]
                    est["仅视觉"] = vis_only
                    rows[arr].append(dict(truth=truth, **est))
                if (i + 1) % 50 == 0:
                    print(f"{ename} {d} m {i + 1}/{a.trials} {time.time() - t0:.0f} s", flush=True)
            res[ename][f"{d:g} m"] = {}
            for arr in ARRAYS:
                summ = RA.summarize(rows[arr], ALGOS + SYSTEM + ["仅视觉"])
                for m in summ:   # 左右镜像（关于正前后轴）与前后镜像的比例
                    lr = fb = 0
                    for r in rows[arr]:
                        z, tr = r[m], r["truth"]
                        if z is None or np.isnan(z) or angdiff(z, tr) <= 10:
                            continue
                        if angdiff(z, -tr) <= 10 and abs(tr) > 10:
                            lr += 1
                        elif angdiff(z, 180 - tr) <= 10:
                            fb += 1
                    summ[m]["left_right_mirror_pct"] = lr / len(rows[arr]) * 100
                    summ[m]["front_back_mirror_pct"] = fb / len(rows[arr]) * 100
                res[ename][f"{d:g} m"][arr] = {"methods": summ, "onset_detect_within_0p3s_pct": float(np.mean(det[arr]) * 100)}
            print(ename, f"{d} m", json.dumps({arr: {m: round(v["acc10"] * 100, 1) for m, v in res[ename][f"{d:g} m"][arr]["methods"].items()}
                                                for arr in ARRAYS}, ensure_ascii=False), flush=True)
    out = {"setup": {"what": "情况 1 细化：距离 × 算法 × 阵列", "dists_m": DISTS, "envs": ENVS, "arrays": {k: v for k, v in ARRAYS.items()},
                     "template_distance_m": D_REF, "rt60": RT60, "drr_at_1p5m_db": 0.0,
                     "vision_assumption": "≤2 m 检出 95% 判反 10%；3 m 90% / 20%；4 m 85% / 30%；方位误差 2°",
                     "trials": a.trials, "seed": a.seed}, "results": res, "elapsed_s": time.time() - t0}
    with open(os.path.join(ROOT, "out", "case1.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
