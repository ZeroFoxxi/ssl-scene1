# -*- coding: utf-8 -*-
"""流式转向 demo：多通道音频按 0.1 s 一块送入 StreamingTurner（ssl_baseline/stream.py），输出摄像头朝向、每次测向的方位与置信度。

输入（三选一）：
  --wav <文件>              多通道 wav / flac（16 kHz；通道顺序与 --array 一致）——拿到自有阵列后录一段会议即可直接跑；
  --realman <场景:段号>      用 RealMAN 测试集的真实录音拼一段 60 s 会议（与 run_realman_replay_demo.py 相同的拼法，有真值）；
  --live                    麦克风实时输入（需安装 sounddevice；【未在云端测试，接上硬件后验证】）。
阵列：--array lin6_3cm（RealMAN）/ lin6_17.5cm（会议室方案）；自有阵列用 --mic-x 给出各麦克风沿阵列的坐标（米）。
测向：--ckpt 小网络模型（与阵列对应），--conf 置信度门限；不给 --ckpt 时用 GEVD-MUSIC。
输出：out/stream_demo<tag>.csv（每块：时刻、朝向、测向方位、置信度、处理结果）、.png（朝向与测向随时间，有真值时画真值）；
      打印每块处理耗时（中位数 / 95% / 最大）。
运行：python scripts/run_stream_demo.py --realman OfficeRoom3:0 --ckpt work/models/crnn_lin6_3cm_ft.pt --conf 0.7
      python scripts/run_stream_demo.py --wav meeting.wav --mic-x -0.0875 -0.0525 -0.0175 0.0175 0.0525 0.0875 --ckpt <模型>
"""
import argparse, csv, os, sys, time
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
from ssl_baseline.stream import StreamingTurner
from ssl_baseline.wake import WakeDOA, WakeDOAConfig
from ssl_baseline.doa import SRPConfig
from ssl_baseline.geometry import aliasing_frequency
from ssl_baseline import metrics
from gen_meeting_train_data import ARRAYS

FS, DT = 16000, 0.1
FRONT = ((85.0, 275.0),)


