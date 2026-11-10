# -*- coding: utf-8 -*-
"""竞品规格调研（萤石、思必驰）的唯一数据源：生成 Excel，并导出 JSON 供 PPT 脚本使用。

运行：python _build/spec_data.py  →  竞品规格调研_萤石与思必驰.xlsx、_build/spec_data.json
证据等级：A 官方技术文档 / 监管披露（招股书、问询回复）；B 官方产品页、新闻稿、数据表；
C 电商、评测、拆解、经销商页、二手整理；“计算”为本方案自行估算；“判断”为推断，非事实。
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SOURCES = [
    ("S1", "A", "思必驰科技股份有限公司 首次公开发行股票并在科创板上市招股说明书（申报稿，2026）", "https://dataclouds.cninfo.com.cn/sjother2/documents/2026/2026-05-25/1d4b495ace513224eeffac7f7ab4bfbf.pdf"),
    ("S2", "A", "杭州萤石网络股份有限公司 科创板上市申请文件审核问询函之回复（2022）", "https://pdf.dfcfw.com/pdf/H2_AN202205051563734391_1.pdf"),
    ("S3", "B", "萤石官方资讯：C6C 无极巡航版 3 麦 360° 声源定位（2019）", "https://www.ezviz.com/cn/news/2342.html"),
    ("S4", "C", "什么值得买：萤石 C6C 无极巡航版使用总结（声源追踪转速）", "https://www.smzdm.com/zy/detail/avzr7pz/"),
    ("S5", "C", "电子工程专辑：拆解萤石精灵球新 C6（4MP）", "https://www.eet-china.com/news/202204210910.html"),
    ("S6", "C", "网易：E 拆解 萤石精灵球新 C6", "https://www.163.com/dy/article/GOKC04AC0538623I.html"),
    ("S7", "C", "数码之家：拆解萤石网络摄像头 CS-C6C-3B1WFR", "https://www.mydigit.cn/thread-402247-1-1.html"),
    ("S8", "B", "思必驰官网：AI Dual-Lens Tracking Camera C60", "https://meeting.aispeech.com/product/c60/"),
    ("S9", "B", "经济观察网：思必驰发布 AI 芯片 TH1520（2019）", "http://m.eeo.com.cn/2019/0105/344821.shtml"),
    ("S10", "C", "世强硬创：TH1520 经销商页面", "https://www.sekorm.com/product/501884728.html"),
    ("S11", "B", "智东西：深聪智能推出二代 AI 芯片 TH2608（2021）", "https://zhidx.com/news/35716.html"),
    ("S12", "C", "深圳湾：思必驰基于 TH1520 的离在线语音模组", "https://www.shenzhenware.com/articles/13926"),
    ("S13", "A", "乐鑫 ESP-SR 文档：Direction of Arrival (DOA)", "https://docs.espressif.com/projects/esp-sr/en/latest/esp32s3/direction_of_arrival/README.html"),
    ("S14", "A", "XMOS XVF3800 文档：Using the Host Application", "https://www.xmos.com/documentation/XM-014888-PC/html/modules/fwk_xvf/doc/user_guide/03_using_the_host_application.html"),
    ("S15", "B", "思必驰官网：智慧物联解决方案（麦克风阵列）", "https://www.aispeech.com/life"),
]

COLS = ["厂商", "产品 / 方案", "阵列", "定位能力 / 精度", "内存占用", "模型大小", "CPU / DSP / NPU", "离线 / 在线", "时延", "证据与来源"]

ROWS = [
    ["萤石", "C6C 无极巡航版（2019，1080P）", "3 麦", "3mic 设计、360° 声源定位，判定声源后转向拍摄（官网示例为掌声触发）；巡航追踪时最高 120°/s", "未公开", "未公开",
     "未公开（同系列 1080P 款论坛拆解见主控 HK2015-6，型号对应待核实）", "端侧（判断：转向需实时响应）", "未公开", "B S3（已核对原文）；C S7"],
    ["萤石", "C6C/3MP 无极版（2021）", "4 麦（自称行业首次采用 4 麦）", "听声辨位；高精度声源定位识别率 86.0%（行业平均 77.0%，自家实验室测试）", "未公开", "未公开",
     "公司 SoC 主要供应商为富瀚微、海思（整体采购口径，未指明产品与型号）", "音频 AI 算法可在云平台或设备端部署，设备支持算法动态加载；声源定位应在端侧（判断）", "未公开", "A S2 第 8-1-1-206、207、199 页"],
    ["萤石", "精灵球新 C6（4MP）", "2 颗驻极体麦", "未见声源定位宣传", "未公开", "未公开",
     "主控 ECZ5450S（定制 SoC，双核，内置 CNN 模块）", "—", "—", "C S5、S6"],
    ["思必驰", "AI 麦克风阵列模组", "双 / 四 / 六麦", "±5° 声源定位；180° / 360° 拾音；5 m 唤醒；3–5 m 远场交互", "未公开", "未公开",
     "自研 TH 系列芯片或适配主流芯片", "端侧离线（招股书强调端侧离线、低时延）", "未公开", "A S1 第 1-1-137 页；B S15"],
    ["思必驰", "DOA 定位与音区分割（会议拾扩音）", "大规模麦克风阵列", "说话人方向检测率 > 98%；静音区抑制 > 35 dB", "未公开", "未公开",
     "—", "—", "扩声延迟 < 22 ms（非定位时延）", "A S1 第 1-1-196 页"],
    ["思必驰", "AI 语音摄像头 C60（会议）", "8 阵列线性麦", "声像追踪：语音定位 + 视觉算法锁定发言者；1080P 特写 + 全景双目", "未公开", "未公开",
     "未公开", "支持离线语音指令", "未公开", "A S1 第 1-1-134 页；B S8"],
    ["思必驰", "TH1520 语音芯片（2019）", "最多 6 路 DMIC / AMIC", "—", "内置大容量存储（容量未公开）；64 KB boot ROM", "—",
     "双 DSP + AI 指令扩展；常开功耗毫瓦级、峰值 < 100 mW；DSP 400+ MHz（二手资料，待核实）", "端侧", "未公开", "B S9；C S10"],
    ["思必驰", "TH2608 SoC（2021）", "6 路模拟 + 6 路数字麦", "—", "内部 SRAM + 外部 XIP Flash（容量未公开）", "—",
     "Cortex-M + DSP + NPU（支持 INT8 / INT4 / INT1，算力未公开）", "端侧", "未公开", "B S11"],
    ["思必驰", "TH1520 离在线语音模组", "—", "—", "—", "—", "TH1520", "本地指令数百条 + 在线", "指令响应 < 500 ms（非定位时延）", "C S12"],
    ["公开参照", "乐鑫 ESP-SR DOA（ESP32-P4）", "2–8 麦任意几何", "Capon / MVDR；10° 网格；仿真 4 麦 ±10° 内 100%", "4 麦约 206 KB（内部 RAM 57 KB + PSRAM 149 KB）", "无神经网络",
     "CPU，单精度浮点", "端侧", "帧长 8 ms", "A S13"],
    ["公开参照", "XMOS XVF3800", "4 麦：线阵 33 mm / 方阵 66 mm", "主机可读各波束方位与处理后的说话人方位", "未查", "—", "专用语音处理芯片", "端侧", "—", "A S14"],
    ["本方案（计算）", "SRP-PHAT，4 麦 5.7 cm，300–4000 Hz", "4 麦", "仿真结果见主方案", "导向表：1° 约 2.0 MB；5° 约 402 KB；10° 约 201 KB", "无神经网络",
     "CPU / DSP；1° 约 129 MFLOP/s，10° 约 13 MFLOP/s", "端侧", "帧移 16 ms", "计算"],
    ["本方案（计算）", "GEVD-MUSIC（每次唤醒算一次）", "4 麦", "仿真结果见主方案", "导向表：1° 约 1.3 MB；10° 约 134 KB", "无神经网络",
     "CPU / DSP；每次唤醒一次（Python 约 6 ms）", "端侧", "—", "计算"],
]

GAPS = [
    ["萤石声源定位产品的主控型号", "采购现款 C6C 类样机拆解，确认 SoC 后查公开规格（CPU 主频、NPU 算力、DDR 容量）", "主控型号确定后可给出算力上限"],
    ["两家声源定位的内存占用、模型大小", "公开资料未见；可通过商务渠道向思必驰索取 SDK / 模组规格书；询问内部是否有可分享的信息", "直接决定选型的模型量级"],
    ["两家声源定位的响应时延", "样机实测：240 fps 录像，从说话结束到云台开始转动计时", "与主方案“唤醒词结束 → 输出方位”目标对照"],
    ["萤石 C6C 麦克风数量（3 麦 / 4 麦）", "2019 官方资讯为 3 麦，2021 问询回复为 4 麦，可能是不同版本；以样机或现款规格页为准", "影响阵列构型的对标"],
    ["思必驰 TH1520 / TH2608 的 SRAM、主频、NPU 算力", "官方数据手册未公开检索到；可向深聪智能索取", "决定若用其芯片作对标平台时的算力预算"],
]

IMPLICATIONS = [
    "两家都没有公开声源定位的内存、模型大小和时延，现有可对齐的是：端侧运行、阵列规模（2–8 麦）、精度口径。",
    "公开同类参照（乐鑫）：4 麦 MVDR 声源定位约 206 KB 内存、10° 网格、不用神经网络；本方案 SRP-PHAT 在 10° 网格下约 201 KB，处在同一量级。",
    "家用摄像头 SoC 的 NPU 主要承载视觉算法，声源定位更可能运行在 CPU / DSP 上（判断，待拆解与实测确认）。",
    "首轮选型建议按“百 KB 级内存、CPU / DSP 可实时运行”对齐竞品；若引入神经网络，先控制在与之相当的量级再比效果（判断，待确认目标芯片）。",
]


def build_excel(path):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
    wb = Workbook()
    thin = Side(style="thin", color="CBD5E1")
    head_fill = PatternFill("solid", fgColor="17375E")
    wrap = Alignment(wrap_text=True, vertical="top")

    def sheet(ws, header, rows, widths):
        ws.append(header)
        for r in rows:
            ws.append(r)
        for c in ws[1]:
            c.font = Font(bold=True, color="FFFFFF"); c.fill = head_fill
            c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        for row in ws.iter_rows(min_row=2):
            for c in row:
                c.alignment = wrap; c.border = Border(top=thin, bottom=thin, left=thin, right=thin)
        for i, w in enumerate(widths):
            ws.column_dimensions[chr(65 + i)].width = w
        ws.freeze_panes = "A2"

    ws = wb.active; ws.title = "规格总表"
    sheet(ws, COLS, ROWS, [12, 26, 18, 34, 26, 12, 30, 28, 22, 22])
    for row in ws.iter_rows(min_row=2):
        if row[0].value == "公开参照":
            for c in row: c.fill = PatternFill("solid", fgColor="EEF2F7")
        if row[0].value == "本方案（计算）":
            for c in row: c.fill = PatternFill("solid", fgColor="E3F1EE")
    n = ws.max_row + 2
    ws.cell(n, 1, "证据等级：A 官方技术文档 / 监管披露（招股书、问询回复）；B 官方产品页、新闻稿、数据表；C 电商、评测、拆解、经销商页、二手整理；“判断”为推断。信息截至 2026-11。")
    ws2 = wb.create_sheet("来源清单")
    sheet(ws2, ["编号", "证据等级", "来源", "链接"], [list(s) for s in SOURCES], [8, 10, 60, 80])
    ws3 = wb.create_sheet("缺口与获取途径")
    sheet(ws3, ["缺口", "获取途径", "用途"], GAPS, [32, 70, 36])
    ws4 = wb.create_sheet("对选型的含义")
    sheet(ws4, ["序号", "内容"], [[i + 1, t] for i, t in enumerate(IMPLICATIONS)], [8, 120])
    wb.save(path)


if __name__ == "__main__":
    build_excel(os.path.join(ROOT, "竞品规格调研_萤石与思必驰.xlsx"))
    json.dump({"sources": SOURCES, "cols": COLS, "rows": ROWS, "gaps": GAPS, "implications": IMPLICATIONS},
              open(os.path.join(ROOT, "_build", "spec_data.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("written")
