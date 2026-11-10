// 训练数据方案与采集计划（数据来自 data_plan.json，由 data_plan.py 生成）
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");
const { applyTheme } = require((process.env.PPTX_SKILL || "/mnt/skills/public/pptx") + "/scripts/apply_theme.js");

const D = JSON.parse(fs.readFileSync(path.join(__dirname, "data_plan.json"), "utf-8"));
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, ".."), "训练数据方案与采集计划.pptx");
const FONT = "Microsoft YaHei";
const NAVY = "17375E", TEXT = "1F2937", GRAY = "5B6B7F", LIGHT = "EEF2F7", LIGHT2 = "F6F8FB";
const RED = "C7000B", RED_L = "FBE9EA", TEAL = "1F7A68", TEAL_L = "E3F1EE", AMBER = "B8691A", AMBER_L = "FBF0E3";
const BORDER = "CBD5E1", WHITE = "FFFFFF", ICE = "CADCFC", BLUE = "2F6EB5";
const THEME = { name: "SSL Data Plan", headFontFace: FONT, bodyFontFace: FONT,
  colors: { dk1: TEXT, lt1: WHITE, dk2: NAVY, lt2: LIGHT, accent1: NAVY, accent2: TEAL, accent3: RED, accent4: AMBER, accent5: BLUE, accent6: GRAY, hlink: BLUE, folHlink: "6B4FA0" } };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
pres.title = "训练数据方案与采集计划";
pres.author = "令狐雅熙";
pres.defineSlideMaster({ title: "CONTENT", background: { color: WHITE }, objects: [
  { placeholder: { options: { name: "title", type: "title", x: 0.55, y: 0.3, w: 12.25, h: 0.62, fontFace: FONT, fontSize: 20, bold: true, color: NAVY, valign: "middle", margin: 0 }, text: "" } },
  { text: { text: "声源定位｜训练数据方案与采集计划", options: { x: 0.55, y: 7.05, w: 6, h: 0.3, fontFace: FONT, fontSize: 9, color: "8A97A8", margin: 0 } } },
], slideNumber: { x: 12.3, y: 7.05, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 9, color: "8A97A8", align: "right" } });
pres.defineSlideMaster({ title: "SECTION", background: { color: NAVY }, objects: [] });

function T(s, text, o) { s.addText(text, Object.assign({ fontFace: FONT, fontSize: 13, color: TEXT, isTextBox: true, margin: 0, valign: "top", paraSpaceAfter: 0 }, o)); }
function title(s, t, sub) { s.addText(t, { placeholder: "title" }); if (sub) T(s, sub, { x: 0.55, y: 0.92, w: 12.25, h: 0.36, fontSize: 12, color: GRAY, valign: "middle" }); }
function box(s, x, y, w, h, fill, line, name) { s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: line ? { color: line, width: 1 } : { type: "none" }, rectRadius: 0.08, objectName: name }); }
function circleNum(s, x, y, d, label, fill) { s.addText(label, { shape: pres.shapes.OVAL, x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" }, fontFace: FONT, fontSize: 13, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 }); }
function bullets(items, fs, gap) { return items.map((t, i) => ({ text: t, options: { fontSize: fs || 12.5, bullet: { indent: 12 }, breakLine: i < items.length - 1, paraSpaceAfter: gap === undefined ? 5 : gap } })); }
const H = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY }, align: "center", valign: "middle" } });
const cell = (t, o) => ({ text: String(t), options: o || {} });
function table(s, rows, o) { s.addTable(rows, Object.assign({ fontFace: FONT, fontSize: 11, color: TEXT, valign: "middle", border: { type: "solid", pt: 0.75, color: BORDER }, margin: [0.04, 0.07, 0.04, 0.07] }, o)); }
const newSlide = () => pres.addSlide({ masterName: "CONTENT" });

