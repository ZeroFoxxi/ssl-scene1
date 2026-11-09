# -*- coding: utf-8 -*-
"""声源定位调研清单：文献 / 数据集 / 工具 / 竞品 / 待确认问题"""
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

OUT = sys.argv[1]
FONT = "Microsoft YaHei"
HDR = PatternFill("solid", fgColor="17375E")
HL = PatternFill("solid", fgColor="E3F1EE")
thin = Side(style="thin", color="CBD5E1")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)

wb = Workbook()


def sheet(title, headers, rows, widths, highlight_col=None, highlight_vals=()):
    ws = wb.create_sheet(title)
    ws.append(headers)
    for r in rows:
        ws.append(list(r))
    for c in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=c)
        cell.font = Font(name=FONT, bold=True, color="FFFFFF", size=10.5)
        cell.fill = HDR; cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True); cell.border = BORDER
        ws.column_dimensions[get_column_letter(c)].width = widths[c - 1]
    for r in range(2, len(rows) + 2):
        hl = highlight_col is not None and str(ws.cell(row=r, column=highlight_col).value) in highlight_vals
        for c in range(1, len(headers) + 1):
            cell = ws.cell(row=r, column=c)
            cell.font = Font(name=FONT, size=10, bold=(c == 1 or c == 2) and False)
            cell.alignment = Alignment(vertical="top", wrap_text=True); cell.border = BORDER
            if hl: cell.fill = HL
            v = cell.value
            if isinstance(v, str) and v.startswith("http"):
                cell.hyperlink = v; cell.font = Font(name=FONT, size=10, color="2F6EB5", underline="single")
    ws.freeze_panes = "C2"
    ws.auto_filter.ref = ws.dimensions
    ws.row_dimensions[1].height = 30
    return ws


