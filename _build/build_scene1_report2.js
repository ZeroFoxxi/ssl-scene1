// 场景一第二次阶段汇报（上次汇报 2026-11-18 之后）：置信度、真实录音回放、训练规模、实录误差、实录数据、端侧规格。
// 样式与第一次阶段汇报相同（build_scene1_report.js）：标题短、标题下一句加粗要点；图表 + 精简表格；浅灰底、深蓝主色；来源与说明放页脚和备注。
// 数字全部来自 _build/scene1_report2_data.json（scene1_report2_data.py 从 code/ssl_baseline/out/ 读取）；还没有的结果显示【待确认】。
// 运行：python _build/scene1_report2_data.py && node _build/build_scene1_report2.js
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, "..", "01_场景一_摄像头声源定位", "方案选型"), "场景一阶段汇报2_真实录音与训练数据.pptx");
const D = JSON.parse(fs.readFileSync(path.join(__dirname, "scene1_report2_data.json"), "utf-8"));
const DATE = process.env.REPORT_DATE || "2026 年 12 月";
const F = "Microsoft YaHei";
const C = { ink: "1F1F1F", gray: "595959", light: "8C8C8C", rule: "D9D9D9", box: "A6A6A6", navy: "134074", navyLt: "8DA9C4", base1: "C9CED6", base2: "8C96A3" };
const BG = "F7F8FA";
const TBD = "【待确认】";

let pageNo = 1;
const p = new pptxgen();
p.layout = "LAYOUT_WIDE";
p.title = "场景一阶段汇报：真实录音验证与训练数据";

const T = (s, text, o) => s.addText(text, Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 13, color: C.ink, margin: 0, valign: "top", isTextBox: true }, o));
const cell = (t, o) => ({ text: t, options: Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 11, color: C.ink, valign: "middle" }, o) });
const head = (t, o) => cell(t, Object.assign({ bold: true }, o));
const bold = (t, o) => cell(t, Object.assign({ bold: true }, o));
const ctr = (t, o) => cell(t, Object.assign({ align: "center" }, o));
const hi = (t, o) => ctr(t, Object.assign({ bold: true, color: C.navy }, o));
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
const para = (s, items, x, y, w, h, o) => s.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } })),
  Object.assign({ x, y, w, h, fontFace: F, lang: "zh-CN", fontSize: 13, color: C.ink, valign: "top", margin: 0.03, paraSpaceAfter: 10, isTextBox: true }, o || {}));
const note = (s, text, x, y, w, h) => T(s, text, { x, y, w, h, fontSize: 11.5, color: C.gray });
const chartBase = (o) => Object.assign({
  catAxisLabelFontFace: F, valAxisLabelFontFace: F, dataLabelFontFace: F, legendFontFace: F, titleFontFace: F,
  catAxisTitleFontFace: F, valAxisTitleFontFace: F,
  catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, dataLabelFontSize: 10.5, legendFontSize: 10.5, catAxisTitleFontSize: 10.5, valAxisTitleFontSize: 10.5,
  catAxisLabelColor: "404040", valAxisLabelColor: "595959", dataLabelColor: "404040", catAxisTitleColor: "404040", valAxisTitleColor: "404040",
  valGridLine: { color: "E8E8E8", size: 0.5 }, catGridLine: { style: "none" }, catAxisLineColor: "BFBFBF", valAxisLineShow: false,
  valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 20, valAxisLabelFormatCode: "0",
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0", barGapWidthPct: 60, barDir: "col",
  showValAxisTitle: true, valAxisTitle: "方向误差 ≤10° 的比例（%）",
}, o);
const f1 = (v) => v.toFixed(1);
const f0 = (v) => String(Math.round(v));

