// 本仓库 PPT 的共用样式（按 CLAUDE.md "PPT 与文档规范"）：浅灰底 #F7F8FA、主色 #134074、微软雅黑、中文语言标签；
// 短标题 + 标题下一句加粗要点；表格表头 #134074 白字加粗、正文 #EAF2F8 与白色交替（逐格写死颜色）；页脚来源 + 页码。
// 用法：const S = require("./deck_style")("文档标题"); const s = S.newSlide("标题", "来源", "备注"); S.key(s, "要点句"); ... S.save(OUT)
// 复刻 mentor 某份 PPT 的版式只在用户指定时做（用户 2026-11-25）；默认用本样式。
const pptxgen = require("pptxgenjs");

module.exports = function makeDeck(docTitle) {
  const F = "Microsoft YaHei";
  const C = { ink: "1F1F1F", gray: "595959", light: "8C8C8C", rule: "D9D9D9", box: "A6A6A6", navy: "134074", navyLt: "8DA9C4",
    navyPale: "EAF2F8", red: "B22222", bg: "F7F8FA" };
  const p = new pptxgen();
  p.layout = "LAYOUT_WIDE";
  p.title = docTitle;
  p.defineSlideMaster({
    title: "BODY", background: { color: C.bg },
    objects: [
      { line: { x: 0.6, y: 1.08, w: 12.13, h: 0, line: { color: C.navy, width: 1 } } },
      { line: { x: 0.6, y: 6.88, w: 12.13, h: 0, line: { color: C.rule, width: 0.75 } } },
    ],
    slideNumber: { x: 12.23, y: 6.94, w: 0.5, h: 0.3, fontFace: F, fontSize: 9, color: C.light, align: "right" },
  });
  p.defineSlideMaster({ title: "COVER", background: { color: C.bg } });

  const T = (s, text, o) => s.addText(text, Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 13, color: C.ink, margin: 0, valign: "top", isTextBox: true }, o));
  const cell = (t, o) => ({ text: t, options: Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 10.5, color: C.ink, valign: "middle" }, o) });
  const bold = (t, o) => cell(t, Object.assign({ bold: true }, o));
  const ctr = (t, o) => cell(t, Object.assign({ align: "center" }, o));
  const W = { type: "solid", pt: 0.75, color: "FFFFFF" };
  function table(s, rows, x, y, colW, rowH, o) {
    const styled = rows.map((r, i) => r.map((c) => {
      const opt = Object.assign({}, c.options, { border: [W, W, W, W] });
      if (i === 0) Object.assign(opt, { fill: { color: C.navy }, color: "FFFFFF", bold: true });
      else if (!opt.fill) opt.fill = { color: i % 2 === 1 ? C.navyPale : "FFFFFF" };
      return { text: c.text, options: opt };
    }));
    return s.addTable(styled, Object.assign({ x, y, w: colW.reduce((a, b) => a + b, 0), colW, rowH, margin: [0.04, 0.08, 0.04, 0.08], autoPage: false }, o || {}));
  }
  function newSlide(title, source, notes) {
    const s = p.addSlide({ masterName: "BODY" });
    T(s, title, { x: 0.6, y: 0.38, w: 12.1, h: 0.6, fontSize: 20, bold: true, color: C.navy, valign: "middle" });
    if (source) T(s, source, { x: 0.6, y: 6.94, w: 11.4, h: 0.3, fontSize: 9, color: C.light, valign: "middle" });
    if (notes) s.addNotes(notes);
    return s;
  }
  const key = (s, text, o) => T(s, text, Object.assign({ x: 0.6, y: 1.16, w: 12.13, h: 0.4, fontSize: 13.5, bold: true, color: C.ink, valign: "middle" }, o || {}));
  function box(s, text, x, y, w, h, o) {
    o = o || {};
    s.addShape(p.shapes.RECTANGLE, { x, y, w, h, fill: { color: o.fill || "FFFFFF" }, line: { color: o.line || C.box, width: o.lw || 0.75, dashType: o.dash || "solid" } });
    T(s, text, { x: x + 0.05, y, w: w - 0.1, h, fontSize: o.fs || 11, align: o.align || "center", valign: "middle", color: o.color || C.ink, bold: !!o.bold });
  }
  function line(s, x1, y1, x2, y2, o) {
    o = o || {};
    s.addShape(p.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001,
      flipH: x2 < x1, flipV: y2 < y1, line: { color: o.color || C.gray, width: o.width || 1, dashType: o.dash || "solid", endArrowType: o.arrow === false ? undefined : "triangle" } });
  }
  const para = (s, items, x, y, w, h, o) => s.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } })),
    Object.assign({ x, y, w, h, fontFace: F, lang: "zh-CN", fontSize: 12, color: C.ink, valign: "top", margin: 0.03, paraSpaceAfter: 6, isTextBox: true }, o || {}));
  const chartBase = { catAxisLabelFontFace: F, valAxisLabelFontFace: F, dataLabelFontFace: F, legendFontFace: F, titleFontFace: F,
    catAxisLabelFontSize: 10.5, valAxisLabelFontSize: 10, dataLabelFontSize: 9.5, legendFontSize: 10.5, titleFontSize: 11.5,
    catAxisLabelColor: "404040", valAxisLabelColor: "595959", dataLabelColor: "404040", titleColor: "404040",
    valGridLine: { color: "E8E8E8", size: 0.5 }, catGridLine: { style: "none" }, catAxisLineColor: "BFBFBF", valAxisLineShow: false,
    catAxisTitleFontSize: 10.5, catAxisTitleColor: "404040", catAxisTitleFontFace: F, valAxisTitleFontSize: 10.5, valAxisTitleColor: "404040", valAxisTitleFontFace: F };
  // 水平条形图（手绘，便于按类别着色、对数刻度、自定义数值标签）。items: [{name, value, label, color}]
  function hbars(s, items, x, y, w, rowH, o) {
    o = o || {};
    const nameW = o.nameW || 2.6, labW = o.labW || 0.9, bw = w - nameW - labW;
    const vmax = o.vmax || Math.max(...items.map((d) => d.value));
    const pos = (v) => o.log ? bw * (Math.log10(v) - Math.log10(o.vmin)) / (Math.log10(vmax) - Math.log10(o.vmin)) : bw * v / vmax;
    items.forEach((d, i) => {
      const yy = y + i * rowH, bh = rowH * 0.62;
      T(s, d.name, { x, y: yy, w: nameW - 0.1, h: rowH, fontSize: o.fs || 10.5, align: "right", valign: "middle", color: C.ink });
      const L = Math.max(0.02, pos(d.value));
      s.addShape(p.shapes.RECTANGLE, { x: x + nameW, y: yy + (rowH - bh) / 2, w: L, h: bh, fill: { color: d.color || C.navy }, line: { type: "none" } });
      T(s, d.label || String(d.value), { x: x + nameW + L + 0.06, y: yy, w: labW + 0.6, h: rowH, fontSize: o.fs || 10.5, valign: "middle", color: C.gray });
    });
    if (o.ticks) {
      const yb = y + items.length * rowH + 0.02;
      s.addShape(p.shapes.LINE, { x: x + nameW, y: yb, w: bw, h: 0, line: { color: "BFBFBF", width: 0.75 } });
      o.ticks.forEach(([v, t]) => {
        const xx = x + nameW + pos(v);
        s.addShape(p.shapes.LINE, { x: xx, y: y, w: 0, h: yb - y, line: { color: "E3E3E3", width: 0.5, dashType: "dash" } });
        T(s, t, { x: xx - 0.4, y: yb + 0.03, w: 0.8, h: 0.22, fontSize: 9, align: "center", color: C.gray });
      });
    }
    return { pos, x0: x + nameW, bw };
  }
  // 段落结束标记默认 en-US，保存时统一改为 zh-CN
  async function save(OUT) {
    const buf = await p.write({ outputType: "nodebuffer" });
    const JSZip = require("jszip");
    const z = await JSZip.loadAsync(buf);
    for (const n of Object.keys(z.files)) {
      if (/^ppt\/(slides\/slide\d+|slideMasters\/slideMaster\d+|slideLayouts\/slideLayout\d+)\.xml$/.test(n))
        z.file(n, (await z.file(n).async("string")).replace(/lang="en-US"/g, 'lang="zh-CN"'));
    }
    require("fs").writeFileSync(OUT, await z.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
    console.log("saved", OUT);
  }
  return { p, F, C, T, cell, bold, ctr, table, newSlide, key, box, line, para, chartBase, hbars, save };
};
