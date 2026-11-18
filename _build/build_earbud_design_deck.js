// 耳机摄像头无障碍听觉辅助：整体设计方案与明显问题排查（给 mentor）。
// 呈现原则：一页一个结论；能用图的用图（框图、时间轴、图表、标尺），细节表格放附录；来源与方法放备注。
// 内容依据：02_耳机声源定位/整体设计方案.md（v2.1）、明显问题排查.md（v2.1）、code/earbud_ssl/out/*.json。
const pptxgen = require("pptxgenjs");
const path = require("path");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, "..", "02_耳机声源定位"), "耳机摄像头听觉辅助_整体设计方案.pptx");
const F = "Microsoft YaHei";
// 配色方案：THEME=navy（深蓝）| minimal（极简：深灰 + 单一红色强调）| teal（深青绿 + 琥珀）
const THEMES = {
  navy: { text: "1F1F1F", gray: "595959", light: "8C8C8C", navy: "134074", navy2: "5B7FA6", s2: "8DA9C4", s3: "BCCCDC", pale: "EAF2F8", red: "B03A2E", redPale: "FBEDEB", grayPale: "F3F3F3", greenPale: "EEF6EE", line: "D0D7E1", green: "2E7D32", band1: "D8E8D8", band2: "FFF2CC", band2t: "8A6D00" },
  minimal: { text: "1F1F1F", gray: "595959", light: "8C8C8C", navy: "262626", navy2: "7F7F7F", s2: "BFBFBF", s3: "D9D9D9", pale: "F5F5F5", red: "C8102E", redPale: "F5F5F5", grayPale: "F5F5F5", greenPale: "F5F5F5", line: "D9D9D9", green: "262626", band1: "EDEDED", band2: "F6E3E6", band2t: "C8102E" },
  teal: { text: "1F1F1F", gray: "595959", light: "8C8C8C", navy: "0F5257", navy2: "4E8A8E", s2: "9CC3C5", s3: "C9DEDF", pale: "EAF3F3", red: "C2410C", redPale: "FDF0E9", grayPale: "F3F3F3", greenPale: "EAF3F3", line: "CFDFE0", green: "0F5257", band1: "D5E8E8", band2: "FDECD3", band2t: "9A5B00" },
};
const C = THEMES[process.env.THEME || "navy"];

const p = new pptxgen();
p.layout = "LAYOUT_WIDE"; // 13.33 × 7.5 in
p.title = "耳机摄像头无障碍听觉辅助：整体设计方案";

const T = (s, text, o) => s.addText(text, Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 12, color: C.text, margin: 0, valign: "top", isTextBox: true }, o));
const cell = (t, o) => ({ text: t, options: Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 10.5, color: C.text, valign: "middle" }, o) });
const head = (t, o) => cell(t, Object.assign({ bold: true, color: "FFFFFF", fill: { color: C.navy }, align: "center" }, o));
const bold = (t, o) => cell(t, Object.assign({ bold: true }, o));
const ctr = (t, o) => cell(t, Object.assign({ align: "center" }, o));

function newSlide(title, msg, notes) {
  const s = p.addSlide();
  s.background = { color: "FFFFFF" };
  T(s, title, { x: 0.5, y: 0.32, w: 12.3, h: 0.5, fontSize: 22, bold: true, color: C.navy, valign: "middle" });
  if (msg) T(s, msg, { x: 0.5, y: 0.85, w: 12.3, h: 0.4, fontSize: 13, color: C.gray, valign: "middle" });
  if (notes) s.addNotes(notes);
  return s;
}
function table(s, rows, x, y, colW, rowH, o) {
  rows.forEach((r, i) => { if (i === 0) return; const fill = i % 2 === 1 ? C.pale : "FFFFFF"; r.forEach((c) => { if (!c.options.fill) c.options.fill = { color: fill }; }); });
  s.addTable(rows, Object.assign({ x, y, w: colW.reduce((a, b) => a + b, 0), colW, rowH, margin: [0.03, 0.08, 0.03, 0.08],
    border: { type: "solid", pt: 0.75, color: C.line }, autoPage: false }, o || {}));
}
function rect(s, x, y, w, h, fill, lineColor, o) {
  s.addShape(p.shapes.RECTANGLE, Object.assign({ x, y, w, h, fill: { color: fill }, line: lineColor ? { color: lineColor, width: 0.75 } : { type: "none" } }, o || {}));
}
function box(s, text, x, y, w, h, o) {
  o = o || {};
  rect(s, x, y, w, h, o.fill || C.pale, o.lineColor === undefined ? C.navy : o.lineColor, o.shape);
  T(s, text, Object.assign({ x: x + 0.05, y, w: w - 0.1, h, fontSize: 11, align: "center", valign: "middle", color: o.color || C.text, bold: !!o.bold }, o.text || {}));
}
function line(s, x1, y1, x2, y2, o) {
  o = o || {};
  s.addShape(p.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001,
    flipH: x2 < x1, flipV: y2 < y1, line: { color: o.color || C.gray, width: o.width || 1.25, dashType: o.dash || "solid", endArrowType: o.arrow === false ? undefined : "triangle" } });
}
const small = (s, text, y, o) => T(s, text, Object.assign({ x: 0.5, y, w: 11.0, h: 0.32, fontSize: 10, color: C.light, valign: "middle" }, o || {}));
const bullets = (s, items, x, y, w, h, o) => s.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } })),
  Object.assign({ x, y, w, h, fontFace: F, lang: "zh-CN", fontSize: 12.5, color: C.text, valign: "top", margin: 0.05, paraSpaceAfter: 6, isTextBox: true }, o || {}));
const chartText = { catAxisLabelFontFace: F, valAxisLabelFontFace: F, dataLabelFontFace: F, legendFontFace: F, titleFontFace: F,
  catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, dataLabelFontSize: 10, legendFontSize: 10, titleFontSize: 11,
  catAxisLabelColor: "404040", valAxisLabelColor: "404040", dataLabelColor: "404040", titleColor: "404040",
  valGridLine: { color: "E5E5E5", size: 0.5 }, catGridLine: { style: "none" } };

const SRC_SIM = "仿真：刚性球头部模型（无耳廓），混响用多方向衰减近似；代码在 code/earbud_ssl/。";

// ================= 1 封面 =================
{
  const s = p.addSlide();
  s.background = { color: "FFFFFF" };
  T(s, "耳机摄像头无障碍听觉辅助", { x: 0.9, y: 2.35, w: 11, h: 0.8, fontSize: 34, bold: true, color: C.navy, valign: "middle" });
  T(s, "整体设计方案与明显问题排查", { x: 0.9, y: 3.2, w: 11, h: 0.5, fontSize: 20, color: C.gray, valign: "middle" });
  T(s, "2026.11", { x: 0.9, y: 3.95, w: 4, h: 0.4, fontSize: 13, color: C.light, valign: "middle" });
  s.addNotes("按“应用场景价值 → 整体设计方案 → 具体算法模型”的顺序，本次汇报整体设计方案，并排查有没有明显问题。数字为仿真或按公开资料估算，需样机复核；方法见附录 A4。");
}

