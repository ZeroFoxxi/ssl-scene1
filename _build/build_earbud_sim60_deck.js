// 耳机声源定位：60 s 多人对话仿真进展（12 月仿真第 1–2 周提前完成的部分，下次与 mentor 讨论用）。
// 数字全部读自 code/earbud_ssl/out/ 下的评测结果（种子 7）；规则与限制见 02_耳机声源定位/60s全流程仿真.md。
const path = require("path");
const fs = require("fs");
const S = require("./deck_style")("耳机声源定位：60 s 多人对话仿真");
const { p, C, T, cell, bold, ctr, table, newSlide, key, box, line } = S;
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, "..", "02_耳机声源定位"), "耳机声源定位_60s多人对话仿真.pptx");
const D = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "code", "earbud_ssl", "out", f), "utf-8"));
const FIG = (n) => path.join(__dirname, "..", "figures", n);
const sizeOf = (f) => { const b = fs.readFileSync(f); return b.readUInt32BE(16) / b.readUInt32BE(20); };
const IMG = (s, n, x, y, w) => s.addImage({ path: FIG(n), x, y, w, h: w / sizeOf(FIG(n)) });

const E1T = D("scene60_pipeline_eval_turns.json"), E1C = D("scene60_pipeline_eval_case2.json");
const KT = Object.keys(E1T).find((k) => k.startsWith("turns")), KC = Object.keys(E1C).find((k) => k.startsWith("case2"));
const R1T = E1T[KT]["结果"], R1C = E1C[KC]["结果"];
const F15T = D("scene60_pipeline_eval2_turns_fe0.15.json"), F15C = D("scene60_pipeline_eval2_case2_fe0.15.json");
const F30T = D("scene60_pipeline_eval2_turns_fe0.30.json"), F30C = D("scene60_pipeline_eval2_case2_fe0.30.json");
const G = (d) => d[Object.keys(d).find((k) => k !== "setup" && k !== "elapsed_s")]["结果"]["高帧率档常开"];
const EN0 = D("scene60_enhance_eval_0.json")["另两人一样响"]["信干比提升_dB（中位数 / 最小 / 最大）"];
const EN6 = D("scene60_enhance_eval_-6.json")["另两人低 6 dB"]["信干比提升_dB（中位数 / 最小 / 最大）"];
const acc = (r, m, L) => r[m][L]["锁定正确 ≤10°（%）：全部"];
const f0 = (x) => Math.round(x);
const MODES = ["纯声学", "低帧率档", "高帧率档常开"], RULES = ["跟随", "防抖", "对话组"];
const N1 = E1T.setup.n_per_kind, N2 = F15T.setup.n_per_kind, NE = D("scene60_enhance_eval_0.json").setup.n_per_cond;
const SIMNOTE = "仿真：刚性球头部模型，2+1 阵列（左耳 2 麦 + 右耳转发 1 路），RT60 0.5 s，扩散噪声 SNR 10 dB，旁桌 2 人持续说话；视觉为假设（视野 ±70°、人脸检出 95%、方位误差 2°、唇动判错 10%）";

// ================= 1 封面 =================
{
  const s = p.addSlide({ masterName: "COVER" });
  s.addShape(p.shapes.LINE, { x: 0.9, y: 3.55, w: 11.5, h: 0, line: { color: C.navy, width: 1.25 } });
  T(s, "耳机声源定位：60 s 多人对话仿真", { x: 0.9, y: 2.3, w: 11.5, h: 0.9, fontSize: 32, bold: true, color: C.navy, valign: "bottom" });
  T(s, "全流程、锁定规则与情况 2 增强（刚性球头部模型）", { x: 0.9, y: 3.75, w: 11.5, h: 0.5, fontSize: 16, color: C.gray });
  T(s, "2026 年 11 月", { x: 0.9, y: 4.35, w: 11.5, h: 0.4, fontSize: 14, color: C.gray });
}

