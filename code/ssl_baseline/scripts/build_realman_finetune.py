# -*- coding: utf-8 -*-
"""用 RealMAN 验证集的部分场景构建"实录微调数据"（与仿真训练数据同格式：1.5 s，开口前 1.0 s + 开口后 0.5 s，6 麦 3 cm）。

场景划分（与测试集严格不重叠）：
  微调：OfficeRoom1、LivingRoom6、LivingRoom8；挑选模型：Auditorium；
  验证集中与测试集同名的 OfficeLobby、OfficeRoom3 不用。
样本：同一场景、不同位置（折叠后方位差 ≥10°）的两句话叠加，三类：
  换人（A 在 B 开口前 0.2–0.6 s 说完）、抢话（A 在 B 开口后 0.2–0.8 s 说完）、安静后开口（开口前只有同场景真实背景噪声）；
  空出的时段用同场景真实背景噪声填补（见 build_realman_test.py）。
输出：work/train_data_realman_ft/{train,val}/shard_000.npz（字段同仿真训练数据：x int16、scale、az、az_prev、cond、rt60、room）
运行：python scripts/build_realman_finetune.py
"""
import csv, glob, os, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import build_realman_test as T

W = os.path.join(ROOT, "work", "realman_val")
SPLITS = {"train": ["OfficeRoom1", "LivingRoom6", "LivingRoom8"], "val": ["Auditorium"]}
PER_SCENE = {"train": 1500, "val": 400}
FS = 16000
N = int(1.5 * FS); ON = FS


def labels():
    lab = {}
    for kind in ["static", "moving"]:
        for r in csv.DictReader(open(os.path.join(W, f"val_{kind}_source_location.csv"))):
            a = [float(v) for v in r["angle(°)"].split(",")]
            lab[os.path.basename(r["filename"])] = a[min(2, len(a) - 1)]
    return lab


def main():
    lab = labels()
    for split, scenes in SPLITS.items():
        rng = np.random.default_rng({"train": 101, "val": 202}[split])
        X, meta = [], []
        for si, sc in enumerate(scenes):
            files = sorted(glob.glob(os.path.join(W, sc, "*", "*", "*_CH0.flac")))
            utts = [(f, T.fold(90.0 - lab[os.path.basename(f).replace("_CH0", "")])) for f in files if os.path.basename(f).replace("_CH0", "") in lab]
            utts = [u for u in utts if abs(u[1]) <= 80]
            cache = {}
            get = lambda f: cache.setdefault(f, T.load(f))
            bank = T.noise_bank(utts, 30 * FS)
            for k in range(PER_SCENE[split]):
                fb, azb = utts[rng.integers(len(utts))]
                cond = int(rng.choice(3, p=[0.4, 0.3, 0.3]))                 # 0 换人、1 抢话、2 安静后开口
                seg = np.zeros((6, N)); xb = get(fb)
                nb = min(xb.shape[1], N - ON); seg[:, ON:ON + nb] += xb[:, :nb]
                aza = azb
                if cond in (0, 1):
                    cands = [u for u in utts if u[0] != fb and abs(u[1] - azb) >= 10]
                    fa, aza = cands[rng.integers(len(cands))]
                    xa = get(fa)
                    lo, hi = ((-0.6, -0.2), (0.2, 0.8))[cond]
                    end = min(N, ON + int(rng.uniform(lo, hi) * FS)); st = end - xa.shape[1]
                    a0, a1 = max(0, st), end
                    seg[:, a0:a1] += xa[:, a0 - st: a1 - st]
                    T.fill(seg, bank, 0, a0, rng); T.fill(seg, bank, a1, ON, rng)
                else:
                    T.fill(seg, bank, 0, ON, rng)
                sc_ = float(np.max(np.abs(seg)) / 32000.0 + 1e-12)
                X.append(np.round(seg / sc_).astype(np.int16))
                meta.append({"scale": sc_, "az": azb, "az_prev": aza, "cond": cond, "rt60": -1.0, "room": si})
            print(f"[{split}] {sc}: 话语 {len(utts)}，样本 {PER_SCENE[split]}", flush=True)
        out = os.path.join(ROOT, "work", "train_data_realman_ft", split); os.makedirs(out, exist_ok=True)
        np.savez(os.path.join(out, "shard_000.npz"), x=np.stack(X), **{k: np.array([m[k] for m in meta]) for k in meta[0]})
        print(f"[{split}] 共 {len(X)} 个样本 → {out}")


if __name__ == "__main__":
    main()
