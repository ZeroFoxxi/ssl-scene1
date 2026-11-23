# -*- coding: utf-8 -*-
"""IPDnet2（Wang et al., 2025，arXiv 2509.21900）官方开源模型的 CPU 推理适配，用于和传统测向在同一仿真里比较。

- 官方代码与预训练模型：https://github.com/Audio-WestlakeU/FN-SSL（MIT 许可）的 IPDnet2/ 目录，
  预训练模型 checkpoints/ipdnet2_small.ckpt（Small 版，1,255,008 个参数），在 RealMAN 实录数据上训练。
  本仓库不复制官方代码，使用时把官方仓库克隆到本地，路径通过参数或环境变量 IPDNET2_DIR 指定（指向 IPDnet2/ 目录）。
- 官方实现中的 Mamba 层依赖 mamba_ssm（需要 NVIDIA GPU）。这里提供同参数布局的纯 PyTorch 实现（逐帧递推），
  只用于 CPU 推理，速度慢但数值等价（选择性扫描的参考实现）。
- 预训练模型对应的阵列：RealMAN 录音阵列中的 4 个麦克风（半径 3 cm 圆周上 0°/90°/180°/270°）+ 中心麦克风，
  通道顺序 [0°, 90°, 180°, 270°, 中心]，第一个通道为参考。ARRAY_XY 给出该几何（米），仿真时须使用同一几何。

输出：每 100 ms 一帧、每帧 2 条轨迹的直达声相位差（DP-IPD）；与各方位的模板比较（均方误差）得到方位与匹配误差，
匹配误差越小说明该轨迹越像一个真实的定向声源（不活跃的轨迹会输出接近散射噪声的模式，误差大）。
"""
import contextlib, io, math, os, sys, types
from typing import Optional, Tuple
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
except ImportError:  # torch 为可选依赖
    torch = None

FS = 16000
NFFT, WIN, HOP = 512, 512, 320          # win_shift_ratio 0.625
FRAME_S = 5 * HOP / FS                  # 输出帧长：时间压缩 5 倍 → 0.1 s
ARRAY_XY = np.array([[0.03, 0.0, -0.03, 0.0, 0.0],
                     [0.0, 0.03, 0.0, -0.03, 0.0]])


# ---------------- 纯 PyTorch Mamba（与 mamba_ssm.Mamba 参数名、形状一致） ----------------
if torch is not None:
    class MambaCPU(nn.Module):
        def __init__(self, d_model, d_state=16, d_conv=4, expand=2, layer_idx=None, **kw):
            super().__init__()
            self.d_inner = expand * d_model
            self.d_state = d_state
            self.dt_rank = math.ceil(d_model / 16)
            self.in_proj = nn.Linear(d_model, 2 * self.d_inner, bias=False)
            self.conv1d = nn.Conv1d(self.d_inner, self.d_inner, d_conv, groups=self.d_inner, padding=d_conv - 1, bias=True)
            self.x_proj = nn.Linear(self.d_inner, self.dt_rank + 2 * d_state, bias=False)
            self.dt_proj = nn.Linear(self.dt_rank, self.d_inner, bias=True)
            self.A_log = nn.Parameter(torch.zeros(self.d_inner, d_state))
            self.D = nn.Parameter(torch.ones(self.d_inner))
            self.out_proj = nn.Linear(self.d_inner, d_model, bias=False)

        def forward(self, h, inference_params=None):
            b, l, _ = h.shape
            x, z = self.in_proj(h).transpose(1, 2).chunk(2, dim=1)            # (b, d, l)
            x = F.silu(self.conv1d(x)[..., :l])
            dbc = self.x_proj(x.transpose(1, 2))                                # (b, l, r + 2n)
            dt, Bm, Cm = torch.split(dbc, [self.dt_rank, self.d_state, self.d_state], dim=-1)
            delta = F.softplus(torch.einsum("dr,blr->bdl", self.dt_proj.weight, dt) + self.dt_proj.bias[None, :, None])
            A = -torch.exp(self.A_log.float())
            dA = torch.exp(torch.einsum("bdl,dn->bdln", delta, A))
            dBu = torch.einsum("bdl,bln,bdl->bdln", delta, Bm, x)
            s = torch.zeros(b, self.d_inner, self.d_state, dtype=x.dtype)
            ys = []
            for i in range(l):
                s = dA[:, :, i] * s + dBu[:, :, i]
                ys.append(torch.einsum("bdn,bn->bd", s, Cm[:, i]))
            y = torch.stack(ys, dim=2) + x * self.D[None, :, None]
            y = y * F.silu(z)
            return self.out_proj(y.transpose(1, 2))


