"""摄像头使用策略：常开唇动档换来的定位增益有多大？只在声学检测到声音后再开行不行？（mentor 11-21 反馈）

场景（一次 20 s 的多人对话）：正前方 ±60° 内 3 个对话者轮流说话（每段 2–5 s，换人间隔 0.1–0.5 s），
另有 1 个旁桌说话人全程说话（S2：比对话者低 6 dB；S4：一样响），混响 RT60 0.5 s，扩散噪声 SNR 10 dB。
任务：每 0.25 s 输出"当前说话的对话者"的方位。阵列 2+1，5° 网格，GEVD-MUSIC。

比较的策略（同一批场景）：
  A0 纯声学，不白化：最近 0.5 s 做 MUSIC，不需要开口时刻；摄像头关。
  A  纯声学，声学检测开口：新声源能量（白化后最大广义特征值）检测开口并回溯，按开口时刻划分背景、白化测向；摄像头关。
  C  声学触发后开摄像头：同 A 检测开口；检测到后摄像头延迟 d 打开唇动档，开 1.5 s。摄像头开着时：
       人脸 + 唇动参与融合；若唇动显示还是原来那个人在说，撤销这次开口（判为误报）；若某人开口时摄像头恰好开着，用唇动给的开口时刻。
  E  只开低分辨率监测档：同 A 检测开口；始终有 1.5 fps 的人脸方位（无唇动信息）参与融合，不开唇动档。
  D  低分辨率监测档常开 + 声学触发唇动档：同 C；另外始终有 1.5 fps 的人脸方位（无唇动信息）参与融合。
  B  唇动档常开：每次换人的开口时刻由唇动给出（±0.1 s），人脸 + 唇动参与融合。

指标：误差 ≤ 10° 的比例，分"换人后 0.5 s 内"和"之后的稳定段"；每次换人后第一次输出正确的时间；摄像头唇动档开机占比。

用法：python scripts/run_camera_policy.py [--trials 40] [--seed 61] [--cam-delay 0.2] [--thresh 2.5]
"""
import argparse, json, os, sys, time
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1"); os.environ.setdefault("OMP_NUM_THREADS", "1")
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_algo_selection as RA
from run_onset_pauses import ramp_mask
from earbud_ssl import methods as M
from earbud_ssl.sphere import sphere_tf, earbud_mic_set, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import stft, ltas, render_source, diffuse_noise, NFFT, HOP
from run_min_validation import pick_segment, angdiff

FS = 16000; FPS = FS / HOP
T_TOT, T_FIRST = 20.0, 1.5
DT_OUT = 0.25
CONDS = {"S2 旁桌低 6 dB": (0.5, 0.0, 10.0, 6.0), "S4 旁桌一样响": (0.5, 0.0, 10.0, 0.0)}
SOFT = {"lam": 0.1, "mu": 0.05}
CAM_ON_S = 1.5        # 触发后唇动档保持时间
MON_FPS = 1.5         # 监测档帧率
TAU_BG, TAU_ST = 1.0, 0.25
POLICIES = ["A0 纯声学（不白化）", "A 纯声学（声学检测开口）", "E 只开监测档", "C 声学触发后开摄像头", "D 监测档常开 + 声学触发唇动档", "B 唇动档常开"]


def frame_time(k):
    return ((k - 1) * HOP + NFFT) / FS          # 第 k 帧窗口末端的时间（与 run_timing 的开口帧定义一致）


def time_frame(t):
    return int(np.ceil((t * FS - NFFT) / HOP)) + 1


OVERLAP = False   # --overlap：一半的换人带 0.2–1.0 s 重叠（下一个人在上一个人说完前开口）


def schedule(rng):
    """3 个对话者轮流说话：返回 [(说话人, 开始, 结束)]。"""
    turns, t, who = [], T_FIRST, int(rng.integers(3))
    while t < T_TOT - 0.5:
        d = rng.uniform(2.0, 5.0); e = min(t + d, T_TOT)
        turns.append((who, t, e))
        if OVERLAP and rng.random() < 0.5:
            t = max(t + 1.0, e - rng.uniform(0.2, 1.0))
        else:
            t = e + rng.uniform(0.1, 0.5)
        who = int((who + rng.integers(1, 3)) % 3)
    return turns


