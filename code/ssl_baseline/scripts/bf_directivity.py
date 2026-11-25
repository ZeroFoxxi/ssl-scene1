"""固定波束的指向性（理想自由场、远场平面波、各向同性扩散噪声），用于"声源定位 + 波束成形总结"。

比较两种阵列 × 两种固定波束：
- 阵列：会议室 6 麦线阵（间距 3.5 cm，孔径 17.5 cm，目标在正前方 = 线阵法向）；家居 4 麦方阵（边长 4.03 cm，对角 5.7 cm）。
- 波束：延迟求和（DS）；超指向（扩散噪声下的 MVDR，对角加载使白噪声增益 WNG ≥ −10 dB）。
输出：各频率的指向性指数 DI（dB，对扩散噪声的抑制）与 WNG（dB）；DS 在测向偏差 10° / 20° 时的目标损失（1–4 kHz 平均，dB）；
DS 对偏离目标 60° 的单个干扰的衰减（dB）。
不含混响、阵元误差与真实房间；只说明阵列孔径与方法的上限量级。
用法：python scripts/bf_directivity.py  →  out/bf_directivity.json
"""
import json, os
import numpy as np

C = 343.0
FREQS = [250, 500, 1000, 2000, 4000]
WNG_MIN_DB = -10.0


def arrays():
    lin = np.stack([(np.arange(6) - 2.5) * 0.035, np.zeros(6), np.zeros(6)], 1)       # 沿 x 轴，目标在 +y
    h = 0.057 / np.sqrt(2) / 2
    sq = np.array([[h, h, 0], [-h, h, 0], [-h, -h, 0], [h, -h, 0]])
    return {"会议室 6 麦线阵（孔径 17.5 cm）": (lin, 90.0), "家居 4 麦方阵（对角 5.7 cm）": (sq, 90.0)}


def steer(pos, az_deg, f):
    u = np.array([np.cos(np.deg2rad(az_deg)), np.sin(np.deg2rad(az_deg)), 0.0])
    return np.exp(2j * np.pi * f * (pos @ u) / C)            # 相对原点的相位（远场）


def diffuse(pos, f):
    d = np.linalg.norm(pos[:, None] - pos[None], axis=-1)
    return np.sinc(2 * f * d / C)                           # np.sinc(x) = sin(pi x)/(pi x)


def di_wng(w, a, G):
    num = np.abs(w.conj() @ a) ** 2
    return 10 * np.log10(num / np.real(w.conj() @ G @ w)), 10 * np.log10(num / np.real(w.conj() @ w))


def superdirective(a, G):
    for mu in np.logspace(-6, 2, 161):
        Gi = np.linalg.solve(G + mu * np.eye(len(a)), a)
        w = Gi / (a.conj() @ Gi)
        if di_wng(w, a, G)[1] >= WNG_MIN_DB:
            return w, mu
    return a / len(a), None


def main():
    res = {}
    for name, (pos, az0) in arrays().items():
        r = {"DS": {}, "超指向": {}}
        for f in FREQS:
            a, G = steer(pos, az0, f), diffuse(pos, f)
            w_ds = a / len(a)
            r["DS"][f] = dict(zip(["DI_dB", "WNG_dB"], [round(x, 2) for x in di_wng(w_ds, a, G)]))
            w_sd, mu = superdirective(a, G)
            r["超指向"][f] = dict(zip(["DI_dB", "WNG_dB"], [round(x, 2) for x in di_wng(w_sd, a, G)]), loading=mu)
        # DS：测向偏差的目标损失（1–4 kHz 平均）、对偏 60° 干扰的衰减
        fb = np.arange(1000, 4001, 125)
        loss = {}
        for e in (5, 10, 20):
            g = [np.abs((steer(pos, az0 + e, f) / len(pos)).conj() @ steer(pos, az0, f)) ** 2 for f in fb]
            loss[f"{e}°"] = round(float(-10 * np.log10(np.mean(g))), 2)
        r["DS_测向偏差损失_1to4kHz_dB"] = loss
        r["DS_偏60度干扰衰减_dB"] = {f: round(float(-10 * np.log10(np.abs((steer(pos, az0, f) / len(pos)).conj() @ steer(pos, az0 - 60, f)) ** 2 + 1e-12)), 1) for f in FREQS}
        res[name] = r
    out = {"setup": {"what": "固定波束指向性（理想自由场、远场、各向同性扩散噪声）", "freqs_hz": FREQS, "wng_min_db": WNG_MIN_DB, "c": C,
                     "note": "不含混响、阵元误差；目标方向为线阵法向 / 方阵任一轴向"}, "results": res}
    os.makedirs("out", exist_ok=True)
    json.dump(out, open("out/bf_directivity.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
