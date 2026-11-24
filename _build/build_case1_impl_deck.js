// 耳机声源定位：情况 1 算法实现（给 mentor，回应 11-24 "每个 layer 都得清楚，具体的计算公式都要清楚，详细列出每个步骤的框图"）。
// 公式图片由 _build/make_case1_formulas.py 生成；公式与 02_耳机声源定位/情况1算法实现.md、code/earbud_ssl 的实现一致。
// 风格同 build_case1_deck.js：浅灰底、深蓝主色、短标题 + 一句加粗要点、表格按 mentor 调研 PPT 样式。
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, "..", "02_耳机声源定位"), "耳机声源定位_情况1算法实现.pptx");
const FDIR = path.join(__dirname, "formulas");
const FM = JSON.parse(fs.readFileSync(path.join(FDIR, "manifest.json"), "utf-8"));
const CX = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "code", "earbud_ssl", "out", "complexity.json"), "utf-8")).results;

const F = "Microsoft YaHei";
const C = { ink: "1F1F1F", gray: "595959", light: "8C8C8C", rule: "D9D9D9", box: "A6A6A6", navy: "134074", navyLt: "8DA9C4", navyPale: "EEF2F7" };
const BG = "F7F8FA";
let pageNo = 1;
const p = new pptxgen();
p.layout = "LAYOUT_WIDE";
p.title = "耳机声源定位：情况 1 算法实现";

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
  s.addShape(p.shapes.RECTANGLE, { x, y, w, h, fill: { color: o.fill || "FFFFFF" }, line: { color: o.line || C.box, width: o.lw || 0.75, dashType: o.dash || "solid" } });
  T(s, text, { x: x + 0.06, y, w: w - 0.12, h, fontSize: o.fs || 10.5, align: "center", valign: "middle", color: o.color || C.ink });
}
function line(s, x1, y1, x2, y2, o) {
  o = o || {};
  s.addShape(p.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001,
    flipH: x2 < x1, flipV: y2 < y1, line: { color: o.color || C.navy, width: o.width || 1, dashType: o.dash || "solid", endArrowType: o.arrow === false ? undefined : "triangle" } });
}
// 公式图片：左边一个短标签，右边公式
const eq = (s, name, x, y, label) => {
  if (label) T(s, label, { x, y, w: 1.45, h: FM[name].h, fontSize: 11, color: C.gray, valign: "middle" });
  s.addImage({ path: path.join(FDIR, name + ".png"), x: x + (label ? 1.5 : 0), y, w: FM[name].w, h: FM[name].h });
  return y + FM[name].h;
};
const note = (s, items, x, y, w, h) => s.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } })),
  { x, y, w, h, fontFace: F, lang: "zh-CN", fontSize: 11.5, color: C.ink, valign: "top", margin: 0.03, paraSpaceAfter: 5, isTextBox: true });
const g = CX["2+1（两耳，3 路） | GEVD-MUSIC"].steps_mflops;
const mf = (x) => x.toFixed(1) + " MFLOPS";
const SRC = "公式与仿真代码实现一致（code/earbud_ssl）；参数为仿真所用值；计算量为估算";

// ================= 1 封面 =================
{
  const s = p.addSlide();
  s.background = { color: BG };
  s.addShape(p.shapes.LINE, { x: 0.9, y: 4.0, w: 11.5, h: 0, line: { color: C.navy, width: 1 } });
  T(s, "耳机声源定位：情况 1 算法实现", { x: 0.9, y: 2.5, w: 11, h: 0.8, fontSize: 32, bold: true, valign: "middle" });
  T(s, "逐层处理流程与计算公式", { x: 0.9, y: 3.35, w: 11, h: 0.5, fontSize: 18, color: C.gray, valign: "middle" });
  T(s, "2026 年 11 月", { x: 0.9, y: 4.15, w: 4, h: 0.4, fontSize: 13, color: C.light, valign: "middle" });
  s.addNotes("情况 1：面前 3 个人，只有 1 个人在跟你说话。本文件把声源定位的每一层写清楚：输入、输出、维度、参数、计算公式和计算量。全部为信号处理，没有需要训练的参数。");
}

