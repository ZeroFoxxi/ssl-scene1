# -*- coding: utf-8 -*-
"""换人测向小网络（端侧小模型的第一版）：输入 1.5 s 多通道片段（新发言人开口前 1.0 s + 开口后 0.5 s），输出新发言人方位。

特征（每帧、每频点，频率 31–4000 Hz，即 512 点 FFT 的第 1–128 个频点）：
  - 相位差：各麦克风相对参考麦（第 0 路）的 cos、sin，共 2 × (M-1) 个通道；
  - 参考麦对数能量（每个样本减去均值），1 个通道；帮助网络看出开口时刻。
输出：前方 [-90°, 90°] 每 2° 一类（91 类）；训练用高斯平滑标签（σ = 4°），推断取峰值并做抛物线插值。
结构（CRNN，约 27 万参数）：3 个卷积块（频率方向逐级池化）→ 每帧线性映射 → 双向 GRU → 注意力时间池化 → 全连接。
"""
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
except ImportError:
    torch = None

FS = 16000
NFFT, HOP = 512, 256
F_LO, F_HI = 1, 129                     # 频点 1–128（31–4000 Hz）
AZ_GRID = np.arange(-90.0, 90.0 + 1e-9, 2.0)


def features(x: np.ndarray) -> np.ndarray:
    """x: M x N（float）→ (2(M-1)+1) x 128 x T 特征（float32）。"""
    M, N = x.shape
    win = np.hanning(NFFT + 1)[:-1]
    T = 1 + (N - NFFT) // HOP
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(T)[:, None]
    X = np.fft.rfft(x[:, idx] * win, axis=-1)[:, :, F_LO:F_HI]            # M x T x 128
    ref = X[0]
    cross = X[1:] * np.conj(ref)[None]                                     # (M-1) x T x 128
    ph = cross / (np.abs(cross) + 1e-8)
    logp = np.log(np.abs(ref) ** 2 + 1e-10)
    logp = (logp - logp.mean()) / (logp.std() + 1e-6)
    feat = np.concatenate([ph.real, ph.imag, logp[None]], 0)               # C x T x 128
    return feat.transpose(0, 2, 1).astype(np.float32)                     # C x 128 x T


def soft_label(az_deg: np.ndarray, sigma: float = 4.0) -> np.ndarray:
    d = AZ_GRID[None, :] - np.asarray(az_deg)[:, None]
    p = np.exp(-0.5 * (d / sigma) ** 2)
    return (p / p.sum(1, keepdims=True)).astype(np.float32)


def decode(logits: np.ndarray) -> np.ndarray:
    """logits: B x 91 → 方位（°），峰值抛物线插值。"""
    k = logits.argmax(1)
    out = AZ_GRID[k].astype(float)
    for i, kk in enumerate(k):
        if 0 < kk < len(AZ_GRID) - 1:
            y0, y1, y2 = logits[i, kk - 1], logits[i, kk], logits[i, kk + 1]
            den = y0 - 2 * y1 + y2
            if abs(den) > 1e-9:
                out[i] += np.clip(0.5 * (y0 - y2) / den, -0.5, 0.5) * 2.0
    return out


if torch is not None:
    class CRNN(nn.Module):
        def __init__(self, in_ch: int = 11, n_out: int = len(AZ_GRID), ch=(32, 64, 64), d_frame: int = 128, d_rnn: int = 64):
            super().__init__()
            layers, c0 = [], in_ch
            for c in ch:
                layers += [nn.Conv2d(c0, c, 3, padding=1), nn.BatchNorm2d(c), nn.ReLU(), nn.MaxPool2d((2, 1))]
                c0 = c
            self.conv = nn.Sequential(*layers)
            self.proj = nn.Linear(ch[-1] * (128 // 2 ** len(ch)), d_frame)
            self.rnn = nn.GRU(d_frame, d_rnn, batch_first=True, bidirectional=True)
            self.att = nn.Linear(2 * d_rnn, 1)
            self.out = nn.Linear(2 * d_rnn, n_out)

        def forward(self, x):                                   # x: B x C x 128 x T
            h = self.conv(x)                                    # B x c x 16 x T
            B, c, f, T = h.shape
            h = F.relu(self.proj(h.permute(0, 3, 1, 2).reshape(B, T, c * f)))
            h, _ = self.rnn(h)                                  # B x T x 2d
            w = torch.softmax(self.att(h), dim=1)
            return self.out((w * h).sum(1))                     # B x 91

    def count_macs(model, in_ch=11, T=94):
        """前向一次的乘加次数（卷积、线性层、GRU），用于和端侧算力对比。"""
        macs, f, c0 = 0, 128, in_ch
        for m in model.conv:
            if isinstance(m, nn.Conv2d):
                macs += c0 * m.out_channels * 9 * f * T; c0 = m.out_channels
            if isinstance(m, nn.MaxPool2d):
                f //= 2
        macs += model.proj.in_features * model.proj.out_features * T
        g = model.rnn
        macs += 2 * 3 * (g.input_size * g.hidden_size + g.hidden_size * g.hidden_size) * T
        macs += model.att.in_features * T + model.out.in_features * model.out.out_features
        return int(macs)
