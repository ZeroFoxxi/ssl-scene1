# -*- coding: utf-8 -*-
"""在实录微调的基础上，加入"无人说话"的纯噪声样本继续微调，让网络在没有人声时给出低置信度。

背景（11-21 实录回放诊断）：网络只见过"有一个说话人"的样本；只输入真实背景噪声时，它在 17–67% 的情况下输出正前方 0°±12°，
且 33–85% 的置信度 ≥0.7，导致连续会议里转向正前方的误转。
做法：
  - 每一批三等分：实录人声（RealMAN 微调场景）、仿真人声（与原微调相同）、纯噪声（标签为 91 类均匀分布，即"不知道方向"）；
  - 纯噪声：微调场景 OfficeRoom1、LivingRoom6、LivingRoom8 的真实背景噪声（取自话语中的低能量片段，同 build_realman_test.noise_bank），每个场景 500 段 1.5 s；
  - 挑模型只用 Auditorium（从未参与训练）：人声 400 个样本的误差 ≤10° 比例，与 200 段纯噪声中置信度 ≥0.7 的比例；
    规则（训练前定）：在纯噪声"有把握"比例 ≤10% 的轮次中选人声准确率最高的；都不满足时选纯噪声"有把握"比例最低的。
  - 测试场景（RealMAN 测试集）不参与任何选择。
运行：python scripts/finetune_doa_net_noise.py --init work/models/crnn_lin6_3cm_ft.pt --name crnn_lin6_3cm_ft_noise
输出：work/models/<name>.pt（.json 记录大小与选择结果）、out/nn_finetune_log_<name>.json
"""
import argparse, json, os, sys, time
import numpy as np
import torch
import torch.nn.functional as F

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
from ssl_baseline.nn_doa import CRNN, soft_label, SIZES, features, confidence
from train_doa_net import build_features, predict, acc10
import run_realman_replay_demo as D

WORK = os.path.join(ROOT, "work")
FS = 16000
NOISE_SCENES = {"train": ["OfficeRoom1", "LivingRoom6", "LivingRoom8"], "sel": ["Auditorium"]}
NOISE_N = {"train": 500, "sel": 200}


def noise_features(split, seed):
    out = os.path.join(WORK, "feat", f"realman_noise_{split}.npz")
    if os.path.exists(out):
        return np.load(out)["feat"]
    W = os.path.join(WORK, "realman_val"); lab = D.load_labels(W, "val"); rng = np.random.default_rng(seed)
    feats = []
    for sc in NOISE_SCENES[split]:
        utts = D.scene_utts(W, sc, lab)
        bank = D.B.noise_bank([(u["f"], 0) for u in utts], 90 * FS)
        n = int(1.5 * FS)
        for st in rng.integers(0, bank.shape[1] - n, NOISE_N[split]):
            feats.append(features(bank[:, st: st + n]).astype(np.float16))
        print(f"[噪声 {split}] {sc}：噪声库 {bank.shape[1] / FS:.0f} s，{NOISE_N[split]} 段", flush=True)
    feat = np.stack(feats); np.savez(out, feat=feat)
    return feat


