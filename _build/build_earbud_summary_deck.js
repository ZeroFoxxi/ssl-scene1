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
    "本页各条的依据：场景与限制第 3 页；定位第 4 页；增强第 5 页；模型第 6 页；连云 / 端侧第 7 页；竞品第 8–9 页；本项目选型第 10 页。");
  key(s, "两只耳机一起测向就能在嘈杂环境 3 m 内找准人；难点在情况 2 的增强能否分开相邻的人");
  table(s, [
    [cell("项目"), cell("结论")],
    [bold("硬件限制"), cell("麦克风最远只隔一个头宽（两耳最大时间差约 0.5–0.7 ms），单只耳机两麦只隔 1.5 cm；通话约 37 mW / 只，新增功能只能占一小部分；声音通路时延入耳式约 10–20 ms")],
    [bold("定位原理"), cell(`两耳组阵 + 背景白化（GEVD-MUSIC）：嘈杂环境 3 m 处 ${accS(BIN, "GEVD-MUSIC", "3 m")}%，SRP-PHAT、MUSIC 只有 ${accS(BIN, "SRP-PHAT", "3 m")}%、${accS(BIN, "MUSIC", "3 m")}%；单只耳机 2 m 处只有 ${accS(MONO, "GEVD-MUSIC", "2 m")}%（仿真）`)],
    [bold("波束成形 / 增强"), cell("单只耳机本地增强对相隔 25° 的人只能压约 2 dB；两耳组阵约 8 dB，但要几毫秒级的耳间音频链路；目标说话人提取不依赖孔径，时延约 17.5–20 ms")],
    [bold("大 / 小模型"), cell("耳机上能跑的定位网络 3.5 万–31 万参数，增强网络约 300 KB；助听器专用 AI 芯片跑 450 万参数；千万级（TF-GridNet 1450 万）在嵌入式上不能实时")],
    [bold("连云 / 端侧"), cell("声音通路只有十几毫秒的余量，定位、增强、人脸与唇动检测都在耳机和摄像头模组上离线运行，不连云")],
    [bold("友商竞品"), cell("耳机、眼镜增强正前方，助听器能跟随说话人方向、增强整组说话人；能在多人中只放大一个人的只有需要注册的研究原型")],
    [bold("本项目选型"), cell(`每耳 2 麦、副耳转发 1 路，主耳 DSP 跑 GEVD-MUSIC（约 ${Math.round(mf("GEVD-MUSIC") + 6.6)} MFLOPS，无训练参数），与人脸软融合；全部端侧离线`)],
  ], 0.6, 1.72, [2.0, 10.13], [0.4, 0.62, 0.62, 0.62, 0.62, 0.55, 0.55, 0.55], { fontSize: 11 });
}

