// 场景一阶段汇报（给 mentor）：结论先行、一页一个信息；图表为 PowerPoint 原生图表，数字来自 _build/scene1_report_data.json。
// 运行：python _build/scene1_progress_data.py && node _build/build_scene1_report.js
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, "..", "01_场景一_摄像头声源定位", "方案选型"), "场景一阶段汇报_会议室声源定位.pptx");
const D = JSON.parse(fs.readFileSync(path.join(__dirname, "scene1_report_data.json"), "utf-8"));

const F = "Microsoft YaHei";
const K = { dark: "1F2A36", ink: "1F2A36", sub: "5B6775", mute: "8A95A1", ours: "0F7C6C", ours2: "0A4F46", base1: "B8C2CC", base2: "7D8A97", tint: "EEF3F4", white: "FFFFFF" };
const p = new pptxgen();
p.layout = "LAYOUT_WIDE";                         // 13.33 × 7.5 in
p.title = "场景一阶段汇报";
p.theme = { headFontFace: F, bodyFontFace: F };

const T = (s, text, o) => s.addText(text, Object.assign({ fontFace: F, lang: "zh-CN", color: K.ink, margin: 0, isTextBox: true, valign: "top" }, o));
function page(title, notes) {
  const s = p.addSlide();
  s.background = { color: K.white };
  T(s, title, { x: 0.6, y: 0.45, w: 12.1, h: 0.7, fontSize: 26, bold: true, valign: "middle" });
  if (notes) s.addNotes(notes.join("\n"));
  return s;
}
const axis = (o) => Object.assign({
  catAxisLabelFontFace: F, valAxisLabelFontFace: F, dataLabelFontFace: F, legendFontFace: F,
  catAxisLabelFontSize: 13, valAxisLabelFontSize: 11, dataLabelFontSize: 12, legendFontSize: 12,
  catAxisLabelColor: K.sub, valAxisLabelColor: K.mute, dataLabelColor: K.ink,
  valGridLine: { color: "E3E8EC", size: 0.75 }, catGridLine: { style: "none" },
  valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 20, valAxisLabelFormatCode: "0",
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0", barGapWidthPct: 60,
}, o);

const RM = D.realman, ft = RM["小网络（+实录微调）"];
const SETUP = "仿真设置：会议室 5–10 m × 4–7 m，RT60 0.3 / 0.6 s；摄像头装在前墙上方；6 人围桌，A 说完换 B 说；四种情况：正常换人、抢话、远端参会人从电视喇叭说话、空调噪声。指标：方向误差 ≤10° 的比例。";

// 1 封面
{
  const s = p.addSlide(); s.background = { color: K.dark };
  T(s, "场景一：会议室摄像头声源定位", { x: 0.9, y: 2.5, w: 11.5, h: 1.0, fontSize: 40, bold: true, color: K.white });
  T(s, "阶段进展：阵列选型、端侧小网络、闭环与真实录音验证", { x: 0.9, y: 3.6, w: 11.5, h: 0.6, fontSize: 20, color: "C9D3DB" });
  T(s, "2026 年 11 月", { x: 0.9, y: 6.3, w: 6, h: 0.4, fontSize: 14, color: "9FB0BD" });
}

// 2 一页结论
{
  const s = page("这一阶段的结论", [SETUP, "数字依次来自：仿真固定测试集（800 个样本）、60 段 60 s 会议闭环仿真、RealMAN 真实录音（5 个室内场景、600 个样本）。"]);
  const cards = [
    ["95%", "仿真：换人后 0.5 s 判决准确率", "传统方法最好 84%"],
    [D.closed_loop.nn.wrong.toFixed(1), "闭环：每分钟误转次数", `传统方法 ${D.closed_loop.gevd.wrong.toFixed(1)} 次`],
    [ft ? `${ft.acc10}%` : `${RM["小网络（仿真训练）"].acc10}%`, ft ? "真实录音：实录微调后" : "真实录音：只用仿真训练", `传统方法最好 ${RM["GEVD-MUSIC"].acc10}%`],
    [`${(D.nn_params / 1e6).toFixed(2)} M`, "网络参数量", "处于端侧几百 K 量级"],
  ];
  cards.forEach((c, i) => {
    const x = 0.6 + i * 3.1, y = 1.8;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.85, h: 3.4, fill: { color: K.tint }, line: { type: "none" }, rectRadius: 0.12 });
    T(s, c[0], { x: x + 0.25, y: y + 0.45, w: 2.4, h: 1.0, fontSize: 40, bold: true, color: K.ours, valign: "middle" });
    T(s, c[1], { x: x + 0.25, y: y + 1.65, w: 2.4, h: 0.9, fontSize: 15, color: K.ink });
    T(s, c[2], { x: x + 0.25, y: y + 2.65, w: 2.4, h: 0.5, fontSize: 12, color: K.sub });
  });
  T(s, "会议室换人测向：小网络在仿真、闭环和真实录音上都优于传统方法；实录数据能进一步提升。",
    { x: 0.6, y: 5.75, w: 12.1, h: 0.8, fontSize: 15, color: K.sub });
}

