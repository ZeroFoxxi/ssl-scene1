// 耳机声源定位：情况 1 分析（给 mentor，回应 11-23 16:12–16:15）。
// 风格与 build_earbud_design_deck.js 相同：浅灰底、深蓝主色、短标题 + 一句加粗要点、表格按 mentor 调研 PPT 样式、来源放页脚和备注。
// 数据直接读取仿真结果文件，避免手抄出错：code/earbud_ssl/out/case1.json、case1_thresh.json、complexity.json。
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, "..", "02_耳机声源定位"), "耳机声源定位_情况1分析.pptx");
const DATA = path.join(__dirname, "..", "code", "earbud_ssl", "out");
const C1 = JSON.parse(fs.readFileSync(path.join(DATA, "case1.json"), "utf-8")).results;
const TH = JSON.parse(fs.readFileSync(path.join(DATA, "case1_thresh.json"), "utf-8")).results;
const CX = JSON.parse(fs.readFileSync(path.join(DATA, "complexity.json"), "utf-8")).results;

const F = "Microsoft YaHei";
const C = { ink: "1F1F1F", gray: "595959", light: "8C8C8C", rule: "D9D9D9", box: "A6A6A6", navy: "134074", navyLt: "8DA9C4", navyPale: "EEF2F7", red: "B22222" };
const BG = "F7F8FA";
let pageNo = 1;
const p = new pptxgen();
p.layout = "LAYOUT_WIDE";
p.title = "耳机声源定位：情况 1 分析";

const T = (s, text, o) => s.addText(text, Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 13, color: C.ink, margin: 0, valign: "top", isTextBox: true }, o));
const NONE = { type: "none" };
const RULE = { type: "solid", pt: 0.5, color: C.rule };
const cell = (t, o) => ({ text: t, options: Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 11, color: C.ink, valign: "middle", border: [NONE, NONE, RULE, NONE] }, o) });
const head = (t, o) => cell(t, Object.assign({ bold: true }, o));
const bold = (t, o) => cell(t, Object.assign({ bold: true }, o));
const ctr = (t, o) => cell(t, Object.assign({ align: "center" }, o));
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
const key = (s, text) => T(s, text, { x: 0.6, y: 1.14, w: 12.13, h: 0.36, fontSize: 13.5, bold: true, color: C.ink, valign: "middle" });
function box(s, text, x, y, w, h, o) {
  o = o || {};
  s.addShape(p.shapes.RECTANGLE, { x, y, w, h, fill: { color: o.fill || "FFFFFF" }, line: { color: o.line || C.box, width: o.lw || 0.75 } });
  T(s, text, Object.assign({ x: x + 0.05, y, w: w - 0.1, h, fontSize: o.fs || 11, align: "center", valign: "middle", color: o.color || C.ink, bold: !!o.bold }));
}
function line(s, x1, y1, x2, y2, o) {
  o = o || {};
  s.addShape(p.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001,
    flipH: x2 < x1, flipV: y2 < y1, line: { color: o.color || C.gray, width: o.width || 1, dashType: o.dash || "solid", endArrowType: o.arrow === false ? undefined : "triangle" } });
}
const para = (s, items, x, y, w, h, o) => s.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } })),
  Object.assign({ x, y, w, h, fontFace: F, lang: "zh-CN", fontSize: 12.5, color: C.ink, valign: "top", margin: 0.03, paraSpaceAfter: 6, isTextBox: true }, o || {}));
const chartBase = { catAxisLabelFontFace: F, valAxisLabelFontFace: F, dataLabelFontFace: F, legendFontFace: F, titleFontFace: F,
  catAxisLabelFontSize: 10.5, valAxisLabelFontSize: 10, dataLabelFontSize: 9.5, legendFontSize: 10.5, titleFontSize: 11.5,
  catAxisLabelColor: "404040", valAxisLabelColor: "595959", dataLabelColor: "404040", titleColor: "404040",
  valGridLine: { color: "E8E8E8", size: 0.5 }, catGridLine: { style: "none" }, catAxisLineColor: "BFBFBF", valAxisLineShow: false,
  catAxisTitleFontSize: 10.5, catAxisTitleColor: "404040", catAxisTitleFontFace: F, valAxisTitleFontSize: 10.5, valAxisTitleColor: "404040", valAxisTitleFontFace: F };

