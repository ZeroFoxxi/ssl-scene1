"""60 s 多人对话场景生成器（12 月仿真第 1 周）。

分两步：
  make_scene(rng, cfg)  只生成"剧本"与真值：每个人在世界坐标里的方位轨迹、每帧谁在说话、佩戴者转头（IMU 偏航角）、
                        佩戴者自己说话、此刻正在和佩戴者说话的人（锁定目标的真值）、人脸是否在摄像头视野内。
  render(scene, ctx, rng) 按头部模型把剧本渲染成各麦克风的 STFT（M, F, T）。头部模型通过 ctx["Htab"]（0–359°，1° 一格，
                        (360, M, F)）传入：现在是刚性球，换成实测头部传递函数时只换这张表。

场景类型（cfg["kind"]）：
  "turns"  对面几个人轮流和佩戴者说话（可有短暂抢话），旁桌持续说话；对应 mentor 情况 1 加上换人。
  "case2"  目标一直和佩戴者说话，另外两个人同时在互相说话；对应 mentor 情况 2。
说话人可以走动（一段时间内匀速改变方位），佩戴者会转头（常常转向新的说话人），也会自己回话。

标注：【设计】为本仿真自定的参数；数值范围见 DEFAULT。
"""
from dataclasses import dataclass, field
import numpy as np

from .sim import stft, render_source, diffuse_noise, NFFT, HOP

FS = 16000
FPS = FS / HOP

DEFAULT = {
    "kind": "turns",
    "duration_s": 60.0,
    "n_partners": 3,            # 对面和佩戴者交谈的人
    "partner_sep_deg": (20, 30),  # 相邻两人相隔【设计，mentor 11-23 两种情况】
    "partner_center_deg": (-15, 15),
    "partner_dist_m": (1.0, 2.0),
    "n_side": 2,                # 旁桌说话人
    "side_az_abs_deg": (60, 150),
    "side_dist_m": (2.5, 4.5),
    "side_sir_db": 6.0,         # 旁桌比对面说话人低多少 dB（按 1.5 m 处直达声）
    "utt_s": (1.5, 6.0),        # 一句话长度
    "gap_s": (-0.5, 1.0),       # 换人间隔，负数为抢话重叠
    "p_wearer_reply": 0.3,      # 一句话之后佩戴者回话的概率
    "reply_s": (1.0, 3.0),
    "self_gain_db": 10.0,       # 佩戴者自己说话比 1.5 m 处的对面说话人高多少 dB（近似）
    "p_turn_to_speaker": 0.5,   # 换人时佩戴者转头朝向新说话人的概率
    "turn_dur_s": 0.5,
    "n_walk": 1,                # 走动的说话人次数
    "walk_speed_dps": (10, 40),
    "walk_dur_s": (2.0, 4.0),
    "fov_half_deg": 70.0,       # 摄像头视野（头部坐标 ±70°，与 11 月各仿真的 VIS["fov"] 一致）【设计，待硬件确认】
    "case2_sir_db": 0.0,        # 情况 2：互相说话的两人相对目标的电平（0 = 一样响，-6 = 低 6 dB）
    "rt60": 0.5, "drr_db": 0.0, "snr_db": 10.0,
}


@dataclass
class Person:
    pid: int
    role: str                   # "partner" / "side"
    dist: float
    az_world: np.ndarray        # (T,) 世界坐标方位（°），0 = 佩戴者起始正前方，左正
    speaking: np.ndarray        # (T,) bool
    gain_db: float = 0.0        # 嗓音大小（dB，相对普通说话）；到耳机处的直达声电平 = gain_db − 20·log10(dist / 1.5 m)


@dataclass
class Scene:
    cfg: dict
    T: int
    tt: np.ndarray
    persons: list
    yaw: np.ndarray             # (T,) 佩戴者头部偏航角（°），IMU 真值
    self_speech: np.ndarray     # (T,) bool
    target: np.ndarray          # (T,) int：正在和佩戴者说话的人的 pid，-1 = 没有
    events: list = field(default_factory=list)
    partner: np.ndarray = None  # (T,) int：对话对象——最近一个和佩戴者说话的人，佩戴者回话、停顿时保持，直到换人；开场前为 -1

    def az_head(self, p):
        """某人在头部坐标里的方位（°，-180–180）。"""
        return wrap180(p.az_world - self.yaw)

    def visible(self, p):
        return np.abs(self.az_head(p)) <= self.cfg["fov_half_deg"]

    def lip_active(self, p):
        return self.visible(p) & p.speaking


