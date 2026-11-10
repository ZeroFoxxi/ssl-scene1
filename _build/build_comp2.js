// 竞品补充页（2 页）v4：萤石整机对标、思必驰算法对标。用于插入既有 SSL 技术综述 PPT。
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
  // 左侧对象卡片：产品图 + 名称 + 产品信息
  const cx = 0.5, cy = 1.45, cw = 4.15, ch = 4.35;
  R(s, cx, cy, cw, ch, C.light, null, 0.1);
  R(s, cx + 0.2, cy + 0.18, cw - 0.4, 1.5, C.white, C.line, 0.08);
  s.addImage({ path: IMG(d.img[0]), x: cx + 0.2 + (cw - 0.4 - d.img[1]) / 2, y: cy + 0.24, w: d.img[1], h: d.img[2], altText: d.object });
  T(s, d.object, { x: cx + 0.25, y: cy + 1.8, w: cw - 0.5, h: 0.36, fontSize: 15, bold: true, color: C.navy });
  T(s, d.objectSub, { x: cx + 0.25, y: cy + 2.15, w: cw - 0.5, h: 0.28, fontSize: 10.5, color: C.gray });
  d.info.forEach((f, k) => {
    const yy = cy + 2.5 + k * 0.45;
    s.addShape(p.shapes.LINE, { x: cx + 0.25, y: yy, w: cw - 0.5, h: 0, line: { color: C.line, width: 0.75 } });
    T(s, f[0], { x: cx + 0.25, y: yy + 0.04, w: 0.62, h: 0.38, fontSize: 10.5, bold: true, color: C.navy, valign: "middle" });
    T(s, f[1], { x: cx + 0.9, y: yy + 0.04, w: cw - 1.15, h: 0.38, fontSize: 10, color: C.text, valign: "middle" });
  });
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
  title: "萤石 C6Wi 4K：现款旗舰云台摄像头整机对标",
  tag: "整机对标",
  lead: "现款旗舰主打“声源追踪”，3 麦听声辨位后驱动云台转向，与场景一形态一致；算法与资源未公开，需样机实测",
  img: ["ezviz_c6wi_4k.jpg", 1.38, 1.38],
  object: "萤石 C6Wi 4K 旗舰版",
  objectSub: "型号 CS-C6Wi-4K · 早期参照：C6C 无极巡航版",
  info: [["上市", "2023 年初（电商页标注，待核）"], ["价格", "商城在售，约 500–600 元档【以商城为准】"],
         ["连接", "Wi-Fi 5 + RJ45 有线；Type-C 供电"], ["规格", "4K；云台水平 340° / 垂直 125°"]],
  flowCaption: "整机链路（官方功能）",
  flow: [["声音触发", "异常声 / 说话"], ["听声辨位", "3 麦阵列", true], ["云台转向", "水平 340°"], ["AI 追踪", "人形 / 特写跟踪"]],
  checks: [
    ["定位算法", "part", "官方：3MIC 听声辨位、声源追踪；DOA 方法未公开"],
    ["部署芯片", "part", "官方：内置专用高性能芯片，1.0T 算力；芯片型号未公开"],
    ["执行单元", "no", "定位跑在 CPU / DSP / NPU 未公开；需实时驱动云台，判断在端侧"],
    ["内存 / 模型", "no", "定位模块运行内存、模型 / 资源文件大小未公开"],
    ["时延", "no", "算法耗时未公开；整机“触发 → 转动 / 入画”需样机实测"],
    ["离线 / 在线", "part", "支持萤石算法商店动态加载算法；定位功能的离线依赖未公开"],
  ],
  chip: "C6Wi：官方称“内置专用高性能芯片，搭载 1.0T 算力”（未写型号）。早期 C6C：问询回复披露 4 麦、公司级“高精度声源定位”识别率 86.0%（实验室）。异款拆解：新 C6 主控 ECZ5450S（定制标记，带 CNN 模块）；公司 SoC 供应商为富瀚微、海思、厦门威欣（公司整体口径）。",
  src: [["萤石商城：C6WI 旗舰系列参数", "https://www.ys7.com/item/165990.html"],
        ["萤石官网：产品家族（1.0T 算力）", "https://www.ezviz.com/cn/news/6270.html"],
        ["萤石问询回复 印刷页 8-1-1-61 / 110 / 206 / 207", "https://pdf.dfcfw.com/pdf/H2_AN202205051563734391_1.pdf"],
        ["电子工程专辑：新 C6 拆解", "https://www.eet-china.com/news/202204210910.html"]],
  notes: "萤石选现款旗舰 C6Wi 4K 版做整机对标。萤石商城的参数表写明“3MIC 听声辨位”，卖点是“声源追踪”，听到声音转向、再用 AI 追踪跟拍，和场景一的形态一样。产品信息：型号 CS-C6Wi-4K，电商页标注 2023 年初上市，商城价在 500 到 600 元档，Wi-Fi 5 加有线网口，4K 画面，云台水平 340 度、垂直 125 度。部署芯片方面，萤石官网说 C6Wi 系列内置专用高性能芯片、1.0T 算力，但没写型号；定位跑在 CPU 还是 NPU、内存、模型、时延都没公开。早期的 C6C 无极版作参照：问询回复披露 4 麦，公司级的高精度声源定位识别率 86%，是自家实验室数据。下一步是买 C6Wi 样机实测转向时延和命中率，拆机确认主控型号。",
});

