// 竞品规格调研：萤石与思必驰（数据来自 spec_data.json，由 spec_data.py 生成）
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");
const { applyTheme } = require((process.env.PPTX_SKILL || "/mnt/skills/public/pptx") + "/scripts/apply_theme.js");

const D = JSON.parse(fs.readFileSync(path.join(__dirname, "spec_data.json"), "utf-8"));
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, ".."), "竞品规格调研_萤石与思必驰.pptx");
const FONT = "Microsoft YaHei";
const NAVY = "17375E", TEXT = "1F2937", GRAY = "5B6B7F", LIGHT = "EEF2F7", LIGHT2 = "F6F8FB";
const RED = "C7000B", TEAL = "1F7A68", TEAL_L = "E3F1EE", AMBER = "B8691A", AMBER_L = "FBF0E3";
const BORDER = "CBD5E1", WHITE = "FFFFFF", ICE = "CADCFC", BLUE = "2F6EB5";
const THEME = { name: "SSL Spec", headFontFace: FONT, bodyFontFace: FONT,
  colors: { dk1: TEXT, lt1: WHITE, dk2: NAVY, lt2: LIGHT, accent1: NAVY, accent2: TEAL, accent3: RED, accent4: AMBER, accent5: BLUE, accent6: GRAY, hlink: BLUE, folHlink: "6B4FA0" } };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
pres.title = "竞品规格调研：萤石与思必驰";
pres.author = "令狐雅熙";
pres.defineSlideMaster({ title: "CONTENT", background: { color: WHITE }, objects: [
  { placeholder: { options: { name: "title", type: "title", x: 0.55, y: 0.3, w: 12.25, h: 0.62, fontFace: FONT, fontSize: 20, bold: true, color: NAVY, valign: "middle", margin: 0 }, text: "" } },
  { text: { text: "声源定位竞品规格调研｜萤石与思必驰", options: { x: 0.55, y: 7.05, w: 6, h: 0.3, fontFace: FONT, fontSize: 9, color: "8A97A8", margin: 0 } } },
], slideNumber: { x: 12.3, y: 7.05, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 9, color: "8A97A8", align: "right" } });
pres.defineSlideMaster({ title: "SECTION", background: { color: NAVY }, objects: [] });

function T(s, text, o) { s.addText(text, Object.assign({ fontFace: FONT, fontSize: 13, color: TEXT, isTextBox: true, margin: 0, valign: "top", paraSpaceAfter: 0 }, o)); }
function title(s, t, sub) { s.addText(t, { placeholder: "title" }); if (sub) T(s, sub, { x: 0.55, y: 0.92, w: 12.25, h: 0.36, fontSize: 12, color: GRAY, valign: "middle" }); }
function box(s, x, y, w, h, fill, line, name) { s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: line ? { color: line, width: 1 } : { type: "none" }, rectRadius: 0.08, objectName: name }); }
function circleNum(s, x, y, d, label, fill) { s.addText(label, { shape: pres.shapes.OVAL, x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" }, fontFace: FONT, fontSize: 13, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 }); }
const H = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY }, align: "center", valign: "middle" } });
const cell = (t, o) => ({ text: t, options: o || {} });
const EVC = (g) => (g.startsWith("A") ? TEAL : g.startsWith("B") ? BLUE : g.startsWith("计算") ? NAVY : AMBER);
const NA = (t) => cell(t, t.startsWith("未公开") || t === "未查" ? { color: AMBER, bold: true } : {});
function table(s, rows, o) { s.addTable(rows, Object.assign({ fontFace: FONT, fontSize: 10.5, color: TEXT, valign: "middle", border: { type: "solid", pt: 0.75, color: BORDER }, margin: [0.04, 0.06, 0.04, 0.06] }, o)); }
const newSlide = () => pres.addSlide({ masterName: "CONTENT" });
const R = (vendor) => D.rows.filter((r) => r[0] === vendor);
const EVNOTE = "证据等级：A 官方技术文档 / 监管披露（招股书、问询回复）；B 官方产品页、新闻稿、数据表；C 电商、评测、拆解、经销商页、二手整理；“判断”为推断。信息截至 2026-11。";

