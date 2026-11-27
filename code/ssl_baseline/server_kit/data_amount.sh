#!/usr/bin/env bash
# 实录要采多少、分几个房间（服务器 GPU，自动转到后台）：RealMAN 上用多个起点模型（= 多个种子）重复云端的数据量实验。
#   每组：只留一部分实录话语（或只用 1 个房间）重建微调数据 → 各起点模型各在一块空闲 GPU 上微调（总步数相同）→ 实录测试集评测 → 删除该组数据。
# 需要：work/realman_val（RealMAN 验证集 4 个场景）、work/realman_test/realman_test.npz、各起点模型（work/models/<起点>.pt 与 .json）。
# 用法（在 code/ssl_baseline 下）：bash server_kit/data_amount.sh                       # 默认起点：crnn_general_lin6_3cm_s_seed0–3
#       BASES="work/models/a.pt work/models/b.pt" bash server_kit/data_amount.sh
# 看进度：tail -f work/logs/data_amount.log      结果：cat out/realman_data_amount_server.txt
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p work/logs out
LOG=work/logs/data_amount.log; PIDF=work/logs/data_amount.pid
if [ "${_SSL_INNER:-0}" != "1" ]; then
  if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then echo "已在运行（进程 $(cat "$PIDF")），看进度：tail -f $LOG"; exit 1; fi
  [ -d work/realman_val ] || { echo "缺少 work/realman_val"; exit 1; }
  _SSL_INNER=1 nohup bash "$0" "$@" > "$LOG" 2>&1 &
  echo $! > "$PIDF"
  echo "已在后台启动（进程 $!）。看进度：tail -f $LOG    跑完后：cat out/realman_data_amount_server.txt"
  exit 0
fi

PY=${PY:-python3}
BASES=${BASES:-$(ls work/models/crnn_general_lin6_3cm_s_seed[0-9].pt 2>/dev/null | tr '\n' ' ')}
[ -n "$BASES" ] || { echo "没有起点模型（work/models/crnn_general_lin6_3cm_s_seed*.pt）"; exit 1; }
echo "[$(date '+%m-%d %H:%M:%S')] 起点模型：$BASES"
echo "硬盘（每组数据约 2.6 GB，两组同时进行，用完即删）："; df -h work | tail -1
# shellcheck disable=SC2086
$PY scripts/run_realman_data_amount.py --bases $BASES --device cuda --jobs 2 --threads 8 --tag _server
echo "[$(date '+%m-%d %H:%M:%S')] 全部完成"
