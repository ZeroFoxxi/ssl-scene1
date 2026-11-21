# -*- coding: utf-8 -*-
"""实录回放 demo 的误转诊断：每一次误转是什么触发的、当时是什么情况。

会议与 run_realman_replay_demo.py 相同（同一场景列表、同一随机种子，逐段重建）。默认用验证集 val3
（LivingRoom6、LivingRoom8、OfficeRoom1：仿真训练的小网络与传统方法都没见过；实录微调版用过它们，所以不在这里诊断微调版），
诊断结论在验证集上得出，改进后再到测试集评测一次。

每次误转（转向目标偏离当时说话人 >15°）按触发时刻 t0 分类：
  - 触发类型：静音后起始 / 方向变化；
  - 情况：
      换人后测错：t0 前后 0.6 s 内有新的一轮开始（真正换人），但测向结果偏离新说话人；
      同一人句间停顿后：t0 落在同一轮内某句话开头 0.3 s 内（不是这轮第一句），即句间停顿后重新开口；
      同一人说话中：其余发生在同一轮内的触发（静止说话人）；
      走动中：同一轮、说话人在走动；
      无人说话：判决时没有人说话。
另记：误转的目标是否接近上一位说话人（±15°，"停在上一位"）。
运行：python scripts/diagnose_replay_misturns.py --split val3 --meetings 10
输出：out/realman_replay_misturns_<split>.json
"""
import argparse, json, os, sys, collections
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "scripts"))
import run_realman_replay_demo as D
from run_meeting_closed_loop import closed_loop, band_energy_blocks, DT
from ssl_baseline import metrics
from ssl_baseline.wake import WakeDOA, WakeDOAConfig
from ssl_baseline.doa import SRPConfig
from ssl_baseline.geometry import aliasing_frequency

FS = D.FS


def holder_at(turns, t):
    h = -1
    for k, tr in enumerate(turns):
        if tr["start"] <= t < tr["end"]:
            h = k
    return h


