// 竞品补充页（精简版，3 页，朴素表格）：竞品对比；端侧声源定位方案（设备实测）；学术界轻量模型。用于插入 mentor 的调研 PPT。
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
let FS = 10.5;
const cell = (t, o) => ({ text: t, options: Object.assign({ fontFace: F, lang: "zh-CN", fontSize: FS, color: NA.test(t) ? C.na : C.text, valign: "middle" }, o) });
const head = (t, o) => cell(t, Object.assign({ bold: true, fill: { color: C.head }, align: "center" }, o));
const L = (t, o) => cell(t, Object.assign({ bold: true, fill: { color: C.head } }, o));
const B = (t, o) => cell(t, Object.assign({ bold: true }, o));

function slide(title, rows, colW, rowH, notes, src, y0) {
  y0 = y0 || 1.0;
  const s = p.addSlide();
  s.background = { color: "FFFFFF" };
  T(s, title, { x: 0.5, y: 0.3, w: 12.3, h: 0.55, fontSize: 22, bold: true, color: C.title, valign: "middle" });
  s.addTable(rows, { x: 0.5, y: y0, w: colW.reduce((a, b) => a + b, 0), colW, rowH,
    margin: [0.03, 0.07, 0.03, 0.07], border: { type: "solid", pt: 0.75, color: C.line }, autoPage: false });
  s.addNotes((notes || []).join("\n") + "\n\n来源：\n" + src.map((r, i) => (i + 1) + ". " + r[0] + "：" + r[1]).join("\n"));
  return s;
}
const IMG = (n) => path.join(__dirname, "..", "figures", "竞品产品图", n);
// 在表头单元格上半部放产品图（按比例缩放、居中）
function headImages(s, x0, y0, colW, h, imgs) {
  let x = x0;
  colW.forEach((w, i) => {
    const im = imgs[i];
    if (im) {
      const [file, iw, ih] = im, bw = w - 0.3, bh = h;
      const k = Math.min(bw / iw, bh / ih), dw = iw * k, dh = ih * k;
      s.addImage({ path: IMG(file), x: x + (w - dw) / 2, y: y0 + (bh - dh) / 2, w: dw, h: dh, altText: file });
    }
    x += w;
  });
}

// ---------------- 第 1 页：竞品对比 ----------------
const P1W = [1.45, 2.3, 2.05, 2.15, 2.1, 2.25];
FS = 10;
const HB = (t) => head(t, { valign: "bottom", fill: { color: "FFFFFF" } });
const p1 = slide("竞品对比：萤石、思必驰", [
  [HB(""), HB("萤石 C6Wi 4K"), HB("萤石 RK3（芯片参照）"), HB("思必驰 C60"), HB("思必驰 MT200"), HB("思必驰离线前端 SDK（fespl）")],
  [L("形态"), cell("家用云台摄像机"), cell("桌面机器人（带云台摄像头、7 英寸屏）"), cell("会议追踪摄像机"), cell("会议追踪主机（外接吊顶麦 + 多台摄像机）"), cell("离线语音前端 SDK")],
  [L("发布 / 价格"), cell("2021-12；商城 519–2,079 元（系列）"), cell("2025-07 前上市；商城 1,299 元"), cell("2023-07 展出；海外标价约 2,575 美元"), cell("2026-07 发布；价格未公开"), cell("—")],
  [L("麦克风"), cell("3 麦"), cell("2 麦"), cell("8 麦线阵"), cell("外接吊顶麦克风"), cell("线阵 4 / 6 麦；另有环阵、家居双麦版")],
  [L("规格"), cell("4K；Wi-Fi 5 + 网口；云台水平 340° / 垂直 125°"), cell("400 万像素；云台水平 340°；Wi-Fi 6"), cell("双 1080P：特写 12× 变焦 + 全景 110°"), cell("支持 C40T、C60、C80 摄像机"), cell("输入 16 kHz、16 bit 多通道")],
  [L("定位流程"), cell("声音触发 → 听声辨位 → 云台转向 → AI 追踪"), cell("180° 声源定位；语音问答"), cell("语音定位 → 视觉锁定 → 云台特写"), cell("吊顶麦定位 + 画面匹配；需标定麦克风与摄像机位置，无需预设机位"), cell("回声消除、定位、波束成形、唤醒一体；唤醒后回调方位 {\"doa\": 95}；留声纹接口")],
  [L("产品芯片"), cell("专用芯片，1.0T 算力（系列口径，型号未公开）"), cell("4 核 A55 1.5 GHz + NPU 3T"), cell("未公开"), cell("未公开"), cell("未公开")],
  [L("公司芯片线索"), cell("早期 C6C：4 麦，公司级声源定位识别率 86.0%（实验室）；SoC 供应商：富瀚微、海思、厦门威欣（公司口径）", { colspan: 2 }),
    cell("自研 TH1520（双 DSP，常开毫瓦级）、TH2608（Cortex-M + DSP + NPU）；已适配 34 种芯片架构，侧重低功耗芯片", { colspan: 3 })],
  [L("离线 / 在线"), cell("端侧运行；支持算法商店加载"), cell("未公开"), cell("未公开"), cell("未公开"), cell("离线")],
  [L("算法、执行单元、内存、模型、时延"), cell("未公开"), cell("未公开"), cell("未公开"), cell("未公开"), cell("未公开")],
], P1W, [1.3, 0.48, 0.5, 0.45, 0.55, 0.72, 0.5, 0.62, 0.45, 0.5],
["萤石商城在售摄像机中，仅见 C6Wi 标注“3MIC 听声辨位”。RK3 不是摄像机，公开了 CPU / NPU，列作芯片参照。MT200 用外接吊顶麦，与摄像机内置小阵列条件不同。"],
[["萤石商城 C6WI", "https://www.ys7.com/item/165990.html"], ["萤石官网（1.0T 算力）", "https://www.ezviz.com/cn/news/6270.html"], ["萤石问询回复", "https://pdf.dfcfw.com/pdf/H2_AN202205051563734391_1.pdf"],
 ["萤石商城 RK3", "https://www.ys7.com/item/927621.html"], ["思必驰 C60", "https://meeting.aispeech.com/product/c60/"], ["思必驰会议产品（MT200）", "https://meeting.aispeech.com/"],
 ["DUI Linux SDK 手册", "https://www.duiopen.com/docs/ct_fesp_linux"], ["思必驰招股书（2026）", "https://dataclouds.cninfo.com.cn/sjother2/documents/2026/2026-05-25/1d4b495ace513224eeffac7f7ab4bfbf.pdf"]], 0.95);
