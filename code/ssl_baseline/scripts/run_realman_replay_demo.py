# -*- coding: utf-8 -*-
"""实录回放 demo：用 RealMAN 真实录音拼成连续会议，跑完整的转向流程（检测换人 → 测向 → 置信度判断 → 云台转向）。

数据（6 麦线阵 3 cm，与真实录音验证相同；CC BY 4.0）：
  --split val ：验证集 Auditorium 场景（没参与训练与微调，只用来挑置信度门限）；
  --split test：测试集 5 个室内场景（Classroom2、LivingRoom2、OfficeLobby、OfficeRoom3、OfficeRoom4），只评测一次。
会议（每段 60 s，同一场景内拼接）：
  - 每轮发言最长 8 s：静止说话人取同一位置的 1–3 句真实话语（句间停顿 0.2–0.6 s，不应转动），凑到 3–7 s；
    约 30% 的轮次是走动的说话人（一条走动话语，真值用官方逐 0.1 s 轨迹）；下一轮换到方位相差 ≥15° 的位置；
  - 30% 的换人为抢话（重叠 0.5 s），其余停顿 0.2–0.8 s；没有话语的时段用该场景真实背景噪声填补（同 build_realman_test.py）。
  - 没有远端喇叭（RealMAN 没有），所以"远端冻结"不起作用。
转向流程与 run_meeting_closed_loop.py 完全相同（每 0.1 s 一块；静音后起始或方向变化触发；开口后 0.5 s 判决；
  1.0 s 再判一次，小网络取 0.5 s 输入，等同于不微调；云台 120°/s）；小网络可加置信度门限（低于门限不转）。
指标：
  - 换人后对准用时（中位数）、2 s 内对准的比例：只统计需要转动的换人（新说话人与上一位方位相差 ≥15°）；
  - 误转次数 / 分钟：转向目标偏离当时说话人 >15°（无人说话时，与 1 s 内刚说完的人比较）；
  - 发言时间中对准的比例（误差 ≤10°）：全部、静止说话人、走动说话人分开统计；
  - 诊断：去掉每轮开头 1.5 s（转向过程）后的对准比例（*_late），用来区分"转得慢"与"跟不住"；
  - 走动说话人另给误差 ≤20° 的比例（转向逻辑是"偏离 >15° 才重新转"，不是连续跟随；画面通常比 ±20° 宽）与平均误差。
置信度门限：沿用仿真验证会议上选定的 0.7，不在实录上调（验证集只有 Auditorium 没参与训练，且其中前方只有 1 个静止位置，不足以挑参数）。
运行：python scripts/run_realman_replay_demo.py --split val --meetings 6            （检查流程）
      python scripts/run_realman_replay_demo.py --split test --meetings 6 --examples 1
输出：out/realman_replay_<split><tag>.json / .csv；--examples N 时把每个场景前 N 段会议的曲线数据存到 out/demo/
"""
import argparse, csv, glob, json, os, sys, time
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import build_realman_test as B
from run_meeting_closed_loop import closed_loop, band_energy_blocks, DT
from gen_meeting_train_data import ARRAYS
from ssl_baseline import metrics
from ssl_baseline.geometry import aliasing_frequency
from ssl_baseline.wake import WakeDOA, WakeDOAConfig
from ssl_baseline.doa import SRPConfig

FS = 16000
DUR = 60.0
FRONT = ((85.0, 275.0),)
AIM_DEG = 10.0
XY = ARRAYS["lin6_3cm"]
SPLITS = {"val": ("realman_val", "val", ["Auditorium"]), "test": ("realman", "test", None),
          "val3": ("realman_val", "val", ["LivingRoom6", "LivingRoom8", "OfficeRoom1"])}   # val3 参与了微调：只用于诊断仿真训练的小网络与传统方法
