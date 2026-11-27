"""60 s 多人对话全流程（12 月仿真第 2 周的第一版，刚性球头部模型）。

把 11 月的各环节接到 60 s 场景（earbud_ssl/scene60.py）上，按 `整体设计方案.md` 第 7 节的流程每 0.25 s 输出一次：
  1 自语音：骨声纹（按剧本真值）检测到佩戴者在说话时冻结输出，不处理这段时间的开口事件；
  2 开口时刻：纯声学 / 低帧率档用声学开口检测（新声源能量，阈值 --thresh）；高帧率档用唇动给出的开口时刻（视野内的人，误差 ±0.1 s）；
  3 测向：GEVD-MUSIC（背景 = 开口前 1 s，目标 = 开口后至多 1 s，起始段加权），5° 网格；
  4 融合：软融合（人脸方位 + 唇动分数，参数同 11 月）；低帧率档 1.5 fps 只有人脸方位；
  5 头部转动：IMU 偏航角（真值 + 0.5° 噪声）把方位换到世界坐标里锁定，输出时再换回头部坐标；
  6 锁定（三种规则对比，见 Lock 的说明）：
     跟随：锁定 = 当前说话人的估计（小组对话里谁说就对准谁）；
     防抖（第 8.1 节）：另一方向的人连续说约 2 s、且原目标这段时间没说话，才切换；佩戴者说完后 1.5 s 内开口并说满 0.5 s 的人
           视为"回应佩戴者"，立即切换；同一方向（±12°）的观测用来微调锁定方位（跟住走动）。
评测真值：对话对象（scene.partner，佩戴者回话、停顿时保持）。

  python scripts/run_scene60_pipeline.py --n 6 --seed 101          # 开发种子，检查流程
  python scripts/run_scene60_pipeline.py --n 40 --seed 7 --tag eval  # 评测
"""
import argparse, json, os, sys, time
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1"); os.environ.setdefault("OMP_NUM_THREADS", "1")
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_algo_selection as RA
import run_camera_policy as RC
from make_scene60 import build_ctx
from run_min_validation import pick_segment, angdiff
from earbud_ssl import methods as M
from earbud_ssl import scene60 as SC
from earbud_ssl.sphere import sphere_tf, azimuth_points

FS, FPS = SC.FS, SC.FPS
DT = 0.25
T_START = 1.0
MODES = ["纯声学", "低帧率档", "高帧率档常开"]
LOCKS = ["跟随", "防抖", "对话组"]
LOCK = {"same_deg": 12.0, "switch_s": 2.0, "reply_window_s": 1.5, "reply_min_s": 0.5, "track_gain": 0.3}
IMU_SIGMA = 0.5
MON_FPS = 1.5
KINDS = {"turns（轮流说话，旁桌低 6 dB）": {"kind": "turns"},
         "case2（另两人互相说，一样响）": {"kind": "case2", "case2_sir_db": 0.0}}


def wrap(a):
    return (a + 180.0) % 360.0 - 180.0


def onsets(mask):
    d = np.diff(np.r_[0, mask.astype(int)])
    return np.flatnonzero(d == 1)


def self_block(sc, k, after_s=0.3):
    """骨声纹：k 帧处或刚说完 after_s 内都算佩戴者的声音。"""
    a = max(0, k - int(after_s * FPS))
    return bool(sc.self_speech[a:k + 1].any())


def faces_now(sc, k, rng, with_lip):
    out = []
    for p in sc.persons:
        az = sc.az_head(p)[k]
        if abs(az) <= sc.cfg["fov_half_deg"] and rng.random() < RA.VIS["p_detect"]:
            out.append((az + rng.normal(0, RA.VIS["az_sigma"]), RA.lip_score(rng, bool(p.speaking[k])) if with_lip else 0.5))
    return out


