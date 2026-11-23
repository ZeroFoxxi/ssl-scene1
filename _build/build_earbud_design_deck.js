// 耳机摄像头无障碍听觉辅助：整体设计方案与明显问题排查（给 mentor）。
// 风格：像工程师自己写的技术方案——标题写本页主题（短），结论写在正文；表格按 mentor 调研 PPT 样式；页面浅灰底；正文是框图、带坐标轴的图表、带数字的表格；
// 颜色克制（深蓝一种主色，红色只标关键风险）；细线分隔；不用彩色卡片、圆形图标、编号徽章、装饰色块。
// 内容依据：02_耳机声源定位/整体设计方案.md（v2.1）、明显问题排查.md（v2.1）、code/earbud_ssl/out/*.json。
const pptxgen = require("pptxgenjs");
const path = require("path");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, "..", "02_耳机声源定位"), "耳机摄像头听觉辅助_整体设计方案.pptx");
const F = "Microsoft YaHei";
const C = { ink: "1F1F1F", gray: "595959", light: "8C8C8C", rule: "D9D9D9", box: "A6A6A6", navy: "134074", navyLt: "8DA9C4", navyPale: "EEF2F7", red: "B22222" };

const BG = process.env.BG || "F7F8FA"; // 页面底色：浅灰，避免纯白刺眼
let pageNo = 1; // 封面为第 1 页
const p = new pptxgen();
p.layout = "LAYOUT_WIDE"; // 13.33 × 7.5 in
p.title = "耳机摄像头无障碍听觉辅助：整体设计方案";

const T = (s, text, o) => s.addText(text, Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 13, color: C.ink, margin: 0, valign: "top", isTextBox: true }, o));
const NONE = { type: "none" };
const RULE = { type: "solid", pt: 0.5, color: C.rule };
const cell = (t, o) => ({ text: t, options: Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 11, color: C.ink, valign: "middle", border: [NONE, NONE, RULE, NONE] }, o) });
const head = (t, o) => cell(t, Object.assign({ bold: true, color: C.navy, border: [NONE, NONE, { type: "solid", pt: 1.25, color: C.navy }, NONE] }, o));
const bold = (t, o) => cell(t, Object.assign({ bold: true }, o));
const ctr = (t, o) => cell(t, Object.assign({ align: "center" }, o));
// 表格按 mentor 调研 PPT 的样式：表头深蓝底白字，正文浅蓝与白色交替；颜色逐格写死，不用内置表格样式
const LINE_W = { type: "solid", pt: 0.75, color: "FFFFFF" };
const table = (s, rows, x, y, colW, rowH) => {
  const styled = rows.map((r, i) => r.map((c) => {
    const o = Object.assign({}, c.options, { border: [LINE_W, LINE_W, LINE_W, LINE_W] });
    if (i === 0) Object.assign(o, { fill: { color: C.navy }, color: "FFFFFF", bold: true });
    else o.fill = { color: i % 2 === 1 ? "EAF2F8" : "FFFFFF" };
    return { text: c.text, options: o };
  }));
  return s.addTable(styled, { x, y, w: colW.reduce((a, b) => a + b, 0), colW, rowH, margin: [0.04, 0.08, 0.04, 0.08], autoPage: false });
};

function newSlide(title, source, notes) {
  const s = p.addSlide();
  s.background = { color: BG };
  pageNo += 1;
  T(s, title, { x: 0.6, y: 0.38, w: 12.1, h: 0.6, fontSize: 20, bold: true, color: C.navy, valign: "middle" });
  s.addShape(p.shapes.LINE, { x: 0.6, y: 1.08, w: 12.13, h: 0, line: { color: C.navy, width: 1 } });
  s.addShape(p.shapes.LINE, { x: 0.6, y: 6.88, w: 12.13, h: 0, line: { color: C.rule, width: 0.75 } });
  if (source) T(s, source, { x: 0.6, y: 6.94, w: 11.2, h: 0.3, fontSize: 9, color: C.light, valign: "middle" });
  T(s, String(pageNo), { x: 12.23, y: 6.94, w: 0.5, h: 0.3, fontSize: 9, color: C.light, align: "right", valign: "middle" });
  if (notes) s.addNotes(notes);
  return s;
}
// 每页一句要点（mentor：突出重要的点）
const key = (s, text) => T(s, text, { x: 0.6, y: 1.14, w: 12.13, h: 0.36, fontSize: 13.5, bold: true, color: C.ink, valign: "middle" });
function box(s, text, x, y, w, h, o) {
  o = o || {};
  s.addShape(p.shapes.RECTANGLE, { x, y, w, h, fill: { color: o.fill || "FFFFFF" }, line: { color: o.line || C.box, width: o.lw || 0.75 } });
  T(s, text, Object.assign({ x: x + 0.06, y, w: w - 0.12, h, fontSize: 11.5, align: "center", valign: "middle", color: o.color || C.ink, bold: !!o.bold }, o.text || {}));
}
function line(s, x1, y1, x2, y2, o) {
  o = o || {};
  s.addShape(p.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001,
    flipH: x2 < x1, flipV: y2 < y1, line: { color: o.color || C.gray, width: o.width || 1, dashType: o.dash || "solid", endArrowType: o.arrow === false ? undefined : "triangle" } });
}
const para = (s, items, x, y, w, h, o) => s.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } })),
  Object.assign({ x, y, w, h, fontFace: F, lang: "zh-CN", fontSize: 13, color: C.ink, valign: "top", margin: 0.03, paraSpaceAfter: 8, isTextBox: true }, o || {}));
const sub = (s, text, x, y, w) => T(s, text, { x, y, w, h: 0.35, fontSize: 13, bold: true, color: C.navy, valign: "middle" });
const chartBase = { catAxisLabelFontFace: F, valAxisLabelFontFace: F, dataLabelFontFace: F, legendFontFace: F, titleFontFace: F,
  catAxisLabelFontSize: 10.5, valAxisLabelFontSize: 10, dataLabelFontSize: 10, legendFontSize: 10.5, titleFontSize: 11.5,
  catAxisLabelColor: "404040", valAxisLabelColor: "595959", dataLabelColor: "404040", titleColor: "404040",
  valGridLine: { color: "E8E8E8", size: 0.5 }, catGridLine: { style: "none" }, catAxisLineColor: "BFBFBF", valAxisLineShow: false };
const axisTitle = (o) => Object.assign({ catAxisTitleFontSize: 10.5, catAxisTitleColor: "404040", catAxisTitleFontFace: F, valAxisTitleFontSize: 10.5, valAxisTitleColor: "404040", valAxisTitleFontFace: F }, o);

const SIM = "仿真：刚性球头部模型（无耳廓），混响为近似";

// ================= 1 封面 =================
{
  const s = p.addSlide();
  s.background = { color: BG };
  s.addShape(p.shapes.LINE, { x: 0.9, y: 4.0, w: 11.5, h: 0, line: { color: C.navy, width: 1 } });
  T(s, "耳机摄像头无障碍听觉辅助", { x: 0.9, y: 2.5, w: 11, h: 0.8, fontSize: 32, bold: true, valign: "middle" });
  T(s, "整体设计方案与明显问题排查", { x: 0.9, y: 3.35, w: 11, h: 0.5, fontSize: 18, color: C.gray, valign: "middle" });
  T(s, "2026 年 11 月", { x: 0.9, y: 4.15, w: 4, h: 0.4, fontSize: 13, color: C.light, valign: "middle" });
  s.addNotes("按“应用场景价值 → 整体设计方案 → 具体算法模型”的顺序，本次汇报整体设计方案，并排查有没有明显问题。数字为仿真或按公开资料估算，需样机复核；方法见附录 A8。");
}

// ================= 2 结论 =================
{
  const s = newSlide("整体方案结论",
    "数字为仿真（刚性球头部模型）或按公开资料估算，需样机复核",
    "关键风险见第 11 页，需要确认的事项见第 13 页，明显问题逐项排查见附录 A1。");
  key(s, "定位侧仿真可行；能否在多人中只听清一个人，取决于增强能否在时延要求内分开相邻的人");
  const R = (t, o) => cell(t, Object.assign({ fontSize: 12.5 }, o)), H = (t, o) => bold(t, Object.assign({ fontSize: 12.5 }, o));
  table(s, [
    [head("项目", { fontSize: 12.5 }), head("结论", { fontSize: 12.5 })],
    [H("场景价值"), R("在多人中自动锁定正在和我说话的那一个人；已有产品只增强正前方，或增强整组说话人")],
    [H("定位方案"), R("每耳 2 麦，副耳转发 1 路，主耳 DSP 测向并与人脸融合；约 12 MFLOPS，全部端侧")],
    [H("耳机与摄像头"), R("同时运行；对话中唇动档常开（只看嘴部的轻量模型，10–15 fps），唇动给开口时刻，换人后 0.25 s 锁定；唇动档功耗偏高时只开监测档，约 0.45 s（仿真，第 8 页）")],
    [H("摄像头"), R("两耳各 1 个，720p 级；平时低分辨率找人脸，唇动档只读嘴部区域")],
    [H("功耗"), R("按传感器 + NPU 估算：唇动档常开续航约 4.6–5.3 h，只开监测档 4.9–5.2 h，差别在 0.5 h 内【待确认】")],
    [H("关键风险", { color: C.red }), R("分开相邻的人，需要几毫秒级的耳间音频链路，或在耳机上跑目标说话人提取（时延约 20 ms）", { color: C.red })],
    [H("移动与转头"), R("慢速移动、转头时跟踪 + 视觉能跟住（仿真 77–92%，干扰低 6 dB）；快速移动是弱点，12 月改为以人脸跟踪为主（附录 A11）")],
  ], 0.6, 1.7, [2.1, 10.03], [0.48, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62]);
}

