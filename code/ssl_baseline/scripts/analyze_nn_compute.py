# -*- coding: utf-8 -*-
"""小网络的端侧算力摸底：按层拆分计算量，并模拟 8 比特量化后的准确率（固定测试集 800 个样本）。

1. 计算量：一次判决（输入 1.5 s，92 帧）每一层的乘加次数与参数量；另按公式估算几种常见的减计算量改法
   （只算计算量，准确率需重新训练后才知道，这里不下结论）。
2. 8 比特量化（模拟，fake quantization：数值按 int8 取整后再还原成浮点计算）：
   - W8：卷积、线性层、GRU 的权重按输出通道对称量化到 int8；
   - W8A8：在 W8 基础上，卷积与线性层（含 GRU 的输入）的输入激活按张量量化到 8 比特，范围用验证集 200 个样本标定（最小 / 最大值）；
     GRU 内部状态、softmax 仍为浮点（实际部署时取决于芯片工具链）。
运行：python scripts/analyze_nn_compute.py --ckpt work/models/crnn_v0.pt
输出：out/nn_compute_<name>.json
"""
import argparse, copy, json, os, sys
import numpy as np
import torch
import torch.nn as nn

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
from ssl_baseline.nn_doa import CRNN, SIZES, decode
from ssl_baseline import metrics
from train_doa_net import build_features, CONDS

T = 92                                     # 1.5 s、512 点 FFT、跳 256 点 → 92 帧


def layer_macs(model, in_ch=11, T=T):
    rows, f, c0 = [], 128, in_ch
    k = 0
    for m in model.conv:
        if isinstance(m, nn.Conv2d):
            k += 1
            rows.append({"层": f"卷积 {k}（{c0}→{m.out_channels} 通道，3×3，{f} 个频点 × {T} 帧）",
                         "乘加": c0 * m.out_channels * 9 * f * T, "参数": sum(p.numel() for p in m.parameters())})
            c0 = m.out_channels
        if isinstance(m, nn.MaxPool2d):
            f //= 2
        if isinstance(m, nn.BatchNorm2d):
            rows[-1]["参数"] += sum(p.numel() for p in m.parameters())
    rows.append({"层": f"每帧线性映射（{model.proj.in_features}→{model.proj.out_features}）",
                 "乘加": model.proj.in_features * model.proj.out_features * T, "参数": sum(p.numel() for p in model.proj.parameters())})
    g = model.rnn
    rows.append({"层": f"双向 GRU（隐层 {g.hidden_size}）", "乘加": 2 * 3 * (g.input_size * g.hidden_size + g.hidden_size ** 2) * T,
                 "参数": sum(p.numel() for p in g.parameters())})
    rows.append({"层": "注意力池化 + 输出层", "乘加": model.att.in_features * T + model.out.in_features * model.out.out_features,
                 "参数": sum(p.numel() for p in model.att.parameters()) + sum(p.numel() for p in model.out.parameters())})
    return rows


