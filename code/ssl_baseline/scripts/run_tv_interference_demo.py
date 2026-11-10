# -*- coding: utf-8 -*-
"""电视干扰场景：画面内的电视从 2 s 起一直在放人声（画面里没有人），真人 12 s 后在画面外开口。

对比“启用 / 不启用干扰方向表”：不启用时跟踪器被电视锁住，真人方向的观测被门控拒绝；
启用后电视方向在“有声无人”累计若干秒后被屏蔽，真人开口即可触发转向。
运行：python scripts/run_tv_interference_demo.py → out/tv_demo.json、out/fig_tv_interference.png
多种子统计：python scripts/run_tv_interference_demo.py --seeds 8 → out/tv_demo_seeds.json
"""
import json, os, sys
import numpy as np
import scipy.io.wavfile as wavfile
import pyroomacoustics as pra

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from ssl_baseline import PRESETS, SRPPHAT, stft, EnergyFluxTrigger, PTZController, PTZConfig, TrackerConfig, metrics
from ssl_baseline.sim import make_room, mics_3d, motor_noise, simulate_near_field, highpass

FS, NFFT, HOP = 16000, 512, 256
TV_AZ, PERSON_AZ, PERSON_T0, DUR = 320.0, 120.0, 12.0, 28.0


def render(seed=3, rt60=0.4):
    rng = np.random.default_rng(seed)
    _, tv = wavfile.read(os.path.join(ROOT, "data", "tv_en.wav")); tv = tv.astype(float) / 32768
    _, sp = wavfile.read(os.path.join(ROOT, "data", "speech_zh.wav")); sp = sp.astype(float) / 32768
    tv, sp = highpass(tv, FS), highpass(sp, FS)
    tv = tv / np.sqrt(np.mean(tv ** 2)) * np.sqrt(np.mean(sp ** 2))  # 电视与真人语音电平相当
    n = int(DUR * FS); tv = np.resize(tv, n)
    mic = PRESETS["square4"]; dims = [6.0, 5.0, 2.8]; c = np.array([3.0, 2.5, 1.5])
    pos = lambda az, d: [c[0] + d * np.cos(np.deg2rad(az)), c[1] + d * np.sin(np.deg2rad(az)), 1.2]
    room = make_room(dims, FS, rt60)
    room.add_source(pos(TV_AZ, 2.3), signal=tv[: n - int(2.0 * FS)], delay=2.0)  # 电视 2 s 后开始播放
    room.add_source(pos(PERSON_AZ, 2.0), signal=sp[: n - int(PERSON_T0 * FS)], delay=PERSON_T0)
    room.add_microphone_array(pra.MicrophoneArray(mics_3d(mic, c), FS)); room.simulate()
    y = room.mic_array.signals[:, :n]
    ym = simulate_near_field(motor_noise(n, FS, rng), FS, mic, [0.03, -0.06, -0.08])
    ps = np.mean(y ** 2); ym = ym * np.sqrt(ps / np.mean(ym ** 2) * 10 ** 0.6)
    y = y + rng.normal(0, np.sqrt(ps / 100), y.shape)
    return mic, stft(y, FS, NFFT, HOP), stft(ym, FS, NFFT, HOP)[1]


def run(mic, fZ, Zm, use_table, pan0=300.0, hfov=90.0, seed=5):
    rng = np.random.default_rng(seed)
    f, Zs = fZ
    srp = SRPPHAT(mic, FS, NFFT)
    fpb = int(round(0.1 * FS / HOP)); nb = Zs.shape[2] // fpb; dt = fpb * HOP / FS
    trig = EnergyFluxTrigger()
    cfg = PTZConfig(hfov=hfov, interf_seconds=4.0 if use_table else 1e9)
    ctl = PTZController(cfg, TrackerConfig(dt=dt), pan=pan0)
    e_all = srp.band_energy_db(Zs); floor = np.percentile(e_all, 10); e_prev = None
    rec = {k: [] for k in ["t", "pan", "trk", "state", "motor"]}
    for b in range(nb):
        sl = slice(b * fpb, (b + 1) * fpb); t = (b + 0.5) * dt
        motor = ctl.motor_on
        Z = Zs[:, :, sl] + (Zm[:, :, sl] if motor else 0)
        active = trig.step(np.mean(np.abs(Z[0, srp.band, :]), axis=1))
        e = srp.band_energy_db(Z); w = srp.onset_weights(e, prev_db=e_prev, floor_db=trig.noise_db + 6); e_prev = e[-1]
        az, conf = srp.peak(srp.aggregate(srp.map(Z), w))
        person = None  # 画面里只有在真人入画时才检测到人（电视不是人）
        if t >= PERSON_T0 and metrics.angdiff(PERSON_AZ, ctl.pan) <= hfov / 2 - 3 and rng.random() < (0.5 if motor else 0.9):
            person = (PERSON_AZ + rng.normal(0, 2.0)) % 360
        pan, state = ctl.step(dt, active, az, conf, person)
        for k, v in zip(rec.keys(), [t, pan, ctl.trk.az, state.value, motor]):
            rec[k].append(v)
    t = np.array(rec["t"]); pan = np.array(rec["pan"])
    inview = metrics.angdiff(pan, PERSON_AZ) <= hfov / 2
    after = t >= PERSON_T0
    t_turn = float(t[after & inview][0] - PERSON_T0) if (after & inview).any() else float("nan")
    masked = [i * cfg.interf_bin for i in np.where(ctl.interf)[0]]
    return rec, {"use_table": use_table, "person_in_view_after_s": round(t_turn, 2),
                 "person_in_view_ratio_after_onset": round(float(inview[after].mean()), 3),
                 "masked_bins_deg": masked}


