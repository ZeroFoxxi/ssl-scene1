# -*- coding: utf-8 -*-
"""初步仿真：2/3/4 麦同孔径阵列的 SRP-PHAT 测向 + 移动声源跟踪示意。
pyroomacoustics 镜像源法生成房间响应；语音为 Windows TTS 合成的中文语音。"""
import json, os, sys, time
import numpy as np
import scipy.io.wavfile as wavfile
import scipy.signal as sps
import pyroomacoustics as pra

rng = np.random.default_rng(2026)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out"); os.makedirs(OUT, exist_ok=True)
FS = 16000; C = 343.0; NFFT = 512; HOP = 256
FMIN, FMAX = 300.0, 4000.0
R = 0.0283  # 阵列半径（孔径约 5.7 cm）

fs_, speech = wavfile.read(os.path.join(HERE, "speech_zh.wav"))
speech = speech.astype(np.float64) / 32768.0
# 去直流 / 低频：TTS 带直流偏置，经混响房间（RIR 直流增益很大）后会虚高总功率，使按总功率设定的噪声偏大
_b, _a = sps.butter(4, 100.0 / (FS / 2), "high"); speech = sps.filtfilt(_b, _a, speech)
assert fs_ == FS

def ring(angles_deg):
    a = np.deg2rad(angles_deg)
    return np.stack([R * np.cos(a), R * np.sin(a)], 0)  # 2 x M

ARR = {
    "2麦线阵": ring([0, 180]),
    "3麦三角阵": ring([90, 210, 330]),
    "4麦方阵": ring([45, 135, 225, 315]),
}
ALL = np.concatenate([ARR[k] for k in ARR], 1)  # 2 x 9
IDX = {}; s = 0
for k in ARR:
    m = ARR[k].shape[1]; IDX[k] = list(range(s, s + m)); s += m

GRID = np.arange(0, 360, 1.0)

def stft(x):
    f, t, Z = sps.stft(x, fs=FS, nperseg=NFFT, noverlap=NFFT - HOP, boundary=None, padded=False)
    return f, Z  # Z: M x F x T

def srp_map(Z, f, pos, frame_mask=None):
    """返回 T x G 的 SRP-PHAT 图（逐帧），pos: 2 x M"""
    band = (f >= FMIN) & (f <= FMAX)
    fb = f[band]; Zb = Z[:, band, :]
    M = pos.shape[1]
    u = np.stack([np.cos(np.deg2rad(GRID)), np.sin(np.deg2rad(GRID))], 0)  # 2 x G
    tau = -(pos.T @ u) / C  # M x G  （远场：靠近声源的阵元先收到）
    out = 0
    for i in range(M):
        for j in range(i + 1, M):
            cross = Zb[i] * np.conj(Zb[j])
            cross = cross / (np.abs(cross) + 1e-12)  # PHAT
            dtau = tau[i] - tau[j]  # G
            steer = np.exp(1j * 2 * np.pi * fb[:, None] * dtau[None, :])  # F x G
            out = out + np.real(cross.T @ steer)  # T x G
    return out

def vad_mask(Z, f, thr_db=-30):
    band = (f >= FMIN) & (f <= FMAX)
    e = np.mean(np.abs(Z[0, band, :]) ** 2, 0)
    edb = 10 * np.log10(e + 1e-12)
    return edb > (edb.max() + thr_db)

def angdiff(a, b):
    return np.abs((a - b + 180) % 360 - 180)

