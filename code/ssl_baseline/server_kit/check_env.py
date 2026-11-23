# -*- coding: utf-8 -*-
"""检查训练环境：Python 包是否齐全、GPU 是否可用、人声数据是否就位。缺什么就打印对应的安装 / 准备命令。
运行（在 code/ssl_baseline 下）：python3 server_kit/check_env.py      全部就绪时退出码为 0（加 --cpu 时不要求 GPU，仅用于本地测试流程）。
"""
import importlib, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ok = True
print("Python", sys.version.split()[0], "|", sys.executable)
if sys.version_info < (3, 8):
    print("× Python 版本低于 3.8"); ok = False

missing = []
for mod, pip_name in [("numpy", "numpy"), ("scipy", "scipy"), ("matplotlib", "matplotlib"), ("soundfile", "soundfile"),
                      ("pyroomacoustics", "pyroomacoustics"), ("torch", "torch")]:
    try:
        m = importlib.import_module(mod)
        print(f"√ {mod:<16} {getattr(m, '__version__', '')}")
    except Exception as e:                                                   # 包缺失或导入出错
        print(f"× {mod:<16} {type(e).__name__}: {e}"); missing.append(pip_name)

if "torch" not in missing:
    import torch
    if torch.cuda.is_available():
        print(f"√ GPU 可用：{torch.cuda.device_count()} 块，第一块 {torch.cuda.get_device_name(0)}；torch 编译用的 CUDA {torch.version.cuda}")
    elif "--cpu" in sys.argv:
        print("· torch 看不到 GPU（--cpu：只用于本地测试流程）")
    else:
        print("× torch 看不到 GPU（可能装成了 CPU 版，或 CUDA 版本与驱动不匹配）"); ok = False

try:
    import bz2  # noqa: F401
except ImportError:
    print("× 这个 Python 编译时缺少 bz2 库（No module named '_bz2'），pyroomacoustics 导入会失败。放一个占位模块到自己的用户目录即可（不影响别人）：")
    print('  cp server_kit/compat/_bz2.py "$(python3 -m site --user-site)/"')
    ok = False
    missing = [m for m in missing if m != "pyroomacoustics"]

if missing:
    ok = False
    print("\n缺少的包，安装命令（--user 装到自己目录，不影响别人）：")
    rest = [p for p in missing if p != "torch"]
    if rest:
        print(f"  pip3 install --user -r server_kit/requirements_train.txt")
    if "torch" in missing:
        print("  pip3 install --user torch==1.12.1          # PyPI 默认版本自带 CUDA 10.2，较旧的驱动也能用；能访问 pytorch.org 时也可装 torch==1.12.1+cu113")
    print("  （服务器上网要经过需要认证的代理：先配置公司 pip 镜像源，例如")
    print("     pip3 config --user set global.index-url <镜像地址>; pip3 config --user set global.trusted-host <镜像主机名>")
    print("   再运行上面的安装命令）")

lib = os.path.join(ROOT, "work", "librispeech", "LibriSpeech")
for s in ["dev-clean", "test-clean"]:
    if os.path.isdir(os.path.join(lib, s)):
        print(f"√ 人声 {s}")
    elif os.path.exists(os.path.join(ROOT, "work", "librispeech", f"{s}.tar.gz")):
        print(f"· 人声 {s}：压缩包已上传，启动脚本会自动解压")
    else:
        print(f"× 人声 {s}：请把 {s}.tar.gz（https://www.openslr.org/12）上传到 code/ssl_baseline/work/librispeech/"); ok = False

print("\n环境就绪" if ok else "\n环境未就绪：按上面的提示处理后再运行")
sys.exit(0 if ok else 1)
