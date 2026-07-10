# Tieng Len — STATUS

**Date:** 2026-07-10  
**Grandmaster search AI — verifier fixes applied**

## Skeptic fixes
1. **Adversarial multi-player MCTS**: `uctSelect` maximizes myIdx utility only when chooser === myIdx; opponents minimize (1−mean). Unit test: go-out preferred over helpful discard at opponent nodes.
2. **Imperfect info default**: Controller + `getAIMove` use `hiddenInfo:true` / `perfectInfo:false` → **det-mcts** with hand sampling. Tested legal + my-hand fixed.
3. **Real improve-cycle**: `evolve/run-improve-cycle.js` benches → analyst → applies concrete patch → re-benches → promote/retain. Applied `contest-mid-short-v2` (handLen≤7 contest). Logged to `improve-loop.log` + `champion-search.json`.
4. **Gate evidence** under implementer SCRATCH: `engine-tests.log`, `ai-tests.log` (incl. non-FAST det-mcts), `ai-strength.log`, `improve-loop.log`, `controller-ai.log`, `launch-1.log`, `launch-2.log`, `deploy.log`.

## Benchmarks
| Matchup | Games | Search first-rate |
|--------|------:|------------------:|
| search-lite vs expert (2v2) | 50 | **82%** (CI ~69–90%) |
| improve-cycle AFTER patch | 30 | **70%** (retain decision) |

## Rules
Pagat core (`RULES.md`). Bombs vs pure 2s only.

## Play
https://jvhoang.github.io/tieng-len/ — hard refresh (`?v=20260710b`).  
Default **Hard** = determinized MCTS (~1.2s). **Grandmaster** = higher budget.

## Commands
```bash
node test-engine.js && node test-search.js && TIENLEN_TEST_FAST=1 node test-ai.js
TIENLEN_BENCH_GAMES=50 TIENLEN_BENCH_MODE=search-vs-expert node evolve/benchmark.js
TIENLEN_IMPROVE_GAMES=30 node evolve/run-improve-cycle.js
```
