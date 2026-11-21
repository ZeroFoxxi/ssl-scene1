# -*- coding: utf-8 -*-
"""会议室闭环仿真：60 s 会议 → 检测换人 → 0.5 s 粗转、1.0 s 微调 → 摄像头持续对准发言人。

场景（每次随机，房间与座位生成同 run_meeting_eval.py）：
  - 6 位参会人轮流发言，每段 3–7 s；本地换人时 70% 停顿 0.2–0.8 s、30% 抢话（重叠 0.5 s）；
  - 约 20% 的发言轮次是远端参会人（从电视喇叭播放，2–5 s），此时摄像头应保持不动；
  - 吊顶空调噪声一直存在（带内 SNR 15 dB），传感器噪声 30 dB；
  - 阵列在摄像头处，贴前墙；云台最大角速度 120°/s；不模拟电机噪声（假设电子云台或静音电机）。

系统（因果，每 0.1 s 一块）：
  1. 有声判断：带内能量高于噪声底（过去 5 s 的最低块能量）8 dB；
  2. 触发换人（二选一）：
     a. 起始：此前 ≥0.4 s 无声后有声，起点取有声的第一块；
     b. 方向变化：逐块 SRP-PHAT（最近 0.3 s）连续 3 块偏离当前朝向 >15° 且彼此相差 ≤10°，起点取 0.4 s 前；
  3. 起点后 0.5 s 用测向方法给出方位，偏离当前朝向 >8° 就转（粗转）；1.0 s 再测一次（微调）；
     由方向变化触发时，判决方位须与触发方向相差 ≤20°（一致性检查），否则不转；微调只在粗转方位 ±20° 内修正；
  4. 可选"远端播放时冻结"：设备知道自己的喇叭在播放（播放能量）；判决窗口（起点到判决时刻）内有播放就不转。

方法 × 阵列：
  SRP-PHAT / GEVD-MUSIC（固定背景段）/ GEVD-MUSIC + 远端播放时冻结；6 麦线阵 17.5 cm（暂定方案）与 4 麦线阵 17.5 cm。

指标：
  - 转向时延：本地新发言人开口到摄像头对准（误差 ≤10°）的时间（取中位数）；
  - 2 秒内对准率：开口后 2 s 内对准的轮次比例；
  - 误转次数 / 分钟：转向的目标偏离当时发言人 >15°（含远端发言期间的任何转动）；
  - 对准时间比例：本地有人发言的时间里，摄像头对准当前发言人的比例。

运行：python scripts/run_meeting_closed_loop.py --trials 30
输出：out/closed_loop_meeting.csv、out/closed_loop_meeting_summary.json、out/fig_closed_loop_meeting.png
"""
import argparse, csv, json, os, sys, time
import numpy as np
import scipy.signal as sps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_meeting_eval as R
from ssl_baseline import metrics
from ssl_baseline.geometry import aliasing_frequency
from ssl_baseline.wake import WakeDOA, WakeDOAConfig
from ssl_baseline.doa import SRPConfig

FS = R.FS
DUR = 60.0
DT = 0.1
PAN_SPEED = 120.0
AIM_DEG = 10.0


def lin(n, aperture):
    return np.stack([np.zeros(n), (np.arange(n) - (n - 1) / 2) * aperture / (n - 1)], 0)


ARRAYS = {"6麦线阵 17.5cm": lin(6, 0.175), "4麦线阵 17.5cm": lin(4, 0.175)}
METHODS = ["SRP-PHAT", "GEVD-MUSIC", "GEVD-MUSIC+远端冻结"]
NN_METHODS = ["小网络+远端冻结"]                               # 加 --nn-ckpt 时才评测；只用于训练时的 6 麦线阵 17.5 cm


# ---------------- 场景与信号 ----------------
def make_timeline(rng):
    """返回轮次列表 [(说话人, 起点, 终点)]，说话人 0–5 为本地，'far' 为远端。"""
    turns, t, prev = [], 1.0, None
    while t < DUR - 2.0:
        if prev is not None and prev != "far" and rng.random() < 0.2:
            who = "far"
        else:
            who = int(rng.choice([k for k in range(6) if k != prev]))
        d = rng.uniform(2.0, 5.0) if who == "far" else rng.uniform(3.0, 7.0)
        end = min(t + d, DUR - 0.5)
        turns.append((who, t, end))
        prev = who
        if who != "far" and rng.random() < 0.3:
            t = end - 0.5                       # 下一位抢话（重叠 0.5 s）
        else:
            t = end + rng.uniform(0.2, 0.8)
    return turns


