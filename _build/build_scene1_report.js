// 场景一阶段汇报：会议室摄像头转向发言人——阵列、测向方法、连续会议仿真与真实录音验证。
// 风格按 CLAUDE.md 中对 PPT 的要求（2026-11-18）与"不要 AI 味"规则：标题短、写本页主题；每页标题下一句加粗的要点写结论；
// 正文是带坐标轴的图表和精简表格（mentor 调研 PPT 表格样式）；浅灰底、深蓝一种主色、细线分隔、页码；细节放附录。
// 数字全部来自 _build/scene1_report_data.json（scene1_progress_data.py 从 code/ssl_baseline/out/ 读取）。
// 运行：python _build/scene1_progress_data.py && node _build/build_scene1_report.js
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, "..", "01_场景一_摄像头声源定位", "方案选型"), "场景一阶段汇报_会议室声源定位.pptx");
const D = JSON.parse(fs.readFileSync(path.join(__dirname, "scene1_report_data.json"), "utf-8"));
const F = "Microsoft YaHei";
const C = { ink: "1F1F1F", gray: "595959", light: "8C8C8C", rule: "D9D9D9", box: "A6A6A6", navy: "134074", navyLt: "8DA9C4", base1: "C9CED6", base2: "8C96A3" };
const BG = "F7F8FA";

let pageNo = 1;
const p = new pptxgen();
p.layout = "LAYOUT_WIDE";
p.title = "场景一阶段汇报：会议室摄像头声源定位";

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
const para = (s, items, x, y, w, h, o) => s.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } })),
  Object.assign({ x, y, w, h, fontFace: F, lang: "zh-CN", fontSize: 13, color: C.ink, valign: "top", margin: 0.03, paraSpaceAfter: 10, isTextBox: true }, o || {}));
function box(s, text, x, y, w, h, o) {
  o = o || {};
  s.addShape(p.shapes.RECTANGLE, { x, y, w, h, fill: { color: "FFFFFF" }, line: { color: o.line || C.box, width: 0.75 } });
  T(s, text, { x: x + 0.06, y, w: w - 0.12, h, fontSize: 12, align: "center", valign: "middle", color: o.color || C.ink, bold: !!o.bold });
}
const arrow = (s, x1, y, x2) => s.addShape(p.shapes.LINE, { x: x1, y, w: x2 - x1, h: 0.001, line: { color: C.gray, width: 1, endArrowType: "triangle" } });
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

const RM = D.realman, ft = RM["小网络（+实录微调）"], CL = D.closed_loop, M = D.methods, A = D.aperture;
M.labels = M.labels.map((l) => l.replace("远端扬声器", "远端喇叭"));
const SIM_SRC = "仿真：会议室 5–10 m × 4–7 m，RT60 0.3 / 0.6 s，摄像头装在前墙上方，6 人围桌；设置详见附录";

// 1 封面
{
  const s = p.addSlide(); s.background = { color: BG };
  s.addShape(p.shapes.LINE, { x: 0.9, y: 4.0, w: 11.5, h: 0, line: { color: C.navy, width: 1 } });
  T(s, "场景一：会议室摄像头声源定位", { x: 0.9, y: 2.5, w: 11, h: 0.8, fontSize: 32, bold: true, valign: "middle" });
  T(s, "阶段进展：阵列选型、测向方法、连续会议仿真与真实录音验证", { x: 0.9, y: 3.35, w: 11, h: 0.5, fontSize: 18, color: C.gray, valign: "middle" });
  T(s, "2026 年 11 月", { x: 0.9, y: 4.15, w: 4, h: 0.4, fontSize: 13, color: C.light, valign: "middle" });
  s.addNotes("场景为会议室：有人开口，摄像头转向正在发言的人。本次汇报阵列选型、测向方法（传统方法与端侧小网络）、连续会议仿真和真实录音验证。数字为仿真或公开真实录音数据集上的结果，未在自有硬件上测试。");
}