// ---------- 数据 ----------
const NOISY = "嘈杂（1.5 m 处 SNR 10 dB）", QUIET = "安静（1.5 m 处 SNR 25 dB）";
const DK = ["0.5 m", "1 m", "2 m", "3 m", "4 m"], DL = ["0.5", "1", "2", "3", "4"];
const acc = (env, arr, m) => DK.map((d) => +(C1[env][d][arr]["methods"][m].acc10 * 100).toFixed(1));
const thr = (t) => DK.map((d) => +(TH[d][t].acc10_pct).toFixed(1));
const BIN = "2+1（两耳）", MONO = "单耳 2 麦";
const v = {
  soundNoisy1dB: thr("1 dB"), soundNoisy35: acc(NOISY, BIN, "不开摄像头"), lipNoisy: acc(NOISY, BIN, "高帧率档"), lowNoisy: acc(NOISY, BIN, "低帧率档"),
  soundQuiet: acc(QUIET, BIN, "不开摄像头"), visNoisy: acc(NOISY, BIN, "仅视觉"),
  faceNoisy1dB: DK.map((d) => +(TH[d]["1 dB"].acc10_low_frame_pct).toFixed(1)),
  srp: acc(NOISY, BIN, "SRP-PHAT"), music: acc(NOISY, BIN, "MUSIC"), gevd: acc(NOISY, BIN, "GEVD-MUSIC"),
  monoGevd: acc(NOISY, MONO, "GEVD-MUSIC"), monoLip: acc(NOISY, MONO, "高帧率档"),
};
const cx = (k) => CX[k];
const pct = (x) => (x === 100 ? "100%" : x.toFixed(1) + "%");
const SIM = "仿真：刚性球头部模型（无耳廓），混响 0.5 s，面前 3 人（相邻隔 20–30°），每点 150 次；精度为方位误差 ≤ 10° 的比例";

// ================= 1 封面 =================
{
  const s = p.addSlide();
  s.background = { color: BG };
  s.addShape(p.shapes.LINE, { x: 0.9, y: 4.0, w: 11.5, h: 0, line: { color: C.navy, width: 1 } });
  T(s, "耳机声源定位：情况 1 分析", { x: 0.9, y: 2.5, w: 11, h: 0.8, fontSize: 32, bold: true, valign: "middle" });
  T(s, "面前 3 个人，只有 1 个人在跟你说话", { x: 0.9, y: 3.35, w: 11, h: 0.5, fontSize: 18, color: C.gray, valign: "middle" });
  T(s, "2026 年 11 月", { x: 0.9, y: 4.15, w: 4, h: 0.4, fontSize: 13, color: C.light, valign: "middle" });
  s.addNotes("情况 1：面前 3 个人，1 个人在跟你说话，另外 2 个不说话。本次讲清楚算法框图、拾音距离、用什么算法（传统 / AI、参数量）、单耳还是两耳、耳机上的计算量与功耗。数字为仿真或按公开资料估算，需样机复核。");
}

// ================= 2 结论 =================
{
  const s = newSlide("结论", "精度为仿真（刚性球头部模型）；计算量与功耗为估算；AI 参数量来自公开论文",
    "情况 1 的分析依据：距离 × 算法 × 单耳 / 两耳仿真（每点 150 次）、开口检测阈值仿真、计算量估算、公开论文与芯片资料。各页详细数字见后。");
  key(s, "情况 1 靠两只耳机的声音就能找准人：嘈杂环境 3 m 以内 97% 以上，摄像头平时可以不开");
  const R = (t, o) => cell(t, Object.assign({ fontSize: 12.5 }, o)), H = (t) => bold(t, { fontSize: 12.5 });
  table(s, [
    [head("项目", { fontSize: 12.5 }), head("结论", { fontSize: 12.5 })],
    [H("阵列"), R(`两只耳机一起测向（主耳 2 麦 + 副耳转发 1 路）；单只耳机 2 m 处只有 ${pct(v.monoGevd[2])}，不可用`)],
    [H("算法"), R("传统信号处理 GEVD-MUSIC（子空间 + 背景白化），没有用 AI；2 m 以外明显好于 SRP-PHAT、MUSIC")],
    [H("拾音距离"), R(`嘈杂环境只用声音：1–2 m ${pct(v.soundNoisy1dB[2])}，3 m ${pct(v.soundNoisy1dB[3])}，4 m ${pct(v.soundNoisy1dB[4])}；安静环境 4 m ${pct(v.soundQuiet[4])}`)],
    [H("摄像头"), R(`平时不开，确认是哪张脸或校正方位偏差时短暂打开；加人脸位置最多多 ${(Math.max(...v.faceNoisy1dB.map((x, i) => x - v.soundNoisy1dB[i]))).toFixed(1)} 个百分点，不需要看唇动`)],
    [H("计算量与功耗"), R("约 19 MFLOPS、内存约 0.5 MB（含 1.5 s 帧缓存）；新增约 5.3 mW，续航约 5.25 h（基准 6 h，估算）")],
    [H("AI"), R("适合耳机的定位网络约 3.5 万–31 万参数（8 比特约 40–300 KB）；情况 1 暂不需要，12 月在实测数据上对比")],
  ], 0.6, 1.75, [2.1, 10.03], [0.48, 0.66, 0.66, 0.66, 0.66, 0.66, 0.66]);
}

