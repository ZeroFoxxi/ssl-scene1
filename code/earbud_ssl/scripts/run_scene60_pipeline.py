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
LOCKS = ["跟随", "防抖", "对话组", "对话组+朝向"]
FACING_ERR = 0.15     # 视觉判断"脸朝向佩戴者"的判错率（每 0.25 s 一块）【设计，待视觉同事确认能否提供】
LOCK = {"same_deg": 12.0, "switch_s": 2.0, "reply_window_s": 1.5, "reply_min_s": 0.5, "track_gain": 0.3, "confirm_n": 1}
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


def lip_gated_spec(Y, k, open_mask, self_mask, ctx, win_s=1.0, bg_s=3.0):
    """唇动门控的 GEVD-MUSIC（设计 7.3 第 3 步）：目标 = 最近 win_s 内目标嘴张着的帧（起始段加权）；
    背景 = 最近 bg_s 内目标嘴闭着、佩戴者也没说话的帧。帧数不够时返回 None。"""
    fm = ctx["fmask"]
    a_s, a_b = max(0, k - int(win_s * FPS)), max(0, k - int(bg_s * FPS))
    ks = np.arange(a_s, k)[open_mask[a_s:k]]
    kb = np.arange(a_b, k)[(~open_mask[a_b:k]) & (~self_mask[a_b:k])]
    if len(ks) < int(0.1 * FPS) or len(kb) < int(0.3 * FPS):
        return None
    Yd = Y[:, :, ks]
    e = M.frame_energy_db(Yd, fm)
    return M.music(M.covariance(Yd, fm, M.onset_weights(e, e.max() - 30)), ctx["Hg"], fm, M.covariance(Y[:, :, kb], fm, np.ones(len(kb))))


def lip_open_mask(sc, az_world, k, yaw_imu, rng, cache):
    """锁定方向上那张脸的唇动（嘴张着 = 在说话），按 0.25 s 一块加入 10% 判错；用方向找最近的人（模拟人脸编号的身份延续）。"""
    best = min(sc.persons, key=lambda p: angdiff(float(p.az_world[k]), az_world))
    if angdiff(float(best.az_world[k]), az_world) > LOCK["same_deg"]:
        return None
    if best.pid not in cache:
        sp = best.speaking.copy()
        nb = int(np.ceil(sc.T / int(round(DT * FPS))))
        flip = np.repeat(rng.random(nb) < RA.VIS["lip_err"], int(round(DT * FPS)))[: sc.T]
        vis = np.abs(sc.az_head(best)) <= sc.cfg["fov_half_deg"]
        cache[best.pid] = (sp ^ flip) & vis
    return cache[best.pid]


def facing_truth(sc, p):
    """剧本真值：此人每帧是否脸朝佩戴者。说话时朝向他说话的对象（轮流说话：佩戴者；情况 2：目标朝佩戴者，另外两人互相看）；
    听的时候朝向正在说话的人（佩戴者在说时朝佩戴者）。旁桌不朝佩戴者。"""
    if p.role != "partner":
        return np.zeros(sc.T, bool)
    talks_to_me = sc.cfg["kind"] == "turns" or bool(np.any(sc.target == p.pid))
    return (p.speaking & talks_to_me) | (~p.speaking & sc.self_speech & talks_to_me)


def facing_me(sc, az_world, k, rng, cache):
    """视觉的"脸朝向佩戴者"判断：最近 1 s 里至少四分之三的时间朝向（每 0.25 s 一块，判错率 FACING_ERR）。"""
    best = min(sc.persons, key=lambda p: angdiff(float(p.az_world[k]), az_world))
    if angdiff(float(best.az_world[k]), az_world) > LOCK["same_deg"] or abs(sc.az_head(best)[k]) > sc.cfg["fov_half_deg"]:
        return None
    if best.pid not in cache:
        blk = int(round(DT * FPS)); nb = int(np.ceil(sc.T / blk))
        flip = np.repeat(rng.random(nb) < FACING_ERR, blk)[: sc.T]
        cache[best.pid] = facing_truth(sc, best) ^ flip
    return bool(cache[best.pid][max(0, k - int(1.0 * FPS)):k + 1].mean() >= 0.75)


def lip_talking(om, k):
    """嘴"正在张合"：最近 0.75 s（三块唇动）里至少三分之二的时间嘴张着；单块判错（10%）不会通过。"""
    return om is not None and om[max(0, k - int(0.75 * FPS)):k + 1].mean() >= 0.6


