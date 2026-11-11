// 竞品补充页（3 页）：萤石整机对标、思必驰算法对标、竞品未公开时的参照。用于插入既有 SSL 技术综述 PPT。
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
  title: "萤石 C6Wi 4K：标注“听声辨位”的云台摄像机",
  tag: "整机对标",
  lead: "2021-12 发布；商城在售摄像机中仅见它标注“3MIC 听声辨位”。较新的 RK3 桌面机器人也带声源定位，且公开了 CPU / NPU，作芯片参照",
  img: ["ezviz_c6wi_4k.jpg", 1.38, 1.38],
  object: "萤石 C6Wi 4K 旗舰版",
  objectSub: "型号 CS-C6Wi-4K · 萤石首款 4K 摄像机",
  info: [["发布", "2021-12（C6Wi 系列 2019-12 首发）"], ["价格", "官方商城 C6WI 旗舰系列 519–2,079 元（含 400 万版与套装）"],
         ["连接", "Wi-Fi 5 + RJ45 有线；Type-C 供电"], ["规格", "4K；云台水平 340° / 垂直 125°"]],
  flowCaption: "整机链路（官方功能）",
  flow: [["声音触发", "异常声 / 说话"], ["听声辨位", "3 麦阵列", true], ["云台转向", "水平 340°"], ["AI 追踪", "人形 / 特写跟踪"]],
  checks: [
    ["定位算法", "part", "官方：3MIC 听声辨位、声源追踪；DOA 方法未公开"],
    ["部署芯片", "part", "官方：C6Wi 系列内置专用芯片、1.0T 算力；4K 版型号未公开"],
    ["执行单元", "no", "定位跑在 CPU / DSP / NPU 未公开；需实时驱动云台，判断在端侧"],
    ["内存 / 模型", "no", "定位模块运行内存、模型 / 资源文件大小未公开"],
    ["时延", "no", "算法耗时与整机“触发 → 转动”时延均未公开"],
    ["离线 / 在线", "part", "支持萤石算法商店动态加载算法；定位功能的离线依赖未公开"],
  ],
  chip: "C6Wi：官方称系列“内置专用高性能芯片，搭载 1.0T 算力”（未写型号）。RK3 桌面机器人（商城 1,299 元）：4 核 A55 1.5 GHz + NPU 3T，2 麦阵列 180° 声源定位。早期 C6C：问询回复披露 4 麦、公司级声源定位识别率 86.0%（实验室）。公司 SoC 供应商为富瀚微、海思、厦门威欣（公司整体口径）。",
  src: [["萤石商城：C6WI 旗舰系列参数", "https://www.ys7.com/item/165990.html"],
        ["快科技：C6Wi 4K AI 旗舰版发布（2021-12）", "https://news.mydrivers.com/1/803/803460.htm"],
        ["萤石官网：产品家族（1.0T 算力）", "https://www.ezviz.com/cn/news/6270.html"],
        ["萤石问询回复 印刷页 8-1-1-61 / 110 / 206 / 207", "https://pdf.dfcfw.com/pdf/H2_AN202205051563734391_1.pdf"],
        ["萤石商城：RK3 桌面机器人参数", "https://www.ys7.com/item/927621.html"]],
  notes: "萤石选 C6Wi 4K 做整机对标。它是 2021 年 12 月发布的，萤石首款 4K 摄像机，三颗麦克风听声辨位，卖点是声源追踪。2026 年 11 月逐个核对萤石商城在售的 98 款产品，摄像机里只有它的参数表写了 3MIC 听声辨位；之后几年的新品，比如 C6c 新款、C7 双摄、H7c、H6c 4K，主打的都是双摄联动和特写追踪这类视觉功能，没有再写声源定位。产品信息：型号 CS-C6Wi-4K，Wi-Fi 5 加有线网口，4K 画面，云台水平 340 度、垂直 125 度；官方商城 C6WI 旗舰系列售价 519 到 2079 元，含 400 万版和存储卡套装。部署芯片方面，萤石官网说 C6Wi 系列内置专用高性能芯片、1.0T 算力，没写型号；定位跑在哪个单元、内存、模型、时延都没公开。芯片参照可以看较新的 RK3 桌面机器人：它不是摄像机，但带 400 万摄像头和可转动云台，2 麦阵列支持 180 度声源定位，商城公开了 4 核 A55 1.5 GHz 和 3T NPU，是萤石少有的公开了处理器规格、又带声源定位的产品。早期的 C6C 无极版作参照：问询回复披露 4 麦，公司级高精度声源定位识别率 86%，是自家实验室数据。",
});

