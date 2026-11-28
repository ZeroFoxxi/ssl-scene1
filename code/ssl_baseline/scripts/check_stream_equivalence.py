# -*- coding: utf-8 -*-
"""检验流式转向（ssl_baseline/stream.py）与离线评测（run_meeting_closed_loop.closed_loop）逐块一致，并测每块处理耗时。

生成一段连续会议仿真（与 run_meeting_closed_loop.py 相同的生成方法，6 麦线阵 17.5 cm），
分别用 GEVD-MUSIC 与小网络（有模型时）跑离线与流式两遍，比较每 0.1 s 的摄像头朝向与转向命令。
运行：python scripts/check_stream_equivalence.py [--seed 7] [--nn-ckpt work/models/crnn_v0.pt] [--conf 0.7]
"""
import argparse, os, sys, time
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_meeting_closed_loop as M
import run_meeting_eval as R
from ssl_baseline.stream import StreamingTurner
from ssl_baseline.wake import WakeDOA, WakeDOAConfig
from ssl_baseline.doa import SRPConfig
from ssl_baseline.geometry import aliasing_frequency


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--rt60", type=float, default=0.6)
    ap.add_argument("--nn-ckpt", default=os.path.join(ROOT, "work", "models", "crnn_v0.pt"))
    ap.add_argument("--conf", type=float, default=0.7)
    a = ap.parse_args()
    name = list(M.ARRAYS)[0]; xy = M.ARRAYS[name]
    srp = SRPConfig(fmax=min(4000.0, 0.95 * aliasing_frequency(xy)))
    base = dict(pad_pre=0.0, pad_post=0.0, exclude=R.FRONT, srp=srp)
    raw = WakeDOA(xy, M.FS, WakeDOAConfig(method="srp_sub", bg_subtract=False, onset=False, **base))
    ests = {"GEVD-MUSIC": (WakeDOA(xy, M.FS, WakeDOAConfig(**base)), 0.0)}
    if a.nn_ckpt and os.path.exists(a.nn_ckpt):
        from ssl_baseline.nn_doa import NNDOA
        ests[f"小网络（置信≥{a.conf:g}）"] = (NNDOA(a.nn_ckpt), a.conf)
    rng = np.random.default_rng(a.seed)
    sp, en = R.load("speech_zh.wav"), R.load("tv_en.wav")
    y, far, turns, azs = M.render(rng, sp, en, a.rt60, xy)
    far_db = M.band_energy_blocks(far[None]); e_db = M.band_energy_blocks(y); nb = len(e_db)
    srp_raw = np.array([raw.localize(y, max(0, int(((b + 1) * M.DT - 0.3) * M.FS)), int((b + 1) * M.DT * M.FS)).az
                        if (b + 1) * M.DT >= 0.35 else 0.0 for b in range(nb)])
    bs = int(M.DT * M.FS); ok_all = True
    for label, (est, th) in ests.items():
        pans, cmds = M.closed_loop(y, e_db, far_db, srp_raw, est, freeze=True, conf_th=th)
        st = StreamingTurner(est, raw, fs=M.FS, dt=M.DT, conf_th=th, freeze=True, pan_speed=M.PAN_SPEED)
        sp_pans, tt = [], []
        for b in range(nb):
            t1 = time.perf_counter()
            ev = st.push(y[:, b * bs:(b + 1) * bs], far[None, b * bs:(b + 1) * bs])
            tt.append(time.perf_counter() - t1); sp_pans.append(ev["pan"])
        dp = np.max(np.abs((np.array(sp_pans) - pans + 180) % 360 - 180))
        same_cmd = len(cmds) == len(st.cmds) and all(abs(c1[0] - c2[0]) < 1e-9 and abs(c1[1] - c2[1]) < 1e-9 for c1, c2 in zip(cmds, st.cmds))
        ok = dp < 1e-6 and same_cmd; ok_all &= ok
        tt = np.array(tt) * 1000
        print(f"{label}: 朝向最大差 {dp:.2e}°，转向命令 {len(cmds)} / {len(st.cmds)} 条{'一致' if same_cmd else '不一致'} → {'通过' if ok else '不通过'}；"
              f"每块耗时 中位数 {np.median(tt):.1f} ms、95% {np.percentile(tt, 95):.1f} ms、最大 {tt.max():.1f} ms（块长 {M.DT * 1000:.0f} ms）")
    sys.exit(0 if ok_all else 1)


if __name__ == "__main__":
    main()
