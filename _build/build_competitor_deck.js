// 声源定位竞品调研：摄像头“听声转向”与发言人跟踪
const pptxgen = require("pptxgenjs");
const path = require("path");
const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");

const OUT = path.join(__dirname, "声源定位竞品调研_听声转向与发言人跟踪.pptx");
const FONT = "Microsoft YaHei";
const NAVY = "17375E", TEXT = "1F2937", GRAY = "5B6B7F", LIGHT = "EEF2F7", LIGHT2 = "F6F8FB";
const RED = "C7000B", RED_L = "FBE9EA", TEAL = "1F7A68", TEAL_L = "E3F1EE", TEAL_M = "9FD0C4";
const AMBER = "B8691A", AMBER_L = "FBF0E3", BORDER = "CBD5E1", WHITE = "FFFFFF", ICE = "CADCFC", BLUE = "2F6EB5", BLUE_L = "E6EEF8";

const THEME = { name: "SSL Competitors", headFontFace: FONT, bodyFontFace: FONT,
  colors: { dk1: TEXT, lt1: WHITE, dk2: NAVY, lt2: LIGHT, accent1: NAVY, accent2: TEAL, accent3: RED,
    accent4: AMBER, accent5: BLUE, accent6: GRAY, hlink: BLUE, folHlink: "6B4FA0" } };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
pres.title = "声源定位竞品调研";
pres.author = "令狐雅熙";

pres.defineSlideMaster({ title: "CONTENT", background: { color: WHITE }, objects: [
  { placeholder: { options: { name: "title", type: "title", x: 0.55, y: 0.3, w: 12.25, h: 0.62, fontFace: FONT, fontSize: 20,
    bold: true, color: NAVY, valign: "middle", margin: 0 }, text: "" } },
  { text: { text: "声源定位竞品调研｜听声转向与发言人跟踪", options: { x: 0.55, y: 7.05, w: 6, h: 0.3, fontFace: FONT, fontSize: 9, color: "8A97A8", margin: 0 } } },
], slideNumber: { x: 12.3, y: 7.05, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 9, color: "8A97A8", align: "right" } });
pres.defineSlideMaster({ title: "SECTION", background: { color: NAVY }, objects: [] });

function T(slide, text, o) {
  slide.addText(text, Object.assign({ fontFace: FONT, fontSize: 13, color: TEXT, isTextBox: true, margin: 0, valign: "top", paraSpaceAfter: 0 }, o));
}
function title(slide, t, sub) {
  slide.addText(t, { placeholder: "title" });
  if (sub) T(slide, sub, { x: 0.55, y: 0.92, w: 12.25, h: 0.36, fontSize: 12, color: GRAY, valign: "middle" });
}
function box(slide, x, y, w, h, fill, line, name, radius) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: line ? { color: line, width: 1 } : { type: "none" },
    rectRadius: radius || 0.08, objectName: name });
}
function circleNum(slide, x, y, d, label, fill, fs) {
  slide.addText(label, { shape: pres.shapes.OVAL, x, y, w: d, h: d, fill: { color: fill || NAVY }, line: { type: "none" },
    fontFace: FONT, fontSize: fs || 12, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
}
function pill(slide, text, x, y, w, h, fill, color, fs) {
  slide.addText(text, { shape: pres.shapes.ROUNDED_RECTANGLE, x, y, w, h, fill: { color: fill }, line: { type: "none" }, rectRadius: h / 2,
    fontFace: FONT, fontSize: fs || 10.5, bold: true, color: color || WHITE, align: "center", valign: "middle", margin: 0 });
}
function bullets(items, fs, color, gap) {
  return items.map((it, i) => {
    const runs = Array.isArray(it) ? it : [{ text: it }];
    return runs.map((r, j) => ({ text: r.text, options: Object.assign({ fontSize: fs || 12.5, color: color || TEXT,
      bullet: j === 0 ? { indent: 12 } : undefined, breakLine: j === runs.length - 1 && i < items.length - 1,
      paraSpaceAfter: gap === undefined ? 5 : gap }, r.options || {}) }));
  }).flat();
}
function arrow(slide, x, y, w, h, opts) {
  slide.addShape(pres.shapes.LINE, Object.assign({ x, y, w, h, line: { color: (opts && opts.color) || "7A8899", width: 1.5, endArrowType: "triangle" } }, opts || {}));
}
const H = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY }, align: "center", valign: "middle" } });
function cell(t, o) { return { text: t, options: o || {} }; }
const EV = (g) => cell(g, { align: "center", bold: true, color: g.startsWith("A") ? TEAL : (g.startsWith("B") ? BLUE : AMBER) });
function table(slide, rows, o) {
  slide.addTable(rows, Object.assign({ fontFace: FONT, fontSize: 11.5, color: TEXT, valign: "middle",
    border: { type: "solid", pt: 0.75, color: BORDER }, margin: [0.04, 0.07, 0.04, 0.07] }, o));
}
function newSlide(sec) { return pres.addSlide({ masterName: "CONTENT", sectionTitle: sec }); }
const IMG = (n) => path.join(__dirname, "comp_imgs", n);
const U = {
  ezviz: "https://www.ezviz.com/cn/news/2342.html",
  quedan: "https://news.mydrivers.com/1/1037/1037251.htm",
  haiquePro: "https://item.jd.com/product/D78QATZcZDouWhWpFcPfEA.html",
  tapo: "https://www.tapo.com/en/product/smart-camera/tapo-c210/",
  mi: "https://www.mi.com/camera-360/specs",
  echo: "https://www.amazon.science/blog/the-science-behind-echo-show-10",
  cisco: "https://www.cisco.com/c/en/us/products/collateral/collaboration-endpoints/telepresence-speaker-track-60/datasheet-c78-729836.html",
  logi: "https://www.logitech.com/en-us/products/video-conferencing/room-solutions/rallybar.960-001308.html",
  logiPR: "https://www.businesswire.com/news/home/20220201005427/en",
  jabra: "https://www.jabra.com/en-ie/business/video-conferencing/jabra-panacast-50",
  owl: "https://owllabs.com/products/meeting-owl-3",
  poly: "https://www.hp.com/us-en/poly/conference-rooms/video-bars/studio-x70.html",
  ideahub: "https://e.huawei.com/eu/products/enterprise-collaboration/ideahub/ideahub-es2-plus",
  ideahubNews: "https://e.huawei.com/id/news/apac/ideahub-curating-new-collaboration-experiences",
  xmos: "https://xmos.com/documentation/XM-014888-PC/html/modules/fwk_xvf/doc/datasheet/03_audio_pipeline.html",
  respeaker: "https://wiki.seeedstudio.com/respeaker_xvf3800_introduction/",
  ciscoQuad: "https://www.webex.com/us/en/devices/cameras.html",
  owl4: "https://resources.owllabs.com/hubfs/Website%20Pages%20-%20Files%20-%20Images/pdp/mo4-plus-datasheet/datasheet_mo34_plus_en.pdf",
  miC700: "https://www.mi.com/global/product/xiaomi-smart-camera-c700/",
  miC700faq: "https://www.mi.com/uk/support/faq/details/KA-502853/",
  ideahubB3: "https://download.discomp.cz/Huawei/Datasheets/IdeaHub_B3.pdf",
  echoEOL: "https://www.ifixit.com/Device/Amazon_Echo_Show_10_3rd_Gen",
};
const EVC = (g) => (g.startsWith("A") ? TEAL : (g.startsWith("B") ? BLUE : AMBER));
// 表格里的“证据 + 可点击来源”单元格
const EVL = (g, label, url) => ({ text: [{ text: g + "　", options: { bold: true, color: EVC(g) } },
  { text: label + " ↗", options: { color: BLUE, hyperlink: { url, tooltip: url } } }], options: { align: "center" } });
