// 耳机摄像头听觉辅助：声源定位与波束成形技术总结（mentor 2026-11-25 布置，与会议系统那份分开）。
// 四项：技术原理、大 / 小模型选型、连云 / 离线端侧、友商竞品，加本项目选型；只写事实、仿真与估算，不写下一步。
// 仿真数字直接读自 code/earbud_ssl/out/case1.json、case1_thresh.json、complexity.json；其余沿用整体设计方案、情况 1 分析中已核对的数字。
const path = require("path");
const fs = require("fs");
const S = require("./deck_style")("耳机摄像头听觉辅助：声源定位与波束成形技术总结");
const { p, C, T, cell, bold, ctr, table, newSlide, key, box, line, hbars } = S;
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, "..", "02_耳机声源定位"), "耳机摄像头听觉辅助_声源定位与波束成形技术总结.pptx");
const DATA = path.join(__dirname, "..", "code", "earbud_ssl", "out");
const C1 = JSON.parse(fs.readFileSync(path.join(DATA, "case1.json"), "utf-8")).results;
const TH = JSON.parse(fs.readFileSync(path.join(DATA, "case1_thresh.json"), "utf-8")).results;
const CX = JSON.parse(fs.readFileSync(path.join(DATA, "complexity.json"), "utf-8")).results;
const NOISY = "嘈杂（1.5 m 处 SNR 10 dB）", BIN = "2+1（两耳）", MONO = "单耳 2 麦";
const DK = ["0.5 m", "1 m", "2 m", "3 m", "4 m"];
const acc = (arr, m, d) => +(C1[NOISY][d][arr].methods[m].acc10 * 100).toFixed(1);
const accS = (arr, m, d) => acc(arr, m, d).toFixed(1);
const sys1dB = (d) => +TH[d]["1 dB"].acc10_pct.toFixed(1);
const mf = (k) => CX["2+1（两耳，3 路） | " + k].total_mflops;
const f1 = (x) => x.toFixed(1);

const SRC = {
  airpods: ["Apple：AirPods Pro 2 技术规格", "https://www.apple.com/sg/airpods-pro/specs/"],
  boost: ["Hearing Review：AirPods Pro Conversation Boost", "https://hearingreview.com/inside-hearing/events/apple-announces-conversation-boost-for-airpods-pro"],
  meta: ["HearingTracker：Ray-Ban Meta 二代 Conversation Focus", "https://www.hearingtracker.com/news/meta-ray-ban-gen-2-conversation-focus-ai-speech-enhancement-for-hearing-loss"],
  metaTest: ["HearingTracker：Ray-Ban Meta 听力测试（5 麦）", "https://www.hearingtracker.com/hearing-glasses/meta-ray-ban-glasses-in-hearadvisor-testing-how-do-they-perform-as-hearing-aids"],
  phonakAI: ["Phonak：Spheric Speech Clarity 技术文章（DEEPSONIC，450 万参数）", "https://phonak.com/content/dam/phonak/fr/evidence-library/technical-paper/PH_Insight_SphericSpeechClarity_210x297_EN_028-2684-02_V1.00.pdf"],
  stereoZoom: ["Phonak 白皮书：StereoZoom（双耳 4 麦波束）", "https://www.phonak.com/content/dam/phonak/en/evidence-library/white-paper/technical-paper/Phonak_Insight_StereoZoom.pdf"],
  speechSensor: ["Phonak：SpeechSensor 现场研究", "https://www.phonak.com/content/dam/phonak/en/evidence-library/field-studies/PH_FieldStudyNews_LumityDirectionalBeamforming_210x297_EN_028-2475-02_V1-00.pdf"],
  signia: ["Hearing Review：Signia IX 多说话人跟踪", "https://hearingreview.com/hearing-products/hearing-aids/signias-integrated-xperience-hearing-aid-platform-pinpoints-multiple-speakers-in-real-time"],
  lo2h: ["Look Once to Hear（CHI 2024，arXiv 2405.06289）", "https://arxiv.org/abs/2405.06289"],
  neuralaids: ["Wireless Hearables With Programmable Speech AI Accelerators（MobiCom 2025，arXiv 2503.18698）", "https://arxiv.org/abs/2503.18698"],
  vuebuds: ["VueBuds（CHI 2026，arXiv 2603.29095）", "https://arxiv.org/abs/2603.29095"],
  vuebudsNews: ["UW News：耳机里的摄像头 VueBuds", "https://www.washington.edu/news/2026/04/14/cameras-in-wireless-earbuds-vuebuds/"],
  clearbuds: ["ClearBuds（MobiSys 2022，两耳同步 < 64 µs）", "https://arxiv.org/abs/2206.13611"],
  freeclip: ["华为 FreeClip 2 S 规格", "https://consumer.huawei.com/cn/headphones/freeclip2-s/specs/"],
  stone: ["Stone & Moore 2008：开放式助听器可容忍时延", "https://www.researchgate.net/publication/5266175_Tolerable_Hearing_Aid_Delays_V_Estimation_of_Limits_for_Open_Canal_Fittings"],
  lightdoa: ["LightDOA（arXiv 2511.08012，表 3）", "https://arxiv.org/abs/2511.08012"],
  dcase24: ["DCASE 2024 SELD 基线（arXiv 2408.05057）", "https://arxiv.org/abs/2408.05057"],
  tfgrid: ["TF-GridNet 参数量（arXiv 2602.22487 对比表）", "https://arxiv.org/abs/2602.22487"],
  nearlink: ["FreeBuds Pro 5 评测（星闪时延）", "https://ngxptech.com/huawei-freebuds-pro-5-review-is-nearlink-better/"],
};
const notesOf = (keys, extra) => (extra ? extra + "\n\n" : "") + "来源：\n" + keys.map((k, i) => `${i + 1}. ${SRC[k][0]}：${SRC[k][1]}`).join("\n");
const SIMNOTE = "仿真：刚性球头部模型（无耳廓），混响 RT60 0.5 s，面前 3 人（相邻相隔 20–30°），嘈杂环境（1.5 m 处 SNR 10 dB），每点 150 次；准确率为方位误差 ≤ 10° 的比例。";

