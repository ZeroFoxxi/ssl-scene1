// 竞品补充页（精简版，2 页）：竞品对比表；端侧 DOA 方案表（工业界 + 学术界）。朴素表格样式，用于插入 mentor 的调研 PPT。
const pptxgen = require("pptxgenjs");
const path = require("path");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, ".."), "竞品补充页_精简版.pptx");
const F = "Microsoft YaHei";
const C = { title: "1F2937", text: "262626", gray: "6B7280", head: "F2F2F2", line: "BFBFBF", na: "8C8C8C", link: "2F6EB5" };

const p = new pptxgen();
p.layout = "LAYOUT_WIDE";
p.title = "竞品补充页";

const T = (s, text, o) => s.addText(text, Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 12, color: C.text, margin: 0, valign: "top" }, o));
const NA = /^(未公开|未报告|—)/;
const cell = (t, o) => ({ text: t, options: Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 10.5, color: NA.test(t) ? C.na : C.text, valign: "middle" }, o) });
const head = (t) => cell(t, { bold: true, fill: { color: C.head }, align: "center" });

function slide(title, rows, colW, rowH, note, src) {
  const s = p.addSlide();
  s.background = { color: "FFFFFF" };
  T(s, title, { x: 0.5, y: 0.35, w: 12.3, h: 0.55, fontSize: 22, bold: true, color: C.title, valign: "middle" });
  s.addTable(rows, { x: 0.5, y: 1.1, w: colW.reduce((a, b) => a + b, 0), colW, rowH,
    margin: [0.04, 0.08, 0.04, 0.08], border: { type: "solid", pt: 0.75, color: C.line }, autoPage: false });
  if (note) T(s, note, { x: 0.5, y: 1.1 + rowH.reduce((a, b) => a + b, 0) + 0.2, w: 12.3, h: 0.3, fontSize: 10.5, color: C.gray });
  T(s, src.map((r, i) => [{ text: "[" + (i + 1) + "] " }, { text: r[0], options: { color: C.link, hyperlink: { url: r[1], tooltip: r[1] } } }, { text: i < src.length - 1 ? "　" : "" }]).flat(),
    { x: 0.5, y: 6.85, w: 12.3, h: 0.4, fontSize: 8.5, color: C.gray });
}

// ---------------- 第 1 页：竞品对比 ----------------
{
  const L = (t) => cell(t, { bold: true, fill: { color: C.head } });
  slide("竞品对比：萤石、思必驰", [
    [head(""), head("萤石 C6Wi 4K"), head("萤石 RK3"), head("思必驰 C60"), head("思必驰离线前端 SDK")],
    [L("形态"), cell("家用云台摄像机"), cell("桌面机器人（带云台摄像头）"), cell("会议追踪摄像机"), cell("离线语音前端 SDK")],
    [L("发布 / 价格"), cell("2021-12；商城 519–2,079 元（系列）"), cell("2025-07 前上市；商城 1,299 元"), cell("2023-07 展出；海外标价约 2,575 美元"), cell("—")],
    [L("麦克风"), cell("3 麦"), cell("2 麦"), cell("8 麦线阵"), cell("线阵 4 / 6 麦；另有环阵、双麦版")],
    [L("定位功能"), cell("听声辨位、声源追踪；云台水平 340°"), cell("180° 声源定位；云台水平 340°"), cell("语音定位 + 视觉锁定，云台特写"), cell("回声消除、定位、波束成形、唤醒一体；唤醒后回调方位")],
    [L("芯片"), cell("专用芯片，1.0T 算力（系列口径，型号未公开）"), cell("4 核 A55 1.5 GHz + NPU 3T"), cell("未公开"), cell("未公开（自研 TH1520 双 DSP、TH2608 含 NPU）")],
    [L("离线 / 在线"), cell("端侧运行；支持算法商店加载"), cell("未公开"), cell("未公开"), cell("离线")],
    [L("算法、执行单元、内存、模型、时延"), cell("未公开"), cell("未公开"), cell("未公开"), cell("未公开")],
  ], [2.2, 2.6, 2.4, 2.4, 2.7], [0.42, 0.55, 0.62, 0.55, 0.72, 0.72, 0.55, 0.55],
  "萤石商城在售摄像机中，仅见 C6Wi 标注“3MIC 听声辨位”；RK3 不是摄像机，因公开了 CPU / NPU 列作芯片参照。",
  [["萤石商城 C6WI", "https://www.ys7.com/item/165990.html"], ["萤石官网（1.0T 算力）", "https://www.ezviz.com/cn/news/6270.html"], ["萤石商城 RK3", "https://www.ys7.com/item/927621.html"],
   ["思必驰 C60", "https://meeting.aispeech.com/product/c60/"], ["DUI Linux SDK 手册", "https://www.duiopen.com/docs/ct_fesp_linux"], ["思必驰招股书（2026）", "https://dataclouds.cninfo.com.cn/sjother2/documents/2026/2026-05-25/1d4b495ace513224eeffac7f7ab4bfbf.pdf"]]);
}