// ================= 3 场景价值 =================
{
  const s = newSlide("应用场景与已有产品",
    "麦克风数量：Apple 规格页、HearingTracker / Techlicious、Phonak 白皮书；“能 / 不能”为根据公开描述的判断",
    "AirPods Pro 2：规格页列出双波束成形麦克风 + 朝内麦克风，每只 3 个为按列表推得（https://www.apple.com/sg/airpods-pro/specs/）。Ray-Ban Meta 二代：5 个麦克风（https://www.hearingtracker.com/hearing-glasses/meta-ray-ban-glasses-in-hearadvisor-testing-how-do-they-perform-as-hearing-aids）。Phonak StereoZoom：两只助听器各 2 个麦克风，经无线链路组成 4 麦双耳波束（https://www.phonak.com/content/dam/phonak/en/evidence-library/white-paper/technical-paper/Phonak_Insight_StereoZoom.pdf）。Look Once to Hear（CHI 2024，https://arxiv.org/html/2405.06289v2）与 VueBuds（CHI 2026，https://arxiv.org/abs/2603.29095）为研究原型，未列入麦克风数量图。助听器：Phonak SpeechSensor 判断主要说话人在前、侧或后方并切换指向模式（https://www.phonak.com/content/dam/phonak/en/evidence-library/field-studies/PH_FieldStudyNews_LumityDirectionalBeamforming_210x297_EN_028-2475-02_V1-00.pdf）；Signia IX 厂商称可同时跟踪并增强多个说话人（https://hearingreview.com/hearing-products/hearing-aids/signias-integrated-xperience-hearing-aid-platform-pinpoints-multiple-speakers-in-real-time），证据多为厂商资料。");
  key(s, "已有产品增强正前方或整组说话人，分不出哪一个在和你说话；本方案用摄像头 + 两耳定位锁定那一个人");
  // 麦克风数量柱状图（手绘，按类别着色）
  const cat = { "耳机": C.navyLt, "眼镜": "A6A6A6", "助听器": "5B7FA6", "本方案": C.navy };
  const rows = [["AirPods Pro 2", "耳机", 6, "（每只 3）"], ["Ray-Ban Meta 二代", "眼镜", 5, ""], ["Phonak 双耳助听器", "助听器", 4, "（每只 2）"], ["本方案", "本方案", 4, "（每只 2）"]];
  T(s, "整副设备的麦克风数量（个）", { x: 0.6, y: 1.6, w: 6, h: 0.3, fontSize: 12, bold: true, color: "404040" });
  const X0 = 2.95, X1 = 5.3, v2x = (v) => X0 + (X1 - X0) * v / 6;
  rows.forEach(([n, c, v, d], i) => { const y = 2.05 + i * 0.62;
    T(s, n, { x: 0.6, y, w: 2.25, h: 0.42, fontSize: 11.5, bold: c === "本方案", align: "right", valign: "middle" });
    s.addShape(p.shapes.RECTANGLE, { x: X0, y: y + 0.07, w: v2x(v) - X0, h: 0.28, fill: { color: cat[c] }, line: NONE });
    T(s, `${v} ${d}`, { x: v2x(v) + 0.08, y, w: 1.1, h: 0.42, fontSize: 10.5, color: C.gray, valign: "middle" }); });
  line(s, X0, 4.55, X0, 2.0, { arrow: false, color: "BFBFBF" });
  let lx = 0.6; Object.entries(cat).forEach(([k, c]) => { s.addShape(p.shapes.RECTANGLE, { x: lx, y: 4.72, w: 0.2, h: 0.16, fill: { color: c }, line: NONE });
    T(s, k, { x: lx + 0.26, y: 4.66, w: 0.9, h: 0.28, fontSize: 10.5, color: C.gray, valign: "middle" }); lx += 1.25; });
  T(s, "麦克风数量都在 4–6 个：差别不在数量，而在能不能两耳组阵、有没有摄像头告诉它该听谁。", { x: 0.6, y: 5.2, w: 5.7, h: 0.8, fontSize: 13, bold: true, color: C.navy, valign: "middle" });
  // 按类别列重要信息
  table(s, [
    [head("类别"), head("代表"), head("能做到"), head("做不到")],
    [bold("耳机"), cell("AirPods Pro 2"), cell("增强正前方"), cell("多人中只听一个人")],
    [bold("眼镜"), cell("Ray-Ban Meta 二代"), cell("增强正前方"), cell("多人中只听一个人")],
    [bold("助听器"), cell("Phonak、Signia IX"), cell("判断说话人方向；同时增强多个说话人（厂商称）"), cell("锁定和你说话的那一个人")],
    [bold("研究原型"), cell("Look Once to Hear"), cell("只放大注册过的人"), cell("免注册")],
    [bold("本方案", { color: C.navy }), cell("耳机 + 摄像头"), cell("自动锁定、转头跟住、免注册"), cell("分开相邻的人【有前提，第 11 页】", { color: C.red })],
  ], 6.55, 1.6, [1.05, 1.75, 1.9, 1.48], [0.4, 0.5, 0.5, 0.75, 0.5, 0.62]);
}

// ================= 4 整体架构 =================
{
  const s = newSlide("整体架构",
    "图中增强按本地方案（A）画出，B、C 见第 11 页；时延容忍度：入耳式约 10–20 ms，开放式约 5–6 ms（Stone & Moore 2008）",
    "为什么分主副耳：测向要用左右耳麦克风之间的相位关系，必须把几路音频放在同一颗芯片上一起算，不能两边各算一半。让一只耳机（主耳）汇集并计算，耳间只需单向传 1 路音频（256 kbps）、只有一颗 DSP 跑约 12 MFLOPS，结果只回传 8 字节；若两耳各算一遍，链路流量和计算量都翻倍，得到的方位却相同。主耳多耗约 3 mW，可按电量定期交换主副角色；一只耳机摘下时，另一只自动变为主耳，退化为本地 2 麦定位。定位与融合运行在主耳，图中居中画出是为了表示它汇集两耳的数据。Stone & Moore 2008：https://www.researchgate.net/publication/5266175_Tolerable_Hearing_Aid_Delays_V_Estimation_of_Limits_for_Open_Canal_Fittings");
  key(s, "定位走旁路：两耳之间只为定位传 1 路音频，结果是控制量，不进入你听到的声音");
  T(s, "副耳", { x: 0.6, y: 1.55, w: 4.4, h: 0.3, fontSize: 12.5, bold: true, color: C.gray, align: "center" });
  T(s, "主耳", { x: 8.33, y: 1.55, w: 4.4, h: 0.3, fontSize: 12.5, bold: true, color: C.gray, align: "center" });
  const ear = (x0) => { box(s, "2 个麦克风", x0, 1.9, 1.25, 0.55); box(s, "本地增强", x0 + 1.55, 1.9, 1.25, 0.55, { line: C.navy, color: C.navy, bold: true }); box(s, "扬声器", x0 + 3.1, 1.9, 1.25, 0.55);
    line(s, x0 + 1.25, 2.175, x0 + 1.55, 2.175); line(s, x0 + 2.8, 2.175, x0 + 3.1, 2.175); };
  ear(0.6); ear(8.38);
  T(s, "实时听：两耳各自处理，不跨耳", { x: 5.1, y: 1.9, w: 3.1, h: 0.55, fontSize: 12, color: C.gray, align: "center", valign: "middle" });
  line(s, 2.78, 2.95, 10.56, 2.95, { color: C.navy, dash: "dash", arrow: false });
  line(s, 2.78, 2.95, 2.78, 2.47, { color: C.navy, dash: "dash" });
  line(s, 10.56, 2.95, 10.56, 2.47, { color: C.navy, dash: "dash" });
  T(s, "目标方位，每 16 ms 下发两耳", { x: 3.3, y: 2.62, w: 3.4, h: 0.3, fontSize: 11, color: C.navy });
  box(s, "定位与融合\n（主耳）", 5.5, 3.6, 2.3, 1.0, { fill: C.navy, line: C.navy, color: "FFFFFF", bold: true, text: { fontSize: 12.5 } });
  line(s, 6.65, 3.6, 6.65, 2.95, { color: C.navy });
  box(s, "取 1 路麦克风音频", 0.6, 3.5, 2.3, 0.5); box(s, "摄像头 + NPU", 0.6, 4.3, 2.3, 0.5);
  line(s, 2.9, 3.75, 5.5, 3.9); line(s, 2.9, 4.55, 5.5, 4.35);
  T(s, "1 路音频 16 kHz（耳间链路）", { x: 3.0, y: 3.42, w: 2.5, h: 0.3, fontSize: 10, color: C.gray });
  T(s, "人脸元数据（耳间链路）", { x: 3.0, y: 4.55, w: 2.5, h: 0.3, fontSize: 10, color: C.gray });
  box(s, "本耳 2 路麦克风音频", 10.43, 3.35, 2.3, 0.45); box(s, "摄像头 + NPU", 10.43, 3.9, 2.3, 0.45); box(s, "IMU：头部朝向", 10.43, 4.45, 2.3, 0.45);
  line(s, 10.43, 3.57, 7.8, 3.9); line(s, 10.43, 4.12, 7.8, 4.12); line(s, 10.43, 4.67, 7.8, 4.35);
  table(s, [
    [head("通路"), head("做什么"), head("时延要求"), head("跨耳传输")],
    [bold("实时听"), cell("每只耳机用本地麦克风朝目标增强，与透传混合后播放"), cell("入耳式 ≤ 约 10–20 ms"), cell("不跨耳")],
    [bold("定位"), cell("主耳汇集 3 路音频，与视觉融合，算出目标方位"), cell("开口后约 0.5 s 内"), cell("1 路音频")],
    [bold("视觉"), cell("两耳摄像头给出人脸方位、唇动分数、开口时刻，在主耳合并"), cell("几十毫秒可接受"), cell("人脸元数据")],
  ], 0.6, 5.2, [1.4, 6.2, 2.5, 2.0], [0.36, 0.38, 0.38, 0.38]);
}