// ================= 2 结论 =================
{
  const s = newSlide("结论", `评测种子 7：全流程每类 ${N1} 段，朝向线索每档 ${N2} 段，增强每档 ${NE} 段；数字为锁定正确率（对话对象方位误差 ≤ 10°）或信干比提升`,
    SIMNOTE + "\n规则与开发过程见 02_耳机声源定位/60s全流程仿真.md。参数只在开发种子（101）上调，评测种子只跑一次。");
  key(s, "情况 2 要靠唇动加\"对话组\"锁定，判得准的脸朝向还能再提高；两耳组阵增强只有约 4–5 dB");
  table(s, [
    [cell("项目"), cell("结果"), cell("对方案的影响")],
    [bold("轮流说话（情况 1 + 换人、走动、转头、自语音）"), cell(`高帧率档 + 跟随 ${f0(acc(R1T, "高帧率档常开", "跟随"))}%，换人后 ${R1T["高帧率档常开"]["跟随"]["换人后锁定时间中位数（s）"]} s 锁定；对话组 ${f0(acc(R1T, "纯声学", "对话组"))}–${f0(acc(R1T, "低帧率档", "对话组"))}%`), cell("设计文档里\"另一人连续说 2 s 才切换\"的防抖规则只有约 50%，不适合小组对话")],
    [bold("情况 2（另两人一样响地互相说话）"), cell(`只有高帧率档 + 对话组可用：${f0(acc(R1C, "高帧率档常开", "对话组"))}%；纯声学、低帧率档 ≤ ${f0(Math.max(...MODES.slice(0, 2).flatMap((m) => RULES.map((L) => acc(R1C, m, L)))))}%`), cell("情况 2 离不开唇动；最大短板是第一次对话往来之前该锁谁")],
    [bold("加\"脸朝向佩戴者\"（假设视觉能给出）"), cell(`判错 15%：情况 2 ${f0(acc({ x: G(F15C) }, "x", "对话组"))}% → ${f0(acc({ x: G(F15C) }, "x", "对话组+朝向"))}%；判错 30%：只多 ${f0(acc({ x: G(F30C) }, "x", "对话组+朝向") - acc({ x: G(F30C) }, "x", "对话组"))} 个百分点`), cell("要请视觉同事确认能否给出朝向、判错率多少")],
    [bold("情况 2 增强（MVDR）"), cell(`两耳 4 麦 ${EN0["B 两耳 4 麦"]["真值"][0]} / ${EN6["B 两耳 4 麦"]["真值"][0]} dB（另两人一样响 / 低 6 dB），上限约 ${EN6["B 两耳 4 麦"]["真值 + 理想干扰协方差"][0]} dB；本耳 2 麦 ${EN0["A 本地 2 麦（左耳）"]["真值"][0]}–${EN6["A 本地 2 麦（左耳）"]["真值"][0]} dB`), cell("11-25 总结中\"约 8 dB\"是 1 个干扰的理论值，更正为约 4–5 dB；只靠波束成形不够")],
  ], 0.6, 1.75, [3.3, 4.9, 3.93], [0.42, 0.95, 0.95, 0.95, 0.95], { fontSize: 11.5 });
}

