// 场景一专项：摄像头声源定位与持续跟踪 —— 方案选型与数据集
const pptxgen = require("pptxgenjs");
const path = require("path");
const { applyTheme } = require((process.env.PPTX_SKILL || "/mnt/skills/public/pptx") + "/scripts/apply_theme.js");

const SHORT = process.env.SHORT === "1";
const OUT = path.join(process.env.OUT_DIR || __dirname, SHORT ? "场景一专项_汇报精简版_raw.pptx" : "场景一专项_摄像头声源定位与跟踪_方案选型与数据集.pptx");
const FIGDIR = path.join(__dirname, "..", "figures");
const img = (n) => path.join(FIGDIR, n);
const FONT = "Microsoft YaHei";
const NAVY = "17375E", TEXT = "1F2937", GRAY = "5B6B7F", LIGHT = "EEF2F7", LIGHT2 = "F6F8FB";
const RED = "C7000B", RED_L = "FBE9EA", TEAL = "1F7A68", TEAL_L = "E3F1EE", TEAL_M = "9FD0C4";
const AMBER = "B8691A", AMBER_L = "FBF0E3", BORDER = "CBD5E1", WHITE = "FFFFFF", ICE = "CADCFC";

const THEME = {
  name: "SSL Scene1",
  headFontFace: FONT, bodyFontFace: FONT,
  colors: { dk1: TEXT, lt1: WHITE, dk2: NAVY, lt2: LIGHT, accent1: NAVY, accent2: TEAL, accent3: RED,
    accent4: AMBER, accent5: "2F6EB5", accent6: GRAY, hlink: "2F6EB5", folHlink: "6B4FA0" },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
pres.title = "场景一专项：摄像头声源定位与持续跟踪";
pres.author = "令狐雅熙";

pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: WHITE },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.55, y: 0.3, w: 12.25, h: 0.62,
      fontFace: FONT, fontSize: 20, bold: true, color: NAVY, valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "场景一专项｜摄像头声源定位与持续跟踪", options: { x: 0.55, y: 7.05, w: 6, h: 0.3,
      fontFace: FONT, fontSize: 9, color: "8A97A8", margin: 0 } } },
  ],
  slideNumber: { x: 12.3, y: 7.05, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 9, color: "8A97A8", align: "right" },
});
pres.defineSlideMaster({ title: "SECTION", background: { color: NAVY }, objects: [] });

// ---------- helpers ----------
function T(slide, text, o) {
  slide.addText(text, Object.assign({ fontFace: FONT, fontSize: 13, color: TEXT, isTextBox: true,
    margin: 0, valign: "top", paraSpaceAfter: 0 }, o));
}
function title(slide, t, sub) {
  slide.addText(t, { placeholder: "title" });
  if (sub) T(slide, sub, { x: 0.55, y: 0.92, w: 12.25, h: 0.36, fontSize: 12, color: GRAY, valign: "middle" });
}
function box(slide, x, y, w, h, fill, line, name, radius) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill },
    line: line ? { color: line, width: 1 } : { type: "none" }, rectRadius: radius || 0.08, objectName: name });
}
function circleNum(slide, x, y, d, label, fill, fs) {
  slide.addText(label, { shape: pres.shapes.OVAL, x, y, w: d, h: d, fill: { color: fill || NAVY },
    line: { type: "none" }, fontFace: FONT, fontSize: fs || 12, bold: true, color: WHITE, align: "center",
    valign: "middle", margin: 0 });
}
function bullets(items, fs, color, gap) {
  return items.map((it, i) => {
    const runs = Array.isArray(it) ? it : [{ text: it }];
    return runs.map((r, j) => ({ text: r.text, options: Object.assign({ fontSize: fs || 12.5, color: color || TEXT,
      bullet: j === 0 ? { indent: 12 } : undefined, breakLine: j === runs.length - 1 && i < items.length - 1,
      paraSpaceAfter: gap === undefined ? 5 : gap }, r.options || {}) }));
  }).flat();
}
function arrow(slide, x, y, w, h, opts) {
  slide.addShape(pres.shapes.LINE, Object.assign({ x, y, w, h,
    line: { color: (opts && opts.color) || "7A8899", width: 1.5, endArrowType: "triangle" } }, opts || {}));
}
function seg(slide, x, y, w, h, color) {
  slide.addShape(pres.shapes.LINE, { x, y, w, h, line: { color: color || "7A8899", width: 1.5 } });
}
const H = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY }, align: "center", valign: "middle" } });
function cell(t, o) { return { text: t, options: o || {} }; }
const STRONG = (t) => cell(t || "强", { color: TEAL, bold: true, align: "center" });
const MID = (t) => cell(t || "中", { color: AMBER, bold: true, align: "center" });
const WEAK = (t) => cell(t || "弱", { color: "8A97A8", align: "center" });
function table(slide, rows, o) {
  slide.addTable(rows, Object.assign({ fontFace: FONT, fontSize: 11.5, color: TEXT, valign: "middle",
    border: { type: "solid", pt: 0.75, color: BORDER }, margin: [0.04, 0.07, 0.04, 0.07] }, o));
}
function newSlide(sec) { return pres.addSlide({ masterName: "CONTENT", sectionTitle: sec }); }

// =====================================================================
// 1. 分隔页
pres.addSection({ title: "场景一专项" });
{
  const s = pres.addSlide({ masterName: "SECTION", sectionTitle: "场景一专项" });
  [2.4, 1.65, 0.95].forEach((r, i) => s.addShape(pres.shapes.OVAL, { x: 10.9 - r, y: 3.75 - r, w: 2 * r, h: 2 * r,
    fill: { type: "none" }, line: { color: ["2B4E78", "3A6390", "5582B3"][i], width: 1.5 }, objectName: "声波" + i }));
  s.addShape(pres.shapes.OVAL, { x: 10.68, y: 3.53, w: 0.44, h: 0.44, fill: { color: RED }, line: { type: "none" }, objectName: "声源" });
  T(s, SHORT ? "声源定位（SSL）调研 · 场景一 · 汇报精简版" : "声源定位（SSL）调研 · 场景一", { x: 0.8, y: 2.25, w: 8.5, h: 0.45, fontSize: 15, color: ICE });
  if (SHORT) T(s, "完整版（24 页）与竞品调研（14 页）另附", { x: 0.8, y: 4.35, w: 8, h: 0.4, fontSize: 13, color: "9FB4D3" });
  T(s, "摄像头声源定位与持续跟踪", { x: 0.8, y: 2.75, w: 8.5, h: 0.9, fontSize: 36, bold: true, color: WHITE });
  T(s, "需求拆解 · 方案选型 · 数据集 · 原型路线", { x: 0.8, y: 3.75, w: 8.5, h: 0.5, fontSize: 18, color: ICE });
  T(s, "汇报人：令狐雅熙　　2026.11", { x: 0.8, y: 6.4, w: 6, h: 0.4, fontSize: 12, color: ICE });
  s.addNotes("本部分针对场景一（摄像头定位声音方向并持续跟踪）展开：先给出 12 月原型建议，再拆解需求和指标，然后是阵列、测向算法、跟踪与视听融合的选型和仿真结果，最后是数据集、评测方案、原型路线和待确认事项。");
}

// 2. 结论先行
pres.addSection({ title: "需求与指标" });
{
  const s = newSlide("需求与指标");
  title(s, "12 月原型建议：先做唤醒后声源定位与持续跟踪 demo",
    "首轮以 SRP-PHAT 为测向基线，对比有无起始段加权，再接入圆周卡尔曼跟踪；方位与置信度同时供波束成形和云台使用");
  // 左：方案、进展、数据
  box(s, 0.55, 1.45, 8.0, 4.55, TEAL_L, TEAL, "原型建议", 0.1);
  const rows = [
    ["首选方案", [
      "唤醒后从环形缓存取唤醒词片段测向：SRP-PHAT 基线，起始段加权作对照",
      "唤醒前已存在的干扰（电视）：用唤醒前背景白化（GEVD-MUSIC）作为候选，与基线同表对比",
      "之后圆周卡尔曼持续跟踪；云台状态机负责确认、死区、转动时冻结测向"]],
    ["当前进展", [
      "仿真已完成静态测向、移动跟踪、模拟云台闭环、电视干扰四组实验",
      "唤醒词片段 + 电视同等响度（RT60 0.6 s）：10° 内命中率 35% → 63%（背景白化）；下一轮验证实际唤醒词与真实录音"]],
    ["首轮数据", [
      "LOCATA：Task 1 静态测向、Task 3 移动说话人跟踪",
      "带唤醒词起止样点与方位真值的多通道音频：测首次定向精度与输出时延"]],
  ];
  let y = 1.62;
  const hs = [1.6, 1.25, 1.0];
  rows.forEach((r, i) => {
    T(s, r[0], { x: 0.8, y: y, w: 1.3, h: 0.36, fontSize: 14, bold: true, color: TEAL });
    T(s, bullets(r[1], 12.5, TEXT, 4), { x: 2.1, y: y + 0.02, w: 6.25, h: hs[i] - 0.05 });
    if (i < rows.length - 1) s.addShape(pres.shapes.LINE, { x: 0.8, y: y + hs[i] - 0.06, w: 7.55, h: 0, line: { color: TEAL_M, width: 0.75 } });
    y += hs[i] + 0.08;
  });
  // 右：请确认
  box(s, 8.75, 1.45, 4.05, 4.55, AMBER_L, null, "请确认", 0.1);
  T(s, "请确认", { x: 9.0, y: 1.62, w: 3.6, h: 0.4, fontSize: 15, bold: true, color: AMBER });
  const qs = [
    ["原型阵列与板卡", "麦克风数量、间距、安装位置"],
    ["唤醒模块可提供的时间信息", "唤醒词起止样点、置信度、回调延迟"],
    ["波束成形需要的定位输出", "方位、置信度、更新率"],
  ];
  qs.forEach((q, i) => {
    const yy = 2.2 + i * 1.22;
    circleNum(s, 9.0, yy, 0.46, String(i + 1), AMBER, 12);
    T(s, q[0], { x: 9.6, y: yy - 0.02, w: 3.05, h: 0.5, fontSize: 13, bold: true, color: TEXT, valign: "middle" });
    T(s, q[1], { x: 9.6, y: yy + 0.48, w: 3.05, h: 0.55, fontSize: 11.5, color: GRAY });
  });
  // 底：后续方向
  box(s, 0.55, 6.15, 12.25, 0.62, LIGHT2, BORDER, "后续方向", 0.08);
  T(s, [{ text: "后续方向（视原型结果再定）　", options: { bold: true, color: NAVY } },
    { text: "轻量神经网络纯测向，提升短时间窗 + 混响下的精度；视听融合与异响事件触发" }],
    { x: 0.8, y: 6.15, w: 11.8, h: 0.62, fontSize: 12.5, valign: "middle" });
  s.addNotes("先说结论：12 月原型建议先做唤醒后的声源定位与持续跟踪 demo。用户说完唤醒词后，从环形缓存取出唤醒词片段测出方向，之后持续跟踪，方位和置信度同时给波束成形和云台。测向首轮以 SRP-PHAT 为基线，把起始段加权作为对照变量；针对电视这类在唤醒前就存在的干扰，另把唤醒前背景白化的 GEVD-MUSIC 作为候选，和基线放在同一张表里比。目前仿真已经完成四组实验，最新一组是唤醒词片段加电视干扰：电视和人声一样响时，10 度以内的命中率从 35% 提高到 63%。下一步用实际唤醒词和真实录音验证。首轮数据用 LOCATA 的 Task 1 和 Task 3，再加一批带唤醒词起止时间和方位真值的多通道录音。右边三件事需要确认：原型用哪块阵列和板卡、唤醒模块能给出哪些时间信息、波束成形需要定位输出什么。神经网络和视听融合放在后续，视原型结果再定。");
}