// 产品卡片：左图右文
function productCard(s, x, y, w, h, it) {
  box(s, x, y, w, h, LIGHT2, BORDER, "卡片" + it.name, 0.08);
  const iw = 1.72;
  s.addShape(pres.shapes.RECTANGLE, { x: x + 0.14, y: y + 0.14, w: iw, h: iw, fill: { color: WHITE }, line: { color: "DCE3EC", width: 0.75 }, objectName: "图框" + it.name });
  if (it.img) {
    s.addImage({ path: IMG(it.img), x: x + 0.16, y: y + 0.16, w: iw - 0.04, h: iw - 0.04, altText: it.name + " 产品图（来源：" + it.cap + "）", objectName: "产品图" + it.name });
  } else {
    T(s, it.noimg, { x: x + 0.22, y: y + 0.14, w: iw - 0.16, h: iw, fontSize: 10.5, color: GRAY, align: "center", valign: "middle" });
  }
  T(s, it.img ? "图：" + it.cap : "", { x: x + 0.14, y: y + 0.14 + iw + 0.03, w: iw, h: 0.42, fontSize: 8.5, color: "8A97A8" });
  const tx = x + 0.14 + iw + 0.16, tw = w - iw - 0.42;
  T(s, it.name, { x: tx, y: y + 0.12, w: tw, h: 0.6, fontSize: 12.5, bold: true, color: NAVY });
  T(s, bullets(it.facts, 10.5, TEXT, 2), { x: tx, y: y + 0.74, w: tw, h: h - 1.2 });
  T(s, [{ text: "证据 " + it.ev + "　", options: { bold: true, color: EVC(it.ev) } }, { text: it.linkText + " ↗", options: { color: BLUE, hyperlink: { url: it.url, tooltip: it.url } } }],
    { x: tx, y: y + h - 0.46, w: tw, h: 0.34, fontSize: 10.5, valign: "middle" });
}
function gallery(s, items) {
  const w = 3.97, h = 2.62, gx = 0.17, gy = 0.16;
  items.forEach((it, i) => {
    const x = 0.55 + (i % 3) * (w + gx), y = 1.36 + Math.floor(i / 3) * (h + gy);
    if (it.kind === "note") {
      box(s, x, y, w, h, TEAL_L, null, "观察卡", 0.08);
      T(s, it.title, { x: x + 0.22, y: y + 0.16, w: w - 0.4, h: 0.4, fontSize: 13.5, bold: true, color: TEAL });
      T(s, bullets(it.lines, 11, TEXT, 4), { x: x + 0.22, y: y + 0.62, w: w - 0.4, h: h - 0.75 });
    } else productCard(s, x, y, w, h, it);
  });
}
const EVNOTE = "证据等级：A 官方技术文档 / 技术博客；B 官方产品页、新闻稿、数据表；C 电商页、第三方评测、社区";

// 1. 封面
pres.addSection({ title: "概览" });
{
  const s = pres.addSlide({ masterName: "SECTION", sectionTitle: "概览" });
  [2.4, 1.65, 0.95].forEach((r, i) => s.addShape(pres.shapes.OVAL, { x: 10.9 - r, y: 3.75 - r, w: 2 * r, h: 2 * r,
    fill: { type: "none" }, line: { color: ["2B4E78", "3A6390", "5582B3"][i], width: 1.5 }, objectName: "声波" + i }));
  s.addShape(pres.shapes.OVAL, { x: 10.68, y: 3.53, w: 0.44, h: 0.44, fill: { color: RED }, line: { type: "none" }, objectName: "声源" });
  T(s, "声源定位（SSL）调研 · 竞品篇", { x: 0.8, y: 2.25, w: 8, h: 0.45, fontSize: 15, color: ICE });
  T(s, "摄像头“听声转向”竞品调研", { x: 0.8, y: 2.75, w: 8.8, h: 0.9, fontSize: 36, bold: true, color: WHITE });
  T(s, "消费级云台摄像头 · 智能屏与机器人 · 会议摄像头 · 芯片与方案", { x: 0.8, y: 3.75, w: 8.8, h: 0.5, fontSize: 18, color: ICE });
  T(s, "汇报人：令狐雅熙　　2026.11", { x: 0.8, y: 6.4, w: 6, h: 0.4, fontSize: 12, color: ICE });
  s.addNotes("这部分是场景一的竞品调研，覆盖四类产品：消费级云台摄像头、智能屏和家庭机器人、会议摄像头，以及芯片和算法方案。所有信息都标了证据等级，便于判断可信度。");
}

// 2. 结论先行
{
  const s = newSlide("概览");
  title(s, "四个发现：听声转向在家用摄像头仍属少数，成熟产品都靠“声学粗定位 + 视觉确认”");
  const f = [
    ["1", "家用云台摄像头：听声转向仍是少数型号功能", "萤石 C6C 无极巡航版（2019，3 麦 360°）、华为智选海雀雀蛋 Pro（2025，双麦 + 音画追踪）有此功能；主流型号多为“声音 / 哭声告警 + 画面移动追踪”", "差异化空间仍在", TEAL],
    ["2", "成熟产品都是“声学粗定位 + 视觉确认”", "Echo Show 10、Cisco、Logitech、Jabra、Owl 等均把麦克风阵列定位与人脸 / 人形检测结合，未见只靠声学的方案", "印证视听融合路线", TEAL],
    ["3", "墙面反射导致转错是公认痛点", "Amazon 官方指出噪声、多人和墙面反射会让波束偏离说话人；Echo Show 10 需用户划定运动范围，评测仍见转错", "干扰表 + 视觉复核必须做", AMBER],
    ["4", "定位能力正在下沉到芯片", "Amazon 在自研 AZ1 上端侧运行声学定位与视觉模型；XMOS 把测向做进语音处理芯片；IPC 芯片厂商公开资料未见此能力", "芯片级参考方案是机会（判断）", RED],
  ];
  f.forEach((q, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.55 + col * 6.2, y = 1.35 + row * 2.75, w = 6.05, h = 2.55;
    box(s, x, y, w, h, LIGHT, null, "发现" + q[0], 0.1);
    circleNum(s, x + 0.25, y + 0.25, 0.55, q[0], q[4], 14);
    T(s, q[1], { x: x + 0.95, y: y + 0.22, w: w - 1.15, h: 0.6, fontSize: 15, bold: true, color: NAVY, valign: "middle" });
    T(s, q[2], { x: x + 0.3, y: y + 0.95, w: w - 0.55, h: 1.0, fontSize: 12.5 });
    pill(s, "→ " + q[3], x + 0.3, y + 1.95, 3.3, 0.38, q[4], WHITE, 11);
  });
  s.addNotes("先说四个发现。第一，家用云台摄像头里，听声转向还是少数型号的功能，主流产品只做声音告警加画面追踪，说明有差异化空间。第二，做得最成熟的产品——Echo Show 10 和各家会议摄像头——都是声学粗定位加视觉确认，没有只靠声学的，这印证了我们的视听融合路线。第三，墙面反射导致转错方向是公认痛点，连 Amazon 都要用户手动划定运动范围。第四，定位能力正在下沉到芯片：Amazon 在自研芯片上端侧跑，XMOS 做进了语音芯片，而 IPC 芯片厂商的公开资料里没看到，这可能是我们的机会，这一点是我的判断。");
}

