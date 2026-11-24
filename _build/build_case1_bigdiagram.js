// 耳机声源定位：情况 1 算法框图（大图，每个模块展开到具体运算）。回应 mentor 11-24 "详细列出每个步骤的框图"、用户 11-24 "呈现在一张大图里，框图里每块再展开"。
// 版面 26.67 × 15 in（常规 16:9 页面的 2 倍），导出 PDF 可缩放查看或 A3 打印。
// 内容与 02_耳机声源定位/情况1算法实现.md、code/earbud_ssl 的实现一致；标【设计】的为方案设计、仿真中未实现。
const pptxgen = require("pptxgenjs");
const path = require("path");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, "..", "02_耳机声源定位"), "耳机声源定位_情况1算法框图（大图）.pptx");
const F = "Microsoft YaHei";
const C = { ink: "1F1F1F", gray: "595959", light: "8C8C8C", rule: "D9D9D9", box: "A6A6A6", navy: "134074", navyLt: "8DA9C4", navyPale: "EEF2F7" };
const p = new pptxgen();
p.defineLayout({ name: "BIG", width: 26.67, height: 15 });
p.layout = "BIG";
p.title = "耳机声源定位：情况 1 算法框图（大图）";
const s = p.addSlide();
s.background = { color: "F7F8FA" };

function rich(str, base) {
  const runs = []; let buf = ""; let i = 0;
  const flush = () => { if (buf) { runs.push({ text: buf, options: Object.assign({}, base) }); buf = ""; } };
  while (i < str.length) {
    const ch = str[i];
    if ((ch === "_" || ch === "^") && i + 1 < str.length) {
      flush(); let tok;
      if (str[i + 1] === "{") { const j = str.indexOf("}", i + 2); tok = str.slice(i + 2, j); i = j + 1; } else { tok = str[i + 1]; i += 2; }
      runs.push({ text: tok, options: Object.assign({}, base, ch === "_" ? { subscript: true } : { superscript: true }) });
    } else { buf += ch; i += 1; }
  }
  flush(); return runs;
}
const T = (text, o) => s.addText(rich(text, { fontFace: F, lang: "zh-CN", fontSize: o.fontSize || 12, color: o.color || C.ink, bold: !!o.bold }),
  Object.assign({ margin: 0, valign: "middle", isTextBox: true }, o, { fontSize: undefined, color: undefined, bold: undefined }));
// 运算块：名称 + 公式 / 参数（可多行）
function op(x, y, w, h, name, lines, o) {
  o = o || {};
  s.addShape(p.shapes.RECTANGLE, { x, y, w, h, fill: { color: o.fill || "FFFFFF" }, line: { color: o.line || C.navy, width: 1, dashType: o.dash || "solid" } });
  const base = { fontFace: F, lang: "zh-CN", fontSize: 10.5, color: o.color || C.ink };
  const runs = [{ text: name, options: { fontFace: F, lang: "zh-CN", fontSize: 12, bold: true, color: o.tcolor || C.navy, breakLine: lines.length > 0 } }];
  lines.forEach((ln, k) => { const r = rich(ln, base); if (k < lines.length - 1) r[r.length - 1].options.breakLine = true; runs.push(...r); });
  s.addText(runs, { x: x + 0.04, y, w: w - 0.08, h, align: "center", valign: "middle", margin: 0.03, isTextBox: true });
}
function ar(x1, y1, x2, y2, o) {
  o = o || {};
  s.addShape(p.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001, flipH: x2 < x1, flipV: y2 < y1,
    line: { color: o.color || C.navy, width: o.width || 1.25, dashType: o.dash || "solid", endArrowType: o.arrow === false ? undefined : "triangle" } });
}
const lab = (text, x, y, w, o) => T(text, Object.assign({ x, y, w, h: 0.28, fontSize: 10, color: C.gray, align: "center" }, o || {}));
// 模块外框
function mod(x, y, w, h, title) {
  s.addShape(p.shapes.RECTANGLE, { x, y, w, h, fill: { color: "FFFFFF", transparency: 100 }, line: { color: C.navyLt, width: 1.25, dashType: "dash" } });
  T(title, { x: x + 0.12, y: y + 0.06, w: w - 0.24, h: 0.34, fontSize: 14, bold: true, color: C.navy, align: "left" });
}
// 跨行连接符（圆角小框）
const tag = (text, x, y, w) => {
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.38, rectRadius: 0.18, fill: { color: C.navyPale }, line: { color: C.navy, width: 1 } });
  T(text, { x, y, w, h: 0.38, fontSize: 11, bold: true, color: C.navy, align: "center" });
};

