# -*- coding: utf-8 -*-
"""换人测向（会议室）：检测到新发言人开口后，用开口后一小段语音给出方位，背景协方差按情况自适应选择。

为什么要自适应（见 scripts/run_meeting_eval.py 的仿真）：
- GEVD-MUSIC 用"开口前的背景段"白化，能压掉持续存在的干扰（抢话中的上一位发言人、远端扬声器、空调）；
- 但普通换人时，开口前的背景段里是上一位发言人，他在新发言人开口时已经停了，白化掉他反而损伤新发言人的方位，
  小孔径阵列上尤其明显。

做法：
1. 判断开口前干扰是否仍在：开口前 pre 秒的带内电平，既高于噪声底 act_db（噪声底由 set_noise 给出；未设置时只看第二条），
   又不低于开口后语音电平 rel_db 以上，
   判为"干扰仍在"（抢话、远端扬声器）；否则判为"开口前已安静"（上一位已说完，只剩尾音和底噪）。
2. 干扰仍在：背景取开口前 short 秒（紧贴开口，间隔 gap 秒）→ GEVD-MUSIC；
   开口前已安静：背景取长期噪声协方差（set_noise 估计；未设置时按白噪声处理，即普通 MUSIC）→ GEVD-MUSIC。

用法：
    loc = TurnDOA(mic_xy, fs)
    loc.set_noise(x_noise)                 # 可选：无人说话时段的多通道录音（空调、风扇等底噪）
    res = loc.localize(x, start, end)      # start：开口样点（语音活动检测 / 换人检测给出）；end：判决时刻
    res.az, res.conf, res.mode             # mode: "interf"（干扰仍在）或 "quiet"（开口前已安静）
"""
from dataclasses import dataclass, field
from typing import Optional, Tuple
import numpy as np

from .doa import SRPPHAT, SRPConfig, stft
from .wake import WakeDOA, WakeDOAConfig, _circular_peaks, _refine


@dataclass
class TurnDOAConfig:
    nfft: int = 512
    hop: int = 256
    pad_pre: float = 0.10      # 开口点前多取（s），容忍检测偏晚
    hist: float = 1.0          # 判断用的开口前历史长度（s）
    pre: float = 0.15          # 判断"干扰是否仍在"所看的开口前时长（s）
    act_db: float = 6.0        # 高于噪声底多少 dB 才算有声
    rel_db: float = 10.0       # 不低于开口后语音电平多少 dB 才算"干扰仍在"（尾音一般低于此）
    short: float = 0.5         # 干扰仍在时，背景段长度（s）
    gap: float = 0.05          # 背景段终点距片段起点（含 pad_pre）的间隔（s）
    loading: float = 1e-2
    frame_floor_db: float = -30.0
    exclude: Tuple[Tuple[float, float], ...] = ()
    srp: SRPConfig = field(default_factory=SRPConfig)


@dataclass
class TurnDOAResult:
    az: float
    conf: float          # 空间谱峰值（GEVD-MUSIC 各频点归一化后平均，(0, 1]）
    mode: str            # "interf" | "quiet"
    pre_db: float        # 开口前 pre 秒的电平（dB）
    seg_db: float        # 开口后语音电平（dB）
    floor_db: float      # 噪声底（dB）


class TurnDOA:
    def __init__(self, mic_xy: np.ndarray, fs: int, cfg: TurnDOAConfig = None):
        self.cfg = cfg or TurnDOAConfig()
        c = self.cfg
        self.fs = fs
        self.core = WakeDOA(mic_xy, fs, WakeDOAConfig(nfft=c.nfft, hop=c.hop, loading=c.loading,
                                                      frame_floor_db=c.frame_floor_db, exclude=c.exclude, srp=c.srp))
        self.Rn: Optional[np.ndarray] = None
        self.noise_db: Optional[float] = None

    def _stft_band(self, x):
        _, Z = stft(x, self.fs, self.cfg.nfft, self.cfg.hop)
        return Z[:, self.core.srp.band, :]

    @staticmethod
    def _db(Z):
        return 10 * np.log10(np.mean(np.abs(Z) ** 2, axis=(0, 1)) + 1e-12)

    def set_noise(self, x_noise: np.ndarray):
        """用无人说话时段的录音估计长期噪声协方差与噪声底。实际设备中由语音活动检测挑出的静音帧慢速更新。"""
        Z = self._stft_band(np.asarray(x_noise, float))
        self.Rn = WakeDOA._cov(Z, np.ones(Z.shape[2]))
        self.noise_db = float(10 * np.log10(np.mean(np.abs(Z) ** 2) + 1e-12))

    def localize(self, x: np.ndarray, start: int, end: int) -> TurnDOAResult:
        c, fs = self.cfg, self.fs
        x = np.asarray(x, float)
        s0 = max(0, int(start - c.pad_pre * fs)); s1 = min(x.shape[1], int(end))
        if s1 - s0 < c.nfft:
            raise ValueError("片段太短")
        Zs = self._stft_band(x[:, s0:s1]); es = self._db(Zs)
        w = SRPPHAT.onset_weights(es, floor_db=es.max() + c.frame_floor_db)
        Rs = WakeDOA._cov(Zs, w)
        seg_db = float(10 * np.log10(np.mean(10 ** (es[w > 0] / 10)) + 1e-12))

        h0 = max(0, int(s0 - c.hist * fs))
        Zh = self._stft_band(x[:, h0:s0]) if s0 - h0 >= c.nfft else None
        if Zh is None or Zh.shape[2] == 0:
            mode, pre_db, floor_db, Rb = "quiet", float("nan"), float("nan"), self.Rn
        else:
            eh = self._db(Zh)
            # 未设置噪声时不做"高于噪声底"判断：开口前的持续干扰会被当成噪声底
            floor_db = self.noise_db if self.noise_db is not None else -np.inf
            npre = max(1, int(round(c.pre * fs / c.hop)))
            pre_db = float(10 * np.log10(np.mean(10 ** (eh[-npre:] / 10))))
            active = pre_db > floor_db + c.act_db and pre_db > seg_db - c.rel_db
            if active:
                ngap = int(round(c.gap * fs / c.hop)); nb = max(2, int(round(c.short * fs / c.hop)))
                Zb = Zh[..., max(0, Zh.shape[2] - ngap - nb): Zh.shape[2] - ngap if ngap else None]
                mode, Rb = "interf", WakeDOA._cov(Zb, np.ones(Zb.shape[2]))
            else:
                mode, Rb = "quiet", self.Rn
        p = self.core._gevd_music(Rs, Rb)
        g = self.core.srp.grid
        ks = _circular_peaks(p, g, 1, 25.0, self.core.valid) or [int(np.argmax(np.where(self.core.valid, p, -np.inf)))]
        return TurnDOAResult(az=_refine(p, ks[0], c.srp.grid_step, g), conf=float(np.clip(p[ks[0]], 0, 1)),
                             mode=mode, pre_db=pre_db, seg_db=seg_db, floor_db=floor_db)