# ---------------- 1. 文献 ----------------
lit_h = ["类别", "方法 / 论文", "作者", "年份", "发表", "输入 / 阵列", "输出", "核心思想", "开销 / 规模", "开源", "与场景一的关系", "链接"]
lit = [
    ["传统", "GCC-PHAT", "Knapp & Carter", 1976, "IEEE TASSP", "双通道", "时延 → 方位", "相位变换加权的广义互相关", "极低", "多实现", "2 麦方案组件；SRP 的基础", ""],
    ["传统", "SRP-PHAT", "DiBiase 等", 2001, "Microphone Arrays（专著章节）", "任意阵列", "方位 / 位置", "候选方向上累加各麦克风对的 PHAT 相关", "低（随网格与阵元对数增长）", "pyroomacoustics", "基线 B0（已实现）", ""],
    ["传统", "MUSIC / NormMUSIC", "Schmidt；pyroomacoustics", 1986, "IEEE TAP", "多通道", "方位", "噪声子空间正交性；NormMUSIC 做频点归一化", "中（逐频点特征分解）", "pyroomacoustics", "对照；相干反射下性能下降", "https://pyroomacoustics.readthedocs.io/en/stable/pyroomacoustics.doa.html"],
    ["DNN 早期", "Broadband DOA estimation using CNNs trained with noise signals", "Chakrabarty & Habets", 2017, "WASPAA", "多通道 STFT 相位", "角度分类", "用相位图 + CNN 学习角度映射，噪声训练可泛化到语音", "小", "—", "“CNN 学角度映射”范式起点", ""],
    ["DNN 早期", "Deep Neural Networks for Multiple Speaker Detection and Localization（SSLR）", "He, Motlicek, Odobez", 2018, "ICRA", "Pepper 4 麦 GCC-PHAT", "多声源方位似然", "GCC 特征 + MLP/CNN，多声源检测与定位", "小", "github idiap/nnsslm", "小孔径 + 机器人自噪声，与摄像头最像", "https://arxiv.org/abs/1711.11565"],
    ["DNN 早期", "Exploiting DNNs and Head Movements for Robust Binaural Localization", "Ma, May, Brown", 2017, "IEEE/ACM TASLP", "双耳", "方位", "DNN + 转头消除前后混淆", "小", "—", "2 麦方案的转动消歧依据", "https://eprints.whiterose.ac.uk/120726"],
    ["SELD", "SELDnet", "Adavanne 等", 2019, "IEEE JSTSP", "FOA / MIC 4ch", "事件 + DOA", "CRNN 联合检测与定位", "—", "DCASE 基线", "SELD 范式起点", ""],
    ["SELD", "ACCDOA", "Shimada 等", 2021, "ICASSP", "4ch", "类别 × 方向向量", "把活跃度与方向合并为一个向量回归", "—", "DCASE 基线", "M1 输出格式", ""],
    ["SELD", "Multi-ACCDOA + ADPIT", "Shimada 等", 2022, "ICASSP", "4ch", "多轨道类别 × 方向", "支持同类多声源；ADPIT 解决排列问题", "—", "DCASE 基线", "M1 输出格式（推荐）", ""],
    ["SELD", "SALSA-Lite", "Nguyen, Jones, Watcharasupat, Phan, Gan（NTU）", 2022, "ICASSP", "MIC 4ch", "特征", "多通道对数谱 + 归一化 IPD，比 SALSA 快约 30 倍", "特征计算轻", "github thomeou/salsa-lite", "M1 特征（推荐）；新加坡 NTU 团队", "https://arxiv.org/abs/2111.08192"],
    ["SELD", "SELD-TCN", "Guirguis 等（Bosch）", 2020, "EUSIPCO", "4ch", "事件 + DOA", "用因果 TCN 替代 RNN，训练 / 推理更快", "—", "—", "端侧时序建模备选", ""],
    ["结构多元", "Cross3D", "Diaz-Guerra, Miguel, Beltran", 2021, "IEEE/ACM TASLP", "SRP-PHAT 3D 功率图", "3D 位置轨迹", "SRP 图 + 3D CNN，可解释", "中", "见论文", "SRP 与网络的桥梁", ""],
    ["端侧", "Cross3D-Edge + LC-SRP-Edge", "Yin & Verhelst（KU Leuven）", 2023, "ACM TECS（arXiv 2025）", "SRP 图", "DOA", "裁剪 Cross3D；轻量 SRP 计算", "127.1 MFLOPS；树莓派 4B 8.59 ms/帧，提速 7.26 倍", "—", "单声源鲁棒备选；端侧开销参考", "https://arxiv.org/abs/2503.02046"],
    ["端侧", "LightDOA（+ LLM 辅助仿真场景）", "Li 等", 2025, "arXiv 预印本", "双通道 IPD", "0–180° 分 37 类", "深度可分离卷积 + GRU；LLM 生成声学场景描述用于仿真", "低", "—", "2 麦方案备选；数据合成新思路", "https://arxiv.org/abs/2511.08012"],
    ["移动声源", "FN-SSL", "Wang, Yang, Li（西湖大学）", 2023, "Interspeech", "双通道起", "DP-IPD → DOA", "全带 / 窄带交替建模直达声相位差", "较高", "github Audio-WestlakeU/FN-SSL", "精度参照 / 教师模型", "https://arxiv.org/abs/2305.19610"],
    ["移动声源", "IPDnet", "Wang 等（西湖大学）", 2024, "arXiv", "多通道、多声源", "DP-IPD → 多源 DOA", "扩展 FN-SSL 到多麦多源", "较高", "同上", "精度参照 / 教师模型", "https://arxiv.org/abs/2405.07021"],
    ["几何泛化", "Neural-SRP", "Grinstein 等", 2024, "IEEE OJSP", "任意几何", "多源跟踪", "受 SRP 启发的因果网络，适配任意麦克风布局", "中", "—", "多款硬件时考虑", "https://arxiv.org/abs/2403.09455"],
    ["视听", "Light-ASD", "Liao 等", 2023, "CVPR", "人脸序列 + 音频", "是否在说话", "2D/3D 卷积 + GRU 的轻量说话人检测", "约 1.0 M 参数，0.6 GFLOPs；AVA mAP 94.1%", "github Junhua-Liao/Light-ASD", "E1 说话人确认", "https://openaccess.thecvf.com/content/CVPR2023/html/Liao_A_Light_Weight_Model_for_Active_Speaker_Detection_CVPR_2023_paper.html"],
    ["视听", "AV3T（CAV3D）", "Qian 等（FBK）", 2019, "IEEE TMM", "共址摄像头 + 8 麦圆阵", "3D 说话人轨迹", "视听粒子滤波", "—", "github smartcameras/AV3T", "E1 融合跟踪参考", "https://speechtek.fbk.eu/cav3d-dataset/"],
    ["视听", "STNet", "—", 2024, "arXiv", "视听", "说话人轨迹", "深度视听融合跟踪网络", "—", "—", "E1 学习式融合参考", "https://arxiv.org/abs/2410.05964"],
    ["视听", "Audio-Visual Speaker Tracking 综述", "Zhao, Xu, Wang 等（Surrey）", 2023, "arXiv（v5 2025）", "—", "—", "视听说话人跟踪综述：测量、贝叶斯跟踪、数据集", "—", "—", "E1 入门综述", "https://arxiv.org/abs/2310.14778"],
    ["前沿", "Stereo SELD with onscreen/offscreen classification（DCASE 2025 基线）", "DCASE 2025 任务 3 组织方", 2025, "arXiv", "立体声 + 视频", "事件 + 方位 + 距离 + 画面内外", "有限视场的视听 SELD", "—", "DCASE 基线", "与“画面内外判断”直接对应", "https://arxiv.org/abs/2507.12042"],
    ["前沿", "SAID（DCASE 2026 任务 3 纯音频赛道第一）", "Wang, Liang, Cao, Kong（港中文）", 2026, "arXiv 2609.31492", "4ch 四面体阵列", "1°/像素声能图 + 类别", "低通道空间音频生成语义声学图", "官方评测 Macro mAP 0.108", "—", "中期储备：画面叠加声源热力图", "https://dcase.community/challenge2026/task-semantic-acoustic-imaging-for-sound-event-localization-and-detection-from-spatial-audio-and-audiovisual-scenes"],
    ["前沿", "BAT", "Zheng 等", 2024, "ICML", "双耳空间音频", "问答", "空间音频编码器 + LLaMA-2，回答“在哪、是什么”", "7B LLM", "zhishengzheng.com/bat", "远期：语义查询", "https://arxiv.org/abs/2402.01591"],
    ["前沿", "ELSA", "Devnani 等（Apple）", 2024, "NeurIPS", "空间音频（FOA）", "音频-文本嵌入", "空间感知的对比学习；3D 定位误差约 15°", "—", "—", "远期：空间语义检索", "https://machinelearning.apple.com/research/spatially-aware"],
]
sheet("文献", lit_h, lit, [9, 34, 22, 7, 16, 18, 16, 36, 24, 20, 26, 40], highlight_col=11,
      highlight_vals={"基线 B0（已实现）", "M1 输出格式（推荐）", "M1 特征（推荐）；新加坡 NTU 团队", "E1 说话人确认"})

