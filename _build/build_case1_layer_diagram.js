// 耳机声源定位：情况 1 逐层算法框图（参考 mentor 11-25 示意图的结构：每层一个框写层名，旁边标签写该层输出维度；
// 模块用底框，子结构用深一档底框）。回应 mentor 11-23 "每个 layer 都得清楚，具体的计算公式都要清楚"。
// 版式：顶部一排模块标题用箭头连成主流程（总览），每个模块在标题下从上往下展开到每一层（细节）；
// 各列行高一致、按网格对齐；模块之间只在标题行连线，模块内需要上一模块的量从左侧引线接入。
// 内容与 02_耳机声源定位/情况1算法实现.md、code/earbud_ssl 的实现一致；每层公式见《情况1算法实现》。
// 版面 47.6 × 17.2 in，导出 PDF 可缩放查看。
const pptxgen = require("pptxgenjs");
const path = require("path");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, "..", "02_耳机声源定位"), "耳机声源定位_情况1算法框图（大图）.pptx");
const F = "Microsoft YaHei";
const C = { ink: "1F1F1F", gray: "595959", navy: "134074", navyLt: "8DA9C4", modFill: "EAF2F8", subFill: "D6E3F0",
  layFill: "F2F2F2", layLine: "7F7F7F", wire: "404040" };
const p = new pptxgen();
p.defineLayout({ name: "BIG", width: 47.6, height: 17.2 });
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
const box = (x, y, w, h, fill, line, dash, lw) => s.addShape(p.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: line, width: lw || 1.25, dashType: dash || "solid" } });

// ---------- 网格 ----------
const BW = 2.9, BH = 0.6, TW = 1.35, GAP = 0.08, PITCH = 0.95;
const LM = 0.45;                         // 单列模块：层框距模块左沿（左侧留引线通道）
const MW = LM + BW + GAP + TW + 0.2;     // 单列模块宽 4.98
const SW = 0.15 + BW + GAP + TW + 0.15;  // 子结构宽 4.63
const DW = 0.15 + SW + 0.15 + SW + 0.15; // 双列模块宽 9.71
const GUT = 1.3;                         // 模块间距
const MT = 2.45, HH = 1.2;               // 模块上沿、标题带高
const PIN_Y = MT + HH + 0.25, PIN_H = 0.45;
const ROW1 = PIN_Y + PIN_H + 0.3;        // 第 1 行层框上沿
const rowY = (k) => ROW1 + (k - 1) * PITCH;
const MB = rowY(13) + PIN_H + 0.25;      // 模块下沿（最长一列 12 层 + 输出）

