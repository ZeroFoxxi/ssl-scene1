"""测向：基于传递函数模板的 SRP-PHAT（路线 A：两耳组阵）与只传参数的组合（路线 B）。"""
import numpy as np
from itertools import combinations

L_PAIR, R_PAIR = (0, 1), (2, 3)
ALL_PAIRS = list(combinations(range(4), 2))


def phat_cross(Y, pairs, fmask):
    """Y: (M,F,T) -> {pair: (Fsel,) 帧平均的 PHAT 互谱}"""
    out = {}
    for i, j in pairs:
        c = Y[i][fmask] * np.conj(Y[j][fmask])
        out[(i, j)] = np.mean(c / (np.abs(c) + 1e-12), axis=1)
    return out


def srp(cross, Hgrid, fmask):
    """Hgrid: (G,M,F) 模板。返回 (G,) 按频点数归一化的 SRP（每对取值约在 [-1,1]）。"""
    s = 0.0
    for (i, j), r in cross.items():
        st = Hgrid[:, i, fmask] * np.conj(Hgrid[:, j, fmask])
        st = st / (np.abs(st) + 1e-12)
        s = s + np.real(st.conj() @ r) / fmask.sum()
    return s / len(cross)


def band_energy(Y, ear_mics, bands_idx):
    """一只耳机在各频带的能量（两麦平均），这是路线 B 里两耳之间交换的参数之一。"""
    P = np.mean(np.abs(Y[list(ear_mics)]) ** 2, axis=(0, 2))
    return np.array([P[b].sum() for b in bands_idx])


def ild_model(Hgrid, bands_idx):
    PL = np.mean(np.abs(Hgrid[:, list(L_PAIR)]) ** 2, axis=1)
    PR = np.mean(np.abs(Hgrid[:, list(R_PAIR)]) ** 2, axis=1)
    return np.stack([10 * np.log10(PL[:, b].sum(1) / PR[:, b].sum(1)) for b in bands_idx], 1)  # (G,B)


def estimate_all(Y, Hgrid, Hgrid_ff, fmask, bands_idx, ild_tab, grid_deg, beta=3.0, sigma_db=3.0):
    """返回各方法的方位估计（度）。"""
    cross_all = phat_cross(Y, ALL_PAIRS, fmask)
    cross_L = {L_PAIR: cross_all[L_PAIR]}
    cross_R = {R_PAIR: cross_all[R_PAIR]}
    s_A = srp(cross_all, Hgrid, fmask)
    s_ff = srp(cross_all, Hgrid_ff, fmask)
    s_L = srp(cross_L, Hgrid, fmask)
    s_R = srp(cross_R, Hgrid, fmask)
    eL = band_energy(Y, L_PAIR, bands_idx)
    eR = band_energy(Y, R_PAIR, bands_idx)
    ild = 10 * np.log10(eL / eR)
    pen = np.mean((ild[None] - ild_tab) ** 2, axis=1) / (2 * sigma_db ** 2)
    scores = {
        "A_双耳组阵": s_A,
        "A_忽略头部模板": s_ff,
        "仅本地两对": (s_L + s_R) / 2,
        "仅耳间电平差": -pen,
        "B_只传参数": beta * (s_L + s_R) / 2 - pen,
    }
    return {k: float(grid_deg[np.argmax(v)]) for k, v in scores.items()}