MODELS = {"小网络（仿真训练）": "crnn_general_lin6_3cm.pt", "小网络（+实录微调）": "crnn_lin6_3cm_ft.pt",
          "小网络（+实录微调+纯噪声）": "crnn_lin6_3cm_ft_noise.pt",                    # 见 finetune_doa_net_noise.py（11-21）
          "小网络（+实录微调+有人判断）": "crnn_lin6_3cm_ft_vad.pt"}                     # 见 finetune_doa_net_vad.py（11-21），有人门限取自其 .json


# ---------------- 数据 ----------------
def load_labels(W, prefix):
    lab = {}
    for kind in ["static", "moving"]:
        for r in csv.DictReader(open(os.path.join(W, f"{prefix}_{kind}_source_location.csv"))):
            a = np.array([B.fold(90.0 - float(v)) for v in r["angle(°)"].split(",")])
            lab[os.path.basename(r["filename"])] = (kind, a)
    return lab


def scene_utts(W, sc, lab):
    utts = []
    for f in sorted(glob.glob(os.path.join(W, sc, "*", "*", "*_CH0.flac"))):
        k = os.path.basename(f).replace("_CH0", "")
        if k in lab and np.all(np.abs(lab[k][1]) <= 80):
            utts.append({"f": f, "kind": lab[k][0], "traj": lab[k][1], "name": k})
    return utts


class Cache:
    def __init__(self):
        self.d = {}

    def __call__(self, f):
        if f not in self.d:
            self.d[f] = B.load(f)
        return self.d[f]


def traj_at(turn, t):
    """说话人 turn 在绝对时刻 t 的方位（静止为常数；走动按 0.1 s 轨迹取最近点）。"""
    tr = turn["traj"]
    return float(tr[int(np.clip((t - turn["start"]) / 0.1, 0, len(tr) - 1))])


def build_meeting(rng, utts, bank, load, max_turn=8.0):
    """一轮发言：静止说话人 = 同一位置的 1–3 句真实话语（句间停顿 0.2–0.6 s），凑到 3–7 s；走动说话人 = 一条走动话语。
    每轮最长 8 s。下一轮的起始方位与上一轮结束方位相差 ≥15°（场景里找不到时放宽）。"""
    n = int(DUR * FS)
    x = np.zeros((XY.shape[1], n)); cov = np.zeros(n, bool)
    static = [u for u in utts if u["kind"] == "static"]; moving = [u for u in utts if u["kind"] == "moving"]
    turns, t, prev = [], 1.0, None
    while t < DUR - 2.0:
        prev_az = traj_at(prev, prev["end"]) if prev else 0.0
        use_mov = bool(moving) and (not static or rng.random() < 0.3)
        pool = moving if use_mov else static
        cands = [u for u in pool if abs(u["traj"][0] - prev_az) >= 15] or pool
        u = cands[rng.integers(len(cands))]
        i0 = int(t * FS); cap = min(int(max_turn * FS), n - i0)
        if use_mov:
            xa = load(u["f"]); L = min(xa.shape[1], cap)
            x[:, i0:i0 + L] += xa[:, :L]; cov[i0:i0 + L] = True
            traj = u["traj"][: int(np.ceil(L / FS / 0.1)) + 1]; names = [u["name"]]; segs = [(t, t + L / FS)]
        else:
            target = int(rng.uniform(3.0, 7.0) * FS)
            same = [v for v in static if abs(v["traj"][0] - u["traj"][0]) < 3]
            order = [same[j] for j in rng.permutation(len(same))]
            pos, names, segs = 0, [], []
            for v in order[:3]:
                xa = load(v["f"]); L = min(xa.shape[1], cap - pos)
                if L <= 0:
                    break
                x[:, i0 + pos: i0 + pos + L] += xa[:, :L]; cov[i0 + pos: i0 + pos + L] = True
                segs.append((t + pos / FS, t + (pos + L) / FS)); pos += L; names.append(v["name"])
                if pos >= target:
                    break
                pos += int(rng.uniform(0.2, 0.6) * FS)                       # 句间停顿
            L = min(pos, cap); traj = np.array([u["traj"][0]])
        turn = {"name": "+".join(names), "kind": "moving" if use_mov else "static", "start": t, "end": t + L / FS, "traj": traj, "segs": segs}
        turns.append(turn); prev = turn
        t = turn["end"] - 0.5 if (rng.random() < 0.3 and L / FS > 1.5) else turn["end"] + rng.uniform(0.2, 0.8)
    d = np.diff(np.r_[0, (~cov).astype(int), 0]); st, en = np.where(d == 1)[0], np.where(d == -1)[0]
    for a, b in zip(st, en):
        B.fill(x, bank, a, b, rng)
    return x, turns


