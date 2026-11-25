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
  ezvizChip: ["萤石官网：产品家族（专用芯片 1.0T 算力）", "https://www.ezviz.com/cn/news/6270.html"],
  th1520: ["经济观察网：思必驰 AI 芯片 TH1520（2019）", "http://m.eeo.com.cn/2019/0105/344821.shtml"],
  th2608: ["智东西：深聪智能二代 AI 芯片 TH2608（2021）", "https://zhidx.com/news/35716.html"],
  aispeechIPO: ["思必驰招股书（2026）", "https://dataclouds.cninfo.com.cn/sjother2/documents/2026/2026-05-25/1d4b495ace513224eeffac7f7ab4bfbf.pdf"],
  soundaiR328: ["深圳湾：声智 × 全志 R328 模组（2019-11）", "https://www.shenzhenware.com/articles/13583"],
  soundaiGX: ["深圳湾：声智 × 国芯 GX8008 模组（2019-12）", "https://www.shenzhenware.com/articles/13718"],
  soundai21ic: ["21ic：声智离在线混合语音模组（2020-05）", "https://www.21ic.com/article/731027.html"],
};
const notesOf = (keys, extra) => (extra ? extra + "\n\n" : "") + "来源：\n" + keys.map((k, i) => `${i + 1}. ${SRC[k][0]}：${SRC[k][1]}`).join("\n");

// ================= 1 封面 =================
{
  const s = p.addSlide({ masterName: "COVER" });
  s.addShape(p.shapes.LINE, { x: 0.9, y: 3.55, w: 11.5, h: 0, line: { color: C.navy, width: 1.25 } });
  T(s, "声源定位与波束成形技术总结", { x: 0.9, y: 2.3, w: 11.5, h: 0.9, fontSize: 34, bold: true, color: C.navy, valign: "bottom" });
  T(s, "会议系统与智能家居：技术原理、大 / 小模型选型、连云 / 离线端侧、友商竞品", { x: 0.9, y: 3.75, w: 11.5, h: 0.5, fontSize: 16, color: C.gray });
  T(s, "2026 年 11 月", { x: 0.9, y: 4.35, w: 11.5, h: 0.4, fontSize: 14, color: C.gray });
}

// ================= 2 总结 =================
{
  const s = newSlide("总结", "各项依据见后续页；数字均为厂商公开资料、论文或理想条件下的计算", "本页各条的依据：原理第 3–5 页；模型第 6 页；连云 / 端侧第 7 页；竞品第 8–10 页；智能家居第 11 页；本项目选型第 12 页。");
  key(s, "会议系统和智能家居都是多人场景，声源定位给出方位，波束成形按方位拾音");
  table(s, [
    [cell("项目"), cell("结论")],
    [bold("两者的关系"), cell("定位给出发言人方位（同时驱动摄像头取景）；波束成形按这个方位增强目标、压低其他方向。会议和家居都是多人场景，两者配套使用")],
    [bold("技术原理"), cell("定位：时间差类（SRP-PHAT）、子空间类（MUSIC、GEVD-MUSIC）、神经网络三类。波束：固定、自适应（MVDR / GSC）、神经网络掩码 + 多通道滤波、端到端多通道网络四类")],
    [bold("小阵列的限制"), cell(`6 麦线阵（孔径 17.5 cm）用延迟求和，1 kHz 以下指向性只有 ${f1(LIN.DS["250"].DI_dB)}–${f1(LIN.DS["1000"].DI_dB)} dB；定位偏 10° 时目标损失 ${f1(LIN["DS_测向偏差损失_1to4kHz_dB"]["10°"])} dB（计算）`)],
    [bold("大 / 小模型"), cell("端侧可部署的定位与增强网络约 3.7 万–231 万参数；本项目定位网络部署档 0.28 M、开发版 2.13 M 与此一致。千万级以上（1450 万–1.28 亿）及 70 亿参数的空间音频大语言模型只在服务器上运行")],
    [bold("连云 / 端侧"), cell("回声消除、定位、波束成形、降噪、摄像头取景都在设备上逐帧运行；连云的是增强后的单路语音，用于转写、识别和对话")],
    [bold("友商竞品"), cell("会议视频条 6–16 麦，吊顶阵列 28–64 单元，普遍为多波束 + 自适应 + 网络降噪；音箱 3–7 麦。部分公开了芯片和离线 / 在线情况；定位模块的内存、模型大小、时延只有乐鑫公开")],
    [bold("智能家居"), cell("用唤醒词锁定说话人方向；设备自身播放比人声高 30–40 dB，回声消除是前提")],
    [bold("本项目选型"), cell("会议室 6 麦线阵（孔径 17.5 cm）；端侧小网络定位（部署档 0.28 M 参数），传统方法作对照；全部端侧离线运行")],
  ], 0.6, 1.72, [2.0, 10.13], [0.4, 0.58, 0.58, 0.58, 0.58, 0.58, 0.58, 0.5, 0.5], { fontSize: 11 });
}