const RP = D.replay, CL = D.cl, SC = D.scale, AU = D.aug, DG = D.diag, RM = D.realman, Q = D.compute, AM = D.amount;
const REAL_SRC = "RealMAN 测试集 5 个室内场景，6 麦线阵 3 cm 间距";
const REAL_NOTE = "RealMAN（CC BY 4.0）：https://huggingface.co/datasets/AISHELL/RealMAN 。测试集 5 个室内场景，与微调、挑选模型用的场景不重叠。语音由音箱播放（走动时由人手持音箱），方位由鱼眼摄像头检测音箱得到（https://github.com/Audio-WestlakeU/RealMAN ）。";
const minSeed = Math.min(...SC.flatMap((r) => r.real_seeds)), maxSeed = Math.max(...SC.flatMap((r) => r.real_seeds));
const realLo = Math.min(...SC.map((r) => r.real)), realHi = Math.max(...SC.map((r) => r.real));

// 数据量实验（若已有结果）
let amtRows = null, amtLine = null;
if (AM) {
  const mins = (r) => r.scenes ? Object.values(r.scenes).reduce((a, v) => a + v.minutes, 0) : null;
  const byName = {};                                                       // 多个起点模型时按组取平均
  AM.rows.forEach((r) => { (byName[r.name] = byName[r.name] || []).push(r); });
  const rows = Object.values(byName).map((rs) => Object.assign({}, rs[0], { acc10: rs.reduce((a, r) => a + r.acc10, 0) / rs.length, nBase: rs.length }));
  const refAvg = (k) => { const bs = AM.bases || [null]; const v = bs.map((b) => ((b && AM.ref[b] ? AM.ref[b][k] : AM.ref[k]) || {}).acc10); return v.reduce((a, x) => a + x, 0) / v.length; };
  const A = rows.filter((r) => r.group === "A").map((r) => ({ m: mins(r), acc: 100 * r.acc10 })).sort((a, b) => a.m - b.m);
  amtRows = [{ m: 0, acc: 100 * refAvg("base") }, ...A, { m: 143, acc: 100 * refAvg("f1") }];
  const B = rows.filter((r) => r.group === "B");
  const single = B.filter((r) => r.scenes && Object.keys(r.scenes).length === 1);
  const multi = B.find((r) => r.name === "f033");
  amtLine = { single: single.length ? 100 * single.reduce((a, r) => a + r.acc10, 0) / single.length : null, multi: multi ? 100 * multi.acc10 : null,
              singleN: single.length, singleMin: single.length ? single.reduce((a, r) => a + mins(r), 0) / single.length : null, multiMin: multi ? mins(multi) : null };
  const full = amtRows[amtRows.length - 1].acc;
  amtLine.enough = amtRows.find((r) => r.m > 0 && r.acc >= full - 2);          // 事先定好的"够用"：与全量相差 ≤2 个百分点
  amtLine.full = full;
  const C_ = Object.fromEntries(rows.filter((r) => r.group === "C").map((r) => [r.name, 100 * r.acc10]));
  const f025 = rows.find((r) => r.name === "f025");
  amtLine.noise = [C_.f1_seed1 != null ? Math.abs(C_.f1_seed1 - full) : null, C_.f025_sub1 != null && f025 ? Math.abs(C_.f025_sub1 - 100 * f025.acc10) : null].filter((v) => v != null);
  amtLine.ftAll = rows.filter((r) => r.group !== "D").map((r) => 100 * r.acc10).concat([full]);
  amtLine.D = rows.filter((r) => r.group === "D").map((r) => ({ name: r.name, m: mins(r), acc: 100 * r.acc10 })).sort((a, b) => a.m - b.m);
}

// 1 封面
{
  const s = p.addSlide(); s.background = { color: BG };
  s.addShape(p.shapes.LINE, { x: 0.9, y: 4.0, w: 11.5, h: 0, line: { color: C.navy, width: 1 } });
  T(s, "场景一：会议室摄像头声源定位", { x: 0.9, y: 2.5, w: 11, h: 0.8, fontSize: 32, bold: true, valign: "middle" });
  T(s, "阶段进展：置信度、真实录音验证与训练数据", { x: 0.9, y: 3.35, w: 11, h: 0.5, fontSize: 18, color: C.gray, valign: "middle" });
  T(s, DATE, { x: 0.9, y: 4.15, w: 4, h: 0.4, fontSize: 13, color: C.light, valign: "middle" });
  s.addNotes("接上次阶段汇报（11 月 18 日）。本次内容：小网络的置信度与转向、真实录音拼成的连续会议、GPU 服务器上放大网络与训练数据、真实录音的误差来源、实录数据微调、端侧计算量与 8 比特量化。真实录音为公开数据集 RealMAN，未在自有硬件上测试。");
}