// ================= 2 逐层框图 =================
{
  const s = newSlide("逐层处理框图", "每秒计算量为估算（每 0.25 s 扫描一次）；L8 只在摄像头按需打开时使用",
    "代码对应：L1 sim.highpass；L2 sim.stft；L3 run_camera_policy.novelty_raw、acoustic_onsets；L4 methods.frame_energy_db、onset_weights、covariance（时间窗见 run_camera_policy.gevd_spec）；L5–L6 methods.music；L7 methods.peak；L8 methods.fuse_soft；方向模板 sphere.sphere_tf。");
  key(s, "10 层，全部在主耳音频 DSP 上做信号处理，约 19 MFLOPS，没有需要训练的参数");
  const W = 2.2, H = 1.2, GAP = 0.28, xs = [0, 1, 2, 3, 4].map((i) => 0.6 + i * (W + GAP));
  const Y1 = 1.75, Y2 = 3.95;
  const row1 = [
    ["L0 采集与汇集", "主耳 2 路 + 副耳 1 路\n（ADPCM 解码）", "3 路 PCM，16 kHz"],
    ["L1 高通", "4 阶 Butterworth\n截止 100 Hz", mf(g["高通"])],
    ["L2 分帧加窗 + FFT", "512 点汉宁窗，帧移 256\n保留 200–7000 Hz", "3 × 218 频点 / 16 ms；" + mf(g["分帧 + FFT"])],
    ["L3 开口检测", "短时 / 背景协方差递推\n白化后最大特征值 > 1 dB", "开口时刻 t_on；6.6 MFLOPS"],
    ["L4 协方差估计", "背景：开口前 1 s\n目标：开口起，起始段加权", "218 × 两个 3×3；" + mf(g["协方差"] + g["判帧"])],
  ];
  const row2 = [   // 从右往左
    ["L5 白化 + 特征分解", "背景 Cholesky 白化目标\n取 2 维噪声子空间", "218 × 3×2；" + mf(g["白化 + 特征分解"])],
    ["L6 空间谱扫描", "72 个方向 × 218 频点\nMUSIC 谱，频点平均", "72 个分数；" + mf(g["方向扫描"])],
    ["L7 找峰 + 插值", "最大值 + 抛物线插值", "方位 θ̂；很小"],
    ["L8 与人脸融合", "人脸方位 ±8° 内取谱峰\n摄像头按需打开时", "方位 θ_out；很小"],
    ["L9 输出", "IMU 换到世界坐标跟踪\n每 16 ms 下发 8 字节", "→ 增强模块"],
  ];
  const draw = (r, x, y) => {
    s.addShape(p.shapes.RECTANGLE, { x, y, w: W, h: H, fill: { color: "FFFFFF" }, line: { color: C.navy, width: 0.75 } });
    T(s, r[0], { x: x + 0.06, y: y + 0.06, w: W - 0.12, h: 0.3, fontSize: 11, bold: true, color: C.navy, align: "center", valign: "middle" });
    T(s, r[1], { x: x + 0.06, y: y + 0.38, w: W - 0.12, h: 0.78, fontSize: 10, align: "center", valign: "middle" });
    T(s, r[2], { x, y: y + H + 0.04, w: W, h: 0.26, fontSize: 9, color: C.gray, align: "center", valign: "middle" });
  };
  row1.forEach((r, i) => { draw(r, xs[i], Y1); if (i < 4) line(s, xs[i] + W, Y1 + H / 2, xs[i + 1], Y1 + H / 2); });
  row2.forEach((r, i) => { const x = xs[4 - i]; draw(r, x, Y2); if (i < 4) line(s, x, Y2 + H / 2, xs[3 - i] + W, Y2 + H / 2); });
  line(s, xs[4] + W / 2, Y1 + H + 0.32, xs[4] + W / 2, Y2);
  // 旁路输入
  const Y3 = 5.85;
  box(s, "方向模板（离线制作）\n72 方向 × 218 频点 × 3 路，约 184 KB", xs[3] - 0.1, Y3, W + 0.2, 0.72, { fs: 9.5, line: C.box });
  line(s, xs[3] + W / 2, Y3, xs[3] + W / 2, Y2 + H + 0.32, { color: C.gray });
  box(s, "摄像头（按需短暂打开）\n人脸方位 φ_i", xs[1], Y3, W, 0.72, { fs: 9.5, dash: "dash" });
  line(s, xs[1] + W / 2, Y3, xs[1] + W / 2, Y2 + H + 0.32, { color: C.gray, dash: "dash" });
  box(s, "IMU：头部偏航角 ψ(t)", xs[0], Y3, W, 0.72, { fs: 9.5 });
  line(s, xs[0] + W / 2, Y3, xs[0] + W / 2, Y2 + H + 0.32, { color: C.gray });
}

// ---------- 细框图用的小工具：富文本（_ 下标，^ 上标，{} 分组）、运算块、带维度标注的箭头 ----------
function rich(str, base) {
  const runs = []; let buf = ""; let i = 0;
  const flush = () => { if (buf) { runs.push({ text: buf, options: Object.assign({}, base) }); buf = ""; } };
  while (i < str.length) {
    const ch = str[i];
    if ((ch === "_" || ch === "^") && i + 1 < str.length) {
      flush(); let tok;
      if (str[i + 1] === "{") { const j = str.indexOf("}", i + 2); tok = str.slice(i + 2, j); i = j + 1; }
      else { tok = str[i + 1]; i += 2; }
      runs.push({ text: tok, options: Object.assign({}, base, ch === "_" ? { subscript: true } : { superscript: true }) });
    } else { buf += ch; i += 1; }
  }
  flush();
  return runs;
}
function blk(s, x, y, w, h, title, lines, o) {
  o = o || {};
  s.addShape(p.shapes.RECTANGLE, { x, y, w, h, fill: { color: o.fill || "FFFFFF" }, line: { color: o.line || C.navy, width: 0.75, dashType: o.dash || "solid" } });
  const base = { fontFace: F, lang: "zh-CN", fontSize: o.fs || 9, color: o.color || C.ink };
  const parts = [];
  parts.push({ text: title, options: Object.assign({}, base, { bold: true, color: o.tcolor || C.navy, fontSize: (o.fs || 9) + 1, breakLine: lines.length > 0 }) });
  lines.forEach((ln, k) => {
    const r = rich(ln, base);
    if (k < lines.length - 1) r[r.length - 1].options.breakLine = true;
    parts.push(...r);
  });
  s.addText(parts, { x: x + 0.04, y, w: w - 0.08, h, align: "center", valign: "middle", margin: 0.02, paraSpaceAfter: 1, isTextBox: true });
}
const lab = (s, text, x, y, w, o) => s.addText(rich(text, { fontFace: F, lang: "zh-CN", fontSize: 8, color: C.gray }),
  Object.assign({ x, y, w, h: 0.22, align: "center", valign: "middle", margin: 0, isTextBox: true }, o || {}));
