# -*- coding: utf-8 -*-
"""服务器训练的 RealMAN 阵列模型（12,000 / 60,000 训练数据 × s / l）在实录上的同条件对比。

模型放在 code/ssl_baseline/server_models/（.pt 与同名 .json，大小读 .json）。依次：
  1. RealMAN 测试集单次测向（600 个样本，与 out/realman_eval.json 同一批，eval_locata.py）；
  2. 实录回放（RealMAN 测试集 5 个场景 × 10 段 60 s 会议，与 out/realman_replay_test.json 同一批会议），
     每个模型给"不加门限"与"置信度 ≥0.7"（门限沿用仿真验证会议上选定的值，不在实录上调）；
  3. 汇总成一张表，存到 out/server_models_realman.json 与 .txt。
都是只用仿真数据训练的模型（未做实录微调）；与之前云端的仿真训练版（12,000、s）可直接对照。
运行：python scripts/eval_server_models.py            （已有的单次测向结果会跳过；加 --redo 重算）
"""
import argparse, glob, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable


def run(cmd):
    print("$", " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=ROOT, check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="server_models")
    ap.add_argument("--meetings", type=int, default=10)
    ap.add_argument("--redo", action="store_true")
    a = ap.parse_args()
    cks = sorted(glob.glob(os.path.join(ROOT, a.dir, "*.pt")))
    if not cks:
        sys.exit(f"{a.dir}/ 下没有模型")
    names = [os.path.basename(c)[:-3] for c in cks]
    # 1. 单次测向
    for c, n in zip(cks, names):
        out = os.path.join(ROOT, "out", f"realman_eval_{n}.json")
        if os.path.exists(out) and not a.redo:
            continue
        run([PY, "scripts/eval_locata.py", "--ckpt", os.path.relpath(c, ROOT), "--data", "work/realman_test/realman_test.npz",
             "--array", "lin6_3cm", "--out", "realman_eval", "--tag", f"_{n}"])
    # 2. 实录回放（含 SRP-PHAT、GEVD-MUSIC 作对照）
    rep = os.path.join(ROOT, "out", "realman_replay_test_server.json")
    if not os.path.exists(rep) or a.redo:
        run([PY, "scripts/run_realman_replay_demo.py", "--split", "test", "--meetings", str(a.meetings), "--conf", "0.7", "--tag", "_server",
             "--models"] + [f"{n}={os.path.relpath(c, ROOT)}" for c, n in zip(cks, names)])
    # 3. 汇总
    R = json.load(open(rep, encoding="utf-8"))["summary"]
    rows, lines = [], []
    lines.append(f"{'模型':<36}{'参数':>7}{'仿真验证':>9}{'实录单次≤10°':>13}{'≤20°':>7}{'平均误差':>9}{'回放误转/分':>11}{'2s内对准':>9}{'静止对准':>9}"
                 f"{'+门限误转':>10}{'+门限静止':>10}")
    for c, n in zip(cks, names):
        meta = json.load(open(c[:-3] + ".json", encoding="utf-8"))
        ev = json.load(open(os.path.join(ROOT, "out", f"realman_eval_{n}.json"), encoding="utf-8"))["methods"]["小网络（仿真训练）"]["全部"]
        r0, r7 = R.get(n, {}), R.get(f"{n}|置信≥0.7", {})
        row = {"model": n, "size": meta.get("size"), "params": meta.get("params"), "sim_val_acc10": meta.get("val_acc10"),
               "real_acc10": ev["acc10"], "real_acc20": ev["acc20"], "real_mae": ev["mae"],
               "replay": r0, "replay_conf0.7": r7}
        rows.append(row)
        f = lambda v, p=True: "—" if v is None else (f"{v * 100:.1f}%" if p else f"{v:.2f}")
        lines.append(f"{n:<36}{meta.get('params', 0) / 1e6:>6.2f}M{f(meta.get('val_acc10')):>9}{f(ev['acc10']):>13}{f(ev['acc20']):>7}{ev['mae']:>8.1f}°"
                     f"{f(r0.get('wrong_per_min'), False):>11}{f(r0.get('aim_within_2s')):>9}{f(r0.get('framed_static')):>9}"
                     f"{f(r7.get('wrong_per_min'), False):>10}{f(r7.get('framed_static')):>10}")
    for b in ["SRP-PHAT", "GEVD-MUSIC"]:
        r = R.get(b, {})
        lines.append(f"{b:<36}{'':>7}{'':>9}{'':>13}{'':>7}{'':>9}{r.get('wrong_per_min', 0):>11.2f}{r.get('aim_within_2s', 0) * 100:>8.1f}%{r.get('framed_static', 0) * 100:>8.1f}%")
    txt = "\n".join(lines)
    print("\n" + txt)
    json.dump({"rows": rows, "baselines": {b: R.get(b) for b in ["SRP-PHAT", "GEVD-MUSIC"]}}, open(os.path.join(ROOT, "out", "server_models_realman.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    open(os.path.join(ROOT, "out", "server_models_realman.txt"), "w", encoding="utf-8").write(txt + "\n")


if __name__ == "__main__":
    main()