// 3. 范围与方法
{
  const s = newSlide("概览");
  title(s, "调研范围：四类产品覆盖“家用—会议—芯片”，每条信息标注证据等级");
  const cats = [
    ["消费级云台摄像头", "与场景一形态最接近", ["萤石 C6C 无极巡航版", "华为智选 海雀雀蛋 Pro / 海雀 Pro", "TP-Link Tapo C210 / C212", "小米智能摄像机 C700"], NAVY, LIGHT],
    ["智能屏与家庭机器人", "家用场景的视听融合标杆", ["Amazon Echo Show 10（已停产）", "Amazon Astro"], TEAL, TEAL_L],
    ["会议摄像头", "发言人跟踪最成熟的品类", ["Cisco Quad Camera（前代 SpeakerTrack 60）", "Logitech Rally Bar", "Poly Studio X70", "Jabra PanaCast 50", "Owl Labs Meeting Owl 4+", "华为 IdeaHub"], BLUE, BLUE_L],
    ["芯片与算法方案", "能力下沉的方向", ["Amazon AZ1 Neural Edge", "XMOS XVF3800", "思必驰、声智（算法方案商）", "IPC SoC 厂商（公开资料）"], AMBER, AMBER_L],
  ];
  cats.forEach((c, i) => {
    const x = 0.55 + i * 3.1, w = 2.9, y = 1.4, h = 4.55;
    box(s, x, y, w, h, c[4], null, "类别" + i, 0.1);
    circleNum(s, x + 0.2, y + 0.22, 0.5, String(i + 1), c[3], 13);
    T(s, c[0], { x: x + 0.85, y: y + 0.18, w: w - 0.95, h: 0.6, fontSize: 14, bold: true, color: c[3], valign: "middle" });
    T(s, c[1], { x: x + 0.2, y: y + 0.9, w: w - 0.4, h: 0.35, fontSize: 11.5, color: GRAY });
    T(s, bullets(c[2], 12.5, TEXT, 6), { x: x + 0.2, y: y + 1.4, w: w - 0.35, h: h - 1.55 });
  });
  const ev = [["A", "官方技术文档 / 技术博客", TEAL], ["B", "官方产品页、新闻稿、数据表", BLUE], ["C", "电商页、第三方评测、社区", AMBER]];
  T(s, "证据等级", { x: 0.55, y: 6.2, w: 1.2, h: 0.4, fontSize: 12.5, bold: true, color: NAVY, valign: "middle" });
  ev.forEach((e, i) => {
    circleNum(s, 1.75 + i * 3.6, 6.22, 0.36, e[0], e[2], 11);
    T(s, e[1], { x: 2.2 + i * 3.6, y: 6.2, w: 3.1, h: 0.4, fontSize: 12, valign: "middle" });
  });
  s.addNotes("调研分四类：消费级云台摄像头和场景一形态最接近；智能屏和家庭机器人是家用场景视听融合的标杆，主要是 Amazon；会议摄像头是发言人跟踪最成熟的品类；最后看芯片和算法方案，判断能力下沉的方向。每条信息我都标了证据等级：A 是官方技术文档或技术博客，B 是官方宣传和数据表，C 是电商页、第三方评测和社区。");
}

