# -*- coding: utf-8 -*-
"""实录微调需要多少实录数据、要几个房间（RealMAN，单阵列 6 麦 3 cm）。

用来给"自己阵列的实录采集"定量：采多少分钟、分几个房间。
起点模型：仿真训练的 s 档（crnn_general_lin6_3cm，实录测试集 ≤10° 81.3%）；微调方法与 finetune_doa_net.py 相同
（每批一半实录、一半仿真，Auditorium 挑最好的一轮），**各组总步数相同（1128 步，即全量数据 8 轮）**，只改实录数据：
  A 数据量：3 个房间都用，每个房间只留 1/8、1/4、1/2 的话语（样本数不变，话语少 = 实录采得少）；全量即已有的 crnn_lin6_3cm_ft；
  B 房间数：同样约 48 分钟，1 个房间（全部话语，3 个房间各做一次取平均） vs 3 个房间各 1/3（样本总数都是 4500）；
  C 波动：全量换一个微调种子；1/4 换一组话语子集（看结果本身的波动有多大）。
评测：RealMAN 测试集 5 个场景 600 个样本（与微调、挑选的场景都不重叠），eval_locata.py。
运行（云端 CPU，一个起点模型）：python scripts/run_realman_data_amount.py [--jobs 2] [--only f025 ...]
运行（服务器 GPU，多个起点模型 = 多个种子）：
  python3 scripts/run_realman_data_amount.py --bases work/models/crnn_general_lin6_3cm_s_seed{0,1,2,3}.pt --device cuda --jobs 2 --threads 8 --tag _server
  每组数据只生成一次，各起点模型各在一块空闲 GPU 上微调，完成后删除该组数据（共用盘空间有限）。
输出：out/realman_data_amount<tag>.json、.txt（多个起点模型时按组取平均）
"""
import argparse, json, os, re, shutil, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
WORK = os.path.join(ROOT, "work")
BASE = "work/models/crnn_general_lin6_3cm.pt"
STEPS = 1128
FULL = "train_data_realman_ft"
# 名称：(组, 构建参数, 微调种子)；构建参数为 None 表示直接用全量数据
CONFIGS = {
    "f025": ("A", ["--utt-frac", "0.25"], 0),
    "f0125": ("A", ["--utt-frac", "0.125"], 0),
    "f05": ("A", ["--utt-frac", "0.5"], 0),
    "f033": ("B", ["--utt-frac", "0.3333"], 0),
    "OfficeRoom1": ("B", ["--scenes", "OfficeRoom1"], 0),
    "LivingRoom6": ("B", ["--scenes", "LivingRoom6"], 0),
    "LivingRoom8": ("B", ["--scenes", "LivingRoom8"], 0),
    "f1_seed1": ("C", None, 1),
    "f025_sub1": ("C", ["--utt-frac", "0.25", "--subset-seed", "1"], 0),
}


A = None                                                                       # 命令行参数（main 里设置）


def run(cmd, log, gpu=None):
    env = {**os.environ, "FEAT_WORKERS": str(A.threads if A else 2), "OMP_NUM_THREADS": str(A.threads if A else 2)}
    if gpu is not None:
        env["CUDA_VISIBLE_DEVICES"] = str(gpu)
    if A and A.dry_run:                                                        # 只打印计划执行的命令
        print(f"[dry-run] GPU={gpu} " + " ".join(cmd), flush=True); return
    with open(log, "a", encoding="utf-8") as f:
        f.write("$ " + " ".join(cmd) + "\n"); f.flush()
        subprocess.run(cmd, cwd=ROOT, check=True, stdout=f, stderr=subprocess.STDOUT, env=env)


def model_name(base, name):
    b = os.path.basename(base)[:-3]
    return f"crnn_lin6_3cm_amt_{name}" if os.path.normpath(base) == os.path.normpath(BASE) else f"{b}_amt_{name}"


def free_gpus():
    q = subprocess.run(["nvidia-smi", "--query-gpu=index,memory.used,utilization.gpu", "--format=csv,noheader,nounits"],
                       capture_output=True, text=True, check=True).stdout
    return [int(r.split(",")[0]) for r in q.strip().splitlines() if int(r.split(",")[1]) < 1000 and int(r.split(",")[2]) < 10]


def eval_model(model, log):
    out = os.path.join(ROOT, "out", f"realman_eval_amt_{model}.json")
    if not os.path.exists(out):
        run([PY, "scripts/eval_locata.py", "--ckpt", f"work/models/{model}.pt", "--data", "work/realman_test/realman_test.npz",
             "--array", "lin6_3cm", "--out", "realman_eval_amt", "--tag", f"_{model}"], log)
    return json.load(open(out, encoding="utf-8"))["methods"]["小网络（仿真训练）"]["全部"]


