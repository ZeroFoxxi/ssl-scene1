# -*- coding: utf-8 -*-
"""在真实录音测试集上比较：SRP-PHAT、GEVD-MUSIC（固定背景段）、小网络（仿真训练）。
默认 LOCATA（build_locata_test.py 生成，5 麦）；--data/--array 可换成 RealMAN（build_realman_test.py 生成，6 麦 3 cm）。
判决：开口后 0.5 s；指标：误差 ≤10°、≤20° 的比例与平均误差，按样本类型统计。
运行：python scripts/eval_locata.py --ckpt work/models/crnn_general_lin5.pt
输出：out/locata_eval.json
"""
import argparse, json, os, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
from ssl_baseline import metrics
from ssl_baseline.geometry import aliasing_frequency
from ssl_baseline.wake import WakeDOA, WakeDOAConfig
from ssl_baseline.doa import SRPConfig
from gen_meeting_train_data import ARRAYS

FS = 16000
FRONT = ((85.0, 275.0),)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ckpt", default=None)
    ap.add_argument("--tag", default="")
    ap.add_argument("--data", default="work/locata_test/locata_test.npz")
    ap.add_argument("--array", default="lin5_4cm")
    ap.add_argument("--out", default="locata_eval")
    a = ap.parse_args()
    d = dict(np.load(os.path.join(ROOT, a.data)))
    xy = ARRAYS[a.array]; on = int(d["onset"]); names = list(d["cond_names"])
    srp_cfg = SRPConfig(fmax=min(4000.0, 0.95 * aliasing_frequency(xy)))
    srp = WakeDOA(xy, FS, WakeDOAConfig(method="srp_sub", bg_subtract=False, pad_post=0.0, exclude=FRONT, srp=srp_cfg))
    gev = {}
    nn = None
    if a.ckpt:
        from ssl_baseline.nn_doa import NNDOA
        side = a.ckpt[:-3] + ".json"                                       # 训练时保存的网络大小
        size = json.load(open(side, encoding="utf-8"))["size"] if os.path.exists(side) else "s"
        nn = NNDOA(a.ckpt, in_ch=2 * (xy.shape[1] - 1) + 1, n_threads=4, size=size)
    est = {"SRP-PHAT": [], "GEVD-MUSIC": [], **({"小网络（仿真训练）": []} if nn else {})}     # 不用 dict |，兼容 Python 3.8
    for i in range(len(d["az"])):
        x = d["x"][i].astype(float); e = on + FS // 2
        est["SRP-PHAT"].append(srp.localize(x, on, e).az)
        avail = (on - int(d["valid_from"][i])) / FS - 0.1 - 0.15             # 开口前可用的真实背景长度
        bl = round(float(np.clip(avail, 0.3, 1.0)), 1)
        if bl not in gev:
            gev[bl] = WakeDOA(xy, FS, WakeDOAConfig(bg_len=bl, pad_post=0.0, exclude=FRONT, srp=srp_cfg))
        est["GEVD-MUSIC"].append(gev[bl].localize(x, on, e).az)
        if nn:
            est["小网络（仿真训练）"].append(nn.localize(x, on, e).az)
    az = d["az"] % 360; cond = d["cond"]
    res = {"n": {names[c]: int((cond == c).sum()) for c in range(len(names))}, "methods": {}}
    for m, v in est.items():
        err = metrics.angdiff(np.array(v), az)
        r = {}
        for c in list(range(len(names))) + ["全部"]:
            sel = (cond == c) if c != "全部" else np.ones(len(err), bool)
            if sel.any():
                r[names[c] if c != "全部" else "全部"] = {"acc10": round(float((err[sel] <= 10).mean()), 3), "acc20": round(float((err[sel] <= 20).mean()), 3),
                                                        "mae": round(float(err[sel].mean()), 1)}
        res["methods"][m] = r
    json.dump(res, open(os.path.join(ROOT, "out", f"{a.out}{a.tag}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("样本数", res["n"])
    for m, r in res["methods"].items():
        print(f"{m:<14}", "  ".join(f"{k}: ≤10° {v['acc10']*100:.0f}% / ≤20° {v['acc20']*100:.0f}% / 平均 {v['mae']}°" for k, v in r.items()))


if __name__ == "__main__":
    main()
