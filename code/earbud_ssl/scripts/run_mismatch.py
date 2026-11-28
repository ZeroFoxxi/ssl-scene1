"""方向模板与真实头部不一致时，测向掉多少（阵列 2+1）。

背景：此前所有仿真中，生成信号与方向模板用同一个刚性球模型（模板与真实完全一致），偏乐观。
实际产品中，模板只能按标准头型或样机实测做一次，而每个人的头大小、耳机戴的角度、麦克风装配都不同。
这里只改"真实"一侧，模板保持标称（头半径 8.75 cm、标称麦克风位置），看 GEVD-MUSIC 与软融合掉多少。
注意：刚性球没有耳廓，耳廓的影响不在此列，需要实测头部传递函数（见 12 月仿真计划）。

情况：
  一致：真实 = 模板
  头小 / 头大：真实头半径 7.5 / 10 cm（成人头宽约 14–17 cm【参考，按常见人体测量范围】，取两端）
  装配误差：每个麦克风位置每轴加 σ = 2 mm 的随机偏差
  佩戴角度：每只耳机的耳柄绕耳轴（y 轴）随机转 ±20°（两耳独立），即前后两麦连线上下倾斜
  佩戴偏转：每只耳机绕竖直轴随机转 ±10°（两耳独立），即前后两麦连线左右偏
  综合：头半径在 7.5–10 cm 间随机 + 装配误差 + 佩戴角度 ±20° + 佩戴偏转 ±10°

用法：python scripts/run_mismatch.py [--trials 100] [--seed 21]
"""
import argparse, json, os, sys, time
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_algo_selection as RA
from earbud_ssl import methods as M
from earbud_ssl import sphere as SP
from earbud_ssl.sphere import earbud_mic_set, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import ltas, NFFT

FS = 16000
CONDS = ["S2 混响 + 2 个干扰（SIR 6 dB）", "S4 混响 + 2 个干扰（SIR 0 dB）"]
CASES = ["一致", "头小 7.5 cm", "头大 10 cm", "装配误差 2 mm", "佩戴角度 ±20°", "佩戴偏转 ±10°", "综合"]
A0 = SP.HEAD_RADIUS


def rot(p, center, axis, deg):
    """把点 p 绕过 center、方向为 axis（'y' 或 'z'）的轴转 deg 度。"""
    t = np.deg2rad(deg); c, s = np.cos(t), np.sin(t)
    R = {"y": np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]]), "z": np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])}[axis]
    return (p - center) @ R.T + center


def true_geometry(case, rng):
    """返回（真实头半径, 真实麦克风位置）。耳机随头大小外移，保持离头表面 8 mm。"""
    a = {"头小 7.5 cm": 0.075, "头大 10 cm": 0.10}.get(case, A0)
    if case == "综合":
        a = rng.uniform(0.075, 0.10)
    mics = earbud_mic_set("2+1", a=a)
    ears = [[0, 1], [2]]                                  # 主耳两麦、副耳一麦（副耳那一只按耳机整体转）
    for idx, side in zip(ears, (1, -1)):
        center = np.array([0.0, side * (a + 0.008), -0.012])
        if case in ("佩戴角度 ±20°", "综合"):
            mics[idx] = rot(mics[idx], center, "y", rng.uniform(-20, 20))
        if case in ("佩戴偏转 ±10°", "综合"):
            mics[idx] = rot(mics[idx], center, "z", rng.uniform(-10, 10))
    if case in ("装配误差 2 mm", "综合"):
        mics = mics + rng.normal(0, 0.002, mics.shape)
    return a, mics


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--trials", type=int, default=100)
    ap.add_argument("--seed", type=int, default=21)
    a = ap.parse_args()
    freqs = np.fft.rfftfreq(NFFT, 1 / FS); grid = np.arange(-180, 180, 5.0); fm = (freqs >= 200) & (freqs <= 7000)
    speech = RA.load_speech(); psd = ltas(speech, FS)
    mics0 = earbud_mic_set("2+1")
    Hg = SP.sphere_tf(azimuth_points(grid, 1.5), mics0, freqs)          # 标称模板
    orig_tf = SP.sphere_tf
    t0 = time.time(); res = {}
    for c in CONDS:
        res[c] = {}
        for case in CASES:
            rng = np.random.default_rng(a.seed)                          # 各情况同一批声学场景
            grng = np.random.default_rng([a.seed, CASES.index(case)])    # 几何扰动单独的随机数
            rows = []
            for _ in range(a.trials):
                ra, mics = true_geometry(case, grng)
                RA.sphere_tf = lambda src, m, f, a=ra: orig_tf(src, m, f, a=a)   # 生成信号用真实头部
                ctx = {"freqs": freqs, "mics": mics, "H_diff": RA.sphere_tf(fibonacci_sphere(32, 2.0), mics, freqs), "speech": speech, "psd": psd}
                az, Yd, Yb, faces = RA.run_trial(rng, RA.CONDS[c], ctx)
                e = M.frame_energy_db(Yd, fm)
                p = M.music(M.covariance(Yd, fm, M.onset_weights(e, e.max() - 30)), Hg, fm, M.covariance(Yb, fm, np.ones(Yb.shape[2])))
                rows.append({"truth": az, "GEVD-MUSIC": M.peak(p, grid, 5.0), "GEVD-MUSIC + 视觉": M.fuse_soft(p, grid, faces, **RA.SOFT)})
            RA.sphere_tf = orig_tf
            res[c][case] = RA.summarize(rows, ["GEVD-MUSIC", "GEVD-MUSIC + 视觉"])
            print(f"{c} {case}: " + " / ".join(f"{m} {v['acc10'] * 100:.1f}%" for m, v in res[c][case].items()) + f"  {time.time() - t0:.0f} s", flush=True)
    out = {"setup": {"array": "2+1", "template": "刚性球，头半径 8.75 cm，标称麦克风位置", "cases": CASES, "trials": a.trials, "seed": a.seed},
           "results": res, "elapsed_s": time.time() - t0}
    with open(os.path.join(ROOT, "out", "mismatch.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
