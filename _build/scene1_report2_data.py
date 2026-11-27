# -*- coding: utf-8 -*-
"""场景一第二次阶段汇报的数据（上次汇报 2026-11-18 之后的进展）：全部从 code/ssl_baseline/out/ 读取，生成 _build/scene1_report2_data.json。
服务器结果以文字形式保存在 out/server_results_2026-11-23.txt（服务器上的模型不能拿回，结果由本人抄回），这里按行解析；
还没有的结果（服务器多种子微调、会议室模型检查）为 None，PPT 里显示【待确认】。
运行：python _build/scene1_report2_data.py && node _build/build_scene1_report2.js
"""
import json, math, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "code", "ssl_baseline", "out")
load = lambda f: json.load(open(os.path.join(OUT, f), encoding="utf-8"))
has = lambda f: os.path.exists(os.path.join(OUT, f))
R1 = lambda x: math.floor(x * 10 + 0.5 + 1e-9) / 10          # 常规四舍五入到 0.1
P1 = lambda v: R1(100 * v)
mean = lambda v: sum(v) / len(v)
D = {}

# 1. 置信度（会议室阵列 s 档，固定测试集 800 个样本，开口后 0.5 s）
c = load("nn_confidence_crnn_v0.json")["win_0.5s"]
D["conf_bins"] = [{"lo": round(b["conf_lo"], 2), "hi": round(b["conf_hi"], 2), "acc": P1(b["acc10"])} for b in c["bins"]]
th7 = next(t for t in c["threshold"] if t["th"] == 0.7)
D["conf_th7"] = {"keep": P1(th7["keep"]), "wrong_kept": th7["wrong_kept"], "wrong_all": th7["wrong_all"]}

# 2. 连续会议仿真：门限 0.7（在验证会议 2027、2028 上选定），报告会议 2026 只评测一次
cl = {s["method"]: s for s in load("closed_loop_meeting_nn_conf_final_summary.json")["summary"] if s["rt60"] == "平均"}
f = lambda s: {"latency": s["latency_median_s"], "aim2s": P1(s["aim_within_2s"]), "wrong": s["wrong_per_min"], "framed": P1(s["framed_ratio"])}
D["cl"] = {"none": f(cl["小网络+远端冻结"]), "th7": f(cl["小网络+远端冻结|0.5s|置信≥0.7"])}

# 3. 实录回放（RealMAN 测试集 5 个场景 × 10 段 60 s 会议）
rp = load("realman_replay_test.json")["summary"]
g = lambda k: {"wrong": rp[k]["wrong_per_min"], "aim2s": P1(rp[k]["aim_within_2s"]), "static": P1(rp[k]["framed_static"]), "latency": rp[k]["latency_median_s"]}
D["replay"] = {"SRP-PHAT": g("SRP-PHAT"), "GEVD-MUSIC": g("GEVD-MUSIC"), "小网络": g("小网络（仿真训练）"), "+实录微调": g("小网络（+实录微调）"),
               "+实录微调+门限": g("小网络（+实录微调）|置信≥0.7"), "+纯噪声训练+门限": g("小网络（+实录微调+纯噪声）|置信≥0.7"),
               "+有人判断+门限": g("小网络（+实录微调+有人判断）|置信≥0.7")}
D["replay_n"] = {"meetings": rp["SRP-PHAT"]["n_meetings"], "switch": rp["SRP-PHAT"]["n_switch"]}