// ---------------- 第 2 页：端侧 DOA 方案 ----------------
{
  const G = (t) => cell(t, { bold: true, align: "center", fill: { color: C.head } });
  const B = (t) => cell(t, { bold: true });
  slide("端侧 DOA 方案：工业界与学术界", [
    [head("类别"), head("方案（年份）"), head("麦克风"), head("方法"), head("参数量 / 内存"), head("计算量 / 耗时"), head("运行平台"), head("精度（原文口径）")],
    [G("工业界"), B("乐鑫 ESP-SR（官方文档）"), cell("4 麦圆阵，半径 5 cm"), cell("Capon / MVDR，10° 网格"), cell("内存约 206 KB"), cell("0.65 ms / 8 ms 帧，CPU 8.1%"), cell("ESP32-P4 400 MHz"), cell("官方仿真 ±10° 内 100%")],
    [{ text: "学术界\n传统方法", options: { rowspan: 2, fontFace: F, lang: "zh-CN", fontSize: 10.5, bold: true, align: "center", valign: "middle", fill: { color: C.head } } },
      B("SpeechCompass（2025）"), cell("4 麦"), cell("GCC-PHAT + 核密度估计"), cell("—"), cell("处理 < 20 ms"), cell("STM32L5（Cortex-M33 110 MHz）"), cell("对话语音误差 11.1–22.1°")],
    [B("SMP-PHAT（2022）"), cell("4 麦（ReSpeaker USB）"), cell("SRP-PHAT，合并麦克风对"), cell("—"), cell("约 0.10 ms / 帧"), cell("树莓派 4"), cell("平均误差 16.2°")],
    [{ text: "学术界\n神经网络", options: { rowspan: 3, fontFace: F, lang: "zh-CN", fontSize: 10.5, bold: true, align: "center", valign: "middle", fill: { color: C.head } } },
      B("IPDnet2-Tiny（2025）"), cell("4 麦圆阵，半径 3 cm + 中心麦"), cell("相位差估计网络"), cell("0.5 M 参数"), cell("0.2 GFLOPs/s（未在设备上实测）"), cell("—"), cell("实录 5° 容差，误差 1.6°")],
    [B("SELDnet 端侧评测（2024）"), cell("4 通道"), cell("CRNN"), cell("0.84–0.89 M 参数"), cell("推理 0.17–0.22 s / 2 s 音频"), cell("树莓派 3"), cell("声音事件任务，不可直接比")],
    [B("Cross3D-Edge（2025）"), cell("12 麦"), cell("SRP-PHAT + 3D CNN"), cell("0.14 M 参数；片上内存 0.82 MB"), cell("127 MFLOPS；8.59 ms / 帧"), cell("树莓派 4B"), cell("LOCATA Task 1 误差 4.1°")],
  ], [1.0, 2.15, 1.6, 1.6, 1.5, 1.65, 1.65, 1.2], [0.42, 0.62, 0.55, 0.55, 0.62, 0.55, 0.62],
  "4 麦且在设备上实测过的神经网络模型较少；IPDnet2 只报告计算量。各方案数据集与指标不同，精度仅供量级参考。",
  [["乐鑫 ESP-SR DOA", "https://docs.espressif.com/projects/esp-sr/en/latest/esp32p4/direction_of_arrival/README.html"], ["SpeechCompass（arXiv 2502.08848）", "https://arxiv.org/abs/2502.08848"],
   ["SMP-PHAT（arXiv 2203.14409）", "https://arxiv.org/abs/2203.14409"], ["IPDnet2（arXiv 2509.21900）", "https://arxiv.org/abs/2509.21900"],
   ["SELD 端侧评测（arXiv 2409.11700）", "https://arxiv.org/abs/2409.11700"], ["Cross3D-Edge（arXiv 2503.02046）", "https://arxiv.org/abs/2503.02046"]]);
}

require("./zh_notes")(p, OUT);
