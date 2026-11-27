"""60 s 多人对话场景：生成剧本、核对统计、渲染一段并画"时间–方位"图（12 月仿真第 1 周）。

  python scripts/make_scene60.py                 # 各类型 40 段剧本统计 + 每类渲染 1 段并画图
  python scripts/make_scene60.py --n 40 --seed 7

输出：out/scene60_summary.json（剧本统计、渲染耗时与电平核对）、out/scene60_<kind>.png（时间–方位图）。
头部模型目前为刚性球（ctx["Htab"]），换实测头部传递函数时只换这张表。
"""
import argparse, json, os, sys, time
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1"); os.environ.setdefault("OMP_NUM_THREADS", "1")
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
from earbud_ssl import scene60 as SC
from earbud_ssl.sphere import sphere_tf, earbud_mic_set, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import ltas, NFFT
from run_min_validation import load_speech, pick_segment

FS = 16000


def build_ctx(array="2+1"):
    mics = earbud_mic_set(array)
    freqs = np.fft.rfftfreq(NFFT, 1 / FS)
    speech = load_speech()
    return {"freqs": freqs, "mics": mics,
            "Htab": sphere_tf(azimuth_points(np.arange(0, 360, 1.0), 1.5), mics, freqs),
            "H_diff": sphere_tf(fibonacci_sphere(32, 2.0), mics, freqs),
            "H_self": sphere_tf(azimuth_points([0.0], 0.115, el_deg=-40.0), mics, freqs)[0],   # 嘴：正前下方约 11.5 cm【近似】
            "speech": speech, "psd": ltas(speech, FS)}


def plot(scene, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    plt.rcParams["font.family"] = ["Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans CJK JP", "WenQuanYi Zen Hei", "SimHei", "sans-serif"]
    plt.rcParams["axes.unicode_minus"] = False
    NAVY, GRAY = "#134074", "#8C8C8C"
    fig, (ax, ax2) = plt.subplots(2, 1, figsize=(12, 5.6), sharex=True, gridspec_kw={"height_ratios": [4, 1.1], "hspace": 0.08})
    tt = scene.tt
    fov = scene.cfg["fov_half_deg"]
    ax.axhspan(-fov, fov, color="#EAF2F8", lw=0, zorder=0)
    def brk(a):   # 方位跨过 ±180° 时断开连线
        a = np.asarray(a, float).copy(); a[1:][np.abs(np.diff(a)) > 90] = np.nan; return a
    for p in scene.persons:
        az = brk(scene.az_head(p))
        col = "#5E5E5E" if p.role == "side" else NAVY
        ax.plot(tt, az, color=col, lw=0.6, alpha=0.35, zorder=1)
        sp = np.where(p.speaking, az, np.nan)
        ax.plot(tt, sp, color=col, lw=2.4 if p.role == "partner" else 1.4, zorder=2,
                label=("对面说话人（说话时段）" if p.role == "partner" else "旁桌说话人") if p.pid in (0, scene.cfg["n_partners"]) else None)
    tgt_az = np.full(scene.T, np.nan)
    for p in scene.persons:
        m = scene.partner == p.pid
        tgt_az[m] = scene.az_head(p)[m]
    tgt_az = brk(tgt_az)
    ax.plot(tt, tgt_az, color="#B22222", lw=1.0, ls="--", zorder=3, label="对话对象真值（回话、停顿时保持）")
    ax.set_ylim(-160, 160); ax.set_ylabel("头部坐标方位（°，左正）")
    ax.set_title(f"60 s 场景剧本（{scene.cfg['kind']}）：浅蓝带为摄像头视野（±{fov:.0f}°），细线为不说话时的位置", fontsize=11)
    ax.legend(loc="upper right", fontsize=9, ncol=3, frameon=False)
    ax.grid(color="#E3E3E3", lw=0.5)
    ax2.plot(tt, scene.yaw, color=GRAY, lw=1.2, label="佩戴者头部偏航角（°，IMU 真值）")
    on = np.flatnonzero(np.diff(np.r_[0, scene.self_speech.astype(int), 0]) != 0).reshape(-1, 2)
    for i, (a, b) in enumerate(on):
        ax2.axvspan(tt[a], tt[min(b, scene.T - 1)], color="#B22222", alpha=0.25, lw=0, label="佩戴者自己说话" if i == 0 else None)
    lim = max(10, np.abs(scene.yaw).max() * 1.2)
    ax2.set_ylim(-lim, lim); ax2.set_ylabel("转头（°）"); ax2.grid(color="#E3E3E3", lw=0.5)
    ax2.legend(loc="upper right", fontsize=9, ncol=2, frameon=False)
    ax2.set_xlim(0, scene.cfg["duration_s"]); ax2.set_xlabel("时间（s）")
    fig.tight_layout(); fig.savefig(path, dpi=150); plt.close(fig)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=40)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--no-render", action="store_true")
    a = ap.parse_args()
    out = {"setup": {"n_per_kind": a.n, "seed": a.seed, "defaults": SC.DEFAULT, "head_model": "刚性球（Duda & Martens），2+1 阵列"}}
    ctx = build_ctx()
    pick = lambda n, rng: pick_segment(ctx["speech"], n, rng)
    for kind in ("turns", "case2"):
        rng = np.random.default_rng(a.seed + (0 if kind == "turns" else 1000))
        sums = [SC.summary(SC.make_scene(rng, {"kind": kind})) for _ in range(a.n)]
        keys = [k for k in sums[0] if isinstance(sums[0][k], (int, float)) and sums[0][k] is not None]
        out[kind] = {"剧本统计（范围）": {k: [min(s[k] for s in sums), round(float(np.mean([s[k] for s in sums])), 3), max(s[k] for s in sums)] for k in keys}}
        if a.no_render:
            continue
        rng = np.random.default_rng(a.seed + 5000 + (0 if kind == "turns" else 1))
        sc = SC.make_scene(rng, {"kind": kind})
        t0 = time.time()
        Y, parts = SC.render(sc, ctx, rng, pick)
        el = time.time() - t0
        lv = {str(k): round(10 * np.log10(np.mean(np.abs(v) ** 2) + 1e-20), 1) for k, v in parts.items()}
        out[kind]["示例"] = {"统计": SC.summary(sc), "事件": sc.events[:40], "渲染耗时_s": round(el, 1),
                           "各声源平均功率_dB（相对 1.5 m 正前方直达声，含静默段）": lv, "Y 形状": list(Y.shape)}
        plot(sc, os.path.join(ROOT, "out", f"scene60_{kind}.png"))
        print(kind, "渲染", round(el, 1), "s", flush=True)
    with open(os.path.join(ROOT, "out", "scene60_summary.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(json.dumps({k: v.get("剧本统计（范围）") for k, v in out.items() if k != "setup"}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
