// 耳机声源定位：情况 1 逐层算法框图（按 mentor 11-25 示意图的画法：每层一个灰框写层名，旁边黄色标签写该层输出维度；
// 模块用底框，子结构用深一档底框；层从下往上堆，输入在下、输出在上；模块之间连线）。
// 回应 mentor 11-23 "每个 layer 都得清楚，具体的计算公式都要清楚"。每层的公式见《情况1算法实现》逐步说明表与附录。
// 内容与 02_耳机声源定位/情况1算法实现.md、code/earbud_ssl 的实现一致；虚线为按需打开（摄像头）或待确认，标【设计】的层在仿真中未实现。
// 版面 40 × 16 in，导出 PDF 可缩放查看。
const pptxgen = require("pptxgenjs");
const path = require("path");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, "..", "02_耳机声源定位"), "耳机声源定位_情况1算法框图（大图）.pptx");
const F = "Microsoft YaHei";
const C = { ink: "1F1F1F", gray: "595959", navy: "134074", navyLt: "8DA9C4", modFill: "EAF2F8", subFill: "D6E3F0",
  layFill: "F2F2F2", layLine: "7F7F7F", tag: "FFFFFF", tagLine: "134074", tagText: "134074", wire: "404040" };
const p = new pptxgen();
p.defineLayout({ name: "BIG", width: 40, height: 16 });
p.layout = "BIG";
p.title = "耳机声源定位：情况 1 逐层算法框图";
const s = p.addSlide();
s.background = { color: "F7F8FA" };

// ---------- 富文本：_ 下标、^ 上标、{} 分组 ----------
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
const txt = (t, x, y, w, h, o) => s.addText(rich(t, { fontFace: F, lang: "zh-CN", fontSize: o.fs || 12, color: o.color || C.ink, bold: !!o.bold }),
  { x, y, w, h, margin: 0, align: o.align || "center", valign: o.valign || "middle", isTextBox: true, lang: "zh-CN" });
// ---------- 连线（折线，最后一段带箭头） ----------
function seg(x1, y1, x2, y2, o) {
  o = o || {};
  s.addShape(p.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001, flipH: x2 < x1, flipV: y2 < y1,
    line: { color: o.color || C.wire, width: o.w || 1.25, dashType: o.dash || "solid", endArrowType: o.arrow ? "triangle" : undefined } });
}
function wire(pts, o) { for (let k = 0; k < pts.length - 1; k++) seg(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], Object.assign({}, o, { arrow: k === pts.length - 2 })); }
// ---------- 层：灰框（层名 + 参数）+ 黄色维度标签 ----------
const BW = 2.6, BH = 0.56, TW = 1.3, PITCH = 0.82;
function layer(x, y, name, param, dim, o) {
  o = o || {};
  const w = o.w || BW;
  s.addShape(p.shapes.RECTANGLE, { x, y, w, h: BH, fill: { color: C.layFill }, line: { color: C.layLine, width: 1, dashType: o.dash || "solid" } });
  const runs = [{ text: name, options: { fontFace: F, lang: "zh-CN", fontSize: 11, bold: true, color: C.ink, breakLine: !!param } }];
  if (param) runs.push(...rich(param, { fontFace: F, lang: "zh-CN", fontSize: 8.5, color: C.gray }));
  s.addText(runs, { x: x + 0.03, y, w: w - 0.06, h: BH, margin: 0, align: "center", valign: "middle", isTextBox: true, lang: "zh-CN" });
  if (dim) {
    const tw = o.tw || TW;
    s.addShape(p.shapes.RECTANGLE, { x: x + w + 0.08, y: y + 0.1, w: tw, h: BH - 0.2, fill: { color: C.tag }, line: { color: C.tagLine, width: 0.75 } });
    txt(dim, x + w + 0.08, y + 0.1, tw, BH - 0.2, { fs: 9.5, color: C.tagText, bold: true });
  }
  return { x, y, w, cx: x + w / 2, top: y, bot: y + BH, right: x + w };
}
// 一列从下往上堆的层；返回各层位置
function stack(x, yBottom, items, o) {
  const out = [];
  items.forEach((it, k) => {
    const y = yBottom - k * PITCH;
    out.push(layer(x, y, it[0], it[1], it[2], Object.assign({}, o, it[3] || {})));
    if (k > 0) seg(out[k].cx, out[k - 1].top, out[k].cx, out[k].bot, { arrow: true, dash: (o && o.dash) || "solid", w: 1 });
  });
  return out;
}
const box = (x, y, w, h, fill, line, dash) => s.addShape(p.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: line, width: 1.25, dashType: dash || "solid" } });
function module(x, topLayerY, w, title, sub) {
  const y = topLayerY - 1.25, h = MB - y;
  box(x, y, w, h, C.modFill, C.navyLt);
  txt(title, x + 0.15, y + 0.08, 2.45, 0.4, { fs: 15, bold: true, color: C.navy, align: "left" });
  if (sub) txt(sub, x + 0.15, y + 0.5, 2.45, 0.6, { fs: 10.5, color: C.gray, align: "left", valign: "top" });
}
const subunit = (x, y, w, h, title, dash) => { box(x, y, w, h, C.subFill, C.navyLt, dash); txt(title, x + 0.08, y + 0.05, w - 0.16, 0.28, { fs: 10.5, bold: true, color: C.navy, align: "right" }); };
const io = (t, x, y, w, h) => { s.addShape(p.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.navy }, line: { color: C.navy, width: 1 } }); txt(t, x, y, w, h, { fs: 15, bold: true, color: "FFFFFF" }); };
const note = (t, x, y, w, o) => txt(t, x, y, w, 0.3, Object.assign({ fs: 10, color: C.gray }, o || {}));