def simulate_static(rt60, trial):
    L = rng.uniform(3.5, 7.0); W = rng.uniform(3.0, 6.0); H = rng.uniform(2.5, 3.2)
    room_dim = [L, W, H]
    e_abs, max_order = pra.inverse_sabine(rt60, room_dim)
    max_order = min(max_order, 40)
    room = pra.ShoeBox(room_dim, fs=FS, materials=pra.Material(e_abs), max_order=max_order, air_absorption=False)
    ac = np.array([rng.uniform(0.8, L - 0.8), rng.uniform(0.8, W - 0.8), rng.uniform(1.0, 2.0)])
    for _ in range(200):
        az = rng.uniform(0, 360); d = rng.uniform(1.0, 3.5)
        sp = ac[:2] + d * np.array([np.cos(np.deg2rad(az)), np.sin(np.deg2rad(az))])
        if 0.4 < sp[0] < L - 0.4 and 0.4 < sp[1] < W - 0.4:
            break
    sh = rng.uniform(1.0, 1.7)
    st = rng.integers(0, len(speech) - 3 * FS)
    sig = speech[st: st + int(2.5 * FS)]
    room.add_source([sp[0], sp[1], sh], signal=sig)
    mics = np.vstack([ALL + ac[:2, None], np.full((1, ALL.shape[1]), ac[2])])
    room.add_microphone_array(pra.MicrophoneArray(mics, FS))
    room.simulate()
    y = room.mic_array.signals
    # 传感器白噪声 SNR 15 dB
    p = np.mean(y ** 2); y = y + rng.normal(0, np.sqrt(p / 10 ** 1.5), y.shape)
    f, Z = stft(y)
    act = vad_mask(Z, f)
    res = {}
    for k in ARR:
        mp = srp_map(Z[IDX[k]], f, ARR[k])
        acc = mp[act].sum(0)
        est = GRID[np.argmax(acc)]
        res[k] = {"est": float(est), "err": float(angdiff(est, az)), "map": acc}
    return az, res

def run_static(n_per=60, rts=(0.2, 0.4, 0.6, 0.8)):
    summary = {}; example = None
    for rt in rts:
        errs = {k: [] for k in ARR}
        t0 = time.time()
        for n in range(n_per):
            az, res = simulate_static(rt, n)
            for k in ARR:
                errs[k].append(res[k]["err"])
            if example is None and rt == 0.4 and 40 < az < 80:
                example = {"az": az, "maps": {k: res[k]["map"].tolist() for k in ARR}}
        summary[rt] = {}
        for k in ARR:
            e = np.array(errs[k])
            summary[rt][k] = {"mae": float(e.mean()), "median": float(np.median(e)),
                              "acc10": float((e <= 10).mean()), "acc20": float((e <= 20).mean()),
                              "gross45": float((e > 45).mean()), "mae_nongross": float(e[e <= 45].mean()) if (e <= 45).any() else None}
        print(f"RT60={rt}: {time.time()-t0:.1f}s", {k: round(summary[rt][k]['mae'], 1) for k in ARR}, flush=True)
    return summary, example

def maps_vs_rt60(az=60.0):
    """固定房间与位置，比较不同 RT60 下 4 麦 SRP 图"""
    out = {}
    room_dim = [5.0, 4.0, 2.8]; ac = np.array([1.5, 2.0, 1.5])
    sp = ac[:2] + 2.0 * np.array([np.cos(np.deg2rad(az)), np.sin(np.deg2rad(az))])
    sig = speech[int(1.0 * FS): int(3.5 * FS)]
    for rt in (0.0, 0.3, 0.6, 0.9):
        if rt == 0:
            room = pra.ShoeBox(room_dim, fs=FS, max_order=0)
        else:
            e_abs, mo = pra.inverse_sabine(rt, room_dim)
            room = pra.ShoeBox(room_dim, fs=FS, materials=pra.Material(e_abs), max_order=min(mo, 40))
        room.add_source([sp[0], sp[1], 1.4], signal=sig)
        pos = ARR["4麦方阵"]
        mics = np.vstack([pos + ac[:2, None], np.full((1, pos.shape[1]), ac[2])])
        room.add_microphone_array(pra.MicrophoneArray(mics, FS)); room.simulate()
        y = room.mic_array.signals; f, Z = stft(y)
        act = vad_mask(Z, f)
        mp = srp_map(Z, f, pos)[act]
        # 逐帧峰值分布 + 累积图
        frame_est = GRID[np.argmax(mp, 1)]
        out[rt] = {"map": mp.sum(0).tolist(), "frame_err": angdiff(frame_est, az).tolist()}
    return {"az": az, "maps": out}