// ================= 3 算法框图 =================
{
  const s = newSlide("算法框图", "计算量为估算（每 0.25 s 扫描 72 个方向，218 个频点）；开口检测阈值 1 dB 为情况 1 的设置，有其他人说话时为 3.5 dB",
    "第 ② 步开口检测：短时协方差经背景白化后，最大特征值（新声源能量）超过阈值即判为有人开口，并回溯到开口时刻。第 ③④ 步：开口前的帧估计背景（噪声与混响），开口后的帧估计目标；用背景把噪声白化后做特征分解（GEVD），目标方向在空间谱上最突出。第 ⑤ 步方向模板含头部影响，按标准头型做一次，佩戴偏差用在线校正。第 ⑥ 步：每张人脸取其方位 ±8° 内的空间谱最大值，最高者为目标；看不到人脸时直接用空间谱峰值。");
  key(s, "传统信号处理，全部在主耳音频 DSP 上：约 19 MFLOPS，每 16 ms 输出一次方位");
  // 输入
  box(s, "副耳：2 个麦克风", 0.6, 1.75, 1.9, 0.6);
  line(s, 2.5, 2.05, 2.85, 2.05);
  box(s, "取 1 路，ADPCM 压缩\n64 kbps，耳间链路", 2.85, 1.75, 2.2, 0.6, { fs: 10.5 });
  line(s, 3.95, 2.35, 3.95, 2.95);
  box(s, "主耳：2 个麦克风", 0.6, 3.0, 1.9, 0.6);
  line(s, 2.5, 3.3, 2.85, 3.3);
  // 主耳 DSP 外框
  s.addShape(p.shapes.RECTANGLE, { x: 2.75, y: 2.9, w: 10.0, h: 1.75, fill: { color: C.navyPale }, line: { color: C.navy, width: 0.75, dashType: "dash" } });
  T(s, "主耳音频 DSP（每 16 ms 一帧）", { x: 2.85, y: 4.33, w: 4, h: 0.28, fontSize: 10, color: C.navy });
  const steps = [["① 高通 + 分帧 FFT\n3 路 × 218 频点", "2.1 M"], ["② 开口检测\n新声源能量 > 阈值", "6.6 M"], ["③ 协方差\n背景 / 目标", "0.8 M"],
    ["④ 背景白化\n+ 特征分解", "1.0 M"], ["⑤ 72 个方向扫描\n找峰", "8.2 M"], ["⑥ 与人脸融合", "很小"]];
  const W = 1.42, G = 0.2; let x = 2.85;
  steps.forEach(([t, m], i) => {
    box(s, t, x, 3.0, W, 0.85, { fs: 10.5, fill: "FFFFFF", line: C.navy });
    T(s, m + (m.endsWith("M") ? "FLOPS" : ""), { x, y: 3.9, w: W, h: 0.25, fontSize: 9.5, color: C.gray, align: "center" });
    if (i < steps.length - 1) line(s, x + W, 3.42, x + W + G, 3.42, { color: C.navy });
    x += W + G;
  });
  // 输出
  line(s, 12.06, 3.0, 12.06, 2.45, { color: C.navy });
  box(s, "输出：目标方位 + 置信度\n8 字节，每 16 ms → 增强", 9.9, 1.75, 2.85, 0.7, { fs: 10.5, line: C.navy, color: C.navy, bold: true });
  // 摄像头、IMU
  box(s, "摄像头（按需短暂打开，两耳各一）\n1–2 fps，人脸检测 → 人脸方位", 0.6, 5.0, 3.3, 0.75, { fs: 10.5, color: C.gray });
  line(s, 3.9, 5.37, 11.25, 5.37, { arrow: false, dash: "dash" });
  line(s, 11.25, 5.37, 11.25, 3.85, { dash: "dash" });
  box(s, "IMU：头部转动\n换算到世界坐标", 4.4, 5.85, 2.2, 0.65, { fs: 10.5 });
  line(s, 6.6, 6.17, 11.4, 6.17, { arrow: false });
  line(s, 11.4, 6.17, 11.4, 3.85);
}

