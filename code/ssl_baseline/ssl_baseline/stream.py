# -*- coding: utf-8 -*-
"""流式转向：每次送入 0.1 s 多通道音频，输出摄像头朝向与转向命令。

逻辑与 scripts/run_meeting_closed_loop.py 的 closed_loop（离线评测用的版本）逐块相同（tests 里有一致性检验）：
  1. 有声：300–4000 Hz 带内能量高于过去 5 s 最低块能量 8 dB；
  2. 触发：a. 静音 ≥0.4 s 后有声；b. 最近 0.3 s 的 SRP-PHAT 粗估方位连续 3 块偏离当前朝向 >15° 且彼此相差 ≤10°（起点取 0.4 s 前）；
  3. 起点后 0.5 s 测向（粗转），1.0 s 再测（微调）；置信度低于门限、与触发方向不一致、微调超出 ±20° 时不转；
  4. 设备自己的喇叭在播放时（far 参考信号）不转（远端冻结）。
测向器 est 与粗估器 srp_est 需提供 localize(x, start, end) → .az（及可选 .conf），与离线评测用的对象相同。
唯一差别：可选的信噪比门限（snr_th，评估后未采用）在离线版里取下一块的噪声底（多看 0.1 s），流式版取当前块，严格因果；不用该门限时两者逐块相同。
只保留最近 buf_s 秒的音频；测向用到的最长回看约 2.1 s（小网络：开口前 1.0 s + 微调时刻），GEVD-MUSIC 另需背景段，默认 8 s 足够。

用法：
    st = StreamingTurner(est, srp_est, conf_th=0.7)
    for block in blocks:                  # block: (n_mic, 1600)
        ev = st.push(block)               # ev: {"t", "pan", "cmd"（本块发出的转向命令 (t, az) 或 None）, "decisions"（本块的测向结果）}
"""
import numpy as np
import scipy.signal as sps

from . import metrics


class StreamingTurner:
    def __init__(self, est, srp_est, fs: int = 16000, dt: float = 0.1, conf_th: float = 0.0, freeze: bool = True,
                 pan_speed: float = 120.0, buf_s: float = 8.0, snr_th: float = None):
        self.est, self.srp_est, self.fs, self.dt = est, srp_est, fs, dt
        self.conf_th, self.freeze, self.pan_speed, self.snr_th = conf_th, freeze, pan_speed, snr_th
        self.bs = int(round(dt * fs))
        self.b_, self.a_ = sps.butter(4, [300 / (fs / 2), 4000 / (fs / 2)], "band")
        self.zi = None; self.zi_far = None
        self.buf = None; self.off = 0                                       # buf[:, 0] 对应的绝对样点号
        self.buf_n = int(buf_s * fs)
        self.e_db, self.floor, self.active, self.far_on, self.srp_raw = [], [], [], [], []
        self.pan, self.target = 0.0, 0.0
        self.pending, self.busy_until, self.run, self.hint, self.coarse = [], -1.0, [], None, None
        self.cmds = []

    # ---------- 内部 ----------
    def _band_db(self, x, far=False):
        zi = self.zi_far if far else self.zi
        if zi is None:
            zi = np.zeros((x.shape[0], max(len(self.a_), len(self.b_)) - 1))
        y, zi = sps.lfilter(self.b_, self.a_, x, axis=-1, zi=zi)
        if far: self.zi_far = zi
        else: self.zi = zi
        return float(10 * np.log10(np.mean(y ** 2) + 1e-12))

    def _loc(self, est, start, end):
        return est.localize(self.buf, start - self.off, end - self.off)

    # ---------- 接口 ----------
    def push(self, x: np.ndarray, far: np.ndarray = None) -> dict:
        assert x.shape[1] == self.bs, f"每块应为 {self.bs} 个样点"
        self.buf = x.copy() if self.buf is None else np.concatenate([self.buf, x], axis=1)
        if self.buf.shape[1] > self.buf_n:
            cut = self.buf.shape[1] - self.buf_n; self.buf = self.buf[:, cut:]; self.off += cut
        b = len(self.e_db); dt, FS = self.dt, self.fs
        t = (b + 1) * dt
        e = self._band_db(x); self.e_db.append(e)
        far_db = self._band_db((np.zeros((1, self.bs)) if far is None else np.atleast_2d(far)), far=True)
        self.floor.append(min(self.e_db[max(0, b - 50): b + 1]))
        self.active.append(e > self.floor[b] + 8)
        self.far_on.append(far_db > -50.0)
        self.srp_raw.append(self._loc(self.srp_est, max(0, int((t - 0.3) * FS)), int(t * FS)).az if t >= 0.35 else 0.0)
        active, far_on, srp_raw = self.active, self.far_on, self.srp_raw
        cmd, decs = None, []
        # 触发
        if t >= self.busy_until and active[b]:
            t0, z = None, None
            if b >= 5 and not any(active[b - 5:b - 1]) and not active[b - 1]:
                t0 = t - dt                                                 # a. 静音后起始
            if t0 is None and b >= 2:
                last = srp_raw[b - 2:b + 1]
                if all(metrics.angdiff(q, self.target) > 15 for q in last) and \
                        max(metrics.angdiff(last[i], last[j]) for i in range(3) for j in range(i + 1, 3)) <= 10 and all(active[b - 2:b + 1]):
                    t0 = t - 0.4                                            # b. 方向变化
                    z = float(np.median(last))
            if t0 is not None:
                if self.freeze and any(far_on[max(0, int(t0 / dt)): b + 1]):
                    self.busy_until = t + 0.3
                else:
                    self.pending = [t0 + 0.5, t0 + 1.0]; self.busy_until = t0 + 1.0; self.run.append(t0); self.hint = z; self.coarse = None
        # 判决（粗转、微调）
        while self.pending and t >= self.pending[0] - 1e-9:
            te = self.pending.pop(0); t0 = self.run[-1]
            if self.freeze and any(far_on[max(0, int(t0 / dt)): b + 1]):
                continue
            res = self._loc(self.est, int(t0 * FS), int(te * FS)); az = res.az
            rec = {"t": t, "az": float(az), "conf": float(getattr(res, "conf", np.nan))}
            decs.append(rec)
            if getattr(res, "conf", 1.0) < self.conf_th:
                rec["out"] = "置信度低"; continue
            if self.snr_th is not None:
                b0, b1 = int(round(t0 / dt)), int(round(t / dt))
                if b1 > b0 and np.mean(self.e_db[b0:b1]) - self.floor[min(b1, b)] < self.snr_th:
                    rec["out"] = "信噪比低"; continue
            if self.hint is not None and metrics.angdiff(az, self.hint) > 20:
                rec["out"] = "与触发方向不一致"; continue
            if not self.pending:
                if self.coarse is not None and metrics.angdiff(az, self.coarse) > 20:
                    rec["out"] = "微调超出范围"; continue
            else:
                self.coarse = az
            if metrics.angdiff(az, self.target) > 8:
                self.target = az; cmd = (t, az); self.cmds.append(cmd); rec["out"] = "转动"
            else:
                rec["out"] = "已对准"
        # 云台运动
        err = (self.target - self.pan + 180) % 360 - 180
        self.pan = (self.pan + np.clip(err, -self.pan_speed * dt, self.pan_speed * dt)) % 360
        return {"t": t, "pan": float(self.pan), "cmd": cmd, "decisions": decs}
