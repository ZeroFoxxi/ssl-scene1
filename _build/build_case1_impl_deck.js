// 耳机声源定位：情况 1 算法实现（给 mentor，回应 mentor 11-23 "每个 layer 都得清楚，具体的计算公式都要清楚，详细列出每个步骤的框图"）。
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

// ---------- 富文本（_ 下标，^ 上标，{} 分组），用于框图标注和表格中的公式 ----------
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
// 多行富文本：lines 为字符串数组，行间换行
const richLines = (lines, base) => {
  const out = [];
  lines.forEach((ln, k) => { const r = rich(ln, base); if (k < lines.length - 1) r[r.length - 1].options = Object.assign({}, r[r.length - 1].options, { breakLine: true }); out.push(...r); });
  return out;
};
// 框图中的运算块：编号 + 名称（粗体）+ 一行说明
function node(s, x, y, w, h, num, name, sub, o) {
  o = o || {};
  s.addShape(p.shapes.RECTANGLE, { x, y, w, h, fill: { color: o.fill || "FFFFFF" }, line: { color: o.line || C.navy, width: o.lw || 1, dashType: o.dash || "solid" } });
  const base = { fontFace: F, lang: "zh-CN", fontSize: 9, color: o.color || C.gray };
  const runs = [{ text: (num ? num + " " : "") + name, options: { fontFace: F, lang: "zh-CN", fontSize: 10, bold: true, color: o.tcolor || C.navy, breakLine: !!sub } }];
  if (sub) runs.push(...rich(sub, base));
  s.addText(runs, { x: x + 0.03, y, w: w - 0.06, h, align: "center", valign: "middle", margin: 0.02, isTextBox: true });
}
const arrow = (s, x1, y1, x2, y2, o) => line(s, x1, y1, x2, y2, Object.assign({ color: C.navy, width: 1 }, o || {}));
const small = (s, text, x, y, w, o) => s.addText(rich(text, { fontFace: F, lang: "zh-CN", fontSize: 8.5, color: C.gray }),
  Object.assign({ x, y, w, h: 0.24, align: "center", valign: "middle", margin: 0, isTextBox: true }, o || {}));