// 2 阶段结论
{
  const s = newSlide("阶段结论", "各项数字见后续页；真实录音为公开数据集 RealMAN 与 LOCATA，未在自有硬件上测试",
    "本页汇总；每项的数据与条件见后续页和附录。");
  table(s, [
    [head("项目"), head("结论")],
    [bold("场景"), cell("会议室：有人开口，摄像头转向发言人（仿真中换人后对准用时中位数约 0.7 s）；只需要方向（DOA）")],
    [bold("阵列"), cell("暂定 6 麦线阵、孔径 17.5 cm，平行于前墙；4 麦线阵作低成本备选（第 4 页）")],
    [bold("测向方法"), cell(`端侧小网络（${(D.nn_params / 1e6).toFixed(2)} M 参数，每次判决约 ${(D.nn_macs / 1e8).toFixed(1)} 亿次乘加）；传统方法 SRP-PHAT、GEVD-MUSIC 作对照`)],
    [bold("仿真"), cell(`四种情况平均准确率：小网络 ${M.avg["小网络"]}%，传统方法最好 ${M.avg["GEVD-MUSIC"]}%（第 5 页）`)],
    [bold("连续会议"), cell(`每分钟误转：小网络 ${CL.nn.wrong.toFixed(1)} 次，传统方法约 3 次；转向用时相同（第 6 页）`)],
    [bold("真实录音"), cell(`RealMAN：小网络 ${RM["小网络（仿真训练）"].acc10}%，加入实录微调后 ${ft ? ft.acc10 : "—"}%，传统方法最好 ${RM["GEVD-MUSIC"].acc10}%；LOCATA 上三种方法差距在统计误差内（第 7 页）`)],
    [bold("需要确认"), cell("目标芯片与算力预算；竞品对比方式；GPU 服务器网络访问（第 8 页）")],
  ], 0.6, 1.85, [1.9, 10.2], [0.42, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55]);
  oneLine(s, "会议室换人测向上，端侧小网络在仿真和 RealMAN 实录上优于传统方法（LOCATA 上持平），加入实录数据训练后进一步提升。");
}

// 3 测试场景与流程
{
  const s = newSlide("测试场景与系统流程", SIM_SRC,
    "四种情况：正常换人（A 说完停 0.2–0.6 s 后 B 开口）；抢话（A、B 重叠 0.5 s）；远端参会人从电视喇叭说话（未做回声消除，信干比 0 dB）；吊顶空调噪声（带内信噪比 5 dB）。\n测向输入：小网络取 B 开口前 1.0 s 到开口后 0.5 s 的 6 路信号；GEVD-MUSIC 另用开口前约 1 s 作背景段。");
  const y = 1.95, h = 0.75, cy = y + h / 2;
  box(s, "6 麦线阵\n（前墙上方）", 0.6, y, 2.0, h);
  box(s, "检测开口 / 换人", 3.0, y, 2.2, h);
  box(s, "测向\n（开口后 0.5 s）", 5.6, y, 2.2, h, { line: C.navy, color: C.navy, bold: true });
  box(s, "转向决策\n（1.0 s 微调）", 8.2, y, 2.0, h);
  box(s, "云台转向", 10.6, y, 2.1, h);
  arrow(s, 2.6, cy, 3.0); arrow(s, 5.2, cy, 5.6); arrow(s, 7.8, cy, 8.2); arrow(s, 10.2, cy, 10.6);
  T(s, "本次比较的是“测向”这一步：传统方法（SRP-PHAT、GEVD-MUSIC）与端侧小网络；其余模块相同。", { x: 0.6, y: 2.9, w: 12.1, h: 0.4, fontSize: 12, color: C.gray });
  table(s, [
    [head("测试情况"), head("内容"), head("难点")],
    [bold("正常换人"), cell("A 说完停 0.2–0.6 s，B 开口"), cell("混响")],
    [bold("抢话"), cell("B 开口时 A 还在说，重叠 0.5 s"), cell("两人同时说话，容易停在上一位")],
    [bold("远端喇叭"), cell("远端参会人从电视喇叭说话"), cell("喇叭声和本地人声一样响，容易被带偏")],
    [bold("空调噪声"), cell("吊顶出风口持续噪声"), cell("定向噪声")],
  ], 0.6, 3.5, [2.0, 5.0, 5.1], [0.4, 0.42, 0.42, 0.42, 0.42]);
  oneLine(s, "评测有人开口后 0.5 s 能否把方向测准，覆盖抢话、远端喇叭、空调噪声三类干扰。");
}