def speech_track(rng, pool, turns, who, n):
    x = np.zeros(n)
    fade = np.linspace(0, 1, int(0.02 * FS))
    for w, a, b in turns:
        if w != who:
            continue
        i0, i1 = int(a * FS), int(b * FS)
        st = rng.integers(0, len(pool) - (i1 - i0))
        seg = pool[st: st + i1 - i0].copy()
        seg[:len(fade)] *= fade; seg[-len(fade):] *= fade[::-1]
        x[i0:i1] = seg
    return x


def render(rng, sp, en, rt60, mic_xy):
    dims, c, people, azs, _, _, spk, vent = R.make_scene(rng)
    mics = np.vstack([mic_xy + c[:2, None], np.full((1, mic_xy.shape[1]), c[2])])
    n = int(DUR * FS)
    turns = make_timeline(rng)
    pool = np.concatenate([sp, en])
    y = np.zeros((mic_xy.shape[1], n))
    for k in range(6):
        s = speech_track(rng, pool, turns, k, n)
        if np.any(s):
            y += R.conv(R.rirs(dims, rt60, people[k], mics), s, n)
    far = speech_track(rng, pool, turns, "far", n)
    y += R.conv(R.rirs(dims, rt60, spk, mics), far, n)
    ac = R.conv(R.rirs(dims, rt60, vent, mics), R.ac_noise(n, rng), n)
    ref = np.mean(y ** 2)
    y += ac * np.sqrt(ref / np.mean(ac ** 2) / 10 ** 1.5)
    y += rng.normal(0, np.sqrt(ref / 1e3), y.shape)
    return y, far, turns, azs


# ---------------- 闭环 ----------------
def band_energy_blocks(x):
    b, a = sps.butter(4, [300 / (FS / 2), 4000 / (FS / 2)], "band")
    yb = sps.lfilter(b, a, x)
    nb = int(x.shape[-1] / (DT * FS))
    return 10 * np.log10(np.mean(yb[..., : nb * int(DT * FS)].reshape(-1, nb, int(DT * FS)) ** 2, axis=(0, 2)) + 1e-12)


def closed_loop(x, e_db, far_db, srp_raw, est, freeze, conf_th=0.0, trace=None, snr_th=None):
    """trace：给一个 list 时，记录每次触发（时刻、类型）与其后每次判决的结果，供诊断用。
    snr_th：信噪比门限（dB）；判决所用时段 [触发时刻, 判决时刻] 的带内能量比噪声底高不到 snr_th 时不转。"""
    nb = len(e_db)
    pan, target = 0.0, 0.0
    floor = np.array([e_db[max(0, b - 50): b + 1].min() for b in range(nb)])
    active = e_db > floor + 8
    far_on = far_db > -50.0                                       # 设备自己的播放能量（播放信号已归一化到单位功率，高于 -50 dB 视为在播放）
    pending, busy_until, run, hint, coarse = [], -1.0, [], None, None
    pans, cmds = np.zeros(nb), []
    for b in range(nb):
        t = (b + 1) * DT
        # 触发
        if t >= busy_until and active[b]:
            t0, z = None, None
            if b >= 5 and not active[b - 5:b - 1].any() and not active[b - 1]:
                t0 = t - DT                                       # a. 静音后起始
            if t0 is None and b >= 2:
                last = srp_raw[b - 2:b + 1]
                if all(metrics.angdiff(z, target) > 15 for z in last) and \
                        max(metrics.angdiff(last[i], last[j]) for i in range(3) for j in range(i + 1, 3)) <= 10 and active[b - 2:b + 1].all():
                    t0 = t - 0.4                                  # b. 方向变化
                    z = float(np.median(last))
            if t0 is not None:
                if freeze and far_on[max(0, int(t0 / DT)): b + 1].any():
                    busy_until = t + 0.3
                else:
                    pending = [t0 + 0.5, t0 + 1.0]; busy_until = t0 + 1.0; run.append(t0); hint = z; coarse = None
                    if trace is not None:
                        trace.append({"t0": t0, "kind": "方向变化" if z is not None else "静音后起始", "hint": z, "dec": []})
        # 判决（粗转、微调）
        while pending and t >= pending[0] - 1e-9:
            te = pending.pop(0); t0 = run[-1]
            if freeze and far_on[max(0, int(t0 / DT)): b + 1].any():
                continue
            res = est.localize(x, int(t0 * FS), int(te * FS)); az = res.az
            rec = {"t": t, "az": float(az), "conf": float(getattr(res, "conf", np.nan))}
            if trace is not None and trace:
                trace[-1]["dec"].append(rec)
            if getattr(res, "conf", 1.0) < conf_th:
                rec["out"] = "置信度低"; continue                  # 置信度门限（小网络）：低于门限不转
            if snr_th is not None:
                b0, b1 = int(round(t0 / DT)), int(round(t / DT))
                if b1 > b0 and np.mean(e_db[b0:b1]) - floor[min(b1, nb - 1)] < snr_th:
                    rec["out"] = "信噪比低"; continue              # 信噪比门限：话音太弱时不转
            if hint is not None and metrics.angdiff(az, hint) > 20:
                rec["out"] = "与触发方向不一致"; continue           # 一致性检查：方向变化触发时，判决方位须与触发方向一致
            if not pending:                                       # 微调：只在粗转方位 ±20° 内修正
                if coarse is not None and metrics.angdiff(az, coarse) > 20:
                    rec["out"] = "微调超出范围"; continue
            else:
                coarse = az
            if metrics.angdiff(az, target) > 8:
                target = az; cmds.append((t, az)); rec["out"] = "转动"
            else:
                rec["out"] = "已对准"
        # 云台运动
        err = (target - pan + 180) % 360 - 180
        pan = (pan + np.clip(err, -PAN_SPEED * DT, PAN_SPEED * DT)) % 360
        pans[b] = pan
    return pans, cmds


