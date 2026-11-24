"""把情况 1 算法实现的公式渲染成 PNG（matplotlib mathtext），供 build_case1_impl_deck.js 插入 PPT。
公式与 02_耳机声源定位/情况1算法实现.md、code/earbud_ssl 的实现一致。
输出：_build/formulas/*.png 与 _build/formulas/manifest.json（每张图在 PPT 中的显示宽高，英寸）。
用法：python _build/make_case1_formulas.py
"""
import json, os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "formulas")
os.makedirs(OUT, exist_ok=True)
plt.rcParams["mathtext.fontset"] = "cm"
FS, DPI, SCALE = 22, 200, 0.68    # 22 pt 渲染，显示时约 15 pt

F = {
    "stft": r"$X_m(f,t)=\sum_{n=0}^{511} w(n)\,y_m(256t+n)\,e^{-j2\pi fn/512}$",
    "win": r"$w(n)=0.5-0.5\cos(2\pi n/512),\qquad \mathbf{x}(f,t)=[X_1,X_2,X_3]^T$",
    "ss": r"$\mathbf{S}_s(f,t)=\alpha_s\mathbf{S}_s(f,t-1)+(1-\alpha_s)\,\mathbf{x}\mathbf{x}^H,\qquad \alpha_s=e^{-1/(0.25\times 62.5)}$",
    "sb": r"$\mathbf{S}_b(f,t)=\alpha_b\mathbf{S}_b(f,t-1)+(1-\alpha_b)\,\mathbf{x}\mathbf{x}^H,\qquad \alpha_b=e^{-1/(1\times 62.5)}$",
    "bias": r"$\tilde{\mathbf{R}}_b=\mathbf{S}_b\,/\,(1-\alpha_b^{\,t}),\qquad \tilde{\mathbf{R}}_s=\mathbf{S}_s\,/\,(1-\alpha_s^{\,t+1})$",
    "nu": r"$\nu(t)=10\log_{10}\left(\mathrm{median}_f\ \lambda_{\max}\left(\mathbf{L}^{-1}\tilde{\mathbf{R}}_s\mathbf{L}^{-H}\right)\right),\qquad \mathbf{L}\mathbf{L}^H=\tilde{\mathbf{R}}_b+\delta\mathbf{I}$",
    "rb": r"$\mathbf{R}_b(f)=\dfrac{1}{|\mathcal{T}_b|}\sum_{t\in\mathcal{T}_b}\mathbf{x}\mathbf{x}^H,\qquad \mathcal{T}_b=[t_{on}-1.05\,\mathrm{s},\ t_{on}-0.05\,\mathrm{s})$",
    "e": r"$e(t)=10\log_{10}\dfrac{1}{3\cdot 218}\sum_{m,f}|X_m(f,t)|^2$",
    "w": r"$w(t)=0.2+\min(\max(e(t)-e(t-1),\,0),\,10)\,/\,10,\qquad e(t)>\max\,e-30\,\mathrm{dB}$",
    "rs": r"$\mathbf{R}_s(f)=\dfrac{\sum_{t\in\mathcal{T}_s}w(t)\,\mathbf{x}\mathbf{x}^H}{\sum_{t\in\mathcal{T}_s}w(t)},\qquad \mathcal{T}_s=[t_{on},\ t_d]$",
    "chol": r"$\mathbf{L}\mathbf{L}^H=\mathbf{R}_b+\delta\mathbf{I},\qquad \delta=0.01\,\mathrm{tr}(\mathbf{R}_b)\,/\,M$",
    "rw": r"$\mathbf{R}_w=\mathbf{L}^{-1}\mathbf{R}_s\mathbf{L}^{-H}=\mathbf{U}\Lambda\mathbf{U}^H,\qquad \lambda_1\geq\lambda_2\geq\lambda_3$",
    "en": r"$\mathbf{E}_n=[\mathbf{u}_2,\ \mathbf{u}_3]$",
    "aw": r"$\mathbf{a}(\theta,f)=\mathbf{h}(\theta,f)\,/\,\Vert\mathbf{h}(\theta,f)\Vert,\qquad \mathbf{a}_w(\theta,f)=\mathbf{L}^{-1}(f)\,\mathbf{a}(\theta,f)$",
    "pf": r"$P_f(\theta)=\dfrac{\Vert\mathbf{a}_w\Vert^2}{\Vert\mathbf{E}_n^H\mathbf{a}_w\Vert^2}$",
    "p": r"$P(\theta)=\dfrac{1}{218}\sum_f\dfrac{P_f(\theta)}{\max_{\theta'}P_f(\theta')},\qquad \theta\in\{-180^\circ,-175^\circ,\ldots,175^\circ\}$",
    "k": r"$k^*=\arg\max_k P(\theta_k)$",
    "delta": r"$\delta=\dfrac{P_{k^*-1}-P_{k^*+1}}{2\,(P_{k^*-1}-2P_{k^*}+P_{k^*+1})},\qquad \delta\in[-0.5,\ 0.5]$",
    "theta": r"$\theta_a=\theta_{k^*}+5^\circ\cdot\delta$",
    "s0": r"$s_0=P(\theta_{k^*})-\mu$",
    "si": r"$s_i=\max_{|\theta-\phi_i|\leq 8^\circ}P(\theta)+\lambda\,(l_i-0.5)$",
    "out": r"$\theta_{out}=\phi_{i^*}\ \ \mathrm{if}\ \ \max_i s_i>s_0,\quad \mathrm{else}\ \ \theta_{k^*}$",
    "world": r"$\theta_{world}=\theta_{out}+\psi(t)$",
    "sphere": r"$p(\mathbf{r}_m)=jk\sum_{n=0}^{N}(2n+1)\,P_n(\cos\gamma)\,h_n(kr_s)\left[j_n(kr_m)-\dfrac{j_n^{\prime}(ka)}{h_n^{\prime}(ka)}\,h_n(kr_m)\right]$",
    "htf": r"$h_m(\theta,f)=\left(p(\mathbf{r}_m)\,/\,\dfrac{e^{jkr_s}}{r_s}\right)^{*},\qquad k=2\pi f/c,\quad N=\lceil 1.5\,k\,r_m\rceil+15$",
}

manifest = {}
for name, tex in F.items():
    fig = plt.figure(figsize=(0.01, 0.01))
    fig.text(0, 0, tex, fontsize=FS, color="#1F1F1F")
    path = os.path.join(OUT, f"{name}.png")
    fig.savefig(path, dpi=DPI, transparent=True, bbox_inches="tight", pad_inches=0.04)
    plt.close(fig)
    from PIL import Image
    w, h = Image.open(path).size
    manifest[name] = {"w": round(w / DPI * SCALE, 3), "h": round(h / DPI * SCALE, 3)}
    print(f"{name}: {manifest[name]}")
with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=1)