// ---------------- 第 2 页：思必驰 ----------------
page({
  title: "思必驰：C60 声像追踪摄像头 + fespl SDK 算法对标",
  tag: "算法对标",
  lead: "C60 在摄像机内置 8 麦阵列，形态最接近场景一；MT200（2026-07）改用吊顶麦 + 多摄像机，作方向参照；算法对标用 fespl",
  img: ["aispeech_c60.jpg", 2.9, 1.36],
  object: "思必驰 C60 AI 双目追踪摄像头",
  objectSub: "会议场景 · 算法对标走线阵前端 SDK（fespl）",
  info: [["展出", "2023-07 北京 InfoComm China 已展出；2024、2025 年续展"], ["价格", "国内未公开；海外经销商标价约 2,575 美元"],
         ["阵列", "8 阵列线性麦克风"], ["镜头", "双 1080P：特写 12× 变焦 + 全景 110°"]],
  flowCaption: "C60 声像追踪链路（官方功能）",
  flow: [["多通道音频", "8 阵列线性麦"], ["语音定位", "声源方向", true], ["视觉锁定", "人脸 / 人形"], ["云台特写", "PTZ 跟踪发言人"]],
  checks: [
    ["定位算法", "part", "C60：语音定位 + 视觉追踪；fespl：唤醒后回调方位；方法未公开"],
    ["部署芯片", "part", "自研太行芯片 + 通用芯片适配；C60 主控与 fespl 对应平台未公开"],
    ["执行单元", "no", "定位跑在 CPU / DSP / NPU 未公开"],
    ["内存 / 模型", "no", "DOA 内存、资源文件大小未公开"],
    ["时延", "no", "DOA 计算耗时、唤醒回调到方位输出的延迟未公开"],
    ["离线 / 在线", "part", "fespl 为离线语音前端（官方手册）；C60 整机链路未公开"],
  ],
  chip: "自研太行芯片：TH1520（双 DSP + AI 指令扩展，常开毫瓦级）、TH2608（Cortex-M + DSP + NPU，支持 INT8 / INT4 / INT1）；招股书：已完成 34 种芯片架构的深度适配，侧重低功耗芯片。C60 与 fespl 具体部署在哪颗芯片未公开。",
  src: [["思必驰官网：C60 产品页", "https://meeting.aispeech.com/product/c60/"],
        ["DUI Linux SDK 开发手册（fespl）", "https://www.duiopen.com/docs/ct_fesp_linux"],
        ["思必驰招股书（申报稿，2026）印刷页 1-1-127 / 128 / 134", "https://dataclouds.cninfo.com.cn/sjother2/documents/2026/2026-05-25/1d4b495ace513224eeffac7f7ab4bfbf.pdf"],
        ["搜狐：InfoComm China 2023 参展报道", "https://m.sohu.com/a/704497309_714642"],
        ["思必驰官网：MT200 发布（2026-07）", "https://meeting.aispeech.com/"],
        ["经销商页：C60 规格与标价", "https://www.empirepro.com/products/ai-speech-aivis-c60"]],
  notes: "思必驰这页分两层。产品层是 C60，思必驰自己的 AI 双目追踪摄像头：官网写明双 1080P 镜头、110 度视场、8 阵列线性麦克风、多模态声像追踪，也就是先用语音定位找到发言人方向，再用视觉锁定，云台推特写跟踪，和场景一的链路很像，只是用在会议室。2023 年 7 月北京 InfoComm China 就已经展出，2024、2025 年继续参展；国内价格没公开，海外经销商标价约 2575 美元。算法层用它的线阵前端 SDK fespl 做对标：官方手册写明唤醒后会回调方位，可以拿同一段多通道录音直接比。部署芯片方面，思必驰有自研的太行芯片，TH1520 是双 DSP、常开毫瓦级，TH2608 加了 NPU；招股书说已适配 34 种芯片架构，侧重低功耗芯片。C60 和 fespl 具体用哪颗芯片、定位跑在哪个单元、资源和时延都没公开。另外，思必驰 2026 年 7 月新推了 MT200 追踪主机，用吊顶麦克风做声源定位，再和摄像机画面做视觉匹配，驱动 C40T、C60、C80 对准发言人，需要标定麦克风和摄像机位置。它代表了声像融合的方向，但阵列装在天花板、孔径大，和摄像机内置小阵列条件不同，所以作方向参照，不作效果对标。",
});