def current_turn(turns, t):
    """t 时刻"轮到谁说"：正在说的人里最晚开口的那个。返回 (说话人, 开始) 或 None。"""
    cur = [(w, s) for w, s, e in turns if s <= t < e]
    return max(cur, key=lambda x: x[1]) if cur else None


def scene(rng, cond, ctx):
    rt60, drr, snr, sir = cond
    n = int(T_TOT * FS)
    az_p = RA.place(rng, 3, [], -60, 60, sep=20)
    az_b = RA.place(rng, 1, az_p, -180, 180, sep=20)[0]
    turns = schedule(rng)
    y = 0; p_ref = None; S_parts = []
    for i, a in enumerate(az_p):
        segs = [(s, e) for w, s, e in turns if w == i]
        x = pick_segment(ctx["speech"], n, rng) * ramp_mask(n, segs)
        if not np.any(x):
            continue
        S = stft(x); H = sphere_tf(azimuth_points([a], rng.uniform(1.0, 2.0)), ctx["mics"], ctx["freqs"])[0]
        act = np.abs(S).sum(0) > 1e-9
        p = np.mean(np.abs(H[:, :, None] * S[None][:, :, act]) ** 2)
        p_ref = p if p_ref is None else p_ref
        S = S * np.sqrt(p_ref / p)                                  # 三个对话者说话时一样响
        y = y + render_source(S, H, ctx["H_diff"], rng, rt60, drr)
    S_b = stft(pick_segment(ctx["speech"], n, rng))
    d_b = rng.uniform(1.5, 3.0)
    H_b = sphere_tf(azimuth_points([az_b], d_b), ctx["mics"], ctx["freqs"])[0]
    p_b = np.mean(np.abs(H_b[:, :, None] * S_b[None]) ** 2)
    y = y + render_source(S_b * np.sqrt(p_ref / p_b * 10 ** (-sir / 10)), H_b, ctx["H_diff"], rng, rt60, drr - 20 * np.log10(d_b / 1.5))
    noise = diffuse_noise(ctx["H_diff"], y.shape[2], rng, ctx["psd"])
    y = y + noise * np.sqrt(p_ref / np.mean(np.abs(noise) ** 2) * 10 ** (-snr / 10))
    return y, az_p, az_b, turns


def novelty_raw(y, ctx, step=2):
    """新声源能量（dB）：短时协方差经递推背景白化后的最大广义特征值，频点中位数（同 run_timing.py 的 raw）。"""
    Z = y[:, ctx["fmask"]]; Mm, F, T = Z.shape
    a_b, a_s = np.exp(-1 / (TAU_BG * FPS)), np.exp(-1 / (TAU_ST * FPS))
    Sb = np.zeros((F, Mm, Mm), complex); Ss = np.zeros_like(Sb); out = np.zeros(T)
    for t in range(T):
        x = Z[:, :, t].T; inst = x[:, :, None] * x[:, None, :].conj()
        Ss = a_s * Ss + (1 - a_s) * inst
        if t >= int(0.3 * FPS) and t % step == 0:
            Rb = Sb / (1 - a_b ** t); Rs = Ss / (1 - a_s ** (t + 1))
            L = Rb + (1e-2 * np.trace(Rb, axis1=1, axis2=2).real / Mm + 1e-12)[:, None, None] * np.eye(Mm)
            Li = np.linalg.inv(np.linalg.cholesky(L))
            W = Li @ Rs @ Li.conj().transpose(0, 2, 1); W = 0.5 * (W + W.conj().transpose(0, 2, 1))
            out[t] = 10 * np.log10(np.median(np.linalg.eigvalsh(W)[:, -1]))
        elif t > 0:
            out[t] = out[t - 1]
        Sb = a_b * Sb + (1 - a_b) * inst
    return out


def acoustic_onsets(nov, thresh, k_min):
    """上穿阈值的帧 → 回溯到新声源能量回落到阈值一半以下处，作为开口帧。返回 [(检出帧, 开口帧)]。"""
    ev, above = [], False
    for k in range(k_min, len(nov)):
        if nov[k] > thresh and not above:
            j = k
            while j > k_min and nov[j - 1] > thresh / 2:
                j -= 1
            ev.append((k, j))
        above = nov[k] > thresh
    return ev


