# -*- coding: utf-8 -*-
"""会议室换人测向评测（仿真）：摄像头装在前墙电视上方，6 人围坐会议桌，A 发言后 B 接着发言，
在 B 开口后 0.3 / 0.5 / 1.0 s 判决 B 的方位，比较候选测向方法与两种阵列。

场景（每次随机生成房间与座位）：
  - 房间 5–10 m × 4–7 m × 2.6–3.2 m，RT60 0.3 / 0.6 s；
  - 阵列中心距前墙 8 cm，高 1.6–2.0 m；会议桌沿房间长度方向，两侧与桌尾共有座位，随机坐 6 人，嘴高 1.15–1.3 m；
  - 只统计"需要转动"的换人：A、B 方位相差 ≥ 20°；
  - 搜索范围限制在前方 ±85°（摄像头背后是墙）。

条件：
  C1 换人：A 说完停 0.2–0.6 s 后 B 开口
  C2 抢话：B 开口时 A 还在说，重叠 0.5 s
  C3 远端扬声器：B 开口前后，电视扬声器在播远端参会人的语音（未做回声消除，SIR 0 dB）
  C4 空调噪声：吊顶出风口的定向噪声（带内 SNR 5 dB）
各条件都有 C1 的换人间隔与 30 dB 传感器噪声。

方法：
  S   SRP-PHAT + 起始段加权（不用背景段）
  S2  SRP-PHAT + 背景互谱扣除
  M   MUSIC（不用背景段）
  G   GEVD-MUSIC：用开口前约 1 s 的背景段白化（背景段里通常是上一位发言人的尾音、远端扬声器、空调）
  G'  G，开口起点有误差（σ = 0.1 s，模拟语音活动检测 / 换人检测不准）
  T   自适应背景（ssl_baseline/turn.py）：开口前干扰仍在 → 背景取开口前 0.5 s；开口前已安静 → 背景取长期噪声协方差
      （由无人说话时段估计：C4 为空调噪声，其他条件只有传感器噪声）→ GEVD-MUSIC
  T'  T，开口起点有误差（σ = 0.1 s）

阵列：
  sq4   方形 4 麦，外接圆半径 2.83 cm（孔径 5.7 cm，与既有仿真相同）
  lin4  4 麦线阵，间距 3.5 cm（孔径 10.5 cm），平行于前墙

指标：误差 ≤10° 的比例（acc10）、误差 >20° 的比例（转错方向）、"停在上一位"（估计更接近 A 而不是 B）。

运行：python scripts/run_meeting_eval.py --trials 100
输出：out/meeting_eval.csv、out/meeting_summary.json、out/fig_meeting_eval.png
"""
import argparse, csv, json, os, sys, time
import numpy as np
import scipy.io.wavfile as wavfile
import scipy.signal as sps
import pyroomacoustics as pra

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from ssl_baseline import metrics
from ssl_baseline.geometry import ring_array
from ssl_baseline.sim import make_room, highpass
from ssl_baseline.wake import WakeDOA, WakeDOAConfig
from ssl_baseline.turn import TurnDOA, TurnDOAConfig

FS = 16000
T_ON = 3.0                      # B 开口时刻（s）；之前 A 在说话
B_LEN = 1.2                     # 统计用的 B 语音长度（s）
WINDOWS = [0.3, 0.5, 1.0]       # 判决窗口：B 开口后多久给出方位
SPEECH_ONSETS = [1.05, 3.5, 5.31, 7.67, 9.52, 12.36, 14.95]   # speech_zh.wav 中"静音后起始"的位置（s）
CONDS = ["C1 换人", "C2 抢话", "C3 远端扬声器", "C4 空调噪声"]
METHODS = ["S SRP-PHAT", "S2 SRP+背景扣除", "M MUSIC", "G GEVD-MUSIC", "G' GEVD+起点误差", "T 自适应背景", "T' 自适应+起点误差"]
FRONT = ((85.0, 275.0),)        # 屏蔽背后（前墙方向）

