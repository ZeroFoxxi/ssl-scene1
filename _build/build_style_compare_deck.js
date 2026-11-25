// 示意图风格对比（给 mentor 选）：同一页内容分别用 A 单色图标、B 彩色表情图。
// 第 1–2 页：会议系统"应用场景"；第 3–4 页：耳机"波束：固定方向与可转向"。图片由 _build/make_style_compare.py 与 make_summary_figures.py 生成。
const path = require("path");
const fs = require("fs");
const S = require("./deck_style")("示意图风格对比");
const { p, C, T, newSlide, key, line } = S;
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, "..", "01_场景一_摄像头声源定位", "技术总结");
fs.mkdirSync(OUT_DIR, { recursive: true });
const OUT = path.join(OUT_DIR, "示意图风格对比.pptx");
const F1 = (n) => path.join(__dirname, "..", "figures", "summary", n);
const F2 = (n) => path.join(__dirname, "..", "figures", "style_compare", n);

function chain(s, steps, x, y, w) {
  const g = 0.28, bw = (w - g * (steps.length - 1)) / steps.length, bh = 0.5;
  steps.forEach(([t, d], i) => {
    const xx = x + i * (bw + g), hi = i === 1;
    s.addShape(p.shapes.RECTANGLE, { x: xx, y, w: bw, h: bh, fill: { color: hi ? C.navy : "FFFFFF" }, line: { color: C.navy, width: 1 } });
    T(s, t, { x: xx, y, w: bw, h: bh, fontSize: 11.5, bold: true, align: "center", valign: "middle", color: hi ? "FFFFFF" : C.navy });
    T(s, d, { x: xx - 0.05, y: y + bh + 0.05, w: bw + 0.1, h: 0.4, fontSize: 9.5, align: "center", color: C.gray });
    if (i > 0) line(s, xx - g, y + bh / 2, xx, y + bh / 2, { color: C.navy });
  });
}

function scenePage(tag, imgM, imgH) {
  const s = newSlide(`应用场景（风格 ${tag}）`, "示意图不按比例；流程与价值为两个场景的通用做法");
  key(s, "两个场景都是先听出声音从哪里来，再驱动摄像头转向，或朝这个方向增强语音");
  const col = (x, title, img, value, steps) => {
    T(s, title, { x, y: 1.7, w: 5.9, h: 0.36, fontSize: 14, bold: true, color: C.navy, valign: "middle" });
    s.addImage({ path: img, x, y: 2.1, w: 3.95, h: 3.95 * 4.2 / 6.0 });
    T(s, value, { x: x + 4.1, y: 2.2, w: 1.8, h: 2.6, fontSize: 11.5, color: C.ink, valign: "top" });
    chain(s, steps, x, 5.0, 5.85);
  };
  col(0.6, "场景一：摄像头自动转向说话人（会议室）", imgM, "价值：感知说话人方向，驱动摄像头自动转向并跟踪；发言人切换时画面跟着切换。",
    [["语音检测", "检测有人开口、换人"], ["声源定位", "估计说话人方向"], ["转向 / 跟踪", "控制摄像头转向并跟踪"]]);
  col(6.88, "场景二：智能家居语音交互", imgH, "价值：感知用户方向，增强该方向的语音、压低其他方向，提升远场和噪声环境下的交互体验。",
    [["语音唤醒", "唤醒词触发"], ["声源定位", "获取用户方向"], ["波束成形", "定向增强语音"], ["语音交互", "识别与控制"]]);
  s.addShape(p.shapes.LINE, { x: 0.6, y: 6.05, w: 12.13, h: 0, line: { color: C.rule, width: 0.75 } });
  T(s, [{ text: "端侧部署：", options: { bold: true, color: C.navy } }, { text: "在设备上实时完成方向感知，交互延迟低、音频不出设备，断网时照常可用。" }], { x: 0.6, y: 6.1, w: 12.13, h: 0.36, fontSize: 12, valign: "middle" });
  T(s, [{ text: "技术难点：", options: { bold: true, color: C.navy } }, { text: "混响与噪声下的稳健性；远场弱语音；多人同时说话与喇叭、电视等干扰声源；阵列尺寸与端侧算力受限。" }], { x: 0.6, y: 6.45, w: 12.13, h: 0.36, fontSize: 12, valign: "middle" });
}

function beamPage(tag, img) {
  const s = newSlide(`波束：固定方向与可转向（风格 ${tag}）`, "示意图不按比例；NDBF：Huang & Habets，IWAENC 2026（arXiv 2609.27021），消声环境仿真");
  key(s, "对方在正前方时固定波束就够；对方在侧面或多人轮流说话时，要按定位结果把波束转过去");
  const W = 9.2, H = W * 4.0 / 9.0;
  s.addImage({ path: img, x: (13.33 - W) / 2, y: 1.7, w: W, h: H });
  const y = 1.7 + H + 0.15;
  T(s, [{ text: "适用场景：", options: { bold: true, color: C.navy } }, { text: "对方在正前方；助听器、耳机通话拾音" }], { x: 0.9, y, w: 5.6, h: 0.5, fontSize: 12, align: "center" });
  T(s, [{ text: "适用场景：", options: { bold: true, color: C.navy } }, { text: "对方在侧面、多人轮流说话；会议设备、本方案的增强" }], { x: 6.85, y, w: 5.6, h: 0.5, fontSize: 12, align: "center" });
  T(s, "两个麦克风也能做可转向波束：神经网络差分波束（NDBF）用两个相距 3 cm 的全向麦，在 0–180° 内任意转向，做到三阶（传统两麦差分只有一阶、基本不能转向）。",
    { x: 0.6, y: y + 0.6, w: 12.13, h: 0.55, fontSize: 11.5, color: C.ink, align: "center" });
}

scenePage("A：单色图标", F1("scene_meeting.png"), F1("scene_home.png"));
scenePage("B：彩色表情图", F2("B_scene_meeting.png"), F2("B_scene_home.png"));
beamPage("A：单色图标", F2("A_beams.png"));
beamPage("B：彩色表情图", F2("B_beams.png"));
S.save(OUT);