// 3b / 3c. 产品一览（图）
pres.addSection({ title: "产品一览" });
{
  const s = newSlide("产品一览");
  title(s, "产品一览①：家用摄像头与智能屏——听声转向仍属少数，Echo Show 10 是最好的技术参照",
    "图片来自各厂商官网或发布会报道，仅供内部调研；点击“↗”打开来源");
  gallery(s, [
    { name: "萤石 C6C 无极巡航版（2019）", img: "ezviz_c6c.jpg", cap: "萤石官方资讯", facts: ["3 麦，360° 声源定位，转向声源拍摄", "人形追踪、巡航追踪", "追踪转速最高 120°/s"], ev: "A/B", linkText: "官方资讯", url: U.ezviz },
    { name: "华为智选 海雀雀蛋 Pro（2025）", img: "quedan_pro.jpg", cap: "快科技发布会报道", facts: ["双麦 + 自研音频算法，“C 位音画追踪”", "“海雀海雀”唤醒后转向说话人", "评测称正面 180° 内识别；399 元起"], ev: "C", linkText: "发布会报道", url: U.quedan },
    { name: "Amazon Echo Show 10（2021，已停产）", img: "echo_show10.jpg", cap: "Amazon Science 官方透视图", facts: ["声源定位 + 视觉融合，转屏跟随", "死区 / 保持区 / 运动区；AZ1 端侧处理", "零售商与 iFixit 标注已停产"], ev: "A", linkText: "官方技术博客", url: U.echo },
    { name: "TP-Link Tapo C210", img: "tapo_c210.jpg", cap: "TP-Link 官网", facts: ["哭声检测", "移动追踪：跟随画面中的移动目标", "未见声源定位"], ev: "B", linkText: "官网", url: U.tapo },
    { name: "小米智能摄像机 C700（2024）", img: "mi_c700.jpg", cap: "小米官网", facts: ["4K，双电机云台 360° / 110°", "响声、哭声、玻璃破碎检测 + 人形追踪", "未见声源定位"], ev: "B", linkText: "官网", url: U.miC700 },
    { kind: "note", title: "一眼看出的差异", lines: ["萤石：3 麦，覆盖 360°", "雀蛋 Pro：双麦，宣称正面 180°——与我们“2 麦只能测 0–180°”的仿真结论一致", "唤醒后转向已有先例：雀蛋 Pro（“海雀海雀”）、Echo Show 10（已停产）", "Tapo、小米 C700：只有声音检测 + 视觉追踪"] },
  ]);
  s.addNotes("这页先把家用竞品放在一起看。萤石 C6C 无极巡航版是 3 麦、360 度声源定位，官方资讯可查。华为智选海雀的雀蛋 Pro 是 2025 年 3 月发布的，双麦加自研音频算法，主打“C 位音画追踪”，喊“海雀海雀”就会转向说话人；有体验文章说它在正面 180 度范围内识别，这正好和我们仿真里 2 麦只能覆盖 0 到 180 度的结论一致。Echo Show 10 是声学加视觉融合，最接近我们的场景。Tapo 和小米只有视觉追踪。点击每张卡片右下角的链接可以打开来源。");
}
{
  const s = newSlide("产品一览");
  title(s, "产品一览②：会议设备与芯片方案——多麦阵列 + 视觉确认已是标配，测向能力在下沉到芯片",
    "图片来自各厂商官网或官方 Wiki，仅供内部调研；点击“↗”打开来源");
  gallery(s, [
    { name: "Cisco Quad Camera（现行）", img: "cisco_quad.jpg", cap: "Webex / Cisco 官网", facts: ["内置 8 麦阵列，专用于 SpeakerTrack 计算", "人脸检测确认发言人", "前代 SpeakerTrack 60 双摄方案已下线"], ev: "B/C", linkText: "官网", url: U.ciscoQuad },
    { name: "Logitech Rally Bar（RightSight 2）", img: "logi_rallybar.jpg", cap: "Logitech 官网", facts: ["Speaker View（2022）：音频 + 双摄识别发言人", "画中画同时显示全景", "6 麦波束成形（零售规格）"], ev: "B", linkText: "官网", url: U.logi },
    { name: "Jabra PanaCast 50", img: "jabra_pc50.jpg", cap: "Jabra 官网", facts: ["8 个波束成形麦克风", "180° 视场", "Virtual Director 实时聚焦发言人"], ev: "B", linkText: "官网", url: U.jabra },
    { name: "Owl Labs Meeting Owl 4+（2024）", img: "owl4.jpg", cap: "Owl Labs 官网", facts: ["360° 4K 鱼眼，64 MP 传感器", "8 个全向麦，拾音半径 5.5 m", "结合视觉、声音、动作聚焦说话人"], ev: "B", linkText: "官方数据表", url: U.owl4 },
    { name: "华为 IdeaHub ES2 Plus", img: "ideahub_es2plus.jpg", cap: "华为企业业务官网", facts: ["12 麦阵列，12 m 波束成形拾音；智能跟踪 3.0", "B3 数据表：发言人跟踪即智能声源定位，保持发言人居中", "集团内产品，可内部请教"], ev: "B", linkText: "官网", url: U.ideahub },
    { name: "XMOS XVF3800 语音处理芯片", img: "xmos_respeaker.jpg", cap: "Seeed ReSpeaker XVF3800 评估板（Seeed Wiki）", facts: ["1 个扫描波束 + 2 个跟踪波束", "主机可读取各波束方位角", "常用 4 麦圆阵，360° 测向"], ev: "A", linkText: "官方文档", url: U.xmos },
  ]);
  s.addNotes("第二页是会议设备和芯片方案。会议设备的共同点是多麦阵列做粗定位、摄像头人脸检测确认发言人，Cisco 还用双摄预先对准下一位，保证切换平滑。值得一提的是 Cisco SpeakerTrack 60 的官网页已经下线了，说明这一代产品已经迭代。华为自己的 IdeaHub ES2 Plus 官网写的是 12 麦阵列、12 米波束成形拾音和智能跟踪 3.0，是集团内产品，可以内部请教。最后是 XMOS 的语音处理芯片，把测向直接做进芯片：一个波束扫描新说话人，两个波束负责跟踪，主机可以直接读方位角，图里是 Seeed 基于它做的 4 麦评估板。");
}

// 4. 消费级云台摄像头
pres.addSection({ title: "产品分析" });
{
  const s = newSlide("产品分析");
  title(s, "家用云台摄像头：仅少数型号能“听声转向”，华为智选雀蛋 Pro 已走向“音画追踪”");
  const hl = (t, o) => cell(t, Object.assign({ fill: { color: TEAL_L } }, o || {}));
  table(s, [
    [H("产品"), H("声学能力"), H("视觉能力"), H("转向 / 追踪"), H("证据")],
    [hl("萤石 C6C 无极巡航版\n（2019）", { bold: true }), hl("3 麦设计，360° 声源定位，判定声源位置后转向拍摄"), hl("人形追踪、巡航追踪"), hl("水平 360° 连续旋转；追踪最高 120°/s"), Object.assign(EVL("A/B", "官方资讯", U.ezviz), {})],
    [hl("华为智选 海雀雀蛋 Pro\n（2025）", { bold: true }), hl("双麦 + 自研音频算法；“海雀海雀”唤醒后感知声源并转向；评测称正面 180° 内识别"), hl("“C 位音画追踪”、无极追踪；4K"), hl("399 元起；2025-03 发布"), EVL("C", "发布会报道", U.quedan)],
    [hl("华为智选 海雀智能摄像头 Pro\n（2024）", { bold: true }), hl("商品页宣传声源定位，可配合语音唤醒控制云台；哭声与异常声识别"), hl("AI 人形侦测、移动追踪"), hl("评测称搭载海思芯片"), EVL("C", "商品页", U.haiquePro)],
    [cell("TP-Link Tapo C210 / C212", { bold: true }), "哭声检测", "移动追踪：自动跟随移动目标", "视觉追踪", EVL("B", "官网", U.tapo)],
    [cell("小米智能摄像机 C700\n（2024）", { bold: true }), "响声、哭声、玻璃破碎检测；未见声源定位", "AI 人形检测与追踪", "双电机云台 360° / 110°", EVL("B", "官方 FAQ", U.miC700faq)],
  ], { x: 0.55, y: 1.4, w: 12.25, colW: [2.7, 3.75, 2.25, 2.05, 1.5], rowH: [0.42, 0.72, 0.82, 0.72, 0.5, 0.5], fontSize: 11.5 });
  box(s, 0.55, 5.55, 12.25, 1.15, LIGHT2, BORDER, "启示", 0.08);
  T(s, [{ text: "启示　", options: { bold: true, color: NAVY } },
    { text: "萤石 2019 年已有 3 麦 360° 声源定位，但主流家用型号多年后仍以视觉追踪为主；2025 年雀蛋 Pro 用双麦做“音画追踪”，说明华为生态已在推进。双麦只能覆盖正面 180°，若要 360° 听声转向，需 3–4 麦（见主方案阵列页）。" }],
    { x: 0.8, y: 5.55, w: 11.8, h: 1.15, fontSize: 13, valign: "middle" });
  s.addNotes("家用云台摄像头里，有明确证据能听声转向的不多。萤石 C6C 无极巡航版，官方资讯写明 3 麦设计、360 度声源定位，判定声源后转向拍摄，追踪最高每秒 120 度，这是 2019 年的产品。华为智选海雀雀蛋 Pro 是 2025 年发布的，双麦加自研音频算法，主打 C 位音画追踪，喊“海雀海雀”会转向说话人，评测称正面 180 度内识别；2024 年的海雀 Pro 商品页也宣传了声源定位，这两条都只有媒体和电商资料，证据等级是 C。主流型号像 Tapo C210 和小米 C700，官方资料写的是哭声、响声检测加人形追踪，没有声源定位。启示是：主流仍以视觉追踪为主，听声转向的成本和误转体验还没被很好解决；雀蛋 Pro 说明华为生态已经在推进，但双麦只能覆盖正面 180 度。");
}