const arrow = (s, x1, y1, x2, y2, o) => line(s, x1, y1, x2, y2, Object.assign({ color: C.navy, width: 0.9 }, o || {}));
const SRC_D = "参数为仿真所用值；标【设计】的为方案设计、仿真中未实现";

// ================= 3 细框图①：前端与开口检测 =================
{
  const s = newSlide("算法框图①　前端与开口检测（每 16 ms 一帧）", SRC_D,
    "第 1 行每个样本 / 每帧都做；第 2、3 行（开口检测）每 2 帧做一次，从第 0.3 s 起计算 ν、从第 1 s 起判决。背景递推在本帧判决之后才用本帧更新。代码：sim.stft、run_camera_policy.novelty_raw、acoustic_onsets。");
  key(s, "3 路声音逐帧变成 3 × 218 个频点；背景白化后的最大特征值上穿阈值即判为有人开口，输出开口帧 t_on");
  const W1 = 1.5, G1 = 0.27, Y1 = 1.72, H1 = 1.0;
  const xa = [0, 1, 2, 3, 4, 5, 6].map((i) => 0.6 + i * (W1 + G1));
  const A = [
    ["麦克风 × 3", ["主耳前、后 + 副耳前", "PDM → 16 kHz / 16 bit"]],
    ["耳间传输", ["副耳 1 路 ADPCM 4 bit", "主耳解码，按采样计数对齐"]],
    ["高通", ["4 阶 Butterworth", "f_c = 100 Hz"]],
    ["分帧", ["帧长 512、帧移 256", "32 ms / 16 ms"]],
    ["加窗", ["汉宁窗", "w(n) = 0.5 − 0.5cos(2πn/512)"]],
    ["FFT", ["512 点实数 FFT", "每路 257 个频点"]],
    ["取频带", ["频点 7–224（200–7000 Hz）", "x(f,t)：3 × 218 复数"]],
  ];
  A.forEach(([t, l], i) => { blk(s, xa[i], Y1, W1, H1, t, l); if (i < 6) arrow(s, xa[i] + W1, Y1 + H1 / 2, xa[i + 1], Y1 + H1 / 2); });
  lab(s, "x(f,t)：3 × 218 复数 / 帧 → 帧缓存（框图②）", xa[6] - 1.6, Y1 + H1 + 0.04, 3.1, { align: "right" });
  // 第 2 行（从右到左）
  const W2 = 1.75, G2 = 0.32, Y2 = 3.3, H2 = 1.1;
  const xb = [0, 1, 2, 3, 4, 5].map((i) => 0.6 + (5 - i) * (W2 + G2));
  const B = [
    ["外积", ["R(f,t) = x x^H", "218 个 3×3 厄米矩阵"]],
    ["递推平均（两路）", ["S ← αS + (1 − α)R", "短时 S_s：α_s = 0.938", "背景 S_b：α_b = 0.984"]],
    ["偏差校正", ["R̃_b = S_b / (1 − α_b^t)", "R̃_s = S_s / (1 − α_s^{t+1})"]],
    ["对角加载 + Cholesky", ["L L^H = R̃_b + δI", "δ = 0.01·tr(R̃_b) / 3"]],
    ["白化 + 最大特征值", ["W = L^{−1} R̃_s L^{−H}", "218 个 λ_{max}(W)"]],
    ["频点中位数 → dB", ["ν(t) = 10·lg median_f λ_{max}", "每 32 ms 一次"]],
  ];
  arrow(s, xa[6] + W1 / 2, Y1 + H1 + 0.28, xb[0] + W2 / 2, Y2);
  B.forEach(([t, l], i) => { blk(s, xb[i], Y2, W2, H2, t, l); if (i < 5) arrow(s, xb[i], Y2 + H2 / 2, xb[i + 1] + W2, Y2 + H2 / 2); });
  // 第 3 行（从左到右）
  const Y3 = 5.05, H3 = 0.95;
  arrow(s, xb[5] + W2 / 2, Y2 + H2, xb[5] + W2 / 2, Y3);
  lab(s, "ν(t)，dB", xb[5] + W2 / 2 + 0.05, Y2 + H2 + 0.12, 0.9, { align: "left" });
  const Cc = [
    ["阈值判决", ["ν(t) 上穿 η", "η = 1 dB（情况 1）；有他人说话时 3.5 dB"]],
    ["回溯开口时刻", ["退到 ν 最后一次 ≤ η/2 的下一帧"]],
    ["输出开口帧", ["t_{on} → 框图②", "取背景帧与目标帧"]],
  ];
  const xc = [0, 1, 2].map((i) => 0.6 + i * (W2 + G2));
  Cc.forEach(([t, l], i) => { blk(s, xc[i], Y3, W2, H3, t, l); if (i < 2) arrow(s, xc[i] + W2, Y3 + H3 / 2, xc[i + 1], Y3 + H3 / 2); });
  blk(s, xb[1], Y3, W2 * 2 + G2, H3, "自语音检测【设计】", ["骨声纹传感器判定佩戴者在说话时，该帧不进背景、不进目标，输出冻结"], { dash: "dash", line: C.box, tcolor: C.gray, color: C.gray });
}