// ================= 6a 接收：从声波到主耳 DSP =================
{
  const s = newSlide("一个声音进来：耳机怎么接收",
    "PDM 时钟、抽取滤波为数字麦常规做法；时钟漂移补偿、缓存、摄像头时间基准见附录 A10；格式与速率见附录 A5",
    "副耳只取 1 路麦克风音频转发，另一路只用于副耳本地增强。实时听通路的采样率与时延由增强模块决定，不经过定位。主耳音频 DSP 按两耳的采样计数把 3 路音频对齐到同一时刻，再进入第 6 页的处理。");
  const ear = (label, y, n, fwd) => {
    T(s, label, { x: 0.6, y, w: 0.8, h: 0.9, fontSize: 13, bold: true, valign: "middle" });
    box(s, "声波", 1.45, y + 0.2, 0.75, 0.5, { line: C.rule, color: C.gray });
    line(s, 2.2, y + 0.45, 2.45, y + 0.45);
    box(s, "2 个 MEMS 数字麦\n耳柄前后，间距 1.5 cm", 2.45, y, 2.15, 0.9);
    line(s, 4.6, y + 0.45, 5.35, y + 0.45);
    T(s, "PDM 1 bit\n约 1–3 MHz", { x: 4.62, y: y - 0.42, w: 0.75, h: 0.42, fontSize: 9.5, color: C.gray, align: "center", valign: "bottom" });
    box(s, "抽取滤波\n（音频编解码器）", 5.35, y, 1.75, 0.9);
    line(s, 7.1, y + 0.45, 7.75, y + 0.45);
    T(s, n, { x: 7.05, y: y - 0.42, w: 0.8, h: 0.42, fontSize: 9.5, color: C.gray, align: "center", valign: "bottom" });
    T(s, "实时听：增强 → 扬声器，不经过定位（第 11 页）", { x: 5.35, y: y + 0.95, w: 3.3, h: 0.28, fontSize: 9.5, color: C.light });
    box(s, fwd, 7.75, y, 1.95, 0.9, { line: fwd.startsWith("主耳") ? C.navy : C.box, color: fwd.startsWith("主耳") ? C.navy : C.ink, bold: fwd.startsWith("主耳") });
  };
  key(s, "每只耳机 2 个数字麦；副耳转发 1 路，主耳 DSP 按采样计数对齐 3 路（两耳同步误差需 ≤ 50 µs）");
  ear("副耳", 1.95, "16 kHz\n16 bit", "取 1 路\n加采样计数");
  ear("主耳", 3.7, "16 kHz\n16 bit", "主耳音频 DSP\n3 路按采样计数对齐");
  line(s, 8.72, 2.85, 8.72, 3.7, { color: C.navy });
  T(s, "耳间链路：1 路 PCM，256 kbps\n两耳采样同步 ≤ 50 µs", { x: 8.85, y: 2.95, w: 3.9, h: 0.6, fontSize: 10.5, color: C.navy, valign: "middle" });
  // 其他输入
  T(s, "同时进入主耳 DSP 的其他输入", { x: 0.6, y: 5.0, w: 6, h: 0.3, fontSize: 12, bold: true, color: C.navy });
  table(s, [
    [head("器件"), head("接收什么"), head("输出给定位"), head("速率")],
    [bold("骨声纹传感器"), cell("佩戴者自己说话时颅骨的振动"), cell("自语音标志（是 / 否）"), cell("每 16 ms 1 个")],
    [bold("IMU"), cell("头部转动"), cell("偏航角"), cell("200 Hz")],
    [bold("摄像头 + NPU（两耳各一）"), cell("前方画面，图像不出模组"), cell("人脸方位、唇动分数、曝光时间戳；副耳的经耳间链路"), cell("每张脸 16 字节，1–15 fps")],
  ], 0.6, 5.35, [2.4, 2.9, 4.5, 2.33], [0.32, 0.34, 0.34, 0.34]);
  // 右侧小结
  line(s, 9.7, 4.15, 9.95, 4.15);
  T(s, "每 16 ms 一帧：3 路对齐的音频、人脸列表、头部朝向、自语音标志，进入下一页的处理", { x: 10.0, y: 3.7, w: 2.75, h: 0.9, fontSize: 10.5, color: C.ink, valign: "middle" });
}

// ================= 6b 处理：主耳 DSP 上每一步 =================
{
  const s = newSlide("信号怎么处理：主耳 DSP 上的每一步",
    "计算量为估算（3 路、218 个频点、72 个方向、每 0.25 s 扫描一次）；高通与扫描间隔为设计值，其余参数为仿真中使用的值；需在目标芯片上实测",
    "第 5 步的白化：用背景协方差的 Cholesky 分解把干扰和噪声变成白噪声，此时目标方向在特征分解中最突出（GEVD-MUSIC）。有人脸时可只扫描人脸附近 ±10°，第 6 步约降到 1.7 MFLOPS。仿真中，2 个干扰说话人时，唇动门控背景白化使方位误差 ≤ 10° 的比例从 58% 升到 96%。说话人移动（后续）：第 8 步的说话人地图从固定方位改为方位 + 角速度跟踪。第 3a 步每个频点约 880 次浮点运算（Cholesky、求逆、白化、3 × 3 特征值），每 32 ms 一次约 6.0 MFLOPS，加短时协方差 0.65 MFLOPS；改为每 64 ms 一次可降到约 3.6 MFLOPS，检出时延多约 30 ms。");
  key(s, "经典信号处理，全部在主耳 DSP 上：唇动给开口时约 12 MFLOPS，只开监测档时加声学开口检测约 19 MFLOPS（估算）");
  const S = (t) => cell(t, { fontSize: 10 }), B = (t) => bold(t, { fontSize: 10 }), N = (t) => ctr(t, { fontSize: 10 });
  table(s, [
    [head("步骤"), head("做什么"), head("输入 → 输出"), head("参数"), head("每秒计算量", { align: "center" })],
    [B("1 高通"), S("去掉直流和低频风噪"), S("3 路 PCM → 3 路 PCM"), S("4 阶，100 Hz"), N("1.0 M")],
    [B("2 分帧 + FFT"), S("每 16 ms 取最近 32 ms，加窗做 FFT"), S("3 × 512 点 → 3 × 218 个频点"), S("汉宁窗；保留 200–7000 Hz"), N("1.2 M")],
    [B("3 判帧"), S("用开口时刻、能量、骨声纹判断这一帧是背景、目标还是跳过"), S("开口时刻、帧能量、自语音 → 帧类型"), S("开口前为背景（唇动档时只用目标闭嘴 > 0.2 s 的帧）；开口后为目标"), N("0.2 M")],
    [B("3a 开口检测"), S("只开监测档（唇动档没开）时用：短时协方差经背景白化，最大特征值超过阈值即判为有人开口，回溯开口时刻"), S("3 × 218 频点 → 开口时刻"), S("每 32 ms 一次；阈值 3.5 dB"), N("6.6 M")],
    [B("4 协方差"), S("每个频点算 3 路之间的相关矩阵，分背景、目标两份"), S("3 × 218 频点 → 218 × 两个 3×3"), S("背景递推，时间常数约 1 s；目标从开口起累计，能量上升的帧加权"), N("0.7 M")],
    [B("5 背景白化", { color: C.navy }), S("用背景矩阵把干扰和噪声白化，再做特征分解"), S("218 × 两个 3×3 → 218 个噪声子空间"), S("每 0.25 s 一次"), N("1.0 M", { bold: true, color: C.navy })],
    [B("6 方向扫描", { color: C.navy }), S("72 个方向逐个取预存模板，与噪声子空间比较，频点平均得空间谱"), S("模板 72 × 218 × 3 → 72 个分数"), S("每 5° 一个方向；模板含头部影响，约 184 KB"), N("8.2 M", { bold: true, color: C.navy })],
    [B("7 找峰"), S("取空间谱峰值，抛物线插值"), S("72 个分数 → 候选方位"), S("在 5° 网格之间插值，输出不受网格限制"), N("很小")],
    [B("8 与人脸融合"), S("每张人脸：方位 ±8° 内空间谱最大值 + 0.1 ×（唇动 − 0.5）；纯声学峰值 − 0.05 也参选；取最高"), S("候选方位、人脸列表 → 目标方位"), S("人脸方位先按摄像头位置换算到头部中心，再按曝光时刻的 IMU 角度换到世界坐标"), N("很小")],
    [B("9 输出"), S("用 IMU 把目标方位换回头部坐标，打包下发两耳增强"), S("目标方位等 → 8 字节"), S("每 16 ms 一次；开口后约 0.5 s 首次锁定"), N("很小")],
    [B("合计"), S("主耳音频 DSP，全部端侧离线"), S(""), S("内存：模板约 184 KB + 协方差约 31 KB"), N("约 12 / 19 M")],
  ], 0.6, 1.58, [1.45, 3.75, 2.55, 3.25, 1.13], [0.32, 0.36, 0.36, 0.48, 0.48, 0.48, 0.36, 0.48, 0.34, 0.5, 0.42, 0.36]);
}

// ================= 5 协同时序 =================
{
  const s = newSlide("耳机与摄像头的协同时序",
    "时间轴为唇动档开着时的情况，准确率为仿真（2 个干扰说话人一直在说，干扰低 6 dB / 一样响，加视觉），见附录 A2；换人锁定时间为多人对话仿真，见第 8 页；3 s 为设计值",
    "唇动档常开的依据见第 8 页：增益集中在换人时；按传感器 + NPU 估算，续航与只开监测档相当。只靠声学检测开口不可靠（附录 A2），所以只开监测档时换人比唇动档常开慢约 0.2 s。对话中轮换时的停顿通常只有约 0.2 s（Stivers 等 2009，PNAS，跨 10 种语言的统计）。");
  key(s, "同时运行：对话中唇动档常开，唇动给出开口时刻，换人后 0.25 s 锁定；唇动档功耗偏高时只开监测档");
  const X0 = 2.0, X1 = 12.6, tx = (t) => X0 + (t + 1) / 2 * (X1 - X0);
  const lane = (label, y) => T(s, label, { x: 0.6, y, w: 1.3, h: 0.5, fontSize: 12.5, bold: true, valign: "middle" });
  const bar = (t0, t1, y, text, fill, color) => { s.addShape(p.shapes.RECTANGLE, { x: tx(t0), y, w: tx(t1) - tx(t0), h: 0.5, fill: { color: fill }, line: { color: "FFFFFF", width: 1 } });
    T(s, text, { x: tx(t0) + 0.06, y, w: tx(t1) - tx(t0) - 0.12, h: 0.5, fontSize: 10.5, color: color || C.ink, align: "center", valign: "middle" }); };
  lane("摄像头", 1.85); lane("音频", 2.55); lane("输出", 3.25);
  bar(-1, 1, 1.85, "唇动档（对话中常开）：只读正前方 ±30° 内人脸的嘴部区域，10–15 fps", C.navyPale);
  bar(-1, 0, 2.55, "背景递推：只用对方闭嘴的帧（至少 0.5 s，时间常数 1 s）", "E4E4E4");
  bar(0, 0.5, 2.55, "目标帧累计（起始段加权）", C.navy, "FFFFFF");
  bar(0.5, 1, 2.55, "跟踪：每 0.25 s 扫描", "E4E4E4");
  bar(-1, 0.3, 3.25, "保持上一个目标的方位", "F0F0F0", C.gray);
  bar(0.3, 0.5, 3.25, "初步方位", C.navyLt);
  bar(0.5, 1, 3.25, "锁定：方位 + 置信度，每 16 ms", C.navy, "FFFFFF");
  s.addShape(p.shapes.LINE, { x: tx(0), y: 1.75, w: 0, h: 2.25, line: { color: C.red, width: 1.25, dashType: "dash" } });
  line(s, X0, 4.0, X1, 4.0, { arrow: false, color: "7F7F7F" });
  [[-1, "−1.0 s"], [-0.5, "−0.5 s"], [0, "0 开口"], [0.3, "0.3 s"], [0.5, "0.5 s"], [1, "1.0 s"]].forEach(([t, l]) => {
    line(s, tx(t), 4.0, tx(t), 4.07, { arrow: false, color: "7F7F7F" });
    T(s, l, { x: tx(t) - 0.5, y: 4.08, w: 1.0, h: 0.25, fontSize: 10, color: t === 0 ? C.red : "595959", align: "center" }); });
  T(s, "唇动给出开口时刻，误差需 ≤ ±0.1 s", { x: tx(0) - 3.2, y: 4.32, w: 3.1, h: 0.28, fontSize: 10, color: C.red, align: "right" });
  T(s, "初步 86%", { x: tx(0.3) - 0.5, y: 4.32, w: 1.0, h: 0.28, fontSize: 10, color: C.navy, align: "center" });
  T(s, "锁定 89–95%", { x: tx(0.5) - 0.2, y: 4.32, w: 1.3, h: 0.28, fontSize: 10, color: C.navy, align: "left" });
  table(s, [
    [head("情况"), head("摄像头"), head("开口时刻由谁给"), head("锁定")],
    [bold("对话中（推荐）"), cell("唇动档常开：只看正前方 ±30° 内人脸的嘴部，轻量唇动模型，10–15 fps"), cell("唇动（误差需 ≤ ±0.1 s）"), cell("换人后 0.25 s（仿真）")],
    [bold("对话中，唇动档功耗偏高时"), cell("只开监测档，1–2 fps，只看人脸位置"), cell("声学检测；人脸位置校正方位"), cell("换人后约 0.42–0.51 s（仿真）")],
    [bold("安静（3 s 无人说话）"), cell("监测档，1–2 fps"), cell("—"), cell("保持上一个目标")],
    [bold("暗光、遮挡、目标在视野外"), cell("关或监测档"), cell("声学"), cell("纯声学，置信度降一级")],
  ], 0.6, 4.72, [2.6, 4.0, 3.2, 2.33], [0.34, 0.38, 0.5, 0.38, 0.38]);
}