# ---------------- 2. 数据集 ----------------
ds_h = ["数据集", "年份", "出处", "类型", "阵列", "动态声源", "视频", "规模", "许可", "本方案用途", "贴近度", "链接"]
ds = [
    ["CAV3D", 2019, "FBK，IEEE TMM", "真实", "8 麦圆阵与摄像头共址 + 4 个角落摄像头", "是", "是", "20 段（单人 9 / 带干扰 6 / 多人 5）", "见官网", "视听跟踪评测", "高", "https://speechtek.fbk.eu/cav3d-dataset/"],
    ["RealMAN", 2024, "西湖大学等，NeurIPS D&B", "真实", "32 麦阵列，可抽子阵", "是（35 h）", "否（鱼眼相机仅用于标注）", "83 h 语音 + 144 h 噪声，32 个场景", "CC BY 4.0", "真实微调与评测、真实噪声", "高", "https://github.com/Audio-WestlakeU/RealMAN"],
    ["SSLR", 2018, "Idiap，ICRA", "真实", "Pepper 机器人头 4 麦（5.8 × 6.9 cm），含风扇自噪声", "部分", "否", "约 25 h 回放 + 真人录音", "EULA 非商用", "小孔径 + 自噪声测向评测", "高", "https://www.idiap.ch/dataset/sslr"],
    ["LOCATA", 2018, "IEEE AASP 挑战赛，TASLP 2020", "真实", "DICIT 线阵、Eigenmike、12 麦机器人头、助听器", "是（含移动阵列）", "否", "6 个任务", "Open Data Commons", "跟踪评测（移动阵列≈云台转动）", "中", "https://www.locata.lms.tf.fau.de/challenge-description/"],
    ["STARSS23", 2023, "Sony & Tampere，NeurIPS D&B", "真实", "4ch 四面体 MIC / FOA", "是", "360°", "168 段约 7.5 h，16 个房间，13 类", "MIT", "事件 + 定位联合评测", "中", "https://zenodo.org/records/7880637"],
    ["DCASE2025 Stereo SELD", 2025, "DCASE 2025 任务 3", "真实（由 STARSS23 转换）", "立体声 2ch", "是", "普通视角 640×360", "13 类，含画面内 / 外", "见 Zenodo", "2 麦 + 有限视场参照", "中", "https://zenodo.org/records/15559774"],
    ["STAIRS26", 2026, "DCASE 2026 任务 3", "真实", "32ch Eigenmike", "是", "配合 STARSS23 视频", "约 7.5 h，168 段，声学成像标注 1°/像素", "MIT", "声学成像（中期储备）", "低", "https://zenodo.org/records/18171005"],
    ["AV16.3", 2004, "Idiap，MLMI", "真实", "2 组 8 麦圆阵（半径 10 cm）+ 3 摄像头", "是", "是", "43 段", "EULA 非商用", "视听跟踪经典对比", "中", "https://www.idiap.ch/dataset/av16-3"],
    ["TAU-NIGENS Spatial Sound Events 2020/2021", "2020–21", "DCASE", "合成", "4ch MIC / FOA", "是", "否", "—", "见 Zenodo", "SELD 预训练 / 方法对标", "低", ""],
    ["DREGON", 2018, "Inria，IROS", "真实", "无人机 8 麦立方阵", "是", "否", "静态 + 飞行录音，含自噪声", "公开", "自噪声处理方法参考", "低", "https://members.loria.fr/ADeleforge/category/datasets/"],
    ["AVA-ActiveSpeaker", 2020, "Google，ICASSP", "真实视频", "单声道", "—", "是", "电影片段，说话人检测标注", "见官网", "Light-ASD 训练与评测", "中", ""],
    ["AISHELL-1", 2017, "希尔贝壳", "干净语音", "—", "—", "—", "约 178 h 中文", "Apache 2.0", "仿真声源（中文）", "—", "https://www.openslr.org/33/"],
    ["LibriSpeech", 2015, "Panayotov 等", "干净语音", "—", "—", "—", "约 1000 h 英文", "CC BY 4.0", "仿真声源（英文）", "—", "https://www.openslr.org/12"],
    ["FSD50K", 2022, "Fonseca 等", "事件声", "—", "—", "—", "约 51k 片段，200 类", "逐条 CC 许可（含 NC），需筛选", "仿真事件声源", "—", ""],
    ["DEMAND / MUSAN", "2013 / 2015", "—", "噪声", "DEMAND 16ch", "—", "—", "—", "见各官网", "仿真噪声", "—", ""],
]
sheet("数据集", ds_h, ds, [26, 8, 24, 14, 30, 14, 16, 30, 18, 24, 8, 40], highlight_col=11, highlight_vals={"高"})