// ================= 3 会议系统：场景与处理流程 =================
{
  const s = newSlide("会议系统：场景与处理流程", "拾音距离为厂商公开规格；流程按会议设备的公开做法归纳，模块名称为通用叫法",
    notesOf(["owl", "yealink", "rally", "ideahub", "ciscoBar", "ciscoCeil", "ciscoBlog", "tcc2", "homepod"],
      "回声消除：远端参会人的声音从本地喇叭播出，会被麦克风收进；不先消除，定位会被喇叭声带偏（Cisco 社区也提到本地扩声会干扰发言人跟踪）。HomePod 资料给出播放声比人声高 30–40 dB、回声消除后残留仍可比人声高 10–20 dB。\n摄像头执行方式：机械转向（Logitech 主摄云台）、数字取景（Jabra、Owl）、多镜头切换（Cisco Quad Camera）。"));
  key(s, "定位给出发言人方位，同时用于摄像头取景和波束拾音；回声消除在定位之前");
  const Y = 1.8, H = 1.2, W = 1.84, G = 0.218;
  const blocks = [
    ["麦克风阵列", "视频条 4–16 麦\n吊顶 28–64 单元"],
    ["回声消除", "去掉喇叭播出的远端声音\n参考：远端播放信号"],
    ["声源定位", "SRP-PHAT / MUSIC / 网络\n输出方位 + 置信度"],
    ["波束成形", "按方位形成波束\n自适应：干扰方向置零"],
    ["降噪 / 混音", "单通道网络降噪\n多波束自动混音"],
    ["输出", "单路语音\n→ 编码上行 / 转写"],
  ];
  const xs = blocks.map((_, i) => 0.6 + i * (W + G));
  blocks.forEach(([t, d], i) => {
    s.addShape(p.shapes.RECTANGLE, { x: xs[i], y: Y, w: W, h: H, fill: { color: i === 2 || i === 3 ? C.navyPale : "FFFFFF" }, line: { color: i === 2 || i === 3 ? C.navy : C.box, width: i === 2 || i === 3 ? 1.25 : 0.75 } });
    T(s, t, { x: xs[i], y: Y + 0.1, w: W, h: 0.36, fontSize: 12.5, bold: true, align: "center", color: C.navy });
    T(s, d, { x: xs[i] + 0.06, y: Y + 0.5, w: W - 0.12, h: 0.62, fontSize: 9.5, align: "center", color: C.gray });
    if (i > 0) line(s, xs[i - 1] + W, Y + H / 2, xs[i], Y + H / 2);
  });
  // 下方：远端参考、开口检测、摄像头取景
  const Y2 = 3.35, H2 = 0.62;
  box(s, "远端播放信号（参考）", xs[1] + 0.1, Y2, W - 0.2, H2, { fs: 10 });
  line(s, xs[1] + W / 2, Y2, xs[1] + W / 2, Y + H);
  box(s, "开口 / 换人检测", xs[2] - 0.05, Y2, 1.35, H2, { fs: 10 });
  line(s, xs[2] + 0.625, Y2, xs[2] + 0.625, Y + H);
  box(s, "摄像头取景：云台 / 数字取景 / 多镜头切换", xs[3] + 0.25, Y2, 2 * W + G - 0.5, H2, { fs: 10 });
  line(s, xs[2] + W - 0.2, Y + H, xs[2] + W - 0.2, Y2 + H2 / 2, { arrow: false });
  line(s, xs[2] + W - 0.2, Y2 + H2 / 2, xs[3] + 0.25, Y2 + H2 / 2);
  T(s, "方位", { x: xs[2] + W - 0.15, y: Y + H + 0.12, w: 0.5, h: 0.25, fontSize: 9, color: C.gray });
  // 场景条件表
  table(s, [
    [cell("场景条件"), cell("会议系统")],
    [bold("说话人"), cell("多人围桌、轮流发言，常有抢话；换人后摄像头和拾音要跟着切换")],
    [bold("拾音距离"), cell("公开规格 5.5–12 m：Meeting Owl 4+ 5.5 m、Yealink A40 6 m（4 m 内高质量）、Logitech Rally Bar 7 m、华为 IdeaHub ES2 Plus 12 m")],
    [bold("干扰"), cell("远端参会人的声音从本地喇叭播出；空调、投影仪噪声；房间混响")],
    [bold("阵列安装"), cell("视频条装在屏幕上方或下方，贴前墙；吊顶阵列装在会议桌上方，按区域拾音")],
    [bold("输出给谁"), cell("方位 → 摄像头取景与波束成形；增强后的单路语音 → 编码上行、转写")],
  ], 0.6, 4.3, [2.0, 10.13], [0.36, 0.42, 0.42, 0.42, 0.42, 0.42], { fontSize: 10.5 });
}