// ================= 7b 摄像头开多久 =================
{
  const s = newSlide("摄像头开多久：精度与功耗",
    "仿真：3 个对话者轮流 + 1 个旁桌说话人，4 种条件各 40 段，图为平均；预测式为另一批场景、理想上限；续航按对话占一半估算",
    "四种条件的范围：整体准确率 纯声学 73–82%、只开监测档 77–86%、声学触发后开摄像头 76–84%、监测档 + 触发唇动档 79–87%、唇动档常开 87–92%；稳定段分别为 81–90%、86–93%、86–92%、88–94%、92–96%。声学触发后开摄像头：检出后延迟 0.2 s 打开唇动档，开 1.5 s；摄像头开着时若唇动显示仍是原来那个人，撤销这次开口；启动延迟改为 0.5 s 时准确率下降不超过约 2 个百分点。预测式：假设准确知道上一个人说完的时刻，说完 → 唇动档可用 0.1 s；时延 0.35 s 时无重叠也降到 51%。唇动档功耗：传感器按 HM0360 低分辨率 10–15 fps 约 1.2–1.7 mW；NPU 按 Light-ASD 每张脸每帧约 0.2 GFLOPs、1–3 张脸、能效 1–6 TOPS/W 约 0.3–9 mW；只看嘴部的轻量模型（假设为其十分之一）时唇动档约 1.2–2.6 mW、续航 5.0–5.3 h；按图一 25 fps、3 张脸时唇动档常开约 4.3–5.1 h；按传感器全幅 60 fps 的上限为 2.6–4.6 h。定位计算：唇动档常开约 12 MFLOPS（≤ 3 mW），其余需要声学开口检测约 19 MFLOPS（≤ 4.6 mW）。");
  key(s, "唇动档常开换人最快（0.25 s）；按传感器 + NPU 估算，各种开法续航相差 0.5 h 以内，建议对话中常开");
  const labels = ["纯声学", "只开监测档", "触发后开", "监测 + 触发", "唇动档常开"];
  s.addChart(p.charts.BAR, [
    { name: "整体", labels, values: [76.4, 80.7, 80.1, 83.0, 89.8] },
    { name: "换人后 0.5 s 内", labels, values: [29.8, 33.8, 32.1, 34.9, 66.7] },
  ], Object.assign({ x: 0.6, y: 1.55, w: 6.4, h: 4.2, barDir: "col", barGrouping: "clustered", chartColors: [C.navy, C.navyLt],
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0", valAxisMinVal: 0, valAxisMaxVal: 100, showLegend: true, legendPos: "t",
    showTitle: true, title: "方位误差 ≤ 10° 的比例（%）" }, chartBase, { catAxisLabelFontSize: 10.5 }));
  table(s, [
    [head("方式"), head("唇动档开机", { align: "center" }), head("换人后 0.5 s 内", { align: "center" }), head("换人后锁定", { align: "center" }), head("续航", { align: "center" })],
    [bold("纯声学"), ctr("0"), ctr("25–37%"), ctr("0.45–0.53 s"), ctr("5.0–5.2 h")],
    [bold("只开监测档"), ctr("0"), ctr("29–40%"), ctr("0.42–0.51 s"), ctr("4.9–5.2 h")],
    [bold("触发后开摄像头"), ctr("10–17%"), ctr("27–39%"), ctr("0.44–0.55 s"), ctr("4.9–5.2 h")],
    [bold("监测 + 触发唇动档"), ctr("10–17%"), ctr("29–41%"), ctr("0.42–0.52 s"), ctr("4.8–5.2 h")],
    [bold("预测式（理想）"), ctr("24–31%"), ctr("40–67%"), ctr("0.25–0.37 s"), ctr("4.8–5.2 h")],
    [bold("唇动档常开", { color: C.navy }), ctr("100%"), ctr("62–71%", { bold: true }), ctr("0.25 s", { bold: true }), ctr("4.6–5.3 h")],
  ], 7.25, 1.6, [1.6, 0.82, 1.08, 1.1, 0.88], [0.42, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38]);
  T(s, "唇动档按传感器 + NPU 估算 1.5–11 mW。只看嘴部的轻量唇动模型时约 1.2–2.6 mW，续航 5.0–5.3 h；按图一 25 fps 全量说话人检测则降到 4.3–5.1 h。",
    { x: 7.25, y: 4.55, w: 5.48, h: 0.7, fontSize: 11, color: C.ink, valign: "top" });
  T(s, "检测到声音后再开：开口已过去，比只开监测档没有更好。预测式（上一人说完即开）：无重叠时接近常开，有重叠时只剩约三分之一增益，且要在 0.1 s 内判断出说完。",
    { x: 7.25, y: 5.3, w: 5.48, h: 0.8, fontSize: 11, color: C.gray, valign: "top" });
}

// ================= 8 麦克风数量 =================
{
  const s = newSlide("麦克风数量（4 / 6 / 8 麦）",
    SIM + "；同一批 100 个场景，混响 + 2 个干扰说话人；统计误差约 ±4 个百分点",
    "设置：混响 RT60 0.5 s、2 个干扰说话人、SNR 10 dB；GEVD-MUSIC，开口后 0.5 s 判决。图中为加视觉的结果。纯声学时：干扰低 6 dB 为 90 / 91 / 91 / 92 / 94%，干扰同样响为 64 / 66 / 64 / 72 / 72%，6 / 8 麦在干扰同样响时多约 8 个百分点。带宽按 16 kHz / 16 bit PCM。");
  key(s, "每耳 2 个即可：加视觉后 6 / 8 麦最多只多 4 个百分点，耳间带宽却要 3–4 倍");
  const labels = ["主耳 2 + 副耳 1", "每耳 2", "主耳 3 + 副耳 1", "每耳 3", "每耳 4"];
  s.addChart(p.charts.BAR, [
    { name: "干扰比目标低 6 dB", labels, values: [96, 95, 97, 95, 95] },
    { name: "干扰与目标一样响", labels, values: [80, 79, 81, 82, 84] },
  ], Object.assign({ x: 0.6, y: 1.5, w: 6.7, h: 4.7, barDir: "col", barGrouping: "clustered", chartColors: [C.navy, C.navyLt],
    showValue: true, dataLabelPosition: "outEnd", valAxisMinVal: 0, valAxisMaxVal: 100, showLegend: true, legendPos: "t",
    showTitle: true, title: "方位误差 ≤10° 的比例（%，加视觉）" }, chartBase));
  s.addChart(p.charts.BAR, [{ name: "耳间带宽", labels, values: [256, 512, 256, 768, 1024] }],
    Object.assign({ x: 7.55, y: 1.5, w: 5.2, h: 4.7, barDir: "col", chartColors: ["9A9A9A"], showValue: true, dataLabelPosition: "outEnd",
      valAxisMinVal: 0, valAxisMaxVal: 1200, showLegend: false, showTitle: true, title: "副耳传到主耳的带宽（kbps）" }, chartBase));
  T(s, "主耳用本耳 2 路 + 副耳 1 路共 3 路测向。若增强采用两耳组阵（第 11 页），麦克风和链路要按增强的需求重新确定。",
    { x: 0.6, y: 6.2, w: 12.1, h: 0.6, fontSize: 12, color: C.gray, valign: "middle" });
}

// ================= 10 输出 =================
{
  const s = newSlide("耳机怎么输出",
    "规则中的数值为设计值，需在体验测试中调整；增强、混合、限幅由增强模块实现，定位只提供控制量",
    "声音通路时延：入耳式 ≤ 约 10–20 ms，开放式 ≤ 约 5–6 ms（Stone & Moore 2008）。按方位还原方向感属于音效渲染，《技术洞察》定为现阶段不做，所以两耳播放同一路增强语音。");
  key(s, "定位每 16 ms 给增强模块 8 字节控制量；增强后的语音与透传混合，两耳播放同一路");
  sub(s, "定位结果：每 16 ms 一条，8 字节", 0.6, 1.6, 8);
  const seg = [["目标方位", 2, "头部坐标，0.01°"], ["置信度", 1, "0–1"], ["在说话", 1, "目标此刻是否在说话"], ["干扰方位 × 3", 3, "主要干扰方位，供增强置零"], ["序号", 1, "丢包检测"]];
  let x = 0.6; const unit = 1.5;
  seg.forEach(([n, b, d], i) => {
    const w = b * unit;
    s.addShape(p.shapes.RECTANGLE, { x, y: 2.0, w, h: 0.55, fill: { color: i === 0 ? C.navyPale : "FFFFFF" }, line: { color: C.navy, width: 1 } });
    T(s, `${n}（${b} B）`, { x, y: 2.0, w, h: 0.55, fontSize: 12, bold: i === 0, align: "center", valign: "middle" });
    T(s, d, { x: x + 0.05, y: 2.6, w: w - 0.1, h: 0.3, fontSize: 10.5, color: C.gray, align: "center" });
    x += w;
  });
  sub(s, "从控制量到耳朵（每只耳机）", 0.6, 3.1, 8);
  const chain = [["定位结果", "8 字节 / 16 ms"], ["增强", "朝目标方位，干扰方位置零"], ["混合", "目标比透传高 6–12 dB"], ["限幅", "保护听力"], ["扬声器", "两耳同一路"]];
  chain.forEach(([t, d], i) => { const bx = 0.6 + i * 2.5;
    box(s, t + "\n" + d, bx, 3.5, 2.05, 0.75, { line: i === 0 ? C.navy : C.box, color: i === 0 ? C.navy : C.ink, text: { fontSize: 11 } });
    if (i < chain.length - 1) line(s, bx + 2.05, 3.875, bx + 2.5, 3.875); });
  table(s, [
    [head("情况"), head("输出怎么变"), head("取值")],
    [bold("目标换人或方位跳变 > 10°"), cell("在新旧方位之间渐变，避免声音突跳"), cell("0.2 s 内完成")],
    [bold("置信度 < 0.5"), cell("增强量减半，接近透传"), cell("置信度恢复后 0.5 s 内回到正常")],
    [bold("目标没在说话"), cell("增强量降低，避免放大背景噪声"), cell("降 6 dB")],
    [bold("佩戴者自己说话"), cell("冻结方位；透传中自己声音降增益"), cell("骨声纹判断")],
    [bold("两耳链路中断"), cell("用最近一次方位；超时后退回透传"), cell("1 s")],
  ], 0.6, 4.5, [3.2, 5.6, 3.33], [0.32, 0.36, 0.36, 0.36, 0.36, 0.36]);
}

