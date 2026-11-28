# AI 声源定位模型的规模：公开论文摘录

> 2026-11-23 摘录，已读 arXiv 原文（HTML 版）。用于回答 mentor 11-23 "用 AI 的话参数量大致的范围"。数字均为论文原文所写；各论文的数据集和评价方式不同，精度之间不能直接比较。

| 模型 | 输入 | 参数量 | 计算量 | 精度（论文自己的数据集） | 出处 |
|---|---|---|---|---|---|
| LightDOA（深度可分离卷积，2025） | 2 路，相位差（IPD） | 35.5k–39.0k（随输出方向数变） | 未给 | 方位按 10° 分类准确率 71.7%，按 20° 分类 85.5%（方位折叠到 0–180°） | arXiv 2511.08012 表 3 |
| CP-Mobile（移动端小网络，同文对比） | 2 路，IPD 或 STFT | 61.1k–64.2k | 未给 | 10°：69.1–71.0%；20°：84.4–85.0% | 同上 |
| CRNN（常用端到端定位网络，同文对比） | 2 路，STFT 实部 + 虚部 | 308k–311k | 未给 | 10°：71.1%；20°：84.3% | 同上 |
| BiL 双耳卷积循环网络（2025） | 双耳，GCC-PHAT | 正文未给 | 未给 | 平均定位误差 1.2°（同条件 SRP-PHAT 10.2°） | arXiv 2507.20027 表 1 |
| DCASE 2024 声事件定位与检测基线（CRNN + 2 层自注意力） | 4 路 | 0.74 M | 0.03 G MAC/s | 该任务的 DOA 误差 36.9° 等（任务更复杂，含事件检测与距离） | arXiv 2408.05057 表 1 |
| SELD-Mamba、EINV2（同文对比，大模型） | 4 路 | 75 M、128 M | 6.35、34.4 G MAC/s | — | 同上 |

## 小结（判断）

- 只做方向（单声源）的轻量网络约 3.5 万–6.5 万参数；按 8 比特量化约 40–65 KB，和我们方向模板（约 184 KB）同量级或更小。
- 常用的 CRNN 约 30 万参数，约 300 KB（8 比特）。
- 做"声事件检测 + 定位"的比赛基线约 74 万参数，大模型上千万到上亿，不适合耳机。
- 这些论文的场景（数据集、麦克风位置、有无干扰）和我们不同，精度不能直接和我们的仿真比；要比较，需要在我们的仿真数据上训练同规模的网络。

## 耳机芯片（公开资料，检索摘要，未见原厂规格书）

- 恒玄 BES2700YP：Cortex-M55 主核 + 带 BECO NPU 的传感器核（STAR-MC1），4 MB 共享 SRAM；报道称用于华为 FreeBuds Pro 2（CNX Software 2025-06）。
- 恒玄 BES2700BP：带 HiFi4 音频 DSP（Yole 报告摘要）。
- 恒玄 BES2800BP：双核 BECO NPU、HiFi4 DSP、8.3 MB SRAM（检索摘要）。
- 主频与可用算力未公开（资料需签保密协议）；我们方案实际能用多少算力【待确认，问芯片同事】。

## 链接

- https://arxiv.org/html/2511.08012v1
- https://arxiv.org/html/2507.20027v1
- https://arxiv.org/html/2408.05057
- https://www.cnx-software.com/2025/06/02/bestechnic-bes2700yp-arm-cortex-m55-bluetooth-audio-soc-targets-headphones-earbuds-portable-speakers/
- https://www.yolegroup.com/product/report/bestechnic-ultra-low-power-bluetooth-wearable-soc-bes2700bp/
