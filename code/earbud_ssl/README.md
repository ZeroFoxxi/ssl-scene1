# earbud_ssl：耳机声源定位最小验证

无障碍听觉辅助场景下，耳机声源定位的仿真代码（与场景一的 `ssl_baseline` 分开）。

- `earbud_ssl/sphere.py`：刚性球头部模型（Duda & Martens 1998）——点声源到球面附近麦克风的传递函数；自由场对照；耳机麦克风位置。
- `earbud_ssl/sim.py`：STFT 域双耳仿真：直达声 + 多方向扩散混响尾 + 语音谱形扩散噪声；两耳同步误差。
- `earbud_ssl/doa.py`：路线 A（两耳组阵，4 麦 SRP-PHAT，头部模板）、路线 B（每耳本地 2 麦 + 耳间电平差，只传参数）及对照方法。
- `earbud_ssl/methods.py`：算法选型的候选方法（SRP-PHAT、MUSIC、GEVD-MUSIC、起始段加权）与音视频融合（硬规则、软融合）；扩散场协方差与 IMU 旋转背景。
- `scripts/run_min_validation.py`：最小验证主脚本；`scripts/plot_min_validation.py`：画图。
- `earbud_ssl/room.py`：鞋盒房间镜像声源法 + 头部模型查表（表缓存在 `cache/`，不进仓库，首次运行约 10 秒生成）。
- `scripts/run_robustness.py --test turn|turntaking|room|vision`：稳健性验证（各约 8–12 分钟）；`scripts/plot_robustness.py`、`scripts/plot_robustness2.py`：画图。
- `scripts/run_algo_selection.py`：算法选型主脚本（约 6 分钟）；`scripts/tune_fusion.py`：在开发种子上调软融合参数；`scripts/plot_algo_selection.py`：画图。

```bash
pip install numpy scipy matplotlib
python tests/test_basic.py
python scripts/run_min_validation.py --reps 2     # 约 3 分钟
python scripts/plot_min_validation.py
```

结果与解读见 `02_耳机声源定位/最小验证_刚性球模型.md`、`02_耳机声源定位/算法选型.md`、`02_耳机声源定位/稳健性验证.md`。