def evaluate(pans, cmds, turns, azs):
    nb = len(pans); tb = (np.arange(nb) + 1) * DT
    holder = np.full(nb, -1)                                       # 当前发言人：本地 0–5，远端 -2，无人 -1
    for w, a, b in turns:                                          # 后开始的轮次覆盖前面的（抢话时新发言人取得发言权）
        holder[(tb >= a) & (tb < b)] = -2 if w == "far" else w
    lat, ok2 = [], []
    for w, a, b in turns:
        if w == "far":
            continue
        idx = np.where((tb >= a) & (tb < b) & (metrics.angdiff(pans, azs[w]) <= AIM_DEG))[0]
        l = tb[idx[0]] - a if len(idx) else np.inf
        lat.append(l); ok2.append(l <= 2.0)
    wrong = 0
    for t, az in cmds:
        h = holder[min(nb - 1, int(t / DT) - 1)]
        if h < 0 or metrics.angdiff(az, azs[h]) > 15:
            wrong += 1
    loc = holder >= 0
    framed = np.mean([metrics.angdiff(pans[i], azs[holder[i]]) <= AIM_DEG for i in np.where(loc)[0]])
    return {"latency_median_s": float(np.median(lat)), "aim_within_2s": float(np.mean(ok2)),
            "wrong_per_min": wrong / (DUR / 60.0), "framed_ratio": float(framed), "n_turns": len(lat), "n_cmds": len(cmds)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=30)
    ap.add_argument("--rt60", type=float, nargs="+", default=[0.3, 0.6])
    ap.add_argument("--nn-ckpt", default=None, help="小网络模型路径（work/models/*.pt）；给出则加评小网络")
    ap.add_argument("--tag", default="")
    ap.add_argument("--nn-variants", nargs="+", default=["0.5:0"],
                    help="小网络配置，每项“开口后最长输入 s:置信度门限[:信噪比门限 dB]”，如 0.5:0 0.5:0.7 0.5:0.7:10；第一项为基准")
    ap.add_argument("--seed", type=int, default=2026, help="会议生成的随机种子；2026 为报告用的那批会议，换种子做独立验证")
    ap.add_argument("--only-nn", action="store_true", help="只评测小网络（6 麦线阵），不跑传统方法与 4 麦线阵")
    a = ap.parse_args()
    global NN_METHODS
    nn_est, nn_cfg = None, {}
    if a.nn_ckpt:
        from ssl_baseline.nn_doa import NNDOA
        nn_est = True
        NN_METHODS = []
        for k, v in enumerate(a.nn_variants):
            z = [float(q) for q in v.split(":")]; post, th = z[0], z[1]; snr = z[2] if len(z) > 2 else None
            m = "小网络+远端冻结" if k == 0 and v == "0.5:0" else f"小网络+远端冻结|{post:g}s|置信≥{th:g}" + (f"|SNR≥{snr:g}" if snr is not None else "")
            NN_METHODS.append(m); nn_cfg[m] = (NNDOA(a.nn_ckpt, post_max=post), th, snr)
    if a.only_nn:
        global METHODS
        METHODS = []
    sp, en = R.load("speech_zh.wav"), R.load("tv_en.wav")
    names = list(ARRAYS); xys = [ARRAYS[n] for n in names]
    idx = np.cumsum([0] + [x.shape[1] for x in xys]); allxy = np.hstack(xys)
    ests, raws = {}, {}
    for n, xy in ARRAYS.items():
        srp = SRPConfig(fmax=min(4000.0, 0.95 * aliasing_frequency(xy)))
        base = dict(pad_pre=0.0, pad_post=0.0, exclude=R.FRONT, srp=srp)
        ests[n] = {"SRP-PHAT": WakeDOA(xy, FS, WakeDOAConfig(method="srp_sub", bg_subtract=False, **base)),
                   "GEVD-MUSIC": WakeDOA(xy, FS, WakeDOAConfig(**base))}
        raws[n] = WakeDOA(xy, FS, WakeDOAConfig(method="srp_sub", bg_subtract=False, onset=False, **base))
    rng = np.random.default_rng(a.seed)
    rows, example = [], None
    for rt in a.rt60:
        t_start = time.time()
        for k in range(a.trials):
            y, far, turns, azs = render(rng, sp, en, rt, allxy)
            far_db = band_energy_blocks(far[None])
            if example is None and rt == a.rt60[-1]:
                example = {"turns": turns, "azs": azs, "pans": {}}
            for i, n in enumerate(names):
                if a.only_nn and i > 0:
                    continue
                x = y[idx[i]:idx[i + 1]]
                e_db = band_energy_blocks(x)
                nb = len(e_db)
                srp_raw = np.array([raws[n].localize(x, max(0, int(((b + 1) * DT - 0.3) * FS)), int((b + 1) * DT * FS)).az
                                    if (b + 1) * DT >= 0.35 else 0.0 for b in range(nb)])
                for m in METHODS + (NN_METHODS if (nn_est is not None and n == names[0]) else []):
                    est, th, snr = nn_cfg[m] if m in NN_METHODS else (ests[n]["SRP-PHAT" if m == "SRP-PHAT" else "GEVD-MUSIC"], 0.0, None)
                    pans, cmds = closed_loop(x, e_db, far_db, srp_raw, est, freeze="冻结" in m, conf_th=th, snr_th=snr)
                    r = evaluate(pans, cmds, turns, azs)
                    rows.append({"rt60": rt, "trial": k, "array": n, "method": m, **{kk: round(v, 4) if isinstance(v, float) else v for kk, v in r.items()}})
                    if rt == a.rt60[-1] and k == 0 and i == 0:
                        example["pans"][m] = pans.tolist()
            print(f"RT60={rt}s  {k + 1}/{a.trials}  {time.time() - t_start:.0f}s", flush=True)
    summary = []
    for rt in a.rt60 + ["平均"]:
        for n in names:
            for m in METHODS + NN_METHODS:
                sel = [r for r in rows if (rt == "平均" or r["rt60"] == rt) and r["array"] == n and r["method"] == m]
                if not sel:
                    continue
                lat = np.array([r["latency_median_s"] for r in sel])
                summary.append({"rt60": rt, "array": n, "method": m,
                                "latency_median_s": round(float(np.median(lat[np.isfinite(lat)])), 2) if np.isfinite(lat).any() else None,
                                "aim_within_2s": round(float(np.mean([r["aim_within_2s"] for r in sel])), 3),
                                "wrong_per_min": round(float(np.mean([r["wrong_per_min"] for r in sel])), 2),
                                "framed_ratio": round(float(np.mean([r["framed_ratio"] for r in sel])), 3), "n_trials": len(sel)})
    out = os.path.join(ROOT, "out"); os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, f"closed_loop_meeting{a.tag}.csv"), "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    json.dump({"config": {"trials_per_rt60": a.trials, "rt60": a.rt60, "duration_s": DUR, "pan_speed_deg_s": PAN_SPEED,
                          "aim_deg": AIM_DEG, "arrays": {n: np.round(ARRAYS[n], 4).tolist() for n in names}},
               "summary": summary, "example": example}, open(os.path.join(out, f"closed_loop_meeting{a.tag}_summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\n{'RT60':>4} {'阵列':<14} {'方法':<22} {'时延中位数':>8} {'2s内对准':>8} {'误转/分':>7} {'对准时间':>8}")
    for s in summary:
        print(f"{str(s['rt60']):>4} {s['array']:<14} {s['method']:<22} {str(s['latency_median_s']):>8} {s['aim_within_2s']*100:>7.0f}% {s['wrong_per_min']:>7.2f} {s['framed_ratio']*100:>7.0f}%")
    plot(summary, example, names, os.path.join(out, f"fig_closed_loop_meeting{a.tag}.png"))


def plot(summary, ex, names, path):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import logging; logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
    plt.rcParams.update({"font.sans-serif": ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei", "DejaVu Sans"],
                         "axes.unicode_minus": False, "font.size": 9})
    NAVY, TEAL, LIGHT, RED, GRAY = "#134074", "#1F7A68", "#B9C7D6", "#C7000B", "#5B6B7F"
    fig, axs = plt.subplots(1, 2, figsize=(12.5, 3.9), dpi=200, gridspec_kw={"width_ratios": [1.7, 1]})
    ax = axs[0]
    if ex is not None and ex["pans"]:
        tb = (np.arange(len(next(iter(ex["pans"].values())))) + 1) * DT
        w180 = lambda a: (np.asarray(a) + 180) % 360 - 180
        for w, a, b in ex["turns"]:
            if w == "far":
                ax.axvspan(a, b, color="#F4D6D6", lw=0)
            else:
                ax.plot([a, b], [w180(ex["azs"][w])] * 2, color=GRAY, lw=5, alpha=0.35, solid_capstyle="butt")
        for m, c, lb in [("SRP-PHAT", LIGHT, "SRP-PHAT"), ("GEVD-MUSIC+远端冻结", TEAL, "GEVD-MUSIC + 远端冻结")] + [(m, NAVY if k == 0 else RED, m.replace("+", " + ").replace("|", "，")) for k, m in enumerate(NN_METHODS[:2])]:
            if m in ex["pans"]:
                ax.plot(tb, w180(ex["pans"][m]), color=c, lw=1.6, label=f"摄像头朝向：{lb}")
        ax.plot([], [], color=GRAY, lw=5, alpha=0.35, label="本地发言人方位")
        ax.fill_between([], [], color="#F4D6D6", label="远端发言（应保持不动）")
        lim = max(30.0, float(np.max(np.abs([w180(ex["azs"][w]) for w, _, _ in ex["turns"] if w != "far"]))) + 15.0)
        ax.set_xlim(0, DUR); ax.set_ylim(-lim, lim); ax.set_xlabel("时间（s）"); ax.set_ylabel("方位（°，0° 为正前方）")
        ax.set_title(f"示例：60 s 会议（{names[0]}，RT60 0.6 s，仿真）", fontsize=10, fontweight="bold", color=NAVY)
        ax.legend(fontsize=7, frameon=False, loc="upper right", ncol=2); ax.grid(color="#E3E8EF", lw=0.7)
        ax.spines[["top", "right"]].set_visible(False)
    ax = axs[1]
    get = lambda **kw: next(s for s in summary if all(s[k] == v for k, v in kw.items()))
    has_nn = any(s["method"] in NN_METHODS for s in summary)
    ms = METHODS + (NN_METHODS if has_nn else [])
    xs = np.arange(len(ms)); bw = 0.36
    for i, (n, c) in enumerate(zip(names, [NAVY, TEAL])):
        sel = [(k, m) for k, m in enumerate(ms) if any(s["array"] == n and s["method"] == m and s["rt60"] == "平均" for s in summary)]
        v = [get(rt60="平均", array=n, method=m)["framed_ratio"] * 100 for _, m in sel]
        bars = ax.bar(np.array([k for k, _ in sel]) + (i - 0.5) * bw, v, bw * 0.92, color=c, label=n)
        for bb, vv, (_, m) in zip(bars, v, sel):
            wpm = get(rt60="平均", array=n, method=m)["wrong_per_min"]
            ax.text(bb.get_x() + bb.get_width() / 2, vv + 1, f"{vv:.0f}%\n误转{wpm:.1f}", ha="center", fontsize=6.5, color="#333")
    ax.set_xticks(xs); ax.set_xticklabels([m.replace("+", "\n+").replace("|", "\n") for m in ms], fontsize=6.5); ax.set_ylim(0, 115)
    ax.set_ylabel("本地发言时间中对准的比例（%）")
    ax.set_title("对准时间比例与每分钟误转次数", fontsize=10, fontweight="bold", color=NAVY)
    ax.legend(fontsize=7.5, frameon=False, loc="upper left"); ax.grid(axis="y", color="#E3E8EF", lw=0.7)
    ax.spines[["top", "right"]].set_visible(False); ax.set_axisbelow(True)
    fig.tight_layout(); fig.savefig(path, facecolor="white"); plt.close(fig)


if __name__ == "__main__":
    main()
