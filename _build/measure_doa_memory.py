"""复核当前基线的导向表容量；仅统计 ndarray.nbytes，不代表总运行内存。

运行：python _build/measure_doa_memory.py
配置：教学仿真 square4、16 kHz、nfft=512、300–4000 Hz。
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'code' / 'ssl_baseline'))
from ssl_baseline.geometry import PRESETS
from ssl_baseline.doa import SRPPHAT, SRPConfig
from ssl_baseline.wake import WakeDOA, WakeDOAConfig


def measure():
    rows = []
    for step in (1, 5, 10):
        srp = SRPPHAT(PRESETS['square4'], 16000, cfg=SRPConfig(grid_step=step))
        wake = WakeDOA(PRESETS['square4'], 16000, WakeDOAConfig(srp=SRPConfig(grid_step=step)))
        srp_bytes = sum(a.nbytes for a in srp.steer)
        wake_srp_bytes = sum(a.nbytes for a in wake.srp.steer)
        rows.append(dict(grid_step=step, frequencies=int(srp.band.sum()), directions=len(srp.grid),
                         dtype=str(srp.steer[0].dtype), srp_bytes=srp_bytes,
                         complex64_estimate_bytes=srp_bytes // 2,
                         music_A_bytes=wake.A.nbytes,
                         wake_steering_total_bytes=wake_srp_bytes + wake.A.nbytes))
    return rows


if __name__ == '__main__':
    print(json.dumps({'unit': 'bytes', 'scope': 'steering arrays only; excludes all other memory',
                      'measurements': measure()}, ensure_ascii=False, indent=2))