// ================= 4 拾音距离 =================
{
  const s = newSlide("拾音距离", SIM + "；视觉随距离变差为假设（2 m 内检出 95%、唇动判反 10%；3 m 90% / 20%；4 m 85% / 30%）",
    `距离的物理设定：噪声声级固定，目标声级与距离成反比；直达混响比 1.5 m 处 0 dB，每翻一倍降 6 dB。只用声音时开口检测阈值：情况 1 用 1 dB（只有噪声，没有误检：每段开口前 1 s，共 750 s 纯噪声段 0 次）；若沿用多人场景的 3.5 dB，嘈杂环境 2 / 3 / 4 m 只有 ${pct(v.soundNoisy35[2])} / ${pct(v.soundNoisy35[3])} / ${pct(v.soundNoisy35[4])}（开口检不到），开口时刻已知时 GEVD-MUSIC 为 ${pct(v.gevd[2])} / ${pct(v.gevd[3])} / ${pct(v.gevd[4])}。安静环境 4 m 处加唇动反而略低（${pct(acc(QUIET, BIN, "高帧率档")[4])}），因唇动给的开口时刻有 ±0.1 s 误差、远处唇动更易判错。嘴宽像素按 5 cm、720p、视场 80° 估算。阈值 1 dB 时加低帧率人脸位置：0.5 / 1 / 2 / 3 / 4 m 为 ${v.faceNoisy1dB.map(pct).join(" / ")}（只用声音 ${v.soundNoisy1dB.map(pct).join(" / ")}），差别在统计误差以内。`);
  key(s, `距离每翻一倍，声音弱 6 dB、混响占比高 6 dB；嘈杂环境 3 m 以内只用声音 ${pct(v.soundNoisy1dB[3])} 以上，4 m 降到 ${pct(v.soundNoisy1dB[4])}`);
  s.addChart(p.charts.LINE, [
    { name: "只用声音（嘈杂）", labels: DL, values: v.soundNoisy1dB },
    { name: "只用声音（安静）", labels: DL, values: v.soundQuiet },
    { name: "声音 + 人脸位置（嘈杂）", labels: DL, values: v.faceNoisy1dB },
    { name: "声音 + 唇动（嘈杂）", labels: DL, values: v.lipNoisy },
    { name: "只看摄像头唇动（嘈杂）", labels: DL, values: v.visNoisy },
  ], Object.assign({ x: 0.6, y: 1.6, w: 7.2, h: 5.15, chartColors: [C.navy, C.navyLt, "2E75B6", "7F7F7F", "BFBFBF"], lineSize: 2, lineDataSymbol: "circle", lineDataSymbolSize: 6,
    valAxisMinVal: 40, valAxisMaxVal: 100, showLegend: true, legendPos: "b", showTitle: true, title: "方位误差 ≤ 10° 的比例（%）",
    showCatAxisTitle: true, catAxisTitle: "说话人距离（m）" }, chartBase));
  const fmt = (x) => (x < 0 ? "−" + (-x).toFixed(1) : x.toFixed(1)); const snr = (d) => fmt(10 - 20 * Math.log10(d / 1.5)), drr = (d) => fmt(0 - 20 * Math.log10(d / 1.5)), px = (d) => Math.round(38.1 / d);
  table(s, [
    [head("距离"), head("SNR（嘈杂）", { align: "center" }), head("直达混响比", { align: "center" }), head("嘴宽像素", { align: "center" })],
    ...[0.5, 1, 2, 3, 4].map((d) => [bold(`${d} m`), ctr(`${snr(d)} dB`), ctr(`${drr(d)} dB`), ctr(`约 ${px(d)}`)]),
  ], 8.15, 1.7, [1.0, 1.35, 1.25, 1.0], [0.4, 0.38, 0.38, 0.38, 0.38, 0.38]);
  para(s, ["2 m 以内声音清楚：只用声音 100%，加唇动 99% 以上；只看摄像头约 76–78%。",
    "远处主要受混响和噪声限制：4 m、嘈杂时 SNR 只剩约 1.5 dB，直达声比混响弱约 8.5 dB。",
    `摄像头帮助很小：加人脸位置最多多 ${(Math.max(...v.faceNoisy1dB.map((x, i) => x - v.soundNoisy1dB[i]))).toFixed(1)} 个百分点；加唇动远处反而更低（开口时刻有误差、嘴只有约 10 像素）。`], 8.15, 4.2, 4.6, 2.5, { fontSize: 12 });
}

