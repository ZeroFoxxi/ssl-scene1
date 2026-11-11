# -*- coding: utf-8 -*-
"""公开参照方案汇总的唯一数据源：生成 Excel，并导出 JSON 供 PPT 使用。

运行：python _build/ref_data.py  →  公开参照方案汇总.xlsx、_build/ref_data.json
数字均摘自原文（来源列给出出处）；“本方案”一行为本仓库仿真结果。核对日期 2026-11-11。
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SOURCES = {
    "ESP": ("乐鑫 ESP-SR：DOA 文档（ESP32-P4）", "https://docs.espressif.com/projects/esp-sr/en/latest/esp32p4/direction_of_arrival/README.html"),
    "ODAS19": ("Grondin & Michaud 2019：SRP-PHAT-HSDA 与 M3K（arXiv 1812.00115）", "https://arxiv.org/abs/1812.00115"),
    "ODAS21": ("Grondin 等 2021：ODAS 框架（arXiv 2103.03954）", "https://arxiv.org/abs/2103.03954"),
    "XMOS": ("XMOS XVF3800 用户指南", "https://www.xmos.com/documentation/XM-014888-PC/html/modules/fwk_xvf/doc/user_guide/03_using_the_host_application.html"),
    "FESPL": ("思必驰 DUI Linux SDK 手册（fespl）", "https://www.duiopen.com/docs/ct_fesp_linux"),
    "RK3": ("萤石商城：RK3 桌面机器人参数", "https://www.ys7.com/item/927621.html"),
    "FNSSL": ("Wang 等 2023：FN-SSL（arXiv 2305.19610）", "https://arxiv.org/abs/2305.19610"),
    "REALMAN": ("Yang 等 2024：RealMAN 数据集（NeurIPS 2024，arXiv 2406.19959）", "https://arxiv.org/abs/2406.19959"),
    "DCASE24": ("DCASE 2024 Task 3 结果页", "https://dcase.community/challenge2024/task-audio-and-audiovisual-sound-event-localization-and-detection-with-source-distance-estimation-results"),
}

# ---------------- 资源参照（端侧部署，已公开内存 / 算力的方案优先） ----------------
RES_COLS = ["方案", "性质", "运行平台", "阵列", "方法", "内存", "算力", "精度（原文口径）", "来源"]
RES = [
    ["乐鑫 ESP-SR DOA", "商用 SDK（端侧）", "ESP32-P4 @400 MHz", "4 麦圆阵 r = 5 cm（支持 2–8 麦）",
     "Capon / MVDR，10° 网格", "约 206 KB（RAM 57 + PSRAM 149）", "0.65 ms / 8 ms 帧，CPU 8.1%",
     "官方仿真 ±10° 内 100%", "ESP"],
    ["ODAS", "开源框架（机器人）", "树莓派 3（Cortex-A53 1.2 GHz）", "8 / 16 麦",
     "SRP-PHAT 层级搜索 + 卡尔曼跟踪", "未单列", "8 麦定位单核 14%；跟踪 1 个声源 0.8%",
     "以单位球距离计，不便换算角度", "ODAS21"],
    ["XMOS XVF3800", "商用语音芯片", "专用语音处理器", "4 麦（线阵 33 mm / 方阵 66 mm）",
     "未公开；主机可读说话人方位", "未单列", "未单列", "未公开", "XMOS"],
    ["思必驰 fespl", "竞品 SDK", "未公开", "线性 4 / 6 麦",
     "未公开；唤醒后回调方位", "未公开", "未公开", "未公开", "FESPL"],
    ["萤石 RK3 桌面机器人", "竞品整机", "4 核 A55 1.5 GHz + NPU 3T（整机）", "2 麦",
     "未公开；180° 声源定位", "定位模块未公开", "定位模块未公开", "未公开", "RK3"],
    ["本方案基线", "仓库仿真原型", "PC（Python）", "4 麦方阵 5.7 cm",
     "唤醒段 GEVD-MUSIC + 卡尔曼跟踪", "导向表约 669 KB（两套、10° 网格、双精度）", "待目标芯片实测",
     "仿真（SIR 0 dB、RT60 0.6 s）10° 内 63%", "本仓库"],
]

# ---------------- 效果参照（学术评测，给出参数量） ----------------
EFF_COLS = ["方案", "评测条件", "参数量", "仿真：5° 内准确率 / 平均误差", "实录：10° 内准确率 / 平均误差", "来源"]
EFF = [
    ["IcoCNN", "FN-SSL 论文同条件对比：2 麦 8 cm、在线处理；实录为 LOCATA", "0.3 M", "51.4% / 8.1°", "93.2% / 3.9°", "FNSSL"],
    ["SRP-DNN", "同上", "0.8 M", "86.9% / 3.0°", "92.5% / 4.3°", "FNSSL"],
    ["FN-SSL", "同上", "2.5 M", "91.4% / 2.4°", "96.6% / 2.6°", "FNSSL"],
    ["Cross3D", "同上", "5.6 M", "50.8% / 8.4°", "93.6% / 3.9°", "FNSSL"],
    ["CRNN 基线（RealMAN）", "9 通道实录、静止说话人；真实数据训练 vs 仅仿真训练", "未报告",
     "—", "5° 内：真实训练 89.2% / 2.2°；仅仿真 60.4% / 7.8°", "REALMAN"],
    ["DCASE 2024 第 1 名", "STARSS23 实录，13 类声音事件、多声源（任务更难）", "46.9 M（集成）", "—", "DOA 误差 13.6°", "DCASE24"],
    ["DCASE 2024 麦阵基线", "同上，麦克风阵列格式", "0.74 M", "—", "DOA 误差 34.1°", "DCASE24"],
]

# ---------------- 要点 ----------------
RES_TAKE = [
    "公开了定位模块内存与算力的只有乐鑫和 ODAS，两者都是传统方法：约 200 KB 内存、单核个位数到十几个百分点的 CPU",
    "竞品（思必驰 fespl、萤石 RK3）与 XMOS 只公开功能或整机芯片，定位模块资源未公开",
]
EFF_TAKE = [
    "同条件下 0.8 M 的 SRP-DNN 已接近 2.5 M 的 FN-SSL，5.6 M 的 Cross3D 反而更差：参数量大不等于效果好",
    "学术模型只报参数量，未给端侧内存与耗时；只用仿真训练在实录上明显下降（89% → 60%），需要实采数据",
]
PROPOSAL = "建议：资源以乐鑫（约 206 KB、400 MHz 下 CPU 约 8%）为量级参照，效果以 FN-SSL 论文的同条件对比为参照；目标芯片确认后定具体预算"


def build_excel(path):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
    wb = Workbook(); thin = Side(style="thin", color="CBD5E1")

    def sheet(ws, header, rows, widths):
        ws.append(header)
        for r in rows: ws.append(r)
        for c in ws[1]:
            c.font = Font(bold=True, color="FFFFFF", name="Microsoft YaHei"); c.fill = PatternFill("solid", fgColor="17375E")
            c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        for row in ws.iter_rows(min_row=2):
            for c in row:
                c.font = Font(name="Microsoft YaHei"); c.alignment = Alignment(wrap_text=True, vertical="top")
                c.border = Border(top=thin, bottom=thin, left=thin, right=thin)
        for i, w in enumerate(widths): ws.column_dimensions[chr(65 + i)].width = w
        ws.freeze_panes = "A2"

    src = lambda k: SOURCES[k][1] if k in SOURCES else k
    ws = wb.active; ws.title = "资源参照"
    sheet(ws, RES_COLS, [r[:-1] + [src(r[-1])] for r in RES], [18, 16, 24, 24, 28, 28, 30, 30, 50])
    ws2 = wb.create_sheet("效果参照")
    sheet(ws2, EFF_COLS, [r[:-1] + [src(r[-1])] for r in EFF], [20, 46, 14, 24, 36, 50])
    ws3 = wb.create_sheet("要点与建议")
    sheet(ws3, ["类别", "内容"], [["资源", t] for t in RES_TAKE] + [["效果", t] for t in EFF_TAKE] + [["建议", PROPOSAL]], [10, 110])
    ws4 = wb.create_sheet("来源")
    sheet(ws4, ["代号", "名称", "链接"], [[k, v[0], v[1]] for k, v in SOURCES.items()], [10, 50, 90])
    wb.save(path)


if __name__ == "__main__":
    build_excel(os.path.join(ROOT, "公开参照方案汇总.xlsx"))
    json.dump({"sources": SOURCES, "res_cols": RES_COLS, "res": RES, "eff_cols": EFF_COLS, "eff": EFF,
               "res_take": RES_TAKE, "eff_take": EFF_TAKE, "proposal": PROPOSAL},
              open(os.path.join(ROOT, "_build", "ref_data.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("ok", len(RES), len(EFF))
