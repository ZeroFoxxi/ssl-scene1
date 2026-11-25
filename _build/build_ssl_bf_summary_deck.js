// 声源定位与波束成形技术总结（声源定位技术预研项目；mentor 2026-11-25 布置）。
// 四项：技术原理、大 / 小模型选型、连云 / 离线端侧、友商竞品；会议系统为重点，智能家居简要概括（mentor 11-25 14:29）。
// 只写查到的事实与计算，不写建议与下一步；不含本项目训练结果（用户 11-25 决定）。
// 复用已有材料：竞品补充页（mentor 认可版）、竞品调研、公开参照方案汇总；新查资料的来源见各页备注。
// 波束指向性数字读自 code/ssl_baseline/out/bf_directivity.json（scripts/bf_directivity.py）。
const path = require("path");
const fs = require("fs");
const S = require("./deck_style")("声源定位与波束成形技术总结");
const { p, C, T, cell, bold, ctr, table, newSlide, key, box, line, hbars } = S;
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, "..", "01_场景一_摄像头声源定位", "技术总结");
fs.mkdirSync(OUT_DIR, { recursive: true });
const OUT = path.join(OUT_DIR, "声源定位与波束成形技术总结.pptx");
const BF = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "code", "ssl_baseline", "out", "bf_directivity.json"), "utf-8")).results;
const LIN = BF["会议室 6 麦线阵（孔径 17.5 cm）"];
const f1 = (x) => x.toFixed(1);

// ---------------- 来源 ----------------
const SRC = {
  rally: ["Logitech Rally Bar 产品页", "https://www.logitech.com/en-us/products/video-conferencing/room-solutions/rallybar.html"],
  ciscoBar: ["Cisco Room Bar 数据表", "https://www.cisco.com/c/en/us/products/collateral/collaboration-endpoints/webex-room-series/webex-room-bar-ds.html"],
  ciscoBarPro: ["Cisco Room Bar Pro 数据表", "https://www.cisco.com/c/en/us/products/collateral/collaboration-endpoints/webex-room-series/room-bar-pro-ds.html"],
  ciscoCeil: ["Cisco Ceiling Microphone Pro 数据表", "https://www.cisco.com/c/en/us/products/collateral/collaboration-endpoints/collaboration-peripherals/ceiling-microphone-pro-ds.html"],
  ciscoBlog: ["Webex 博客：AI 自适应吊顶麦克风", "https://blog.webex.com/workspaces/behind-the-scenes-first-ai-adaptive-ceiling-microphone/"],
  ciscoLocal: ["Cisco Connect：AI 设备（摄像头切换在本地运行）", "https://cisco.com/c/dam/m/en_us/training-events/events-webinars/cisco-connect-us/ai-powered-devices.pdf"],
  jabra: ["Jabra PanaCast 50 产品页", "https://www.jabra.com/business/video-conferencing/jabra-panacast-50"],
  yealink: ["Yealink MeetingBar A40 数据表", "https://www.yealink.com/website-service/download/MeetingBar-A40-Datasheet.pdf"],
  owl: ["Owl Labs Meeting Owl 4+ 数据表", "https://owllabs.com/products/meeting-owl-4-plus"],
  ideahub: ["华为 IdeaHub ES2 Plus 产品页", "https://e.huawei.com/cn/products/enterprise-collaboration/ideahub/ideahub-es2"],
  c60: ["思必驰 C60 产品页", "https://meeting.aispeech.com/product/c60/"],
  shure: ["Shure MXA920 产品页", "https://www.shure.com/en-US/products/microphones/mxa920"],
  tcc2: ["Sennheiser TeamConnect Ceiling 2 产品页", "https://www.sennheiser.com/en-us/catalog/products/meeting-and-conference-systems/teamconnect-ceiling-2"],
  echoDev: ["Amazon 开发者博客：7 麦远场开发套件", "https://developer.amazon.com/blogs/alexa/post/b80b4669-2675-4752-a171-fa6aaa7e5aff/bringing-far-field-voice-technology-from-the-amazon-echo-to-third-party-devices"],
  echoSIR: ["Amazon：SIR beam selector（Echo 前端选波束）", "https://amazon.science/publications/sir-beam-selector-for-amazon-echo-devices-audio-front-end"],
  echoShow: ["Amazon Science：The science behind Echo Show 10", "https://www.amazon.science/blog/the-science-behind-echo-show-10"],
  az1: ["TechCrunch 2021：Echo 端侧语音处理", "https://techcrunch.com/2021/09/28/new-amazon-echo-devices-will-have-local-voice-processing-giving-users-more-privacy"],
  homepod: ["Apple 机器学习期刊：Optimizing Siri on HomePod in Far-Field Settings", "https://machinelearning.apple.com/research/optimizing-siri-on-homepod-in-far-field-settings"],
  homepod2: ["Apple：HomePod（第二代）技术规格", "https://www.apple.com/homepod-2nd-generation/specs/"],
  google: ["Google Nest / Home 设备规格", "https://support.google.com/googlenest/answer/7072284"],
  soundx: ["华为 Sound X 规格", "https://consumer.huawei.com/cn/speakers/sound-x4/specs/"],
  ezviz: ["萤石商城 C6Wi", "https://www.ys7.com/item/165990.html"],
  xmos: ["XMOS XVF3800 用户指南", "https://www.xmos.com/documentation/XM-014888-PC/html/modules/fwk_xvf/doc/user_guide/03_using_the_host_application.html"],
  espDoa: ["乐鑫 ESP-SR：DOA（ESP32-P4）", "https://docs.espressif.com/projects/esp-sr/en/latest/esp32p4/direction_of_arrival/README.html"],
  espGsc: ["乐鑫 ESP-SR：GSC 波束成形", "https://docs.espressif.com/projects/esp-sr/en/latest/esp32/gsc_beamforming/README.html"],
  fesp: ["思必驰 DUI Linux SDK（离线前端）", "https://www.duiopen.com/docs/ct_fesp_linux"],
  odas: ["ODAS（arXiv 2103.03954）", "https://arxiv.org/abs/2103.03954"],
  smp: ["SMP-PHAT（arXiv 2203.14409）", "https://arxiv.org/abs/2203.14409"],
  cross3d: ["Cross3D-Edge（arXiv 2503.02046）", "https://arxiv.org/abs/2503.02046"],
  ipdnet2: ["IPDnet2（arXiv 2509.21900）", "https://arxiv.org/abs/2509.21900"],
  realman: ["RealMAN 数据集（arXiv 2406.19959）", "https://arxiv.org/abs/2406.19959"],
  lightdoa: ["LightDOA（arXiv 2511.08012）", "https://arxiv.org/abs/2511.08012"],
  dcase24: ["DCASE 2024 SELD 基线与对比（arXiv 2408.05057）", "https://arxiv.org/abs/2408.05057"],
  dcase25: ["DCASE 2025 Task 3 结果", "https://dcase.community/challenge2025/task-stereo-sound-event-localization-and-detection-in-regular-video-content-results"],
  rnnoise: ["RNNoise（Valin，W3C 2020 报告；arXiv 1709.08243）", "https://www.w3.org/2020/06/machine-learning-workshop/talks/rnnoise_neural_speech_enhancement_and_the_browser.html"],
  dtln: ["DTLN（arXiv 2005.07551）", "https://arxiv.org/abs/2005.07551"],
  dfn2: ["DeepFilterNet2（arXiv 2205.05474；参数量引自 arXiv 2312.08132 表）", "https://arxiv.org/abs/2312.08132"],
  spatialnet: ["SpatialNet（arXiv 2307.16516）", "https://arxiv.org/abs/2307.16516"],
  tfgrid: ["TF-GridNet 参数量（arXiv 2602.22487 对比表）", "https://arxiv.org/abs/2602.22487"],
  bat: ["BAT：空间音频大语言模型（ICML 2024，arXiv 2402.01591）", "https://arxiv.org/abs/2402.01591"],
  ndbf: ["Huang & Habets：Dual-Microphone Steerable High-Order Neural Differential Beamformer（IWAENC 2026，arXiv 2609.27021）", "https://arxiv.org/abs/2609.27021"],
  ezvizChip: ["萤石官网：产品家族（专用芯片 1.0T 算力）", "https://www.ezviz.com/cn/news/6270.html"],
  th1520: ["经济观察网：思必驰 AI 芯片 TH1520（2019）", "http://m.eeo.com.cn/2019/0105/344821.shtml"],
  th2608: ["智东西：深聪智能二代 AI 芯片 TH2608（2021）", "https://zhidx.com/news/35716.html"],
  aispeechIPO: ["思必驰招股书（2026）", "https://dataclouds.cninfo.com.cn/sjother2/documents/2026/2026-05-25/1d4b495ace513224eeffac7f7ab4bfbf.pdf"],
  soundaiR328: ["深圳湾：声智 × 全志 R328 模组（2019-11）", "https://www.shenzhenware.com/articles/13583"],
  soundaiGX: ["深圳湾：声智 × 国芯 GX8008 模组（2019-12）", "https://www.shenzhenware.com/articles/13718"],
  soundai21ic: ["21ic：声智离在线混合语音模组（2020-05）", "https://www.21ic.com/article/731027.html"],
};
const FIG = (n) => path.join(__dirname, "..", "figures", "summary", n);
// 方框链：每步一个框（名称），框下小字说明；框之间箭头
function chain(s, steps, x, y, w, o) {
  o = o || {};
  const g = o.gap || 0.28, bw = (w - g * (steps.length - 1)) / steps.length, bh = o.bh || 0.5;
  steps.forEach(([t, d], i) => {
    const xx = x + i * (bw + g), hi = o.hi && o.hi.includes(i);
    s.addShape(p.shapes.RECTANGLE, { x: xx, y, w: bw, h: bh, fill: { color: hi ? C.navy : "FFFFFF" }, line: { color: C.navy, width: 1 } });
    T(s, t, { x: xx, y, w: bw, h: bh, fontSize: o.fs || 12, bold: true, align: "center", valign: "middle", color: hi ? "FFFFFF" : C.navy });
    if (d) T(s, d, { x: xx - 0.05, y: y + bh + 0.05, w: bw + 0.1, h: 0.62, fontSize: o.dfs || 10, align: "center", color: C.gray });
    if (i > 0) line(s, xx - g, y + bh / 2, xx, y + bh / 2, { color: C.navy });
  });
}
const notesOf = (keys, extra) => (extra ? extra + "\n\n" : "") + "来源：\n" + keys.map((k, i) => `${i + 1}. ${SRC[k][0]}：${SRC[k][1]}`).join("\n");