// ================= 4b 声源定位算法有哪些 =================
{
  const s = newSlide("声源定位算法有哪些", "“仿真”为本方案仿真（两耳 2+1，嘈杂环境 3 m，开口时刻已知）；其余为公开资料与判断；AI 参数量见第 8 页",
    "分类按原理：① 先估计麦克风两两之间的时间差，再按几何关系求方向；② 把阵列依次“对准”各个方向，看哪个方向能量最大；③ 用多麦克风协方差的特征分解区分信号与噪声空间；④ 在 ③ 之前用背景把噪声和混响白化；⑤ 自适应波束的空间谱；⑥ 神经网络从数据中学习；⑦ 传统特征加小网络。ESPRIT 要求阵列有平移不变结构（如均匀线阵），两耳加头部遮挡的阵列不满足。MVDR 空间谱分辨率高，但对方向模板误差敏感，本方案未仿真。");
  key(s, "常见的定位算法分 7 类；耳机上孔径小、混响大、算力低，选“子空间 + 背景白化”的 GEVD-MUSIC");
  const N = (t, o) => cell(t, Object.assign({ fontSize: 10.5 }, o)), B = (t, o) => bold(t, Object.assign({ fontSize: 10.5 }, o)), Ct = (t, o) => ctr(t, Object.assign({ fontSize: 10.5 }, o));
  table(s, [
    [head("类别", { fontSize: 10.5 }), head("代表算法", { fontSize: 10.5 }), head("原理（一句话）", { fontSize: 10.5 }), head("计算量", { fontSize: 10.5, align: "center" }), head("在耳机上的问题", { fontSize: 10.5 })],
    [B("时延估计 + 几何"), N("GCC-PHAT"), N("先算两两麦克风的时间差，再按几何求方向"), Ct("最小"), N("混响下时间差不准；只有 3 路时几何约束少")],
    [B("波束扫描"), N("SRP-PHAT、延迟求和"), N("把阵列依次对准各方向，取能量最大的方向"), Ct(`${cx("2+1（两耳，3 路） | SRP-PHAT").total_mflops} MFLOPS`), N(`远处被噪声和混响抹平（仿真 3 m：${pct(v.srp[3])}）`)],
    [B("子空间"), N("MUSIC、ESPRIT"), N("协方差特征分解，用噪声子空间扫描方向"), Ct(`${cx("2+1（两耳，3 路） | MUSIC").total_mflops} MFLOPS`), N(`不白化时远处失效（仿真 3 m：${pct(v.music[3])}）；ESPRIT 要规则阵列，不适用`)],
    [B("子空间 + 背景白化", { color: C.navy }), N("GEVD-MUSIC（本方案）", { bold: true, color: C.navy }), N("先用开口前的背景把噪声和混响白化，再做 MUSIC"), Ct(`${cx("2+1（两耳，3 路） | GEVD-MUSIC").total_mflops} MFLOPS`, { bold: true }), N(`需要开口时刻（声学检测或唇动）；仿真 3 m：${pct(v.gevd[3])}`)],
    [B("自适应波束空间谱"), N("MVDR（Capon）"), N("对每个方向做最小方差波束，看输出功率"), Ct("与 GEVD 同量级"), N("分辨率高，但对方向模板误差敏感；未仿真")],
    [B("深度学习"), N("CNN、CRNN、轻量网络"), N("网络从大量数据中学会从声音看出方向"), Ct("随网络大小"), N("需要训练数据；换耳机形态要重训（第 8 页）")],
    [B("传统 + AI"), N("相位差 / 空间谱 + 小网络"), N("传统方法先提取特征，小网络做判断"), Ct("介于两者之间"), N("网络可以更小；仍需训练数据")],
  ], 0.6, 1.65, [2.0, 2.05, 3.55, 1.45, 3.08], [0.4, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62]);
}

