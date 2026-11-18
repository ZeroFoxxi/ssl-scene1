#!/usr/bin/env bash
# 按场景下载 RealMAN 测试集（CC BY 4.0，https://huggingface.co/datasets/AISHELL/RealMAN），只保留 6 个通道：
# x 轴上 -6 / -3 / 0 / 3 / 6 / 9 cm 的麦克风（通道 CH13、CH5、CH0、CH1、CH9、CH17，见官方代码中的阵列几何），组成 3 cm 间距、孔径 15 cm 的 6 麦线阵。
# 一次处理一个场景：下载 → 核对 SHA256 → unrar 只解出 6 个通道 → 删除压缩包。需要 unrar（apt-get install unrar）。
# 运行：bash scripts/download_realman_scenes.sh OfficeRoom3 OfficeRoom4 Classroom2 LivingRoom2 OfficeLobby          （测试集，输出 work/realman/）
#       SPLIT=val bash scripts/download_realman_scenes.sh OfficeRoom1 LivingRoom6 LivingRoom8 Auditorium      （验证集，输出 work/realman_val/）
# 注意：验证集与测试集有同名场景（OfficeLobby、OfficeRoom3），用验证集微调时要排除这些场景。
set -euo pipefail
cd "$(dirname "$0")/.."
SPLIT=${SPLIT:-test}
OUT=work/realman; [ "$SPLIT" = test ] || OUT=work/realman_$SPLIT
mkdir -p "$OUT"; cd "$OUT"
B=https://huggingface.co/datasets/AISHELL/RealMAN/resolve/main/$SPLIT
for f in ${SPLIT}_static_source_location.csv ${SPLIT}_moving_source_location.csv; do [ -f "$f" ] || curl -sS -L --retry 3 -o "$f" "$B/$f"; done
LIST=$(curl -sS --max-time 60 "https://huggingface.co/api/datasets/AISHELL/RealMAN/tree/main/$SPLIT/ma_noisy_speech")
for s in "$@"; do
  if [ -d "$s" ]; then echo "$s 已存在，跳过"; continue; fi
  sha=$(echo "$LIST" | python3 -c "import json,sys; print(next(x['lfs']['oid'] for x in json.load(sys.stdin) if x['path'].endswith('/$s.rar')))")
  echo "[$(date +%H:%M:%S)] 下载 $s"
  curl -sS -L --retry 4 -o "$s.rar" "$B/ma_noisy_speech/$s.rar"
  echo "$sha  $s.rar" | sha256sum -c -
  unrar x -o+ -inul "$s.rar" "*_CH0.flac" "*_CH1.flac" "*_CH5.flac" "*_CH9.flac" "*_CH13.flac" "*_CH17.flac" ./
  rm -f "$s.rar"
  echo "[$(date +%H:%M:%S)] $s 完成：$(find "$s" -name '*.flac' | wc -l) 个文件，$(du -sh "$s" | cut -f1)"
done
