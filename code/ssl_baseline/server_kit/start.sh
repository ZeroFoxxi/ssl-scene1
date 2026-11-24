#!/usr/bin/env bash
# 一键启动（自动转到后台，断开连接、关电脑都不影响）：
#   环境检查 → 解压人声 → 生成会议室仿真数据 → 传统基线 → 计算特征（只算一次）→ 在空闲 GPU 上并行训练 → 汇总
# 用法（在 code/ssl_baseline 下）：
#   bash server_kit/start.sh                 默认：s / m / l 三档 × 种子 0、1，共 6 个实验，每个占一块空闲卡
#   SIZES="s l" SEEDS="0" bash server_kit/start.sh
#   SCENE=general ARRAY=lin6_3cm bash server_kit/start.sh     RealMAN 阵列（6 麦 3 cm）的通用房间仿真数据：只训练与验证（没有会议室固定测试集）
#   SCENE=general ARRAY=lin6_3cm ROOMS_TRAIN=6000 DATA_TAG=_60k bash server_kit/start.sh    训练数据放大到 60,000（单独目录）
#   ROOMS_TRAIN=6000 DATA_TAG=_60k bash server_kit/start.sh                                 会议室阵列，训练数据 60,000（仍评测同一个固定测试集）
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
SCENE=${SCENE:-meeting}
ARRAY=${ARRAY:-lin6_17.5cm}
DATA_TAG=${DATA_TAG:-}             # 如 _60k：数据量放大时存到单独目录，特征缓存也分开
if [ "$SCENE" = "meeting" ] && [ "$ARRAY" = "lin6_17.5cm" ]; then
  DATA=train_data${DATA_TAG}; PREFIX=crnn_meeting${DATA_TAG}; MEETING=1   # 会议室配置（含放大数据量）：都在同一个固定测试集上评测，有传统基线
else
  DATA=train_data_${SCENE}_${ARRAY}${DATA_TAG}; PREFIX=crnn_${SCENE}_${ARRAY}${DATA_TAG}; MEETING=0
fi
log() { echo "[$(date '+%m-%d %H:%M:%S')] $*"; }

log "0/6 环境检查"
$PY server_kit/check_env.py $([ "$DEVICE" = "cpu" ] && echo --cpu) || { log "环境未就绪，已停止（见上面的提示）"; exit 1; }

log "1/6 人声数据（LibriSpeech dev-clean / test-clean）"
for s in dev-clean test-clean; do
  if [ ! -d "work/librispeech/LibriSpeech/$s" ]; then
    tar -xzf "work/librispeech/$s.tar.gz" -C work/librispeech
  fi
done

log "2/6 仿真数据：场景 $SCENE，阵列 $ARRAY → work/$DATA（训练 $((ROOMS_TRAIN * 10)) / 验证 $((ROOMS_VAL * 10))；已有分片自动跳过）"
$PY scripts/gen_meeting_train_data.py --split val --rooms "$ROOMS_VAL" --workers "$WORKERS" --scene "$SCENE" --array "$ARRAY" --tag "$DATA_TAG"
$PY scripts/gen_meeting_train_data.py --split train --rooms "$ROOMS_TRAIN" --workers "$WORKERS" --scene "$SCENE" --array "$ARRAY" --tag "$DATA_TAG"
if [ "$MEETING" = 1 ]; then
  [ -f work/train_data/test/test.npz ] || $PY scripts/gen_meeting_test_data.py
  log "3/6 固定测试集上的传统基线"
  [ -f out/test_baselines.json ] || $PY scripts/eval_test_baselines.py
else
  log "3/6 （非会议室默认配置：没有固定测试集，跳过传统基线；实录评测见 server_kit/README.md）"
fi

log "4/6 计算特征（只算一次，之后各实验共用；避免并行训练时同时写同一个文件）"
DATA=$DATA MEETING=$MEETING $PY - <<'PY'
import os, sys; sys.path.insert(0, "."); sys.path.insert(0, "scripts")
from train_doa_net import build_features
data = os.environ["DATA"]
for s in ("train", "val") + (("test",) if os.environ["MEETING"] == "1" else ()):
    d = build_features(s, data) if s != "test" else build_features("test"); print(s, d["feat"].shape, flush=True)
PY

log "5/6 选空闲 GPU 并行训练：SIZES=[$SIZES] SEEDS=[$SEEDS] EPOCHS=$EPOCHS"
# 空闲：显存占用 < 1000 MiB 且利用率 < 10%
mapfile -t FREE < <(nvidia-smi --query-gpu=index,memory.used,utilization.gpu --format=csv,noheader,nounits | awk -F', *' '$2<1000 && $3<10 {print $1}')
if [ "${#FREE[@]}" -eq 0 ]; then log "没有空闲 GPU，已停止"; exit 1; fi
log "空闲 GPU：${FREE[*]}"
i=0; PIDS=()
for z in $SIZES; do
  for s in $SEEDS; do
    g=${FREE[$(( i % ${#FREE[@]} ))]}; name="${PREFIX}_${z}_seed${s}"
    log "  启动 $name → GPU $g（日志 work/logs/train_${name}.log）"
    CUDA_VISIBLE_DEVICES=$g nohup $PY scripts/train_doa_net.py --size "$z" --seed "$s" --epochs "$EPOCHS" --device "$DEVICE" --threads 8 \
      --data "$DATA" --name "$name" > "work/logs/train_${name}.log" 2>&1 &
    PIDS+=($!); i=$((i + 1))
  done
done
FAIL=0
for p in "${PIDS[@]}"; do wait "$p" || FAIL=$((FAIL + 1)); done
log "训练结束，失败 $FAIL 个"

log "6/6 汇总"
$PY server_kit/summary.py || true
log "全部完成"