// ================= 1 封面 =================
{
  const s = p.addSlide({ masterName: "COVER" });
  s.addShape(p.shapes.LINE, { x: 0.9, y: 3.55, w: 11.5, h: 0, line: { color: C.navy, width: 1.25 } });
  T(s, "声源定位与波束成形技术总结", { x: 0.9, y: 2.3, w: 11.5, h: 0.9, fontSize: 34, bold: true, color: C.navy, valign: "bottom" });
  T(s, "会议系统与智能家居", { x: 0.9, y: 3.75, w: 11.5, h: 0.5, fontSize: 16, color: C.gray });
  T(s, "2026 年 11 月", { x: 0.9, y: 4.35, w: 11.5, h: 0.4, fontSize: 14, color: C.gray });
}

const IMG = (s, n, x, y, w, ratio) => s.addImage({ path: FIG(n), x, y, w, h: w / ratio });
// 标签 + 短句（左侧加粗主色标签）
const labelLine = (s, label, text, x, y, w, o) => T(s, [{ text: label + "  ", options: { bold: true, color: C.navy } }, { text }],
  Object.assign({ x, y, w, h: 0.4, fontSize: 12.5, valign: "middle" }, o || {}));
const Ls = LIN["DS_测向偏差损失_1to4kHz_dB"];