// 网格
const W = 1.78, H = 0.98, P = 2.13, X0 = 0.85;
const X = (i) => X0 + i * P;
// 标题
T("耳机声源定位：情况 1 算法框图（每个模块展开到具体运算）", { x: 0.6, y: 0.3, w: 20, h: 0.6, fontSize: 24, bold: true, color: C.navy, align: "left" });
T("主耳音频 DSP 上全部为信号处理，约 19 MFLOPS、内存约 0.5 MB，没有需要训练的参数。箭头上为数据维度；虚线块为按需打开或【设计】（仿真中未实现）；参数为仿真所用值。",
  { x: 0.6, y: 0.9, w: 25.5, h: 0.4, fontSize: 13, color: C.gray, align: "left" });

// ---------- 第 1 行：① 前端（逐样本 → 每 16 ms 一帧） ----------
const Y1 = 2.0;
mod(0.6, 1.45, 18.95, 1.95, "① 前端：采集、汇集、分帧与 FFT（逐样本 16 kHz → 每 16 ms 一帧）　1.0 + 1.2 MFLOPS");
const r1 = [
  ["麦克风 × 3", ["主耳前、后 + 副耳前", "数字麦 PDM"]],
  ["抽取滤波", ["PDM → PCM", "16 kHz、16 bit"]],
  ["耳间链路（副耳 1 路）", ["IMA ADPCM 4 bit 编码", "64 kbps → 主耳解码"]],
  ["对齐", ["按采样计数对齐 3 路", "两耳同步 ≤ 50 µs"]],
  ["高通", ["2 个二阶节级联", "4 阶 Butterworth，100 Hz"]],
  ["分帧", ["环形缓冲取 512 点", "每 256 点（16 ms）一帧"]],
  ["加窗", ["× w(n) = 0.5 − 0.5cos(2πn/512)"]],
  ["FFT", ["512 点实数 FFT", "每路 257 个频点"]],
  ["取频带", ["频点 k = 7…224", "200–7000 Hz，218 个"]],
];
r1.forEach(([n, l], i) => { op(X(i), Y1, W, H, n, l); if (i < r1.length - 1) ar(X(i) + W, Y1 + H / 2, X(i + 1), Y1 + H / 2); });
["PDM", "PCM", "3 路", "x_m[n]", "y_m[n]", "3×512", "3×512", "3×257"].forEach((t, i) => lab(t, X(i) + W - 0.1, Y1 + H / 2 - 0.32, P - W + 0.2));
// 帧缓存（第 1 行右侧）
mod(19.85, 1.45, 6.2, 1.95, "帧缓存");
op(20.05, Y1, 2.6, H, "环形帧缓存", ["最近 1.5 s：94 帧 × 3 × 218", "复数半精度，约 240 KB"]);
ar(X(8) + W, Y1 + H / 2, 20.05, Y1 + H / 2);
lab("x(f,t)：3 × 218", X(8) + W - 0.05, Y1 + H / 2 - 0.32, 1.45);
tag("→ ③ 按 t_{on} 取帧", 23.0, Y1 + H / 2 - 0.19, 2.85);
ar(22.65, Y1 + H / 2, 23.0, Y1 + H / 2);
// 前端到开口检测
ar(X(8) + W / 2, Y1 + H, X(8) + W / 2, 3.95, { arrow: false });
ar(X(8) + W / 2, 3.95, X(0) + W / 2, 3.95, { arrow: false });
ar(X(0) + W / 2, 3.95, X(0) + W / 2, 4.55);
lab("x(f,t) 每帧送入开口检测", X(3), 3.66, 4);

