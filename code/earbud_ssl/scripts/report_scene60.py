"""把 60 s 全流程与增强的评测结果整理成 Markdown 表格（直接贴进文档，避免手抄出错）。

  python scripts/report_scene60.py --pipeline out/scene60_pipeline_eval_turns.json out/scene60_pipeline_eval_case2.json \
                                   --enhance out/scene60_enhance_eval_0.json out/scene60_enhance_eval_-6.json
"""
import argparse, json


def pipeline_tables(files):
    out = []
    for f in files:
        d = json.load(open(f, encoding="utf-8"))
        n = d["setup"]["n_per_kind"]
        for kname, v in d.items():
            if kname in ("setup", "elapsed_s"):
                continue
            out.append(f"**{kname}**（{n} 段，每段 59 s 评测，每 0.25 s 一个输出；声学开口事件每分钟 {v['声学开口事件每分钟']} 次）\n")
            out.append("| 摄像头 | 锁定规则 | 锁定正确 ≤10° | 对方在说话时 | 佩戴者说话时 | 第一次回话之后 | 另有人同时说时 | 换人后锁定（中位 / 90%） | 每分钟切换 |")
            out.append("|---|---|---|---|---|---|---|---|---|")
            for m, r in v["结果"].items():
                for L in ("跟随", "防抖", "对话组"):
                    x = r[L]
                    lat = "—" if x["换人后锁定时间中位数（s）"] is None else f"{x['换人后锁定时间中位数（s）']} / {x['换人后锁定时间 90% 分位（s）']} s"
                    out.append(f"| {m} | {L} | {x['锁定正确 ≤10°（%）：全部']}% | {x['对方在说话时']}% | {x['佩戴者说话时']}% | "
                               f"{x.get('佩戴者第一次回话之后')}% | {x.get('对话对象说话时另有对面的人也在说')}% | {lat} | {x['每分钟切换次数']} |")
            out.append("")
            out.append("测向（当前说话人 ≤10°，有人在和佩戴者说话、佩戴者没说话时）：" +
                       "；".join(f"{m} {r['测向：当前说话人 ≤10°（%）']}%" for m, r in v["结果"].items()) + "\n")
    return "\n".join(out)


def enhance_tables(files):
    out = []
    for f in files:
        d = json.load(open(f, encoding="utf-8"))
        n = d["setup"]["n_per_cond"]
        for cname, v in d.items():
            if cname in ("setup", "elapsed_s"):
                continue
            acc = v["全流程锁定正确率_%（各段）"]
            out.append(f"**情况 2，{cname}**（{n} 段；全流程锁定正确率各段中位数 {sorted(acc)[len(acc) // 2]}%，范围 {min(acc)}–{max(acc)}%）\n")
            srcs = list(next(iter(v["信干比提升_dB（中位数 / 最小 / 最大）"].values())).keys())
            out.append("| 增强 | " + " | ".join(srcs) + " |")
            out.append("|---|" + "---|" * len(srcs))
            for s, x in v["信干比提升_dB（中位数 / 最小 / 最大）"].items():
                out.append(f"| {s} | " + " | ".join(f"{x[k][0]}（{x[k][1]}–{x[k][2]}）" for k in srcs) + " |")
            out.append("")
    out.append("单位 dB，中位数（最小–最大），目标在说话、佩戴者没说话的帧，200–7000 Hz。")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline", nargs="*", default=[])
    ap.add_argument("--enhance", nargs="*", default=[])
    a = ap.parse_args()
    if a.pipeline:
        print(pipeline_tables(a.pipeline))
    if a.enhance:
        print(enhance_tables(a.enhance))


if __name__ == "__main__":
    main()
