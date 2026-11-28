"""60 s 全流程演示图：一段场景里各人说话时段、对话对象真值与锁定输出（12 月仿真交付物"时间–方位图"）。

  python scripts/plot_scene60_demo.py --kind case2 --seed 7 --idx 0
输出 out/scene60_demo_<kind>.png 与同名 .json（逐 0.25 s 的输出，便于复查）。
"""
import argparse, json, os, sys
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1"); os.environ.setdefault("OMP_NUM_THREADS", "1")
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_scene60_pipeline as P
from make_scene60 import build_ctx
from run_min_validation import pick_segment, angdiff
from earbud_ssl import scene60 as SC
from earbud_ssl.sphere import sphere_tf, azimuth_points


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kind", default="case2", choices=["turns", "case2"])
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--idx", type=int, default=0, help="取该种子下的第几段场景（与评测时的顺序一致）")
    ap.add_argument("--thresh", type=float, default=3.5)
    a = ap.parse_args()
    ctx = build_ctx()
    fm = (ctx["freqs"] >= 200) & (ctx["freqs"] <= 7000); grid = np.arange(-180, 180, 5.0)
    ctx.update({"fmask": fm, "grid": grid, "Hg": sphere_tf(azimuth_points(grid, 1.5), ctx["mics"], ctx["freqs"])})
    pick = lambda n, r: pick_segment(ctx["speech"], n, r)
    kcfg = [v for v in P.KINDS.values() if v["kind"] == a.kind][0]
    rng = np.random.default_rng(a.seed + (0 if a.kind == "turns" else 1000))
    for _ in range(a.idx + 1):
        sc = SC.make_scene(rng, kcfg)
        Y, _ = SC.render(sc, ctx, rng, pick)
        rows, sw, _ = P.run_scene(sc, Y, ctx, rng, a.thresh)

    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    plt.rcParams["font.family"] = ["Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans CJK JP", "WenQuanYi Zen Hei", "SimHei", "sans-serif"]
    plt.rcParams["axes.unicode_minus"] = False
    NAVY, GRAY, RED = "#134074", "#8C8C8C", "#B22222"
    fig, axes = plt.subplots(2, 1, figsize=(12, 7.2), sharex=True, gridspec_kw={"height_ratios": [1, 1], "hspace": 0.12})
    tt = sc.tt
    t_r = np.array([r["t"] for r in rows])
    truth = np.array([np.nan if r["truth_p"] is None else r["truth_p"] for r in rows])
    show = [("纯声学", "跟随"), ("高帧率档常开", "对话组")]
    for ax, (m, L) in zip(axes, show):
        for p in sc.persons:
            if p.role != "partner":
                continue
            az = sc.az_head(p)
            ax.plot(tt, np.where(p.speaking, az, np.nan), color="#C9D7E6", lw=6, solid_capstyle="butt", zorder=1)
        ax.plot(t_r, truth, color=RED, lw=1.2, ls="--", zorder=3, label="对话对象真值")
        out = np.array([np.nan if r["out"][m][L] is None else r["out"][m][L] for r in rows])
        ax.plot(t_r, out, color=NAVY, lw=0, marker="o", ms=2.8, zorder=4, label=f"锁定输出（{m}，{L}）")
        ok = [angdiff(o, tr) <= 10 for o, tr in zip(out, truth) if not (np.isnan(o) or np.isnan(tr))]
        on = np.flatnonzero(np.diff(np.r_[0, sc.self_speech.astype(int), 0]) != 0).reshape(-1, 2)
        for i, (s0, s1) in enumerate(on):
            ax.axvspan(tt[s0], tt[min(s1, sc.T - 1)], color=GRAY, alpha=0.15, lw=0, label="佩戴者自己说话" if i == 0 else None)
        ax.set_ylim(-60, 60); ax.set_ylabel("头部坐标方位（°）"); ax.grid(color="#E3E3E3", lw=0.5)
        ax.set_title(f"{m} + {L}：锁定正确（≤10°）{np.mean(ok) * 100:.0f}%，每分钟切换 {len(sw[m][L]) / ((60 - P.T_START) / 60):.0f} 次", fontsize=11, loc="left")
        ax.legend(loc="upper right", fontsize=9, ncol=3, frameon=False)
    axes[1].set_xlabel("时间（s）"); axes[1].set_xlim(0, 60)
    fig.text(0.01, 0.005, f"浅蓝粗线：对面 3 人各自说话的时段（{a.kind}）；仿真：刚性球头部，2+1 阵列，RT60 0.5 s，SNR 10 dB，旁桌 2 人持续说话", fontsize=8.5, color="gray")
    fig.savefig(os.path.join(ROOT, "out", f"scene60_demo_{a.kind}.png"), dpi=150, bbox_inches="tight"); plt.close(fig)
    with open(os.path.join(ROOT, "out", f"scene60_demo_{a.kind}.json"), "w", encoding="utf-8") as f:
        json.dump({"seed": a.seed, "idx": a.idx, "events": sc.events, "rows": rows}, f, ensure_ascii=False)
    print("ok")


if __name__ == "__main__":
    main()
