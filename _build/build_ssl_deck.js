// 场景一专项：摄像头声源定位与持续跟踪 —— 方案选型与数据集
const pptxgen = require("pptxgenjs");
const path = require("path");
const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");

const SHORT = process.env.SHORT === "1";
const OUT = path.join(__dirname, SHORT ? "场景一专项_汇报精简版_raw.pptx" : "场景一专项_摄像头声源定位与跟踪_方案选型与数据集.pptx");
const FIGDIR = path.join(__dirname, "sim", "figs");
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
  if (SHORT) T(s, "完整版（23 页）与竞品调研（14 页）另附", { x: 0.8, y: 4.35, w: 8, h: 0.4, fontSize: 13, color: "9FB4D3" });
  T(s, "摄像头声源定位与持续跟踪", { x: 0.8, y: 2.75, w: 8.5, h: 0.9, fontSize: 36, bold: true, color: WHITE });
  T(s, "需求拆解 · 方案选型 · 数据集 · 12 月原型计划", { x: 0.8, y: 3.75, w: 8.5, h: 0.5, fontSize: 18, color: ICE });
  T(s, "汇报人：令狐雅熙　　2026.11", { x: 0.8, y: 6.4, w: 6, h: 0.4, fontSize: 12, color: ICE });
  s.addNotes("本部分针对场景一（摄像头定位声音方向并持续跟踪）展开：先拆解需求和指标，再给出阵列、测向算法、跟踪与视听融合的具体选型，最后是数据集、评测方案和实施计划。");
}

// 2. 结论先行
pres.addSection({ title: "需求与指标" });
{
  const s = newSlide("需求与指标");
  title(s, "整体方向：唤醒 + 定位 + 波束成形协同，我负责声源定位，12 月底交付可演示的原型",
    "mentor 负责语音唤醒；声源定位分三档推进：12 月原型 → 2027 Q1 网络升级 → 视听融合与异响扩展");
  const cards = [
    { code: "B0", tag: "本期：12 月原型", head: "唤醒词定向 + 持续跟踪", fill: TEAL_L, line: TEAL, c: TEAL,
      items: ["唤醒后用缓存的唤醒词片段测向（SRP-PHAT + 起始段加权）", "持续跟踪说话人，方位实时给波束成形与云台", "离线回放 + 实时两档 demo，每周迭代"] },
    { code: "M1", tag: "2027 Q1：精度升级", head: "轻量神经网络测向", fill: LIGHT, line: null, c: NAVY,
      items: ["仿真显示短时间窗 + 混响是 SRP 的短板，由网络补足", "唤醒已判断“是不是人声”，网络先做纯测向；SELD 留给异响", "按产品阵列几何仿真训练，真实录音微调"] },
    { code: "E1", tag: "后续扩展", head: "视听融合 + 异响事件", fill: LIGHT, line: null, c: NAVY,
      items: ["视场外靠声学，视场内交给人形 / 说话人检测", "电视误唤醒：干扰方向表 + 视觉复核", "哭声、玻璃破碎等异响也能触发转向"] },
  ];
  cards.forEach((c, i) => {
    const x = 0.55 + i * 4.17, y = 1.5, w = 3.9, h = 4.25;
    box(s, x, y, w, h, c.fill, c.line, "方案卡" + c.code, 0.1);
    circleNum(s, x + 0.3, y + 0.3, 0.62, c.code, c.c, 14);
    T(s, c.tag, { x: x + 1.08, y: y + 0.3, w: 2.6, h: 0.62, fontSize: 15, color: c.c, bold: true, valign: "middle" });
    T(s, c.head, { x: x + 0.3, y: y + 1.12, w: w - 0.5, h: 0.4, fontSize: 15, bold: true, color: TEXT });
    T(s, bullets(c.items, 14, TEXT, 8), { x: x + 0.3, y: y + 1.75, w: w - 0.55, h: h - 1.9 });
  });
  box(s, 0.55, 5.98, 12.24, 0.78, LIGHT2, BORDER, "接口说明", 0.08);
  T(s, [{ text: "接口　", options: { bold: true, color: NAVY } },
    { text: "语音唤醒（mentor）→ 唤醒词起止时间；声源定位（我）→ 每 100 ms 方位 + 置信度；波束成形 / 云台按方位对准（波束成形分工待确认）" }],
    { x: 0.8, y: 5.98, w: 11.8, h: 0.78, fontSize: 13, valign: "middle" });
  s.addNotes("先说整体：场景一由三项技术协同完成——语音唤醒、声源定位、波束成形。唤醒由 mentor 在做，我负责声源定位，目标是 12 月底交付一个可演示的算法原型，之后每周讨论。声源定位分三档：本期 B0 是唤醒词定向加持续跟踪，用缓存的唤醒词片段做 SRP-PHAT 测向，再持续跟踪说话人，方位同时给波束成形和云台；2027 年一季度用轻量神经网络提升短时精度——因为唤醒已经判断了是不是人声，网络先做纯测向，事件识别留给后面的异响场景；再往后是视听融合和异响扩展。底部是三方接口，波束成形由谁做还需要确认。");
}

