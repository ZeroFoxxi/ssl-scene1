"""把摄像头策略仿真的结果（out/camera_policy_th*_delay*.json）折算成摄像头功耗与续航（每只耳机）。

功耗参数（与方案功耗页一致）：
  基准：FreeClip 2 S 每只 60 mAh、通话 6 h，按 3.7 V → 电池约 222 mWh，通话约 37 mW。
  定位侧其他新增：耳间定位音频 0.7（ADPCM）–2.6 mW（PCM）+ 定位计算 ≤ 3 mW → 3.7–5.6 mW。
  摄像头监测档（低分辨率 1–2 fps）：0.4–0.8 mW。
  摄像头唇动档：按传感器全幅工作功耗 VGA 60 fps 约 14.5 mW、2 MP 约 82 mW 作上限；只读嘴部区域、10–15 fps 时会低得多，降多少待传感器同事确认。
  NPU 未计入。
对话时间占比 f：对话中按各策略的唇动档开机占比；不在对话时，B / D / E 开监测档，A / C 关摄像头。

用法：python scripts/camera_power.py [--conv 0.5]
"""
import argparse, glob, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E_BAT, P_BASE = 222.0, 37.0
OTHER = (3.7, 5.6)
P_MON = (0.4, 0.8)
P_LIP = (14.5, 82.0)
USES_MON = {"A0": False, "A": False, "E": True, "C": False, "D": True, "B": True}


def cam_power(tag, duty, f, p_lip, p_mon):
    """每只耳机摄像头平均功耗（mW）。duty：对话中唇动档开机占比（0–1）。"""
    in_conv = duty * p_lip + ((1 - duty) * p_mon if USES_MON[tag] and tag != "B" else 0.0)
    if tag == "E":
        in_conv = p_mon
    out_conv = p_mon if USES_MON[tag] else 0.0
    return f * in_conv + (1 - f) * out_conv


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--conv", type=float, default=0.5); a = ap.parse_args()
    rows = {}
    for fn in sorted(glob.glob(os.path.join(ROOT, "out", "camera_policy_th*_delay*.json"))):
        d = json.load(open(fn, encoding="utf-8"))
        th, dl = d["setup"]["acoustic_onset_threshold_db"], d["setup"]["cam_delay_s"]
        for cname, r in d["results"].items():
            for pname, v in r["policies"].items():
                tag = pname.split()[0]
                duty = r["camera_lip_duty_pct"][tag] / 100
                lo = cam_power(tag, duty, a.conv, P_LIP[0], P_MON[0]); hi = cam_power(tag, duty, a.conv, P_LIP[1], P_MON[1])
                rt_hi = E_BAT / (P_BASE + OTHER[0] + lo); rt_lo = E_BAT / (P_BASE + OTHER[1] + hi)
                rows.setdefault(cname, {}).setdefault(f"th{th:g}_delay{dl:g}", {})[pname] = {
                    "acc10_all": round(v["acc10_all"], 1), "acc10_first_0p5s": round(v["acc10_first_0p5s"], 1), "acc10_steady": round(v["acc10_steady"], 1),
                    "first_correct_median_s": v["first_correct_median_s"], "lip_duty_in_conversation_pct": round(duty * 100, 1),
                    "camera_mw": [round(lo, 2), round(hi, 2)], "runtime_h": [round(rt_lo, 2), round(rt_hi, 2)]}
    out = {"assumptions": {"conversation_fraction": a.conv, "battery_mwh": E_BAT, "base_mw": P_BASE, "other_new_mw": OTHER,
                           "monitor_mw": P_MON, "lip_full_frame_upper_mw": P_LIP, "npu": "未计入"}, "results": rows}
    with open(os.path.join(ROOT, "out", f"camera_power_conv{a.conv:g}.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    for c, byth in rows.items():
        print(c)
        for th, pol in byth.items():
            print(" ", th)
            for p, v in pol.items():
                print(f"    {p:<24s} 全部 {v['acc10_all']:5.1f}%  换人后0.5s {v['acc10_first_0p5s']:5.1f}%  稳定段 {v['acc10_steady']:5.1f}%  "
                      f"唇动档 {v['lip_duty_in_conversation_pct']:5.1f}%  摄像头 {v['camera_mw'][0]}–{v['camera_mw'][1]} mW  续航 {v['runtime_h'][0]}–{v['runtime_h'][1]} h")


if __name__ == "__main__":
    main()