// ================= 4 细框图②：定位核心 =================
{
  const s = newSlide("算法框图②　定位核心（每 0.25 s 一次）", SRC_D + "；帧缓存为实现所需，按开口检测最长 0.3 s 时延估算",
    "背景窗 [t_on − 1.05 s, t_on − 0.05 s)，目标窗 [t_on, t_d]，最长 1 s。因为开口要在 t_on 之后才被检出（情况 1 仿真中 0.3 s 内全部检出），背景帧必须事先缓存：1.5 s × 62.5 帧 × 3 路 × 218 频点，复数半精度约 240 KB。代码：methods.frame_energy_db、onset_weights、covariance、music；时间窗 run_camera_policy.gevd_spec。");
  key(s, "从帧缓存取开口前的背景、开口后的目标，背景 Cholesky 白化目标，取噪声子空间，再在 72 个方向上扫描模板");
  const W = 1.75, G = 0.32, H = 1.05;
  const xs = [0, 1, 2, 3, 4, 5].map((i) => 0.6 + i * (W + G));
  const Y1 = 1.7, Y2 = 3.35, Y3 = 5.0;
  const A = [
    ["帧缓存", ["最近 1.5 s 的 x(f,t)", "94 帧 × 3 × 218，约 240 KB"]],
    ["取背景帧", ["[t_{on} − 1.05 s, t_{on} − 0.05 s)", "62 帧，等权"]],
    ["外积平均", ["R_b(f) = (1/62) Σ x x^H", "218 个 3×3"]],
    ["对角加载 + Cholesky", ["L L^H = R_b + δI", "δ = 0.01·tr(R_b) / 3"]],
    ["三角求逆", ["L^{−1}(f)", "218 个下三角 3×3"]],
  ];
  A.forEach(([t, l], i) => { blk(s, xs[i], Y1, W, H, t, l); if (i < 4) arrow(s, xs[i] + W, Y1 + H / 2, xs[i + 1], Y1 + H / 2); });
  lab(s, "t_{on}（框图①）", xs[1], Y1 - 0.24, W);
  const B = [
    ["取目标帧", ["[t_{on}, t_d]，最长 1 s", "t_d：开口后 0.5 s 起，每 0.25 s"]],
    ["帧能量", ["e(t) = 10·lg mean_{m,f} |X_m|^2"]],
    ["起始段权重", ["w = 0.2 + min(max(Δe, 0), 10)/10", "e < max e − 30 dB 时 w = 0"]],
    ["加权外积平均", ["R_s(f) = Σ w x x^H / Σ w", "218 个 3×3"]],
    ["白化", ["R_w = L^{−1} R_s L^{−H}"]],
    ["3×3 特征分解", ["R_w = U Λ U^H", "E_n = [u_2, u_3]：218 个 3×2"]],
  ];
  arrow(s, xs[0] + W / 2, Y1 + H, xs[0] + W / 2, Y2);
  B.forEach(([t, l], i) => { blk(s, xs[i], Y2, W, H, t, l); if (i < 5) arrow(s, xs[i] + W, Y2 + H / 2, xs[i + 1], Y2 + H / 2); });
  arrow(s, xs[4] + W / 2, Y1 + H, xs[4] + W / 2, Y2);
  lab(s, "L^{−1}(f)", xs[4] + W / 2 + 0.04, Y1 + H + 0.16, 0.8, { align: "left" });
  const Cc = [
    ["方向模板（ROM）", ["h(θ,f)：72 × 218 × 3", "头部传递函数，184 KB"]],
    ["归一化 + 白化", ["a = h / ‖h‖", "a_w = L^{−1} a（L^{−1} 来自第 1 行）"]],
    ["投影", ["‖E_n^H a_w‖^2，‖a_w‖^2", "72 × 218"]],
    ["单频点谱", ["P_f(θ) = ‖a_w‖^2 / ‖E_n^H a_w‖^2"]],
    ["每频点归一化", ["P_f(θ) / max_θ P_f(θ)", "峰值归一到 1"]],
    ["频点平均", ["P(θ) = mean_f，218 个频点", "→ 72 个方向的空间谱"]],
  ];
  Cc.forEach(([t, l], i) => { blk(s, xs[i], Y3, W, H, t, l); if (i < 5) arrow(s, xs[i] + W, Y3 + H / 2, xs[i + 1], Y3 + H / 2); });
  const ym = (Y2 + H + Y3) / 2;
  arrow(s, xs[5] + W / 2, Y2 + H, xs[5] + W / 2, ym, { arrow: false });
  arrow(s, xs[5] + W / 2, ym, xs[2] + W / 2, ym, { arrow: false });
  arrow(s, xs[2] + W / 2, ym, xs[2] + W / 2, Y3);
  lab(s, "E_n(f)", xs[4], ym - 0.23, W);
  lab(s, "P(θ) → 框图③", xs[5], Y3 + H + 0.04, W);
}