// 2 阶段结论
{
  const s = newSlide("阶段结论", "各项数字见后续页；真实录音为公开数据集 RealMAN，未在自有硬件上测试", "本页汇总；每项的数据与条件见后续页。");
  const amt = amtLine && amtLine.enough ? `；约 ${f0(amtLine.enough.m)} 分钟录音已达到全量效果，1 个房间与 3 个房间相同` : "";
  table(s, [
    [head("项目"), head("结论")],
    [bold("置信度"), cell(`小网络同时输出方向和置信度；连续会议仿真中加置信度门限，每分钟误转 ${CL.none.wrong} → ${CL.th7.wrong} 次，转向速度不变（第 3 页）`)],
    [bold("实录会议"), cell(`RealMAN 实录拼成 ${D.replay_n.meetings} 段连续会议：小网络每分钟误转 ${f1(RP["+实录微调+门限"].wrong)} 次，GEVD-MUSIC ${f1(RP["GEVD-MUSIC"].wrong)} 次（第 4 页）`)],
    [bold("训练规模"), cell(`GPU 服务器上放大网络（2.13 M 参数）和训练数据（5 倍）：仿真最高 ${f0(SC[3].sim)}%，真实录音都在 ${f0(realLo)}–${f0(realHi)}%（第 5 页）`)],
    [bold("主要问题"), cell("仿真与真实录音的差距；0.28 M 参数的网络已够用，不需要放大后再压缩")],
    [bold("实录误差"), cell(`误差集中在两侧方向，越远越偏向正前方；仿真加扩散噪声提高 ${f1(AU.dif - AU.base)} 个百分点，在统计误差内（第 6 页）`)],
    [bold("实录数据"), cell(`用另外 3 个房间的实录微调：${f1(RM.base)}% → ${f1(RM.ft)}%${amt}（第 7 页）`)],
    [bold("端侧"), cell(`${(Q.params / 1e6).toFixed(2)} M 参数，每次判决 ${(Q.macs / 1e8).toFixed(1)} 亿次乘加；8 比特量化后准确率不变（第 8 页）`)],
    [bold("需要确认"), cell("自有阵列与会议室实录采集；误转与漏转的取舍；目标芯片与算力；是否需要唤醒词触发（第 9 页）")],
  ], 0.6, 1.85, [1.9, 10.2], [0.42, 0.52, 0.52, 0.52, 0.52, 0.52, 0.52, 0.52, 0.52]);
  oneLine(s, "网络规模已够用，提高真实场景效果的关键是自有阵列的真实录音。");
}

