# -*- coding: utf-8 -*-
"""【未校验：与 build_realman_finetune.py 逐字节一致的校验尚未完成，校验通过前不要使用】
自有阵列（或任何多通道录音）→ 实录微调数据。做法与 build_realman_finetune.py 完全相同，只是输入换成一张清单。

清单（CSV，UTF-8，每行一段单人说话或一段无人说话的录音）：
  path        录音文件（相对 --root）；多通道 wav / flac，或 --loader realman 时为 RealMAN 的 *_CH0.flac
  room        房间名（训练 / 挑选模型按房间划分，测试房间不要放进来）
  kind        speech（单人说话）或 noise（无人说话的背景声，可选；没有时从说话间隙里取背景声）
  azimuth_deg 说话人方位（本仓库约定：正前方 0°，左右 ±90°；线阵前后不分，会折叠到前方）；noise 行留空
  其余列（distance_m、height_m、speaker、position 等）照抄进 info.json 的统计，不参与合成
样本：同一房间、不同位置（方位差 ≥10°）的两段说话相加（换人 / 抢话），或一段说话前面接安静段（安静后开口）；
     空出的时段用同一房间的背景声填补。长度 1.5 s（开口前 1.0 s + 开口后 0.5 s），与仿真训练数据同格式。
运行：python scripts/build_own_finetune.py --manifest data.csv --root <录音目录> --train-rooms A B C --val-rooms D --name train_data_own_ft
校验：python scripts/build_own_finetune.py --export-realman work/realman_val_manifest.csv  （把 RealMAN 验证集写成清单）
      再用 --loader realman 构建，结果应与 build_realman_finetune.py 的输出逐字节一致。
"""
import argparse, csv, glob, json, os, sys
import numpy as np
import scipy.signal as sps
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import build_realman_test as T

FS = 16000
N = int(1.5 * FS); ON = FS
SEEDS = {"train": 101, "val": 202}