class Lock:
    """锁定规则；方位都在世界坐标里。
    跟随：锁定 = 当前说话人的估计。
    防抖（第 8.1 节）：另一方向的人连续说满 2 s、且原目标这段时间没说话才切换；佩戴者说完 1.5 s 内开口并说满 0.5 s 的人视为回应，立即切换。
    对话组（新增【设计】）：记住"在和佩戴者交谈的人"（组员）。组员说话时立即对准他；不在组里的人按以下条件入组并对准：
        佩戴者说完 1.5 s 内开口并说满 0.5 s（回应）；佩戴者 2 s 内转头超过 10° 且此人在正前方 ±10° 内说满 1 s（看向）；
        连续说满 2 s 且这段时间组员都没说话（防抖）。场景开始时第一个说话的人直接入组。"""
    def __init__(self, rule):
        self.rule = rule; self.az = None; self.cand = None; self.last_lock_obs = -9.0
        self.members = []; self.switches = []

    def _set(self, t, az):
        if self.az is not None and angdiff(az, self.az) > LOCK["same_deg"]:
            self.switches.append(t)
        self.az = az; self.last_lock_obs = t; self.cand = None

    def _track(self, t, z):
        old = self.az
        self.az = wrap(self.az + LOCK["track_gain"] * wrap(z - self.az)); self.last_lock_obs = t
        for i, m in enumerate(self.members):
            if angdiff(m, old) <= LOCK["same_deg"]:
                self.members[i] = self.az

    def update(self, t, own, new, self_end, yaw=0.0, yaw_prev=0.0):
        """own：按锁定对象本人开口时刻测得的观测（高帧率档才有）；new：当前（或新开口的人）的观测。"""
        same = LOCK["same_deg"]
        if own is not None and self.az is not None and angdiff(own, self.az) <= same:
            self._track(t, own)
        z = new
        if z is None:
            return
        if self.rule == "跟随" or self.az is None:
            self._set(t, z)
            if self.rule == "对话组" and not self.members:
                self.members.append(z)
            return
        if angdiff(z, self.az) <= same:
            self._track(t, z); self.cand = None
            return
        if self.rule == "对话组":
            near = [m for m in self.members if angdiff(m, z) <= same]
            if near:
                self._set(t, wrap(near[0] + LOCK["track_gain"] * wrap(z - near[0])))
                return
        if self.cand is not None and angdiff(z, self.cand["az"]) <= same:
            c = self.cand; c["az"] = wrap(c["az"] + 0.5 * wrap(z - c["az"])); c["dur"] += DT
        else:
            self.cand = c = {"az": z, "start": t, "dur": DT}
        reply = self_end is not None and 0 <= c["start"] - self_end <= LOCK["reply_window_s"] and c["dur"] >= LOCK["reply_min_s"]
        long_ = c["dur"] >= LOCK["switch_s"] and self.last_lock_obs < c["start"]
        look = (self.rule == "对话组" and abs(wrap(yaw - yaw_prev)) > 10 and abs(wrap(c["az"] - yaw)) <= 10 and c["dur"] >= 1.0)
        if reply or long_ or look:
            az = c["az"]; self._set(t, az)
            if self.rule == "对话组":
                self.members.append(az)


