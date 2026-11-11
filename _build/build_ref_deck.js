// 公开参照方案汇总（2 页）：资源参照、效果参照。数据来自 _build/ref_data.json（由 ref_data.py 生成）。
const pptxgen = require("pptxgenjs");
const path = require("path");
const D = require("./ref_data.json");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, ".."), "公开参照方案汇总.pptx");
const F = "Microsoft YaHei";
const C = { navy: "17375E", text: "1F2937", gray: "5B6B7F", mute: "8A97A8", light: "F3F6FA", line: "D5DDE7", white: "FFFFFF",
  teal: "1F7A68", tealL: "E3F1EE", slate: "8A94A2", ice: "E8F0F9", amberL: "FBF0E3" };

const p = new pptxgen();
p.layout = "LAYOUT_WIDE";
p.title = "公开参照方案汇总";
p.theme = { headFontFace: F, bodyFontFace: F, lang: "zh-CN" };
const T = (s, text, o) => s.addText(text, Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 12, color: C.text, margin: 0, valign: "top", paraSpaceAfter: 0 }, o));
const R = (s, x, y, w, h, fill, r) => s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { type: "none" }, rectRadius: r === undefined ? 0.08 : r });
const srcIdx = (keys) => { const order = []; keys.forEach((k) => { if (D.sources[k] && !order.includes(k)) order.push(k); }); return order; };

function header(s, title, tag, lead, lw) {
  s.background = { color: C.white };
  T(s, [{ text: "公开参照丨", options: { color: C.mute } }, { text: title, options: { color: C.navy } }], { x: 0.5, y: 0.32, w: 10.6, h: 0.6, fontSize: 24, bold: true, valign: "middle" });
  s.addText(tag, { shape: p.shapes.ROUNDED_RECTANGLE, x: 11.35, y: 0.42, w: 1.48, h: 0.4, fill: { color: C.navy }, line: { type: "none" }, rectRadius: 0.2,
    fontFace: F, lang: "zh-CN", fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
  T(s, lead, { x: 0.5, y: 0.94, w: lw || 12.3, h: 0.36, fontSize: 13, color: C.gray, valign: "middle" });
}
function cell(text, o) {
  const unknown = /^(未公开|未单列|未报告|定位模块未公开|待目标芯片实测|—)/.test(text) || text.startsWith("未公开；");
  return { text, options: Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 9.5, color: unknown ? C.slate : C.text, valign: "middle" }, o) };
}
function table(s, cols, rows, widths, y, rowH, fills, refs) {
  const head = cols.map((c) => cell(c, { bold: true, color: C.white, fill: { color: C.navy }, align: "center", fontSize: 10.5 }));
  const body = rows.map((r, i) => r.map((v, j) => {
    let t = v;
    if (j === 0 && refs) t = v + " [" + refs[i] + "]";
    return cell(t, Object.assign({ fill: { color: fills[i] } }, j === 0 ? { bold: true, color: C.navy } : {}));
  }));
  s.addTable([head, ...body], { x: 0.5, y, w: widths.reduce((a, b) => a + b, 0), colW: widths, rowH: [0.38, ...rows.map(() => rowH)],
    fontFace: F, fontSize: 10, margin: [0.04, 0.07, 0.04, 0.07], border: { type: "solid", pt: 0.7, color: C.line }, autoPage: false });
}
function takeaways(s, y, items, proposal) {
  const h = 0.36 * items.length + 0.2;
  R(s, 0.5, y, 12.33, h, C.tealL);
  s.addShape(p.shapes.RECTANGLE, { x: 0.5, y, w: 0.09, h, fill: { color: C.teal }, line: { type: "none" } });
  T(s, items.map((t, i) => ({ text: t, options: { bullet: { code: "25AA" }, breakLine: i < items.length - 1 } })), { x: 0.75, y: y + 0.1, w: 11.95, h: h - 0.2, fontSize: 11.5, valign: "middle", paraSpaceAfter: 3 });
  if (proposal) {
    s.addText(proposal, { shape: p.shapes.ROUNDED_RECTANGLE, x: 0.5, y: y + h + 0.12, w: 12.33, h: 0.42, fill: { color: C.navy }, line: { type: "none" }, rectRadius: 0.08,
      fontFace: F, lang: "zh-CN", fontSize: 12, bold: true, color: C.white, valign: "middle", margin: [0, 12, 0, 12] });
  }
}
function sources(s, keys) {
  T(s, keys.map((k, i) => [{ text: "[" + (i + 1) + "] ", options: { color: C.mute } }, { text: D.sources[k][0], options: { color: "2F6EB5", hyperlink: { url: D.sources[k][1], tooltip: D.sources[k][1] } } }, { text: i < keys.length - 1 ? "　" : "" }]).flat(),
    { x: 0.5, y: 6.78, w: 12.33, h: 0.45, fontSize: 9 });
}

