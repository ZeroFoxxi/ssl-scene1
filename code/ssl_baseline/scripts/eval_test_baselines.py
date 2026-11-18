# -*- coding: utf-8 -*-
"""在固定测试集（work/train_data/test/test.npz）上评测传统基线，结果供神经网络对比。
方法：SRP-PHAT、GEVD-MUSIC（固定背景段）、自适应背景 GEVD-MUSIC；判决窗口 B 开口后 0.5 s、1.0 s。
输出：out/test_baselines.json
"""
import json, os, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_meeting_eval as R
from gen_meeting_train_data import MIC_XY
from ssl_baseline import metrics
from ssl_baseline.geometry import aliasing_frequency
from ssl_baseline.wake import WakeDOA, WakeDOAConfig
from ssl_baseline.turn import TurnDOA, TurnDOAConfig
from ssl_baseline.doa import SRPConfig

FS = R.FS
CONDS = R.CONDS


def summarize(err, cond, rt):
    out = {}
    for r in sorted(set(rt.tolist())) + ["平均"]:
        for c in range(4):
            m = (cond == c) & ((rt == r) if r != "平均" else True)
            out[f"{r}|{CONDS[c]}"] = round(float((err[m] <= 10).mean()), 3)
        m = (rt == r) if r != "平均" else np.ones_like(rt, bool)
        out[f"{r}|四种条件平均"] = round(float(np.mean([(err[m & (cond == c)] <= 10).mean() for c in range(4)])), 3)
    return out


def main():
    d = dict(np.load(os.path.join(ROOT, "work", "train_data", "test", "test.npz")))   # 一次读入内存（逐条从 npz 取会反复解压整个数组）
    on = int(d["onset"]); cond, rt, az = d["cond"], d["rt60"], d["az"]
    srp = SRPConfig(fmax=min(4000.0, 0.95 * aliasing_frequency(MIC_XY)))
    base = dict(pad_post=0.0, exclude=R.FRONT, srp=srp)
    meths = {"SRP-PHAT": WakeDOA(MIC_XY, FS, WakeDOAConfig(method="srp_sub", bg_subtract=False, **base)),
             "GEVD-MUSIC": WakeDOA(MIC_XY, FS, WakeDOAConfig(**base))}
    turn = TurnDOA(MIC_XY, FS, TurnDOAConfig(exclude=R.FRONT, srp=srp))
    res = {}
    for win in [0.5, 1.0]:
        errs = {m: [] for m in list(meths) + ["自适应背景 GEVD-MUSIC"]}
        for i in range(len(az)):
            x = d["x"][i].astype(float) * d["scale"][i]
            e = on + int(win * FS)
            for m, est in meths.items():
                errs[m].append(float(metrics.angdiff(est.localize(x, on, e).az, az[i] % 360)))
            turn.set_noise(d["noise"][i].astype(float) * d["scale"][i])
            errs["自适应背景 GEVD-MUSIC"].append(float(metrics.angdiff(turn.localize(x, on, e).az, az[i] % 360)))
        for m, v in errs.items():
            res[f"{m} | {win}s"] = summarize(np.array(v), cond, rt)
    json.dump(res, open(os.path.join(ROOT, "out", "test_baselines.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for k, v in res.items():
        print(f"{k:<28}", "  ".join(f"{c.split('|')[1]}:{v[c]*100:.0f}" for c in v if c.startswith("平均")))


if __name__ == "__main__":
    main()