def high_conf_rate(model, feat, th=0.7):
    model.eval()
    with torch.no_grad():
        lg = np.concatenate([model(torch.from_numpy(feat[i:i + 64].astype(np.float32))).numpy() for i in range(0, len(feat), 64)])
    return float((confidence(lg) >= th).mean())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--init", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--real", default="train_data_realman_ft")
    ap.add_argument("--sim", default="train_data_general_lin6_3cm")
    ap.add_argument("--epochs", type=int, default=6)
    ap.add_argument("--bs", type=int, default=66)
    ap.add_argument("--lr", type=float, default=1e-4)
    ap.add_argument("--max-noise-hc", type=float, default=0.10)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--threads", type=int, default=4)
    a = ap.parse_args()
    torch.manual_seed(a.seed); np.random.seed(a.seed); torch.set_num_threads(a.threads)
    side = a.init[:-3] + ".json"
    size = json.load(open(side, encoding="utf-8"))["size"] if os.path.exists(side) else "s"
    rtr, rva = build_features("train", a.real), build_features("val", a.real)
    sim = build_features("train", a.sim)
    ntr, nsel = noise_features("train", 1), noise_features("sel", 2)
    model = CRNN(in_ch=rtr["feat"].shape[1], **SIZES[size])
    model.load_state_dict(torch.load(a.init, map_location="cpu"))
    acc0, hc0 = acc10(predict(model, rva["feat"]), rva["az"]), high_conf_rate(model, nsel)
    log = [{"epoch": 0, "sel_acc10": round(acc0, 4), "sel_noise_hc": round(hc0, 4)}]
    print(log[-1], flush=True)
    third = a.bs // 3
    steps = int(np.ceil(len(rtr["az"]) / third))
    opt = torch.optim.AdamW(model.parameters(), lr=a.lr, weight_decay=1e-3)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=a.epochs * steps)
    lr_real, lr_sim = torch.from_numpy(soft_label(rtr["az"])), torch.from_numpy(soft_label(sim["az"]))
    ck = os.path.join(WORK, "models", f"{a.name}.pt"); cands = {}
    for ep in range(a.epochs):
        model.train(); t0 = time.time(); perm = np.random.permutation(len(rtr["az"])); tot = 0.0
        for i in range(0, len(perm), third):
            ir = perm[i:i + third]
            js = np.random.randint(0, len(sim["az"]), len(ir)); jn = np.random.randint(0, len(ntr), len(ir))
            xb = torch.from_numpy(np.concatenate([rtr["feat"][ir], sim["feat"][js], ntr[jn]]).astype(np.float32))
            logp = F.log_softmax(model(xb), dim=1); n = len(ir)
            loss_sp = -(torch.cat([lr_real[ir], lr_sim[js]]) * logp[:2 * n]).sum(1).mean()
            loss_nz = -logp[2 * n:].mean()                                   # 与均匀分布的交叉熵
            loss = (2 * loss_sp + loss_nz) / 3
            opt.zero_grad(); loss.backward(); opt.step(); sched.step(); tot += loss.item()
        acc, hc = acc10(predict(model, rva["feat"]), rva["az"]), high_conf_rate(model, nsel)
        log.append({"epoch": ep + 1, "loss": round(tot / steps, 4), "sel_acc10": round(acc, 4), "sel_noise_hc": round(hc, 4), "sec": round(time.time() - t0, 1)})
        print(log[-1], flush=True)
        torch.save(model.state_dict(), os.path.join(WORK, "models", f"{a.name}_ep{ep + 1}.pt")); cands[ep + 1] = (acc, hc)
    ok = [e for e, (acc, hc) in cands.items() if hc <= a.max_noise_hc]
    best = max(ok, key=lambda e: cands[e][0]) if ok else min(cands, key=lambda e: cands[e][1])
    os.replace(os.path.join(WORK, "models", f"{a.name}_ep{best}.pt"), ck)
    for e in cands:
        p = os.path.join(WORK, "models", f"{a.name}_ep{e}.pt")
        if os.path.exists(p): os.remove(p)
    json.dump({"size": size, "in_ch": int(rtr["feat"].shape[1]), "init": os.path.basename(a.init), "best_epoch": best,
               "sel_acc10": round(cands[best][0], 4), "sel_noise_hc": round(cands[best][1], 4),
               "rule": f"纯噪声置信度≥0.7 比例 ≤{a.max_noise_hc} 的轮次中选人声准确率最高"},
              open(ck[:-3] + ".json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(log, open(os.path.join(ROOT, "out", f"nn_finetune_log_{a.name}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"完成：选第 {best} 轮（Auditorium 人声 ≤10° {cands[best][0]:.3f}，纯噪声有把握 {cands[best][1]:.3f}）→ {ck}")


if __name__ == "__main__":
    main()