// ================= 5 细框图③：找峰、融合与输出 =================
{
  const s = newSlide("算法框图③　找峰、融合与输出", SRC_D + "；λ、μ 在开发数据上调得",
    "情况 1 中摄像头平时不开，L8 只在需要确认是哪张脸或校正方位偏差时使用；不开摄像头时直接输出插值后的 θ̂。像素到方位的换算、IMU 世界坐标跟踪、置信度为设计，仿真中视觉直接给出人脸方位（误差 2°）。代码：methods.peak、methods.fuse_soft。");
  key(s, "空间谱取峰并插值得到方位；摄像头打开时在人脸附近取谱峰打分；输出按 IMU 换到世界坐标，每 16 ms 下发");
  const W = 1.75, G = 0.32, H = 1.05;
  const xs = [0, 1, 2, 3, 4, 5].map((i) => 0.6 + i * (W + G));
  const Y1 = 1.7, Y2 = 3.35, Y3 = 5.0;
  const A = [
    ["空间谱", ["P(θ)，72 个方向", "θ = −180°, −175°, …, 175°"]],
    ["找峰", ["k^* = argmax_k P(θ_k)"]],
    ["抛物线插值", ["δ = (P_{k−1} − P_{k+1}) /", "(2(P_{k−1} − 2P_k + P_{k+1}))，|δ| ≤ 0.5"]],
    ["方位", ["θ̂ = θ_{k^*} + 5°·δ"]],
  ];
  A.forEach(([t, l], i) => { blk(s, xs[i], Y1, W, H, t, l); if (i < 3) arrow(s, xs[i] + W, Y1 + H / 2, xs[i + 1], Y1 + H / 2); });
  const B = [
    ["摄像头（按需打开）", ["低帧率 1–2 fps", "两耳各一"]],
    ["人脸检测", ["人脸框中心像素 u_i", "（视觉模块）"]],
    ["像素 → 方位【设计】", ["φ_i = atan((u_i − c_x)/f_x)", "+ 摄像头安装偏角"]],
    ["换到头心坐标【设计】", ["按摄像头与头心的位置", "和曝光时刻的 IMU 角度"]],
  ];
  B.forEach(([t, l], i) => { blk(s, xs[i], Y2, W, H, t, l, { dash: "dash" }); if (i < 3) arrow(s, xs[i] + W, Y2 + H / 2, xs[i + 1], Y2 + H / 2, { dash: "dash" }); });
  // 融合
  const xf = xs[4], yf = Y1 + 0.2, hf = Y2 + H - yf - 0.2;
  blk(s, xf, yf, W, hf, "融合打分", ["只用声音：s_0 = P(θ_{k^*}) − μ", "第 i 张脸：", "s_i = max_{|θ−φ_i|≤8°} P(θ)", "+ λ(l_i − 0.5)", "λ = 0.1，μ = 0.05", "（低帧率档 l_i = 0.5）"]);
  arrow(s, xs[3] + W, Y1 + H / 2, xf, Y1 + H / 2);
  arrow(s, xs[3] + W, Y2 + H / 2, xf, Y2 + H / 2, { dash: "dash" });
  blk(s, xs[5], yf, W, hf, "选择", ["max_i s_i > s_0：", "θ_{out} = φ_{i^*}", "否则：θ_{out} = θ_{k^*}", "（不开摄像头：θ_{out} = θ̂）"]);
  arrow(s, xf + W, yf + hf / 2, xs[5], yf + hf / 2);
  // 输出
  const Cc = [
    ["IMU 换坐标【设计】", ["θ_{world} = θ_{out} + ψ(t)", "ψ：头部偏航角，200 Hz"]],
    ["跟踪【设计】", ["世界坐标下保持目标方位", "转头时目标不丢"]],
    ["置信度【待确认】", ["候选：P(θ_{k^*})", "或峰值与次峰之比"]],
    ["打包下发", ["每 16 ms 8 字节：方位 2 B、置信度 1 B、", "说话 1 B、干扰方位 3 B、序号 1 B"]],
  ];
  const xc = [xs[5], xs[4], xs[3], xs[1]];
  arrow(s, xs[5] + W / 2, yf + hf, xs[5] + W / 2, Y3);
  Cc.forEach(([t, l], i) => {
    const w = i === 3 ? W * 2 + G : W;
    blk(s, xc[i], Y3, w, H, t, l, i === 2 ? { dash: "dash", line: C.box } : {});
    if (i < 3) arrow(s, xc[i], Y3 + H / 2, xc[i + 1] + (i + 1 === 3 ? W * 2 + G : W), Y3 + H / 2);
  });
  arrow(s, xs[1], Y3 + H / 2, xs[0] + W, Y3 + H / 2);
  blk(s, xs[0], Y3, W, H, "→ 增强模块", ["两耳增强（波束成形等）"], { line: C.box });
}

