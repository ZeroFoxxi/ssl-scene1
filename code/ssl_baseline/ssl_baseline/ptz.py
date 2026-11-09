# -*- coding: utf-8 -*-
"""云台控制状态机：待机 → 触发确认 → 转向（测向冻结）→ 视觉确认 → 跟踪 → 静音保持。

设计要点（见调研 PPT“持续跟踪”页与竞品 Echo Show 10 的分区设计）：
- 只有跟踪器起始（连续 N 块一致）才转，抑制瞬态误触发；
- 转动期间电机噪声大，冻结声学观测，只做预测；
- 目标在画面中央死区内不转，避免抖动；
- 长时间固定方向、且视觉始终无人形的声源，记入干扰方向表（如电视）。
"""
from dataclasses import dataclass, field
from enum import Enum
import numpy as np

from .tracker import CircularKalman, TrackerConfig, wrap180


class State(Enum):
    IDLE = "待机"
    SLEW = "转向"
    VISUAL = "视觉确认"
    TRACK = "跟踪"
    HOLD = "静音保持"


@dataclass
class PTZConfig:
    hfov: float = 90.0             # 水平视场角（°）
    pan_speed: float = 120.0       # 云台最大角速度（°/s）
    dead_zone: float = 15.0        # 死区半宽（°）：目标偏离画面中心小于此值不转
    settle_deg: float = 2.0        # 到位判定（°）
    visual_timeout: float = 1.5    # 转到位后等待视觉确认的时间（s）
    min_conf: float = 0.2          # 声学观测最低置信度（归一化 SRP 峰值，即空间相干度）
    interf_bin: float = 10.0       # 干扰方向表分辨率（°）
    interf_seconds: float = 20.0   # 某方向累计这么久“有声无人”即记为干扰方向


@dataclass
class PTZController:
    cfg: PTZConfig = field(default_factory=PTZConfig)
    tcfg: TrackerConfig = field(default_factory=TrackerConfig)
    pan: float = 0.0

    def __post_init__(self):
        self.trk = CircularKalman(self.tcfg)
        self.state = State.IDLE
        self.target = None
        self.timer = 0.0
        nb = int(360 / self.cfg.interf_bin)
        self.no_person_time = np.zeros(nb)
        self.interf = np.zeros(nb, dtype=bool)
        self.log = []

    # ---------------- 工具 ----------------
    def in_fov(self, az, margin=0.0):
        return abs(float(wrap180(az - self.pan))) <= self.cfg.hfov / 2 - margin

    def _bin(self, az):
        return int((az % 360.0) // self.cfg.interf_bin)

    @property
    def motor_on(self):
        return self.state == State.SLEW or (self.target is not None and abs(float(wrap180(self.target - self.pan))) > self.cfg.settle_deg)

    def _move(self, dt):
        if self.target is None:
            return
        err = float(wrap180(self.target - self.pan))
        step = np.clip(err, -self.cfg.pan_speed * dt, self.cfg.pan_speed * dt)
        self.pan = (self.pan + step) % 360.0

    # ---------------- 主循环 ----------------
    def step(self, dt, audio_active, audio_az, audio_conf, person_az=None):
        """每块调用一次。
        audio_active: L0 触发结果；audio_az/audio_conf: 本块 SRP 峰值；person_az: 视觉检测到的人的方位（世界坐标），无则 None。
        返回本块的云台方位与状态。"""
        motor = self.motor_on
        self.trk.predict()
        # 声学观测：电机转动期间冻结；干扰方向表中的方向忽略
        if audio_active and not motor and audio_conf >= self.cfg.min_conf and not self.interf[self._bin(audio_az)]:
            self.trk.update(audio_az)
        # 视觉观测：只在画面内有效，观测噪声小
        if person_az is not None and self.trk.active:
            self.trk.update(person_az, r=self.tcfg.r_vision)
        # 干扰方向表：跟踪器锁定的目标位于画面内，却长时间看不到人 → 判为电视 / 音箱等干扰
        nbin = len(self.interf)
        if person_az is not None:  # 看到真人：解除该方向的屏蔽
            b = self._bin(person_az); self.no_person_time[b] = 0.0
            self.interf[[(b - 1) % nbin, b, (b + 1) % nbin]] = False
        elif self.trk.active and not motor and self.in_fov(self.trk.az) and self.state in (State.VISUAL, State.HOLD):
            b = self._bin(self.trk.az); self.no_person_time[b] += dt
            if self.no_person_time[b] > self.cfg.interf_seconds:
                self.interf[[(b - 1) % nbin, b, (b + 1) % nbin]] = True  # 屏蔽 ±1 个分辨单元
                self.trk.reset(); self.state = State.IDLE; self.target = None

        s = self.state
        if s == State.IDLE:
            if self.trk.active:
                if self.in_fov(self.trk.az, margin=self.cfg.hfov / 2 - self.cfg.dead_zone):
                    self.state = State.VISUAL; self.timer = 0.0
                else:
                    self.target = self.trk.az; self.state = State.SLEW
        elif s == State.SLEW:
            if self.trk.active:
                self.target = self.trk.az
            if self.target is not None and abs(float(wrap180(self.target - self.pan))) <= self.cfg.settle_deg:
                self.state = State.VISUAL; self.timer = 0.0
        elif s == State.VISUAL:
            self.timer += dt
            if person_az is not None:
                self.state = State.TRACK
            elif self.timer > self.cfg.visual_timeout:
                self.state = State.IDLE if not self.trk.active else State.HOLD
        elif s in (State.TRACK, State.HOLD):
            if not self.trk.active:
                self.state = State.IDLE; self.target = None
            else:
                off = float(wrap180(self.trk.az - self.pan))
                if abs(off) > self.cfg.dead_zone:
                    self.target = self.trk.az           # 超出死区，重新居中
                elif self.target is not None and abs(float(wrap180(self.target - self.pan))) <= self.cfg.settle_deg:
                    self.target = None
                self.state = State.TRACK if person_az is not None else State.HOLD
        self._move(dt)
        self.log.append({"pan": self.pan, "state": self.state.value, "trk": self.trk.az, "motor": motor})
        return self.pan, self.state
