# -*- coding: utf-8 -*-
"""RealMAN 实录上的误差诊断：误差集中在哪里（方位、距离、高度角、场景、换人 / 抢话、静止 / 走动），有没有系统性偏差。
用来决定"让仿真更像实录"该先补哪一项，而不是凭经验猜。

样本：RealMAN 测试集 600 个（work/realman_test/realman_test.npz，与 eval_locata.py 相同的判决方式：开口后 0.5 s）。
标注：方位、距离、高度角取自官方 csv（走动的取开口后约 0.25 s 那一点，与方位一致）。
运行：python scripts/diagnose_realman_errors.py --ckpt work/models/crnn_general_lin6_3cm.pt [--ckpt 其他模型 ...]
输出：out/realman_error_diagnosis.json，屏幕上打印分组表
"""
import argparse, csv, json, os, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
from ssl_baseline import metrics
from ssl_baseline.geometry import aliasing_frequency
from ssl_baseline.wake import WakeDOA, WakeDOAConfig
from ssl_baseline.doa import SRPConfig
from gen_meeting_train_data import ARRAYS
import build_realman_test as B

FS = 16000
FRONT = ((85.0, 275.0),)


def labels():
    lab = {}
    for kind in ["static", "moving"]:
        for r in csv.DictReader(open(os.path.join(ROOT, "work", "realman", f"test_{kind}_source_location.csv"))):
            g = lambda k: [float(v) for v in r[k].split(",")]
            a, d, e = g("angle(°)"), g("distance"), g("ele")
            i = min(2, len(a) - 1)
            lab[os.path.basename(r["filename"])] = {"kind": kind, "dist": d[min(i, len(d) - 1)], "ele": e[min(i, len(e) - 1)]}
    return lab


def group(err, key, bins=None, names=None):
    out = {}
    if bins is None:
        for v in sorted(set(key.tolist())):
            m = key == v; out[str(v)] = (int(m.sum()), float((err[m] <= 10).mean()), float(np.median(err[m])))
    else:
        for lo, hi, nm in zip(bins[:-1], bins[1:], names):
            m = (key >= lo) & (key < hi)
            if m.any():
                out[nm] = (int(m.sum()), float((err[m] <= 10).mean()), float(np.median(err[m])))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ckpt", nargs="+", default=[os.path.join("work", "models", "crnn_general_lin6_3cm.pt")])
    a = ap.parse_args()
    from ssl_baseline.nn_doa import NNDOA
    d = dict(np.load(os.path.join(ROOT, "work", "realman_test", "realman_test.npz")))
    on = int(d["onset"]); xy = ARRAYS["lin6_3cm"]; e_ = on + FS // 2
    lab = labels()
    files = [s.split(":", 1)[1].replace("_CH0", "") for s in d["src"]]
    scene = np.array([s.split(":", 1)[0] for s in d["src"]])
    kind = np.array([lab[f]["kind"] for f in files]); dist = np.array([lab[f]["dist"] for f in files]); ele = np.array([lab[f]["ele"] for f in files])
    az = (d["az"] + 180) % 360 - 180; cond = d["cond"]
    srp_cfg = SRPConfig(fmax=min(4000.0, 0.95 * aliasing_frequency(xy)))
    ests = {"GEVD-MUSIC": WakeDOA(xy, FS, WakeDOAConfig(bg_len=1.0, pad_post=0.0, exclude=FRONT, srp=srp_cfg))}
    for c in a.ckpt:
        ests[os.path.basename(c)[:-3]] = NNDOA(os.path.join(ROOT, c), in_ch=2 * (xy.shape[1] - 1) + 1, n_threads=4)
    res = {}
    for name, est in ests.items():
        pred = np.array([(est.localize(d["x"][i].astype(float), on, e_).az + 180) % 360 - 180 for i in range(len(az))])
        err = metrics.angdiff(pred, az)
        signed = ((pred - az + 180) % 360) - 180
        towards0 = np.where(np.abs(az) > 5, -np.sign(az) * signed, np.nan)      # >0：预测偏向正前方（|预测| < |真值|）
        r = {"全部": (len(err), float((err <= 10).mean()), float(np.median(err))),
             "按 |方位|": group(err, np.abs(az), [0, 20, 40, 60, 81], ["0–20°", "20–40°", "40–60°", "60–80°"]),
             "按距离": group(err, dist, [0, 1.5, 2.5, 99], ["<1.5 m", "1.5–2.5 m", "≥2.5 m"]),
             "按高度角": group(err, ele, [-99, 2, 5, 99], ["<2°", "2–5°", "≥5°"]),
             "按场景": group(err, scene), "按说话情况": group(err, np.array([["", "", "换人", "抢话"][c] for c in cond])),
             "按静止 / 走动": group(err, kind),
             "偏向正前方（中位数，°）按 |方位|": {nm: float(np.nanmedian(towards0[(np.abs(az) >= lo) & (np.abs(az) < hi)]))
                                          for lo, hi, nm in [(5, 20, "5–20°"), (20, 40, "20–40°"), (40, 60, "40–60°"), (60, 81, "60–80°")]},
             "大错（>30°）里预测落在 0°±12° 的比例": float(np.mean(np.abs(pred[err > 30]) <= 12)) if (err > 30).any() else None,
             "大错（>30°）样本数": int((err > 30).sum())}
        side = (np.abs(az) >= 60) & (np.abs(az) < 81)                         # 靠近两侧：偏向正前方是否与距离 / 说话情况有关（区分几何偏差与噪声拉偏）
        r["两侧 60–80° 偏向正前方（中位数，°）按距离"] = {nm: float(np.nanmedian(towards0[side & (dist >= lo) & (dist < hi)])) if (side & (dist >= lo) & (dist < hi)).any() else None
                                               for lo, hi, nm in [(0, 2.0, "<2 m"), (2.0, 3.0, "2–3 m"), (3.0, 99, "≥3 m")]}
        r["两侧 60–80° 偏向正前方（中位数，°）按说话情况"] = {nm: float(np.nanmedian(towards0[side & (cond == c)])) for c, nm in [(2, "换人"), (3, "抢话")]}
        r["两侧 60–80° 样本数按距离"] = {nm: int((side & (dist >= lo) & (dist < hi)).sum()) for lo, hi, nm in [(0, 2.0, "<2 m"), (2.0, 3.0, "2–3 m"), (3.0, 99, "≥3 m")]}
        res[name] = r
        np.savez(os.path.join(ROOT, "out", f"realman_error_samples_{name}.npz"), pred=pred, az=az, dist=dist, ele=ele, cond=cond, scene=scene, kind=kind)
        print(f"\n== {name}：全部 n={r['全部'][0]}  ≤10° {r['全部'][1] * 100:.1f}%  误差中位 {r['全部'][2]:.1f}°")
        for k, v in r.items():
            if isinstance(v, dict):
                print(f"  {k}：" + "；".join(f"{kk} " + (f"n={vv[0]} {vv[1] * 100:.0f}% 中位{vv[2]:.0f}°" if isinstance(vv, tuple) else (f"n={vv}" if isinstance(vv, int) else ("—" if vv is None else f"{vv:+.1f}"))) for kk, vv in v.items()))
        print(f"  大错（>30°）{r['大错（>30°）样本数']} 个，其中预测落在 0°±12° 的比例 {r['大错（>30°）里预测落在 0°±12° 的比例']}")
    json.dump(res, open(os.path.join(ROOT, "out", "realman_error_diagnosis.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