// 3. 场景闭环
{
  const s = newSlide("需求与指标");
  title(s, "场景一闭环：唤醒 → 定向 → 转向与波束对准 → 视觉接管 → 持续跟踪");
  const steps = [
    ["语音唤醒", "唤醒模块检测唤醒词", "给出唤醒词起止时间，触发定位"],
    ["唤醒词定向", "用缓存的唤醒词片段测方位", "换算到设备固定坐标系（阵列随云台转时需叠加云台角）"],
    ["转向 + 波束", "云台转向说话人，波束指向说话人", "转动期间冻结测向，避开电机噪声"],
    ["视觉接管", "人形 / 人脸检测确认目标", "把目标居中对准"],
    ["持续跟踪", "跟踪说话人，方位持续更新", "波束与云台跟随；出画面时声学重新捕获"],
  ];
  const bw = 2.2, gap = 0.31, y = 1.45, h = 2.35;
  steps.forEach((st, i) => {
    const x = 0.55 + i * (bw + gap);
    const acoustic = i < 3;
    box(s, x, y, bw, h, acoustic ? RED_L : TEAL_L, null, "步骤" + (i + 1), 0.1);
    circleNum(s, x + 0.18, y + 0.2, 0.5, String(i + 1), acoustic ? RED : TEAL, 13);
    T(s, st[0], { x: x + 0.8, y: y + 0.2, w: bw - 0.9, h: 0.5, fontSize: 15, bold: true, valign: "middle" });
    T(s, bullets([st[1], st[2]], 13.5, TEXT, 8), { x: x + 0.18, y: y + 0.9, w: bw - 0.3, h: h - 1.0 });
    if (i < 4) arrow(s, x + bw + 0.03, y + h / 2, gap - 0.06, 0);
  });
  // 回环
  const x1c = 0.55 + bw / 2, x5c = 0.55 + 4 * (bw + gap) + bw / 2, yb = y + h, yl = 4.3;
  seg(s, x5c, yb, 0, yl - yb); seg(s, x1c, yl, x5c - x1c, 0);
  arrow(s, x1c, yb + 0.02, 0, yl - yb - 0.02, { flipV: true });
  T(s, "目标丢失或出现新事件 → 回到监听", { x: 4.2, y: yl + 0.05, w: 5, h: 0.3, fontSize: 11, color: GRAY, align: "center" });
  // 分区
  const zA = 0.55, zAw = 3 * bw + 2 * gap, zB = 0.55 + 3 * (bw + gap), zBw = 2 * bw + gap;
  box(s, zA, 4.85, zAw, 0.95, RED_L, null, "声学主导区", 0.08);
  T(s, [{ text: "声学主导　", options: { bold: true, color: RED } }, { text: "唤醒、定向、波束对准：误差只要让目标进入画面中央即可" }],
    { x: zA + 0.25, y: 4.85, w: zAw - 0.4, h: 0.95, fontSize: 13, valign: "middle" });
  box(s, zB, 4.85, zBw, 0.95, TEAL_L, null, "视觉主导区", 0.08);
  T(s, [{ text: "视觉主导　", options: { bold: true, color: TEAL } }, { text: "视场内精定位、确认是谁在说话" }],
    { x: zB + 0.25, y: 4.85, w: zBw - 0.4, h: 0.95, fontSize: 13, valign: "middle" });
  T(s, "已有先例：华为智选海雀雀蛋 Pro“海雀海雀”唤醒后转向（双麦，2025）；Amazon Echo Show 10 唤醒词转屏（已停产）；萤石 C6C 3 麦声源定位",
    { x: 0.55, y: 6.15, w: 12.25, h: 0.5, fontSize: 11.5, color: GRAY, valign: "middle" });
  s.addNotes("场景一的闭环是五步：用户说唤醒词，唤醒模块检测到后给出唤醒词的起止时间；定位模块用缓存的这段唤醒词音频测出说话人方向，换算到设备固定坐标系——阵列固定在底座时直接可用，阵列随云台转动时要叠加云台角；然后云台转过去、波束指向说话人，转动期间冻结测向；画面里由人形或人脸检测确认目标；之后持续跟踪，方位不断更新给波束和云台。前三步是声学主导，精度只要让人进入画面中央即可，关键是稳。这个流程已有先例：华为智选的雀蛋 Pro 喊“海雀海雀”会转向说话人，Echo Show 10 也是唤醒词转屏。");
}

// 3b. 三技术分工与接口
{
  const s = newSlide("需求与指标");
  title(s, "模块与接口：唤醒给“何时”，定位给“在哪”，波束成形与云台按方位执行",
    "下表为建议格式，状态列标出待确认项；格式可随唤醒模块调整");
  const flow = [
    ["麦克风阵列", "16 kHz；3 s 环形缓存", LIGHT, NAVY],
    ["语音唤醒", "检测唤醒词 → 起止时间、置信度", AMBER_L, AMBER],
    ["声源定位", "唤醒词片段测向 + 持续跟踪", TEAL_L, TEAL],
    ["波束成形", "按方位增强说话人语音", LIGHT, NAVY],
    ["云台与视觉", "转向、视觉确认、居中", LIGHT, NAVY],
  ];
  const fw = 2.3, fg = 0.19;
  flow.forEach((f, i) => {
    const x = 0.55 + i * (fw + fg);
    box(s, x, 1.42, fw, 1.05, f[2], null, "流程" + i, 0.1);
    T(s, f[0], { x: x + 0.12, y: 1.5, w: fw - 0.24, h: 0.38, fontSize: 12.5, bold: true, color: f[3], align: "center" });
    T(s, f[1], { x: x + 0.12, y: 1.9, w: fw - 0.24, h: 0.5, fontSize: 10.5, color: TEXT, align: "center" });
    if (i < 4) arrow(s, x + fw + 0.02, 1.95, fg - 0.04, 0);
  });
  table(s, [
    [H("接口"), H("内容"), H("建议格式"), H("状态")],
    [cell("阵列 → 各模块", { bold: true }), "麦克风数量、几何、采样率、帧长、缓存长度", "16 kHz；帧 16 ms；环形缓存 3 s（含唤醒词前约 1 s 背景）", cell("待确认", { color: AMBER, bold: true, align: "center" })],
    [cell("唤醒 → 定位", { bold: true }), "触发时刻、唤醒词起止样点、置信度；唤醒跑在哪个通道 / 波束", "回调或消息；样点级时间戳", cell("待确认", { color: AMBER, bold: true, align: "center" })],
    [cell("定位 → 波束成形", { bold: true }), "方位（俯仰可选）、置信度、更新时刻", "每 100 ms；低置信度时保持上一方向", cell("待确认", { color: AMBER, bold: true, align: "center" })],
    [cell("定位 → 云台", { bold: true }), "设备固定坐标系方位、是否转动；读取云台角与电机状态", "状态机输出（死区、确认、冻结）", cell("原型已有", { color: TEAL, bold: true, align: "center" })],
  ], { x: 0.55, y: 2.75, w: 12.25, colW: [2.2, 4.6, 4.0, 1.45], rowH: [0.42, 0.55, 0.65, 0.55, 0.55], fontSize: 12 });
  box(s, 0.55, 5.6, 12.25, 1.15, LIGHT2, BORDER, "设计选择", 0.08);
  T(s, [{ text: "设计选择　", options: { bold: true, color: NAVY } },
    { text: "唤醒若跑在多个固定波束上，可直接用得分最高的波束作粗方向；但 Amazon 指出波束选择不适合直接驱动转动，所以建议“先唤醒、再用唤醒词片段精确测向”。" }],
    { x: 0.8, y: 5.62, w: 11.8, h: 1.1, fontSize: 12.5, valign: "middle" });
  s.addNotes("这页讲模块和接口。唤醒告诉系统“什么时候”有人在叫设备，并给出唤醒词的起止时间；定位告诉大家“人在哪”，每 100 毫秒输出方位和置信度；波束成形和云台按这个方位执行。表里是建议格式：阵列参数、唤醒的输出、波束成形需要的输出都待确认，云台这一侧原型代码里已经有状态机。缓存建议 3 秒，因为唤醒词定向要用唤醒词前约 1 秒的背景来抑制电视等干扰。还有一个设计选择：如果唤醒本身跑在多个固定波束上，最高分的波束可以当粗方向，但 Amazon 的技术博客明确说波束选择不适合直接驱动转动，所以建议先唤醒、再用唤醒词片段精确测向。");
}

// 4. 指标
{
  const s = newSlide("需求与指标");
  title(s, "精度要求由镜头视场反推：方位误差小于 HFOV/4，目标即落在画面中央一半");
  T(s, "允许误差 ≤ HFOV / 4", { x: 0.55, y: 1.45, w: 5.2, h: 0.55, fontSize: 24, bold: true, color: TEAL });
  T(s, "转向后目标落在画面中央一半，就能交给视觉精对准。以 HFOV = 90° 为例，允许 ±22.5°；取 ±10° 作设计目标，为人员移动和跟踪延迟留余量。",
    { x: 0.55, y: 2.05, w: 5.2, h: 1.0, fontSize: 12.5, color: GRAY });
  const cx = 3.1, cy = 5.75, R = 2.45;
  const pie = (a0, a1, col, nm, r) => s.addShape(pres.shapes.PIE, { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r,
    angleRange: [a0, a1], fill: { color: col }, line: { color: WHITE, width: 1 }, objectName: nm });
  pie(225, 315, "DCE5F0", "视场", R); pie(247.5, 292.5, TEAL_M, "中央一半", R); pie(260, 280, TEAL, "设计目标", R);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx - 0.3, y: cy - 0.12, w: 0.6, h: 0.36, fill: { color: NAVY },
    line: { type: "none" }, rectRadius: 0.06, objectName: "摄像头" });
  const leg = [["DCE5F0", "水平视场 HFOV = 90°（示例）"], [TEAL_M, "中央一半：±22.5°"], [TEAL, "设计目标：±10°"]];
  leg.forEach((l, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: 0.75, y: 6.25 + i * 0.25, w: 0.18, h: 0.16, fill: { color: l[0] }, line: { type: "none" } });
    T(s, l[1], { x: 1.0, y: 6.2 + i * 0.25, w: 3, h: 0.25, fontSize: 10.5, color: GRAY, valign: "middle" });
  });
  T(s, "建议指标（目标值待与产品需求对齐；时延从唤醒词结束计时）", { x: 6.15, y: 1.45, w: 6.6, h: 0.4, fontSize: 14, bold: true, color: NAVY });
  table(s, [
    [H("指标"), H("定义"), H("建议目标")],
    [cell("方位误差", { bold: true }), "单声源、RT60 ≤ 0.6 s、SNR ≥ 10 dB 下的平均绝对误差", cell("≤ 10°", { align: "center", bold: true, color: TEAL })],
    [cell("转向命中率", { bold: true }), "转动结束后目标位于画面中央一半的比例", cell("≥ 90%", { align: "center", bold: true, color: TEAL })],
    [cell("粗大错误率", { bold: true }), "误差 > 45°（含前后混淆）的比例", cell("≤ 3%", { align: "center", bold: true, color: TEAL })],
    [cell("定向 / 转向时延", { bold: true }), "唤醒词结束 → 输出方位 / 云台开始转动", cell("≤ 0.1 s / ≤ 0.5 s", { align: "center", bold: true, color: TEAL })],
    [cell("误转率", { bold: true }), "无有效唤醒时的转动次数（含电视误唤醒）", cell("≤ 1 次/小时", { align: "center", bold: true, color: TEAL })],
    [cell("端侧开销", { bold: true }), "常开链路的算力、内存与功耗", cell("【待定】", { align: "center", bold: true, color: AMBER })],
  ], { x: 6.15, y: 1.95, w: 6.65, colW: [1.35, 3.75, 1.55], rowH: 0.62, fontSize: 12 });
  T(s, "后文仿真结果为当前进展，计时起点与条件各页单独注明，不直接对应本页目标。", { x: 6.15, y: 6.4, w: 6.65, h: 0.3, fontSize: 10.5, color: GRAY });
  s.addNotes("精度要求可以从镜头视场反推：转向后只要目标落在画面中央一半，视觉就能接手，所以允许误差是水平视场角的四分之一。以 90 度视场为例是正负 22.5 度，取正负 10 度作为设计目标，给人员移动和延迟留余量。所以这个场景的难点不是精度，而是稳健：粗大错误率、误转率和响应时延更关键。右边的数值都是建议值，需要和产品需求对齐，端侧开销要等目标芯片确定。时延都从唤醒词结束开始算；后面仿真页里的时间是从能量触发算的，条件不同，不直接对比。");
}

// 5. 难点与对策
{
  const s = newSlide("需求与指标");
  title(s, "五个工程难点决定方案取舍：小孔径、混响干扰、电机自噪声、间歇多源、常开功耗");
  const R = (n, a, b, c) => [cell(n + "　" + a, { bold: true, color: NAVY }), b, c];
  table(s, [
    [H("难点"), H("对测向的影响"), H("对策（对应模块）")],
    R("1", "小孔径、少阵元\n（2–4 麦，3–6 cm）", "低频角分辨率差；间距 4 cm 时约 4.3 kHz 以上出现空间混叠；2 麦线阵前后对称，只能测 0–180°",
      "≥ 3 麦平面阵；空间特征限定在混叠频率以下；2 麦方案借云台小角度转动消除前后模糊"),
    R("2", "室内混响与定向干扰\n（电视、音箱）", "墙面反射产生伪峰；电视里的人声触发误转",
      "PHAT 加权 + 起始段加权；唤醒前背景白化（GEVD-MUSIC）；干扰方向表 + 视觉复核（无人形不跟）"),
    R("3", "云台电机自噪声，\n阵列可能随云台转动", "转动时测向失真；阵列随云台转时坐标系随转角变化",
      "电机状态门控（转动期间冻结测向）；阵列随云台转时用云台角换算到设备固定坐标系；后续做电机噪声模板抑制"),
    R("4", "声源间歇、移动、\n多人同时说话", "说话停顿即丢目标；多人时不确定转向谁",
      "跟踪器静音保持；事件优先级 + 最近激活策略；多目标跟踪预研"),
    R("5", "常开低功耗", "网络全时运行功耗高", "两级触发：轻量检测常开，确认后再唤醒测向网络"),
  ], { x: 0.55, y: 1.45, w: 12.25, colW: [2.75, 4.5, 5.0], rowH: [0.45, 0.95, 0.85, 0.85, 0.85, 0.65], fontSize: 12.5 });
  T(s, "注：空间混叠频率 f = c / 2d（c ≈ 343 m/s，d 为阵元间距）", { x: 0.55, y: 6.4, w: 12, h: 0.3, fontSize: 11, color: GRAY });
  s.addNotes("这五个难点决定了后面的选型。第一，摄像头体积小，阵元少、孔径小，低频分辨率差，高频又会空间混叠，间距 4 厘米时大约 4.3 kHz 以上就混叠了；如果只有 2 个麦，还有前后模糊。第二，家里混响和电视是误转的主要来源。第三，云台电机转动时的自噪声；如果阵列装在云台头上，坐标系还会跟着转。第四，人说话有停顿、会移动、会多人同时说。第五，常开链路必须低功耗。右列是对应的对策，后面几页逐一展开。");
}

