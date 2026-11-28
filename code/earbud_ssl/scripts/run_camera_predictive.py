"""预测式开唇动档：在上一个人说完时提前打开唇动档，赶在下一个人开口前就开着（接 run_camera_policy.py）。

背景：摄像头策略仿真表明，唇动档常开的增益集中在"换人"那一刻（换人后 0.25 s 锁定，只开监测档约 0.45 s），
而"声学检测到开口后再开"赶不上开口。这里检验另一种做法：上一个人说完时就打开唇动档。

本脚本给的是**理想上限**：假设能准确知道每段话的结束时刻（不做真实的"说完"检测），
只扫描"说完 → 唇动档可用"的总时延 L（检测时延 + 摄像头启动时延）= 0 / 0.1 / 0.2 / 0.35 s。
真实检测还会有漏检和误检，结果只会更差。

场景、方法同 run_camera_policy.py（3 个对话者轮流 + 1 个旁桌说话人，20 s；阵列 2+1，GEVD-MUSIC，5° 网格）。
比较：E 只开监测档；D 监测档 + 声学触发唇动档；F(L) D + 预测式唇动档；B 唇动档常开。
预测式唇动档：从"说完 + L"开到"下一个人开口 + 0.5 s"（至少 0.5 s，最多 1.5 s）；开着时若下一个人开口，用唇动给的开口时刻。

用法：python scripts/run_camera_predictive.py [--trials 40] [--seed 71] [--overlap]
"""
import argparse, json, os, sys, time
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1"); os.environ.setdefault("OMP_NUM_THREADS", "1")
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_algo_selection as RA
import run_camera_policy as RC
from earbud_ssl import methods as M
from earbud_ssl.sphere import sphere_tf, earbud_mic_set, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import ltas, NFFT
from run_min_validation import angdiff

FS, FPS, DT_OUT, T_FIRST, T_TOT = RC.FS, RC.FPS, RC.DT_OUT, RC.T_FIRST, RC.T_TOT
LATS = [0.0, 0.1, 0.2, 0.35]
CAM_DELAY, CAM_ON_S, THRESH = 0.2, 1.5, 3.5


def policies():
    out = [("E 只开监测档", {"monitor": True, "trigger": False, "always": False, "pred": None}),
           ("D 监测档 + 声学触发唇动档", {"monitor": True, "trigger": True, "always": False, "pred": None})]
    for L in LATS:
        out.append((f"F 预测式（时延 {L:g} s）", {"monitor": True, "trigger": True, "always": False, "pred": L}))
    out.append(("B 唇动档常开", {"monitor": True, "trigger": False, "always": True, "pred": None}))
    return out


def predictive_windows(turns, L):
    """每段话结束 e 后在 e + L 打开唇动档，开到下一个人开口 + 0.5 s（至少 0.5 s，最多 1.5 s）。"""
    wins = []
    for i, (w, s, e) in enumerate(turns):
        st = e + L
        nxt = [s2 for w2, s2, e2 in turns[i + 1:]]
        n = nxt[0] if nxt else None
        if n is not None and n >= st:
            en = min(st + 1.5, max(st + 0.5, n + 0.5))
        else:
            en = st + 0.5            # 下一个人已经开口（重叠）或没有下一段：白开 0.5 s
        wins.append((st, en))
    return wins


def union_len(wins, lo, hi):
    xs = sorted((max(a, lo), min(b, hi)) for a, b in wins if b > lo and a < hi)
    tot, cs, ce = 0.0, None, None
    for a, b in xs:
        if cs is None or a > ce:
            if cs is not None: tot += ce - cs
            cs, ce = a, b
        else:
            ce = max(ce, b)
    if cs is not None: tot += ce - cs
    return tot


def on_at(wins, t):
    return any(a <= t < b for a, b in wins)