// ================= 2 应用场景 =================
{
  const s = newSlide("应用场景", "示意图不按比例", null);
  key(s, "两个场景都是先听出声音从哪里来，再驱动摄像头转向，或朝这个方向增强语音");
  const col = (x, title, img, value, steps) => {
    T(s, title, { x, y: 1.7, w: 5.9, h: 0.36, fontSize: 14, bold: true, color: C.navy, valign: "middle" });
    IMG(s, img, x, 2.1, 3.95, 1.409);
    T(s, value, { x: x + 4.1, y: 2.3, w: 1.8, h: 2.4, fontSize: 12, color: C.ink, valign: "top" });
    chain(s, steps, x, 5.05, 5.85, { fs: 11.5, dfs: 10, hi: [1] });
  };
  col(0.6, "场景一：摄像头自动转向说话人（会议室）", "scene_meeting.png", "价值：发言人切换时，画面自动跟着切换",
    [["语音检测", "有人开口、换人"], ["声源定位", "说话人方向"], ["转向 / 跟踪", "摄像头转向"]]);
  col(6.88, "场景二：智能家居语音交互", "scene_home.png", "价值：远场、有电视声时也能听清用户",
    [["语音唤醒", "唤醒词"], ["声源定位", "用户方向"], ["波束成形", "定向增强"], ["语音交互", "识别与控制"]]);
  s.addShape(p.shapes.LINE, { x: 0.6, y: 6.05, w: 12.13, h: 0, line: { color: C.rule, width: 0.75 } });
  labelLine(s, "端侧部署", "设备上实时运行，音频不出设备，断网可用", 0.6, 6.1, 12.13, { h: 0.36, fontSize: 12 });
  labelLine(s, "技术难点", "混响与噪声、远场弱语音、多人抢话、喇叭和电视干扰、阵列小、算力低", 0.6, 6.45, 12.13, { h: 0.36, fontSize: 12 });
}

// ================= 3 总结 =================
{
  const s = newSlide("总结", "依据见各页", "依据：场景第 2、4 页；定位原理第 5 页；波束原理与指向性计算第 6 页；模型第 7 页；连云 / 端侧第 8 页；竞品第 9–11 页；智能家居第 12 页；本项目选型第 13 页。");
  key(s, "定位给出方位，波束成形按方位拾音；两者都在设备上运行");
  table(s, [
    [cell("项目"), cell("结论")],
    [bold("两者关系"), cell("定位给出发言人方位 → 摄像头取景 + 波束拾音")],
    [bold("技术原理"), cell("定位：时间差、子空间、神经网络；波束：固定、自适应、神经网络增强")],
    [bold("小阵列的限制"), cell(`6 麦线阵 1 kHz 以下指向性 ≤ ${f1(LIN.DS["1000"].DI_dB)} dB；定位偏 10° 损失 ${f1(Ls["10°"])} dB（计算）`)],
    [bold("大 / 小模型"), cell("端侧 3.7 万–231 万参数；千万级以上只在服务器")],
    [bold("连云 / 端侧"), cell("前端全在设备上；只上传增强后的单路语音")],
    [bold("友商竞品"), cell("视频条 6–16 麦，吊顶 28–64 单元；多波束 + 自适应")],
    [bold("智能家居"), cell("唤醒词定向；设备自身播放，回声消除是前提")],
    [bold("本项目选型"), cell("6 麦线阵 + 端侧小网络（0.28 M 参数），离线运行")],
  ], 0.6, 1.8, [2.3, 9.83], [0.44, 0.52, 0.52, 0.52, 0.52, 0.52, 0.52, 0.52, 0.52], { fontSize: 12.5 });
}

// ================= 4 会议系统：处理流程 =================
{
  const s = newSlide("会议系统：处理流程", "拾音距离为厂商公开规格；流程按会议设备的公开做法归纳",
    notesOf(["owl", "yealink", "rally", "ideahub", "ciscoBar", "ciscoCeil", "ciscoBlog", "tcc2", "homepod"],
      "回声消除：远端参会人的声音从本地喇叭播出，会被麦克风收进；不先消除，定位会被喇叭声带偏（Cisco 社区也提到本地扩声会干扰发言人跟踪）。HomePod 资料给出播放声比人声高 30–40 dB、回声消除后残留仍可比人声高 10–20 dB。\n摄像头执行方式：机械转向（Logitech 主摄云台）、数字取景（Jabra、Owl）、多镜头切换（Cisco Quad Camera）。\n拾音距离：Meeting Owl 4+ 5.5 m、Yealink A40 6 m（4 m 内高质量）、Logitech Rally Bar 7 m、华为 IdeaHub ES2 Plus 12 m。"));
  key(s, "回声消除在定位之前；定位输出的方位同时给摄像头和波束成形");
  const Y = 1.95, H = 0.95, W = 1.84, G = 0.218;
  const blocks = [["麦克风阵列", "6–16 麦"], ["回声消除", "去掉喇叭声"], ["声源定位", "方位 + 置信度"], ["波束成形", "对准发言人"], ["降噪 / 混音", "单通道降噪"], ["输出", "单路语音上行"]];
  const xs = blocks.map((_, i) => 0.6 + i * (W + G));
  blocks.forEach(([t, d], i) => {
    const hi = i === 2 || i === 3;
    s.addShape(p.shapes.RECTANGLE, { x: xs[i], y: Y, w: W, h: H, fill: { color: hi ? C.navyPale : "FFFFFF" }, line: { color: hi ? C.navy : C.box, width: hi ? 1.25 : 0.75 } });
    T(s, t, { x: xs[i], y: Y + 0.12, w: W, h: 0.36, fontSize: 13, bold: true, align: "center", color: C.navy });
    T(s, d, { x: xs[i], y: Y + 0.52, w: W, h: 0.3, fontSize: 10.5, align: "center", color: C.gray });
    if (i > 0) line(s, xs[i - 1] + W, Y + H / 2, xs[i], Y + H / 2);
  });
  const Y2 = 3.45, H2 = 0.55;
  box(s, "远端播放信号", xs[1] + 0.15, Y2, W - 0.3, H2, { fs: 10.5 });
  line(s, xs[1] + W / 2, Y2, xs[1] + W / 2, Y + H);
  box(s, "开口 / 换人检测", xs[2] - 0.05, Y2, 1.35, H2, { fs: 10.5 });
  line(s, xs[2] + 0.625, Y2, xs[2] + 0.625, Y + H);
  box(s, "摄像头取景：云台 / 数字取景 / 多镜头", xs[3] + 0.25, Y2, 2 * W + G - 0.5, H2, { fs: 10.5 });
  line(s, xs[2] + W - 0.2, Y + H, xs[2] + W - 0.2, Y2 + H2 / 2, { arrow: false });
  line(s, xs[2] + W - 0.2, Y2 + H2 / 2, xs[3] + 0.25, Y2 + H2 / 2);
  T(s, "方位", { x: xs[2] + W - 0.15, y: Y + H + 0.1, w: 0.5, h: 0.25, fontSize: 9.5, color: C.gray });
  // 场景条件：四格
  s.addShape(p.shapes.LINE, { x: 0.6, y: 4.6, w: 12.13, h: 0, line: { color: C.rule, width: 0.75 } });
  T(s, "会议室条件", { x: 0.6, y: 4.72, w: 3, h: 0.36, fontSize: 13, bold: true, color: C.navy });
  [["说话人", "多人轮流，常有抢话"], ["拾音距离", "5.5–12 m（公开规格）"], ["干扰", "远端喇叭声、空调、混响"], ["阵列安装", "屏幕上 / 下方，或吊顶"]].forEach(([l, v], i) => {
    const x = 0.6 + i * 3.08;
    T(s, l, { x, y: 5.2, w: 2.9, h: 0.34, fontSize: 11, color: C.gray });
    T(s, v, { x, y: 5.55, w: 2.95, h: 0.45, fontSize: 13.5, bold: true, color: C.ink });
  });
}