// 4 阵列选型
{
  const s = newSlide("阵列选型（仿真）", SIM_SRC + "；GEVD-MUSIC，开口后 0.5 s 判决，四种情况平均",
    `4 麦圆阵（孔径 6 cm，旋转 45°）离墙 8 cm 时为 ${D.circle45}%；离墙距离对比（每档 RT60 50 个房间）：圆阵离墙 4 cm 约 58%、50 cm 约 68%，仍低于同麦数线阵（4 麦线阵 10.5 cm 为 75–79%）；线阵离墙 4–50 cm 变化在 4 个百分点以内。GEVD-MUSIC 计算耗时 6 麦约为 8 麦的 0.7 倍。共比较 16 种阵列，见附录。`);
  s.addChart(p.charts.BAR, [{ name: "孔径 10.5 cm", labels: A.labels, values: A["10.5 cm"] }, { name: "孔径 17.5 cm", labels: A.labels, values: A["17.5 cm"] }],
    chartBase({ x: 0.6, y: 1.8, w: 7.2, h: 4.85, chartColors: [C.base1, C.navy], showLegend: true, legendPos: "t",
                showCatAxisTitle: true, catAxisTitle: "线阵麦克风数（平行于前墙安装）" }));
  const gains = A["17.5 cm"].map((v, i) => v - A["10.5 cm"][i]);
  para(s, [`孔径从 10.5 cm 加到 17.5 cm：提高 ${Math.min(...gains)}–${Math.max(...gains)} 个百分点`,
           `6 麦与 8 麦相当（${A["17.5 cm"][1]}% / ${A["17.5 cm"][2]}%），GEVD-MUSIC 计算耗时少约 30%`,
           `4 麦圆阵（孔径 6 cm）只有 ${D.circle45}%，离墙 50 cm 也只到约 68%`,
           "暂定 6 麦线阵、孔径 17.5 cm；4 麦线阵作低成本备选"], 8.2, 2.2, 4.5, 4.2);
  oneLine(s, "贴墙安装选线阵，孔径比麦克风数更重要：6 麦、17.5 cm 与 8 麦效果相当。");
}

// 5 测向方法对比
{
  const s = newSlide("测向方法对比（仿真）", "仿真固定测试集 800 个样本（200 个房间 × 四种情况），6 麦线阵 17.5 cm，开口后 0.5 s 判决；各方法同一批样本",
    `小网络只用验证集挑模型，测试集只评测一次。小网络 ${D.nn_params.toLocaleString("en-US")} 个参数，每次判决约 ${(D.nn_macs / 1e8).toFixed(1)} 亿次乘加；GEVD-MUSIC 约 0.2 亿次（按 STFT、白化、360 个方位扫描估算）。`);
  s.addChart(p.charts.BAR, [{ name: "SRP-PHAT", labels: M.labels, values: M["SRP-PHAT"] }, { name: "GEVD-MUSIC", labels: M.labels, values: M["GEVD-MUSIC"] },
                            { name: "小网络", labels: M.labels, values: M["小网络"] }],
    chartBase({ x: 0.6, y: 1.8, w: 8.4, h: 4.85, chartColors: [C.base1, C.base2, C.navy], showLegend: true, legendPos: "t" }));
  table(s, [
    [head("方法"), head("四种情况平均", { align: "center" })],
    [bold("小网络", { color: C.navy }), ctr(`${M.avg["小网络"]}%`, { bold: true, color: C.navy })],
    [bold("GEVD-MUSIC"), ctr(`${M.avg["GEVD-MUSIC"]}%`)],
    [bold("SRP-PHAT"), ctr(`${M.avg["SRP-PHAT"]}%`)],
  ], 9.4, 2.2, [1.9, 1.4], [0.4, 0.42, 0.42, 0.42]);
  T(s, "差距最大在远端喇叭：传统方法容易被喇叭声带偏", { x: 9.4, y: 4.15, w: 3.3, h: 0.7, fontSize: 12, color: C.gray });
  oneLine(s, `小网络四种情况平均 ${M.avg["小网络"]}%，比传统方法最好的 ${M.avg["GEVD-MUSIC"]}% 高 ${M.avg["小网络"] - M.avg["GEVD-MUSIC"]} 个百分点，远端喇叭下差距最大。`);
}