ARRAYS = {
    "sq4": ring_array(4, 0.0283, 45.0),
    "lin4": np.stack([np.zeros(4), (np.arange(4) - 1.5) * 0.035], 0),   # 沿 y 轴（平行于前墙）
}


def load(name):
    _, x = wavfile.read(os.path.join(ROOT, "data", name))
    x = highpass(x.astype(float) / 32768, FS)
    return x / np.sqrt(np.mean(x ** 2))


def az_of(p, c):
    return float(np.rad2deg(np.arctan2(p[1] - c[1], p[0] - c[0])) % 360.0)


def make_scene(rng):
    """返回房间尺寸、阵列中心、参会人位置列表、A/B 下标、扬声器与空调位置。"""
    while True:
        L, W, H = rng.uniform(5.0, 10.0), rng.uniform(4.0, 7.0), rng.uniform(2.6, 3.2)
        c = np.array([0.08, W / 2 + rng.uniform(-0.3, 0.3), rng.uniform(1.6, 2.0)])
        x0, x1 = rng.uniform(1.0, 1.8), L - rng.uniform(0.8, 1.5)
        if x1 - x0 < 2.0:
            continue
        seats = [(x, W / 2 + s * rng.uniform(0.8, 1.0)) for x in np.arange(x0 + 0.4, x1 - 0.2, 0.8) for s in (-1, 1)]
        seats.append((x1 + 0.5, W / 2))
        seats = [s for s in seats if 0.4 < s[1] < W - 0.4 and s[0] < L - 0.3]
        if len(seats) < 6:
            continue
        idx = rng.choice(len(seats), 6, replace=False)
        people = [np.array([seats[i][0] + rng.uniform(-0.1, 0.1), seats[i][1] + rng.uniform(-0.1, 0.1), rng.uniform(1.15, 1.3)]) for i in idx]
        azs = [az_of(p, c) for p in people]
        pairs = [(a, b) for a in range(6) for b in range(6) if a != b and metrics.angdiff(azs[a], azs[b]) >= 20]
        if not pairs:
            continue
        ia, ib = pairs[rng.integers(len(pairs))]
        spk = np.array([0.05, c[1] + rng.choice([-1, 1]) * rng.uniform(0.3, 0.6), rng.uniform(0.9, 1.2)])
        vent = np.array([rng.uniform(1.0, L - 1.0), rng.uniform(0.5, W - 0.5), H - 0.05])
        return [L, W, H], c, people, azs, ia, ib, spk, vent


def rirs(dims, rt60, src, mics):
    room = make_room(dims, FS, rt60)
    room.add_source(list(src)); room.add_microphone_array(pra.MicrophoneArray(mics, FS)); room.compute_rir()
    n = max(len(room.rir[m][0]) for m in range(mics.shape[1]))
    h = np.zeros((mics.shape[1], n))
    for m in range(mics.shape[1]):
        r = room.rir[m][0]; h[m, :len(r)] = r
    return h


def conv(h, s, n):
    return np.stack([sps.fftconvolve(s, hm)[:n] for hm in h], 0)


def ac_noise(n, rng):
    b, a = sps.butter(2, [80 / (FS / 2), 1500 / (FS / 2)], "band")
    x = sps.lfilter(b, a, rng.normal(0, 1, n))
    return x / np.sqrt(np.mean(x ** 2))