// ================= 5 声源定位：方法 =================
{
  const s = newSlide("声源定位：方法", "资源为原文数字；各方案数据集与阵列不同，不能横向比较",
    notesOf(["odas", "smp", "espDoa", "ipdnet2", "cross3d", "realman"],
      "时间差类：GCC-PHAT 求各麦克风对的到达时间差；SRP-PHAT 按候选方向把各对互相关相加，取能量最大的方向。SMP-PHAT（4 麦）树莓派 4 每帧约 0.10 ms，平均误差 16.2°。\n子空间类：对多路协方差做特征分解，用噪声子空间与方向向量正交找峰。GEVD-MUSIC 先用开口前一段只有背景（噪声 + 混响 + 其他声源）的协方差做白化；对持续干扰（喇叭、空调）有效，背景段里若有目标本人或刚停的上一位发言人则会失效。\n乐鑫 ESP-SR DOA（Capon）：ESP32-P4 400 MHz，4 麦圆阵半径 5 cm，10° 网格；206 KB = 内部 RAM 57 KB + PSRAM 149 KB；每 8 ms 帧 0.65 ms；官方仿真 ±10° 内 100%。\n神经网络：IPDnet2-Tiny 0.5 M 参数、0.2 GFLOPs/s，RealMAN 实录误差 1.2–1.6°；Cross3D-Edge 0.14 M 参数，树莓派 4B 每帧 8.59 ms。\nRealMAN 基线 5° 内准确率：只用仿真训练 60.4%，用实录训练 89.2%。"));
  key(s, "都是从声音到各麦克风的时间差反推方向；神经网络在多人和混响下更稳，但依赖训练数据");
  IMG(s, "doa_principle.png", 0.6, 1.8, 4.9, 1.635);
  table(s, [
    [cell("类别"), cell("做法"), cell("端侧资源（公开）")],
    [bold("时间差类\nSRP-PHAT"), cell("各方向的互相关能量，取最大"), cell("ODAS 8 麦：树莓派 3 单核 14%")],
    [bold("子空间类\nMUSIC / GEVD"), cell("协方差分解，噪声子空间找峰"), cell("乐鑫 4 麦：内存 206 KB，CPU 8.1%")],
    [bold("神经网络\nCRNN / IPDnet2"), cell("相位差 → 网络输出方向 + 置信度"), cell("IPDnet2-Tiny：0.5 M 参数")],
  ], 5.85, 1.85, [1.75, 2.75, 2.38], [0.42, 0.78, 0.78, 0.78], { fontSize: 11 });
  s.addShape(p.shapes.LINE, { x: 0.6, y: 5.1, w: 12.13, h: 0, line: { color: C.rule, width: 0.75 } });
  labelLine(s, "会议难点", "抢话、远端喇叭声时，传统方法的峰值容易落在干扰上", 0.6, 5.25, 12.13);
  labelLine(s, "数据依赖", "RealMAN 实录评测（5° 内）：只用仿真训练 60.4%，用实录训练 89.2%", 0.6, 5.7, 12.13);
  labelLine(s, "只要方向", "会议系统只需要方向（DOA），不需要距离和声音类别", 0.6, 6.15, 12.13);
}

// ================= 6 波束成形：方法 =================
{
  const s = newSlide("波束成形：方法", "波束图与指向性为计算（6 麦线阵，理想自由场）；实例为厂商公开资料",
    "指向性计算：理想自由场、远场平面波，对各向同性扩散噪声；目标在线阵正前方；不含混响与麦克风误差（code/ssl_baseline/scripts/bf_directivity.py；波束图 _build/make_summary_figures.py）。延迟求和指向性：250 Hz " + f1(LIN.DS["250"].DI_dB) + "、500 Hz " + f1(LIN.DS["500"].DI_dB) + "、1 kHz " + f1(LIN.DS["1000"].DI_dB) + "、2 kHz " + f1(LIN.DS["2000"].DI_dB) + "、4 kHz " + f1(LIN.DS["4000"].DI_dB) + " dB；超指向（白噪声增益 ≥ −10 dB）250 Hz / 1 kHz 为 " + f1(LIN["超指向"]["250"].DI_dB) + " / " + f1(LIN["超指向"]["1000"].DI_dB) + " dB。\n波束图右图：MVDR，干扰在偏离目标 60° 处，噪声协方差 = 扩散噪声 + 干扰（功率 100 倍）+ 0.01 白噪声。\n公式：每个频点 y = wᴴx；延迟求和 w = a / M；MVDR w = R⁻¹a / (aᴴR⁻¹a)。\n计算量（估算，6 麦、512 点 FFT、帧移 16 ms）：固定波束约 9.6 万次复乘 / 秒；自适应每次更新约 2–3 万次复乘加。乐鑫 GSC：ESP32-P4 单核约 20%，收敛约 1 s。\n" + notesOf(["shure", "rally", "ciscoCeil", "espGsc", "homepod", "rnnoise", "dfn2", "spatialnet", "tfgrid"],
      "HomePod：6 麦；多通道回声消除；深度学习掩码 + 多通道维纳滤波；盲源分离为多路，用 \"Hey Siri\" 检测器选出目标那一路。\n网络规模：RNNoise 8.8 万、DeepFilterNet2 231 万、SpatialNet 160 万 / 730 万、TF-GridNet 1450 万参数。"));
  key(s, "固定波束朝定位方向拾音；自适应波束还能在干扰方向置零");
  IMG(s, "beam_patterns.png", 0.6, 1.8, 7.3, 2.192);
  T(s, `延迟求和指向性：500 Hz ${f1(LIN.DS["500"].DI_dB)} dB、1 kHz ${f1(LIN.DS["1000"].DI_dB)} dB、4 kHz ${f1(LIN.DS["4000"].DI_dB)} dB，低频几乎没有方向性`,
    { x: 0.6, y: 5.25, w: 7.5, h: 0.4, fontSize: 12, color: C.ink });
  T(s, `定位偏 10° 目标损失 ${f1(Ls["10°"])} dB，偏 20° 损失 ${f1(Ls["20°"])} dB`, { x: 0.6, y: 5.7, w: 7.5, h: 0.4, fontSize: 12, color: C.ink });
  table(s, [
    [cell("类别"), cell("公开实例")],
    [bold("固定波束\n延迟求和、超指向"), cell("Shure MXA920：8 个可指向波瓣")],
    [bold("自适应波束\nMVDR、GSC"), cell("Logitech Rally Bar：5 个\nCisco 吊顶麦 Pro：8 个")],
    [bold("网络掩码\n+ 多通道滤波"), cell("Apple HomePod（6 麦）")],
    [bold("端到端多通道网络"), cell("论文为主，未见会议产品")],
  ], 8.25, 1.85, [2.0, 2.48], [0.42, 0.85, 0.85, 0.75, 0.6], { fontSize: 11 });
}

