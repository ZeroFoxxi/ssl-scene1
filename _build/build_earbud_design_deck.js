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
  s.addNotes("按“应用场景价值 → 整体设计方案 → 具体算法模型”的顺序，本次汇报整体设计方案，并排查有没有明显问题。数字为仿真或按公开资料估算，需样机复核；方法见附录 A4。");
}

// ================= 2 结论 =================
{
  const s = newSlide("整体方案结论",
    "数字为仿真（刚性球头部模型）或按公开资料估算，需样机复核；各项详见后续页",
    "本页汇总整体方案的主要结论。关键风险在第 11 页，需要确认的事项在第 14 页。");
  table(s, [
    [head("项目"), head("结论")],
    [bold("运行位置与算力"), cell("全部端侧、离线；定位与融合在主耳音频 DSP，约 12 MFLOPS，方向模板约 120–250 KB（估算）")],
    [bold("定位侧架构"), cell("两耳之间只为定位传 1 路音频（旁路），不进入声音通路；这部分对三种增强方案都通用")],
    [bold("增强侧架构"), cell("三种方案未定：本地增强时延最低但分不开相邻的人；两耳组阵能分开但需几毫秒级耳间音频链路；目标说话人提取时延在边缘（第 11 页）")],
    [bold("麦克风"), cell("每耳 2 个即可；6 / 8 麦在仿真中精度提升不明显，耳间带宽却增加 2–4 倍")],
    [bold("耳机与摄像头"), cell("同时运行；一次定位中，声音先发现说话人，唇动给出开口时刻，声学随后测向")],
    [bold("摄像头"), cell("建议每只耳机 1 个朝前，720p 级、视场约 80°；平时低分辨率找人脸，需要时只读嘴部区域。像素门槛、唇动精度、NPU 功耗【待确认，视觉同事】")],
    [bold("功耗"), cell("以 FreeClip 2 S 为基准（约 37 mW / 只，通话 6 h），新增约 6–13 mW，续航约 4.5–5.2 h（未含 NPU）")],
    [bold("关键风险", { color: C.red }), cell("定位能找到要听的人，但“只放大他”要靠增强把相隔 20–30° 的人分开：单只耳机 2 麦只提升约 2 dB，分不开；两耳组阵约 8 dB，前提是两耳间有几毫秒级的音频链路（助听器有，蓝牙 / 星闪约 15–40 ms 不够）；目标说话人提取约 17.5–20 ms，在入耳式容忍度边缘", { color: C.red })],
    [bold("说话人移动"), cell("后续扩展：说话人地图中每个人从固定方位改为方位 + 角速度跟踪，视觉负责身份延续；12 月仿真")],
    [bold("需要确认"), cell("耳机之间能否有几毫秒级的音频链路；目标说话人提取在耳机芯片上的时延与功耗；两耳采样同步能否 ≤ 50 µs")],
  ], 0.6, 1.4, [1.9, 10.2], [0.38, 0.42, 0.42, 0.42, 0.42, 0.42, 0.62, 0.42, 0.85, 0.42, 0.42]);
}

// ================= 3 场景价值 =================
{
  const s = newSlide("应用场景与已有产品对比",
    "来源：HearingTracker、Hearing Review、Look Once to Hear（CHI 2024）、VueBuds（CHI 2026）；“能 / 否”为根据公开描述的判断",
    "来源：\nHearingTracker（Meta Ray-Ban Gen 2 Conversation Focus，5–6 麦阵列）https://www.hearingtracker.com/news/meta-ray-ban-gen-2-conversation-focus-ai-speech-enhancement-for-hearing-loss\nHearing Review（AirPods Pro Conversation Boost）https://hearingreview.com/inside-hearing/events/apple-announces-conversation-boost-for-airpods-pro\nLook Once to Hear（CHI 2024）https://arxiv.org/html/2405.06289v2\nVueBuds（CHI 2026）https://arxiv.org/abs/2603.29095\n助听器耳间链路：检索摘要提及 Signia e2e，原文未核实。");
  const Y = (t) => ctr(t || "能"), N = (t) => ctr(t || "否", { color: C.light }), D = () => ctr("—", { color: C.light });
  table(s, [
    [head("产品 / 研究"), head("增强正前方", { align: "center" }), head("多人中只增强一个人", { align: "center" }), head("转头后仍跟住", { align: "center" }), head("无需注册", { align: "center" }), head("耳机形态", { align: "center" }), head("做法")],
    [bold("AirPods Pro 对话增强、听力辅助"), Y(), N(), N(), Y(), Y(), cell("波束聚焦正前方；听力辅助按听力图补偿")],
    [bold("Meta Ray-Ban Gen 2 Conversation Focus"), Y(), N(), N(), Y(), N(), cell("镜腿 5–6 麦阵列波束成形")],
    [bold("助听器双耳指向"), Y(), N(), N(), Y(), Y(), cell("专用耳间链路组成双耳阵列，按头朝向")],
    [bold("Look Once to Hear（CHI 2024）"), Y(), Y(), Y(), N(), Y(), cell("先看着目标几秒注册声纹，再做目标说话人提取")],
    [bold("VueBuds（CHI 2026）"), D(), D(), D(), D(), Y(), cell("耳机装摄像头做视觉问答，不做听觉辅助")],
    [bold("本方案", { color: C.navy }), Y(), ctr("能，有前提", { color: C.red }), Y(), Y(), Y(), cell("摄像头人脸 + 唇动，与两耳定位融合，自动锁定")],
  ], 0.6, 1.55, [3.1, 1.15, 1.6, 1.25, 1.0, 1.0, 3.0], [0.45, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55]);
  T(s, "前提：增强侧能把相隔 20–30° 的相邻说话人分开，见第 11 页。目标用户：听力损失或老年人群；嘈杂场合本来就戴着耳机的普通用户。",
    { x: 0.6, y: 5.6, w: 12.1, h: 0.5, fontSize: 12, color: C.gray, valign: "middle" });
}