def gevd_spec(y, k, k_on, ctx, guard_s=0.05):
    fm = ctx["fmask"]
    k0 = max(k_on, k - int(1.0 * FPS))
    if k - k0 < int(0.1 * FPS):
        return None
    Yd = y[:, :, k0:k]
    kb1 = k_on - int(guard_s * FPS); kb0 = max(0, kb1 - int(1.0 * FPS))
    if kb1 - kb0 < 4:
        return None
    e = M.frame_energy_db(Yd, fm)
    return M.music(M.covariance(Yd, fm, M.onset_weights(e, e.max() - 30)), ctx["Hg"], fm, M.covariance(y[:, :, kb0:kb1], fm, np.ones(kb1 - kb0)))


def music_plain(y, k, ctx):
    fm = ctx["fmask"]; Yd = y[:, :, max(0, k - int(0.5 * FPS)):k]
    e = M.frame_energy_db(Yd, fm)
    return M.music(M.covariance(Yd, fm, M.floor_weights(e, e.max() - 30)), ctx["Hg"], fm)


def faces_now(rng, t, az_p, az_b, turns, with_lip):
    """t 时刻摄像头看到的人脸（对话者 + 视野内的旁桌说话人）；with_lip=False 时唇动分数记 0.5（无信息）。"""
    cur = [w for w, s, e in turns if s <= t < e]
    out = []
    for i, a in enumerate(az_p):
        if abs(a) <= RA.VIS["fov"] and rng.random() < RA.VIS["p_detect"]:
            out.append((a + rng.normal(0, RA.VIS["az_sigma"]), RA.lip_score(rng, i in cur) if with_lip else 0.5))
    if abs(az_b) <= RA.VIS["fov"] and rng.random() < RA.VIS["p_detect"]:
        out.append((az_b + rng.normal(0, RA.VIS["az_sigma"]), RA.lip_score(rng, True) if with_lip else 0.5))
    return out


def lip_talker(faces, az_p):
    """唇动分数最高的人脸若 > 0.5，返回其方位。"""
    if not faces:
        return None
    a, l = max(faces, key=lambda f: f[1])
    return a if l > 0.5 else None