def job(name, gpus=()):
    grp, bargs, seed = CONFIGS[name]
    data = FULL if bargs is None else f"{FULL}_{name}"
    log = os.path.join(WORK, "logs", f"amt{A.tag}_{name}.log")
    t0 = time.time()
    todo = [b for b in A.bases if not os.path.exists(os.path.join(WORK, "models", model_name(b, name) + ".json"))]
    if todo:
        if bargs is not None:
            ftr = os.path.join(WORK, "feat", f"{data}_train.npz")
            if not os.path.exists(ftr):
                run([PY, "scripts/build_realman_finetune.py", *bargs, "--name", data, "--splits", "train"], log)
            fva = os.path.join(WORK, "feat", f"{data}_val.npz")                 # 挑选场景（Auditorium）与全量相同
            if not os.path.exists(fva) and not A.dry_run:
                os.link(os.path.join(WORK, "feat", f"{FULL}_val.npz"), fva)

        def ft(i_b):
            i, b = i_b
            side = b[:-3] + ".json"
            sim = json.load(open(os.path.join(ROOT, side), encoding="utf-8")).get("data", "train_data_general_lin6_3cm") if os.path.exists(os.path.join(ROOT, side)) else "train_data_general_lin6_3cm"
            run([PY, "scripts/finetune_doa_net.py", "--init", b, "--name", model_name(b, name), "--real", data, "--sim", sim,
                 "--steps", str(STEPS), "--seed", str(seed), "--threads", str(A.threads), "--device", A.device],
                log + f".{i}", gpu=(gpus[i % len(gpus)] if gpus else None))
        with ThreadPoolExecutor(max(1, len(gpus)) if A.device != "cpu" else 1) as ex:     # GPU：各起点模型同时微调；CPU：依次
            list(ex.map(ft, enumerate(todo)))
        if A.dry_run:
            return []
        if bargs is not None:                                                  # 省硬盘：原始片段与特征都可按固定种子重建
            shutil.rmtree(os.path.join(WORK, data, "train"), ignore_errors=True)
            for s in ("train", "val"):
                p = os.path.join(WORK, "feat", f"{data}_{s}.npz")
                if os.path.exists(p): os.remove(p)
    info = os.path.join(WORK, data, "info.json")
    meta = json.load(open(info, encoding="utf-8")) if os.path.exists(info) else None
    rows = []
    for b in A.bases:
        model = model_name(b, name)
        ev = eval_model(model, log)
        side = json.load(open(os.path.join(WORK, "models", model + ".json"), encoding="utf-8"))
        rows.append({"name": name, "group": grp, "seed": seed, "base": os.path.basename(b)[:-3], "scenes": (meta or {}).get("scenes"),
                     "sel_acc10_best": side["sel_acc10_best"], "acc10": ev["acc10"], "acc20": ev["acc20"], "mae": ev["mae"]})
    print(f"[{time.strftime('%H:%M')}] {name} 完成 {time.time() - t0:.0f}s：实录 ≤10° " + " / ".join(f"{r['acc10']:.3f}" for r in rows), flush=True)
    return rows


def ref_eval(b, ft):
    """起点模型（不微调）与全量微调模型的实录结果：服务器上为 realman_eval_<模型>[_ft].json，云端默认起点为 realman_eval[_ft].json。"""
    n = os.path.basename(b)[:-3]
    for f in ([f"realman_eval_{n}_ft.json"] if ft else [f"realman_eval_{n}.json"]) + \
             (["realman_eval_ft.json" if ft else "realman_eval.json"] if os.path.normpath(b) == os.path.normpath(BASE) else []):
        p = os.path.join(ROOT, "out", f)
        if os.path.exists(p):
            return json.load(open(p, encoding="utf-8"))["methods"]["小网络（仿真训练）"]["全部"]
    return None