def classify(turns, trig, dec_t, az):
    t0 = trig["t0"]
    h = holder_at(turns, dec_t)
    if h < 0:
        recent = [k for k, tr in enumerate(turns) if tr["end"] <= dec_t <= tr["end"] + 1.0]
        if not recent:
            return "无人说话", False
        h = recent[-1]
    prev = turns[h - 1] if h > 0 else None
    near_prev = prev is not None and metrics.angdiff(az, D.traj_at(prev, min(dec_t, prev["end"]))) <= 15
    tr = turns[h]
    if abs(t0 - tr["start"]) <= 0.6:
        return "换人后测错", near_prev
    if tr["kind"] == "moving":
        return "走动中", near_prev
    if any(abs(t0 - a) <= 0.3 for a, _ in tr.get("segs", [])[1:]):
        return "同一人句间停顿后", near_prev
    return "同一人说话中", near_prev


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--split", default="val3")
    ap.add_argument("--meetings", type=int, default=10)
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()
    from ssl_baseline.nn_doa import NNDOA
    sub, prefix, only = D.SPLITS[a.split]
    W = os.path.join(ROOT, "work", sub); lab = D.load_labels(W, prefix)
    scenes = only or sorted(d for d in os.listdir(W) if os.path.isdir(os.path.join(W, d)))
    srp_cfg = SRPConfig(fmax=min(4000.0, 0.95 * aliasing_frequency(D.XY)))
    base = dict(pad_pre=0.0, pad_post=0.0, exclude=D.FRONT, srp=srp_cfg)
    raw = WakeDOA(D.XY, FS, WakeDOAConfig(method="srp_sub", bg_subtract=False, onset=False, **base))
    nn = NNDOA(os.path.join(ROOT, "work", "models", D.MODELS["小网络（仿真训练）"]), in_ch=11)
    ests = {"GEVD-MUSIC": (WakeDOA(D.XY, FS, WakeDOAConfig(**base)), 0.0), "小网络（仿真训练）|置信≥0.7": (nn, 0.7)}
    if a.split == "test":
        ests["小网络（+实录微调）|置信≥0.7"] = (NNDOA(os.path.join(ROOT, "work", "models", D.MODELS["小网络（+实录微调）"]), in_ch=11), 0.7)
    stats = {m: collections.Counter() for m in ests}; prevc = {m: 0 for m in ests}; trig = {m: collections.Counter() for m in ests}
    minutes = 0.0; records = []; turned = []
    for si, sc in enumerate(scenes):
        utts = D.scene_utts(W, sc, lab); load = D.Cache()
        bank = D.B.noise_bank([(u["f"], 0) for u in utts if u["kind"] == "static"], int(D.DUR * FS) + FS)
        rng = np.random.default_rng(a.seed * 100 + si)
        for k in range(a.meetings):
            x, turns = D.build_meeting(rng, utts, bank, load)
            e_db = band_energy_blocks(x); nb = len(e_db); minutes += D.DUR / 60
            floor = np.array([e_db[max(0, b - 50): b + 1].min() for b in range(nb)])          # 与 closed_loop 相同的噪声底
            srp_raw = np.array([raw.localize(x, max(0, int(((b + 1) * DT - 0.3) * FS)), int((b + 1) * DT * FS)).az
                                if (b + 1) * DT >= 0.35 else 0.0 for b in range(nb)])
            for m, (est, th) in ests.items():
                tr = []
                closed_loop(x, e_db, np.full(nb, -100.0), srp_raw, est, freeze=False, conf_th=th, trace=tr)
                for g in tr:
                    trig[m][g["kind"]] += 1
                    for d in g["dec"]:
                        if d.get("out") != "转动":
                            continue
                        h = holder_at(turns, d["t"])
                        if h < 0:
                            recent = [kk for kk, t_ in enumerate(turns) if t_["end"] <= d["t"] <= t_["end"] + 1.0]
                            h = recent[-1] if recent else -1
                        wrong = h < 0 or metrics.angdiff(d["az"], D.traj_at(turns[h], d["t"])) > 15
                        b0, b1 = int(round(g["t0"] / DT)), int(round(d["t"] / DT))                  # 判决所用时段 [t0, 判决时刻]
                        snr = float(np.mean(e_db[b0:b1]) - floor[min(b1, nb - 1)]) if b1 > b0 else np.nan
                        turned.append({"method": m, "scene": sc, "kind": g["kind"], "wrong": bool(wrong), "snr_db": round(snr, 2),
                                       "conf": d["conf"] if d["conf"] == d["conf"] else None, "az": round(d["az"], 1)})
                        if wrong:
                            c, near_prev = classify(turns, g, d["t"], d["az"])
                            stats[m][(g["kind"], c)] += 1; prevc[m] += int(near_prev)
                            spk = D.traj_at(turns[h], d["t"]) if h >= 0 else None
                            records.append({"method": m, "scene": sc, "meeting": k, "t": round(d["t"], 1), "kind": g["kind"], "cause": c,
                                            "az": round(d["az"], 1), "conf": round(d["conf"], 3) if d["conf"] == d["conf"] else None,
                                            "speaker_az": None if spk is None else round(spk, 1), "hint": g["hint"]})
            print(f"{sc} {k + 1}/{a.meetings}", flush=True)
    out = {"split": a.split, "minutes": minutes, "methods": {}, "records": records, "turned": turned}
    for m in ests:
        tot = sum(stats[m].values())
        print(f"\n{m}：误转 {tot} 次（{tot / minutes:.2f} 次 / 分钟），其中目标接近上一位说话人 {prevc[m]} 次；触发 {dict(trig[m])}")
        for (kind, c), n in stats[m].most_common():
            print(f"   {kind:<6} {c:<10} {n:4d}  {n / max(tot, 1) * 100:4.0f}%")
        out["methods"][m] = {"misturns": tot, "per_min": round(tot / minutes, 2), "near_prev": prevc[m], "triggers": dict(trig[m]),
                             "by_cause": {f"{kind}|{c}": n for (kind, c), n in stats[m].most_common()}}
    json.dump(out, open(os.path.join(ROOT, "out", f"realman_replay_misturns_{a.split}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
