#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "LOCKED hidden-id-n5 $(date -u +%Y-%m-%dT%H:%M:%SZ)" > MAIN-BENCH-LOCK.txt
export TIENLEN_FREEZE=v94
export TIENLEN_CHALLENGER_FREEZE=v94
export TIENLEN_FREEZE_DIFF=grandmaster
export TIENLEN_V8_DIFF=grandmaster
export TIENLEN_BENCH_GAMES=5
export TIENLEN_TARGET=0.0
export TIENLEN_BENCH_SEED=20260711
export TIENLEN_FREEZE_MS=100
export TIENLEN_FREEZE_ITERS=50
export TIENLEN_FREEZE_SIMS=100
export TIENLEN_V8_MS=200
export TIENLEN_V8_ITERS=100
export TIENLEN_V8_SIMS=200
export TIENLEN_BR_TRIALS=32
export TIENLEN_SOFT_SAMPLES=6
export TIENLEN_BR=1
export TIENLEN_LOG_GAMES=1
export TIENLEN_PROGRESS_EVERY=1
export TIENLEN_BENCH_OUT=v94-identity-hidden-n5.json
export TIENLEN_SCRATCH=evolve
# ship: hidden defaults in bench-ladder (no PERFECT=1)
exec node evolve/bench-ladder.js
