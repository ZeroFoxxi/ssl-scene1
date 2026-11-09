# -*- coding: utf-8 -*-
"""闭环仿真：声音触发 → 云台转向（测向冻结）→ 视觉确认 → 视听融合持续跟踪。

场景：说话人沿 2 m 圆弧从 30° 走到 200°（约 17 s），摄像头初始朝向 300°（说话人在画面外）。
阵列装在固定底座（世界坐标 = 阵列坐标）；云台转动时叠加近场电机噪声；视觉检测为模拟（画面内 90% 检出，±2° 误差）。
运行：python scripts/run_closed_loop_demo.py  → 输出 out/closed_loop.json 与 out/fig_closed_loop.png
"""
import json, os, sys
import numpy as np
import scipy.io.wavfile as wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from ssl_baseline import PRESETS, SRPPHAT, stft, EnergyFluxTrigger, PTZController, PTZConfig, TrackerConfig, metrics
from ssl_baseline.sim import simulate_trajectory, motor_noise, simulate_near_field, highpass

OUT = os.path.join(ROOT, "out"); os.makedirs(OUT, exist_ok=True)
FS, NFFT, HOP = 16000, 512, 256
rng = np.random.default_rng(7)


def main(rt60=0.5, hfov=90.0, pan0=300.0, motor_db=6.0, seed=7, min_conf=None):
    global rng
    rng = np.random.default_rng(seed)
    fs, sp = wavfile.read(os.path.join(ROOT, "data", "speech_zh.wav")); sp = highpass(sp.astype(float) / 32768, FS)
    mic = PRESETS["square4"]; dims = [6.0, 5.0, 2.8]; center = [3.0, 2.5, 1.5]
    dur = len(sp) / FS
    az_fn = lambda t: 30.0 + 170.0 * np.clip(t / dur, 0, 1)
    traj = lambda t: [center[0] + 2 * np.cos(np.deg2rad(az_fn(t))), center[1] + 2 * np.sin(np.deg2rad(az_fn(t))), 1.5]
    ys = simulate_trajectory(sp, FS, dims, rt60, mic, center, traj)
    ym = simulate_near_field(motor_noise(len(sp), FS, rng), FS, mic, [0.03, -0.06, -0.08])
    ps = np.mean(ys ** 2); ym = ym * np.sqrt(ps / np.mean(ym ** 2) * 10 ** (motor_db / 10))
    ys = ys + rng.normal(0, np.sqrt(ps / 100), ys.shape)  # 20 dB 传感器噪声
    f, Zs = stft(ys, FS, NFFT, HOP); _, Zm = stft(ym, FS, NFFT, HOP)
    srp = SRPPHAT(mic, FS, NFFT)
    band = srp.band
    fpb = int(round(0.1 * FS / HOP)); nb = Zs.shape[2] // fpb; dt = fpb * HOP / FS
    trig = EnergyFluxTrigger()
    e_all = srp.band_energy_db(Zs + 0)  # 仅用于起始段加权的逐帧能量（运行时按块因果计算，这里预先算好等价）
    ctl = PTZController(PTZConfig(hfov=hfov, min_conf=0.2 if min_conf is None else min_conf), TrackerConfig(dt=dt), pan=pan0)
    noise_floor = np.percentile(e_all, 10); e_prev = None
    rec = {k: [] for k in ["t", "truth", "pan", "trk", "state", "motor", "active", "raw", "conf", "person"]}
    for b in range(nb):
        sl = slice(b * fpb, (b + 1) * fpb)
        motor = ctl.motor_on
        Z = Zs[:, :, sl] + (Zm[:, :, sl] if motor else 0)
        active = trig.step(np.mean(np.abs(Z[0, band, :]), axis=1))
        e = srp.band_energy_db(Z)
        prev = e_prev if b > 0 else None
        w = srp.onset_weights(e, prev_db=prev, floor_db=trig.noise_db + 6)
        e_prev = e[-1]
        az, conf = srp.peak(srp.aggregate(srp.map(Z), w))
        t = (b + 0.5) * dt; truth = az_fn(t)
        person = None
        if metrics.angdiff(truth, ctl.pan) <= hfov / 2 - 3:
            p_det = 0.5 if motor else 0.9          # 转动时画面模糊，检出率下降
            if rng.random() < p_det:
                person = (truth + rng.normal(0, 2.0)) % 360
        pan, state = ctl.step(dt, active, az, conf, person)
        for k, v in zip(rec.keys(), [t, truth, pan, ctl.trk.az, state.value, motor, active, az, conf, person]):
            rec[k].append(v)
    t = np.array(rec["t"]); truth = np.array(rec["truth"]); pan = np.array(rec["pan"])
    t_on = t[np.argmax(np.array(rec["active"]))]
    acq = metrics.first_in_view_time(t, pan, truth, hfov, t0=t_on)
    i0 = int(np.searchsorted(t, t_on + acq)) if np.isfinite(acq) else 0
    moves = int(np.sum(np.diff(np.array(rec["motor"]).astype(int)) == 1))
    st_arr = np.array(rec["state"]); first_move = t[np.argmax(st_arr == "转向")] - t_on if (st_arr == "转向").any() else float("nan")
    summary = {
        "rt60": rt60, "hfov": hfov, "speech_onset_s": round(float(t_on), 2),
        "time_to_first_move_s": round(float(first_move), 2),
        "time_to_in_view_s": round(acq, 2),
        "in_view_ratio_after_acq": round(metrics.in_view_ratio(pan, truth, hfov, i0), 3),
        "center_half_ratio_after_acq": round(float((metrics.angdiff(pan[i0:], truth[i0:]) <= hfov / 4).mean()), 3),
        "pan_moves": moves,
        "track": metrics.track_metrics(rec["trk"], truth),
        "raw_doa_active_no_motor": metrics.doa_metrics(np.array(rec["raw"])[np.array(rec["active"]) & ~np.array(rec["motor"])],
                                                        truth[np.array(rec["active"]) & ~np.array(rec["motor"])]),
    }
    json.dump({"summary": summary, "rec": rec}, open(os.path.join(OUT, "closed_loop.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    plot(rec, hfov, os.path.join(OUT, "fig_closed_loop.png"))
    return summary


def plot(rec, hfov, path):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Patch
    from matplotlib.lines import Line2D
    plt.rcParams.update({"font.sans-serif": ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei", "DejaVu Sans"], "axes.unicode_minus": False, "font.size": 9})
    NAVY, TEAL, RED, AMBER, GRAY = "#17375E", "#1F7A68", "#C7000B", "#B8691A", "#5B6B7F"
    t = np.array(rec["t"]); truth = np.array(rec["truth"]); pan = np.array(rec["pan"])
    trk = np.array([np.nan if v is None else v for v in rec["trk"]], float)
    motor = np.array(rec["motor"]); st = rec["state"]
    unwrap = lambda a: np.rad2deg(np.unwrap(np.deg2rad(a)))
    panu = unwrap(pan)
    # 把 pan 展开到与真值相近的区间，便于画图
    while np.median(panu - truth) > 180: panu -= 360
    while np.median(panu - truth) < -180: panu += 360
    fig = plt.figure(figsize=(8.9, 3.9), dpi=220)
    ax = fig.add_axes([0.075, 0.31, 0.9, 0.57]); axs = fig.add_axes([0.075, 0.13, 0.9, 0.06], sharex=ax)
    ax.fill_between(t, panu - hfov / 2, panu + hfov / 2, color=TEAL, alpha=0.12, lw=0, label="画面视场")
    ax.plot(t, panu, color=NAVY, lw=1.8, label="云台朝向")
    ax.plot(t, truth, color=GRAY, lw=1.4, ls="--", label="说话人真实方位")
    trku = trk.copy()
    ok = ~np.isnan(trku)
    trku[ok] = truth[ok] + ((trku[ok] - truth[ok] + 180) % 360 - 180)
    ax.plot(t, trku, color=TEAL, lw=2.2, label="跟踪输出")
    for i in range(len(t)):
        if motor[i]:
            ax.axvspan(t[i] - 0.05, t[i] + 0.05, color=RED, alpha=0.07, lw=0)
    ax.set_ylabel("方位角（°）"); ax.grid(color="#E3E8EF", lw=0.7); ax.spines[["top", "right"]].set_visible(False)
    ax.set_xlim(0, t.max()); ax.tick_params(labelbottom=False)
    h, l = ax.get_legend_handles_labels()
    h.append(Patch(color=RED, alpha=0.2)); l.append("云台转动（测向冻结）")
    ax.legend(h, l, loc="upper left", ncol=5, fontsize=8.5, frameon=False, bbox_to_anchor=(0, 1.2))
    colors = {"待机": "#AEB9C7", "转向": RED, "视觉确认": AMBER, "跟踪": TEAL, "静音保持": "#7FB3A8"}
    for i in range(len(t)):
        axs.axvspan(t[i] - 0.05, t[i] + 0.05, color=colors[st[i]], lw=0)
    axs.set_yticks([]); axs.set_xlabel("时间（s）")
    for sp in axs.spines.values(): sp.set_visible(False)
    hs = [Patch(color=c) for c in colors.values()]
    axs.legend(hs, list(colors.keys()), ncol=5, loc="upper right", fontsize=8, frameon=False, bbox_to_anchor=(1.0, 2.75))
    axs.text(-0.01, 0.5, "状态", transform=axs.transAxes, ha="right", va="center", fontsize=9)
    fig.savefig(path, facecolor="white"); plt.close(fig)


if __name__ == "__main__":
    main()