def variants(model):
    """几种改法的计算量估算（相对现结构；只是公式估算）。"""
    base = sum(r["乘加"] for r in layer_macs(model))
    out = {}
    out["帧移加倍（256→512 点，帧数减半）"] = sum(r["乘加"] for r in layer_macs(model, T=T // 2))
    # 卷积 2、3 改成深度可分离（3×3 逐通道 + 1×1 逐点）
    rows = layer_macs(model)
    c = model.conv
    convs = [m for m in c if isinstance(m, nn.Conv2d)]
    f_in = [128, 64, 32]
    dw = rows[0]["乘加"] + sum(convs[i].in_channels * 9 * f_in[i] * T + convs[i].in_channels * convs[i].out_channels * f_in[i] * T for i in (1, 2))
    out["卷积 2、3 改深度可分离"] = dw + sum(r["乘加"] for r in rows[3:])
    # 第一层卷积在频率方向步长 2（之后频点都减半）
    out["第一层卷积频率方向步长 2"] = rows[0]["乘加"] // 2 + (rows[1]["乘加"] + rows[2]["乘加"]) // 2 + sum(r["乘加"] for r in rows[3:])
    return {"现结构": base, **out}


def fq_sym(w, axis=0):
    """按 axis 方向每个通道对称量化到 int8 再还原。"""
    dims = tuple(i for i in range(w.dim()) if i != axis)
    s = w.abs().amax(dim=dims, keepdim=True).clamp(min=1e-12) / 127.0
    return torch.round(w / s).clamp(-127, 127) * s


def quant_weights(model):
    q = copy.deepcopy(model)
    with torch.no_grad():
        for m in q.modules():
            if isinstance(m, (nn.Conv2d, nn.Linear)):
                m.weight.copy_(fq_sym(m.weight))
            if isinstance(m, nn.GRU):
                for n, p in m.named_parameters():
                    if "weight" in n:
                        p.copy_(fq_sym(p))
    return q


def add_act_quant(model, calib):
    """卷积、线性层与 GRU 的输入按张量量化到 8 比特（非对称，范围用标定数据的最小 / 最大值）。"""
    mods = [m for m in model.modules() if isinstance(m, (nn.Conv2d, nn.Linear, nn.GRU))]
    rng = {m: [np.inf, -np.inf] for m in mods}
    hooks = [m.register_forward_pre_hook(lambda mod, inp: rng[mod].__setitem__(slice(0, 2), [min(rng[mod][0], float(inp[0].min())), max(rng[mod][1], float(inp[0].max()))]))
             for m in mods]
    with torch.no_grad():
        model(torch.from_numpy(calib.astype(np.float32)))
    for h in hooks: h.remove()

    def make(lo, hi):
        s = max(hi - lo, 1e-12) / 255.0
        zp = round(-lo / s)
        return lambda mod, inp: (torch.clamp(torch.round(inp[0] / s) + zp, 0, 255).sub(zp).mul(s),) + tuple(inp[1:])
    for m in mods:
        m.register_forward_pre_hook(make(*rng[m]))
    return model


def evaluate(model, te, bs=64):
    model.eval(); lg = []
    with torch.no_grad():
        for i in range(0, len(te["az"]), bs):
            lg.append(model(torch.from_numpy(te["feat"][i:i + bs].astype(np.float32))).numpy())
    est = decode(np.concatenate(lg)); ok = metrics.angdiff(est, te["az"]) <= 10
    return {"acc10": float(ok.mean()), **{c: float(ok[te["cond"] == i].mean()) for i, c in enumerate(CONDS)}}, est


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ckpt", default=os.path.join(ROOT, "work", "models", "crnn_v0.pt"))
    a = ap.parse_args()
    torch.set_num_threads(4)
    name = os.path.basename(a.ckpt)[:-3]
    side = a.ckpt[:-3] + ".json"
    size = json.load(open(side, encoding="utf-8")).get("size", "s") if os.path.exists(side) else "s"      # 网络大小以模型旁的 .json 为准
    model = CRNN(in_ch=11, **SIZES[size]); model.load_state_dict(torch.load(a.ckpt, map_location="cpu")); model.eval()
    rows = layer_macs(model)
    tot = sum(r["乘加"] for r in rows); npar = sum(p.numel() for p in model.parameters())
    for r in rows: r["占比"] = round(r["乘加"] / tot, 3)
    print(f"每次判决乘加 {tot / 1e8:.2f} 亿，参数 {npar}")
    for r in rows: print(f"  {r['层']:<40} {r['乘加'] / 1e6:8.1f} M  {r['占比'] * 100:5.1f}%  参数 {r['参数']}")
    var = variants(model)
    for k, v in var.items(): print(f"  {k}: {v / 1e8:.2f} 亿")

    te = build_features("test"); va = build_features("val")
    rng = np.random.default_rng(0); calib = va["feat"][rng.choice(len(va["az"]), 200, replace=False)]
    r_fp, e_fp = evaluate(model, te)
    w8 = quant_weights(model); r_w8, e_w8 = evaluate(w8, te)
    w8a8 = add_act_quant(quant_weights(model), calib); r_a8, e_a8 = evaluate(w8a8, te)
    shift = {k: float(np.median(metrics.angdiff(e, e_fp))) for k, e in [("W8", e_w8), ("W8A8", e_a8)]}
    for k, r in [("浮点", r_fp), ("W8", r_w8), ("W8A8", r_a8)]:
        print(f"  {k}: ≤10° {r['acc10']:.3f}  " + "  ".join(f"{c} {r[c]:.3f}" for c in CONDS))
    out = {"model": name, "frames": T, "macs_total": tot, "params": npar, "layers": rows, "variants_macs": var,
           "weights_kb_int8": round(npar / 1024, 1), "weights_kb_fp32": round(npar * 4 / 1024, 1),
           "quant": {"浮点": r_fp, "W8": r_w8, "W8A8": r_a8}, "median_shift_deg_vs_float": shift}
    json.dump(out, open(os.path.join(ROOT, "out", f"nn_compute_{name}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
