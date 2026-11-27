#!/usr/bin/env bash
# 会议室产品候选模型的整体检查（服务器，自动转到后台；主要用 CPU，可与 GPU 训练 / 微调同时跑）：
#   1. 连续会议仿真：两批验证会议（种子 2027、2028）上比较置信度门限 0 / 0.6 / 0.7 / 0.8；
#   2. 选门限（规则事先定好）：2 s 内对准比不加门限最多低 2 个百分点的门限里，选每分钟误转最少的（相同时取较低门限）；
#   3. 报告会议（种子 2026）只评测一次：不加门限 vs 选定门限；
#   4. 置信度检验（固定测试集）与 8 比特量化模拟。
# 用法（在 code/ssl_baseline 下）：bash server_kit/meeting_model_check.sh work/models/crnn_meeting_60k_s_seed1.pt
# 看进度：tail -f work/logs/meeting_check_<模型名>.log      结果：cat out/meeting_check_<模型名>.txt
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p work/logs out
CK=${1:?请给出模型路径，例如 work/models/crnn_meeting_60k_s_seed1.pt}
NAME=$(basename "$CK" .pt)
LOG=work/logs/meeting_check_${NAME}.log; PIDF=work/logs/meeting_check_${NAME}.pid
if [ "${_SSL_INNER:-0}" != "1" ]; then
  [ -f "$CK" ] || { echo "找不到模型：$CK"; exit 1; }
  if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then echo "这个模型的检查已在运行，看进度：tail -f $LOG"; exit 1; fi
  _SSL_INNER=1 nohup bash "$0" "$@" > "$LOG" 2>&1 &
  echo $! > "$PIDF"
  echo "已在后台启动（进程 $!）。看进度：tail -f $LOG    跑完后：cat out/meeting_check_${NAME}.txt"
  exit 0
fi

PY=${PY:-python3}
TRIALS=${TRIALS:-30}
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1      # 几个进程同时跑，不互相抢线程
log() { echo "[$(date '+%m-%d %H:%M:%S')] $*"; }

log "1/4 验证会议（种子 2027、2028，各 $((TRIALS * 2)) 段）：门限 0 / 0.6 / 0.7 / 0.8"
for sd in 2027 2028; do
  $PY scripts/run_meeting_closed_loop.py --trials "$TRIALS" --seed $sd --nn-ckpt "$CK" --only-nn --tag "_chk_${NAME}_seed${sd}" \
    --nn-variants 0.5:0 0.5:0.6 0.5:0.7 0.5:0.8 > "work/logs/chk_${NAME}_seed${sd}.log" 2>&1 &
done
wait

log "2/4 按规则选门限"
TH=$($PY - "$NAME" <<'PY'
import json, sys
name = sys.argv[1]
S = {}
for sd in (2027, 2028):
    for s in json.load(open(f"out/closed_loop_meeting_chk_{name}_seed{sd}_summary.json", encoding="utf-8"))["summary"]:
        if s["rt60"] == "平均":
            S.setdefault(s["method"], []).append(s)
avg = {m: {k: sum(x[k] for x in v) / len(v) for k in ("wrong_per_min", "aim_within_2s", "framed_ratio")} for m, v in S.items()}
base = avg["小网络+远端冻结"]
th = lambda m: 0.0 if m == "小网络+远端冻结" else float(m.split("置信≥")[1])
ok = [m for m in avg if avg[m]["aim_within_2s"] >= base["aim_within_2s"] - 0.02]
best = min(ok, key=lambda m: (round(avg[m]["wrong_per_min"], 3), th(m)))
with open(f"out/meeting_check_{name}_select.txt", "w", encoding="utf-8") as f:
    for m in sorted(avg, key=th):
        f.write(f"  门限 {th(m):<4g} 误转 {avg[m]['wrong_per_min']:.2f} 次/分钟  2s内对准 {avg[m]['aim_within_2s']*100:.1f}%  对准时间 {avg[m]['framed_ratio']*100:.1f}%\n")
    f.write(f"  选定门限：{th(best):g}\n")
print(f"{th(best):g}")
PY
)
cat "out/meeting_check_${NAME}_select.txt"

log "3/4 报告会议（种子 2026，只评测一次）：不加门限 vs 门限 $TH"
VAR="0.5:0"; [ "$TH" != "0" ] && VAR="0.5:0 0.5:${TH}"
# shellcheck disable=SC2086
$PY scripts/run_meeting_closed_loop.py --trials "$TRIALS" --seed 2026 --nn-ckpt "$CK" --only-nn --tag "_chk_${NAME}_final" --nn-variants $VAR \
  > "work/logs/chk_${NAME}_final.log" 2>&1

log "4/4 置信度检验与 8 比特量化（固定测试集）"
OMP_NUM_THREADS=8 $PY scripts/analyze_nn_confidence.py --ckpt "$CK" > "work/logs/chk_${NAME}_conf.log" 2>&1 || true
OMP_NUM_THREADS=8 $PY scripts/analyze_nn_compute.py --ckpt "$CK" > "work/logs/chk_${NAME}_compute.log" 2>&1 || true

{
  echo "== 会议室模型检查：$NAME =="
  echo "验证会议（种子 2027、2028 平均）："
  cat "out/meeting_check_${NAME}_select.txt"
  echo "报告会议（种子 2026，只评测一次）："
  grep -E "^ *平均" "work/logs/chk_${NAME}_final.log" || true
  echo "置信度（固定测试集）："
  grep -E "^0.5 s|^  门限" "work/logs/chk_${NAME}_conf.log" || true
  echo "计算量与 8 比特量化："
  grep -E "每次判决乘加|浮点:|W8:|W8A8:" "work/logs/chk_${NAME}_compute.log" || true
} > "out/meeting_check_${NAME}.txt"
cat "out/meeting_check_${NAME}.txt"
log "全部完成"
