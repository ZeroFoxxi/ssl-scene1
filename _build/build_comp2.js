// 竞品补充页（2 页）：萤石整机对标、思必驰算法对标。用于插入既有 SSL 技术综述 PPT。
const pptxgen = require("pptxgenjs");
const path = require("path");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, ".."), "竞品补充页_萤石与思必驰.pptx");
const F = "Microsoft YaHei";
const NAVY = "17375E", TEXT = "1F2937", GRAY = "5B6B7F", LIGHT = "EEF2F7", TEAL = "1F7A68", AMBER = "B8691A", BORDER = "CBD5E1", WHITE = "FFFFFF";

const p = new pptxgen();
p.layout = "LAYOUT_WIDE";
p.title = "竞品补充页：萤石与思必驰";
const T = (s, text, o) => s.addText(text, Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 12, color: TEXT, margin: 0, valign: "top", paraSpaceAfter: 0 }, o));
const cell = (t, o) => ({ text: t, options: Object.assign({ fontFace: F, lang: "zh-CN" }, o || {}) });
const H = (t) => cell(t, { bold: true, color: WHITE, fill: { color: NAVY }, align: "center" });

// 标签行：“标签：内容”，未公开部分用橙色
function lines(s, items, x, y, w, h, fs) {
  const runs = [];
  items.forEach((it, i) => {
    runs.push({ text: it[0] + "：", options: { bold: true, color: NAVY, breakLine: false } });
    it[1].forEach((seg, j) => {
      const last = j === it[1].length - 1;
      runs.push({ text: seg[0], options: { color: seg[1] ? AMBER : TEXT, bold: !!seg[1], breakLine: last && i < items.length - 1, paraSpaceAfter: last ? 7 : 0 } });
    });
  });
  T(s, runs, { x, y, w, h, fontSize: fs || 12 });
}

function page(title, sub, rows, colW, items, src, notes, boxY, boxH) {
  const s = p.addSlide();
  s.background = { color: WHITE };
  T(s, title, { x: 0.5, y: 0.3, w: 12.3, h: 0.6, fontSize: 22, bold: true, color: NAVY, valign: "middle" });
  T(s, sub, { x: 0.5, y: 0.92, w: 12.3, h: 0.5, fontSize: 12, color: GRAY, valign: "middle" });
  s.addTable(rows, { x: 0.5, y: 1.5, w: 12.33, colW, fontFace: F, fontSize: 11, color: TEXT, valign: "middle",
    border: { type: "solid", pt: 0.75, color: BORDER }, margin: [0.05, 0.08, 0.05, 0.08], autoPage: false });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: boxY, w: 12.33, h: boxH, fill: { color: LIGHT }, line: { type: "none" }, rectRadius: 0.06 });
  lines(s, items, 0.72, boxY + 0.18, 11.9, boxH - 0.25, 13);
  T(s, src, { x: 0.5, y: boxY + boxH + 0.12, w: 12.33, h: 0.45, fontSize: 9, color: GRAY });
  s.addNotes(notes);
}

const U = (t) => [t, true];   // 未公开 / 待确认，标橙
const N = (t) => [t, false];

// 第 1 页：萤石
page(
  "竞品对标丨萤石 C6C 系列：整机对标",
  "选择理由：与场景一形态一致（云台摄像头 + 麦克风阵列 + 听声转向），用于对标整机定向效果与转向响应",
  [[H("型号"), H("阵列"), H("定位能力（公开口径）"), H("对标用途")],
   [cell("C6C 3MP 无极版\n（如 CS-C6C-3H3WFRV）", { bold: true }), "4 麦（问询回复，2021）", "听声辨位；公司披露“高精度声源定位”识别率 86.0%（行业平均 77.0%，自家实验室）", cell("首选对标样机（现款，4 麦）", { bold: true, color: TEAL })],
   [cell("C6C 无极巡航版 1080P\n（CS-C6C-1C2WFRV）", { bold: true }), "3 麦（官网资讯，2019）", "360° 声源定位，判定声源后转向拍摄；官方示例为掌声触发", "早期型号，作参照"]],
  [3.0, 2.3, 4.73, 2.3],
  [["定位算法", [N("具体方法未公开；功能为听声辨位 / 360° 声源定位，可由掌声等异常声音触发，与“唤醒后定向”的触发方式不同。")]],
   ["部署芯片", [N("主控为萤石定制标记芯片："), N("新 C6 为 ECZ5450S（双核 SoC，带 CNN 模块）；1080P C6C 为 HK2015-6（拆解推测为海康定制）。"), U("原厂型号未公开。"), N("公司 SoC 供应商为富瀚微、海思、厦门威欣（公司整体口径）。")]],
   ["执行单元 / 离线", [N("定位需实时驱动云台，应在端侧运行（判断）；公司音频算法可云端或设备端部署，支持算法动态加载。"), U("定位跑在 CPU 还是 NPU 未公开。")]],
   ["资源与时延", [U("定位模块的内存、模型大小、处理时延均未公开。")]],
   ["对标方式", [N("采购 C6C 3MP 现款样机：同房间同点位实测“声音触发 → 开始转动 / 目标入画”时延与转向命中率；拆机确认主控型号后查其 CPU / NPU 算力。")]]],
  "来源：萤石网络科创板问询回复（2022）印刷页 8-1-1-61、110、199、206、207；萤石官网资讯（2019，C6C 无极巡航版）；电子工程专辑、网易拆解报道（新 C6）；数码之家拆解（CS-C6C 1080P）。",
  "萤石选 C6C 系列做整机对标，因为它和场景一的形态一样：云台摄像头加麦克风阵列，听到声音就转过去。首选 3MP 无极版，问询回复披露是 4 麦；2019 年的 1080P 无极巡航版是 3 麦，作参照。算法方法没公开，触发方式是掌声这类异常声音，和我们唤醒后定向不一样。芯片方面，萤石用的是打了自家定制标记的芯片，比如新 C6 的 ECZ5450S，双核带 CNN 模块，原厂型号查不到；公司层面的 SoC 供应商是富瀚微、海思和厦门威欣。定位要实时驱动云台，应该在端侧跑，但跑在 CPU 还是 NPU 没公开，内存、模型、时延也都没公开。所以对标方式是买现款样机实测转向时延和命中率，再拆机确认主控型号。",
  3.1, 3.05
);