// ================= 3 60 s 场景 =================
{
  const s = newSlide("60 s 场景", "剧本统计各 40 段（种子 7）；示意为评测集外的一段剧本；摄像头视野按 ±70°（与 11 月仿真一致）",
    "场景生成器：code/earbud_ssl/earbud_ssl/scene60.py；说明：02_耳机声源定位/60s场景生成器.md。电平口径：旁桌到耳机处的直达声比 1.5 m 处对面说话人低 6 dB；情况 2 的另外两人到耳机处与目标一样响。");
  key(s, "比 11 月的单次判决更接近真实对话：换人、抢话、走动、转头、佩戴者自己说话都在同一段里");
  IMG(s, "earbud_scene60_turns.png", 0.6, 1.7, 7.6);
  table(s, [
    [cell("项目"), ctr("轮流说话"), ctr("情况 2")],
    [bold("对面的人"), ctr("3 人，相隔 20–30°"), ctr("3 人，相隔 20–30°")],
    [bold("谁在跟你说话"), ctr("轮流，每分钟换 9–15 次"), ctr("中间那人，另两人互相说")],
    [bold("同时说话"), ctr("约 1%（抢话）"), ctr("约 59%")],
    [bold("佩戴者自己说话"), ctr("约 13%"), ctr("约 21%")],
    [bold("走动、转头"), ctr("1 人走动；转头至多 60°"), ctr("无")],
    [bold("旁桌"), ctr("2 人持续说话，低 6 dB"), ctr("同左")],
  ], 8.45, 1.75, [1.45, 1.5, 1.33], [0.4, 0.55, 0.62, 0.45, 0.45, 0.62, 0.55], { fontSize: 10 });
}

// ================= 4 流程与锁定规则 =================
{
  const s = newSlide("处理流程与锁定规则", "流程按整体设计方案第 7 节；对话组与朝向为本次新设计；每 0.25 s 输出一次",
    "高帧率档已知是哪张脸时：目标 = 最近 1 s 这张脸嘴张着的帧，背景 = 最近 3 s 这张脸嘴闭着、佩戴者也没说话的帧（唇动门控），并只在这张脸方位 ±10° 内找峰。换到新方向前要求连续 2 次观测一致。");
  key(s, "定位每 0.25 s 给出当前说话人方位，锁定规则决定\"对话对象\"是谁");
  const steps = [["自语音", "骨声纹：冻结"], ["开口时刻", "声学检测 / 唇动"], ["测向", "GEVD-MUSIC，5°"], ["融合", "人脸方位 + 唇动"], ["头部转动", "IMU 换到世界坐标"], ["锁定", "跟随 / 防抖 / 对话组"]];
  const g = 0.25, bw = (12.13 - g * 5) / 6, y = 1.85, h = 0.55;
  steps.forEach(([t, d], i) => {
    const x = 0.6 + i * (bw + g), hi = i === 5;
    s.addShape(p.shapes.RECTANGLE, { x, y, w: bw, h, fill: { color: hi ? C.navy : "FFFFFF" }, line: { color: C.navy, width: 1 } });
    T(s, t, { x, y, w: bw, h, fontSize: 12, bold: true, align: "center", valign: "middle", color: hi ? "FFFFFF" : C.navy });
    T(s, d, { x: x - 0.05, y: y + h + 0.05, w: bw + 0.1, h: 0.3, fontSize: 10, align: "center", color: C.gray });
    if (i > 0) line(s, x - g, y + h / 2, x, y + h / 2, { color: C.navy });
  });
  table(s, [
    [cell("锁定规则"), cell("做法"), cell("适合")],
    [bold("跟随"), cell("谁在说就对准谁"), cell("小组轮流说话")],
    [bold("防抖（设计文档 8.1）"), cell("另一人连续说满 2 s、原目标没说话才切换；佩戴者说完后接话的人立即切换"), cell("一对一")],
    [bold("对话组（新）"), cell("记住在和佩戴者交谈的人：佩戴者说完后第一个接话、看向、冷场后连续说 2 s 入组；佩戴者说话时还在说的人扣分出组；组员说话立即对准"), cell("两种场景都可用")],
    [bold("对话组 + 朝向（新，假设视觉能给出）"), cell("另加\"脸朝向佩戴者\"：朝向佩戴者说话 0.5 s 入组；组员明确没朝向时不切过去"), cell("情况 2")],
  ], 0.6, 3.0, [2.9, 7.2, 2.03], [0.4, 0.45, 0.62, 0.85, 0.62], { fontSize: 11 });
}

