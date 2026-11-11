# 给 Claude 的项目说明

你在协助令狐雅熙（华为新加坡音视频芯片算法组实习生）完成声源定位工作。开始任何任务前，先读 `00_交接说明（网页继续用）.md`。

## 背景速记

- 场景一：摄像头定位声音方向并持续跟踪 = 语音唤醒（mentor 负责）+ 声源定位（本人）+ 波束成形（分工待确认）。
- 目标：2026 年 12 月底交付可演示的声源定位原型（唤醒词定向 + 持续跟踪 + 给波束成形 / 云台的方位与置信度）；每周与 mentor 讨论；先做 demo。
- 时间：11 月每周 2 天，12 月全职（每周 5 天）。排计划按这个来。

## 工作规则

1. 分清“查到的事实 / 我们的仿真 / 你的判断”，判断要标明；改结论时说明是哪条新证据。
2. 给 mentor 看的材料保持干净：不写元说明、不留 AI 痕迹，待补只用【待确认】等短标签。
3. 不猜测、不编造华为内部信息；不确定的列为待确认问题。仓库里不放华为内部资料。
4. 用中文交流，先结论后理由，落到具体下一步。
5. 有分工的部分只做本职（声源定位）；要扩展到唤醒或波束成形的实现，先问。

## 代码约定

- 代码在 `code/ssl_baseline/`；改动后运行 `python tests/test_basic.py`，保持全部通过。
- 仿真语音先 100 Hz 高通去直流（TTS 直流经混响放大会虚高功率，导致结果偏悲观）。
- numpy 1.x 用 `pyroomacoustics==0.7.4`；numpy 2.x 用最新版。
- 画图字体按顺序回退：Microsoft YaHei → Noto Sans CJK SC → WenQuanYi Zen Hei → SimHei；云端缺中文字体时可先 `apt-get install -y fonts-noto-cjk`。
- 结果输出到 `code/ssl_baseline/out/`，图片可复制到 `figures/`。
- PPT 保留原稿字体与样式；无原稿约定时用微软雅黑（Microsoft YaHei），文字和表格显式设置中文 `zh-CN`。不要为云端渲染方便把交付 PPT 换成 Windows 未安装的字体；渲染替代只在临时字体配置里处理。
- PPT 交付前检查实际文件中的字体与语言标签、文字完整与重叠、来源链接，以及 PDF 导出。
- 插入 mentor 调研 PPT 的页面按其样式：标题左上角微软雅黑 16 号加粗；表格表头 #134074 白字加粗，正文 #EAF2F8 与白色交替，表内微软雅黑 10 号，避免合并单元格；颜色逐格写死（不用 PowerPoint 内置表格样式，WPS 等软件可能不识别）；来源放备注；调研总结只写事实，不写建议与下一步；右下角留空给 logo。
- 每周结束时在 `实习工作记录.md` 追加一节（做了什么、产出、mentor 反馈、学到的、待确认、下周计划）。

## 常用命令

```bash
cd code/ssl_baseline && pip install -r requirements.txt
python tests/test_basic.py
python scripts/run_closed_loop_demo.py
python scripts/run_tv_interference_demo.py
python scripts/run_static_eval.py --trials 100
```
