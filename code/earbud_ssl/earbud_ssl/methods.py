"""算法选型的候选方法（两耳组阵，4 麦，头部模板）与音视频融合。

所有方法输入 Y: (M,F,T) STFT；Hgrid: (G,M,F) 方向模板（含头部影响）；fmask: 选用的频点。
"""
import numpy as np
from itertools import combinations

PAIRS = list(combinations(range(4), 2))


def frame_energy_db(Y, fmask):
    return 10 * np.log10(np.mean(np.abs(Y[:, fmask]) ** 2, axis=(0, 1)) + 1e-12)


def onset_weights(e_db, floor_db, base=0.2):
    """起始段加权（与场景一 ssl_baseline 相同）：能量上升的帧以直达声为主，权重大。"""
    prev = np.r_[e_db[0], e_db[:-1]]
    w = base + np.clip(e_db - prev, 0.0, 10.0) / 10.0
    return np.where(e_db > floor_db, w, 0.0)


def floor_weights(e_db, floor_db):
    return (e_db > floor_db).astype(float)


def srp_phat(Y, Hgrid, fmask, w):
    """逐帧 PHAT 互谱按帧权重平均后，用模板扫描。返回 (G,) 谱。"""
    ws = w / max(w.sum(), 1e-12)
    out = 0.0
    for i, j in PAIRS:
        c = Y[i][fmask] * np.conj(Y[j][fmask])
        r = (c / (np.abs(c) + 1e-12)) @ ws
        st = Hgrid[:, i, fmask] * np.conj(Hgrid[:, j, fmask])
        st = st / (np.abs(st) + 1e-12)
        out = out + np.real(st.conj() @ r)
    return out / (len(PAIRS) * fmask.sum())


def covariance(Y, fmask, w):
    Z = Y[:, fmask]
    ws = w / max(w.sum(), 1e-12)
    return np.einsum("mft,nft,t->fmn", Z, Z.conj(), ws)


def music(Rs, Hgrid, fmask, Rb=None, loading=1e-2):
    """单声源（GEVD-）MUSIC，模板作导向向量。Rb 为背景协方差（None 时为普通 MUSIC）。
    各频点谱归一化到峰值 1 后对频点平均。"""
    M = Rs.shape[1]
    A = np.transpose(Hgrid[:, :, fmask], (2, 1, 0))  # (F,M,G)
    A = A / np.linalg.norm(A, axis=1, keepdims=True)
    if Rb is None:
        En = np.linalg.eigh(Rs)[1][:, :, :-1]
        Aw = A
    else:
        Rb = Rb + (loading * np.trace(Rb, axis1=1, axis2=2).real / M + 1e-12)[:, None, None] * np.eye(M)
        Li = np.linalg.inv(np.linalg.cholesky(Rb))
        Rw = Li @ Rs @ Li.conj().transpose(0, 2, 1)
        Rw = 0.5 * (Rw + Rw.conj().transpose(0, 2, 1))  # 去掉数值误差带来的非厄米部分，避免特征分解偶发不收敛
        En = np.linalg.eigh(Rw)[1][:, :, :-1]
        Aw = Li @ A
    num = np.sum(np.abs(Aw) ** 2, axis=1)
    den = np.sum(np.abs(En.conj().transpose(0, 2, 1) @ Aw) ** 2, axis=1)
    P = num / (den + 1e-12)
    return (P / P.max(axis=1, keepdims=True)).mean(0)


def peak(p, grid, refine_step=None):
    k = int(np.argmax(p))
    if refine_step is None:
        return float(grid[k])
    y0, y1, y2 = p[k - 1], p[k], p[(k + 1) % len(p)]
    den = y0 - 2 * y1 + y2
    d = 0.5 * (y0 - y2) / den if abs(den) > 1e-12 else 0.0
    return float((grid[k] + np.clip(d, -0.5, 0.5) * refine_step + 180) % 360 - 180)