# ---------------- 评测 ----------------
def truth_blocks(turns, nb):
    tb = (np.arange(nb) + 1) * DT
    holder = np.full(nb, -1); az = np.full(nb, np.nan)
    for k, tr in enumerate(turns):                                           # 后开始的覆盖前面的（抢话时新发言人取得发言权）
        sel = (tb >= tr["start"]) & (tb < tr["end"])
        holder[sel] = k
    for i in np.where(holder >= 0)[0]:
        az[i] = traj_at(turns[holder[i]], tb[i])
    return tb, holder, az


def evaluate(pans, cmds, turns):
    nb = len(pans); tb, holder, az = truth_blocks(turns, nb)
    lat, ok2 = [], []
    for k, tr in enumerate(turns):
        before = traj_at(turns[k - 1], tr["start"]) if k > 0 else 0.0
        if metrics.angdiff(tr["traj"][0], before) < 15:
            continue                                                         # 不需要转动
        idx = [i for i in np.where((tb >= tr["start"]) & (tb < tr["end"]))[0] if metrics.angdiff(pans[i], traj_at(tr, tb[i])) <= AIM_DEG]
        l = tb[idx[0]] - tr["start"] if idx else np.inf
        lat.append(l); ok2.append(l <= 2.0)
    wrong = 0
    for t, a in cmds:
        i = min(nb - 1, int(round(t / DT)) - 1)
        h = holder[i]
        if h < 0:                                                            # 无人说话：与 1 s 内刚说完的人比较
            recent = [k for k, tr in enumerate(turns) if tr["end"] <= t <= tr["end"] + 1.0]
            h = recent[-1] if recent else -1
        if h < 0 or metrics.angdiff(a, traj_at(turns[h], t)) > 15:
            wrong += 1
    act = holder >= 0
    err = np.where(act, metrics.angdiff(pans, np.nan_to_num(az)), np.nan)
    mov = act & np.array([turns[h]["kind"] == "moving" if h >= 0 else False for h in holder])
    sta = act & ~mov
    late = act & np.array([tb[i] - turns[h]["start"] >= 1.5 if h >= 0 else False for i, h in enumerate(holder)])   # 每轮开头 1.5 s 之后
    lat = np.array(lat)
    return {"latency_median_s": float(np.median(lat[np.isfinite(lat)])) if np.isfinite(lat).any() else None,
            "aim_within_2s": float(np.mean(ok2)) if ok2 else None, "n_switch": len(ok2),
            "wrong_per_min": wrong / (DUR / 60.0), "cmds_per_min": len(cmds) / (DUR / 60.0),
            "framed": float(np.mean(err[act] <= AIM_DEG)), "framed_static": float(np.mean(err[sta] <= AIM_DEG)) if sta.any() else None,
            "framed_moving": float(np.mean(err[mov] <= AIM_DEG)) if mov.any() else None,
            "framed_static_late": float(np.mean(err[sta & late] <= AIM_DEG)) if (sta & late).any() else None,
            "framed_moving_late": float(np.mean(err[mov & late] <= AIM_DEG)) if (mov & late).any() else None,
            "framed20_moving_late": float(np.mean(err[mov & late] <= 20)) if (mov & late).any() else None,
            "framed20": float(np.mean(err[act] <= 20)), "framed20_moving": float(np.mean(err[mov] <= 20)) if mov.any() else None,
            "mae_moving": float(np.mean(err[mov])) if mov.any() else None, "moving_sec": float(mov.sum() * DT)}