def blocks_from_file(path, n_ch):
    import soundfile as sf
    x, fs = sf.read(path, always_2d=True)
    x = x.T
    if fs != FS:
        import scipy.signal as sps
        g = np.gcd(int(fs), FS); x = sps.resample_poly(x, FS // g, int(fs) // g, axis=1)
    assert x.shape[0] >= n_ch, f"文件只有 {x.shape[0]} 个通道，阵列需要 {n_ch} 个"
    x = x[:n_ch]; bs = int(DT * FS)
    for b in range(x.shape[1] // bs):
        yield x[:, b * bs:(b + 1) * bs]


def blocks_live(n_ch, device=None):
    import queue
    import sounddevice as sd                                                # 【未在云端测试】
    q, bs = queue.Queue(), int(DT * FS)
    with sd.InputStream(samplerate=FS, channels=n_ch, blocksize=bs, device=device, dtype="float32",
                        callback=lambda data, frames, t, status: q.put(data.copy().T)):
        while True:
            yield q.get()


def main():
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--wav"); src.add_argument("--realman"); src.add_argument("--live", action="store_true")
    ap.add_argument("--array", default="lin6_3cm", choices=list(ARRAYS))
    ap.add_argument("--mic-x", type=float, nargs="*", default=None, help="自有线阵：各麦克风沿阵列的坐标（米），顺序与通道一致")
    ap.add_argument("--ckpt", default=None); ap.add_argument("--conf", type=float, default=0.7)
    ap.add_argument("--device", default=None); ap.add_argument("--seconds", type=float, default=60.0, help="--live 时运行多久")
    ap.add_argument("--tag", default="")
    a = ap.parse_args()
    xy = np.stack([np.zeros(len(a.mic_x)), np.array(a.mic_x)], 0) if a.mic_x else ARRAYS[a.array]
    n_ch = xy.shape[1]
    srp = SRPConfig(fmax=min(4000.0, 0.95 * aliasing_frequency(xy)))
    base = dict(pad_pre=0.0, pad_post=0.0, exclude=FRONT, srp=srp)
    raw = WakeDOA(xy, FS, WakeDOAConfig(method="srp_sub", bg_subtract=False, onset=False, **base))
    if a.ckpt:
        from ssl_baseline.nn_doa import NNDOA
        est, th, label = NNDOA(os.path.join(ROOT, a.ckpt) if not os.path.isabs(a.ckpt) else a.ckpt, in_ch=2 * (n_ch - 1) + 1), a.conf, "小网络"
    else:
        est, th, label = WakeDOA(xy, FS, WakeDOAConfig(**base)), 0.0, "GEVD-MUSIC"
    turns = None
    if a.realman:
        import run_realman_replay_demo as RP
        import build_realman_test as B
        sc, k = a.realman.split(":"); k = int(k)
        W = os.path.join(ROOT, "work", "realman"); lab = RP.load_labels(W, "test")
        scenes = sorted(d for d in os.listdir(W) if os.path.isdir(os.path.join(W, d)))
        utts = RP.scene_utts(W, sc, lab); load = RP.Cache()
        bank = B.noise_bank([(u["f"], 0) for u in utts if u["kind"] == "static"], int(RP.DUR * FS) + FS)
        rng = np.random.default_rng(7 * 100 + scenes.index(sc))                # 与 run_realman_replay_demo.py 默认种子的同一批会议
        for _ in range(k + 1):
            x, turns = RP.build_meeting(rng, utts, bank, load)
        bs = int(DT * FS); gen = (x[:, b * bs:(b + 1) * bs] for b in range(x.shape[1] // bs))
    elif a.wav:
        gen = blocks_from_file(a.wav, n_ch)
    else:
        gen = blocks_live(n_ch, a.device)
    st = StreamingTurner(est, raw, fs=FS, dt=DT, conf_th=th, freeze=False)
    rows, tt = [], []
    for blk in gen:
        t1 = time.perf_counter(); ev = st.push(blk); tt.append(time.perf_counter() - t1)
        d = ev["decisions"][-1] if ev["decisions"] else {}
        rows.append({"t": round(ev["t"], 2), "pan": round(ev["pan"], 2), "az": d.get("az"), "conf": d.get("conf"), "out": d.get("out", ""),
                     "cmd": ev["cmd"][1] if ev["cmd"] else None})
        if ev["cmd"]:
            print(f"{ev['t']:6.1f} s  转向 {(ev['cmd'][1] + 180) % 360 - 180:+6.1f}°（置信度 {d.get('conf', float('nan')):.2f}）", flush=True)
        if a.live and ev["t"] >= a.seconds:
            break
    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
    out = os.path.join(ROOT, "out", f"stream_demo{a.tag}")
    with open(out + ".csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    tt = np.array(tt) * 1000
    print(f"{label}：{len(rows)} 块，转向 {len(st.cmds)} 次；每块处理耗时 中位数 {np.median(tt):.1f} ms、95% {np.percentile(tt, 95):.1f} ms、"
          f"最大 {tt.max():.1f} ms（块长 {DT * 1000:.0f} ms）→ {out}.csv")
    try:
        plot(rows, turns, label, out + ".png")
    except Exception as e:
        print("画图跳过：", e)


def plot(rows, turns, label, path):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    plt.rcParams["font.sans-serif"] = ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei"]
    plt.rcParams["axes.unicode_minus"] = False
    w = lambda a: (np.asarray(a, float) + 180) % 360 - 180
    t = np.array([r["t"] for r in rows]); pan = w([r["pan"] for r in rows])
    fig, ax = plt.subplots(figsize=(11, 3.6))
    if turns:
        for u in turns:
            tr = np.asarray(u["traj"], float)
            tt = u["start"] + np.arange(len(tr)) * 0.1 if len(tr) > 1 else np.array([u["start"], u["end"]])
            ax.plot(tt, tr if len(tr) > 1 else [tr[0]] * 2, color="#C9CED6", lw=5, solid_capstyle="butt", label="说话人（真值）" if u is turns[0] else None)
    ax.plot(t, pan, color="#134074", lw=1.8, label="摄像头朝向")
    dec = [(r["t"], w(r["az"]), r["conf"], r["out"]) for r in rows if r["az"] is not None]
    if dec:
        d = np.array([(a, b, c) for a, b, c, _ in dec], float)
        sc = ax.scatter(d[:, 0], d[:, 1], c=d[:, 2], cmap="viridis", vmin=0.3, vmax=1.0, s=18, zorder=3, label="测向（颜色 = 置信度）")
        fig.colorbar(sc, ax=ax, pad=0.01, label="置信度")
    ax.set_xlabel("时间（s）"); ax.set_ylabel("方位（°）"); ax.set_ylim(-90, 90); ax.set_title(f"流式转向（{label}）")
    ax.legend(loc="upper right", fontsize=8, ncol=3); ax.grid(alpha=0.3)
    fig.tight_layout(); fig.savefig(path, dpi=150); plt.close(fig)


if __name__ == "__main__":
    main()