// 1. 封面
{
  const s = pres.addSlide({ masterName: "SECTION" });
  [2.4, 1.65, 0.95].forEach((r, i) => s.addShape(pres.shapes.OVAL, { x: 10.9 - r, y: 3.75 - r, w: 2 * r, h: 2 * r, fill: { type: "none" }, line: { color: ["2B4E78", "3A6390", "5582B3"][i], width: 1.5 } }));
  s.addShape(pres.shapes.OVAL, { x: 10.68, y: 3.53, w: 0.44, h: 0.44, fill: { color: RED }, line: { type: "none" } });
  T(s, "声源定位（SSL）· 场景一：摄像头转向说话人", { x: 0.8, y: 2.25, w: 9, h: 0.45, fontSize: 15, color: ICE });
  T(s, "训练数据方案与采集计划", { x: 0.8, y: 2.75, w: 9, h: 0.9, fontSize: 34, bold: true, color: WHITE });
  T(s, "公开数据盘点 · 仿真方案 · 自采集方案 · 时间计划 · 对比规范", { x: 0.8, y: 3.75, w: 9, h: 0.5, fontSize: 18, color: ICE });
  T(s, "汇报人：令狐雅熙　　2026.11", { x: 0.8, y: 6.4, w: 6, h: 0.4, fontSize: 12, color: ICE });
  s.addNotes("这份材料回答训练数据从哪来、要不要自己采、采什么、什么时候采，以及和竞品比较时统一哪些条件。所有数量和时间都是建议值，需要和深圳同事、目标硬件确认后再定。");
}

// 2. 结论
{
  const s = newSlide();
  title(s, "结论：仿真作训练主体，公开真实数据预训练与评测，自采数据用于微调和测试", "公开数据的阵列几何都与目标设备不同；自采是关键路径，需在 11 月下旬定稿方案");
  const pts = [
    ["三类数据各司其职", "仿真：按目标几何大规模生成，作训练主体；公开真实数据（RealMAN 等）：预训练与评测；自采：最贴近设备，用于微调和最终测试", TEAL],
    ["公开数据不能直接当主体", "几何、麦克风数量、场景与目标设备都不同；RealMAN 可抽几何接近的子阵作补充，许可证需逐项核实", AMBER],
    ["自采规模（建议）", "4 类房间，每间约 " + Math.round(D.per_room_min / 60 * 10) / 10 + " h，共约 " + D.total_h + " h；其中有效语音约 7.5 h，适合微调与测试，不足以单独训练", NAVY],
    ["关键路径与依赖", "11 月下旬方案定稿 → 12 月上中旬深圳准备与试录 → 12 月中旬至 1 月上旬采集 → 1 月中下旬交付；前置依赖为阵列 / 样机与录音合规流程", RED],
  ];
  pts.forEach((p, i) => {
    const x = 0.55 + (i % 2) * 6.2, y = 1.5 + Math.floor(i / 2) * 2.55, w = 6.05, h = 2.35;
    box(s, x, y, w, h, LIGHT, null, "结论" + i);
    circleNum(s, x + 0.25, y + 0.25, 0.5, String(i + 1), p[2]);
    T(s, p[0], { x: x + 0.95, y: y + 0.22, w: w - 1.2, h: 0.55, fontSize: 15, bold: true, color: NAVY, valign: "middle" });
    T(s, p[1], { x: x + 0.3, y: y + 0.9, w: w - 0.55, h: h - 1.0, fontSize: 13 });
  });
  s.addNotes("先说结论。训练数据分三类：仿真按目标设备的阵列几何大规模生成，作为训练主体；RealMAN 这类公开真实数据用于预训练和评测；自己采集的数据最贴近设备，用于微调和最终测试。公开数据的阵列几何、麦克风数量都和目标设备不一样，不能直接当训练主体，许可证也要逐项核实。自采按 4 类房间算，每间约 4.4 小时，共约 17.5 小时，其中有效语音约 7.5 小时，用来微调和测试足够，单独训练不够。自采是关键路径：建议 11 月下旬把方案定下来，12 月上中旬深圳准备和试录，12 月中旬到 1 月上旬正式采集，1 月中下旬交付。前提是先确定用哪套阵列或样机，并走完录音的合规流程。");
}