def run_trial(rng, cond, ctx, cam_delay, thresh):
    grid = ctx["grid"]
    y, az_p, az_b, turns = scene(rng, cond, ctx)
    T = y.shape[2]
    nov = novelty_raw(y, ctx)
    events = acoustic_onsets(nov, thresh, int(1.0 * FPS))
    t_out = np.arange(T_FIRST + DT_OUT, T_TOT - 1e-6, DT_OUT)
    lip_onsets = [(s + rng.uniform(-0.1, 0.1), w) for w, s, e in turns]      # 唇动看到的开口时刻（误差 ±0.1 s）
    res = {p: [] for p in POLICIES}
    cam_on = {"C": np.zeros(len(t_out), bool), "D": np.zeros(len(t_out), bool)}
    # 各策略的状态
    st = {p: {"k_on": time_frame(T_FIRST), "prev_k_on": None, "prev_last": None, "pending": None, "cam_until": -1.0, "cam_start": -1.0, "last": None} for p in POLICIES}
    mon_faces, mon_t = [], -9.0
    ev_i = {p: 0 for p in POLICIES}
    for oi, t in enumerate(t_out):
        k = min(time_frame(t), T)
        cur = current_turn(turns, t)
        truth = az_p[cur[0]] if cur else None
        since = (t - cur[1]) if cur else None
        # ---------- A0 ----------
        z = M.peak(music_plain(y, k, ctx), grid, 5.0)
        res[POLICIES[0]].append((truth, since, z))
        # ---------- A / C / D：处理新到的声学事件 ----------
        for p, tag in [(POLICIES[1], "A"), (POLICIES[2], "E"), (POLICIES[3], "C"), (POLICIES[4], "D")]:
            s = st[p]
            while ev_i[p] < len(events) and frame_time(events[ev_i[p]][0]) <= t:
                kd, ko = events[ev_i[p]]; ev_i[p] += 1
                if tag in ("A", "E"):
                    s["k_on"] = ko
                    continue
                td = frame_time(kd)
                if td < s["cam_until"]:
                    # 摄像头已开着：唇动显示仍是原来那个人在说 → 当作误报忽略
                    lt = lip_talker(faces_now(rng, td, az_p, az_b, turns, True), az_p)
                    if s["last"] is not None and lt is not None and angdiff(lt, s["last"]) <= 8:
                        s["cam_until"] = max(s["cam_until"], td + CAM_ON_S)
                        continue
                    s["k_on"] = ko; s["cam_until"] = max(s["cam_until"], td + CAM_ON_S)
                else:
                    s["prev_k_on"], s["prev_last"] = s["k_on"], s["last"]
                    s["k_on"] = ko; s["pending"] = td + cam_delay; s["cam_until"] = td + cam_delay + CAM_ON_S; s["cam_start"] = td + cam_delay
            # 摄像头刚打开：确认是否换人，没换人则撤销这次开口
            if tag in ("C", "D") and s["pending"] is not None and t >= s["pending"]:
                lt = lip_talker(faces_now(rng, s["pending"], az_p, az_b, turns, True), az_p)
                if s["prev_last"] is not None and lt is not None and angdiff(lt, s["prev_last"]) <= 8:
                    s["k_on"] = s["prev_k_on"]
                s["pending"] = None
            if tag in ("C", "D"):
                on = t < s["cam_until"] and (s["pending"] is None)
                cam_on[tag][oi] = t < s["cam_until"]
                # 摄像头开着时有人开口：用唇动给的开口时刻
                if on:
                    for to, w in lip_onsets:
                        if t - DT_OUT < to <= t and to >= s["cam_start"]:
                            s["k_on"] = time_frame(to)
                faces = faces_now(rng, t, az_p, az_b, turns, True) if on else []
                if tag == "D" and not on:
                    if t - mon_t >= 1.0 / MON_FPS:
                        mon_faces, mon_t = faces_now(rng, t, az_p, az_b, turns, False), t
                    faces = mon_faces
            elif tag == "E":
                if t - s.get("mon_t", -9.0) >= 1.0 / MON_FPS:
                    s["mon_faces"], s["mon_t"] = faces_now(rng, t, az_p, az_b, turns, False), t
                faces = s["mon_faces"]
            else:
                faces = []
            spec = gevd_spec(y, k, s["k_on"], ctx)
            if spec is None:
                z = s["last"]
            else:
                z = M.fuse_soft(spec, grid, faces, **SOFT) if faces else M.peak(spec, grid, 5.0)
            s["last"] = z
            res[p].append((truth, since, z))
        # ---------- B ----------
        s = st[POLICIES[5]]
        past = [to for to, w in lip_onsets if to <= t]
        if past:
            s["k_on"] = time_frame(max(past))
        spec = gevd_spec(y, k, s["k_on"], ctx)
        z = s["last"] if spec is None else M.fuse_soft(spec, grid, faces_now(rng, t, az_p, az_b, turns, True), **SOFT)
        s["last"] = z
        res[POLICIES[5]].append((truth, since, z))
    duty = {"C": float(cam_on["C"].mean()), "D": float(cam_on["D"].mean())}
    fa = sum(1 for kd, ko in events if not any(abs(frame_time(ko) - s) <= 0.5 for w, s, e in turns))
    return res, duty, len(turns), len(events), fa


