"""双耳仿真（STFT 域）：目标直达声 + 扩散混响尾 + 扩散噪声。

混响尾用"多方向、逐帧衰减的随机卷积传递函数"近似（判断：用于最小验证，非房间几何仿真）。
"""
import numpy as np
from scipy.signal import butter, sosfiltfilt

NFFT, HOP = 512, 256


def stft(x, nfft=NFFT, hop=HOP):
    """x: (..., n) -> (..., F, T)"""
    w = np.hanning(nfft + 1)[:-1]
    n = x.shape[-1]
    T = 1 + (n - nfft) // hop
    idx = np.arange(nfft)[None, :] + hop * np.arange(T)[:, None]
    frames = x[..., idx] * w
    return np.swapaxes(np.fft.rfft(frames, axis=-1), -1, -2)


def highpass(x, fs, fc=100.0):
    return sosfiltfilt(butter(4, fc, "highpass", fs=fs, output="sos"), x)


def ltas(x, fs):
    """长时平均功率谱（用于产生语音谱形噪声）。"""
    X = stft(x)
    return np.mean(np.abs(X) ** 2, axis=-1)


def simulate(src_stft, H_tgt, H_diff, rng, rt60=0.0, drr_db=np.inf, snr_db=np.inf, noise_psd=None):
    """src_stft: (F,T) 目标源；H_tgt: (M,F) 目标方向传递函数；H_diff: (K,M,F) 扩散方向。
    返回 (M,F,T) 麦克风 STFT。SNR 按"目标（含混响）/ 噪声"在各麦平均功率定义。"""
    F, T = src_stft.shape
    K, M, _ = H_diff.shape
    direct = H_tgt[:, :, None] * src_stft[None]
    y = direct.copy()
    if rt60 > 0 and np.isfinite(drr_db):
        L = int(np.ceil(rt60 * 16000 / HOP))
        lags = np.arange(L)
        amp = 10 ** (-3 * lags * HOP / (rt60 * 16000))  # 能量 T60 内衰减 60 dB
        tail = np.zeros((M, F, T), complex)
        for k in range(K):
            c = (rng.standard_normal((L, F)) + 1j * rng.standard_normal((L, F))) * amp[:, None]
            r = np.zeros((F, T), complex)
            for l in range(L):
                r[:, l:] += c[l][:, None] * src_stft[:, : T - l]
            tail += H_diff[k][:, :, None] * r[None]
        p_d = np.mean(np.abs(direct) ** 2)
        p_t = np.mean(np.abs(tail) ** 2)
        y = y + tail * np.sqrt(p_d / p_t * 10 ** (-drr_db / 10))
    if np.isfinite(snr_db):
        psd = np.ones(F) if noise_psd is None else noise_psd
        noise = np.zeros((M, F, T), complex)
        for k in range(K):
            n = (rng.standard_normal((F, T)) + 1j * rng.standard_normal((F, T))) * np.sqrt(psd)[:, None]
            noise += H_diff[k][:, :, None] * n[None]
        p_s = np.mean(np.abs(y) ** 2)
        p_n = np.mean(np.abs(noise) ** 2)
        y = y + noise * np.sqrt(p_s / p_n * 10 ** (-snr_db / 10))
    return y


def apply_sync_error(Y, freqs, ear_mics, delay_s):
    """给一侧耳机的麦克风加未知的采样时间偏差（两耳不同步）。"""
    Y = Y.copy()
    Y[ear_mics] *= np.exp(-2j * np.pi * freqs * delay_s)[None, :, None]
    return Y


def render_source(src_stft, H, H_diff, rng, rt60=0.0, drr_db=np.inf):
    """单个声源在各麦的 STFT：直达声 + 扩散混响尾（混响尾能量按 DRR 相对直达声设定）。
    src_stft: (F,T)；H: (M,F)；H_diff: (K,M,F)。返回 (M,F,T)。"""
    F, T = src_stft.shape
    direct = H[:, :, None] * src_stft[None]
    if not (rt60 > 0 and np.isfinite(drr_db)):
        return direct
    K, M, _ = H_diff.shape
    L = int(np.ceil(rt60 * 16000 / HOP))
    amp = 10 ** (-3 * np.arange(L) * HOP / (rt60 * 16000))
    tail = np.zeros((M, F, T), complex)
    for k in range(K):
        c = (rng.standard_normal((L, F)) + 1j * rng.standard_normal((L, F))) * amp[:, None]
        r = np.zeros((F, T), complex)
        for l in range(L):
            r[:, l:] += c[l][:, None] * src_stft[:, : T - l]
        tail += H_diff[k][:, :, None] * r[None]
    act = np.abs(src_stft).sum(0) > 0
    p_d = np.mean(np.abs(direct[:, :, act]) ** 2)
    p_t = np.mean(np.abs(tail[:, :, act]) ** 2)
    return direct + tail * np.sqrt(p_d / p_t * 10 ** (-drr_db / 10))


def diffuse_noise(H_diff, T, rng, psd):
    K, M, F = H_diff.shape
    noise = np.zeros((M, F, T), complex)
    for k in range(K):
        n = (rng.standard_normal((F, T)) + 1j * rng.standard_normal((F, T))) * np.sqrt(psd)[:, None]
        noise += H_diff[k][:, :, None] * n[None]
    return noise


def diffuse_tail(src_stft, H_diff, rng, rt60, min_lag=2):
    """只含后期部分（≥ min_lag 帧）的扩散混响尾，未定标。"""
    F, T = src_stft.shape
    K, M, _ = H_diff.shape
    L = int(np.ceil(rt60 * 16000 / HOP))
    amp = 10 ** (-3 * np.arange(L) * HOP / (rt60 * 16000))
    tail = np.zeros((M, F, T), complex)
    for k in range(K):
        c = (rng.standard_normal((L, F)) + 1j * rng.standard_normal((L, F))) * amp[:, None]
        r = np.zeros((F, T), complex)
        for l in range(min_lag, L):
            r[:, l:] += c[l][:, None] * src_stft[:, : T - l]
        tail += H_diff[k][:, :, None] * r[None]
    return tail