// 3 置信度与转向
{
  const s = newSlide("置信度与转向（仿真）",
    "左：会议室仿真固定测试集 800 个样本，按置信度从低到高分 5 组、每组 160 个；右：连续会议仿真 60 段 × 60 s，6 麦线阵 17.5 cm",
    `置信度：网络输出中，概率最大的方向左右各 6° 内的概率之和。门限只在两批验证会议上选（候选 0.5–0.8），在报告会议上评测一次。固定测试集上门限 0.7 保留 ${D.conf_th7.keep}% 的判决，去掉 ${D.conf_th7.wrong_all - D.conf_th7.wrong_kept}/${D.conf_th7.wrong_all} 个错误。置信度低于门限时摄像头不转，保持上一个方向。`);
  s.addChart(p.charts.BAR, [{ name: "≤10°", labels: D.conf_bins.map((b) => `${b.lo.toFixed(2)}–${b.hi.toFixed(2)}`), values: D.conf_bins.map((b) => b.acc) }],
    chartBase({ x: 0.6, y: 1.8, w: 6.4, h: 4.85, showLegend: false, chartColors: [C.navy], barGapWidthPct: 70, dataLabelFormatCode: "0.0",
                showCatAxisTitle: true, catAxisTitle: "置信度（每组 160 个样本）" }));
  table(s, [
    [head("连续会议指标"), head("不加门限", { align: "center" }), head("门限 0.7", { align: "center" })],
    [bold("换人后对准用时（中位数）"), ctr(`${CL.none.latency.toFixed(2)} s`), hi(`${CL.th7.latency.toFixed(2)} s`)],
    [bold("2 s 内对准的比例"), ctr(`${f1(CL.none.aim2s)}%`), hi(`${f1(CL.th7.aim2s)}%`)],
    [bold("每分钟误转次数"), ctr(CL.none.wrong.toFixed(2)), hi(CL.th7.wrong.toFixed(2))],
    [bold("发言时间中画面对准的比例"), ctr(`${f1(CL.none.framed)}%`), hi(`${f1(CL.th7.framed)}%`)],
  ], 7.4, 2.05, [2.9, 1.2, 1.2], [0.42, 0.48, 0.48, 0.48, 0.48]);
  note(s, "置信度可直接作为输出给云台和波束成形的可信度：低于门限时不转。", 7.4, 4.65, 5.3, 0.7);
  oneLine(s, `置信度越高越准；加门限后误转降到约三分之一（${CL.none.wrong} → ${CL.th7.wrong} 次 / 分钟），转向速度不变。`);
}

// 4 真实录音会议
{
  const order = ["SRP-PHAT", "GEVD-MUSIC", "小网络", "+实录微调", "+实录微调+门限"];
  const lab = { "SRP-PHAT": "SRP-PHAT", "GEVD-MUSIC": "GEVD-MUSIC", "小网络": "小网络", "+实录微调": "小网络\n+实录微调", "+实录微调+门限": "小网络\n+实录微调+门限" };
  const s = newSlide("真实录音会议",
    `${REAL_SRC}的真实录音拼成 ${D.replay_n.meetings} 段 60 s 会议（${D.replay_n.switch} 次换人，含走动的说话人）；转向逻辑与仿真相同`,
    REAL_NOTE + "\n拼接方法：同一场景的真实录音按会议轮次排列，轮次之间与说话前后用该场景的真实背景噪声填补；走动的说话人方向随时间变化（约 4°/s）。门限 0.7 沿用仿真验证会议上选定的值，没有在真实录音上调。误转：转向目标偏离当时发言人 >15°。\n"
    + `噪声段误转的两种修正（同一批会议）：训练加入纯噪声样本，误转 ${f1(RP["+纯噪声训练+门限"].wrong)} 次 / 分钟、2 s 内对准 ${f0(RP["+纯噪声训练+门限"].aim2s)}%；加有人说话判断，误转 ${f1(RP["+有人判断+门限"].wrong)}、2 s 内对准 ${f0(RP["+有人判断+门限"].aim2s)}%。`);
  s.addChart(p.charts.BAR, [{ name: "每分钟误转", labels: order.map((k) => lab[k]), values: order.map((k) => RP[k].wrong) }],
    chartBase({ x: 0.6, y: 1.8, w: 7.0, h: 4.85, showLegend: false, chartColors: [C.base1, C.base2, C.navyLt, C.navyLt, C.navy], barGapWidthPct: 70,
                valAxisMaxVal: 8, valAxisMajorUnit: 2, valAxisTitle: "每分钟误转次数", dataLabelFormatCode: "0.0", catAxisLabelFontSize: 10 }));
  table(s, [
    [head("方法"), head("2 s 内对准", { align: "center" }), head("静止时对准", { align: "center" })],
    ...order.map((k) => [bold(lab[k].replace("\n", ""), k === "+实录微调+门限" ? { color: C.navy } : {}),
      (k === "+实录微调+门限" ? hi : ctr)(`${f0(RP[k].aim2s)}%`), (k === "+实录微调+门限" ? hi : ctr)(`${f0(RP[k].static)}%`)]),
  ], 7.9, 1.95, [2.6, 1.1, 1.1], [0.42, 0.4, 0.4, 0.4, 0.4, 0.4]);
  note(s, `剩余误转多出现在无人说话的噪声段。训练加入纯噪声样本或加有人说话判断，误转可降到 ${f1(RP["+纯噪声训练+门限"].wrong)}–${f1(RP["+有人判断+门限"].wrong)} 次 / 分钟，但 2 s 内对准降到 ${f0(RP["+纯噪声训练+门限"].aim2s)}–${f0(RP["+有人判断+门限"].aim2s)}%，即漏转变多；取舍${TBD}。`,
    7.9, 4.6, 4.8, 1.6);
  oneLine(s, `真实录音会议中，小网络误转 ${f1(RP["+实录微调+门限"].wrong)} 次 / 分钟，约为 GEVD-MUSIC 的三分之一；剩余误转多在无人说话的噪声段。`);
}