# ---------------- 3. 工具 ----------------
tl_h = ["工具", "用途", "要点", "链接"]
tl = [
    ["pyroomacoustics", "房间仿真 + 经典 DOA", "镜像源法；DOA 模块含 SRP、MUSIC、NormMUSIC、CSSM、WAVES、TOPS、FRIDA；numpy 1.x 用 0.7.x", "https://pyroomacoustics.readthedocs.io/"],
    ["gpuRIR", "GPU 加速 RIR + 移动声源", "simulateTrajectory 按轨迹分段卷积；约比 CPU 快百倍", "https://github.com/DavidDiazGuerra/gpuRIR"],
    ["SpatialScaper", "SELD 数据合成", "可用实测 RIR 库，支持直线 / 样条 / 随机游走轨迹与增强", "https://github.com/iranroman/SpatialScaper"],
    ["FN-SSL / IPDnet 代码", "强基线 / 教师模型", "PyTorch Lightning，含预训练模型", "https://github.com/Audio-WestlakeU/FN-SSL"],
    ["SALSA-Lite 代码", "M1 特征", "PyTorch 实现", "https://github.com/thomeou/salsa-lite"],
    ["Light-ASD 代码", "E1 说话人检测", "含权重", "https://github.com/Junhua-Liao/Light-ASD"],
    ["AV3T", "视听跟踪", "MATLAB，CAV3D / AV16.3 评测", "https://github.com/smartcameras/AV3T"],
    ["ssl_baseline（本项目）", "基线 B0 原型", "SRP-PHAT + 起始段加权 + 圆周卡尔曼 + 云台状态机 + 仿真与评测", "E:\\LHYX\\华为实习\\声源定位调研\\code\\ssl_baseline"],
]
sheet("工具", tl_h, tl, [24, 22, 60, 50])

