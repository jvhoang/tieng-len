# Strategy priorities P1–P5 (playlog inference)

**Date:** 2026-07-13  
**Stamp:** `v9.2` @ `2026-07-13T13:00:00Z` (P1–P5 surgical)  
**Source:** playlog export deep analysis + gold 0498–0521

## Dual learning

| Build | Dual N=50 vs freeze v91 | Notes |
|-------|-------------------------|-------|
| series-3 / playlog-align (`9b20d49`) | ~0.66 historical | Gold 0498–0521 green |
| Broad P1–P5 rewrite | **0.48 FAIL** | Harsh gap penalties, structure-second orderLegals |
| “Dual-safe” soften of broad rewrite | **0.44 FAIL** | Still diverged too far from dual baseline |
| **Surgical P1–P5 on 9b20d49** | re-running | Keep baseline combat; add only P3+P4 knobs |

**Lesson:** series-3 already implemented most of P1/P2/P5 in dual-safe form. Broad rewrites of `expertScore` / `orderLegals` / 2-tempo destroyed GM-vs-GM strength.

## Priority map (surgical)

| # | Priority | Status in live | Implementation |
|---|----------|----------------|----------------|
| **P1** | Combat minimal-beat | **Already in baseline** | `pickStructureSafe` residual run → quality → lower top; `orderLegals` min-beat among structure-safe |
| **P2** | Softer mid-pair pass | **Already in baseline** | Deep soft-pass mid pairs; narrow `shouldStructurePass` (0501/0510) |
| **P3** | Free-lead low pair before AA | **Surgical add** | If residual multi ranks AA/KK, intercept with low pair top≤5 |
| **P4** | Residual same-len seq / lower control multi | **Surgical refine** | Same-len seq: residual ±0.3 then **lower top** |
| **P5** | 2-budget | **Already in baseline** | 2 when min cheap smash sc≥14 / Ace / omin≤1; save 2 when clean non-2 |

## Tests

- Full gold IMG0498–0521 + P1/P3/P5 regressions: **79/79**
- `test-ai.js` / `test-engine.js`: pass

## Dual gate

```bash
TIENLEN_FREEZE=v91 TIENLEN_BENCH_GAMES=50 TIENLEN_TARGET=0.70 \
TIENLEN_BENCH_SEED=20260711 TIENLEN_FREEZE_DIFF=grandmaster \
TIENLEN_V8_DIFF=grandmaster TIENLEN_BENCH_OUT=v92-p15c-vs-v91.json \
node evolve/bench-ladder.js
```