// 6. 阵列构型
pres.addSection({ title: "方案选型" });
{
  const s = newSlide("方案选型");
  title(s, "阵列构型：仿真以 4 麦平面阵为候选配置，3 麦单声源精度接近；2 麦需借云台转动消歧");
  // 几何示意
  const colX = [2.45, 4.55, 6.65], colW = 2.1;
  const geos = [[[0.6, 0.3], [1.5, 0.3]], [[1.05, 0.08], [0.6, 0.55], [1.5, 0.55]], [[0.7, 0.1], [1.4, 0.1], [0.7, 0.55], [1.4, 0.55]]];
  s.addImage({ path: img("fig_srp_2v3v4.png"), x: 7.6, y: 1.38, w: 5.2, h: 5.2 * 2.45 / 5.4, altText: "2/3/4 麦阵列对同一声源的 SRP-PHAT 空间谱", objectName: "阵列空间谱图" });
  T(s, "仿真：同一声源（RT60 = 0.4 s）的 SRP-PHAT 空间谱，红色虚线为真实方向。旁证：双麦的雀蛋 Pro 评测称“正面 180° 内识别”", { x: 7.7, y: 3.66, w: 5.1, h: 0.45, fontSize: 9.5, color: GRAY });
  const G = (t) => cell(t, { align: "center" });
  const best = (t, o) => cell(t, Object.assign({ align: "center", fill: { color: TEAL_L } }, o || {}));
  table(s, [
    [H(""), H("2 麦线阵"), H("3 麦三角阵"), H("4 麦方阵 / 圆阵")],
    [cell("方位覆盖", { bold: true }), G("0–180°（前后对称）"), G("0–360°"), best("0–360°")],
    [cell("同时声源数\n（子空间法上限 M−1）", { bold: true }), G("1"), G("2"), best("3")],
    [cell("俯仰角", { bold: true }), G("不可测"), G("可测，上下对称"), best("可测，上下对称")],
    [cell("适配算法", { bold: true }), G("GCC-PHAT、LightDOA"), G("SRP-PHAT、神经网络"), best("SRP-PHAT、MUSIC、\n4 通道 SALSA-Lite")],
    [cell("成本", { bold: true }), G("最低"), G("中"), best("中高")],
    [cell("结论", { bold: true }), G("低成本档，需主动消歧"), G("可用：单声源精度接近 4 麦"), best("当前仿真配置（候选）", { bold: true, color: TEAL })],
  ], { x: 0.55, y: 1.45, w: 6.8, colW: [1.6, 1.7, 1.7, 1.8], rowH: [0.45, 0.62, 0.85, 0.62, 0.95, 0.5, 0.62], fontSize: 11.5 });
  box(s, 7.6, 4.15, 5.2, 2.6, LIGHT, null, "安装位置说明", 0.1);
  T(s, "安装位置：两种条件", { x: 7.8, y: 4.25, w: 4.8, h: 0.35, fontSize: 13.5, bold: true, color: NAVY });
  T(s, bullets([
    [{ text: "固定在底座：", options: { bold: true } }, { text: "声学方位已在设备固定坐标系，转向量 = 目标方位 − 云台角；当前闭环仿真采用此方式" }],
    [{ text: "随云台转动：", options: { bold: true } }, { text: "阵列局部方位须加云台角换到固定坐标系；转动中相当于“移动阵列”（LOCATA 移动阵列任务）" }],
    [{ text: "孔径取舍：", options: { bold: true } }, { text: "孔径越大角分辨率越好，但混叠频率越低（d = 5 cm 时约 3.4 kHz）；建议 5–6 cm" }],
    [{ text: "【待确认】", options: { bold: true, color: AMBER } }, { text: "产品阵元数、间距与安装位置" }],
  ], 11.5, TEXT, 4), { x: 7.8, y: 4.62, w: 4.85, h: 2.1 });
  s.addNotes("算法要先看硬件。2 麦线阵成本最低，但前后对称，只能测 0 到 180 度；可以让云台小角度转一下，看方位变化的方向来消除前后模糊，这是机器人听觉里成熟的做法（Ma 等，TASLP 2017）。3 麦以上的平面阵就能覆盖 360 度。当前仿真用 4 麦作为候选配置，因为能同时分辨更多声源，也能兼容 4 通道的网络方法；仿真显示单声源精度上 3 麦和 4 麦接近，所以成本敏感时 3 麦也可以接受，目标硬件待确认。安装位置分两种：阵列固定在底座时，声学方位本身就在设备固定坐标系里，转多少直接用目标方位减去云台角，当前的闭环仿真就是这种；阵列随云台转动时，要先用云台姿态把阵列测到的局部方位换到固定坐标系，转动中相当于移动阵列。");
}

// 7. 测向算法选型
{
  const s = newSlide("方案选型");
  title(s, "测向算法选型：SRP-PHAT 为首轮基线，起始段加权为对照变量；唤醒前背景白化作抗干扰候选");
  const hl = (t, o) => cell(t, Object.assign({ fill: { color: TEAL_L } }, o || {}));
  const hs = (c) => { c.options.fill = { color: TEAL_L }; return c; };
  table(s, [
    [H("方法（出处）"), H("原理"), H("混响/噪声\n鲁棒"), H("多声源"), H("事件类别"), H("端侧开销"), H("定位")],
    [cell("GCC-PHAT", { bold: true }), "麦克风对时延估计", MID(), WEAK(), WEAK("无"), cell("极低"), cell("2 麦方案组件")],
    [hl("SRP-PHAT（pyroomacoustics 可复现）", { bold: true }), hl("扫描方位网格上各麦克风对的 PHAT 能量（本次实验 1° 网格；5° 为待验证的降算力配置）"), hs(MID()), hs(MID()), hs(WEAK("无")), hl("低"), hl("12 月原型基线", { bold: true, color: TEAL })],
    [hl("GEVD-MUSIC（IROS 2009；HARK 实现）", { bold: true }), hl("用唤醒前背景协方差白化唤醒词片段，再做子空间扫描"), hs(STRONG("强（唤醒前已有的干扰）")), hs(MID()), hs(WEAK("无")), hl("中（唤醒时算一次）"), hl("唤醒词定向候选", { bold: true, color: TEAL })],
    [cell("MUSIC", { bold: true }), "子空间谱估计", WEAK("弱（相干反射）"), STRONG(), WEAK("无"), cell("中"), cell("对照")],
    [cell("Cross3D-Edge（ACM TECS 2023）", { bold: true }), "SRP 功率图 + 裁剪后的 3D CNN", STRONG(), WEAK("单声源"), WEAK("无"), cell("树莓派 4B 8.6 ms/帧"), cell("后续纯测向候选")],
    [cell("LightDOA（arXiv 2025）", { bold: true }), "双通道 IPD + 轻量卷积 + GRU，0–180°", MID(), WEAK(), WEAK("无"), cell("低"), cell("2 麦方案备选")],
    [cell("FN-SSL / IPDnet（Interspeech 2023/2024）", { bold: true }), "全带-窄带融合估计直达声 IPD", STRONG(), STRONG("强（IPDnet）"), WEAK("无"), cell("较高"), cell("精度参照 / 教师模型")],
    [cell("轻量 SELD（SALSA-Lite + CRNN + Multi-ACCDOA）", { bold: true }), "逐帧输出“类别 × 方向向量”", STRONG(), STRONG(), STRONG("有"), cell("中，可裁剪"), cell("异响扩展")],
  ], { x: 0.55, y: 1.38, w: 12.25, colW: [3.0, 3.35, 1.35, 1.15, 0.8, 1.3, 1.3], rowH: [0.48, 0.4, 0.6, 0.6, 0.4, 0.45, 0.45, 0.45, 0.45], fontSize: 11 });
  T(s, "首轮比较：SRP-PHAT 有 / 无起始段加权 → 接入跟踪器；唤醒词定向另比 GEVD-MUSIC。唤醒已判断“是不是人声”，后续网络先做纯测向，SELD 留给异响扩展。评级综合各论文报告与原理分析，以统一测试矩阵复测为准。",
    { x: 0.55, y: 6.38, w: 12.25, h: 0.55, fontSize: 10.5, color: GRAY });
  s.addNotes("这页是测向算法的选型，写成首轮要做的比较。SRP-PHAT 免训练、开销低、pyroomacoustics 可直接复现，作为 12 月原型的基线；起始段加权作为对照变量，看它在短片段上是否稳定有效。本次实验用的是 1 度网格，表里提到的 5 度网格是待验证的降算力配置。GEVD-MUSIC 是机器人听觉里的成熟方法，用唤醒前那段背景的空间协方差把干扰白化掉，正好对应“唤醒前电视已经在响”的场景，作为唤醒词定向的候选；它只在唤醒时算一次，每个频点做一次 4 乘 4 的特征分解。普通 MUSIC 对相干反射敏感，只作对照。Cross3D-Edge 在树莓派上 8.6 毫秒一帧，是后续纯测向网络的候选；LightDOA 适合 2 麦；FN-SSL 和 IPDnet 精度强但开销高，作为精度参照或蒸馏的教师模型。轻量 SELD 能同时给出事件类别和方向，但唤醒已经判断了是不是人声，所以留到需要事件类别的异响扩展再用。评级需要在统一测试矩阵上复测确认。");
}

// 7b. 初步仿真：静态测向
{
  const s = newSlide("方案选型");
  title(s, "初步仿真：3/4 麦累积 2.5 s 时误差约 2–10°；1 s 片段下起始段加权明显降低误差",
    "做法：150 个随机房间 × 4 档混响；同孔径 5.7 cm 的 2 / 3 / 4 麦阵列；2.5 s 中文语音；SNR 15 dB；300–4000 Hz、1° 网格（本次实验配置）");
  s.addImage({ path: img("fig_srp_rt60.png"), x: 0.45, y: 1.38, w: 8.4, h: 8.4 * 2.55 / 8.6, altText: "4 麦 SRP-PHAT 空间谱随混响时间变化", objectName: "混响空间谱图" });
  box(s, 9.05, 1.4, 3.75, 2.5, TEAL_L, null, "仿真要点", 0.1);
  T(s, bullets([
    [{ text: "3 麦 ≈ 4 麦 ≫ 2 麦：", options: { bold: true } }, { text: "2 麦 37–61% 为镜像 / 粗大错误" }],
    [{ text: "单帧（32 ms）：", options: { bold: true } }, { text: "误差 ≤10° 的比例从 100% 降到 18%" }],
    [{ text: "1 s 片段（接近唤醒词）：", options: { bold: true } }, { text: "4 麦、RT60 0.8 s，起始段加权使平均误差 12.9° → 8.5°，10° 内命中 54% → 69%" }],
    [{ text: "下一步：", options: { bold: true, color: TEAL } }, { text: "用实际唤醒词片段复测" }],
  ], 11, TEXT, 3), { x: 9.2, y: 1.5, w: 3.5, h: 2.35 });
  const labels = ["0.2 s", "0.4 s", "0.6 s", "0.8 s"];
  const mk = (vals) => [
    { name: "2 麦线阵", labels, values: vals[0] }, { name: "3 麦三角阵", labels, values: vals[1] }, { name: "4 麦方阵", labels, values: vals[2] }];
  const copt = (t) => ({ x: 0, y: 0, w: 6.0, h: 2.75, chartColors: [AMBER, "2F6EB5", TEAL], lineSize: 2.25, lineDataSymbol: "circle",
    lineDataSymbolSize: 7, showLegend: true, legendPos: "r", legendFontSize: 10, legendFontFace: "+mn-lt", showTitle: true, title: t,
    titleFontSize: 12, titleFontFace: "+mn-lt", titleColor: NAVY, valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 25,
    valAxisLabelFontSize: 9.5, catAxisLabelFontSize: 9.5, valAxisLabelFontFace: "+mn-lt", catAxisLabelFontFace: "+mn-lt",
    valAxisLabelColor: GRAY, catAxisLabelColor: GRAY, valGridLine: { color: "E3E8EF", size: 0.75 }, catGridLine: { style: "none" },
    showCatAxisTitle: true, catAxisTitle: "混响时间 RT60", catAxisTitleFontSize: 9.5, catAxisTitleColor: GRAY, dataLabelFontSize: 9 });
  s.addChart(pres.charts.LINE, mk([[32.0, 14.7, 10.7, 7.3], [98.7, 85.3, 75.3, 72.0], [99.3, 86.0, 83.3, 63.3]]),
    Object.assign(copt("误差 ≤ 10° 的比例（%）"), { x: 0.55, y: 4.0 }));
  s.addChart(pres.charts.LINE, mk([[37.3, 58.7, 60.7, 60.7], [0.0, 0.0, 0.0, 0.7], [0.0, 0.0, 0.0, 0.0]]),
    Object.assign(copt("粗大错误率：误差 > 45°（%）"), { x: 6.8, y: 4.0 }));
  s.addNotes("这是用镜像源法做的初步仿真：150 个随机房间、4 档混响，比较同孔径的 2、3、4 麦阵列跑 SRP-PHAT 基线。下面两张曲线是累积 2.5 秒语音的结果：3 麦和 4 麦很接近，平均误差约 2 到 10 度，基本没有粗大错误；2 麦因为前后镜像，37% 到 61% 是粗大错误，所以 2 麦必须配合转动消歧。上面是单帧，也就是 32 毫秒的空间谱：混响越强峰越宽，单帧误差小于 10 度的比例从 100% 掉到 18%。所以真正的难点不是长时间累积后的精度，而是短时间窗加混响——响应要快就只能用很短的数据。把语音缩短到 1 秒、接近唤醒词长度时，起始段加权的作用就体现出来了：4 麦、RT60 0.8 秒下，平均误差从 12.9 度降到 8.5 度，10 度内命中率从 54% 提到 69%，所以把它列为对照变量；下一轮用实际唤醒词片段复测。另外 3 麦和 4 麦单声源精度接近，4 麦的优势在多声源能力和兼容 4 通道网络；成本敏感时 3 麦是可接受的折中。这是初步仿真，没有家具散射和真实噪声，需要在真实数据上复核。");
}