// ================= 1 封面 =================
{
  const s = p.addSlide({ masterName: "COVER" });
  s.addShape(p.shapes.LINE, { x: 0.9, y: 3.55, w: 11.5, h: 0, line: { color: C.navy, width: 1.25 } });
  T(s, "耳机摄像头听觉辅助：声源定位与波束成形技术总结", { x: 0.9, y: 2.3, w: 11.5, h: 0.9, fontSize: 30, bold: true, color: C.navy, valign: "bottom" });
  T(s, "技术原理、大 / 小模型选型、连云 / 离线端侧、友商竞品", { x: 0.9, y: 3.75, w: 11.5, h: 0.5, fontSize: 16, color: C.gray });
  T(s, "2026 年 11 月", { x: 0.9, y: 4.35, w: 11.5, h: 0.4, fontSize: 14, color: C.gray });
}

// ================= 2 总结 =================
{
  const s = newSlide("总结", "精度为仿真（刚性球头部模型）；计算量与功耗为估算；模型规模与竞品为公开资料",
    "本页各条的依据：场景第 3 页；硬件限制第 4 页；算法框图第 5 页；定位第 6 页；增强第 7 页；模型第 8 页；连云 / 端侧第 9 页；竞品第 10–11 页；本项目选型第 12 页。");
  key(s, "两只耳机一起测向就能在嘈杂环境 3 m 内找准人；难点在其他人也说话时，增强能否把相邻的人分开");
  table(s, [
    [cell("项目"), cell("结论")],
    [bold("场景"), cell("多人对话中锁定正在和你说话的人：只有他在说时只需定位；其他人也在说时还要增强目标、压低其他人")],
    [bold("硬件限制"), cell("麦克风最远只隔一个头宽，单只耳机两麦只隔 1.5 cm；新增功耗只能几 mW；声音通路时延入耳式约 10–20 ms")],
    [bold("定位"), cell(`两耳组阵 + 背景白化（GEVD-MUSIC），传统信号处理约 19 MFLOPS：嘈杂环境 3 m 处 ${accS(BIN, "GEVD-MUSIC", "3 m")}%；单只耳机 2 m 处只有 ${accS(MONO, "GEVD-MUSIC", "2 m")}%（仿真）`)],
    [bold("增强"), cell("单只耳机分不开相隔 25° 的人（约 2 dB）；两耳组阵约 8 dB，但要几毫秒级耳间音频链路；目标说话人提取时延约 20 ms")],
    [bold("模型与端侧"), cell("耳机上可跑的定位网络 3.5 万–31 万参数；定位、增强、视觉检测全部在耳机和摄像头模组上离线运行")],
    [bold("友商竞品"), cell("耳机、眼镜增强正前方，助听器增强整组说话人；能只放大一个人的只有需要注册的研究原型")],
  ], 0.6, 1.72, [2.0, 10.13], [0.4, 0.68, 0.68, 0.68, 0.68, 0.68, 0.68], { fontSize: 11.5 });
}

