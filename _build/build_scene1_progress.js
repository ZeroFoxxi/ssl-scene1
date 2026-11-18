// 场景一进展汇报页（会议室换人测向）：阵列选型、方法对比、闭环效果、真实录音验证。
// 样式同 mentor 调研 PPT：标题微软雅黑 16 号加粗；表头 #134074 白字加粗，正文 #EAF2F8 与白色交替；表内 10 号；来源与仿真设置放备注；右下角留空。
// 数据：_build/scene1_progress_data.json（由 scene1_progress_data.py 从 code/ssl_baseline/out/ 读取）。
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, "..", "01_场景一_摄像头声源定位", "方案选型"), "场景一进展_会议室换人测向.pptx");
const D = JSON.parse(fs.readFileSync(path.join(__dirname, "scene1_progress_data.json"), "utf-8"));
const F = "Microsoft YaHei";
const C = { head: "134074", band: "EAF2F8", band2: "FFFFFF", line: "D0D7E1", text: "000000", na: "7F7F7F" };
const FS = 10, Y0 = 0.85, X0 = 0.5;

const p = new pptxgen();
p.layout = "LAYOUT_WIDE";
p.title = "场景一进展";

const cell = (t, o) => ({ text: t, options: Object.assign({ fontFace: F, lang: "zh-CN", fontSize: FS, color: /^(—|【待补】)/.test(t) ? C.na : C.text, valign: "middle", align: "center" }, o) });
const head = (t) => cell(t, { bold: true, color: "FFFFFF", fill: { color: C.head } });
const L = (t) => cell(t, { align: "left" });

function slide(title, header, body, colW, notes) {
  const s = p.addSlide();
  s.background = { color: "FFFFFF" };
  s.addText(title, { x: X0, y: 0.3, w: 12.3, h: 0.45, fontFace: F, lang: "zh-CN", fontSize: 16, bold: true, color: "000000", margin: 0, valign: "middle" });
  const rows = [header.map(head)].concat(body.map((r, k) => r.map((t, j) => {
    const c = j === 0 ? L(t) : cell(t);
    c.options.fill = { color: k % 2 === 0 ? C.band : C.band2 };
    return c;
  })));
  s.addTable(rows, { x: X0, y: Y0, w: colW.reduce((a, b) => a + b, 0), colW, rowH: 0.36,
    margin: [0.03, 0.07, 0.03, 0.07], border: { type: "solid", pt: 0.75, color: C.line }, autoPage: false });
  s.addNotes(notes.join("\n"));
}

const SIM = "仿真设置：会议室 5–10 m × 4–7 m × 2.6–3.2 m，RT60 0.3 / 0.6 s；摄像头装在前墙电视上方（阵列中心距墙 8 cm，高 1.6–2.0 m）；会议桌两侧与桌尾随机坐 6 人；"
  + "A 发言后 B 发言，只统计需要转动的换人（方位差 ≥20°）；四种条件：换人（A 停 0.2–0.6 s 后 B 开口）、抢话（重叠 0.5 s）、远端扬声器（电视喇叭同时播放，未做回声消除，SIR 0 dB）、空调（吊顶出风口，带内 SNR 5 dB）。"
  + "指标：方位误差 ≤10° 的比例。人声：测试用中文 / 英文素材；网络训练用 LibriSpeech（CC BY 4.0），训练、验证、测试的房间与说话人互不重叠。";

// 第 1 页：阵列选型
slide("会议室阵列选型（仿真）：贴墙安装选线阵，孔径比麦克风数更重要",
  ["阵列", "麦克风数", "孔径", "开口后 0.5 s 判决", "开口后 1.0 s 判决"],
  D.rows1, [3.0, 1.4, 1.4, 2.4, 2.4],
  [SIM, "方法：GEVD-MUSIC（开口前约 1 s 作背景段白化）；四种条件、两档 RT60 平均；每档 RT60 100 个房间。",
   "圆阵贴墙时受前墙强反射影响明显（同一圆阵移到离墙 1.5 m 后恢复正常）；线阵平行于墙时，墙的反射落在线阵本身无法区分的镜像方向上，对测向影响小。",
   "线阵离墙 4–50 cm 时结果变化在 ±3 个百分点以内。阵元间距大于约 4.3 cm 时 4 kHz 以下出现空间混叠，测向频带相应降低（4 麦 17.5 cm 用到约 2.8 kHz）。",
   "暂定：6 麦线阵，孔径 17.5 cm（与 8 麦效果相同，计算量少约 30%）；4 麦线阵为低成本备选。【待确认】"]);