def _install_mamba_shim():
    m = types.ModuleType("mamba_ssm"); m.Mamba = MambaCPU
    u = types.ModuleType("mamba_ssm.utils"); g = types.ModuleType("mamba_ssm.utils.generation")
    class InferenceParams:  # 仅为满足导入；本适配只用整段前向
        def __init__(self, *a, **k): self.seqlen_offset = 0
    g.InferenceParams = InferenceParams
    sys.modules.update({"mamba_ssm": m, "mamba_ssm.utils": u, "mamba_ssm.utils.generation": g})


def _templates(n_azi=360):
    """模板（与官方 DPIPD2 相同的定义，水平面）：返回方位网格（度，[-180, 180)）与 (n_azi, 2*256*4) 实数模板。"""
    pos = np.vstack([ARRAY_XY, np.zeros((1, 5))]).T                      # 5 x 3
    azi = np.linspace(-np.pi, np.pi, n_azi, endpoint=False)
    r = np.stack([np.cos(azi), np.sin(azi), np.zeros_like(azi)], 1)       # n_azi x 3
    f = np.linspace(0.0, FS / 2, NFFT // 2 + 1)[1:]                       # 用 1..256 号频点
    itd = (r @ (pos[1:] - pos[0]).T) / 340.0                              # n_azi x 4（m1=参考，m2=其余）
    ipd = np.exp(-1j * 2 * np.pi * f[None, :, None] * itd[:, None, :])    # n_azi x 256 x 4
    t = np.concatenate([ipd.real, ipd.imag], axis=1)                      # n_azi x 512 x 4
    return np.rad2deg(azi), t.reshape(n_azi, -1).astype(np.float32)


_no_grad = torch.no_grad() if torch is not None else (lambda f: f)        # Python 3.8 不支持装饰器里写表达式

class IPDnet2Localizer:
    """用法：
        loc = IPDnet2Localizer(ipdnet2_dir)
        tr = loc.tracks(x)            # x: 5 x N（通道顺序见 ARRAY_XY），返回逐帧 2 条轨迹的 (方位°, 匹配误差)
        az = loc.decide(tr, t0, t1)   # 在 [t0, t1) 秒内投票给出一个方位
    """

    def __init__(self, ipdnet2_dir: Optional[str] = None, n_threads: int = 4):
        if torch is None:
            raise ImportError("需要安装 torch")
        d = ipdnet2_dir or os.environ.get("IPDNET2_DIR")
        if not d or not os.path.isfile(os.path.join(d, "IPDnet2.py")):
            raise FileNotFoundError("请指定官方 FN-SSL 仓库中的 IPDnet2 目录（参数 ipdnet2_dir 或环境变量 IPDNET2_DIR）")
        torch.set_num_threads(n_threads)
        _install_mamba_shim()
        sys.path.insert(0, d)
        import IPDnet2 as net_mod                                       # noqa: E402（官方代码）
        from utils_ import forgetting_norm                              # noqa: E402
        net_mod.print = lambda *a, **k: None                            # 官方前向里有调试打印
        self._norm = forgetting_norm
        self.net = net_mod.OnlineSpatialNet(
            dim_input=10, dim_output=16, num_layers=8, dim_hidden=96, num_heads=4, kernel_size=(5, 3),
            conv_groups=(8, 8), norms=["LN", "LN", "GN", "LN", "LN", "LN"], dim_squeeze=8, num_freqs=256,
            attention="mamba(16,4)", rope=False, time_compression_layer=0, fre_compression_ratio=16, time_compression_ratio=5)
        ck = torch.load(os.path.join(d, "checkpoints", "ipdnet2_small.ckpt"), map_location="cpu", weights_only=False)
        sd = {k[5:]: v for k, v in ck["state_dict"].items() if k.startswith("arch.")}
        missing, unexpected = self.net.load_state_dict(sd, strict=True), None
        self.net.eval()
        self.n_params = sum(p.numel() for p in self.net.parameters())
        self.azi, self.tmpl = _templates()
        self.tmpl_t = torch.from_numpy(self.tmpl)

    @_no_grad
    def tracks(self, x: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """x: 5 x N。返回 (az[T, 2], mse[T, 2])，T 为 0.1 s 帧数，方位为本仓库约定（[0, 360)，0° 为阵列 x 轴、逆时针）。"""
        sig = torch.from_numpy(np.asarray(x, np.float32).T)[None]             # 1 x N x 5
        win = torch.hann_window(WIN)
        st = torch.stack([torch.stft(sig[0, :, c], n_fft=NFFT, hop_length=HOP, win_length=WIN, window=win,
                                     center=True, return_complex=True) for c in range(5)], 0)[None]   # 1 x 5 x 257 x T
        mu = self._norm(torch.abs(st), sample_length=249)
        feat = torch.cat([st.real / (mu + 1e-6), st.imag / (mu + 1e-6)], dim=1)[:, :, 1:257, :]      # 1 x 10 x 256 x T
        with contextlib.redirect_stdout(io.StringIO()):
            y = self.net(feat.float())                                           # 1 x T' x 512 x 4 x 2
        y = y[0].permute(0, 3, 1, 2).reshape(y.shape[1], 2, -1)                 # T' x 2 x 2048（与模板展平顺序一致）
        mse = ((y[:, :, None, :] - self.tmpl_t[None, None]) ** 2).mean(-1)     # T' x 2 x n_azi
        k = mse.argmin(-1)
        az = self.azi[k.numpy()] % 360.0
        return az, mse.gather(-1, k[..., None])[..., 0].numpy()

    @staticmethod
    def decide(tr, t0: float, t1: float, exclude=None, prev: Optional[Tuple[float, float]] = None,
               bw: float = 5.0, max_mse: float = 1.0) -> float:
        """在 [t0, t1) 秒的帧里，两条轨迹的方位按 1/误差 加权投票，取峰值。
        exclude：屏蔽方位区间 [(lo, hi)]；prev=(t_a, t_b)：该时间段内已存在的方位视为"上一位 / 持续干扰"，投票前扣除。"""
        az, mse = tr
        grid = np.arange(0.0, 360.0, 1.0)

        def votes(a0, a1):
            i0, i1 = int(np.floor(a0 / FRAME_S)), int(np.ceil(a1 / FRAME_S))
            v = np.zeros_like(grid)
            for a, e in zip(az[max(i0, 0):i1].ravel(), mse[max(i0, 0):i1].ravel()):
                if e <= max_mse:
                    d = np.abs((grid - a + 180) % 360 - 180)
                    v += np.exp(-0.5 * (d / bw) ** 2) / (e + 1e-3)
            return v

        v = votes(t0, t1)
        if prev is not None:
            p = votes(*prev)
            if p.max() > 0:
                v = v * (1 - 0.9 * p / p.max())
        for lo, hi in (exclude or ()):
            lo, hi = lo % 360, hi % 360
            m = ((grid >= lo) & (grid <= hi)) if lo <= hi else ((grid >= lo) | (grid <= hi))
            v[m] = 0
        return float(grid[int(np.argmax(v))]) if v.max() > 0 else float("nan")
