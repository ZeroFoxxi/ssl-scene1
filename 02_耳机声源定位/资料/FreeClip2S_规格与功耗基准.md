# HUAWEI FreeClip 2 S 规格与功耗基准

> 2026-11-18 整理。mentor 11-18："耳机功耗先按照我们华为 FreeClip 2 S 的这个规格吧"。
> 标注：**【官方】** 华为官网规格页（经搜索结果引用；官网页面在当前云端环境的网络策略下无法直接打开，需在本机核对）；**【评测】** 第三方报道；**【推算】** 由官方数字计算；**【参考】** 其他资料中的器件数据。

## 1. 规格（与本方案相关的部分）

| 项目 | 内容 | 来源 |
|---|---|---|
| 形态 | 开放式耳夹，每只约 5.1 g | 【官方】 |
| 电池 | 每只耳机 60 mAh（典型值）；充电盒 537 mAh（典型值） | 【官方】 |
| 续航 | 音乐播放：单次 9 h，配合充电盒 38 h；通话：单次 6 h，配合充电盒 25 h（测试条件：50% 音量播放 AAC 音乐） | 【官方】 |
| 快充 | 充电 10 分钟可听约 3 h | 【官方】 |
| 传感器 | 红外、霍尔、陀螺仪与加速度计一体传感器、骨声纹传感器、触控传感器 | 【官方】 |
| 麦克风 | 通话为"三麦克风 + DNN 降噪"，配骨声纹传感器；**每只耳机几个麦克风未查到原文**【待核实】 | 【评测】 |
| 芯片 | 第三代麒麟 NPU AI 音频芯片，算力约为上一代的 10 倍；具体型号未公开 | 【评测 / 发布报道】 |
| 蓝牙 | 蓝牙 6.0，双设备连接（有一篇评测写作 5.3，以官网为准） | 【官方】 |
| 编码 | SBC、AAC、L2HC；另有评测提到 LC3【待核实】 | 【官方 / 评测】 |
| 单元 | 10.8 mm 双振膜，20 Hz–20 kHz | 【官方】 |
| 防护 | 耳机 IP57，充电盒 IP54 | 【官方】 |

## 2. 功耗基准【推算】

按锂电池标称电压 3.7–3.85 V 计算：每只耳机电量约 222–231 mWh。

| 使用场景 | 官方续航 | 平均功耗（每只） |
|---|---|---|
| 音乐播放（50% 音量，AAC） | 9 h | 约 25 mW |
| 通话（三麦 + 骨声纹 + DNN 降噪 + 上下行蓝牙） | 6 h | 约 37–39 mW |

**判断**：听觉辅助模式和通话最接近：麦克风一直在采集，有降噪类处理，蓝牙一直工作。所以以"通话约 37 mW / 只、续航 6 h"作为整机预算的参照。加入定位、两耳组阵和摄像头之后，如果仍要保持约 6 h 续航，新增功能只能占这个预算的一小部分。

## 3. 对方案的直接影响【判断】

| 部件 | 参考数据 | 与 37 mW 预算的关系 |
|---|---|---|
| 摄像头常开 | 【参考】HM0360（VGA 低功耗传感器）工作约 14.5 mW（`资料/room_acoustic_rendering_design.md` 引用厂商资料） | 常开约占通话功耗的 39%，不可接受；**按需开**时（例如 10% 的时间开）约 1.5 mW。这直接支持方案里"摄像头按需开"的设计 |
| 定位计算 | 算法选型估算约 12 MFLOPS | 要换算成功耗，需要目标芯片（第三代麒麟 NPU 音频芯片）DSP 的每 MHz 功耗【待查】 |
| 两耳组阵（副耳音频传到主耳） | 原始音频每路约 256 kbps【估算】 | 蓝牙持续传输的功耗需要芯片数据【待查】；麦克风数越多，要传的路数越多，这是 4 / 6 / 8 麦选择的关键约束 |

## 4. 来源

- [HUAWEI FreeClip 2 S 規格參數（華為香港官網）](https://consumer.huawei.com/hk/headphones/freeclip2-s/specs/)
- [HUAWEI FreeClip 2 S Specifications（HUAWEI Global）](https://consumer.huawei.com/en/headphones/freeclip2-s/specs/)
- [HUAWEI FreeClip 2 S Specifications（HUAWEI United Kingdom）](https://consumer.huawei.com/uk/headphones/freeclip2-s/specs/)
- [HUAWEI FreeClip 2 S Specifications（HUAWEI Singapore）](https://consumer.huawei.com/sg/headphones/freeclip2-s/specs/)
- [Gizmochina：Huawei launches FreeClip 2 S globally](https://www.gizmochina.com/2026/07/14/huawei-freeclip-2-s-earbuds-launched-specs-price/)
- [Huawei Central：FreeClip 2 Collector's Edition debuts globally as FreeClip 2 S](https://www.huaweicentral.com/huawei-freeclip-2-collectors-edition-debuts-globally-as-freeclip-2-s/)
- [unwire.hk：Huawei FreeClip 2 S 評測](https://unwire.hk/2026/09/18/huawei-freeclip2s-review/mobile-music/headphones/)
- [basic-tutorials：Huawei FreeClip 2 S Review](https://basic-tutorials.com/reviews/gadget-reviews/huawei-freeclip-2-s-review/)
- [Notebookcheck：华为推出 FreeClip 2 S](https://www.notebookcheck-cn.com/FreeClip-2-S.1342762.0.html)