// ---------- 层：灰框（层名 + 参数）+ 右侧维度标签 ----------
function layer(x, k, name, param, dim, o) {
  o = o || {};
  const w = o.w || BW, tw = o.tw || TW, y = rowY(k);
  box(x, y, w, BH, C.layFill, C.layLine, o.dash, 1);
  const runs = rich(name, { fontFace: F, lang: "zh-CN", fontSize: o.nfs || 12, bold: true, color: C.ink });
  if (param) runs[runs.length - 1].options.breakLine = true;
  if (param) runs.push(...rich(param, { fontFace: F, lang: "zh-CN", fontSize: o.pfs || 9.5, color: C.gray }));
  s.addText(runs, { x: x + 0.03, y, w: w - 0.06, h: BH, margin: 0, align: "center", valign: "middle", isTextBox: true, lang: "zh-CN" });
  if (dim) {
    box(x + w + GAP, y + 0.11, tw, BH - 0.22, "FFFFFF", C.navy, undefined, 0.75);
    txt(dim, x + w + GAP, y + 0.11, tw, BH - 0.22, { fs: o.dfs || 10, color: C.navy, bold: true });
  }
  return { x, y, w, cx: x + w / 2, top: y, bot: y + BH, mid: y + BH / 2, right: x + w };
}
// 一列从上往下的层，第 k0 行开始
function stack(x, k0, items, o) {
  const out = [];
  items.forEach((it, i) => {
    out.push(layer(x, k0 + i, it[0], it[1], it[2], Object.assign({}, o, it[3] || {})));
    if (i > 0) seg(out[i].cx, out[i - 1].bot, out[i].cx, out[i].top, { arrow: true, dash: (o && o.dash) || "solid", w: 1 });
  });
  return out;
}
// 模块：浅底框 + 深色标题带（标题、作用、节奏与计算量）
function module(x, w, title, what, rate) {
  box(x, MT, w, MB - MT, C.modFill, C.navyLt);
  box(x, MT, w, HH, C.navy, C.navy);
  txt(title, x + 0.2, MT + 0.08, w - 0.4, 0.46, { fs: 17, bold: true, color: "FFFFFF", align: "left" });
  txt(what, x + 0.2, MT + 0.52, w - 0.4, 0.3, { fs: 11.5, color: "FFFFFF", align: "left" });
  txt(rate, x + 0.2, MT + 0.82, w - 0.4, 0.3, { fs: 11.5, color: "D6E3F0", align: "left" });
}
// 子结构：深一档底框，标题在右上角
function subunit(x, k1, k2, title, dash) {
  const y = rowY(k1) - 0.24, h = rowY(k2) + BH + 0.14 - y;
  box(x, y, SW, h, C.subFill, C.navyLt, dash);
  txt(title, x + 0.1, y + 0.01, SW - 0.2, 0.3, { fs: 10.5, bold: true, color: C.navy, align: "right" });
}
// 输入 / 输出标签
function pin(t, x, y, w, o) {
  o = o || {};
  box(x, y, w, PIN_H, o.fill || "FFFFFF", C.navy, o.dash, 1);
  txt(t, x, y, w, PIN_H, { fs: o.fs || 11.5, bold: true, color: o.color || C.navy });
  return { x, y, w, cx: x + w / 2, top: y, bot: y + PIN_H };
}
const outY = (lastRow) => rowY(lastRow) + BH + 0.3;

// ---------- 标题与图例 ----------
txt("耳机声源定位：情况 1 逐层算法框图", 0.6, 0.28, 30, 0.7, { fs: 30, bold: true, color: C.navy, align: "left" });
txt("顶部一排为处理流程（箭头上方是传给下一模块的量，下方是维度），每个模块向下展开到每一层。全部在主耳音频 DSP 上，合计约 19 MFLOPS、内存约 0.5 MB，没有需要训练的参数；每层公式见《情况1算法实现》。",
  0.6, 1.02, 46.4, 0.34, { fs: 13, color: C.gray, align: "left" });
txt("灰框：一层运算（上行名称，下行参数或公式）；右侧白框：该层输出维度；左侧引线：上一模块的量在这一层接入；虚线：按需打开或待确认；【设计】：仿真中未实现。f：218 个频点（200–7000 Hz），θ：72 个方向（间隔 5°）。",
  0.6, 1.38, 46.4, 0.34, { fs: 13, color: C.gray, align: "left" });

// ---------- 模块位置 ----------
const X1 = 0.6, X2 = X1 + MW + GUT, X3 = X2 + MW + GUT, X4 = X3 + DW + GUT, X5 = X4 + MW + GUT, X6 = X5 + MW + GUT;
const colX = (X) => X + LM;              // 单列模块层框 x

// ================= ① 前端 =================
module(X1, MW, "① 前端", "三路 PCM → 每帧频谱 x(f,t)", "逐样本处理，每 16 ms 一帧 · 2.1 MFLOPS");
const i1 = pin("3 路麦克风（主耳 2 + 副耳 1）", colX(X1), PIN_Y, BW + GAP + TW);
const c1 = stack(colX(X1), 1, [
  ["PDM 抽取滤波", "PDM → PCM，16 bit", "3 × 16 kHz"],
  ["耳间链路（副耳 1 路）", "ADPCM 4 bit，64 kbps", "3 × 16 kHz"],
  ["采样计数对齐", "两耳同步 ≤ 50 µs", "3 × 16 kHz"],
  ["高通 IIR", "4 阶 Butterworth，100 Hz", "3 × 16 kHz"],
  ["分帧", "帧长 512，帧移 256", "3 × 512"],
  ["汉宁窗", "w(n) = 0.5 − 0.5cos(2πn/512)", "3 × 512"],
  ["FFT", "512 点实数", "3 × 257"],
  ["取频带", "k = 7…224", "3 × 218"],
]);
seg(c1[0].cx, i1.bot, c1[0].cx, c1[0].top, { arrow: true, w: 1 });
const o1 = pin("输出 x(f,t) → ② ③", colX(X1), outY(8), BW);
seg(c1[7].cx, c1[7].bot, c1[7].cx, o1.top, { arrow: true, w: 1 });

