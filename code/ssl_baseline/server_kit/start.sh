#!/usr/bin/env bash
# 一键启动（自动转到后台，断开连接、关电脑都不影响）：
#   环境检查 → 解压人声 → 生成会议室仿真数据 → 传统基线 → 计算特征（只算一次）→ 在空闲 GPU 上并行训练 → 汇总
# 用法（在 code/ssl_baseline 下）：
#   bash server_kit/start.sh                 默认：s / m / l 三档 × 种子 0、1，共 6 个实验，每个占一块空闲卡
#   SIZES="s l" SEEDS="0" bash server_kit/start.sh
# 看进度：tail -f work/logs/start.log        跑完后看结果：python3 server_kit/summary.py
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p work/logs out
if [ "${_SSL_INNER:-0}" != "1" ]; then
  if [ -f work/logs/start.pid ] && kill -0 "$(cat work/logs/start.pid)" 2>/dev/null; then
    echo "已有一个任务在运行（进程 $(cat work/logs/start.pid)），看进度：tail -f work/logs/start.log"; exit 1
  fi
  _SSL_INNER=1 nohup bash "$0" "$@" > work/logs/start.log 2>&1 &
  echo $! > work/logs/start.pid
  echo "已在后台启动（进程 $!）。"
  echo "看进度：tail -f work/logs/start.log    （按 Ctrl+C 只是退出查看，不会停止任务）"
  echo "跑完后：python3 server_kit/summary.py"
  exit 0
fi

PY=${PY:-python3}
SIZES=${SIZES:-"s m l"}
SEEDS=${SEEDS:-"0 1"}
EPOCHS=${EPOCHS:-30}
WORKERS=${WORKERS:-32}
DEVICE=${DEVICE:-cuda}
ROOMS_TRAIN=${ROOMS_TRAIN:-1200}   # 训练 12,000 个样本（每个房间 10 个）
ROOMS_VAL=${ROOMS_VAL:-100}
log() { echo "[$(date '+%m-%d %H:%M:%S')] $*"; }

log "0/6 环境检查"
$PY server_kit/check_env.py $([ "$DEVICE" = "cpu" ] && echo --cpu) || { log "环境未就绪，已停止（见上面的提示）"; exit 1; }

log "1/6 人声数据（LibriSpeech dev-clean / test-clean）"
for s in dev-clean test-clean; do
  if [ ! -d "work/librispeech/LibriSpeech/$s" ]; then
    tar -xzf "work/librispeech/$s.tar.gz" -C work/librispeech
  fi
done

log "2/6 会议室仿真数据（训练 12,000 / 验证 1,000 / 固定测试 800；已有分片自动跳过）"
$PY scripts/gen_meeting_train_data.py --split val --rooms "$ROOMS_VAL" --workers "$WORKERS"
$PY scripts/gen_meeting_train_data.py --split train --rooms "$ROOMS_TRAIN" --workers "$WORKERS"
[ -f work/train_data/test/test.npz ] || $PY scripts/gen_meeting_test_data.py

log "3/6 固定测试集上的传统基线"
[ -f out/test_baselines.json ] || $PY scripts/eval_test_baselines.py

log "4/6 计算特征（只算一次，之后各实验共用；避免并行训练时同时写同一个文件）"
$PY - <<'PY'
import sys; sys.path.insert(0, "."); sys.path.insert(0, "scripts")
from train_doa_net import build_features
for s in ("train", "val", "test"):
    d = build_features(s); print(s, d["feat"].shape, flush=True)
PY

log "5/6 选空闲 GPU 并行训练：SIZES=[$SIZES] SEEDS=[$SEEDS] EPOCHS=$EPOCHS"
# 空闲：显存占用 < 1000 MiB 且利用率 < 10%
mapfile -t FREE < <(nvidia-smi --query-gpu=index,memory.used,utilization.gpu --format=csv,noheader,nounits | awk -F', *' '$2<1000 && $3<10 {print $1}')
if [ "${#FREE[@]}" -eq 0 ]; then log "没有空闲 GPU，已停止"; exit 1; fi
log "空闲 GPU：${FREE[*]}"
i=0; PIDS=()
for z in $SIZES; do
  for s in $SEEDS; do
    g=${FREE[$(( i % ${#FREE[@]} ))]}; name="crnn_meeting_${z}_seed${s}"
    log "  启动 $name → GPU $g（日志 work/logs/train_${name}.log）"
    CUDA_VISIBLE_DEVICES=$g nohup $PY scripts/train_doa_net.py --size "$z" --seed "$s" --epochs "$EPOCHS" --device "$DEVICE" --threads 8 \
      --name "$name" > "work/logs/train_${name}.log" 2>&1 &
    PIDS+=($!); i=$((i + 1))
  done
done
FAIL=0
for p in "${PIDS[@]}"; do wait "$p" || FAIL=$((FAIL + 1)); done
log "训练结束，失败 $FAIL 个"

log "6/6 汇总"
$PY server_kit/summary.py || true
log "全部完成"