// ---------- 标题 ----------
txt("耳机声源定位：情况 1 逐层算法框图", 0.6, 0.3, 24, 0.7, { fs: 28, bold: true, color: C.navy, align: "left" });
txt("灰框为一层运算（第二行为参数），右侧小标签为该层输出维度；f：218 个频点（200–7000 Hz），θ：72 个方向（5°）；虚线为按需打开（摄像头）或待确认，标【设计】的层在仿真中未实现。全部在主耳音频 DSP 上，约 19 MFLOPS、内存约 0.5 MB，没有需要训练的参数；每层公式见《情况1算法实现》。",
  0.6, 1.05, 38.5, 0.4, { fs: 12.5, color: C.gray, align: "left" });

// ---------- 版面参数 ----------
const MT = 2.4, MB = 14.75;          // 模块框上下沿
const YB = 13.85;                     // 每列最下面一层的上沿
const YTOP = 2.05, YBOT = 15.15;      // 上、下布线通道
const MW = 4.6;                       // 单列模块宽

// ================= ① 前端 =================
const X1 = 0.6;
module(X1, YB - 7 * PITCH, MW, "① 前端", "逐样本 16 kHz → 每 16 ms 一帧；2.1 MFLOPS");
const c1 = stack(X1 + 0.3, YB, [
  ["PDM 抽取滤波", "PDM → PCM，16 bit", "3 × 16 kHz"],
  ["耳间链路（副耳 1 路）", "ADPCM 4 bit，64 kbps", "3 × 16 kHz"],
  ["采样计数对齐", "两耳同步 ≤ 50 µs", "3 × 16 kHz"],
  ["高通 IIR", "4 阶 Butterworth，100 Hz", "3 × 16 kHz"],
  ["分帧", "帧长 512，帧移 256", "3 × 512"],
  ["汉宁窗", "w(n) = 0.5 − 0.5cos(2πn/512)", "3 × 512"],
  ["FFT", "512 点实数", "3 × 257"],
  ["取频带", "k = 7…224", "3 × 218"],
]);
io("3 路麦克风", X1 + 0.3, YBOT + 0.25, BW, 0.55);
seg(c1[0].cx, YBOT + 0.25, c1[0].cx, c1[0].bot, { arrow: true });

