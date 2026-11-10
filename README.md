# 声源定位（场景一）：摄像头定位声音方向并持续跟踪

华为新加坡音视频芯片算法组实习项目的个人工作仓库（私有）。场景一由**语音唤醒（mentor 负责）+ 声源定位（本人）+ 波束成形**组成；目标是 **2026 年 12 月底交付可演示的声源定位原型**，每周与 mentor 讨论。

> 新会话先读 [`00_交接说明（网页继续用）.md`](./00_交接说明（网页继续用）.md)：任务、方案、关键数字、计划、待确认问题都在里面。

## 目录

| 路径 | 内容 |
|---|---|
| `00_交接说明（网页继续用）.md` | 交接说明（最先读） |
| `code/ssl_baseline/` | 基线代码：SRP-PHAT + 起始段加权、圆周卡尔曼、云台状态机、房间仿真、评测、单元测试 |
| `场景一专项_汇报精简版.pptx / .pdf` | 周会主讲版（11 页） |
| `场景一专项_摄像头声源定位与跟踪_方案选型与数据集.pptx / .pdf` | 完整版（24 页） |
| `声源定位竞品调研_听声转向与发言人跟踪.pptx / .pdf` | 竞品调研（14 页，产品图仅供内部调研） |
| `声源定位调研清单_文献数据集工具竞品.xlsx` | 文献、数据集、工具、竞品、待确认问题 |
| `场景一专项_讲解手册（个人用）.docx / .pdf` | 讲稿、追问应答、方向说明、周会模板 |
| `figures/` | 仿真图与竞品产品图（附来源清单） |
| `_build/` | 生成 PPT / 手册 / 图的脚本；完整版 PPT：`cd _build && node build_ssl_deck.js`（需 pptxgenjs 与 pptx skill 的 `apply_theme.js`，路径用环境变量 `PPTX_SKILL`） |

## 运行代码（本地或云端）

```bash
cd code/ssl_baseline
pip install -r requirements.txt
python tests/test_basic.py                   # 单元测试
python scripts/run_static_eval.py --trials 100
python scripts/run_closed_loop_demo.py
python scripts/run_tv_interference_demo.py
python scripts/run_wake_doa_demo.py         # 唤醒词定向（电视干扰）
```

依赖说明：numpy 与 pyroomacoustics 版本要匹配——numpy 2.x 用最新版 pyroomacoustics；numpy 1.x（如 Anaconda 自带的 1.26）用 `pyroomacoustics==0.7.4`，否则可能段错误。

## 当前进度

- 已完成：调研与选型、竞品调研、初步仿真（静态测向、跟踪、闭环、电视干扰）、基线代码雏形
- 已完成（W1）：“唤醒词片段测向”接口（输入多通道音频 + 唤醒词起止样点，输出方位 + 置信度）与离线 demo；背景白化 GEVD-MUSIC 在电视干扰下明显优于 SRP-PHAT（见交接说明第 4 节）
- 下一步：首次周会对齐接口与 demo 硬件；换真实阵列几何重跑；W2 用 LOCATA 复核