// ================= 5 算法对比 =================
{
  const g = cx("2+1（两耳，3 路） | GEVD-MUSIC"), sr = cx("2+1（两耳，3 路） | SRP-PHAT"), mu = cx("2+1（两耳，3 路） | MUSIC");
  const s = newSlide("定位算法对比", SIM + "；嘈杂环境，开口时刻已知，只用声音；计算量为估算，不含开口检测（另约 6.6 MFLOPS）",
    "SRP-PHAT：各麦克风对的相位差（广义互相关）按方向模板累加。MUSIC：多麦克风协方差做特征分解，用噪声子空间扫描方向。GEVD-MUSIC：在 MUSIC 前用开口前的背景协方差把噪声和混响白化。远处失效的原因：扩散噪声和混响从四面八方来，不白化时空间谱被抹平。计算量口径同整体方案第 6 页（每 0.25 s 扫描 72 个方向）。");
  key(s, `2 m 以外要用带背景白化的 GEVD-MUSIC：3 m 处 ${pct(v.gevd[3])}，SRP-PHAT、MUSIC 只有 ${pct(v.srp[3])}、${pct(v.music[3])}`);
  const L4 = DL.slice(1);
  s.addChart(p.charts.BAR, [
    { name: "SRP-PHAT", labels: L4, values: v.srp.slice(1) },
    { name: "MUSIC", labels: L4, values: v.music.slice(1) },
    { name: "GEVD-MUSIC（本方案）", labels: L4, values: v.gevd.slice(1) },
  ], Object.assign({ x: 0.6, y: 1.6, w: 7.0, h: 5.15, barDir: "col", barGrouping: "clustered", chartColors: ["BFBFBF", C.navyLt, C.navy],
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0", valAxisMinVal: 0, valAxisMaxVal: 100, showLegend: true, legendPos: "b",
    showTitle: true, title: "方位误差 ≤ 10° 的比例（%）", showCatAxisTitle: true, catAxisTitle: "说话人距离（m）" }, chartBase));
  table(s, [
    [head("算法"), head("计算量", { align: "center" }), head("方向模板 + 状态", { align: "center" })],
    [bold("SRP-PHAT"), ctr(`${sr.total_mflops} MFLOPS`), ctr(`${sr.template_kb} + ${sr.state_kb} KB`)],
    [bold("MUSIC"), ctr(`${mu.total_mflops} MFLOPS`), ctr(`${mu.template_kb} + ${mu.state_kb} KB`)],
    [bold("GEVD-MUSIC", { color: C.navy }), ctr(`${g.total_mflops} MFLOPS`, { bold: true }), ctr(`${g.template_kb} + ${g.state_kb} KB`)],
  ], 7.95, 1.7, [1.6, 1.55, 1.63], [0.4, 0.42, 0.42, 0.42]);
  para(s, [`GEVD-MUSIC 计算量约为 SRP-PHAT 的 ${(g.total_mflops / sr.total_mflops).toFixed(1)} 倍，换来远处的精度。`,
    "都不需要训练数据；方向模板按标准头型做一次。",
    "近处（≤ 1 m）三种方法差别不大，可按距离或环境切换以省电（待评估）。"], 7.95, 3.6, 4.8, 3.0, { fontSize: 12 });
}