// ---------------- 第 2 页：思必驰 ----------------
page({
  title: "思必驰：C60 声像追踪摄像头 + fespl SDK 算法对标",
  tag: "算法对标",
  lead: "C60 是思必驰的云台声像追踪摄像头；其线阵前端 SDK（fespl）在唤醒后回调方位，可在同一段多通道音频上做算法级对比",
  img: ["aispeech_c60.jpg", 2.9, 1.36],
  object: "思必驰 C60 AI 双目追踪摄像头",
  objectSub: "会议场景 · 算法对标走线阵前端 SDK（fespl）",
  info: [["上市", "2024 年 4 月 InfoComm China 已展出"], ["价格", "国内未公开；海外渠道约 1,370–2,575 美元"],
         ["阵列", "8 阵列线性麦克风"], ["镜头", "双 1080P：特写 12× 变焦 + 全景 110°"]],
  flowCaption: "C60 声像追踪链路（官方功能）",
  flow: [["多通道音频", "8 阵列线性麦"], ["语音定位", "声源方向", true], ["视觉锁定", "人脸 / 人形"], ["云台特写", "PTZ 跟踪发言人"]],
  checks: [
    ["定位算法", "part", "C60：语音定位 + 视觉追踪；fespl：唤醒后回调方位；方法未公开"],
    ["部署芯片", "part", "自研太行芯片 + 通用芯片适配；C60 主控与 fespl 对应平台未公开"],
    ["执行单元", "no", "定位跑在 CPU / DSP / NPU 未公开"],
    ["内存 / 模型", "no", "DOA 内存、资源文件大小未公开，需向 SDK 提供方索取"],
    ["时延", "no", "DOA 计算耗时、唤醒回调到方位输出的延迟未公开"],
    ["离线 / 在线", "part", "fespl 为离线语音前端（官方手册）；C60 整机链路未公开"],
  ],
  chip: "自研太行芯片：TH1520（双 DSP + AI 指令扩展，常开毫瓦级）、TH2608（Cortex-M + DSP + NPU，支持 INT8 / INT4 / INT1）；招股书：已完成 34 种芯片架构的深度适配，侧重低功耗芯片。C60 与 fespl 具体部署在哪颗芯片未公开。",
  src: [["思必驰官网：C60 产品页", "https://meeting.aispeech.com/product/c60/"],
        ["DUI Linux SDK 开发手册（fespl）", "https://www.duiopen.com/docs/ct_fesp_linux"],
        ["思必驰招股书（申报稿，2026）印刷页 1-1-127 / 128 / 134", "https://dataclouds.cninfo.com.cn/sjother2/documents/2026/2026-05-25/1d4b495ace513224eeffac7f7ab4bfbf.pdf"],
        ["PjTime：InfoComm China 2024", "http://www.pjtime.com/2024/4/292539158386.shtml"],
        ["渠道页：C60 规格与价格", "https://global.microless.com/product/aispeech-c60-ai-tracking-binocular-voice-camera-dual-1080p-lenses-close-up-panoramic-8-mic-array-speaker-tracking-12x-optical-zoom-ptz-auto-framing-for-zoom-teams-meetings-black-c60/?currency=usd"]],
  notes: "思必驰这页分两层。产品层是 C60，思必驰自己的 AI 双目追踪摄像头：官网写明双 1080P 镜头、110 度视场、8 阵列线性麦克风、多模态声像追踪，也就是先用语音定位找到发言人方向，再用视觉锁定，云台推特写跟踪，和场景一的链路很像，只是用在会议室。2024 年 4 月 InfoComm China 已经展出，国内价格没公开，海外渠道大约 1370 到 2575 美元。算法层用它的线阵前端 SDK fespl 做对标：官方手册写明唤醒后会回调方位，可以拿同一段多通道录音直接比。部署芯片方面，思必驰有自研的太行芯片，TH1520 是双 DSP、常开毫瓦级，TH2608 加了 NPU；招股书说已适配 34 种芯片架构，侧重低功耗芯片。C60 和 fespl 具体用哪颗芯片、定位跑在哪个单元、资源和时延都没公开。下一步是申请 fespl SDK 和目标平台版本做算法对比。",
});

p.writeFile({ fileName: OUT }).then(() => console.log("written", OUT));
