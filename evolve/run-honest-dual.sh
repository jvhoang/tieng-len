#!/usr/bin/env bash
# Honest dual ship gate for Tiến Lên ladder.
# User rule (2026-07-14): ALWAYS hidden info — never perfectInfo for ship duals.
#
# Usage:
#   bash evolve/run-honest-dual.sh v94 identity-out.json candidate-out.json
# Requires live AI already set to candidate (or identity for baseline).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FREEZE="${1:?freeze tag e.g. v94}"
IDENTITY_OUT="${2:-evolve/identity-vs-${FREEZE}-n50.json}"
CANDIDATE_OUT="${3:-evolve/candidate-vs-${FREEZE}-n50.json}"
SEED="${TIENLEN_BENCH_SEED:-20260711}"
GAMES="${TIENLEN_BENCH_GAMES:-50}"
MIN_DELTA="${TIENLEN_MIN_DELTA_WINS:-2}"

# Force hidden-info ship protocol (strip any perfect opt-in)
export TIENLEN_V8_PERFECT=0
export TIENLEN_FREEZE_PERFECT=0
export TIENLEN_BR_OPP_PERFECT=0
# exactExploit is perfect-info path — off for ship duals
export TIENLEN_EXACT=0
export TIENLEN_FREEZE_EXACT=0

echo "=== Honest dual: HIDDEN INFO GM vs GM ==="
echo "freeze=$FREEZE games=$GAMES seed=$SEED minDelta=$MIN_DELTA"

echo "=== 1) Identity dual (live must be ≡ freeze for true identity) ==="
echo "    If live already has candidate code, skip and pass TIENLEN_IDENTITY_BASELINE"
if [ "${SKIP_IDENTITY:-0}" != "1" ]; then
  TIENLEN_FREEZE="$FREEZE" TIENLEN_BENCH_GAMES="$GAMES" TIENLEN_BENCH_SEED="$SEED" \
  TIENLEN_TARGET=0.70 TIENLEN_LOG_GAMES=1 \
  TIENLEN_FREEZE_DIFF=grandmaster TIENLEN_V8_DIFF=grandmaster \
  TIENLEN_FREEZE_MS=120 TIENLEN_FREEZE_ITERS=80 TIENLEN_FREEZE_SIMS=160 \
  TIENLEN_V8_MS=280 TIENLEN_V8_ITERS=200 TIENLEN_V8_SIMS=480 \
  TIENLEN_BR_TRIALS=96 TIENLEN_SOFT_SAMPLES=10 TIENLEN_BR=1 \
  TIENLEN_BENCH_OUT="$(basename "$IDENTITY_OUT")" TIENLEN_SCRATCH=evolve \
  node evolve/bench-ladder.js
fi

echo "=== 2) Candidate dual with identity-delta gate ==="
TIENLEN_FREEZE="$FREEZE" TIENLEN_BENCH_GAMES="$GAMES" TIENLEN_BENCH_SEED="$SEED" \
TIENLEN_TARGET=0.70 TIENLEN_LOG_GAMES=1 \
TIENLEN_IDENTITY_BASELINE="$IDENTITY_OUT" TIENLEN_MIN_DELTA_WINS="$MIN_DELTA" \
TIENLEN_FREEZE_DIFF=grandmaster TIENLEN_V8_DIFF=grandmaster \
TIENLEN_FREEZE_MS=120 TIENLEN_FREEZE_ITERS=80 TIENLEN_FREEZE_SIMS=160 \
TIENLEN_V8_MS=280 TIENLEN_V8_ITERS=200 TIENLEN_V8_SIMS=480 \
TIENLEN_BR_TRIALS=96 TIENLEN_SOFT_SAMPLES=10 TIENLEN_BR=1 \
TIENLEN_BENCH_OUT="$(basename "$CANDIDATE_OUT")" TIENLEN_SCRATCH=evolve \
node evolve/bench-ladder.js

echo "HONEST HIDDEN-INFO SHIP GATE PASSED"