// ================= 2 一页结论 =================
{
  const s = newSlide("结论", "定位侧可以推进；场景能否成立，取决于增强能否在时延要求内分开相邻说话人",
    "三栏分别对应：我们负责的定位侧（可推进）、整个场景的关键风险、需要相关同事确认的数字。详见后续各页。");
  const cols = [
    { x: 0.5, title: "定位侧：可以推进", color: C.navy, fill: C.pale, items: [
      "两耳组阵测向，副耳只转发 1 路音频",
      "每耳 2 个麦克风即可（6 / 8 麦未见明显收益）",
      "耳机与摄像头同时运行；唇动给出开口时刻，声学随后测向",
      "摄像头 720p 级，平时低分辨率找人脸，需要时只读嘴部",
      "续航约 4.5–5.2 h（FreeClip 2 S 基准 6 h，估算）"] },
    { x: 4.67, title: "关键风险：能否分开相邻的人", color: C.red, fill: C.redPale, items: [
      "单只耳机 2 麦：对相隔 25° 的人只能提升约 2 dB",
      "两耳组阵可提升约 8 dB，或用目标说话人提取",
      "但两者的声音通路时延约 17.5–20 ms 起",
      "入耳式能容忍约 10–20 ms，处在边缘；开放式约 5–6 ms，基本不行"] },
    { x: 8.84, title: "需要确认", color: C.gray, fill: C.grayPale, items: [
      "耳机之间专用链路的时延",
      "目标说话人提取在耳机芯片上的时延与功耗",
      "两耳采样同步能否 ≤ 50 µs",
      "唇动检测需要嘴部多少像素；NPU 功耗",
      "佩戴形态：入耳式还是开放式"] },
  ];
  cols.forEach((c) => {
    rect(s, c.x, 1.45, 3.99, 4.55, c.fill);
    T(s, c.title, { x: c.x + 0.2, y: 1.62, w: 3.6, h: 0.5, fontSize: 16, bold: true, color: c.color, valign: "middle" });
    bullets(s, c.items, c.x + 0.15, 2.3, 3.7, 3.6, { fontSize: 14, paraSpaceAfter: 9 });
  });
  small(s, "数字为仿真（刚性球头部模型）或按公开资料估算，需样机复核。", 6.2);
}

// ================= 3 场景价值 =================
{
  const s = newSlide("应用场景价值", "已有产品都能增强正前方；本方案要做到在多人中自动锁定正在和我说话的那一个人",
    "✓ / ✗ 为根据公开描述的判断。\n来源：HearingTracker（Meta Ray-Ban Gen 2 Conversation Focus，5–6 麦阵列）https://www.hearingtracker.com/news/meta-ray-ban-gen-2-conversation-focus-ai-speech-enhancement-for-hearing-loss；Hearing Review（AirPods Pro Conversation Boost）https://hearingreview.com/inside-hearing/events/apple-announces-conversation-boost-for-airpods-pro；Look Once to Hear（CHI 2024）https://arxiv.org/html/2405.06289v2；VueBuds（CHI 2026）https://arxiv.org/abs/2603.29095；助听器耳间链路：检索摘要提及 Signia e2e，原文未核实。");
  const Y = (t) => ctr(t, { color: C.green, bold: true, fontSize: 14 });
  const N = (t) => ctr(t, { color: C.light, fontSize: 14 });
  const D = (t) => ctr(t, { color: C.light });
  table(s, [
    [head("产品 / 研究", { align: "left" }), head("增强正前方"), head("多人中只增强一个人"), head("转头后仍跟住目标"), head("无需注册"), head("耳机形态"), head("说明", { align: "left" })],
    [bold("AirPods Pro 对话增强 / 听力辅助"), Y("✓"), N("✗"), N("✗"), Y("✓"), Y("✓"), cell("波束聚焦正前方；听力辅助按听力图补偿")],
    [bold("Meta Ray-Ban Gen 2 Conversation Focus"), Y("✓"), N("✗"), N("✗"), Y("✓"), N("✗"), cell("镜腿 5–6 麦阵列；眼镜形态")],
    [bold("助听器双耳指向"), Y("✓"), N("✗"), N("✗"), Y("✓"), Y("✓"), cell("专用耳间链路，窄波束；仍按头朝向")],
    [bold("Look Once to Hear（CHI 2024）"), Y("✓"), Y("✓"), Y("✓"), N("✗"), Y("✓"), cell("先看着目标几秒注册声纹，再做目标说话人提取")],
    [bold("VueBuds（CHI 2026）"), D("—"), D("—"), D("—"), D("—"), Y("✓"), cell("耳机装摄像头做视觉问答，不做听觉辅助")],
    [bold("本方案", { color: C.navy }), Y("✓"), ctr("✓*", { color: C.red, bold: true, fontSize: 14 }), Y("✓"), Y("✓"), Y("✓"), cell("摄像头人脸 + 唇动，与两耳定位融合，自动锁定")],
  ], 0.5, 1.5, [3.2, 1.2, 1.55, 1.55, 1.1, 1.1, 2.6], [0.42, 0.56, 0.56, 0.56, 0.56, 0.56, 0.56]);
  T(s, "* 前提：增强侧能把相隔 20–30° 的相邻说话人分开（见第 11 页）。", { x: 0.5, y: 5.6, w: 11, h: 0.35, fontSize: 12, color: C.red, valign: "middle" });
  small(s, "目标用户：听力损失或老年人群；嘈杂场合本来就戴着耳机的普通用户。", 6.0);
}