// ================= 2 信号流图 =================
{
  const s = newSlide("算法框图", "编号与下两页的逐步说明表对应；每个模块展开到具体运算的详细框图见《情况1算法框图（大图）》；虚线为按需或设计中的部分；计算量为估算",
    "主线（中间一行）每 0.25 s 做一次定位；上方支路是开口检测，每帧都在跑，给出对方开口的时刻 t_on；下方是离线的方向模板、自语音检测、输出，以及 IMU。摄像头在情况 1 中平时不开，只在需要确认是哪张脸时短暂打开。代码对应见逐步说明表的备注。");
  key(s, "声音每 16 ms 变成 3 × 218 个频点；开口检测给出开口时刻；每 0.25 s 用开口前后的帧白化、扫描 72 个方向，输出方位");
  const P = 1.1, W = 0.92, H = 0.82, X0 = 0.6;
  const X = (i) => X0 + i * P;
  const YM = 3.55, YU = 2.0, YL = 5.2;
  const main = [
    ["①", "麦克风", "3 路，16 kHz"], ["②", "高通", "100 Hz"], ["③", "分帧加窗", "512 点，移 256"], ["④", "FFT", "取 3 × 218 频点"],
    ["⑤", "帧缓存", "最近 1.5 s"], ["⑨", "协方差", "R_b、R_s"], ["⑩", "白化", "L^{−1}"], ["⑪", "特征分解", "E_n：3 × 2"],
    ["⑫", "空间谱", "72 个方向"], ["⑬", "找峰插值", "θ_a"], ["⑭", "融合", "θ_{out}"],
  ];
  main.forEach(([n, a, b], i) => { node(s, X(i), YM, W, H, n, a, b); if (i < main.length - 1) arrow(s, X(i) + W, YM + H / 2, X(i + 1), YM + H / 2); });
  // 上方支路：开口检测（每 32 ms）
  const up = [["⑥", "递推平均", "S_s、S_b"], ["⑦", "最大特征值", "ν(t)，dB"], ["⑧", "判决回溯", "t_{on}"]];
  up.forEach(([n, a, b], i) => { node(s, X(4 + i), YU, W, H, n, a, b); if (i < 2) arrow(s, X(4 + i) + W, YU + H / 2, X(5 + i), YU + H / 2); });
  const bx = X(4) - (P - W) / 2;
  arrow(s, bx, YM + H / 2, bx, YU + H / 2, { arrow: false });
  arrow(s, bx, YU + H / 2, X(4), YU + H / 2);
  arrow(s, X(6) + W / 2, YU + H, X(5) + W / 2 + 0.15, YM);
  small(s, "t_{on}", X(5) + 0.62, YU + H + 0.08, 0.5);
  small(s, "开口检测：每 32 ms", X(4), YU - 0.3, W * 3 + (P - W) * 2);
  // 摄像头（按需）
  node(s, X(9) + 0.1, YU, W * 2 + (P - W) - 0.1, H, "", "摄像头（按需打开）", "人脸方位 φ_i，1–2 fps", { dash: "dash", line: C.box });
  arrow(s, X(10) + W / 2, YU + H, X(10) + W / 2, YM, { dash: "dash" });
  // 下方：自语音、方向模板、输出、IMU
  node(s, X(5) - 0.05, YL, W + 0.1, H, "", "自语音检测", "【设计】跳过该帧", { dash: "dash", line: C.box });
  arrow(s, X(5) + W / 2, YL, X(5) + W / 2, YM + H, { dash: "dash" });
  node(s, X(8) - 0.15, YL, W + 0.3, H, "", "方向模板", "72 × 218 × 3，184 KB", { line: C.box });
  arrow(s, X(8) + W / 2, YL, X(8) + W / 2, YM + H);
  node(s, X(9) + 0.1, YL, W * 2 + (P - W) - 0.1, H, "⑮", "输出", "θ_{world} = θ_{out} + ψ，8 B / 16 ms → 增强");
  arrow(s, X(10) + W / 2, YM + H, X(10) + W / 2, YL);
  node(s, X(9) + 0.1, YL + H + 0.25, W, 0.5, "", "IMU", "ψ(t)", { line: C.box });
  arrow(s, X(9) + 0.1 + W / 2, YL + H + 0.25, X(9) + 0.1 + W / 2, YL + H);
  // 处理节奏
  const br = (i0, i1, text) => {
    const x1 = X(i0), x2 = X(i1) + W, y = YM + H + 0.12;
    s.addShape(p.shapes.LINE, { x: x1, y, w: x2 - x1, h: 0, line: { color: C.navyLt, width: 1.5 } });
    small(s, text, x1, y + 0.04, x2 - x1);
  };
  br(0, 1, "逐样本，16 kHz"); br(2, 4, "每 16 ms 一帧"); br(5, 9, "每 0.25 s 一次（开口后 0.5 s 起）"); br(10, 10, "每 16 ms");
  // 计算量
  small(s, "计算量：①–④ 2.1　⑥–⑧ 6.6　⑨ 0.8　⑩⑪ 1.0　⑫ 8.2　⑬–⑮ 很小　合计约 19 MFLOPS", X(0), 6.55, 8.5, { align: "left" });
}

