"""情况 2 的增强仿真（12 月计划 6b 节第一版）：定位结果驱动 MVDR，60 s 场景里能把目标从相邻两人中分出多少。

场景：scene60 的 case2（目标在中间，另外两人相隔 20–30° 互相说话，一样响或低 6 dB；旁桌 2 人；RT60 0.5 s；SNR 10 dB），
按 2+2 阵列渲染（左耳前、后，右耳前、后）；定位用其中 2+1 子阵（左耳 2 麦 + 右耳前麦）跑全流程（高帧率档常开 + 对话组锁定）。
增强（每 0.25 s 按方位更新一次权重，每个频点）：
  A 本地 2 麦：只用左耳 2 麦（间距 1.5 cm）做 MVDR；
  B 两耳 4 麦：两耳 4 麦组阵做 MVDR（耳间链路按理想、无时延处理，时延影响另算）。
  MVDR：w = R⁻¹d / (dᴴR⁻¹d)，d 为头部模板在目标方位的导向向量（相对左耳前麦），R 为目标不说话、佩戴者也不说话时的混合信号协方差
  （按唇动 / 骨声纹判断，此处用剧本真值；递推时间常数 1 s，对角加载 1e-3）。另算一组上限：R 直接用干扰本身（理想干扰协方差）。
方位来源：真值（含理想干扰协方差的上限）；真值偏 5° / 10°；全流程实际锁定输出（锁错时就是对准了别人）。
耳间链路时延（只对 B）：右耳两路整体晚 1 / 2 帧（16 / 32 ms）直接参与组阵（不等待、不补偿），导向向量不变，协方差按延后的信号估计。
指标：目标在说话、佩戴者没说话的帧里，200–7000 Hz 信干比提升（dB，输出相对左耳前麦）；干扰 = 其余所有声源 + 噪声。
每个声源单独渲染，所以目标与干扰经过同一个滤波器后可以分别算功率。

  python scripts/run_scene60_enhance.py --n 4 --seed 101 --tag dev
  python scripts/run_scene60_enhance.py --n 20 --seed 7 --tag eval
"""
import argparse, json, os, sys, time
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1"); os.environ.setdefault("OMP_NUM_THREADS", "1")
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_scene60_pipeline as P
from make_scene60 import build_ctx
from run_min_validation import pick_segment, angdiff
from earbud_ssl import scene60 as SC
from earbud_ssl.sphere import sphere_tf, azimuth_points, earbud_mic_set

FS, FPS = SC.FS, SC.FPS
BLOCK = int(round(P.DT * FPS))
SUBS = {"A 本地 2 麦（左耳）": [0, 1], "B 两耳 4 麦": [0, 1, 2, 3]}
SOURCES = ["真值 + 理想干扰协方差", "真值", "真值偏 5°", "真值偏 10°", "全流程锁定", "真值，右耳晚 16 ms（不等待）", "真值，右耳晚 32 ms（不等待）"]
LINK = {"真值，右耳晚 16 ms（不等待）": 1, "真值，右耳晚 32 ms（不等待）": 2}   # 右耳两路整体晚几帧（帧移 16 ms），只用于 B
CONDS = {"另两人一样响": 0.0, "另两人低 6 dB": -6.0}


