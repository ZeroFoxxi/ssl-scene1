# -*- coding: utf-8 -*-
"""公开参照方案汇总的唯一数据源：生成 Excel，并导出 JSON 供 PPT 使用。

运行：python _build/ref_data.py  →  公开参照方案汇总.xlsx、_build/ref_data.json
数字均摘自原文（来源列给出出处）。核对日期 2026-11-11。
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SOURCES = {
    "ESP": ("乐鑫 ESP-SR：DOA 文档（ESP32-P4）", "https://docs.espressif.com/projects/esp-sr/en/latest/esp32p4/direction_of_arrival/README.html"),
    "ODAS21": ("Grondin 等：ODAS 框架（arXiv 2103.03954）", "https://arxiv.org/abs/2103.03954"),
    "XMOS": ("XMOS XVF3800 用户指南", "https://www.xmos.com/documentation/XM-014888-PC/html/modules/fwk_xvf/doc/user_guide/03_using_the_host_application.html"),
    "FESPL": ("思必驰 DUI Linux SDK 开发手册", "https://www.duiopen.com/docs/ct_fesp_linux"),
    "RK3": ("萤石商城：RK3 桌面机器人参数", "https://www.ys7.com/item/927621.html"),
    "IPDNET2": ("Wang 等 2025-09：IPDnet2（arXiv 2509.21900）", "https://arxiv.org/abs/2509.21900"),
    "LIGHTDOA": ("Li 等 2025-11：LightDOA（arXiv 2511.08012）", "https://arxiv.org/abs/2511.08012"),
    "REALMAN": ("Yang 等 2024：RealMAN 数据集（NeurIPS 2024，arXiv 2406.19959）", "https://arxiv.org/abs/2406.19959"),
    "DCASE25": ("DCASE 2025 Task 3 结果页", "https://dcase.community/challenge2025/task-stereo-sound-event-localization-and-detection-in-regular-video-content-results"),
}

# ---------------- 资源参照（端侧部署，已公开内存 / 算力的方案优先） ----------------
RES_COLS = ["方案", "性质", "运行平台", "阵列", "方法 / 功能", "内存", "算力", "精度（原文口径）", "来源"]
RES = [
    ["乐鑫 ESP-SR DOA", "商用 SDK（端侧）", "ESP32-P4 @400 MHz", "4 麦圆阵 r = 5 cm（支持 2–8 麦）",
     "Capon / MVDR，10° 网格", "约 206 KB（RAM 57 + PSRAM 149）", "0.65 ms / 8 ms 帧，CPU 8.1%",
     "官方仿真 ±10° 内 100%", "ESP"],
    ["ODAS", "开源框架（机器人）", "树莓派 3（Cortex-A53 1.2 GHz）", "8 / 16 麦",
     "SRP-PHAT 层级搜索 + 卡尔曼跟踪", "未单列", "8 麦定位单核 14%；跟踪 1 个声源 0.8%",
     "以单位球距离计，不便换算角度", "ODAS21"],
    ["XMOS XVF3800", "商用语音芯片", "专用语音处理器", "4 麦（线阵 33 mm / 方阵 66 mm）",
     "未公开；主机可读说话人方位", "未单列", "未单列", "未公开", "XMOS"],
    ["思必驰 DUI 离线前端", "竞品 SDK", "未公开", "线阵 4 / 6 麦（fespl）；另有环阵、家居双麦版",
     "回声消除 + 定位 + 波束成形 + 唤醒一体；唤醒后回调方位", "未公开（需加载各模块资源文件）", "未公开", "未公开", "FESPL"],
    ["萤石 RK3 桌面机器人", "竞品整机", "4 核 A55 1.5 GHz + NPU 3T（整机）", "2 麦",
     "未公开；180° 声源定位", "定位模块未公开", "定位模块未公开", "未公开", "RK3"],
]

# ---------------- 效果参照（2025 年文献为主，给出参数量 / 计算量） ----------------
EFF_COLS = ["方案", "出处", "评测条件", "参数量", "计算量", "精度（原文口径）", "来源"]
EFF = [
    ["SRP-DNN", "IPDnet2 论文 2025-09", "RealMAN 实录；4 麦圆阵 r = 3 cm + 中心麦；两人说话混合", "0.8 M", "7.7 GFLOPs/s",
     "5° 容差：漏检 18.6%、虚警 10.8%、误差 1.6°", "IPDNET2"],
    ["TF-Mamba", "同上", "同上", "1.6 M", "36.6 GFLOPs/s", "漏检 11.8%、虚警 9.4%、误差 1.4°", "IPDNET2"],
    ["IPDnet2-Tiny", "同上", "同上", "0.5 M", "0.2 GFLOPs/s", "漏检 17.4%、虚警 11.8%、误差 1.6°", "IPDNET2"],
    ["IPDnet2-Small", "同上", "同上", "1.3 M", "0.9 GFLOPs/s", "漏检 13.5%、虚警 9.5%、误差 1.4°", "IPDNET2"],
    ["IPDnet2-Large", "同上", "同上", "7.8 M", "13.9 GFLOPs/s", "漏检 10.5%、虚警 6.6%、误差 1.2°", "IPDNET2"],
    ["LightDOA", "论文 2025-11", "仅仿真；2 麦间距 16–18 cm；单声源", "37 k", "未报告",
     "10° 分类准确率 71.7%（同条件 CRNN 309 k：71.1%）", "LIGHTDOA"],
    ["CRNN 基线", "RealMAN 论文 2024", "9 通道实录、静止说话人；真实数据训练 vs 仅仿真训练", "未报告", "未报告",
     "5° 内：真实训练 89.2%；仅仿真训练 60.4%", "REALMAN"],
    ["DCASE 2025 Task 3", "比赛结果 2025", "立体声实录视频，13 类声音事件、多声源（任务更难）", "第 1 名 58.5 M（集成）；官方基线 0.73 M", "未报告",
     "DOA 误差：第 1 名 12.2°；基线 23.0°", "DCASE25"],
]

# ---------------- 要点 ----------------
RES_TAKE = [
    "公开了定位模块内存与算力的只有乐鑫和 ODAS，两者都是传统方法：约 200 KB 内存、单核个位数到十几个百分点的 CPU",
    "竞品（思必驰 DUI 离线前端、萤石 RK3）与 XMOS 只公开功能或整机芯片，定位模块资源未公开",
]
EFF_TAKE = [
    "IPDnet2（2025）在实录小阵列上同时给出参数量和计算量：Tiny 版 0.5 M、0.2 GFLOPs/s，精度与 SRP-DNN 相当，计算量约为其 1/40",
    "参数量大不等于效果好；只用仿真训练在实录上明显下降（89% → 60%），需要实采数据",
]
PROPOSAL = "建议：资源以乐鑫（约 206 KB、400 MHz 下 CPU 约 8%）为量级参照，效果以 IPDnet2 的实录对比为参照；目标芯片确认后定具体预算"


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
    sheet(ws2, EFF_COLS, [r[:-1] + [src(r[-1])] for r in EFF], [18, 20, 46, 24, 16, 40, 50])
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
