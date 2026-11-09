# -*- coding: utf-8 -*-
"""评测指标：帧级测向、轨迹、系统级。"""
import numpy as np


def angdiff(a, b):
    """圆周角差的绝对值（°），范围 [0, 180]。"""
    return np.abs((np.asarray(a) - np.asarray(b) + 180.0) % 360.0 - 180.0)


def doa_metrics(est, truth, gross_deg=45.0):
    e = angdiff(est, truth)
    return {
        "mae": float(e.mean()),
        "median": float(np.median(e)),
        "acc10": float((e <= 10).mean()),
        "acc20": float((e <= 20).mean()),
        "gross": float((e > gross_deg).mean()),
        "n": int(e.size),
    }


def track_metrics(track, truth):
    """track 中 None/NaN 表示无航迹。返回航迹覆盖率与有航迹时的平均误差、最大误差。"""
    tr = np.array([np.nan if v is None else v for v in track], dtype=float)
    ok = ~np.isnan(tr)
    e = angdiff(tr[ok], np.asarray(truth)[ok]) if ok.any() else np.array([np.nan])
    return {"coverage": float(ok.mean()), "mae": float(np.nanmean(e)), "max": float(np.nanmax(e))}


def in_view_ratio(pan, truth, hfov, start_idx=0):
    """系统级：从 start_idx 起，目标处于画面内的时间比例。"""
    pan = np.asarray(pan)[start_idx:]; truth = np.asarray(truth)[start_idx:]
    return float((angdiff(pan, truth) <= hfov / 2).mean())


def first_in_view_time(t, pan, truth, hfov, t0=0.0):
    t = np.asarray(t); m = (angdiff(pan, truth) <= hfov / 2) & (t >= t0)
    return float(t[np.argmax(m)] - t0) if m.any() else float("nan")