// ================= ② 开口检测 =================
const X2 = 5.6;
module(X2, YB - 12 * PITCH, MW, "② 开口检测", "每 32 ms（每 2 帧）；6.6 MFLOPS");
const c2a = stack(X2 + 0.3, YB, [
  ["外积", "R = x x^H", "f × 3 × 3"],
]);
// 两路递推并排
const yR = YB - PITCH, wR = 1.3, twR = 0.75;
const rs = layer(X2 + 0.15, yR, "短时递推", "α_s = 0.938", "f×3×3", { w: wR, tw: twR });
const rb = layer(X2 + 0.15 + wR + twR + 0.16, yR, "背景递推", "α_b = 0.984", "f×3×3", { w: wR, tw: twR });
seg(c2a[0].cx, c2a[0].top, rs.cx, rs.bot, { arrow: true, w: 1 }); seg(c2a[0].cx, c2a[0].top, rb.cx, rb.bot, { arrow: true, w: 1 });
const yW0 = YB - 2 * PITCH;
const c2b = stack(X2 + 0.3, yW0, [
  ["偏差校正", "÷ (1 − α^t)", "2 × f × 3 × 3"],
]);
seg(rs.cx, rs.top, c2b[0].cx - 0.3, c2b[0].bot, { arrow: true, w: 1 }); seg(rb.cx, rb.top, c2b[0].cx + 0.3, c2b[0].bot, { arrow: true, w: 1 });
subunit(X2 + 0.15, YB - 6 * PITCH - 0.4, MW - 0.3, 3 * PITCH + BH + 0.52, "背景白化");
const c2c = stack(X2 + 0.3, YB - 3 * PITCH, [
  ["对角加载", "R̃_b + δI，δ = 1% 平均对角元", "f × 3 × 3"],
  ["Cholesky", "L L^H = R̃_b + δI", "f × 3 × 3"],
  ["三角求逆", "L^{−1}，前代法", "f × 3 × 3"],
  ["白化", "W = L^{−1} R̃_s L^{−H}", "f × 3 × 3"],
]);
seg(c2b[0].cx, c2b[0].top, c2c[0].cx, c2c[0].bot, { arrow: true, w: 1 });
const c2d = stack(X2 + 0.3, YB - 7 * PITCH, [
  ["最大特征值", "λ_{max}(W)，3 × 3", "f"],
  ["频点中位数", "median_f", "1"],
  ["转 dB", "ν = 10·lg(·)", "1"],
  ["阈值判决", "ν 上穿 η，η = 1 dB", "1"],
  ["回溯", "退到 ν ≤ η/2 的下一帧", "1（t_{on}）"],
]);
seg(c2c[3].cx, c2c[3].top, c2d[0].cx, c2d[0].bot, { arrow: true, w: 1 });

// ================= ③ 帧缓存与协方差 =================
const X3 = 10.6, W3 = 9.0;
module(X3, YB - 5 * PITCH, W3, "③ 帧缓存与协方差", "每 0.25 s（开口后 0.5 s 起）；0.8 MFLOPS");
const buf = layer(X3 + (W3 - BW - TW) / 2 - 0.05, YB, "环形帧缓存", "最近 1.5 s，半精度 240 KB", "94 × 3 × 218");
const xL = X3 + 0.3, xRr = X3 + 4.78;
subunit(X3 + 0.15, YB - 3 * PITCH - 0.4, 4.3, 2 * PITCH + BH + 0.52, "背景");
subunit(X3 + 4.63, YB - 5 * PITCH - 0.4, 4.25, 4 * PITCH + BH + 0.52, "目标");
const c3L = stack(xL, YB - PITCH, [
  ["取背景帧", "[t_{on} − 1.05, t_{on} − 0.05) s", "62 × 3 × 218"],
  ["外积", "x x^H", "62 × f × 3 × 3"],
  ["平均 → R_b", "(1/62) Σ x x^H", "f × 3 × 3"],
]);
const c3R = stack(xRr, YB - PITCH, [
  ["取目标帧", "[t_{on}, t_d]，最长 1 s", "≤ 63 × 3 × 218"],
  ["帧能量", "e = 10·lg mean_{m,f} |X|^2", "≤ 63"],
  ["起始段权重", "w = 0.2 + min(max(Δe,0),10)/10", "≤ 63"],
  ["加权外积累加", "Σ w x x^H，Σ w", "f × 3 × 3"],
  ["归一 → R_s", "÷ Σ w", "f × 3 × 3"],
]);
seg(buf.cx, buf.top, c3L[0].cx, c3L[0].bot, { arrow: true, w: 1 }); seg(buf.cx, buf.top, c3R[0].cx, c3R[0].bot, { arrow: true, w: 1 });

// ================= ④ 白化与特征分解 =================
const X4 = 20.0;
module(X4, YB - 6 * PITCH, MW, "④ 白化与特征分解", "每 0.25 s，每个频点；1.0 MFLOPS");
const c4 = stack(X4 + 0.3, YB, [
  ["对角加载", "R_b + δI，δ = 1% 平均对角元", "f × 3 × 3"],
  ["Cholesky", "L L^H = R_b + δI", "f × 3 × 3"],
  ["三角求逆", "L^{−1}，前代法", "f × 3 × 3"],
  ["白化", "R_w = L^{−1} R_s L^{−H}", "f × 3 × 3"],
  ["厄米化", "(R_w + R_w^H) / 2", "f × 3 × 3"],
  ["特征分解", "3 × 3：U Λ U^H", "f × 3 × 3"],
  ["取噪声子空间", "E_n = [u_2, u_3]（单声源）", "f × 3 × 2"],
]);

