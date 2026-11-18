# -*- coding: utf-8 -*-
"""从 Zenodo 按需下载 LOCATA（IEEE-AASP 声源定位与跟踪挑战赛数据，ODC-BY 许可，记录号 3630471）中 DICIT 阵列的任务 1–3 录音，
不下载整个压缩包（开发集 6.2 GB、评测集 13 GB），只取需要的文件（共约 4 GB）。
运行：pip install remotezip && python scripts/download_locata_dicit.py
输出：work/locata/{dev,eval}/task{1,2,3}/recording*/dicit/
"""
import os, time
from remotezip import RemoteZip

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "work", "locata")
for part in ["dev", "eval"]:
    url = f"https://zenodo.org/records/3630471/files/{part}.zip?download=1"
    t0 = time.time()
    with RemoteZip(url) as z:
        names = [n for n in z.namelist() if "/dicit/" in n and not n.endswith("/") and n.split("/")[1] in ("task1", "task2", "task3")]
        for i, n in enumerate(names):
            if not os.path.exists(os.path.join(OUT, n)):
                z.extract(n, OUT)
            if i % 40 == 0:
                print(f"{part}: {i}/{len(names)}  {time.time() - t0:.0f}s", flush=True)
    print(f"{part}: 完成 {len(names)} 个文件")