// 5 训练规模与真实录音
{
  const s = newSlide("训练规模与真实录音",
    "RealMAN 阵列（6 麦 3 cm）通用房间仿真训练；仿真：验证集 1,000 个样本；真实录音：RealMAN 测试集 600 个样本；每组两个种子平均",
    REAL_NOTE + `\n各组两个种子的真实录音结果：${SC.map((r) => `${r.label.replace(" · ", " 条、")} 参数 ${r.real_seeds.join(" / ")}%`).join("；")}。同一配置换种子，真实录音相差最多约 8 个百分点，仿真只差 0.1–0.8。\n`
    + `对照实验：12,000 条数据训练 150 轮（训练步数与 60,000 条 × 30 轮相同），仿真验证 ${D.ep150.join(" / ")}%，与 30 轮相当，说明仿真上的提升来自数据量。\n`
    + `会议室阵列（6 麦线阵 17.5 cm）用 60,000 条数据：仿真固定测试集 94% → ${D.meeting60k[0]}%（两个种子相同）。`);
  s.addChart(p.charts.BAR, [{ name: "仿真验证", labels: SC.map((r) => r.label.replace(" · ", " 条\n")), values: SC.map((r) => r.sim) },
                            { name: "真实录音", labels: SC.map((r) => r.label.replace(" · ", " 条\n")), values: SC.map((r) => r.real) }],
    chartBase({ x: 0.6, y: 1.8, w: 7.6, h: 4.85, chartColors: [C.base1, C.navy], showLegend: true, legendPos: "t",
                showCatAxisTitle: true, catAxisTitle: "训练数据量 · 网络参数量" }));
  para(s, [`训练数据 12,000 → 60,000 条：仿真 ${f0(SC[0].sim)}% → ${f0(SC[2].sim)}%；对照实验确认提升来自数据量`,
           `放大网络 0.28 M → 2.13 M：数据够多时仿真上相同`,
           `真实录音：四组都在 ${f0(realLo)}–${f0(realHi)}%；同一配置换种子相差最多约 8 个百分点`,
           "竞品量级的 0.28 M 网络已够用，不做放大后蒸馏"], 8.6, 2.2, 4.1, 4.2);
  oneLine(s, "仿真成绩随数据量提高，真实录音不变：主要问题是仿真与真实的差距。");
}

