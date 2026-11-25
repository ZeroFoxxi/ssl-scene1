#!/usr/bin/env bash
# RealMAN 实录微调（服务器，自动转到后台）：
#   准备微调数据（work/realman_val 的 3 个场景，Auditorium 挑模型；与测试集 5 个场景不重叠）→ 预先算好特征
#   → 每个起点模型在一块空闲 GPU 上微调（混入的仿真数据与它原来训练时相同）→ 实录测试集单次测向评测（种子平均）
# 用法（在 code/ssl_baseline 下）：
#   bash server_kit/finetune_realman.sh "crnn_general_lin6_3cm_s_seed*" "crnn_general_lin6_3cm_dif_s_seed*"
# 起点模型在 work/models/，按文件名模式（不含 .pt）挑选；微调后的模型名为 <起点>_ft。
# 看进度：tail -f work/logs/finetune_realman.log      结果：cat out/server_models_realman.txt
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p work/logs out
LOG=work/logs/finetune_realman.log; PIDF=work/logs/finetune_realman.pid
if [ "${_SSL_INNER:-0}" != "1" ]; then
  if [ "$#" -eq 0 ]; then echo "请给出起点模型的文件名模式，例如 \"crnn_general_lin6_3cm_s_seed*\""; exit 1; fi
  if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then
    echo "微调任务已在运行（进程 $(cat "$PIDF")），看进度：tail -f $LOG"; exit 1
  fi
  _SSL_INNER=1 nohup bash "$0" "$@" > "$LOG" 2>&1 &
  echo $! > "$PIDF"
  echo "已在后台启动（进程 $!）。看进度：tail -f $LOG    跑完后：cat out/server_models_realman.txt"
  exit 0
fi

PY=${PY:-python3}
EPOCHS=${EPOCHS:-8}
DEVICE=${DEVICE:-cuda}
log() { echo "[$(date '+%m-%d %H:%M:%S')] $*"; }

[ -d work/realman_val ] || { log "缺少 work/realman_val（RealMAN 验证集 4 个场景），已停止"; exit 1; }

log "1/3 微调数据（RealMAN 验证集：OfficeRoom1、LivingRoom6、LivingRoom8 微调，Auditorium 挑模型）"
[ -f work/train_data_realman_ft/train/shard_000.npz ] || $PY scripts/build_realman_finetune.py
$PY - <<'PY'
import sys; sys.path.insert(0, "."); sys.path.insert(0, "scripts")
from train_doa_net import build_features
for s in ("train", "val"):
    d = build_features(s, "train_data_realman_ft"); print("微调数据", s, d["feat"].shape, flush=True)
PY

log "2/3 微调：$*"
INITS=()
for pat in "$@"; do
  for c in work/models/${pat}.pt; do
    [ -f "$c" ] || continue
    case "$c" in *_ft.pt) continue ;; esac                                 # 不对已微调的模型再微调
    INITS+=("$c")
  done
done
[ "${#INITS[@]}" -gt 0 ] || { log "没有匹配的起点模型，已停止"; exit 1; }
mapfile -t FREE < <(nvidia-smi --query-gpu=index,memory.used,utilization.gpu --format=csv,noheader,nounits | awk -F', *' '$2<1000 && $3<10 {print $1}')
[ "${#FREE[@]}" -gt 0 ] || { log "没有空闲 GPU，已停止"; exit 1; }
log "空闲 GPU：${FREE[*]}；起点模型 ${#INITS[@]} 个"
i=0; PIDS=(); NAMES=()
for c in "${INITS[@]}"; do
  base=$(basename "$c" .pt); name="${base}_ft"
  sim=$($PY -c "import json,sys; print(json.load(open(sys.argv[1]))['data'])" "${c%.pt}.json")   # 混入与原训练相同的仿真数据
  g=${FREE[$(( i % ${#FREE[@]} ))]}
  log "  微调 $base（仿真数据 $sim）→ GPU $g"
  CUDA_VISIBLE_DEVICES=$g nohup $PY scripts/finetune_doa_net.py --init "$c" --name "$name" --sim "$sim" --epochs "$EPOCHS" \
    --device "$DEVICE" --threads 8 > "work/logs/ft_${name}.log" 2>&1 &
  PIDS+=($!); NAMES+=("$name"); i=$((i + 1))
done
FAIL=0
for p in "${PIDS[@]}"; do wait "$p" || FAIL=$((FAIL + 1)); done
log "微调结束，失败 $FAIL 个"

log "3/3 实录测试集评测（单次测向，种子平均）"
$PY scripts/eval_server_models.py --dir work/models --pattern "${NAMES[@]}" --no-replay --redo
log "全部完成"