// ================= 9 参数与计算量汇总 =================
{
  const s = newSlide("参数与计算量汇总", "计算量为估算（每 0.25 s 扫描一次，72 个方向，218 个频点）；参数为仿真所用值",
    "参数来源：帧长、频带、扫描间隔、时间常数、背景窗、保护间隔、对角加载为设计值；方向网格 5° 来自算法比较仿真；开口阈值来自情况 1 仿真；融合门限与 λ、μ 在开发数据上调得。内存：方向模板约 184 KB，帧缓存约 240 KB（1.5 s × 62.5 帧 × 3 × 218，复数半精度），背景与目标协方差约 31 KB，开口检测的两份递推协方差约 31 KB，合计约 0.5 MB。帧缓存可改为每 0.1 s 存一份递推背景协方差的快照来缩小【设计，未仿真】。");
  key(s, `合计约 19 MFLOPS（定位 ${CX["2+1（两耳，3 路） | GEVD-MUSIC"].total_mflops} + 开口检测 6.6），内存约 0.5 MB；计算最大头是 L6 方向扫描，内存最大头是帧缓存与方向模板`);
  table(s, [
    [head("层"), head("主要参数"), head("每秒计算量", { align: "center" }), head("内存", { align: "center" })],
    [bold("L1 高通"), cell("4 阶 Butterworth，100 Hz"), ctr(mf(g["高通"])), ctr("很小")],
    [bold("L2 分帧 + FFT"), cell("512 点汉宁窗，帧移 256；200–7000 Hz"), ctr(mf(g["分帧 + FFT"])), ctr("3 KB")],
    [bold("帧缓存"), cell("最近 1.5 s 的频谱（开口检出有时延，背景帧须事先缓存）"), ctr("—"), ctr("240 KB")],
    [bold("L3 开口检测"), cell("时间常数 0.25 s / 1 s；阈值 1 dB；每 32 ms"), ctr("6.6 MFLOPS"), ctr("31 KB")],
    [bold("L4 协方差"), cell("背景 1 s，保护 0.05 s；目标最长 1 s，起始段加权"), ctr(mf(g["协方差"] + g["判帧"])), ctr("31 KB")],
    [bold("L5 白化 + 特征分解"), cell("对角加载 1%；噪声子空间 2 维"), ctr(mf(g["白化 + 特征分解"])), ctr("—")],
    [bold("L6 空间谱扫描"), cell("72 个方向（5°），每 0.25 s"), ctr(mf(g["方向扫描"]), { bold: true }), ctr("模板 184 KB")],
    [bold("L7 找峰 + 插值"), cell("抛物线插值"), ctr("很小"), ctr("—")],
    [bold("L8 融合"), cell("门限 8°，λ = 0.1，μ = 0.05"), ctr("很小"), ctr("—")],
    [bold("L9 输出"), cell("每 16 ms，8 字节"), ctr("很小"), ctr("—")],
  ], 0.6, 1.75, [2.4, 5.6, 2.1, 2.03], [0.4, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42]);
}

// ================= 3 L1–L2 预处理与分帧 =================
{
  const s = newSlide("附录 A1　L1–L2 高通与分帧 FFT", SRC,
    "L1 在仿真中对语音源做离线零相位滤波（sim.highpass，sosfiltfilt）；实时实现为两个二阶节级联的因果 IIR，每样本约 10 次乘加。L2：周期汉宁窗，相邻帧重叠 50%，汉宁窗在 50% 重叠下叠加为常数。频点序号 7–224 对应 218.75–7000 Hz。");
  key(s, "每 16 ms 取最近 32 ms 的 3 路信号，加汉宁窗做 512 点 FFT，保留 218 个频点");
  let y = 1.85;
  T(s, "L1 高通", { x: 0.6, y, w: 6, h: 0.3, fontSize: 13, bold: true, color: C.navy }); y += 0.4;
  note(s, ["4 阶 Butterworth 高通，截止 100 Hz：去掉直流和低频风噪。",
    "实现为两个二阶节（biquad）级联，每路每样本约 10 次乘加。"], 0.6, y, 7.0, 0.8); y += 1.0;
  T(s, "L2 分帧加窗 + FFT", { x: 0.6, y, w: 6, h: 0.3, fontSize: 13, bold: true, color: C.navy }); y += 0.45;
  y = eq(s, "stft", 0.6, y, "短时傅里叶变换") + 0.2;
  y = eq(s, "win", 0.6, y, "汉宁窗、观测向量") + 0.2;
  table(s, [
    [head("参数"), head("值", { align: "center" })],
    [bold("采样率"), ctr("16 kHz")],
    [bold("帧长 / 帧移"), ctr("512 点（32 ms）/ 256 点（16 ms）")],
    [bold("频率分辨率"), ctr("31.25 Hz")],
    [bold("保留频带"), ctr("200–7000 Hz，频点 7–224，共 218 个")],
    [bold("输出"), ctr("每帧 3 × 218 个复数")],
    [bold("计算量"), ctr(`${mf(g["高通"])}（L1）+ ${mf(g["分帧 + FFT"])}（L2）`)],
  ], 8.1, 1.85, [1.55, 3.08], [0.4, 0.42, 0.42, 0.42, 0.42, 0.42, 0.42]);
}