def face_peak(spec, grid, face_head, width=10.0, min_rel=0.5):
    """已知是哪张脸时：只在这张脸方位 ±width 内找空间谱的峰；峰值不到全局峰值的 min_rel 倍时认为这张脸方向没有明显声源，返回 None。"""
    d = np.abs(wrap(grid - face_head))
    win = d <= width
    if not win.any():
        return None
    i = np.flatnonzero(win)[np.argmax(spec[win])]
    n = len(spec)
    if spec[i] < min_rel * spec.max() or spec[i] < spec[(i - 1) % n] or spec[i] < spec[(i + 1) % n]:
        return None          # 窗内最大值不是局部峰（真正的峰在窗外，只是坡上的点）或太弱
    return float(grid[i])


class Lock:
    """锁定规则；方位都在世界坐标里。
    跟随：锁定 = 当前说话人的估计。
    防抖（第 8.1 节）：另一方向的人连续说满 2 s、且原目标这段时间没说话才切换；佩戴者说完 1.5 s 内开口并说满 0.5 s 的人视为回应，立即切换。
    对话组（新增【设计】）：记住"在和佩戴者交谈的人"（组员，计分）。组员说话时立即对准他；入组 / 加分条件：
        回应：佩戴者说完后第一个接话（1.5 s 内开口、说满 0.5 s）的人，且佩戴者说话时他没在说（高帧率档看唇动）；
        看向：佩戴者 2 s 内转头超过 10°，且此人在正前方 ±10° 内说满 1 s；
        冷场：另一方向的人连续说满 2 s、这期间组员都没说话（得分减半）。
      每段自语音结束后结算：期间一半以上时间唇动显示还在说的组员扣 1 分（在和别人说话），得分 ≤ 0 不再算组员。场景开头先跟第一个说话的人（临时组员）。"""
    def __init__(self, rule):
        self.rule = rule; self.az = None; self.cands = []; self.last_lock_obs = -9.0
        self.group = rule.startswith("对话组"); self.use_facing = rule == "对话组+朝向"
        self.members = []; self.switches = []
        self.first_after = {}; self.talked_over = {}; self.self_steps = {}; self.settled = set(); self.last_member_talk = -9.0

    def _join(self, t, az, score):
        for m in self.members:
            if angdiff(m["az"], az) <= LOCK["same_deg"]:
                m["score"] += score; m["az"] = az
                break
        else:
            self.members.append({"az": az, "score": score})
        self._set(t, az); self.last_member_talk = t

    def talking_during_self(self, self_start_key, az, t=None):
        """高帧率档：佩戴者说话时唇动显示在说的人——先记下来，这段自语音结束后统一结算（settle）。"""
        self.talked_over.setdefault(self_start_key, []).append(az)

    def settle(self, t, se):
        """一段自语音结束后结算一次：期间一半以上时间被看到在说的组员扣 1 分（他在和别人说话）；
        锁定对象出组时改锁分数最高的组员。偶发的唇动判错不扣分。"""
        if se is None or se in self.settled:
            return
        self.settled.add(se)
        n_steps = self.self_steps.get(se, 0)
        over = self.talked_over.get(se, [])
        for m in self.members:
            n = sum(1 for a in over if angdiff(m["az"], a) <= LOCK["same_deg"])
            if n >= max(2, 0.5 * n_steps):
                m["score"] -= 1.0
        if self.az is not None and not any(angdiff(m["az"], self.az) <= LOCK["same_deg"] and m["score"] > 0 for m in self.members):
            valid = [x for x in self.members if x["score"] > 0]
            if valid:
                self._set(t, max(valid, key=lambda x: x["score"])["az"])

    def _set(self, t, az):
        if self.az is not None and angdiff(az, self.az) > LOCK["same_deg"]:
            self.switches.append(t)
        self.az = az; self.last_lock_obs = t
        self.cands = [c for c in self.cands if angdiff(c["az"], az) > LOCK["same_deg"]]

    def _track(self, t, z):
        old = self.az
        self.az = wrap(self.az + LOCK["track_gain"] * wrap(z - self.az)); self.last_lock_obs = t
        for m in self.members:
            if angdiff(m["az"], old) <= LOCK["same_deg"]:
                m["az"] = self.az; self.last_member_talk = t

    def update(self, t, own, new, self_end, yaw=0.0, yaw_prev=0.0, facing=None):
        """own：按锁定对象本人开口时刻测得的观测（高帧率档才有）；new：当前（或新开口的人）的观测。"""
        same = LOCK["same_deg"]
        if self.group and self_end is not None and t > self_end:
            self.settle(t, self_end)
        if own is not None and self.az is not None and angdiff(own, self.az) <= same:
            self._track(t, own)
        news = [] if new is None else (list(new) if isinstance(new, (list, tuple)) else [new])
        fac = facing if facing is not None else [None] * len(news)
        for z, f in zip(news, fac):
            self._obs(t, z, self_end, yaw, yaw_prev, f)

    def _obs(self, t, z, self_end, yaw, yaw_prev, facing=None):
        same = LOCK["same_deg"]
        if self.rule == "跟随" and self.az is not None and angdiff(z, self.az) > same and LOCK["confirm_n"] > 1:
            pend = getattr(self, "pend", None)
            if pend is not None and angdiff(z, pend[0]) <= same:
                self.pend = (z, pend[1] + 1)
            else:
                self.pend = (z, 1)
            if self.pend[1] < LOCK["confirm_n"]:
                return
            self.pend = None
        if self.az is None and self.rule != "跟随" and abs(wrap(z - yaw)) > 30:
            return            # 开场引导只接受正前方 ±30° 内的人（设计 8.1），旁桌开口不当成对话对象
        if self.az is None and self.use_facing and facing is False:
            return            # 有朝向信息时：开场只跟朝向佩戴者说话的人
        if self.rule == "跟随" or self.az is None:
            self._set(t, z)
            if self.group and not self.members:
                self.members.append({"az": z, "score": 0.5})     # 场景开头：先跟第一个说话的人（临时组员）
                self.last_member_talk = t
            return
        lock_valid = (not self.group or not self.members or
                      any(angdiff(m["az"], self.az) <= same and m["score"] > 0 for m in self.members))
        if angdiff(z, self.az) <= same and lock_valid:
            self._track(t, z)
            return
        if self.group:
            near = [m for m in self.members if angdiff(m["az"], z) <= same and m["score"] > 0]
            if near and self.use_facing and facing is False:
                near = []           # 组员此刻明确没朝向佩戴者（在和别人说话）：不切过去
            if near:
                m = near[0]
                if LOCK["confirm_n"] > 1:
                    pend = getattr(self, "pend", None)
                    self.pend = (m["az"], pend[1] + 1) if pend is not None and angdiff(pend[0], m["az"]) <= same else (m["az"], 1)
                    if self.pend[1] < LOCK["confirm_n"]:
                        return
                    self.pend = None
                m["az"] = wrap(m["az"] + LOCK["track_gain"] * wrap(z - m["az"]))
                self._set(t, m["az"]); self.last_member_talk = t
                return
        self.cands = [c for c in self.cands if t - c["last"] <= 1.0]     # 候选超过 1 s 没有新观测：丢掉
        c = next((c for c in self.cands if angdiff(z, c["az"]) <= same), None)
        if c is not None:
            if c["last"] != t:
                c["dur"] += DT
            c["az"] = wrap(c["az"] + 0.5 * wrap(z - c["az"])); c["last"] = t
        else:
            c = {"az": z, "start": t, "dur": DT, "last": t}; self.cands.append(c)
        reply = self_end is not None and 0 <= c["start"] - self_end <= LOCK["reply_window_s"] and c["dur"] >= LOCK["reply_min_s"]
        if self.group:
            # 回应：佩戴者说完后第一个接话的人，且佩戴者说话时他没在说（高帧率档看唇动；纯声学 / 低帧率档没有这条信息）
            first = self_end is not None and self.first_after.get(self_end) in (None, c["start"])
            n_over = sum(1 for a in self.talked_over.get(self_end, []) if angdiff(c["az"], a) <= same)
            n_steps = self.self_steps.get(self_end, 0)
            if reply and first and n_over < max(2, 0.5 * n_steps):   # 佩戴者说话期间一半以上时间被看到在说才排除（唇动有 10% 判错）
                self.first_after[self_end] = c["start"]
                self._join(t, c["az"], 1.0)
                return
            if self.use_facing and facing and c["dur"] >= LOCK["reply_min_s"]:
                self._join(t, c["az"], 1.0)      # 面向佩戴者说话满 0.5 s：在跟佩戴者说话
                return
            look = abs(wrap(yaw - yaw_prev)) > 10 and abs(wrap(c["az"] - yaw)) <= 10 and c["dur"] >= 1.0
            lapse = c["dur"] >= LOCK["switch_s"] and self.last_member_talk < c["start"]   # 候选连续说满 2 s、这期间组员都没说话
            if look or lapse:
                self._join(t, c["az"], 1.0 if look else 0.5)
            return
        long_ = c["dur"] >= LOCK["switch_s"] and self.last_lock_obs < c["start"]
        if reply or long_:
            self._set(t, c["az"])


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
                if True:   # 唇动看的是别人的嘴，不受佩戴者自己说话影响（声学开口才需要排除自语音）
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
        n_other = sum(1 for p in sc.persons if p.role == "partner" and p.pid != par and p.speaking[k])
        row = {"t": float(t), "tgt": tgt, "par": par, "truth_t": truth_t, "truth_p": truth_p, "vis_p": vis_p, "self": selfsp,
               "n_other": n_other, "after_first_reply": bool(self_ends) and t > self_ends[0], "out": {}}
        if selfsp:
            # 本段自语音结束的时刻（作为键）
            nxt = min([e for e in self_ends if e >= t], default=None)
            if nxt is not None:
                fs_ = faces_now(sc, k, rng, True)
                for gname in ("对话组", "对话组+朝向"):
                    Lg = state["高帧率档常开"]["locks"][gname]; Lg.self_steps[nxt] = Lg.self_steps.get(nxt, 0) + 1
                    for fa, li in fs_:
                        if li > 0.5:
                            Lg.talking_during_self(nxt, wrap(fa + yaw), t)
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
                        om = lip_open_mask(sc, L.az, k, yaw_imu, rng, s.setdefault("lipcache", {}))
                        talking = lip_talking(om, k)     # 锁定对象还在说
                        if talking:
                            sp = lip_gated_spec(Y, k, om, sc.self_speech, ctx) if om is not None else None
                            if sp is None:   # 门控帧不够时退回按开口时刻
                                mine = [e for e in s["seen"] if angdiff(e[2], L.az) <= LOCK["same_deg"]]
                                sp = RC.gevd_spec(Y, k, mine[-1][1], ctx) if mine else None
                            if sp is not None:
                                zp = face_peak(sp, grid, wrap(L.az - yaw))
                                own = None if zp is None else wrap(zp + yaw)
                        # 别的人：最近 8 s 内开过口、此刻嘴在张合、不在锁定方向的每张脸，各给一个观测
                        new = []; done = []; fac = []
                        for e in reversed(s["seen"]):
                            if RC.frame_time(e[0]) < t - 8.0:
                                break
                            if angdiff(e[2], L.az) <= LOCK["same_deg"] or any(angdiff(e[2], d) <= LOCK["same_deg"] for d in done):
                                continue
                            done.append(e[2])
                            om = lip_open_mask(sc, e[2], k, yaw_imu, rng, s.setdefault("lipcache", {}))
                            if not lip_talking(om, k):
                                continue
                            sp = lip_gated_spec(Y, k, om, sc.self_speech, ctx)
                            if sp is None:
                                sp = RC.gevd_spec(Y, k, e[1], ctx)
                            if sp is None:
                                continue
                            zp = face_peak(sp, grid, wrap(e[2] - yaw))
                            if zp is not None and angdiff(wrap(zp + yaw), L.az) > LOCK["same_deg"]:
                                new.append(wrap(zp + yaw))
                                fac.append(facing_me(sc, e[2], k, rng, s.setdefault("facecache", {})))
                    L.update(t, own, new, se, yaw, yaw_prev, facing=fac if (L.use_facing and not selfsp) else None)
                else:
                    f0 = None
                    if m == "高帧率档常开" and L.use_facing and z_world is not None:
                        f0 = [facing_me(sc, z_world, k, rng, s.setdefault("facecache", {}))]
                    L.update(t, None, z_world, se, yaw, yaw_prev, facing=f0)
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
                      "对话对象在视野外的样本数": acc(lambda r: r["vis_p"] is False)[1],
                      "佩戴者第一次回话之后": acc(lambda r: r["after_first_reply"])[0],
                      "对话对象说话时另有对面的人也在说": acc(lambda r: r["tgt"] >= 0 and not r["self"] and r["n_other"] > 0)[0]}
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
    ap.add_argument("--only", choices=["turns", "case2"], help="只跑一类场景（便于两类并行）")
    ap.add_argument("--confirm", type=int, default=2, help="换到新方向前要求连续几次观测一致（跟随、对话组）")
    a = ap.parse_args()
    LOCK["confirm_n"] = a.confirm
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
        if a.only and kcfg["kind"] != a.only:
            continue
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