// 3. 场景闭环
{
  const s = newSlide("需求与指标");
  title(s, "场景一闭环：唤醒 → 定向 → 转向与波束对准 → 视觉接管 → 持续跟踪");
  const steps = [
    ["语音唤醒", "mentor 的唤醒模块检测唤醒词", "给出唤醒词起止时间，触发定位"],
    ["唤醒词定向", "用缓存的唤醒词片段测方位", "叠加云台角，换算到世界坐标"],
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
  s.addNotes("场景一的闭环是五步：用户说唤醒词，mentor 的唤醒模块检测到后给出唤醒词的起止时间；我用缓存的这段唤醒词音频测出说话人方向，叠加云台角换算到世界坐标；然后云台转过去、波束指向说话人，转动期间冻结测向；画面里由人形或人脸检测确认目标；之后持续跟踪，方位不断更新给波束和云台。前三步是声学主导，精度只要让人进入画面中央即可，关键是稳。这个流程已有先例：华为智选的雀蛋 Pro 喊“海雀海雀”会转向说话人，Echo Show 10 也是唤醒词转屏。");
}

// 3b. 三技术分工与接口
{
  const s = newSlide("需求与指标");
  title(s, "三技术分工与接口：唤醒给“何时”，定位给“在哪”，波束成形与云台按方位执行",
    "接口先按下表约定，周会上逐项确认；格式可随 mentor 的唤醒模块调整");
  const flow = [
    ["麦克风阵列", "16 kHz；2 s 环形缓存", LIGHT, NAVY],
    ["语音唤醒（mentor）", "检测唤醒词 → 起止时间、置信度", AMBER_L, AMBER],
    ["声源定位（我）", "唤醒词片段测向 + 持续跟踪", TEAL_L, TEAL],
    ["波束成形（分工待确认）", "按方位增强说话人语音", LIGHT, NAVY],
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
    [cell("阵列 → 各模块", { bold: true }), "麦克风数量、几何、采样率、帧长、缓存长度", "16 kHz；帧 16 ms；环形缓存 ≥ 2 s", cell("待确认", { color: AMBER, bold: true, align: "center" })],
    [cell("唤醒 → 定位", { bold: true }), "触发时刻、唤醒词起止样点、置信度；唤醒跑在哪个通道 / 波束", "回调或消息；样点级时间戳", cell("待对齐", { color: AMBER, bold: true, align: "center" })],
    [cell("定位 → 波束成形", { bold: true }), "方位（俯仰可选）、置信度、更新时刻", "每 100 ms；低置信度时保持上一方向", cell("待对齐", { color: AMBER, bold: true, align: "center" })],
    [cell("定位 → 云台", { bold: true }), "世界坐标方位、是否转动；读取云台角与电机状态", "状态机输出（死区、确认、冻结）", cell("原型已有", { color: TEAL, bold: true, align: "center" })],
  ], { x: 0.55, y: 2.75, w: 12.25, colW: [2.2, 4.6, 4.0, 1.45], rowH: [0.42, 0.55, 0.65, 0.55, 0.55], fontSize: 12 });
  box(s, 0.55, 5.6, 12.25, 1.15, LIGHT2, BORDER, "设计选择", 0.08);
  T(s, [{ text: "需和 mentor 定的一个设计选择　", options: { bold: true, color: NAVY } },
    { text: "唤醒若跑在多个固定波束上，可直接用得分最高的波束作粗方向；但 Amazon 指出波束选择不适合直接驱动转动，所以建议“先唤醒、再用唤醒词片段精确测向”。" }],
    { x: 0.8, y: 5.62, w: 11.8, h: 1.1, fontSize: 12.5, valign: "middle" });
  s.addNotes("这页讲分工和接口。唤醒告诉我们“什么时候”有人在叫设备，并给出唤醒词的起止时间；定位告诉大家“人在哪”，每 100 毫秒输出方位和置信度；波束成形和云台按这个方位执行。接口表里是我建议的格式，阵列参数和唤醒的输出需要和 mentor 确认，云台这一侧原型代码里已经有状态机。还有一个设计选择要一起定：如果唤醒本身跑在多个固定波束上，最高分的波束可以当粗方向，但 Amazon 的技术博客明确说波束选择不适合直接驱动转动，所以我建议先唤醒、再用唤醒词片段精确测向。");
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
  T(s, "建议指标（目标值待与产品需求对齐）", { x: 6.15, y: 1.45, w: 6.6, h: 0.4, fontSize: 14, bold: true, color: NAVY });
  table(s, [
    [H("指标"), H("定义"), H("建议目标")],
    [cell("方位误差", { bold: true }), "单声源、RT60 ≤ 0.6 s、SNR ≥ 10 dB 下的平均绝对误差", cell("≤ 10°", { align: "center", bold: true, color: TEAL })],
    [cell("转向命中率", { bold: true }), "转动结束后目标位于画面中央一半的比例", cell("≥ 90%", { align: "center", bold: true, color: TEAL })],
    [cell("粗大错误率", { bold: true }), "误差 > 45°（含前后混淆）的比例", cell("≤ 3%", { align: "center", bold: true, color: TEAL })],
    [cell("定向 / 转向时延", { bold: true }), "唤醒词结束 → 输出方位 / 云台开始转动", cell("≤ 0.1 s / ≤ 0.5 s", { align: "center", bold: true, color: TEAL })],
    [cell("误转率", { bold: true }), "无有效唤醒时的转动次数（含电视误唤醒）", cell("≤ 1 次/小时", { align: "center", bold: true, color: TEAL })],
    [cell("端侧开销", { bold: true }), "常开链路的算力、内存与功耗", cell("【待定】", { align: "center", bold: true, color: AMBER })],
  ], { x: 6.15, y: 1.95, w: 6.65, colW: [1.35, 3.75, 1.55], rowH: 0.62, fontSize: 12 });
  s.addNotes("精度要求可以从镜头视场反推：转向后只要目标落在画面中央一半，视觉就能接手，所以允许误差是水平视场角的四分之一。以 90 度视场为例是正负 22.5 度，我们取正负 10 度作为设计目标，给人员移动和延迟留余量。所以这个场景的难点不是精度，而是稳健：粗大错误率、误转率和响应时延更关键。右边的数值都是建议值，需要和产品需求对齐，端侧开销要等目标芯片确定。");
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
      "PHAT 加权 + 直达声主导的时频点筛选；固定干扰方向表 + 视觉复核（无人形不跟）"),
    R("3", "云台电机自噪声，\n阵列随云台转动", "转动时测向失真；阵列坐标系随转角变化",
      "电机状态门控（转动期间冻结测向）；编码器角度换算到世界坐标；后续做电机噪声模板抑制"),
    R("4", "声源间歇、移动、\n多人同时说话", "说话停顿即丢目标；多人时不确定转向谁",
      "跟踪器静音保持；事件优先级 + 最近激活策略；多目标跟踪预研"),
    R("5", "常开低功耗", "网络全时运行功耗高", "两级触发：轻量检测常开，确认后再唤醒测向网络"),
  ], { x: 0.55, y: 1.45, w: 12.25, colW: [2.75, 4.5, 5.0], rowH: [0.45, 0.95, 0.85, 0.85, 0.85, 0.65], fontSize: 12.5 });
  T(s, "注：空间混叠频率 f = c / 2d（c ≈ 343 m/s，d 为阵元间距）", { x: 0.55, y: 6.4, w: 12, h: 0.3, fontSize: 11, color: GRAY });
  s.addNotes("这五个难点决定了后面的选型。第一，摄像头体积小，阵元少、孔径小，低频分辨率差，高频又会空间混叠，间距 4 厘米时大约 4.3 kHz 以上就混叠了；如果只有 2 个麦，还有前后模糊。第二，家里混响和电视是误转的主要来源。第三，云台电机转动时的自噪声，以及阵列装在云台头上时坐标系会跟着转。第四，人说话有停顿、会移动、会多人同时说。第五，常开链路必须低功耗。右列是对应的对策，后面几页逐一展开。");
}