// ================= 7 大 / 小模型选型 =================
{
  const s = newSlide("大 / 小模型选型", "参数量为论文原文数字，横轴为对数刻度；DTLN 原文为\"少于 100 万\"",
    notesOf(["lightdoa", "rnnoise", "cross3d", "ipdnet2", "dcase24", "dtln", "spatialnet", "dfn2", "tfgrid", "dcase25", "bat"],
      "本项目定位网络（卷积 + 双向 GRU）：部署档 276,508 个参数、每次判决约 2.73 亿次乘加、8 比特权重约 270 KB；开发版 2.13 M 参数、每次判决约 11.1 亿次乘加。开发时先放大约 10 倍训练，再剪枝、减通道并做 8 比特量化。\n端侧实测：Cross3D-Edge 0.14 M 参数，树莓派 4B 每帧 8.59 ms、127 MFLOPS；RNNoise 约 8.8 万权重，总计算约 40 MFLOPS；DeepFilterNet2 在笔记本 i5 单线程实时率 0.04；DTLN 可在树莓派 3B+ 上实时运行。\nDCASE 2025 第 1 名为多模型集成。\nBAT：空间音频编码器 Spatial-AST + LLaMA-2 7B，回答声音的方向、距离与相互关系。"));
  key(s, "本项目定位网络与端侧可部署的模型同量级；千万级以上和大语言模型只在服务器上运行");
  const SSL = C.navy, ENH = "8DA9C4", OURS = "404040";
  const items = [
    { name: "LightDOA（定位）", value: 3.7e4, label: "3.7 万", color: SSL },
    { name: "RNNoise（降噪）", value: 8.8e4, label: "8.8 万", color: ENH },
    { name: "Cross3D-Edge（定位）", value: 1.4e5, label: "14 万", color: SSL },
    { name: "本项目（部署档）", value: 2.77e5, label: "28 万", color: OURS },
    { name: "IPDnet2-Tiny（定位）", value: 5e5, label: "50 万", color: SSL },
    { name: "DTLN（降噪）", value: 1e6, label: "< 100 万", color: ENH },
    { name: "本项目（开发版）", value: 2.13e6, label: "213 万", color: OURS },
    { name: "DeepFilterNet2（降噪）", value: 2.31e6, label: "231 万", color: ENH },
    { name: "SpatialNet-large（分离）", value: 7.3e6, label: "730 万", color: ENH },
    { name: "TF-GridNet（分离）", value: 1.45e7, label: "1450 万", color: ENH },
    { name: "DCASE 2025 第 1 名", value: 5.85e7, label: "5850 万", color: SSL },
    { name: "EINV2（定位 + 检测）", value: 1.28e8, label: "1.28 亿", color: SSL },
  ];
  const X0 = 0.6, Y0 = 1.85, RH = 0.34, W = 7.9;
  const hb = { nameW: 2.55, labW: 0.85, vmin: 1e4, vmax: 2e8, log: true };
  const bw = W - hb.nameW - hb.labW, pos = (v) => bw * (Math.log10(v) - 4) / (Math.log10(2e8) - 4);
  s.addShape(p.shapes.RECTANGLE, { x: X0 + hb.nameW + pos(1e5), y: Y0 - 0.05, w: pos(1e6) - pos(1e5), h: items.length * RH + 0.07, fill: { color: "E4ECF4" }, line: { type: "none" } });
  hbars(s, items, X0, Y0, W, RH, Object.assign({ fs: 10.5, ticks: [[1e4, "1 万"], [1e5, "10 万"], [1e6, "100 万"], [1e7, "1000 万"], [1e8, "1 亿"]] }, hb));
  [[SSL, "定位"], [ENH, "降噪 / 分离"], [OURS, "本项目"], ["E4ECF4", "端侧常见量级"]].forEach(([c, t], i) => {
    const lx = X0 + 0.3 + [0, 1.1, 2.75, 4.0][i];
    s.addShape(p.shapes.RECTANGLE, { x: lx, y: 6.5, w: 0.22, h: 0.16, fill: { color: c }, line: { type: "none" } });
    T(s, t, { x: lx + 0.3, y: 6.43, w: 2.2, h: 0.3, fontSize: 10.5, color: C.gray, valign: "middle" });
  });
  table(s, [
    [cell("档位"), cell("规模"), cell("运行位置")],
    [bold("小模型"), cell("几万–两百多万参数"), cell("端侧")],
    [bold("大模型"), cell("千万–上亿参数"), cell("服务器")],
    [bold("大语言模型"), cell("70 亿参数（BAT）"), cell("服务器")],
    [bold("本项目"), cell("部署档 0.28 M\n8 比特约 270 KB"), cell("端侧")],
  ], 8.55, 1.85, [1.2, 1.95, 1.03], [0.42, 0.6, 0.6, 0.6, 0.75], { fontSize: 11 });
  T(s, "开发版 2.13 M 先找效果上限，再压缩到部署档", { x: 8.55, y: 5.05, w: 4.18, h: 0.6, fontSize: 11, color: C.gray });
}