// ================= 4 声源定位：方法 =================
{
  const s = newSlide("声源定位：方法", "资源与效果均为原文数字；各方案的数据集、阵列与指标不同，精度不能横向比较",
    notesOf(["odas", "smp", "espDoa", "ipdnet2", "cross3d", "realman"],
      "GEVD-MUSIC：先用开口前一段只有背景（噪声 + 混响 + 其他声源）的协方差做白化，再做 MUSIC；对持续干扰（喇叭、空调）有效，背景段里若有目标本人或刚停的上一位发言人则会失效。\n乐鑫 ESP-SR DOA 条件：ESP32-P4 400 MHz，4 麦圆阵半径 5 cm，10° 网格；206 KB = 内部 RAM 57 KB + PSRAM 149 KB。"));
  key(s, "传统方法算力小、无需训练；神经网络在多人和混响下更稳，但效果取决于训练数据与场景是否匹配");
  T(s, "基本关系：声音到两个麦克风的时间差 τ = d·sinθ / c（d 为间距，θ 为方位，c = 343 m/s）。17.5 cm 线阵两端最大时间差 0.51 ms，16 kHz 采样下约 8 个采样点。", { x: 0.6, y: 1.66, w: 12.13, h: 0.42, fontSize: 11.5, color: C.ink, valign: "middle" });
  table(s, [
    [cell("类别"), cell("原理"), cell("资源（公开数字）"), cell("效果（原文口径）"), cell("会议场景的难点")],
    [bold("时间差类\nGCC-PHAT、SRP-PHAT"), cell("各麦克风对的到达时间差；按候选方向把各对互相关相加，取能量最大的方向"),
      cell("ODAS（8 麦）：树莓派 3 单核 14%\nSMP-PHAT（4 麦）：树莓派 4 每帧约 0.10 ms"), cell("SMP-PHAT 平均误差 16.2°"), cell("抢话、喇叭播放时，峰值容易落在干扰上")],
    [bold("子空间类\nMUSIC、Capon、GEVD-MUSIC"), cell("对多路协方差做特征分解，用噪声子空间与方向向量正交找峰；GEVD 先用开口前的背景协方差白化"),
      cell("乐鑫 ESP-SR（Capon，4 麦）：内存约 206 KB，每 8 ms 帧 0.65 ms，CPU 8.1%"), cell("乐鑫官方仿真：±10° 内 100%"), cell("开口前的背景段里若有别人说话，白化失效")],
    [bold("神经网络\nCRNN、IPDnet2"), cell("输入各麦相位差或多路频谱，网络直接输出方向；可同时输出置信度、多个声源"),
      cell("IPDnet2-Tiny：0.5 M 参数，0.2 GFLOPs/s\nCross3D-Edge：0.14 M 参数，树莓派 4B 每帧 8.59 ms"), cell("IPDnet2（RealMAN 实录）：误差 1.2–1.6°\nRealMAN 基线 5° 内：只用仿真训练 60.4%，用实录训练 89.2%"), cell("需要与会议室匹配的训练数据（阵列、安装位置、干扰）")],
  ], 0.6, 2.15, [2.05, 3.0, 2.85, 2.5, 1.73], [0.4, 1.15, 1.15, 1.35], { fontSize: 10.5 });
  T(s, "DOA：声源到达方向估计。会议系统只需要方向（摄像头转到哪里、波束对准哪里），不需要距离和声音类别。", { x: 0.6, y: 6.33, w: 12.13, h: 0.45, fontSize: 11, color: C.gray });
}