// 1. 封面
{
  const s = pres.addSlide({ masterName: "SECTION" });
  [2.4, 1.65, 0.95].forEach((r, i) => s.addShape(pres.shapes.OVAL, { x: 10.9 - r, y: 3.75 - r, w: 2 * r, h: 2 * r, fill: { type: "none" }, line: { color: ["2B4E78", "3A6390", "5582B3"][i], width: 1.5 } }));
  s.addShape(pres.shapes.OVAL, { x: 10.68, y: 3.53, w: 0.44, h: 0.44, fill: { color: RED }, line: { type: "none" } });
  T(s, "声源定位（SSL）调研 · 竞品规格", { x: 0.8, y: 2.25, w: 8.5, h: 0.45, fontSize: 15, color: ICE });
  T(s, "竞品规格调研：萤石与思必驰", { x: 0.8, y: 2.75, w: 9, h: 0.9, fontSize: 34, bold: true, color: WHITE });
  T(s, "内存占用 · 模型大小 · CPU / NPU · 离线 / 在线 · 时延", { x: 0.8, y: 3.75, w: 9, h: 0.5, fontSize: 18, color: ICE });
  T(s, "汇报人：令狐雅熙　　2026.11", { x: 0.8, y: 6.4, w: 6, h: 0.4, fontSize: 12, color: ICE });
  s.addNotes("这份材料按选型需要整理萤石和思必驰的技术规格：内存占用、模型大小、运行在 CPU 还是 NPU、离线还是在线、时延。查不到的标“未公开”，并给出获取途径。");
}

// 2. 结论
{
  const s = newSlide();
  title(s, "结论：两家均未公开定位的内存、模型大小与时延；公开同类方案在百 KB 量级", "可对齐的现有信息：端侧运行、阵列 2–8 麦、精度口径；资源量级用公开参照与本方案估算补位");
  const cols = [TEAL, TEAL, NAVY, AMBER];
  D.implications.forEach((t, i) => {
    const x = 0.55 + (i % 2) * 6.2, y = 1.5 + Math.floor(i / 2) * 2.2, w = 6.05, h = 2.0;
    box(s, x, y, w, h, LIGHT, null, "结论" + i);
    circleNum(s, x + 0.25, y + 0.25, 0.5, String(i + 1), cols[i]);
    T(s, t, { x: x + 0.95, y: y + 0.22, w: w - 1.2, h: h - 0.4, fontSize: 13 });
  });
  box(s, 0.55, 6.0, 12.25, 0.78, AMBER_L, null, "缺口");
  T(s, [{ text: "最大缺口　", options: { bold: true, color: AMBER } }, { text: "内存、模型大小、时延均未公开 → 样机拆解与实测、向思必驰索取 SDK 规格书（见“缺口与获取途径”页）" }],
    { x: 0.8, y: 6.0, w: 11.8, h: 0.78, fontSize: 12.5, valign: "middle" });
  s.addNotes("结论有四点。第一，萤石和思必驰都没有公开声源定位的内存占用、模型大小和时延，现在能对齐的是端侧运行、阵列规模和精度口径。第二，公开的同类方案里，乐鑫 ESP-SR 的 4 麦声源定位约 206 KB 内存、10 度网格、不用神经网络；本方案的 SRP-PHAT 在 10 度网格下约 201 KB，在同一量级。第三，家用摄像头芯片上的 NPU 主要给视觉算法用，声源定位更可能跑在 CPU 或 DSP 上，这一点是判断，要拆解和实测确认。第四，首轮选型建议按百 KB 级内存、CPU 或 DSP 能实时运行来对齐竞品；如果引入神经网络，先控制在相当量级再比效果。最大的缺口是内存、模型和时延，需要拆解样机、实测，或者向思必驰要规格书。");
}

function vendorSlide(vendor, ttl, sub, take, notes, boxY, skip) {
  const s = newSlide();
  title(s, ttl, sub);
  const rows = [[H("产品 / 方案"), H("阵列"), H("定位能力 / 精度"), H("内存 / 模型"), H("CPU / DSP / NPU"), H("离线 / 在线"), H("时延"), H("证据")]];
  R(vendor).filter((r) => !(skip || []).includes(r[1])).forEach((r) => rows.push([cell(r[1], { bold: true }), r[2], r[3], NA(r[4] === r[5] || r[5] === "—" ? r[4] : r[4] + "；" + r[5]), NA(r[6]), r[7], NA(r[8]), cell(r[9], { color: EVC(r[9]), bold: true })]));
  table(s, rows, { x: 0.55, y: 1.42, w: 12.25, colW: [1.7, 1.15, 2.3, 1.6, 1.9, 1.5, 1.0, 1.1], fontSize: 10 });
  const bh = 6.78 - boxY;
  box(s, 0.55, boxY, 12.25, bh, TEAL_L, null, "要点");
  T(s, [{ text: "要点　", options: { bold: true, color: TEAL } }, { text: take }], { x: 0.8, y: boxY, w: 11.8, h: bh, fontSize: 12, valign: "middle" });
  s.addNotes(notes);
}