// ================= 3 应用场景 =================
{
  const s = newSlide("应用场景：多人对话", "精度为仿真（刚性球头部模型，见各页条件）；骨声纹与降级处理为设计",
    "移动与转头：慢速移动（≤ 20°/s）靠跟踪 + 视觉 85–92%；快速移动（40°/s）是弱点；转头需要 IMU + 视觉一起。视觉很差时纯声学仍 68–83%。换人锁定 0.25 s 为高帧率档（看唇动）一直开时的多人对话仿真。");
  key(s, "核心是在多人对话中锁定正在和你说话的那个人；按其他人说不说话分成两种情况，其余情况由跟踪和降级处理覆盖");
  table(s, [
    [cell("情况"), cell("例子"), cell("用到的算法"), cell("目前结果")],
    [bold("情况 1：只有他在说"), cell("面前 3 个人，只有 1 个在跟你说话"), cell("声源定位（摄像头按需确认人脸）"), cell(`嘈杂环境 3 m 内 ${sys1dB("3 m")}% 以上（仿真）`)],
    [bold("情况 2：其他人也在说"), cell("旁边两人也在说话，或别桌有人说话"), cell("声源定位 + 波束成形 / 目标说话人提取"), cell("定位仿真可行；增强能否分开相邻的人是关键风险")],
    [bold("换人"), cell("对话中轮到另一个人说"), cell("唇动给开口时刻 + 重新定位"), cell("换人后约 0.25 s 锁定（仿真）")],
    [bold("说话人移动、佩戴者转头"), cell("对方边走边说；你转头看别处"), cell("跟踪 + IMU 换到世界坐标 + 视觉校正"), cell("慢速移动、转头 85–92%；快速移动是弱点（仿真）")],
    [bold("佩戴者自己说话"), cell("你在回话"), cell("骨声纹检测自语音，冻结定位"), cell("设计")],
    [bold("看不到对方"), cell("侧脸、遮挡、暗光、在视野外"), cell("退回纯声学，置信度降一级"), cell("视觉很差时仍 68–83%（仿真）")],
  ], 0.6, 1.72, [2.4, 3.2, 3.3, 3.23], [0.4, 0.62, 0.62, 0.55, 0.62, 0.55, 0.55], { fontSize: 11 });
}

// ================= 4 硬件限制 =================
{
  const s = newSlide("硬件限制", "通话功耗按 FreeClip 2 S 官网 60 mAh、通话 6 h 推算；时延容忍度：Stone & Moore 2008；时间差按头宽约 18 cm、声速 343 m/s 估算",
    notesOf(["freeclip", "stone", "clearbuds"], "正前方附近每 1° 约对应 9 µs 的两耳时间差。两耳采样同步需 ≤ 50 µs（仿真：100 µs 时测向失效；ClearBuds 先例 < 64 µs）。"));
  key(s, "麦克风间距、功耗、时延三个限制，决定了要两耳组阵、用传统算法、定位走旁路");
  table(s, [
    [cell("限制"), cell("具体数字"), cell("对方案的影响")],
    [bold("麦克风间距"), cell("最远只隔一个头宽：两耳最大时间差约 0.5–0.7 ms，正前方附近每 1° 约 9 µs\n单只耳机两麦间距 1.5 cm：最大时间差只有约 44 µs"), cell("单只耳机测不准方向，必须两耳组阵；两耳采样同步需 ≤ 50 µs")],
    [bold("功耗"), cell("通话约 37 mW / 只（FreeClip 2 S：60 mAh、6 h）\n新增的定位、耳间传输、摄像头合计只能几 mW"), cell("用传统信号处理（约 19 MFLOPS，≤ 4.6 mW）；副耳只转发 1 路（约 0.7 mW）；摄像头按需打开")],
    [bold("实时"), cell("声音通路时延：入耳式约 10–20 ms，开放式约 5–6 ms\n定位开口后约 0.5 s 锁定即可"), cell("定位走旁路，只输出方位控制量；增强在每只耳机本地做；不能连云")],
  ], 0.6, 1.72, [1.9, 5.6, 4.63], [0.4, 1.15, 1.15, 1.15], { fontSize: 12 });
}