// ================= 8 连云 / 离线端侧 =================
{
  const s = newSlide("连云 / 离线端侧", "带宽为计算（16 kHz、16 bit，未压缩）；其余为厂商公开资料",
    notesOf(["rally", "ciscoLocal", "echoShow", "homepod", "fesp", "espDoa", "az1"],
      "带宽：6 路 × 16,000 × 16 bit = 1.536 Mbit/s；单路 0.256 Mbit/s。会议系统常用 48 kHz 采样时再乘 3。\nLogitech Rally Bar：6 麦、5 个自适应波束、回声消除、AI 降噪在整机内。HomePod：6 麦前端在 A8 上常开。思必驰离线前端 SDK、乐鑫 ESP-SR 离线运行。\nCisco：所有与摄像头切换和控制相关的智能都在设备本地运行。Echo Show 10：声学定位与视觉在 AZ1 上端侧处理，图像不出设备。Echo（2021）：AZ1 可在设备上识别部分常用命令。"));
  key(s, "定位、波束成形和回声消除都在设备上逐帧运行；连云的只有增强后的单路语音");
  s.addShape(p.shapes.RECTANGLE, { x: 0.6, y: 1.8, w: 8.3, h: 2.6, fill: { color: C.navyPale }, line: { color: C.navy, width: 1, dashType: "dash" } });
  T(s, "设备端（离线，每帧十几毫秒）", { x: 0.75, y: 1.85, w: 5, h: 0.32, fontSize: 12, bold: true, color: C.navy });
  chain(s, [["麦克风阵列", ""], ["回声消除", ""], ["声源定位", ""], ["波束成形", ""], ["降噪", ""]], 0.8, 2.35, 7.9, { fs: 11.5, gap: 0.25, hi: [2, 3] });
  box(s, "开口 / 唤醒检测（常开）", 2.3, 3.35, 2.3, 0.5, { fs: 10.5 });
  line(s, 4.6, 3.6, 4.35, 3.6, { color: C.navy, arrow: false }); line(s, 4.35, 3.6, 4.35, 2.85, { color: C.navy });
  box(s, "摄像头取景、发言人跟踪", 5.9, 3.35, 2.6, 0.5, { fs: 10.5 });
  line(s, 5.15, 2.85, 5.15, 3.6, { color: C.navy, arrow: false }); line(s, 5.15, 3.6, 5.9, 3.6, { color: C.navy });
  s.addShape(p.shapes.RECTANGLE, { x: 10.0, y: 1.8, w: 2.73, h: 2.6, fill: { color: "FFFFFF" }, line: { color: C.box, width: 1 } });
  T(s, "云端", { x: 10.15, y: 1.85, w: 2.4, h: 0.32, fontSize: 12, bold: true, color: C.gray });
  T(s, "转写、识别\n会议纪要\n大模型对话", { x: 10.15, y: 2.25, w: 2.45, h: 1.5, fontSize: 12, align: "center", valign: "middle", color: C.ink });
  line(s, 8.9, 2.6, 10.0, 2.6, { color: C.navy });
  T(s, "单路语音\n0.26 Mbit/s", { x: 8.92, y: 2.67, w: 1.06, h: 0.55, fontSize: 9.5, align: "center", color: C.navy });
  T(s, "6 路原始音频 1.54 Mbit/s，不上传", { x: 0.8, y: 3.97, w: 7.9, h: 0.3, fontSize: 10, color: C.gray, align: "right" });
  table(s, [
    [cell("公开做法"), cell("产品")],
    [bold("阵列前端在设备上"), cell("Logitech Rally Bar、Apple HomePod、思必驰离线 SDK、乐鑫 ESP-SR")],
    [bold("摄像头取景在设备上"), cell("Cisco 会议终端；Echo Show 10（图像不出设备）")],
    [bold("识别部分上云"), cell("Amazon Echo：常用命令端侧识别，其余上云")],
  ], 0.6, 4.7, [2.6, 9.53], [0.4, 0.5, 0.5, 0.5], { fontSize: 11.5 });
}

// ================= 9 友商竞品：会议系统 =================
{
  const s = newSlide("友商竞品：会议系统", "厂商官网、数据表与技术博客；定位与波束的算法均未公开",
    notesOf(["rally", "ciscoBar", "ciscoBarPro", "jabra", "yealink", "owl", "ideahub", "c60", "shure", "tcc2", "ciscoCeil", "ciscoBlog"],
      "Logitech Rally Bar：6 个全向 MEMS；音频 + 双摄识别当前发言人，主摄云台转向；5 个自适应波束，回声消除、语音检测、AI 降噪。\nCisco Room Bar：4 单元阵列做波束降噪，另有专用麦克风阵列做发言人跟踪；Room Bar Pro：16 单元。Cisco Quad Camera：内置 8 麦只用于发言人跟踪。\nJabra PanaCast 50：Virtual Director 数字取景。Yealink A40：6 m（4 m 内高质量）。Meeting Owl 4+：结合视觉、声音、动作，半径 5.5 m。思必驰 C60：语音定位 → 视觉锁定 → 云台特写。\nCisco Ceiling Mic Pro：音频三角定位，配合摄像头跟踪与切换。Shure MXA920：单元数未公开，覆盖 30 × 30 英尺。Sennheiser TCC2 的约 60 m² 为零售商转引厂商说法。"));
  key(s, "视频条 6–16 麦、拾音 5.5–12 m；吊顶阵列 28–64 单元，按区域跟随说话人");
  const R = (cat, name, mic, loc, bf, rng) => [cell(cat, { align: "center", color: C.gray }), bold(name), ctr(mic), cell(loc), cell(bf), ctr(rng)];
  table(s, [
    [cell("类别"), cell("产品"), cell("麦克风"), cell("找发言人"), cell("波束成形"), cell("拾音距离")],
    R("视频条", "Logitech Rally Bar", "6", "音频 + 双摄，云台转向", "5 个自适应波束", "7 m"),
    R("视频条", "Cisco Room Bar Pro", "16", "专用麦阵跟踪发言人", "阵列波束降噪", "—"),
    R("视频条", "Jabra PanaCast 50", "8", "数字取景聚焦发言人", "8 麦波束", "—"),
    R("视频条", "Yealink MeetingBar A40", "8", "发言人跟踪", "—", "6 m"),
    R("一体机", "Meeting Owl 4+", "8", "声音 + 视觉，360° 取景", "—", "5.5 m"),
    R("一体机", "华为 IdeaHub ES2 Plus", "12", "智能跟踪 3.0", "波束拾音", "12 m"),
    R("摄像机", "思必驰 C60", "8", "语音定位 → 视觉 → 云台", "—", "—"),
    R("吊顶", "Cisco Ceiling Mic Pro", "64", "三角定位，配合摄像头", "8 个自适应波束", "—"),
    R("吊顶", "Sennheiser TCC2", "28", "识别正在说话的人", "动态波束跟随", "约 60 m²"),
    R("吊顶", "Shure MXA920", "未公开", "自动覆盖", "8 个可指向波瓣", "30 × 30 英尺"),
  ], 0.6, 1.8, [1.0, 2.75, 1.05, 3.2, 2.48, 1.65], [0.4, 0.44, 0.44, 0.44, 0.44, 0.44, 0.44, 0.44, 0.44, 0.44, 0.44], { fontSize: 11 });
}