// 3 做了什么
{
  const s = page("做了什么", [SETUP]);
  const steps = [["场景", "会议室换人：谁开口就转向谁"], ["阵列", "比较 11 种阵列，暂定 6 麦线阵、孔径 17.5 cm"], ["传统基线", "SRP-PHAT\nGEVD-MUSIC"],
                 ["小网络", "相位差特征 + 卷积循环网络，约 0.28 M 参数"], ["验证", "60 段会议闭环；LOCATA、RealMAN 真实录音"]];
  steps.forEach((st, i) => {
    const x = 0.6 + i * 2.5, cy = 2.6;
    s.addShape(p.shapes.OVAL, { x: x + 0.7, y: cy, w: 0.9, h: 0.9, fill: { color: i === 3 ? K.ours : K.dark }, line: { type: "none" } });
    T(s, String(i + 1), { x: x + 0.7, y: cy, w: 0.9, h: 0.9, fontSize: 24, bold: true, color: K.white, align: "center", valign: "middle" });
    if (i < steps.length - 1) s.addShape(p.shapes.LINE, { x: x + 1.75, y: cy + 0.45, w: 1.9, h: 0, line: { color: "C9D3DB", width: 1.5 } });
    T(s, st[0], { x: x + 0.1, y: cy + 1.2, w: 2.1, h: 0.5, fontSize: 18, bold: true, align: "center" });
    T(s, st[1], { x: x + 0.1, y: cy + 1.75, w: 2.1, h: 1.2, fontSize: 13, color: K.sub, align: "center" });
  });
  T(s, "训练、验证、测试用不同房间和不同说话人；测试集固定，所有方法在同一批样本上比较。", { x: 0.6, y: 6.1, w: 12.1, h: 0.5, fontSize: 14, color: K.sub });
}

// 4 阵列选型
{
  const s = page("阵列：贴墙装线阵，孔径比麦克风数更重要", [SETUP,
    "方法：GEVD-MUSIC，B 开口后 0.5 s 判决，四种情况、两档 RT60 平均；每档 RT60 100 个房间。",
    `同样贴墙安装的 4 麦圆阵（孔径 6 cm）为 ${D.circle45}%：圆阵受前墙强反射影响明显，移离墙面后恢复；线阵平行于墙时不受此影响。`,
    "线阵离墙 4–50 cm 结果变化在 ±3 个百分点以内。"]);
  const A = D.aperture;
  s.addChart(p.charts.BAR, [{ name: "孔径 10.5 cm", labels: A.labels, values: A["10.5 cm"] }, { name: "孔径 17.5 cm", labels: A.labels, values: A["17.5 cm"] }],
    axis({ x: 0.6, y: 1.5, w: 7.4, h: 5.2, barDir: "col", chartColors: [K.base1, K.ours], showLegend: true, legendPos: "t",
           showTitle: true, title: "误差 ≤10° 的比例（%）", titleFontFace: F, titleFontSize: 13, titleColor: K.sub }));
  const pts = [["孔径从 10.5 cm 加到 17.5 cm", "准确率提高 8–18 个百分点"], ["6 麦与 8 麦效果相同", "计算量少约 30%"], ["暂定：6 麦线阵，孔径 17.5 cm", "4 麦线阵作低成本备选"]];
  pts.forEach((t, i) => {
    T(s, t[0], { x: 8.6, y: 1.9 + i * 1.5, w: 4.2, h: 0.5, fontSize: 17, bold: true, color: i === 2 ? K.ours : K.ink });
    T(s, t[1], { x: 8.6, y: 2.45 + i * 1.5, w: 4.2, h: 0.5, fontSize: 14, color: K.sub });
  });
}