// ---------------- 第 1 页：资源参照 ----------------
{
  const s = p.addSlide();
  header(s, "资源：定位模块的内存与算力", "资源参照", "竞品未公开定位模块资源；有公开数字的端侧方案只有乐鑫和 ODAS", 7.8);
  const keys = srcIdx(D.res.map((r) => r[8]));
  const refs = D.res.map((r) => (keys.includes(r[8]) ? keys.indexOf(r[8]) + 1 : "仿真"));
  const fills = D.res.map((r) => (r[1].startsWith("竞品") ? C.amberL : r[0].startsWith("本方案") ? C.ice : C.white));
  table(s, D.res_cols.slice(0, 8), D.res.map((r) => r.slice(0, 8)), [1.55, 1.1, 1.6, 1.5, 1.72, 1.78, 1.6, 1.48], 1.42, 0.56, fills,
    refs.map((x) => (x === "仿真" ? "本仓库" : x)));
  T(s, [{ text: "■ ", options: { color: "E9C79B" } }, { text: "竞品　", options: { color: C.gray } }, { text: "■ ", options: { color: "B9CDE6" } }, { text: "本方案（仿真）　　灰字：未公开 / 待实测", options: { color: C.gray } }],
    { x: 8.3, y: 1.06, w: 4.53, h: 0.24, fontSize: 9.5, align: "right" });
  takeaways(s, 5.62, D.res_take);
  sources(s, keys);
  s.addNotes("这一页回答“同样的模型规格、算力开销”能参照什么。萤石和思必驰都没有公开定位模块的内存和算力，XMOS 也只公开了功能。目前能查到原文数字的端侧方案只有两个：乐鑫 ESP-SR 的定位模块，四麦约 206 KB 内存，400 MHz 芯片上每 8 毫秒一帧耗时 0.65 毫秒，CPU 约 8%；ODAS 开源框架在树莓派 3 上，八麦定位单核约 14%，跟踪一个声源约 0.8%。两者都是传统方法，没有神经网络。最后一行是本方案仿真基线：两套导向表（SRP 和 MUSIC）在 10 度网格、双精度下合计约 669 KB，不含工作缓存，单精度约减半；仿真里电视和人声一样响、混响 0.6 秒时，10 度内命中 63%，粗大错误 3%；算力要在目标芯片上实测。");
}

// ---------------- 第 2 页：效果参照 ----------------
{
  const s = p.addSlide();
  header(s, "效果：精度与参数量", "效果参照", "学术论文给出同条件下的精度和参数量，但都没有给端侧内存与耗时；DCASE 任务更难，只作量级参考");
  const keys = srcIdx(D.eff.map((r) => r[5]));
  const refs = D.eff.map((r) => keys.indexOf(r[5]) + 1);
  const fills = D.eff.map((r, i) => (r[0] === "FN-SSL" ? C.ice : C.white));
  table(s, D.eff_cols.slice(0, 5), D.eff.map((r) => r.slice(0, 5)), [2.0, 4.15, 1.3, 2.2, 2.68], 1.42, 0.44, fills, refs);
  takeaways(s, 5.12, D.eff_take, D.proposal);
  sources(s, keys);
  s.addNotes("这一页回答效果能参照什么。前四行来自 FN-SSL 论文，同一套条件下比较：两麦间距 8 厘米、在线处理，仿真和 LOCATA 实录都测了。0.8 M 参数的 SRP-DNN 已经接近 2.5 M 的 FN-SSL，5.6 M 的 Cross3D 反而更差，说明参数量大不等于效果好。RealMAN 数据集的结果说明，只用仿真数据训练，在真实录音上 5 度内准确率从 89% 降到 60%，所以需要实采数据。DCASE 是 13 类声音事件、多声源的定位，比单人说话难很多，第一名用了约 4700 万参数的集成模型，误差 13.6 度，只作量级参考。这些论文都只报参数量，没有给在端侧芯片上的内存和耗时。建议资源以乐鑫为量级参照，效果以 FN-SSL 论文的同条件对比为参照，目标芯片确认后再定具体预算。");
}

p.writeFile({ fileName: OUT }).then(() => console.log("written", OUT));