// ================= ⑤ MUSIC 空间谱 =================
const X5 = 25.0;
module(X5, YB - 7 * PITCH, MW, "⑤ MUSIC 空间谱", "每 0.25 s；8.2 MFLOPS");
const c5 = stack(X5 + 0.3, YB, [
  ["方向模板（ROM）", "头部传递函数 h(θ,f)，184 KB", "72 × f × 3"],
  ["归一化", "a = h / ‖h‖", "72 × f × 3"],
  ["白化", "a_w = L^{−1} a", "72 × f × 3"],
  ["投影", "E_n^H a_w", "72 × f × 2"],
  ["模平方 × 2", "‖a_w‖^2，‖E_n^H a_w‖^2", "2 × 72 × f"],
  ["相除", "P_f = ‖a_w‖^2 / ‖E_n^H a_w‖^2", "72 × f"],
  ["每频点归一", "÷ max_θ P_f", "72 × f"],
  ["频点平均", "P(θ) = mean_f", "72"],
]);

// ================= ⑥ 找峰、融合与输出 =================
const X6 = 30.0, W6 = 9.0;
module(X6, YB - 10 * PITCH, W6, "⑥ 找峰、融合与输出", "每 0.25 s 定位，每 16 ms 输出");
subunit(X6 + 0.15, YB - 2 * PITCH - 0.4, 4.3, 2 * PITCH + BH + 0.52, "声学方位");
subunit(X6 + 4.5, YB - 3 * PITCH - 0.4, 4.35, 3 * PITCH + BH + 0.52, "摄像头（按需打开）", "dash");
const c6L = stack(X6 + 0.3, YB, [
  ["找峰", "k* = argmax P(θ_k)", "1"],
  ["三点抛物线插值", "δ ∈ [−0.5, 0.5]", "1"],
  ["声学方位", "θ_a = θ_{k*} + 5°·δ", "1"],
]);
const c6R = stack(X6 + 4.65, YB, [
  ["摄像头", "1–2 fps，两耳各一", "图像"],
  ["人脸检测", "人脸框中心 u_i", "N 个框"],
  ["像素 → 方位【设计】", "φ_i = atan((u_i − c_x)/f_x) + 安装角", "N"],
  ["换到头心坐标【设计】", "安装位置 + 曝光时刻 IMU 角", "N"],
], { dash: "dash" });
const xM = X6 + (W6 - BW - TW) / 2 - 0.05, yM0 = YB - 5 * PITCH;
const c6M = stack(xM, yM0, [
  ["融合打分", "s_0 = P(θ_{k*}) − μ；s_i：±8° 内谱峰 + λ(l_i − 0.5)", "N + 1"],
  ["取最大", "→ θ_{out}（人脸 φ_i 或 θ_{k*}）", "1"],
  ["IMU 换坐标【设计】", "θ_{world} = θ_{out} + ψ(t)", "1"],
  ["跟踪【设计】", "世界坐标下保持目标", "1"],
  ["置信度【待确认】", "候选：谱峰高，或峰值 / 次峰", "1", { dash: "dash" }],
  ["打包", "方位、置信度、说话、干扰 ×3、序号", "8 字节"],
]);
seg(c6L[2].cx, c6L[2].top, c6M[0].cx - 0.4, c6M[0].bot, { arrow: true, w: 1 });
seg(c6R[3].cx, c6R[3].top, c6M[0].cx + 0.4, c6M[0].bot, { arrow: true, w: 1, dash: "dash" });
io("目标方位 → 增强模块", xM, c6M[5].top - 1.6, BW + TW + 0.08, 0.55);
seg(c6M[5].cx, c6M[5].top, c6M[5].cx, c6M[5].top - 1.05, { arrow: true });

