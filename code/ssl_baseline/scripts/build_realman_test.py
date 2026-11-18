# -*- coding: utf-8 -*-
"""RealMAN 真实录音测试集（6 麦线阵：RealMAN 阵列 x 轴上 -6 / -3 / 0 / 3 / 6 / 9 cm），用于验证"仿真训练 → 真实录音"。

数据：RealMAN 测试集若干室内场景（CC BY 4.0；download_realman_scenes.sh 下载），录音为带真实背景噪声的语音（ma_noisy_speech），
每条话语一个说话人（静止或走动），话语文件已截好，开头即开口。
真值：官方方位 φ（静止为单值，走动为每 0.1 s 一个值，取开口后约 0.25 s）。本仓库方位 = 90° − φ；线阵无法区分前后，
统一折叠到前方 [-90°, 90°]（贴墙安装时背后没有声源）。

样本（与 LOCATA 测试集同格式：开口前 2.0 s 到开口后 0.5 s，开口在 2.0 s 处）：
  同一场景、不同位置（折叠后方位差 ≥10°）的两条话语直接相加：
  叠加换人：A 在 B 开口前 0.2–0.6 s 说完；叠加抢话：A 在 B 开口后 0.2–0.8 s 说完。
  A 的结束取自 A 话语文件的末尾（文件截在说话结束处），两段都带各自的真实背景噪声（叠加后底噪比单段约高 3 dB）。
  话语文件前后已截掉静音，A、B 都没有覆盖的时段（A 开始前、A 说完到 B 开口之间）会是绝对零值——真实房间不会出现，
  因此用同一场景的真实背景噪声填补：从各话语中能量处于噪声底附近、连续 ≥0.1 s 的片段（字词间停顿）拼成噪声库，按原电平填入，边界 10 ms 渐变。
输出：work/realman_test/realman_test.npz
运行：python scripts/build_realman_test.py
"""
import csv, glob, os
import numpy as np
import scipy.signal as sps
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = os.path.join(ROOT, "work", "realman")
CH = [13, 5, 0, 1, 9, 17]                  # x = -6, -3, 0, 3, 6, 9 cm
FS = 16000
PRE_L, POST = 2.0, 0.5
N = int((PRE_L + POST) * FS); ON = int(PRE_L * FS)
COND_NAMES = ["实录单声源", "实录多声源", "叠加换人", "叠加抢话"]          # 与 LOCATA 测试集一致；RealMAN 只有后两类
PER_SCENE = 60


def fold(a):
    return float(np.rad2deg(np.arcsin(np.sin(np.deg2rad(a)))))


def load(base_path):
    x = np.stack([sf.read(base_path.replace("_CH0.flac", f"_CH{c}.flac"))[0] for c in CH])
    return sps.resample_poly(x, 1, 3, axis=1)