// ================= 4 整体架构 =================
{
  const s = newSlide("整体架构",
    "图中增强按本地方案（A）画出，两耳组阵（B）和目标说话人提取（C）见第 11 页；时延容忍度：入耳式约 10–20 ms，开放式约 5–6 ms（Stone & Moore 2008）",
    "定位与融合运行在主耳，图中居中画出是为了表示它汇集两耳的数据。Stone & Moore 2008：https://www.researchgate.net/publication/5266175_Tolerable_Hearing_Aid_Delays_V_Estimation_of_Limits_for_Open_Canal_Fittings");
  T(s, "副耳", { x: 0.6, y: 1.5, w: 4.4, h: 0.3, fontSize: 12.5, bold: true, color: C.gray, align: "center" });
  T(s, "主耳", { x: 8.33, y: 1.5, w: 4.4, h: 0.3, fontSize: 12.5, bold: true, color: C.gray, align: "center" });
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
    [bold("视觉"), cell("人脸方位、唇动分数、开口时刻"), cell("几十毫秒可接受"), cell("人脸元数据")],
  ], 0.6, 5.2, [1.4, 6.2, 2.5, 2.0], [0.36, 0.38, 0.38, 0.38]);
}

// ================= 5 协同时序 =================
{
  const s = newSlide("耳机与摄像头的协同时序",
    "摄像头常开约占通话功耗的 5–40%（视传感器而定），所以平时只做低分辨率监测；状态机见附录 A2",
    "摄像头档位：监测档（低分辨率 1–2 fps）、唇动档（嘴部区域 10–15 fps，与《技术洞察》的视觉帧率一致）。");
  const xs = [1.6, 3.48, 5.36, 7.24, 9.12, 11.0], w = 1.73;
  ["平时", "对方开口", "约 0.1 s", "0.1–0.5 s", "约 0.5 s", "之后"].forEach((t, i) => {
    T(s, t, { x: xs[i], y: 1.55, w, h: 0.35, fontSize: 12.5, bold: true, color: C.navy, align: "center", valign: "middle" });
  });
  line(s, 1.6, 1.95, 12.73, 1.95, { arrow: true, color: C.navy, width: 1.25 });
  T(s, "音频", { x: 0.6, y: 2.2, w: 0.9, h: 0.85, fontSize: 13, bold: true, valign: "middle" });
  T(s, "摄像头", { x: 0.6, y: 3.25, w: 0.9, h: 0.85, fontSize: 13, bold: true, valign: "middle" });
  const audio = ["持续估计背景", "", "（1）发现有人说话；拿不准时叫醒摄像头", "（3）按开口时刻测向", "（4）融合，锁定目标", "下发目标方位；IMU 补偿转头"];
  const cam = ["低分辨率监测，1–2 fps", "", "切到唇动档，10–15 fps", "（2）唇动给出开口时刻", "人脸方位、唇动参与打分", "回到监测"];
  audio.forEach((t, i) => { if (t) box(s, t, xs[i], 2.2, w, 0.85, { text: { fontSize: 11 } }); });
  cam.forEach((t, i) => { if (t) box(s, t, xs[i], 3.25, w, 0.85, { text: { fontSize: 11 } }); });
  line(s, xs[2] + w / 2, 3.05, xs[2] + w / 2, 3.25, { color: C.navy });
  line(s, xs[3] + w / 2, 3.25, xs[3] + w / 2, 3.05, { color: C.navy });
  para(s, ["同时处理：音频一直在跑（每 16 ms 一帧，功耗低）；摄像头平时只做低分辨率监测。",
    "一次定位里有先后：（1）声音先发现有人说话 →（2）唇动给出开口时刻 →（3）声学按这个时刻测向 →（4）融合锁定。",
    "视觉晚到几十毫秒不影响结果：两路按采样 / 曝光时刻对齐，说话人位置记在世界坐标里，转头由 IMU 补偿。"], 0.6, 4.55, 12.1, 2.0);
}

