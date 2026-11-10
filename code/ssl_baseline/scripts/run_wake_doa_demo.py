# -*- coding: utf-8 -*-
"""离线 demo：唤醒词定向（电视开 / 关）。

场景：随机鞋盒房间，电视在一侧持续播放人声；用户在随机方位静默一段后说唤醒词（用中文 TTS 语音的
起始 1.0 s 代替），随后继续说话。唤醒在唤醒词结束时回调，给出起止样点；定位从环形缓存取片段测向。

对比方法（同一批仿真数据）：
  A  SRP-PHAT（逐帧 PHAT，片段内能量门限）          —— 原基线做法
  B  A + 起始段加权
  C  唤醒定向：互谱平均 + 起始段加权（不扣背景）     —— 消融
  D  唤醒定向：C + 背景互谱扣除（默认配置）
  D' D，但唤醒词起止点带误差（模拟 KWS 边界不准，σ = 0.1 s）

运行：python scripts/run_wake_doa_demo.py --trials 60
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
PRE_S, WAKE_S, POST_S = 2.5, 1.0, 0.5          # 唤醒词前静默、唤醒词长度、唤醒词后继续说话
SPEECH_ONSETS = [1.05, 3.5, 5.31, 7.67, 9.52, 12.36, 14.95]  # speech_zh.wav 中“静音后起始”的位置（s）
CONDS = [("电视关", None), ("电视 SIR +5 dB", 5.0), ("电视 SIR 0 dB", 0.0)]
METHODS = ["A 逐帧SRP-PHAT", "B +起始段加权", "C 互谱平均+加权", "D 唤醒定向(+背景扣除)", "D' D+KWS边界误差"]


def load(name):
    _, x = wavfile.read(os.path.join(ROOT, "data", name))
    return highpass(x.astype(float) / 32768, FS)


def place(rng, ac, L, W, dmin, dmax, az=None, avoid=None, min_sep=45.0):
    for _ in range(500):
        a = rng.uniform(0, 360) if az is None else az
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
    ap.add_argument("--trials", type=int, default=60)
    ap.add_argument("--rt60", type=float, nargs="+", default=[0.3, 0.6])
    ap.add_argument("--array", default="square4")
    ap.add_argument("--kws-jitter", type=float, default=0.1, help="KWS 起止点误差标准差（s）")
    a = ap.parse_args()
    mic = PRESETS[a.array]
    sp, tv = load("speech_zh.wav"), load("tv_en.wav")
    srp = SRPPHAT(mic, FS, NFFT)
    wd_nobg = WakeDOA(mic, FS, WakeDOAConfig(bg_subtract=False))
    wd = WakeDOA(mic, FS)
    rng = np.random.default_rng(2026)
    rows, raw, tcost = [], [], []
    example = None
    for rt in a.rt60:
        t0 = time.time()
        for k in range(a.trials):
            yp, yt, paz, taz, start, end = render_trial(rng, sp, tv, rt, mic)
            for cname, sir in CONDS:
                y = mix(rng, yp, yt, sir, start, end)
                est = {}
                est[METHODS[0]] = baseline_ab(srp, y, start, end, False)
                est[METHODS[1]] = baseline_ab(srp, y, start, end, True)
                r = wd_nobg.localize(y, start, end); est[METHODS[2]] = (r.az, r.conf)
                tt = time.perf_counter(); r = wd.localize(y, start, end); tcost.append(time.perf_counter() - tt)
                est[METHODS[3]] = (r.az, r.conf)
                js, je = (int(v + rng.normal(0, a.kws_jitter) * FS) for v in (start, end))
                r = wd.localize(y, js, max(je, js + int(0.3 * FS))); est[METHODS[4]] = (r.az, r.conf)
                for m, (az, conf) in est.items():
                    raw.append({"rt60": rt, "cond": cname, "method": m, "truth": round(paz, 2), "tv_az": round(taz, 2) if sir is not None else "",
                                "est": round(az, 2), "conf": round(conf, 3), "err": round(float(metrics.angdiff(az, paz)), 2)})
                if example is None and rt == a.rt60[-1] and sir == 0.0 and metrics.angdiff(est[METHODS[1]][0], taz) < 15 \
                        and metrics.angdiff(est[METHODS[3]][0], paz) < 10:
                    example = (y, start, end, paz, taz)
        print(f"RT60={rt}s  {a.trials} 个房间  用时 {time.time() - t0:.0f}s")

    # 汇总
    summary = []
    for rt in a.rt60:
        for cname, sir in CONDS:
            for m in METHODS:
                sel = [r for r in raw if r["rt60"] == rt and r["cond"] == cname and r["method"] == m]
                est = np.array([r["est"] for r in sel]); tr = np.array([r["truth"] for r in sel])
                d = metrics.doa_metrics(est, tr)
                tv_lock = float(np.mean([metrics.angdiff(r["est"], r["tv_az"]) < 15 for r in sel])) if sir is not None else 0.0
                summary.append({"rt60": rt, "cond": cname, "method": m, "mae": round(d["mae"], 2), "median": round(d["median"], 2),
                                "acc10": round(d["acc10"], 3), "acc20": round(d["acc20"], 3), "gross": round(d["gross"], 3),
                                "tv_lock": round(tv_lock, 3), "n": d["n"]})
    # 置信度是否可用：方法 D 中，置信度高低两组的正确率
    dsel = [r for r in raw if r["method"] == METHODS[3]]
    confs = np.array([r["conf"] for r in dsel]); errs = np.array([r["err"] for r in dsel])
    thr = float(np.median(confs))
    calib = {"conf_median": round(thr, 3),
             "acc10_conf_high": round(float((errs[confs >= thr] <= 10).mean()), 3),
             "acc10_conf_low": round(float((errs[confs < thr] <= 10).mean()), 3)}
    timing = {"localize_ms_mean": round(1000 * float(np.mean(tcost)), 2), "localize_ms_p95": round(1000 * float(np.percentile(tcost, 95)), 2)}

    # 流式接口自检：环形缓存 + 唤醒回调 与 直接调用结果一致
    y, start, end, paz, taz = example if example is not None else (mix(rng, yp, yt, 0.0, start, end), start, end, paz, taz)
    loc = WakeWordLocalizer(mic, FS, buffer_s=2.5)
    for i in range(0, end + int(0.2 * FS), 256):  # 16 ms 一块推入，唤醒在终点后 0.2 s 回调
        loc.push(y[:, i:i + 256])
    rs = loc.on_wake(start, end); rd = wd.localize(y, start, end)
    stream_ok = bool(abs(rs.az - rd.az) < 1e-6)

    out = os.path.join(ROOT, "out"); os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, "wake_doa_eval.csv"), "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=list(summary[0].keys())); w.writeheader(); w.writerows(summary)
    json.dump({"config": {"array": a.array, "trials_per_rt60": a.trials, "rt60": a.rt60, "wake_s": WAKE_S, "snr_db": 20,
                          "kws_jitter_s": a.kws_jitter, "tv_min_sep_deg": 45},
               "summary": summary, "conf_calibration": calib, "timing": timing, "stream_matches_offline": stream_ok},
              open(os.path.join(out, "wake_doa_summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"\n{'RT60':>5} {'条件':<14} {'方法':<24} {'MAE':>6} {'Acc@10':>7} {'粗大错误':>6} {'锁定电视':>6}")
    for r in summary:
        print(f"{r['rt60']:>5} {r['cond']:<14} {r['method']:<24} {r['mae']:>6.1f} {r['acc10']*100:>6.1f}% {r['gross']*100:>6.1f}% {r['tv_lock']*100:>6.1f}%")
    print("置信度：", calib)
    print("耗时（Python，单次唤醒测向）：", timing)
    print("流式接口与离线调用一致：", stream_ok)
    plot(summary, example, wd, a.rt60, os.path.join(out, "fig_wake_doa.png"))


def plot(summary, example, wd, rts, path):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    plt.rcParams.update({"font.sans-serif": ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei", "DejaVu Sans"],
                         "axes.unicode_minus": False, "font.size": 9})
    NAVY, TEAL, RED, GRAY, LIGHT = "#17375E", "#1F7A68", "#C7000B", "#5B6B7F", "#9FB3C8"
    fig, axs = plt.subplots(1, 2, figsize=(9.6, 3.5), dpi=220, gridspec_kw={"width_ratios": [1.45, 1]})
    # 左：Acc@10（最高 RT60），各条件 × 方法
    ax = axs[0]; rt = rts[-1]
    show = [METHODS[0], METHODS[1], METHODS[3], METHODS[4]]
    cols = [LIGHT, GRAY, TEAL, NAVY]
    labels = ["SRP-PHAT（原基线）", "+ 起始段加权", "唤醒定向（+ 背景扣除）", "唤醒定向，KWS 边界误差 0.1 s"]
    xs = np.arange(len(CONDS)); bw = 0.2
    for i, (m, c, lb) in enumerate(zip(show, cols, labels)):
        v = [next(r["acc10"] for r in summary if r["rt60"] == rt and r["cond"] == cn and r["method"] == m) * 100 for cn, _ in CONDS]
        bars = ax.bar(xs + (i - 1.5) * bw, v, bw * 0.92, color=c, label=lb)
        for b, vv in zip(bars, v):
            ax.text(b.get_x() + b.get_width() / 2, vv + 1, f"{vv:.0f}", ha="center", fontsize=7, color="#333")
    ax.set_xticks(xs); ax.set_xticklabels([c for c, _ in CONDS]); ax.set_ylim(0, 112); ax.set_ylabel("误差 ≤10° 的比例（%）")
    ax.set_title(f"唤醒词定向精度（RT60 {rt} s，1 s 唤醒词，4 麦 5.7 cm）", fontsize=10, fontweight="bold", color=NAVY)
    ax.legend(fontsize=7.5, frameon=False, loc="upper right", ncol=2)
    ax.grid(axis="y", color="#E3E8EF", lw=0.7); ax.spines[["top", "right"]].set_visible(False); ax.set_axisbelow(True)
    # 右：示例空间谱
    ax = axs[1]
    if example is not None:
        y, start, end, paz, taz = example
        g = wd.srp.grid
        cfg0 = WakeDOAConfig(bg_subtract=False)
        for c, lb, col in [(cfg0, "不扣背景", GRAY), (WakeDOAConfig(), "扣除背景互谱", TEAL)]:
            d = WakeDOA(wd.mic_xy, FS, c)
            _, Zs = stft(y[:, int(start - 0.1 * FS): int(end + 0.1 * FS)], FS, NFFT, HOP); Zs = Zs[:, d.srp.band, :]
            e = 10 * np.log10(np.mean(np.abs(Zs) ** 2, axis=(0, 1)) + 1e-12)
            C = d._cross(Zs, SRPPHAT.onset_weights(e, floor_db=e.max() - 30))
            if c.bg_subtract:
                b1 = int(start - 0.25 * FS); _, Zb = stft(y[:, b1 - int(0.6 * FS): b1], FS, NFFT, HOP); Zb = Zb[:, d.srp.band, :]
                C = C - d._cross(Zb, np.ones(Zb.shape[2]))
            ax.plot(g, d._scan(C), color=col, lw=1.6, label=lb)
        ax.axvline(paz, color=NAVY, ls="--", lw=1.2, label="说话人")
        ax.axvline(taz, color=RED, ls=":", lw=1.5, label="电视")
        ax.set_xlim(0, 360); ax.set_xticks([0, 90, 180, 270, 360]); ax.set_xlabel("方位角（°）"); ax.set_ylabel("归一化 SRP")
        ax.set_title("示例：电视 SIR 0 dB 时的空间谱", fontsize=10, fontweight="bold", color=NAVY)
        ax.legend(fontsize=7.5, frameon=False); ax.grid(color="#E3E8EF", lw=0.7); ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout(); fig.savefig(path, facecolor="white"); plt.close(fig)


if __name__ == "__main__":
    main()
