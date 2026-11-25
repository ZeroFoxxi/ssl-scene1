# 声源定位实习工作仓库

华为新加坡音视频芯片算法组实习的个人工作仓库，负责**声源定位（SSL）**技术预研。

- **场景一：摄像头定位说话人并持续跟踪** = 语音唤醒（mentor 负责）+ 声源定位（本人）+ 波束成形。目标是 2026 年 12 月底交付可演示的声源定位原型。
- **耳机 demo：无障碍听觉辅助**：耳机声源定位为主，摄像头（人脸 + 唇动检测）为辅，先做说话人位置固定的场景；11 月底交整体技术方案 + 算法选型，12 月出仿真效果。任务与追踪见 [`02_耳机声源定位/README.md`](./02_耳机声源定位/README.md)。

> 新会话先读 [`记录/00_交接说明（网页继续用）.md`](./记录/00_交接说明（网页继续用）.md)；按周的进展见 [`记录/实习工作记录.md`](./记录/实习工作记录.md)。

## 目录

```
├── 记录/                              交接说明、按周的实习工作记录、mentor 沟通纪要、学习笔记
├── 01_场景一_摄像头声源定位/
│   ├── 方案选型/                      方法选型 PPT（完整版 24 页、精简版 11 页）、讲解手册
│   ├── 竞品调研/                      竞品调研 PPT、竞品规格调研、竞品补充页（mentor 认可版）、公开参照方案汇总
│   │   └── 旧版/                      早期卡片式竞品补充页
│   ├── 训练数据/                      训练数据方案与采集计划（PPT + Excel）
│   ├── 技术总结/                      声源定位 + 波束成形技术总结（会议系统为主，智能家居简述）
│   └── 声源定位调研清单_文献数据集工具竞品.xlsx
├── 02_耳机声源定位/                   耳机 + 摄像头 demo（无障碍听觉辅助）：任务说明与追踪
│   └── 资料/                          项目设计资料（内部材料，仅限本私有仓库）
├── code/ssl_baseline/                基线代码：测向、唤醒词定向、跟踪、云台状态机、仿真、评测、单元测试
├── figures/                          仿真图与竞品产品图（附图片来源清单）
└── _build/                           生成 PPT / Excel / 手册的脚本与数据源
```

### 场景一的主要文件

| 文件 | 用途 |
|---|---|
| `技术总结/声源定位与波束成形技术总结.pptx / .pdf` | 11-25 mentor 布置：声源定位 + 波束成形总结（技术原理、大 / 小模型、连云 / 端侧、友商竞品；会议系统为主，智能家居简述），共 12 页（含竞品部署与资源、本项目选型）；生成脚本 `_build/build_ssl_bf_summary_deck.js`，共用样式 `_build/deck_style.js` |
| `竞品调研/竞品补充页_精简版.pptx` | 插入 mentor 调研 PPT 的竞品页（4 页，mentor 认可版） |
| `竞品调研/竞品规格调研_萤石与思必驰.*` | 萤石、思必驰的内存、模型、执行单元、离线 / 在线、时延核查 |
| `竞品调研/公开参照方案汇总.*` | 竞品未公开时的资源与效果参照，含 2026 年文献核查表 |
| `训练数据/训练数据方案与采集计划.*` | 数据集按用途选型（许可已核实）、仿真方案、自采集方案 |
| `方案选型/场景一专项_摄像头声源定位与跟踪_方案选型与数据集.*` | 方法选型完整版 |

## 重新生成材料

生成脚本默认输出到上面对应的文件夹（可用环境变量 `OUT_DIR` 改输出位置）。需要 Node（pptxgenjs）与 Python（openpyxl）；部分脚本用到 pptx skill 的 `apply_theme.js`，路径由环境变量 `PPTX_SKILL` 指定。

```bash
python _build/spec_data.py && node _build/build_spec_deck.js          # 竞品规格调研
python _build/ref_data.py  && node _build/build_ref_deck.js           # 公开参照方案汇总
python _build/data_plan.py && node _build/build_data_plan_deck.js     # 训练数据方案
node _build/build_comp_simple.js                                      # 竞品补充页（mentor 认可版）
node _build/build_ssl_deck.js                                         # 方法选型完整版
```

## 运行代码

```bash
cd code/ssl_baseline
pip install -r requirements.txt
python tests/test_basic.py                   # 单元测试
python scripts/run_static_eval.py --trials 100
python scripts/run_closed_loop_demo.py
python scripts/run_tv_interference_demo.py
python scripts/run_wake_doa_demo.py         # 唤醒词定向（电视干扰）
python scripts/run_meeting_eval.py          # 会议室换人测向（场景一选型）
```

依赖说明：numpy 与 pyroomacoustics 版本要匹配——numpy 2.x 用最新版 pyroomacoustics；numpy 1.x（如 Anaconda 自带的 1.26）用 `pyroomacoustics==0.7.4`，否则可能段错误。

## 当前进度

见 [`记录/实习工作记录.md`](./记录/实习工作记录.md)。
