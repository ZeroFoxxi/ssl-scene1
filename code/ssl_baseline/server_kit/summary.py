# -*- coding: utf-8 -*-
"""把服务器上的训练结果汇总成一段文字（几十行），直接复制发回即可；同时存到 out/server_summary.txt。
包括：环境与 GPU、正在运行的任务、各实验的参数量 / 计算量 / 验证集最好 / 测试集四种条件、同一档不同种子的差别、出错日志的最后几行。
运行（在 code/ssl_baseline 下）：python3 server_kit/summary.py
"""
import glob, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT, LOGS = os.path.join(ROOT, "out"), os.path.join(ROOT, "work", "logs")
CONDS = ["C1 换人", "C2 抢话", "C3 远端扬声器", "C4 空调噪声"]
lines = []
p = lines.append
pc = lambda v: f"{int(v * 100 + 0.5 + 1e-9)}%"                               # 常规四舍五入（f-string 的 .0f 对 .5 取偶）


def sh(cmd):
    try:
        return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30).stdout.strip()
    except Exception as e:
        return f"（{e}）"


p("== 场景一服务器训练汇总 ==")
p("时间 " + sh("date '+%Y-%m-%d %H:%M'") + " | Python " + sys.version.split()[0])
p("GPU " + sh("nvidia-smi --query-gpu=index,name,memory.used,memory.total,utilization.gpu --format=csv,noheader | tr '\\n' ';'"))
run = sh("pgrep -af 'scripts/train_doa_net.py|gen_meeting_train_data.py|gen_meeting_test_data.py|eval_test_baselines.py' | grep -v pgrep")
p("正在运行：" + ("无" if not run else ""))
for r in run.splitlines():
    m = re.search(r"(scripts/\S+\.py.*)", r); p("  " + (m.group(1)[:120] if m else r[:120]))

sl = os.path.join(LOGS, "start.log")
if os.path.exists(sl):
    st = [x for x in open(sl, encoding="utf-8", errors="replace").read().splitlines() if x.startswith("[")]
    p("启动日志最后几步：")
    for x in st[-4:]:
        p("  " + x[:150])

base = os.path.join(OUT, "test_baselines.json")
if os.path.exists(base):
    b = json.load(open(base, encoding="utf-8"))
    p("传统基线（固定测试集，开口后 0.5 s，误差 ≤10°）：")
    for k, v in b.items():
        if k.endswith("0.5s"):
            p(f"  {k.split(' | ')[0]:<22}" + " ".join(f"{c[3:]} {pc(v['平均|' + c])}" for c in CONDS) + f" | 平均 {v['平均|四种条件平均'] * 100:.1f}%")

res = {}
mfiles = sorted(glob.glob(os.path.join(OUT, "nn_test_results_crnn_meeting_*.json")))
if mfiles:
    p("小网络（固定测试集，误差 ≤10°；验证集最好轮次的模型，只评测一次）：")
for f in mfiles:
    d = json.load(open(f, encoding="utf-8")); t = d["test_acc10"]
    name = d["model"].replace("crnn_meeting_", "")
    lg = os.path.join(OUT, f"nn_train_log_{d['model']}.json")
    ep = json.load(open(lg, encoding="utf-8")) if os.path.exists(lg) else []
    sec = sum(e.get("sec", 0) for e in ep)
    res[name] = t["平均|四种条件平均"]
    p(f"  {name:<10} 参数 {d['params'] / 1e6:.2f} M  乘加 {d['macs_per_decision'] / 1e8:.2f} 亿  验证 {d['best_val_acc10'] * 100:.1f}%  "
      + " ".join(f"{c[3:]} {pc(t['平均|' + c])}" for c in CONDS) + f" | 平均 {t['平均|四种条件平均'] * 100:.1f}%  "
      + f"RT60 0.3/0.6：{pc(t['0.3|四种条件平均'])}/{pc(t['0.6|四种条件平均'])}  {len(ep)} 轮 {sec / 60:.0f} 分钟  设备 {d['device']}")
if res:
    p("同一档不同种子：")
    for z in sorted({k.split("_seed")[0] for k in res}):
        v = [res[k] * 100 for k in res if k.split("_seed")[0] == z]
        p(f"  {z}：" + " / ".join(f"{x:.1f}%" for x in v) + (f"（差 {max(v) - min(v):.1f} 个百分点）" if len(v) > 1 else ""))

# 非会议室默认配置（如 RealMAN 阵列的通用房间仿真）：没有固定测试集，列出验证集结果
vo = {}
for f in sorted(glob.glob(os.path.join(ROOT, "work", "models", "crnn_*_seed*.json"))):
    d = json.load(open(f, encoding="utf-8"))
    if d.get("data", "train_data") == "train_data" or os.path.exists(os.path.join(OUT, f"nn_test_results_{os.path.basename(f)[:-5]}.json")):
        continue                                                             # 有会议室固定测试集结果的，已列在上面
    vo[os.path.basename(f)[:-5]] = d
if vo:
    p("其他数据配置（只有验证集，误差 ≤10°；验证集最好轮次）：")
    for k, d in vo.items():
        p(f"  {k:<34} 数据 {d['data']}  参数 {d['params'] / 1e6:.2f} M  乘加 {d['macs_per_decision'] / 1e8:.2f} 亿  验证 {d['val_acc10'] * 100:.1f}%（第 {d['epoch']} 轮）")

# 还在训练或出错的实验
for f in sorted(glob.glob(os.path.join(LOGS, "train_crnn_*.log"))):
    name = os.path.basename(f)[len("train_"):-4]
    txt = open(f, encoding="utf-8", errors="replace").read()
    if "完成" in txt or "固定测试集" in txt:
        continue                                                             # 已完成，结果在上面
    eps = re.findall(r"'epoch': (\d+).*?'val_acc10': ([0-9.]+)", txt)
    last = txt.strip().splitlines()[-1] if txt.strip() else ""
    if "Traceback" in txt or "Error" in last:
        p(f"  {name}：出错，日志最后 15 行：")
        for x in txt.strip().splitlines()[-15:]:
            p("    " + x[:160])
    elif eps:
        p(f"  {name}：训练中，第 {eps[-1][0]} 轮，验证 {float(eps[-1][1]) * 100:.1f}%")
    else:
        p(f"  {name}：已启动，日志最后一行：{(txt.strip().splitlines() or [''])[-1][:120]}")

text = "\n".join(lines)
print(text)
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, "server_summary.txt"), "w", encoding="utf-8").write(text + "\n")
