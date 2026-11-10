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
6. 编辑 PPT 时保留原稿字体与样式；无原稿约定时使用微软雅黑（Microsoft YaHei），文本和表格显式设置中文语言 `zh-CN`。不得仅为云端渲染方便，将交付 PPT 改成用户 Windows 未安装的思源黑体等字体。云端渲染如需替代字体，使用临时副本，保留交付文件的字体设置。
7. PPT 交付前检查正文、表格、母版的字体与语言设置，以及中文缺字、文本溢出和 PDF 导出；云端渲染通过不能代替用户 PowerPoint / WPS 的实际打开验证。
8. 当前主交付是在原始 PPT 上补充两页竞品算法信息：集中呈现适用场景、算法部署芯片/执行单元和资源规格。详细规格与来源保留在 Excel / 底稿，避免把材料扩写成宽泛的产品或技术综述。原始可编辑 PPT 未提供时，先准备内容，不将文字摘录当作原文件。

## 代码约定

- 代码在 `code/ssl_baseline/`；改动后运行 `python tests/test_basic.py`，保持全部通过。
- 仿真语音先 100 Hz 高通去直流（TTS 直流经混响放大会虚高功率，导致结果偏悲观）。
- numpy 1.x 用 `pyroomacoustics==0.7.4`；numpy 2.x 用最新版。
- 画图字体按顺序回退：Microsoft YaHei → Noto Sans CJK SC → WenQuanYi Zen Hei → SimHei；云端缺中文字体时可先 `apt-get install -y fonts-noto-cjk`。
- 结果输出到 `code/ssl_baseline/out/`，图片可复制到 `figures/`。

## 常用命令

```bash
cd code/ssl_baseline && pip install -r requirements.txt
python tests/test_basic.py
python scripts/run_closed_loop_demo.py
python scripts/run_tv_interference_demo.py
python scripts/run_static_eval.py --trials 100
```