// ================= 6 融合流程 =================
{
  const s = newSlide("声学与视觉融合流程",
    SIM + "；软融合参数在单独的开发数据上确定",
    "软融合：每个候选人的得分 = 空间谱在其方位 ±8° 内的最大值 + 0.1 ×（唇动分数 − 0.5）；空间谱峰值本身也作为“无人脸”候选，得分 = 峰值 − 0.05。只在唇动分数高的人脸里选的硬规则，在唇动误判时会排除目标，仿真中比纯声学低约 5 个百分点。降级规则见附录 A2。");
  const steps = [["头部朝向", "积分 IMU 偏航角"], ["自语音判断", "佩戴者说话时跳过本帧"], ["背景更新", "只用目标嘴闭上超过 0.2 s 的帧"],
    ["声学测向", "开口后的帧，背景白化后扫描 72 个方向"], ["说话人地图", "视觉结果换到世界坐标"],
    ["软融合", "声学得分 + 唇动加分，保留纯声学候选"], ["新声源", "没有人脸对应时，摄像头切唇动档"], ["锁定与切换", "正前方 ±30° 内在说话的人"], ["输出", "目标方位下发两耳"]];
  const w = 2.2, h = 1.0, gx = 0.28;
  steps.forEach(([t, d], i) => {
    const row = Math.floor(i / 5), col = i % 5, x = 0.6 + col * (w + gx), y = 1.6 + row * 1.5;
    const key = i === 2 || i === 3;
    s.addShape(p.shapes.RECTANGLE, { x, y, w, h, fill: { color: "FFFFFF" }, line: { color: key ? C.navy : C.box, width: key ? 1.5 : 0.75 } });
    T(s, `${i + 1}. ${t}`, { x: x + 0.12, y: y + 0.1, w: w - 0.24, h: 0.32, fontSize: 12.5, bold: true, color: key ? C.navy : C.ink });
    T(s, d, { x: x + 0.12, y: y + 0.46, w: w - 0.24, h: 0.5, fontSize: 11, color: C.gray });
    if (col < 4 && i < steps.length - 1) line(s, x + w, y + h / 2, x + w + gx, y + h / 2);
  });
  line(s, 0.6 + 4 * (w + gx) + w / 2, 1.6 + h, 0.6 + w / 2, 1.6 + 1.5, { dash: "dash" });
  para(s, ["第 3、4 步依赖唇动给出的时刻，这是音频与视觉协同的具体环节（深蓝框）。",
    "有 2 个干扰说话人时，用唇动门控的背景白化，方位误差 ≤ 10° 的比例从 58% 升到 96%（仿真）。",
    "第 6 步保留纯声学候选：视觉差或缺失时只剩声学结果，仿真中从未比纯声学差。",
    "说话人移动（后续）：地图中每个人从固定方位改为方位 + 角速度跟踪；视觉负责“是同一个人”，人走出视野后靠声学继续跟。"], 0.6, 4.6, 12.1, 2.1);
}

