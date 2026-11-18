# -*- coding: utf-8 -*-
"""场景一进展汇报页的数据：全部从 code/ssl_baseline/out/ 的结果文件读取，生成 _build/scene1_progress_data.json。
运行：python _build/scene1_progress_data.py && node _build/build_scene1_progress.js
"""
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "code", "ssl_baseline", "out")
load = lambda f: json.load(open(os.path.join(OUT, f), encoding="utf-8"))
pct = lambda v: f"{100 * v:.0f}%"
CONDS = ["C1 换人", "C2 抢话", "C3 远端扬声器", "C4 空调噪声"]


def avg(S, **kw):
    return float(np.mean([x["acc10"] for x in S if all(x[k] == v for k, v in kw.items())]))


# 第 1 页：阵列选型（GEVD-MUSIC 固定背景段；四种条件、两档 RT60 平均）
s2 = load("array_study2_summary.json")["count_aperture"]
s1 = load("array_study_summary.json")["summary"]
rows1 = []
for n, nm, ap in [("2麦线阵 6cm", 2, "6 cm"), ("4麦线阵 6cm", 4, "6 cm"), ("4麦线阵 10.5cm", 4, "10.5 cm"), ("4麦线阵 17.5cm", 4, "17.5 cm"),
                  ("6麦线阵 10.5cm", 6, "10.5 cm"), ("6麦线阵 17.5cm", 6, "17.5 cm"), ("8麦线阵 10.5cm", 8, "10.5 cm"),
                  ("8麦线阵 17.5cm", 8, "17.5 cm"), ("8麦线阵 24.5cm", 8, "24.5 cm")]:
    rows1.append(["线阵（平行于前墙）", str(nm), ap, pct(avg(s2, array=n, method="G GEVD-MUSIC", win=0.5)), pct(avg(s2, array=n, method="G GEVD-MUSIC", win=1.0))])
for n, nm, ap, desc in [("4麦圆阵 r3 45°", 4, "6 cm", "圆阵（旋转 45°）"), ("6麦圆阵 r4 30°", 6, "8 cm", "圆阵（旋转 30°）")]:
    rows1.append([desc, str(nm), ap, pct(avg(s1, array=n, method="G GEVD-MUSIC", win=0.5)), pct(avg(s1, array=n, method="G GEVD-MUSIC", win=1.0))])

# 第 2 页：固定测试集上的方法对比（开口后 0.5 s 判决）
tb = load("test_baselines.json"); nn = load("nn_test_results_crnn_v0.json")
rows2 = []
for m, label, params, macs in [("SRP-PHAT | 0.5s", "SRP-PHAT", "—", "—"), ("GEVD-MUSIC | 0.5s", "GEVD-MUSIC", "—", "约 0.2 亿"),
                               ("自适应背景 GEVD-MUSIC | 0.5s", "自适应背景 GEVD-MUSIC", "—", "约 0.2 亿")]:
    r = tb[m]; rows2.append([label, params, macs] + [pct(r[f"平均|{c}"]) for c in CONDS] + [pct(r["平均|四种条件平均"])])
r = nn["test_acc10"]
rows2.append(["小网络（CRNN）", f"{nn['params'] / 1e6:.2f} M", f"{nn['macs_per_decision'] / 1e8:.1f} 亿"] + [pct(r[f"平均|{c}"]) for c in CONDS] + [pct(r["平均|四种条件平均"])])
g1 = tb["GEVD-MUSIC | 1.0s"]
rows2.append(["GEVD-MUSIC（开口后 1.0 s 判决）", "—", "约 0.2 亿"] + [pct(g1[f"平均|{c}"]) for c in CONDS] + [pct(g1["平均|四种条件平均"])])

# 第 3 页：闭环（60 段会议，两档 RT60 平均）
cl = load("closed_loop_meeting_nn_summary.json")["summary"]
rows3 = []
for arr, m, label in [("6麦线阵 17.5cm", "SRP-PHAT", "SRP-PHAT"), ("6麦线阵 17.5cm", "GEVD-MUSIC", "GEVD-MUSIC"),
                      ("6麦线阵 17.5cm", "GEVD-MUSIC+远端冻结", "GEVD-MUSIC + 远端播放时冻结"),
                      ("6麦线阵 17.5cm", "小网络+远端冻结", "小网络 + 远端播放时冻结"),
                      ("4麦线阵 17.5cm", "GEVD-MUSIC+远端冻结", "GEVD-MUSIC + 远端播放时冻结")]:
    s = next(x for x in cl if x["rt60"] == "平均" and x["array"] == arr and x["method"] == m)
    rows3.append([arr.replace("麦线阵 ", " 麦线阵，").replace("cm", " cm"), label, f"{s['latency_median_s']:.2f} s", pct(s["aim_within_2s"]),
                  f"{s['wrong_per_min']:.1f}", pct(s["framed_ratio"])])

# 第 4 页：真实录音（LOCATA）——结果文件存在时填入，否则留【待补】
rows4, n4 = [], {}
p = os.path.join(OUT, "locata_eval.json")
if os.path.exists(p):
    le = json.load(open(p, encoding="utf-8")); n4 = le["n"]
    for m, r in le["methods"].items():
        rows4.append([m] + [f"{100 * r[k]['acc10']:.0f}% / {100 * r[k]['acc20']:.0f}%" if k in r else "—" for k in ["实录单声源", "实录多声源", "叠加换人", "叠加抢话", "全部"]])

json.dump({"rows1": rows1, "rows2": rows2, "rows3": rows3, "rows4": rows4, "n4": n4,
           "nn_params": nn["params"], "nn_macs": nn["macs_per_decision"]},
          open(os.path.join(HERE, "scene1_progress_data.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("rows1", len(rows1), "rows2", len(rows2), "rows3", len(rows3), "rows4", len(rows4))
for r in rows1 + rows2 + rows3: print(r)