// 6 实录误差来源
{
  const bins = Object.keys(DG["小网络"].by_az);
  const s = newSlide("真实录音的误差来源",
    "RealMAN 测试集 600 个样本；右上：两侧（60–80°）样本按说话人距离分组，偏差为预测方位比真值靠近正前方的角度（中位数）",
    REAL_NOTE + `\n各方位区间样本数：${bins.map((b) => `${b} ${D.diag_n_az[b]} 个`).join("、")}。两侧样本按距离：<2 m ${D.diag_n["<2 m"]} 个、2–3 m ${D.diag_n["2–3 m"]} 个、≥3 m ${D.diag_n["≥3 m"]} 个（≥3 m 样本少，仅作参考）。\n`
    + `扩散噪声：仿真时以 70% 的概率加入空间上符合扩散声场相关性的噪声（信噪比 0–20 dB）；麦克风位置误差：每个麦克风随机偏移约 2 mm。每组 4 个种子，真实录音结果：基线 ${AU.seeds.base.join(" / ")}%；+扩散噪声 ${AU.seeds.dif.join(" / ")}%；+位置误差 ${AU.seeds.difjit.join(" / ")}%。两组差的 95% 置信区间约 ±4.4 个百分点。`);
  s.addChart(p.charts.BAR, [{ name: "GEVD-MUSIC", labels: bins, values: bins.map((b) => DG["GEVD-MUSIC"].by_az[b]) },
                            { name: "小网络", labels: bins, values: bins.map((b) => DG["小网络"].by_az[b]) },
                            { name: "小网络 + 实录微调", labels: bins, values: bins.map((b) => DG["+实录微调"].by_az[b]) }],
    chartBase({ x: 0.6, y: 1.8, w: 6.9, h: 4.85, chartColors: [C.base1, C.navyLt, C.navy], showLegend: true, legendPos: "t",
                showCatAxisTitle: true, catAxisTitle: "说话人方位（与正前方的夹角）" }));
  table(s, [
    [head("两侧说话人距离"), ...["<2 m", "2–3 m", "≥3 m"].map((k) => head(`${k}\n${D.diag_n[k]} 个`, { align: "center" }))],
    [bold("小网络偏向正前方"), ...["<2 m", "2–3 m", "≥3 m"].map((k) => ctr(`${f1(DG["小网络"].bias_by_dist[k])}°`))],
    [bold("GEVD-MUSIC 偏向正前方"), ...["<2 m", "2–3 m", "≥3 m"].map((k) => ctr(`${f1(DG["GEVD-MUSIC"].bias_by_dist[k])}°`))],
  ], 7.8, 1.95, [2.3, 0.9, 0.9, 0.9], [0.55, 0.42, 0.42]);
  table(s, [
    [head("仿真加入真实因素（4 个种子平均）"), head("真实录音", { align: "center" })],
    [bold("基线"), ctr(`${f1(AU.base)}%`)],
    [bold("+ 扩散噪声"), ctr(`${f1(AU.dif)}%`)],
    [bold("+ 扩散噪声 + 麦克风位置误差"), ctr(`${f1(AU.difjit)}%`)],
  ], 7.8, 3.6, [3.6, 1.4], [0.42, 0.4, 0.4, 0.4]);
  note(s, "推测：距离越远，房间的扩散声占比越大，把方向拉向正前方。仿真加入扩散噪声后的提高在统计误差内。", 7.8, 5.4, 5.0, 0.9);
  oneLine(s, `误差集中在两侧，且越远越偏向正前方；仿真加扩散噪声只提高 ${f1(AU.dif - AU.base)} 个百分点（在统计误差内）。`);
}