// 3. 萤石
vendorSlide("萤石", "萤石：已披露 4 麦与定位识别率 86%，资源与时延未公开；SoC 主要供应商为富瀚微、海思", "来源以问询回复（监管披露）为主，拆解与评测为补充",
  "问询回复是目前最可靠的一手资料：4 麦方案、“高精度声源定位”识别率 86.0%（行业平均 77.0%，自家实验室测试），音频算法可云端或设备端部署并支持动态加载。2019 资讯为 3 麦、2021 问询回复为 4 麦，可能是不同版本，以样机为准。声源定位所在 SoC 的具体型号需拆解确认。",
  "萤石的一手资料主要来自科创板问询回复。里面有一张和小米、360、Ring 的对比表：C6C 3MP 无极版用 4 个麦克风，号称行业首次，支持听声辨位；另一张算法表写“高精度声源定位”识别率 86%，行业平均 77%，是他们自己实验室测的。音频算法可以放在云上，也可以放在设备上，设备支持算法动态加载；声源定位要实时转向，应该是在设备端跑，这是判断。芯片方面，问询回复写明公司整体的 SoC 主要买富瀚微和海思的，这是整体采购口径，没说哪款产品用哪颗；新 C6 的拆解显示主控是定制芯片 ECZ5450S，带 CNN 模块。2019 年资讯写 3 麦，2021 年写 4 麦，可能是不同版本，要拿样机确认。内存、模型大小和时延都没有公开。", 5.3);

// 4. 思必驰
vendorSlide("思必驰", "思必驰：±5° 定位、方向检测率 > 98% 有披露，资源未公开；自研 TH 系列芯片以 DSP 为主", "来源以招股书（申报稿）为主，芯片参数多为发布报道或二手资料",
  "招股书确认：模组双 / 四 / 六麦、±5° 声源定位；会议场景 DOA 方向检测率 > 98%；已有 AI 语音摄像头做“声像追踪”；客户名单含海康威视（未说明合作内容）；整体强调端侧离线、低时延。TH1520 为双 DSP、毫瓦级常开；TH2608 增加 NPU，算力与 SRAM 未公开。表中 22 ms 为扩声延迟，不是定位时延。",
  "思必驰的一手资料是 2026 年的科创板招股书申报稿。它的麦克风阵列模组有双麦、四麦、六麦，标称正负 5 度声源定位；会议拾扩音产品的 DOA 方向检测率超过 98%；还有一款 AI 语音摄像头做声像追踪，用语音定位加视觉锁定发言人，另外客户名单里有海康威视，也就是萤石的母公司，但招股书没说明具体合作内容，不能推断是哪类产品。招股书整体强调端侧、离线、低时延。芯片方面，TH1520 是双 DSP、毫瓦级常开；TH2608 加了 NPU，支持 INT8 到 INT1，但算力和 SRAM 都没公开。表里的 22 毫秒是扩声延迟，不是定位时延，不能拿来对比；离在线语音模组的 500 毫秒指令响应也一样，只放在 Excel 里。", 6.0, ["TH1520 离在线语音模组"]);

