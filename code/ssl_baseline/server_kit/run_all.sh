#!/usr/bin/env bash
# 场景一（会议室换人测向）一键流程：下载人声 → 生成仿真数据 → 传统基线 → 训练小网络（s 档与放大版 l 档）→ 测试集对比。
# 在 code/ssl_baseline 目录下运行：  bash server_kit/run_all.sh
# 可调参数（环境变量）：WORKERS=生成数据的进程数（默认 CPU 核数）  SIZES="s l"  EPOCHS=30  DEVICE=auto
set -euo pipefail
cd "$(dirname "$0")/.."
WORKERS=${WORKERS:-$(nproc)}
SIZES=${SIZES:-"s l"}
EPOCHS=${EPOCHS:-30}
DEVICE=${DEVICE:-auto}
mkdir -p work out
log() { echo "[$(date '+%H:%M:%S')] $*"; }

log "0/5 检查环境"
python - <<'PY'
import torch, numpy, scipy, pyroomacoustics, soundfile
print("torch", torch.__version__, "| GPU 可用:", torch.cuda.is_available(), "|", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "无 GPU，将用 CPU（很慢）")
print("numpy", numpy.__version__, "| pyroomacoustics", pyroomacoustics.__version__)
PY

log "1/5 下载 LibriSpeech dev-clean / test-clean（训练 / 验证用人声，CC BY 4.0），已有则跳过"
mkdir -p work/librispeech
for s in dev-clean test-clean; do
  if [ ! -d "work/librispeech/LibriSpeech/$s" ]; then
    [ -f "work/librispeech/$s.tar.gz" ] || curl -L --retry 4 -o "work/librispeech/$s.tar.gz" "https://www.openslr.org/resources/12/$s.tar.gz"
    tar -xzf "work/librispeech/$s.tar.gz" -C work/librispeech
  fi
done
( cd work/librispeech && md5sum dev-clean.tar.gz test-clean.tar.gz 2>/dev/null || true )
echo "官方 MD5：dev-clean 42e2234ba48799c1f50f24a7926300a1  test-clean 32fa31d27d2e1cad72775fee3f4849a9"

log "2/5 生成会议室仿真数据（训练 12,000 / 验证 1,000 / 固定测试 800），已有分片自动跳过"
python scripts/gen_meeting_train_data.py --split val --rooms 100 --workers "$WORKERS"
python scripts/gen_meeting_train_data.py --split train --rooms 1200 --workers "$WORKERS"
[ -f work/train_data/test/test.npz ] || python scripts/gen_meeting_test_data.py

log "3/5 固定测试集上的传统基线"
python scripts/eval_test_baselines.py

log "4/5 训练小网络：$SIZES"
for z in $SIZES; do
  python scripts/train_doa_net.py --size "$z" --epochs "$EPOCHS" --device "$DEVICE" --threads 8 --name "crnn_meeting_$z" 2>&1 | tee "work/train_crnn_meeting_$z.log"
done

log "5/5 完成。请把下面这些文件发回分析："
ls -1 out/nn_test_results_crnn_meeting_*.json out/nn_train_log_crnn_meeting_*.json out/test_baselines.json work/train_crnn_meeting_*.log
