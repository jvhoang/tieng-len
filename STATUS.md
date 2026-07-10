# Tieng Len — STATUS

**Date:** 2026-07-10  
**Grandmaster search AI (Phase 1–5)**

## What shipped
- **`search.js`**: Flat Monte Carlo + UCT MCTS + optional determinization; expert rollouts; multi-player place utility (1st=1.0 … 4th=0).
- **`engine.js`**: `cloneStateFast` / `applyPlayFast` / `passFast` + `DEFAULT_RULES` for sim throughput.
- **`ai.js`**: Hard path uses real search (browser ~1.2s budget); easy/evolve stay expert-fast; `getLastSearchStats()` for hints/debug.
- **Controller**: `aiDifficulty` easy|medium|hard|grandmaster; wired into `runAITurnIfNeeded`.
- **UI**: AI difficulty dropdown; cache-bust `?v=20260710a`; loads `search.js`.
- **Harness**: `evolve/benchmark.js`, `evolve/meta-analyst.js` (not genome-mutation-only).

## Benchmarks (evidence)
| Matchup | Games | Search first-rate | Notes |
|--------|------:|------------------:|-------|
| search-lite vs expert-genome (2v2 seats) | 100 | **72%** (CI ~62–80%) | lite budget ~80ms/move |
| search-lite vs expert (post-analyst) | 80 | **76%** (CI ~66–84%) | GATE OK |
| expert vs lowest-legal | 60 | expert **65%** firsts | baseline hierarchy |
| four-way (search/expert/lowest/random) | 40 | search **50%**, expert 30%, lowest 20%, random 0% | single seat each |

Files: `evolve/last-benchmark.json`, `evolve/analyst-report.json`.

## Rules
Pagat core per `RULES.md` (bombs only vs pure 2s; pass lockout; free lead after control). Bombs configurable via `DEFAULT_RULES` flags (logic still Pagat-encoded).

## Play
https://jvhoang.github.io/tieng-len/ — hard refresh.  
AI defaults to **Hard (search)**. Use **Grandmaster** for ~3.5s thinking.

## Run locally
```bash
node test-engine.js && node test-search.js && TIENLEN_TEST_FAST=1 node test-ai.js
TIENLEN_BENCH_GAMES=80 TIENLEN_BENCH_MODE=search-vs-expert node evolve/benchmark.js
TIENLEN_ANALYST_GAMES=20 node evolve/meta-analyst.js
```