// 3. 公开数据盘点
{
  const s = newSlide();
  title(s, "公开数据盘点：RealMAN 最接近可训练的真实数据，其余以评测或素材为主");
  const rows = [[H("数据集"), H("内容与阵列"), H("规模"), H("方位真值"), H("许可"), H("本方案用途")]];
  D.public.forEach((r, i) => rows.push([cell(r[0], { bold: true }), r[1], r[2], r[3], cell(r[4], { color: r[4].startsWith("待核实") || r[4].startsWith("非商用") ? AMBER : TEXT }), cell(r[5], { color: i === 0 ? TEAL : TEXT, bold: i === 0 })]));
  table(s, rows, { x: 0.55, y: 1.42, w: 12.25, colW: [1.9, 2.9, 2.2, 1.85, 1.6, 1.8], fontSize: 10.5 });
  T(s, "许可证以下载包内的许可文件为准，用于公司项目前需合规确认；非商用数据仅用于研究对比。", { x: 0.55, y: 6.45, w: 12.25, h: 0.35, fontSize: 10.5, color: GRAY });
  s.addNotes("公开数据里，RealMAN 最接近可以拿来训练的真实数据：32 麦阵列，可以抽取和目标几何接近的子阵，有 83.7 小时语音，其中 35.4 小时是移动说话人，还有 144.5 小时噪声，方位真值是用鱼眼摄像头自动标的。LOCATA 规模小，主要用来评测。STARSS23 是声音事件数据，留给异响扩展。SSLR 是非商用许可，只能研究对比。AISHELL-1、DEMAND、MUSAN 是单通道素材，用来做仿真的声源和干扰。许可证一律以下载包里的文件为准，用到公司项目前要过合规。");
}

// 4. 仿真方案
{
  const s = newSlide();
  title(s, "仿真方案：按目标几何生成约 200 h 作训练主体，现有脚本已覆盖主要场景");
  const rows = [[H("项目"), H("建议设置")]];
  D.sim.forEach((r) => rows.push([cell(r[0], { bold: true, color: NAVY }), r[1]]));
  table(s, rows, { x: 0.55, y: 1.42, w: 8.1, colW: [1.6, 6.5], fontSize: 12 });
  box(s, 8.9, 1.42, 3.9, 2.4, TEAL_L, null, "已有基础");
  T(s, "已有基础", { x: 9.1, y: 1.55, w: 3.5, h: 0.35, fontSize: 14, bold: true, color: TEAL });
  T(s, bullets(["镜像源法房间仿真（pyroomacoustics）", "唤醒词 + 持续电视干扰", "移动说话人（分块 RIR）", "云台电机近场噪声", "100 Hz 高通去直流"], 12, 4), { x: 9.1, y: 1.95, w: 3.55, h: 1.8 });
  box(s, 8.9, 4.0, 3.9, 2.7, AMBER_L, null, "注意");
  T(s, "注意", { x: 9.1, y: 4.12, w: 3.5, h: 0.35, fontSize: 14, bold: true, color: AMBER });
  T(s, bullets(["阵列几何未定前，仿真结论只能作方法比较", "镜像源法缺少家具散射、麦克风失配，需用 RealMAN 与自采数据校准", "200 h 为建议值，按模型规模调整"], 12, 4), { x: 9.1, y: 4.52, w: 3.55, h: 2.1 });
  s.addNotes("仿真是训练主体。阵列按目标设备的几何来设，几何没定之前先用现在的 4 麦 5.7 厘米方阵。房间、混响、距离、轨迹、干扰都按家庭场景设范围，再加阵元扰动和通道失配增强，让模型对硬件误差不敏感。现有脚本已经能做唤醒词加电视、移动说话人和电机噪声。要注意两点：阵列几何定下来之前，仿真结论只能用来比较方法；镜像源法没有家具散射和麦克风失配，需要用 RealMAN 和自采数据来校准。200 小时是建议值，按模型规模再调。");
}

