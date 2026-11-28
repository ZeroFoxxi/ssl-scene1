# -*- coding: utf-8 -*-
"""自有阵列（或任何多通道录音）→ 实录微调数据。做法与 build_realman_finetune.py 完全相同，只是输入换成一张清单。

清单（CSV，UTF-8，每行一段单人说话或一段无人说话的录音）：
  path        录音文件（相对 --root）；多通道 wav / flac，或 --loader realman 时为 RealMAN 的 *_CH0.flac
  room        房间名（训练 / 挑选模型按房间划分，测试房间不要放进来）
  kind        speech（单人说话）或 noise（无人说话的背景声，可选；没有时从说话间隙里取背景声）
  azimuth_deg 说话人方位（本仓库约定：正前方 0°，左右 ±90°；线阵前后不分，会折叠到前方）；noise 行留空
  其余列（distance_m、height_m、speaker、position 等）照抄进 info.json 的统计，不参与合成
样本：同一房间、不同位置（方位差 ≥10°）的两段说话相加（换人 / 抢话），或一段说话前面接安静段（安静后开口）；
     空出的时段用同一房间的背景声填补。长度 1.5 s（开口前 1.0 s + 开口后 0.5 s），与仿真训练数据同格式。
运行：python scripts/build_own_finetune.py --manifest data.csv --root <录音目录> --train-rooms A B C --val-rooms D --name train_data_own_ft
测试集（只评测、不参与训练的房间；与 build_realman_test.py 同一做法：开口前 2.0 s + 开口后 0.5 s，叠加换人 / 抢话，eval_locata.py 可直接用）：
      python scripts/build_own_finetune.py --manifest data.csv --root <录音目录> --test-rooms E --name own_test   → work/own_test/test.npz
      校验：--export-realman <清单> --realman-split test 把 RealMAN 测试集写成清单，再 --loader realman --test-rooms <5 个场景>，应与 realman_test.npz 逐字节一致。
校验：python scripts/build_own_finetune.py --export-realman work/realman_val_manifest.csv  （把 RealMAN 验证集写成清单）
      再用 --loader realman 构建，结果应与 build_realman_finetune.py 的输出逐字节一致（11-28 已校验：train、val 两部分都一致）。
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


def export_realman(out, split="val"):
    """把 RealMAN 验证集（work/realman_val）或测试集（work/realman）写成清单，顺序与原脚本读取的顺序相同。"""
    import build_realman_finetune as B
    if split == "val":
        lab = B.labels(); W = B.W; scenes = ["OfficeRoom1", "LivingRoom6", "LivingRoom8", "Auditorium"]
    else:
        W = T.W; lab = {}
        for kind in ["static", "moving"]:
            for r in csv.DictReader(open(os.path.join(W, f"test_{kind}_source_location.csv"))):
                v = [float(q) for q in r["angle(°)"].split(",")]
                lab[os.path.basename(r["filename"])] = v[min(2, len(v) - 1)]
        scenes = sorted(d for d in os.listdir(W) if os.path.isdir(os.path.join(W, d)))
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["path", "room", "kind", "azimuth_deg"])
        for sc in scenes:
            for p in sorted(glob.glob(os.path.join(W, sc, "*", "*", "*_CH0.flac"))):
                k = os.path.basename(p).replace("_CH0", "")
                if k in lab:
                    w.writerow([os.path.relpath(p, W), sc, "speech", repr(90.0 - lab[k])])
    print("清单 →", out)


def compose_test(utts, bank, get, n_targets, rng, room, n_ch):
    """与 build_realman_test.py 相同的测试样本（随机数的使用顺序也相同）：每个目标话语一个叠加换人、一个叠加抢话。"""
    Nt, ONt = int((T.PRE_L + T.POST) * FS), int(T.PRE_L * FS)
    X, meta = [], []
    bs = [utts[i] for i in rng.permutation(len(utts))[:n_targets]]
    for fb, azb in bs:
        for cond, (lo, hi) in [(2, (-0.6, -0.2)), (3, (0.2, 0.8))]:
            cands = [u for u in utts if u[0] != fb and abs(u[1] - azb) >= 10]
            if not cands:
                continue
            fa, aza = cands[rng.integers(len(cands))]
            xb, xa = get(fb), get(fa)
            seg = np.zeros((n_ch, Nt))
            nb = min(xb.shape[1], Nt - ONt); seg[:, ONt:ONt + nb] += xb[:, :nb]
            end = ONt + int(rng.uniform(lo, hi) * FS); st = end - xa.shape[1]
            a0, a1 = max(0, st), min(Nt, end)
            seg[:, a0:a1] += xa[:, a0 - st: a1 - st]
            T.fill(seg, bank, 0, a0, rng); T.fill(seg, bank, a1, ONt, rng)
            X.append(seg.astype(np.float32))
            meta.append({"az": azb, "cond": cond, "valid_from": 0, "src": f"{room}:{os.path.basename(fb)}", "extra": f"A={os.path.basename(fa)} 方位 {aza:.1f}°"})
    return X, meta, ONt


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
    ap.add_argument("--realman-split", default="val", choices=["val", "test"])
    ap.add_argument("--test-rooms", nargs="*", default=[], help="只用于测试的房间")
    ap.add_argument("--test-per-room", type=int, default=60, help="每个测试房间的目标话语数（每个生成换人、抢话各 1 个样本）")
    a = ap.parse_args()
    if a.export_realman:
        return export_realman(a.export_realman, a.realman_split)
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
    if a.test_rooms:
        rng = np.random.default_rng(11); X, meta, on = [], [], None
        for room in a.test_rooms:
            sp = [r for r in rows if r["room"] == room and r.get("kind", "speech") == "speech"]
            utts = [(os.path.join(a.root, r["path"]), T.fold(float(r["azimuth_deg"]))) for r in sp]
            utts = [u for u in utts if abs(u[1]) <= a.max_az]
            noise = [os.path.join(a.root, r["path"]) for r in rows if r["room"] == room and r.get("kind") == "noise"]
            cache = {}
            get = lambda f: cache.setdefault(f, load(f))
            bank = noise_bank_from(noise, load, 30 * FS) if noise else T.noise_bank(utts, 30 * FS)
            x, m, on = compose_test(utts, bank, get, a.test_per_room, rng, room, get(utts[0][0]).shape[0])
            X += x; meta += m
            print(f"[test] {room}: 说话 {len(utts)} 段，样本 {len(x)}", flush=True)
        out = os.path.join(ROOT, "work", a.name); os.makedirs(out, exist_ok=True)
        np.savez(os.path.join(out, "test.npz"), x=np.stack(X), onset=on, az=np.array([m["az"] for m in meta]),
                 cond=np.array([m["cond"] for m in meta]), valid_from=np.array([m["valid_from"] for m in meta]),
                 src=np.array([m["src"] for m in meta]), extra=np.array([m["extra"] for m in meta]), cond_names=np.array(T.COND_NAMES))
        print(f"[test] 共 {len(X)} 个样本 → {out}/test.npz")


if __name__ == "__main__":
    main()
