# -*- coding: utf-8 -*-
"""给小网络加一个"有没有人在说话"的输出（vad 头，约 130 个参数），用纯噪声样本训练它，方向输出不受纯噪声影响。

背景（11-21）：纯噪声样本按"方向均匀分布"训练（finetune_doa_net_noise.py）能让网络在噪声下不再过度自信，
但人声的方向置信度也整体降低，连续会议里少误转的同时漏转变多。这里改为单独判断"有没有人在说话"：
  - 人声样本（实录 + 仿真）：方向用原来的软标签交叉熵，vad 目标 = 1；
  - 纯噪声样本（微调场景的真实背景噪声，同 finetune_doa_net_noise.py）：只训练 vad，目标 = 0，不对方向输出加任何约束；
  - 每批三等分；从实录微调版出发（vad 头新加，随机初始化），学习率 1e-4，4 轮。
挑模型与门限只用 Auditorium（从未参与训练），规则训练前定好：
  - "有人说话"门限 presence_th：取 Auditorium 人声样本 vad 概率的 2% 分位（让 98% 的人声能通过）；
  - 在纯噪声通过率（vad ≥ presence_th）≤10% 的轮次中，选人声方向准确率（≤10°）最高的；都不满足时选纯噪声通过率最低的。
运行：python scripts/finetune_doa_net_vad.py --init work/models/crnn_lin6_3cm_ft.pt --name crnn_lin6_3cm_ft_vad
输出：work/models/<name>.pt 与 .json（含 vad=true、presence_th）；out/nn_finetune_log_<name>.json
"""
import argparse, json, os, sys, time
import numpy as np
import torch
import torch.nn.functional as F

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
from ssl_baseline.nn_doa import CRNN, soft_label, SIZES, decode
from ssl_baseline import metrics
from train_doa_net import build_features
from finetune_doa_net_noise import noise_features

WORK = os.path.join(ROOT, "work")


def run(model, feat, bs=64):
    model.eval(); L, V = [], []
    with torch.no_grad():
        for i in range(0, len(feat), bs):
            lg, v = model.forward_both(torch.from_numpy(feat[i:i + bs].astype(np.float32)))
            L.append(lg.numpy()); V.append(torch.sigmoid(v).numpy())
    return np.concatenate(L), np.concatenate(V)


def select_stats(model, rva, nsel):
    lg, v_sp = run(model, rva["feat"]); _, v_nz = run(model, nsel)
    acc = float((metrics.angdiff(decode(lg), rva["az"]) <= 10).mean())
    th = float(np.quantile(v_sp, 0.02))
    return acc, th, float((v_nz >= th).mean())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--init", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--real", default="train_data_realman_ft")
    ap.add_argument("--sim", default="train_data_general_lin6_3cm")
    ap.add_argument("--epochs", type=int, default=4)
    ap.add_argument("--bs", type=int, default=66)
    ap.add_argument("--lr", type=float, default=1e-4)
    ap.add_argument("--vad-weight", type=float, default=0.5)
    ap.add_argument("--max-noise-pass", type=float, default=0.10)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--threads", type=int, default=4)
    a = ap.parse_args()
    torch.manual_seed(a.seed); np.random.seed(a.seed); torch.set_num_threads(a.threads)
    side = a.init[:-3] + ".json"
    size = json.load(open(side, encoding="utf-8"))["size"] if os.path.exists(side) else "s"
    rtr, rva = build_features("train", a.real), build_features("val", a.real)
    sim = build_features("train", a.sim)
    ntr, nsel = noise_features("train", 1), noise_features("sel", 2)
    model = CRNN(in_ch=rtr["feat"].shape[1], vad=True, **SIZES[size])
    missing = model.load_state_dict(torch.load(a.init, map_location="cpu"), strict=False)
    assert set(missing.missing_keys) == {"vad.weight", "vad.bias"} and not missing.unexpected_keys, missing
    third = a.bs // 3
    steps = int(np.ceil(len(rtr["az"]) / third))
    opt = torch.optim.AdamW(model.parameters(), lr=a.lr, weight_decay=1e-3)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=a.epochs * steps)
    lr_real, lr_sim = torch.from_numpy(soft_label(rtr["az"])), torch.from_numpy(soft_label(sim["az"]))
    log, cands = [], {}
    for ep in range(a.epochs):
        model.train(); t0 = time.time(); perm = np.random.permutation(len(rtr["az"])); tot = 0.0
        for i in range(0, len(perm), third):
            ir = perm[i:i + third]; n = len(ir)
            js = np.random.randint(0, len(sim["az"]), n); jn = np.random.randint(0, len(ntr), n)
            xb = torch.from_numpy(np.concatenate([rtr["feat"][ir], sim["feat"][js], ntr[jn]]).astype(np.float32))
            lg, v = model.forward_both(xb)
            loss_dir = -(torch.cat([lr_real[ir], lr_sim[js]]) * F.log_softmax(lg[:2 * n], dim=1)).sum(1).mean()
            tgt = torch.cat([torch.ones(2 * n), torch.zeros(n)])
            loss_vad = F.binary_cross_entropy_with_logits(v, tgt)
            loss = loss_dir + a.vad_weight * loss_vad
            opt.zero_grad(); loss.backward(); opt.step(); sched.step(); tot += loss.item()
        acc, th, npass = select_stats(model, rva, nsel)
        log.append({"epoch": ep + 1, "loss": round(tot / steps, 4), "sel_acc10": round(acc, 4), "presence_th": round(th, 4),
                    "sel_noise_pass": round(npass, 4), "sec": round(time.time() - t0, 1)})
        print(log[-1], flush=True)
        torch.save(model.state_dict(), os.path.join(WORK, "models", f"{a.name}_ep{ep + 1}.pt")); cands[ep + 1] = (acc, th, npass)
    ok = [e for e, c in cands.items() if c[2] <= a.max_noise_pass]
    best = max(ok, key=lambda e: cands[e][0]) if ok else min(cands, key=lambda e: cands[e][2])
    ck = os.path.join(WORK, "models", f"{a.name}.pt")
    os.replace(os.path.join(WORK, "models", f"{a.name}_ep{best}.pt"), ck)
    for e in cands:
        p = os.path.join(WORK, "models", f"{a.name}_ep{e}.pt")
        if os.path.exists(p): os.remove(p)
    acc, th, npass = cands[best]
    json.dump({"size": size, "in_ch": int(rtr["feat"].shape[1]), "vad": True, "presence_th": round(th, 4), "init": os.path.basename(a.init),
               "best_epoch": best, "sel_acc10": round(acc, 4), "sel_noise_pass": round(npass, 4),
               "rule": f"presence_th = Auditorium 人声 vad 概率 2% 分位；纯噪声通过率 ≤{a.max_noise_pass} 的轮次中选方向准确率最高"},
              open(ck[:-3] + ".json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(log, open(os.path.join(ROOT, "out", f"nn_finetune_log_{a.name}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"完成：选第 {best} 轮（Auditorium 方向 ≤10° {acc:.3f}，有人门限 {th:.3f}，纯噪声通过 {npass:.3f}）→ {ck}")


if __name__ == "__main__":
    main()
