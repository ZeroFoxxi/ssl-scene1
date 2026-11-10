# -*- coding: utf-8 -*-
"""离线 demo：唤醒词定向（电视开 / 关）。

场景：随机鞋盒房间，电视在一侧持续播放人声（与说话人方位相隔 ≥45°）；用户先静默，再说唤醒词
（用中文 TTS 语音“静音后起始”的 1.0 s 代替），随后继续说话。唤醒在唤醒词结束时回调，给出起止样点。

对比方法（同一批仿真数据）：
  A  SRP-PHAT（逐帧 PHAT，片段内能量门限）           —— 原基线做法
  B  A + 起始段加权
  C  SRP-PHAT + 起始段加权 + 背景互谱扣除            —— WakeDOAConfig(method="srp_sub")
  D  唤醒定向：起始段加权 + 背景白化 GEVD-MUSIC     —— 默认配置
  E  D 但不用背景段（普通 MUSIC）                    —— 消融：背景段的作用
  D' D，唤醒词起止点带误差（模拟 KWS 边界不准，σ = 0.1 s）

运行：python scripts/run_wake_doa_demo.py --trials 100
输出：out/wake_doa_eval.csv、out/wake_doa_summary.json、out/fig_wake_doa.png
"""
import argparse, csv, json, os, sys, time
import numpy as np
import scipy.io.wavfile as wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from ssl_baseline import PRESETS, SRPPHAT, stft, metrics
from ssl_baseline.sim import simulate_static, highpass
from ssl_baseline.wake import WakeDOA, WakeDOAConfig, WakeWordLocalizer

FS, NFFT, HOP = 16000, 512, 256
PRE_S, WAKE_S, POST_S = 2.6, 1.0, 0.5          # 唤醒词前静默、唤醒词长度、唤醒词后继续说话
SPEECH_ONSETS = [1.05, 3.5, 5.31, 7.67, 9.52, 12.36, 14.95]  # speech_zh.wav 中“静音后起始”的位置（s）
CONDS = [("电视关", None), ("电视 SIR +5 dB", 5.0), ("电视 SIR 0 dB", 0.0), ("电视 SIR -5 dB", -5.0)]
METHODS = ["A 逐帧SRP-PHAT", "B +起始段加权", "C SRP+背景互谱扣除", "D GEVD-MUSIC(默认)", "E MUSIC不用背景", "D' D+KWS边界误差"]


def load(name):
    _, x = wavfile.read(os.path.join(ROOT, "data", name))
    return highpass(x.astype(float) / 32768, FS)


def place(rng, ac, L, W, dmin, dmax, avoid=None, min_sep=45.0):
    for _ in range(500):
        a = rng.uniform(0, 360)
        if avoid is not None and metrics.angdiff(a, avoid) < min_sep:
            continue
        d = rng.uniform(dmin, dmax)
        p = ac[:2] + d * np.array([np.cos(np.deg2rad(a)), np.sin(np.deg2rad(a))])
        if 0.4 < p[0] < L - 0.4 and 0.4 < p[1] < W - 0.4:
            return a, p
    return None, None


def render_trial(rng, sp, tv, rt60, mic):
    """返回 (人声多通道, 电视多通道, 人方位, 电视方位, 唤醒词起止样点)。"""
    while True:
        L, W, H = rng.uniform(3.5, 7.0), rng.uniform(3.0, 6.0), rng.uniform(2.5, 3.2)
        ac = np.array([rng.uniform(0.8, L - 0.8), rng.uniform(0.8, W - 0.8), rng.uniform(1.0, 1.8)])
        paz, pp = place(rng, ac, L, W, 1.0, 3.5)
        if paz is None:
            continue
        taz, tp = place(rng, ac, L, W, 1.5, 3.5, avoid=paz)
        if taz is not None:
            break
    n = int((PRE_S + WAKE_S + POST_S) * FS)
    on = SPEECH_ONSETS[rng.integers(len(SPEECH_ONSETS))]
    s = sp[int(on * FS) - int(0.05 * FS): int(on * FS) + int((WAKE_S + POST_S) * FS)]
    person = np.zeros(n); i0 = int((PRE_S - 0.05) * FS); person[i0:i0 + len(s)] = s[: n - i0]
    st = rng.integers(0, len(tv) - n); tvs = tv[st: st + n]
    dims = [L, W, H]
    yp = simulate_static(person, FS, dims, rt60, mic, ac, [pp[0], pp[1], rng.uniform(1.0, 1.7)])[:, :n]
    yt = simulate_static(tvs, FS, dims, rt60, mic, ac, [tp[0], tp[1], rng.uniform(0.6, 1.2)])[:, :n]
    start, end = int(PRE_S * FS), int((PRE_S + WAKE_S) * FS)
    return yp, yt, paz, taz, start, end