# 4. 服务器结果（文字）
txt = open(os.path.join(OUT, "server_results_2026-11-23.txt"), encoding="utf-8").read()
real = {m: float(a) for m, a in re.findall(r"^(crnn_general_lin6_3cm\S*)\s+[\d.]+%\s+([\d.]+)%", txt, re.M)}
val = {m: float(v) for m, v in re.findall(r"^\s+(crnn_general_lin6_3cm\S*)\s+参数.*?验证 ([\d.]+)%", txt, re.M)}
grp = lambda pre: [k for k in val if re.fullmatch(pre + r"_seed\d", k)]
D["scale"] = []
for lab, pre in [("12,000 · 0.28 M", "crnn_general_lin6_3cm_s"), ("12,000 · 2.13 M", "crnn_general_lin6_3cm_l"),
                 ("60,000 · 0.28 M", "crnn_general_lin6_3cm_60k_s"), ("60,000 · 2.13 M", "crnn_general_lin6_3cm_60k_l")]:
    ks = [k for k in grp(pre) if k.endswith(("seed0", "seed1"))]
    D["scale"].append({"label": lab, "sim": round(mean([val[k] for k in ks]), 3), "real": round(mean([real[k] for k in ks]), 3),   # 不先取整，显示时再取整（避免两次舍入）
                       "real_seeds": [real[k] for k in ks]})
D["ep150"] = [float(v) for v in re.findall(r"crnn_general_lin6_3cm_ep150_s_seed\d\s+验证 ([\d.]+)%", txt)]
D["meeting60k"] = [float(v) for v in re.findall(r"60k_s_seed\d\s+参数 [\d.]+ M\s+验证 [\d.]+%.*?平均 ([\d.]+)%", txt)]
m = re.search(r"种子平均：基线 ([\d.]+)%.*?扩散噪声 ([\d.]+)%.*?位置误差 ([\d.]+)%", txt)
D["aug"] = {"base": float(m.group(1)), "dif": float(m.group(2)), "difjit": float(m.group(3)),
            "seeds": {k: [real[f"crnn_general_lin6_3cm{t}_s_seed{i}"] for i in range(4)] for k, t in [("base", ""), ("dif", "_dif"), ("difjit", "_difjit")]}}

# 5. 实录误差诊断（RealMAN 测试集 600 个样本）
dg = load("realman_error_diagnosis.json")
D["diag"] = {}
for k, lab in [("GEVD-MUSIC", "GEVD-MUSIC"), ("crnn_general_lin6_3cm", "小网络"), ("crnn_lin6_3cm_ft", "+实录微调")]:
    v = dg[k]
    D["diag"][lab] = {"by_az": {b: P1(x[1]) for b, x in v["按 |方位|"].items()},
                      "bias_by_dist": {b: R1(x) for b, x in v["两侧 60–80° 偏向正前方（中位数，°）按距离"].items()}}
D["diag_n"] = dg["crnn_general_lin6_3cm"]["两侧 60–80° 样本数按距离"]
D["diag_n_az"] = {b: x[0] for b, x in dg["crnn_general_lin6_3cm"]["按 |方位|"].items()}

# 6. 实录微调（单种子）与数据量实验
D["realman"] = {"base": P1(load("realman_eval.json")["methods"]["小网络（仿真训练）"]["全部"]["acc10"]),
                "ft": P1(load("realman_eval_ft.json")["methods"]["小网络（仿真训练）"]["全部"]["acc10"]),
                "gevd": P1(load("realman_eval.json")["methods"]["GEVD-MUSIC"]["全部"]["acc10"])}
D["amount"] = load("realman_data_amount.json") if has("realman_data_amount.json") else None
D["server_ft"] = None                                                     # 服务器多种子微调（out/server_models_realman.txt）【待确认】
D["meeting_check"] = None                                                 # 会议室 60,000 模型连续会议检查【待确认】

# 7. 端侧
q = load("nn_compute_crnn_v0.json")
D["compute"] = {"params": q["params"], "macs": q["macs_total"], "kb_int8": q["weights_kb_int8"],
                "layers": [[r["层"], R1(100 * r["占比"])] for r in q["layers"]],
                "quant": {k: P1(v["acc10"]) for k, v in q["quant"].items()}}

json.dump(D, open(os.path.join(HERE, "scene1_report2_data.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps(D, ensure_ascii=False, indent=1)[:4000])
