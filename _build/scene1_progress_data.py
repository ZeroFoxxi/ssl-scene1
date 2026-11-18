# -*- coding: utf-8 -*-
"""场景一进展汇报页的数据：全部从 code/ssl_baseline/out/ 的结果文件读取，生成 _build/scene1_progress_data.json。
运行：python _build/scene1_progress_data.py && node _build/build_scene1_progress.js
"""
import json, math, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "code", "ssl_baseline", "out")
load = lambda f: json.load(open(os.path.join(OUT, f), encoding="utf-8"))
R = lambda x: int(math.floor(x + 0.5 + 1e-9))          # 常规四舍五入（Python 的 round 对 .5 取偶）
pct = lambda v: f"{R(100 * v)}%"
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

# 第 4 页：真实录音（RealMAN 6 麦 3 cm；LOCATA 5 麦）——误差 ≤10° / ≤20° 的比例
rows4, n4 = [], {}
rm = load("realman_eval.json"); lo = load("locata_eval_ep12.json")
n4 = {"realman": sum(rm["n"].values()), "locata": sum(lo["n"].values())}
f2 = lambda r: f"{R(100 * r['acc10'])}% / {R(100 * r['acc20'])}%"
for m in rm["methods"]:
    rows4.append([m, f2(rm["methods"][m]["叠加换人"]), f2(rm["methods"][m]["叠加抢话"]), f2(rm["methods"][m]["全部"]),
                  f"{rm['methods'][m]['全部']['mae']:.1f}°", f2(lo["methods"][m]["全部"])])
if os.path.exists(os.path.join(OUT, "realman_eval_ft.json")):
    rf = load("realman_eval_ft.json")["methods"]["小网络（仿真训练）"]
    rows4.append(["小网络（+实录微调）", f2(rf["叠加换人"]), f2(rf["叠加抢话"]), f2(rf["全部"]), f"{rf['全部']['mae']:.1f}°", "—"])

json.dump({"rows1": rows1, "rows2": rows2, "rows3": rows3, "rows4": rows4, "n4": n4,
           "nn_params": nn["params"], "nn_macs": nn["macs_per_decision"]},
          open(os.path.join(HERE, "scene1_progress_data.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("rows1", len(rows1), "rows2", len(rows2), "rows3", len(rows3), "rows4", len(rows4))
for r in rows1 + rows2 + rows3: print(r)


# ---------------- 汇报版（build_scene1_report.js）用的图表数据 ----------------
def series_acc(S, arr, m="G GEVD-MUSIC", w=0.5):
    return R(100 * avg(S, array=arr, method=m, win=w))


charts = {
    "aperture": {"labels": ["4 麦", "6 麦", "8 麦"],
                 "10.5 cm": [series_acc(s2, f"{n}麦线阵 10.5cm") for n in (4, 6, 8)],
                 "17.5 cm": [series_acc(s2, f"{n}麦线阵 17.5cm") for n in (4, 6, 8)]},
    "circle45": series_acc(s1, "4麦圆阵 r3 45°"),
    "methods": {"labels": ["换人", "抢话", "远端扬声器", "空调噪声"],
                "SRP-PHAT": [R(100 * tb["SRP-PHAT | 0.5s"][f"平均|{c}"]) for c in CONDS],
                "GEVD-MUSIC": [R(100 * tb["GEVD-MUSIC | 0.5s"][f"平均|{c}"]) for c in CONDS],
                "小网络": [R(100 * nn["test_acc10"][f"平均|{c}"]) for c in CONDS],
                "avg": {"SRP-PHAT": R(100 * tb["SRP-PHAT | 0.5s"]["平均|四种条件平均"]),
                        "GEVD-MUSIC": R(100 * tb["GEVD-MUSIC | 0.5s"]["平均|四种条件平均"]),
                        "小网络": R(100 * nn["test_acc10"]["平均|四种条件平均"])}},
}
g = lambda arr, m: next(x for x in cl if x["rt60"] == "平均" and x["array"] == arr and x["method"] == m)
charts["closed_loop"] = {k: {"latency": g("6麦线阵 17.5cm", m)["latency_median_s"], "aim2s": R(100 * g("6麦线阵 17.5cm", m)["aim_within_2s"]),
                             "wrong": g("6麦线阵 17.5cm", m)["wrong_per_min"], "framed": R(100 * g("6麦线阵 17.5cm", m)["framed_ratio"])}
                         for k, m in [("gevd", "GEVD-MUSIC+远端冻结"), ("nn", "小网络+远端冻结"), ("srp", "SRP-PHAT")]}
real = {"SRP-PHAT": rm["methods"]["SRP-PHAT"]["全部"], "GEVD-MUSIC": rm["methods"]["GEVD-MUSIC"]["全部"],
        "小网络（仿真训练）": rm["methods"]["小网络（仿真训练）"]["全部"]}
pft = os.path.join(OUT, "realman_eval_ft.json")
if os.path.exists(pft):
    real["小网络（+实录微调）"] = json.load(open(pft, encoding="utf-8"))["methods"]["小网络（仿真训练）"]["全部"]
charts["realman"] = {k: {"acc10": R(100 * v["acc10"]), "acc20": R(100 * v["acc20"]), "mae": v["mae"]} for k, v in real.items()}
charts["realman_n"] = sum(rm["n"].values())
charts["locata"] = {k: R(100 * v["全部"]["acc10"]) for k, v in lo["methods"].items()}
charts["locata_n"] = sum(lo["n"].values())
charts["locata20"] = {k: R(100 * v["全部"]["acc20"]) for k, v in lo["methods"].items()}
charts["nn_params"] = nn["params"]; charts["nn_macs"] = nn["macs_per_decision"]
json.dump(charts, open(os.path.join(HERE, "scene1_report_data.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("charts", json.dumps(charts, ensure_ascii=False)[:600])
