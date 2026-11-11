# -*- coding: utf-8 -*-
"""训练数据方案与采集计划的唯一数据源：生成 Excel（采集矩阵、数据量估算、时间计划、元数据清单），并导出 JSON 供 PPT 使用。

运行：python _build/data_plan.py  →  训练数据方案与采集计划.xlsx、_build/data_plan.json
数字均为建议值，待与深圳同事、mentor 确认后再定。
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------- 数据集目录（许可于 2026-11-11 按官方页面核实） ----------------
# 用途分类：评测 / 训练微调 / 仿真素材 / 仅研究 / 储备
DS_COLS = ["数据集", "年份", "用途分类", "阵列与场景", "方位标注", "规模", "许可（已核实）", "可否商用", "结论与用途", "来源"]
DATASETS = [
    ["RealMAN", "2024", "训练微调", "实录；32 麦阵列，可抽小子阵；中文语音（音箱播放），32 个室内外场景，静止 + 移动", "有：方位、俯仰、距离",
     "语音 83.7 h + 噪声 144.5 h", "CC BY 4.0", "可以", "采用：网络训练与微调的主力真实数据；抽取与目标几何接近的子阵", "https://github.com/Audio-WestlakeU/RealMAN"],
    ["LOCATA", "2018", "评测", "实录；4 类阵列（含 12 麦机器人头、平面阵）；英语，单房间", "有",
     "6 个任务，规模小", "ODC-BY", "可以", "采用：静态测向（Task 1）与跟踪（Task 3）评测，便于与文献对比", "https://zenodo.org/records/3630471"],
    ["Treble10", "2025", "仿真素材", "物理精确仿真；含 6 麦圆阵（半径 3 cm）设备冲激响应；10 个带家具的真实房间", "有（几何已知）",
     "3000+ 条冲激响应", "冲激响应子集 CC BY-NC-SA 4.0；6 通道语音子集 CC BY 4.0", "6 通道语音子集可以", "采用 6 通道语音子集：小阵列高逼真仿真，补充 pyroomacoustics", "https://huggingface.co/datasets/treble-technologies/Treble10-Speech"],
    ["AISHELL-1", "2017", "仿真素材", "单通道近讲；中文，400 人", "无",
     "约 178 h", "Apache 2.0", "可以", "采用：仿真用干净中文语音", "https://www.openslr.org/33/"],
    ["MUSAN", "2015", "仿真素材", "单通道；音乐、语音、噪声三类", "无",
     "音乐 / 语音 / 噪声", "CC BY 4.0", "可以", "采用：电视类干扰（音乐 + 语音节目）", "https://www.openslr.org/17/"],
    ["DEMAND", "2013", "仿真素材", "多通道实录环境噪声（家居、办公、交通等）", "无",
     "多种环境", "CC BY 4.0", "可以", "采用：多通道环境噪声", "https://zenodo.org/records/1227121"],
    ["MISP 2021", "2021", "仅研究", "实录；远 / 中 / 近场麦克风 + 摄像机；中文对话，34 个真实家庭电视房间", "无直接方位标注（有视频）",
     "141 h 音视频", "非商用协议（需签署）", "不可以", "仅研究：家居 + 电视干扰场景的效果参考", "https://mispchallenge.github.io/download.html"],
    ["STARSS23", "2023", "储备", "实录；4 通道四面体阵列 / FOA；13 类声音事件，16 个房间", "有（事件级）",
     "约 7.5 h", "MIT", "可以", "储备：异响扩展；几何与目标设备差异大", "https://zenodo.org/records/7709052"],
    ["DCASE 2025 立体声 SELD", "2025", "储备", "由 STARSS23 转换：双通道 + 普通视角视频，含画面内 / 外标签", "有",
     "13 类声音事件", "MIT", "可以", "储备：视听融合、画面内外判定", "https://zenodo.org/records/15559774"],
    ["SSLR", "2018", "储备", "实录；Pepper 机器人头 4 麦，含风扇自噪声", "有",
     "约 25 h", "受限下载，条款需申请", "未知", "储备：小孔径 + 自噪声，仅研究对比", "https://www.idiap.ch/dataset/sslr/"],
    ["CAV3D", "2019", "储备", "实录；8 麦圆阵与摄像头共址", "有",
     "20 段序列", "需申请，条款未公开", "未知", "储备：视听跟踪评测", "https://speechtek.fbk.eu/cav3d-dataset/"],
]
# 已查但不纳入的数据集（Excel 记录原因）
DS_EXCLUDED = [
    ["MRSAudio", "2025", "双耳 / Ambisonics 录音与视频", "无小平面阵，格式与目标设备不同"],
    ["trajectoRIR", "2025", "沿轨迹移动的麦克风录音与冲激响应（16 麦圆阵、12 麦线阵等）", "阵列大、单一房间；可作跟踪算法的补充测试"],
    ["HARP", "2024", "仿真 7 阶 Ambisonics 冲激响应", "Ambisonics 格式，与小平面阵不符"],
    ["RIR-Mega-Speech", "2026", "单通道混响语音（LibriSpeech 卷积）", "单通道，不能用于测向"],
]
# 仿真与实录差距（RealMAN 论文表 5，静止说话人，5° 内准确率）
SIM_REAL = [["仅仿真训练（仿真语音 + 仿真噪声）", "60.4%"], ["仿真语音 + 真实噪声", "52.4%"], ["真实语音 + 仿真噪声", "80.0%"], ["真实语音 + 真实噪声", "89.2%"]]

# ---------------- 仿真方案 ----------------
SIM = [
    ["阵列", "按目标设备几何（麦克风数量、间距、安装位置）；几何未定前先用 4 麦 5.7 cm 方阵"],
    ["房间", "边长 3–8 m；RT60 0.2–0.9 s；家具散射用随机吸声系数近似"],
    ["声源", "距离 0.5–5 m，方位 0–360°；静止 / 圆弧 / 直线 / 随机游走；唤醒词 + 连续语音"],
    ["干扰", "电视（语音、音乐节目）、空调 / 风扇扩散噪声、云台电机近场噪声；SIR −5～20 dB，SNR 0～30 dB"],
    ["增强", "阵元位置扰动、通道增益与相位失配、通道置换（对称阵列）"],
    ["工具与规模", "pyroomacoustics（现有脚本）、gpuRIR（移动声源）；Treble10 6 通道语音子集作高逼真补充；目标约 200 h 多通道数据（建议值）"],
]

# ---------------- 自采集矩阵（每间房） ----------------
# 名称, 声源, 点位 / 条数, 每单位时长（分钟）, 条件, 说明
MATRIX = [
    ["静态网格（音箱播放）", "音箱播放：唤醒词 × 5 遍 + 连续语音约 20 s", "12 方位 × 3 距离 × 2 高度 = 72 点", 0.5, "安静", "可重复、覆盖全；唤醒词先请多人近讲录制再播放"],
    ["静态子集（真人）", "真人：唤醒词 × 5 遍 + 指令与自由说话", "4 人 × 12 方位 × 1 距离 = 48 次", 0.5, "安静", "补充真人头部指向性、说话习惯"],
    ["移动轨迹（真人）", "真人边说边走：圆弧、直线、靠近 / 远离", "4 人 × 10 条", 1.0, "安静", "跟踪用；方位真值靠顶视或鱼眼摄像头标注"],
    ["干扰单独录制", "电视节目、空调 / 风扇、云台电机转动", "3 种 × 2 位置", 5.0, "无人", "与语音分开录，后期按指定 SIR 混合"],
    ["真实混合（测试用）", "真人唤醒 + 电视同时播放", "2 人 × 12 方位", 0.5, "电视开", "不做后期混合，作为真实测试样本"],
    ["长时误转专测", "无人，电视持续播放", "1 段", 120.0, "电视开", "测误转率（次 / 小时）"],
]

ROOMS = [
    ["卧室类", "约 3 × 4 m", "约 0.3 s"],
    ["客厅类", "约 5 × 6 m", "约 0.5 s"],
    ["空旷大房间", "约 7 × 8 m", "约 0.8 s"],
    ["会议室", "约 5 × 8 m", "约 0.6 s"],
]

META = [
    "房间尺寸、家具布置照片、实测 RT60",
    "阵列中心坐标与朝向；若阵列随云台转动，记录每段的云台角",
    "每个点位的方位、距离、高度（地面贴标记）",
    "说话人编号、性别、站 / 坐（不记录可识别个人身份的信息）",
    "唤醒词起止时间（人工标注或唤醒模块日志）",
    "干扰源类型、位置、播放音量；同一时钟下的多通道同步",
    "移动段的轨迹视频（顶视或鱼眼摄像头）与时间戳",
]

# ---------------- 时间计划（建议，待确认） ----------------
TIMELINE = [
    ["方案定稿", "11 月下旬", "采集方案、数据格式、标注规范定稿；确认阵列 / 样机；启动录音合规流程（知情同意等）", "定位侧", "采集方案 v1"],
    ["深圳准备与试录", "12 月上中旬", "设备、场地、标记与同步；试录半天，检查同步、电平、标注后修订方案", "深圳同事 + 定位侧", "试录数据与检查记录"],
    ["正式采集", "12 月中旬至 1 月上旬", "4 类房间，约 8–10 个工作日（含搭建与标定）", "深圳同事", "原始多通道数据"],
    ["整理与交付", "1 月中下旬", "切分、标注核对、按房间划分训练 / 测试", "定位侧", "训练集 / 测试集 v1"],
    ["仿真数据（并行）", "阵列几何确认后即开始", "按目标几何生成约 200 h 仿真数据；先用公开数据和仿真训练候选模型", "定位侧", "仿真数据集、基线模型"],
]

# ---------------- 对比规范 ----------------
COMPARE = [
    ["同测试场景", "固定测试集：自采数据中不参与训练的房间 + LOCATA Task 1 / 3 + 5 个演示场景；竞品样机在同一房间、同一点位实测"],
    ["同模型规格", "参数量、模型 / 资源文件大小与总运行内存对齐竞品；竞品定位模块的资源尚未公开，预算待 SDK 规格或样机实测后确定，暂不预设数值"],
    ["同算力开销", "同一平台、同一段多通道音频上测处理耗时与执行单元（CPU / DSP / NPU）；目标芯片确认后改在目标芯片上测"],
    ["统一指标", "Acc@10°、粗大错误率、平均误差、首次定向时延、跟踪覆盖率、误转次数 / 小时"],
]

CONFIRM = [
    "demo 与采集用哪套阵列或样机（麦克风数量、间距、安装位置）",
    "深圳同事的人力、场地与可用时间",
    "录音的合规流程：参与者知情同意、数据存储与使用范围",
    "唤醒词文本，以及能否拿到唤醒模块对录音的起止时间",
    "目标芯片与算力预算（决定“同模型规格、同算力”的具体数字）",
]


COUNTS = [72, 48, 40, 6, 24, 1]  # 与 MATRIX 各行的“点位 / 条数”一致


def per_room_minutes():
    rows = [[m[0], n, m[3], round(n * m[3])] for m, n in zip(MATRIX, COUNTS)]
    return rows, round(sum(r[3] for r in rows))


def build_excel(path):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
    wb = Workbook(); thin = Side(style="thin", color="CBD5E1")
    def sheet(ws, header, rows, widths):
        ws.append(header)
        for r in rows: ws.append(r)
        for c in ws[1]:
            c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="17375E")
            c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        for row in ws.iter_rows(min_row=2):
            for c in row:
                c.alignment = Alignment(wrap_text=True, vertical="top"); c.border = Border(top=thin, bottom=thin, left=thin, right=thin)
        for i, w in enumerate(widths): ws.column_dimensions[chr(65 + i)].width = w
        ws.freeze_panes = "A2"
    ws = wb.active; ws.title = "采集矩阵（每间房）"
    sheet(ws, ["项目", "声源与内容", "点位 / 条数", "每单位时长（分钟）", "条件", "说明"], MATRIX, [20, 36, 30, 14, 10, 40])
    rows, tot = per_room_minutes()
    ws2 = wb.create_sheet("数据量估算")
    sheet(ws2, ["项目", "数量", "每单位（分钟）", "每间房合计（分钟）"], rows + [["每间房合计", "", "", tot], ["4 类房间合计（小时）", "", "", round(tot * 4 / 60, 1)]], [24, 10, 16, 22])
    ws3 = wb.create_sheet("房间")
    sheet(ws3, ["房间类型", "尺寸（建议）", "混响时间（建议）"], ROOMS, [20, 16, 18])
    ws4 = wb.create_sheet("元数据清单")
    sheet(ws4, ["序号", "需要记录的内容"], [[i + 1, m] for i, m in enumerate(META)], [8, 80])
    ws5 = wb.create_sheet("时间计划")
    sheet(ws5, ["阶段", "时间（建议）", "内容", "负责", "产出"], TIMELINE, [16, 18, 60, 18, 20])
    ws6 = wb.create_sheet("数据集目录")
    sheet(ws6, DS_COLS, DATASETS, [18, 8, 12, 46, 20, 20, 30, 16, 44, 50])
    ws8 = wb.create_sheet("已查未纳入")
    sheet(ws8, ["数据集", "年份", "内容", "不纳入原因"], DS_EXCLUDED, [20, 8, 50, 50])
    ws7 = wb.create_sheet("待确认")
    sheet(ws7, ["序号", "事项"], [[i + 1, c] for i, c in enumerate(CONFIRM)], [8, 80])
    wb.save(path)
    return tot


if __name__ == "__main__":
    tot = build_excel(os.path.join(ROOT, "训练数据方案与采集计划.xlsx"))
    rows, _ = per_room_minutes()
    json.dump({"datasets": DATASETS, "ds_cols": DS_COLS, "sim_real": SIM_REAL, "sim": SIM, "matrix": MATRIX, "rooms": ROOMS, "meta": META, "timeline": TIMELINE,
               "compare": COMPARE, "confirm": CONFIRM, "volume_rows": rows, "per_room_min": tot,
               "total_h": round(tot * 4 / 60, 1)},
              open(os.path.join(ROOT, "_build", "data_plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("per room minutes", tot, "total hours", round(tot * 4 / 60, 1)); print(rows)
