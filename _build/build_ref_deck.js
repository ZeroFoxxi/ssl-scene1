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
const srcIdx = (keys) => { const order = []; keys.forEach((k) => k.split("+").forEach((x) => { if (D.sources[x] && !order.includes(x)) order.push(x); })); return order; };
const refOf = (keys, k) => k.split("+").map((x) => keys.indexOf(x) + 1).join("][");

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
function sources(s, keys, y) {
  T(s, keys.map((k, i) => [{ text: "[" + (i + 1) + "] ", options: { color: C.mute } }, { text: D.sources[k][0], options: { color: "2F6EB5", hyperlink: { url: D.sources[k][1], tooltip: D.sources[k][1] } } }, { text: i < keys.length - 1 ? "　" : "" }]).flat(),
    { x: 0.5, y: y || 6.78, w: 12.33, h: 0.4, fontSize: 9 });
}

// ---------------- 第 1 页：资源参照 ----------------
{
  const s = p.addSlide();
  header(s, "资源：定位模块的内存与算力", "资源参照", "有公开数字的设备端方案：乐鑫（物联网芯片）、ODAS（树莓派开发板）", 7.8);
  const keys = srcIdx(D.res.map((r) => r[8]));
  const refs = D.res.map((r) => refOf(keys, r[8]));
  const fills = D.res.map((r) => (r[1].startsWith("竞品") ? C.amberL : C.white));
  table(s, D.res_cols.slice(0, 8), D.res.map((r) => r.slice(0, 8)), [1.75, 1.6, 1.7, 1.5, 1.95, 1.4, 1.38, 1.05], 1.42, 0.46, fills, refs);
  T(s, [{ text: "■ ", options: { color: "E9C79B" } }, { text: "竞品　　", options: { color: C.gray } }, { text: "灰字：未公开", options: { color: C.gray } }],
    { x: 8.3, y: 1.06, w: 4.53, h: 0.24, fontSize: 9.5, align: "right" });
  takeaways(s, 5.66, D.res_take);
  sources(s, keys, 6.72);
  s.addNotes("这一页回答“同样的模型规格、算力开销”能参照什么。萤石和思必驰都没有公开定位模块的内存和算力，XMOS 也只公开了功能。目前能查到原文数字的端侧方案只有两个：乐鑫 ESP-SR 的定位模块，四麦约 206 KB 内存，400 MHz 芯片上每 8 毫秒一帧耗时 0.65 毫秒，CPU 约 8%；ODAS 开源框架在树莓派 3 上，八麦定位单核约 14%，跟踪一个声源约 0.8%；树莓派是通用开发板，算力比摄像头芯片宽裕，只能看量级，最接近产品芯片的是乐鑫。两者都是传统方法，没有神经网络。思必驰的 DUI 离线前端 SDK 有线阵、环阵和家居双麦三个版本，都把回声消除、声源定位、波束成形和唤醒做在一起，唤醒后回调方位，但手册没有写资源占用和运行平台。竞品这四行和竞品补充页对应：萤石 C6Wi 4K 和思必驰 C60 是主对标，官方只写了萤石 C6Wi 系列内置专用芯片、1.0T 算力；萤石 RK3 公开了整机的 CPU 和 NPU，作为芯片参照；三者定位模块本身的资源都没有公开。");
}

// ---------------- 第 2 页：效果参照 ----------------
{
  const s = p.addSlide();
  header(s, "效果：精度、参数量与计算量", "效果参照", "2026 年新论文均未报参数量与计算量，DCASE 2026 不再报 DOA 误差；效果参照仍以 IPDnet2（2025-09）为主");
  const keys = srcIdx(D.eff.map((r) => r[6]).concat(["SURVEY26"]));
  const refs = D.eff.map((r) => refOf(keys, r[6]));
  const fills = D.eff.map((r) => (r[0].startsWith("IPDnet2") ? C.ice : C.white));
  table(s, D.eff_cols.slice(0, 6), D.eff.map((r) => r.slice(0, 6)), [1.6, 1.62, 3.03, 1.75, 1.35, 2.98], 1.42, 0.4, fills, refs);
  takeaways(s, 5.45, D.eff_take, D.proposal);
  sources(s, keys, 7.02);
  s.addNotes("这一页回答效果能参照什么。截至 2026 年 11 月检索了 arXiv 和 DCASE：2026 年有九篇相关论文，但都没有报参数量和计算量，有的只在仿真上测，有的只是时延估计这类组件；2026 年 7 月的空间语音感知综述，汇总的最新实录方法也到 2025 年的 IPDnet2 为止；DCASE 2026 的定位任务改成了声学成像，不再报 DOA 误差。所以效果参照仍以 IPDnet2 为主，核查明细在 Excel 里。前五行来自 IPDnet2 论文，2025 年 9 月，用 RealMAN 的真实录音，阵列是半径 3 厘米的四麦圆阵加中心麦，和场景一的小阵列接近，两个人说话混在一起。它同时给了参数量和每秒计算量：Tiny 版 0.5 M 参数、每秒 0.2 GFLOPs，精度和 0.8 M 的 SRP-DNN 相当，计算量约为它的四十分之一；Large 版 7.8 M 精度最好。LightDOA 是 2025 年 11 月的轻量模型，只有约 3.7 万参数，但只在仿真上测过。RealMAN 的结果说明只用仿真训练，在真实录音上 5 度内准确率从 89% 降到 60%，需要实采数据。DCASE 2025 是 13 类声音事件、多声源，比单人说话难很多，第一名用了约 5800 万参数的集成模型，误差 12.2 度，只作量级参考。这些论文给的是浮点计算量，没有给在端侧芯片上的内存和耗时。建议资源以乐鑫为量级参照，效果以 IPDnet2 的实录对比为参照，目标芯片确认后再定具体预算。");
}

require("./zh_notes")(p, OUT);