// ================= 4 L3 开口检测 =================
{
  const s = newSlide("附录 A2　L3 开口检测", SRC + "；阈值 1 dB 为情况 1（只有噪声）的设置，有其他人说话时为 3.5 dB",
    "代码：run_camera_policy.novelty_raw（每 2 帧算一次，从第 0.3 s 起）、acoustic_onsets（从第 1 s 起判决）。背景协方差在本帧判决之后才用本帧更新，所以白化用的背景不含当前帧。δ = 0.01·tr(R̃_b)/3 为对角加载，防止 Cholesky 数值不稳。每个频点约 880 次浮点运算（Cholesky、求逆、白化、3×3 特征值），每 32 ms 一次约 6.0 MFLOPS，加短时协方差约 0.65 MFLOPS。");
  key(s, "背景白化后看最大特征值：只有背景时约 0 dB，有人开口时上升，超过阈值即判为开口");
  let y = 1.8;
  y = eq(s, "ss", 0.6, y, "短时协方差") + 0.18;
  y = eq(s, "sb", 0.6, y, "背景协方差") + 0.18;
  y = eq(s, "bias", 0.6, y, "偏差校正") + 0.18;
  y = eq(s, "nu", 0.6, y, "新声源能量") + 0.3;
  note(s, ["判决：ν(t) 上穿阈值 η 时判为有人开口；回溯到 ν 最后一次不超过 η/2 的下一帧，作为开口帧 t_on。",
    "含义：白化后背景在各方向上能量相同，λ_max ≈ 1（0 dB）；新出现的声音使 λ_max 上升。取 218 个频点的中位数，抗单个频点的干扰。",
    "情况 1 只有噪声，阈值取 1 dB：嘈杂环境 0.5–4 m 开口后 0.3 s 内 100% 检出，750 s 纯噪声段 0 次误检（仿真）。"], 0.6, y, 12.1, 2.0);
}

// ================= 5 L4 协方差估计 =================
{
  const s = newSlide("附录 A3　L4 背景与目标协方差", SRC,
    "代码：methods.frame_energy_db、onset_weights、covariance；时间窗 run_camera_policy.gevd_spec。保护间隔 0.05 s（3 帧）避免把开口时刻误差内的目标声算进背景。起始段加权与场景一 ssl_baseline 相同：能量比上一帧升高的帧，直达声占比高、混响尚未到达，权重最大 1.2；不升高的帧权重 0.2；低于窗内最大能量 30 dB 的帧不用。");
  key(s, "开口前 1 s 估计背景（噪声 + 混响），开口后的帧估计目标；能量上升的帧权重大，抑制混响");
  let y = 1.8;
  y = eq(s, "rb", 0.6, y, "背景协方差") + 0.22;
  y = eq(s, "e", 0.6, y, "帧能量") + 0.22;
  y = eq(s, "w", 0.6, y, "起始段权重") + 0.22;
  y = eq(s, "rs", 0.6, y, "目标协方差") + 0.25;
  table(s, [
    [head("量"), head("时间窗"), head("说明")],
    [bold("R_b(f)"), cell("开口前 1.05 s 至前 0.05 s"), cell("等权平均；包含噪声与混响")],
    [bold("R_s(f)"), cell("开口起，至判决时刻（最长 1 s）"), cell("判决在开口后 0.5 s；运行时每 0.25 s 更新")],
    [bold("维度"), cell("每个频点 3×3 厄米矩阵"), cell("218 个频点 × 2 份，约 31 KB")],
  ], 0.6, y + 0.05, [1.4, 4.0, 6.73], [0.36, 0.38, 0.38, 0.38]);
}

// ================= 6 L5–L6 白化、特征分解与空间谱 =================
{
  const s = newSlide("附录 A4　L5–L6 白化、特征分解与空间谱", SRC,
    "代码：methods.music（Rb 不为空时为 GEVD-MUSIC）。白化后的特征分解等价于广义特征值问题 R_s v = λ R_b v。单声源时最大特征向量对应目标，其余 M−1 = 2 个为噪声子空间。导向向量 a 为方向模板 h 归一化后的值，同样经 L⁻¹ 白化。每个频点先把谱归一化到峰值 1 再在 218 个频点上平均，避免少数强频点主导。计算量：L5 每个频点每 0.25 s 一次（Cholesky、求逆、两次 3×3 乘、3×3 特征分解）；L6 每个方向每个频点约 15 次复数乘加。");
  key(s, "先用背景把噪声和混响白化，再用噪声子空间在 72 个方向上扫描；不白化时远处会失效");
  let y = 1.78;
  T(s, "L5 背景白化 + 特征分解（每个频点）", { x: 0.6, y, w: 8, h: 0.3, fontSize: 13, bold: true, color: C.navy }); y += 0.4;
  y = eq(s, "chol", 0.6, y, "Cholesky 分解") + 0.16;
  y = eq(s, "rw", 0.6, y, "白化、特征分解") + 0.16;
  y = eq(s, "en", 0.6, y, "噪声子空间") + 0.32;
  T(s, "L6 空间谱扫描（MUSIC）", { x: 0.6, y, w: 8, h: 0.3, fontSize: 13, bold: true, color: C.navy }); y += 0.4;
  y = eq(s, "aw", 0.6, y, "导向向量") + 0.16;
  y = eq(s, "pf", 0.6, y, "单频点谱") + 0.16;
  y = eq(s, "p", 0.6, y, "宽带谱");
  table(s, [
    [head("层"), head("每秒计算量", { align: "center" })],
    [bold("L5 白化 + 特征分解"), ctr(mf(g["白化 + 特征分解"]))],
    [bold("L6 空间谱扫描"), ctr(mf(g["方向扫描"]))],
  ], 9.3, 1.85, [2.0, 1.43], [0.4, 0.42, 0.42]);
}