// 7 实录数据
{
  const s = newSlide("实录数据微调",
    "RealMAN 测试集 600 个样本；微调用 RealMAN 另外 3 个房间（办公室 1 个、客厅 2 个），第 4 个房间挑选模型",
    REAL_NOTE + "\n微调：从只用仿真训练的模型出发，每批一半真实录音、一半仿真数据，学习率较小；各组训练步数相同，只改真实录音的多少。录音分钟数为所用话语的总时长。"
    + (AM ? `\n房间数对比（录音时长相近）：1 个房间（3 个房间各做一次，平均约 ${f0(amtLine.singleMin)} 分钟）${amtLine.single != null ? f1(amtLine.single) + "%" : TBD}；3 个房间各三分之一（约 ${f0(amtLine.multiMin)} 分钟）${amtLine.multi != null ? f1(amtLine.multi) + "%" : TBD}。` : ""));
  if (amtRows) {
    s.addChart(p.charts.BAR, [{ name: "真实录音 ≤10°", labels: amtRows.map((r) => r.m === 0 ? "不微调" : `${f0(r.m)} 分钟`), values: amtRows.map((r) => R1(r.acc)) }],
      chartBase({ x: 0.6, y: 1.8, w: 7.4, h: 4.85, showLegend: false, chartColors: [C.base1, ...amtRows.slice(1, -1).map(() => C.navyLt), C.navy], barGapWidthPct: 70,
                  dataLabelFormatCode: "0.0", showCatAxisTitle: true, catAxisTitle: "微调所用真实录音（3 个房间合计）" }));
  } else {
    s.addChart(p.charts.BAR, [{ name: "真实录音 ≤10°", labels: ["GEVD-MUSIC", "小网络（仿真训练）", "小网络 + 实录微调"], values: [RM.gevd, RM.base, RM.ft] }],
      chartBase({ x: 0.6, y: 1.8, w: 7.4, h: 4.85, showLegend: false, chartColors: [C.base1, C.navyLt, C.navy], barGapWidthPct: 80, dataLabelFormatCode: "0.0" }));
  }
  if (AM) {
    const L = amtLine;
    table(s, [
      [head("微调用的真实录音"), head("≤10°", { align: "center" })],
      [bold("1 个房间（3 个房间各做一次取平均）"), ctr(`${f1(L.single)}%`)],
      [bold(`3 个房间各三分之一（约 ${f0(L.multiMin)} 分钟）`), ctr(`${f1(L.multi)}%`)],
      ...L.D.map((d) => [bold(`只用静止说话（约 ${f0(d.m)} 分钟）`), ctr(`${f1(d.acc)}%`)]),
      [bold("多种子验证（4 个起点模型）"), ctr(D.server_ft ? D.server_ft : TBD)],
    ], 8.4, 1.95, [3.1, 1.2], [0.42, 0.42, 0.42, ...L.D.map(() => 0.42), 0.42]);
    note(s, `微调后各组都在 ${f1(Math.min(...L.ftAll))}–${f1(Math.max(...L.ftAll))}%；同一组换种子或换一组录音，相差 ≤${f1(Math.max(...L.noise))} 个百分点。`
      + `在 ${f0(Math.min(...amtRows.filter((r) => r.m > 0).map((r) => r.m)))}–143 分钟范围内，录音多少、几个房间都不明显影响结果。`, 8.4, 4.35 + 0.42 * L.D.length, 4.3, 1.2);
    oneLine(s, `约 ${f0(L.enough.m)} 分钟真实录音（每个房间约 ${f0(L.enough.m / 3)} 分钟）微调就从 ${f1(RM.base)}% 提高到 ${f1(L.enough.acc)}%，与全部 143 分钟相同。`);
  } else {
    table(s, [
      [head("模型"), head("真实录音 ≤10°", { align: "center" })],
      [bold("GEVD-MUSIC"), ctr(`${f1(RM.gevd)}%`)],
      [bold("小网络（仿真训练）"), ctr(`${f1(RM.base)}%`)],
      [bold("小网络 + 实录微调", { color: C.navy }), hi(`${f1(RM.ft)}%`)],
      [bold("多种子验证（4 个起点模型）"), ctr(D.server_ft ? D.server_ft : TBD)],
    ], 8.4, 1.95, [2.9, 1.4], [0.42, 0.42, 0.42, 0.42, 0.42]);
    note(s, "录音多少、分几个房间的对比实验进行中。", 8.4, 4.25, 4.3, 0.8);
    oneLine(s, `加入另外 3 个房间的真实录音微调，真实录音 ${f1(RM.base)}% → ${f1(RM.ft)}%，是目前最有效的改进。`);
  }
}