// ================= ② 开口检测 =================
module(X2, MW, "② 开口检测", "判断目标开口，给出开口时刻 t_{on}", "每 32 ms 判一次 · 6.6 MFLOPS");
const i2 = pin("输入 x(f,t)", colX(X2), PIN_Y, BW);
const c2a = stack(colX(X2), 1, [["外积", "x x^H", "f × 3 × 3"]]);
seg(c2a[0].cx, i2.bot, c2a[0].cx, c2a[0].top, { arrow: true, w: 1 });
const wR = 1.42, twR = 0.8, xA = X2 + 0.2, xB = xA + wR + GAP + twR + 0.12;
const rs = layer(xA, 2, "短时递推", "α_s = 0.938（0.25 s）", "f×3×3", { w: wR, tw: twR, pfs: 8.5, dfs: 9 });
const rb = layer(xB, 2, "背景递推", "α_b = 0.984（1 s）", "f×3×3", { w: wR, tw: twR, pfs: 8.5, dfs: 9 });
const yS = c2a[0].bot + 0.17;
seg(c2a[0].cx, c2a[0].bot, c2a[0].cx, yS);
seg(rs.cx, yS, rb.cx, yS);
seg(rs.cx, yS, rs.cx, rs.top, { arrow: true, w: 1 }); seg(rb.cx, yS, rb.cx, rb.top, { arrow: true, w: 1 });
const c2b = stack(colX(X2), 3, [["偏差校正", "÷ (1 − α^t)", "2 × f × 3 × 3"]]);
const yJ = rs.bot + 0.17;
seg(rs.cx, rs.bot, rs.cx, yJ); seg(rb.cx, rb.bot, rb.cx, yJ); seg(rs.cx, yJ, rb.cx, yJ);
seg(c2b[0].cx, yJ, c2b[0].cx, c2b[0].top, { arrow: true, w: 1 });
subunit(colX(X2) - 0.15, 4, 7, "背景白化");
const c2c = stack(colX(X2), 4, [
  ["对角加载", "R̃_b + δI，δ = 1% 平均对角元", "f × 3 × 3"],
  ["Cholesky", "L L^H = R̃_b + δI", "f × 3 × 3"],
  ["三角求逆", "L^{−1}，前代法", "f × 3 × 3"],
  ["白化", "W = L^{−1} R̃_s L^{−H}", "f × 3 × 3"],
]);
seg(c2b[0].cx, c2b[0].bot, c2c[0].cx, c2c[0].top, { arrow: true, w: 1 });
const c2d = stack(colX(X2), 8, [
  ["最大特征值", "λ_{max}(W)，3 × 3", "f"],
  ["频点中位数", "median_f", "1"],
  ["转 dB", "ν = 10·lg(·)", "1"],
  ["阈值判决", "ν 上穿 η，η = 1 dB", "1"],
  ["回溯", "退到 ν ≤ η/2 的下一帧", "1（t_{on}）"],
]);
seg(c2c[3].cx, c2c[3].bot, c2d[0].cx, c2d[0].top, { arrow: true, w: 1 });
const o2 = pin("输出 t_{on} → ③", colX(X2), outY(12), BW);
seg(c2d[4].cx, c2d[4].bot, c2d[4].cx, o2.top, { arrow: true, w: 1 });

