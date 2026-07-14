#!/usr/bin/env bash
# Fair ship dual: HIDDEN info, grandmaster vs grandmaster, BR ON both seats.
#
# User rules (2026-07-14):
#   - never perfectInfo
#   - always grandmaster seats
#   - BR on for both live AND freeze (same search class as published GM)
#   - identity dual with equal budgets should be ~0.50 if code-identical
#
# Usage: bash evolve/run-hidden-gm-dual.sh <freeze> <challenger|live> <games> <out.json> [seed]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FREEZE="${1:?v91}"
CHALL="${2:-live}"
GAMES="${3:-20}"
OUT="${4:-evolve/dual-hidden.json}"
SEED="${5:-20260711}"

export TIENLEN_FREEZE="$FREEZE"
if [ "$CHALL" != "live" ]; then
  export TIENLEN_CHALLENGER_FREEZE="$CHALL"
else
  unset TIENLEN_CHALLENGER_FREEZE || true
fi

export TIENLEN_FREEZE_DIFF=grandmaster
export TIENLEN_V8_DIFF=grandmaster
export TIENLEN_BENCH_GAMES="$GAMES"
export TIENLEN_BENCH_SEED="$SEED"
export TIENLEN_TARGET=0.70

# HIDDEN only
export TIENLEN_V8_PERFECT=0
export TIENLEN_FREEZE_PERFECT=0
export TIENLEN_EXACT=0
export TIENLEN_FREEZE_EXACT=0

# Equal fair budgets (both seats)
export TIENLEN_EQUAL_BUDGET=1
export TIENLEN_FREEZE_MS="${TIENLEN_FREEZE_MS:-200}"
export TIENLEN_FREEZE_ITERS="${TIENLEN_FREEZE_ITERS:-120}"
export TIENLEN_FREEZE_SIMS="${TIENLEN_FREEZE_SIMS:-240}"
export TIENLEN_V8_MS="${TIENLEN_V8_MS:-200}"
export TIENLEN_V8_ITERS="${TIENLEN_V8_ITERS:-120}"
export TIENLEN_V8_SIMS="${TIENLEN_V8_SIMS:-240}"

# BR ON both seats (matches published GM controller bestResponse:true)
export TIENLEN_BR=1
export TIENLEN_FREEZE_BR=1
export TIENLEN_EXPLOIT=1
export TIENLEN_FREEZE_EXPLOIT=1
export TIENLEN_SOFT_SAMPLES="${TIENLEN_SOFT_SAMPLES:-6}"
export TIENLEN_FREEZE_SOFT_SAMPLES="${TIENLEN_FREEZE_SOFT_SAMPLES:-$TIENLEN_SOFT_SAMPLES}"
export TIENLEN_BR_TRIALS="${TIENLEN_BR_TRIALS:-32}"
export TIENLEN_FREEZE_BR_TRIALS="${TIENLEN_FREEZE_BR_TRIALS:-$TIENLEN_BR_TRIALS}"

# BR playout model inside best-response: freeze expertPolicy (cheap leaf).
# Seats are still grandmaster+BR; this is only the internal opp model in rollouts.
export TIENLEN_BR_MODEL="${TIENLEN_BR_MODEL:-expert}"

export TIENLEN_LOG_GAMES=1
export TIENLEN_PROGRESS_EVERY=1
export TIENLEN_CHECKPOINT_EVERY=5
export TIENLEN_SCRATCH=evolve
export TIENLEN_BENCH_OUT="$(basename "$OUT")"

echo "LOCKED fair-hidden-gm-BR-both freeze=$FREEZE chall=$CHALL N=$GAMES $(date -u +%Y-%m-%dT%H:%M:%SZ)" > MAIN-BENCH-LOCK.txt
echo "=== FAIR HIDDEN GM dual (BR ON both) freeze=$FREEZE chall=$CHALL games=$GAMES seed=$SEED ==="
echo "    seats=grandmaster info=hidden liveBR=1 freezeBR=1 equalBudget=1 brPlayout=$TIENLEN_BR_MODEL"
node evolve/bench-ladder.js
