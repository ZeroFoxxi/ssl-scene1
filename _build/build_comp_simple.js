// 竞品补充页（精简版，3 页，深蓝表头 + 浅蓝交替表格；标题微软雅黑 16 加粗，表内 10 号）：竞品对比；端侧声源定位方案（设备实测）；学术界轻量模型。用于插入 mentor 的调研 PPT。
const pptxgen = require("pptxgenjs");
const path = require("path");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, ".."), "竞品补充页_精简版.pptx");
const F = "Microsoft YaHei";
const C = { title: "000000", text: "000000", gray: "595959", head: "134074", band: "EAF2F8", band2: "FFFFFF", line: "D0D7E1", na: "7F7F7F" };

const p = new pptxgen();
p.layout = "LAYOUT_WIDE";
p.title = "竞品补充页";

const T = (s, text, o) => s.addText(text, Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 12, color: C.text, margin: 0, valign: "top" }, o));
const NA = /^(未公开|未报告|—)/;
const FS = 10;
const cell = (t, o) => ({ text: t, options: Object.assign({ fontFace: F, lang: "zh-CN", fontSize: FS, color: NA.test(t) ? C.na : C.text, valign: "middle" }, o) });
const head = (t, o) => cell(t, Object.assign({ bold: true, color: "FFFFFF", fill: { color: C.head }, align: "center" }, o));
const L = (t, o) => cell(t, o);
const B = (t, o) => cell(t, o);