// 5. Echo Show 10
{
  const s = newSlide("产品分析");
  title(s, "标杆拆解 Echo Show 10：声学定位 + 视觉确认 + 分区运动控制，全部端侧完成",
    "来源：Amazon Science 官方技术博客（证据等级 A），评测补充（C）；产品 2021 年发布，零售商与 iFixit 标注已停产，仍是最好的公开技术参照");
  s.addImage({ path: IMG("echo_xray_wide.png"), x: 0.55, y: 1.38, w: 4.95, h: 4.95 * 630 / 1200, altText: "Echo Show 10 透视图（Amazon Science）", objectName: "Echo透视图" });
  T(s, [{ text: "图：Echo Show 10 透视图（Amazon Science 官方）", options: { color: "8A97A8" } }], { x: 0.55, y: 4.02, w: 4.95, h: 0.25, fontSize: 9 });
  // 三区示意
  const cx = 3.0, cy = 6.62, Rr = 2.15;
  const pie = (a0, a1, col, nm) => s.addShape(pres.shapes.PIE, { x: cx - Rr, y: cy - Rr, w: 2 * Rr, h: 2 * Rr, angleRange: [a0, a1],
    fill: { color: col }, line: { color: WHITE, width: 1.5 }, objectName: nm });
  pie(225, 240, RED_L, "运动区左"); pie(300, 315, RED_L, "运动区右");
  pie(240, 258, AMBER_L, "保持区左"); pie(282, 300, AMBER_L, "保持区右");
  pie(258, 282, TEAL_L, "死区");
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx - 0.32, y: cy - 0.12, w: 0.64, h: 0.38, fill: { color: NAVY }, line: { type: "none" }, rectRadius: 0.06, objectName: "设备" });
  T(s, "死区", { x: cx - 0.5, y: cy - 2.05, w: 1.0, h: 0.28, fontSize: 10.5, bold: true, color: TEAL, align: "center" });
  T(s, "保持区", { x: cx - 1.3, y: cy - 1.85, w: 0.8, h: 0.28, fontSize: 10.5, bold: true, color: AMBER, align: "center" });
  T(s, "保持区", { x: cx + 0.5, y: cy - 1.85, w: 0.8, h: 0.28, fontSize: 10.5, bold: true, color: AMBER, align: "center" });
  T(s, "运动区", { x: cx - 2.1, y: cy - 1.4, w: 0.8, h: 0.28, fontSize: 10.5, bold: true, color: RED, align: "center" });
  T(s, "运动区", { x: cx + 1.3, y: cy - 1.4, w: 0.8, h: 0.28, fontSize: 10.5, bold: true, color: RED, align: "center" });
  T(s, [{ text: "运动三区：", options: { bold: true, color: NAVY } }, { text: "死区不动 · 保持区停稳后才转 · 运动区立即跟随" }],
    { x: 0.55, y: 4.3, w: 4.95, h: 0.28, fontSize: 10.5 });
  // 事实与对照
  table(s, [
    [H("官方披露的做法"), H("对应本方案")],
    [cell([{ text: "声学 + 视觉融合：", options: { bold: true } }, { text: "声源定位（声波分解 + 机器学习）与视觉识别人体融合，区分人声与墙面反射" }]), cell("E1 视听融合、视觉复核", { color: TEAL, bold: true })],
    [cell([{ text: "不用波束选择直接驱动转动：", options: { bold: true } }, { text: "噪声、多人和反射会让最佳波束偏离说话人" }]), cell("独立的测向 + 跟踪模块", { color: TEAL, bold: true })],
    [cell([{ text: "抗反射：", options: { bold: true } }, { text: "设置时由用户划定运动范围，范围外的声音被忽略" }]), cell("干扰方向表、运动范围设置", { color: TEAL, bold: true })],
    [cell([{ text: "运动约束：", options: { bold: true } }, { text: "角速度 ≤ 180°/s、角加速度 ≤ 360°/s²，碰到障碍物即停" }]), cell("云台速度 / 加速度限制", { color: TEAL, bold: true })],
    [cell([{ text: "视觉：", options: { bold: true } }, { text: "10 英尺内精确率 > 95%；时空滤波抑制运动模糊误检" }]), cell("视觉确认阈值与滤波", { color: TEAL, bold: true })],
    [cell([{ text: "隐私与算力：", options: { bold: true } }, { text: "在自研 AZ1 Neural Edge 上端侧处理，图像转为特征点后删除" }]), cell("全链路端侧处理", { color: TEAL, bold: true })],
    [cell([{ text: "评测反馈（C）：", options: { bold: true, color: AMBER } }, { text: "不限制运动范围时，常因附近表面反射转错方向" }]), cell("误转率专项测试", { color: AMBER, bold: true })],
  ], { x: 5.75, y: 1.4, w: 7.05, colW: [5.0, 2.05], rowH: [0.42, 0.68, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6], fontSize: 11.5 });
  s.addNotes("Echo Show 10 是和场景一最像的家用产品：一块会转的屏幕，听到唤醒词转向你，视频通话时跟着你。Amazon 的官方技术博客披露了很多细节。第一，它是声源定位加视觉融合，视觉用来区分真人和墙面反射。第二，他们明确说波束选择不适合直接驱动转动，因为噪声、多人和反射会让波束偏。第三，用户设置时划定运动范围来抗反射。第四，运动控制分三区：中央死区不动，保持区等人停稳再转，边缘运动区立即跟随，这和我们的死区加确认帧数的设计一致，可以直接借鉴。第五，全部在自研的 AZ1 芯片上端侧处理。评测里也提到，不限制范围时常因为反射转错，所以误转一定要专项测试。");
}