def tracking_demo(rt=0.5):
    """移动声源：绕阵列 2 m 圆弧从 30° 走到 200°；6.0–7.5 s 云台电机噪声（近场）"""
    room_dim = [6.0, 5.0, 2.8]; ac = np.array([3.0, 2.5, 1.5])
    e_abs, mo = pra.inverse_sabine(rt, room_dim); mo = min(mo, 30)
    pos = ARR["4麦方阵"]
    mics = np.vstack([pos + ac[:2, None], np.full((1, pos.shape[1]), ac[2])])
    sig = speech.copy(); N = len(sig); dur = N / FS
    blk = 4096; hop = 2048; win = np.hanning(blk + 1)[:-1]
    y = np.zeros((4, N + 20000))
    a0, a1 = 30.0, 200.0
    def az_at(t): return a0 + (a1 - a0) * np.clip(t / dur, 0, 1)
    rad = 2.0
    starts = list(range(0, N - blk, hop))
    for st in starts:
        tc = (st + blk / 2) / FS; az = az_at(tc)
        sp = ac[:2] + rad * np.array([np.cos(np.deg2rad(az)), np.sin(np.deg2rad(az))])
        room = pra.ShoeBox(room_dim, fs=FS, materials=pra.Material(e_abs), max_order=mo)
        room.add_source([sp[0], sp[1], 1.5]); room.add_microphone_array(pra.MicrophoneArray(mics, FS))
        room.compute_rir()
        seg = sig[st: st + blk] * win
        for m in range(4):
            h = room.rir[m][0]
            c = np.convolve(seg, h)
            y[m, st: st + len(c)] += c
    y = y[:, :N]
    # 电机噪声：近场点源（阵列下方 8 cm 偏一侧），谐波 + 带限噪声
    t = np.arange(N) / FS
    motor = 0.6 * sum(np.sin(2 * np.pi * f0 * t + rng.uniform(0, 6.28)) / (i + 1) for i, f0 in enumerate([420, 840, 1260, 1680]))
    bn = sps.lfilter(*sps.butter(4, [300 / (FS / 2), 2500 / (FS / 2)], "band"), rng.normal(0, 1, N))
    motor = motor + 0.8 * bn
    gate = ((t > 6.0) & (t < 7.5)).astype(float)
    gate = np.convolve(gate, np.hanning(801) / np.hanning(801).sum(), "same")
    room = pra.ShoeBox(room_dim, fs=FS, max_order=0)
    room.add_source([ac[0] + 0.03, ac[1] - 0.06, ac[2] - 0.08], signal=motor * gate)
    room.add_microphone_array(pra.MicrophoneArray(mics, FS)); room.simulate()
    mn = room.mic_array.signals[:, :N]
    ps = np.mean(y ** 2)
    pm = np.mean(mn[:, (t > 6.1) & (t < 7.4)] ** 2) + 1e-12
    mn = mn * np.sqrt(ps / pm * 10 ** (6 / 10))  # 电机噪声比语音高 6 dB
    y = y + mn + rng.normal(0, np.sqrt(ps / 10 ** 2.0), y.shape)
    f, Z = stft(y)
    mp = srp_map(Z, f, pos)  # T x G
    band = (f >= FMIN) & (f <= FMAX)
    e = np.mean(np.abs(Z[0, band, :]) ** 2, 0); edb = 10 * np.log10(e + 1e-12)
    # 100 ms 块
    fpb = int(round(0.1 * FS / HOP))  # ≈6 帧
    nb = mp.shape[0] // fpb
    tb, raw, conf, active = [], [], [], []
    thr = np.percentile(edb, 40)
    for b in range(nb):
        sl = slice(b * fpb, (b + 1) * fpb)
        m = mp[sl].sum(0)
        tb.append((b + 0.5) * fpb * HOP / FS)
        raw.append(GRID[np.argmax(m)])
        conf.append(float((m.max() - m.mean()) / (m.std() + 1e-9)))
        active.append(bool(np.mean(edb[sl]) > thr))
    tb = np.array(tb); raw = np.array(raw); conf = np.array(conf); active = np.array(active)
    motor_on = (tb > 6.0) & (tb < 7.5)
    truth = az_at(tb)
    # 圆周卡尔曼（方位 + 角速度），门控 ±30°，电机期间冻结
    dt = 0.1; Fm = np.array([[1, dt], [0, 1]]); Q = np.diag([0.5, 4.0]); Rm = 36.0
    x = None; P = np.eye(2) * 100; trk = []; upd = []; pend = []; since = 0.0
    for k in range(len(tb)):
        if x is not None:
            x = Fm @ x; P = Fm @ P @ Fm.T + Q; since += dt
            if since > 3.0:
                x = None
        use = active[k] and (not motor_on[k]) and conf[k] > 2.0
        upd_k = False
        if use and x is None:  # M-of-N 起始：最近 6 个观测中 3 个落在 ±10° 内
            pend = (pend + [raw[k]])[-6:]; obs = np.array(pend)
            for ref in obs:
                d = (obs - ref + 180) % 360 - 180; m = np.abs(d) <= 10
                if m.sum() >= 3:
                    x = np.array([(ref + d[m].mean()) % 360, 0.0]); P = np.diag([Rm, 100.0]); since = 0.0; pend = []; upd_k = True
                    break
        elif use:
            inn = (raw[k] - x[0] + 180) % 360 - 180
            if abs(inn) < 30:
                S = P[0, 0] + Rm; K = P[:, 0] / S
                x = x + K * inn; P = P - np.outer(K, P[0, :]); since = 0.0; upd_k = True
        upd.append(upd_k)
        trk.append(np.nan if x is None else x[0] % 360)
    trk = np.array(trk)
    ok = ~np.isnan(trk)
    raw_err = angdiff(raw[active & ~motor_on], truth[active & ~motor_on])
    res = {"t": tb.tolist(), "raw": raw.tolist(), "truth": truth.tolist(), "trk": [None if np.isnan(v) else float(v) for v in trk],
           "active": active.tolist(), "motor": motor_on.tolist(), "upd": upd, "conf": conf.tolist(),
           "raw_mae_speech": float(raw_err.mean()), "raw_gross_speech": float((raw_err > 45).mean()),
           "raw_err_motor": float(angdiff(raw[motor_on], truth[motor_on]).mean()),
           "trk_mae": float(angdiff(trk[ok], truth[ok]).mean()),
           "trk_max": float(angdiff(trk[ok], truth[ok]).max()), "dur": dur}
    return res

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode in ("timing",):
        t0 = time.time(); simulate_static(0.8, 0); print("one trial rt0.8:", time.time() - t0); sys.exit()
    if mode in ("all", "static"):
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 60
        summary, example = run_static(n)
        json.dump({"summary": summary, "example": example, "n_per": n}, open(os.path.join(OUT, "static.json"), "w", encoding="utf-8"), ensure_ascii=False)
    if mode in ("all", "maps"):
        json.dump(maps_vs_rt60(), open(os.path.join(OUT, "maps.json"), "w", encoding="utf-8"))
    if mode in ("all", "track"):
        r = tracking_demo()
        json.dump(r, open(os.path.join(OUT, "track.json"), "w", encoding="utf-8"))
        print({k: r[k] for k in ("raw_mae_speech", "raw_gross_speech", "raw_err_motor", "trk_mae", "trk_max")})