// 7c. 唤醒词定向仿真
{
  const s = newSlide("方案选型");
  title(s, "唤醒词定向仿真：电视与人声同样响时，唤醒前背景白化把 10° 内命中率从 35% 提到 63%",
    "做法：每档混响 100 个随机房间；中文语音起始 1 s 代替唤醒词；电视持续播放、与说话人相隔 ≥ 45°；4 麦 5.7 cm；SNR 20 dB");
  s.addImage({ path: img("fig_wake_doa.png"), x: 0.55, y: 1.38, w: 12.25, h: 12.25 * 792 / 2288, altText: "唤醒词定向精度对比与示例空间谱", objectName: "唤醒词定向图" });
  const pts = [
    ["方法", NAVY, LIGHT, "用唤醒词前约 1 s 的背景（电视 + 噪声）估计空间协方差，白化唤醒词片段后做 MUSIC（GEVD-MUSIC）；不用背景段时电视同样会把结果拉偏"],
    ["结果", TEAL, TEAL_L, "电视关时与基线持平（88%）；电视比人声响 5 dB 时 20% → 55%；唤醒起止点误差 0.1 s 影响很小；置信度最高的三分之一中 93% 在 10° 内"],
    ["局限", AMBER, AMBER_L, "要求唤醒前用户未说话；人与电视方位相近（< 45°）未评测；仿真为鞋盒房间，下一轮用实际唤醒词录音复测"],
  ];
  pts.forEach((p, i) => {
    const x = 0.55 + i * 4.17, w = 3.97, y = 5.72;
    box(s, x, y, w, 1.12, p[2], null, "唤醒要点" + i, 0.08);
    T(s, p[0], { x: x + 0.15, y: y + 0.08, w: 0.6, h: 0.3, fontSize: 12.5, bold: true, color: p[1] });
    T(s, p[3], { x: x + 0.8, y: y + 0.08, w: w - 0.92, h: 1.0, fontSize: 10.5, color: TEXT });
  });
  s.addNotes("这页是最贴近目标场景的一组仿真：唤醒词只有约 1 秒，电视在一旁持续播放。用中文语音静音后起始的 1 秒代替唤醒词，每档混响 100 个随机房间。左图是 RT60 0.6 秒时 10 度以内的命中率：电视关时各方法接近，约 88%；电视和人声一样响时，SRP-PHAT 加起始段加权只有 35%，其中四分之一是粗大错误；改用唤醒前背景白化的 GEVD-MUSIC 后提高到 63%，粗大错误降到 3%。原理是用户说唤醒词之前，缓存里只有电视和噪声，用这段估计背景的空间协方差，再白化唤醒词片段，电视方向就被压下去，右边的空间谱能看到这一点。去掉背景段的 MUSIC 同样会被电视拉偏，说明提升来自背景白化。唤醒起止点有 0.1 秒误差时影响很小；置信度也可用，置信度最高的三分之一里 93% 在 10 度以内。局限是要求唤醒前用户没在说话、人和电视方位相近的情况还没测，下一轮用实际唤醒词录音复测。");
}

// 8. 推荐架构
{
  const s = newSlide("方案选型");
  title(s, "原型架构：唤醒触发 → 唤醒词片段测向 → 持续跟踪 → 方位同时驱动波束成形与云台");
  const row1 = [
    ["4 麦阵列", "候选配置；16 kHz；3 s 环形缓存", 1.55],
    ["语音唤醒", "输出唤醒词起止样点与置信度", 2.05],
    ["特征提取", "STFT 32 ms；PHAT 加权互谱 / 空间协方差（原型）；网络特征（后续）", 3.0],
    ["测向", "基线：SRP-PHAT ± 起始段加权；候选：背景白化 GEVD-MUSIC", 2.45],
    ["输出", "每 100 ms：方位 + 置信度", 2.2],
  ];
  const g1 = (12.25 - row1.reduce((a, r) => a + r[2], 0)) / 4;
  let x = 0.55; const y1 = 1.45, h1 = 1.3;
  const xs1 = [];
  row1.forEach((r, i) => {
    xs1.push(x);
    box(s, x, y1, r[2], h1, i >= 2 ? TEAL_L : LIGHT, null, "模块1_" + i, 0.08);
    T(s, r[0], { x: x + 0.15, y: y1 + 0.12, w: r[2] - 0.3, h: 0.35, fontSize: 13.5, bold: true, color: i >= 2 ? TEAL : NAVY });
    T(s, r[1], { x: x + 0.15, y: y1 + 0.5, w: r[2] - 0.3, h: 0.75, fontSize: 11.5, color: TEXT });
    if (i < row1.length - 1) arrow(s, x + r[2] + 0.02, y1 + h1 / 2, g1 - 0.04, 0);
    x += r[2] + g1;
  });
  const row2 = [
    ["执行", "云台转向 + 波束对准 → 视觉接管", 2.2],
    ["转向决策", "置信度确认、优先级、死区、干扰方向表", 3.0],
    ["跟踪器", "原型：圆周卡尔曼；后续：粒子滤波", 3.0],
    ["坐标变换", "底座固定：直接用；随云台转：加云台角 → 设备固定坐标系", 3.0],
  ];
  const g2 = (12.25 - row2.reduce((a, r) => a + r[2], 0)) / 3;
  x = 0.55; const y2 = 3.35, h2 = 1.15; const xs2 = [];
  row2.forEach((r, i) => {
    xs2.push(x);
    box(s, x, y2, r[2], h2, i === 0 ? RED_L : LIGHT, null, "模块2_" + i, 0.08);
    T(s, r[0], { x: x + 0.15, y: y2 + 0.12, w: r[2] - 0.3, h: 0.35, fontSize: 13.5, bold: true, color: i === 0 ? RED : NAVY });
    T(s, r[1], { x: x + 0.15, y: y2 + 0.5, w: r[2] - 0.3, h: 0.6, fontSize: 11.5 });
    if (i > 0) arrow(s, x - g2 + 0.02, y2 + h2 / 2, g2 - 0.04, 0, { flipH: true });
    x += r[2] + g2;
  });
  // 第一行末 → 第二行末（向下）
  const xe = xs1[4] + row1[4][2] / 2;
  arrow(s, xe, y1 + h1 + 0.02, 0, y2 - y1 - h1 - 0.04);
  // 旁路输入
  const side = [["电机状态：转动中冻结测向", xs2[2]], ["视觉人形框：视听融合（后续）", xs2[2] + 1.55]];
  side.forEach((sd, i) => {
    s.addText(sd[0], { shape: pres.shapes.ROUNDED_RECTANGLE, x: xs2[1] + 0.0 + i * 3.1 + 1.2, y: 4.85, w: 2.9, h: 0.42,
      fill: { color: WHITE }, line: { color: BORDER, width: 1 }, rectRadius: 0.2, fontFace: FONT, fontSize: 11, color: GRAY,
      align: "center", valign: "middle", margin: 0 });
  });
  arrow(s, xs2[2] + 0.75, 4.85 - 0.02, 0, -(4.85 - y2 - h2 - 0.04), {});
  arrow(s, xs2[2] + 2.25, 4.85 - 0.02, 0, -(4.85 - y2 - h2 - 0.04), {});
  // 参数卡
  const cards = [
    ["唤醒词片段测向", "唤醒词约 0.5–1 s 集中测向，不需要事件分类；唤醒前约 1 s 背景用于抑制干扰"],
    ["给波束成形", "方位 + 置信度；低置信度时保持上一方向（见下页）"],
    ["原型算力【待定】", "本次实验 1° 网格（360 方向）；5° 网格（72 方向）为待验证的降算力配置"],
  ];
  cards.forEach((c, i) => {
    const cx = 0.55 + i * 4.15;
    box(s, cx, 5.6, 3.95, 1.15, LIGHT2, BORDER, "参数卡" + i, 0.08);
    T(s, c[0], { x: cx + 0.2, y: 5.7, w: 3.6, h: 0.32, fontSize: 12.5, bold: true, color: NAVY });
    T(s, c[1], { x: cx + 0.2, y: 6.03, w: 3.6, h: 0.65, fontSize: 11.5 });
  });
  s.addNotes("原型架构分两行看。上一行是感知：4 麦 16 kHz 输入并保留 3 秒环形缓存；唤醒模块检测到唤醒词后给出起止样点；定位模块取这段唤醒词音频，基线用 SRP-PHAT，对比有无起始段加权，候选是用唤醒前背景白化的 GEVD-MUSIC；每 100 毫秒输出方位和置信度。下一行是执行：方位先换到设备固定坐标系——阵列固定在底座时直接可用，随云台转动时加上云台角——再进跟踪器，由决策模块决定是否转；云台转向、波束对准，最后交给视觉。触发用的是唤醒，所以原型不需要事件分类网络；神经网络放到后续，用来提升短时精度。算力方面，本次实验用 1 度网格，5 度网格是待验证的降算力配置。");
}