// 6 连续会议仿真
{
  const s = newSlide("连续会议仿真", "60 段 60 s 会议（6 人轮流发言，30% 抢话，约 20% 轮次为远端参会人），空调噪声一直存在；云台 120°/s；RT60 0.3 / 0.6 s 各 30 段",
    `流程：每 0.1 s 判断有人开口或方向变化 → 开口后 0.5 s 转向 → 1.0 s 微调；远端喇叭播放时不转。两种方法同一批会议、同一套转向逻辑，只换测向。小网络只训练了开口后 0.5 s 判决，1.0 s 微调时给出相同结果，微调对它不起作用。对准：误差 ≤10°；误转：转向目标偏离当时发言人 >15°。SRP-PHAT（未加远端冻结）误转 ${CL.srp.wrong.toFixed(1)} 次 / 分钟。`);
  s.addChart(p.charts.BAR, [{ name: "每分钟误转", labels: ["传统方法（GEVD-MUSIC）", "小网络"], values: [CL.gevd.wrong, CL.nn.wrong] }],
    chartBase({ x: 0.6, y: 1.8, w: 5.8, h: 4.85, showLegend: false, chartColors: [C.base2, C.navy], barGapWidthPct: 90,
                valAxisMaxVal: 4, valAxisMajorUnit: 1, valAxisTitle: "每分钟误转次数", dataLabelFormatCode: "0.0", valAxisLabelFormatCode: "0" }));
  table(s, [
    [head("指标"), head("传统方法", { align: "center" }), head("小网络", { align: "center" })],
    [bold("换人后对准用时（中位数）"), ctr(`${CL.gevd.latency.toFixed(2)} s`), ctr(`${CL.nn.latency.toFixed(2)} s`, { bold: true, color: C.navy })],
    [bold("2 s 内对准的比例"), ctr(`${CL.gevd.aim2s}%`), ctr(`${CL.nn.aim2s}%`, { bold: true, color: C.navy })],
    [bold("每分钟误转次数"), ctr(CL.gevd.wrong.toFixed(1)), ctr(CL.nn.wrong.toFixed(1), { bold: true, color: C.navy })],
    [bold("发言时间中画面对准的比例"), ctr(`${CL.gevd.framed}%`), ctr(`${CL.nn.framed}%`, { bold: true, color: C.navy })],
  ], 6.9, 2.05, [3.0, 1.4, 1.4], [0.42, 0.48, 0.48, 0.48, 0.48]);
  T(s, "抽查 4 段会议：传统方法的误转主要来自发言中途被误判为换人。小网络误转少，推测是误判时它仍输出原发言人的方向，摄像头不动。",
    { x: 6.9, y: 4.65, w: 5.8, h: 0.8, fontSize: 12, color: C.gray });
  oneLine(s, `转向一样快，小网络把误转从每分钟约 3 次降到 ${CL.nn.wrong.toFixed(1)} 次。`);
}

// 7 真实录音验证
{
  const names = Object.keys(RM);
  const s = newSlide("真实录音验证", `RealMAN（CC BY 4.0）测试集 5 个室内场景、${D.realman_n} 个样本，6 麦线阵 3 cm 间距；LOCATA（ODC-BY）5 麦、${D.locata_n} 个样本；设置详见附录`,
    "RealMAN 样本由同一场景、不同位置的两句真实录音相加（换人与抢话各半），空出的时段用该场景的真实背景噪声填补；真值为官方方位。\n小网络（仿真训练）：与会议室版本结构相同，按该阵列几何重新训练，只用仿真数据。小网络（+实录微调）：再用 RealMAN 另外 3 个场景（与测试场景不重叠）微调，第 4 个场景挑选模型，测试只评测一次。\n来源：RealMAN https://huggingface.co/datasets/AISHELL/RealMAN ；LOCATA https://zenodo.org/records/3630471");
  s.addChart(p.charts.BAR, [{ name: "RealMAN", labels: names.map((n) => n.replace("（", "\n（")), values: names.map((k) => RM[k].acc10) }],
    chartBase({ x: 0.6, y: 1.8, w: 7.6, h: 4.85, showLegend: false, chartColors: [C.base1, C.base2, C.navyLt, C.navy], barGapWidthPct: 80,
                showTitle: true, title: `RealMAN 真实录音（${D.realman_n} 个样本）`, titleFontSize: 11.5, titleColor: "404040" }));
  table(s, [
    [head("方法"), head("RealMAN", { align: "center" }), head("LOCATA", { align: "center" })],
    [bold("SRP-PHAT"), ctr(`${RM["SRP-PHAT"].acc10}%`), ctr(`${D.locata["SRP-PHAT"]}%`)],
    [bold("GEVD-MUSIC"), ctr(`${RM["GEVD-MUSIC"].acc10}%`), ctr(`${D.locata["GEVD-MUSIC"]}%`)],
    [bold("小网络（仿真训练）"), ctr(`${RM["小网络（仿真训练）"].acc10}%`), ctr(`${D.locata["小网络（仿真训练）"]}%`)],
    [bold("小网络（+实录微调）", { color: C.navy }), ctr(ft ? `${ft.acc10}%` : "—", { bold: true, color: C.navy }), ctr("—")],
  ], 8.6, 2.05, [2.2, 0.95, 0.95], [0.42, 0.42, 0.42, 0.42, 0.42]);
  T(s, `LOCATA：5 麦阵列，小网络只用仿真训练（取第 12 轮模型）；误差 ≤20° 的比例小网络最高（${D.locata20["小网络（仿真训练）"]}% vs ${D.locata20["GEVD-MUSIC"]}%）`, { x: 8.6, y: 4.3, w: 4.1, h: 0.7, fontSize: 11, color: C.gray });
  oneLine(s, `RealMAN 上小网络 ${RM["小网络（仿真训练）"].acc10}%，传统方法最好 ${RM["GEVD-MUSIC"].acc10}%，实录微调后 ${ft ? ft.acc10 : "—"}%；LOCATA 上三种方法差距在统计误差内，需要更多实录数据。`);
}