// ================= 6 单耳还是两耳 =================
{
  const g = cx("2+1（两耳，3 路） | GEVD-MUSIC"), m = cx("单耳 2 麦 | GEVD-MUSIC");
  const s = newSlide("单只耳机还是两只耳机", SIM + "；嘈杂环境，GEVD-MUSIC，开口时刻已知",
    `单耳加唇动（高帧率档）时：0.5 / 1 / 2 / 3 / 4 m 为 ${v.monoLip.map(pct).join(" / ")}，与只看摄像头接近，声音几乎没帮上忙。两耳之间时间差按头宽约 18 cm、声速 343 m/s 估算。`);
  key(s, `单只耳机测不准方向：2 m 处只有 ${pct(v.monoGevd[2])}，情况 1 也要两只耳机一起测向`);
  s.addChart(p.charts.BAR, [
    { name: "两只耳机（主耳 2 + 副耳 1 路）", labels: DL, values: v.gevd },
    { name: "单只耳机 2 麦", labels: DL, values: v.monoGevd },
  ], Object.assign({ x: 0.6, y: 1.6, w: 7.0, h: 5.15, barDir: "col", barGrouping: "clustered", chartColors: [C.navy, "BFBFBF"],
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0", valAxisMinVal: 0, valAxisMaxVal: 100, showLegend: true, legendPos: "b",
    showTitle: true, title: "只用声音：方位误差 ≤ 10° 的比例（%）", showCatAxisTitle: true, catAxisTitle: "说话人距离（m）" }, chartBase));
  table(s, [
    [head(""), head("两只耳机", { align: "center" }), head("单只耳机", { align: "center" })],
    [bold("麦克风间距"), ctr("两耳约一个头宽"), ctr("1.5 cm")],
    [bold("最大时间差"), ctr("约 0.5–0.7 ms"), ctr("约 44 µs")],
    [bold("计算量"), ctr(`${g.total_mflops} MFLOPS`), ctr(`${m.total_mflops} MFLOPS`)],
    [bold("耳间传输"), ctr("1 路 ADPCM，约 0.7 mW"), ctr("不需要")],
  ], 7.95, 1.7, [1.45, 1.75, 1.58], [0.4, 0.42, 0.42, 0.42, 0.42]);
  para(s, ["单耳两麦又近又是前后排列，混响和噪声下分不出方向（2 m 处平均误差约 50°）。",
    "两耳组阵的代价是一路耳间传输和约 6 MFLOPS 计算，但精度不可替代。"], 7.95, 4.0, 4.8, 2.6, { fontSize: 12 });
}

// ================= 8 AI 方法 =================
{
  const s = newSlide("传统方法与 AI 方法", "AI 模型数字来自论文原文：LightDOA（arXiv 2511.08012 表 3）、DCASE 2024 基线（arXiv 2408.05057 表 1）；数据集与本方案不同，精度不能直接比较",
    "LightDOA：2 路输入（相位差），深度可分离卷积，参数随输出方向数为 3.5 万–3.9 万；同文对比的移动端小网络 CP-Mobile 6.1 万–6.4 万、CRNN 约 31 万。DCASE 2024 声事件定位与检测基线 74 万参数、0.03 G MAC/s（含事件检测，任务更复杂）。另一篇双耳卷积循环网络（arXiv 2507.20027）报告平均误差 1.2°（同条件 SRP-PHAT 10.2°），正文未给参数量。耳机芯片：公开报道中恒玄 BES2700YP 有带 NPU 的传感器核与 4 MB SRAM（报道称用于华为 FreeBuds Pro 2），BES2700BP 带 HiFi4 DSP；主频与可用算力未公开。");
  key(s, "目前用传统方法，没有 AI；适合耳机的 AI 定位网络约 3.5 万–31 万参数，情况 1 暂不需要");
  table(s, [
    [head("方法"), head("类型"), head("参数量", { align: "center" }), head("内存（8 比特）", { align: "center" }), head("要不要训练数据", { align: "center" })],
    [bold("GEVD-MUSIC（本方案）", { color: C.navy }), cell("传统信号处理"), ctr("无（方向模板）"), ctr("模板 + 状态约 215 KB"), ctr("不要")],
    [bold("LightDOA"), cell("轻量卷积网络"), ctr("3.5 万–3.9 万"), ctr("约 40 KB"), ctr("要")],
    [bold("CP-Mobile"), cell("移动端小网络"), ctr("6.1 万–6.4 万"), ctr("约 65 KB"), ctr("要")],
    [bold("CRNN"), cell("卷积循环网络"), ctr("约 31 万"), ctr("约 300 KB"), ctr("要")],
    [bold("DCASE 2024 基线"), cell("声事件定位与检测"), ctr("74 万"), ctr("约 740 KB"), ctr("要")],
  ], 0.6, 1.7, [2.5, 2.2, 1.9, 1.9, 1.9], [0.42, 0.42, 0.42, 0.42, 0.42, 0.42]);
  para(s, ["情况 1 用传统方法已达 91–100%（嘈杂环境 1–4 m），不需要训练数据，换耳机形态只需重做方向模板。",
    "AI 小网络的内存与我们的方向模板同量级，但需要大量训练数据，实际场景和训练数据不同时可能出错。",
    "建议：12 月在实测头部传递函数的数据上训练一个约 4 万参数的网络做对比；也可“传统 + AI”，用 GEVD 的空间谱作网络输入。",
    "耳机芯片已有带 NPU、HiFi4 DSP 的公开型号；实际可用算力与功耗【待确认】。"], 0.6, 4.4, 12.1, 2.4, { fontSize: 12.5 });
}

