# -*- coding: utf-8 -*-
"""会议室换人测向：神经网络训练 / 验证数据生成（仿真）。

样本：6 麦线阵（孔径 17.5 cm，平行于前墙，暂定方案）录到的 1.5 s 多通道音频：
  前 1.0 s 是新发言人 B 开口之前（上一位 A 在说话或刚说完、可能有远端喇叭、空调），后 0.5 s 是 B 开口之后；
  标签 = B 的方位（阵列坐标，0° 为正前方，范围 [-85°, 85°]）。与评测中"B 开口后 0.5 s 判决"一致。

与测试集严格分开：
  - 房间：与评测（run_meeting_eval.py，种子 2026）用同一个场景生成器，但随机种子不同（训练 1_000_000 起，验证 2_000_000 起）；
  - 人声：训练用 LibriSpeech dev-clean（40 人），验证用 LibriSpeech test-clean（另 40 人）；
          测试沿用评测的中文 / 英文素材，训练与验证都没有见过这些声音。
  LibriSpeech 许可：CC BY 4.0（openslr.org/12）。

为提高鲁棒性，范围比测试更宽：RT60 0.2–0.8 s、离墙 4–15 cm、抢话重叠 0.2–0.8 s、
远端 SIR -5～+5 dB、空调带内 SNR 0–20 dB、传感器噪声 SNR 20–40 dB。
四种条件比例：换人 35%、抢话 25%、远端扬声器 20%、空调 20%。

每个房间算一次 8 个声源（6 位参会人 + 喇叭 + 出风口）的房间冲激响应，生成 SAMPLES_PER_ROOM 个样本。
输出：work/train_data/<split>/shard_XXX.npz（x: int16 [N, 6, 24000]，scale: 每个样本的缩放，az / az_prev / cond / rt60 / wall）
运行：python scripts/gen_meeting_train_data.py --split train --rooms 1200 --workers 4
      python scripts/gen_meeting_train_data.py --split val --rooms 100 --workers 4

另有"通用房间"场景（--scene general）与 5 麦线阵（--array lin5_4cm，即 LOCATA DICIT 阵列中间 5 麦：-8/-4/0/4/8 cm），
用于在 LOCATA 真实录音上验证"仿真训练 → 真实录音"的差距：阵列放在房间内（不贴墙），声源在前方 ±80°、距离 1–4 m。
输出到 work/train_data_<scene>_<array>/<split>/。默认（meeting + lin6_17.5cm）仍输出到 work/train_data/<split>/。
"""
import argparse, glob, json, os, sys, time
from multiprocessing import Pool
import numpy as np
import scipy.signal as sps
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_meeting_eval as R
from ssl_baseline.sim import highpass

FS = 16000
PRE_S, POST_S = 1.0, 0.5
N = int((PRE_S + POST_S) * FS)
ON = int(PRE_S * FS)
SAMPLES_PER_ROOM = 10
ARRAYS = {"lin6_17.5cm": np.stack([np.zeros(6), (np.arange(6) - 2.5) * 0.175 / 5], 0),   # 6 麦线阵 17.5 cm，沿 y 轴（平行于前墙）
          "lin5_4cm": np.stack([np.zeros(5), np.array([-0.08, -0.04, 0.0, 0.04, 0.08])], 0)}  # LOCATA DICIT 中间 5 麦
MIC_XY = ARRAYS["lin6_17.5cm"]
CFG = {"scene": "meeting", "array": "lin6_17.5cm"}
CONDS = ["C1 换人", "C2 抢话", "C3 远端扬声器", "C4 空调噪声"]
COND_P = [0.35, 0.25, 0.20, 0.20]
SEED_BASE = {"train": 1_000_000, "val": 2_000_000}
LIBRI = {"train": "dev-clean", "val": "test-clean"}
WORK = os.path.join(ROOT, "work")

_SPEECH = None