// ================= 5 算法框图 =================
{
  const s = newSlide("算法框图", "计算量为估算（每 0.25 s 扫描 72 个方向，218 个频点）；每层公式与参数见《情况1算法实现》与逐层框图",
    "第 ② 步开口检测：短时协方差经背景白化后，最大特征值超过阈值即判为有人开口，并回溯到开口时刻；摄像头看唇动时由唇动给开口时刻。第 ③④ 步：开口前的帧估计背景（噪声、混响、其他人），开口后的帧估计目标；用背景白化后做特征分解（GEVD）。第 ⑤ 步方向模板含头部影响，按标准头型做一次。第 ⑥ 步：每张人脸取其方位 ±8° 内的空间谱最大值，最高者为目标；看不到人脸时用空间谱峰值。");
  key(s, "传统信号处理，全部在主耳音频 DSP 上：约 19 MFLOPS，每 16 ms 输出一次方位，交给增强");
  box(s, "副耳：2 个麦克风", 0.6, 1.75, 1.9, 0.6);
  line(s, 2.5, 2.05, 2.85, 2.05);
  box(s, "取 1 路，ADPCM 压缩\n64 kbps，耳间链路", 2.85, 1.75, 2.2, 0.6, { fs: 10.5 });
  line(s, 3.95, 2.35, 3.95, 2.95);
  box(s, "主耳：2 个麦克风", 0.6, 3.0, 1.9, 0.6);
  line(s, 2.5, 3.3, 2.85, 3.3);
  s.addShape(p.shapes.RECTANGLE, { x: 2.75, y: 2.9, w: 10.0, h: 1.75, fill: { color: C.navyPale }, line: { color: C.navy, width: 0.75, dashType: "dash" } });
  T(s, "主耳音频 DSP（每 16 ms 一帧）", { x: 2.85, y: 4.33, w: 4, h: 0.28, fontSize: 10, color: C.navy });
  const steps = [["① 高通 + 分帧 FFT\n3 路 × 218 频点", "2.1 M"], ["② 开口检测\n新声源能量 > 阈值", "6.6 M"], ["③ 协方差\n背景 / 目标", "0.8 M"],
    ["④ 背景白化\n+ 特征分解", "1.0 M"], ["⑤ 72 个方向扫描\n找峰", "8.2 M"], ["⑥ 与人脸融合", "很小"]];
  const W = 1.42, G = 0.2; let x = 2.85;
  steps.forEach(([t, m], i) => {
    box(s, t, x, 3.0, W, 0.85, { fs: 10.5, fill: "FFFFFF", line: C.navy });
    T(s, m + (m.endsWith("M") ? "FLOPS" : ""), { x, y: 3.9, w: W, h: 0.25, fontSize: 9.5, color: C.gray, align: "center" });
    if (i < steps.length - 1) line(s, x + W, 3.42, x + W + G, 3.42, { color: C.navy });
    x += W + G;
  });
  line(s, 12.06, 3.0, 12.06, 2.45, { color: C.navy });
  box(s, "输出：目标方位 + 置信度\n8 字节，每 16 ms", 9.9, 1.75, 2.85, 0.7, { fs: 10.5, line: C.navy, color: C.navy, bold: true });
  line(s, 9.9, 2.1, 9.45, 2.1, { color: C.navy });
  box(s, "两耳增强（情况 2）\n朝目标增强、干扰置零", 6.95, 1.75, 2.5, 0.7, { fs: 10.5, dash: "dash" });
  box(s, "摄像头（两耳各一）：人脸方位；情况 2 看唇动\n图像不出模组", 0.6, 5.0, 3.9, 0.75, { fs: 10.5, color: C.gray });
  line(s, 4.5, 5.37, 11.25, 5.37, { arrow: false, dash: "dash" });
  line(s, 11.25, 5.37, 11.25, 3.85, { dash: "dash" });
  box(s, "IMU：头部转动\n换算到世界坐标", 4.9, 5.85, 2.2, 0.65, { fs: 10.5 });
  line(s, 7.1, 6.17, 11.4, 6.17, { arrow: false });
  line(s, 11.4, 6.17, 11.4, 3.85);
}

// ================= 6 声源定位：方法 =================
{
  const s = newSlide("声源定位：方法", "仿真：刚性球头部模型；面前 3 人，嘈杂环境，开口时刻已知，只用声音；计算量为估算（不含开口检测约 6.6 MFLOPS）",
    SIMNOTE + "\n计算量：3 路、218 个频点、72 个方向、每 0.25 s 扫描一次；方向模板 184 KB。\n情况 1 系统（声学检测开口，阈值 1 dB）：1–2 m 100%，3 m " + sys1dB("3 m") + "%，4 m " + sys1dB("4 m") + "%。");
  key(s, `两耳组阵 + 背景白化才能测远：3 m 处 GEVD-MUSIC ${accS(BIN, "GEVD-MUSIC", "3 m")}%，SRP-PHAT、MUSIC 只有 ${accS(BIN, "SRP-PHAT", "3 m")}%、${accS(BIN, "MUSIC", "3 m")}%`);
  T(s, "基本关系：时间差 τ = d·sinθ / c。两耳 d ≈ 18 cm，最大 τ 约 0.5 ms；单只耳机 d = 1.5 cm，最大 τ 只有 44 µs，混响和噪声下分不出方向。", { x: 0.6, y: 1.66, w: 12.13, h: 0.42, fontSize: 11.5, valign: "middle" });
  s.addChart(p.charts.BAR, [
    { name: "SRP-PHAT（两耳）", labels: DK, values: DK.map((d) => acc(BIN, "SRP-PHAT", d)) },
    { name: "MUSIC（两耳）", labels: DK, values: DK.map((d) => acc(BIN, "MUSIC", d)) },
    { name: "GEVD-MUSIC（两耳）", labels: DK, values: DK.map((d) => acc(BIN, "GEVD-MUSIC", d)) },
    { name: "GEVD-MUSIC（单只耳机）", labels: DK, values: DK.map((d) => acc(MONO, "GEVD-MUSIC", d)) },
  ], Object.assign({}, S.chartBase, { x: 0.6, y: 2.15, w: 6.9, h: 4.6, barDir: "col", barGrouping: "clustered", barGapWidthPct: 60,
    chartColors: ["BFBFBF", "8DA9C4", C.navy, "7F7F7F"], valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 20,
    showLegend: true, legendPos: "b", showValue: false, showTitle: true, title: "方位误差 ≤ 10° 的比例（%），按说话人距离" }));
  table(s, [
    [cell("方法"), cell("原理"), ctr("计算量"), ctr("3 m")],
    [bold("SRP-PHAT"), cell("各方向扫描，取能量最大"), ctr(`${mf("SRP-PHAT")} MFLOPS`), ctr(`${accS(BIN, "SRP-PHAT", "3 m")}%`)],
    [bold("MUSIC"), cell("协方差特征分解，噪声子空间扫描"), ctr(`${mf("MUSIC")} MFLOPS`), ctr(`${accS(BIN, "MUSIC", "3 m")}%`)],
    [bold("GEVD-MUSIC"), cell("先用开口前的背景白化噪声和混响，再做 MUSIC"), ctr(`${mf("GEVD-MUSIC")} MFLOPS`), ctr(`${accS(BIN, "GEVD-MUSIC", "3 m")}%`)],
    [bold("神经网络"), cell("网络从数据中学方向；需训练数据，换耳机形态要重训"), ctr("随网络大小"), ctr("—")],
  ], 7.75, 2.2, [1.2, 2.1, 1.0, 0.68], [0.36, 0.62, 0.62, 0.72, 0.72], { fontSize: 10 });
  S.para(s, [
    `近处（≤ 1 m）三种方法都在 ${Math.min(...["0.5 m", "1 m"].flatMap((d) => ["SRP-PHAT", "MUSIC", "GEVD-MUSIC"].map((m) => acc(BIN, m, d))))}% 以上，2 m 外只有 GEVD-MUSIC 可用。`,
    "GEVD-MUSIC 计算量约为 SRP-PHAT 的 2.7 倍，不需要训练数据，方向模板按标准头型做一次（184 KB）。",
  ], 7.75, 5.4, 4.98, 1.3, { fontSize: 11 });
}