// ================= 7 L7–L9 找峰、融合与输出 =================
{
  const s = newSlide("附录 A5　L7–L9 找峰、融合与输出", SRC + "；λ、μ 在开发数据上调得",
    "代码：methods.peak（抛物线插值）、methods.fuse_soft（λ = 0.1，μ = 0.05，门限 8°）。没选中人脸时，融合分支输出网格峰值 θ_k*；不做融合时输出插值后的 θ̂。低帧率档没有唇动信息，l_i 取 0.5。L9 为设计：置信度的计算方式待确认（候选：空间谱峰高 P(θ_k*)，或峰值与次峰之比），尚未在仿真中验证。");
  key(s, "空间谱取峰并插值得到方位；摄像头打开时与人脸方位融合；输出按 IMU 换到世界坐标");
  let y = 1.78;
  T(s, "L7 找峰 + 抛物线插值", { x: 0.6, y, w: 8, h: 0.3, fontSize: 13, bold: true, color: C.navy }); y += 0.4;
  y = eq(s, "k", 0.6, y, "网格峰值") + 0.14;
  y = eq(s, "delta", 0.6, y, "插值偏移") + 0.14;
  y = eq(s, "theta", 0.6, y, "方位") + 0.2;
  T(s, "L8 与人脸融合（摄像头按需打开时）", { x: 0.6, y, w: 8, h: 0.3, fontSize: 13, bold: true, color: C.navy }); y += 0.4;
  y = eq(s, "s0", 0.6, y, "只用声音") + 0.12;
  y = eq(s, "si", 0.6, y, "第 i 张人脸") + 0.12;
  y = eq(s, "out", 0.6, y, "选择") + 0.2;
  T(s, "L9 输出", { x: 0.6, y, w: 8, h: 0.3, fontSize: 13, bold: true, color: C.navy }); y += 0.4;
  eq(s, "world", 0.6, y, "世界坐标");
  table(s, [
    [head("输出字段（每 16 ms，8 字节）"), head("字节", { align: "center" })],
    [cell("目标方位（0.01°）"), ctr("2")],
    [cell("置信度【待确认】"), ctr("1")],
    [cell("是否在说话"), ctr("1")],
    [cell("主要干扰方位"), ctr("3 × 1")],
    [cell("序号"), ctr("1")],
  ], 9.3, 1.85, [2.6, 0.83], [0.4, 0.38, 0.38, 0.38, 0.38, 0.38]);
}

// ================= 8 方向模板 =================
{
  const s = newSlide("附录 A6　方向模板：刚性球头部传递函数", "仿真用刚性球头部模型（无耳廓）；产品中改为样机或标准人工头实测",
    "代码：sphere.sphere_tf、earbud_mic_set('2+1')。j_n、h_n 为球贝塞尔与第一类球汉克尔函数，P_n 为勒让德多项式，γ 为声源与麦克风相对头心的夹角，a 为头半径。除以自由场 e^{jkr_s}/r_s 后取共轭，得到相对头心的传递函数。模板按 1.5 m 距离制作；仿真中 0.5–4 m 的声源都用同一套模板。头型、佩戴与模板不一致时的影响见模板失配仿真：加视觉时基本不受影响，纯声学有 5–10° 系统偏差，可用人脸方位在线校正。");
  key(s, "72 个方向、218 个频点、3 路的传递函数离线算好存在主耳，约 184 KB；L6 扫描时直接查表");
  let y = 1.85;
  y = eq(s, "sphere", 0.6, y, "头部散射声压") + 0.2;
  y = eq(s, "htf", 0.6, y, "传递函数") + 0.3;
  table(s, [
    [head("麦克风"), head("位置（头心为原点，x 前、y 左、z 上，cm）", { align: "center" }), head("用途", { align: "center" })],
    [bold("主耳前麦"), ctr("(0.75, a + 0.8, −1.2)"), ctr("定位、本地增强")],
    [bold("主耳后麦"), ctr("(−0.75, a + 0.8, −1.2)"), ctr("定位、本地增强")],
    [bold("副耳前麦"), ctr("(0.75, −(a + 0.8), −1.2)"), ctr("ADPCM 转发给主耳")],
  ], 0.6, y, [2.0, 5.2, 3.0], [0.38, 0.38, 0.38, 0.38]);
  note(s, ["a = 8.75 cm（头半径），c = 343 m/s；模板存储：72 × 218 × 3 个复数，半精度 4 字节，约 184 KB。"], 0.6, y + 1.7, 12.1, 0.6);
}

p.writeFile({ fileName: OUT }).then((f) => console.log("saved", f));