def plot(results, path, hfov=90.0):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    plt.rcParams.update({"font.sans-serif": ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei", "DejaVu Sans"], "axes.unicode_minus": False, "font.size": 9})
    NAVY, TEAL, RED, GRAY = "#17375E", "#1F7A68", "#C7000B", "#5B6B7F"
    fig, axs = plt.subplots(1, 2, figsize=(8.9, 3.3), dpi=220, sharey=True)
    for ax, (rec, summ) in zip(axs, results):
        t = np.array(rec["t"]); pan = np.array(rec["pan"]) % 360
        trk = np.array([np.nan if v is None else v for v in rec["trk"]], float)
        lo, hi = pan - hfov / 2, pan + hfov / 2
        ax.fill_between(t, lo, hi, color=TEAL, alpha=0.12, lw=0, label="画面视场")
        ax.fill_between(t, lo + 360, hi + 360, color=TEAL, alpha=0.12, lw=0)
        ax.fill_between(t, lo - 360, hi - 360, color=TEAL, alpha=0.12, lw=0)
        pan_plot = pan.copy(); jump = np.r_[False, np.abs(np.diff(pan)) > 180]; pan_plot[jump] = np.nan
        ax.plot(t, pan_plot, color=NAVY, lw=1.8, label="云台朝向")
        ax.axhline(TV_AZ, color=RED, ls=":", lw=1.5, label="电视方向（画面内、无人）")
        ax.plot([PERSON_T0, t.max()], [PERSON_AZ] * 2, color=GRAY, ls="--", lw=1.4, label="真人方向（12 s 后开口）")
        ax.scatter(t, trk, s=4, color=TEAL, label="跟踪输出", zorder=3)
        ax.axvline(PERSON_T0, color=GRAY, lw=0.8)
        ax.set_ylim(0, 360); ax.set_yticks([0, 90, 180, 270, 360]); ax.set_xlim(0, t.max())
        ax.set_xlabel("时间（s）"); ax.grid(color="#E3E8EF", lw=0.7); ax.spines[["top", "right"]].set_visible(False)
        ok = np.isfinite(summ["person_in_view_after_s"])
        ttl = ("启用干扰方向表" if summ["use_table"] else "不启用干扰方向表")
        sub = f"真人开口后 {summ['person_in_view_after_s']:.1f} s 入画" if ok else "始终未转向真人"
        ax.set_title(f"{ttl}：{sub}", fontsize=10.5, fontweight="bold", color=TEAL if ok else RED)
    axs[0].set_ylabel("方位角（°）")
    h, l = axs[0].get_legend_handles_labels()
    fig.legend(h, l, loc="upper center", ncol=5, fontsize=8.5, frameon=False)
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    fig.savefig(path, facecolor="white"); plt.close(fig)


def seeds_summary(seeds):
    """多个随机种子（房间噪声、电机噪声、视觉漏检不同）下的统计：是否转向真人、首次入画时间。"""
    rows = []
    for sd in seeds:
        mic, fZ, Zm = render(seed=sd)
        for use in (False, True):
            rec, summ = run(mic, fZ, Zm, use)
            t = np.array(rec["t"]); inv = metrics.angdiff(np.array(rec["pan"]), PERSON_AZ) <= 45.0
            after = t >= PERSON_T0; hit = after & inv
            i0 = int(np.argmax(hit)) if hit.any() else None
            rows.append({"seed": sd, "use_table": use, "first_in_view_s": summ["person_in_view_after_s"],
                         "in_view_ratio_from_onset": round(float(inv[after].mean()), 3),
                         "in_view_ratio_after_entry": None if i0 is None else round(float(inv[i0:].mean()), 3)})
            print(rows[-1], flush=True)
    return rows


if __name__ == "__main__":
    if "--seeds" in sys.argv:
        n = int(sys.argv[sys.argv.index("--seeds") + 1])
        rows = seeds_summary(list(range(n)))
        out = os.path.join(ROOT, "out"); os.makedirs(out, exist_ok=True)
        json.dump(rows, open(os.path.join(out, "tv_demo_seeds.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        sys.exit(0)
    mic, fZ, Zm = render()
    res = [run(mic, fZ, Zm, False), run(mic, fZ, Zm, True)]
    out = os.path.join(ROOT, "out"); os.makedirs(out, exist_ok=True)
    json.dump([r[1] for r in res], open(os.path.join(out, "tv_demo.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for r in res: print(r[1])
    plot(res, os.path.join(out, "fig_tv_interference.png"))