// ================= 7 波束成形 / 增强 =================
{
  const s = newSlide("波束成形与增强：情况 2", "信干比为理论计算（已知干扰方位置零，直达混响比 0 dB，0.5–4 kHz 平均）；时延：蓝牙 / 星闪为第三方评测，专用链路与 C 为专利与论文；容忍度：Stone & Moore 2008",
    notesOf(["stone", "nearlink", "lo2h", "neuralaids", "stereoZoom"], "A：每只耳机只用本耳 2 麦（间距 1.5 cm），即使用定位给出的干扰方位做自适应置零，相隔 25° 的人也只能压约 2 dB；固定超指向 0.2–0.5 dB。B：两耳 4 麦组阵，自适应置零在直达混响比 0 dB 时约 8 dB、消声时约 14 dB（方位误差 2–3°）。C：目标说话人提取，端到端约 17.5–20 ms（无线耳机 + AI 加速器 17.5 ms；Look Once to Hear 目标 < 20 ms）。B 的额外功耗：双向持续传 1–2 路 PCM，每侧约 2.6–5.2 mW。"));
  key(s, "单只耳机分不开相邻的人；两耳组阵要几毫秒级的耳间音频链路，目标说话人提取时延约 20 ms 在边缘");
  T(s, "朝目标增强、干扰方向置零（MVDR）：w = R⁻¹a / (aᴴR⁻¹a)，a 为目标方向向量，R 为干扰与噪声协方差；孔径越小，相邻方向的 a 越接近，越难分开。", { x: 0.6, y: 1.66, w: 12.13, h: 0.42, fontSize: 11.5, valign: "middle" });
  table(s, [
    [cell("方案"), cell("怎么做"), cell("分开相隔 25° 的人"), cell("声音通路时延"), cell("代价")],
    [bold("A 本地增强"), cell("每只耳机用本耳 2 麦，按定位给出的方位增强、干扰置零"), cell("基本不能：约 2 dB"), cell("几 ms，满足入耳式与开放式"), cell("不跨耳；与已有产品差别小")],
    [bold("B 两耳组阵增强"), cell("两耳 4 麦组成一个阵列做自适应置零"), cell("能：约 8 dB（消声时约 14 dB）"), cell("专用耳间链路几 ms 满足；蓝牙 / 星闪约 15–40 ms 不满足"), cell("每侧多 2.6–5.2 mW；需几毫秒级耳间音频链路")],
    [bold("C 目标说话人提取"), cell("网络从混合声中只留下目标；方位或人脸作为线索"), cell("能（不依赖阵列孔径）"), cell("约 17.5–20 ms：入耳式临界，开放式不满足"), cell("耳机上要跑网络；推理功耗未知")],
  ], 0.6, 2.2, [1.9, 3.2, 2.2, 2.6, 2.23], [0.4, 0.8, 0.9, 0.9], { fontSize: 11 });
  T(s, "参照：Phonak 助听器经专用耳间链路组成 4 麦双耳波束（B 的先例）；NeuralAids 在 GAP9 上每 6 ms 块处理 5.54 ms；Look Once to Hear 在嵌入式 CPU 上每 8 ms 块 6.24 ms，但需先注册目标。", { x: 0.6, y: 5.45, w: 12.13, h: 0.7, fontSize: 11.5, color: C.ink });
}