// ================= 模块之间的连线 =================
// ① → ②（x(f,t)）、① → ③ 帧缓存
const g12 = 5.4, g23 = 10.4, g34 = 19.8, g45 = 24.8, g56 = 29.8;
const ox = (L) => L.x + BW - 0.22;
wire([[ox(c1[7]), c1[7].top], [ox(c1[7]), YTOP], [g12, YTOP], [g12, YBOT], [c2a[0].cx, YBOT], [c2a[0].cx, c2a[0].bot]]);
wire([[g12, YBOT], [buf.cx, YBOT], [buf.cx, buf.bot]]);
note("x(f,t)：3 × 218，每 16 ms", ox(c1[7]) + 0.1, YTOP - 0.33, 3, { align: "left" });
note("x(f,t)", g12 + 0.1, YBOT + 0.02, 1.0, { align: "left" });
// ② → ③（t_on）
const yT = c3L[0].y + BH / 2;
wire([[ox(c2d[4]), c2d[4].top], [ox(c2d[4]), YTOP + 0.15], [g23, YTOP + 0.15], [g23, yT], [c3L[0].x, yT]]);
note("t_{on}", ox(c2d[4]) + 0.1, YTOP - 0.18, 1, { align: "left" });
const gLR = X3 + 4.54;
seg(g23, YTOP + 0.15, gLR, YTOP + 0.15);
wire([[gLR, YTOP + 0.15], [gLR, yT], [c3R[0].x, yT]]);
// ③ → ④（R_b 进入第 1 层，R_s 进入"白化"）
wire([[ox(c3L[2]), c3L[2].top], [ox(c3L[2]), YTOP + 0.3], [g34, YTOP + 0.3], [g34, YBOT], [c4[0].cx, YBOT], [c4[0].cx, c4[0].bot]]);
note("R_b(f)", ox(c3L[2]) + 0.1, YTOP + 0.0, 1.2, { align: "left" });
const yW = c4[3].y + BH / 2;
wire([[ox(c3R[4]), c3R[4].top], [ox(c3R[4]), YTOP + 0.45], [g34 + 0.12, YTOP + 0.45], [g34 + 0.12, yW], [c4[3].x, yW]]);
note("R_s(f)", ox(c3R[4]) + 0.1, YTOP + 0.15, 1.2, { align: "left" });
// ④ → ⑤（L^{-1} 同一层高度直连；E_n 进入"投影"）
const yLi = c4[2].y + BH / 2;
seg(c4[2].right + TW + 0.12, yLi, c5[2].x, yLi, { arrow: true });
note("L^{−1}(f)", g45 - 0.55, yLi - 0.3, 1.1);
const yEn = c5[3].y + BH / 2;
wire([[c4[6].right + TW + 0.12, c4[6].y + BH / 2], [g45 + 0.1, c4[6].y + BH / 2], [g45 + 0.1, yEn], [c5[3].x, yEn]]);
note("E_n(f)", g45 - 0.55, c4[6].y + BH / 2 - 0.3, 1.0);
// ⑤ → ⑥（P(θ) 进入"找峰"和"融合打分"）
wire([[ox(c5[7]), c5[7].top], [ox(c5[7]), YTOP + 0.6], [g56, YTOP + 0.6], [g56, YBOT], [c6L[0].cx, YBOT], [c6L[0].cx, c6L[0].bot]]);
note("P(θ)：72", ox(c5[7]) + 0.1, YTOP + 0.3, 1.5, { align: "left" });
const yF = c6M[0].y + BH / 2;
wire([[g56, yF], [c6M[0].x, yF]]);
note("P(θ)", g56 + 0.1, yF - 0.3, 0.8, { align: "left" });
// IMU 输入
s.addShape(p.shapes.RECTANGLE, { x: X6 + W6 - 1.55, y: c6M[2].y + 0.05, w: 1.35, h: BH - 0.1, fill: { color: "FFFFFF" }, line: { color: C.layLine, width: 1 } });
txt("IMU：ψ(t)", X6 + W6 - 1.55, c6M[2].y + 0.05, 1.35, BH - 0.1, { fs: 10, bold: true });
seg(X6 + W6 - 1.55, c6M[2].y + BH / 2, c6M[2].right + TW + 0.1, c6M[2].y + BH / 2, { arrow: true });

s.addNotes("代码对应：① sim.highpass、sim.stft；② run_camera_policy.novelty_raw、acoustic_onsets（从第 0.3 s 起计算，第 1 s 起判决，背景递推在本帧判决后才更新）；③ methods.frame_energy_db、onset_weights、covariance，时间窗 run_camera_policy.gevd_spec；④⑤ methods.music；⑥ methods.peak、methods.fuse_soft（λ = 0.1，μ = 0.05）；方向模板 sphere.sphere_tf（刚性球，1.5 m）。帧缓存为实现所需：背景取开口前 1 s 的帧，而开口在之后才被检出（情况 1 仿真中 0.3 s 内）。仿真中未实现：耳间链路、对齐、像素到方位、头心换算、IMU 跟踪、置信度（仿真中视觉直接给出人脸方位，误差 2°）。不开摄像头时 θ_out = θ_a。");
p.writeFile({ fileName: OUT }).then((f) => console.log("saved", f));