// ================= 11 关键风险 =================
{
  const s = newSlide("关键风险：增强能否分开相邻说话人",
    "信干比为理论计算（已知干扰方位置零，混响下）；时延：蓝牙 / 星闪为第三方评测，专用链路与 C 为专利与研究报告；容忍度：Stone & Moore 2008",
    "信干比：刚性球头部模型，MVDR 置零，设计方位误差 2–3°，白噪声增益 ≥ −10 dB，直达混响比 0 dB，0.5–4 kHz 平均。\n时延：星闪约 20 ms、蓝牙 15–40 ms 为手机到耳机的第三方评测（https://ngxptech.com/huawei-freebuds-pro-5-review-is-nearlink-better/），助听器专用耳间链路（如近场磁感应，约 10 MHz）用于双耳波束成形，专利与文献中耳间交换音频的时延为 0.5–5 ms 量级（检索摘要，原文未核实；https://hearingreview.com/practice-building/practice-management/continuing-education/it-s-sync-or-stream-the-differences-between-wireless-hearing-aid-features ，https://arxiv.org/pdf/2307.08858）；本耳机能否有这样的链路待确认。C 的 17.5 ms 来自 Wireless Hearables With Programmable Speech AI Accelerators（https://arxiv.org/pdf/2503.18698），Look Once to Hear 目标 < 20 ms。定位侧的输出对三种做法通用。");
  key(s, "单只耳机分不开相邻的人；两耳组阵要几毫秒级的耳间音频链路，目标说话人提取时延约 20 ms 在边缘");
  s.addChart(p.charts.BAR, [{ name: "信干比提升", labels: ["A 本地 2 麦", "B 两耳组阵"], values: [2.4, 8.3] }],
    Object.assign({ x: 0.6, y: 1.5, w: 5.4, h: 2.75, barDir: "bar", chartColors: [C.red, C.navy], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0",
      valAxisMinVal: 0, valAxisMaxVal: 10, showLegend: false, showTitle: true, title: "对相隔 25° 的干扰，信干比提升（dB）" }, chartBase));
  T(s, "C 目标说话人提取不依赖阵列孔径，研究中能在多人里只放大目标", { x: 0.6, y: 4.28, w: 5.4, h: 0.35, fontSize: 11, color: C.gray, valign: "middle" });
  const X0 = 6.6, X1 = 12.65, ms = (v) => X0 + (X1 - X0) * v / 30, Y = 2.5;
  T(s, "声音通路时延（ms）", { x: X0, y: 1.55, w: 5, h: 0.32, fontSize: 11.5, color: "404040", valign: "middle" });
  s.addShape(p.shapes.RECTANGLE, { x: ms(0), y: Y - 0.45, w: ms(6) - ms(0), h: 0.9, fill: { color: "EFEFEF" }, line: NONE });
  s.addShape(p.shapes.RECTANGLE, { x: ms(10), y: Y - 0.45, w: ms(20) - ms(10), h: 0.9, fill: { color: C.navyPale }, line: NONE });
  T(s, "开放式\n≤ 5–6", { x: ms(0), y: Y - 0.42, w: ms(6) - ms(0), h: 0.5, fontSize: 10, color: C.gray, align: "center" });
  T(s, "入耳式容忍 10–20", { x: ms(10), y: Y - 0.42, w: ms(20) - ms(10), h: 0.3, fontSize: 10, color: C.navy, align: "center" });
  line(s, X0, Y + 0.45, X1, Y + 0.45, { arrow: false, color: "7F7F7F" });
  [0, 5, 10, 15, 20, 25, 30].forEach((v) => { line(s, ms(v), Y + 0.45, ms(v), Y + 0.52, { arrow: false, color: "7F7F7F" });
    T(s, String(v), { x: ms(v) - 0.25, y: Y + 0.55, w: 0.5, h: 0.25, fontSize: 10, color: "595959", align: "center" }); });
  const mark = (v1, v2, y, label, color) => { s.addShape(p.shapes.RECTANGLE, { x: ms(v1), y, w: Math.max(ms(v2) - ms(v1), 0.08), h: 0.2, fill: { color }, line: NONE });
    const lx = v2 >= 28 ? ms(v1) - 3.2 : ms(v2) + 0.08; T(s, label, { x: lx, y: y - 0.05, w: v2 >= 28 ? 3.1 : 12.73 - lx, h: 0.3, fontSize: 10.5, color, valign: "middle", align: v2 >= 28 ? "right" : "left" }); };
  mark(1, 5, Y + 0.95, "A：本地处理，几 ms", C.gray);
  mark(3, 8, Y + 1.3, "B 经专用耳间链路：几 ms（助听器做法）", C.navy);
  mark(15, 30, Y + 1.65, "B 经蓝牙 / 星闪：约 15–40 ms", C.red);
  mark(17.5, 20, Y + 2.0, "C：约 17.5–20 ms", C.red);
  table(s, [
    [head(""), head("A 本地增强", { align: "center" }), head("B 两耳组阵增强", { align: "center" }), head("C 目标说话人提取", { align: "center" })],
    [bold("能否分开相邻的人"), ctr("基本不能（约 2 dB）", { color: C.red }), ctr("能（约 8 dB）"), ctr("能")],
    [bold("入耳式时延（约 10–20 ms）"), ctr("满足"), ctr("专用链路满足；蓝牙 / 星闪不满足", { color: C.red }), ctr("临界", { color: C.red })],
    [bold("开放式时延（约 5–6 ms）"), ctr("满足"), ctr("专用链路勉强"), ctr("不满足")],
    [bold("场景价值"), ctr("与已有产品差别小"), ctr("有"), ctr("有")],
  ], 0.6, 4.95, [2.8, 2.6, 3.9, 2.8], [0.36, 0.36, 0.36, 0.36, 0.36]);
}

// ================= 12 功耗 =================
{
  const s = newSlide("功耗估算（以 FreeClip 2 S 为基准）",
    "基准：FreeClip 2 S 每只 60 mAh、通话 6 h（华为官网），约 37 mW；摄像头传感器与 NPU 按公开器件估算；对话占使用时间一半；分项见附录 A7",
    "华为官网规格页：https://consumer.huawei.com/hk/headphones/freeclip2-s/specs/。每多 1 mW，续航约少 10 分钟。按主耳估算（摄像头 + 定位计算 + 耳间接收）；副耳为摄像头 + 耳间发送，没有定位计算，略低。唇动档：传感器按 HM0360 低分辨率 10–15 fps 约 1.2–1.7 mW；NPU 按 Light-ASD 每张脸每帧约 0.2 GFLOPs、正前方 1–3 张脸、能效 1–6 TOPS/W 约 0.3–9 mW，只看嘴部的轻量模型（假设为其十分之一）约 0.03–0.9 mW。按图一 25 fps、3 张脸全量说话人检测时唇动档常开约 4.3–5.1 h；按传感器全幅 60 fps 的上限为 2.6–4.6 h。只开监测档时换人靠声学开口检测，定位计算约 19 MFLOPS（≤ 4.6 mW）；唇动档常开约 12 MFLOPS（≤ 3 mW）。监测档的人脸检测 NPU 功耗很小，未计入。");
  key(s, "对话中唇动档常开，续航约 4.6–5.3 h，与只开监测档（4.9–5.2 h）相当（按传感器 + NPU 估算）");
  const X0 = 3.2, X1 = 8.6, h2x = (v) => X0 + (X1 - X0) * v / 6.5;
  T(s, "续航（每只耳机；对话占使用时间一半；浅色段为估算区间）", { x: 0.6, y: 1.55, w: 8, h: 0.32, fontSize: 11.5, color: "404040", valign: "middle" });
  [["基准（通话）", 6.0, 6.0, "9A9A9A"], ["唇动档常开（估算）", 4.6, 5.3, C.navy], ["唇动档常开（轻量模型）", 5.0, 5.3, C.navy], ["只开监测档", 4.9, 5.2, C.navy], ["两耳组阵增强（B）", 4.1, 5.0, C.navy], ["目标说话人提取（C）", null, null]].forEach(([n, lo, hi, c], i) => {
    const y = 2.0 + i * 0.6;
    T(s, n, { x: 0.6, y, w: 2.45, h: 0.4, fontSize: 12.5, align: "right", valign: "middle" });
    if (lo === null) { T(s, "网络推理功耗未知，待确认", { x: X0, y, w: 5, h: 0.4, fontSize: 12, color: C.light, valign: "middle" }); return; }
    s.addShape(p.shapes.RECTANGLE, { x: X0, y: y + 0.08, w: h2x(lo) - X0, h: 0.24, fill: { color: c }, line: NONE });
    if (hi > lo) s.addShape(p.shapes.RECTANGLE, { x: h2x(lo), y: y + 0.08, w: h2x(hi) - h2x(lo), h: 0.24, fill: { color: C.navyLt }, line: NONE });
    T(s, lo === hi ? `${lo.toFixed(1)} h` : `${lo.toFixed(1)}–${hi.toFixed(1)} h`, { x: h2x(hi) + 0.1, y, w: 1.3, h: 0.4, fontSize: 12.5, valign: "middle" });
  });
  line(s, X0, 5.55, X1, 5.55, { arrow: false, color: "7F7F7F" });
  [0, 2, 4, 6].forEach((v) => { line(s, h2x(v), 5.55, h2x(v), 5.62, { arrow: false, color: "7F7F7F" });
    T(s, v + " h", { x: h2x(v) - 0.3, y: 5.65, w: 0.6, h: 0.25, fontSize: 10, color: "595959", align: "center" }); });
  table(s, [
    [head("新增部分（每只耳机）"), head("功耗", { align: "center" })],
    [bold("摄像头监测档（常开）"), ctr("0.4–0.8 mW")],
    [bold("唇动档：传感器，10–15 fps"), ctr("1.2–1.7 mW")],
    [bold("唇动档：NPU 唇动检测"), ctr("0.3–9 mW")],
    [bold("定位与融合计算"), ctr("≤ 3 / 4.6 mW")],
    [bold("耳间定位音频"), ctr("0.7–2.6 mW")],
    [bold("合计：唇动档常开（对话占一半）"), ctr("约 4.5–11 mW", { bold: true })],
    [bold("合计：只开监测档"), ctr("约 6–8 mW", { bold: true })],
  ], 8.85, 1.6, [2.6, 1.28], [0.4, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45]);
}