// 5 方法对比（仿真）
{
  const M = D.methods;
  const s = page("仿真：小网络在四种情况下都最好", [SETUP,
    "固定测试集 800 个样本（200 个房间 × 四种情况），6 麦线阵 17.5 cm，B 开口后 0.5 s 判决；小网络只用验证集挑模型，测试集只评测一次。",
    `小网络 ${D.nn_params} 个参数，每次判决约 ${(D.nn_macs / 1e8).toFixed(1)} 亿次乘加（GEVD-MUSIC 约 0.2 亿次，估算）。`]);
  s.addChart(p.charts.BAR, [{ name: "SRP-PHAT", labels: M.labels, values: M["SRP-PHAT"] }, { name: "GEVD-MUSIC", labels: M.labels, values: M["GEVD-MUSIC"] },
                            { name: "小网络", labels: M.labels, values: M["小网络"] }],
    axis({ x: 0.6, y: 1.5, w: 8.6, h: 5.2, barDir: "col", chartColors: [K.base1, K.base2, K.ours], showLegend: true, legendPos: "t", dataLabelFontSize: 11 }));
  [["小网络", M.avg["小网络"], K.ours], ["GEVD-MUSIC", M.avg["GEVD-MUSIC"], K.base2], ["SRP-PHAT", M.avg["SRP-PHAT"], K.base2]].forEach((r, i) => {
    T(s, `${r[1]}%`, { x: 9.7, y: 1.8 + i * 1.45, w: 1.6, h: 0.8, fontSize: 32, bold: true, color: r[2], valign: "middle" });
    T(s, `${r[0]}\n四种情况平均`, { x: 11.2, y: 1.85 + i * 1.45, w: 1.8, h: 0.8, fontSize: 12, color: K.sub, valign: "middle" });
  });
  T(s, "差距最大在远端喇叭：传统方法容易被喇叭声带偏", { x: 9.7, y: 6.1, w: 3.4, h: 0.6, fontSize: 12, color: K.sub });
}

// 6 闭环
{
  const C = D.closed_loop;
  const s = page(`闭环：误转从每分钟 ${C.gevd.wrong.toFixed(1)} 次降到 ${C.nn.wrong.toFixed(1)} 次`, [
    "闭环仿真：60 段 60 s 会议（6 人轮流发言，30% 抢话，约 20% 轮次为远端参会人），空调噪声一直存在；云台 120°/s；RT60 0.3 / 0.6 s 各 30 段。",
    "系统每 0.1 s 处理一次：判断有人开口或方向变化 → 开口后 0.5 s 转向 → 1.0 s 微调；远端喇叭播放时不转。两种方法用同一批会议、同一套转向逻辑，只换测向方法。",
    "对准：方向误差 ≤10°；误转：转向的目标偏离当时发言人 >15°。"]);
  const rows = [["换人后对准用时", `${C.gevd.latency.toFixed(2)} s`, `${C.nn.latency.toFixed(2)} s`], ["2 秒内对准的比例", `${C.gevd.aim2s}%`, `${C.nn.aim2s}%`],
                ["每分钟误转次数", C.gevd.wrong.toFixed(1), C.nn.wrong.toFixed(1)], ["发言时间里画面对准的比例", `${C.gevd.framed}%`, `${C.nn.framed}%`]];
  const cx = [0.6, 6.1, 9.5], cw = [5.3, 3.2, 3.2];
  [["", K.ink], ["传统方法（GEVD-MUSIC）", K.base2], ["小网络", K.ours]].forEach((h, j) => {
    if (j) T(s, h[0], { x: cx[j], y: 1.6, w: cw[j], h: 0.5, fontSize: 15, bold: true, color: h[1], align: "center" });
  });
  rows.forEach((r, i) => {
    const y = 2.25 + i * 1.05;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w: 12.1, h: 0.85, fill: { color: i === 2 ? "E3F0EE" : K.tint }, line: { type: "none" }, rectRadius: 0.08 });
    T(s, r[0], { x: 0.9, y, w: 5.0, h: 0.85, fontSize: 16, valign: "middle" });
    T(s, r[1], { x: cx[1], y, w: cw[1], h: 0.85, fontSize: 22, bold: true, color: K.base2, align: "center", valign: "middle" });
    T(s, r[2], { x: cx[2], y, w: cw[2], h: 0.85, fontSize: 22, bold: true, color: K.ours, align: "center", valign: "middle" });
  });
  T(s, "转向一样快；小网络在有人说到一半时不会被误触发带偏，误转大幅减少。", { x: 0.6, y: 6.6, w: 12.1, h: 0.5, fontSize: 14, color: K.sub });
}