// ---------- 第 2 行：② 开口检测（每 32 ms） ----------
const Y2 = 4.55;
mod(0.6, 3.75 + 0.27, 25.45, 2.0 + 0.1, "");
T("② 开口检测（每 2 帧 = 32 ms 一次；从第 0.3 s 起计算，第 1 s 起判决）　6.6 MFLOPS", { x: 0.75, y: 4.1, w: 14, h: 0.34, fontSize: 14, bold: true, color: C.navy, align: "left" });
const r2 = [
  ["外积", ["R(f,t) = x x^H", "每频点 3×3 厄米，6 个独立元素"]],
  ["短时递推", ["S_s ← α_s S_s + (1 − α_s) R", "α_s = e^{−1/15.6} = 0.938"]],
  ["背景递推", ["S_b ← α_b S_b + (1 − α_b) R", "α_b = e^{−1/62.5} = 0.984；判决后更新"]],
  ["偏差校正", ["R̃_s = S_s / (1 − α_s^{t+1})", "R̃_b = S_b / (1 − α_b^t)"]],
  ["对角加载", ["R̃_b + δI", "δ = 0.01·tr(R̃_b) / 3"]],
  ["Cholesky", ["L L^H = R̃_b + δI", "L：3×3 下三角"]],
  ["三角求逆", ["L^{−1}：前代法", "3×3 下三角"]],
  ["白化", ["W = L^{−1} R̃_s L^{−H}", "两次 3×3 矩阵乘"]],
  ["最大特征值", ["λ_{max}(W)", "3×3 厄米，迭代求解"]],
  ["频点中位数 → dB", ["ν(t) = 10·lg median_f λ_{max}", "218 个频点取中位数"]],
  ["阈值判决 + 回溯", ["ν 上穿 η：η = 1 dB（情况 1）", "回溯到 ν ≤ η/2 → t_{on}"]],
];
const W2 = 2.15, P2 = 2.31;
const X2 = (i) => 0.85 + i * P2;
r2.forEach(([n, l], i) => { op(X2(i), Y2, W2, 1.1, n, l); if (i < r2.length - 1) ar(X2(i) + W2, Y2 + 0.55, X2(i + 1), Y2 + 0.55); });
tag("→ ③ t_{on}", X2(10) + 0.2, Y2 + 1.25, 1.75);
ar(X2(10) + W2 / 2, Y2 + 1.1, X2(10) + W2 / 2, Y2 + 1.25);

// ---------- 第 3 行：③ 协方差 + ④ 白化与特征分解（每 0.25 s） ----------
const Y3a = 7.05, Y3b = 8.35;
mod(0.6, 6.5, 13.1, 3.1, "③ 背景与目标协方差（每 0.25 s，开口后 0.5 s 起）　0.8 MFLOPS");
tag("① 帧缓存、② t_{on} →", 0.75, Y3a + 0.3, 2.3);
const c1 = [["取背景帧", ["[t_{on} − 1.05 s, t_{on} − 0.05 s)", "62 帧（留 0.05 s 保护）"]], ["外积", ["x x^H", "62 × 218 个 3×3"]], ["等权平均", ["R_b(f) = (1/62) Σ x x^H"]]];
const c2 = [["取目标帧", ["[t_{on}, t_d]，最长 1 s", "t_d 每 0.25 s 前移"]], ["帧能量", ["e(t) = 10·lg mean_{m,f} |X_m|^2"]], ["起始段权重", ["w = 0.2 + min(max(Δe,0),10)/10", "e < max e − 30 dB：w = 0"]], ["加权外积累加", ["Σ w x x^H，Σ w"]], ["归一", ["R_s(f) = Σ w x x^H / Σ w"]]];
const XC = (i) => 3.3 + i * 2.05, WC = 1.85;
c1.forEach(([n, l], i) => { op(XC(i), Y3a, WC, 1.05, n, l); if (i < c1.length - 1) ar(XC(i) + WC, Y3a + 0.52, XC(i + 1), Y3a + 0.52); });
c2.forEach(([n, l], i) => { op(XC(i), Y3b, WC, 1.05, n, l); if (i < c2.length - 1) ar(XC(i) + WC, Y3b + 0.52, XC(i + 1), Y3b + 0.52); });
ar(3.05, Y3a + 0.5, XC(0), Y3a + 0.52);
ar(3.15, Y3a + 0.69, 3.15, Y3b + 0.52, { arrow: false }); ar(3.15, Y3b + 0.52, XC(0), Y3b + 0.52);
mod(14.0, 6.5, 12.05, 3.1, "④ 背景白化 + 特征分解（每个频点，218 个）　1.0 MFLOPS");
const d1 = [["对角加载", ["R_b + δI", "δ = 0.01·tr(R_b)/3"]], ["Cholesky", ["L L^H = R_b + δI"]], ["三角求逆", ["L^{−1}：前代法"]]];
const d2 = [["白化", ["R_w = L^{−1} R_s L^{−H}"]], ["厄米化", ["R_w ← (R_w + R_w^H)/2", "去数值误差"]], ["3×3 特征分解", ["R_w = U Λ U^H", "λ_1 ≥ λ_2 ≥ λ_3"]], ["取噪声子空间", ["E_n = [u_2, u_3]", "3 × 2（单声源）"]]];
const XD = (i) => 14.25 + i * 2.95, WD = 2.5;
d1.forEach(([n, l], i) => { op(XD(i), Y3a, WD, 1.05, n, l); if (i < d1.length - 1) ar(XD(i) + WD, Y3a + 0.52, XD(i + 1), Y3a + 0.52); });
const XD2 = (i) => 14.25 + i * 2.95;
d2.forEach(([n, l], i) => { op(XD2(i), Y3b, WD, 1.05, n, l); if (i < d2.length - 1) ar(XD2(i) + WD, Y3b + 0.52, XD2(i + 1), Y3b + 0.52); });
ar(XC(2) + WC, Y3a + 0.52, XD(0), Y3a + 0.52); lab("R_b(f)：218 × 3×3", XC(2) + WC + 0.02, Y3a + 0.2, 1.65);
ar(XC(4) + WC, Y3b + 0.52, XD2(0), Y3b + 0.52); lab("R_s(f)", XC(4) + WC, Y3b + 0.2, 0.5);
ar(XD(2) + WD / 2, Y3a + 1.05, XD(2) + WD / 2, Y3a + 1.18, { arrow: false });
ar(XD(2) + WD / 2, Y3a + 1.18, XD2(0) + WD / 2, Y3a + 1.18, { arrow: false });
ar(XD2(0) + WD / 2, Y3a + 1.18, XD2(0) + WD / 2, Y3b);
lab("L^{−1}(f)", XD(1) + 0.4, Y3a + 1.02, 1.4);
tag("→ ⑤ L^{−1}(f)", XD(2) + WD + 0.12, Y3a + 0.33, 2.0);
tag("→ ⑤ E_n(f)", XD2(3) + 0.25, Y3b + 1.12, 2.0);
ar(XD2(3) + WD / 2, Y3b + 1.05, XD2(3) + WD / 2, Y3b + 1.12);

