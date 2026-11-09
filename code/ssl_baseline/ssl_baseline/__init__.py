# -*- coding: utf-8 -*-
"""场景一（摄像头声源定位与持续跟踪）基线 B0：SRP-PHAT + 两级触发 + 圆周卡尔曼 + 云台状态机。"""
from .geometry import PRESETS, ring_array, aliasing_frequency
from .doa import SRPPHAT, SRPConfig, stft, gcc_phat
from .trigger import EnergyFluxTrigger
from .tracker import CircularKalman, TrackerConfig, wrap180
from .ptz import PTZController, PTZConfig, State
from .metrics import angdiff, doa_metrics, track_metrics, in_view_ratio, first_in_view_time

__version__ = "0.1.0"