// ================= ③ 帧缓存与协方差 =================
module(X3, DW, "③ 帧缓存与协方差", "取开口前、后两段帧，得背景 R_b 与目标 R_s", "每 0.25 s（开口后 0.5 s 起）· 0.8 MFLOPS");
const bx = X3 + (DW - BW - GAP - TW) / 2;
const i3 = pin("输入 x(f,t)（每帧写入），t_{on}", bx, PIN_Y, BW + GAP + TW);
const buf = layer(bx, 1, "环形帧缓存", "最近 1.5 s，半精度 240 KB", "94 × 3 × 218");
seg(buf.cx, i3.bot, buf.cx, buf.top, { arrow: true, w: 1 });
const sL = X3 + 0.15, sR = X3 + 0.15 + SW + 0.15;
subunit(sL, 2, 4, "背景");
subunit(sR, 2, 6, "目标");
const c3L = stack(sL + 0.15, 2, [
  ["取背景帧", "[t_{on} − 1.05, t_{on} − 0.05) s", "62 × 3 × 218"],
  ["外积", "x x^H", "62 × f × 3 × 3"],
  ["平均 → R_b", "(1/62) Σ x x^H", "f × 3 × 3"],
]);
const c3R = stack(sR + 0.15, 2, [
  ["取目标帧", "[t_{on}, t_d]，最长 1 s", "≤ 63 × 3 × 218"],
  ["帧能量", "e = 10·lg mean_{m,f} |X|^2", "≤ 63"],
  ["起始段权重", "w = 0.2 + min(max(Δe,0),10)/10", "≤ 63"],
  ["加权外积累加", "Σ w x x^H，Σ w", "f × 3 × 3"],
  ["归一 → R_s", "÷ Σ w", "f × 3 × 3"],
]);
const yB3 = buf.bot + 0.12;
seg(buf.cx, buf.bot, buf.cx, yB3); seg(c3L[0].cx, yB3, c3R[0].cx, yB3);
seg(c3L[0].cx, yB3, c3L[0].cx, c3L[0].top, { arrow: true, w: 1 }); seg(c3R[0].cx, yB3, c3R[0].cx, c3R[0].top, { arrow: true, w: 1 });
const o3 = pin("输出 R_b(f)，R_s(f) → ④", bx, outY(7), BW + GAP + TW);
wire([[c3L[2].cx, c3L[2].bot], [c3L[2].cx, o3.top - 0.2], [o3.cx - 0.6, o3.top - 0.2], [o3.cx - 0.6, o3.top]], { w: 1 });
wire([[c3R[4].cx, c3R[4].bot], [c3R[4].cx, o3.top - 0.2], [o3.cx + 0.6, o3.top - 0.2], [o3.cx + 0.6, o3.top]], { w: 1 });

// 左侧引线：从输入标签沿模块左沿下来，接入第 k 行层框左边
const tap = (X, pinObj, rows) => {
  const xw = X + 0.2, last = rows[rows.length - 1];
  seg(xw, pinObj.bot, xw, rowY(last) + BH / 2, { w: 1 });
  rows.forEach((k) => seg(xw, rowY(k) + BH / 2, colX(X), rowY(k) + BH / 2, { arrow: true, w: 1 }));
};

// ================= ④ 白化与特征分解 =================
module(X4, MW, "④ 白化与特征分解", "白化后分解，得噪声子空间 E_n", "每 0.25 s，每频点 3 × 3 · 1.0 MFLOPS");
const i4 = pin("输入 R_b(f)，R_s(f)", X4 + 0.1, PIN_Y, BW + LM - 0.1);
const c4 = stack(colX(X4), 1, [
  ["对角加载", "R_b + δI，δ = 1% 平均对角元", "f × 3 × 3"],
  ["Cholesky", "L L^H = R_b + δI", "f × 3 × 3"],
  ["三角求逆", "L^{−1}，前代法（另送 ⑤）", "f × 3 × 3"],
  ["白化", "R_w = L^{−1} R_s L^{−H}（R_s 接入）", "f × 3 × 3"],
  ["厄米化", "(R_w + R_w^H) / 2", "f × 3 × 3"],
  ["特征分解", "3 × 3：U Λ U^H", "f × 3 × 3"],
  ["取噪声子空间", "E_n = [u_2, u_3]（单声源）", "f × 3 × 2"],
]);
seg(c4[0].cx, i4.bot, c4[0].cx, c4[0].top, { arrow: true, w: 1 });
tap(X4, i4, [4]);
const o4 = pin("输出 L^{−1}(f)，E_n(f) → ⑤", colX(X4), outY(7), BW);
seg(c4[6].cx, c4[6].bot, c4[6].cx, o4.top, { arrow: true, w: 1 });