// 第 2 页：方法对比
slide("换人测向方法对比（仿真固定测试集，6 麦线阵 17.5 cm，开口后 0.5 s 判决）",
  ["方法", "参数量", "每次判决乘加", "换人", "抢话", "远端扬声器", "空调", "平均"],
  D.rows2, [3.3, 1.1, 1.5, 1.0, 1.0, 1.25, 1.0, 1.0],
  [SIM, "固定测试集：200 个房间 × 四种条件 = 800 个样本，各方法在同一批样本上评测；小网络只用验证集挑选模型，测试集只评测一次。",
   "小网络：输入 6 路麦克风相位差（相对参考麦）与参考麦对数能量（4 kHz 以下）；卷积 + 双向 GRU + 注意力池化；输出前方 -90°～90° 每 2° 一类。训练 12,000 个仿真片段、20 轮。",
   `小网络参数量 ${D.nn_params}，每次判决约 ${(D.nn_macs / 1e8).toFixed(1)} 亿次乘加；GEVD-MUSIC 约 0.2 亿次（按 STFT、白化、360 个方位扫描估算）。`,
   "每个条件 200 个样本，比例的统计误差约 ±3–4 个百分点。"]);

// 第 3 页：闭环
slide("闭环效果（60 s 会议仿真 × 60 段）：小网络把误转从每分钟约 3 次降到 0.2 次",
  ["阵列", "测向方法", "对准时延（中位数）", "2 s 内对准", "误转（次 / 分钟）", "发言时间中对准的比例"],
  D.rows3, [2.0, 3.3, 1.8, 1.4, 1.6, 2.1],
  ["闭环设置：每段 60 s；6 人轮流发言（每段 3–7 s，30% 抢话），约 20% 的轮次为远端参会人（电视喇叭）；空调噪声一直存在；云台 120°/s；RT60 0.3 / 0.6 s 各 30 段。",
   "系统每 0.1 s 处理一块：有声判断 → 换人触发（静音后起始，或方向连续变化）→ 开口后 0.5 s 转向、1.0 s 微调 → 一致性检查；远端播放时冻结：设备播放远端声音期间不转。",
   "对准：方位误差 ≤10°；误转：转向的目标偏离当时发言人 >15°（含远端发言期间的转动）。",
   "小网络只训练了开口后 0.5 s 判决，1.0 s 微调对其不起作用。"]);

// 第 4 页：真实录音验证
const n4 = D.n4 || {};
slide("真实录音验证：只用仿真训练的小网络，误差 ≤10° / ≤20° 的比例",
  ["方法", "RealMAN 叠加换人", "RealMAN 叠加抢话", `RealMAN 全部（${n4.realman} 个）`, "RealMAN 平均误差", `LOCATA 全部（${n4.locata} 个）`],
  D.rows4, [2.6, 1.95, 1.95, 2.1, 1.75, 2.0],
  ["RealMAN：测试集 5 个室内场景（办公室 2 个、教室、客厅、办公大厅），真实录音（含真实背景噪声）；取阵列 x 轴上 6 麦（-6 / -3 / 0 / 3 / 6 / 9 cm，孔径 15 cm），16 kHz。",
   "RealMAN 样本：同一场景、不同位置的两条话语直接相加（叠加换人：A 在 B 开口前 0.2–0.6 s 说完；叠加抢话：A 在 B 开口后 0.2–0.8 s 说完）；话语文件前后已截掉静音，空出的时段用同一场景的真实背景噪声填补。真值为官方方位，线阵无法区分前后，统一折叠到前方。",
   "LOCATA：开发集与评测集任务 1–3，DICIT 阵列中间 5 麦（-8 / -4 / 0 / 4 / 8 cm），含实录单声源 / 多声源起始与实录叠加；小网络为第 12 轮模型（训练中断）。",
   "两组小网络都按各自阵列几何、只用“通用房间”仿真数据训练（声源在前方 ±80°、1–4 m），未使用任何实录数据；结构与会议室版本相同（约 0.28 M 参数）。",
   "来源：", "1. RealMAN（CC BY 4.0）：https://huggingface.co/datasets/AISHELL/RealMAN", "2. LOCATA 数据（ODC-BY）：https://zenodo.org/records/3630471", "3. LibriSpeech（CC BY 4.0）：https://www.openslr.org/12"]);

require("./zh_notes")(p, OUT).then(() => console.log("已生成：" + OUT));