def run_scene(sc, Y, ctx, rng, thresh):
    T = sc.T; grid = ctx["grid"]
    t_out = np.arange(T_START, sc.cfg["duration_s"] - 1e-6, DT)
    yaw_imu = sc.yaw + rng.normal(0, IMU_SIGMA, T)
    # 声学开口事件（纯声学、低帧率档）
    nov = RC.novelty_raw(Y, ctx)
    ac_ev = [(kd, ko) for kd, ko in RC.acoustic_onsets(nov, thresh, int(T_START * FPS)) if not self_block(sc, ko) and not self_block(sc, kd)]
    # 唇动开口事件（高帧率档）：视野内的人开口，时刻误差 ±0.1 s；带上该人脸的世界坐标方位
    lip_ev = []
    for p in sc.persons:
        for k in onsets(p.speaking):
            if abs(sc.az_head(p)[k]) <= sc.cfg["fov_half_deg"] and rng.random() < RA.VIS["p_detect"]:
                ko = RC.time_frame(RC.frame_time(k) + rng.uniform(-RA.ONSET_JIT, RA.ONSET_JIT))
                if not self_block(sc, ko):
                    lip_ev.append((ko, ko, wrap(sc.az_head(p)[k] + rng.normal(0, RA.VIS["az_sigma"]) + yaw_imu[k])))
    lip_ev.sort()
    self_ends = [RC.frame_time(b) for b in np.flatnonzero(np.diff(np.r_[sc.self_speech.astype(int), 0]) == -1)]
    rows = []
    state = {m: {"k_on": RC.time_frame(T_START) - 1, "ei": 0, "seen": [], "mon": ([], -9.0), "locks": {r: Lock(r) for r in LOCKS}} for m in MODES}
    k2 = int(2.0 * FPS)
    for t in t_out:
        k = min(RC.time_frame(t), T - 1)
        tgt = int(sc.target[k]); par = int(sc.partner[k])
        truth_t = float(sc.az_head(sc.persons[tgt])[k]) if tgt >= 0 else None
        truth_p = float(sc.az_head(sc.persons[par])[k]) if par >= 0 else None
        vis_p = bool(abs(truth_p) <= sc.cfg["fov_half_deg"]) if par >= 0 else None
        selfsp = self_block(sc, k, 0.0)
        se = max([e for e in self_ends if e <= t], default=None)
        yaw, yaw_prev = float(yaw_imu[k]), float(yaw_imu[max(0, k - k2)])
        row = {"t": float(t), "tgt": tgt, "par": par, "truth_t": truth_t, "truth_p": truth_p, "vis_p": vis_p, "self": selfsp, "out": {}}
        for m in MODES:
            s = state[m]
            ev = lip_ev if m == "高帧率档常开" else ac_ev
            while s["ei"] < len(ev) and RC.frame_time(ev[s["ei"]][0]) <= t:
                s["k_on"] = ev[s["ei"]][1]; s["seen"].append(ev[s["ei"]]); s["ei"] += 1
            # 当前说话人（最近一次开口）的观测
            z_head = None
            if not selfsp:
                spec = RC.gevd_spec(Y, k, s["k_on"], ctx)
                if spec is not None:
                    if m == "高帧率档常开":
                        faces = faces_now(sc, k, rng, True)
                    elif m == "低帧率档":
                        faces, tm = s["mon"]
                        if t - tm >= 1.0 / MON_FPS:
                            faces = faces_now(sc, k, rng, False); s["mon"] = (faces, t)
                    else:
                        faces = []
                    z_head = M.fuse_soft(spec, grid, faces, **RA.SOFT) if faces else M.peak(spec, grid, 5.0)
            z_world = None if z_head is None else wrap(z_head + yaw)
            out = {"talker": z_head}
            for r, L in s["locks"].items():
                if m == "高帧率档常开" and r != "跟随" and L.az is not None:
                    own = new = None
                    if not selfsp:
                        faces_t = faces_now(sc, k, rng, True)
                        # 锁定对象本人：用他自己最近一次唇动开口作开口时刻，且他此刻唇动显示在说话
                        mine = [e for e in s["seen"] if angdiff(e[2], L.az) <= LOCK["same_deg"]]
                        talking = any(angdiff(wrap(fa + yaw), L.az) <= 8 and li > 0.5 for fa, li in faces_t)
                        if mine and talking:
                            sp = RC.gevd_spec(Y, k, mine[-1][1], ctx)
                            if sp is not None:
                                own = wrap(M.fuse_soft(sp, grid, faces_t, **RA.SOFT) + yaw)
                        # 别的人：锁定方向以外最近一次唇动开口
                        oth = [e for e in s["seen"] if angdiff(e[2], L.az) > LOCK["same_deg"]]
                        if oth:
                            sp = RC.gevd_spec(Y, k, oth[-1][1], ctx)
                            if sp is not None:
                                zn = wrap(M.fuse_soft(sp, grid, faces_t, **RA.SOFT) + yaw)
                                new = None if angdiff(zn, L.az) <= LOCK["same_deg"] else zn
                    L.update(t, own, new, se, yaw, yaw_prev)
                else:
                    L.update(t, None, z_world, se, yaw, yaw_prev)
                out[r] = None if L.az is None else float(wrap(L.az - yaw))
            row["out"][m] = out
        rows.append(row)
    sw = {m: {r: state[m]["locks"][r].switches for r in LOCKS} for m in MODES}
    return rows, sw, len(ac_ev)


