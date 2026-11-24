# -*- coding: utf-8 -*-
"""删除已经算好特征的训练集原始分片（work/<数据>/train/shard_*.npz），给共用磁盘腾空间。

训练只用特征缓存（work/feat/<数据>_train.npz）；原始分片只在重新计算特征时才需要（删除后若要重算，重跑 start.sh 会重新生成）。
删除前逐个核对：特征文件存在，且样本数与全部分片的样本数之和相同；验证集与 info.json 保留（很小）。
默认只列出能腾出的空间，加 --yes 才删除。
运行（在 code/ssl_baseline 下）：python3 server_kit/cleanup_raw.py            列出
                                python3 server_kit/cleanup_raw.py --yes      删除
"""
import argparse, glob, os
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, "work")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--yes", action="store_true", help="真的删除")
    a = ap.parse_args()
    total = 0
    for d in sorted(glob.glob(os.path.join(WORK, "train_data*"))):
        data = os.path.basename(d)
        shards = sorted(glob.glob(os.path.join(d, "train", "shard_*.npz")))
        if not shards:
            continue
        feat = os.path.join(WORK, "feat", "train.npz" if data == "train_data" else f"{data}_train.npz")
        size = sum(os.path.getsize(s) for s in shards)
        if not os.path.exists(feat):
            print(f"保留 {data}：还没有特征缓存 {os.path.relpath(feat, ROOT)}"); continue
        n_shard = sum(int(np.load(s, mmap_mode="r")["az"].shape[0]) for s in shards)
        n_feat = int(np.load(feat, mmap_mode="r")["az"].shape[0])
        if n_shard != n_feat:
            print(f"保留 {data}：分片 {n_shard} 个样本，特征 {n_feat} 个，不一致"); continue
        total += size
        print(f"{'删除' if a.yes else '可删除'} {data}/train：{len(shards)} 个分片，{n_shard} 个样本，{size / 1e9:.1f} GB（特征已核对）")
        if a.yes:
            for s in shards:
                os.remove(s)
    print(f"{'已腾出' if a.yes else '可腾出'} {total / 1e9:.1f} GB" + ("" if a.yes else "；确认后加 --yes 删除"))


if __name__ == "__main__":
    main()