def load_speech(split):
    """读取 LibriSpeech 子集：每条话语 100 Hz 高通、按有声段归一化到单位功率，并记录起始点（第一个有声位置）。"""
    files = sorted(glob.glob(os.path.join(WORK, "librispeech", "LibriSpeech", LIBRI[split], "*", "*", "*.flac")))
    if not files:
        raise FileNotFoundError(f"未找到 LibriSpeech {LIBRI[split]}，请先下载到 work/librispeech/")
    out = []
    for f in files:
        x, fs = sf.read(f, dtype="float32")
        assert fs == FS
        x = highpass(x.astype(float), FS)
        e = np.convolve(x ** 2, np.ones(320) / 320, mode="same")
        act = e > 0.01 * e.max()
        if act.sum() < FS:
            continue
        x = x / np.sqrt(np.mean(x[act] ** 2))
        onset = int(np.argmax(act))
        spk = os.path.basename(f).split("-")[0]
        out.append((spk, x, onset))
    return out


def _init(split, scene="meeting", array="lin6_17.5cm"):
    global _SPEECH, MIC_XY
    _SPEECH = load_speech(split)
    CFG.update(scene=scene, array=array); MIC_XY = ARRAYS[array]


def make_general_scene(rng):
    """通用房间：阵列在房间内（离墙 ≥1 m，正前方留出空间），6 个声源位置与 1 个干扰喇叭在前方 ±80°、1–4 m，出风口在吊顶。"""
    while True:
        L, W, H = rng.uniform(4.0, 10.0), rng.uniform(4.0, 10.0), rng.uniform(2.5, 3.5)
        c = np.array([rng.uniform(1.0, max(1.01, L - 2.5)), rng.uniform(1.0, W - 1.0), rng.uniform(1.0, 1.6)])

        def place(zlo, zhi):
            for _ in range(200):
                az, d = rng.uniform(-80, 80), rng.uniform(1.0, 4.0)
                p = np.array([c[0] + d * np.cos(np.deg2rad(az)), c[1] + d * np.sin(np.deg2rad(az)), rng.uniform(zlo, zhi)])
                if 0.4 < p[0] < L - 0.4 and 0.4 < p[1] < W - 0.4:
                    return p
            return None
        people = [place(1.0, 1.9) for _ in range(6)]
        spk = place(0.8, 1.6)
        if any(p is None for p in people) or spk is None:
            continue
        azs = [R.az_of(p, c) for p in people]
        ia, ib = rng.choice(6, 2, replace=False)
        vent = np.array([rng.uniform(0.5, L - 0.5), rng.uniform(0.5, W - 0.5), H - 0.05])
        return [L, W, H], c, people, azs, ia, ib, spk, vent


def pick(rng, exclude_spk):
    while True:
        spk, x, onset = _SPEECH[rng.integers(len(_SPEECH))]
        if spk not in exclude_spk:
            return spk, x, onset