// ================= 5 锁定结果 =================
{
  const s = newSlide("锁定结果：两种场景", `评测种子 7，各 ${N1} 段，每 0.25 s 一个输出；锁定正确 = 对话对象方位误差 ≤ 10°`, SIMNOTE);
  key(s, "轮流说话跟随最好，情况 2 只有高帧率档加对话组可用");
  const chart = (x, title, R) => s.addChart(p.charts.BAR, RULES.map((L) => ({ name: L, labels: MODES, values: MODES.map((m) => acc(R, m, L)) })),
    Object.assign({}, S.chartBase, { x, y: 1.75, w: 6.0, h: 4.9, barDir: "col", barGrouping: "clustered", barGapWidthPct: 60,
      chartColors: ["BFBFBF", "8DA9C4", C.navy], valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 20, showLegend: true, legendPos: "b",
      showValue: true, dataLabelFormatCode: "0", showTitle: true, title }));
  chart(0.6, "轮流说话：锁定正确（%）", R1T);
  chart(6.73, "情况 2：锁定正确（%）", R1C);
}

// ================= 6 演示 =================
{
  const s = newSlide("演示：情况 2 的一段", "评测集第一段（事先固定，不挑选）；浅蓝粗线为对面 3 人各自说话的时段，灰色为佩戴者自己说话", SIMNOTE);
  key(s, "前 30 s 锁在互相说话的另外两人身上；佩戴者第一次回话、目标接话后才锁住目标");
  IMG(s, "earbud_scene60_demo_case2.png", 2.35, 1.65, 8.6);
}

// ================= 7 朝向线索 =================
{
  const s = newSlide("脸朝向佩戴者：值不值得做", `评测二（种子 7，各 ${N2} 段），朝向判错率为假设；两档判错率是两次独立运行，规则只在同一次运行里比较`,
    "朝向的剧本真值：跟佩戴者说话的人说话时朝向佩戴者；情况 2 另外两人互相看。视觉每 0.25 s 判一次，最近 1 s 里四分之三以上时间朝向才算。");
  key(s, "判错 15% 时情况 2 提高约 17 个百分点；判错 30% 时收益基本消失");
  const cats = ["轮流说话\n判错 15%", "轮流说话\n判错 30%", "情况 2\n判错 15%", "情况 2\n判错 30%"];
  const src = [G(F15T), G(F30T), G(F15C), G(F30C)];
  s.addChart(p.charts.BAR, [
    { name: "对话组", labels: cats, values: src.map((r) => r["对话组"]["锁定正确 ≤10°（%）：全部"]) },
    { name: "对话组 + 朝向", labels: cats, values: src.map((r) => r["对话组+朝向"]["锁定正确 ≤10°（%）：全部"]) },
  ], Object.assign({}, S.chartBase, { x: 0.6, y: 1.75, w: 7.6, h: 4.9, barDir: "col", barGrouping: "clustered", barGapWidthPct: 70,
    chartColors: ["8DA9C4", C.navy], valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 20, showLegend: true, legendPos: "b",
    showValue: true, dataLabelFormatCode: "0", showTitle: true, title: "高帧率档：锁定正确（%）" }));
  S.para(s, [
    `情况 2、判错 15%：每分钟切换由 ${f0(G(F15C)["对话组"]["每分钟切换次数"])} 次降到 ${f0(G(F15C)["对话组+朝向"]["每分钟切换次数"])} 次`,
    "判错 30% 时，误判\"没朝向\"会挡住轮流说话的正常换人",
    "需要视觉同事回答：能否判断每张脸是否朝向佩戴者，判错率、所需分辨率与功耗【待确认】",
  ], 8.5, 2.0, 4.23, 4.0, { fontSize: 12 });
}

