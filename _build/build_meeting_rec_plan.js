// 会议室实录采集方案（自有阵列）：为什么采、采什么、采多少、怎么标注、需要确认什么。
// 样式与场景一阶段汇报相同。数量依据 RealMAN 上的实录数据量实验（_build/scene1_report2_data.json 的 amount；没有时显示【待确认】）。
// 运行：python _build/scene1_report2_data.py && node _build/build_meeting_rec_plan.js
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, "..", "01_场景一_摄像头声源定位", "训练数据"), "会议室实录采集方案.pptx");
const D = JSON.parse(fs.readFileSync(path.join(__dirname, "scene1_report2_data.json"), "utf-8"));
const F = "Microsoft YaHei";
const C = { ink: "1F1F1F", gray: "595959", light: "8C8C8C", rule: "D9D9D9", navy: "134074", navyLt: "8DA9C4", base1: "C9CED6", base2: "8C96A3" };
const BG = "F7F8FA";
const TBD = "【待确认】";

let pageNo = 1;
const p = new pptxgen();
p.layout = "LAYOUT_WIDE";
p.title = "会议室实录采集方案";
const T = (s, text, o) => s.addText(text, Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 13, color: C.ink, margin: 0, valign: "top", isTextBox: true }, o));
const cell = (t, o) => ({ text: t, options: Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 11, color: C.ink, valign: "middle" }, o) });
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
const oneLine = (s, text) => T(s, text, { x: 0.6, y: 1.2, w: 12.1, h: 0.45, fontSize: 14, bold: true, valign: "middle" });
const note = (s, text, x, y, w, h) => T(s, text, { x, y, w, h, fontSize: 11.5, color: C.gray });
const chartBase = (o) => Object.assign({
  catAxisLabelFontFace: F, valAxisLabelFontFace: F, dataLabelFontFace: F, legendFontFace: F, titleFontFace: F, catAxisTitleFontFace: F, valAxisTitleFontFace: F,
  catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, dataLabelFontSize: 10.5, catAxisTitleFontSize: 10.5, valAxisTitleFontSize: 10.5,
  catAxisLabelColor: "404040", valAxisLabelColor: "595959", dataLabelColor: "404040", catAxisTitleColor: "404040", valAxisTitleColor: "404040",
  valGridLine: { color: "E8E8E8", size: 0.5 }, catGridLine: { style: "none" }, catAxisLineColor: "BFBFBF", valAxisLineShow: false,
  valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 20, valAxisLabelFormatCode: "0",
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0", barGapWidthPct: 70, barDir: "col",
  showValAxisTitle: true, valAxisTitle: "方向误差 ≤10° 的比例（%）", showLegend: false,
}, o);
const f0 = (v) => String(Math.round(v));
const f1 = (v) => (Math.floor(v * 10 + 0.5 + 1e-9) / 10).toFixed(1);

// 数据量实验：按分钟数排列（多个起点模型时取平均）
const AM = D.amount, RM = D.realman, SC = D.scale, AU = D.aug;
let curve = null, enough = null, rooms = null, staticOk = null, staticRows = [];
if (AM) {
  const mins = (r) => r.scenes ? Object.values(r.scenes).reduce((a, v) => a + v.minutes, 0) : null;
  const by = {};
  AM.rows.forEach((r) => { (by[r.name] = by[r.name] || []).push(r); });
  const rows = Object.values(by).map((rs) => Object.assign({}, rs[0], { acc: 100 * rs.reduce((a, r) => a + r.acc10, 0) / rs.length }));
  const refAvg = (k) => { const bs = AM.bases || [null]; const v = bs.map((b) => ((b && AM.ref[b] ? AM.ref[b][k] : AM.ref[k]) || {}).acc10); return 100 * v.reduce((a, x) => a + x, 0) / v.length; };
  curve = [{ m: 0, acc: refAvg("base") }, ...rows.filter((r) => r.group === "A").map((r) => ({ m: mins(r), acc: r.acc })).sort((a, b) => a.m - b.m), { m: 143, acc: refAvg("f1") }];
  const full = curve[curve.length - 1].acc;
  enough = curve.find((c) => c.m > 0 && c.acc >= full - 2);                  // 事先定好的"够用"：与全量相差 ≤2 个百分点
  const single = rows.filter((r) => r.group === "B" && r.scenes && Object.keys(r.scenes).length === 1);
  const multi = rows.find((r) => r.name === "f033");
  staticRows = rows.filter((r) => r.group === "D").map((r) => ({ m: mins(r), acc: r.acc }));
  if (staticRows.length) staticOk = staticRows.every((r) => r.acc >= full - 2);   // 事先定好：只用静止说话与全量相差 ≤2
  if (single.length && multi) rooms = { single: single.reduce((a, r) => a + r.acc, 0) / single.length, multi: multi.acc,
                                        singleMin: single.reduce((a, r) => a + mins(r), 0) / single.length, multiMin: mins(multi) };
}
const perRoom = enough ? enough.m / 3 : null;