// 8 下一步与需要确认
{
  const s = newSlide("下一步与需要确认", null, "服务器：账号已开通，办公电脑到服务器的网络不通（ping 与 22 端口均超时），同事用同一账号可登录，判断为网络区域未开通。");
  table(s, [
    [head("事项"), head("内容"), head("需要")],
    [bold("放大训练再压缩"), cell("先训约 2 M 参数的版本，再压缩到几百 K 并做 8 比特量化；训练包已准备好"), cell("GPU 服务器网络访问（已有账号）")],
    [bold("扩大实录数据"), cell("更多 RealMAN 场景参与训练；规划会议室实采（6 麦线阵、贴墙安装）"), cell("采集设备与场地")],
    [bold("竞品对比"), cell("竞品转向用时与误转未公开：按竞品公开的麦克风配置在同一测试集上对比；与同参数量级的公开端侧 DOA 小模型对比"), cell("对比方式【待确认】")],
    [bold("端侧算力"), cell(`每次判决约 ${(D.nn_macs / 1e8).toFixed(1)} 亿次乘加，压缩后按目标芯片评估`), cell("目标芯片与算力预算【待确认】")],
    [bold("完善转向逻辑"), cell("小网络支持 1.0 s 微调；接入远端回声消除参考信号；实时 demo"), cell("—")],
  ], 0.6, 1.85, [2.2, 6.6, 3.3], [0.42, 0.62, 0.62, 0.62, 0.62, 0.62]);
  oneLine(s, "先打通服务器、扩大实录数据，再放大训练、压缩量化，并在同一测试集上做竞品配置对比。");
}

// 9 附录：方法、数据与样本量
{
  const s = newSlide("附录：方法、数据与样本量", "来源：LibriSpeech（CC BY 4.0）、RealMAN（CC BY 4.0）、LOCATA（ODC-BY）", null);
  table(s, [
    [head("项目"), head("内容")],
    [bold("仿真"), cell("镜像源法房间仿真；会议室 5–10 m × 4–7 m × 2.6–3.2 m，RT60 0.3 / 0.6 s；阵列距前墙 8 cm、高 1.6–2.0 m；6 人围桌，只统计需要转动的换人（方位差 ≥20°）")],
    [bold("阵列比较"), cell("第一轮 8 种（2–8 麦，线阵与圆阵），第二轮 11 种线阵（麦克风数 × 孔径），去重共 16 种；每档 RT60 100 个房间")],
    [bold("小网络"), cell(`输入：各麦克风相对参考麦的相位差 + 参考麦能量（4 kHz 以下）；结构：卷积 + 双向 GRU + 注意力池化；输出：前方 -90°～90° 每 2° 一类；${D.nn_params.toLocaleString("en-US")} 个参数`)],
    [bold("训练数据"), cell("仿真 12,000 个片段（LibriSpeech 人声，房间与说话人与测试不重叠）；验证 1,000 个；实录微调：RealMAN 验证集 3 个场景 4,500 个片段")],
    [bold("仿真测试"), cell("固定测试集 800 个样本（200 个房间 × 四种情况），所有方法同一批；连续会议仿真 60 段，每段 60 s")],
    [bold("真实录音测试"), cell(`RealMAN 测试集 5 个室内场景、${D.realman_n} 个样本（两句实录相加成换人 / 抢话）；LOCATA 开发集 + 评测集任务 1–3、${D.locata_n} 个样本`)],
    [bold("统计误差"), cell("95% 置信区间：仿真四种情况平均（800 个样本）约 ±2–3 个百分点，单个情况（200 个样本）约 ±3–7；RealMAN（600 个）约 ±3–4；LOCATA（451 个）约 ±4–5")],
  ], 0.6, 1.45, [1.9, 10.2], [0.42, 0.62, 0.55, 0.62, 0.62, 0.55, 0.62, 0.45]);
}

require("./zh_notes")(p, OUT).then(() => console.log("已生成：" + OUT));