def wrap180(a):
    return (np.asarray(a) + 180.0) % 360.0 - 180.0


def _frames(sec):
    return int(round(sec * FPS))


def _mark(arr, t0, t1, T):
    a, b = max(0, _frames(t0)), min(T, _frames(t1))
    if b > a:
        arr[a:b] = True
    return a, b


def make_scene(rng, cfg=None):
    cfg = {**DEFAULT, **({"n_walk": 0} if (cfg or {}).get("kind") == "case2" else {}), **(cfg or {})}
    dur = cfg["duration_s"]
    T = 1 + (int(dur * FS) - NFFT) // HOP
    tt = (np.arange(T) * HOP + NFFT / 2) / FS
    ev = []

    # 对面的人：围绕正前方排开，相邻相隔 20–30°
    n = cfg["n_partners"]
    seps = rng.uniform(*cfg["partner_sep_deg"], n - 1)
    az = np.concatenate([[0.0], np.cumsum(seps)])
    az = az - az.mean() + rng.uniform(*cfg["partner_center_deg"])
    persons = [Person(i, "partner", rng.uniform(*cfg["partner_dist_m"]), np.full(T, a), np.zeros(T, bool))
               for i, a in enumerate(az)]
    # 旁桌：左右两侧较远处
    for j in range(cfg["n_side"]):
        sgn = 1 if j % 2 == 0 else -1
        a = sgn * rng.uniform(*cfg["side_az_abs_deg"])
        d = rng.uniform(*cfg["side_dist_m"])
        # 旁桌在耳机处比 1.5 m 处的对面说话人低 side_sir_db（直达声），据此反推嗓音大小；混响尾按距离自然变化
        persons.append(Person(n + j, "side", d, np.full(T, a), np.zeros(T, bool), gain_db=-cfg["side_sir_db"] + 20 * np.log10(d / 1.5)))

    partners_w = [p for p in persons if p.role == "partner"]
    # 走动：对面某人在一段时间内匀速改变方位
    for _ in range(cfg["n_walk"]):
        p = partners_w[rng.integers(len(partners_w))]
        w = rng.uniform(*cfg["walk_speed_dps"]) * rng.choice([-1, 1])
        D = rng.uniform(*cfg["walk_dur_s"]); lo = min(5.0, 0.2 * dur)
        if dur - D - lo <= lo:
            continue
        t0 = rng.uniform(lo, dur - D - lo)
        a, b = _frames(t0), _frames(t0 + D)
        ramp = np.zeros(T); ramp[a:b] = w * (tt[a:b] - tt[a]); ramp[b:] = w * (tt[b - 1] - tt[a])
        p.az_world = np.clip(p.az_world + ramp, -60, 60)     # 走动限制在正前方 ±60° 内（仍是"对面"的人）【设计】
        ev.append({"t": round(t0, 2), "type": "走动", "pid": p.pid, "deg_per_s": round(float(w), 1), "dur": round(D, 2)})


    yaw = np.zeros(T)
    self_sp = np.zeros(T, bool)
    target = np.full(T, -1)

    def turn_head(t0, to_deg):
        a, b = _frames(t0), min(T, _frames(t0 + cfg["turn_dur_s"]))
        if a >= T:
            return
        start = yaw[a]
        if b > a:
            yaw[a:b] = start + (to_deg - start) * np.linspace(0, 1, b - a)
        yaw[b:] = to_deg
        ev.append({"t": round(t0, 2), "type": "转头", "to_deg": round(float(to_deg), 1)})

    partners = [p for p in persons if p.role == "partner"]
    t = rng.uniform(0.5, 1.5)
    if cfg["kind"] == "turns":
        cur = None
        while t < dur - 1.0:
            cand = [p for p in partners if p is not cur]
            p = cand[rng.integers(len(cand))]
            L = rng.uniform(*cfg["utt_s"])
            a, b = _mark(p.speaking, t, t + L, T)
            ev.append({"t": round(t, 2), "type": "开口", "pid": p.pid, "dur": round(L, 2)})
            # 锁定目标真值：抢话时上一位说完之前仍算上一位，之后算新的人
            tgt_free = target[a:b] == -1
            target[a:b][tgt_free] = p.pid
            if rng.random() < cfg["p_turn_to_speaker"]:
                turn_head(t + 0.3, p.az_world[min(a, T - 1)] * rng.uniform(0.5, 1.0))
            t_end = t + L
            if rng.random() < cfg["p_wearer_reply"] and t_end < dur - 2:
                R = rng.uniform(*cfg["reply_s"])
                t_r = t_end + rng.uniform(0.2, 0.6)
                _mark(self_sp, t_r, t_r + R, T)
                ev.append({"t": round(t_r, 2), "type": "佩戴者回话", "dur": round(R, 2)})
                t_end = t_r + R
            cur = p
            t = t_end + rng.uniform(*cfg["gap_s"])
    elif cfg["kind"] == "case2":
        tgt = partners[len(partners) // 2]
        others = [p for p in partners if p is not tgt]
        while t < dur - 1.0:      # 目标和佩戴者一问一答
            L = rng.uniform(*cfg["utt_s"])
            a, b = _mark(tgt.speaking, t, t + L, T)
            target[a:b] = tgt.pid
            ev.append({"t": round(t, 2), "type": "开口", "pid": tgt.pid, "dur": round(L, 2)})
            t_end = t + L
            if rng.random() < 0.6 and t_end < dur - 2:
                R = rng.uniform(*cfg["reply_s"]); t_r = t_end + rng.uniform(0.2, 0.6)
                _mark(self_sp, t_r, t_r + R, T); t_end = t_r + R
                ev.append({"t": round(t_r, 2), "type": "佩戴者回话", "dur": round(R, 2)})
            t = t_end + rng.uniform(0.2, 1.0)
        t = rng.uniform(0.0, 1.0); k = 0
        while t < dur - 1.0:      # 另外两人互相说话，轮流
            p = others[k % 2]; L = rng.uniform(*cfg["utt_s"])
            _mark(p.speaking, t, t + L, T); ev.append({"t": round(t, 2), "type": "旁人互相说话", "pid": p.pid, "dur": round(L, 2)})
            t += L + rng.uniform(*cfg["gap_s"]); k += 1
        for p in others:   # 在耳机处与目标的直达声电平差 = case2_sir_db（"一样响"指到耳机处一样响）
            p.gain_db = cfg["case2_sir_db"] + 20 * np.log10(p.dist / tgt.dist)
    else:
        raise ValueError(cfg["kind"])

    # 旁桌：持续说话，句间停顿 0.3–1.5 s
    for p in persons:
        if p.role != "side":
            continue
        t = rng.uniform(0, 2)
        while t < dur:
            L = rng.uniform(2.0, 8.0); _mark(p.speaking, t, t + L, T); t += L + rng.uniform(0.3, 1.5)

    ev.sort(key=lambda e: e["t"])
    partner = target.copy()
    for i in range(1, T):
        if partner[i] < 0:
            partner[i] = partner[i - 1]
    return Scene(cfg, T, tt, persons, yaw, self_sp, target, ev, partner)


def _render_track(S, az_head, gain, Htab, H_diff, rng, rt60, drr):
    """逐帧按头部坐标方位取直达声传递函数（1° 表）；混响尾按扩散场近似（与方向无关）。"""
    idx = np.round(wrap180(az_head)).astype(int) % 360
    direct = np.transpose(Htab[idx], (1, 2, 0)) * S[None]
    H0 = Htab[0]
    full0 = render_source(S, H0, H_diff, rng, rt60, drr)
    tail = full0 - H0[:, :, None] * S[None]
    return (direct + tail) * 10 ** (gain / 20)


def render(scene, ctx, rng, speech_pick):
    """speech_pick(n_samples, rng) -> 一段语音波形。返回 (Y (M,F,T), 各声源单独的 STFT dict, 参考电平)。"""
    cfg = scene.cfg
    n_tot = (scene.T - 1) * HOP + NFFT
    Htab, H_diff = ctx["Htab"], ctx["H_diff"]
    M, F = Htab.shape[1], Htab.shape[2]
    Y = np.zeros((M, F, scene.T), complex)
    parts = {}
    ref = None
    for p in scene.persons:
        x = np.zeros(n_tot)
        on = np.flatnonzero(np.diff(np.r_[0, p.speaking.astype(int), 0]) != 0).reshape(-1, 2)
        for a, b in on:   # 每句话取一段新的语音
            s0, s1 = a * HOP, min(n_tot, b * HOP + NFFT)
            x[s0:s1] = speech_pick(s1 - s0, rng)
        S = stft(x)[:, : scene.T]
        act = np.abs(S).sum(0) > 0
        if not act.any():                 # 整段没说话（短场景里可能出现）
            parts[p.pid] = np.zeros((M, F, scene.T), complex)
            continue
        p_ref = np.mean(np.abs(Htab[0][:, :, None] * S[None][:, :, act]) ** 2)
        S = S / np.sqrt(p_ref)            # 每个人先归一到 1.5 m 正前方同一电平
        dist_db = -20 * np.log10(p.dist / 1.5)
        drr = cfg["drr_db"] + dist_db     # 越远直达声越弱，混响尾不变
        y = _render_track(S, scene.az_head(p), p.gain_db + dist_db, Htab, H_diff, rng, cfg["rt60"], drr)
        parts[p.pid] = y; Y += y
    if scene.self_speech.any():
        x = np.zeros(n_tot)
        on = np.flatnonzero(np.diff(np.r_[0, scene.self_speech.astype(int), 0]) != 0).reshape(-1, 2)
        for a, b in on:
            s0, s1 = a * HOP, min(n_tot, b * HOP + NFFT); x[s0:s1] = speech_pick(s1 - s0, rng)
        S = stft(x)[:, : scene.T]; act = np.abs(S).sum(0) > 0
        Hs = ctx["H_self"]
        S = S / np.sqrt(np.mean(np.abs(Hs[:, :, None] * S[None][:, :, act]) ** 2))
        y = Hs[:, :, None] * S[None] * 10 ** (cfg["self_gain_db"] / 20)
        parts["self"] = y; Y += y
    noise = diffuse_noise(H_diff, scene.T, rng, ctx["psd"])
    noise *= np.sqrt(10 ** (-cfg["snr_db"] / 10) / np.mean(np.abs(noise) ** 2))   # 相对 1.5 m 正前方说话人直达声
    parts["noise"] = noise; Y += noise
    return Y, parts


def summary(scene):
    """场景统计，用来核对剧本是否合理。"""
    d = {"时长_s": scene.cfg["duration_s"], "类型": scene.cfg["kind"]}
    tgt_on = scene.target >= 0
    d["有目标的时间占比"] = round(float(tgt_on.mean()), 3)
    seg = [int(v) for i, v in enumerate(scene.target) if v >= 0 and (i == 0 or scene.target[i - 1] != v)]
    d["目标开口次数"] = len(seg)
    d["换人次数"] = int(sum(1 for a, b in zip(seg[:-1], seg[1:]) if a != b))
    d["佩戴者说话占比"] = round(float(scene.self_speech.mean()), 3)
    over = np.zeros(scene.T, int)
    for p in scene.persons:
        if p.role == "partner":
            over += p.speaking
    d["对面两人以上同时说话占比"] = round(float((over >= 2).mean()), 3)
    tv = np.zeros(scene.T, bool)
    for p in scene.persons:
        tv |= (scene.target == p.pid) & scene.visible(p)
    d["目标在视野内的占比（有目标时）"] = round(float(tv[tgt_on].mean()), 3) if tgt_on.any() else None
    d["有对话对象的时间占比"] = round(float((scene.partner >= 0).mean()), 3)
    d["最大转头_deg"] = round(float(np.max(np.abs(scene.yaw))), 1)
    lv = [p.gain_db - 20 * np.log10(p.dist / 1.5) for p in scene.persons if p.role == "side"]
    d["旁桌到耳机处直达声电平_dB（设计值）"] = round(float(np.mean(lv)), 2) if lv else None
    d["事件数"] = len(scene.events)
    return d
