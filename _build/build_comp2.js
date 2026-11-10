// 竞品补充页（2 页）v3：萤石整机对标、思必驰算法对标。用于插入既有 SSL 技术综述 PPT。
// 每页：左侧对标对象卡片；右上算法链路图；右下六项核查（状态标签）；底部部署芯片线索；来源。
const pptxgen = require("pptxgenjs");
const path = require("path");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, ".."), "竞品补充页_萤石与思必驰.pptx");
const IMG = (n) => path.join(__dirname, "..", "figures", "竞品产品图", n);
const F = "Microsoft YaHei";
const C = { navy: "17375E", text: "1F2937", gray: "5B6B7F", mute: "8A97A8", light: "F3F6FA", line: "D5DDE7", white: "FFFFFF",
  teal: "1F7A68", tealL: "E3F1EE", amber: "B8691A", amberL: "FBF0E3", slate: "6B7785", slateL: "ECEFF3", ice: "DCE7F3" };

const p = new pptxgen();
p.layout = "LAYOUT_WIDE";
p.title = "竞品补充页：萤石与思必驰";
const T = (s, text, o) => s.addText(text, Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 12, color: C.text, margin: 0, valign: "top", paraSpaceAfter: 0 }, o));
const R = (s, x, y, w, h, fill, line, r) => s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: line ? { color: line, width: 0.75 } : { type: "none" }, rectRadius: r === undefined ? 0.08 : r });