def summarize(all_res):
    out = {}
    for p, rows in all_res.items():
        tr = [(angdiff(z, tr) if z is not None else 180.0, since) for tr, since, z in rows if tr is not None]
        e = np.array([x[0] for x in tr]); s = np.array([x[1] for x in tr])
        out[p] = {"acc10_all": float(np.mean(e <= 10) * 100), "acc10_first_0p5s": float(np.mean(e[s < 0.5] <= 10) * 100),
                  "acc10_steady": float(np.mean(e[s >= 0.5] <= 10) * 100), "mae_steady": float(np.mean(e[s >= 0.5]))}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=40)
    ap.add_argument("--seed", type=int, default=61)
    ap.add_argument("--cam-delay", type=float, default=0.2)
    ap.add_argument("--thresh", type=float, default=2.5)
    ap.add_argument("--overlap", action="store_true")
    a = ap.parse_args()
    global OVERLAP
    OVERLAP = a.overlap
    mics = earbud_mic_set("2+1"); freqs = np.fft.rfftfreq(NFFT, 1 / FS); grid = np.arange(-180, 180, 5.0)
    speech = RA.load_speech()
    ctx = {"freqs": freqs, "mics": mics, "fmask": (freqs >= 200) & (freqs <= 7000), "grid": grid,
           "Hg": sphere_tf(azimuth_points(grid, 1.5), mics, freqs), "H_diff": sphere_tf(fibonacci_sphere(32, 2.0), mics, freqs),
           "speech": speech, "psd": ltas(speech, FS)}
    t0 = time.time(); out = {}
    for cname, cond in CONDS.items():
        rng = np.random.default_rng(a.seed)
        all_res = {p: [] for p in POLICIES}; duties = {"C": [], "D": []}; n_turns = n_ev = n_fa = 0
        lat = {p: [] for p in POLICIES}
        for i in range(a.trials):
            res, duty, nt, ne, nfa = run_trial(rng, cond, ctx, a.cam_delay, a.thresh)
            for p in POLICIES:
                all_res[p] += res[p]
                # 换人后第一次正确输出的时间
                rows = res[p]; j = 0
                while j < len(rows):
                    tr, since, z = rows[j]
                    if tr is not None and since is not None and since < DT_OUT + 1e-9:
                        t_hit = None
                        for tr2, s2, z2 in rows[j:]:
                            if tr2 != tr or s2 is None or s2 < since - 1e-9:
                                break
                            if z2 is not None and angdiff(z2, tr2) <= 10:
                                t_hit = s2; break
                        lat[p].append(t_hit)
                    j += 1
            duties["C"].append(duty["C"]); duties["D"].append(duty["D"]); n_turns += nt; n_ev += ne; n_fa += nfa
            print(f"{cname} {i + 1}/{a.trials} {time.time() - t0:.0f} s", flush=True)
        summ = summarize(all_res)
        for p in POLICIES:
            l = [x for x in lat[p] if x is not None]
            summ[p]["first_correct_median_s"] = float(np.median(l)) if l else None
            summ[p]["turns_never_correct_pct"] = float(np.mean([x is None for x in lat[p]]) * 100) if lat[p] else None
        out[cname] = {"policies": summ,
                      "camera_lip_duty_pct": {"A0": 0.0, "A": 0.0, "E": 0.0, "C": float(np.mean(duties["C"]) * 100), "D": float(np.mean(duties["D"]) * 100), "B": 100.0},
                      "turns_per_min": n_turns / (a.trials * (T_TOT - T_FIRST)) * 60, "acoustic_events_per_min": n_ev / (a.trials * T_TOT) * 60,
                      "acoustic_false_events_per_min": n_fa / (a.trials * T_TOT) * 60}
        print(json.dumps(out[cname], ensure_ascii=False, indent=1), flush=True)
    setup = {"duration_s": T_TOT, "talkers": "3 个对话者在正前方 ±60°，轮流说话（每段 2–5 s，间隔 0.1–0.5 s）；1 个旁桌说话人全程说话",
             "array": "2+1", "grid_deg": 5, "output_every_s": DT_OUT, "cam_delay_s": a.cam_delay, "cam_on_after_trigger_s": CAM_ON_S,
             "monitor_fps": MON_FPS, "acoustic_onset_threshold_db": a.thresh, "overlap": a.overlap, "trials": a.trials, "seed": a.seed, "vision": RA.VIS,
             "note": "B 的唇动档在整段对话中常开，开机占比记 100%（相对于对话时间）"}
    with open(os.path.join(ROOT, "out", f"camera_policy_th{a.thresh:g}_delay{a.cam_delay:g}{'_overlap' if a.overlap else ''}.json"), "w", encoding="utf-8") as f:
        json.dump({"setup": setup, "results": out, "elapsed_s": time.time() - t0}, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