// 6. 会议摄像头
{
  const s = newSlide("产品分析");
  title(s, "会议摄像头：发言人跟踪已形成“多麦阵列粗定位 + 人脸确认 + 平滑切换”的成熟范式");
  table(s, [
    [H("产品"), H("麦克风"), H("摄像头"), H("跟踪方式"), H("证据")],
    [cell("Cisco Quad Camera（现行）\n前代 SpeakerTrack 60", { bold: true }), "内置 8 麦阵列，只用于 SpeakerTrack 计算（不传输音频）", "四镜头（前代为双摄）", "麦阵定位说话人大致位置，人脸检测确认；前代双摄可预先对准下一位，切换平滑", EVL("B/C", "官网", U.ciscoQuad)],
    [cell("Logitech Rally Bar\n（RightSight 2，2022）", { bold: true }), "6 麦波束成形（零售规格）", "双摄像头", "Speaker View：音频 + 视觉识别当前发言人，画中画同时显示全景", EVL("B", "发布稿", U.logiPR)],
    [cell("Jabra PanaCast 50", { bold: true }), "8 个波束成形麦克风", "180° 视场", "Virtual Director 实时聚焦当前发言人", EVL("B", "官网", U.jabra)],
    [cell("Owl Labs Meeting Owl 4+\n（2024）", { bold: true }), "8 个全向麦，拾音半径 5.5 m", "360° 4K", "结合视觉、声音、动作自动聚焦说话人", EVL("B", "数据表", U.owl4)],
    [cell("Poly Studio X70\n（DirectorAI）", { bold: true }), "二阶梯度麦克风阵列", "—", "发言人跟踪；二手资料称“人脸识别 + 麦克风三角定位”", EVL("C", "产品页", U.poly)],
    [cell("华为 IdeaHub\n（ES2 Plus）", { bold: true }), "12 麦阵列；ES2 Plus 官网：12 m 波束成形拾音", "4K，三摄", "智能跟踪 3.0、发言人跟踪", EVL("B", "官网", U.ideahub)],
  ], { x: 0.55, y: 1.4, w: 12.25, colW: [2.45, 2.65, 1.35, 4.35, 1.45], rowH: [0.45, 0.85, 0.75, 0.55, 0.55, 0.7, 0.55], fontSize: 11.5 });
  const take = [
    ["多麦大孔径", "6–12 麦，孔径远大于家用摄像头，定位更稳", NAVY],
    ["视觉确认", "声学只给大致位置，人脸检测决定“是谁”", TEAL],
    ["平滑切换", "双摄预对准、画中画，避免画面来回甩", BLUE],
  ];
  take.forEach((t, i) => {
    const x = 0.55 + i * 4.17;
    box(s, x, 5.95, 3.95, 0.8, LIGHT, null, "范式" + i, 0.08);
    T(s, [{ text: t[0] + "　", options: { bold: true, color: t[2] } }, { text: t[1] }], { x: x + 0.2, y: 5.95, w: 3.6, h: 0.8, fontSize: 12, valign: "middle" });
  });
  s.addNotes("会议摄像头是发言人跟踪最成熟的品类。Cisco 的做法最典型：现行的 Quad Camera 内置 8 麦阵列，只用来算发言人方向，不传输音频，再用人脸检测确认是谁在说话；前代 SpeakerTrack 60 还用第二个摄像头预先对准下一位发言人，让切换更平滑，这一代官网页已经下线。Logitech、Jabra、Owl（已更新到 Meeting Owl 4+）、Poly 和华为 IdeaHub 都有类似功能，IdeaHub B3 的数据表直接把发言人跟踪写成智能声源定位。共性有三点：多麦大孔径、视觉确认、平滑切换。和家用摄像头相比，我们只有 2 到 4 个麦、孔径小、成本低，所以更要依赖跟踪和视觉。IdeaHub 是华为自己的产品，经验可以内部请教。");
}

// 7. 芯片与方案
{
  const s = newSlide("产品分析");
  title(s, "芯片与方案层：定位能力正在下沉，要么自研 SoC 端侧运行，要么做进语音前端芯片");
  const cards = [
    ["Amazon AZ1 Neural Edge", "自研 SoC", "Echo Show 10 在其上端侧运行声学定位与视觉模型，图像不出设备", "A", TEAL],
    ["XMOS XVF3800", "语音处理芯片", "1 个自由扫描波束 + 2 个聚焦跟踪波束；主机可读取各波束方位角；常用 4 麦圆阵，360° 测向", "A", TEAL],
    ["思必驰 / 声智", "算法方案商", "线阵 / 环阵定向拾音，声纹 + DOA 联合判定说话人（见原调研 PPT 代表企业页）", "B", BLUE],
    ["IPC SoC 厂商", "公开资料", "本次检索未找到把声源定位作为标准 SDK 能力公开宣传的资料【待内部确认】", "C", AMBER],
  ];
  cards.forEach((c, i) => {
    const x = 0.55 + i * 3.1, w = 2.9, y = 1.4, h = 3.6;
    box(s, x, y, w, h, LIGHT, null, "方案" + i, 0.1);
    pill(s, c[1], x + 0.2, y + 0.2, 1.5, 0.34, NAVY, WHITE, 10.5);
    circleNum(s, x + w - 0.55, y + 0.18, 0.38, c[3], c[4], 11);
    T(s, c[0], { x: x + 0.2, y: y + 0.7, w: w - 0.4, h: 0.65, fontSize: 14.5, bold: true, color: NAVY });
    T(s, c[2], { x: x + 0.2, y: y + 1.4, w: w - 0.4, h: 2.1, fontSize: 12.5 });
  });
  box(s, 0.55, 5.25, 12.25, 1.5, TEAL_L, null, "机会", 0.1);
  T(s, "对我们的启示（判断）", { x: 0.8, y: 5.35, w: 6, h: 0.35, fontSize: 13.5, bold: true, color: TEAL });
  T(s, bullets([
    "IPC 芯片若内置“测向 + 事件识别 + 视听融合”参考方案，整机厂无需再找算法商，是芯片层的差异化点",
    "算法设计要按芯片约束来：常开链路走低功耗通路，网络部分对齐 NPU 算子与量化",
  ], 12.5, TEXT, 4), { x: 0.8, y: 5.75, w: 11.8, h: 0.95 });
  s.addNotes("芯片和方案层能看到一个趋势：定位能力正在下沉。Amazon 用自研的 AZ1 芯片端侧运行声学定位和视觉模型；XMOS 的 XVF3800 语音芯片直接内置测向，一个波束负责扫描新说话人，两个波束负责跟踪，主机可以读出方位角。算法方案商有思必驰、声智。IPC 芯片厂商这边，我这次公开检索没找到把声源定位当标准 SDK 能力宣传的资料，这需要内部再确认。如果属实，对我们来说，在芯片里提供测向加事件识别加视听融合的参考方案，可能是一个差异化点，这是我的判断。");
}