def run_policy(cfg, y, az_p, az_b, turns, events, lip_onsets, ctx, vrng):
    grid = ctx["grid"]
    t_out = np.arange(T_FIRST + DT_OUT, T_TOT - 1e-6, DT_OUT)
    wins = predictive_windows(turns, cfg["pred"]) if cfg["pred"] is not None else []
    if cfg["always"]:
        wins = [(0.0, T_TOT + 1)]
    k_on = RC.time_frame(T_FIRST); last = None; ev_i = 0
    pend = None                                    # (摄像头可用时刻, 触发前的开口帧, 触发前的输出)
    mon_faces, mon_t = [], -9.0
    rows = []
    for t in t_out:
        k = min(RC.time_frame(t), y.shape[2])
        cur = RC.current_turn(turns, t)
        truth = az_p[cur[0]] if cur else None
        since = (t - cur[1]) if cur else None
        # 声学开口事件（B 不用：开口时刻全由唇动给）
        if not cfg["always"]:
            while ev_i < len(events) and RC.frame_time(events[ev_i][0]) <= t:
                kd, ko = events[ev_i]; ev_i += 1; td = RC.frame_time(kd)
                if not cfg["trigger"]:
                    k_on = ko; continue
                if on_at(wins, td):
                    lt = RC.lip_talker(RC.faces_now(vrng, td, az_p, az_b, turns, True), az_p)
                    if not (last is not None and lt is not None and angdiff(lt, last) <= 8):
                        k_on = ko
                    wins.append((td, td + CAM_ON_S))
                else:
                    pend = (td + CAM_DELAY, k_on, last)
                    k_on = ko
                    wins.append((td + CAM_DELAY, td + CAM_DELAY + CAM_ON_S))
            if pend is not None and t >= pend[0]:
                lt = RC.lip_talker(RC.faces_now(vrng, pend[0], az_p, az_b, turns, True), az_p)
                if pend[2] is not None and lt is not None and angdiff(lt, pend[2]) <= 8:
                    k_on = pend[1]
                pend = None
        # 唇动档开着时有人开口：用唇动给的开口时刻
        for to, w in lip_onsets:
            if t - DT_OUT < to <= t and on_at(wins, to):
                k_on = RC.time_frame(to)
        lip_on = on_at(wins, t)
        if lip_on:
            faces = RC.faces_now(vrng, t, az_p, az_b, turns, True)
        elif cfg["monitor"]:
            if t - mon_t >= 1.0 / RC.MON_FPS:
                mon_faces, mon_t = RC.faces_now(vrng, t, az_p, az_b, turns, False), t
            faces = mon_faces
        else:
            faces = []
        spec = RC.gevd_spec(y, k, k_on, ctx)
        z = last if spec is None else (M.fuse_soft(spec, grid, faces, **RC.SOFT) if faces else M.peak(spec, grid, 5.0))
        last = z
        rows.append((truth, since, z))
    duty = 1.0 if cfg["always"] else union_len(wins, T_FIRST, T_TOT) / (T_TOT - T_FIRST)
    return rows, duty


def latencies(rows):
    lat = []
    for j, (tr, since, z) in enumerate(rows):
        if tr is not None and since is not None and since < DT_OUT + 1e-9:
            hit = None
            for tr2, s2, z2 in rows[j:]:
                if tr2 != tr or s2 is None or s2 < since - 1e-9:
                    break
                if z2 is not None and angdiff(z2, tr2) <= 10:
                    hit = s2; break
            lat.append(hit)
    return lat


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=40)
    ap.add_argument("--seed", type=int, default=71)
    ap.add_argument("--overlap", action="store_true")
    a = ap.parse_args()
    RC.OVERLAP = a.overlap
    mics = earbud_mic_set("2+1"); freqs = np.fft.rfftfreq(NFFT, 1 / FS); grid = np.arange(-180, 180, 5.0)
    speech = RA.load_speech()
    ctx = {"freqs": freqs, "mics": mics, "fmask": (freqs >= 200) & (freqs <= 7000), "grid": grid,
           "Hg": sphere_tf(azimuth_points(grid, 1.5), mics, freqs), "H_diff": sphere_tf(fibonacci_sphere(32, 2.0), mics, freqs),
           "speech": speech, "psd": ltas(speech, FS)}
    pols = policies(); t0 = time.time(); out = {}
    for cname, cond in RC.CONDS.items():
        rows = {n: [] for n, _ in pols}; lat = {n: [] for n, _ in pols}; duty = {n: [] for n, _ in pols}; before = []
        for i in range(a.trials):
            srng = np.random.default_rng([a.seed, i])
            y, az_p, az_b, turns = RC.scene(srng, cond, ctx)
            events = RC.acoustic_onsets(RC.novelty_raw(y, ctx), THRESH, int(1.0 * FPS))
            lip_onsets = [(s + srng.uniform(-0.1, 0.1), w) for w, s, e in turns]
            for j in range(1, len(turns)):                      # 换人间隔（负为重叠）
                before.append(turns[j][1] - turns[j - 1][2])
            for pi, (n, cfg) in enumerate(pols):
                r, d = run_policy(cfg, y, az_p, az_b, turns, events, lip_onsets, ctx, np.random.default_rng([a.seed, i, pi]))
                rows[n] += r; lat[n] += latencies(r); duty[n].append(d)
            print(f"{cname} {i + 1}/{a.trials} {time.time() - t0:.0f} s", flush=True)
        summ = RC.summarize(rows)
        for n, _ in pols:
            l = [x for x in lat[n] if x is not None]
            summ[n]["first_correct_median_s"] = float(np.median(l)) if l else None
            summ[n]["lip_duty_pct"] = float(np.mean(duty[n]) * 100)
        g = np.array(before)
        out[cname] = {"policies": summ, "turn_gap_s": {"median": float(np.median(g)), "overlap_pct": float(np.mean(g < 0) * 100)}}
        print(json.dumps(out[cname], ensure_ascii=False, indent=1), flush=True)
    setup = {"what": "理想上限：已知每段话结束时刻；扫描说完 → 唇动档可用的总时延", "lats_s": LATS, "overlap": a.overlap,
             "cam_delay_for_trigger_s": CAM_DELAY, "cam_on_after_trigger_s": CAM_ON_S, "acoustic_threshold_db": THRESH,
             "trials": a.trials, "seed": a.seed}
    fn = f"camera_predictive{'_overlap' if a.overlap else ''}.json"
    with open(os.path.join(ROOT, "out", fn), "w", encoding="utf-8") as f:
        json.dump({"setup": setup, "results": out, "elapsed_s": time.time() - t0}, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