const STATUS = { ok: ["已公开", C.teal, C.tealL], part: ["部分公开", C.amber, C.amberL], no: ["未公开", C.slate, C.slateL] };
function chip(s, x, y, kind) {
  const [t, fg, bg] = STATUS[kind];
  s.addText(t, { shape: p.shapes.ROUNDED_RECTANGLE, x, y, w: 0.92, h: 0.3, fill: { color: bg }, line: { color: fg, width: 0.75 }, rectRadius: 0.15,
    fontFace: F, lang: "zh-CN", fontSize: 10, bold: true, color: fg, align: "center", valign: "middle", margin: 0 });
}
function flow(s, x, y, w, steps, caption) {
  T(s, caption, { x, y, w, h: 0.28, fontSize: 11, bold: true, color: C.navy });
  const n = steps.length, gap = 0.32, bw = (w - gap * (n - 1)) / n, by = y + 0.36, bh = 0.78;
  steps.forEach((st, i) => {
    const bx = x + i * (bw + gap), hi = st[2];
    R(s, bx, by, bw, bh, hi ? C.navy : C.white, hi ? null : C.line, 0.1);
    T(s, st[0], { x: bx + 0.08, y: by + 0.09, w: bw - 0.16, h: 0.32, fontSize: 12, bold: true, color: hi ? C.white : C.navy, align: "center" });
    T(s, st[1], { x: bx + 0.08, y: by + 0.41, w: bw - 0.16, h: 0.34, fontSize: 9.5, color: hi ? "CADCFC" : C.gray, align: "center" });
    if (i < n - 1) s.addShape(p.shapes.LINE, { x: bx + bw + 0.04, y: by + bh / 2, w: gap - 0.08, h: 0, line: { color: C.mute, width: 1.25, endArrowType: "triangle" } });
  });
}
function checks(s, x, y, w, rows) {
  T(s, "算法与部署核查", { x, y, w, h: 0.28, fontSize: 11, bold: true, color: C.navy });
  const rh = 0.47; let yy = y + 0.34;
  rows.forEach((r, i) => {
    if (i % 2 === 0) R(s, x, yy, w, rh, C.light, null, 0.04);
    T(s, r[0], { x: x + 0.14, y: yy, w: 1.45, h: rh, fontSize: 11.5, bold: true, color: C.text, valign: "middle" });
    chip(s, x + 1.62, yy + (rh - 0.3) / 2, r[1]);
    T(s, r[2], { x: x + 2.68, y: yy, w: w - 2.8, h: rh, fontSize: 11, color: C.text, valign: "middle" });
    yy += rh;
  });
}
function page(d) {
  const s = p.addSlide();
  s.background = { color: C.white };
  // 标题
  T(s, [{ text: "竞品对标丨", options: { color: C.mute } }, { text: d.title, options: { color: C.navy } }], { x: 0.5, y: 0.32, w: 10.6, h: 0.6, fontSize: 24, bold: true, valign: "middle" });
  s.addText(d.tag, { shape: p.shapes.ROUNDED_RECTANGLE, x: 11.35, y: 0.42, w: 1.48, h: 0.4, fill: { color: C.navy }, line: { type: "none" }, rectRadius: 0.2,
    fontFace: F, lang: "zh-CN", fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
  T(s, d.lead, { x: 0.5, y: 0.94, w: 12.3, h: 0.36, fontSize: 13, color: C.gray, valign: "middle" });
  // 左侧对象卡片
  const cx = 0.5, cy = 1.45, cw = 4.15, ch = 4.35;
  R(s, cx, cy, cw, ch, C.light, null, 0.1);
  d.visual(s, cx + 0.25, cy + 0.22, cw - 0.5, 1.75);
  T(s, d.object, { x: cx + 0.25, y: cy + 2.08, w: cw - 0.5, h: 0.38, fontSize: 16, bold: true, color: C.navy });
  T(s, d.objectSub, { x: cx + 0.25, y: cy + 2.46, w: cw - 0.5, h: 0.3, fontSize: 11, color: C.gray });
  T(s, d.facts.map((f, i) => [{ text: f[0] + "　", options: { bold: true, color: C.navy } }, { text: f[1], options: { breakLine: i < d.facts.length - 1 } }]).flat(),
    { x: cx + 0.25, y: cy + 2.85, w: cw - 0.5, h: 1.4, fontSize: 11, paraSpaceAfter: 5 });
  // 右侧：链路 + 核查
  flow(s, 4.9, 1.45, 7.93, d.flow, d.flowCaption);
  checks(s, 4.9, 2.72, 7.93, d.checks);
  // 部署芯片线索条
  R(s, 0.5, 5.98, 12.33, 0.72, C.tealL, null, 0.08);
  s.addShape(p.shapes.RECTANGLE, { x: 0.5, y: 5.98, w: 0.09, h: 0.72, fill: { color: C.teal }, line: { type: "none" } });
  T(s, [{ text: "部署芯片线索　", options: { bold: true, color: C.teal } }, { text: d.chip }], { x: 0.75, y: 5.98, w: 11.95, h: 0.72, fontSize: 11.5, valign: "middle" });
  // 来源
  T(s, d.src.map((r, i) => [{ text: "[" + (i + 1) + "] ", options: { color: C.mute } }, { text: r[0], options: { color: "2F6EB5", hyperlink: { url: r[1], tooltip: r[1] } } }, { text: i < d.src.length - 1 ? "　" : "" }]).flat(),
    { x: 0.5, y: 6.82, w: 12.33, h: 0.35, fontSize: 9 });
  s.addNotes(d.notes);
}

// ---------------- 第 1 页：萤石 ----------------
page({
  title: "萤石 C6C：云台摄像头整机对标",
  tag: "整机对标",
  lead: "形态与场景一一致：麦克风阵列定位声源后驱动云台转向；算法与资源未公开，需用样机实测整机响应",
  visual: (s, x, y, w, h) => {
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: C.white }, line: { color: C.line, width: 0.75 }, rectRadius: 0.08 });
    s.addImage({ path: IMG("ezviz_c6c.jpg"), x: x + (w - h + 0.2) / 2, y: y + 0.1, w: h - 0.2, h: h - 0.2, altText: "萤石 C6C 无极巡航版", sizing: { type: "contain", w: h - 0.2, h: h - 0.2 } });
  },
  object: "C6C 3MP 无极版",
  objectSub: "候选样机：CS-C6C-3H3WFRV（版本待核）",
  facts: [["阵列", "4 麦（问询回复，2021）；早期 1080P 款为 3 麦"], ["触发", "声音触发转向，官方示例为掌声"], ["公开精度", "“高精度声源定位”识别率 86.0%，行业平均 77.0%（公司级、实验室，非单品指标）"]],
  flowCaption: "整机链路（公开功能）",
  flow: [["声音触发", "掌声 / 异常声"], ["声源定位", "360°，4 麦", true], ["云台转向", "水平无限旋转"], ["人形跟踪", "视觉接管"]],
  checks: [
    ["定位算法", "part", "听声辨位 / 360° 声源定位已公开；具体 DOA 方法、是否用神经网络未公开"],
    ["部署芯片", "part", "主控为萤石定制标记 SoC；目标 SKU 型号需拆机确认（见下方线索）"],
    ["执行单元", "no", "CPU / DSP / NPU 未公开；定位实时驱动云台，判断在端侧运行"],
    ["内存 / 模型", "no", "定位模块运行内存、模型 / 资源文件大小未公开"],
    ["时延", "no", "算法耗时未公开；整机“触发 → 转动 / 入画”需样机实测"],
    ["离线 / 在线", "part", "公司音频算法可云端或设备端部署，支持动态加载；单品配置未公开"],
  ],
  chip: "异款拆解：新 C6 主控为 ECZ5450S（定制标记，双核，带 CNN 模块）、C6C 1080P 主控为 HK2015-6；公司 SoC 供应商为富瀚微、海思、厦门威欣（问询回复，公司整体口径）。目标 3MP SKU 的主控与定位执行单元待拆机确认。",
  src: [["问询回复 印刷页 8-1-1-61 / 110 / 199 / 206 / 207", "https://pdf.dfcfw.com/pdf/H2_AN202205051563734391_1.pdf"],
        ["萤石官网资讯（2019，C6C 无极巡航版）", "https://www.ezviz.com/cn/news/2342.html"],
        ["电子工程专辑：新 C6 拆解", "https://www.eet-china.com/news/202204210910.html"],
        ["数码之家：C6C 1080P 拆解", "https://www.mydigit.cn/thread-402247-1-1.html"]],
  notes: "萤石选 C6C 系列做整机对标，因为它和场景一的形态一样：麦克风阵列定位声源，再驱动云台转过去，入画后交给人形跟踪。候选样机是 3MP 无极版，问询回复披露是 4 麦；早期 1080P 款是 3 麦。公开精度只有一个公司级数字：高精度声源定位识别率 86%，行业平均 77%，是自家实验室测的，没说明角度阈值和场景，不能当成单品指标，也不能和本方案的 10 度命中率直接比。核查六项里，定位算法、部署芯片、离线在线是部分公开，执行单元、内存模型、时延都没公开。芯片线索来自拆解：新 C6 是定制标记的 ECZ5450S，双核带 CNN 模块；1080P 的 C6C 是 HK2015-6；公司层面的 SoC 供应商是富瀚微、海思、厦门威欣。这些是异款或公司整体信息，目标 3MP 型号的主控还要拆机确认。下一步是借或买样机，实测转向时延和命中率，再拆机看主控。",
});