// 6. 阵列构型
pres.addSection({ title: "方案选型" });
{
  const s = newSlide("方案选型");
  title(s, "阵列构型先行：推荐 4 麦平面阵；若只能用 2 麦，需借云台转动消除前后模糊");
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
    [cell("结论", { bold: true }), G("低成本档，需主动消歧"), G("可用：单声源精度接近 4 麦"), best("推荐", { bold: true, color: TEAL })],
  ], { x: 0.55, y: 1.45, w: 6.8, colW: [1.6, 1.7, 1.7, 1.8], rowH: [0.45, 0.62, 0.85, 0.62, 0.95, 0.5, 0.62], fontSize: 11.5 });
  box(s, 7.6, 4.15, 5.2, 2.6, LIGHT, null, "安装位置说明", 0.1);
  T(s, "安装位置同样影响算法", { x: 7.8, y: 4.25, w: 4.8, h: 0.35, fontSize: 13.5, bold: true, color: NAVY });
  T(s, bullets([
    [{ text: "固定在底座：", options: { bold: true } }, { text: "阵列坐标系不变，转动中仍可测向，但需抑制电机噪声" }],
    [{ text: "随云台转头：", options: { bold: true } }, { text: "测得方位须加编码器角度换算到世界坐标；转动中相当于“移动阵列”（对应 LOCATA 移动阵列任务）" }],
    [{ text: "孔径取舍：", options: { bold: true } }, { text: "孔径越大角分辨率越好，但混叠频率越低（d = 5 cm 时约 3.4 kHz）；建议 5–6 cm" }],
    [{ text: "【待确认】", options: { bold: true, color: AMBER } }, { text: "产品阵元数、间距与安装位置" }],
  ], 11.5, TEXT, 4), { x: 7.8, y: 4.62, w: 4.85, h: 2.1 });
  s.addNotes("算法要先看硬件。2 麦线阵成本最低，但前后对称，只能测 0 到 180 度；可以让云台小角度转一下，看方位变化的方向来消除前后模糊，这是机器人听觉里成熟的做法（Ma 等，TASLP 2017）。3 麦以上的平面阵就能覆盖 360 度。推荐 4 麦，因为能直接用 4 通道的 SALSA-Lite 和 DCASE 体系的网络，也能同时分辨更多声源；仿真显示单声源精度上 3 麦和 4 麦接近，所以成本敏感时 3 麦也可以接受。安装位置也很关键：装在底座坐标系不变；装在云台头上，就要用编码器角度换算到世界坐标，转动时相当于移动阵列。产品的阵元数、间距和安装位置需要确认。");
}

// 7. 测向算法选型
{
  const s = newSlide("方案选型");
  title(s, "测向算法对比：12 月原型用 SRP-PHAT；Q1 换轻量网络提升短时精度，SELD 留给异响扩展");
  const hl = (t, o) => cell(t, Object.assign({ fill: { color: TEAL_L } }, o || {}));
  const hs = (c) => { c.options.fill = { color: TEAL_L }; return c; };
  table(s, [
    [H("方法（出处）"), H("原理"), H("混响/噪声\n鲁棒"), H("多声源"), H("事件类别"), H("端侧开销"), H("定位")],
    [cell("GCC-PHAT", { bold: true }), "麦克风对时延估计", MID(), WEAK(), WEAK("无"), cell("极低"), cell("2 麦方案组件")],
    [hl("SRP-PHAT（pyroomacoustics 可复现）", { bold: true }), hl("在 5° 网格（72 个方向）上扫描各麦克风对的 PHAT 能量"), hs(MID()), hs(MID()), hs(WEAK("无")), hl("低"), hl("12 月原型 B0", { bold: true, color: TEAL })],
    [cell("NormMUSIC", { bold: true }), "子空间谱估计", WEAK("弱（相干反射）"), STRONG(), WEAK("无"), cell("中（逐频点特征分解）"), cell("对照")],
    [cell("Cross3D-Edge（ACM TECS 2023）", { bold: true }), "SRP 功率图 + 裁剪后的 3D CNN", STRONG(), WEAK("单声源"), WEAK("无"), cell("127 MFLOPS；树莓派 4B 8.6 ms/帧"), cell("单声源备选")],
    [cell("LightDOA（arXiv 2025）", { bold: true }), "双通道 IPD + 深度可分离卷积 + GRU，0–180° 按 5° 分类", MID(), WEAK(), WEAK("无"), cell("低"), cell("2 麦方案备选")],
    [hl("轻量 SELD：SALSA-Lite + 深度可分离 CRNN + Multi-ACCDOA", { bold: true }), hl("多通道对数谱 + 归一化 IPD，逐帧输出“类别 × 方向向量”"), hs(STRONG()), hs(STRONG("强（同类重叠可分）")), hs(STRONG("有")), hl("中，可裁剪"), hl("Q1 网络方向 M1（异响时用 SELD）", { bold: true, color: TEAL })],
    [cell("FN-SSL / IPDnet（Interspeech 2023 / 2024）", { bold: true }), "全带-窄带融合估计直达声 IPD，面向移动声源", STRONG(), STRONG("强（IPDnet）"), WEAK("无"), cell("较高"), cell("精度参照 / 教师模型")],
  ], { x: 0.55, y: 1.42, w: 12.25, colW: [2.85, 3.3, 1.05, 1.3, 0.95, 1.55, 1.25], rowH: [0.55, 0.5, 0.62, 0.5, 0.62, 0.62, 0.72, 0.62], fontSize: 11.5 });
  T(s, "评级综合各论文报告与原理分析，最终以统一测试矩阵复测为准；Neural-SRP（IEEE OJSP 2024）可适配任意阵列几何，若后续有多款硬件再引入。",
    { x: 0.55, y: 6.35, w: 12.25, h: 0.5, fontSize: 11, color: GRAY });
  s.addNotes("这页是测向算法的选型矩阵。SRP-PHAT 免训练、开销低、pyroomacoustics 可直接复现，作为基线。MUSIC 理论分辨率高，但对相干反射敏感，家里混响重，只作对照。Cross3D-Edge 是 SRP 图加裁剪的 3D CNN，在树莓派 4B 上 8.6 毫秒一帧，鲁棒但只支持单声源。LightDOA 是双通道的轻量网络，只覆盖 0 到 180 度，适合 2 麦方案。主方案选轻量 SELD：SALSA-Lite 特征加深度可分离 CRNN 加 Multi-ACCDOA 输出，原因是它是唯一能同时给出事件类别和方向的，正好用于决定该不该转。FN-SSL 和 IPDnet 精度强、面向移动声源，但开销较高，作为精度参照或者蒸馏的教师模型。评级需要在统一测试矩阵上复测确认。");
}