// ================= 4 整体架构 =================
{
  const s = newSlide("整体架构", "实时听的声音在每只耳机本地处理；两耳之间的链路只服务于定位，链路时延不进入用户听到的声音",
    "定位与融合运行在主耳；图中居中画出只是为了表示它汇集两耳的数据。时延容忍度：入耳式约 10–20 ms，开放式约 5–6 ms（Stone & Moore 2008，https://www.researchgate.net/publication/5266175_Tolerable_Hearing_Aid_Delays_V_Estimation_of_Limits_for_Open_Canal_Fittings）。");
  T(s, "副耳", { x: 0.5, y: 1.4, w: 4.5, h: 0.35, fontSize: 13, bold: true, color: C.navy, align: "center", valign: "middle" });
  T(s, "主耳", { x: 8.33, y: 1.4, w: 4.5, h: 0.35, fontSize: 13, bold: true, color: C.navy, align: "center", valign: "middle" });
  const lane1 = (x0) => { box(s, "2 个麦克风", x0, 1.85, 1.3, 0.55, { fill: "FFFFFF" }); box(s, "本地增强", x0 + 1.6, 1.85, 1.3, 0.55); box(s, "扬声器", x0 + 3.2, 1.85, 1.3, 0.55, { fill: "FFFFFF" });
    line(s, x0 + 1.3, 2.125, x0 + 1.6, 2.125); line(s, x0 + 2.9, 2.125, x0 + 3.2, 2.125); };
  lane1(0.5); lane1(8.33);
  T(s, "① 实时听：各自本地处理，不跨耳", { x: 5.1, y: 1.85, w: 3.1, h: 0.55, fontSize: 11.5, bold: true, color: C.navy, align: "center", valign: "middle" });
  line(s, 2.75, 2.9, 10.58, 2.9, { color: C.navy, width: 1.25, arrow: false, dash: "dash" });
  line(s, 2.75, 2.9, 2.75, 2.42, { color: C.navy, dash: "dash" });
  line(s, 10.58, 2.9, 10.58, 2.42, { color: C.navy, dash: "dash" });
  T(s, "目标方位（每 16 ms）下发两耳的本地增强", { x: 3.3, y: 2.55, w: 3.6, h: 0.3, fontSize: 10.5, color: C.navy, valign: "middle" });
  box(s, "② 定位与融合\n（运行在主耳）", 5.45, 3.55, 2.4, 1.05, { fill: C.navy, lineColor: C.navy, color: "FFFFFF", bold: true, text: { fontSize: 12 } });
  line(s, 6.65, 3.55, 6.65, 2.9, { color: C.navy, width: 1.25 });
  box(s, "取 1 路麦克风音频", 0.5, 3.45, 2.3, 0.5, { fill: "FFFFFF" });
  box(s, "摄像头 + NPU", 0.5, 4.25, 2.3, 0.5, { fill: "FFFFFF" });
  line(s, 2.8, 3.7, 5.45, 3.85, { color: C.navy });
  line(s, 2.8, 4.5, 5.45, 4.3, { color: C.navy });
  T(s, "1 路音频 16 kHz（耳间链路）", { x: 2.95, y: 3.35, w: 2.5, h: 0.3, fontSize: 10, color: C.gray });
  T(s, "人脸元数据（耳间链路）", { x: 2.95, y: 4.5, w: 2.5, h: 0.3, fontSize: 10, color: C.gray });
  box(s, "本耳 2 路麦克风音频", 10.53, 3.3, 2.3, 0.45, { fill: "FFFFFF" });
  box(s, "摄像头 + NPU", 10.53, 3.85, 2.3, 0.45, { fill: "FFFFFF" });
  box(s, "IMU：头部朝向", 10.53, 4.4, 2.3, 0.45, { fill: "FFFFFF" });
  line(s, 10.53, 3.52, 7.85, 3.85, { color: C.navy }); line(s, 10.53, 4.07, 7.85, 4.07, { color: C.navy }); line(s, 10.53, 4.62, 7.85, 4.3, { color: C.navy });
  table(s, [
    [head("通路"), head("做什么", { align: "left" }), head("时延要求"), head("跨耳传输")],
    [bold("① 实时听"), cell("每只耳机用本地麦克风朝目标增强，与透传混合后播放"), ctr("入耳式 ≤ 10–20 ms"), ctr("不跨耳")],
    [bold("② 定位"), cell("主耳汇集 3 路音频，与视觉融合，算出目标方位"), ctr("开口后约 0.5 s 内"), ctr("1 路音频")],
    [bold("③ 视觉"), cell("人脸方位、唇动分数、开口时刻"), ctr("几十毫秒可接受"), ctr("人脸元数据")],
  ], 0.5, 5.15, [1.4, 6.2, 2.6, 2.13], [0.36, 0.4, 0.4, 0.4]);
}