// 8b. 波束成形对测向的要求
{
  const s = newSlide("方案选型");
  title(s, "波束成形对测向的要求：±10° 足够做延迟求和；小阵列难点在低频指向性，需要置信度配合",
    "计算：延迟求和波束按估计方向对准、信号来自真实方向时的增益损失（300–4000 Hz 平均，孔径 5.7 cm）");
  const labels = ["5°", "10°", "15°", "20°", "30°", "45°"];
  s.addChart(pres.charts.LINE, [
    { name: "2 麦线阵", labels, values: [0.04, 0.17, 0.39, 0.71, 1.63, 3.38] },
    { name: "4 麦方阵", labels, values: [0.03, 0.10, 0.23, 0.40, 0.88, 1.88] },
  ], { x: 0.55, y: 1.4, w: 6.0, h: 3.6, chartColors: [AMBER, TEAL], lineSize: 2.25, lineDataSymbol: "circle", lineDataSymbolSize: 7,
    showLegend: true, legendPos: "b", legendFontSize: 10, legendFontFace: "+mn-lt", showTitle: true, title: "测向误差 → 波束增益损失（dB）",
    titleFontSize: 12, titleFontFace: "+mn-lt", titleColor: NAVY, valAxisMinVal: 0, valAxisMaxVal: 4, valAxisMajorUnit: 1,
    valAxisLabelFontSize: 9.5, catAxisLabelFontSize: 9.5, valAxisLabelFontFace: "+mn-lt", catAxisLabelFontFace: "+mn-lt",
    valAxisLabelColor: GRAY, catAxisLabelColor: GRAY, valGridLine: { color: "E3E8EF", size: 0.75 }, catGridLine: { style: "none" },
    showCatAxisTitle: true, catAxisTitle: "测向误差", catAxisTitleFontSize: 9.5, catAxisTitleColor: GRAY,
    showValue: false });
  s.addImage({ path: img("fig_aliasing.png"), x: 6.8, y: 1.4, w: 6.0, h: 6.0 * 2.5 / 6.3, altText: "4 麦方阵在 1/3/6 kHz 的延迟求和波束图", objectName: "波束图" });
  T(s, "4 麦方阵延迟求和波束图：1 kHz 几乎全向，3 kHz 主瓣变窄，6 kHz 出现栅瓣", { x: 6.8, y: 3.82, w: 6.0, h: 0.3, fontSize: 10, color: GRAY });
  T(s, bullets([
    [{ text: "测向够用：", options: { bold: true } }, { text: "4 麦误差 10° 仅损失约 0.1 dB，20° 约 0.4 dB" }],
    [{ text: "真正瓶颈：", options: { bold: true } }, { text: "孔径小，1 kHz 以下延迟求和几乎无指向性，需超指向 / MVDR 类方法" }],
    [{ text: "配合要求：", options: { bold: true } }, { text: "这类方法对方向误差更敏感（判断，待仿真验证），定位须给置信度，低置信度时保持方向或退回宽波束" }],
  ], 12, TEXT, 4), { x: 6.85, y: 4.2, w: 5.95, h: 1.6 });
  box(s, 0.55, 5.95, 12.25, 0.8, LIGHT2, BORDER, "波束结论", 0.08);
  T(s, [{ text: "对定位的要求　", options: { bold: true, color: NAVY } }, { text: "方位误差 ≤ 10°、每 100 ms 更新、带置信度；波束成形算法另行选型，定位侧按此接口输出。" }],
    { x: 0.8, y: 5.95, w: 11.8, h: 0.8, fontSize: 12.5, valign: "middle" });
  s.addNotes("这页回答“定位要准到什么程度才能给波束成形用”。左图是计算结果：延迟求和波束按估计方向对准，而人其实在偏一点的方向，语音增益会损失多少。4 麦方阵误差 10 度只损失约 0.1 分贝，20 度约 0.4 分贝，所以正负 10 度对延迟求和完全够用。右图说明小阵列真正的瓶颈：孔径只有 5.7 厘米，1 kHz 以下延迟求和几乎没有指向性，要靠超指向或 MVDR 一类方法；这类方法对方向误差更敏感，这一点是判断，还要仿真验证，所以定位必须输出置信度，低置信度时让波束保持方向或退回宽波束。波束成形算法另行选型，定位侧先把接口和精度要求定下来。");
}

// 9. 跟踪与云台控制
{
  const s = newSlide("方案选型");
  title(s, "持续跟踪：跟踪器维持航迹，状态机控制云台，避免抖动、误转与静音丢失");
  table(s, [
    [H("跟踪器"), H("优点"), H("局限"), H("阶段")],
    [cell("圆周卡尔曼\n（状态：方位 + 角速度）", { bold: true }), "轻量、平滑、易调参", "单目标、单峰假设", cell("原型 ✓", { bold: true, color: TEAL, align: "center" })],
    [cell("粒子滤波\n（以 SRP / 网络输出作似然）", { bold: true }), "可处理多峰与伪峰，便于视听融合", "计算量随粒子数增长", cell("后续", { bold: true, color: NAVY, align: "center" })],
    [cell("GM-PHD 等多目标滤波", { bold: true }), "多人同时说话", "复杂度高", cell("预研", { color: GRAY, align: "center" })],
  ], { x: 0.55, y: 1.45, w: 6.6, colW: [2.45, 2.0, 1.4, 0.75], rowH: [0.42, 0.8, 0.8, 0.6], fontSize: 12 });
  box(s, 0.55, 4.35, 6.6, 2.4, LIGHT, null, "控制规则", 0.1);
  T(s, "云台控制规则", { x: 0.8, y: 4.5, w: 6, h: 0.35, fontSize: 14.5, bold: true, color: NAVY });
  T(s, bullets([
    [{ text: "确认：", options: { bold: true } }, { text: "连续 N 帧置信度超过阈值才转，抑制瞬态误触发" }],
    [{ text: "死区：", options: { bold: true } }, { text: "目标已在画面中央区域内不转，避免抖动" }],
    [{ text: "优先级：", options: { bold: true } }, { text: "呼救 / 哭声 > 异常声 > 人声；同级按最近激活" }],
    [{ text: "干扰表：", options: { bold: true } }, { text: "长时间固定方向、且视觉无人形的声源（如电视）记入干扰方向表" }],
  ], 13.5, TEXT, 7), { x: 0.8, y: 4.95, w: 6.2, h: 1.75 });
  // 状态机
  const sx = [7.55, 10.45], sy = [1.5, 3.3, 5.1], sw = 2.35, sh = 0.95;
  const st = [
    [0, 0, "待机", "监听 + 轻量检测", LIGHT, NAVY], [1, 0, "触发确认", "置信度超阈值且持续", RED_L, RED],
    [1, 1, "转向", "冻结测向，避开电机噪声", RED_L, RED], [1, 2, "视觉确认", "人形 / 人脸检测", TEAL_L, TEAL],
    [0, 2, "跟踪", "视听融合，目标居中", TEAL_L, TEAL], [0, 1, "静音保持", "保留航迹，等待再次出现", LIGHT, NAVY],
  ];
  st.forEach((q) => {
    box(s, sx[q[0]], sy[q[1]], sw, sh, q[4], null, "状态" + q[2], 0.15);
    T(s, q[2], { x: sx[q[0]] + 0.1, y: sy[q[1]] + 0.1, w: sw - 0.2, h: 0.35, fontSize: 13.5, bold: true, color: q[5], align: "center" });
    T(s, q[3], { x: sx[q[0]] + 0.1, y: sy[q[1]] + 0.48, w: sw - 0.2, h: 0.35, fontSize: 11, align: "center" });
  });
  const lab = (t, x, y, w, al) => T(s, t, { x, y, w: w || 1.6, h: 0.28, fontSize: 10.5, color: GRAY, align: al || "center" });
  arrow(s, sx[0] + sw + 0.03, sy[0] + sh / 2, sx[1] - sx[0] - sw - 0.06, 0); lab("检测到事件", sx[0] + sw - 0.4, sy[0] + sh / 2 - 0.32, 1.35);
  arrow(s, sx[1] + sw / 2, sy[0] + sh + 0.03, 0, sy[1] - sy[0] - sh - 0.06); lab("连续 N 帧确认", sx[1] + sw / 2 + 0.08, sy[0] + sh + 0.15, 1.5, "left");
  arrow(s, sx[1] + sw / 2, sy[1] + sh + 0.03, 0, sy[2] - sy[1] - sh - 0.06); lab("转动完成", sx[1] + sw / 2 + 0.08, sy[1] + sh + 0.15, 1.5, "left");
  arrow(s, sx[1] - 0.03 - (sx[1] - sx[0] - sw - 0.06), sy[2] + sh / 2, sx[1] - sx[0] - sw - 0.06, 0, { flipH: true }); lab("检测到人", sx[0] + sw - 0.4, sy[2] + sh / 2 - 0.32, 1.35);
  arrow(s, sx[0] + sw / 2, sy[1] + sh + 0.03, 0, sy[2] - sy[1] - sh - 0.06, { flipV: true }); lab("目标丢失", sx[0] + sw / 2 - 1.58, sy[1] + sh + 0.15, 1.5, "right");
  arrow(s, sx[0] + sw / 2, sy[0] + sh + 0.03, 0, sy[1] - sy[0] - sh - 0.06, { flipV: true }); lab("超时回预置位", sx[0] + sw / 2 - 1.58, sy[0] + sh + 0.15, 1.5, "right");
  s.addNotes("跟踪器原型用圆周卡尔曼，状态是方位和角速度，要处理 0 和 360 度的回绕；后续换粒子滤波，直接把 SRP 或网络输出当似然，能处理多峰和伪峰，也方便接入视觉。多目标的 GM-PHD 先预研。云台控制用右边的状态机：待机、触发确认、转向、视觉确认、跟踪、静音保持；转向时冻结测向；丢失目标先保持航迹，超时再回预置位。左下是四条控制规则，重点是死区防抖动、优先级，以及用干扰方向表处理电视。");
}

// 9b. 仿真示意：跟踪
{
  const s = newSlide("方案选型");
  title(s, "仿真示意：跟踪器把测向平均误差从约 22° 降到约 6°，电机转动时冻结测向避免被拉偏",
    "做法：4 麦方阵，RT60 = 0.5 s；说话人沿 2 m 圆弧从 30° 走到 200°（约 17 s）；6.0–7.5 s 叠加近场电机噪声（比语音高 6 dB）");
  s.addImage({ path: img("fig_tracking.png"), x: 0.45, y: 1.4, w: 8.9, h: 3.75 * 8.9 / 8.9, altText: "原始测向、跟踪输出与真实方位随时间变化", objectName: "跟踪示意图" });
  const stats = [
    ["22° → 6°", "平均误差：逐块原始测向 → 跟踪输出", TEAL],
    ["14%", "有语音时，原始测向中误差 > 45° 的比例", AMBER],
    ["160°", "电机转动期间原始测向的平均误差：不冻结就会被拉向电机", RED],
  ];
  stats.forEach((st, i) => {
    const y = 1.5 + i * 1.22;
    box(s, 9.6, y, 3.2, 1.08, LIGHT, null, "统计" + i, 0.1);
    T(s, st[0], { x: 9.8, y: y + 0.08, w: 2.9, h: 0.5, fontSize: 22, bold: true, color: st[2] });
    T(s, st[1], { x: 9.8, y: y + 0.58, w: 2.9, h: 0.45, fontSize: 10.5, color: GRAY });
  });
  box(s, 0.55, 5.55, 12.25, 0.95, LIGHT2, BORDER, "启示框", 0.08);
  T(s, [{ text: "启示　", options: { bold: true, color: NAVY } },
    { text: "单帧测向在混响下离散度很大，必须靠门控 + 跟踪 + 静音保持输出稳定方位；电机状态门控代价最低、收益最大。跟踪器参数未调优，属示意性结果。" }],
    { x: 0.8, y: 5.55, w: 11.8, h: 0.95, fontSize: 13, valign: "middle" });
  s.addNotes("这页是跟踪的仿真示意：说话人绕摄像头走一段弧线，同时在 6 到 7.5 秒叠加云台电机噪声。蓝点是每 100 毫秒的原始测向，混响下离散很大，平均误差约 22 度，有语音时约 14% 是粗大错误；绿色是圆周卡尔曼的输出，用“6 中取 3”起始、±30 度门控和静音保持，平均误差降到约 6 度。红叉是电机转动期间的测向，几乎都指向电机方向，平均误差 160 度，如果不冻结，跟踪就会被拉走。这说明两点：跟踪器是必需的；电机状态门控代价最低、收益最大。跟踪器参数还没调，结果是示意性的。");
}

// 9c. 系统闭环仿真
{
  const s = newSlide("方案选型");
  title(s, "闭环仿真：能量触发后 0.29 s 开始转向、0.67 s 入画，之后 99% 时间在画面中央一半",
    "做法：基线全链路闭环，能量触发（未接唤醒）；说话人在画面外开口并绕行 170°；RT60 = 0.5 s；视觉检测为模拟（画面内 90% 检出）");
  s.addImage({ path: img("fig_closed_loop.png"), x: 0.45, y: 1.38, w: 8.9, h: 3.9, altText: "云台朝向、视场、跟踪输出与状态随时间变化", objectName: "闭环仿真图" });
  const stats = [
    ["0.29 s", "从能量触发到开始转动", TEAL],
    ["0.67 s", "从能量触发到目标进入画面", TEAL],
    ["98.8%", "入画后目标位于画面中央一半的时间比例", TEAL],
    ["1.3°", "融合视觉后的跟踪平均误差（17 s 内云台移动 10 次）", NAVY],
  ];
  stats.forEach((st, i) => {
    const y = 1.45 + i * 1.0;
    box(s, 9.6, y, 3.2, 0.9, LIGHT, null, "闭环统计" + i, 0.1);
    T(s, st[0], { x: 9.78, y: y + 0.06, w: 2.9, h: 0.42, fontSize: 19, bold: true, color: st[2] });
    T(s, st[1], { x: 9.78, y: y + 0.48, w: 2.95, h: 0.4, fontSize: 10, color: GRAY });
  });
  box(s, 0.55, 5.6, 12.25, 0.95, LIGHT2, BORDER, "闭环启示框", 0.08);
  T(s, [{ text: "说明　", options: { bold: true, color: NAVY } },
    { text: "计时起点为能量触发，与指标页从唤醒词结束计时的目标不直接对比。死区设计让云台“走走停停”而不是持续抖动；单声源、无干扰、RT60 = 0.5 s 的理想场景，视觉为模拟，真实效果需在设备上复测。" }],
    { x: 0.8, y: 5.6, w: 11.8, h: 0.95, fontSize: 12.5, valign: "middle" });
  s.addNotes("这页把基线全链路串起来做了闭环仿真，触发用的是能量检测，还没接唤醒：说话人从画面外开始说话，边说边绕摄像头走 170 度。底部的状态条能看到：待机，能量触发 0.29 秒后开始转向，转动期间冻结测向，到位后视觉确认，然后进入跟踪。之后目标 99% 的时间都在画面中央一半，云台在 17 秒里只移动了 10 次，因为有死区，所以是走走停停，不会一直抖。融合视觉后跟踪误差约 1.3 度。需要说明两点：一是计时从能量触发开始，和指标页从唤醒词结束算的目标不是一回事，不直接对比；二是理想场景，单声源、没有电视干扰、视觉是模拟的，真实效果要上设备复测。");
}