// ================= 14 需要确认 =================
{
  const s = newSlide("待确认事项",
    "若前两项都做不到，场景可收窄为“知道谁在说话、他在哪”，配合字幕或转写使用",
    "前两项决定增强能否在时延要求内分开相邻说话人，即场景能否提供增量价值。");
  key(s, "前两项决定增强能否在时延要求内分开相邻的人；定位侧不依赖它们，可以先推进");
  table(s, [
    [head("", { align: "center" }), head("事项"), head("为什么要确认"), head("找谁")],
    [ctr("1"), bold("耳机之间能否有几毫秒级的音频链路"), cell("决定两耳组阵增强（B）是否可行；助听器有此类链路"), cell("链路、芯片")],
    [ctr("2"), bold("目标说话人提取在耳机芯片上的时延与功耗"), cell("决定 C 是否可行"), cell("增强、芯片")],
    [ctr("3"), bold("两耳采样同步能否 ≤ 50 µs"), cell("两耳组阵定位的前提"), cell("链路、芯片")],
    [ctr("4"), bold("唇动档（传感器 + NPU）的实际功耗；只看嘴部的轻量唇动模型的计算量与准确率；需要多少像素"), cell("决定唇动档能否常开：估算 1.2–11 mW，超过约 4 mW 时改为只开监测档"), cell("视觉、传感器")],
    [ctr("5"), bold("佩戴形态：入耳式还是开放式"), cell("开放式时延要求约 5–6 ms，增强更难"), cell("产品")],
  ], 0.6, 1.7, [0.5, 5.0, 4.6, 2.03], [0.48, 0.7, 0.7, 0.7, 0.7, 0.7]);
}

// ================= 13 明显问题排查 =================
{
  const s = newSlide("附录 A1　明显问题排查",
    "各项依据见前文各页",
    "视觉变差（唇动错 30%、方位误差 6°、检出 70%、开口时刻误差 ±0.3 s）的仿真：定位仍 68–83%，仅视觉 38–46%。");
  const J = (t, color) => cell(t, { color: color || C.ink, bold: true });
  table(s, [
    [head("可能的问题"), head("判断"), head("依据与解法")],
    [bold("增强能否分开相邻的说话人"), J("关键风险", C.red), cell("本地 2 麦约 2 dB；两耳组阵约 8 dB，需几毫秒级耳间音频链路（蓝牙 / 星闪不够）；目标说话人提取约 17.5–20 ms", { color: C.red })],
    [bold("相对已有产品的增量价值"), J("取决于上一项"), cell("已有产品能增强正前方或整组说话人；增量在于自动锁定和你说话的那一个人、转头跟住、无需注册")],
    [bold("摄像头看不清嘴"), J("设计可解决"), cell("QVGA 时 2 m 外嘴宽约 3 像素；改为 720p 级 + 嘴部区域读出，约 19 像素")],
    [bold("声音通路时延"), J("设计可解决"), cell("定位走旁路、增强在本地（A）；B、C 见第一项")],
    [bold("两耳带宽与同步"), J("设计可解决，待确认"), cell("定位只转发 1 路；同步需 ≤ 50 µs（ClearBuds 先例 < 64 µs）")],
    [bold("开放式形态"), J("设计可规避"), cell("推荐入耳式；开放式时延要求约 5–6 ms，增强更难")],
    [bold("功耗与续航"), J("需确认"), cell("按传感器 + NPU 估算：唇动档常开约 4.6–5.3 h，只开监测档 4.9–5.2 h；按图一 25 fps 全量说话人检测约 4.3–5.1 h")],
    [bold("摄像头看不到（侧脸、遮挡、暗光）"), J("不致命"), cell("软融合平稳降级；视觉很差时定位仍 68–83%（仿真）")],
    [bold("锁定慢、漏听开头"), J("不致命"), cell("换人后第一次定位正确：唇动档常开 0.25 s，只开监测档约 0.42–0.51 s（多人对话仿真）")],
    [bold("佩戴者自己说话"), J("不致命"), cell("骨声纹检测到自语音时冻结定位")],
    [bold("社交接受度、拍摄隐私"), J("需产品决策"), cell("图像不出模组；拍摄指示灯；只在开启听觉辅助时工作")],
    [bold("仿真与真实的差距"), J("需复核"), cell("刚性球无耳廓、混响为近似、视觉为假设；需样机和实测数据")],
  ], 0.6, 1.5, [3.4, 1.9, 6.8], [0.38, 0.42, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38]);
}

// ================= 5b 协同时序的时间要求（仿真） =================
{
  const s = newSlide("附录 A2　协同时序的时间要求（仿真）",
    "仿真：刚性球头部模型，主耳 2 路 + 副耳 1 路，混响 RT60 0.5 s + 2 个干扰说话人；每个条件 100 次；表中为干扰一直说话；检出指开口后 0.5 s 内",
    "设置：目标开口前 2.5 s 不说话，干扰全程说话；GEVD-MUSIC，5° 网格。左图开口时刻由唇动给出（±0.1 s 误差）、背景 1 s；中图判决窗 0.5 s、背景 1 s；右图开口时刻由唇动给出、判决窗 0.5 s。纯声学（不加视觉）时左图为：干扰低 6 dB 52/70/85/96/100%，一样响 48/58/67/79/82%。声学开口检测：短时协方差（时间常数 0.25 s）经递推背景（1 s）白化后的最大广义特征值，频点取中位数；检出后回溯到能量回落处作为开口时刻，检出时延中位数 0.1–0.2 s。另试了“只计新方向的能量”，误报和检出都更差。");
  const lc = (x, title, labels, a, b, xt) => s.addChart(p.charts.LINE, [{ name: "干扰低 6 dB", labels, values: a }, { name: "干扰一样响", labels, values: b }],
    Object.assign({ x, y: 1.3, w: 3.95, h: 3.0, chartColors: [C.navy, C.navyLt], lineSize: 2, lineDataSymbol: "circle", lineDataSymbolSize: 6,
      showValue: true, dataLabelPosition: "t", dataLabelFontSize: 9, valAxisMinVal: 0, valAxisMaxVal: 110, valAxisMajorUnit: 20, showLegend: true, legendPos: "b",
      showTitle: true, title, titleFontSize: 11 }, chartBase, axisTitle({ showCatAxisTitle: true, catAxisTitle: xt })));
  lc(0.6, "开口后听多久（加视觉）", ["0.1", "0.2", "0.3", "0.5", "0.8"], [81, 85, 86, 95, 100], [73, 78, 86, 89, 89], "判决窗（s）");
  lc(4.69, "开口时刻偏差", ["−0.3", "−0.2", "−0.1", "0", "+0.1", "+0.2", "+0.3"], [62, 80, 93, 97, 96, 88, 84], [38, 54, 70, 81, 82, 73, 65], "偏差（s，负为偏早）");
  lc(8.78, "开口前的背景长度", ["0.1", "0.25", "0.5", "1.0"], [84, 90, 94, 96], [62, 68, 76, 79], "背景长度（s）");
  T(s, "纵轴：方位误差 ≤ 10° 的比例（%）", { x: 0.6, y: 4.3, w: 6, h: 0.25, fontSize: 9.5, color: C.light });
  [[0.6, "开口后 0.3 s 给初步方位，0.5 s 锁定"], [4.69, "唇动给的开口时刻误差需在 ±0.1 s 内；偏早比偏晚影响大"], [8.78, "背景至少 0.5 s，按时间常数 1 s 递推"]].forEach(([x, t]) =>
    T(s, t, { x, y: 4.55, w: 3.95, h: 0.45, fontSize: 11.5, bold: true, color: C.navy, valign: "middle" }));
  sub(s, "摄像头看不到开口时，只靠声学检测开口", 0.6, 5.1, 7);
  table(s, [
    [head("检测阈值"), head("干扰低 6 dB：检出率", { align: "center" }), head("每分钟误报", { align: "center" }), head("干扰一样响：检出率", { align: "center" }), head("每分钟误报", { align: "center" })],
    [bold("2.0 dB"), ctr("76%"), ctr("33"), ctr("59%"), ctr("46")],
    [bold("2.5 dB"), ctr("56%"), ctr("17"), ctr("34%"), ctr("24")],
    [bold("3.0 dB"), ctr("39%"), ctr("5"), ctr("17%"), ctr("12")],
  ], 0.6, 5.45, [1.3, 1.75, 1.3, 1.75, 1.3], [0.32, 0.32, 0.32, 0.32]);
  T(s, "检出多则误报多，两者无法兼顾。干扰说一段停一段、或轮流说话时也没有改善：干扰重新开口同样会触发（阈值 3.0 dB 时检出 20–54%、每分钟误报 6–19 次）。所以唇动给的开口时刻更准；只开监测档时只能用声学检测，换人时比唇动档常开慢约 0.2 s（第 8 页）。",
    { x: 8.3, y: 5.45, w: 4.43, h: 1.28, fontSize: 11.5, color: C.ink, valign: "middle" });
}