// 5. 量级对照
{
  const s = newSlide();
  title(s, "量级对照：公开参照 4 麦约 206 KB；本方案 SRP-PHAT 用 10° 网格可落到同一量级", "内存为导向表 / 内存池估算（KB）；本方案为计算值，未含 STFT 与缓存");
  const labels = ["乐鑫 DOA 10°", "SRP-PHAT 1°", "SRP-PHAT 5°", "SRP-PHAT 10°", "GEVD-MUSIC 1°", "GEVD-MUSIC 10°"];
  s.addChart(pres.charts.BAR, [{ name: "内存（KB）", labels, values: [206, 2008, 402, 201, 1339, 134] }], {
    x: 0.55, y: 1.42, w: 7.2, h: 4.9, barDir: "bar", chartColors: [BLUE, AMBER, AMBER, TEAL, AMBER, TEAL],
    showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 10, dataLabelColor: TEXT, showLegend: false, showTitle: true, title: "声源定位内存量级（KB）",
    titleFontSize: 12, titleFontFace: "+mn-lt", titleColor: NAVY, catAxisLabelFontSize: 10.5, valAxisLabelFontSize: 9.5, catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt",
    valAxisLabelColor: GRAY, catAxisLabelColor: TEXT, valGridLine: { color: "E3E8EF", size: 0.75 }, catGridLine: { style: "none" }, catAxisOrientation: "maxMin" });
  const pts = [
    ["公开参照", "乐鑫 ESP-SR：Capon / MVDR，2–8 麦，帧长 8 ms，10° 网格，4 麦约 206 KB（内部 57 KB + PSRAM 149 KB），不用神经网络（A）"],
    ["本方案", "SRP-PHAT 导向表随网格线性变化：1° 约 2.0 MB、10° 约 201 KB；计算量 1° 约 129 MFLOP/s、10° 约 13 MFLOP/s（计算）"],
    ["取舍", "主方案仿真用 1° 网格；对齐竞品量级时改用 5°–10° 网格或在线计算导向相位，精度代价需复测"],
  ];
  pts.forEach((p, i) => {
    const y = 1.45 + i * 1.62;
    box(s, 8.0, y, 4.8, 1.5, i === 2 ? AMBER_L : LIGHT, null, "对照" + i);
    T(s, p[0], { x: 8.2, y: y + 0.1, w: 4.4, h: 0.32, fontSize: 13, bold: true, color: i === 2 ? AMBER : NAVY });
    T(s, p[1], { x: 8.2, y: y + 0.45, w: 4.45, h: 1.0, fontSize: 11 });
  });
  T(s, "XMOS XVF3800 为专用语音芯片（4 麦线阵 33 mm / 方阵 66 mm，主机可读说话人方位），资源占用未查，不列入图中。", { x: 0.55, y: 6.45, w: 12.25, h: 0.35, fontSize: 10.5, color: GRAY });
  s.addNotes("这页把能量化的放在一起比。蓝色是乐鑫公开的参照：4 麦 MVDR 声源定位约 206 KB 内存、10 度网格、不用神经网络。橙色和绿色是本方案按代码算出来的：SRP-PHAT 的导向表随方向网格线性变化，1 度网格约 2 MB，10 度网格约 201 KB，和乐鑫同一量级；GEVD-MUSIC 每次唤醒才算一次，10 度网格约 134 KB。主方案的仿真用的是 1 度网格，如果要对齐竞品量级，就要改成 5 到 10 度网格，或者在线计算导向相位，精度会有多少损失需要复测。这些是计算值，没算 STFT 和音频缓存。");
}

// 6. 缺口
{
  const s = newSlide();
  title(s, "缺口与获取途径：样机拆解与实测补“算力和时延”，规格书补“内存和模型”");
  const rows = [[H("缺口"), H("获取途径"), H("用途")]];
  D.gaps.forEach((g) => rows.push([cell(g[0], { bold: true }), g[1], g[2]]));
  table(s, rows, { x: 0.55, y: 1.42, w: 12.25, colW: [3.0, 6.0, 3.25], rowH: [0.42, 0.8, 0.8, 0.7, 0.8, 0.7], fontSize: 12 });
  T(s, EVNOTE, { x: 0.55, y: 6.4, w: 12.25, h: 0.4, fontSize: 10, color: GRAY });
  s.addNotes("缺的信息有五项，获取途径分三类。一是买样机：拆解确认主控芯片型号，再查这颗芯片的公开规格，得到算力上限；同时用 240 帧录像实测从说话结束到云台开始转动的时延。二是通过商务渠道向思必驰要 SDK 或模组规格书，补内存和模型大小，也可以问问内部有没有可以分享的信息。三是麦克风数量这种前后不一致的，以样机为准。");
}

// 7. 来源
{
  const s = newSlide();
  title(s, "资料来源");
  const runs = D.sources.map((r, i) => [
    { text: "[" + r[0] + " · " + r[1] + "] ", options: { bold: true, color: EVC(r[1]), bullet: { indent: 12 }, paraSpaceAfter: 4 } },
    { text: r[2] + " ↗", options: { color: BLUE, hyperlink: { url: r[3], tooltip: r[3] }, breakLine: i < D.sources.length - 1 } },
  ]).flat();
  T(s, runs, { x: 0.55, y: 1.35, w: 12.25, h: 5.1, fontSize: 11 });
  T(s, EVNOTE, { x: 0.55, y: 6.5, w: 12.25, h: 0.4, fontSize: 10, color: GRAY });
  s.addNotes("资料来源按编号列出，表格里的“证据”列对应这里的编号。招股书和问询回复属于监管披露，可信度最高；拆解和评测是补充。");
}

(async () => { await pres.writeFile({ fileName: OUT }); await applyTheme(OUT, THEME); console.log("written", OUT); })();