// 9d. 电视干扰仿真
{
  const s = newSlide("方案选型");
  title(s, "电视干扰仿真：启用干扰方向表后真人开口 3 s 内入画，不启用时云台被电视锁定",
    "做法：电视位于画面内、从 2 s 起持续播放人声（画面中无人）；真人 12 s 后在画面外 120° 处开口；其余设置同闭环仿真");
  s.addImage({ path: img("fig_tv_interference.png"), x: 0.45, y: 1.38, w: 8.9, h: 3.3, altText: "启用与不启用干扰方向表时云台朝向对比", objectName: "电视干扰图" });
  const pts = [
    ["不启用", "跟踪器锁定电视；真人方向的观测被门控拒绝，云台始终不转", RED, RED_L],
    ["启用", "电视方向“有声无人”累计 4 s 后屏蔽 310–330°；真人开口 3.0 s 后入画，之后 81% 时间在画面内", TEAL, TEAL_L],
    ["解除", "若之后在该方向看到真人，自动解除屏蔽，避免误伤", NAVY, LIGHT],
  ];
  pts.forEach((p, i) => {
    const y = 1.45 + i * 1.12;
    box(s, 9.6, y, 3.2, 1.0, p[3], null, "电视要点" + i, 0.1);
    T(s, p[0], { x: 9.78, y: y + 0.08, w: 2.9, h: 0.3, fontSize: 13, bold: true, color: p[2] });
    T(s, p[1], { x: 9.78, y: y + 0.38, w: 2.95, h: 0.6, fontSize: 10.5, color: TEXT });
  });
  box(s, 0.55, 5.0, 12.25, 1.55, LIGHT2, BORDER, "电视启示框", 0.08);
  T(s, [{ text: "启示　", options: { bold: true, color: NAVY } },
    { text: "在该电视干扰仿真中，干扰方向表改善了目标重新捕获，实录待验证。纯声学难以区分电视里的人声和真人，“画面内长时间有声无人”这一视觉线索代价低；屏蔽时长、解除条件需在真实家庭数据上调参。唤醒词定向阶段另用唤醒前背景白化抑制电视。竞品中 Echo Show 10 采用让用户划定运动范围的方式处理类似问题。" }],
    { x: 0.8, y: 5.05, w: 11.8, h: 1.45, fontSize: 12.5, valign: "middle" });
  s.addNotes("电视是家用场景最大的误转来源，所以单独做了一个仿真：电视在画面里一直放人声，但画面里没有人；12 秒后真人在画面外开口。左图不启用干扰方向表：跟踪器锁在电视上，真人方向的观测被门控当成野值拒掉，云台一直不转。右图启用后：电视方向“画面内、有声、无人”累计 4 秒，就被屏蔽，航迹释放，真人一开口 3 秒内就转过去了。如果之后在被屏蔽的方向看到真人，会自动解除屏蔽。在这个仿真里，干扰方向表明显改善了重新捕获目标，但还要在实录上验证；具体时长要在真实家庭数据上调。另外唤醒词定向阶段已经用唤醒前背景白化压低电视，两者作用在不同阶段。");
}

// 10. 视听融合
{
  const s = newSlide("方案选型");
  title(s, "视听融合：视场外靠声学找人，视场内由视觉精定位并确认谁在说话");
  const cx = 3.2, cy = 3.95, R = 2.2;
  s.addShape(pres.shapes.OVAL, { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R, fill: { color: "F4F6F9" },
    line: { color: "AEB9C7", width: 1, dashType: "dash" }, objectName: "声学覆盖" });
  s.addShape(pres.shapes.PIE, { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R, angleRange: [225, 315],
    fill: { color: TEAL_L }, line: { color: TEAL, width: 1 }, objectName: "视场" });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx - 0.28, y: cy - 0.15, w: 0.56, h: 0.34, fill: { color: NAVY },
    line: { type: "none" }, rectRadius: 0.06, objectName: "摄像头" });
  s.addShape(pres.shapes.OVAL, { x: cx + 0.25, y: cy - 1.75, w: 0.3, h: 0.3, fill: { color: TEAL }, line: { type: "none" }, objectName: "画面内目标" });
  s.addShape(pres.shapes.OVAL, { x: cx - 1.6, y: cy + 0.4, w: 0.3, h: 0.3, fill: { color: RED }, line: { type: "none" }, objectName: "画面外声源" });
  T(s, "视场内：视觉主导", { x: cx - 0.9, y: cy - 1.25, w: 1.8, h: 0.3, fontSize: 11.5, bold: true, color: TEAL, align: "center" });
  T(s, "视场外：声学主导（360°）", { x: cx - 1.3, y: cy + 1.0, w: 2.6, h: 0.3, fontSize: 11.5, bold: true, color: RED, align: "center" });
  const items = [
    ["坐标统一", "像素横坐标 x 换算为方位：θ = θ云台 + arctan((x − cx) / fx)，落在设备固定坐标系；声学方位在底座固定时直接比对、随云台转时先加云台角；需做一次外参标定"],
    ["说话人确认", "Light-ASD（CVPR 2023）：约 1.0 M 参数、0.6 GFLOPs，AVA-ActiveSpeaker 上 mAP 94.1%；用于多人画面中判断谁在说话"],
    ["融合跟踪", "粒子滤波：声学方位似然 × 视觉检测似然；参考 AV3T / CAV3D（摄像头与麦阵共址）、STNet（2024）"],
  ];
  items.forEach((it, i) => {
    const y = 1.5 + i * 1.62;
    box(s, 6.1, y, 6.7, 1.45, LIGHT, null, "融合要点" + i, 0.1);
    circleNum(s, 6.3, y + 0.2, 0.5, String(i + 1), TEAL, 13);
    T(s, it[0], { x: 7.0, y: y + 0.2, w: 5.6, h: 0.4, fontSize: 14, bold: true, color: NAVY, valign: "middle" });
    T(s, it[1], { x: 7.0, y: y + 0.62, w: 5.6, h: 0.8, fontSize: 13 });
  });
  T(s, "DCASE 2025 任务 3 新增“画面内 / 画面外”声源判定子任务，与本场景直接对应",
    { x: 0.55, y: 6.45, w: 12.25, h: 0.35, fontSize: 11.5, color: GRAY });
  s.addNotes("视听融合的分工：视场外只有声学，负责 360 度找人；视场内由视觉精定位。三个要点：第一是坐标统一，把像素横坐标用相机内参换算成相对镜头的角度，加上云台角就落在设备固定坐标系里；声学方位如果阵列固定在底座就直接比对，如果随云台转也要先加云台角；需要做一次阵列和相机的外参标定。第二是说话人确认，多人在画面里时用 Light-ASD 判断谁在说话，它只有约 1M 参数、0.6 GFLOPs，适合端侧。第三是融合跟踪，用粒子滤波把两路似然相乘，CAV3D 正好是摄像头和麦阵共址的数据集，可以直接评测。DCASE 2025 也新增了画面内外判定，说明这个方向是学术界的热点。");
}