// ================= 8 大 / 小模型选型 =================
{
  const s = newSlide("大 / 小模型选型", "参数量为论文与厂商资料原文；横轴为对数刻度；Phonak 为厂商资料；NeuralAids 只给出模型内存（约 299 KB），未画入图中",
    notesOf(["lightdoa", "dcase24", "phonakAI", "tfgrid", "lo2h", "neuralaids"],
      "LightDOA 3.5 万–3.9 万参数（随输出方向数变），CP-Mobile 6.1 万–6.4 万，CRNN 约 31 万：同一论文对比（2 路输入）。Phonak DEEPSONIC：专用 AI 芯片，主网络 450 万参数，厂商称信噪比提升最高 10 dB。Look Once to Hear 以 TF-GridNet 为起点，原文称其不能在嵌入式设备上实时运行，经压缩优化后每 8 ms 块 6.24 ms。"));
  key(s, "耳机上能跑的定位网络 3.5 万–31 万参数；本项目情况 1 用传统方法，没有训练参数");
  const SSL = C.navy, ENH = "8DA9C4";
  const items = [
    { name: "LightDOA（定位）", value: 3.5e4, label: "3.5 万", color: SSL },
    { name: "CP-Mobile（定位）", value: 6.1e4, label: "6.1 万", color: SSL },
    { name: "CRNN（定位）", value: 3.1e5, label: "31 万", color: SSL },
    { name: "DCASE 2024 基线（定位 + 检测）", value: 7.4e5, label: "74 万", color: SSL },
    { name: "Phonak DEEPSONIC（助听器降噪）", value: 4.5e6, label: "450 万", color: ENH },
    { name: "TF-GridNet（分离）", value: 1.45e7, label: "1450 万", color: ENH },
  ];
  const X0 = 0.6, Y0 = 1.9, RH = 0.5, W = 7.6;
  const hb = { nameW: 2.9, labW: 0.85, vmin: 1e4, vmax: 3e7, log: true };
  const bw = W - hb.nameW - hb.labW, pos = (v) => bw * (Math.log10(v) - 4) / (Math.log10(3e7) - 4);
  s.addShape(p.shapes.RECTANGLE, { x: X0 + hb.nameW + pos(3e4), y: Y0 - 0.05, w: pos(4e5) - pos(3e4), h: items.length * RH + 0.07, fill: { color: "E4ECF4" }, line: { type: "none" } });
  hbars(s, items, X0, Y0, W, RH, Object.assign({ fs: 10.5, ticks: [[1e4, "1 万"], [1e5, "10 万"], [1e6, "100 万"], [1e7, "1000 万"]] }, hb));
  [[SSL, "定位"], [ENH, "增强 / 分离"], ["E4ECF4", "耳机可部署的定位网络（3 万–40 万）"]].forEach(([c, t], i) => {
    const lx = X0 + 0.2 + [0, 1.2, 2.7][i];
    s.addShape(p.shapes.RECTANGLE, { x: lx, y: 5.45, w: 0.22, h: 0.16, fill: { color: c }, line: { type: "none" } });
    T(s, t, { x: lx + 0.3, y: 5.38, w: 3.2, h: 0.3, fontSize: 10, color: C.gray, valign: "middle" });
  });
  T(s, "8 比特量化后，模型内存约等于参数个数（字节）：3.5 万参数约 35 KB，31 万约 300 KB；本方案方向模板 184 KB。", { x: 0.6, y: 5.85, w: 7.6, h: 0.6, fontSize: 11, color: C.ink });
  table(s, [
    [cell("档位"), cell("规模与运行位置")],
    [bold("定位小模型"), cell("3.5 万–31 万参数，8 比特约 35–300 KB；需要训练数据，换耳机形态要重训")],
    [bold("增强小模型"), cell("NeuralAids 约 299 KB，耳机级处理器上实时；Look Once to Hear 嵌入式 CPU 每 8 ms 块 6.24 ms")],
    [bold("助听器"), cell("Phonak 专用 AI 芯片 DEEPSONIC，450 万参数降噪网络（厂商资料）")],
    [bold("大模型"), cell("TF-GridNet 1450 万参数，嵌入式上不能实时；只适合作开发起点或服务器上运行")],
    [bold("本项目"), cell(`定位用传统 GEVD-MUSIC：无训练参数，方向模板 184 KB，约 ${Math.round(mf("GEVD-MUSIC") + 6.6)} MFLOPS；小网络（约 4 万参数级）作对照候选`)],
  ], 8.45, 1.85, [1.25, 3.03], [0.36, 0.78, 0.92, 0.7, 0.78, 0.95], { fontSize: 10 });
}