// ================= 5 波束成形：方法 =================
{
  const s = newSlide("波束成形：方法", "计算量为估算（6 麦、512 点 FFT、帧移 16 ms：257 个频点、每秒 62.5 帧）；参数量与实例为公开资料",
    "指向性计算：理想自由场、远场平面波，对各向同性扩散噪声；目标在线阵正前方；不含混响与麦克风误差（计算脚本 code/ssl_baseline/scripts/bf_directivity.py）。超指向波束（白噪声增益约束 ≥ −10 dB）在 250 Hz / 1 kHz 为 " + f1(LIN["超指向"]["250"].DI_dB) + " / " + f1(LIN["超指向"]["1000"].DI_dB) + " dB。\n" + notesOf(["shure", "rally", "ciscoCeil", "espGsc", "homepod", "rnnoise", "dfn2", "spatialnet", "tfgrid"],
      "估算：固定波束每帧每频点 6 次复乘，6 × 257 × 62.5 ≈ 9.6 万次复乘 / 秒；自适应波束每次更新每频点解一个 6 × 6 线性方程组（约 6³ / 3 ≈ 72 次复乘加的分解 + 回代），257 个频点约 2–3 万次复乘加。\n乐鑫 GSC：ESP32-P4 400 MHz 单核约 20%（ESP-SR 用户指南），滤波器收敛约 1 s。\nHomePod：6 麦；多通道回声消除；深度学习掩码 + 多通道维纳滤波；无监督盲源分离为多路，用 \"Hey Siri\" 检测器选出目标那一路；在 A8 芯片上常开运行。"));
  key(s, "会议产品公开的做法是多波束 + 自适应；神经网络主要用在掩码估计和后置降噪");
  T(s, "每个频点 y = wᴴx。延迟求和：w = a / M；MVDR：w = R⁻¹a / (aᴴR⁻¹a)。a：目标方向向量，R：噪声与干扰协方差，M：麦克风数。", { x: 0.6, y: 1.66, w: 12.13, h: 0.42, fontSize: 11.5, color: C.ink, valign: "middle" });
  table(s, [
    [cell("类别"), cell("原理"), cell("需要的输入"), cell("计算量 / 规模"), cell("公开实例")],
    [bold("固定波束\n延迟求和、超指向、差分"), cell("按目标方位补偿各麦时延后加权相加；超指向按扩散噪声优化权重，低频更强但放大麦克风噪声"),
      cell("目标方位"), cell("每秒约 9.6 万次复乘（估算）"), cell("Shure MXA920：可手动指向 8 个拾音波瓣，8 路独立输出")],
    [bold("自适应波束\nMVDR、GSC"), cell("目标方向增益保持为 1，使输出总能量最小；能在干扰方向形成零陷"),
      cell("目标方位 + 噪声 / 干扰协方差（在目标不说话时估计）"), cell("每次更新约 2–3 万次复乘加（估算）\n乐鑫 GSC：400 MHz 单核约 20%，收敛约 1 s"), cell("Logitech Rally Bar：6 麦形成 5 个自适应波束\nCisco 吊顶麦 Pro：64 单元，8 个自适应波束")],
    [bold("神经网络掩码\n+ 多通道滤波"), cell("网络估计每个时频点是目标还是干扰（掩码），据此算协方差，再做 MVDR 或多通道维纳滤波"),
      cell("多路频谱；目标方位或唤醒词"), cell("同类增强网络：RNNoise 8.8 万参数，DeepFilterNet2 231 万参数"), cell("Apple HomePod：6 麦，掩码多通道维纳滤波 + 盲源分离成多路，由唤醒词检测选路")],
    [bold("端到端多通道网络\n分离、目标说话人提取"), cell("网络直接从多路信号输出目标语音，不显式求波束权重"),
      cell("多路波形或频谱"), cell("SpatialNet 160 万 / 730 万参数，TF-GridNet 1450 万参数"), cell("论文为主；未见会议产品公开采用")],
  ], 0.6, 2.15, [2.1, 3.3, 2.0, 2.45, 2.28], [0.4, 0.95, 1.1, 0.95, 0.78], { fontSize: 10.5 });
  const Ls = LIN["DS_测向偏差损失_1to4kHz_dB"];
  T(s, `6 麦线阵（17.5 cm）延迟求和的指向性：250 Hz ${f1(LIN.DS["250"].DI_dB)} dB、1 kHz ${f1(LIN.DS["1000"].DI_dB)} dB、4 kHz ${f1(LIN.DS["4000"].DI_dB)} dB；定位偏 10° 目标损失 ${f1(Ls["10°"])} dB，偏 20° 损失 ${f1(Ls["20°"])} dB（理想条件计算）`,
    { x: 0.6, y: 6.4, w: 12.13, h: 0.36, fontSize: 10.5, color: C.ink, valign: "middle" });
}