// ---------------- 第 2 页：思必驰 ----------------
page({
  title: "思必驰 fespl：唤醒后定向的算法对标",
  tag: "算法对标",
  lead: "离线前端 SDK 在唤醒后回调声源方位，与场景一“唤醒后首次定向”链路一致，可在同一段多通道音频上做算法级对比",
  visual: (s, x, y, w, h) => {
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: C.navy }, line: { type: "none" }, rectRadius: 0.08 });
    T(s, "DUILITE_CALLBACK_FESPL_WAKEUP", { x: x + 0.22, y: y + 0.2, w: w - 0.4, h: 0.3, fontFace: "Consolas", fontSize: 10.5, color: "9FB4D3" });
    T(s, "↓ 唤醒后", { x: x + 0.22, y: y + 0.5, w: w - 0.4, h: 0.28, fontSize: 10, color: "9FB4D3" });
    T(s, "DUILITE_CALLBACK_FESPL_DOA", { x: x + 0.22, y: y + 0.78, w: w - 0.4, h: 0.3, fontFace: "Consolas", fontSize: 10.5, color: C.white, bold: true });
    T(s, '{ "doa": 95 }', { x: x + 0.22, y: y + 1.12, w: w - 0.4, h: 0.45, fontFace: "Consolas", fontSize: 20, color: "7FD1B9", bold: true });
  },
  object: "线性阵列 Linux SDK（fespl）",
  objectSub: "离线前端：回声消除、DOA、波束成形、唤醒",
  facts: [["阵列", "线性四麦 / 六麦"], ["输入", "16 kHz、有符号 16-bit 多通道音频"], ["公开精度", "模组 ±5° 声源定位、会议方向检测率 > 98%（招股书，属模组 / 会议产品，非 fespl 实测）"]],
  flowCaption: "SDK 链路（官方手册）",
  flow: [["多通道音频", "线阵 4 / 6 麦"], ["唤醒", "唤醒词回调"], ["DOA 回调", "返回方位角", true], ["交给下游", "云台 / 波束成形"]],
  checks: [
    ["定位算法", "part", "唤醒后回调方位已公开；招股书称自研 DOA + 音区分割，具体方法未公开"],
    ["部署芯片", "part", "自研太行芯片 + 通用芯片适配；fespl 对应平台随 SDK 版本确认"],
    ["执行单元", "no", "定位跑在 CPU、DSP 还是 NPU 未公开"],
    ["内存 / 模型", "no", "DOA 增量内存、资源文件大小未公开，需向 SDK 提供方索取"],
    ["时延", "no", "DOA 计算耗时、唤醒回调到方位输出的延迟未公开"],
    ["离线 / 在线", "ok", "手册定义 fespl 为离线语音前端"],
  ],
  chip: "自研太行芯片：TH1520（双 DSP + AI 指令扩展，常开毫瓦级）、TH2608（Cortex-M + DSP + NPU，支持 INT8 / INT4 / INT1）；招股书：已完成 34 种芯片架构的深度适配，侧重低功耗芯片。fespl 具体部署在哪颗芯片待随 SDK 版本确认。",
  src: [["DUI Linux SDK 开发手册（fespl）", "https://www.duiopen.com/docs/ct_fesp_linux"],
        ["思必驰招股书（申报稿，2026）印刷页 1-1-127 / 128 / 137 / 196", "https://dataclouds.cninfo.com.cn/sjother2/documents/2026/2026-05-25/1d4b495ace513224eeffac7f7ab4bfbf.pdf"],
        ["经济观察网：TH1520 发布", "http://m.eeo.com.cn/2019/0105/344821.shtml"],
        ["智东西：TH2608 发布", "https://zhidx.com/news/35716.html"]],
  notes: "思必驰选 fespl 做算法对标。fespl 是它的线性阵列离线前端 SDK，官方手册写明支持线性四麦和六麦，输入 16 kHz、16 位多通道音频，唤醒回调之后会再回调一次方位，返回类似 doa 95 这样的角度。这和场景一的唤醒后首次定向是同一个链路，所以可以拿同一段多通道录音，比它和本方案的方位误差、耗时和内存。公开精度方面，招股书里的正负 5 度是模组规格，大于 98% 是会议产品的方向检测率，都不是 fespl 的实测。核查六项里，离线是公开的，算法和部署芯片部分公开，执行单元、内存模型和时延都没公开。芯片线索是两条线：一是自研的太行芯片，TH1520 是双 DSP、常开毫瓦级，TH2608 加了 NPU；二是招股书说已经适配 34 种芯片架构，侧重低功耗芯片。fespl 具体部署在哪颗芯片，要随 SDK 版本确认。还要注意 fespl 是线阵，本方案现在仿真的是四麦方阵，比较前要先确认阵列几何能对上。下一步是申请 SDK 和目标平台版本。",
});

p.writeFile({ fileName: OUT }).then(() => console.log("written", OUT));