def mix(rng, yp, yt, sir_db, start, end, snr_db=20.0):
    """SIR：唤醒词期间说话人与电视在麦克风处的功率比；SNR：说话人与传感器白噪声之比。"""
    pw = np.mean(yp[:, start:end] ** 2)
    y = yp.copy()
    if sir_db is not None:
        y = y + yt * np.sqrt(pw / np.mean(yt[:, start:end] ** 2) / 10 ** (sir_db / 10))
    return y + rng.normal(0, np.sqrt(pw / 10 ** (snr_db / 10)), y.shape)


def baseline_ab(srp, y, start, end, onset):
    f, Z = stft(y[:, start:end], FS, NFFT, HOP)
    P = srp.map(Z); e = srp.band_energy_db(Z); floor = e.max() - 30
    w = srp.onset_weights(e, floor_db=floor) if onset else (e > floor).astype(float)
    return srp.peak(srp.aggregate(P, w))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=100, help="每档 RT60 的随机房间数")
    ap.add_argument("--rt60", type=float, nargs="+", default=[0.3, 0.6])
    ap.add_argument("--array", default="square4")
    ap.add_argument("--kws-jitter", type=float, default=0.1, help="KWS 起止点误差标准差（s）")
    a = ap.parse_args()
    mic = PRESETS[a.array]
    sp, tv = load("speech_zh.wav"), load("tv_en.wav")
    srp = SRPPHAT(mic, FS, NFFT)
    wd = WakeDOA(mic, FS)
    wd_srp = WakeDOA(mic, FS, WakeDOAConfig(method="srp_sub"))
    wd_nobg = WakeDOA(mic, FS, WakeDOAConfig(bg_subtract=False))
    rng = np.random.default_rng(2026)
    raw, tcost = [], {"gevd_music": [], "srp_sub": []}
    example = None
    for rt in a.rt60:
        t0 = time.time()
        for k in range(a.trials):
            yp, yt, paz, taz, start, end = render_trial(rng, sp, tv, rt, mic)
            for cname, sir in CONDS:
                y = mix(rng, yp, yt, sir, start, end)
                est = {METHODS[0]: baseline_ab(srp, y, start, end, False), METHODS[1]: baseline_ab(srp, y, start, end, True)}
                tt = time.perf_counter(); r = wd_srp.localize(y, start, end); tcost["srp_sub"].append(time.perf_counter() - tt)
                est[METHODS[2]] = (r.az, r.conf); r_srp = r
                tt = time.perf_counter(); r = wd.localize(y, start, end); tcost["gevd_music"].append(time.perf_counter() - tt)
                est[METHODS[3]] = (r.az, r.conf); r_d = r
                r = wd_nobg.localize(y, start, end); est[METHODS[4]] = (r.az, r.conf)
                js, je = (int(v + rng.normal(0, a.kws_jitter) * FS) for v in (start, end))
                r = wd.localize(y, js, max(je, js + int(0.3 * FS))); est[METHODS[5]] = (r.az, r.conf)
                for m, (az, conf) in est.items():
                    raw.append({"rt60": rt, "cond": cname, "method": m, "truth": round(paz, 2), "tv_az": round(taz, 2) if sir is not None else "",
                                "est": round(az, 2), "conf": round(conf, 3), "err": round(float(metrics.angdiff(az, paz)), 2)})
                if example is None and rt == a.rt60[-1] and sir == 0.0 and metrics.angdiff(r_srp.az, paz) > 20 \
                        and metrics.angdiff(r_d.az, paz) < 5:
                    example = (y, start, end, paz, taz, r_srp.spectrum, r_d.spectrum)
        print(f"RT60={rt}s  {a.trials} 个房间  用时 {time.time() - t0:.0f}s")

    # 汇总
    summary = []
    for rt in a.rt60:
        for cname, sir in CONDS:
            for m in METHODS:
                sel = [r for r in raw if r["rt60"] == rt and r["cond"] == cname and r["method"] == m]
                d = metrics.doa_metrics(np.array([r["est"] for r in sel]), np.array([r["truth"] for r in sel]))
                tv_lock = float(np.mean([metrics.angdiff(r["est"], r["tv_az"]) < 15 for r in sel])) if sir is not None else 0.0
                summary.append({"rt60": rt, "cond": cname, "method": m, "mae": round(d["mae"], 2), "median": round(d["median"], 2),
                                "acc10": round(d["acc10"], 3), "acc20": round(d["acc20"], 3), "gross": round(d["gross"], 3),
                                "tv_lock": round(tv_lock, 3), "n": d["n"]})
    # 置信度是否可用：方法 D 中按置信度分三档看正确率
    dsel = [r for r in raw if r["method"] == METHODS[3]]
    confs = np.array([r["conf"] for r in dsel]); errs = np.array([r["err"] for r in dsel])
    q1, q2 = np.percentile(confs, [33.3, 66.7])
    calib = {"conf_terciles": [round(float(q1), 3), round(float(q2), 3)],
             "acc10_low": round(float((errs[confs < q1] <= 10).mean()), 3),
             "acc10_mid": round(float((errs[(confs >= q1) & (confs < q2)] <= 10).mean()), 3),
             "acc10_high": round(float((errs[confs >= q2] <= 10).mean()), 3),
             "gross_low": round(float((errs[confs < q1] > 45).mean()), 3),
             "gross_high": round(float((errs[confs >= q2] > 45).mean()), 3)}
    timing = {k: {"ms_mean": round(1000 * float(np.mean(v)), 2), "ms_p95": round(1000 * float(np.percentile(v, 95)), 2)} for k, v in tcost.items()}

    # 流式接口自检：16 ms 一块推入环形缓存，唤醒在终点后 0.2 s 回调，结果应与离线调用一致
    y, start, end = (example[0], example[1], example[2]) if example is not None else (mix(rng, yp, yt, 0.0, start, end), start, end)
    loc = WakeWordLocalizer(mic, FS)
    for i in range(0, end + int(0.2 * FS), 256):
        loc.push(y[:, i:i + 256])
    rs = loc.on_wake(start, end); rd = wd.localize(y, start, end)
    stream_ok = bool(abs(rs.az - rd.az) < 1e-6)

    out = os.path.join(ROOT, "out"); os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, "wake_doa_eval.csv"), "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=list(summary[0].keys())); w.writeheader(); w.writerows(summary)
    json.dump({"config": {"array": a.array, "trials_per_rt60": a.trials, "rt60": a.rt60, "wake_s": WAKE_S, "snr_db": 20,
                          "kws_jitter_s": a.kws_jitter, "tv_min_sep_deg": 45},
               "summary": summary, "conf_calibration": calib, "timing_python": timing, "stream_matches_offline": stream_ok},
              open(os.path.join(out, "wake_doa_summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"\n{'RT60':>5} {'条件':<14} {'方法':<22} {'MAE':>6} {'Acc@10':>7} {'粗大错误':>6} {'锁定电视':>6}")
    for r in summary:
        print(f"{r['rt60']:>5} {r['cond']:<14} {r['method']:<22} {r['mae']:>6.1f} {r['acc10']*100:>6.1f}% {r['gross']*100:>6.1f}% {r['tv_lock']*100:>6.1f}%")
    print("置信度分档（方法 D）：", calib)
    print("耗时（Python，单次唤醒测向）：", timing)
    print("流式接口与离线调用一致：", stream_ok)
    plot(summary, example, wd.srp.grid, a.rt60, os.path.join(out, "fig_wake_doa.png"))


def plot(summary, example, grid, rts, path):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import logging; logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
    plt.rcParams.update({"font.sans-serif": ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei", "DejaVu Sans"],
                         "axes.unicode_minus": False, "font.size": 9})
    NAVY, TEAL, RED, GRAY, LIGHT = "#17375E", "#1F7A68", "#C7000B", "#5B6B7F", "#B9C7D6"
    fig, axs = plt.subplots(1, 2, figsize=(10.4, 3.6), dpi=220, gridspec_kw={"width_ratios": [1.6, 1]})
    ax = axs[0]; rt = rts[-1]
    show = [METHODS[1], METHODS[2], METHODS[3], METHODS[5]]
    cols = [LIGHT, GRAY, TEAL, NAVY]
    labels = ["SRP-PHAT + 起始段加权（原基线）", "+ 背景互谱扣除", "GEVD-MUSIC（背景白化）", "GEVD-MUSIC，KWS 边界误差 0.1 s"]
    xs = np.arange(len(CONDS)); bw = 0.2
    for i, (m, c, lb) in enumerate(zip(show, cols, labels)):
        v = [next(r["acc10"] for r in summary if r["rt60"] == rt and r["cond"] == cn and r["method"] == m) * 100 for cn, _ in CONDS]
        bars = ax.bar(xs + (i - 1.5) * bw, v, bw * 0.92, color=c, label=lb)
        for b, vv in zip(bars, v):
            ax.text(b.get_x() + b.get_width() / 2, vv + 1, f"{vv:.0f}", ha="center", fontsize=6.5, color="#333")
    ax.set_xticks(xs); ax.set_xticklabels([c for c, _ in CONDS]); ax.set_ylim(0, 118); ax.set_ylabel("误差 ≤10° 的比例（%）")
    ax.set_title(f"唤醒词定向精度（仿真，RT60 {rt} s，1 s 唤醒词，4 麦 5.7 cm）", fontsize=10, fontweight="bold", color=NAVY)
    ax.legend(fontsize=7, frameon=False, loc="upper right", ncol=2)
    ax.grid(axis="y", color="#E3E8EF", lw=0.7); ax.spines[["top", "right"]].set_visible(False); ax.set_axisbelow(True)
    ax = axs[1]
    if example is not None:
        _, _, _, paz, taz, p_srp, p_d = example
        nz = lambda p: (p - p.min()) / (p.max() - p.min() + 1e-12)
        ax.plot(grid, nz(p_srp), color=GRAY, lw=1.5, label="SRP + 背景互谱扣除")
        ax.plot(grid, nz(p_d), color=TEAL, lw=1.8, label="GEVD-MUSIC")
        ax.axvline(paz, color=NAVY, ls="--", lw=1.2, label="说话人")
        ax.axvline(taz, color=RED, ls=":", lw=1.5, label="电视")
        ax.set_xlim(0, 360); ax.set_xticks([0, 90, 180, 270, 360]); ax.set_xlabel("方位角（°）"); ax.set_ylabel("空间谱（归一化）")
        ax.set_title("示例：电视 SIR 0 dB 时的空间谱", fontsize=10, fontweight="bold", color=NAVY)
        ax.legend(fontsize=7, frameon=False, loc="upper right"); ax.grid(color="#E3E8EF", lw=0.7); ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout(); fig.savefig(path, facecolor="white"); plt.close(fig)


if __name__ == "__main__":
    main()