// ================= 6 大 / 小模型选型 =================
{
  const s = newSlide("大 / 小模型选型", "参数量为论文原文数字，横轴为对数刻度；DCASE 2025 第 1 名为多模型集成；DTLN 原文为\"少于 100 万\"，图中按 100 万画",
    notesOf(["lightdoa", "rnnoise", "cross3d", "ipdnet2", "dcase24", "dtln", "spatialnet", "dfn2", "tfgrid", "dcase25", "bat"],
      "本项目定位网络：部署档 276,508 个参数、每次判决约 2.73 亿次乘加、8 比特权重约 270 KB；开发版 2.13 M 参数、每次判决约 11.1 亿次乘加。\n端侧实测：Cross3D-Edge 0.14 M 参数，树莓派 4B 每帧 8.59 ms、127 MFLOPS；RNNoise 约 8.8 万权重，总计算约 40 MFLOPS（网络 17.5），未优化 C 代码占树莓派 3（1.2 GHz）约 14%；DeepFilterNet2 在笔记本 i5 单线程实时率 0.04；DTLN 可在树莓派 3B+ 上实时运行（TF-Lite 量化）。\nBAT：空间音频编码器 Spatial-AST + LLaMA-2 7B，回答声音的方向、距离与相互关系，训练数据为合成双耳音频。"));
  key(s, "本项目定位网络部署档 0.28 M、开发版 2.13 M，与端侧可部署的模型同量级；千万级以上和大语言模型只在服务器上运行");
  const SSL = C.navy, ENH = "8DA9C4", OURS = "404040";
  const items = [
    { name: "LightDOA（定位，2025）", value: 3.7e4, label: "3.7 万", color: SSL },
    { name: "RNNoise（降噪）", value: 8.8e4, label: "8.8 万", color: ENH },
    { name: "Cross3D-Edge（定位）", value: 1.4e5, label: "14 万", color: SSL },
    { name: "本项目定位网络（部署档）", value: 2.77e5, label: "28 万", color: OURS },
    { name: "IPDnet2-Tiny（定位）", value: 5e5, label: "50 万", color: SSL },
    { name: "DCASE 2024 基线（定位 + 检测）", value: 7.4e5, label: "74 万", color: SSL },
    { name: "DTLN（降噪）", value: 1e6, label: "< 100 万", color: ENH },
    { name: "SpatialNet-small（多通道分离）", value: 1.6e6, label: "160 万", color: ENH },
    { name: "本项目定位网络（开发版）", value: 2.13e6, label: "213 万", color: OURS },
    { name: "DeepFilterNet2（降噪）", value: 2.31e6, label: "231 万", color: ENH },
    { name: "SpatialNet-large（多通道分离）", value: 7.3e6, label: "730 万", color: ENH },
    { name: "IPDnet2-Large（定位）", value: 7.8e6, label: "780 万", color: SSL },
    { name: "TF-GridNet（分离）", value: 1.45e7, label: "1450 万", color: ENH },
    { name: "DCASE 2025 第 1 名（集成）", value: 5.85e7, label: "5850 万", color: SSL },
    { name: "EINV2（定位 + 检测）", value: 1.28e8, label: "1.28 亿", color: SSL },
  ];
  const X0 = 0.6, Y0 = 1.8, RH = 0.29, W = 7.9;
  // 端侧量级底色（10 万–100 万）
  const hb = { nameW: 2.75, labW: 0.85, vmin: 1e4, vmax: 2e8, log: true };
  const bw = W - hb.nameW - hb.labW, pos = (v) => bw * (Math.log10(v) - 4) / (Math.log10(2e8) - 4);
  s.addShape(p.shapes.RECTANGLE, { x: X0 + hb.nameW + pos(1e5), y: Y0 - 0.05, w: pos(1e6) - pos(1e5), h: items.length * RH + 0.07, fill: { color: "E4ECF4" }, line: { type: "none" } });
  hbars(s, items, X0, Y0, W, RH, Object.assign({ fs: 10, ticks: [[1e4, "1 万"], [1e5, "10 万"], [1e6, "100 万"], [1e7, "1000 万"], [1e8, "1 亿"]] }, hb));
  // 图例
  [[SSL, "定位"], [ENH, "降噪 / 分离"], [OURS, "本项目"], ["E4ECF4", "端侧常见量级（10 万–100 万）"]].forEach(([c, t], i) => {
    const lx = X0 + 0.2 + [0, 1.25, 2.85, 4.2][i];
    s.addShape(p.shapes.RECTANGLE, { x: lx, y: 6.52, w: 0.22, h: 0.16, fill: { color: c }, line: { type: "none" } });
    T(s, t, { x: lx + 0.3, y: 6.45, w: 2.6, h: 0.3, fontSize: 10, color: C.gray, valign: "middle" });
  });
  table(s, [
    [cell("档位"), cell("规模与运行位置")],
    [bold("小模型"), cell("几万–两百多万参数；8 比特量化后约 0.04–2.3 MB。端侧实测：Cross3D-Edge 树莓派 4B 每帧 8.59 ms；RNNoise 约 40 MFLOPS")],
    [bold("大模型"), cell("千万–上亿参数（TF-GridNet 1450 万、DCASE 2025 第 1 名 5850 万、EINV2 1.28 亿），服务器上运行")],
    [bold("大语言模型"), cell("BAT（2024）：空间音频编码器 + LLaMA-2 7B（70 亿参数），能回答声音的方向和距离，只能在服务器上运行")],
    [bold("选型口径"), cell("与竞品同量级（端侧几百 K 参数）；开发时先放大约 10 倍训练，再剪枝、减通道并做 8 比特量化")],
    [bold("本项目"), cell("定位网络（卷积 + 双向 GRU）：部署档 0.28 M 参数，每次判决约 2.7 亿次乘加，8 比特权重约 270 KB；开发版放大到 2.13 M（约 8 倍）")],
  ], 8.75, 1.75, [1.1, 2.88], [0.34, 1.0, 0.8, 0.9, 0.8, 1.0], { fontSize: 10 });
}

// ================= 7 连云 / 离线端侧 =================
{
  const s = newSlide("连云 / 离线端侧", "带宽为计算（16 kHz、16 bit PCM，未压缩）；其余为厂商公开资料",
    notesOf(["rally", "ciscoLocal", "echoShow", "homepod", "fesp", "espDoa", "az1"],
      "带宽：6 路 × 16,000 × 16 bit = 1.536 Mbit/s；单路 0.256 Mbit/s。会议系统常用 48 kHz 采样时再乘 3。\nCisco：所有与摄像头切换和控制相关的智能都在设备本地运行（Cisco Connect 资料）。Echo Show 10：声学定位与视觉在 AZ1 Neural Edge 上端侧处理，图像不出设备。Echo（2021）：AZ1 可在设备上识别部分常用命令，不必上传音频。"));
  key(s, "定位、波束成形和回声消除都在设备上逐帧运行；连云的是增强后的单路语音和上层应用");
  table(s, [
    [cell("环节"), cell("运行位置"), cell("原因"), cell("公开做法")],
    [bold("回声消除、定位、波束成形、降噪"), cell("端侧"), cell("逐帧处理（每帧十几毫秒），延迟直接影响通话与转向；上传 6 路原始音频需 1.54 Mbit/s，波束后单路只需 0.26 Mbit/s"),
      cell("Logitech Rally Bar：6 麦、5 个自适应波束、回声消除、AI 降噪在整机内；HomePod：6 麦前端在 A8 上常开运行；思必驰离线前端 SDK、乐鑫 ESP-SR 离线运行")],
    [bold("开口 / 唤醒检测"), cell("端侧常开"), cell("需要一直监听；音频不出设备"), cell("思必驰离线前端：唤醒后回调方位 {\"doa\": 95}")],
    [bold("发言人跟踪、摄像头取景"), cell("端侧"), cell("要连续处理每一帧音频和画面；画面不出设备"), cell("Cisco：摄像头切换与控制的智能全部在设备本地运行；Echo Show 10：定位与视觉在 AZ1 上处理")],
    [bold("转写、识别、会议纪要、对话"), cell("云端（部分命令词端侧）"), cell("输入为增强后的单路语音；模型大、需要联网服务"), cell("Echo：AZ1 可在设备上识别部分常用命令，其余请求上云")],
  ], 0.6, 1.72, [2.45, 1.45, 3.7, 4.53], [0.4, 1.2, 0.7, 0.85, 0.75], { fontSize: 10.5 });
}