// 7 真实录音
{
  const names = Object.keys(RM), vals = names.map((k) => RM[k].acc10);
  const s = page(ft ? "真实录音：小网络领先，加入实录微调后进一步提升" : "真实录音：只用仿真训练的小网络仍然领先", [
    `RealMAN：真实录音数据集（CC BY 4.0），测试集 5 个室内场景（办公室 2 个、教室、客厅、办公大厅），${D.realman_n} 个样本；取阵列中一条直线上的 6 个麦克风（3 cm 间距，孔径 15 cm）。`,
    "样本由同一场景、不同位置的两句真实录音相加得到（换人与抢话各半），空出的时段用该场景的真实背景噪声填补；真值为官方方位。",
    "小网络（仿真训练）：只用仿真数据训练，未见过任何真实录音。" + (ft ? "小网络（+实录微调）：再用 RealMAN 另外 3 个场景（与测试场景不重叠）的录音微调，用第 4 个场景挑选模型。" : ""),
    `另一组真实数据 LOCATA（5 麦，${D.locata_n} 个样本）上，只用仿真训练的小网络与传统方法相当（${D.locata["小网络（仿真训练）"]}% vs ${D.locata["GEVD-MUSIC"]}%），说明仿真训练的优势在真实录音上不稳定，需要实录数据。`,
    "来源：RealMAN https://huggingface.co/datasets/AISHELL/RealMAN ；LOCATA https://zenodo.org/records/3630471"]);
  s.addChart(p.charts.BAR, [{ name: "误差 ≤10° 的比例", labels: names.map((n) => n.replace("（", "\n（")), values: vals }],
    axis({ x: 0.6, y: 1.5, w: 8.2, h: 5.2, barDir: "col", chartColors: names.map((n) => (n.startsWith("小网络") ? (n.includes("微调") ? K.ours2 : K.ours) : K.base1)),
           showLegend: false, catAxisLabelFontSize: 12, dataLabelFontSize: 14 }));
  const pts = [[`${RM["小网络（仿真训练）"].acc10}% vs ${RM["GEVD-MUSIC"].acc10}%`, "只用仿真训练，已领先传统方法"]];
  if (ft) pts.push([`${ft.acc10}%`, "加入 3 个实录场景微调后"]);
  pts.push(["实录数据是关键", "下一步扩大实录训练数据"]);
  pts.forEach((t, i) => {
    T(s, t[0], { x: 9.3, y: 1.9 + i * 1.5, w: 3.6, h: 0.6, fontSize: 22, bold: true, color: i === 0 || (ft && i === 1) ? K.ours : K.ink });
    T(s, t[1], { x: 9.3, y: 2.5 + i * 1.5, w: 3.6, h: 0.5, fontSize: 13, color: K.sub });
  });
}

// 8 下一步
{
  const s = p.addSlide(); s.background = { color: K.dark };
  T(s, "下一步", { x: 0.6, y: 0.45, w: 12.1, h: 0.7, fontSize: 26, bold: true, color: K.white, valign: "middle" });
  const items = [["放大训练再压缩", "在 GPU 服务器上先训约 2 M 参数的版本，再压缩到几百 K 并做 8 比特量化；训练包已准备好，服务器网络访问待开通"],
                 ["扩大实录数据", "更多 RealMAN 场景参与训练；规划会议室实采（6 麦线阵、贴墙安装）"],
                 ["完善闭环", "网络支持 1 s 微调；接入远端回声消除参考信号；准备实时 demo"]];
  items.forEach((it, i) => {
    const y = 1.7 + i * 1.6;
    s.addShape(p.shapes.OVAL, { x: 0.8, y, w: 0.75, h: 0.75, fill: { color: K.ours }, line: { type: "none" } });
    T(s, String(i + 1), { x: 0.8, y, w: 0.75, h: 0.75, fontSize: 20, bold: true, color: K.white, align: "center", valign: "middle" });
    T(s, it[0], { x: 1.9, y: y - 0.05, w: 10.5, h: 0.5, fontSize: 20, bold: true, color: K.white });
    T(s, it[1], { x: 1.9, y: y + 0.5, w: 10.5, h: 0.8, fontSize: 15, color: "C9D3DB" });
  });
}

require("./zh_notes")(p, OUT).then(() => console.log("已生成：" + OUT));
