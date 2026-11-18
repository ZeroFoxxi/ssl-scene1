"""在开发种子上调软融合的 lam、mu（与评测种子分开）。用法：python scripts/tune_fusion.py"""
import os, sys, time
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_algo_selection as R
from earbud_ssl import methods as M
from earbud_ssl.sphere import sphere_tf, earbud_mics, azimuth_points, fibonacci_sphere
from earbud_ssl.sim import ltas, NFFT

rng = np.random.default_rng(7)
freqs = np.fft.rfftfreq(NFFT, 1 / 16000); mics = earbud_mics(); grid = np.arange(-180, 180, 5.0)
speech = R.load_speech()
ctx = {"freqs": freqs, "mics": mics, "H_diff": sphere_tf(fibonacci_sphere(32, 2.0), mics, freqs), "speech": speech, "psd": ltas(speech, 16000)}
fm = (freqs >= 200) & (freqs <= 7000); Hg = sphere_tf(azimuth_points(grid, 1.5), mics, freqs)
data = []
for cname in ["S2 混响 + 2 个干扰（SIR 6 dB）", "S4 混响 + 2 个干扰（SIR 0 dB）"]:
    for _ in range(40):
        az, Yd, Yb, faces = R.run_trial(rng, R.CONDS[cname], ctx)
        e = M.frame_energy_db(Yd, fm)
        p = M.music(M.covariance(Yd, fm, M.onset_weights(e, e.max() - 30)), Hg, fm, M.covariance(Yb, fm, np.ones(Yb.shape[2])))
        data.append((az, p, faces))
acc = lambda f: np.mean([R.angdiff(f(p, faces), az) <= 10 for az, p, faces in data])
print(f"纯声学 {acc(lambda p, fc: M.peak(p, grid, 5.0))*100:.1f}%  硬规则 {acc(lambda p, fc: M.fuse_with_faces(p, grid, fc))*100:.1f}%")
for lam in [0.0, 0.1, 0.2, 0.4]:
    print(f"lam={lam}: " + "  ".join(f"mu={mu}: {acc(lambda p, fc: M.fuse_soft(p, grid, fc, lam, mu))*100:5.1f}%" for mu in [0.0, 0.05, 0.1, 0.2, 0.4]))