// ================= 8 友商竞品：会议系统 =================
{
  const s = newSlide("友商竞品：会议系统", "厂商官网、数据表与技术博客；各家定位与波束的算法、模型大小均未公开，芯片与部署见第 9 页",
    notesOf(["rally", "ciscoBar", "ciscoBarPro", "jabra", "yealink", "owl", "ideahub", "c60", "shure", "tcc2", "ciscoCeil", "ciscoBlog"],
      "Cisco Room Bar：4 单元阵列做波束降噪，另有专用麦克风阵列做发言人跟踪；Room Bar Pro：16 单元阵列。Cisco Quad Camera：内置 8 麦只用于发言人跟踪计算。Shure MXA920 的单元数未公开。Sennheiser TCC2 的约 60 m² 为零售商转引厂商说法。"));
  key(s, "视频条 6–16 麦、拾音 5.5–12 m；吊顶阵列 28–64 单元，按区域自动跟随说话人");
  const R = (cat, name, mic, loc, bf, rng) => [cell(cat, { align: "center" }), bold(name), cell(mic), cell(loc), cell(bf), cell(rng)];
  table(s, [
    [cell("类别"), cell("产品"), cell("麦克风"), cell("找发言人"), cell("波束成形 / 拾音"), cell("拾音范围")],
    R("视频条", "Logitech Rally Bar", "6 个全向 MEMS", "音频 + 双摄识别当前发言人，主摄云台转向", "5 个自适应波束；回声消除、语音检测、AI 降噪", "7 m"),
    R("视频条", "Cisco Room Bar / Pro", "4 单元 / 16 单元", "Room Bar 另有专用麦阵做发言人跟踪", "阵列波束成形降噪", "—"),
    R("视频条", "Jabra PanaCast 50", "8 个", "Virtual Director 实时聚焦发言人（数字取景）", "8 麦波束成形阵列", "—"),
    R("视频条", "Yealink MeetingBar A40", "8 个 MEMS", "发言人跟踪、自动取景", "—", "6 m（4 m 内高质量）"),
    R("一体机", "Meeting Owl 4+", "8 个全向", "结合视觉、声音、动作聚焦说话人（360° 数字取景）", "—", "半径 5.5 m"),
    R("一体机", "华为 IdeaHub ES2 Plus", "12 个", "智能跟踪 3.0（发言人跟踪）", "波束成形拾音", "12 m"),
    R("摄像机", "思必驰 C60", "8 麦线阵", "语音定位 → 视觉锁定 → 云台特写", "—", "—"),
    R("吊顶", "Cisco Ceiling Mic Pro", "64 单元", "音频三角定位，配合摄像头跟踪与切换", "8 个自适应波束", "—"),
    R("吊顶", "Sennheiser TCC2", "28 单元", "实时识别正在说话的人", "动态波束自动跟随说话人", "约 60 m²"),
    R("吊顶", "Shure MXA920", "未公开", "自动覆盖，无需设置", "或手动指向 8 个波瓣，8 路输出", "30 × 30 英尺"),
  ], 0.6, 1.72, [0.85, 2.15, 1.35, 3.45, 2.95, 1.38], [0.36, 0.43, 0.43, 0.43, 0.43, 0.43, 0.43, 0.43, 0.43, 0.43, 0.43], { fontSize: 10 });
}