# ---------------- 4. 竞品 ----------------
cp_h = ["产品", "品类", "年份", "声学能力", "视觉能力", "跟踪 / 转向", "证据等级", "来源"]
cp = [
    ["萤石 C6C 无极巡航版", "家用云台摄像头", 2019, "3 麦，360° 声源定位，转向声源拍摄", "人形追踪、巡航追踪", "水平 360°；追踪最高 120°/s", "A/B", "https://www.ezviz.com/cn/news/2342.html"],
    ["华为智选 海雀智能摄像头 Pro", "家用云台摄像头", 2024, "宣传声源定位；语音唤醒控制云台；哭声识别", "AI 人形侦测、移动追踪", "语音指令转向", "C", "https://item.jd.com/product/D78QATZcZDouWhWpFcPfEA.html"],
    ["华为智选 海雀雀蛋 Pro", "家用云台摄像头", 2025, "双麦 + 自研音频算法；“海雀海雀”唤醒后感知声源并转向；评测称正面 180° 内识别", "“C 位音画追踪”、无极追踪、4K", "399 元起；2025-03-19 发布", "C", "https://news.mydrivers.com/1/1037/1037251.htm"],
    ["TP-Link Tapo C210 / C212", "家用云台摄像头", "—", "哭声检测", "移动追踪", "视觉追踪", "B", "Tapo C210 / C212 官方数据表"],
    ["小米智能摄像机 C700", "家用云台摄像头", 2024, "响声、哭声、玻璃破碎检测；未见声源定位", "AI 人形检测与追踪", "双电机云台 360° / 110°", "B", "https://www.mi.com/uk/support/faq/details/KA-502853/"],
    ["Amazon Echo Show 10（已停产）", "智能屏", 2021, "声源定位（声波分解 + 机器学习）", "人体识别，区分人声与反射", "转屏跟随；死区 / 保持区 / 运动区；≤180°/s", "A", "https://www.amazon.science/blog/the-science-behind-echo-show-10"],
    ["Amazon Astro", "家庭机器人", 2021, "玻璃破碎、烟雾 / CO 报警声检测（需订阅）", "人员识别", "是否循声导航未见官方说明", "B", "Amazon Astro App 介绍"],
    ["Cisco Quad Camera（现行；前代 SpeakerTrack 60 已下线）", "会议摄像头", "—", "内置 8 麦阵列，只用于 SpeakerTrack 计算", "四镜头 + 人脸检测", "前代双摄预对准平滑切换", "B/C", "https://www.cisco.com/c/en/us/products/collateral/collaboration-endpoints/telepresence-speaker-track-60/datasheet-c78-729836.html"],
    ["Logitech Rally Bar（RightSight 2）", "会议摄像头", 2022, "6 麦波束成形（零售规格）", "双摄", "Speaker View 画中画", "B", "Logitech 2022-02-01 发布"],
    ["Jabra PanaCast 50", "会议摄像头", 2021, "8 个波束成形麦克风", "180° 视场", "Virtual Director", "B", "https://www.jabra.com/en-ie/business/video-conferencing/jabra-panacast-50"],
    ["Owl Labs Meeting Owl 4+", "会议摄像头", 2024, "8 个全向麦，拾音半径 5.5 m", "360° 4K，64 MP", "结合视觉、声音、动作聚焦说话人", "B", "https://resources.owllabs.com/hubfs/Website%20Pages%20-%20Files%20-%20Images/pdp/mo4-plus-datasheet/datasheet_mo34_plus_en.pdf"],
    ["Poly Studio X70（DirectorAI）", "会议摄像头", "—", "二阶梯度麦克风阵列", "—", "发言人跟踪", "C", "评测、播客"],
    ["华为 IdeaHub（ES2 Plus）", "会议大屏", 2024, "12 麦阵列；ES2 Plus 官网：12 m 波束成形拾音", "4K 三摄", "智能跟踪 3.0、发言人跟踪", "B", "https://e.huawei.com/eu/products/enterprise-collaboration/ideahub/ideahub-es2-plus"],
    ["XMOS XVF3800", "语音处理芯片", "—", "1 个扫描波束 + 2 个跟踪波束，可读方位角", "无", "—", "A", "https://xmos.com/documentation/XM-014888-PC/html/modules/fwk_xvf/doc/datasheet/03_audio_pipeline.html"],
    ["Amazon AZ1 Neural Edge", "自研 SoC", 2020, "端侧运行声学定位模型", "端侧运行视觉模型", "—", "A", "同 Echo Show 10 博客"],
]
sheet("竞品", cp_h, cp, [30, 16, 8, 34, 24, 30, 10, 50])