// ================= 8 增强 =================
{
  const s = newSlide("情况 2 增强：两耳组阵只有约 4–5 dB", `评测种子 7，各 ${NE} 段；目标在说话、佩戴者没说话的帧，200–7000 Hz；耳间链路按理想无时延`,
    "场景按 2+2 阵列渲染，定位用其中 2+1 子阵跑全流程（高帧率档 + 对话组）。MVDR 干扰协方差在目标没说、佩戴者没说的帧里估计；上限组直接用干扰本身的协方差。11 月\"约 8 dB\"为 1 个干扰、已知方位、直达混响比 0 dB 的理论计算。");
  key(s, "多个干扰加混响时，4 个麦克风置零压不掉混响尾；只靠波束成形在情况 2 里不够");
  const cats = ["另两人一样响", "另两人低 6 dB"];
  s.addChart(p.charts.BAR, [
    { name: "本耳 2 麦（真值方位）", labels: cats, values: [EN0, EN6].map((e) => e["A 本地 2 麦（左耳）"]["真值"][0]) },
    { name: "两耳 4 麦（全流程锁定方位）", labels: cats, values: [EN0, EN6].map((e) => e["B 两耳 4 麦"]["全流程锁定"][0]) },
    { name: "两耳 4 麦（真值方位）", labels: cats, values: [EN0, EN6].map((e) => e["B 两耳 4 麦"]["真值"][0]) },
    { name: "两耳 4 麦（上限）", labels: cats, values: [EN0, EN6].map((e) => e["B 两耳 4 麦"]["真值 + 理想干扰协方差"][0]) },
  ], Object.assign({}, S.chartBase, { x: 0.6, y: 1.75, w: 7.6, h: 4.9, barDir: "col", barGrouping: "clustered", barGapWidthPct: 60,
    chartColors: ["BFBFBF", "8DA9C4", C.navy, "404040"], valAxisMinVal: 0, valAxisMaxVal: 9, valAxisMajorUnit: 1, showLegend: true, legendPos: "b",
    showValue: true, dataLabelFormatCode: "0.0", showTitle: true, title: "信干比提升（dB，中位数）" }));
  S.para(s, [
    "11-25 技术总结写的\"两耳组阵约 8 dB\"是 1 个干扰的理论值；这里有 2 个相邻说话人 + 2 个旁桌说话人 + 扩散噪声",
    "本耳 2 麦几乎不随方位误差变化：1.5 cm 间距分不开相邻的人",
    "要更高的分离度，需要目标说话人提取（C），可用服务器训练、估效果上限",
  ], 8.5, 2.0, 4.23, 4.2, { fontSize: 12 });
}

// ================= 9 下一步 =================
{
  const s = newSlide("下一步与待确认", "【待确认】：需要确认后才能做");
  key(s, "12 月先换实测头部重跑同一批场景，再补增强的链路时延与目标说话人提取");
  table(s, [
    [cell("项目"), cell("内容"), cell("需要")],
    [bold("实测头部传递函数"), cell("MMHR-HRTF（耳后助听器麦克风，2° 分辨率）替换刚性球，重跑同一批 60 s 场景"), cell("数据下载需要开通网络访问【待确认】")],
    [bold("第一次对话往来之前的锁定"), cell("朝向线索；佩戴者开口前看向谁（IMU + 人脸）"), cell("视觉能否给出朝向、判错率【待确认】")],
    [bold("增强"), cell("两耳组阵加耳间链路时延（5 / 10 / 20 ms）；目标说话人提取（C）效果上限"), cell("C 用服务器 GPU")],
    [bold("多说话人语料"), cell("现在所有人的声音取自两段录音；增强评测需要不同人的声音（LibriSpeech）"), cell("数据下载【待确认】")],
    [bold("转头"), cell("转头时背景协方差按 IMU 旋转（11 月已验证）接入全流程"), cell("—")],
  ], 0.6, 1.75, [2.9, 6.3, 2.93], [0.42, 0.65, 0.6, 0.65, 0.65, 0.55], { fontSize: 11.5 });
}

S.save(OUT);
