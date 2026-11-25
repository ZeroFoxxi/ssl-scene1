# -*- coding: utf-8 -*-
"""用实录数据微调仿真训练好的小网络。

做法：从仿真模型出发；每一批一半实录微调样本、一半仿真训练样本（避免只记住少数房间、忘掉仿真里学到的情况）；
学习率较小（默认 3e-4，余弦下降）；每轮在"挑选模型"的实录场景上算误差 ≤10° 的比例，保留最好的一轮。
测试集（RealMAN 测试场景）不参与任何选择，最后用 eval_locata.py 评测一次。
运行：python scripts/finetune_doa_net.py --init work/models/crnn_general_lin6_3cm.pt --name crnn_lin6_3cm_ft
"""
import argparse, json, os, sys, time
import numpy as np
import torch
import torch.nn.functional as F

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
from ssl_baseline.nn_doa import CRNN, soft_label, SIZES
from train_doa_net import build_features, predict, acc10

WORK = os.path.join(ROOT, "work")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--init", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--real", default="train_data_realman_ft")
    ap.add_argument("--sim", default="train_data_general_lin6_3cm")
    ap.add_argument("--epochs", type=int, default=8)
    ap.add_argument("--bs", type=int, default=64)
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--threads", type=int, default=4)
    ap.add_argument("--device", default="cpu", help="cpu / cuda / auto")
    a = ap.parse_args()
    torch.manual_seed(a.seed); np.random.seed(a.seed); torch.set_num_threads(a.threads)
    side = a.init[:-3] + ".json"
    size = json.load(open(side, encoding="utf-8"))["size"] if os.path.exists(side) else "s"
    rtr, rva = build_features("train", a.real), build_features("val", a.real)
    sim = build_features("train", a.sim)
    model = CRNN(in_ch=rtr["feat"].shape[1], **SIZES[size])
    model.load_state_dict(torch.load(a.init, map_location="cpu"))
    dev = torch.device("cuda" if (a.device in ("cuda", "auto") and torch.cuda.is_available()) else "cpu")
    model = model.to(dev)
    acc0 = acc10(predict(model, rva["feat"]), rva["az"])
    print(f"微调前：挑选场景 ≤10° {acc0:.3f}", flush=True)
    half = a.bs // 2
    steps_per_ep = int(np.ceil(len(rtr["az"]) / half))
    opt = torch.optim.AdamW(model.parameters(), lr=a.lr, weight_decay=1e-3)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=a.epochs * steps_per_ep)
    lr_real, lr_sim = torch.from_numpy(soft_label(rtr["az"])).to(dev), torch.from_numpy(soft_label(sim["az"])).to(dev)
    ck = os.path.join(WORK, "models", f"{a.name}.pt")
    best, log = acc0, [{"epoch": 0, "sel_acc10": round(acc0, 4)}]
    save = lambda: torch.save({k: v.cpu() for k, v in model.state_dict().items()}, ck)
    save()                                                                 # 若微调不提升，保留原模型
    for ep in range(a.epochs):
        model.train(); t0 = time.time(); perm = np.random.permutation(len(rtr["az"])); tot = 0.0
        for i in range(0, len(perm), half):
            ir = perm[i:i + half]; js = np.random.randint(0, len(sim["az"]), len(ir))
            xb = torch.from_numpy(np.concatenate([rtr["feat"][ir], sim["feat"][js]]).astype(np.float32)).to(dev)
            yb = torch.cat([lr_real[ir], lr_sim[js]])
            loss = -(yb * F.log_softmax(model(xb), dim=1)).sum(1).mean()
            opt.zero_grad(); loss.backward(); opt.step(); sched.step(); tot += loss.item()
        acc = acc10(predict(model, rva["feat"]), rva["az"])
        log.append({"epoch": ep + 1, "loss": round(tot / steps_per_ep, 4), "sel_acc10": round(acc, 4), "sec": round(time.time() - t0, 1)})
        print(log[-1], flush=True)
        if acc > best:
            best = acc; save()
    json.dump({"size": size, "in_ch": int(rtr["feat"].shape[1]), "init": os.path.basename(a.init), "real": a.real, "sim": a.sim, "seed": a.seed, "params": int(sum(p.numel() for p in model.parameters())),
               "sel_acc10_before": round(acc0, 4), "sel_acc10_best": round(best, 4)}, open(ck[:-3] + ".json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(log, open(os.path.join(ROOT, "out", f"nn_finetune_log_{a.name}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"完成：挑选场景 微调前 {acc0:.3f} → 最好 {best:.3f}；模型 {ck}")


if __name__ == "__main__":
    main()