def make_loader(kind, channels):
    if kind == "realman":
        return T.load
    def load(path):
        x, fs = sf.read(path, always_2d=True)
        x = x.T if not channels else x.T[channels]
        if fs != FS:
            g = np.gcd(int(fs), FS); x = sps.resample_poly(x, FS // g, int(fs) // g, axis=1)
        return x
    return load


def noise_bank_from(files, load, need):
    if not files:
        return None
    pieces, tot = [], 0
    for f in files:
        x = load(f); pieces.append(x); tot += x.shape[1]
        if tot >= need:
            break
    return np.concatenate(pieces, 1)


def compose(utts, bank, get, n, rng):
    """与 build_realman_finetune.py 相同的合成（随机数的使用顺序也相同）。"""
    X, meta = [], []
    for k in range(n):
        fb, azb = utts[rng.integers(len(utts))]
        cond = int(rng.choice(3, p=[0.4, 0.3, 0.3]))                         # 0 换人、1 抢话、2 安静后开口
        seg = np.zeros((get(fb).shape[0], N)); xb = get(fb)
        nb = min(xb.shape[1], N - ON); seg[:, ON:ON + nb] += xb[:, :nb]
        aza = azb
        if cond in (0, 1):
            cands = [u for u in utts if u[0] != fb and abs(u[1] - azb) >= 10]
            fa, aza = cands[rng.integers(len(cands))]
            xa = get(fa)
            lo, hi = ((-0.6, -0.2), (0.2, 0.8))[cond]
            end = min(N, ON + int(rng.uniform(lo, hi) * FS)); st = end - xa.shape[1]
            a0, a1 = max(0, st), end
            seg[:, a0:a1] += xa[:, a0 - st: a1 - st]
            T.fill(seg, bank, 0, a0, rng); T.fill(seg, bank, a1, ON, rng)
        else:
            T.fill(seg, bank, 0, ON, rng)
        sc_ = float(np.max(np.abs(seg)) / 32000.0 + 1e-12)
        X.append(np.round(seg / sc_).astype(np.int16))
        meta.append({"scale": sc_, "az": azb, "az_prev": aza, "cond": cond, "rt60": -1.0})
    return X, meta


def export_realman(out):
    """把 RealMAN 验证集（work/realman_val）写成清单，顺序与 build_realman_finetune.py 读取的顺序相同。"""
    import build_realman_finetune as B
    lab = B.labels(); W = B.W
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["path", "room", "kind", "azimuth_deg"])
        for sc in ["OfficeRoom1", "LivingRoom6", "LivingRoom8", "Auditorium"]:
            for p in sorted(glob.glob(os.path.join(W, sc, "*", "*", "*_CH0.flac"))):
                k = os.path.basename(p).replace("_CH0", "")
                if k in lab:
                    w.writerow([os.path.relpath(p, W), sc, "speech", repr(90.0 - lab[k])])
    print("清单 →", out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest"); ap.add_argument("--root", default=".")
    ap.add_argument("--train-rooms", nargs="*", default=[]); ap.add_argument("--val-rooms", nargs="*", default=[])
    ap.add_argument("--name", default="train_data_own_ft")
    ap.add_argument("--total", type=int, default=4500, help="训练样本总数（按房间平均分）")
    ap.add_argument("--val-per-room", type=int, default=400)
    ap.add_argument("--loader", default="wav", help="wav（多通道文件）/ realman")
    ap.add_argument("--channels", type=int, nargs="*", default=None, help="用哪些通道（按阵列顺序）；默认全部")
    ap.add_argument("--max-az", type=float, default=80.0)
    ap.add_argument("--export-realman", default=None)
    a = ap.parse_args()
    if a.export_realman:
        return export_realman(a.export_realman)
    rows = list(csv.DictReader(open(a.manifest, encoding="utf-8")))
    load = make_loader(a.loader, a.channels)
    for split, rooms in (("train", a.train_rooms), ("val", a.val_rooms)):
        if not rooms:
            continue
        rng = np.random.default_rng(SEEDS[split])
        X, meta, stats = [], [], {}
        for si, room in enumerate(rooms):
            sp = [r for r in rows if r["room"] == room and r.get("kind", "speech") == "speech"]
            utts = [(os.path.join(a.root, r["path"]), T.fold(float(r["azimuth_deg"]))) for r in sp]
            utts = [u for u in utts if abs(u[1]) <= a.max_az]
            if len(utts) < 2:
                sys.exit(f"{room}: 有效说话录音少于 2 段")
            noise = [os.path.join(a.root, r["path"]) for r in rows if r["room"] == room and r.get("kind") == "noise"]
            cache = {}
            get = lambda f: cache.setdefault(f, load(f))
            bank = noise_bank_from(noise, load, 30 * FS) if noise else T.noise_bank(utts, 30 * FS)
            n = a.val_per_room if split == "val" else a.total // len(rooms)
            x, m = compose(utts, bank, get, n, rng)
            X += x; meta += [dict(mm, room=si) for mm in m]
            stats[room] = {"utts": len(utts), "noise_files": len(noise), "samples": n,
                           "minutes": round(sum(sf.info(u[0]).duration for u in utts) / 60, 2)}
            print(f"[{split}] {room}: 说话 {len(utts)} 段，背景声文件 {len(noise)} 个，样本 {n}", flush=True)
        out = os.path.join(ROOT, "work", a.name, split); os.makedirs(out, exist_ok=True)
        keys = ["scale", "az", "az_prev", "cond", "rt60", "room"]
        np.savez(os.path.join(out, "shard_000.npz"), x=np.stack(X), **{k: np.array([mm[k] for mm in meta]) for k in keys})
        json.dump({"manifest": os.path.abspath(a.manifest), "rooms": stats}, open(os.path.join(ROOT, "work", a.name, f"info_{split}.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print(f"[{split}] 共 {len(X)} 个样本 → {out}")


if __name__ == "__main__":
    main()