// 1 封面
{
  const s = p.addSlide(); s.background = { color: BG };
  s.addShape(p.shapes.LINE, { x: 0.9, y: 4.0, w: 11.5, h: 0, line: { color: C.navy, width: 1 } });
  T(s, "会议室实录采集方案", { x: 0.9, y: 2.5, w: 11, h: 0.8, fontSize: 32, bold: true, valign: "middle" });
  T(s, "场景一：会议室摄像头声源定位 · 自有阵列", { x: 0.9, y: 3.35, w: 11, h: 0.5, fontSize: 18, color: C.gray, valign: "middle" });
  s.addNotes("用自有阵列在会议室采集真实录音，用于小网络的实录微调与测试。依据：公开数据集 RealMAN 上，真实录音微调是目前唯一明显有效的改进；RealMAN 的阵列与产品阵列不同，产品模型需要自有阵列的数据。");
}

// 2 为什么采
{
  const s = newSlide("为什么要采自有阵列的录音",
    "RealMAN（CC BY 4.0）测试集 5 个室内场景、600 个样本，6 麦线阵 3 cm 间距；起点为只用仿真训练的 0.28 M 小网络；各组微调步数相同",
    "仿真侧尝试：训练数据 12,000 → 60,000 条、网络 0.28 M → 2.13 M，真实录音都在 79–82%；仿真加扩散噪声 +"
    + `${f1(AU.dif - AU.base)} 个百分点（4 个种子平均，在统计误差内）。真实录音：RealMAN 另外 3 个房间（办公室 1 个、客厅 2 个）的录音，录音分钟数为所用话语的总时长。`
    + (curve ? "" : "录音多少的对比实验进行中。"));
  if (curve) {
    s.addChart(p.charts.BAR, [{ name: "≤10°", labels: curve.map((c) => c.m === 0 ? "只用仿真" : `${f0(c.m)} 分钟`), values: curve.map((c) => Math.floor(c.acc * 10 + 0.5) / 10) }],
      chartBase({ x: 0.6, y: 1.8, w: 7.4, h: 4.85, chartColors: [C.base1, ...curve.slice(1, -1).map(() => C.navyLt), C.navy],
                  showCatAxisTitle: true, catAxisTitle: "微调所用真实录音（3 个房间合计）" }));
  } else {
    s.addChart(p.charts.BAR, [{ name: "≤10°", labels: ["只用仿真", "+ 3 个房间实录微调"], values: [RM.base, RM.ft] }],
      chartBase({ x: 0.6, y: 1.8, w: 7.4, h: 4.85, chartColors: [C.base1, C.navy] }));
  }
  table(s, [
    [head("改进方式"), head("真实录音 ≤10°", { align: "center" })],
    [bold("仿真数据 ×5、网络 ×8"), ctr(`${f0(Math.min(...SC.map((r) => r.real)))}–${f0(Math.max(...SC.map((r) => r.real)))}%，不变`)],
    [bold("仿真加扩散噪声"), ctr(`+${f1(AU.dif - AU.base)}（统计误差内）`)],
    [bold("真实录音微调", { color: C.navy }), ctr(`${f1(RM.base)}% → ${f1(RM.ft)}%`, { bold: true, color: C.navy })],
  ], 8.4, 1.95, [2.6, 1.7], [0.42, 0.45, 0.45, 0.45]);
  note(s, enough ? `约 ${f0(enough.m)} 分钟（每个房间约 ${f0(perRoom)} 分钟）的录音已接近全量效果（相差 ≤2 个百分点）。` : `录音多少、分几个房间的对比${TBD}。`,
    8.4, 3.95, 4.3, 0.9);
  note(s, "RealMAN 的阵列与产品阵列不同：产品模型需要用自有阵列的录音微调和测试。", 8.4, 4.85, 4.3, 0.9);
  oneLine(s, "已试过的改进里，只有真实录音微调明显提高真实场景效果；产品阵列的录音需要自己采。");
}