// ================= 5 协同时序 =================
{
  const s = newSlide("耳机与摄像头：同时处理，还是先后？", "两者同时运行；一次定位中有先后：声音先发现 → 唇动给出开口时刻 → 声学测向 → 融合锁定",
    "摄像头档位：监测档（低分辨率 1–2 fps）、唇动档（嘴部区域 10–15 fps，与《技术洞察》的视觉帧率一致）。摄像头常开约占通话功耗的 5–40%（视传感器而定），所以平时只用监测档。状态机见附录 A2。");
  const xs = [1.55, 3.45, 5.35, 7.25, 9.15, 11.05], w = 1.75;
  ["平时", "对方开口", "约 0.1 s", "0.1–0.5 s", "约 0.5 s", "之后"].forEach((t, i) => box(s, t, xs[i], 1.45, w, 0.5, { fill: C.navy, lineColor: C.navy, color: "FFFFFF", bold: true }));
  T(s, "音频", { x: 0.5, y: 2.15, w: 0.95, h: 0.8, fontSize: 13, bold: true, color: C.navy, valign: "middle" });
  T(s, "摄像头", { x: 0.5, y: 3.15, w: 0.95, h: 0.8, fontSize: 13, bold: true, color: C.navy, valign: "middle" });
  const audio = ["持续估计背景", "", "发现有人说话；拿不准时叫醒摄像头", "按开口时刻测向", "融合，锁定目标", "下发目标方位；IMU 补偿转头"];
  const cam = ["低分辨率监测 1–2 fps", "", "切到唇动档 10–15 fps", "唇动给出开口时刻", "人脸方位、唇动参与打分", "回到监测档"];
  audio.forEach((t, i) => { if (t) box(s, t, xs[i], 2.15, w, 0.8, { fill: "FFFFFF", text: { fontSize: 10.5 } }); });
  cam.forEach((t, i) => { if (t) box(s, t, xs[i], 3.15, w, 0.8, { fill: "FFFFFF", text: { fontSize: 10.5 } }); });
  const tag = (n, x, y) => { s.addShape(p.shapes.OVAL, { x, y, w: 0.34, h: 0.34, fill: { color: C.red }, line: { type: "none" } });
    T(s, String(n), { x, y, w: 0.34, h: 0.34, fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle" }); };
  tag(1, xs[2] - 0.17, 2.05); tag(2, xs[3] - 0.17, 3.05); tag(3, xs[3] - 0.17, 2.05); tag(4, xs[4] - 0.17, 2.05);
  line(s, xs[2] + w / 2, 2.95, xs[2] + w / 2, 3.15, { color: C.red });
  line(s, xs[3] + w / 2, 3.15, xs[3] + w / 2, 2.95, { color: C.red });
  rect(s, 0.5, 4.35, 12.33, 1.55, C.pale);
  T(s, "回答", { x: 0.7, y: 4.45, w: 2, h: 0.35, fontSize: 13, bold: true, color: C.navy, valign: "middle" });
  bullets(s, ["同时处理：音频一直在跑（每 16 ms 一帧，功耗低），摄像头平时低频监测",
    "一次定位中有先后：① 声音先发现有人说话 → ② 唇动给出开口时刻 → ③ 声学按这个时刻测向 → ④ 融合锁定",
    "视觉晚到几十毫秒不影响：两路都按采样 / 曝光时刻对齐，说话人位置存在世界坐标里"], 0.7, 4.82, 12.0, 1.05, { fontSize: 12 });
}

// ================= 6 融合流程 =================
{
  const s = newSlide("融合流程", "视觉不只在最后校正方向：唇动决定背景用哪些帧、从何时开始测向；视觉缺失时自动退化为纯声学",
    "软融合：每个候选人的得分 = 空间谱在其方位 ±8° 内的最大值 + 0.1 ×（唇动分数 − 0.5）；空间谱峰值本身也作为“无人脸”候选，得分 = 峰值 − 0.05。只在唇动分数高的人脸里选的硬规则，在唇动误判时会排除目标，仿真中比纯声学低约 5 个百分点。降级规则见附录 A2。");
  const steps = [["头部朝向", "积分 IMU 偏航角"], ["自语音判断", "佩戴者说话时跳过本帧"], ["背景更新", "只用目标嘴闭上 > 0.2 s 的帧"],
    ["声学测向", "开口后的帧，背景白化后扫描 72 个方向"], ["说话人地图", "视觉结果换到世界坐标"],
    ["软融合", "声学得分 + 唇动加分，保留纯声学候选"], ["新声源", "无人脸对应 → 摄像头切唇动档"], ["锁定与切换", "正前方 ±30° 内在说话的人"], ["输出", "目标方位下发两耳"]];
  const w = 2.2, h = 1.05, gx = 0.33;
  steps.forEach(([t, d], i) => {
    const row = Math.floor(i / 5), col = i % 5, x = 0.5 + col * (w + gx), y = 1.55 + row * 1.6;
    const key = i === 2 || i === 3;
    rect(s, x, y, w, h, key ? C.pale : "FFFFFF", key ? C.navy : C.line);
    T(s, `${i + 1}  ${t}`, { x: x + 0.12, y: y + 0.1, w: w - 0.24, h: 0.32, fontSize: 12.5, bold: true, color: key ? C.navy : C.text });
    T(s, d, { x: x + 0.12, y: y + 0.47, w: w - 0.24, h: 0.55, fontSize: 10.5, color: C.gray });
    if (col < 4 && i < steps.length - 1) line(s, x + w, y + h / 2, x + w + gx, y + h / 2);
  });
  line(s, 0.5 + 4 * (w + gx) + w / 2, 1.55 + h, 0.5 + w / 2, 1.55 + 1.6, { dash: "dash" });
  rect(s, 0.5, 4.55, 12.33, 1.35, C.pale);
  bullets(s, ["第 3、4 步依赖唇动给出的时刻：这是音频与视觉协同的具体落点",
    "第 6 步软融合：视觉差或缺失时只剩纯声学候选，仿真中从未比纯声学差",
    "仿真：有 2 个干扰说话人时，用唇动门控的背景白化，方位误差 ≤ 10° 的比例从 58% 升到 96%"], 0.7, 4.68, 12.0, 1.15, { fontSize: 12 });
}

// ================= 7 传输与编码 =================
{
  const s = newSlide("输入怎么传输、什么格式编码", "两耳之间只传 1 路 16 kHz 音频和少量元数据；两耳采样同步误差需控制在 50 µs 以内",
    SRC_SIM + "同步实验：混响 RT60 0.5 s、2 个干扰说话人，开口后 0.5 s 判决，每档 72 次。参考先例：ClearBuds（MobiSys 2022）两耳同步误差 < 64 µs（https://arxiv.org/abs/2206.13611）；TWS 播放侧左右同步通常 < 25 µs（audioXpress LE Audio 测试指南）。完整数据流规格见附录 A1。");
  table(s, [
    [head("数据"), head("从 → 到"), head("格式"), head("速率")],
    [bold("定位音频"), cell("副耳 → 主耳"), cell("1 路 PCM 16 kHz / 16 bit，带时间戳"), ctr("256 kbps")],
    [bold("人脸元数据"), cell("NPU → 主耳"), cell("每张脸 16 字节（方位、唇动分数等）"), ctr("≤ 1.2 kB/s")],
    [bold("定位结果"), cell("主耳 → 两耳增强"), cell("每 16 ms 8 字节"), ctr("0.5 kB/s")],
    [bold("图像"), cell("传感器 → NPU"), cell("不出模组，只输出检测结果"), ctr("—")],
  ], 0.5, 1.5, [1.45, 1.75, 3.5, 1.2], [0.4, 0.5, 0.5, 0.5, 0.5]);
  T(s, "耳间编码", { x: 0.5, y: 4.2, w: 3, h: 0.35, fontSize: 13, bold: true, color: C.navy, valign: "middle" });
  bullets(s, ["PCM 16 bit（首选）：相位信息完整；链路每侧约 2.6 mW（估算）",
    "ADPCM 4 bit（64 kbps）：功耗约 1/4；对测向的影响【待确认】",
    "LC3（32 kbps）：感知编码可能破坏相位，不用于定位"], 0.5, 4.6, 7.4, 1.4, { fontSize: 12 });
  s.addChart(p.charts.LINE, [{ name: "≤10° 的比例", labels: ["0", "10", "25", "50", "100", "200"], values: [63, 61, 61, 60, 8, 7] }],
    Object.assign({ x: 8.3, y: 1.45, w: 4.5, h: 3.9, chartColors: [C.navy], lineSize: 2, lineDataSymbol: "circle", lineDataSymbolSize: 7,
      showValue: true, dataLabelPosition: "t", valAxisMinVal: 0, valAxisMaxVal: 80, showLegend: false,
      showTitle: true, title: "两耳同步误差 vs 测向精度（仿真）", showCatAxisTitle: true, catAxisTitle: "同步误差（µs）", catAxisTitleFontSize: 10, catAxisTitleColor: "404040", catAxisTitleFontFace: F,
      showValAxisTitle: true, valAxisTitle: "≤10° 的比例（%）", valAxisTitleFontSize: 10, valAxisTitleColor: "404040", valAxisTitleFontFace: F }, chartText));
  T(s, "超过 50 µs（不到 1 个采样点）后精度崩溃", { x: 8.3, y: 5.4, w: 4.5, h: 0.35, fontSize: 11.5, bold: true, color: C.red, align: "center", valign: "middle" });
}

// ================= 8 麦克风数量 =================
{
  const s = newSlide("耳机上用几个麦克风：4 / 6 / 8 麦", "每耳 2 麦即可，定位时副耳只转发 1 路；6 / 8 麦的精度提升与统计误差同量级，带宽却成倍增加",
    SRC_SIM + "设置：混响 RT60 0.5 s、2 个干扰说话人、SNR 10 dB；各配置用同一批 100 个场景；GEVD-MUSIC，开口后 0.5 s 判决。统计误差约 ±4 个百分点。加视觉后各配置为 95–97%（干扰低 6 dB）、79–84%（干扰同样响）。带宽按 16 kHz / 16 bit PCM。");
  const labels = ["主耳2+副耳1", "每耳 2", "主耳3+副耳1", "每耳 3", "每耳 4"];
  s.addChart(p.charts.BAR, [
    { name: "干扰比目标低 6 dB", labels, values: [90, 91, 91, 92, 94] },
    { name: "干扰与目标一样响", labels, values: [64, 66, 64, 72, 72] },
  ], Object.assign({ x: 0.5, y: 1.45, w: 6.6, h: 4.5, barDir: "col", barGrouping: "clustered", chartColors: [C.navy, C.s2],
    showValue: true, dataLabelPosition: "outEnd", valAxisMinVal: 0, valAxisMaxVal: 100, showLegend: true, legendPos: "t",
    showTitle: true, title: "测向精度：方位误差 ≤10° 的比例（%，纯声学）" }, chartText));
  s.addChart(p.charts.BAR, [{ name: "耳间带宽", labels, values: [256, 512, 256, 768, 1024] }],
    Object.assign({ x: 7.3, y: 1.45, w: 5.5, h: 4.5, barDir: "col", chartColors: [C.navy2], showValue: true, dataLabelPosition: "outEnd",
      valAxisMinVal: 0, valAxisMaxVal: 1200, showLegend: false, showTitle: true, title: "副耳 → 主耳带宽（kbps）" }, chartText));
  T(s, "推荐：每耳 2 麦，主耳用本耳 2 路 + 副耳 1 路共 3 路测向。若增强采用两耳组阵（第 11 页），麦克风与链路需按增强需求重新确定。",
    { x: 0.5, y: 6.05, w: 11.0, h: 0.45, fontSize: 12, color: C.text, valign: "middle" });
}

// ================= 9 摄像头分辨率 =================
{
  const s = newSlide("摄像头要看清嘴：分辨率与视场", "低分辨率（QVGA）在 2 m 外嘴只有约 3 个像素；需要 720p 级、视场约 80°，并只在需要时读出嘴部区域",
    "嘴宽像素按小孔成像估算（嘴宽约 5 cm）。参考：低分辨率视频中嘴部约 45 × 17 像素时仍能做唇动检测（Liu 等，https://personalpages.surrey.ac.uk/w.wang/papers/LiuWJ_SSPD_2011.pdf）；未找到最小像素数的系统结论，20 像素门槛需视觉同事确认。人脸检测要求低得多（轻量检测器可处理小于 16 像素的人脸，SCRFD，https://arxiv.org/abs/2105.04714）。");
  const d = [1, 1.5, 2, 2.5, 3];
  const px = (W, fov) => d.map((x) => Math.round((W / 2) / Math.tan((fov / 2) * Math.PI / 180) * 0.05 / x));
  const labels = d.map((x) => x + " m");
  s.addChart(p.charts.LINE, [
    { name: "QVGA / 100°", labels, values: px(320, 100) },
    { name: "VGA / 100°", labels, values: px(640, 100) },
    { name: "720p / 80°（推荐）", labels, values: px(1280, 80) },
    { name: "1080p / 100°", labels, values: px(1920, 100) },
    { name: "设计目标 20 像素", labels, values: d.map(() => 20) },
  ], Object.assign({ x: 0.5, y: 1.45, w: 7.4, h: 4.7, chartColors: [C.s3, C.s2, C.navy, C.navy2, C.red], lineSize: 2, lineDataSymbol: "circle", lineDataSymbolSize: 6,
    valAxisMinVal: 0, valAxisMaxVal: 45, showLegend: true, legendPos: "r", showTitle: true, title: "对方嘴宽在画面中的像素数（估算）",
    showCatAxisTitle: true, catAxisTitle: "对方距离", catAxisTitleFontSize: 10, catAxisTitleColor: "404040", catAxisTitleFontFace: F }, chartText));
  T(s, "两级读出", { x: 8.3, y: 1.5, w: 4.5, h: 0.4, fontSize: 14, bold: true, color: C.navy, valign: "middle" });
  box(s, "平时：整幅画面合并像素\n（低分辨率，1–2 fps）", 8.3, 2.0, 4.5, 0.75, { fill: "FFFFFF" });
  line(s, 10.55, 2.75, 10.55, 3.05);
  box(s, "人脸检测 → 得到人脸框", 8.3, 3.05, 4.5, 0.55, { fill: "FFFFFF" });
  line(s, 10.55, 3.6, 10.55, 3.9);
  box(s, "需要时：只读嘴部区域原分辨率\n（约 64 × 64 像素，10–15 fps）→ 唇动", 8.3, 3.9, 4.5, 0.85);
  bullets(s, ["省读出带宽和 NPU 算力；图像不出模组", "代价：传感器比 QVGA 贵、功耗更高（见第 12 页）"], 8.3, 4.95, 4.5, 1.1, { fontSize: 11.5 });
}

// ================= 10 输出信号 =================
{
  const s = newSlide("耳机怎么输出信号", "定位只输出方位等控制量，不进入声音通路；声音由增强模块输出，以下为接口和要求",
    "开口后约 0.5 s 锁定为仿真中的判决窗；已在说话人地图中的人轮到他说话时可立即切换，只有新加入的人有此延迟。");
  T(s, "定位结果（我们输出，每 16 ms 一条，8 字节）", { x: 0.5, y: 1.5, w: 5.6, h: 0.4, fontSize: 13, bold: true, color: C.navy, valign: "middle" });
  table(s, [
    [head("字段"), head("含义", { align: "left" })],
    [bold("目标方位"), cell("头部坐标，0.01°")],
    [bold("置信度"), cell("0–1")],
    [bold("是否在说话"), cell("目标此刻是否在说话")],
    [bold("干扰方位 × 3"), cell("主要干扰方位，供增强置零")],
    [bold("序号"), cell("丢包检测")],
  ], 0.5, 2.0, [1.8, 3.8], [0.4, 0.45, 0.45, 0.45, 0.45, 0.45]);
  T(s, "声音输出（增强模块负责）", { x: 6.7, y: 1.5, w: 6, h: 0.4, fontSize: 13, bold: true, color: C.navy, valign: "middle" });
  bullets(s, ["增强目标方向的语音；目标没在说话时降低增强量，避免放大噪声",
    "两耳都播放增强后的目标语音；建议按目标方位加简单的左右电平差与时间差，保留方向感【待确认】",
    "与透传环境声混合，比例可调（默认目标高约 6–12 dB【待确认】），总输出过限幅器",
    "骨声纹检测到佩戴者说话时，降低透传中自己声音的增益",
    "声音通路时延：入耳式 ≤ 约 10–20 ms，开放式 ≤ 约 5–6 ms"], 6.7, 2.0, 6.1, 3.8, { fontSize: 12.5 });
}

// ================= 11 增强架构三选一 =================
{
  const s = newSlide("关键风险：增强能否分开相邻的人", "能分开相邻说话人的两种做法，声音通路时延都处在入耳式容忍度的边缘",
    "信干比提升为理论计算：刚性球头部模型，已知干扰方位的 MVDR 置零，设计方位误差 2–3°，白噪声增益 ≥ −10 dB，直达混响比 0 dB，0.5–4 kHz 平均（code/earbud_ssl/scripts/null_rejection.py）。\n时延：B 的星闪约 20 ms、蓝牙 15–40 ms 为第三方评测的手机到耳机时延（https://ngxptech.com/huawei-freebuds-pro-5-review-is-nearlink-better/），耳机之间专用链路未知；C 的 17.5 ms 来自 Wireless Hearables With Programmable Speech AI Accelerators（https://arxiv.org/pdf/2503.18698），Look Once to Hear 目标 < 20 ms。容忍度：Stone & Moore 2008。\n定位侧输出对三种方案通用。");
  s.addChart(p.charts.BAR, [{ name: "信干比提升", labels: ["A 本地 2 麦", "B 两耳组阵"], values: [2.4, 8.3] }],
    Object.assign({ x: 0.5, y: 1.45, w: 5.4, h: 2.7, barDir: "bar", chartColors: [C.red, C.navy], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0",
      valAxisMinVal: 0, valAxisMaxVal: 10, showLegend: false, showTitle: true, title: "对相隔 25° 的干扰，信干比提升（dB，理论，混响下）" }, chartText));
  T(s, "C 不依赖阵列孔径：Look Once to Hear 可在多人中只放大目标（研究报告）", { x: 0.5, y: 4.2, w: 5.4, h: 0.5, fontSize: 11, color: C.gray, valign: "middle" });
  const X0 = 6.5, X1 = 12.7, ms = (v) => X0 + (X1 - X0) * v / 30, Y = 2.55;
  T(s, "声音通路时延与容忍度（ms）", { x: X0, y: 1.5, w: 6.2, h: 0.35, fontSize: 11, bold: true, color: "404040", valign: "middle" });
  rect(s, ms(0), Y - 0.45, ms(6) - ms(0), 0.9, C.band1);
  rect(s, ms(10), Y - 0.45, ms(20) - ms(10), 0.9, C.band2);
  T(s, "开放式\n≤ 5–6", { x: ms(0), y: Y - 0.42, w: ms(6) - ms(0), h: 0.5, fontSize: 9.5, color: C.green, align: "center" });
  T(s, "入耳式 ≤ 10–20", { x: ms(10), y: Y - 0.42, w: ms(20) - ms(10), h: 0.3, fontSize: 9.5, color: C.band2t, align: "center" });
  line(s, X0, Y + 0.45, X1, Y + 0.45, { arrow: false, color: "404040", width: 1 });
  [0, 5, 10, 15, 20, 25, 30].forEach((v) => { line(s, ms(v), Y + 0.45, ms(v), Y + 0.53, { arrow: false, color: "404040", width: 1 });
    T(s, String(v), { x: ms(v) - 0.25, y: Y + 0.55, w: 0.5, h: 0.25, fontSize: 9.5, color: "404040", align: "center" }); });
  const mark = (v1, v2, y, label, color) => { rect(s, ms(v1), y, Math.max(ms(v2) - ms(v1), 0.08), 0.22, color);
    T(s, label, { x: ms(v2) + 0.08, y: y - 0.04, w: 12.83 - (ms(v2) + 0.08), h: 0.3, fontSize: 10, color, valign: "middle" }); };
  mark(1, 5, Y + 0.95, "A：本地处理，几 ms", C.green);
  mark(17.5, 22, Y + 1.3, "B：约 20 ms 起", C.red);
  mark(17.5, 20, Y + 1.65, "C：约 17.5–20 ms（研究报告）", C.red);
  table(s, [
    [head(""), head("A 本地增强"), head("B 两耳组阵增强"), head("C 目标说话人提取")],
    [bold("能否分开相邻的人"), ctr("基本不能（约 2 dB）", { color: C.red }), ctr("能（约 8 dB）"), ctr("能")],
    [bold("入耳式时延"), ctr("满足"), ctr("临界", { color: C.red }), ctr("临界", { color: C.red })],
    [bold("开放式时延"), ctr("满足"), ctr("不满足"), ctr("不满足")],
    [bold("场景价值"), ctr("与已有产品差别小"), ctr("有"), ctr("有")],
  ], 0.5, 4.85, [2.4, 3.3, 3.3, 3.33], [0.36, 0.38, 0.38, 0.38, 0.38]);
}

// ================= 12 功耗 =================
{
  const s = newSlide("功耗：以 FreeClip 2 S 为基准", "按推荐配置，续航约从 6 h 降到 4.5–5.2 h；主要变数是摄像头唇动档和 NPU（尚无数据）",
    "基准：FreeClip 2 S 每只耳机 60 mAh、通话续航 6 h（华为官网 https://consumer.huawei.com/hk/headphones/freeclip2-s/specs/），按 3.7 V 推算约 37 mW / 只；每多 1 mW 续航约少 10 分钟。各部分估算见附录 A3。NPU 功耗未计入。");
  const X0 = 3.3, X1 = 11.0, h2x = (v) => X0 + (X1 - X0) * v / 6.5;
  const rows = [["基准（通话）", 6.0, 6.0, C.gray], ["A，唇动档极少触发", 5.3, 5.4, C.navy], ["A + 推荐配置", 4.5, 5.2, C.navy], ["B（再加双向传音频）", 4.1, 4.9, C.navy2], ["C（再加网络推理）", null, null, C.light]];
  rows.forEach(([name, lo, hi, color], i) => {
    const y = 1.65 + i * 0.72;
    T(s, name, { x: 0.5, y, w: 2.7, h: 0.45, fontSize: 12.5, bold: i === 2, align: "right", valign: "middle" });
    if (lo === null) { T(s, "【待确认】网络推理功耗未知", { x: X0 + 0.05, y, w: 5, h: 0.45, fontSize: 12, color: C.light, valign: "middle" }); return; }
    rect(s, X0, y + 0.07, h2x(lo) - X0, 0.32, color);
    if (hi > lo) rect(s, h2x(lo), y + 0.07, h2x(hi) - h2x(lo), 0.32, C.s3);
    T(s, lo === hi ? `${lo} h` : `${lo}–${hi} h`, { x: h2x(hi) + 0.1, y, w: 1.4, h: 0.45, fontSize: 12.5, bold: i === 2, valign: "middle" });
  });
  line(s, X0, 5.3, X1, 5.3, { arrow: false, color: "404040", width: 1 });
  [0, 1, 2, 3, 4, 5, 6].forEach((v) => { line(s, h2x(v), 5.3, h2x(v), 5.38, { arrow: false, color: "404040", width: 1 });
    T(s, v + " h", { x: h2x(v) - 0.3, y: 5.4, w: 0.6, h: 0.25, fontSize: 10, color: "404040", align: "center" }); });
  T(s, "浅色段为估算区间", { x: X0, y: 5.7, w: 4, h: 0.3, fontSize: 10, color: C.light });
  rect(s, 11.35, 1.6, 1.48, 3.6, C.pale);
  T(s, "新增功耗大头", { x: 11.4, y: 1.7, w: 1.38, h: 0.3, fontSize: 11, bold: true, color: C.navy, align: "center" });
  T(s, "摄像头唇动档\n1.5–8 mW\n\n定位计算\n≤ 3 mW\n\n耳间音频\n0.7–2.6 mW\n\n监测档\n0.4–0.8 mW", { x: 11.4, y: 2.05, w: 1.38, h: 3.1, fontSize: 10, color: C.text, align: "center" });
}

// ================= 13 明显问题排查 =================
{
  const s = newSlide("明显问题排查", "12 项中，1 项为关键风险；摄像头分辨率等 4 项可通过设计解决；其余不致命或需要决策",
    "视觉变差（唇动错 30%、方位误差 6°、检出 70%、开口时刻误差 ±0.3 s）的仿真：定位仍 68–83%，仅视觉 38–46%。各项依据见前文各页与 明显问题排查.md。");
  const groups = [
    { x: 0.5, y: 1.45, w: 6.05, h: 1.75, title: "关键风险", color: C.red, fill: C.redPale, items: ["增强能否分开相邻说话人：本地 2 麦约 2 dB；两耳组阵或目标说话人提取时延约 17.5–20 ms 起（第 11 页）", "相对已有产品的增量价值：取决于上一项"] },
    { x: 6.78, y: 1.45, w: 6.05, h: 1.75, title: "可通过设计解决", color: C.navy, fill: C.pale, items: ["摄像头看不清嘴 → 720p 级 + 嘴部区域读出", "声音通路时延 → 定位走旁路，增强在本地（架构 A）", "两耳带宽与同步 → 只转发 1 路；同步 ≤ 50 µs 待确认", "开放式形态更难 → 推荐入耳式"] },
    { x: 0.5, y: 3.4, w: 6.05, h: 2.0, title: "不致命", color: C.green, fill: C.greenPale, items: ["功耗：续航约 4.5–5.2 h（估算）", "摄像头看不到：软融合平稳降级（视觉很差时仍 68–83%）", "锁定慢：已在地图中的人可立即切换", "佩戴者自己说话：骨声纹检测，冻结定位"] },
    { x: 6.78, y: 3.4, w: 6.05, h: 2.0, title: "需要决策或复核", color: C.gray, fill: C.grayPale, items: ["社交接受度、拍摄隐私 → 图像不出模组、指示灯（产品决策）", "仿真与真实差距 → 需样机、实测头部数据、视觉真实指标"] },
  ];
  groups.forEach((g) => {
    rect(s, g.x, g.y, g.w, g.h, g.fill);
    T(s, g.title, { x: g.x + 0.18, y: g.y + 0.1, w: g.w - 0.3, h: 0.38, fontSize: 14, bold: true, color: g.color, valign: "middle" });
    bullets(s, g.items, g.x + 0.12, g.y + 0.5, g.w - 0.25, g.h - 0.55, { fontSize: 11.5 });
  });
  T(s, "结论：没有发现必须放弃的问题；关键风险需要相关同事给出两个数字后才能判断（下一页）。", { x: 0.5, y: 5.6, w: 12.3, h: 0.45, fontSize: 13, bold: true, color: C.text, valign: "middle" });
}

// ================= 14 需要确认 =================
{
  const s = newSlide("需要确认的事项", "前两项决定场景能否提供增量价值；定位侧可以先按本方案推进",
    "若第 1、2 项都做不到，场景价值会明显下降，可收窄为“知道谁在说话、他在哪”。");
  const items = [["耳机之间专用链路的时延能做到多少", "决定两耳组阵增强（B）是否可行", "链路 / 芯片"],
    ["目标说话人提取在耳机芯片上的时延与功耗", "决定 C 是否可行", "增强 / 芯片"],
    ["两耳采样同步能否 ≤ 50 µs", "两耳组阵定位的前提", "链路 / 芯片"],
    ["唇动检测需要嘴部多少像素；NPU 功耗与精度", "决定摄像头分辨率与功耗", "视觉"],
    ["佩戴形态：入耳式还是开放式", "开放式时延要求约 5–6 ms，增强更难", "产品"]];
  T(s, "需要谁", { x: 8.0, y: 1.3, w: 3, h: 0.3, fontSize: 11, color: C.light, valign: "middle" });
  items.forEach(([what, why, who], i) => {
    const y = 1.65 + i * 0.8, key = i < 2;
    s.addShape(p.shapes.OVAL, { x: 0.5, y: y + 0.08, w: 0.5, h: 0.5, fill: { color: key ? C.red : C.navy }, line: { type: "none" } });
    T(s, String(i + 1), { x: 0.5, y: y + 0.08, w: 0.5, h: 0.5, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
    T(s, what, { x: 1.2, y: y, w: 6.5, h: 0.4, fontSize: 14, bold: true, valign: "middle" });
    T(s, why, { x: 1.2, y: y + 0.38, w: 6.5, h: 0.32, fontSize: 11.5, color: C.gray, valign: "middle" });
    T(s, who, { x: 8.0, y: y + 0.08, w: 3, h: 0.5, fontSize: 12.5, color: C.navy, valign: "middle" });
  });
  rect(s, 0.5, 5.85, 12.33, 0.6, C.grayPale);
  T(s, "若第 1、2 项都做不到：场景可收窄为“知道谁在说话、他在哪”，配合字幕或转写使用。", { x: 0.7, y: 5.85, w: 12, h: 0.6, fontSize: 12.5, valign: "middle" });
}

// ================= 附录 =================
{
  const s = newSlide("附录 A1　数据流规格", "", "同步要求见第 7 页；编码取舍：PCM 首选，ADPCM 待验证，LC3 不用于定位。");
  table(s, [
    [head("数据流"), head("从 → 到"), head("内容与格式", { align: "left" }), head("速率"), head("时延要求")],
    [bold("麦克风采集"), cell("麦克风 → 本耳芯片"), cell("数字麦 PDM → PCM 16 kHz / 16 bit；32 ms 帧、16 ms 帧移"), ctr("每路 256 kbps（片内）"), ctr("—")],
    [bold("定位音频"), cell("副耳 → 主耳"), cell("1 路 PCM 16 kHz（首选 16 bit 无压缩）；带采样计数与时间戳；两耳采样同步 ≤ 50 µs"), ctr("256 kbps"), ctr("≤ 100 ms（旁路）")],
    [bold("图像"), cell("传感器 → NPU"), cell("平时低分辨率整幅；需要时嘴部区域（约 64 × 64 像素）原分辨率"), ctr("不出模组"), ctr("—")],
    [bold("人脸元数据"), cell("NPU → 主耳"), cell("每张脸 16 字节：曝光时间戳 4 B、编号 1 B、方位角 2 B、仰角 2 B、人脸框 2 B、唇动分数 1 B、置信度 1 B、保留 3 B"), ctr("≤ 1.2 kB/s"), ctr("≤ 100 ms")],
    [bold("摄像头控制"), cell("主耳 → 两耳摄像头"), cell("开 / 关、档位（监测 / 唇动）、嘴部区域坐标"), ctr("事件触发"), ctr("≤ 50 ms")],
    [bold("头部朝向"), cell("IMU → 本耳芯片"), cell("偏航角，200 Hz"), ctr("片内"), ctr("—")],
    [bold("定位结果"), cell("主耳 → 两耳增强"), cell("每 16 ms 8 字节：目标方位 2 B、置信度 1 B、是否在说话 1 B、3 个干扰方位 3 B、序号 1 B"), ctr("0.5 kB/s"), ctr("≤ 50 ms")],
  ], 0.5, 1.25, [1.4, 1.8, 5.6, 1.8, 1.73], [0.4, 0.5, 0.6, 0.5, 0.6, 0.5, 0.45, 0.6]);
}
{
  const s = newSlide("附录 A2　状态机与降级", "", "");
  table(s, [
    [head("状态"), head("进入条件", { align: "left" }), head("音频"), head("摄像头"), head("输出")],
    [bold("待机"), cell("未开启听觉辅助"), ctr("关"), ctr("关"), ctr("—")],
    [bold("建立"), cell("刚开启，或换了环境"), ctr("定位"), ctr("唇动档，直到视野里的人都确认"), ctr("无目标")],
    [bold("锁定"), cell("选中目标"), ctr("定位 + 背景递推"), ctr("监测档"), ctr("目标方位、置信度")],
    [bold("确认"), cell("新声源 / 前后判断不一致 / 置信度低 / 转头 > 30°"), ctr("定位"), ctr("唇动档，直到确认完成"), ctr("保持上一次目标")],
    [bold("降级"), cell("光线差、遮挡、目标在视野外"), ctr("纯声学"), ctr("关或监测档"), ctr("置信度降一级")],
  ], 0.5, 1.25, [1.2, 4.4, 1.9, 3.0, 1.83], [0.4, 0.42, 0.42, 0.42, 0.42, 0.42]);
  table(s, [
    [head("情况"), head("行为", { align: "left" })],
    [bold("目标在摄像头视野外"), cell("用地图记住的位置 + 声学空间谱；置信度降一级")],
    [bold("光线差、摄像头被遮挡"), cell("纯声学；开口时刻改用声学语音检测")],
    [bold("视觉说在说话、声学没有活动"), cell("不认为在说话（过滤吃东西等唇动误报）")],
    [bold("佩戴者自己在说话"), cell("冻结定位与地图更新")],
    [bold("两耳链路中断"), cell("主耳退化为本地 2 麦定位，置信度降两级")],
  ], 0.5, 4.05, [3.4, 8.93], [0.4, 0.42, 0.42, 0.42, 0.42, 0.42]);
}
{
  const s = newSlide("附录 A3　功耗分项（架构 A，每只耳机）", "",
    "器件参考：nRF5340 射频电流（https://www.nordicsemi.com/-/media/Software-and-other-downloads/Product-Briefs/nRF5340-SoC-PB.pdf），协议开销按 ×2 估；NXP RT600 内核电流（AN13468）作为计算功耗上限参考；HM0360 监测模式 140–256 µA、VGA 60 fps 约 14.5 mW（https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/4287/HM0360-MWA-00FP963.pdf）；OV02C 2 MP 约 82 mW；VueBuds 摄像头典型 < 5 mW。");
  table(s, [
    [head("部分"), head("功耗"), head("依据", { align: "left" })],
    [bold("基准：通话"), ctr("约 37 mW"), cell("FreeClip 2 S：60 mAh、通话 6 h，按 3.7 V 推算")],
    [bold("耳间定位音频"), ctr("0.7 mW（ADPCM）/ 2.6 mW（PCM）"), cell("射频约 5 nJ/bit × 协议开销 2")],
    [bold("定位与融合计算"), ctr("≤ 约 3 mW"), cell("约 12 MFLOPS，按偏老工艺 MCU 约 0.19 mW/MHz 估上限")],
    [bold("摄像头监测档"), ctr("约 0.4–0.8 mW"), cell("低功耗传感器常开监测模式")],
    [bold("摄像头唇动档（约 10% 时间）"), ctr("约 1.5–8 mW"), cell("VGA–2 MP 级传感器工作功耗 × 10%；嘴部区域读出可降低，降多少【待确认】")],
    [bold("NPU 人脸与唇动"), ctr("【待确认】"), cell("需目标芯片数据")],
    [bold("B 额外：双向传音频"), ctr("每侧 +2.6–5.2 mW"), cell("1–2 路 PCM")],
  ], 0.5, 1.25, [3.0, 3.2, 6.13], [0.4, 0.45, 0.45, 0.45, 0.45, 0.55, 0.45, 0.45]);
}
{
  const s = newSlide("附录 A4　仿真与估算方法", "", "");
  table(s, [
    [head("项目"), head("方法", { align: "left" }), head("局限", { align: "left" })],
    [bold("头部与麦克风"), cell("刚性球头部模型（解析解）；每耳 2 麦，耳柄前后间距 1.5 cm"), cell("无耳廓、躯干；佩戴偏差未建模")],
    [bold("房间"), cell("扩散混响尾近似；另做镜像声源法 3 阶墙面反射验证"), cell("墙面吸声与频率无关；无家具、人体散射")],
    [bold("场景"), cell("目标在前方 ±60°、1–2 m；2 个干扰说话人；扩散噪声；每档 72–144 次"), cell("统计误差约 ±4 个百分点")],
    [bold("视觉"), cell("按假设模拟：方位误差 2°、检出 95%、唇动错误 10%，并测了更差的两档"), cell("需视觉同事的真实指标")],
    [bold("测向"), cell("GEVD-MUSIC（唇动门控背景白化）+ 起始段加权 + 5° 网格；与 SRP-PHAT、MUSIC 等对比"), cell("算法为预研储备，整体方案确认后再正式选型")],
    [bold("增强分辨力"), cell("理论波束计算：固定超指向与已知干扰方位的 MVDR 置零"), cell("未含时变、估计噪声；不是增强算法实现")],
    [bold("功耗"), cell("FreeClip 2 S 官方电池与续航推算基准；器件取公开资料"), cell("多为检索摘要，原文未逐一核实；NPU 无数据")],
  ], 0.5, 1.25, [1.8, 6.0, 4.53], [0.4, 0.5, 0.5, 0.5, 0.5, 0.55, 0.5, 0.5]);
}

p.writeFile({ fileName: OUT }).then((f) => console.log("saved", f));