// ================= 10 友商竞品：部署与资源 =================
{
  const s = newSlide("友商竞品：部署与资源", "厂商官网、手册、招股书与报道",
    notesOf(["c60", "fesp", "th1520", "th2608", "aispeechIPO", "ezviz", "ezvizChip", "echoShow", "homepod", "ciscoLocal", "soundaiR328", "soundaiGX", "soundai21ic", "espDoa", "xmos"],
      "芯片有 DSP / NPU 不能说明定位在其上执行；整机芯片算力也不等于定位模块的开销。\n思必驰：自研芯片 TH1520（双 DSP，常开毫瓦级）、TH2608（Cortex-M + DSP + NPU）；离线前端 SDK 支持线阵 4 / 6 麦，16 kHz，回声消除、定位、波束、唤醒一体，唤醒后回调方位；SDK 支持平台未公开。思必驰 C60、Cisco 会议终端的芯片未公开。\n萤石 1.0T 为系列口径，单款型号未公开。声智：全志 R328；国芯 GX8008（运行约 100 mW，待机 < 25 mW）；2 / 4 / 8 麦。\nXMOS XVF3800：1 个扫描波束 + 2 个跟踪波束，主机可读说话人方位。\n乐鑫：ESP32-P4 400 MHz，4 麦圆阵半径 5 cm，10° 网格；每 8 ms 帧 0.65 ms。"));
  key(s, "公开的多是芯片和运行位置；定位模块的内存和算力只有乐鑫公开");
  table(s, [
    [cell("产品 / 方案"), cell("芯片"), cell("运行位置"), cell("公开的定位信息")],
    [bold("思必驰离线前端 SDK"), cell("自研 TH1520 / TH2608"), ctr("离线"), cell("4 / 6 麦线阵，唤醒后回调方位")],
    [bold("萤石 C6Wi（家用云台）"), cell("专用芯片 1.0T（系列）"), ctr("端侧"), cell("3 麦听声辨位 → 云台转向")],
    [bold("声智语音模组"), cell("全志 R328 / 国芯 GX8008"), ctr("离在线混合"), cell("2–8 麦，定位 + 波束")],
    [bold("Amazon Echo Show 10"), cell("自研 AZ1"), ctr("端侧"), cell("声学定位 + 视觉识别人体")],
    [bold("Apple HomePod"), cell("A8"), ctr("端侧常开"), cell("6 麦，唤醒词选路")],
    [bold("XMOS XVF3800"), cell("专用语音芯片"), ctr("端侧"), cell("4 麦，输出说话人方位")],
    [bold("乐鑫 ESP-SR"), cell("ESP32-P4 400 MHz"), ctr("端侧"), cell("4 麦，内存 206 KB，CPU 8.1%")],
  ], 0.6, 1.8, [2.9, 3.0, 1.7, 4.53], [0.42, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], { fontSize: 11.5 });
  T(s, "思必驰 C60、Cisco 会议终端的芯片未公开", { x: 0.6, y: 5.95, w: 12.13, h: 0.35, fontSize: 11, color: C.gray });
}

// ================= 11 麦克风数量 =================
{
  const s = newSlide("麦克风数量", "厂商官网与数据表；Shure MXA920 未公开，未列入；Amazon Echo 为第一代",
    notesOf(["rally", "jabra", "yealink", "owl", "c60", "ideahub", "ciscoBarPro", "tcc2", "ciscoCeil", "google", "homepod2", "homepod", "soundx", "echoDev", "xmos"], "Cisco Ceiling Mic Pro 64 单元，条形截断显示。数量不等于孔径：视频条受机身长度限制，吊顶阵列孔径大、低频指向性更好。"));
  key(s, "会议视频条 6–16 麦，吊顶阵列 28–64 单元；音箱 3–7 麦");
  const CM = C.navy, CC = "6E9BC5", CS = "A6A6A6", CH = "5E5E5E";
  const items = [
    { name: "Logitech Rally Bar", value: 6, color: CM }, { name: "Jabra PanaCast 50", value: 8, color: CM }, { name: "Yealink MeetingBar A40", value: 8, color: CM },
    { name: "Meeting Owl 4+", value: 8, color: CM }, { name: "思必驰 C60", value: 8, color: CM }, { name: "华为 IdeaHub ES2 Plus", value: 12, color: CM },
    { name: "Cisco Room Bar Pro", value: 16, color: CM },
    { name: "Sennheiser TCC2", value: 28, color: CC }, { name: "Cisco Ceiling Mic Pro", value: 64, color: CC },
    { name: "Google Nest Audio", value: 3, color: CS }, { name: "Apple HomePod（第二代）", value: 4, color: CS }, { name: "Apple HomePod", value: 6, color: CS },
    { name: "Google Home Max", value: 6, color: CS }, { name: "华为 Sound X", value: 6, color: CS }, { name: "Amazon Echo", value: 7, color: CS },
    { name: "XMOS XVF3800", value: 4, color: CH },
  ];
  const VMAX = 32, X0 = 0.6, Y0 = 1.75, RH = 0.3, W = 8.2;
  const shown = items.map((d) => Object.assign({}, d, { value: Math.min(d.value, VMAX), label: String(d.value) }));
  const g = hbars(s, shown, X0, Y0, W, RH, { nameW: 2.6, labW: 0.6, vmax: VMAX, fs: 10.5 });
  const iC = items.findIndex((d) => d.value > VMAX), yC = Y0 + iC * RH;
  [0.0, 0.09].forEach((dx) => s.addShape(p.shapes.LINE, { x: g.x0 + g.bw - 0.55 + dx, y: yC + 0.03, w: 0.08, h: RH - 0.06, line: { color: "FFFFFF", width: 2 } }));
  [[CM, "会议视频条 / 一体机 / 摄像机"], [CC, "会议吊顶阵列"], [CS, "智能音箱"], [CH, "语音芯片"]].forEach(([c, t], i) => {
    s.addShape(p.shapes.RECTANGLE, { x: 9.2, y: 1.95 + i * 0.36, w: 0.24, h: 0.17, fill: { color: c }, line: { type: "none" } });
    T(s, t, { x: 9.52, y: 1.86 + i * 0.36, w: 3.2, h: 0.34, fontSize: 11, valign: "middle" });
  });
  S.para(s, ["视频条多为 8 麦，音箱多为 6 麦", "吊顶阵列孔径大，用于大房间分区拾音"], 9.2, 3.6, 3.53, 1.4, { fontSize: 12 });
}