// 7b. 初步仿真：静态测向
{
  const s = newSlide("方案选型");
  title(s, "初步仿真：3/4 麦 SRP-PHAT 累积 2.5 s 时误差约 2–10°，但单帧精度随混响快速下降",
    "做法：150 个随机房间 × 4 档混响；同孔径 5.7 cm 的 2 / 3 / 4 麦阵列；2.5 s 中文语音；传感器噪声 SNR 15 dB；300–4000 Hz、1° 网格");
  s.addImage({ path: img("fig_srp_rt60.png"), x: 0.45, y: 1.38, w: 8.4, h: 8.4 * 2.55 / 8.6, altText: "4 麦 SRP-PHAT 空间谱随混响时间变化", objectName: "混响空间谱图" });
  box(s, 9.05, 1.45, 3.75, 2.35, TEAL_L, null, "仿真要点", 0.1);
  T(s, bullets([
    [{ text: "3 麦 ≈ 4 麦 ≫ 2 麦：", options: { bold: true } }, { text: "2 麦 37–61% 为镜像 / 粗大错误" }],
    [{ text: "单帧（32 ms）：", options: { bold: true } }, { text: "误差 ≤10° 的比例从 100% 降到 18%" }],
    [{ text: "结论：", options: { bold: true, color: TEAL } }, { text: "难点在“短时间窗 + 混响”，这是 M1 要解决的核心" }],
  ], 12, TEXT, 5), { x: 9.25, y: 1.58, w: 3.45, h: 2.15 });
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
  s.addNotes("这是用镜像源法做的初步仿真：150 个随机房间、4 档混响，比较同孔径的 2、3、4 麦阵列跑 SRP-PHAT 基线。下面两张曲线是累积 2.5 秒语音的结果：3 麦和 4 麦很接近，平均误差约 2 到 10 度，基本没有粗大错误；2 麦因为前后镜像，37% 到 61% 是粗大错误，所以 2 麦必须配合转动消歧。上面是单帧，也就是 32 毫秒的空间谱：混响越强峰越宽，单帧误差小于 10 度的比例从 100% 掉到 18%。所以真正的难点不是长时间累积后的精度，而是短时间窗加混响——响应要快就只能用很短的数据，这正是主方案 M1 要解决的。另外 3 麦和 4 麦单声源精度接近，4 麦的优势在多声源能力和兼容 4 通道 SELD 网络；成本敏感时 3 麦是可接受的折中。这是初步仿真，没有家具散射和真实噪声，需要在真实数据上复核。");
}