// ================= 9 友商竞品：部署与资源 =================
{
  const s = newSlide("友商竞品：部署与资源", "厂商官网、手册、招股书与报道；\"未公开\"表示公开资料中查不到",
    notesOf(["c60", "fesp", "th1520", "th2608", "aispeechIPO", "ezviz", "ezvizChip", "echoShow", "homepod", "ciscoLocal", "soundaiR328", "soundaiGX", "soundai21ic", "espDoa", "xmos"],
      "芯片有 DSP / NPU 不能说明定位在其上执行；整机芯片算力也不等于定位模块的开销。萤石 1.0T 为系列口径，单款型号未公开。乐鑫数字的条件：ESP32-P4 400 MHz，4 麦圆阵半径 5 cm，10° 网格。"));
  key(s, "芯片和离线 / 在线情况部分公开；定位模块的内存、模型大小和时延只有乐鑫公开");
  const N = (t) => cell(t, { color: "7F7F7F" });
  table(s, [
    [cell("产品 / 方案"), cell("芯片 / 算力"), cell("离线 / 在线"), cell("内存 / 模型"), cell("时延"), cell("公开的定位与波束信息")],
    [bold("思必驰 C60（会议摄像机）"), N("未公开"), N("未公开"), N("未公开"), N("未公开"), cell("8 麦线阵；语音定位 → 视觉锁定 → 云台特写")],
    [bold("思必驰离线前端 SDK"), cell("自研芯片 TH1520（双 DSP，常开毫瓦级）、TH2608（Cortex-M + DSP + NPU）；SDK 支持平台未公开"), cell("离线"), N("未公开"), N("未公开"), cell("线阵 4 / 6 麦，16 kHz 输入；回声消除、定位、波束、唤醒一体，唤醒后回调方位")],
    [bold("萤石 C6Wi 4K（家用云台）"), cell("系列标注专用芯片 1.0T 算力"), cell("端侧运行"), N("未公开"), N("未公开"), cell("3 麦听声辨位 → 云台转向 → AI 追踪")],
    [bold("声智离在线语音模组"), cell("全志 R328；国芯 GX8008（运行约 100 mW，待机 < 25 mW）"), cell("离在线混合"), N("未公开"), N("未公开"), cell("2 / 4 / 8 麦；回声消除、降噪、声源定位、波束成形")],
    [bold("Amazon Echo Show 10"), cell("自研 AZ1 Neural Edge"), cell("端侧（图像不出设备）"), N("未公开"), N("未公开"), cell("声学定位 + 视觉识别人体，区分人声与墙面反射")],
    [bold("Apple HomePod"), cell("A8"), cell("前端端侧常开"), N("未公开"), N("未公开"), cell("6 麦；掩码多通道维纳滤波 + 盲源分离，唤醒词选路")],
    [bold("Cisco 会议终端"), N("未公开"), cell("摄像头切换与控制在本地运行"), N("未公开"), N("未公开"), cell("麦阵定位发言人大致位置，人脸检测确认")],
    [bold("XMOS XVF3800（芯片）"), cell("专用语音处理器"), cell("端侧"), N("未公开"), N("未公开"), cell("4 麦；1 个扫描波束 + 2 个跟踪波束，主机可读说话人方位")],
    [bold("乐鑫 ESP-SR（芯片 SDK）"), cell("ESP32-P4 400 MHz，CPU 8.1%"), cell("端侧"), cell("约 206 KB；无神经网络"), cell("每 8 ms 帧处理 0.65 ms"), cell("4 麦 Capon，10° 网格")],
  ], 0.6, 1.72, [2.3, 2.75, 1.45, 1.35, 1.25, 3.03], [0.38, 0.45, 0.68, 0.45, 0.55, 0.45, 0.45, 0.45, 0.45, 0.45], { fontSize: 10 });
}

// ================= 10 麦克风数量 =================
{
  const s = newSlide("麦克风数量", "厂商官网与数据表；Shure MXA920 单元数未公开，未列入；Amazon Echo 为第一代",
    notesOf(["rally", "jabra", "yealink", "owl", "c60", "ideahub", "ciscoBarPro", "tcc2", "ciscoCeil", "google", "homepod2", "homepod", "soundx", "echoDev", "xmos"]));
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
  // 64 截断标记
  const iC = items.findIndex((d) => d.value > VMAX), yC = Y0 + iC * RH;
  [0.0, 0.09].forEach((dx) => s.addShape(p.shapes.LINE, { x: g.x0 + g.bw - 0.55 + dx, y: yC + 0.03, w: 0.08, h: RH - 0.06, line: { color: "FFFFFF", width: 2 } }));
  // 图例与结论
  [[CM, "会议视频条 / 一体机 / 摄像机"], [CC, "会议吊顶阵列"], [CS, "智能音箱"], [CH, "语音芯片"]].forEach(([c, t], i) => {
    s.addShape(p.shapes.RECTANGLE, { x: 9.2, y: 1.95 + i * 0.36, w: 0.24, h: 0.17, fill: { color: c }, line: { type: "none" } });
    T(s, t, { x: 9.52, y: 1.86 + i * 0.36, w: 3.2, h: 0.34, fontSize: 11, valign: "middle" });
  });
  S.para(s, [
    "会议视频条多为 8 麦（7 款中 4 款），音箱多为 6 麦（6 款中 3 款）；吊顶阵列 28–64 单元，用于大房间按区域拾音。",
    "数量不等于孔径：视频条受机身长度限制，吊顶阵列孔径大、低频指向性更好。",
    "Cisco Ceiling Mic Pro 64 单元，条形截断显示。",
  ], 9.2, 3.55, 3.53, 2.9, { fontSize: 11.5 });
}