def fuse_with_faces(p, grid, faces, lip_thr=0.5, gate_deg=8.0):
    """结果层融合（说话人固定）：在视野内"唇动分数高"的人脸中，选声学谱在其方位 ±gate 内最高的那个，
    输出该人脸的视觉方位；没有符合条件的人脸时退回声学峰值。
    faces: [(方位°, 唇动分数), ...]（视觉检测结果，已换到头部坐标）。"""
    best, best_v = None, -np.inf
    for az, lip in faces:
        if lip < lip_thr:
            continue
        d = np.abs((grid - az + 180) % 360 - 180)
        v = p[d <= gate_deg].max()
        if v > best_v:
            best, best_v = az, v
    return float(grid[np.argmax(p)]) if best is None else float(best)


def fuse_soft(p, grid, faces, lam=0.2, mu=0.1, gate_deg=8.0):
    """软融合：每张人脸得分 = 其方位 ±gate 内的声学谱最大值 + lam·(唇动分数 − 0.5)；
    声学峰值本身作为"无人脸"候选，得分 = 峰值 − mu。取得分最高者；选中人脸时输出视觉方位。
    p 需归一化到峰值约为 1（GEVD-MUSIC 谱满足）。"""
    k = int(np.argmax(p))
    best, best_s = float(grid[k]), float(p[k]) - mu
    for az, lip in faces:
        d = np.abs((grid - az + 180) % 360 - 180)
        s = float(p[d <= gate_deg].max()) + lam * (lip - 0.5)
        if s > best_s:
            best, best_s = float(az), s
    return best


def diffuse_coherence(H_diff, fmask):
    """扩散场空间协方差（各方向传递函数的平均外积），(F,M,M)，迹归一化为 M。"""
    Hd = H_diff[:, :, fmask]  # (K,M,F)
    G = np.einsum("kmf,knf->fmn", Hd, Hd.conj()) / Hd.shape[0]
    M = G.shape[1]
    return G * (M / np.trace(G, axis1=1, axis2=2).real)[:, None, None]


def rotate_background(Rb, Hgrid, grid, fmask, Gamma, delta_deg, n_dirs=3, min_sep=20.0):
    """IMU 补偿的背景协方差：从背景协方差估出 n_dirs 个干扰方向，逐频点拟合
    Rb ≈ Σ p_k a_k a_k^H + σ·Γ（Γ 为扩散场协方差），再把干扰方向按头部转角 delta 平移（声源不动、头转 delta，
    头部坐标下方位减 delta），重建转头后的背景协方差。"""
    A = np.transpose(Hgrid[:, :, fmask], (2, 1, 0))  # (F,M,G)
    A = A / np.linalg.norm(A, axis=1, keepdims=True)
    # 宽带波束功率谱找干扰方向
    P = np.real(np.einsum("fmg,fmn,fng->g", A.conj(), Rb, A))
    order = np.argsort(-P)
    dirs = []
    for k in order:
        if all(abs((grid[k] - grid[j] + 180) % 360 - 180) >= min_sep for j in dirs):
            dirs.append(int(k))
        if len(dirs) >= n_dirs:
            break
    step = grid[1] - grid[0]
    shift = int(round(delta_deg / step))
    new = [(j - shift) % len(grid) for j in dirs]
    F, M, _ = Rb.shape
    out = np.empty_like(Rb)
    for f in range(F):
        basis = [np.outer(A[f, :, j], A[f, :, j].conj()) for j in dirs] + [Gamma[f]]
        X = np.stack([b.reshape(-1) for b in basis], 1)
        X = np.concatenate([X.real, X.imag], 0)
        y = np.concatenate([Rb[f].reshape(-1).real, Rb[f].reshape(-1).imag])
        coef = np.clip(np.linalg.lstsq(X, y, rcond=None)[0], 0, None)
        R = coef[-1] * Gamma[f]
        for c, j in zip(coef[:-1], new):
            R = R + c * np.outer(A[f, :, j], A[f, :, j].conj())
        out[f] = R
    return out