// 3 采集内容
{
  const s = newSlide("采集内容（每个会议室）", "规模为建议值；换人、抢话样本由单人录音相加合成（与 RealMAN 实验做法相同），不需要逐一组合录制",
    "音箱播放：RealMAN 的语音即由音箱播放、人手持音箱走动录制，方位由鱼眼摄像头检测音箱得到（官方说明 https://github.com/Audio-WestlakeU/RealMAN ）；音箱便于覆盖多个位置、可重复。真人说话的头部指向与动作不同，用真人录音复核。\n合成方法：同一房间、不同位置的两段单人录音相加，空出的时段用同一房间的真实背景噪声填补，得到换人、抢话、安静后开口三类样本。RealMAN 上用这种方法做微调数据，真实录音提高约 6 个百分点。\n"
    + "真实会议段只用于测试（连续转向的误转、漏转），不参与训练。");
  table(s, [
    [head("内容"), head("做法"), head("规模（建议）"), head("用途")],
    [bold("单人说话（静止）"), cell("每个座位与站位（白板、门口）用音箱播放语音，坐高、站高各一次；另请 2–3 人在部分位置读稿"), cell("8–12 个位置 × 约 2 分钟；真人约 10 分钟"), cell("训练：合成换人、抢话样本；真人部分用于测试")],
    [bold("走动说话"), cell("边说边走：座位到白板、绕桌"), cell("3–5 条 × 约 1 分钟"), cell(staticOk ? "测试：跟踪（训练可不用）" : "训练与测试：跟踪")],
    [bold("远端喇叭"), cell("电视或会议音箱播放远端参会人语音"), cell("2 个位置 × 3 分钟"), cell("远端播放时不转")],
    [bold("无人说话"), cell("空调、投影仪、键盘、挪椅子、开关门"), cell("约 10 分钟"), cell("背景噪声；减少噪声段误转")],
    [bold("真实会议"), cell("2–4 人自然讨论"), cell("约 15 分钟"), cell("只用于测试")],
  ], 0.6, 1.85, [1.9, 5.2, 2.9, 2.1], [0.42, 0.62, 0.5, 0.5, 0.5, 0.5]);
  const roomTxt = rooms
    ? `房间数：录音时长相近时，3 个房间（${f1(rooms.multi)}%）比 1 个房间（${f1(rooms.single)}%）${rooms.multi - rooms.single >= 3 ? "明显更好，优先多房间" : "相差在 3 个百分点内，按方便安排"}。`
    : `房间数：多房间与单房间的对比${TBD}。`;
  note(s, ["分两步：先在 1 个会议室采集（约半天），用它微调、在另一个会议室测试；效果达到预期再扩展到更多、更大小不一的会议室。", roomTxt,
           enough ? `录音量：RealMAN 上每个房间约 ${f0(perRoom)} 分钟已接近全量；产品阵列不同，上表单人说话每个房间约 26–34 分钟，留有余量。` : `录音量：按 RealMAN 上的数据量实验估算${TBD}。`]
           .concat(staticRows.length ? [`只用静止说话微调：${staticRows.map((r) => `约 ${f0(r.m)} 分钟 ${f1(r.acc)}%`).join("、")}，${staticOk ? "与全量相当，训练以坐着说话为主即可" : "低于全量 2 个百分点以上，走动说话也需要按比例录"}。`] : []).join("\n"),
    0.6, 5.0, 12.1, 1.7);
  oneLine(s, "以单人说话为主，换人、抢话离线合成；另录无人说话、远端喇叭和一段真实会议用于测试。");
}

// 4 标注与需要确认
{
  const s = newSlide("标注与需要确认", null,
    "标注只需要每个位置相对阵列的方位、距离、高度，以及每段录音对应的位置与说话人编号；不记录可识别个人身份的信息。走动段的方位真值需要同步的视频或在地面标出路线后按时间插值。");
  table(s, [
    [head("标注项"), head("做法")],
    [bold("阵列"), cell("安装位置、高度、朝向（拍照 + 卷尺）；麦克风顺序与间距")],
    [bold("说话位置"), cell("地面贴标记，用卷尺或激光测距记录相对阵列的方位、距离、高度")],
    [bold("每段录音"), cell("位置编号、说话人编号（匿名）、坐 / 站、起止时间")],
    [bold("走动"), cell("路线标在地面；同步录像或按时间插值得到方位")],
    [bold("房间"), cell("尺寸、照片；可选测混响时间")],
  ], 0.6, 1.85, [1.9, 4.6], [0.42, 0.5, 0.5, 0.5, 0.5, 0.5]);
  table(s, [
    [head("需要确认"), head("说明")],
    [bold("阵列样机"), cell(`麦克风数、间距、采样率、多通道同步输出${TBD}`)],
    [bold("会议室"), cell(`可用的会议室与时间段${TBD}`)],
    [bold("参与人员"), cell(`人数与知情同意流程${TBD}`)],
    [bold("数据存放"), cell(`存储位置与使用范围${TBD}`)],
  ], 7.4, 1.85, [1.6, 3.7], [0.42, 0.55, 0.55, 0.55, 0.55]);
  oneLine(s, "标注只需位置与说话人编号；需要先确认阵列样机、会议室和参与人员。");
}

require("./zh_notes")(p, OUT).then(() => console.log("已生成：" + OUT));
