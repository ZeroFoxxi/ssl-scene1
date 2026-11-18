# -*- coding: utf-8 -*-
"""训练换人测向小网络（CPU 可跑），并在固定测试集上与传统基线比较。

流程：
  1. 特征：训练 / 验证 / 测试集各算一次特征，存为 float16（work/feat/）；测试样本取开口前 1.0 s 到开口后 0.5 s，与训练一致；
  2. 训练：AdamW，余弦学习率，软标签交叉熵；每轮在验证集上算"误差 ≤10° 的比例"，保留验证集最好的模型；
     **只用验证集挑模型，测试集只在最后评测一次**；
  3. 测试：在固定测试集上按条件、RT60 统计，与 out/test_baselines.json 中的传统基线对比。
运行：python scripts/train_doa_net.py --epochs 30
输出：work/models/crnn_v0.pt、out/nn_train_log.json、out/nn_test_results.json
"""
import argparse, glob, json, os, sys, time
from multiprocessing import Pool
import numpy as np
import torch
import torch.nn.functional as F

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
from ssl_baseline.nn_doa import features, CRNN, count_macs, soft_label, decode
from ssl_baseline import metrics

WORK = os.path.join(ROOT, "work")
FS = 16000
CONDS = ["C1 换人", "C2 抢话", "C3 远端扬声器", "C4 空调噪声"]


def _feat_one(args):
    x, scale = args
    return features(x.astype(np.float64) * scale).astype(np.float16)


def build_features(split):
    out = os.path.join(WORK, "feat", f"{split}.npz")
    if os.path.exists(out):
        d = np.load(out); return {k: d[k] for k in d.files}
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if split == "test":
        d = np.load(os.path.join(WORK, "train_data", "test", "test.npz")); on = int(d["onset"])
        xs = d["x"][:, :, on - FS: on + FS // 2]
        meta = {k: d[k] for k in ["az", "az_prev", "cond", "rt60", "room"]}; sc = d["scale"]
    else:
        xs, sc, meta = [], [], {k: [] for k in ["az", "az_prev", "cond", "rt60", "room"]}
        for f in sorted(glob.glob(os.path.join(WORK, "train_data", split, "shard_*.npz"))):
            d = np.load(f); xs.append(d["x"]); sc.append(d["scale"])
            for k in meta:
                meta[k].append(d[k])
        xs = np.concatenate(xs); sc = np.concatenate(sc); meta = {k: np.concatenate(v) for k, v in meta.items()}
    t0 = time.time()
    with Pool(4) as p:
        feats = p.map(_feat_one, list(zip(xs, sc)), chunksize=64)
    feat = np.stack(feats)
    np.savez(out, feat=feat, **meta)
    print(f"[特征] {split}: {feat.shape} {time.time() - t0:.0f}s", flush=True)
    return {"feat": feat, **meta}


def predict(model, feat, bs=128):
    model.eval(); outs = []
    with torch.no_grad():
        for i in range(0, len(feat), bs):
            outs.append(model(torch.from_numpy(feat[i:i + bs].astype(np.float32))).numpy())
    return decode(np.concatenate(outs))


def acc10(est, az):
    return float((metrics.angdiff(est, az) <= 10).mean())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--bs", type=int, default=64)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--name", default="crnn_v0")
    a = ap.parse_args()
    torch.manual_seed(a.seed); np.random.seed(a.seed); torch.set_num_threads(4)
    tr, va, te = build_features("train"), build_features("val"), build_features("test")
    model = CRNN(in_ch=tr["feat"].shape[1])
    n_params = sum(p.numel() for p in model.parameters()); macs = count_macs(model, tr["feat"].shape[1], tr["feat"].shape[3])
    print(f"参数量 {n_params}，每次判决乘加 {macs / 1e6:.0f} M", flush=True)
    opt = torch.optim.AdamW(model.parameters(), lr=a.lr, weight_decay=1e-3)
    steps = a.epochs * int(np.ceil(len(tr["az"]) / a.bs))
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=a.lr, total_steps=steps, pct_start=0.1)
    ylab = torch.from_numpy(soft_label(tr["az"]))
    best, log = -1.0, []
    os.makedirs(os.path.join(WORK, "models"), exist_ok=True)
    ck = os.path.join(WORK, "models", f"{a.name}.pt")
    for ep in range(a.epochs):
        model.train(); t0 = time.time(); perm = np.random.permutation(len(tr["az"])); tot = 0.0
        for i in range(0, len(perm), a.bs):
            idx = perm[i:i + a.bs]
            xb = torch.from_numpy(tr["feat"][idx].astype(np.float32))
            loss = -(ylab[idx] * F.log_softmax(model(xb), dim=1)).sum(1).mean()
            opt.zero_grad(); loss.backward(); opt.step(); sched.step(); tot += loss.item() * len(idx)
        va_est = predict(model, va["feat"]); va_acc = acc10(va_est, va["az"])
        va_cond = {CONDS[c]: round(acc10(va_est[va["cond"] == c], va["az"][va["cond"] == c]), 3) for c in range(4)}
        log.append({"epoch": ep + 1, "train_loss": round(tot / len(perm), 4), "val_acc10": round(va_acc, 4), "val_by_cond": va_cond,
                    "sec": round(time.time() - t0, 1)})
        print(log[-1], flush=True)
        if va_acc > best:
            best = va_acc; torch.save(model.state_dict(), ck)
    # 测试：只评测一次（验证集最好的模型）
    model.load_state_dict(torch.load(ck))
    t0 = time.time(); est = predict(model, te["feat"]); t_inf = (time.time() - t0) / len(est)
    res = {}
    for r in sorted(set(te["rt60"].tolist())) + ["平均"]:
        m_rt = (te["rt60"] == r) if r != "平均" else np.ones(len(est), bool)
        for c in range(4):
            m = m_rt & (te["cond"] == c)
            res[f"{r}|{CONDS[c]}"] = round(acc10(est[m], te["az"][m]), 3)
        res[f"{r}|四种条件平均"] = round(float(np.mean([res[f"{r}|{CONDS[c]}"] for c in range(4)])), 3)
    base = json.load(open(os.path.join(ROOT, "out", "test_baselines.json"), encoding="utf-8"))
    out = {"model": a.name, "params": n_params, "macs_per_decision": macs, "cpu_ms_per_decision_batched": round(1000 * t_inf, 2),
           "best_val_acc10": round(best, 4), "test_acc10": res,
           "baselines_0.5s": {k.split(" | ")[0]: v for k, v in base.items() if k.endswith("0.5s")}}
    json.dump(log, open(os.path.join(ROOT, "out", f"nn_train_log_{a.name}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(out, open(os.path.join(ROOT, "out", f"nn_test_results_{a.name}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("\n固定测试集（开口后 0.5 s 判决，误差 ≤10° 的比例）：")
    print(f"{'方法':<26}" + "".join(f"{c[3:]:>10}" for c in CONDS) + f"{'平均':>8}")
    rows = [("小网络 " + a.name, res)] + [(k, v) for k, v in out["baselines_0.5s"].items()]
    for nm, v in rows:
        print(f"{nm:<26}" + "".join(f"{v['平均|' + c] * 100:>9.0f}%" for c in CONDS) + f"{v['平均|四种条件平均'] * 100:>7.0f}%")


if __name__ == "__main__":
    main()
