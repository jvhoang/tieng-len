# Strategy priorities P1–P5 (playlog inference)

**Date:** 2026-07-13  
**Stamp:** `v9.2` @ `2026-07-13T12:00:00Z` (P1–P5)  
**Source:** playlog export deep analysis + gold 0498–0521 + human/AI diverge themes

## Priorities implemented

| # | Priority | Implementation | Gold / signal |
|---|----------|----------------|---------------|
| **P1** | Combat **minimal-beat** (no overkill high card when lower works) | `pickStructureSafe` singles: residual run → residual quality → **lower top**; `orderLegals` near-equal structure → lower top; `expertScore` multi lower-top term | 0520b (7 not Q); playlog “H_minimal_beat_E_overkill” |
| **P2** | **Softer mid-pair pass** — contest clean mid, pass only narrow structure cases | Default: play structure-safe beat; `shouldStructurePass` only 0510 high-seq / 0501 high-pair+2s; softPass11 is probe-only | 0501 still PASS QQ; dual not over-pass |
| **P3** | Free-lead **low pair before AA/high pair** | `pickFreeLeadHard`: handLen≥10, no 22, low pair (top≤5) before high pair (top≥9) | playlog “33 vs AA early” theme |
| **P4** | Combat residual-low **same-len seq** (not high control multi) | `pickStructureSafe` allSameSeq: residual first, else **lower top**; multi residual in free-lead rank | 0503 residual; human 3456 vs 10JQK |
| **P5** | **2-budget model** — spend 2 only when needed | `shouldSpendTwoNow`: safe non-2 only if sc **&lt; 12**; 2 when min non-2 sc≥12 or Ace/omin≤1/short; pool includes 2s when minC≥12/14 | 0500 2 not K-from-JQK; 0513/0516; save 2 when clean K |

## Key ranking fix (singles)

Previous bug: 2-preference only ran when `run === bestRun`, so a **better residual run with 2** never beat a structure-smashing K. Also equal residual run preferred lower `structureBreakCost`, so **Q (pair) beat 7 (pair-in-run)** despite worse plan.

Fixed order for non-omin=1 singles:

1. 2 if best non-2 has sc ≥ 12  
2. Else residual **maxRun**  
3. Else residual **quality**  
4. Else **lower top** (minimal beat)

## Tests

- Full `test-search.js` gold IMG0498–0521: **all pass** (incl. 0500, 0520b after fix)  
- `test-ai.js`: all pass  

## Dual gate (next)

```bash
TIENLEN_FREEZE=v91 TIENLEN_BENCH_GAMES=50 TIENLEN_TARGET=0.70 \
TIENLEN_BENCH_SEED=20260711 TIENLEN_FREEZE_DIFF=grandmaster \
TIENLEN_V8_DIFF=grandmaster TIENLEN_BENCH_OUT=v92-p15-vs-v91.json \
node evolve/bench-ladder.js
```

Strict pass: live WR **> 0.70** primary + re-run, then freeze+ship.