// ================= 3–4 逐步说明表 =================
const stepTable = (s, rows, y) => {
  const fbase = { fontFace: F, lang: "zh-CN", fontSize: 9.5, color: C.ink };
  const R = (txt) => ({ text: richLines(Array.isArray(txt) ? txt : [txt], fbase), options: { fontFace: F, fontSize: 9.5, valign: "middle", border: [NONE, NONE, RULE, NONE] } });
  const hd = (t) => head(t, { fontSize: 10 });
  const body = rows.map(([n, name, fml, par, outp, mfl]) => [ctr(n, { fontSize: 11, bold: true, color: C.navy }), bold(name, { fontSize: 10 }), R(fml), R(par), R(outp), ctr(mfl, { fontSize: 9.5 })]);
  table(s, [[hd("步"), hd("运算"), hd("公式"), hd("参数"), hd("输出"), hd("MFLOPS")], ...body], 0.6, y, [0.45, 1.35, 5.3, 2.35, 1.75, 0.93],
    [0.36, ...rows.map((r) => (Array.isArray(r[2]) && r[2].length > 2 ? 0.68 : Array.isArray(r[2]) && r[2].length === 2 ? 0.55 : 0.42))]);
};
{
  const s = newSlide("逐步说明（一）：前端与开口检测", "参数为仿真所用值；计算量为估算；完整推导见附录 A1–A2",
    "代码：② sim.highpass（仿真中离线零相位，实时为因果 IIR）；③④ sim.stft；⑥–⑧ run_camera_policy.novelty_raw、acoustic_onsets。⑥ 的背景协方差在本帧判决之后才用本帧更新；⑦ 从第 0.3 s 起每 2 帧算一次，⑧ 从第 1 s 起判决。⑤ 帧缓存为实现所需：背景取开口前 1 s 的帧，而开口要在之后（情况 1 仿真中 0.3 s 内）才被检出。");
  key(s, "前端把 3 路声音变成每帧 3 × 218 个频点；开口检测看背景白化后的最大特征值，上穿阈值即给出开口时刻");
  stepTable(s, [
    ["①", "采集与汇集", ["主耳前、后 2 路；副耳前麦 1 路经 ADPCM 压缩转发，主耳解码", "按采样计数对齐"], "16 kHz、16 bit；两耳同步 ≤ 50 µs", "3 路 x_m[n]", "—"],
    ["②", "高通", "y_m[n] = HPF(x_m[n])", "4 阶 Butterworth，100 Hz", "3 路 y_m[n]", "1.0"],
    ["③", "分帧加窗", "y_m(256t + n)·w(n)，w(n) = 0.5 − 0.5cos(2πn/512)", "帧长 512（32 ms），帧移 256（16 ms）", "每帧 3 × 512", "—"],
    ["④", "FFT 取频带", "X_m(f,t) = Σ_n y_m(256t + n) w(n) e^{−j2πfn/512}，x(f,t) = [X_1, X_2, X_3]^T", "512 点；频点 7–224（200–7000 Hz）", "x(f,t)：3 × 218", "1.2"],
    ["⑤", "帧缓存", "保存最近 1.5 s 的 x(f,t)", "94 帧，复数半精度", "约 240 KB", "—"],
    ["⑥", "递推协方差", ["S ← αS + (1 − α) x x^H（短时 S_s、背景 S_b 两路）", "偏差校正：R̃ = S / (1 − α^t)"], "α_s = 0.938（0.25 s）；α_b = 0.984（1 s）", "218 × 两个 3×3", "6.6"],
    ["⑦", "白化最大特征值", ["L L^H = R̃_b + δI", "ν(t) = 10·lg median_f λ_{max}(L^{−1} R̃_s L^{−H})"], "δ = 0.01·tr(R̃_b) / 3；每 32 ms", "ν(t)，dB", "（含在⑥）"],
    ["⑧", "判决回溯", "ν(t) 上穿 η 判为开口；回溯到 ν 最后一次 ≤ η/2 的下一帧", "η = 1 dB（情况 1）；有他人说话时 3.5 dB", "开口帧 t_{on}", "很小"],
  ], 1.65);
}
{
  const s = newSlide("逐步说明（二）：定位、融合与输出", "参数为仿真所用值；计算量为估算；λ、μ 在开发数据上调得；标【设计】的为方案设计、仿真中未实现；完整推导见附录 A3–A6",
    "代码：⑨ methods.frame_energy_db、onset_weights、covariance（时间窗 run_camera_policy.gevd_spec）；⑩–⑫ methods.music；⑬ methods.peak；⑭ methods.fuse_soft。⑭ 没选中人脸时输出网格峰值 θ_k*；不开摄像头时直接输出 ⑬ 的 θ_a。置信度的计算方式待确认（候选：空间谱峰高，或峰值与次峰之比）。");
  key(s, "每 0.25 s：开口前 1 s 估背景、开口后估目标，背景白化后用噪声子空间扫描 72 个方向，取峰得到方位");
  stepTable(s, [
    ["⑨", "协方差", ["R_b = 平均 x x^H，t ∈ [t_{on} − 1.05 s, t_{on} − 0.05 s)", "R_s = Σ w x x^H / Σ w，t ∈ [t_{on}, t_d]；w = 0.2 + min(max(Δe, 0), 10)/10"], "背景 1 s、保护 0.05 s；目标最长 1 s；e < max e − 30 dB 的帧 w = 0", "218 × 两个 3×3", "0.8"],
    ["⑩", "白化", ["L L^H = R_b + δI，R_w = L^{−1} R_s L^{−H}"], "δ = 0.01·tr(R_b) / 3", "218 × 3×3", "1.0"],
    ["⑪", "特征分解", "R_w = U Λ U^H，E_n = [u_2, u_3]", "单声源：噪声子空间 2 维", "218 × 3×2", "（含在⑩）"],
    ["⑫", "空间谱", ["a_w = L^{−1} h / ‖h‖，P_f(θ) = ‖a_w‖^2 / ‖E_n^H a_w‖^2", "P(θ) = 平均_f [P_f(θ) / max_θ P_f]"], "72 个方向（5°）；模板 h(θ,f) 见附录 A6", "P(θ)：72 个", "8.2"],
    ["⑬", "找峰插值", ["k^* = argmax P，δ = (P_{k−1} − P_{k+1}) / (2(P_{k−1} − 2P_k + P_{k+1}))", "θ_a = θ_{k^*} + 5°·δ（声学方位）"], "|δ| ≤ 0.5", "θ_a", "很小"],
    ["⑭", "融合", ["s_0 = P(θ_{k^*}) − μ；s_i = max_{|θ−φ_i|≤8°} P(θ) + λ(l_i − 0.5)", "取得分最高者：人脸 φ_{i^*} 或 θ_{k^*}"], "λ = 0.1，μ = 0.05；摄像头按需打开", "θ_{out}", "很小"],
    ["⑮", "输出", "θ_{world} = θ_{out} + ψ(t)（IMU 偏航角）；打包下发", "每 16 ms 8 字节；置信度【待确认】", "→ 增强模块", "很小"],
  ], 1.65);
  s.addText(rich("外部输入：方向模板（离线，184 KB，附录 A6）；摄像头人脸方位 φ_i = atan((u_i − c_x) / f_x) + 安装偏角【设计】；IMU 偏航角 ψ(t)，200 Hz；自语音检测（骨声纹）【设计】。", { fontFace: F, lang: "zh-CN", fontSize: 11, color: C.ink }), { x: 0.6, y: 6.3, w: 12.1, h: 0.5, valign: "top", margin: 0.03, isTextBox: true });
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
    "代码：methods.peak（抛物线插值）、methods.fuse_soft（λ = 0.1，μ = 0.05，门限 8°）。没选中人脸时，融合分支输出网格峰值 θ_k*；不做融合时输出插值后的 θ_a。低帧率档没有唇动信息，l_i 取 0.5。L9 为设计：置信度的计算方式待确认（候选：空间谱峰高 P(θ_k*)，或峰值与次峰之比），尚未在仿真中验证。");
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