// 5. 自采集矩阵
{
  const s = newSlide();
  title(s, "自采集方案（每间房）：音箱播放覆盖全网格，真人补充真实性，干扰单独录制便于按需混合");
  const rows = [[H("项目"), H("声源与内容"), H("点位 / 条数"), H("单位时长"), H("条件"), H("说明")]];
  D.matrix.forEach((r) => rows.push([cell(r[0], { bold: true }), r[1], r[2], cell(r[3] >= 1 ? r[3] + " 分钟" : r[3] * 60 + " 秒", { align: "center" }), cell(r[4], { align: "center" }), r[5]]));
  table(s, rows, { x: 0.55, y: 1.42, w: 12.25, colW: [1.85, 3.1, 2.4, 0.95, 0.85, 3.1], fontSize: 10.5 });
  T(s, "房间（建议）", { x: 0.55, y: 5.25, w: 3, h: 0.35, fontSize: 13, bold: true, color: NAVY });
  D.rooms.forEach((r, i) => {
    s.addText(r[0] + "｜" + r[1] + "｜RT60 " + r[2], { shape: pres.shapes.ROUNDED_RECTANGLE, x: 0.55 + i * 3.08, y: 5.65, w: 2.95, h: 0.5, fill: { color: TEAL_L }, line: { color: TEAL, width: 1 }, rectRadius: 0.2, fontFace: FONT, fontSize: 10.5, bold: true, color: TEAL, align: "center", valign: "middle", margin: 0 });
  });
  T(s, [{ text: "数据量（建议）　", options: { bold: true, color: NAVY } }, { text: "每间房约 " + D.per_room_min + " 分钟（含 2 h 长时误转专测），4 类房间共约 " + D.total_h + " h；明细见 Excel“数据量估算”" }],
    { x: 0.55, y: 6.32, w: 12.25, h: 0.4, fontSize: 12, valign: "middle" });
  s.addNotes("自采集按每间房设计六项。静态网格用音箱播放：12 个方位、3 个距离、2 个高度，共 72 个点，每点播放 5 遍唤醒词和约 20 秒连续语音；唤醒词先请多人近讲录好再播放，可重复、覆盖全。真人静态子集补充头部指向性和说话习惯。移动轨迹由真人边说边走，用顶视或鱼眼摄像头标方位。电视、空调、电机这些干扰单独录，后期按指定信噪比混合，这样一套数据能生成很多种干扰条件。另外录一部分真人唤醒加电视同时播放的真实混合，只用来测试；再录 2 小时无人加电视，测误转率。房间分卧室、客厅、空旷大房间、会议室四类。每间房约 4.4 小时，4 类共约 17.5 小时。");
}

// 6. 标注与质量
{
  const s = newSlide();
  title(s, "标注与元数据：方位真值、唤醒词起止和同步决定数据能否用；先试录半天检查再正式采集");
  box(s, 0.55, 1.42, 7.3, 5.3, LIGHT, null, "元数据");
  T(s, "每段录音需要记录", { x: 0.8, y: 1.55, w: 6.8, h: 0.35, fontSize: 14, bold: true, color: NAVY });
  T(s, bullets(D.meta, 12.5, 7), { x: 0.8, y: 2.0, w: 6.85, h: 4.6 });
  box(s, 8.1, 1.42, 4.7, 2.75, TEAL_L, null, "试录检查");
  T(s, "试录检查项", { x: 8.3, y: 1.55, w: 4.3, h: 0.35, fontSize: 14, bold: true, color: TEAL });
  T(s, bullets(["各通道同步、无丢帧", "电平合适、无削波", "方位标注与实测一致（抽查）", "唤醒词起止时间可对齐", "用现有算法跑一遍，误差在合理范围"], 12, 4), { x: 8.3, y: 1.95, w: 4.35, h: 2.15 });
  box(s, 8.1, 4.35, 4.7, 2.37, AMBER_L, null, "合规");
  T(s, "合规", { x: 8.3, y: 4.48, w: 4.3, h: 0.35, fontSize: 14, bold: true, color: AMBER });
  T(s, bullets(["参与者知情同意", "不记录可识别个人身份的信息", "数据存储与使用范围按公司规定"], 12, 4), { x: 8.3, y: 4.88, w: 4.35, h: 1.75 });
  s.addNotes("数据能不能用，关键看三样：方位真值准不准、唤醒词起止时间有没有、各通道是否同步。所以每段录音要记录房间、阵列、点位、说话人编号、唤醒词起止、干扰位置和音量，移动段还要有轨迹视频。正式采集前先试录半天，检查同步、电平、标注，并用现有算法跑一遍，没问题再大规模采。录人声要走合规流程：参与者知情同意，不记录能识别个人身份的信息，数据存储和使用范围按公司规定。");
}