// 8. 定位矩阵
pres.addSection({ title: "对比与启示" });
{
  const s = newSlide("对比与启示");
  title(s, "技术路线定位：家用产品开始走向音画融合，成熟的融合跟踪仍在会议设备与智能屏");
  const gx = 2.35, gy = 1.45, cw = 3.45, ch = 1.5;
  const xs = ["仅检测告警", "定位并转向", "定位 + 持续跟踪"], ys = ["视听融合", "视觉独立追踪", "无视觉"];
  xs.forEach((t, i) => T(s, t, { x: gx + i * cw, y: gy + 3 * ch + 0.08, w: cw, h: 0.35, fontSize: 12, bold: true, color: GRAY, align: "center" }));
  ys.forEach((t, j) => T(s, t, { x: 0.55, y: gy + j * ch, w: 1.7, h: ch, fontSize: 12, bold: true, color: GRAY, align: "right", valign: "middle" }));
  T(s, "声学作用 →", { x: 0.55, y: gy + 3 * ch + 0.08, w: 1.7, h: 0.35, fontSize: 11, color: GRAY, align: "right" });
  T(s, "视觉作用 ↑", { x: 0.55, y: gy - 0.05, w: 1.7, h: 0.3, fontSize: 11, color: GRAY, align: "right" });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const fill = (i === 2 && j === 0) ? TEAL_L : LIGHT2;
    s.addShape(pres.shapes.RECTANGLE, { x: gx + i * cw, y: gy + j * ch, w: cw - 0.06, h: ch - 0.06, fill: { color: fill },
      line: { color: "DCE3EC", width: 0.75 }, objectName: `格${i}${j}` });
  }
  const chip = (t, i, j, k, col, w) => pill(s, t, gx + i * cw + 0.15 + (k % 2) * 1.62, gy + j * ch + 0.18 + Math.floor(k / 2) * 0.45, w || 1.52, 0.36, col, WHITE, 10);
  chip("Tapo C210/C212", 0, 1, 0, GRAY); chip("乐橙等", 0, 1, 1, GRAY);
  chip("萤石 C6C 无极", 1, 1, 0, NAVY); chip("海雀 Pro（C）", 1, 1, 1, NAVY); chip("雀蛋 Pro（C）", 1, 0, 0, NAVY);
  chip("XMOS XVF3800", 2, 2, 0, AMBER);
  chip("Echo Show 10", 2, 0, 0, TEAL); chip("Cisco Quad", 2, 0, 1, BLUE); chip("Logitech", 2, 0, 2, BLUE); chip("Jabra / Owl", 2, 0, 3, BLUE);
  chip("华为 IdeaHub", 2, 0, 4, BLUE);
  // 目标
  pill(s, "★ 本方案目标", gx + 2 * cw + 1.77, gy + 0.18 + 2 * 0.45, 1.52, 0.36, RED, WHITE, 10.5);
  T(s, "绿色格为目标区：以家用摄像头的成本和阵列规模，做到智能屏 / 会议设备级的视听融合跟踪，并叠加事件识别（哭声、玻璃破碎、报警音）",
    { x: 0.55, y: 6.5, w: 12.25, h: 0.45, fontSize: 11.5, color: GRAY, valign: "middle" });
  s.addNotes("把所有产品放进一个三乘三的矩阵：横轴是声学的作用，从只做检测告警，到定位并转向，到定位加持续跟踪；纵轴是视觉的作用，从没有视觉，到视觉独立追踪，到视听融合。家用摄像头集中在中间偏下：萤石和海雀能声学转向，但视觉追踪是独立功能，没看到融合的说明。视听融合的持续跟踪集中在右上角，是 Echo Show 10 和会议设备。XMOS 是纯声学的定位加跟踪。我们的目标是右上角：用家用摄像头的成本和阵列规模，做到会议设备级的视听融合跟踪，再叠加事件识别。");
}

// 9. 痛点与对策
{
  const s = newSlide("对比与启示");
  title(s, "共性痛点有据可查：反射误转、多人干扰、自身回放、转动抖动、隐私顾虑");
  table(s, [
    [H("痛点"), H("公开证据"), H("本方案对策")],
    [cell("墙面反射导致转错方向", { bold: true }), "Amazon：反射会让波束偏离说话人；评测：Echo Show 10 不限制运动范围时常转错（A / C）", cell("干扰方向表 + 运动范围设置 + 视觉复核", { color: TEAL, bold: true })],
    [cell("多人与噪声下方向不稳", { bold: true }), "Amazon：噪声、多人会干扰波束选择；SSL 无法区分两个差异很大的方向时不转动（A）", cell("测向网络 + 跟踪器 + 说话人检测；低置信度不转", { color: TEAL, bold: true })],
    [cell("设备自身播放干扰跟踪", { bold: true }), "Cisco 社区：本地扩声会干扰发言人跟踪，不建议使用（C）", cell("对讲 / 播放期间门控测向，或用回声消除参考信号", { color: TEAL, bold: true })],
    [cell("转动抖动、来回甩", { bold: true }), "Echo Show 10 设计死区 / 保持区 / 运动区；Cisco 双摄预对准实现平滑切换（A / B）", cell("死区 + 确认帧数 + 速度 / 加速度限制", { color: TEAL, bold: true })],
    [cell("隐私顾虑", { bold: true }), "Echo Show 10 强调端侧处理、图像不上云（A）", cell("全链路端侧处理，只上传事件结果", { color: TEAL, bold: true })],
  ], { x: 0.55, y: 1.4, w: 12.25, colW: [2.7, 6.0, 3.55], rowH: [0.45, 0.85, 0.85, 0.75, 0.85, 0.7], fontSize: 12 });
  T(s, EVNOTE, { x: 0.55, y: 6.5, w: 12.25, h: 0.3, fontSize: 10, color: GRAY });
  s.addNotes("五个共性痛点都有公开证据。反射误转，Amazon 和评测都提到；多人和噪声下方向不稳，Amazon 甚至规定无法区分两个方向时不转动，这个低置信度不转的策略可以直接用；设备自己播放声音会干扰跟踪，Cisco 社区明确不建议本地扩声，对应我们在对讲或播放期间门控测向；转动抖动，Echo Show 10 用三区设计，Cisco 用双摄预对准；隐私方面都强调端侧处理。右列是我们的对策，大部分已经在方案里。");
}