// ================= 11 智能家居 =================
{
  const s = newSlide("智能家居", "厂商官网、技术博客与论文；萤石、海雀为家用云台摄像头",
    notesOf(["echoSIR", "echoDev", "homepod", "homepod2", "echoShow", "google", "soundx", "ezviz", "az1"],
      "华为智选海雀（雀蛋 Pro）：双麦，唤醒后转向，评测称正面 180° 内识别（第三方评测，官方页面未找到）。萤石 C6Wi：商城标注 3MIC 听声辨位。"));
  key(s, "智能家居用唤醒词锁定说话人方向；设备自身在播放，回声消除是前提");
  table(s, [
    [cell("项目"), cell("内容")],
    [bold("场景特点"), cell("唤醒词触发；设备自己播放音乐，播放声比人声高 30–40 dB，回声消除后残留仍可高出 10–20 dB（HomePod）；电视、家人交谈")],
    [bold("定位与波束"), cell("Echo：多个波束，按子带信干比选出一个波束送唤醒与识别\nHomePod：回声消除 → 掩码多通道维纳滤波 → 盲源分离成多路，由唤醒词检测选出目标那一路\nEcho Show 10：声学定位 + 视觉识别人体，区分人声与墙面反射后转屏")],
    [bold("麦克风"), cell("音箱 3–7 麦：Amazon Echo 7、Apple HomePod 6（第二代 4）、Google Home Max 6、华为 Sound X 6、Google Nest Audio 3")],
    [bold("带云台的摄像头"), cell("萤石 C6Wi：3 麦听声辨位，云台转向；华为智选海雀 Pro：双麦，唤醒后转向（评测）")],
    [bold("端侧 / 云"), cell("前端在设备上常开（HomePod 用 A8；Echo Show 10 用 AZ1）；部分常用命令可在 Echo 上端侧识别，其余上云")],
  ], 0.6, 1.72, [2.0, 10.13], [0.38, 0.62, 1.3, 0.55, 0.55, 0.55], { fontSize: 11 });
}

// ================= 12 本项目选型 =================
{
  const s = newSlide("本项目选型", "阵列数据为仿真（镜像源法会议室，开口后 0.5 s 判决）；竞品数据为公开资料；波束成形的方法与分工【待确认】",
    "阵列选型仿真：会议室 5–10 m × 4–7 m，RT60 0.3 / 0.6 s，阵列装在前墙上方，四种情况（换人、抢话、远端喇叭、空调噪声）平均，GEVD-MUSIC 测向。线阵孔径 10.5 → 17.5 cm 准确率提高 8–18 个百分点；17.5 cm 时 6 麦 88%、8 麦 87%；4 麦圆阵（孔径 6 cm）贴墙 63%，离墙 50 cm 约 68%。\n部署档网络 276,508 个参数，每次判决约 2.73 亿次乘加；开发版 2.13 M 参数。");
  key(s, "6 麦线阵 + 端侧小网络：麦克风数与主流视频条相当，模型与端侧公开模型同量级，全部端侧离线");
  table(s, [
    [cell("项目"), cell("选型"), cell("原因"), cell("与竞品对比")],
    [bold("场景与输出"), cell("会议室发言人跟踪：只输出方位与置信度"), cell("摄像头取景和波束拾音只需要方向；不估距离和声音类别，算力最省"), cell("会议产品公开的都是发言人方向跟踪")],
    [bold("阵列"), cell("6 麦线阵，孔径 17.5 cm，平行于前墙；4 麦线阵作低成本备选"), cell("仿真：孔径比麦克风数重要，6 麦与 8 麦效果相当；圆阵贴墙安装受前墙反射影响明显变差，线阵不敏感"), cell("与 Logitech Rally Bar（6 麦）同数，少于多数视频条的 8 麦")],
    [bold("定位方法"), cell("端侧小网络（卷积 + 双向 GRU，输入各麦相位差）；SRP-PHAT、GEVD-MUSIC 作对照"), cell("抢话、远端喇叭时传统方法的峰值容易落在干扰上；网络可从数据中学到区分，并给出置信度"), cell("竞品定位算法未公开；学术端侧模型如 IPDnet2-Tiny（0.5 M）")],
    [bold("模型规格"), cell("部署档 0.28 M 参数，每次判决约 2.7 亿次乘加，8 比特权重约 270 KB；开发版 2.13 M"), cell("与端侧同量级；先训大模型找到效果上限，再压缩到端侧规模"), cell("约为 IPDnet2-Tiny 的 55%；与乐鑫传统定位的内存（约 206 KB）同量级")],
    [bold("运行位置"), cell("端侧离线"), cell("逐帧实时；音频不出设备；不依赖网络"), cell("Cisco、HomePod、Echo Show 10、思必驰离线 SDK 的前端都在端侧")],
    [bold("与波束成形的接口"), cell("方位 + 置信度交给波束成形"), cell(`定位偏 10° 波束目标损失 ${f1(LIN["DS_测向偏差损失_1to4kHz_dB"]["10°"])} dB，误差需控制在 10° 内；置信度低时不切换`), cell("会议产品为多波束 + 自适应；波束方法与分工【待确认】")],
  ], 0.6, 1.72, [1.75, 3.45, 3.75, 3.18], [0.4, 0.62, 0.75, 0.75, 0.75, 0.55, 0.65], { fontSize: 10.5 });
}

S.save(OUT);