// ---------- 第 4 行：⑤ 空间谱 + ⑥ 找峰 ----------
const Y4a = 10.35, Y4b = 11.55;
mod(0.6, 9.85, 18.3, 2.85, "⑤ MUSIC 空间谱扫描（72 个方向 × 218 个频点）　8.2 MFLOPS");
const e0 = [["方向模板（ROM）", ["h(θ,f)：72 × 218 × 3", "头部传递函数，184 KB"]], ["归一化", ["a = h / ‖h‖"]], ["白化", ["a_w = L^{−1} a", "← ④ L^{−1}(f)"]]];
e0.forEach(([n, l], i) => { op(X(i), Y4a, W, 1.0, n, l, i === 0 ? { line: C.box } : {}); if (i < 2) ar(X(i) + W, Y4a + 0.5, X(i + 1), Y4a + 0.5); });
op(X(3), Y4a, W, 0.95, "模平方", ["‖a_w‖^2"]);
op(X(3), Y4b, W, 0.95, "投影 + 模平方", ["‖E_n^H a_w‖^2", "← ④ E_n(f)"]);
ar(X(2) + W, Y4a + 0.5, X(3), Y4a + 0.47);
ar(X(2) + W + 0.15, Y4a + 0.5, X(2) + W + 0.15, Y4b + 0.47, { arrow: false }); ar(X(2) + W + 0.15, Y4b + 0.47, X(3), Y4b + 0.47);
const e1 = [["相除", ["P_f(θ) = ‖a_w‖^2 / ‖E_n^H a_w‖^2"]], ["每频点归一", ["P_f(θ) / max_θ P_f(θ)", "峰值归一到 1"]], ["频点平均", ["P(θ) = (1/218) Σ_f", "72 个方向的空间谱"]]];
e1.forEach(([n, l], i) => { op(X(4 + i), Y4a + 0.55, W + 0.25, 1.05, n, l); if (i < 2) ar(X(4 + i) + W + 0.25, Y4a + 1.07, X(5 + i), Y4a + 1.07); });
ar(X(3) + W, Y4a + 0.47, X(4), Y4a + 0.85); ar(X(3) + W, Y4b + 0.47, X(4), Y4a + 1.3);
lab("72 × 218", X(2) + W - 0.05, Y4a + 0.15, 0.5);
mod(19.2, 9.85, 6.85, 2.85, "⑥ 找峰 + 插值");
op(19.4, Y4a + 0.55, 1.85, 1.05, "找峰", ["k^* = argmax_k P(θ_k)"]);
op(21.6, Y4a + 0.55, 2.0, 1.05, "三点抛物线", ["δ = (P_{k−1} − P_{k+1})/", "(2(P_{k−1} − 2P_k + P_{k+1}))"]);
op(23.95, Y4a + 0.55, 1.9, 1.05, "声学方位", ["θ_a = θ_{k*} + 5°·δ", "|δ| ≤ 0.5"]);
ar(X(6) + W + 0.25, Y4a + 1.07, 19.4, Y4a + 1.07); lab("P(θ)：72", X(6) + W + 0.25, Y4a + 0.75, 0.75);
ar(21.25, Y4a + 1.07, 21.6, Y4a + 1.07); ar(23.6, Y4a + 1.07, 23.95, Y4a + 1.07);