// ================= ⑤ MUSIC 空间谱 =================
module(X5, MW, "⑤ MUSIC 空间谱", "72 个方向逐一打分，得空间谱 P(θ)", "每 0.25 s · 8.2 MFLOPS");
const i5 = pin("输入 L^{−1}(f)，E_n(f)", X5 + 0.1, PIN_Y, BW + LM - 0.1);
const c5 = stack(colX(X5), 1, [
  ["方向模板（ROM）", "头部传递函数 h(θ,f)，184 KB", "72 × f × 3"],
  ["归一化", "a = h / ‖h‖", "72 × f × 3"],
  ["白化", "a_w = L^{−1} a（L^{−1} 接入）", "72 × f × 3"],
  ["投影", "E_n^H a_w（E_n 接入）", "72 × f × 2"],
  ["模平方 × 2", "‖a_w‖^2，‖E_n^H a_w‖^2", "2 × 72 × f"],
  ["相除", "P_f = ‖a_w‖^2 / ‖E_n^H a_w‖^2", "72 × f"],
  ["每频点归一", "÷ max_θ P_f", "72 × f"],
  ["频点平均", "P(θ) = mean_f", "72"],
]);
tap(X5, i5, [3, 4]);
const o5 = pin("输出 P(θ) → ⑥", colX(X5), outY(8), BW);
seg(c5[7].cx, c5[7].bot, c5[7].cx, o5.top, { arrow: true, w: 1 });

// ================= ⑥ 找峰、融合与输出 =================
module(X6, DW, "⑥ 找峰、融合与输出", "找峰得声学方位；有人脸时与人脸方位融合", "每 0.25 s 定位，每 16 ms 输出");
const sL6 = X6 + 0.15, sR6 = X6 + 0.15 + SW + 0.15;
const i6 = pin("输入 P(θ)", sL6 + 0.15, PIN_Y, BW);
subunit(sL6, 1, 3, "声学方位");
subunit(sR6, 1, 4, "摄像头（按需打开）", "dash");
const c6L = stack(sL6 + 0.15, 1, [
  ["找峰", "k* = argmax P(θ_k)", "1"],
  ["三点抛物线插值", "δ ∈ [−0.5, 0.5]", "1"],
  ["声学方位", "θ_a = θ_{k*} + 5°·δ", "1"],
]);
seg(c6L[0].cx, i6.bot, c6L[0].cx, c6L[0].top, { arrow: true, w: 1 });
const c6R = stack(sR6 + 0.15, 1, [
  ["摄像头", "1–2 fps，两耳各一", "图像"],
  ["人脸检测", "人脸框中心 u_i", "N 个框"],
  ["像素 → 方位【设计】", "φ_i = atan((u_i − c_x)/f_x) + 安装角", "N"],
  ["换到头心坐标【设计】", "安装位置 + 曝光时刻 IMU 角", "N"],
], { dash: "dash" });
const MWd = 3.7, xM = X6 + (DW - MWd - GAP - TW) / 2 + 0.6;
const c6M = stack(xM, 5, [
  ["融合打分", "s_0 = P(θ_{k*}) − μ；s_i = ±8° 内谱峰 + λ(l_i − 0.5)", "N + 1"],
  ["取最大", "θ_{out} = φ_{i*}（若 max s_i > s_0），否则 θ_{k*}", "1"],
  ["IMU 换坐标【设计】", "θ_{world} = θ_{out} + ψ(t)", "1"],
  ["跟踪【设计】", "世界坐标下保持目标", "1"],
  ["置信度【待确认】", "候选：谱峰高，或峰值 / 次峰", "1", { dash: "dash" }],
  ["打包", "方位、置信度、说话、干扰 ×3、序号", "8 字节"],
], { w: MWd });
const yM = rowY(5) - 0.17;
wire([[c6L[2].cx, c6L[2].bot], [c6L[2].cx, yM], [c6M[0].cx - 0.5, yM], [c6M[0].cx - 0.5, c6M[0].top]], { w: 1 });
wire([[c6R[3].cx, c6R[3].bot], [c6R[3].cx, c6R[3].bot + 0.12], [c6M[0].cx + 0.5, c6R[3].bot + 0.12], [c6M[0].cx + 0.5, c6M[0].top]], { w: 1, dash: "dash" });
// P(θ) 同时接入融合打分
const xw6 = X6 + 0.075;
seg(i6.x, i6.y + PIN_H / 2, xw6, i6.y + PIN_H / 2, { w: 1 });
seg(xw6, i6.y + PIN_H / 2, xw6, c6M[0].mid, { w: 1 });
seg(xw6, c6M[0].mid, xM, c6M[0].mid, { arrow: true, w: 1 });
txt("P(θ)", xw6 + 0.1, c6M[0].mid - 0.3, 0.8, 0.26, { fs: 10, color: C.gray, align: "left" });
// IMU 输入
const imuW = 1.4, imuX = xM - imuW - 0.5;
box(imuX, c6M[2].y + 0.08, imuW, BH - 0.16, "FFFFFF", C.layLine, undefined, 1);
txt("IMU：ψ(t)", imuX, c6M[2].y + 0.08, imuW, BH - 0.16, { fs: 10.5, bold: true });
seg(imuX + imuW, c6M[2].mid, xM, c6M[2].mid, { arrow: true, w: 1 });
const o6 = pin("输出 方位与置信度 → 增强模块", xM, outY(10), MWd + GAP + TW, { fill: C.navy, color: "FFFFFF", fs: 12.5 });
seg(c6M[5].cx, c6M[5].bot, c6M[5].cx, o6.top, { arrow: true, w: 1 });