class Logged:
    """包一层估计器，记录每次判决（时刻、方位、置信度），用于画图。"""
    def __init__(self, est):
        self.est, self.log = est, []

    def localize(self, x, s, e):
        r = self.est.localize(x, s, e)
        self.log.append((e / FS, float(r.az), float(getattr(r, "conf", np.nan))))
        return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--split", choices=list(SPLITS), default="val")
    ap.add_argument("--meetings", type=int, default=6, help="每个场景的会议段数")
    ap.add_argument("--conf", type=float, nargs="+", default=[0.7], help="小网络置信度门限（另含不加门限）；0.7 为仿真验证会议上选定的值，实录上不再调")
    ap.add_argument("--snr", type=float, nargs="*", default=[], help="另加信噪比门限（dB）的配置，与每个置信度门限组合")
    ap.add_argument("--examples", type=int, default=0, help="每个场景存前 N 段会议的曲线数据与参考通道音频")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--models", nargs="*", default=None,
                    help="只评测这些小网络，每项“名称=模型路径”（相对 code/ssl_baseline）；不给则用脚本里的 MODELS")
    ap.add_argument("--tag", default="")
    a = ap.parse_args()
    from ssl_baseline.nn_doa import NNDOA
    sub, prefix, only = SPLITS[a.split]
    W = os.path.join(ROOT, "work", sub)
    lab = load_labels(W, prefix)
    scenes = only or sorted(d for d in os.listdir(W) if os.path.isdir(os.path.join(W, d)))
    srp_cfg = SRPConfig(fmax=min(4000.0, 0.95 * aliasing_frequency(XY)))
    base = dict(pad_pre=0.0, pad_post=0.0, exclude=FRONT, srp=srp_cfg)
    raw = WakeDOA(XY, FS, WakeDOAConfig(method="srp_sub", bg_subtract=False, onset=False, **base))
    ests = {"SRP-PHAT": (WakeDOA(XY, FS, WakeDOAConfig(method="srp_sub", bg_subtract=False, **base)), 0.0, None),
            "GEVD-MUSIC": (WakeDOA(XY, FS, WakeDOAConfig(**base)), 0.0, None)}
    models = dict(x.split("=", 1) for x in a.models) if a.models is not None else {k: os.path.join("work", "models", v) for k, v in MODELS.items()}
    for m, ck in models.items():
        if not os.path.exists(os.path.join(ROOT, ck)):
            print("找不到模型，跳过：", ck); continue
        nn = NNDOA(os.path.join(ROOT, ck), in_ch=2 * (XY.shape[1] - 1) + 1)
        ests[m] = (nn, 0.0, None)
        for th in a.conf:
            ests[f"{m}|置信≥{th:g}"] = (nn, th, None)
            for sn in a.snr:
                ests[f"{m}|置信≥{th:g}|SNR≥{sn:g}"] = (nn, th, sn)
    rows, examples = [], []
    os.makedirs(os.path.join(ROOT, "out", "demo"), exist_ok=True)
    for si, sc in enumerate(scenes):
        utts = scene_utts(W, sc, lab); load = Cache()
        bank = B.noise_bank([(u["f"], 0) for u in utts if u["kind"] == "static"], int(DUR * FS) + FS)
        rng = np.random.default_rng(a.seed * 100 + si)
        t0 = time.time()
        for k in range(a.meetings):
            x, turns = build_meeting(rng, utts, bank, load)
            e_db = band_energy_blocks(x); nb = len(e_db)
            far_db = np.full(nb, -100.0)
            srp_raw = np.array([raw.localize(x, max(0, int(((b + 1) * DT - 0.3) * FS)), int((b + 1) * DT * FS)).az
                                if (b + 1) * DT >= 0.35 else 0.0 for b in range(nb)])
            ex = {"scene": sc, "k": k, "turns": [{kk: (v.tolist() if isinstance(v, np.ndarray) else v) for kk, v in t.items()} for t in turns],
                  "pans": {}, "decisions": {}} if k < a.examples else None
            for m, (est, th, sn) in ests.items():
                le = Logged(est)
                pans, cmds = closed_loop(x, e_db, far_db, srp_raw, le, freeze=False, conf_th=th, snr_th=sn)
                r = evaluate(pans, cmds, turns)
                rows.append({"split": a.split, "scene": sc, "meeting": k, "method": m, **{kk: (round(v, 4) if isinstance(v, float) else v) for kk, v in r.items()}})
                if ex is not None:
                    ex["pans"][m] = np.round(pans, 2).tolist(); ex["decisions"][m] = le.log; ex.setdefault("cmds", {})[m] = cmds
            if ex is not None:
                examples.append(ex)
                ref = x[2] / (np.max(np.abs(x[2])) + 1e-9) * 0.9                    # 参考麦（x = 0 cm）
                import soundfile as sf
                sf.write(os.path.join(ROOT, "out", "demo", f"replay_{a.split}_{sc}_{k}.wav"), ref.astype(np.float32), FS)
            n_mov = sum(t["kind"] == "moving" for t in turns)
            print(f"{sc} 会议 {k + 1}/{a.meetings}：{len(turns)} 轮（走动 {n_mov}）  {time.time() - t0:.0f}s", flush=True)
    # 汇总：先按会议平均，再给全部会议的平均
    methods = list(ests)
    keys = ["latency_median_s", "aim_within_2s", "wrong_per_min", "cmds_per_min", "framed", "framed_static", "framed_moving",
            "framed20", "framed20_moving", "mae_moving", "framed_static_late", "framed_moving_late", "framed20_moving_late"]
    summ = {}
    for m in methods:
        sel = [r for r in rows if r["method"] == m]
        s = {}
        for kk in keys:
            v = [r[kk] for r in sel if r[kk] is not None]
            s[kk] = round(float(np.median(v) if kk == "latency_median_s" else np.mean(v)), 3) if v else None
        s["n_meetings"] = len(sel); s["n_switch"] = int(sum(r["n_switch"] for r in sel))
        s["moving_sec"] = round(float(sum(r["moving_sec"] for r in sel)), 1)
        summ[m] = s
    out = os.path.join(ROOT, "out", f"realman_replay_{a.split}{a.tag}")
    json.dump({"config": {"split": a.split, "scenes": scenes, "meetings_per_scene": a.meetings, "duration_s": DUR, "seed": a.seed,
                          "conf": a.conf, "models": models},
               "summary": summ, "examples": examples}, open(out + ".json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(out + ".csv", "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    print(f"\n{'方法':<28}{'对准用时':>8}{'2s内对准':>9}{'误转/分':>8}{'转动/分':>8}{'对准(全)':>9}{'静止':>7}{'走动':>7}{'走动≤20°':>9}{'走动误差':>9}")
    f = lambda v, p=False: "—" if v is None else (f"{v * 100:.0f}%" if p else f"{v:.2f}")
    for m, s in summ.items():
        print(f"{m:<28}{f(s['latency_median_s']):>8}{f(s['aim_within_2s'], 1):>9}{f(s['wrong_per_min']):>8}{f(s['cmds_per_min']):>8}"
              f"{f(s['framed'], 1):>9}{f(s['framed_static'], 1):>7}{f(s['framed_moving'], 1):>7}{f(s['framed20_moving'], 1):>9}{f(s['mae_moving']):>9}")


if __name__ == "__main__":
    main()