// ---------- 第 5 行：⑦ 融合（摄像头按需）+ ⑧ 输出 ----------
const Y5a = 13.25, Y5b = 13.25;
mod(0.6, 12.95, 15.9, 1.9, "⑦ 与人脸融合（摄像头按需打开时；不开时 θ_{out} = θ_a）");
const g = [["摄像头", ["低帧率 1–2 fps", "两耳各一，按需打开"]], ["人脸检测", ["人脸框中心像素 u_i", "（视觉模块）"]], ["像素 → 方位【设计】", ["φ_i = atan((u_i − c_x)/f_x)", "+ 摄像头安装偏角"]], ["换到头心【设计】", ["按安装位置与", "曝光时刻 IMU 角度"]]];
g.forEach(([n, l], i) => { op(0.85 + i * 2.25, Y5a + 0.35, 2.0, 1.1, n, l, { dash: "dash" }); if (i < 3) ar(0.85 + i * 2.25 + 2.0, Y5a + 0.9, 0.85 + (i + 1) * 2.25, Y5a + 0.9, { dash: "dash" }); });
op(9.95, Y5a + 0.35, 2.15, 1.1, "人脸打分", ["s_i = max_{|θ−φ_i|≤8°} P(θ)", "+ λ(l_i − 0.5)，λ = 0.1"]);
op(12.3, Y5a + 0.35, 1.95, 1.1, "只用声音", ["s_0 = P(θ_{k*}) − μ", "μ = 0.05"]);
op(14.45, Y5a + 0.35, 1.85, 1.1, "选最大", ["人脸 φ_{i*} 或 θ_{k*}", "→ θ_{out}"]);
ar(0.85 + 3 * 2.25 + 2.0, Y5a + 0.9, 9.95, Y5a + 0.9, { dash: "dash" });
ar(12.1, Y5a + 0.9, 12.3, Y5a + 0.9, { arrow: false }); ar(14.25, Y5a + 0.9, 14.45, Y5a + 0.9);
tag("← ⑥ P(θ)、θ_a", 10.6, Y5a - 0.27 + 0.05, 2.4);
mod(16.8, 12.95, 9.25, 1.9, "⑧ 输出（每 16 ms）");
op(17.0, Y5a + 0.35, 2.05, 1.1, "IMU 换坐标【设计】", ["θ_{world} = θ_{out} + ψ(t)", "ψ：偏航角，200 Hz"]);
op(19.3, Y5a + 0.35, 1.95, 1.1, "跟踪【设计】", ["世界坐标下保持", "目标方位"]);
op(21.5, Y5a + 0.35, 2.0, 1.1, "置信度【待确认】", ["候选：P(θ_{k*})", "或峰值 / 次峰"], { dash: "dash", line: C.box });
op(23.75, Y5a + 0.35, 2.1, 1.1, "打包下发", ["8 字节：方位 0.01°、置信度、", "说话、干扰方位 ×3、序号"]);
ar(16.3, Y5a + 0.9, 17.0, Y5a + 0.9); ar(19.05, Y5a + 0.9, 19.3, Y5a + 0.9); ar(21.25, Y5a + 0.9, 21.5, Y5a + 0.9); ar(23.5, Y5a + 0.9, 23.75, Y5a + 0.9);

s.addNotes("代码对应：① sim.highpass、sim.stft；② run_camera_policy.novelty_raw、acoustic_onsets；③ methods.frame_energy_db、onset_weights、covariance（时间窗 run_camera_policy.gevd_spec）；④⑤ methods.music；⑥ methods.peak；⑦ methods.fuse_soft；方向模板 sphere.sphere_tf。【设计】：耳间链路、对齐、像素到方位、头心换算、IMU 跟踪、置信度在仿真中未实现（仿真中视觉直接给出人脸方位，误差 2°）。自语音检测【设计】：骨声纹判定佩戴者在说话时，该帧不进入 ②③，输出冻结。");
p.writeFile({ fileName: OUT }).then((f) => console.log("saved", f));