def render_trial(rng, sp, en, rt60):
    dims, c, people, azs, ia, ib, spk, vent = make_scene(rng)
    # 两种阵列一起仿真：前 4 路 sq4，后 4 路 lin4
    mic_xy = np.hstack([ARRAYS["sq4"], ARRAYS["lin4"]])
    mics = np.vstack([mic_xy + c[:2, None], np.full((1, mic_xy.shape[1]), c[2])])
    n = int((T_ON + B_LEN) * FS)
    hA, hB, hS, hV = (rirs(dims, rt60, p, mics) for p in (people[ia], people[ib], spk, vent))
    # B：从"静音后起始"处截取，开口对齐 T_ON
    on = SPEECH_ONSETS[rng.integers(len(SPEECH_ONSETS))]
    sB = np.zeros(n); seg = sp[int((on - 0.02) * FS): int((on - 0.02) * FS) + int(B_LEN * FS)]
    i0 = int((T_ON - 0.02) * FS); sB[i0:i0 + len(seg)] = seg[: n - i0]
    # A：另一段语音（英文素材，作为不同说话人），C1 停顿 0.2–0.6 s，C2 重叠 0.5 s
    st = rng.integers(0, len(en) - n); a_full = en[st: st + n].copy()
    gap = rng.uniform(0.2, 0.6)
    sA_gap = a_full.copy(); sA_gap[int((T_ON - gap) * FS):] = 0
    fade = np.linspace(1, 0, int(0.02 * FS))
    k = int((T_ON - gap) * FS); sA_gap[k - len(fade):k] *= fade
    sA_ov = a_full.copy(); k = int((T_ON + 0.5) * FS); sA_ov[k:] = 0; sA_ov[k - len(fade):k] *= fade
    # 远端扬声器：B 开口前 1.5 s 起持续播放另一段语音
    st2 = rng.integers(0, len(sp) - n); sF = np.zeros(n); k = int((T_ON - 1.5) * FS); sF[k:] = sp[st2: st2 + n - k]
    yA_gap, yA_ov, yB, yF, yV = conv(hA, sA_gap, n), conv(hA, sA_ov, n), conv(hB, sB, n), conv(hS, sF, n), conv(hV, ac_noise(n, rng), n)
    return dict(yA_gap=yA_gap, yA_ov=yA_ov, yB=yB, yF=yF, yV=yV, azA=azs[ia], azB=azs[ib], azs=azs, start=int(T_ON * FS))


def band_power(y, s0, s1):
    b, a = sps.butter(4, [300 / (FS / 2), 4000 / (FS / 2)], "band")
    return float(np.mean(sps.lfilter(b, a, y[:, s0:s1]) ** 2))


