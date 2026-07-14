# Gold series 1–3 status (honest)

**Date:** 2026-07-14

## Fail count
Live/v94 expert gold path: **~25 fails / ~30** assertions (series 1–3 + P1/P3/P5).

## Why
Live expert is pure v91-style cheap/min-top; gold structure machinery (pickStructureSafe, residualQuality, inflated structureBreakCost) is parked in bak trees, not live.

## Dual-safe restore ladder
1. GOLD_SURGICAL combat only → ~19 fails, dual ~0.80
2. series-1 full → 18 fails, dual 0.75
3. series-2 selective → ~8 fails, dual 0.70  ← best dual/gold gate
4. series-3 bulk → 1–2 fails, dual 0.50 cliff — NEVER bulk merge

## Top fail themes
1. Loose beat > pair/run smash
2. 2-budget when non-2 only smashes
3. Plan-pass (QQ, QKA, 22)
4. Free-lead plan / doubleseq / control
5. Residual structure (maxRun / same-len seq)

## Rule
Gold series 1–3 remain recommendations; ship needs dual >0.70 under **hidden GM**. Full gold green + dual >0.70 requires micro-patches, not bulk series-3.
