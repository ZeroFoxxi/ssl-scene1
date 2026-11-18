# -*- coding: utf-8 -*-
"""会议室换人测向：固定测试集（神经网络与传统基线在同一批样本上评测）。

与评测脚本 run_meeting_eval.py 同一场景生成器与条件（随机种子 2026；RT60 0.3 / 0.6 s 各 100 个房间 × 四种条件 = 800 个样本），
阵列为 6 麦线阵 17.5 cm（暂定方案），离墙 8 cm；人声为评测用的中文 / 英文素材（训练、验证都没有用过）。
每个样本保存 B 开口前 3.0 s 到开口后 1.0 s（共 4.0 s；传统方法需要开口前的背景段，网络取开口前 1.0 s 到开口后 0.5 s），
以及 1 s 无人说话时段（长期噪声，供自适应背景方法使用）。
输出：work/train_data/test/test.npz
运行：python scripts/gen_meeting_test_data.py
"""
import os, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_meeting_eval as R
from gen_meeting_train_data import MIC_XY

FS = R.FS
PRE, POST = 3.0, 1.0


def main(trials=100, rts=(0.3, 0.6)):
    R.WALL_D = 0.08
    sp, en = R.load("speech_zh.wav"), R.load("tv_en.wav")
    rng = np.random.default_rng(2026)
    X, NZ, meta = [], [], []
    for rt in rts:
        for k in range(trials):
            r = R.render_trial(rng, sp, en, rt, mic_xy=MIC_XY)
            for ci, cond in enumerate(R.CONDS):
                y, noise = R.mix(rng, r, cond)
                s0 = r["start"]
                seg = np.zeros((6, int((PRE + POST) * FS)))
                part = y[:, max(0, s0 - int(PRE * FS)): s0 + int(POST * FS)]
                seg[:, seg.shape[1] - part.shape[1] - max(0, s0 + int(POST * FS) - y.shape[1]):][:, :part.shape[1]] = part
                sc = float(np.max(np.abs(seg)) / 32000.0 + 1e-12)
                X.append(np.round(seg / sc).astype(np.int16)); NZ.append((noise[:, :FS] / sc).astype(np.float32))
                meta.append({"scale": sc, "az": (r["azB"] + 180) % 360 - 180, "az_prev": (r["azA"] + 180) % 360 - 180,
                             "cond": ci, "rt60": rt, "room": k})
        print(f"RT60={rt}  {trials} 个房间完成", flush=True)
    out = os.path.join(ROOT, "work", "train_data", "test"); os.makedirs(out, exist_ok=True)
    np.savez(os.path.join(out, "test.npz"), x=np.stack(X), noise=np.stack(NZ), onset=int(PRE * FS),
             **{k: np.array([m[k] for m in meta]) for k in meta[0]})
    print("样本数", len(X))


if __name__ == "__main__":
    main()