// 8 端侧规格
{
  const s = newSlide("端侧计算量与 8 比特量化",
    "会议室阵列小网络（6 麦线阵 17.5 cm）；输入 1.5 s（92 帧）；量化为模拟量化（权重按通道、激活按张量取整到 8 比特），会议室仿真固定测试集 800 个样本",
    `参数 ${Q.params.toLocaleString("en-US")} 个，8 比特权重约 ${f0(Q.kb_int8)} KB。W8：只量化权重；W8A8：权重与卷积、线性层的输入都量化到 8 比特，范围用验证集 200 个样本标定；GRU 内部状态与 softmax 仍为浮点，实际部署取决于芯片工具链。`);
  table(s, [
    [head("层"), head("计算量占比", { align: "center" })],
    ...Q.layers.filter((r) => r[1] > 0).map((r) => [cell(r[0]), ctr(`${f1(r[1])}%`)]),
  ], 0.6, 1.95, [5.6, 1.5], [0.42, 0.42, 0.42, 0.42, 0.42, 0.42]);
  table(s, [
    [head("精度"), head("≤10°", { align: "center" })],
    [bold("浮点"), ctr(`${f1(Q.quant["浮点"])}%`)],
    [bold("W8（权重 8 比特）"), ctr(`${f1(Q.quant["W8"])}%`)],
    [bold("W8A8（权重与激活 8 比特）", { color: C.navy }), hi(`${f1(Q.quant["W8A8"])}%`)],
  ], 8.2, 1.95, [3.0, 1.5], [0.42, 0.42, 0.42, 0.42]);
  const conv = Q.layers.slice(0, 3).reduce((a, r) => a + r[1], 0);
  para(s, [`每次判决 ${(Q.macs / 1e8).toFixed(1)} 亿次乘加，${f0(conv)}% 在三层卷积`, "减计算量优先改卷积（帧移加倍、深度可分离卷积），需重新训练后评估",
           `目标芯片与算力预算${TBD}`], 0.6, 4.75, 12.1, 1.9);
  oneLine(s, `${(Q.params / 1e6).toFixed(2)} M 参数、每次判决 ${(Q.macs / 1e8).toFixed(1)} 亿次乘加；8 比特量化后准确率不变（${f1(Q.quant["W8A8"])}%）。`);
}

// 9 后续计划
{
  const s = newSlide("后续计划", null,
    "真实录音是目前最有效的改进，因此后续以自有阵列的会议室实录为主。RealMAN 阵列与产品阵列不同，RealMAN 上的实验用于验证方法和估算采集量。");
  table(s, [
    [head("工作"), head("内容"), head("需要")],
    [bold("自有阵列实录"), cell("会议室实采：多个房间、多个座位，含换人、抢话、远端喇叭、无人说话；采集量按第 7 页估算"), cell(`阵列样机、会议室与采集时间${TBD}`)],
    [bold("实录微调"), cell("多个起点模型重复微调，确认提升稳定；之后用自有阵列数据微调产品模型"), cell("—")],
    [bold("噪声段误转"), cell("纯噪声样本训练或有人说话判断，按误转与漏转的取舍选定"), cell(`误转与漏转的取舍${TBD}`)],
    [bold("端侧"), cell("按目标芯片评估计算量与内存；必要时改卷积减计算量，再 8 比特量化"), cell(`目标芯片与算力预算${TBD}`)],
    [bold("系统接入"), cell("发言开始或换人时转向；输出方位与置信度给云台和波束成形"), cell(`是否需要唤醒词触发、接口${TBD}`)],
    [bold("竞品对比"), cell("同一测试集上与竞品公开的麦克风配置、同量级公开端侧 DOA 小模型对比"), cell(`对比方式${TBD}`)],
  ], 0.6, 1.85, [2.0, 7.0, 3.1], [0.42, 0.62, 0.55, 0.55, 0.55, 0.55, 0.55]);
  oneLine(s, "下一步以自有阵列的会议室真实录音为主，同时确认误转与漏转的取舍和目标芯片。");
}

require("./zh_notes")(p, OUT).then(() => console.log("已生成：" + OUT));

function R1(x) { return Math.floor(x * 10 + 0.5 + 1e-9) / 10; }
