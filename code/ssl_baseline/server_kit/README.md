# 服务器训练包（场景一：会议室换人测向小网络）

在有 GPU 的训练服务器上，从零复现"生成仿真数据 → 传统基线 → 训练小网络 → 测试集对比"，并训练放大版网络（按 mentor 的流程：先放大约 10 倍开发，效果好了再压缩、量化）。

> 代码只用公开数据集（LibriSpeech，CC BY 4.0）和自己写的仿真；拷到公司服务器前，按公司规定确认。

## 最简用法（三条命令）

在 `code/ssl_baseline` 目录下：

```bash
python3 server_kit/check_env.py          # 1. 检查环境：缺什么会打印对应的安装命令
bash server_kit/start.sh                  # 2. 一键启动（自动转到后台；断开连接、关电脑都不影响）
python3 server_kit/summary.py             # 3. 随时查看进度 / 结果，输出一段文字，复制发回即可
```

`start.sh` 默认做的事：解压人声 → 生成仿真数据（112 核用 32 个进程）→ 传统基线 → 计算特征（只算一次）→
在**空闲的 GPU**（显存占用 <1 GB 且利用率 <10%）上并行训练 s / m / l 三档 × 种子 0、1，共 6 个实验，每个实验一块卡 → 汇总。
一个实验只用一块卡：网络只有 0.28–2.1 M 参数，一块 V100 远用不满，拆到多卡反而有同步开销；多卡用来同时跑不同实验。
同一档两个种子，用来看结果本身的波动。可调：`SIZES="s l" SEEDS="0" EPOCHS=30 bash server_kit/start.sh`。

看实时进度：`tail -f work/logs/start.log`（Ctrl+C 只退出查看，不停止任务）；单个实验的日志在 `work/logs/train_*.log`。

## 0. 需要什么

| 项 | 要求 |
|---|---|
| GPU | 1 块即可（训练 l 档约 2.1 M 参数的网络） |
| CPU | 越多越快（生成仿真数据只用 CPU） |
| 内存 | ≥ 16 GB（训练时特征约 3 GB 放在内存里） |
| 硬盘 | ≥ 15 GB（人声 0.7 GB + 仿真数据约 4 GB + 特征约 3.5 GB） |
| Python | 3.8 及以上（3.8 已实测） |
| 外网 | 需要访问 openslr.org（下载人声）和 pip 源；不能直接上外网时见下面"本组服务器"一节和第 6 节 |

## 本组 V100 服务器的实测情况（11-23）

| 项 | 情况 | 怎么做 |
|---|---|---|
| GPU | 8 × Tesla V100 32 GB，驱动 465、CUDA 11.3 | 装 PyTorch 1.12.1 的 CUDA 11.3 版（`torch==1.12.1+cu113`）；用空闲的卡，运行前加 `CUDA_VISIBLE_DEVICES=卡号`，按组里规矩选卡 |
| CPU / 内存 | 112 核 / 1.4 TB | `WORKERS=32` 即可，不必占满 |
| Python | 3.8.10，无 conda | 可以直接用（依赖会自动选适配 3.8 的版本） |
| 磁盘 | /home 共用盘剩约 300 GB、已用 100% | 我们需要约 15 GB；数据放哪个目录先问同事 |
| 外网 | 走公司代理且需要认证（`407 Proxy Authentication Required`） | pip 用公司镜像源（问同事地址）；LibriSpeech 在自己电脑上下载后上传到 `work/librispeech/`，脚本会跳过下载 |

## 1. 拿到代码

任选一种：

```bash
git clone https://github.com/ZeroFoxxi/ssl-scene1.git     # 服务器能访问 GitHub 时（私有仓库需要登录）
```

或者在自己电脑上把 `code/ssl_baseline/` 文件夹打包，拷到服务器（`scp`、VS Code 拖拽上传等），解压。

## 2. 安装依赖

```bash
cd ssl-scene1/code/ssl_baseline
python -m venv .venv && source .venv/bin/activate
pip install -r server_kit/requirements_train.txt
```