def noise_bank(utts, need):
    """同一场景的真实背景噪声：取各话语中 CH0 帧能量在噪声底（10% 分位）+3 dB 以内、连续 ≥0.1 s 的片段，拼接到 need 个样点。"""
    pieces, tot = [], 0
    for f, _ in utts:
        x = load(f); fr = 320
        e = 10 * np.log10(np.mean(x[0, : x.shape[1] // fr * fr].reshape(-1, fr) ** 2, 1) + 1e-12)
        low = e <= np.percentile(e, 10) + 3
        d = np.diff(np.r_[0, low.astype(int), 0]); st, en = np.where(d == 1)[0], np.where(d == -1)[0]
        for a, b in zip(st, en):
            if b - a >= 5:                                                   # ≥0.1 s
                pieces.append(x[:, a * fr: b * fr]); tot += (b - a) * fr
        if tot >= need:
            break
    return np.concatenate(pieces, 1) if pieces else None


def fill(seg, bank, a, b, rng):
    """把 seg[:, a:b]（原为零）用噪声库中随机一段填上，两端 10 ms 渐变。"""
    n = b - a
    if n <= 0 or bank is None or bank.shape[1] <= n:
        return
    st = rng.integers(0, bank.shape[1] - n); piece = bank[:, st: st + n].copy()
    r = min(160, n // 2)
    if r > 0:
        w = np.ones(n); w[:r] = np.linspace(0, 1, r); w[-r:] = np.linspace(1, 0, r); piece *= w
    seg[:, a:b] += piece


def main():
    lab = {}
    for kind in ["static", "moving"]:
        for r in csv.DictReader(open(os.path.join(W, f"test_{kind}_source_location.csv"))):
            a = [float(v) for v in r["angle(°)"].split(",")]
            lab[os.path.basename(r["filename"])] = a[min(2, len(a) - 1)]          # 走动：开口后约 0.25 s
    rng = np.random.default_rng(11)
    X, meta = [], []
    scenes = sorted(d for d in os.listdir(W) if os.path.isdir(os.path.join(W, d)))
    for sc in scenes:
        files = sorted(glob.glob(os.path.join(W, sc, "*", "*", "*_CH0.flac")))
        utts = [(f, fold(90.0 - lab[os.path.basename(f).replace("_CH0", "")])) for f in files if os.path.basename(f).replace("_CH0", "") in lab]
        utts = [u for u in utts if abs(u[1]) <= 80]
        bs = [utts[i] for i in rng.permutation(len(utts))[:PER_SCENE]]
        bank = noise_bank(utts, 30 * FS)
        print(f"{sc}: 噪声库 {0 if bank is None else bank.shape[1] / FS:.1f} s", flush=True)
        n0 = len(X)
        for fb, azb in bs:
            for cond, (lo, hi) in [(2, (-0.6, -0.2)), (3, (0.2, 0.8))]:
                cands = [u for u in utts if u[0] != fb and abs(u[1] - azb) >= 10]
                if not cands:
                    continue
                fa, aza = cands[rng.integers(len(cands))]
                xb, xa = load(fb), load(fa)
                seg = np.zeros((6, N)); valid = ON
                nb = min(xb.shape[1], N - ON); seg[:, ON:ON + nb] += xb[:, :nb]
                end = ON + int(rng.uniform(lo, hi) * FS)                     # A 在片段中的结束位置
                st = end - xa.shape[1]                                        # A 在片段中的开始位置
                a0, a1 = max(0, st), min(N, end)
                seg[:, a0:a1] += xa[:, a0 - st: a1 - st]
                fill(seg, bank, 0, a0, rng)                                   # A 开始前
                fill(seg, bank, a1, ON, rng)                                  # A 说完到 B 开口之间
                valid = 0
                X.append(seg.astype(np.float32))
                meta.append({"az": azb, "cond": cond, "valid_from": valid, "src": f"{sc}:{os.path.basename(fb)}", "extra": f"A={os.path.basename(fa)} 方位 {aza:.1f}°"})
        print(f"{sc}: 话语 {len(utts)}，样本 {len(X) - n0}", flush=True)
    out = os.path.join(ROOT, "work", "realman_test"); os.makedirs(out, exist_ok=True)
    np.savez(os.path.join(out, "realman_test.npz"), x=np.stack(X), onset=ON, az=np.array([m["az"] for m in meta]),
             cond=np.array([m["cond"] for m in meta]), valid_from=np.array([m["valid_from"] for m in meta]),
             src=np.array([m["src"] for m in meta]), extra=np.array([m["extra"] for m in meta]), cond_names=np.array(COND_NAMES))
    cond = np.array([m["cond"] for m in meta]); az = np.array([m["az"] for m in meta])
    print("样本数", len(X), {COND_NAMES[c]: int((cond == c).sum()) for c in range(4)}, "方位范围", round(float(az.min()), 1), round(float(az.max()), 1))


if __name__ == "__main__":
    main()