// ================= 9 连云 / 离线端侧 =================
{
  const s = newSlide("连云 / 离线端侧", "功耗为估算（基准 FreeClip 2 S 通话约 37 mW / 只）；其余为厂商与论文公开资料",
    notesOf(["airpods", "phonakAI", "neuralaids", "lo2h", "vuebuds", "vuebudsNews", "freeclip"],
      "情况 1 新增功耗（每只耳机）：耳间传输 1 路 ADPCM 约 0.7 mW；定位计算约 19 MFLOPS，按偏老工艺 MCU 估上限约 4.6 mW；摄像头平时不开，按需打开时低帧率 1–2 fps 约 0.4–0.8 mW；合计约 5.3 mW，续航约 6 h → 5.25 h。VueBuds 把低分辨率灰度图经蓝牙发到手机，由手机上的小模型约 1 s 内回答问题。"));
  key(s, "声音通路只有十几毫秒余量，定位、增强和视觉检测都在耳机与摄像头模组上离线运行");
  table(s, [
    [cell("环节"), cell("运行位置"), cell("原因"), cell("公开做法")],
    [bold("增强（实时听）"), cell("每只耳机本地"), cell("声音通路时延入耳式约 10–20 ms，连云或经手机都来不及"), cell("NeuralAids：GAP9 上每 6 ms 块 5.54 ms；Look Once to Hear：嵌入式 CPU 每 8 ms 块 6.24 ms")],
    [bold("声源定位与融合"), cell("主耳音频 DSP"), cell("每 16 ms 输出一次方位；约 19 MFLOPS，新增功耗约 4.6 mW 以内（估算）"), cell("助听器：两耳经专用链路组阵，全部在助听器内处理")],
    [bold("人脸与唇动检测"), cell("摄像头模组 NPU"), cell("图像不出模组，只输出人脸方位与唇动分数（每张脸 16 字节）；隐私与带宽"), cell("Phonak DEEPSONIC：AI 芯片在助听器内")],
    [bold("耳间传输"), cell("副耳 → 主耳"), cell("只为定位转发 1 路，ADPCM 64 kbps，约 0.7 mW"), cell("ClearBuds：两耳同步 < 64 µs")],
    [bold("看图问答等非实时功能"), cell("可经手机"), cell("对时延不敏感（秒级），不在听觉通路上"), cell("VueBuds：图像经蓝牙到手机，约 1 s 内回答")],
  ], 0.6, 1.72, [2.3, 1.75, 4.1, 3.98], [0.4, 0.8, 0.8, 0.8, 0.7, 0.7], { fontSize: 11 });
  T(s, "情况 1 新增功耗约 5.3 mW / 只，续航约 6 h → 5.25 h（估算）。", { x: 0.6, y: 6.1, w: 12.13, h: 0.4, fontSize: 12, bold: true, color: C.navy });
}

// ================= 10 友商竞品 =================
{
  const s = newSlide("友商竞品：耳机、眼镜与助听器", "厂商规格、技术文章与第三方评测；研究原型为论文；\"未公开\"表示公开资料中查不到",
    notesOf(["airpods", "boost", "meta", "metaTest", "phonakAI", "stereoZoom", "speechSensor", "signia", "lo2h", "neuralaids", "vuebuds"],
      "AirPods Pro 2：规格页列出双波束成形麦克风 + 朝内麦克风与 H2 芯片，每只 3 个为按列表推得；处理位置官方未详述。Phonak 各功能来自不同代平台的技术文章（StereoZoom、SpeechSensor、Audéo Sphere 的 DEEPSONIC）。Ray-Ban Meta 二代：5 麦（HearingTracker）；Conversation Focus 2025-09 发布、12 月推送；运行位置未公开。Signia IX 为厂商说法。"));
  key(s, "已有产品增强正前方或整组说话人；能在多人中只放大一个人的只有需要注册的研究原型");
  const N = (t) => cell(t, { color: "7F7F7F" });
  table(s, [
    [cell("类别"), cell("产品"), cell("麦克风"), cell("定位与增强"), cell("芯片 / 运行位置"), cell("做不到")],
    [cell("耳机", { align: "center" }), bold("AirPods Pro 2"), cell("每只 3 个"), cell("对话增强：波束聚焦正前方说话的人"), cell("H2 耳机芯片"), cell("正前方有多个人时分不出是哪一个")],
    [cell("眼镜", { align: "center" }), bold("Ray-Ban Meta 二代"), cell("5 个"), cell("Conversation Focus：放大正在对话的人"), N("未公开"), cell("同上；眼镜形态")],
    [cell("助听器", { align: "center" }), bold("Phonak 助听器"), cell("每只 2 个"), cell("StereoZoom 双耳 4 麦波束；SpeechSensor 判断主要说话人方向；AI 降噪"), cell("Audéo Sphere：DEEPSONIC AI 芯片，450 万参数网络"), cell("不区分哪一个人在和你说话")],
    [cell("助听器", { align: "center" }), bold("Signia IX"), N("未公开"), cell("厂商称同时跟踪并增强多个说话人"), N("未公开"), cell("增强整组，不锁定一个人")],
    [cell("研究", { align: "center" }), bold("Look Once to Hear"), cell("双耳"), cell("看着目标几秒注册，之后只放大这个人"), cell("嵌入式 CPU，每 8 ms 块 6.24 ms"), cell("需要注册")],
    [cell("研究", { align: "center" }), bold("NeuralAids"), cell("—"), cell("耳机上的低时延语音增强"), cell("GAP9，模型约 299 KB"), cell("只降噪，不选人")],
    [cell("研究", { align: "center" }), bold("VueBuds"), cell("—"), cell("两只耳机各装摄像头，看图问答（不做听觉增强）"), cell("图像经蓝牙到手机"), cell("—")],
  ], 0.6, 1.72, [0.85, 2.1, 1.25, 3.6, 2.3, 2.03], [0.38, 0.55, 0.5, 0.72, 0.5, 0.55, 0.5, 0.55], { fontSize: 10.5 });
}