headImages(p1, 0.5, 1.0, P1W, 0.85, [null, ["ezviz_c6wi_4k.jpg", 800, 800], ["ezviz_rk3.jpg", 502, 773], ["aispeech_c60.jpg", 1200, 563], ["aispeech_mt200.jpg", 1200, 484], null]);
T(p1, "软件 SDK，无产品实物", { x: 0.5 + P1W.slice(0, 5).reduce((a, b) => a + b, 0), y: 1.0, w: P1W[5], h: 0.85, fontSize: 10, color: C.na, align: "center", valign: "middle" });

// ---------------- 第 2 页：端侧声源定位方案（设备实测） ----------------
FS = 10.5;
const G = (t, n) => cell(t, { rowspan: n, bold: true, align: "center", fill: { color: C.head } });
slide("端侧声源定位方案：设备实测的资源与耗时", [
  [head("类别"), head("方案（年份）"), head("麦克风"), head("方法"), head("参数量 / 内存"), head("计算量 / 耗时"), head("运行平台"), head("精度（原文指标）")],
  [G("工业界", 2), B("乐鑫 ESP-SR（官方文档）"), cell("4 麦圆阵，半径 5 cm（支持 2–8 麦）"), cell("Capon / MVDR，10° 网格"), cell("内存约 206 KB"), cell("0.65 ms / 8 ms 帧，CPU 8.1%"), cell("ESP32-P4 400 MHz"), cell("官方仿真 ±10° 内 100%")],
  [B("XMOS XVF3800"), cell("4 麦（线阵 / 方阵）"), cell("未公开；可读说话人方位"), cell("未公开"), cell("未公开"), cell("专用语音芯片"), cell("未公开")],
  [G("学术界\n传统方法", 3), B("SpeechCompass（2025）"), cell("4 麦"), cell("GCC-PHAT + 核密度估计"), cell("—"), cell("处理 < 20 ms"), cell("STM32L5（Cortex-M33 110 MHz）"), cell("对话语音误差 11.1–22.1°")],
  [B("SMP-PHAT（2022）"), cell("4 麦（ReSpeaker USB）"), cell("SRP-PHAT，合并麦克风对"), cell("—"), cell("约 0.10 ms / 帧"), cell("树莓派 4（开发板）"), cell("平均误差 16.2°")],
  [B("ODAS（2021）"), cell("8 麦"), cell("SRP-PHAT 层级搜索 + 卡尔曼跟踪"), cell("—"), cell("定位单核 14%；跟踪 1 个声源 0.8%"), cell("树莓派 3（开发板）"), cell("—")],
  [G("学术界\n神经网络", 2), B("SELDnet 端侧评测（2024）"), cell("4 通道"), cell("CRNN"), cell("0.84–0.89 M 参数"), cell("推理 0.17–0.22 s / 2 s 音频"), cell("树莓派 3（开发板）"), cell("声音事件任务，不可直接比")],
  [B("Cross3D-Edge（2025）"), cell("12 麦"), cell("SRP-PHAT + 3D CNN"), cell("0.14 M 参数；片上内存 0.82 MB"), cell("127 MFLOPS；8.59 ms / 帧"), cell("树莓派 4B（开发板）"), cell("LOCATA Task 1 误差 4.1°")],
], [0.95, 2.3, 1.55, 1.75, 1.45, 1.6, 1.5, 1.2], [0.51, 0.82, 0.67, 0.77, 0.67, 0.77, 0.73, 0.77],
["ESP32-P4、STM32L5 为芯片级平台；树莓派为通用开发板，算力更宽裕，只作量级参考。各方案数据集与指标不同，精度不可直接比较。DOA 即声源到达方向估计。"],
[["乐鑫 ESP-SR DOA", "https://docs.espressif.com/projects/esp-sr/en/latest/esp32p4/direction_of_arrival/README.html"], ["XMOS XVF3800", "https://www.xmos.com/documentation/XM-014888-PC/html/modules/fwk_xvf/doc/user_guide/03_using_the_host_application.html"],
 ["SpeechCompass（arXiv 2502.08848）", "https://arxiv.org/abs/2502.08848"], ["SMP-PHAT（arXiv 2203.14409）", "https://arxiv.org/abs/2203.14409"], ["ODAS（arXiv 2103.03954）", "https://arxiv.org/abs/2103.03954"],
 ["SELD 端侧评测（arXiv 2409.11700）", "https://arxiv.org/abs/2409.11700"], ["Cross3D-Edge（arXiv 2503.02046）", "https://arxiv.org/abs/2503.02046"]]);