// ================= 8 功耗 =================
{
  const s = newSlide("情况 1 的功耗（每只耳机）", "基准：FreeClip 2 S 每只 60 mAh、通话 6 h（华为官网），按 3.7 V 约 37 mW；其余为按公开器件估算",
    "续航 = 222 mWh ÷（37 mW + 新增）。耳间传输：nRF5340 射频约 5 nJ/bit × 协议开销 2，64 kbps 约 0.7 mW。定位计算：按偏老工艺 MCU 约 0.19 mW/MHz 估上限。摄像头打开时按低帧率档：HM0360 常开监测模式 140–256 µA；按需短暂打开的时间占比很小，未计入。情况 2 需要高帧率档看唇动（传感器 + NPU 约 1.2–11 mW），续航约 4.6–5.3 h，另行分析。");
  key(s, "情况 1 新增约 5.3 mW，续航约 5.25 h（基准 6 h）；摄像头平时不开，只在需要时短暂打开");
  const rt = (add) => (222 / (37 + add)).toFixed(2);
  table(s, [
    [head("部分"), head("功耗", { align: "center" }), head("依据")],
    [bold("耳间传输（定位用 1 路 ADPCM）"), ctr("约 0.7 mW"), cell("64 kbps；仿真中 ADPCM 与不压缩精度差别不显著")],
    [bold("定位计算（GEVD-MUSIC + 开口检测）"), ctr("≤ 4.6 mW"), cell("约 19 MFLOPS，按偏老工艺 MCU 估上限")],
    [bold("摄像头（平时不开，按需短暂打开）"), ctr("很小"), cell("打开时低帧率 1–2 fps 约 0.4–0.8 mW；加人脸对精度帮助很小（第 4 页）")],
    [bold("合计新增"), ctr("约 5.3 mW", { bold: true }), cell("")],
    [bold("续航"), ctr(`约 ${rt(5.3)} h`, { bold: true }), cell(`若低帧率档一直开约 ${rt(6.1)}–${rt(5.7)} h；基准 6 h`)],
  ], 0.6, 1.75, [4.0, 2.2, 5.93], [0.42, 0.5, 0.5, 0.5, 0.5, 0.5]);
  para(s, ["功耗主要在定位计算（约 4.6 mW 上限），实际取决于芯片工艺【待确认】。",
    "若改用 SRP-PHAT 可省约一半计算，但 2 m 以外精度不可用（第 6 页）。"], 0.6, 5.0, 12.1, 1.6, { fontSize: 12.5 });
}

// ================= 9 待确认 =================
{
  const s = newSlide("待确认与下一步", "", "情况 2（另外两人在互相说话）的定位已有初步仿真：加唇动 88–91%；波束成形压制效果待仿真。");
  key(s, "情况 1 的方案基本确定；精度和功耗要用样机数据和芯片数据复核");
  table(s, [
    [head("事项"), head("影响"), head("需要什么")],
    [bold("耳机芯片可用的算力、内存和功耗"), cell("决定 19 MFLOPS 的实际功耗，以及能否跑 AI 小网络"), cell("目标芯片的规格")],
    [bold("实测头部传递函数"), cell("刚性球没有耳廓；方向模板要按实测做"), cell("样机实测数据；没有时先用公开实测库（12 月）")],
    [bold("视觉随距离的真实指标"), cell("3–4 m 的人脸检出率、唇动准确率目前是假设"), cell("人脸与唇动检测的实测指标")],
    [bold("突发噪声下开口检测会不会误触发"), cell("1 dB 阈值只在稳定噪声下验证"), cell("12 月加入碗碟声、关门声等突发噪声仿真")],
  ], 0.6, 1.75, [3.6, 4.6, 3.93], [0.42, 0.55, 0.55, 0.55, 0.55]);
  para(s, ["12 月：用实测头部传递函数复核本页结论；训练一个约 4 万参数的 AI 网络做对比；之后进入情况 2（波束成形）。"], 0.6, 4.75, 12.1, 1.0, { fontSize: 12.5 });
}

p.writeFile({ fileName: OUT }).then((f) => console.log("saved", f));