const Y0 = 0.85;
function slide(title, rows, colW, rowH, notes, src) {
  const s = p.addSlide();
  s.background = { color: "FFFFFF" };
  T(s, title, { x: 0.5, y: 0.3, w: 12.3, h: 0.45, fontSize: 16, bold: true, color: C.title, valign: "middle" });
  // 表头深蓝（#134074）白字加粗；正文浅蓝（#EAF2F8）与白色逐行交替；浅灰蓝细边框；带 img 标记的图片行保持白底且不参与交替
  let k = 0;
  rows.forEach((r, i) => {
    if (i === 0) return;
    const fill = r.img ? "FFFFFF" : (k % 2 === 0 ? C.band : C.band2);
    if (!r.img) k++;
    r.forEach((c) => { if (!c.options.fill) c.options.fill = { color: fill }; });
  });
  s.addTable(rows, { x: 0.5, y: Y0, w: colW.reduce((a, b) => a + b, 0), colW, rowH,
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
const IMGROW = Object.assign(P1W.map(() => cell("")), { img: true });
const p1 = slide("竞品对比：萤石、思必驰", [
  [head(""), head("萤石 C6Wi 4K"), head("萤石 RK3（芯片参照）"), head("思必驰 C60"), head("思必驰 MT200"), head("思必驰离线前端 SDK")],
  IMGROW,
  [L("形态"), cell("家用云台摄像机"), cell("桌面机器人（带云台摄像头、7 英寸屏）"), cell("会议追踪摄像机"), cell("会议追踪主机（外接吊顶麦 + 多台摄像机）"), cell("离线语音前端 SDK：线阵版 fespl、环阵版 fespa、家居双麦版 fespd")],
  [L("发布 / 价格"), cell("2021-12；商城 519–2,079 元（系列）"), cell("2025-07 前上市；商城 1,299 元"), cell("2023-07 展出；海外标价约 2,575 美元"), cell("2026-07 发布；价格未公开"), cell("—")],
  [L("麦克风"), cell("3 麦"), cell("2 麦"), cell("8 麦线阵"), cell("外接吊顶麦克风"), cell("线阵 4 / 6 麦；环阵（麦数未注明）；家居双麦")],
  [L("规格"), cell("4K；Wi-Fi 5 + 网口；云台水平 340° / 垂直 125°"), cell("400 万像素；云台水平 340°；Wi-Fi 6"), cell("双 1080P：特写 12× 变焦 + 全景 110°"), cell("支持 C40T、C60、C80 摄像机"), cell("输入 16 kHz、16 bit 多通道")],
  [L("定位流程"), cell("声音触发 → 听声辨位 → 云台转向 → AI 追踪"), cell("180° 声源定位；语音问答"), cell("语音定位 → 视觉锁定 → 云台特写"), cell("吊顶麦定位 + 画面匹配；需标定麦克风与摄像机位置，无需预设机位"), cell("回声消除、定位、波束成形、唤醒一体；三个版本均在唤醒后回调方位 {\"doa\": 95}")],
  [L("产品芯片"), cell("专用芯片，1.0T 算力（系列口径，型号未公开）"), cell("4 核 A55 1.5 GHz + NPU 3T"), cell("未公开"), cell("未公开"), cell("未公开")],
  [L("公司芯片线索"), cell("早期 C6C：4 麦，公司级声源定位识别率 86.0%（实验室）；SoC 供应商：富瀚微、海思、厦门威欣（公司口径）", { colspan: 2 }),
    cell("自研 TH1520（双 DSP，常开毫瓦级）、TH2608（Cortex-M + DSP + NPU）；已适配 34 种芯片架构，侧重低功耗芯片", { colspan: 3 })],
  [L("离线 / 在线"), cell("端侧运行；支持算法商店加载"), cell("未公开"), cell("未公开"), cell("未公开"), cell("离线")],
  [L("算法、执行单元、内存、模型、时延"), cell("未公开"), cell("未公开"), cell("未公开"), cell("未公开"), cell("未公开")],
], P1W, [0.36, 0.95, 0.45, 0.48, 0.42, 0.5, 0.66, 0.48, 0.58, 0.42, 0.48],
["萤石商城在售摄像机中，仅见 C6Wi 标注“3MIC 听声辨位”。RK3 不是摄像机，公开了 CPU / NPU，列作芯片参照。MT200 用外接吊顶麦，与摄像机内置小阵列条件不同。"],
[["萤石商城 C6WI", "https://www.ys7.com/item/165990.html"], ["萤石官网（1.0T 算力）", "https://www.ezviz.com/cn/news/6270.html"], ["萤石问询回复", "https://pdf.dfcfw.com/pdf/H2_AN202205051563734391_1.pdf"],
 ["萤石商城 RK3", "https://www.ys7.com/item/927621.html"], ["思必驰 C60", "https://meeting.aispeech.com/product/c60/"], ["思必驰会议产品（MT200）", "https://meeting.aispeech.com/"],
 ["DUI Linux SDK 手册", "https://www.duiopen.com/docs/ct_fesp_linux"], ["思必驰招股书（2026）", "https://dataclouds.cninfo.com.cn/sjother2/documents/2026/2026-05-25/1d4b495ace513224eeffac7f7ab4bfbf.pdf"]]);
const IMG_Y = Y0 + 0.36;
headImages(p1, 0.5, IMG_Y + 0.07, P1W, 0.81, [null, ["ezviz_c6wi_4k.jpg", 800, 800], ["ezviz_rk3.jpg", 502, 773], ["aispeech_c60.jpg", 1200, 563], ["aispeech_mt200.jpg", 1200, 484], null]);
// 离线前端 SDK 为软件，无产品图：画三个版本的阵列示意（线阵 4 / 6 麦、环阵、家居双麦）
{
  const x0 = 0.5 + P1W.slice(0, 5).reduce((a, b) => a + b, 0), d = 0.1, cy = IMG_Y + 0.36, ly = IMG_Y + 0.64;
  const dot = (x, y) => p1.addShape(p.shapes.OVAL, { x: x - d / 2, y: y - d / 2, w: d, h: d, fill: { color: "595959" }, line: { type: "none" } });
  const lab = (t, cx, w) => T(p1, t, { x: cx - w / 2, y: ly, w, h: 0.2, fontSize: 8.5, color: C.gray, align: "center", valign: "middle" });
  // 线阵 6 点（4 麦 / 6 麦）
  const lx = x0 + 0.15, g = 0.15;
  p1.addShape(p.shapes.LINE, { x: lx, y: cy, w: g * 5, h: 0, line: { color: "BFBFBF", width: 1 } });
  for (let k = 0; k < 6; k++) dot(lx + k * g, cy);
  lab("线阵 4 / 6 麦", lx + g * 2.5, 0.95);
  // 环阵（麦数未注明，画圆环 + 6 点示意）
  const rcx = x0 + 1.33, r = 0.17;
  p1.addShape(p.shapes.OVAL, { x: rcx - r, y: cy - r, w: 2 * r, h: 2 * r, fill: { type: "none" }, line: { color: "BFBFBF", width: 1 } });
  for (let k = 0; k < 6; k++) dot(rcx + r * Math.cos(k * Math.PI / 3), cy + r * Math.sin(k * Math.PI / 3));
  lab("环阵", rcx, 0.6);
  // 家居双麦
  const dcx = x0 + 1.9;
  p1.addShape(p.shapes.LINE, { x: dcx - 0.1, y: cy, w: 0.2, h: 0, line: { color: "BFBFBF", width: 1 } });
  dot(dcx - 0.1, cy); dot(dcx + 0.1, cy);
  lab("家居双麦", dcx, 0.6);
}

// ---------------- 第 2 页：端侧声源定位方案（设备实测） ----------------
slide("端侧声源定位方案：设备实测的资源与耗时", [
  [head("类别"), head("方案（年份）"), head("麦克风"), head("方法"), head("能力"), head("参数量 / 内存"), head("计算量 / 耗时"), head("运行平台"), head("精度（原文指标）")],
  [cell("工业界"), B("乐鑫 ESP-SR（官方文档）"), cell("4 麦圆阵，半径 5 cm"), cell("Capon / MVDR，10° 网格"), cell("单声源测向"), cell("内存约 206 KB"), cell("0.65 ms / 8 ms 帧，CPU 8.1%"), cell("ESP32-P4 400 MHz"), cell("官方仿真 ±10° 内 100%")],
  [cell("工业界"), B("XMOS XVF3800"), cell("4 麦（线阵 / 方阵）"), cell("未公开"), cell("输出说话人方位"), cell("未公开"), cell("未公开"), cell("专用语音芯片"), cell("未公开")],
  [cell("学术界\n传统方法"), B("SpeechCompass（2025）"), cell("4 麦"), cell("GCC-PHAT + 核密度估计"), cell("多人对话，按方向区分"), cell("—"), cell("处理 < 20 ms"), cell("STM32L5（M33 110 MHz）"), cell("对话语音误差 11.1–22.1°")],
  [cell("学术界\n传统方法"), B("SMP-PHAT（2022）"), cell("4 麦（ReSpeaker）"), cell("SRP-PHAT，合并麦克风对"), cell("测向，无跟踪"), cell("—"), cell("约 0.10 ms / 帧"), cell("树莓派 4（开发板）"), cell("平均误差 16.2°")],
  [cell("学术界\n传统方法"), B("ODAS（2021）"), cell("8 麦"), cell("SRP-PHAT 层级搜索"), cell("多声源定位 + 卡尔曼跟踪"), cell("—"), cell("定位单核 14%；跟踪 0.8%"), cell("树莓派 3（开发板）"), cell("—")],
  [cell("学术界\n神经网络"), B("SELDnet 端侧评测（2024）"), cell("4 通道"), cell("CRNN"), cell("多声源：事件检测 + 定位"), cell("0.84–0.89 M 参数"), cell("推理 0.17–0.22 s / 2 s 音频"), cell("树莓派 3（开发板）"), cell("声音事件任务，不可直接比")],
  [cell("学术界\n神经网络"), B("Cross3D-Edge（2025）"), cell("12 麦"), cell("SRP-PHAT + 3D CNN"), cell("单声源，含移动声源跟踪"), cell("0.14 M 参数；片上内存 0.82 MB"), cell("127 MFLOPS；8.59 ms / 帧"), cell("树莓派 4B（开发板）"), cell("LOCATA Task 1 误差 4.1°")],
], [0.9, 1.95, 1.3, 1.45, 1.45, 1.35, 1.4, 1.3, 1.2], [0.5, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7],
["ESP32-P4、STM32L5 为芯片级平台；树莓派为通用开发板，算力更宽裕，只作量级参考。各方案数据集与指标不同，精度不可直接比较。DOA 即声源到达方向估计。"],
[["乐鑫 ESP-SR DOA", "https://docs.espressif.com/projects/esp-sr/en/latest/esp32p4/direction_of_arrival/README.html"], ["XMOS XVF3800", "https://www.xmos.com/documentation/XM-014888-PC/html/modules/fwk_xvf/doc/user_guide/03_using_the_host_application.html"],
 ["SpeechCompass（arXiv 2502.08848）", "https://arxiv.org/abs/2502.08848"], ["SMP-PHAT（arXiv 2203.14409）", "https://arxiv.org/abs/2203.14409"], ["ODAS（arXiv 2103.03954）", "https://arxiv.org/abs/2103.03954"],
 ["SELD 端侧评测（arXiv 2409.11700）", "https://arxiv.org/abs/2409.11700"], ["Cross3D-Edge（arXiv 2503.02046）", "https://arxiv.org/abs/2503.02046"]]);

// ---------------- 第 3 页：学术界轻量模型（参数量 / 计算量） ----------------
const COND = "RealMAN 实录，4 + 1 麦（半径 3 cm）；5° 容差", ABIL = "多声源，支持移动声源";
slide("学术界轻量声源定位模型：参数量与计算量", [
  [head("模型（年份）"), head("评测条件"), head("能力"), head("参数量"), head("计算量（论文报告）"), head("精度（原文指标）")],
  [B("SRP-DNN（IPDnet2 论文对比）"), cell(COND), cell(ABIL), cell("0.8 M"), cell("7.7 GFLOPs/s"), cell("漏检 18.6%、虚警 10.8%、误差 1.6°")],
  [B("TF-Mamba（IPDnet2 论文对比）"), cell(COND), cell(ABIL), cell("1.6 M"), cell("36.6 GFLOPs/s"), cell("漏检 11.8%、虚警 9.4%、误差 1.4°")],
  [B("IPDnet2-Tiny（2025）"), cell(COND), cell(ABIL), cell("0.5 M"), cell("0.2 GFLOPs/s"), cell("漏检 17.4%、虚警 11.8%、误差 1.6°")],
  [B("IPDnet2-Small（2025）"), cell(COND), cell(ABIL), cell("1.3 M"), cell("0.9 GFLOPs/s"), cell("漏检 13.5%、虚警 9.5%、误差 1.4°")],
  [B("IPDnet2-Large（2025）"), cell(COND), cell(ABIL), cell("7.8 M"), cell("13.9 GFLOPs/s"), cell("漏检 10.5%、虚警 6.6%、误差 1.2°")],
  [B("LightDOA（2025-11）"), cell("仅仿真；2 麦，间距 16–18 cm"), cell("单声源"), cell("37 k"), cell("未报告"), cell("10° 分类准确率 71.7%（同条件 CRNN 71.1%）")],
  [B("DCASE 2025 Task 3"), cell("立体声实录视频；13 类声音事件"), cell("多声源；含距离、画面内外"), cell("第 1 名 58.5 M；基线 0.73 M"), cell("未报告"), cell("DOA 误差：第 1 名 12.2°；基线 23.0°")],
], [2.4, 2.75, 1.7, 1.45, 1.4, 2.6], [0.45, 0.66, 0.66, 0.66, 0.66, 0.66, 0.66, 0.66],
["本页模型均未在芯片或开发板上实测，计算量为论文报告值。",
 "截至 2026-11：2026 年新论文均未报参数量与计算量；2026-07 综述汇总的最新实录方法到 IPDnet2 为止。"],
[["IPDnet2（arXiv 2509.21900）", "https://arxiv.org/abs/2509.21900"], ["LightDOA（arXiv 2511.08012）", "https://arxiv.org/abs/2511.08012"],
 ["DCASE 2025 Task 3 结果", "https://dcase.community/challenge2025/task-stereo-sound-event-localization-and-detection-in-regular-video-content-results"],
 ["空间语音感知综述（arXiv 2607.02296）", "https://arxiv.org/abs/2607.02296"]]);

require("./zh_notes")(p, OUT);