def main():
    global A
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs", type=int, default=2, help="同时进行的组数")
    ap.add_argument("--only", nargs="*", default=None)
    ap.add_argument("--bases", nargs="*", default=[BASE], help="起点模型（多个 = 多个种子）")
    ap.add_argument("--device", default="cpu", help="cpu / cuda")
    ap.add_argument("--threads", type=int, default=2)
    ap.add_argument("--tag", default="")
    ap.add_argument("--dry-run", action="store_true", help="只打印每组的命令与 GPU 分配，不执行")
    A = ap.parse_args()
    os.makedirs(os.path.join(WORK, "logs"), exist_ok=True)
    names = A.only or list(CONFIGS)
    gpus = free_gpus() if A.device != "cpu" else []
    if A.device != "cpu" and not gpus:
        sys.exit("没有空闲 GPU")
    per = max(1, len(gpus) // A.jobs) if gpus else 0                           # 每组分到的 GPU

    def safe(i_name):
        i, name = i_name
        g = tuple(gpus[(i % A.jobs) * per: (i % A.jobs) * per + per]) if gpus else ()
        try:
            return job(name, g)
        except Exception as e:                                                 # 一组失败不影响其他组；重跑时已完成的直接读结果
            print(f"{name} 失败：{e}（日志 work/logs/amt{A.tag}_{name}.log）", flush=True); return []
    with ThreadPoolExecutor(A.jobs) as ex:
        res = [r for rows in ex.map(safe, enumerate(names)) for r in rows]
    if A.dry_run:
        return
    outp = os.path.join(ROOT, "out", f"realman_data_amount{A.tag}.json")
    key = lambda r: (r["name"], r.get("base", "crnn_general_lin6_3cm"))
    old = {key(r): r for r in json.load(open(outp, encoding="utf-8"))["rows"]} if os.path.exists(outp) else {}
    old.update({key(r): r for r in res})
    # 参照：各起点模型不微调、全量微调（1128 步，即全量 8 轮）
    ref = {os.path.basename(b)[:-3]: {"base": ref_eval(b, False), "f1": ref_eval(b, True)} for b in A.bases}
    if os.path.normpath(A.bases[0]) == os.path.normpath(BASE):                  # 兼容只有一个起点模型时的旧格式
        ref.update(ref[os.path.basename(BASE)[:-3]])
    json.dump({"steps": STEPS, "bases": [os.path.basename(b)[:-3] for b in A.bases], "base_model": A.bases[0], "ref": ref, "rows": list(old.values())},
              open(outp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    report(json.load(open(outp, encoding="utf-8")), A.tag)


def report(d, tag=""):
    mins = lambda r: sum(v["minutes"] for v in r["scenes"].values()) if r.get("scenes") else None
    bases = d.get("bases") or [os.path.basename(d["base_model"])[:-3]]
    pct = lambda v: "—" if v is None else f"{v * 100:.1f}%"
    avg = lambda v: None if not v or any(x is None for x in v) else sum(v) / len(v)
    refs = {k: [((d["ref"].get(b) or {}).get(k) or {}).get("acc10") for b in bases] for k in ("base", "f1")}
    if len(bases) == 1 and refs["base"][0] is None:                            # 旧格式
        refs = {k: [(d["ref"].get(k) or {}).get("acc10")] for k in ("base", "f1")}
    L = [f"实录微调的数据量与房间数（RealMAN 测试集 600 个样本，≤10°；各组 {d['steps']} 步；起点模型 {len(bases)} 个，取平均）",
         f"  不微调（只用仿真）           0 分钟   {pct(avg(refs['base']))}  （{' / '.join(pct(x) for x in refs['base'])}）",
         f"  3 个房间全量                143 分钟   {pct(avg(refs['f1']))}  （{' / '.join(pct(x) for x in refs['f1'])}）"]
    groups = {}
    for r in d["rows"]:
        groups.setdefault(r["name"], []).append(r)
    for name, rs in sorted(groups.items(), key=lambda kv: (kv[1][0]["group"], mins(kv[1][0]) or 999)):
        r = rs[0]; m = mins(r)
        sc = "、".join(f"{k} {v['minutes']:.0f}′" for k, v in r["scenes"].items()) if r.get("scenes") else "3 个房间全量"
        L.append(f"  [{r['group']}] {name:<12} {'' if m is None else f'{m:5.0f} 分钟':>9}   {pct(avg([x['acc10'] for x in rs]))}  （"
                 + (f"各起点 {' / '.join(pct(x['acc10']) for x in rs)}；" if len(rs) > 1 else "")
                 + f"≤20° {pct(avg([x['acc20'] for x in rs]))}，平均误差 {avg([x['mae'] for x in rs]):.1f}°，挑选场景 {pct(avg([x['sel_acc10_best'] for x in rs]))}；{sc}）")
    txt = "\n".join(L)
    print(txt)
    open(os.path.join(ROOT, "out", f"realman_data_amount{tag}.txt"), "w", encoding="utf-8").write(txt + "\n")


if __name__ == "__main__":
    main()