# ---------------- 5. 待确认问题 ----------------
qa_h = ["#", "问题", "影响的决策", "向谁确认", "状态", "结论", "日期"]
qa = [
    [1, "麦克风数量、间距，装在底座还是云台头上？", "2 / 3 / 4 麦方案；是否需要坐标变换", "mentor / 硬件", "待确认", "", ""],
    [2, "目标 SoC 的 NPU / DSP 算力、内存与常开功耗预算？", "M1 网络规模；SRP 网格粒度", "mentor / 芯片", "待确认", "", ""],
    [3, "镜头水平视场角、云台转速、电机噪声水平？", "精度指标（HFOV/4）；电机门控策略", "mentor / 产品", "待确认", "", ""],
    [4, "哪些声音需要触发转向？优先级？", "SED 类别；状态机优先级", "mentor / 产品", "待确认", "", ""],
    [5, "是否需要俯仰与距离？是否考虑多人同时说话？", "阵列平面 / 立体；多目标跟踪", "mentor", "待确认", "", ""],
    [6, "能否采集设备实录？是否有内部数据？数据许可要求？", "数据方案与验收", "mentor", "待确认", "", ""],
    [7, "海雀雀蛋 Pro / 海雀 Pro / IdeaHub 的声源定位方案能否内部请教？", "竞品基线、复用经验", "mentor", "待确认", "", ""],
]
ws = sheet("待确认问题", qa_h, qa, [5, 46, 32, 16, 10, 36, 12])
dv = DataValidation(type="list", formula1='"待确认,已确认,不适用"', allow_blank=True)
ws.add_data_validation(dv); dv.add(f"E2:E{len(qa) + 1}")

del wb["Sheet"]
wb.save(OUT)
print("saved")