// 第 2 页：思必驰
page(
  "竞品对标丨思必驰：算法对标（唤醒后定向）",
  "选择理由：前端 SDK 支持唤醒后回调声源方位，与场景一“唤醒后首次定向”链路一致，可在同一段多通道音频上做算法级对比",
  [[H("方案"), H("阵列"), H("定位能力（公开口径）"), H("部署")],
   [cell("线性阵列 Linux SDK（fespl）", { bold: true }), "线性四麦 / 六麦", "唤醒回调后返回方位（如 {\"doa\":95}）；16 kHz 输入", cell("离线；公开包为 x86_64，其他平台需商务提供", { color: TEXT })],
   [cell("AI 麦克风阵列模组", { bold: true }), "双 / 四 / 六麦", "±5° 声源定位（招股书披露口径）；六麦环形 ±10°（2017 报道）", "端侧离线"],
   [cell("太行芯片 TH1520 / TH2608", { bold: true }), "最多 6 麦 / 6 模拟 + 6 数字麦", "芯片平台，定位精度随方案而定", "TH1520 双 DSP；TH2608 CPU + DSP + NPU"]],
  [3.0, 2.3, 4.73, 2.3],
  [["定位算法", [N("自研 DOA 定位 + 音区分割，会议场景说话人方向检测率 > 98%（招股书）；"), U("具体方法未公开。")]],
   ["部署芯片", [N("两条线：① 自研太行芯片——TH1520 双 DSP（专利印证为 Xtensa DSP），常开功耗毫瓦级；TH2608 增加 NPU，支持 INT8 / INT4 / INT1；② 通用芯片适配——已适配 34 种芯片架构，侧重低功耗芯片；第一大硬件供应商为杰理科技。")]],
   ["执行单元 / 离线", [N("SDK 为离线语音技术；"), U("定位跑在 DSP 还是 NPU、在哪些客户芯片上部署未公开。")]],
   ["资源与时延", [U("DOA 的内存、模型 / 资源文件大小、处理耗时均未公开；扩声延迟 ≤ 22 ms 不是定位时延。")]],
   ["对标方式", [N("申请 Linux SDK 及目标平台版本，在同一段多通道音频（含电视干扰）上比较首次定向精度与耗时；同时索取 DOA 资源占用。")]]],
  "来源：思必驰科创板招股说明书（申报稿，2026）印刷页 1-1-127、128、137、177、185、196、376；思必驰 DUI Linux SDK 开发手册（fespl）；DUI Linux SDK 集成手册；智东西 / 经济观察网 TH1520、TH2608 发布报道；a&s（2017，六麦环形）。",
  "思必驰选来做算法对标，因为它的前端 SDK 支持唤醒后回调声源方位，正好对应场景一的唤醒后首次定向，可以拿同一段多通道音频直接比。公开资料里有三类：线性阵列 Linux SDK，支持四麦和六麦，唤醒后返回方位；麦克风阵列模组，招股书披露正负 5 度，早年的六麦环形是正负 10 度；还有自研的太行芯片。部署分两条线：一是自研芯片，TH1520 是双 DSP，专利印证是 Xtensa DSP，常开功耗毫瓦级，TH2608 加了 NPU；二是适配通用芯片，招股书说已经适配 34 种芯片架构，侧重低功耗芯片，第一大硬件供应商是杰理。定位跑在 DSP 还是 NPU、资源和时延都没有公开。对标方式是申请 SDK 和目标平台版本，在同一段音频上比精度和耗时，同时要资源占用数据。",
  3.4, 3.05
);

p.writeFile({ fileName: OUT }).then(() => console.log("written", OUT));