**PyTorch（GPU 版）要和服务器的 CUDA 版本匹配**：先运行 `nvidia-smi` 看右上角的 CUDA 版本，再到 https://pytorch.org/get-started/locally/ 选择对应版本，复制它给出的 `pip install torch ...` 命令。装好后检查：

```bash
python -c "import torch; print(torch.__version__, torch.cuda.is_available())"     # 应输出 True
```

## 3. 一键运行

```bash
bash server_kit/run_all.sh
```

可以改的参数（写在命令前面）：

```bash
WORKERS=32 SIZES="s m l" EPOCHS=30 bash server_kit/run_all.sh
```

| 参数 | 含义 | 默认 |
|---|---|---|
| `WORKERS` | 生成数据用几个进程 | CPU 核数 |
| `SIZES` | 训练哪几档网络：s 约 0.28 M、m 约 1.07 M、l 约 2.13 M 参数 | `s l` |
| `EPOCHS` | 训练轮数 | 30 |
| `DEVICE` | `auto`（有 GPU 就用）/ `cuda` / `cpu` | `auto` |

长时间运行建议放到 `tmux` 或 `nohup` 里，断开连接也不会中断：

```bash
nohup bash server_kit/run_all.sh > run_all.log 2>&1 &
tail -f run_all.log          # 查看进度
```

## 4. 每一步在做什么、大概多久

| 步骤 | 内容 | 时间（参考：本仓库云端 4 核 CPU、无 GPU） |
|---|---|---|
| 1 | 下载 LibriSpeech 两个子集（约 0.7 GB），核对 MD5 | 视网速 |
| 2 | 生成会议室仿真数据：训练 12,000、验证 1,000、固定测试 800 | 4 核约 8 分钟；核数越多越快 |
| 3 | 传统基线（SRP-PHAT、GEVD-MUSIC）在固定测试集上的结果 | 约 1 分钟 |
| 4 | 训练小网络（s、l 两档），每档训练完在固定测试集上评测一次 | s 档 CPU 每轮约 3.3 分钟；GPU 预计快一个数量级以上 |

## 5. 跑完后发回这些文件

```
out/test_baselines.json                    传统基线
out/nn_test_results_crnn_meeting_*.json    各档网络的测试结果（参数量、计算量、各条件准确率）
out/nn_train_log_crnn_meeting_*.json       每轮训练记录
work/train_crnn_meeting_*.log              训练过程输出
```

训练好的模型在 `work/models/crnn_meeting_*.pt`（同名 `.json` 记录了网络大小与验证集结果）。

## 6. 常见问题

| 问题 | 处理 |
|---|---|
| `torch.cuda.is_available()` 为 False | PyTorch 装成了 CPU 版或与 CUDA 版本不匹配，按第 2 步重装 |
| 服务器不能上外网 | 在能上网的电脑下载 `dev-clean.tar.gz`、`test-clean.tar.gz`（https://www.openslr.org/12），拷到 `work/librispeech/`，脚本会跳过下载；Python 包用公司的 pip 源 |
| 显存不够 | 训练命令加 `--bs 32`（默认 64） |
| 内存不够 | 生成数据时减小 `WORKERS` |
| 中途断了 | 直接重跑：已生成的数据分片、已算好的特征都会自动跳过 |
| 生成数据报 `pyroomacoustics` 段错误 | numpy 1.x 环境改装 `pyroomacoustics==0.7.4` |

## 7. 可选：真实录音验证（LOCATA）

```bash
python scripts/gen_meeting_train_data.py --split val   --rooms 100  --scene general --array lin5_4cm --workers "$(nproc)"
python scripts/gen_meeting_train_data.py --split train --rooms 1200 --scene general --array lin5_4cm --workers "$(nproc)"
python scripts/train_doa_net.py --data train_data_general_lin5_4cm --size l --epochs 30 --name crnn_general_lin5_l
python scripts/download_locata_dicit.py     # 从 Zenodo 按需下载 DICIT 录音（约 4 GB，ODC-BY）
python scripts/build_locata_test.py
python scripts/eval_locata.py --ckpt work/models/crnn_general_lin5_l.pt --tag _l
```