// 7. 时间计划
{
  const s = newSlide();
  title(s, "时间计划（建议）：11 月下旬定稿，12 月中旬起采集，1 月中下旬交付");
  const rows = [[H("阶段"), H("时间"), H("内容"), H("负责"), H("产出")]];
  D.timeline.forEach((r, i) => rows.push([cell(r[0], { bold: true, color: i === 4 ? TEAL : NAVY }), r[1], r[2], r[3], r[4]]));
  table(s, rows, { x: 0.55, y: 1.42, w: 12.25, colW: [1.8, 1.9, 4.95, 1.7, 1.9], fontSize: 11.5 });
  box(s, 0.55, 5.7, 12.25, 1.05, LIGHT2, BORDER, "依赖");
  T(s, [{ text: "前置依赖　", options: { bold: true, color: RED } }, { text: "阵列 / 样机确认（决定仿真几何与采集设备）；深圳人力与场地；录音合规流程。任一项延后，采集整体顺延。" }],
    { x: 0.8, y: 5.7, w: 11.8, h: 1.05, fontSize: 12.5, valign: "middle" });
  s.addNotes("时间按建议排：11 月下旬把采集方案、数据格式和标注规范定下来，同时确认阵列和样机、启动合规流程；12 月上中旬深圳准备设备和场地，先试录半天，检查后修订方案；12 月中旬到 1 月上旬正式采集，4 类房间约 8 到 10 个工作日；1 月中下旬整理交付，按房间划分训练集和测试集。仿真数据和模型对比并行进行，阵列几何一确认就开始。前置依赖有三项：阵列或样机、深圳的人力和场地、录音合规流程，任何一项延后，采集都会顺延。");
}

// 8. 对比规范
{
  const s = newSlide();
  title(s, "对比规范：与竞品在同一测试场景、同一模型规格与算力开销下比较效果");
  const rows = [[H("条件"), H("定义（建议）")]];
  D.compare.forEach((r) => rows.push([cell(r[0], { bold: true, color: NAVY }), r[1]]));
  table(s, rows, { x: 0.55, y: 1.42, w: 12.25, colW: [2.2, 10.05], rowH: [0.45, 0.85, 0.85, 0.7, 0.7], fontSize: 13 });
  box(s, 0.55, 5.35, 12.25, 1.4, TEAL_L, null, "说明");
  T(s, [{ text: "说明　", options: { bold: true, color: TEAL } }, { text: "竞品定位模块的内存、模型与耗时尚未公开（见竞品规格调研），预算暂不预设；优先申请思必驰 SDK 在同一段音频上做算法级对比，萤石以样机实测整机响应。测试房间不参与训练，避免高估效果。" }],
    { x: 0.8, y: 5.35, w: 11.8, h: 1.4, fontSize: 13, valign: "middle" });
  s.addNotes("和竞品比较要统一四个条件。同测试场景：用一套固定测试集，包括自采数据里不参与训练的房间、LOCATA 和 5 个演示场景，竞品样机也在同一房间、同一点位实测。同模型规格：参数量、模型或资源文件大小和总运行内存对齐竞品；竞品定位模块的资源现在还没公开，所以预算先不预设数值，等拿到思必驰 SDK 规格或样机实测再定。同算力开销：在同一平台、同一段多通道音频上测处理耗时和执行单元。指标统一用 10 度以内命中率、粗大错误率、平均误差、首次定向时延、跟踪覆盖率和误转次数。思必驰有 Linux SDK，唤醒后会回调方位，可以拿同一段音频做算法级对比；萤石只能用样机实测整机响应。");
}

// 9. 待确认
{
  const s = newSlide();
  title(s, "待确认事项：阵列 / 样机与深圳资源决定采集能否按计划启动");
  D.confirm.forEach((c, i) => {
    const y = 1.45 + i * 1.02;
    box(s, 0.55, y, 12.25, 0.88, i < 2 ? LIGHT : LIGHT2, i < 2 ? null : BORDER, "待确认" + i);
    circleNum(s, 0.8, y + 0.19, 0.5, String(i + 1), i < 2 ? NAVY : TEAL);
    T(s, c, { x: 1.55, y: y, w: 11.0, h: 0.88, fontSize: 14, valign: "middle" });
  });
  s.addNotes("最后是待确认的五件事：用哪套阵列或样机；深圳同事的人力、场地和时间；录音的合规流程；唤醒词文本以及能否拿到唤醒模块给出的起止时间；目标芯片和算力预算。前两项决定采集能不能按计划启动。");
}

(async () => { await pres.writeFile({ fileName: OUT }); await applyTheme(OUT, THEME); console.log("written", OUT); })();