// 10. 启示与机会
{
  const s = newSlide("对比与启示");
  title(s, "启示：以“稳、不乱转”为核心卖点，视听融合打底，事件识别增值，端侧芯片承载");
  const ops = [
    ["差异化", "把听声转向从少数高端型号变成芯片参考方案的标配能力（判断）", NAVY],
    ["技术路线", "声学粗定位 + 视觉确认是行业共识，对应方案 E1，应尽早规划", TEAL],
    ["体验设计", "借鉴 Echo Show 10：死区 / 保持区 / 运动区、运动范围设置、速度限制、低置信度不转", TEAL],
    ["安防价值", "定位 + 事件识别：Astro 已把玻璃破碎、烟雾 / CO 报警声检测做成订阅服务，说明有付费意愿", AMBER],
    ["隐私与功耗", "端侧处理 + 两级触发常开，契合家用隐私与低功耗要求", BLUE],
    ["内部协同", "IdeaHub 发言人跟踪、海雀雀蛋 Pro 音画追踪已有经验，建议内部请教", RED],
  ];
  ops.forEach((o, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.55 + col * 4.17, y = 1.4 + row * 2.7, w = 3.95, h = 2.45;
    box(s, x, y, w, h, LIGHT, null, "启示" + i, 0.1);
    circleNum(s, x + 0.25, y + 0.25, 0.55, String(i + 1), o[2], 14);
    T(s, o[0], { x: x + 0.95, y: y + 0.25, w: w - 1.1, h: 0.55, fontSize: 16, bold: true, color: o[2], valign: "middle" });
    T(s, o[1], { x: x + 0.25, y: y + 1.0, w: w - 0.5, h: 1.35, fontSize: 13 });
  });
  s.addNotes("总结成六条启示。差异化上，把听声转向做成芯片参考方案的标配；技术路线上，视听融合是共识；体验设计可以直接借鉴 Echo Show 10 的三区和低置信度不转；安防价值上，Astro 已经把玻璃破碎和烟雾报警声检测做成订阅服务，说明用户愿意付费，所以事件识别加定位有商业价值；隐私和功耗靠端侧加两级触发；最后，华为内部 IdeaHub 和海雀 Pro 已有经验，建议请教。");
}

// 11. 竞品实测方案
pres.addSection({ title: "下一步" });
{
  const s = newSlide("下一步");
  title(s, "下一步：竞品实测，用统一测试矩阵得到竞品基线，再据此定我们的指标");
  const steps = [
    ["样机", ["萤石带声源定位的云台型号", "海雀雀蛋 Pro（双麦，重点）", "普通云台摄像头作对照"]],
    ["场地", ["客厅类房间（RT60 约 0.4 s）", "空旷房间（RT60 约 0.8 s）", "地面贴量角标记"]],
    ["测试矩阵", ["8 个方位 × 3 个距离（1 / 2.5 / 4 m）", "安静 / 电视开启 / 靠墙", "真人说话、拍手、音箱播放哭声"]],
    ["指标", ["转向命中率（目标进画面中央一半）", "响应时延（手机 240 fps 录像计时）", "电视开启 1 小时误转次数"]],
    ["产出", ["竞品基线表", "据此确定我们的 KPI", "典型失效案例视频"]],
  ];
  steps.forEach((st, i) => {
    const x = 0.55 + i * 2.5, w = 2.3, y = 1.45, h = 3.65;
    box(s, x, y, w, h, i === 4 ? TEAL_L : LIGHT, null, "实测" + i, 0.1);
    circleNum(s, x + 0.2, y + 0.2, 0.5, String(i + 1), i === 4 ? TEAL : NAVY, 13);
    T(s, st[0], { x: x + 0.8, y: y + 0.2, w: w - 0.9, h: 0.5, fontSize: 15, bold: true, color: i === 4 ? TEAL : NAVY, valign: "middle" });
    T(s, bullets(st[1], 12.5, TEXT, 8), { x: x + 0.2, y: y + 0.95, w: w - 0.35, h: h - 1.1 });
    if (i < 4) arrow(s, x + w + 0.02, y + h / 2, 0.16, 0);
  });
  box(s, 0.55, 5.35, 12.25, 1.4, LIGHT2, BORDER, "补充调研", 0.08);
  T(s, "可继续补充的调研", { x: 0.8, y: 5.45, w: 6, h: 0.35, fontSize: 13.5, bold: true, color: NAVY });
  T(s, bullets([
    "专利检索：围绕“云台 + 麦克风阵列 + 声源定位 + 视觉确认”梳理主要厂商布局，规避风险、寻找空白",
    "用户评价挖掘：电商与社区中关于“乱转、转错、反应慢”的反馈，量化痛点频次",
  ], 12.5, TEXT, 4), { x: 0.8, y: 5.85, w: 11.8, h: 0.85 });
  s.addNotes("下一步建议做竞品实测：拿萤石带声源定位的型号、海雀雀蛋 Pro，再加一台普通云台摄像头作对照；在两个混响不同的房间里，按 8 个方位、3 个距离、3 种条件测；指标是转向命中率、响应时延和电视开启一小时的误转次数。产出竞品基线表，再据此定我们的 KPI。另外还可以补两项调研：专利检索和用户评价挖掘。");
}

// 12. 资料来源
{
  const s = newSlide("下一步");
  title(s, "资料来源");
  const src = [
    ["A", "Amazon Science：The science behind Echo Show 10", U.echo],
    ["A", "XMOS XVF3800 文档：Voice Processing Pipeline", U.xmos],
    ["A/B", "萤石官方资讯：C6C 无极巡航版 3 麦 360° 声源定位（2019-04-02）", U.ezviz],
    ["B", "华为 IdeaHub ES2 Plus 官网；IdeaHub 新闻稿（12 麦阵列、发言人跟踪）", U.ideahub],
    ["B", "Logitech RightSight 2 发布稿（2022-02-01）；Rally Bar 官网", U.logiPR],
    ["B", "Jabra PanaCast 50 官网", U.jabra],
    ["B/C", "Cisco / Webex 摄像头页（Quad Camera）；SpeakerTrack 60 数据表（已下线）", U.ciscoQuad],
    ["B", "Owl Labs Meeting Owl 4+ 官方数据表", U.owl4],
    ["B", "小米智能摄像机 C700 官网与官方 FAQ", U.miC700faq],
    ["B", "华为 IdeaHub B3 数据表（发言人跟踪 = 智能声源定位）", U.ideahubB3],
    ["C", "iFixit：Echo Show 10（3rd Gen）设备页（已停产）", U.echoEOL],
    ["B", "TP-Link Tapo C210 官网", U.tapo],
    ["C", "快科技：华为智选海雀雀蛋 Pro 发布会报道（2025-03）", U.quedan],
    ["C", "京东商品页：华为智选海雀智能摄像头 Pro", U.haiquePro],
    ["A", "Seeed Wiki：ReSpeaker XVF3800（评估板图片来源）", U.respeaker],
  ];
  const runs = src.map((r, i) => [
    { text: "[" + r[0] + "] ", options: { bold: true, color: EVC(r[0]), bullet: { indent: 12 }, paraSpaceAfter: 5 } },
    { text: r[1] + " ↗", options: { color: BLUE, hyperlink: { url: r[2], tooltip: r[2] }, breakLine: i < src.length - 1 } },
  ]).flat();
  T(s, runs, { x: 0.55, y: 1.4, w: 12.25, h: 5.0, fontSize: 12 });
  T(s, EVNOTE + "。产品图片来自上述官网 / 报道，仅供内部调研使用。信息截至 2026-11，具体型号功能以官方最新说明为准。", { x: 0.55, y: 6.45, w: 12.25, h: 0.4, fontSize: 10.5, color: GRAY });
  s.addNotes("资料来源按证据等级列出，汇报时如被问到某条出处可以直接指到这里。");
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
})();