// ================= 7 传输与编码 =================
{
  const s = newSlide("附录 A3　两耳传输、编码与同步",
    SIM + "；同步先例：ClearBuds（MobiSys 2022）< 64 µs；完整规格见附录 A5",
    "同步实验：混响 RT60 0.5 s、2 个干扰说话人，开口后 0.5 s 判决，每档 72 次。ClearBuds：https://arxiv.org/abs/2206.13611；TWS 播放侧左右同步通常 < 25 µs（audioXpress LE Audio 测试指南）。LC3 码率与时延：https://www.forasoft.com/learn/audio-for-video/articles-audio/lc3-lc3plus-bluetooth-le-audio");
  table(s, [
    [head("数据"), head("从 → 到"), head("格式"), head("速率", { align: "center" })],
    [bold("定位音频"), cell("副耳 → 主耳"), cell("1 路 PCM 16 kHz / 16 bit，带时间戳"), ctr("256 kbps")],
    [bold("人脸元数据"), cell("两耳 NPU → 主耳"), cell("每张脸 16 字节（方位、唇动分数等）"), ctr("≤ 1.2 kB/s")],
    [bold("定位结果"), cell("主耳 → 两耳增强"), cell("每 16 ms 8 字节"), ctr("0.5 kB/s")],
    [bold("图像"), cell("传感器 → NPU"), cell("不出模组，只输出检测结果"), ctr("—")],
  ], 0.6, 1.6, [1.4, 1.75, 3.55, 1.2], [0.42, 0.48, 0.48, 0.48, 0.48]);
  sub(s, "耳间编码", 0.6, 4.25, 3);
  para(s, ["PCM 16 bit（首选）：相位完整；链路每侧约 2.6 mW（估算）",
    "ADPCM 4 bit（64 kbps）：功耗约 1/4，对测向的影响待确认",
    "LC3（32 kbps）：感知编码可能破坏相位，不用于定位"], 0.6, 4.65, 7.3, 1.6, { fontSize: 12.5 });
  s.addChart(p.charts.LINE, [{ name: "≤10° 的比例", labels: ["0", "10", "25", "50", "100", "200"], values: [63, 61, 61, 60, 8, 7] }],
    Object.assign({ x: 8.3, y: 1.5, w: 4.45, h: 4.6, chartColors: [C.navy], lineSize: 2, lineDataSymbol: "circle", lineDataSymbolSize: 7,
      showValue: true, dataLabelPosition: "t", valAxisMinVal: 0, valAxisMaxVal: 80, showLegend: false,
      showTitle: true, title: "两耳同步误差对测向的影响（仿真）" }, chartBase,
      axisTitle({ showCatAxisTitle: true, catAxisTitle: "同步误差（µs）", showValAxisTitle: true, valAxisTitle: "方位误差 ≤10° 的比例（%）" })));
  T(s, "同步误差 50 µs 以内精度基本不变，100 µs 时测向失效；两耳采样同步需 ≤ 50 µs。", { x: 8.3, y: 6.15, w: 4.45, h: 0.6, fontSize: 11.5, color: C.gray });
}

// ================= 9 摄像头 =================
{
  const s = newSlide("附录 A4　摄像头分辨率",
    "嘴宽按 5 cm、小孔成像估算；20 像素为本方案的设计目标，需视觉同事确认",
    "参考：低分辨率视频中嘴部约 45 × 17 像素时仍能做唇动检测（Liu 等，https://personalpages.surrey.ac.uk/w.wang/papers/LiuWJ_SSPD_2011.pdf）；未找到最小像素数的系统结论。人脸检测要求低得多（SCRFD 可处理小于 16 像素的人脸，https://arxiv.org/abs/2105.04714）。");
  const d = [1, 1.5, 2, 2.5, 3];
  const px = (W, fov) => d.map((x) => Math.round((W / 2) / Math.tan((fov / 2) * Math.PI / 180) * 0.05 / x));
  const labels = d.map((x) => x + " m");
  s.addChart(p.charts.LINE, [
    { name: "QVGA，100°", labels, values: px(320, 100) },
    { name: "VGA，100°", labels, values: px(640, 100) },
    { name: "720p，80°（推荐）", labels, values: px(1280, 80) },
    { name: "1080p，100°", labels, values: px(1920, 100) },
    { name: "设计目标 20 像素", labels, values: d.map(() => 20) },
  ], Object.assign({ x: 0.6, y: 1.5, w: 7.4, h: 4.6, chartColors: ["C8C8C8", "9A9A9A", C.navy, C.navyLt, C.red], lineSize: 2, lineDataSymbol: "circle", lineDataSymbolSize: 6,
    valAxisMinVal: 0, valAxisMaxVal: 45, showLegend: true, legendPos: "r", showTitle: true, title: "对方嘴宽在画面里占多少像素" }, chartBase,
    axisTitle({ showCatAxisTitle: true, catAxisTitle: "对方距离", showValAxisTitle: true, valAxisTitle: "像素" })));
  T(s, "两只耳机各 1 个摄像头，两路人脸结果在主耳合并。正前方的人落在两边视野的内侧边缘，朝向和视场需保证正前方 ±30° 有覆盖（例如前倾布局，两边视野在正前方重叠）。", { x: 0.6, y: 6.2, w: 7.4, h: 0.55, fontSize: 11.5, color: C.gray, valign: "middle" });
  sub(s, "两级读出", 8.4, 1.6, 4.3);
  box(s, "平时：整幅画面合并像素输出\n低分辨率，1–2 fps", 8.4, 2.05, 4.3, 0.75);
  line(s, 10.55, 2.8, 10.55, 3.1);
  box(s, "人脸检测，得到人脸框", 8.4, 3.1, 4.3, 0.55);
  line(s, 10.55, 3.65, 10.55, 3.95);
  box(s, "需要时：只读嘴部区域的原分辨率像素\n约 64 × 64，10–15 fps，判断唇动", 8.4, 3.95, 4.3, 0.85, { line: C.navy, lw: 1.5 });
  para(s, ["2 m 处嘴宽：QVGA 3 像素，720p 19 像素", "两级读出省带宽和 NPU 算力；图像不出模组", "代价：传感器比 QVGA 贵，功耗更高（第 12 页）"], 8.4, 5.0, 4.3, 1.8, { fontSize: 12 });
}

{
  const s = newSlide("附录 A5　数据流规格", "", "同步要求见附录 A3；编码取舍：PCM 首选，ADPCM 待验证，LC3 不用于定位。");
  table(s, [
    [head("数据流"), head("从 → 到"), head("内容与格式"), head("速率"), head("时延要求")],
    [bold("麦克风采集"), cell("麦克风 → 本耳芯片"), cell("数字麦 PDM → PCM 16 kHz / 16 bit；32 ms 帧、16 ms 帧移"), cell("每路 256 kbps（片内）"), cell("—")],
    [bold("定位音频"), cell("副耳 → 主耳"), cell("1 路 PCM 16 kHz（首选 16 bit 无压缩）；带采样计数与时间戳；两耳采样同步 ≤ 50 µs"), cell("256 kbps"), cell("≤ 100 ms（旁路）")],
    [bold("图像"), cell("传感器 → NPU"), cell("平时低分辨率整幅；需要时嘴部区域（约 64 × 64 像素）原分辨率"), cell("不出模组"), cell("—")],
    [bold("人脸元数据"), cell("两耳 NPU → 主耳"), cell("每张脸 16 字节：曝光时间戳 4 B、编号 1 B、方位角 2 B、仰角 2 B、人脸宽度 2 B（用于估距离）、唇动分数 1 B、置信度 1 B、保留 3 B"), cell("≤ 1.2 kB/s"), cell("≤ 100 ms")],
    [bold("摄像头控制"), cell("主耳 → 两耳摄像头"), cell("开 / 关、档位（监测 / 唇动）、嘴部区域坐标"), cell("事件触发"), cell("≤ 50 ms")],
    [bold("头部朝向"), cell("IMU → 本耳芯片"), cell("偏航角，200 Hz"), cell("片内"), cell("—")],
    [bold("定位结果"), cell("主耳 → 两耳增强"), cell("每 16 ms 8 字节：目标方位 2 B、置信度 1 B、是否在说话 1 B、3 个干扰方位 3 B、序号 1 B"), cell("0.5 kB/s"), cell("≤ 50 ms")],
  ], 0.6, 1.5, [1.4, 1.8, 5.6, 1.7, 1.63], [0.42, 0.5, 0.6, 0.5, 0.6, 0.5, 0.45, 0.6]);
}

{
  const s = newSlide("附录 A6　状态机与降级", "", "");
  table(s, [
    [head("状态"), head("进入条件"), head("音频"), head("摄像头"), head("输出")],
    [bold("待机"), cell("未开启听觉辅助"), cell("关"), cell("关"), cell("—")],
    [bold("安静"), cell("3 s 内无人说话"), cell("背景递推、跟踪上一个目标"), cell("监测档，1–2 fps"), cell("保持上一个目标")],
    [bold("对话中"), cell("声学检测到语音，且正前方 ±30° 内有人脸"), cell("定位 + 唇动门控背景；退回只开监测档时加声学开口检测"), cell("唇动档常开，只读嘴部区域，10–15 fps；功耗偏高时只开监测档"), cell("目标方位、置信度")],
    [bold("确认"), cell("新声源 / 前后判断不一致 / 置信度低 / 转头 > 30°"), cell("定位"), cell("唇动档，直到确认完成"), cell("保持上一次目标")],
    [bold("降级"), cell("光线差、遮挡、目标在视野外"), cell("纯声学"), cell("关或监测"), cell("置信度降一级")],
  ], 0.6, 1.5, [1.2, 4.4, 1.9, 2.9, 1.73], [0.42, 0.42, 0.42, 0.42, 0.42, 0.42]);
  table(s, [
    [head("情况"), head("行为")],
    [bold("目标在摄像头视野外"), cell("用地图记住的位置 + 声学空间谱；置信度降一级")],
    [bold("光线差、摄像头被遮挡"), cell("纯声学；开口时刻改用声学语音检测")],
    [bold("视觉认为在说话、声学没有活动"), cell("不认为在说话（过滤吃东西等唇动误报）")],
    [bold("佩戴者自己在说话"), cell("冻结定位与地图更新")],
    [bold("两耳链路中断"), cell("主耳退化为本地 2 麦定位，置信度降两级")],
  ], 0.6, 4.3, [3.6, 8.53], [0.42, 0.42, 0.42, 0.42, 0.42, 0.42]);
}