// ---------------- 第 3 页：竞品未公开时的参照（资源 + 效果） ----------------
function miniTable(s, x, y, colW, head, rows, fills) {
  const cellOpt = (o) => Object.assign({ fontFace: F, lang: "zh-CN", fontSize: 10.5, color: C.text, valign: "middle" }, o);
  const isNa = (t) => /^未公开|^未单列/.test(t);
  const hd = head.map((h) => ({ text: h, options: cellOpt({ bold: true, color: C.white, fill: { color: C.navy }, align: "center" }) }));
  const bd = rows.map((r, i) => r.map((v, j) => ({ text: v, options: cellOpt(Object.assign({ fill: { color: fills[i] } },
    j === 0 ? { bold: true, color: C.navy } : isNa(v) ? { color: C.slate } : {})) })));
  s.addTable([hd, ...bd], { x, y, w: colW.reduce((a, b) => a + b, 0), colW, rowH: [0.42, ...rows.map(() => 0.74)],
    margin: [0.03, 0.07, 0.03, 0.07], border: { type: "solid", pt: 0.7, color: C.line }, autoPage: false });
}
{
  const s = p.addSlide();
  s.background = { color: C.white };
  T(s, [{ text: "竞品对标丨", options: { color: C.mute } }, { text: "竞品未公开时的参照：资源与效果", options: { color: C.navy } }], { x: 0.5, y: 0.32, w: 10.6, h: 0.6, fontSize: 24, bold: true, valign: "middle" });
  s.addText("公开参照", { shape: p.shapes.ROUNDED_RECTANGLE, x: 11.35, y: 0.42, w: 1.48, h: 0.4, fill: { color: C.navy }, line: { type: "none" }, rectRadius: 0.2,
    fontFace: F, lang: "zh-CN", fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
  T(s, "两家竞品的定位模块均未公开内存、模型、算力与时延；以下为可查到原文数字的公开方案", { x: 0.5, y: 0.94, w: 12.3, h: 0.36, fontSize: 13, color: C.gray, valign: "middle" });

  // 左：资源参照
  const lx = 0.5, lw = 6.0, ty = 1.48;
  R(s, lx, ty, lw, 4.75, C.light, null, 0.1);
  T(s, "资源参照：设备端公开方案与竞品公开信息", { x: lx + 0.2, y: ty + 0.12, w: lw - 0.4, h: 0.3, fontSize: 12.5, bold: true, color: C.navy });
  miniTable(s, lx + 0.2, ty + 0.5, [1.55, 1.75, 1.05, 1.25], ["方案", "运行硬件", "内存", "算力"], [
    ["乐鑫 ESP-SR（4 麦 MVDR）", "ESP32-P4 400 MHz（物联网芯片）", "约 206 KB", "CPU 约 8%"],
    ["ODAS（8 麦 SRP-PHAT）", "树莓派 3（开发板，仅看量级）", "未单列", "单核约 14%"],
    ["萤石 C6Wi 4K / RK3", "C6Wi 系列 1.0T 算力；RK3 A55 + NPU 3T", "未公开", "未公开"],
    ["思必驰 C60 / DUI 前端", "未公开", "未公开", "未公开"],
  ], [C.white, C.white, C.amberL, C.amberL]);
  T(s, "传统方法在物联网芯片上约两百 KB 内存、CPU 不到 10%；竞品只公开了整机芯片信息", { x: lx + 0.2, y: ty + 3.92, w: lw - 0.4, h: 0.55, fontSize: 10.5, color: C.gray, valign: "middle" });

  // 右：效果参照
  const rx = 6.83, rw = 6.0;
  R(s, rx, ty, rw, 4.75, C.light, null, 0.1);
  T(s, "效果参照：IPDnet2（2025-09，实录小阵列）", { x: rx + 0.2, y: ty + 0.12, w: rw - 0.4, h: 0.3, fontSize: 12.5, bold: true, color: C.navy });
  miniTable(s, rx + 0.2, ty + 0.5, [1.55, 1.05, 1.5, 1.5], ["模型", "参数量", "计算量", "误差 / 漏检（5°）"], [
    ["SRP-DNN", "0.8 M", "7.7 GFLOPs/s", "1.6° / 18.6%"],
    ["IPDnet2-Tiny", "0.5 M", "0.2 GFLOPs/s", "1.6° / 17.4%"],
    ["IPDnet2-Small", "1.3 M", "0.9 GFLOPs/s", "1.4° / 13.5%"],
    ["IPDnet2-Large", "7.8 M", "13.9 GFLOPs/s", "1.2° / 10.5%"],
  ], [C.white, C.ice, C.ice, C.ice]);
  T(s, "RealMAN 实录，4 麦圆阵 r 3 cm + 中心麦，两人说话混合。2026 年新论文均未报参数量与计算量；仅用仿真训练在实录上 5° 内准确率 89% → 60%（RealMAN）",
    { x: rx + 0.2, y: ty + 3.92, w: rw - 0.4, h: 0.55, fontSize: 10.5, color: C.gray, valign: "middle" });

  const src = [["乐鑫 ESP-SR：DOA 文档", "https://docs.espressif.com/projects/esp-sr/en/latest/esp32p4/direction_of_arrival/README.html"],
    ["ODAS（arXiv 2103.03954）", "https://arxiv.org/abs/2103.03954"],
    ["IPDnet2（arXiv 2509.21900）", "https://arxiv.org/abs/2509.21900"],
    ["RealMAN（arXiv 2406.19959）", "https://arxiv.org/abs/2406.19959"],
    ["空间语音感知综述 2026-07（arXiv 2607.02296）", "https://arxiv.org/abs/2607.02296"]];
  T(s, src.map((r, i) => [{ text: "[" + (i + 1) + "] ", options: { color: C.mute } }, { text: r[0], options: { color: "2F6EB5", hyperlink: { url: r[1], tooltip: r[1] } } }, { text: i < src.length - 1 ? "　" : "" }]).flat(),
    { x: 0.5, y: 6.55, w: 12.33, h: 0.35, fontSize: 9 });
  s.addNotes("两家竞品都没有公开定位模块的内存、模型、算力和时延，这一页汇总可查到原文数字的公开方案。左边是资源参照：乐鑫的定位模块跑在 400 MHz 的物联网芯片上，四麦约 206 KB 内存、CPU 约 8%，是最接近产品芯片的数字；ODAS 跑在树莓派 3 上，八麦定位单核约 14%，树莓派是通用开发板，只看量级。竞品只公开了整机芯片：萤石 C6Wi 系列写的是专用芯片、1.0T 算力，RK3 是四核 A55 加 3T NPU。右边是效果参照：IPDnet2 是 2025 年 9 月的论文，用真实录音，阵列是半径 3 厘米的四麦圆阵加中心麦，和场景一的小阵列接近，同时给了参数量和计算量。Tiny 版 0.5 M 参数、每秒 0.2 GFLOPs，精度和 0.8 M 的 SRP-DNN 相当，计算量约为它的四十分之一。截至 2026 年 11 月，2026 年的新论文都没有报参数量和计算量，2026 年 7 月的综述汇总的最新实录方法也到 IPDnet2 为止。另外 RealMAN 的结果显示，只用仿真数据训练，在真实录音上 5 度内准确率从 89% 降到 60%。");
}

require("./zh_notes")(p, OUT);
