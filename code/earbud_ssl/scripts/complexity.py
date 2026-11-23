"""定位算法每秒浮点运算量与内存估算（与 PPT 第 6 页同一口径）。

口径：16 kHz，512 点 FFT、帧移 256（每秒 62.5 帧），保留 200–7000 Hz 共 218 个频点；72 个方向（5°）；每 0.25 s 扫描一次；
复数乘加按 8 次浮点运算；高通为 4 阶 IIR（两个双二阶）。只计定位本身，不含声学开口检测（只开低帧率档时另加约 6.6 MFLOPS）。
算法：SRP-PHAT（逐帧 PHAT 互谱累加后扫描）、MUSIC（协方差 → 特征分解 → 噪声子空间扫描）、GEVD-MUSIC（再加背景协方差白化）。

用法：python scripts/complexity.py → out/complexity.json
"""
import json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FS, N, HOP = 16000, 512, 256
FPS = FS / HOP
F = sum(1 for k in range(N // 2 + 1) if 200 <= k * FS / N <= 7000)
G, SCAN_HZ, CMAC = 72, 4, 8


def common(M):
    hp = M * FS * 20                                   # 4 阶 IIR：每样本约 10 次乘加
    fft = M * (2.5 * N * math.log2(N) / 2 + N) * FPS   # 实数 FFT + 加窗
    frame = M * F * 4 * FPS                            # 帧能量、判帧
    return hp, fft, frame


def eig_cost(M):
    return {2: 60, 3: 600}[M]                          # 2×2 闭式；3×3 迭代


def estimate(alg, M):
    hp, fft, frame = common(M)
    P = M * (M - 1) // 2
    d = {"高通": hp, "分帧 + FFT": fft, "判帧": frame}
    if alg == "SRP-PHAT":
        d["互谱 + PHAT 归一化"] = F * P * (CMAC + 10) * FPS
        d["方向扫描"] = G * F * P * CMAC * SCAN_HZ
        mem = G * F * P * 4                            # 每对麦克风的归一化模板（复数半精度）
    else:
        nC = M * (M + 1) // 2                          # 厄米矩阵独立元素
        d["协方差"] = F * nC * CMAC * FPS * (2 if alg == "GEVD-MUSIC" else 1) / 2
        white = (60 + 2 * M * M * M * CMAC) if alg == "GEVD-MUSIC" else 0
        d["白化 + 特征分解" if white else "特征分解"] = F * (white + eig_cost(M)) * SCAN_HZ
        per_dir = (M * M + M * (M - 1)) * CMAC + 10 if alg == "GEVD-MUSIC" else M * (M - 1) * CMAC + 10
        d["方向扫描"] = G * F * per_dir * SCAN_HZ
        mem = G * F * M * 4
    cov_mem = F * M * M * 8 * (2 if alg == "GEVD-MUSIC" else 1)
    return {k: v / 1e6 for k, v in d.items()}, sum(d.values()) / 1e6, mem / 1024, cov_mem / 1024


out = {"bins": F, "frames_per_s": FPS, "results": {}}
for M, name in [(3, "2+1（两耳，3 路）"), (2, "单耳 2 麦")]:
    for alg in ["SRP-PHAT", "MUSIC", "GEVD-MUSIC"]:
        steps, tot, tmpl, cov = estimate(alg, M)
        out["results"][f"{name} | {alg}"] = {"steps_mflops": {k: round(v, 2) for k, v in steps.items()}, "total_mflops": round(tot, 1),
                                            "template_kb": round(tmpl), "state_kb": round(cov)}
        print(f"{name:<14s} {alg:<11s} 合计 {tot:5.1f} MFLOPS  模板 {tmpl:5.0f} KB  状态 {cov:4.0f} KB  " +
              "  ".join(f"{k} {v:.2f}" for k, v in steps.items()))
with open(os.path.join(ROOT, "out", "complexity.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