{
  const s = newSlide("附录 A7　功耗分项（本地增强方案，每只耳机）", "",
    "器件参考：nRF5340 射频电流（https://www.nordicsemi.com/-/media/Software-and-other-downloads/Product-Briefs/nRF5340-SoC-PB.pdf），协议开销按 ×2 估；NXP RT600 内核电流（AN13468）作为计算功耗上限参考；HM0360 监测模式 140–256 µA、VGA 60 fps 约 14.5 mW（https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/4287/HM0360-MWA-00FP963.pdf）；OV02C 2 MP 约 82 mW；VueBuds 摄像头典型 < 5 mW。");
  table(s, [
    [head("部分"), head("功耗"), head("依据")],
    [bold("基准：通话"), cell("约 37 mW"), cell("FreeClip 2 S：60 mAh、通话 6 h，按 3.7 V 推算")],
    [bold("耳间定位音频"), cell("0.7 mW（ADPCM）/ 2.6 mW（PCM）"), cell("射频约 5 nJ/bit × 协议开销 2")],
    [bold("定位与融合计算"), cell("≤ 约 3 mW（唇动档常开）/ 4.6 mW（只开监测档）"), cell("约 12 / 19 MFLOPS（只开监测档时多声学开口检测），按偏老工艺 MCU 约 0.19 mW/MHz 估上限")],
    [bold("摄像头低分辨率监测"), cell("约 0.4–0.8 mW"), cell("低功耗传感器常开监测模式")],
    [bold("摄像头唇动档（对话中常开）"), cell("传感器约 1.2–1.7 mW + NPU 约 0.3–9 mW（轻量模型 < 1 mW）"), cell("传感器按 HM0360 低分辨率 10–15 fps；NPU 按 Light-ASD 每张脸每帧约 0.2 GFLOPs、1–3 张脸、1–6 TOPS/W；对话占一半时平均减半")],
    [bold("NPU 监测档人脸检测"), cell("很小，未计入"), cell("1–2 fps、低分辨率；需目标芯片数据")],
    [bold("两耳组阵增强（B）额外"), cell("每侧 +2.6–5.2 mW"), cell("双向持续传 1–2 路 PCM")],
  ], 0.6, 1.5, [3.0, 3.2, 5.93], [0.42, 0.46, 0.46, 0.46, 0.46, 0.56, 0.46, 0.46]);
}

{
  const s = newSlide("附录 A8　仿真与估算方法", "", "");
  table(s, [
    [head("项目"), head("方法"), head("局限")],
    [bold("头部与麦克风"), cell("刚性球头部模型（解析解）；每耳 2 麦，耳柄前后间距 1.5 cm"), cell("无耳廓、躯干；佩戴偏差未建模")],
    [bold("房间"), cell("扩散混响尾近似；另用镜像声源法（3 阶墙面反射）验证"), cell("墙面吸声与频率无关；无家具、人体散射")],
    [bold("场景"), cell("目标在前方 ±60°、1–2 m；2 个干扰说话人；扩散噪声；每档 72–144 次"), cell("统计误差约 ±4 个百分点")],
    [bold("视觉"), cell("按假设模拟：方位误差 2°、检出 95%、唇动错误 10%，另测了更差的两档"), cell("需要视觉同事的真实指标")],
    [bold("测向"), cell("GEVD-MUSIC（唇动门控背景白化）+ 起始段加权 + 5° 网格；与 SRP-PHAT、MUSIC 等对比"), cell("算法为预研储备，整体方案确认后再正式选型")],
    [bold("增强分辨力"), cell("理论波束计算：固定超指向与已知干扰方位的 MVDR 置零"), cell("未含时变与估计噪声；不是增强算法的实现")],
    [bold("功耗"), cell("FreeClip 2 S 官方电池与续航推算基准；器件取公开资料"), cell("多为检索摘要，原文未逐一核实；NPU 按公开模型计算量与能效区间估算，无目标芯片数据")],
  ], 0.6, 1.5, [1.8, 6.0, 4.33], [0.42, 0.5, 0.5, 0.5, 0.5, 0.56, 0.5, 0.5]);
}

{
  const s = newSlide("附录 A9　定位算法初步比较（预研储备）", SIM + "；每个条件 120 次，开口后 0.5 s 判决",
    "四个条件：S1 混响（RT60 0.5 s）无干扰；S2 混响 + 2 个干扰（各低 6 dB）；S3 强混响（0.8 s）+ 嘈杂 + 2 个干扰；S4 混响 + 2 个干扰（与目标一样响）。GEVD-MUSIC 用唇动给出的开口时刻划分背景段做白化，5° 网格。本页为两耳 4 麦（2 + 2）的比较，方向模板约 245 KB；推荐的 3 路配置（主耳 2 + 副耳 1）约 184 KB，算力约 12 MFLOPS（第 6 页）。另做了四项稳健性验证（转头、对话轮流、墙面反射、视觉变差），倾向不变。");
  const labels = ["S1 混响", "S2 + 2 个干扰", "S3 强混响 + 干扰", "S4 干扰同样响"];
  s.addChart(p.charts.BAR, [
    { name: "SRP-PHAT", labels, values: [57, 22, 4, 8] },
    { name: "MUSIC", labels, values: [94, 58, 36, 28] },
    { name: "GEVD-MUSIC（背景白化）", labels, values: [98, 97, 87, 72] },
    { name: "GEVD-MUSIC + 视觉", labels, values: [98, 97, 93, 82] },
  ], Object.assign({ x: 0.6, y: 1.5, w: 8.2, h: 4.9, barDir: "col", barGrouping: "clustered", chartColors: ["C8C8C8", "9A9A9A", C.navyLt, C.navy],
    showValue: true, dataLabelPosition: "outEnd", valAxisMinVal: 0, valAxisMaxVal: 100, showLegend: true, legendPos: "t",
    showTitle: true, title: "方位误差 ≤10° 的比例（%）" }, chartBase));
  para(s, ["有干扰说话人时，SRP-PHAT 只有 4–22%，不适用。",
    "关键是背景白化：唇动给出开口时刻，开口前的一段只有干扰和噪声，用来估计背景。",
    "倾向：GEVD-MUSIC + 起始段加权 + 5° 网格，再与人脸软融合；经典信号处理，不需要训练数据。",
    "需要实测数据复核；微型神经网络作为对照，留到有匹配数据后再比。"], 9.1, 1.7, 3.65, 4.6, { fontSize: 12 });
}


{
  const s = newSlide("附录 A10　时间同步与标定", "晶振偏差、装配位置为典型值；要求中的数值为设计值，需与链路、芯片、视觉同事确认",
    "开口时刻误差预算：仿真要求总误差 ≤ ±0.1 s（附录 A2）；摄像头 10–15 fps 本身带来 67–100 ms 的帧间隔，所以留给时钟对齐的误差约 20 ms。摄像头离头部中心约 8 cm：1 m 处约 4.6°，2 m 处约 2.3°。");
  table(s, [
    [head("项目"), head("问题"), head("做法"), head("要求")],
    [bold("两耳采样时钟漂移"), cell("两颗晶振相差 20 ppm 时，每 2.5 s 漂 50 µs，正好用完同步预算"), cell("副耳每帧带采样计数；主耳持续估计漂移，用重采样补偿"), cell("对齐误差 ≤ 50 µs【待确认】")],
    [bold("副耳音频晚到"), cell("耳间链路有时延"), cell("主耳本地 2 路先缓存，等副耳数据到达后对齐"), cell("缓存 100 ms，约 6.4 KB")],
    [bold("摄像头与音频的时间基准"), cell("曝光时间和采样时刻来自不同时钟"), cell("曝光时间戳统一换算到主耳音频时钟"), cell("误差 ≤ 20 ms")],
    [bold("摄像头不在头部中心"), cell("摄像头在耳柄上，离头部中心约 8 cm；1 m 处不换算差约 4.6°"), cell("按人脸大小估距离，把人脸方位换算到头部中心"), cell("换算后残差 ≤ 1°")],
    [bold("IMU 偏航角漂移"), cell("陀螺积分会慢慢漂"), cell("用人脸方位和声学峰值定期重新校准说话人地图"), cell("漂移在 ±5° 内被校正")],
    [bold("摄像头与麦克风相对位置"), cell("每副耳机装配有偏差"), cell("出厂标定，写入方向模板与换算参数"), cell("—")],
  ], 0.6, 1.5, [2.4, 3.9, 3.9, 1.93], [0.42, 0.62, 0.5, 0.5, 0.62, 0.5, 0.5]);
}

{
  const s = newSlide("附录 A11　说话人移动与转头（仿真）",
    SIM + "；主耳 2 + 副耳 1 路，混响 + 2 个固定干扰说话人（各低 6 dB）；每 0.25 s 输出一次，统计 1.5–6 s 的全部输出；每档 60 次",
    "干扰与目标一样响时趋势相同、整体低约 10 个百分点：移动 0 / 10 / 20 / 40 °/s 时跟踪 + 视觉 79 / 84 / 73 / 53%，逐窗 0.25 s 67 / 65 / 67 / 67%；转头 0 / 30 / 60° 时 IMU + 视觉 79 / 77 / 67%，只用 IMU 78 / 54 / 49%，不用 IMU（逐窗）73 / 55 / 48%。跟踪器为场景一的圆周卡尔曼（方位 + 角速度），块长 0.25 s，参数在单独的开发数据上从 4 组中选定。只用 IMU 时背景协方差按转角旋转，是近似。干扰有停顿时的声学开口检测也做了仿真：说一段停一段、轮流说话时检出与误报仍无法兼顾，只靠声学检测开口不可靠的结论不变。");
  const bc = (x, title, labels, series, xt) => s.addChart(p.charts.BAR, series.map(([n, v]) => ({ name: n, labels, values: v })),
    Object.assign({ x, y: 1.4, w: 5.95, h: 3.6, barDir: "col", barGrouping: "clustered", chartColors: ["BDBDBD", C.navyLt, C.navy],
      showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 9, valAxisMinVal: 0, valAxisMaxVal: 100, showLegend: true, legendPos: "t",
      showTitle: true, title, titleFontSize: 11.5 }, chartBase, axisTitle({ showCatAxisTitle: true, catAxisTitle: xt })));
  bc(0.6, "说话人移动：方位误差 ≤ 10° 的比例（%）", ["0", "10", "20", "40"],
    [["逐窗 0.25 s", [77, 76, 75, 77]], ["跟踪", [88, 90, 80, 60]], ["跟踪 + 视觉", [89, 92, 85, 69]]], "移动速度（°/s）");
  bc(6.78, "佩戴者转头：方位误差 ≤ 10° 的比例（%）", ["0", "30", "60"],
    [["不用 IMU（逐窗）", [84, 72, 66]], ["只用 IMU（跟踪）", [88, 74, 67]], ["IMU + 视觉（跟踪）", [89, 87, 77]]], "转头角度（°），0.5 s 内转完");
  para(s, ["慢速移动（≤ 20°/s）靠跟踪 + 视觉能跟住：85–92%。",
    "快速移动（40°/s，约相当于 1.5 m 外的人正常走过）是弱点：跟踪跟不上，不如只用最近 0.25 s 测向。12 月改为以摄像头 10–15 fps 的人脸跟踪为主，声学确认。",
    "转头要 IMU + 视觉一起：只用 IMU 时，转头前估计的背景对不上干扰的新方向。"], 0.6, 5.25, 12.1, 1.5, { fontSize: 12 });
}

p.writeFile({ fileName: OUT }).then((f) => console.log("saved", f));