// 8. 推荐架构
{
  const s = newSlide("方案选型");
  title(s, "原型架构：唤醒触发 → 唤醒词片段测向 → 持续跟踪 → 方位同时驱动波束成形与云台");
  const row1 = [
    ["4 麦阵列", "16 kHz；2 s 环形缓存", 1.55],
    ["语音唤醒（mentor）", "输出唤醒词起止时间与置信度", 2.05],
    ["特征提取", "STFT 32 ms；PHAT 加权互谱（原型）/ SALSA-Lite（Q1 网络）", 3.0],
    ["测向", "原型：SRP-PHAT + 起始段加权；Q1：轻量网络", 2.45],
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
    ["跟踪器", "一期：圆周卡尔曼；三期：粒子滤波", 3.0],
    ["坐标变换", "方位 + 云台编码器角 → 世界坐标", 3.0],
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
  const side = [["电机状态：转动中冻结测向", xs2[2]], ["视觉人形框：视听融合（三期）", xs2[2] + 1.55]];
  side.forEach((sd, i) => {
    s.addText(sd[0], { shape: pres.shapes.ROUNDED_RECTANGLE, x: xs2[1] + 0.0 + i * 3.1 + 1.2, y: 4.85, w: 2.9, h: 0.42,
      fill: { color: WHITE }, line: { color: BORDER, width: 1 }, rectRadius: 0.2, fontFace: FONT, fontSize: 11, color: GRAY,
      align: "center", valign: "middle", margin: 0 });
  });
  arrow(s, xs2[2] + 0.75, 4.85 - 0.02, 0, -(4.85 - y2 - h2 - 0.04), {});
  arrow(s, xs2[2] + 2.25, 4.85 - 0.02, 0, -(4.85 - y2 - h2 - 0.04), {});
  // 参数卡
  const cards = [
    ["唤醒词片段测向", "唤醒词约 0.5–1 s 语音集中测向，不需要事件分类"],
    ["给波束成形", "方位 + 置信度；低置信度时保持上一方向（见下页）"],
    ["原型算力【待定】", "SRP-PHAT：4 麦 6 对 × 119 频点 × 360 方向 / 帧；可降到 5° 网格"],
  ];
  cards.forEach((c, i) => {
    const cx = 0.55 + i * 4.15;
    box(s, cx, 5.6, 3.95, 1.15, LIGHT2, BORDER, "参数卡" + i, 0.08);
    T(s, c[0], { x: cx + 0.2, y: 5.7, w: 3.6, h: 0.32, fontSize: 12.5, bold: true, color: NAVY });
    T(s, c[1], { x: cx + 0.2, y: 6.03, w: 3.6, h: 0.65, fontSize: 11.5 });
  });
  s.addNotes("原型架构分两行看。上一行是感知：4 麦 16 kHz 输入并保留 2 秒环形缓存；mentor 的唤醒模块检测到唤醒词后给出起止时间；我取这段唤醒词音频做 PHAT 加权互谱，用 SRP-PHAT 加起始段加权测向；每 100 毫秒输出方位和置信度。下一行是执行：方位加上云台编码器角度换算到世界坐标，进跟踪器，再由决策模块决定是否转；执行时云台转向、波束对准，最后交给视觉。和之前的版本相比，触发从“能量检测 + 事件分类”换成了唤醒，所以原型不需要事件分类网络；神经网络放到 Q1 用来提升短时精度。");
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
  T(s, [{ text: "对定位的要求　", options: { bold: true, color: NAVY } }, { text: "方位误差 ≤ 10°、每 100 ms 更新、带置信度；波束成形算法本身的选型由负责人决定（分工待确认）。" }],
    { x: 0.8, y: 5.95, w: 11.8, h: 0.8, fontSize: 12.5, valign: "middle" });
  s.addNotes("这页回答“定位要准到什么程度才能给波束成形用”。左图是我算的：延迟求和波束按估计方向对准，而人其实在偏一点的方向，语音增益会损失多少。4 麦方阵误差 10 度只损失约 0.1 分贝，20 度约 0.4 分贝，所以正负 10 度对延迟求和完全够用。右图说明小阵列真正的瓶颈：孔径只有 5.7 厘米，1 kHz 以下延迟求和几乎没有指向性，要靠超指向或 MVDR 一类方法；这类方法对方向误差更敏感，这一点是我的判断，还要仿真验证，所以定位必须输出置信度，低置信度时让波束保持方向或退回宽波束。波束成形算法本身由谁做需要确认，我这边先把接口和精度要求定下来。");
}

// 9. 跟踪与云台控制
{
  const s = newSlide("方案选型");
  title(s, "持续跟踪：跟踪器维持航迹，状态机控制云台，避免抖动、误转与静音丢失");
  table(s, [
    [H("跟踪器"), H("优点"), H("局限"), H("阶段")],
    [cell("圆周卡尔曼\n（状态：方位 + 角速度）", { bold: true }), "轻量、平滑、易调参", "单目标、单峰假设", cell("一期 ✓", { bold: true, color: TEAL, align: "center" })],
    [cell("粒子滤波\n（以 SRP / 网络输出作似然）", { bold: true }), "可处理多峰与伪峰，便于视听融合", "计算量随粒子数增长", cell("三期 ✓", { bold: true, color: TEAL, align: "center" })],
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
  s.addNotes("跟踪器一期用圆周卡尔曼，状态是方位和角速度，要处理 0 和 360 度的回绕；三期换粒子滤波，直接把 SRP 或网络输出当似然，能处理多峰和伪峰，也方便接入视觉。多目标的 GM-PHD 先预研。云台控制用右边的状态机：待机、触发确认、转向、视觉确认、跟踪、静音保持；转向时冻结测向；丢失目标先保持航迹，超时再回预置位。左下是四条控制规则，重点是死区防抖动、优先级，以及用干扰方向表处理电视。");
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
  title(s, "闭环仿真：说话后 0.3 s 开始转向、0.7 s 入画，之后目标 99% 时间位于画面中央一半",
    "做法：基线 B0 全链路闭环；说话人在画面外开口并绕行 170°；RT60 = 0.5 s；视觉检测为模拟（画面内 90% 检出）");
  s.addImage({ path: img("fig_closed_loop.png"), x: 0.45, y: 1.38, w: 8.9, h: 3.9, altText: "云台朝向、视场、跟踪输出与状态随时间变化", objectName: "闭环仿真图" });
  const stats = [
    ["0.29 s", "从触发到开始转动（目标 ≤ 0.5 s）", TEAL],
    ["0.67 s", "从触发到目标进入画面", TEAL],
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
    { text: "死区设计让云台“走走停停”而不是持续抖动；单声源、无干扰、RT60 = 0.5 s 的理想场景，视觉为模拟，真实效果需在设备上复测。代码见基线代码包。" }],
    { x: 0.8, y: 5.6, w: 11.8, h: 0.95, fontSize: 12.5, valign: "middle" });
  s.addNotes("这页把基线 B0 的全链路串起来做了闭环仿真：说话人从画面外开始说话，边说边绕摄像头走 170 度。底部的状态条能看到：待机，0.29 秒后开始转向，转动期间冻结测向，到位后视觉确认，然后进入跟踪。之后目标 99% 的时间都在画面中央一半，云台在 17 秒里只移动了 10 次，因为有死区，所以是走走停停，不会一直抖。融合视觉后跟踪误差约 1.3 度。需要说明这是理想场景：单声源、没有电视干扰、视觉是模拟的，真实效果要上设备复测。");
}

// 9d. 电视干扰仿真
{
  const s = newSlide("方案选型");
  title(s, "电视干扰仿真：不启用干扰方向表时云台被电视“锁死”，启用后真人开口 3 s 内入画",
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
    { text: "电视误转是家用场景的头号风险，纯声学无法区分电视里的人声和真人；“画面内长时间有声无人”这一视觉线索代价很低、效果直接，应作为基线必备功能。屏蔽时长、解除条件需在真实家庭数据上调参。竞品中 Echo Show 10 采用让用户划定运动范围的方式处理类似问题。" }],
    { x: 0.8, y: 5.05, w: 11.8, h: 1.45, fontSize: 12.5, valign: "middle" });
  s.addNotes("电视是家用场景最大的误转来源，所以单独做了一个仿真：电视在画面里一直放人声，但画面里没有人；12 秒后真人在画面外开口。左图不启用干扰方向表：跟踪器锁在电视上，真人方向的观测被门控当成野值拒掉，云台一直不转。右图启用后：电视方向“画面内、有声、无人”累计 4 秒，就被屏蔽，航迹释放，真人一开口 3 秒内就转过去了。如果之后在被屏蔽的方向看到真人，会自动解除屏蔽。这个功能代价很低，应作为基线必备；具体时长要在真实家庭数据上调。");
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
    ["坐标统一", "像素横坐标 x 换算为方位：θ = θ云台 + arctan((x − cx) / fx)，与声学方位在同一世界坐标下比对；麦克风阵列与摄像头需做一次外参标定"],
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
  s.addNotes("视听融合的分工：视场外只有声学，负责 360 度找人；视场内由视觉精定位。三个要点：第一是坐标统一，把像素横坐标用相机内参换算成方位，加上云台角，和声学方位放在同一个世界坐标里比对，需要做一次阵列和相机的外参标定。第二是说话人确认，多人在画面里时用 Light-ASD 判断谁在说话，它只有约 1M 参数、0.6 GFLOPs，适合端侧。第三是融合跟踪，用粒子滤波把两路似然相乘，CAV3D 正好是摄像头和麦阵共址的数据集，可以直接评测。DCASE 2025 也新增了画面内外判定，说明这个方向是学术界的热点。");
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
  s.addNotes("最后看前沿趋势，按对我们的可用时间排序。近期可用的有三条：DCASE 2025 把任务改成立体声加普通视角视频，并加入画面内外判定，和我们的场景几乎一样；RealMAN 证明真实数据训练优于仿真，并能训练可变阵列网络，Neural-SRP 也能适配任意几何，适合多款硬件；端侧轻量化上 Cross3D-Edge 和 LightDOA 说明常开测向的算力已可行。中期是 DCASE 2026 的声学成像：比赛 6 月已经结束，8 支队伍 29 个提交，评测时只给 4 通道音频，要求输出每度一个像素的声能图；纯音频赛道第一名是港中文团队，Mask mAP 只有 0.108，说明 4 通道就能做，但精度还很低，适合作为中期储备，将来做成 App 上的声源热力图。远期是空间音频加大模型，BAT 和 ELSA 能回答声音在哪、是什么，未来可以支持语义查询。");
}

// 11. 数据集
pres.addSection({ title: "数据集与评测" });
{
  const s = newSlide("数据集与评测");
  title(s, "公开数据集：按与场景的贴近程度选用，真实数据用于微调与评测");
  const top = (t, o) => cell(t, Object.assign({ fill: { color: TEAL_L } }, o || {}));
  const C = (t) => cell(t, { align: "center" });
  const TC = (t) => top(t, { align: "center" });
  table(s, [
    [H("数据集（出处）"), H("采集方式与阵列"), H("动态声源"), H("视频"), H("规模"), H("许可"), H("本方案用途")],
    [top("CAV3D（FBK，IEEE TMM 2019）", { bold: true }), top("真实；8 麦圆阵与摄像头共址"), TC("✓"), TC("✓"), top("20 段序列（单人 / 干扰 / 多人）"), TC("见官网"), top("视听跟踪评测（最贴近）", { bold: true, color: TEAL })],
    [top("RealMAN（NeurIPS 2024）", { bold: true }), top("真实；32 麦阵列，可抽子阵模拟产品几何"), TC("✓ 35 h"), TC("—"), top("83 h 语音 + 144 h 噪声，32 个场景"), TC("CC BY 4.0"), top("真实微调与评测、真实噪声", { bold: true, color: TEAL })],
    [top("SSLR（Idiap，ICRA 2018）", { bold: true }), top("真实；Pepper 机器人头 4 麦（5.8 × 6.9 cm），含风扇自噪声"), TC("部分"), TC("—"), top("约 25 h 回放 + 真人录音"), TC("EULA 非商用"), top("小孔径 + 自噪声测向评测", { bold: true, color: TEAL })],
    [cell("LOCATA（IEEE/ACM TASLP 2020）", { bold: true }), "真实；4 类阵列（含 12 麦机器人头、助听器）", C("✓ 含移动阵列"), C("—"), "6 个任务（静 / 动声源 × 静 / 动阵列）", C("Open Data Commons"), "跟踪评测（移动阵列 ≈ 云台转动）"],
    [cell("STARSS23（DCASE 2023）", { bold: true }), "真实；4 通道四面体阵列（MIC）/ FOA", C("✓"), C("360°"), "168 段约 7.5 h，16 个房间，13 类", C("MIT"), "事件 + 定位联合评测"],
    [cell("DCASE2025 立体声 SELD", { bold: true }), "由 STARSS23 转换：双通道 + 普通视角视频", C("✓"), C("✓"), "13 类，含画面内 / 外标签", C("见 Zenodo"), "2 麦 + 有限视场参照"],
    [cell("AV16.3（Idiap，2004）", { bold: true }), "真实；2 组 8 麦圆阵 + 3 台摄像头", C("✓"), C("✓"), "43 段", C("EULA 非商用"), "视听跟踪经典对比"],
  ], { x: 0.55, y: 1.42, w: 12.25, colW: [2.45, 3.05, 1.05, 0.7, 2.25, 1.15, 1.6], rowH: [0.45, 0.6, 0.6, 0.6, 0.6, 0.55, 0.55, 0.5], fontSize: 11 });
  T(s, "非商用许可的数据仅用于研究对比，产品训练使用商用友好数据与自采数据。前沿：DCASE 2026 任务 3 转向“声学成像”（STAIRS26，32 通道），可作为画面叠加声源热力图的参考。",
    { x: 0.55, y: 6.2, w: 12.25, h: 0.6, fontSize: 11, color: GRAY });
  s.addNotes("公开数据集按贴近程度排了序，前三个最贴近。CAV3D 是摄像头和 8 麦圆阵共址，有出入画面、长时间静音这些情况，最适合评测视听跟踪。RealMAN 是 NeurIPS 2024 的真实录制数据，32 麦，可以抽取和我们产品几何接近的子阵，还有 144 小时真实噪声，作者实验里用真实数据训练的模型优于仿真训练，CC BY 4.0 许可。SSLR 是 Pepper 机器人头上的 4 麦，孔径 6 厘米左右，带风扇自噪声，跟摄像头的小阵列加自噪声很像，但只能非商用。LOCATA 有移动阵列任务，可以近似云台转动。STARSS23 和 DCASE 2025 立体声版本用于事件加定位的联合评测。需要注意许可：非商用的数据只做研究对比。");
}

// 12. 数据方案
{
  const s = newSlide("数据集与评测");
  title(s, "数据方案：按产品阵列几何大规模仿真，真实数据微调，自采数据闭环验收");
  const cols = [
    { n: "1", h: "仿真训练集（主体）", w: 4.75, fill: TEAL_L, c: TEAL, items: [
      [{ text: "工具：", options: { bold: true } }, { text: "gpuRIR（支持移动轨迹）、pyroomacoustics、SpatialScaper" }],
      [{ text: "房间：", options: { bold: true } }, { text: "边长 3–8 m，RT60 0.2–0.9 s" }],
      [{ text: "声源：", options: { bold: true } }, { text: "距离 0.5–5 m，方位 0–360°；静止 / 直线 / 随机游走" }],
      [{ text: "干扰：", options: { bold: true } }, { text: "扩散噪声 + 定向干扰（电视、音乐），SNR −5～20 dB，1–3 个声源重叠" }],
      [{ text: "增强：", options: { bold: true } }, { text: "阵元位置扰动、通道增益与相位失配、对称阵列通道置换" }],
      [{ text: "素材：", options: { bold: true } }, { text: "AISHELL-1、LibriSpeech、FSD50K（按许可筛选）；噪声 DEMAND、MUSAN" }],
    ] },
    { n: "2", h: "真实数据（微调与评测）", w: 3.6, fill: LIGHT, c: NAVY, items: [
      [{ text: "RealMAN：", options: { bold: true } }, { text: "抽取与产品几何最接近的子阵；真实语音 + 真实噪声" }],
      [{ text: "公开对比：", options: { bold: true } }, { text: "LOCATA、STARSS23、CAV3D" }],
      [{ text: "流程：", options: { bold: true } }, { text: "仿真预训练 → 真实数据微调 → 同矩阵评测" }],
    ] },
    { n: "3", h: "自采数据（验收依据）", w: 3.5, fill: RED_L, c: RED, items: [
      [{ text: "设备实录：", options: { bold: true } }, { text: "3–5 类房间 × 8 个方位 × 3 个距离 × 4 种干扰（安静 / 电视 / 空调 / 电机转动）" }],
      [{ text: "声源：", options: { bold: true } }, { text: "真人 + 音箱回放" }],
      [{ text: "标注：", options: { bold: true } }, { text: "摄像头自动检测或转台" }],
      [{ text: "误转专测：", options: { bold: true } }, { text: "长时无人录音（含电视）" }],
    ] },
  ];
  let x = 0.55;
  cols.forEach((c, i) => {
    box(s, x, 1.45, c.w, 5.3, c.fill, null, "数据列" + c.n, 0.1);
    circleNum(s, x + 0.25, 1.65, 0.5, c.n, c.c, 13);
    T(s, c.h, { x: x + 0.9, y: 1.65, w: c.w - 1.05, h: 0.5, fontSize: 14.5, bold: true, color: c.c, valign: "middle" });
    T(s, bullets(c.items, 14, TEXT, 10), { x: x + 0.25, y: 2.35, w: c.w - 0.45, h: 4.3 });
    if (i < 2) arrow(s, x + c.w + 0.02, 4.1, 0.16, 0);
    x += c.w + 0.2;
  });
  s.addNotes("数据方案分三步。第一步是仿真，作为训练主体：用 gpuRIR、pyroomacoustics 或 SpatialScaper，按产品真实的阵列几何生成，房间、混响、距离、轨迹、干扰和信噪比都按家庭场景设范围，还要做阵元位置扰动和通道失配增强，让模型对硬件误差不敏感；对称阵列可以用通道置换做旋转增强。第二步用 RealMAN 这类真实数据微调。第三步是自采数据，这是最终验收依据：按房间、方位、距离、干扰条件做正交采集，单独录长时间无人加电视的音频，专门测误转率。");
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
  T(s, "仿真与自采数据均按此矩阵出结果，B0 / M1 / E1 逐格对比，用数据决定是否进入下一阶段。",
    { x: 0.55, y: 6.05, w: 12.25, h: 0.4, fontSize: 12.5, color: TEXT });
  s.addNotes("评测分三层。帧级测向看 MAE、命中率和粗大错误率，事件加定位用 DCASE 的 SELD 指标。轨迹层看跟踪误差、断裂和多人 ID 切换，参考 LOCATA 的评测体系。系统层看产品体验：转向命中率、响应时延、误转率和端侧开销。所有方案都在同一个测试矩阵上出结果：混响、信噪比、声源数、静止或移动、电机是否转动，逐格对比，用数据决定要不要进入下一阶段。");
}

// 14. Demo 方案 + 12 月周计划
pres.addSection({ title: "计划与待确认" });
{
  const s = newSlide("计划与待确认");
  title(s, "先做 demo：离线回放保底、实时演示加分，每周用同一组场景展示进展",
    "演示场景固定，每周只换算法版本，进展一目了然");
  const demos = [
    ["A", "离线回放 demo（11 月第 2 周起每周可演示）", TEAL, TEAL_L, [
      "输入：多通道录音（仿真 / 公开数据 / 实录）+ 唤醒时间戳",
      "流程：唤醒词片段测向 → 持续跟踪 → 云台状态机",
      "展示：方位随时间曲线、俯视图上的说话人与云台指向",
      "输出：每个场景的误差、时延统计"]],
    ["B", "实时 demo（12 月中旬）", NAVY, LIGHT, [
      "硬件：目标阵列或 4 麦 USB 阵列 + PC【待确认】",
      "流程：实时采集 → 唤醒（mentor 模块，或先用按键模拟）→ 方位显示",
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
  s.addNotes("mentor 说先做 demo，我计划分两档。A 是离线回放，从 11 月第 2 周起每周都能演示：用多通道录音加唤醒时间戳，跑唤醒词片段测向、跟踪和云台状态机，画出方位随时间的曲线和俯视图，并给出误差和时延统计。B 是实时演示，放在 12 月中旬：需要目标阵列或者一块 4 麦 USB 阵列，实时采集，唤醒先用 mentor 的模块，如果还没接好就用按键模拟，屏幕上显示方位并让虚拟或真实云台转向。演示场景固定为五个，每周只换算法版本，这样进展一目了然。");
}
{
  const s = newSlide("计划与待确认");
  title(s, "12 月底原型计划：11 月每周 2 天做离线验证，12 月全职做实时 demo 与集成",
    "按实际投入约 28 个工作日（11 月 6 天、12 月约 22 天，12/25 假期）；每周与 mentor 讨论一次");
  const W = (t) => cell(t, { bold: true, color: NAVY, align: "center" });
  const D = (t, c) => cell(t, { align: "center", color: c || TEXT, bold: !!c });
  table(s, [
    [H("周"), H("日期"), H("投入"), H("目标"), H("周会交付")],
    [W("W1"), "11/09–11/15", D("2 天"), "对齐接口、demo 硬件与验收指标；代码改成“唤醒词片段测向”接口", "接口约定 v1"],
    [W("W2"), "11/16–11/22", D("2 天"), "离线 demo A v0：仿真 + 公开数据（LOCATA）", "离线 demo；首版误差表"],
    [W("W3"), "11/23–11/29", D("2 天"), "录音方案与录音脚本；若阵列已到，先录一小批", "录音方案 + 首批实录"],
    [W("W4"), "11/30–12/06", D("全职", TEAL), "实录评测与调参；唤醒后持续跟踪", "实录评测表"],
    [W("W5"), "12/07–12/13", D("全职", TEAL), "实时流式框架 + 方位显示（虚拟云台）", "实时运行；时延实测"],
    [W("W6"), "12/14–12/20", D("全职", TEAL), "接入唤醒（或按键模拟）+ 波束成形接口；端到端 demo", "实时 demo B 视频"],
    [W("W7"), "12/21–12/27", D("全职 4 天", TEAL), "鲁棒性：电视、强混响、两人场景；算力估计", "鲁棒性评测表"],
    [W("W8"), "12/28–12/31", D("全职 4 天", TEAL), "原型冻结、报告与演示；Q1 计划", "原型代码 + 报告 + demo"],
  ], { x: 0.55, y: 1.4, w: 12.25, colW: [0.75, 1.55, 1.25, 5.85, 2.85], rowH: [0.42, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], fontSize: 12 });
  box(s, 0.55, 6.0, 12.25, 0.75, LIGHT2, BORDER, "风险", 0.08);
  T(s, [{ text: "主要风险与预案　", options: { bold: true, color: NAVY } },
    { text: "阵列未到位 → 先用通用 4 麦 USB 阵列；唤醒接口未就绪 → 先用录音时间戳 / 按键模拟；电视误唤醒 → 干扰方向表 + 视觉复核。" }],
    { x: 0.8, y: 6.0, w: 11.8, h: 0.75, fontSize: 12, valign: "middle" });
  s.addNotes("这是按我实际能投入的时间排的计划：11 月每周 2 天，12 月全职，一共约 28 个工作日。11 月时间少，只做离线的事——第 1 周对齐接口、硬件和验收指标，并把代码改成唤醒词片段测向的接口；第 2 周出离线 demo 和第一版误差表；第 3 周准备录音方案，阵列到了就先录一批。12 月全职做实时和集成：实录评测与调参、实时框架和方位显示、接入唤醒和波束成形接口做端到端 demo、鲁棒性和算力，最后一周冻结原型、写报告。阵列没到就先用通用 4 麦 USB 阵列，唤醒没接好就先用按键模拟。");
}

{
  const s = newSlide("计划与待确认");
  title(s, "首次周会要对齐的六件事：硬件、唤醒接口、波束成形分工决定原型细节");
  const qs = [
    ["阵列与 demo 硬件", "麦克风数量、间距、安装位置？demo 用哪块板或阵列？"],
    ["唤醒接口", "唤醒跑在单通道还是多波束？能否给出唤醒词起止时间与置信度？"],
    ["波束成形", "由谁负责？需要定位输出什么（方位、置信度、更新率）？"],
    ["芯片预算", "目标 SoC 的算力、内存与常开功耗预算？"],
    ["镜头与云台", "水平视场角、云台转速、电机噪声水平？"],
    ["数据与周会", "能否录设备实录？每周讨论的时间与形式？"],
  ];
  qs.forEach((q, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.55 + col * 4.17, y = 1.5 + row * 2.6;
    box(s, x, y, 3.9, 2.35, i < 3 ? LIGHT : LIGHT2, i < 3 ? null : BORDER, "待确认" + i, 0.1);
    circleNum(s, x + 0.25, y + 0.25, 0.55, String(i + 1), i < 3 ? NAVY : TEAL, 14);
    T(s, q[0], { x: x + 0.95, y: y + 0.25, w: 2.8, h: 0.55, fontSize: 16, bold: true, color: NAVY, valign: "middle" });
    T(s, q[1], { x: x + 0.25, y: y + 1.0, w: 3.45, h: 1.2, fontSize: 14 });
  });
  s.addNotes("最后是第一次周会想对齐的六件事。前三件最急：demo 用哪块阵列或板子；唤醒是跑在单通道还是多波束上、能不能给出唤醒词的起止时间和置信度；波束成形由谁负责、需要定位输出什么。后三件是芯片预算、镜头和云台参数、实录数据和周会形式。确认之后我就按周计划推进。");
}


// ===================== 精简版专用页 =====================
if (SHORT) {
  // S1. 仿真验证三合一
  {
    const s = newSlide("方案选型");
    title(s, "初步仿真验证：阵列选择、闭环跟踪、电视干扰三组结果都支持推荐方案",
      "镜像源法仿真 + 模拟视觉；设置与更多结果见完整版第 9、13–15 页");
    const cols = [
      { head: "阵列：3 / 4 麦可用，2 麦不行", img: "fig_srp_2v3v4.png", ih: 3.75 * 2.45 / 5.4, color: NAVY,
        items: ["2 麦：37–61% 落在镜像方向", "3 / 4 麦：累积 2.5 s 时误差约 2–10°", "单帧精度随混响快速下降 → M1 的核心任务"] },
      { head: "闭环：0.3 s 开始转，0.7 s 入画", img: "fig_short_loop.png", ih: 3.75 * 2.15 / 3.9, color: TEAL,
        items: ["入画后 98.8% 时间在画面中央一半", "17 s 内云台只动 10 次（死区防抖）", "融合视觉后跟踪误差约 1.3°"] },
      { head: "电视：干扰方向表是必备功能", img: "fig_short_tv.png", ih: 3.75 * 2.15 / 3.9, color: RED,
        items: ["不启用：被电视“锁死”，始终不转向真人", "启用：真人开口 3 s 内入画", "看到真人自动解除屏蔽"] },
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
    s.addNotes("这页把三组仿真放在一起，都在支持推荐方案。左边是阵列：同孔径下 2 麦有 37% 到 61% 落在镜像方向，3 麦和 4 麦累积 2.5 秒时误差在 2 到 10 度，但单帧精度随混响下降得很快，这正是主方案网络要解决的。中间是基线全链路闭环：说话人在画面外开口，0.3 秒开始转，0.7 秒入画，之后 98.8% 的时间在画面中央一半，云台 17 秒只动了 10 次。右边是电视干扰：不加干扰方向表时云台被电视锁死，加上后真人开口 3 秒内就转过去。局限是理想仿真，下一步要用 LOCATA、RealMAN 和设备实录复核。");
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
      s.addImage({ path: path.join(__dirname, "comp_imgs", p[0]), x: x + 0.62, y: y + 0.1, w: 1.56, h: 1.56, altText: p[1], objectName: "竞品图片" + i });
      T(s, p[1], { x: x + 0.12, y: y + 1.7, w: w - 0.24, h: 0.32, fontSize: 11.5, bold: true, color: NAVY, align: "center" });
      T(s, p[2], { x: x + 0.12, y: y + 2.0, w: w - 0.24, h: 0.42, fontSize: 9.5, color: GRAY, align: "center" });
    });
    const take = [
      ["家用：听声转向仍属少数", "主流（Tapo、小米 C700）只做声音检测 + 视觉追踪 → 做到“稳、不乱转”就是差异化", TEAL],
      ["成熟方案都靠视觉确认", "Echo Show 10、Cisco、Logitech、Owl、IdeaHub 均为声学粗定位 + 人脸 / 人形确认 → 印证 E1", TEAL],
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
    s.addNotes("竞品看下来有四点。第一，家用摄像头里听声转向仍属少数：萤石 2019 年就有 3 麦 360 度声源定位，华为智选的雀蛋 Pro 2025 年用双麦做音画追踪，但主流的 Tapo、小米 C700 只做声音检测加视觉追踪，做到稳、不乱转就是差异化。第二，成熟方案都是声学粗定位加视觉确认，印证我们的视听融合路线。第三，反射误转是公认痛点，Amazon 官方博客专门讲过，所以干扰方向表和视觉复核必须做。第四，测向能力在下沉到芯片，IPC 芯片厂商公开资料里没看到，这可能是我们的机会，这一点是我的判断。详细的产品图和来源在竞品调研那份材料里。");
  }
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
})();