// ================= 7 传输与编码 =================
{
  const s = newSlide("输入传输与编码格式",
    SIM + "；同步先例：ClearBuds（MobiSys 2022）< 64 µs；完整规格见附录 A1",
    "同步实验：混响 RT60 0.5 s、2 个干扰说话人，开口后 0.5 s 判决，每档 72 次。ClearBuds：https://arxiv.org/abs/2206.13611；TWS 播放侧左右同步通常 < 25 µs（audioXpress LE Audio 测试指南）。LC3 码率与时延：https://www.forasoft.com/learn/audio-for-video/articles-audio/lc3-lc3plus-bluetooth-le-audio");
  table(s, [
    [head("数据"), head("从 → 到"), head("格式"), head("速率", { align: "center" })],
    [bold("定位音频"), cell("副耳 → 主耳"), cell("1 路 PCM 16 kHz / 16 bit，带时间戳"), ctr("256 kbps")],
    [bold("人脸元数据"), cell("NPU → 主耳"), cell("每张脸 16 字节（方位、唇动分数等）"), ctr("≤ 1.2 kB/s")],
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

// ================= 8 麦克风数量 =================
{
  const s = newSlide("麦克风数量（4 / 6 / 8 麦）",
    SIM + "；同一批 100 个场景，混响 + 2 个干扰说话人；统计误差约 ±4 个百分点",
    "设置：混响 RT60 0.5 s、2 个干扰说话人、SNR 10 dB；GEVD-MUSIC，开口后 0.5 s 判决。加视觉后各配置为 95–97%（干扰低 6 dB）、79–84%（干扰同样响）。带宽按 16 kHz / 16 bit PCM。");
  const labels = ["主耳 2 + 副耳 1", "每耳 2", "主耳 3 + 副耳 1", "每耳 3", "每耳 4"];
  s.addChart(p.charts.BAR, [
    { name: "干扰比目标低 6 dB", labels, values: [90, 91, 91, 92, 94] },
    { name: "干扰与目标一样响", labels, values: [64, 66, 64, 72, 72] },
  ], Object.assign({ x: 0.6, y: 1.5, w: 6.7, h: 4.7, barDir: "col", barGrouping: "clustered", chartColors: [C.navy, C.navyLt],
    showValue: true, dataLabelPosition: "outEnd", valAxisMinVal: 0, valAxisMaxVal: 100, showLegend: true, legendPos: "t",
    showTitle: true, title: "方位误差 ≤10° 的比例（%，纯声学）" }, chartBase));
  s.addChart(p.charts.BAR, [{ name: "耳间带宽", labels, values: [256, 512, 256, 768, 1024] }],
    Object.assign({ x: 7.55, y: 1.5, w: 5.2, h: 4.7, barDir: "col", chartColors: ["9A9A9A"], showValue: true, dataLabelPosition: "outEnd",
      valAxisMinVal: 0, valAxisMaxVal: 1200, showLegend: false, showTitle: true, title: "副耳传到主耳的带宽（kbps）" }, chartBase));
  T(s, "推荐每耳 2 个麦克风，主耳用本耳 2 路 + 副耳 1 路共 3 路测向。6 / 8 麦的提升在统计误差（约 ±4 个百分点）以内，耳间带宽却增加 2–4 倍。若增强采用两耳组阵（第 11 页），麦克风和链路要按增强的需求重新确定。",
    { x: 0.6, y: 6.2, w: 12.1, h: 0.6, fontSize: 12, color: C.gray, valign: "middle" });
}

// ================= 9 摄像头 =================
{
  const s = newSlide("摄像头分辨率",
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
  ], Object.assign({ x: 0.6, y: 1.5, w: 7.4, h: 4.9, chartColors: ["C8C8C8", "9A9A9A", C.navy, C.navyLt, C.red], lineSize: 2, lineDataSymbol: "circle", lineDataSymbolSize: 6,
    valAxisMinVal: 0, valAxisMaxVal: 45, showLegend: true, legendPos: "r", showTitle: true, title: "对方嘴宽在画面里占多少像素" }, chartBase,
    axisTitle({ showCatAxisTitle: true, catAxisTitle: "对方距离", showValAxisTitle: true, valAxisTitle: "像素" })));
  sub(s, "两级读出", 8.4, 1.6, 4.3);
  box(s, "平时：整幅画面合并像素输出\n低分辨率，1–2 fps", 8.4, 2.05, 4.3, 0.75);
  line(s, 10.55, 2.8, 10.55, 3.1);
  box(s, "人脸检测，得到人脸框", 8.4, 3.1, 4.3, 0.55);
  line(s, 10.55, 3.65, 10.55, 3.95);
  box(s, "需要时：只读嘴部区域的原分辨率像素\n约 64 × 64，10–15 fps，判断唇动", 8.4, 3.95, 4.3, 0.85, { line: C.navy, lw: 1.5 });
  para(s, ["2 m 处嘴宽：QVGA 3 像素，720p 19 像素", "两级读出省带宽和 NPU 算力；图像不出模组", "代价：传感器比 QVGA 贵，功耗更高（第 12 页）"], 8.4, 5.0, 4.3, 1.8, { fontSize: 12 });
}

// ================= 10 输出 =================
{
  const s = newSlide("耳机输出",
    "开口后约 0.5 s 锁定为仿真中的判决窗；已在说话人地图中的人轮到他说话时可立即切换",
    "只有新加入的说话人才有约 0.5 s 的锁定延迟。");
  sub(s, "定位结果：每 16 ms 一条，8 字节", 0.6, 1.6, 8);
  const seg = [["目标方位", 2, "头部坐标，0.01°"], ["置信度", 1, "0–1"], ["在说话", 1, "目标此刻是否在说话"], ["干扰方位 × 3", 3, "主要干扰方位，供增强置零"], ["序号", 1, "丢包检测"]];
  let x = 0.6; const unit = 1.5;
  seg.forEach(([n, b, d], i) => {
    const w = b * unit;
    s.addShape(p.shapes.RECTANGLE, { x, y: 2.1, w, h: 0.6, fill: { color: i === 0 ? C.navyPale : "FFFFFF" }, line: { color: C.navy, width: 1 } });
    T(s, `${n}（${b} B）`, { x, y: 2.1, w, h: 0.6, fontSize: 12, bold: i === 0, align: "center", valign: "middle" });
    T(s, d, { x: x + 0.05, y: 2.78, w: w - 0.1, h: 0.5, fontSize: 10.5, color: C.gray, align: "center" });
    x += w;
  });
  sub(s, "声音输出（增强模块负责），接口要求", 0.6, 3.7, 8);
  para(s, ["增强目标方向的语音；目标没在说话时降低增强量，避免放大噪声。",
    "两耳播放同一路增强后的目标语音（与《技术洞察》一致）；按方位还原方向感属于音效渲染，现阶段不做。",
    "与透传环境声混合，比例可调（默认目标高约 6–12 dB，待确认），总输出过限幅器。",
    "骨声纹检测到佩戴者在说话时，降低透传中自己声音的增益。",
    "声音通路时延：入耳式 ≤ 约 10–20 ms，开放式 ≤ 约 5–6 ms。"], 0.6, 4.1, 12.1, 2.6);
}

// ================= 11 关键风险 =================
{
  const s = newSlide("关键风险：增强能否分开相邻说话人",
    "信干比为理论计算（已知干扰方位置零，混响下）；时延：蓝牙 / 星闪为第三方评测，专用链路与 C 为专利与研究报告；容忍度：Stone & Moore 2008",
    "信干比：刚性球头部模型，MVDR 置零，设计方位误差 2–3°，白噪声增益 ≥ −10 dB，直达混响比 0 dB，0.5–4 kHz 平均。\n时延：星闪约 20 ms、蓝牙 15–40 ms 为手机到耳机的第三方评测（https://ngxptech.com/huawei-freebuds-pro-5-review-is-nearlink-better/），助听器专用耳间链路（如近场磁感应，约 10 MHz）用于双耳波束成形，专利与文献中耳间交换音频的时延为 0.5–5 ms 量级（检索摘要，原文未核实；https://hearingreview.com/practice-building/practice-management/continuing-education/it-s-sync-or-stream-the-differences-between-wireless-hearing-aid-features ，https://arxiv.org/pdf/2307.08858）；本耳机能否有这样的链路待确认。C 的 17.5 ms 来自 Wireless Hearables With Programmable Speech AI Accelerators（https://arxiv.org/pdf/2503.18698），Look Once to Hear 目标 < 20 ms。定位侧的输出对三种做法通用。");
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
    "基准：FreeClip 2 S 每只 60 mAh、通话 6 h（华为官网），按 3.7 V 约 37 mW；器件功耗取公开资料；NPU 未计入；分项见附录 A3",
    "华为官网规格页：https://consumer.huawei.com/hk/headphones/freeclip2-s/specs/。每多 1 mW，续航约少 10 分钟。");
  const X0 = 3.2, X1 = 8.6, h2x = (v) => X0 + (X1 - X0) * v / 6.5;
  T(s, "续航（每只耳机，浅色段为估算区间）", { x: 0.6, y: 1.55, w: 8, h: 0.32, fontSize: 11.5, color: "404040", valign: "middle" });
  [["基准（通话）", 6.0, 6.0, "9A9A9A"], ["推荐配置", 4.5, 5.2, C.navy], ["唇动档极少触发", 5.3, 5.4, C.navy], ["两耳组阵增强（B）", 4.1, 4.9, C.navy], ["目标说话人提取（C）", null, null]].forEach(([n, lo, hi, c], i) => {
    const y = 2.05 + i * 0.68;
    T(s, n, { x: 0.6, y, w: 2.45, h: 0.4, fontSize: 12.5, bold: i === 1, align: "right", valign: "middle" });
    if (lo === null) { T(s, "网络推理功耗未知，待确认", { x: X0, y, w: 5, h: 0.4, fontSize: 12, color: C.light, valign: "middle" }); return; }
    s.addShape(p.shapes.RECTANGLE, { x: X0, y: y + 0.08, w: h2x(lo) - X0, h: 0.24, fill: { color: c }, line: NONE });
    if (hi > lo) s.addShape(p.shapes.RECTANGLE, { x: h2x(lo), y: y + 0.08, w: h2x(hi) - h2x(lo), h: 0.24, fill: { color: C.navyLt }, line: NONE });
    T(s, lo === hi ? `${lo} h` : `${lo}–${hi} h`, { x: h2x(hi) + 0.1, y, w: 1.3, h: 0.4, fontSize: 12.5, bold: i === 1, valign: "middle" });
  });
  line(s, X0, 5.55, X1, 5.55, { arrow: false, color: "7F7F7F" });
  [0, 2, 4, 6].forEach((v) => { line(s, h2x(v), 5.55, h2x(v), 5.62, { arrow: false, color: "7F7F7F" });
    T(s, v + " h", { x: h2x(v) - 0.3, y: 5.65, w: 0.6, h: 0.25, fontSize: 10, color: "595959", align: "center" }); });
  table(s, [
    [head("新增部分（每只耳机）"), head("功耗", { align: "center" })],
    [bold("摄像头唇动档（约 10% 时间）"), ctr("1.5–8 mW")],
    [bold("定位与融合计算"), ctr("≤ 3 mW")],
    [bold("耳间定位音频"), ctr("0.7–2.6 mW")],
    [bold("摄像头低分辨率监测"), ctr("0.4–0.8 mW")],
    [bold("NPU 人脸与唇动"), ctr("待确认", { color: C.light })],
    [bold("合计（不含 NPU）"), ctr("约 6–13 mW", { bold: true })],
  ], 9.3, 1.6, [2.3, 1.13], [0.4, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45]);
}

// ================= 13 明显问题排查 =================
{
  const s = newSlide("明显问题排查",
    "各项依据见前文各页",
    "视觉变差（唇动错 30%、方位误差 6°、检出 70%、开口时刻误差 ±0.3 s）的仿真：定位仍 68–83%，仅视觉 38–46%。");
  const J = (t, color) => cell(t, { color: color || C.ink, bold: true });
  table(s, [
    [head("可能的问题"), head("判断"), head("依据与解法")],
    [bold("增强能否分开相邻的说话人"), J("关键风险", C.red), cell("本地 2 麦约 2 dB；两耳组阵约 8 dB，需几毫秒级耳间音频链路（蓝牙 / 星闪不够）；目标说话人提取约 17.5–20 ms", { color: C.red })],
    [bold("相对已有产品的增量价值"), J("取决于上一项"), cell("已有产品能增强正前方；增量在于自动锁定那一个人、转头跟住、无需注册")],
    [bold("摄像头看不清嘴"), J("设计可解决"), cell("QVGA 时 2 m 外嘴宽约 3 像素；改为 720p 级 + 嘴部区域读出，约 19 像素")],
    [bold("声音通路时延"), J("设计可解决"), cell("定位走旁路、增强在本地（A）；B、C 见第一项")],
    [bold("两耳带宽与同步"), J("设计可解决，待确认"), cell("定位只转发 1 路；同步需 ≤ 50 µs（ClearBuds 先例 < 64 µs）")],
    [bold("开放式形态"), J("设计可规避"), cell("推荐入耳式；开放式时延要求约 5–6 ms，增强更难")],
    [bold("功耗与续航"), J("不致命"), cell("续航约 4.5–5.2 h（估算）；摄像头以监测为主；NPU 待确认")],
    [bold("摄像头看不到（侧脸、遮挡、暗光）"), J("不致命"), cell("软融合平稳降级；视觉很差时定位仍 68–83%（仿真）")],
    [bold("锁定慢、漏听开头"), J("不致命"), cell("已在地图中的人可立即切换；只有新加入的人约 0.5 s")],
    [bold("佩戴者自己说话"), J("不致命"), cell("骨声纹检测到自语音时冻结定位")],
    [bold("社交接受度、拍摄隐私"), J("需产品决策"), cell("图像不出模组；拍摄指示灯；只在开启听觉辅助时工作")],
    [bold("仿真与真实的差距"), J("需复核"), cell("刚性球无耳廓、混响为近似、视觉为假设；需样机和实测数据")],
  ], 0.6, 1.5, [3.4, 1.9, 6.8], [0.38, 0.42, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38]);
}

// ================= 14 需要确认 =================
{
  const s = newSlide("待确认事项",
    "若前两项都做不到，场景可收窄为“知道谁在说话、他在哪”，配合字幕或转写使用",
    "前两项决定增强能否在时延要求内分开相邻说话人，即场景能否提供增量价值。");
  table(s, [
    [head("", { align: "center" }), head("事项"), head("为什么要确认"), head("找谁")],
    [ctr("1"), bold("耳机之间能否有几毫秒级的音频链路"), cell("决定两耳组阵增强（B）是否可行；助听器有此类链路"), cell("链路、芯片")],
    [ctr("2"), bold("目标说话人提取在耳机芯片上的时延与功耗"), cell("决定 C 是否可行"), cell("增强、芯片")],
    [ctr("3"), bold("两耳采样同步能否 ≤ 50 µs"), cell("两耳组阵定位的前提"), cell("链路、芯片")],
    [ctr("4"), bold("唇动检测需要嘴部多少像素；NPU 功耗与精度"), cell("决定摄像头分辨率与功耗"), cell("视觉")],
    [ctr("5"), bold("佩戴形态：入耳式还是开放式"), cell("开放式时延要求约 5–6 ms，增强更难"), cell("产品")],
  ], 0.6, 1.6, [0.5, 5.0, 4.6, 2.0], [0.42, 0.55, 0.55, 0.55, 0.55, 0.55]);
}

// ================= 附录 =================
{
  const s = newSlide("附录 A1　数据流规格", "", "同步要求见第 7 页；编码取舍：PCM 首选，ADPCM 待验证，LC3 不用于定位。");
  table(s, [
    [head("数据流"), head("从 → 到"), head("内容与格式"), head("速率"), head("时延要求")],
    [bold("麦克风采集"), cell("麦克风 → 本耳芯片"), cell("数字麦 PDM → PCM 16 kHz / 16 bit；32 ms 帧、16 ms 帧移"), cell("每路 256 kbps（片内）"), cell("—")],
    [bold("定位音频"), cell("副耳 → 主耳"), cell("1 路 PCM 16 kHz（首选 16 bit 无压缩）；带采样计数与时间戳；两耳采样同步 ≤ 50 µs"), cell("256 kbps"), cell("≤ 100 ms（旁路）")],
    [bold("图像"), cell("传感器 → NPU"), cell("平时低分辨率整幅；需要时嘴部区域（约 64 × 64 像素）原分辨率"), cell("不出模组"), cell("—")],
    [bold("人脸元数据"), cell("NPU → 主耳"), cell("每张脸 16 字节：曝光时间戳 4 B、编号 1 B、方位角 2 B、仰角 2 B、人脸框 2 B、唇动分数 1 B、置信度 1 B、保留 3 B"), cell("≤ 1.2 kB/s"), cell("≤ 100 ms")],
    [bold("摄像头控制"), cell("主耳 → 两耳摄像头"), cell("开 / 关、档位（监测 / 唇动）、嘴部区域坐标"), cell("事件触发"), cell("≤ 50 ms")],
    [bold("头部朝向"), cell("IMU → 本耳芯片"), cell("偏航角，200 Hz"), cell("片内"), cell("—")],
    [bold("定位结果"), cell("主耳 → 两耳增强"), cell("每 16 ms 8 字节：目标方位 2 B、置信度 1 B、是否在说话 1 B、3 个干扰方位 3 B、序号 1 B"), cell("0.5 kB/s"), cell("≤ 50 ms")],
  ], 0.6, 1.5, [1.4, 1.8, 5.6, 1.7, 1.63], [0.42, 0.5, 0.6, 0.5, 0.6, 0.5, 0.45, 0.6]);
}
{
  const s = newSlide("附录 A2　状态机与降级", "", "");
  table(s, [
    [head("状态"), head("进入条件"), head("音频"), head("摄像头"), head("输出")],
    [bold("待机"), cell("未开启听觉辅助"), cell("关"), cell("关"), cell("—")],
    [bold("建立"), cell("刚开启，或换了环境"), cell("定位"), cell("唇动档，直到视野里的人都确认"), cell("无目标")],
    [bold("锁定"), cell("选中目标"), cell("定位 + 背景递推"), cell("低分辨率监测"), cell("目标方位、置信度")],
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
  const s = newSlide("附录 A3　功耗分项（本地增强方案，每只耳机）", "",
    "器件参考：nRF5340 射频电流（https://www.nordicsemi.com/-/media/Software-and-other-downloads/Product-Briefs/nRF5340-SoC-PB.pdf），协议开销按 ×2 估；NXP RT600 内核电流（AN13468）作为计算功耗上限参考；HM0360 监测模式 140–256 µA、VGA 60 fps 约 14.5 mW（https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/4287/HM0360-MWA-00FP963.pdf）；OV02C 2 MP 约 82 mW；VueBuds 摄像头典型 < 5 mW。");
  table(s, [
    [head("部分"), head("功耗"), head("依据")],
    [bold("基准：通话"), cell("约 37 mW"), cell("FreeClip 2 S：60 mAh、通话 6 h，按 3.7 V 推算")],
    [bold("耳间定位音频"), cell("0.7 mW（ADPCM）/ 2.6 mW（PCM）"), cell("射频约 5 nJ/bit × 协议开销 2")],
    [bold("定位与融合计算"), cell("≤ 约 3 mW"), cell("约 12 MFLOPS，按偏老工艺 MCU 约 0.19 mW/MHz 估上限")],
    [bold("摄像头低分辨率监测"), cell("约 0.4–0.8 mW"), cell("低功耗传感器常开监测模式")],
    [bold("摄像头唇动档（约 10% 时间）"), cell("约 1.5–8 mW"), cell("VGA 到 2 MP 级传感器工作功耗 × 10%；嘴部区域读出可降低，降多少待确认")],
    [bold("NPU 人脸与唇动"), cell("待确认"), cell("需目标芯片数据")],
    [bold("两耳组阵增强（B）额外"), cell("每侧 +2.6–5.2 mW"), cell("双向持续传 1–2 路 PCM")],
  ], 0.6, 1.5, [3.0, 3.2, 5.93], [0.42, 0.46, 0.46, 0.46, 0.46, 0.56, 0.46, 0.46]);
}
{
  const s = newSlide("附录 A4　仿真与估算方法", "", "");
  table(s, [
    [head("项目"), head("方法"), head("局限")],
    [bold("头部与麦克风"), cell("刚性球头部模型（解析解）；每耳 2 麦，耳柄前后间距 1.5 cm"), cell("无耳廓、躯干；佩戴偏差未建模")],
    [bold("房间"), cell("扩散混响尾近似；另用镜像声源法（3 阶墙面反射）验证"), cell("墙面吸声与频率无关；无家具、人体散射")],
    [bold("场景"), cell("目标在前方 ±60°、1–2 m；2 个干扰说话人；扩散噪声；每档 72–144 次"), cell("统计误差约 ±4 个百分点")],
    [bold("视觉"), cell("按假设模拟：方位误差 2°、检出 95%、唇动错误 10%，另测了更差的两档"), cell("需要视觉同事的真实指标")],
    [bold("测向"), cell("GEVD-MUSIC（唇动门控背景白化）+ 起始段加权 + 5° 网格；与 SRP-PHAT、MUSIC 等对比"), cell("算法为预研储备，整体方案确认后再正式选型")],
    [bold("增强分辨力"), cell("理论波束计算：固定超指向与已知干扰方位的 MVDR 置零"), cell("未含时变与估计噪声；不是增强算法的实现")],
    [bold("功耗"), cell("FreeClip 2 S 官方电池与续航推算基准；器件取公开资料"), cell("多为检索摘要，原文未逐一核实；NPU 无数据")],
  ], 0.6, 1.5, [1.8, 6.0, 4.33], [0.42, 0.5, 0.5, 0.5, 0.5, 0.56, 0.5, 0.5]);
}

{
  const s = newSlide("附录 A5　定位算法初步比较（预研储备）", SIM + "；每个条件 120 次，开口后 0.5 s 判决",
    "四个条件：S1 混响（RT60 0.5 s）无干扰；S2 混响 + 2 个干扰（各低 6 dB）；S3 强混响（0.8 s）+ 嘈杂 + 2 个干扰；S4 混响 + 2 个干扰（与目标一样响）。GEVD-MUSIC 用唇动给出的开口时刻划分背景段做白化，5° 网格。估算算力约 12 MFLOPS，方向模板约 120–250 KB。另做了四项稳健性验证（转头、对话轮流、墙面反射、视觉变差），倾向不变。");
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

p.writeFile({ fileName: OUT }).then((f) => console.log("saved", f));