// 10b. 前沿趋势
{
  const s = newSlide("方案选型");
  title(s, "前沿趋势：从“单点测向”走向视听联合、声学成像与空间音频大模型",
    "按对本项目的可用时间排序：近期可用 → 中期储备 → 远期探索");
  const tr = [
    ["近期可用", TEAL, TEAL_L, "视听联合与画面内外判定",
      "DCASE 2025 任务 3：双通道立体声 + 普通视角视频，新增画面内 / 外声源判定",
      "直接对应“声音在不在画面里、要不要转”"],
    ["近期可用", TEAL, TEAL_L, "真实数据与跨阵列泛化",
      "RealMAN（NeurIPS 2024）：真实录音训练优于仿真，可训练可变阵列网络；Neural-SRP（2024）适配任意几何",
      "一套模型适配多款阵列硬件"],
    ["近期可用", TEAL, TEAL_L, "端侧轻量化",
      "Cross3D-Edge：127 MFLOPS，树莓派 4B 8.6 ms/帧；LightDOA（2025）用 LLM 辅助生成仿真声学场景",
      "常开端侧测向在算力上已可行"],
    ["中期储备", AMBER, AMBER_L, "从“点”到“图”：声学成像",
      "DCASE 2026 任务 3（6 月已结束，8 队 29 个提交）：只用 4 通道音频输出 1°/像素声能图；纯音频第一名 Mask mAP 仅 0.108",
      "4 通道即可做，但精度尚低；可储备“画面叠加声源热力图”"],
    ["远期探索", NAVY, LIGHT, "空间音频 + 大模型",
      "BAT（ICML 2024）：空间音频编码器 + LLaMA-2 回答“在哪、是什么”；ELSA（NeurIPS 2024）空间音频-文本嵌入，3D 定位误差约 15°",
      "支持“刚才玻璃碎的声音在哪”之类的语义查询"],
  ];
  tr.forEach((r, i) => {
    const x = 0.55 + i * 2.48, w = 2.3, y = 1.45, h = 5.25;
    box(s, x, y, w, h, r[2], null, "趋势" + i, 0.1);
    s.addText(r[0], { shape: pres.shapes.ROUNDED_RECTANGLE, x: x + 0.15, y: y + 0.15, w: 1.15, h: 0.34, fill: { color: r[1] },
      line: { type: "none" }, rectRadius: 0.17, fontFace: FONT, fontSize: 10.5, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
    T(s, r[3], { x: x + 0.15, y: y + 0.62, w: w - 0.3, h: 0.75, fontSize: 14, bold: true, color: r[1] === NAVY ? NAVY : r[1] });
    T(s, r[4], { x: x + 0.15, y: y + 1.42, w: w - 0.3, h: 2.35, fontSize: 12.5, color: TEXT });
    s.addShape(pres.shapes.LINE, { x: x + 0.15, y: y + 3.85, w: w - 0.3, h: 0, line: { color: "C5CFDB", width: 0.75 } });
    T(s, [{ text: "启示：", options: { bold: true, color: r[1] } }, { text: r[5] }], { x: x + 0.15, y: y + 3.95, w: w - 0.3, h: 1.2, fontSize: 12.5 });
  });
  s.addNotes("再看前沿趋势，按对本项目的可用时间排序。近期可用的有三条：DCASE 2025 把任务改成立体声加普通视角视频，并加入画面内外判定，和本场景几乎一样；RealMAN 证明真实数据训练优于仿真，并能训练可变阵列网络，Neural-SRP 也能适配任意几何，适合多款硬件；端侧轻量化上 Cross3D-Edge 和 LightDOA 说明常开测向的算力已可行。中期是 DCASE 2026 的声学成像：比赛 6 月已经结束，8 支队伍 29 个提交，评测时只给 4 通道音频，要求输出每度一个像素的声能图；纯音频赛道第一名是港中文团队，Mask mAP 只有 0.108，说明 4 通道就能做，但精度还很低，适合作为中期储备，将来做成 App 上的声源热力图。远期是空间音频加大模型，BAT 和 ELSA 能回答声音在哪、是什么，未来可以支持语义查询。");
}

// 11. 数据集
pres.addSection({ title: "数据集与评测" });
{
  const s = newSlide("数据集与评测");
  title(s, "公开数据集：首轮用 LOCATA 与自录唤醒词数据，其余按场景贴近程度作为候选");
  const top = (t, o) => cell(t, Object.assign({ fill: { color: TEAL_L } }, o || {}));
  const C = (t) => cell(t, { align: "center" });
  const TC = (t) => top(t, { align: "center" });
  table(s, [
    [H("数据集（出处）"), H("采集方式与阵列"), H("动态声源"), H("视频"), H("规模"), H("许可"), H("本方案用途")],
    [top("LOCATA（2018 挑战赛；IEEE/ACM TASLP 2020）", { bold: true }), top("真实；4 类阵列（含 12 麦机器人头、助听器）"), TC("✓"), TC("—"), top("Task 1：单静止声源；Task 3：单移动说话人（阵列均静止）"), TC("Open Data Commons"), top("首轮：Task 1 静态测向、Task 3 移动跟踪", { bold: true, color: TEAL })],
    [top("自录唤醒词数据（待采集）", { bold: true }), top("目标阵列或通用 4 麦阵列；标注唤醒词起止样点与方位真值"), TC("✓"), TC("可选"), top("按 5 个演示场景采集"), TC("自有"), top("首轮：唤醒后首次定向与输出时延", { bold: true, color: TEAL })],
    [cell("RealMAN（NeurIPS 2024）", { bold: true }), "真实；32 麦阵列，可抽子阵", C("✓ 35 h"), C("—"), "83 h 语音 + 144 h 噪声，32 个场景", C("CC BY 4.0"), "候选：几何接近的子阵作参考（待阵列信息确认）"],
    [cell("CAV3D（FBK，IEEE TMM 2019）", { bold: true }), "真实；8 麦圆阵与摄像头共址", C("✓"), C("✓"), "20 段序列（单人 / 干扰 / 多人）", C("见官网"), "候选：视听跟踪评测"],
    [cell("SSLR（Idiap，ICRA 2018）", { bold: true }), "真实；Pepper 机器人头 4 麦（5.8 × 6.9 cm），含风扇自噪声", C("部分"), C("—"), "约 25 h 回放 + 真人录音", C("EULA 非商用"), "候选：小孔径 + 自噪声"],
    [cell("STARSS23（DCASE 2023）", { bold: true }), "真实；4 通道四面体阵列（MIC）/ FOA", C("✓"), C("360°"), "168 段约 7.5 h，16 个房间，13 类", C("MIT"), "候选：异响扩展"],
    [cell("DCASE2025 立体声 SELD", { bold: true }), "由 STARSS23 转换：双通道 + 普通视角视频", C("✓"), C("✓"), "13 类，含画面内 / 外标签", C("见 Zenodo"), "候选：画面内外判定"],
  ], { x: 0.55, y: 1.42, w: 12.25, colW: [2.45, 2.85, 0.95, 0.65, 2.3, 1.15, 1.9], rowH: [0.45, 0.68, 0.62, 0.6, 0.55, 0.6, 0.55, 0.55], fontSize: 11 });
  T(s, "数据年份不影响测向评测的物理有效性，关键看阵列几何与场景是否贴近；LOCATA 仍是声源定位与跟踪的常用公开基准。非商用许可的数据仅用于研究对比。AV16.3（2004）等经典视听数据作对比参考。",
    { x: 0.55, y: 6.2, w: 12.25, h: 0.6, fontSize: 10.5, color: GRAY });
  s.addNotes("数据集分首轮和候选。首轮只用两类：一是 LOCATA，Task 1 是单个静止声源、阵列静止，用来验证静态测向；Task 3 是单个移动说话人、阵列静止，用来验证跟踪。二是自录的唤醒词数据：用目标阵列或通用 4 麦阵列，按 5 个演示场景采集，标注唤醒词的起止样点和方位真值，专门测唤醒后的首次定向精度和输出时延，这是公开数据集没有的。其余作为候选：RealMAN 是 2024 年的真实录制数据，可以抽取几何接近的子阵作参考，但能否代表目标设备要等阵列信息确认；CAV3D 摄像头和麦阵共址，适合后续视听跟踪；SSLR 是小孔径加风扇自噪声；STARSS23 和 DCASE 2025 立体声版本用于异响扩展和画面内外判定。数据年份不影响测向评测的物理有效性，关键是阵列几何和场景是否贴近。");
}

// 12. 数据方案
{
  const s = newSlide("数据集与评测");
  title(s, "数据方案：首轮用公开 + 自录数据验证，设备实录作验收，大规模仿真留到网络阶段");
  const cols = [
    { n: "1", h: "首轮验证（12 月原型）", w: 4.3, fill: TEAL_L, c: TEAL, items: [
      [{ text: "公开：", options: { bold: true } }, { text: "LOCATA Task 1 静态测向、Task 3 移动说话人跟踪" }],
      [{ text: "自录：", options: { bold: true } }, { text: "带唤醒词起止样点与方位真值的多通道音频，覆盖 5 个演示场景" }],
      [{ text: "仿真：", options: { bold: true } }, { text: "镜像源法（唤醒词 + 电视、移动说话人、电机噪声），已有脚本" }],
    ] },
    { n: "2", h: "设备实录（验收依据）", w: 4.0, fill: RED_L, c: RED, items: [
      [{ text: "设备实录：", options: { bold: true } }, { text: "3–5 类房间 × 8 个方位 × 3 个距离 × 4 种干扰（安静 / 电视 / 空调 / 电机转动）" }],
      [{ text: "声源：", options: { bold: true } }, { text: "真人 + 音箱回放" }],
      [{ text: "标注：", options: { bold: true } }, { text: "摄像头自动检测或转台" }],
      [{ text: "误转专测：", options: { bold: true } }, { text: "长时无人录音（含电视）" }],
    ] },
    { n: "3", h: "网络阶段储备", w: 3.55, fill: LIGHT, c: NAVY, items: [
      [{ text: "仿真训练：", options: { bold: true } }, { text: "gpuRIR / pyroomacoustics / SpatialScaper，按产品几何；RT60 0.2–0.9 s；电视、音乐干扰" }],
      [{ text: "增强：", options: { bold: true } }, { text: "阵元位置扰动、通道失配" }],
      [{ text: "真实微调：", options: { bold: true } }, { text: "RealMAN 子阵（待阵列信息确认）" }],
      [{ text: "素材：", options: { bold: true } }, { text: "AISHELL-1、LibriSpeech、FSD50K；噪声 DEMAND、MUSAN" }],
    ] },
  ];
  let x = 0.55;
  cols.forEach((c, i) => {
    box(s, x, 1.45, c.w, 5.3, c.fill, null, "数据列" + c.n, 0.1);
    circleNum(s, x + 0.25, 1.65, 0.5, c.n, c.c, 13);
    T(s, c.h, { x: x + 0.9, y: 1.65, w: c.w - 1.05, h: 0.5, fontSize: 14.5, bold: true, color: c.c, valign: "middle" });
    T(s, bullets(c.items, 13, TEXT, 10), { x: x + 0.25, y: 2.35, w: c.w - 0.45, h: 4.3 });
    if (i < 2) arrow(s, x + c.w + 0.02, 4.1, 0.16, 0);
    x += c.w + 0.2;
  });
  s.addNotes("数据方案分三块。第一块是 12 月原型的首轮验证：公开数据用 LOCATA 的 Task 1 和 Task 3；自录一批带唤醒词起止样点和方位真值的多通道音频，覆盖 5 个演示场景；仿真用现有的镜像源法脚本，已经覆盖唤醒词加电视、移动说话人和电机噪声。第二块是设备实录，作为最终验收依据：按房间、方位、距离、干扰条件正交采集，单独录长时间无人加电视的音频，专门测误转率。第三块是网络阶段的储备：按产品阵列几何做大规模仿真训练，加阵元扰动和通道失配增强，再用 RealMAN 子阵这类真实数据微调，能否代表目标设备要等阵列信息确认。");
}

// 13. 评测方案
{
  const s = newSlide("数据集与评测");
  title(s, "评测分三层：帧级测向、轨迹跟踪、系统体验，各方案在同一测试矩阵上对比");
  const cols = [
    ["帧级测向", ["方位平均绝对误差（MAE）", "Acc@10° / Acc@20°", "粗大错误率（误差 > 45°）", "SELD 联合指标：F1@20°、LE_CD、LR_CD（DCASE）"]],
    ["轨迹跟踪", ["轨迹平均误差", "航迹断裂与丢失率", "多人场景 ID 切换次数", "参考 LOCATA 评测体系"]],
    ["系统体验", ["转向命中率", "响应时延", "误转率（次 / 小时）", "CPU / NPU 占用、内存、功耗"]],
  ];
  cols.forEach((c, i) => {
    const x = 0.55 + i * 4.17;
    box(s, x, 1.45, 3.9, 2.95, LIGHT, null, "评测层" + i, 0.1);
    circleNum(s, x + 0.25, 1.62, 0.5, String(i + 1), NAVY, 13);
    T(s, c[0], { x: x + 0.9, y: 1.62, w: 2.8, h: 0.5, fontSize: 15, bold: true, color: NAVY, valign: "middle" });
    T(s, bullets(c[1], 14, TEXT, 9), { x: x + 0.25, y: 2.3, w: 3.45, h: 2.0 });
  });
  T(s, "统一测试矩阵", { x: 0.55, y: 4.7, w: 4, h: 0.4, fontSize: 14, bold: true, color: TEAL });
  const chips = ["RT60：0.3 / 0.6 / 0.9 s", "SNR：20 / 10 / 0 dB", "声源数：1 / 2", "声源：静止 / 移动", "电机：静止 / 转动"];
  let x = 0.55; const cw = 2.15, gap = 0.37;
  chips.forEach((c, i) => {
    s.addText(c, { shape: pres.shapes.ROUNDED_RECTANGLE, x, y: 5.2, w: cw, h: 0.6, fill: { color: TEAL_L },
      line: { color: TEAL, width: 1 }, rectRadius: 0.25, fontFace: FONT, fontSize: 12, bold: true, color: TEAL,
      align: "center", valign: "middle", margin: 0 });
    if (i < chips.length - 1) T(s, "×", { x: x + cw, y: 5.2, w: gap, h: 0.6, fontSize: 16, bold: true, color: GRAY, align: "center", valign: "middle" });
    x += cw + gap;
  });
  T(s, "仿真与实录数据均按此矩阵出结果，各方案逐格对比，用数据决定是否进入下一阶段。",
    { x: 0.55, y: 6.05, w: 12.25, h: 0.4, fontSize: 12.5, color: TEXT });
  s.addNotes("评测分三层。帧级测向看 MAE、命中率和粗大错误率，事件加定位用 DCASE 的 SELD 指标。轨迹层看跟踪误差、断裂和多人 ID 切换，参考 LOCATA 的评测体系。系统层看产品体验：转向命中率、响应时延、误转率和端侧开销。所有方案都在同一个测试矩阵上出结果：混响、信噪比、声源数、静止或移动、电机是否转动，逐格对比，用数据决定要不要进入下一阶段。");
}

// 14. Demo 方案 + 12 月周计划
pres.addSection({ title: "原型路线与待确认" });
{
  const s = newSlide("原型路线与待确认");
  title(s, "先做 demo：离线回放保底、实时演示加分，每周用同一组场景展示进展",
    "演示场景固定，每周只换算法版本，进展一目了然");
  const demos = [
    ["A", "离线回放 demo（11 月起每周可演示）", TEAL, TEAL_L, [
      "输入：多通道录音（仿真 / 公开数据 / 实录）+ 唤醒时间戳",
      "流程：唤醒词片段测向 → 持续跟踪 → 云台状态机",
      "展示：方位随时间曲线、俯视图上的说话人与云台指向",
      "输出：每个场景的误差、时延统计"]],
    ["B", "实时 demo（12 月中旬）", NAVY, LIGHT, [
      "硬件：目标阵列或 4 麦 USB 阵列 + PC【待确认】",
      "流程：实时采集 → 唤醒（唤醒模块，或先用按键模拟）→ 方位显示",
      "展示：虚拟 / 真实云台转向；波束成形前后的音频对比（可选）",
      "输出：演示视频 + 实测时延"]],
  ];
  demos.forEach((d, i) => {
    const x = 0.55 + i * 6.2, w = 6.05;
    box(s, x, 1.4, w, 3.1, d[3], null, "demo" + d[0], 0.1);
    circleNum(s, x + 0.25, 1.58, 0.52, d[0], d[2], 14);
    T(s, d[1], { x: x + 0.95, y: 1.58, w: w - 1.1, h: 0.52, fontSize: 14.5, bold: true, color: d[2], valign: "middle" });
    T(s, bullets(d[4], 12.5, TEXT, 6), { x: x + 0.3, y: 2.3, w: w - 0.5, h: 2.1 });
  });
  T(s, "固定演示场景", { x: 0.55, y: 4.72, w: 3, h: 0.35, fontSize: 13.5, bold: true, color: NAVY });
  const scenes = ["① 正前方唤醒", "② 侧后方唤醒（考察 360°）", "③ 唤醒后边说边走", "④ 电视开着时唤醒", "⑤ 两人先后唤醒"];
  scenes.forEach((sc, i) => {
    s.addText(sc, { shape: pres.shapes.ROUNDED_RECTANGLE, x: 0.55 + i * 2.48, y: 5.15, w: 2.3, h: 0.55, fill: { color: TEAL_L },
      line: { color: TEAL, width: 1 }, rectRadius: 0.2, fontFace: FONT, fontSize: 11.5, bold: true, color: TEAL, align: "center", valign: "middle", margin: 0 });
  });
  T(s, [{ text: "每个场景记录：", options: { bold: true, color: NAVY } }, { text: "方位误差、定向时延、是否转对（目标进画面中央一半）、误转次数" }],
    { x: 0.55, y: 5.95, w: 12.25, h: 0.5, fontSize: 12.5, valign: "middle" });
  s.addNotes("demo 分两档。A 是离线回放，11 月起每周都能演示：用多通道录音加唤醒时间戳，跑唤醒词片段测向、跟踪和云台状态机，画出方位随时间的曲线和俯视图，并给出误差和时延统计。B 是实时演示，放在 12 月中旬：需要目标阵列或者一块 4 麦 USB 阵列，实时采集，唤醒接入唤醒模块，如果还没接好就用按键模拟，屏幕上显示方位并让虚拟或真实云台转向。演示场景固定为五个，每周只换算法版本，这样进展一目了然。");
}
{
  const s = newSlide("原型路线与待确认");
  title(s, "原型路线：11 月离线验证 → 12 月上中旬实录评测与实时 demo → 12 月下旬原型冻结",
    "每个阶段用同一组演示场景出结果，结果决定下一阶段的重点");
  const P = (t, c) => cell(t, { bold: true, color: c || NAVY });
  const ST = (t, c) => cell(t, { align: "center", bold: true, color: c });
  table(s, [
    [H("阶段"), H("时间"), H("内容"), H("交付"), H("状态")],
    [P("离线验证"), cell("11 月"), "唤醒词片段测向接口；离线 demo（仿真 + LOCATA）；录音方案与录音脚本，阵列到位后先录一批",
      "接口约定 v1；离线 demo 与误差表；录音方案 + 首批实录", ST("进行中：接口与\n仿真评测已完成", TEAL)],
    [P("实录评测与实时化"), cell("12 月上中旬"), "实录评测与调参；唤醒后持续跟踪；实时流式框架 + 方位显示（虚拟云台）；接入唤醒（或按键模拟）与波束成形接口",
      "实录评测表；实时 demo 视频；实测时延", ST("待开始", GRAY)],
    [P("鲁棒性与冻结"), cell("12 月下旬"), "电视、强混响、两人先后唤醒；算力估计；原型冻结与总结",
      "鲁棒性评测表；原型代码 + 报告 + 演示", ST("待开始", GRAY)],
  ], { x: 0.55, y: 1.45, w: 12.25, colW: [1.9, 1.35, 4.6, 2.9, 1.5], rowH: [0.45, 1.05, 1.05, 0.85], fontSize: 12.5 });
  box(s, 0.55, 5.1, 12.25, 0.75, LIGHT, null, "依赖", 0.08);
  T(s, [{ text: "关键依赖　", options: { bold: true, color: NAVY } },
    { text: "原型阵列与板卡、唤醒模块的时间信息、波束成形需要的输出——确认后定实录方案与接口细节（见下页）。" }],
    { x: 0.8, y: 5.1, w: 11.8, h: 0.75, fontSize: 12.5, valign: "middle" });
  box(s, 0.55, 6.0, 12.25, 0.75, LIGHT2, BORDER, "风险", 0.08);
  T(s, [{ text: "主要风险与预案　", options: { bold: true, color: NAVY } },
    { text: "阵列未到位 → 先用通用 4 麦 USB 阵列；唤醒接口未就绪 → 先用录音时间戳 / 按键模拟；电视误唤醒 → 背景白化 + 干扰方向表 + 视觉复核。" }],
    { x: 0.8, y: 6.0, w: 11.8, h: 0.75, fontSize: 12, valign: "middle" });
  s.addNotes("原型路线分三个阶段。11 月做离线验证：唤醒词片段测向的接口和仿真评测已经完成，接下来出离线 demo，用仿真和 LOCATA 出第一版误差表，同时准备录音方案，阵列到位后先录一批。12 月上中旬做实录评测和实时化：在实录上调参、接上持续跟踪，搭实时流式框架和方位显示，接入唤醒（没接好先用按键模拟）和波束成形接口，出实时 demo 视频和实测时延。12 月下旬做鲁棒性和收尾：电视、强混响、两人先后唤醒，估算算力，冻结原型并总结。关键依赖是阵列、唤醒的时间信息和波束成形需要的输出，下一页列出。");
}

{
  const s = newSlide("原型路线与待确认");
  title(s, "待确认事项：前三项决定原型细节，后三项影响实录与端侧评估");
  const qs = [
    ["阵列与 demo 硬件", "麦克风数量、间距、安装位置（固定在底座还是随云台转动）？demo 用哪块板或阵列？"],
    ["唤醒接口", "唤醒跑在单通道还是多波束？能否给出唤醒词起止样点、置信度与回调延迟？缓存能否覆盖唤醒词前约 1 s？"],
    ["波束成形输出", "需要定位输出什么（方位、置信度、更新率）？低置信度时希望保持方向还是退回宽波束？"],
    ["芯片预算", "目标 SoC 的算力、内存与常开功耗预算？"],
    ["镜头与云台", "水平视场角、云台转速、电机噪声水平？"],
    ["数据", "能否采集设备实录？能否拿到唤醒模块对录音的离线输出（起止样点）？"],
  ];
  qs.forEach((q, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.55 + col * 4.17, y = 1.5 + row * 2.6;
    box(s, x, y, 3.9, 2.35, i < 3 ? LIGHT : LIGHT2, i < 3 ? null : BORDER, "待确认" + i, 0.1);
    circleNum(s, x + 0.25, y + 0.25, 0.55, String(i + 1), i < 3 ? NAVY : TEAL, 14);
    T(s, q[0], { x: x + 0.95, y: y + 0.25, w: 2.8, h: 0.55, fontSize: 16, bold: true, color: NAVY, valign: "middle" });
    T(s, q[1], { x: x + 0.25, y: y + 1.0, w: 3.45, h: 1.25, fontSize: 13 });
  });
  s.addNotes("最后是待确认事项。前三项决定原型细节：用哪块阵列、阵列装在底座还是随云台转；唤醒能给出哪些时间信息，以及缓存能不能覆盖唤醒词前约 1 秒，背景白化需要这一段；波束成形需要定位输出什么，低置信度时怎么处理。后三项影响实录和端侧评估：芯片预算、镜头和云台参数、能否采集设备实录并拿到唤醒模块的离线输出。");
}


// ===================== 精简版专用页 =====================
if (SHORT) {
  // S1. 仿真验证三合一
  {
    const s = newSlide("方案选型");
    title(s, "初步仿真验证：阵列选择、闭环跟踪、电视干扰三组结果都支持推荐方案",
      "镜像源法仿真 + 模拟视觉；设置与更多结果见完整版仿真各页");
    const cols = [
      { head: "阵列：3 / 4 麦可用，2 麦不行", img: "fig_srp_2v3v4.png", ih: 3.75 * 2.45 / 5.4, color: NAVY,
        items: ["2 麦：37–61% 落在镜像方向", "3 / 4 麦：累积 2.5 s 时误差约 2–10°", "单帧精度随混响快速下降，短时间窗是难点"] },
      { head: "闭环：能量触发后 0.3 s 转、0.7 s 入画", img: "fig_short_loop.png", ih: 3.75 * 2.15 / 3.9, color: TEAL,
        items: ["入画后 98.8% 时间在画面中央一半", "17 s 内云台只动 10 次（死区防抖）", "融合视觉后跟踪误差约 1.3°"] },
      { head: "电视：干扰方向表改善重新捕获", img: "fig_short_tv.png", ih: 3.75 * 2.15 / 3.9, color: RED,
        items: ["不启用：被电视“锁死”，始终不转向真人", "启用：真人开口 3 s 内入画（实录待验证）", "看到真人自动解除屏蔽"] },
    ];
    cols.forEach((c, i) => {
      const x = 0.55 + i * 4.17, w = 3.97;
      box(s, x, 1.4, w, 4.45, LIGHT2, BORDER, "仿真列" + i, 0.08);
      T(s, c.head, { x: x + 0.15, y: 1.5, w: w - 0.3, h: 0.42, fontSize: 14, bold: true, color: c.color, valign: "middle" });
      s.addImage({ path: img(c.img), x: x + 0.11, y: 2.0, w: 3.75, h: c.ih, altText: c.head, objectName: "仿真图" + i });
      T(s, bullets(c.items, 13, TEXT, 6), { x: x + 0.18, y: 4.22, w: w - 0.32, h: 1.55 });
    });
    box(s, 0.55, 6.03, 12.25, 0.72, LIGHT, null, "局限框", 0.08);
    T(s, [{ text: "局限与下一步　", options: { bold: true, color: NAVY } }, { text: "单声源、鞋盒房间、视觉为模拟；下一步在公开真实数据（LOCATA、RealMAN）和设备实录上复核，并以此定最终指标。" }],
      { x: 0.8, y: 6.03, w: 11.8, h: 0.72, fontSize: 12.5, valign: "middle" });
    s.addNotes("这页把三组仿真放在一起，都在支持推荐方案。左边是阵列：同孔径下 2 麦有 37% 到 61% 落在镜像方向，3 麦和 4 麦累积 2.5 秒时误差在 2 到 10 度，但单帧精度随混响下降得很快，短时间窗是难点。中间是基线全链路闭环：说话人在画面外开口，0.3 秒开始转，0.7 秒入画，之后 98.8% 的时间在画面中央一半，云台 17 秒只动了 10 次。右边是电视干扰：不加干扰方向表时云台被电视锁死，加上后真人开口 3 秒内就转过去。局限是理想仿真，下一步要用 LOCATA、RealMAN 和设备实录复核。");
  }
  // S2. 竞品要点
  {
    const s = newSlide("方案选型");
    title(s, "竞品要点：听声转向在家用摄像头仍属少数，成熟方案都是“声学粗定位 + 视觉确认”",
      "详见竞品调研（14 页，含产品图与可点击来源）");
    const prods = [
      ["ezviz_c6c.jpg", "萤石 C6C 无极巡航版", "3 麦，360° 声源定位（2019）"],
      ["quedan_pro.jpg", "华为智选 海雀雀蛋 Pro", "双麦“音画追踪”，评测称正面 180°（2025）"],
      ["echo_show10.jpg", "Amazon Echo Show 10", "声学 + 视觉转屏；技术参照，已停产"],
      ["cisco_quad.jpg", "Cisco Quad Camera", "内置 8 麦阵列，专用于发言人跟踪"],
    ];
    prods.forEach((p, i) => {
      const x = 0.55 + (i % 2) * 2.95, y = 1.4 + Math.floor(i / 2) * 2.62, w = 2.8, h = 2.48;
      box(s, x, y, w, h, LIGHT2, BORDER, "竞品图" + i, 0.08);
      s.addImage({ path: path.join(__dirname, "..", "figures", "竞品产品图", p[0]), x: x + 0.62, y: y + 0.1, w: 1.56, h: 1.56, altText: p[1], objectName: "竞品图片" + i });
      T(s, p[1], { x: x + 0.12, y: y + 1.7, w: w - 0.24, h: 0.32, fontSize: 11.5, bold: true, color: NAVY, align: "center" });
      T(s, p[2], { x: x + 0.12, y: y + 2.0, w: w - 0.24, h: 0.42, fontSize: 9.5, color: GRAY, align: "center" });
    });
    const take = [
      ["家用：听声转向仍属少数", "主流（Tapo、小米 C700）只做声音检测 + 视觉追踪 → 做到“稳、不乱转”就是差异化", TEAL],
      ["成熟方案都靠视觉确认", "Echo Show 10、Cisco、Logitech、Owl、IdeaHub 均为声学粗定位 + 人脸 / 人形确认 → 印证视听融合路线", TEAL],
      ["反射误转是公认痛点", "Amazon 官方：反射会让波束偏离说话人，需用户划定运动范围 → 干扰方向表 + 视觉复核", AMBER],
      ["测向能力在下沉到芯片", "Amazon AZ1 端侧运行；XMOS 做进语音芯片；IPC 芯片公开资料未见 → 芯片参考方案的机会（判断）", RED],
    ];
    take.forEach((t, i) => {
      const y = 1.4 + i * 1.28;
      box(s, 6.6, y, 6.2, 1.15, LIGHT, null, "竞品结论" + i, 0.08);
      circleNum(s, 6.78, y + 0.3, 0.5, String(i + 1), t[2], 13);
      T(s, t[0], { x: 7.45, y: y + 0.1, w: 5.2, h: 0.35, fontSize: 13.5, bold: true, color: NAVY });
      T(s, t[1], { x: 7.45, y: y + 0.47, w: 5.2, h: 0.62, fontSize: 11 });
    });
    T(s, "图片来自各厂商官网 / 发布会报道，仅供内部调研。", { x: 0.55, y: 6.65, w: 6, h: 0.3, fontSize: 9.5, color: "8A97A8" });
    s.addNotes("竞品看下来有四点。第一，家用摄像头里听声转向仍属少数：萤石 2019 年就有 3 麦 360 度声源定位，华为智选的雀蛋 Pro 2025 年用双麦做音画追踪，但主流的 Tapo、小米 C700 只做声音检测加视觉追踪，做到稳、不乱转就是差异化。第二，成熟方案都是声学粗定位加视觉确认，印证视听融合路线。第三，反射误转是公认痛点，Amazon 官方博客专门讲过，所以干扰方向表和视觉复核必须做。第四，测向能力在下沉到芯片，IPC 芯片厂商公开资料里没看到，这可能是芯片参考方案的机会，这一点是判断。详细的产品图和来源在竞品调研那份材料里。");
  }
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
})();