// ================= 3 场景、限制与处理流程 =================
{
  const s = newSlide("场景、限制与处理流程", "通话功耗按 FreeClip 2 S 官网 60 mAh、通话 6 h 推算；时延容忍度：Stone & Moore 2008；其余为设计值",
    notesOf(["freeclip", "stone", "clearbuds"], "两耳最大时间差按头宽约 18 cm、声速 343 m/s 估算；正前方附近每 1° 约对应 9 µs。两耳采样同步需 ≤ 50 µs（仿真：100 µs 时测向失效；ClearBuds 先例 < 64 µs）。"));
  key(s, "两只耳机的声音在主耳 DSP 汇合测向，结果作为控制量交给增强，不进入你听到的声音");
  const Y = 1.8, H = 1.2, W = 1.84, G = 0.218;
  const blocks = [
    ["两耳麦克风", "每耳 2 个数字麦\n耳柄前后间距 1.5 cm"],
    ["耳间链路", "副耳转发 1 路\nADPCM 4 bit，64 kbps"],
    ["声源定位", "主耳 DSP，GEVD-MUSIC\n约 19 MFLOPS"],
    ["方位 + 置信度", "每 16 ms 8 字节\n下发两耳"],
    ["增强", "情况 2：朝目标增强\n干扰方向置零"],
    ["扬声器", "与透传混合\n两耳播放"],
  ];
  const xs = blocks.map((_, i) => 0.6 + i * (W + G));
  blocks.forEach(([t, d], i) => {
    const hi = i === 2 || i === 4;
    s.addShape(p.shapes.RECTANGLE, { x: xs[i], y: Y, w: W, h: H, fill: { color: hi ? C.navyPale : "FFFFFF" }, line: { color: hi ? C.navy : C.box, width: hi ? 1.25 : 0.75 } });
    T(s, t, { x: xs[i], y: Y + 0.1, w: W, h: 0.36, fontSize: 12.5, bold: true, align: "center", color: C.navy });
    T(s, d, { x: xs[i] + 0.06, y: Y + 0.5, w: W - 0.12, h: 0.62, fontSize: 9.5, align: "center", color: C.gray });
    if (i > 0) line(s, xs[i - 1] + W, Y + H / 2, xs[i], Y + H / 2);
  });
  const Y2 = 3.35, H2 = 0.62;
  box(s, "摄像头 + NPU（两耳各一）：人脸方位、唇动；图像不出模组", 0.9, Y2, 3.35, H2, { fs: 10 });
  line(s, 4.25, Y2 + H2 / 2, xs[2] + 0.35, Y2 + H2 / 2, { arrow: false });
  line(s, xs[2] + 0.35, Y2 + H2 / 2, xs[2] + 0.35, Y + H);
  box(s, "IMU：头部转动", xs[2] + 0.6, Y2, 1.25, H2, { fs: 10 });
  line(s, xs[2] + 1.2, Y2, xs[2] + 1.2, Y + H);
  box(s, "骨声纹：佩戴者自己说话时冻结", xs[3] + 0.3, Y2, 2.4, H2, { fs: 10 });
  line(s, xs[3] + 0.3, Y2 + H2 / 2, xs[2] + W - 0.25, Y2 + H2 / 2, { arrow: false });
  line(s, xs[2] + W - 0.25, Y2 + H2 / 2, xs[2] + W - 0.25, Y + H);
  table(s, [
    [cell("限制 / 情况"), cell("具体数字")],
    [bold("麦克风距离"), cell("最远只隔一个头宽：两耳最大时间差约 0.5–0.7 ms，正前方附近每 1° 约 9 µs；单只耳机两麦间距 1.5 cm，最大时间差约 44 µs")],
    [bold("功耗"), cell("通话约 37 mW / 只（FreeClip 2 S：60 mAh、6 h）；定位、耳间传输、摄像头加起来要控制在几 mW")],
    [bold("实时"), cell("声音通路时延：入耳式约 10–20 ms，开放式约 5–6 ms；定位走旁路，开口后约 0.5 s 锁定；两耳采样同步需 ≤ 50 µs")],
    [bold("情况 1"), cell("面前 3 个人，只有 1 个在跟你说话：只需定位，把方位交给增强")],
    [bold("情况 2"), cell("其他人也在说话：还要用波束成形或目标说话人提取把目标和相邻的人分开")],
  ], 0.6, 4.3, [2.0, 10.13], [0.36, 0.42, 0.42, 0.42, 0.42, 0.42], { fontSize: 10.5 });
}

// ================= 4 声源定位：方法 =================
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

// ================= 5 波束成形 / 增强 =================
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
  ], 0.6, 2.2, [1.9, 3.2, 2.2, 2.6, 2.23], [0.4, 0.75, 0.85, 0.85], { fontSize: 10.5 });
  table(s, [
    [cell("参照"), cell("做法"), cell("时延与资源")],
    [bold("助听器（Phonak StereoZoom）"), cell("两只助听器各 2 麦，经专用无线链路组成 4 麦双耳波束"), cell("专用耳间链路交换音频")],
    [bold("NeuralAids（MobiCom 2025）"), cell("耳机上的低时延语音增强网络"), cell("GAP9 上每 6 ms 音频块处理 5.54 ms；模型约 299 KB")],
    [bold("Look Once to Hear（CHI 2024）"), cell("先看着目标几秒注册，再只放大这个人"), cell("嵌入式 CPU 上每 8 ms 块处理 6.24 ms")],
  ], 0.6, 5.1, [2.6, 5.0, 4.53], [0.34, 0.4, 0.4, 0.4], { fontSize: 10 });
}

// ================= 6 大 / 小模型选型 =================
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

// ================= 7 连云 / 离线端侧 =================
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
  ], 0.6, 1.72, [2.3, 1.75, 4.1, 3.98], [0.4, 0.8, 0.8, 0.8, 0.7, 0.7], { fontSize: 10.5 });
  T(s, "情况 1 新增功耗约 5.3 mW / 只，续航约 6 h → 5.25 h（估算）。", { x: 0.6, y: 6.1, w: 12.13, h: 0.4, fontSize: 12, bold: true, color: C.navy });
}

// ================= 8 友商竞品 =================
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

// ================= 9 麦克风数量 =================
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

// ================= 10 本项目选型 =================
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