// ================= 12 智能家居 =================
{
  const s = newSlide("智能家居", "厂商官网、技术博客与论文；示意图不按比例",
    notesOf(["echoSIR", "echoDev", "homepod", "homepod2", "echoShow", "google", "soundx", "ezviz", "az1"],
      "HomePod：播放声比人声高 30–40 dB，回声消除后残留仍可高出 10–20 dB；回声消除 → 掩码多通道维纳滤波 → 盲源分离成多路，由唤醒词检测选出目标那一路。\nEcho：多个波束，按子带信干比选出一个波束送唤醒与识别。Echo Show 10：声学定位 + 视觉识别人体，区分人声与墙面反射后转屏。\n音箱麦克风数：Amazon Echo 7、Apple HomePod 6（第二代 4）、Google Home Max 6、华为 Sound X 6、Google Nest Audio 3。\n萤石 C6Wi：3 麦听声辨位，云台转向。华为智选海雀 Pro：双麦，唤醒后转向（第三方评测）。"));
  key(s, "用唤醒词锁定用户方向；设备自身在播放，回声消除是前提");
  IMG(s, "scene_home.png", 0.6, 1.85, 5.4, 1.409);
  const rows = [["触发", "唤醒词锁定用户方向"], ["主要干扰", "自身播放比人声高 30–40 dB；电视、家人交谈"], ["公开做法", "Echo：多波束中选一个\nHomePod：分离成多路，唤醒词选路"], ["麦克风", "音箱 3–7 麦"], ["端侧 / 云", "前端在设备上，识别部分上云"]];
  rows.forEach(([l, v], i) => {
    const y = 1.95 + i * 0.85;
    T(s, l, { x: 6.5, y, w: 1.5, h: 0.6, fontSize: 12.5, bold: true, color: C.navy });
    T(s, v, { x: 8.0, y, w: 4.73, h: 0.75, fontSize: 12.5, color: C.ink });
    if (i > 0) s.addShape(p.shapes.LINE, { x: 6.5, y: y - 0.12, w: 6.23, h: 0, line: { color: C.rule, width: 0.5 } });
  });
}

// ================= 13 本项目选型 =================
{
  const s = newSlide("本项目选型", "阵列数据为仿真；竞品数据为公开资料；波束成形的方法与分工【待确认】",
    "阵列选型仿真：会议室 5–10 m × 4–7 m，RT60 0.3 / 0.6 s，阵列装在前墙上方，四种情况（换人、抢话、远端喇叭、空调噪声）平均，GEVD-MUSIC 测向，开口后 0.5 s 判决。线阵孔径 10.5 → 17.5 cm 准确率提高 8–18 个百分点；17.5 cm 时 6 麦与 8 麦相当；4 麦圆阵（孔径 6 cm）贴墙安装明显变差。\n部署档网络 276,508 个参数，每次判决约 2.73 亿次乘加；开发版 2.13 M 参数。");
  key(s, "6 麦线阵 + 端侧小网络：麦克风数与主流视频条相当，模型与端侧公开模型同量级");
  table(s, [
    [cell("项目"), cell("选型"), cell("原因"), cell("与竞品对比")],
    [bold("阵列"), cell("6 麦线阵，孔径 17.5 cm"), cell("仿真：孔径比麦数重要"), cell("与 Rally Bar 同为 6 麦")],
    [bold("定位方法"), cell("端侧小网络\n传统方法作对照"), cell("抢话、喇叭声下更稳，给置信度"), cell("竞品算法未公开")],
    [bold("模型规格"), cell("0.28 M 参数\n8 比特约 270 KB"), cell("先训大模型，再压缩"), cell("IPDnet2-Tiny 0.5 M；乐鑫 206 KB")],
    [bold("运行位置"), cell("端侧离线"), cell("实时，音频不出设备"), cell("与 Cisco、HomePod 一致")],
    [bold("给波束成形"), cell("方位 + 置信度"), cell(`偏 10° 损失 ${f1(Ls["10°"])} dB，低置信度不切换`), cell("会议产品为多波束 + 自适应")],
  ], 0.6, 1.8, [1.75, 3.2, 3.85, 3.33], [0.42, 0.5, 0.66, 0.66, 0.5, 0.5], { fontSize: 12 });
  T(s, "本项目负责的范围", { x: 0.6, y: 5.3, w: 4, h: 0.32, fontSize: 12, bold: true, color: C.navy });
  chain(s, [["6 麦线阵", "孔径 17.5 cm"], ["回声消除", "前置条件"], ["定位网络", "0.28 M 参数"], ["方位 + 置信度", "每次判决"], ["摄像头 / 波束", "转向与拾音"]], 0.6, 5.75, 12.13, { fs: 12, dfs: 10, hi: [2, 3] });
}

S.save(OUT);
