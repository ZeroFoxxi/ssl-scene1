# -*- coding: utf-8 -*-
"""占位的 _bz2 模块（只在 Python 缺少 bz2 库时才会被用到）。

本组服务器上的 Python 3.8 编译时没有 bz2 库（报 No module named '_bz2'），而 pyroomacoustics 导入时会 import bz2
（只在下载 .tar.bz2 格式的数据集时才真正用到，本项目不用）。把本文件放到用户自己的 site-packages
（python3 -m site --user-site），import 就能通过；Python 先找标准库，所以有真正的 _bz2 时不会用到本文件。
真的用到 bz2 压缩 / 解压时会报出清楚的错误。
"""


class _Unavailable:
    def __init__(self, *args, **kwargs):
        raise RuntimeError("这个 Python 编译时没有 bz2 库，不能处理 .bz2 文件（本项目不需要）")


BZ2Compressor = _Unavailable
BZ2Decompressor = _Unavailable