def mix(rng, r, cond):
    s0, s1 = r["start"], r["start"] + int(B_LEN * FS)
    pB = band_power(r["yB"], s0, s1)
    y = r["yB"] + (r["yA_ov"] if cond == "C2 抢话" else r["yA_gap"])
    if cond == "C3 远端扬声器":
        y = y + r["yF"] * np.sqrt(pB / band_power(r["yF"], s0, s1))
    sig_n = np.sqrt(np.mean(r["yB"][:, s0:s1] ** 2) / 1e3)
    k = int(2.0 * FS)
    noise = rng.normal(0, sig_n, (y.shape[0], k))       # 无人说话时段（用于长期噪声协方差）
    if cond == "C4 空调噪声":
        g = np.sqrt(pB / band_power(r["yV"], s0, s1) / 10 ** 0.5)
        y = y + r["yV"] * g
        noise = noise + r["yV"][:, :k] * g
    return y + rng.normal(0, sig_n, y.shape), noise


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=100, help="每档 RT60 的随机房间数")
    ap.add_argument("--rt60", type=float, nargs="+", default=[0.3, 0.6])
    ap.add_argument("--onset-jitter", type=float, default=0.1, help="开口起点误差标准差（s）")
    a = ap.parse_args()
    sp, en = load("speech_zh.wav"), load("tv_en.wav")
    base = dict(pad_post=0.0, exclude=FRONT)
    est = {}
    for arr, xy in ARRAYS.items():
        est[arr] = {
            METHODS[0]: WakeDOA(xy, FS, WakeDOAConfig(method="srp_sub", bg_subtract=False, **base)),
            METHODS[1]: WakeDOA(xy, FS, WakeDOAConfig(method="srp_sub", **base)),
            METHODS[2]: WakeDOA(xy, FS, WakeDOAConfig(bg_subtract=False, **base)),
            METHODS[3]: WakeDOA(xy, FS, WakeDOAConfig(**base)),
        }
    turn = {arr: TurnDOA(xy, FS, TurnDOAConfig(exclude=FRONT)) for arr, xy in ARRAYS.items()}
    sl = {"sq4": slice(0, 4), "lin4": slice(4, 8)}
    rng = np.random.default_rng(2026)
    raw, tcost = [], []
    for rt in a.rt60:
        t0 = time.time()
        for k in range(a.trials):
            r = render_trial(rng, sp, en, rt)
            for cond in CONDS:
                y, ynoise = mix(rng, r, cond)
                jit = int(rng.normal(0, a.onset_jitter) * FS)
                for arr in ARRAYS:
                    x = y[sl[arr]]; turn[arr].set_noise(ynoise[sl[arr]])
                    for win in WINDOWS:
                        s, e = r["start"], r["start"] + int(win * FS)
                        res = {}
                        for m in METHODS[:4]:
                            tt = time.perf_counter(); res[m] = est[arr][m].localize(x, s, e).az
                            if m == METHODS[3]: tcost.append(time.perf_counter() - tt)
                        js, je = s + jit, max(e + jit, s + jit + int(0.2 * FS))
                        res[METHODS[4]] = est[arr][METHODS[3]].localize(x, js, je).az
                        res[METHODS[5]] = turn[arr].localize(x, s, e).az
                        res[METHODS[6]] = turn[arr].localize(x, js, je).az
                        for m, az in res.items():
                            eB, eA = float(metrics.angdiff(az, r["azB"])), float(metrics.angdiff(az, r["azA"]))
                            raw.append({"rt60": rt, "cond": cond, "array": arr, "win": win, "method": m,
                                        "truth": round(r["azB"], 2), "prev": round(r["azA"], 2), "est": round(az, 2),
                                        "err": round(eB, 2), "stuck_prev": int(eA < eB)})
            if (k + 1) % 20 == 0:
                print(f"RT60={rt}s  {k + 1}/{a.trials}  {time.time() - t0:.0f}s", flush=True)

    summary = []
    for rt in a.rt60:
        for cond in CONDS:
            for arr in ARRAYS:
                for win in WINDOWS:
                    for m in METHODS:
                        sel = [x for x in raw if x["rt60"] == rt and x["cond"] == cond and x["array"] == arr and x["win"] == win and x["method"] == m]
                        e = np.array([x["err"] for x in sel])
                        summary.append({"rt60": rt, "cond": cond, "array": arr, "win": win, "method": m,
                                        "mae": round(float(e.mean()), 2), "median": round(float(np.median(e)), 2),
                                        "acc10": round(float((e <= 10).mean()), 3), "wrong20": round(float((e > 20).mean()), 3),
                                        "stuck_prev": round(float(np.mean([x["stuck_prev"] for x in sel])), 3), "n": len(sel)})
    out = os.path.join(ROOT, "out"); os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, "meeting_eval.csv"), "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=list(summary[0].keys())); w.writeheader(); w.writerows(summary)
    timing = {"gevd_music_ms_mean": round(1000 * float(np.mean(tcost)), 2), "gevd_music_ms_p95": round(1000 * float(np.percentile(tcost, 95)), 2)}
    json.dump({"config": {"trials_per_rt60": a.trials, "rt60": a.rt60, "windows_s": WINDOWS, "onset_jitter_s": a.onset_jitter,
                          "arrays": {"sq4": "方形 4 麦，孔径 5.7 cm", "lin4": "4 麦线阵，间距 3.5 cm，孔径 10.5 cm"},
                          "search": "前方 ±85°", "min_switch_deg": 20, "sensor_snr_db": 30, "far_end_sir_db": 0, "ac_snr_db": 5},
               "summary": summary, "timing_python": timing},
              open(os.path.join(out, "meeting_summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"\n{'RT60':>4} {'阵列':<5} {'窗口':>4} {'条件':<10} {'方法':<16} {'MAE':>6} {'≤10°':>6} {'>20°':>6} {'停上一位':>6}")
    for r in summary:
        if r["win"] == 0.5:
            print(f"{r['rt60']:>4} {r['array']:<5} {r['win']:>4} {r['cond']:<10} {r['method']:<16} {r['mae']:>6.1f} {r['acc10']*100:>5.0f}% {r['wrong20']*100:>5.0f}% {r['stuck_prev']*100:>5.0f}%")
    print("耗时（Python，GEVD-MUSIC 单次判决）：", timing)
    plot(summary, a.rt60, os.path.join(out, "fig_meeting_eval.png"))


def plot(summary, rts, path):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import logging; logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
    plt.rcParams.update({"font.sans-serif": ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei", "DejaVu Sans"],
                         "axes.unicode_minus": False, "font.size": 9})
    NAVY, TEAL, GRAY, LIGHT, RED = "#134074", "#1F7A68", "#5B6B7F", "#B9C7D6", "#C7000B"
    rt = rts[-1]
    get = lambda **kw: next(r for r in summary if all(r[k] == v for k, v in kw.items()))
    fig, axs = plt.subplots(1, 3, figsize=(13.0, 3.7), dpi=200, gridspec_kw={"width_ratios": [1.25, 1.25, 1]})
    show = [METHODS[0], METHODS[2], METHODS[3], METHODS[5]]
    cols = [LIGHT, GRAY, TEAL, NAVY]
    labels = ["SRP-PHAT", "MUSIC", "GEVD-MUSIC（固定背景段）", "自适应背景 GEVD-MUSIC"]
    xs = np.arange(len(CONDS)); bw = 0.2
    for ax, arr, ttl in zip(axs[:2], ["sq4", "lin4"], ["方形 4 麦（孔径 5.7 cm）", "4 麦线阵（孔径 10.5 cm）"]):
        for i, (m, c, lb) in enumerate(zip(show, cols, labels)):
            v = [get(rt60=rt, cond=cn, array=arr, win=0.5, method=m)["acc10"] * 100 for cn in CONDS]
            bars = ax.bar(xs + (i - 1.5) * bw, v, bw * 0.92, color=c, label=lb)
            for b, vv in zip(bars, v):
                ax.text(b.get_x() + b.get_width() / 2, vv + 1, f"{vv:.0f}", ha="center", fontsize=6.5, color="#333")
        ax.set_xticks(xs); ax.set_xticklabels([c.split(" ")[1] for c in CONDS]); ax.set_ylim(0, 118)
        ax.set_title(f"{ttl}：B 开口后 0.5 s 判决", fontsize=10, fontweight="bold", color=NAVY)
        ax.grid(axis="y", color="#E3E8EF", lw=0.7); ax.spines[["top", "right"]].set_visible(False); ax.set_axisbelow(True)
    axs[0].set_ylabel(f"误差 ≤10° 的比例（%），RT60 {rt} s")
    axs[0].legend(fontsize=7, frameon=False, loc="upper right", ncol=2)
    ax = axs[2]
    for arr, c, lb in [("sq4", TEAL, "方形 4 麦"), ("lin4", NAVY, "4 麦线阵")]:
        for m, ls, nm in [(METHODS[5], "-", "自适应背景"), (METHODS[0], ":", "SRP-PHAT")]:
            v = [np.mean([get(rt60=rt, cond=cn, array=arr, win=w, method=m)["acc10"] for cn in CONDS]) * 100 for w in WINDOWS]
            ax.plot(WINDOWS, v, ls, color=c, marker="o", ms=4, lw=1.6, label=f"{lb} · {nm}")
    ax.set_xticks(WINDOWS); ax.set_xlabel("判决窗口：B 开口后（s）"); ax.set_ylim(0, 100)
    ax.set_title("判决越晚越准：四种条件平均", fontsize=10, fontweight="bold", color=NAVY)
    ax.legend(fontsize=7, frameon=False, loc="lower right"); ax.grid(color="#E3E8EF", lw=0.7); ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout(); fig.savefig(path, facecolor="white"); plt.close(fig)


if __name__ == "__main__":
    main()