// ================= 标题行：模块之间的主流程 =================
const yH = MT + HH / 2;
const flow = (xa, xb, top, bottom) => {
  seg(xa, yH, xb, yH, { arrow: true, w: 2, color: C.navy });
  txt(top, xa, yH - 0.42, xb - xa, 0.34, { fs: 12, bold: true, color: C.navy });
  if (bottom) txt(bottom, xa - 0.05, yH + 0.08, xb - xa + 0.1, 0.3, { fs: 9.5, color: C.gray });
};
flow(X1 + MW, X2, "x(f,t)", "3 × 218");
flow(X2 + MW, X3, "t_{on}", "1");
flow(X3 + DW, X4, "R_b, R_s", "2 × f×3×3");
flow(X4 + MW, X5, "L^{−1}, E_n", "f×3×3, f×3×2");
flow(X5 + MW, X6, "P(θ)", "72");
// ① → ③：x(f,t) 每帧写入帧缓存（越过 ②）
const yBy = MT - 0.3, xa = X1 + MW - 0.6, xb = X3 + 0.8;
wire([[xa, MT], [xa, yBy], [xb, yBy], [xb, MT]], { w: 2, color: C.navy });
txt("x(f,t) 每帧写入 ③ 的帧缓存", X2, yBy - 0.36, MW, 0.32, { fs: 12, bold: true, color: C.navy });

s.addNotes("代码对应：① sim.highpass、sim.stft；② run_camera_policy.novelty_raw、acoustic_onsets（从第 0.3 s 起计算，第 1 s 起判决，背景递推在本帧判决后才更新）；③ methods.frame_energy_db、onset_weights、covariance，时间窗 run_camera_policy.gevd_spec；④⑤ methods.music；⑥ methods.peak、methods.fuse_soft（λ = 0.1，μ = 0.05）；方向模板 sphere.sphere_tf（刚性球，1.5 m）。帧缓存为实现所需：背景取开口前 1 s 的帧，而开口在之后才被检出（情况 1 仿真中 0.3 s 内）。仿真中未实现：耳间链路、对齐、像素到方位、头心换算、IMU 跟踪、置信度（仿真中视觉直接给出人脸方位，误差 2°）。不开摄像头时 θ_out = θ_a。");
p.writeFile({ fileName: OUT }).then((f) => console.log("saved", f));