// ================= 11 麦克风数量 =================
{
  const s = newSlide("麦克风数量", "整副设备的麦克风数量：Apple 规格页、HearingTracker、Phonak 白皮书；研究原型未列入",
    notesOf(["airpods", "metaTest", "stereoZoom"]));
  key(s, "麦克风数都在 4–6 个；差别在能否两耳组阵、有没有摄像头告诉它该听谁");
  const items = [
    { name: "AirPods Pro 2（每只 3）", value: 6, color: C.navy },
    { name: "Ray-Ban Meta 二代", value: 5, color: "8DA9C4" },
    { name: "Phonak 双耳助听器（每只 2）", value: 4, color: "A6A6A6" },
    { name: "本方案（每只 2）", value: 4, color: "404040" },
  ];
  hbars(s, items, 0.6, 2.0, 7.6, 0.62, { nameW: 2.9, labW: 0.6, vmax: 7, fs: 12 });
  [[C.navy, "耳机"], ["8DA9C4", "眼镜"], ["A6A6A6", "助听器"], ["404040", "本方案"]].forEach(([c, t], i) => {
    s.addShape(p.shapes.RECTANGLE, { x: 0.8 + i * 1.5, y: 4.75, w: 0.22, h: 0.16, fill: { color: c }, line: { type: "none" } });
    T(s, t, { x: 1.1 + i * 1.5, y: 4.68, w: 1.2, h: 0.3, fontSize: 10.5, color: C.gray, valign: "middle" });
  });
  table(s, [
    [cell("产品"), ctr("两耳组阵"), ctr("摄像头")],
    [bold("AirPods Pro 2"), ctr("否"), ctr("无")],
    [bold("Ray-Ban Meta 二代"), ctr("一体（眼镜）"), ctr("有；未见用于选人")],
    [bold("Phonak 双耳助听器"), ctr("是（专用链路）"), ctr("无")],
    [bold("本方案"), ctr("定位组阵（副耳转发 1 路）"), ctr("有：人脸 + 唇动")],
  ], 8.6, 1.95, [1.75, 1.3, 1.08], [0.36, 0.45, 0.45, 0.45, 0.55], { fontSize: 10.5 });
}

// ================= 12 本项目选型 =================
{
  const s = newSlide("本项目选型", "精度为仿真（刚性球头部模型）；计算量与功耗为估算；增强方案的取舍【待确认】",
    SIMNOTE + "\n单只耳机 GEVD-MUSIC：1 m " + accS(MONO, "GEVD-MUSIC", "1 m") + "%，2 m " + accS(MONO, "GEVD-MUSIC", "2 m") + "%。情况 1 系统（声学检测开口）：3 m " + sys1dB("3 m") + "%，4 m " + sys1dB("4 m") + "%。");
  key(s, "两耳组阵 + 传统 GEVD-MUSIC + 人脸软融合，全部端侧离线；增强方案取决于耳间链路时延");
  table(s, [
    [cell("项目"), cell("选型"), cell("原因"), cell("与竞品对比")],
    [bold("阵列"), cell("每耳 2 麦；副耳只转发 1 路（ADPCM 64 kbps），主耳 3 路测向"), cell(`单只耳机 2 m 处只有 ${accS(MONO, "GEVD-MUSIC", "2 m")}%，必须两耳组阵；6 / 8 麦最多多 4 个百分点，耳间带宽却要 3–4 倍（仿真）`), cell("麦克风数与助听器相同（4 个），少于 AirPods Pro 2（6 个）")],
    [bold("定位方法"), cell("GEVD-MUSIC：开口前的背景白化 + 72 个方向扫描"), cell(`2 m 外只有它可用：3 m 处 ${accS(BIN, "GEVD-MUSIC", "3 m")}%（SRP-PHAT ${accS(BIN, "SRP-PHAT", "3 m")}%）；不需要训练数据`), cell("竞品增强正前方或整组，本方案定位到具体的人")],
    [bold("模型规模"), cell(`无训练参数；方向模板 184 KB，约 ${Math.round(mf("GEVD-MUSIC") + 6.6)} MFLOPS`), cell("内存与 31 万参数的定位网络（8 比特约 300 KB）同量级，不需要数据"), cell("小于助听器 450 万参数的 AI 降噪")],
    [bold("摄像头"), cell("两耳各一；情况 1 平时不开、按需短开；情况 2 对话中看唇动"), cell("情况 1 加人脸只多 0–1.4 个百分点；情况 2 唇动给开口时刻，换人后 0.25 s 锁定（仿真）"), cell("竞品没有用摄像头选人")],
    [bold("运行位置与功耗"), cell("全部端侧离线；情况 1 新增约 5.3 mW / 只"), cell("声音通路十几毫秒，不能连云；续航约 6 h → 5.25 h（估算）"), cell("与助听器、耳机增强研究（NeuralAids）一样在端侧")],
    [bold("增强（情况 2）"), cell("A 本地 / B 两耳组阵 / C 目标说话人提取【待确认】"), cell("B 要几毫秒级耳间音频链路，C 时延约 20 ms 在边缘"), cell("助听器有专用耳间链路（B 的先例）")],
  ], 0.6, 1.72, [1.75, 3.4, 4.0, 2.98], [0.4, 0.75, 0.68, 0.62, 0.75, 0.62, 0.62], { fontSize: 10.5 });
}

S.save(OUT);