def make_room(args):
    split, room_idx = args
    rng = np.random.default_rng(SEED_BASE[split] + room_idx)
    R.WALL_D = float(rng.uniform(0.04, 0.15))
    rt60 = float(rng.uniform(0.2, 0.8))
    if CFG["scene"] == "general":
        dims, c, people, azs, _, _, spk_pos, vent = make_general_scene(rng)
    else:
        dims, c, people, azs, _, _, spk_pos, vent = R.make_scene(rng)
    M = MIC_XY.shape[1]
    mics = np.vstack([MIC_XY + c[:2, None], np.full((1, M), c[2])])
    H = [R.rirs(dims, rt60, p, mics) for p in list(people) + [spk_pos, vent]]   # 0–5 参会人，6 喇叭，7 出风口
    xs, meta = [], []
    for _ in range(SAMPLES_PER_ROOM):
        ia, ib = rng.choice(6, 2, replace=False)
        while CFG["scene"] == "general" and abs(((azs[ia] - azs[ib] + 180) % 360) - 180) < 10:
            ia, ib = rng.choice(6, 2, replace=False)                              # 通用场景：两人方位至少差 10°
        cond = CONDS[rng.choice(4, p=COND_P)]
        spk_b, xb, onb = pick(rng, set())
        spk_a, xa, _ = pick(rng, {spk_b})
        # B：话语起始点对齐到 ON（开口前留 20 ms）
        sB = np.zeros(N); seg = xb[max(0, onb - int(0.02 * FS)):][: N - ON + int(0.02 * FS)]
        sB[ON - int(0.02 * FS): ON - int(0.02 * FS) + len(seg)] = seg
        # A：随机一段有声语音；换人时停 0.2–0.6 s，抢话时延续到 B 开口后 0.2–0.8 s
        st = rng.integers(0, max(1, len(xa) - N)); sA = xa[st: st + N].copy()
        if len(sA) < N:
            sA = np.pad(sA, (0, N - len(sA)))
        end = ON + int(rng.uniform(0.2, 0.8) * FS) if cond == "C2 抢话" else ON - int(rng.uniform(0.2, 0.6) * FS)
        if end < N:                                                              # 抢话超过片段末尾时 A 一直说到末尾
            fade = np.linspace(1, 0, int(0.02 * FS)); sA[end - len(fade): end] *= fade; sA[end:] = 0
        y = R.conv(H[ib], sB, N) + R.conv(H[ia], sA, N)
        bpow = R.band_power(y - R.conv(H[ia], sA, N), ON, N) + 1e-12             # B 在开口后 0.5 s 的带内功率
        if cond == "C3 远端扬声器":
            _, xf, _ = pick(rng, {spk_a, spk_b}); st = rng.integers(0, max(1, len(xf) - N))
            sF = np.pad(xf[st: st + N], (0, max(0, N - len(xf[st: st + N]))))
            yF = R.conv(H[6], sF, N); y = y + yF * np.sqrt(bpow / (R.band_power(yF, ON, N) + 1e-12) / 10 ** (rng.uniform(-5, 5) / 10))
        if cond == "C4 空调噪声":
            yV = R.conv(H[7], R.ac_noise(N, rng), N)
            y = y + yV * np.sqrt(bpow / (R.band_power(yV, ON, N) + 1e-12) / 10 ** (rng.uniform(0, 20) / 10))
        pB = np.mean(R.conv(H[ib], sB, N)[:, ON:] ** 2)
        y = y + rng.normal(0, np.sqrt(pB / 10 ** (rng.uniform(20, 40) / 10)), y.shape)
        scale = float(np.max(np.abs(y)) / 32000.0 + 1e-12)
        xs.append(np.round(y / scale).astype(np.int16))
        meta.append({"scale": scale, "az": float((azs[ib] + 180) % 360 - 180), "az_prev": float((azs[ia] + 180) % 360 - 180),
                     "cond": CONDS.index(cond), "rt60": rt60, "wall": R.WALL_D, "room": room_idx})
    return xs, meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--split", choices=["train", "val"], required=True)
    ap.add_argument("--rooms", type=int, required=True)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--shard-rooms", type=int, default=50)
    ap.add_argument("--scene", choices=["meeting", "general"], default="meeting")
    ap.add_argument("--array", choices=list(ARRAYS), default="lin6_17.5cm")
    a = ap.parse_args()
    sub = "train_data" if (a.scene, a.array) == ("meeting", "lin6_17.5cm") else f"train_data_{a.scene}_{a.array}"
    outdir = os.path.join(WORK, sub, a.split); os.makedirs(outdir, exist_ok=True)
    t0 = time.time()
    with Pool(a.workers, initializer=_init, initargs=(a.split, a.scene, a.array)) as pool:
        for s0 in range(0, a.rooms, a.shard_rooms):
            fn = os.path.join(outdir, f"shard_{s0 // a.shard_rooms:03d}.npz")
            if os.path.exists(fn):
                continue
            res = pool.map(make_room, [(a.split, i) for i in range(s0, min(a.rooms, s0 + a.shard_rooms))])
            xs = [x for r in res for x in r[0]]; meta = [m for r in res for m in r[1]]
            np.savez(fn, x=np.stack(xs), **{k: np.array([m[k] for m in meta]) for k in meta[0]})
            print(f"[{a.split}] {min(a.rooms, s0 + a.shard_rooms)}/{a.rooms} 个房间  {len(xs)} 个样本 → {os.path.basename(fn)}  {time.time() - t0:.0f}s", flush=True)
    json.dump({"split": a.split, "rooms": a.rooms, "samples_per_room": SAMPLES_PER_ROOM, "fs": FS, "pre_s": PRE_S, "post_s": POST_S,
               "scene": a.scene, "array": a.array, "mic_xy_m": ARRAYS[a.array].round(4).tolist(), "speech": f"LibriSpeech {LIBRI[a.split]}（CC BY 4.0）", "seed_base": SEED_BASE[a.split],
               "conds": CONDS, "cond_p": COND_P}, open(os.path.join(outdir, "info.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