// ---------------- 第 3 页：学术界轻量模型（参数量 / 计算量） ----------------
FS = 12;
const cond = cell("RealMAN 实录；4 麦圆阵（半径 3 cm）+ 中心麦；两人说话混合（IPDnet2 论文，2025-09）", { rowspan: 5 });
slide("学术界轻量声源定位模型：参数量与计算量", [
  [head("模型（年份）"), head("评测条件"), head("参数量"), head("计算量（论文报告）"), head("精度（原文指标）")],
  [B("SRP-DNN"), cond, cell("0.8 M"), cell("7.7 GFLOPs/s"), cell("5° 容差：漏检 18.6%、虚警 10.8%、误差 1.6°")],
  [B("TF-Mamba"), cell("1.6 M"), cell("36.6 GFLOPs/s"), cell("漏检 11.8%、虚警 9.4%、误差 1.4°")],
  [B("IPDnet2-Tiny（2025）"), cell("0.5 M"), cell("0.2 GFLOPs/s"), cell("漏检 17.4%、虚警 11.8%、误差 1.6°")],
  [B("IPDnet2-Small（2025）"), cell("1.3 M"), cell("0.9 GFLOPs/s"), cell("漏检 13.5%、虚警 9.5%、误差 1.4°")],
  [B("IPDnet2-Large（2025）"), cell("7.8 M"), cell("13.9 GFLOPs/s"), cell("漏检 10.5%、虚警 6.6%、误差 1.2°")],
  [B("LightDOA（2025-11）"), cell("仅仿真；2 麦，间距 16–18 cm；单声源"), cell("37 k"), cell("未报告"), cell("10° 分类准确率 71.7%（同条件 CRNN 309 k：71.1%）")],
  [B("DCASE 2025 Task 3"), cell("立体声实录视频；13 类声音事件、多声源"), cell("第 1 名 58.5 M（集成）；官方基线 0.73 M"), cell("未报告"), cell("DOA 误差：第 1 名 12.2°；基线 23.0°")],
], [2.2, 3.1, 2.0, 1.9, 3.1], [0.58, 0.72, 0.72, 0.72, 0.72, 0.72, 0.84, 0.84],
["本页模型均未在芯片或开发板上实测，计算量为论文报告值。",
 "截至 2026-11：2026 年新论文均未报参数量与计算量；2026-07 综述汇总的最新实录方法到 IPDnet2 为止。"],
[["IPDnet2（arXiv 2509.21900）", "https://arxiv.org/abs/2509.21900"], ["LightDOA（arXiv 2511.08012）", "https://arxiv.org/abs/2511.08012"],
 ["DCASE 2025 Task 3 结果", "https://dcase.community/challenge2025/task-stereo-sound-event-localization-and-detection-in-regular-video-content-results"],
 ["空间语音感知综述（arXiv 2607.02296）", "https://arxiv.org/abs/2607.02296"]]);

require("./zh_notes")(p, OUT);