def summarize(all_rows, all_sw, minutes):
    res = {}
    for m in MODES:
        r_m = {}
        # 当前说话人的测向（有人在和佩戴者说话、佩戴者没说话时）
        e = [angdiff(r["out"][m]["talker"], r["truth_t"]) if r["out"][m]["talker"] is not None else 180.0
             for r in all_rows if r["truth_t"] is not None and not r["self"]]
        r_m["测向：当前说话人 ≤10°（%）"] = round(float(np.mean(np.array(e) <= 10) * 100), 1)
        for L in LOCKS:
            def acc(sel):
                ee = [angdiff(r["out"][m][L], r["truth_p"]) if r["out"][m][L] is not None else 180.0 for r in all_rows if r["truth_p"] is not None and sel(r)]
                return (round(float(np.mean(np.array(ee) <= 10) * 100), 1), len(ee)) if ee else (None, 0)
            r_m[L] = {"锁定正确 ≤10°（%）：全部": acc(lambda r: True)[0],
                      "佩戴者说话时": acc(lambda r: r["self"])[0],
                      "对方在说话时": acc(lambda r: r["tgt"] >= 0 and not r["self"])[0],
                      "对话对象在视野外时": acc(lambda r: r["vis_p"] is False)[0],
                      "对话对象在视野外的样本数": acc(lambda r: r["vis_p"] is False)[1]}
            # 换人后锁定时间：真值对话对象改变后，第一次输出落在新对象 ±10° 内的时间
            lat, never = [], 0
            for rows in all_rows_by_scene:
                for i in range(1, len(rows)):
                    if rows[i]["par"] >= 0 and rows[i]["par"] != rows[i - 1]["par"] and rows[i - 1]["par"] >= 0:
                        hit = None
                        for r2 in rows[i:i + 40]:
                            if r2["par"] != rows[i]["par"]:
                                break
                            o = r2["out"][m][L]
                            if o is not None and angdiff(o, r2["truth_p"]) <= 10:
                                hit = r2["t"] - rows[i]["t"]; break
                        if hit is None:
                            never += 1
                        else:
                            lat.append(hit)
            r_m[L]["换人后锁定时间中位数（s）"] = round(float(np.median(lat)), 2) if lat else None
            r_m[L]["换人后锁定时间 90% 分位（s）"] = round(float(np.percentile(lat, 90)), 2) if lat else None
            r_m[L]["换人后到下一次换人前都没锁上（%）"] = round(100 * never / max(1, never + len(lat)), 1)
            r_m[L]["每分钟切换次数"] = round(sum(len(s[m][L]) for s in all_sw) / minutes, 1)
        res[m] = r_m
    return res


all_rows_by_scene = []


def main():
    global all_rows_by_scene
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=6)
    ap.add_argument("--seed", type=int, default=101)
    ap.add_argument("--thresh", type=float, default=3.5)
    ap.add_argument("--tag", default="dev")
    a = ap.parse_args()
    ctx = build_ctx()
    fm = (ctx["freqs"] >= 200) & (ctx["freqs"] <= 7000)
    grid = np.arange(-180, 180, 5.0)
    ctx.update({"fmask": fm, "grid": grid, "Hg": sphere_tf(azimuth_points(grid, 1.5), ctx["mics"], ctx["freqs"])})
    pick = lambda n, r: pick_segment(ctx["speech"], n, r)
    out = {"setup": {"n_per_kind": a.n, "seed": a.seed, "acoustic_onset_threshold_db": a.thresh, "lock": LOCK, "output_every_s": DT,
                     "imu_sigma_deg": IMU_SIGMA, "vision": RA.VIS, "soft_fusion": RA.SOFT, "monitor_fps": MON_FPS,
                     "head_model": "刚性球，2+1 阵列，5° 网格", "truth": "对话对象（scene.partner）"}}
    t0 = time.time()
    for kname, kcfg in KINDS.items():
        rng = np.random.default_rng(a.seed + (0 if kcfg["kind"] == "turns" else 1000))
        all_rows_by_scene = []; all_sw = []; n_ev = 0; rows_all = []
        for i in range(a.n):
            sc = SC.make_scene(rng, kcfg)
            Y, _ = SC.render(sc, ctx, rng, pick)
            rows, sw, ne = run_scene(sc, Y, ctx, rng, a.thresh)
            all_rows_by_scene.append(rows); rows_all += rows; all_sw.append(sw); n_ev += ne
            print(f"{kname} {i + 1}/{a.n} {time.time() - t0:.0f} s", flush=True)
        minutes = a.n * (60.0 - T_START) / 60
        out[kname] = {"结果": summarize(rows_all, all_sw, minutes), "声学开口事件每分钟": round(n_ev / minutes, 1)}
        print(json.dumps(out[kname], ensure_ascii=False, indent=1), flush=True)
    out["elapsed_s"] = round(time.time() - t0)
    with open(os.path.join(ROOT, "out", f"scene60_pipeline_{a.tag}.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