def mvdr_track(Y, no_update, az_blocks, Htab, mics, fm, tau=1.0, load=1e-3):
    """按块更新的 MVDR 权重。Y: (M,F,T) 用来估计干扰协方差的信号；no_update: 这些帧不更新协方差（目标在说、佩戴者在说）；
    az_blocks: 每块的目标方位（头部坐标，°），None 表示保持。返回 W: (T,Msub,F)。"""
    Z = Y[mics][:, fm]                    # (m,F,T)
    m, F, T = Z.shape
    a = np.exp(-1 / (tau * FPS))
    R = np.tile(np.eye(m, dtype=complex)[None], (F, 1, 1)) * 1e-6
    W = np.zeros((T, m, F), complex)
    w = None; az_cur = None
    for k in range(T):
        if not no_update[k]:
            x = Z[:, :, k].T
            R = a * R + (1 - a) * (x[:, :, None] * x[:, None, :].conj())
        if k % BLOCK == 0:
            az = az_blocks[k // BLOCK] if k // BLOCK < len(az_blocks) else None
            if az is not None:
                az_cur = az
            if az_cur is not None:
                d = Htab[int(round(az_cur)) % 360][mics][:, fm]            # (m,F)
                d = (d / d[0:1]).T                                         # 相对左耳前麦，(F,m)
                Rl = R + (load * np.trace(R, axis1=1, axis2=2).real / m)[:, None, None] * np.eye(m)
                Ri_d = np.linalg.solve(Rl, d[:, :, None])[:, :, 0]
                w = Ri_d / np.sum(d.conj() * Ri_d, axis=1, keepdims=True)   # (F,m)
        if w is not None:
            W[k] = w.T
    return W


def apply(W, X, mics, fm):
    Z = X[mics][:, fm]                                 # (m,F,T)
    return np.einsum("tmf,mft->ft", W.conj(), Z)


def sir_gain(W, tgt, intf, mics, fm, sel):
    yt, yi = apply(W, tgt, mics, fm)[:, sel], apply(W, intf, mics, fm)[:, sel]
    t0, i0 = tgt[0][fm][:, sel], intf[0][fm][:, sel]
    p = lambda x: np.sum(np.abs(x) ** 2) + 1e-20
    return 10 * np.log10(p(yt) / p(yi)) - 10 * np.log10(p(t0) / p(i0))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=4)
    ap.add_argument("--seed", type=int, default=101)
    ap.add_argument("--tag", default="dev")
    ap.add_argument("--only", choices=["0", "-6"], help="只跑一种电平（0：另两人一样响；-6：低 6 dB）")
    a = ap.parse_args()
    ctx4 = build_ctx("2+2")
    fm = (ctx4["freqs"] >= 200) & (ctx4["freqs"] <= 7000); grid = np.arange(-180, 180, 5.0)
    ctx3 = dict(ctx4)
    m21 = earbud_mic_set("2+1")
    assert np.allclose(m21, ctx4["mics"][[0, 1, 2]]), "2+1 应是 2+2 的前三个麦克风"
    ctx3.update({"mics": m21, "fmask": fm, "grid": grid, "Hg": sphere_tf(azimuth_points(grid, 1.5), m21, ctx4["freqs"])})
    pick = lambda n, r: pick_segment(ctx4["speech"], n, r)
    out = {"setup": {"n_per_cond": a.n, "seed": a.seed, "subsets": SUBS, "sources": SOURCES, "band_hz": [200, 7000],
                     "mvdr": "目标不说话时的混合协方差，τ = 1 s，对角加载 1e-3，每 0.25 s 更新方位", "locator": "全流程：高帧率档常开 + 对话组锁定"}}
    t0 = time.time()
    for cname, sir in CONDS.items():
        if a.only is not None and float(a.only) != sir:
            continue
        rng = np.random.default_rng(a.seed + 2000 + int(-sir))
        res = {s: {src: [] for src in SOURCES} for s in SUBS}; lock_acc = []
        for i in range(a.n):
            sc = SC.make_scene(rng, {"kind": "case2", "case2_sir_db": sir})
            Y, parts = SC.render(sc, ctx4, rng, pick)
            rows, _, _ = P.run_scene(sc, Y[[0, 1, 2]], ctx3, rng, 3.5)
            tp = int(sc.target[sc.target >= 0][0])
            tgt = parts[tp]; intf = Y - tgt
            active = sc.persons[tp].speaking & ~sc.self_speech
            truth_b = [float(sc.az_head(sc.persons[tp])[min(sc.T - 1, int(r["t"] * FPS))]) for r in rows]
            lock_b = [r["out"]["高帧率档常开"]["对话组"] for r in rows]
            lock_acc.append(float(np.mean([o is not None and angdiff(o, tr) <= 10 for o, tr in zip(lock_b, truth_b)]) * 100))
            # 方位按块对齐：rows 从 T_START 开始，每块 0.25 s
            pad = int(round(P.T_START / P.DT))
            srcs = {"真值 + 理想干扰协方差": [None] * pad + truth_b, "真值": [None] * pad + truth_b, "真值偏 5°": [None] * pad + [x + 5 for x in truth_b],
                    "真值偏 10°": [None] * pad + [x + 10 for x in truth_b], "全流程锁定": [None] * pad + lock_b}
            sel = active.copy(); sel[: int(P.T_START * FPS)] = False
            srcs.update({k: srcs["真值"] for k in LINK})
            for sname, mics in SUBS.items():
                for src, azb in srcs.items():
                    if src in LINK:
                        if len(mics) < 4:
                            res[sname][src].append(None); continue
                        dly = LINK[src]
                        sh = lambda X: np.concatenate([X[:2], np.concatenate([np.zeros_like(X[2:, :, :dly]), X[2:, :, :-dly]], axis=2)], axis=0)
                        Yd, td, idd = sh(Y), sh(tgt), sh(intf)
                        W = mvdr_track(Yd, sc.persons[tp].speaking | sc.self_speech, azb, ctx4["Htab"], mics, fm)
                        res[sname][src].append(float(sir_gain(W, td, idd, mics, fm, sel)))
                        continue
                    if src == "真值 + 理想干扰协方差":   # 上限：干扰协方差直接用干扰本身（每帧更新）
                        W = mvdr_track(intf, np.zeros(sc.T, bool), azb, ctx4["Htab"], mics, fm)
                    else:                              # 实际：目标没说、佩戴者没说的帧里用混合信号估计
                        W = mvdr_track(Y, sc.persons[tp].speaking | sc.self_speech, azb, ctx4["Htab"], mics, fm)
                    res[sname][src].append(float(sir_gain(W, tgt, intf, mics, fm, sel)))
            print(cname, f"{i + 1}/{a.n}", f"{time.time() - t0:.0f} s", "锁定", round(lock_acc[-1], 1),
                  {s: round(res[s]["真值"][-1], 1) for s in SUBS}, flush=True)
        out[cname] = {"信干比提升_dB（中位数 / 最小 / 最大）": {s: {src: ([round(float(np.median(v)), 1), round(float(np.min(v)), 1), round(float(np.max(v)), 1)]
                                                               if all(x is not None for x in v) else None) for src, v in d.items()} for s, d in res.items()},
                      "全流程锁定正确率_%（各段）": [round(x, 1) for x in lock_acc], "逐段": res}
        print(json.dumps(out[cname]["信干比提升_dB（中位数 / 最小 / 最大）"], ensure_ascii=False, indent=1), flush=True)
    out["elapsed_s"] = round(time.time() - t0)
    with open(os.path.join(ROOT, "out", f"scene60_enhance_{a.tag}.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
