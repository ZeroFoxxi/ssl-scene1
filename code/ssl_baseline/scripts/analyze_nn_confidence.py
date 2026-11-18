# -*- coding: utf-8 -*-
"""小网络的置信度检验，以及开口后 1.0 s 判决时的效果（固定测试集 800 个样本）。

置信度：网络输出的 91 类概率中，峰值附近 ±3 类（±6°）的概率之和（peak mass，0–1）。
检验：
  1. 置信度能否区分"测准"（误差 ≤10°）与"测错"：AUROC；按置信度分 5 档统计准确率；
  2. 设门限：只在置信度 ≥ 门限时输出方向，看保留比例与保留部分的准确率；
  3. 开口后 1.0 s 判决：现有模型只训练了 [开口前 1.0 s, 开口后 0.5 s]，这里试两种输入：
     a. [开口前 1.0 s, 开口后 1.0 s]（2.0 s，网络的时间注意力池化可接受变长输入）；
     b. [开口前 0.5 s, 开口后 1.0 s]（1.5 s，长度与训练相同，但开口位置不同）。
运行：python scripts/analyze_nn_confidence.py --ckpt work/models/crnn_v0.pt
输出：out/nn_confidence_<name>.json、out/fig_nn_confidence_<name>.png
"""
import argparse, json, os, sys
import numpy as np
import torch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
from ssl_baseline.nn_doa import CRNN, SIZES, features, decode, confidence
from ssl_baseline import metrics
from train_doa_net import build_features, CONDS

FS = 16000


def logits_of(model, feat, bs=64):
    out = []
    with torch.no_grad():
        for i in range(0, len(feat), bs):
            out.append(model(torch.from_numpy(np.asarray(feat[i:i + bs], dtype=np.float32))).numpy())
    return np.concatenate(out)


def auroc(score, pos):
    """正样本得分高于负样本的概率（含并列 0.5）。"""
    s, p = np.asarray(score), np.asarray(pos, bool)
    order = np.argsort(s); r = np.empty(len(s)); r[order] = np.arange(1, len(s) + 1)
    for v in np.unique(s):                                     # 并列取平均秩
        m = s == v
        if m.sum() > 1: r[m] = r[m].mean()
    n1, n0 = p.sum(), (~p).sum()
    return float((r[p].sum() - n1 * (n1 + 1) / 2) / (n1 * n0)) if n1 and n0 else float("nan")


def summarize(lg, az, cond):
    est = decode(lg); conf = confidence(lg)
    ok = metrics.angdiff(est, az) <= 10
    res = {"acc10": float(ok.mean()), "auroc": auroc(conf, ok),
           "acc10_by_cond": {c: float(ok[cond == i].mean()) for i, c in enumerate(CONDS)}}
    q = np.quantile(conf, [0.2, 0.4, 0.6, 0.8])
    b = np.digitize(conf, q)
    res["bins"] = [{"conf_lo": float(conf[b == k].min()), "conf_hi": float(conf[b == k].max()), "n": int((b == k).sum()),
                    "acc10": float(ok[b == k].mean())} for k in range(5)]
    res["threshold"] = [{"th": th, "keep": float((conf >= th).mean()), "acc10_kept": float(ok[conf >= th].mean()) if (conf >= th).any() else None,
                         "wrong_kept": int((~ok & (conf >= th)).sum()), "wrong_all": int((~ok).sum())}
                        for th in [0.0, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]]
    return res, conf, ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ckpt", default=os.path.join(ROOT, "work", "models", "crnn_v0.pt"))
    a = ap.parse_args()
    name = os.path.basename(a.ckpt)[:-3]
    side = a.ckpt[:-3] + ".json"
    size = json.load(open(side, encoding="utf-8")).get("size", "s") if os.path.exists(side) else "s"
    model = CRNN(in_ch=11, **SIZES[size]); model.load_state_dict(torch.load(a.ckpt, map_location="cpu")); model.eval()
    torch.set_num_threads(4)

    te = build_features("test")
    out = {"model": name, "n": int(len(te["az"])), "confidence": "峰值 ±3 类（±6°）概率之和"}
    lg = logits_of(model, te["feat"])
    out["win_0.5s"], conf, ok = summarize(lg, te["az"], te["cond"])

    d = np.load(os.path.join(ROOT, "work", "train_data", "test", "test.npz")); on = int(d["onset"])
    for key, (pre, post) in {"win_1.0s_pre1.0": (1.0, 1.0), "win_1.0s_pre0.5": (0.5, 1.0)}.items():
        feats = [features(d["x"][i, :, on - int(pre * FS): on + int(post * FS)].astype(np.float64) * d["scale"][i]).astype(np.float16)
                 for i in range(len(d["az"]))]
        out[key], _, _ = summarize(logits_of(model, np.stack(feats)), d["az"], d["cond"])
        print(key, round(out[key]["acc10"], 3), flush=True)

    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
    json.dump(out, open(os.path.join(ROOT, "out", f"nn_confidence_{name}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    r = out["win_0.5s"]
    print(f"0.5 s：准确率 {r['acc10']:.3f}，AUROC {r['auroc']:.3f}")
    for x in r["bins"]: print("  置信度 {conf_lo:.2f}–{conf_hi:.2f}  n={n}  ≤10° {acc10:.3f}".format(**x))
    for x in r["threshold"]: print("  门限 {th}  保留 {keep:.3f}  保留部分 ≤10° {acc10_kept}  错的保留 {wrong_kept}/{wrong_all}".format(**x))

    try:
        import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
        from matplotlib import font_manager
        for fnt in ["Microsoft YaHei", "Noto Sans CJK SC", "WenQuanYi Zen Hei", "SimHei"]:
            if any(fnt in f.name for f in font_manager.fontManager.ttflist):
                plt.rcParams["font.sans-serif"] = [fnt]; break
        plt.rcParams["axes.unicode_minus"] = False
        fig, ax = plt.subplots(1, 2, figsize=(10, 3.8))
        err = metrics.angdiff(decode(lg), te["az"])
        ax[0].scatter(conf, np.minimum(err, 90), s=6, c=np.where(ok, "#134074", "#C0392B"))
        ax[0].axhline(10, color="#8C8C8C", lw=0.8, ls="--")
        ax[0].set_xlabel("置信度"); ax[0].set_ylabel("方向误差（°，上限 90）"); ax[0].set_title("每个样本的置信度与误差")
        th = [t for t in r["threshold"] if t["acc10_kept"] is not None]
        ax[1].plot([t["keep"] * 100 for t in th], [t["acc10_kept"] * 100 for t in th], "o-", color="#134074")
        for t in th: ax[1].annotate(f"{t['th']}", (t["keep"] * 100, t["acc10_kept"] * 100), textcoords="offset points", xytext=(4, 4), fontsize=8)
        ax[1].set_xlabel("保留的判决比例（%）"); ax[1].set_ylabel("保留部分误差 ≤10° 的比例（%）"); ax[1].set_title("置信度门限（点旁数字）")
        fig.tight_layout(); fig.savefig(os.path.join(ROOT, "out", f"fig_nn_confidence_{name}.png"), dpi=150)
    except Exception as e:
        print("画图跳过：", e)


if __name__ == "__main__":
    main()
