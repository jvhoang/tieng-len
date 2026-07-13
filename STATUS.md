# STATUS — Dual ceiling 0.68; aggressive swarm complete so far

**Updated:** 2026-07-13T22:00Z

## Dual N=50 vs freeze v91 (seed 20260711, MS280 BR96)

| Build | WR | Notes |
|-------|---:|-------|
| pure / race+ / maxBudget | **34/50 = 0.68** | **best, stable across re-runs** |
| TWO_OMIN2 | 0.68 | seed-duel flips did not hold under full dual |
| COMBO exact+contest | 0.68 | flat |
| GOLD_SURGICAL structure | **0.62** | N=20 0.80 mirage |
| series-1 full | 0.56 | |
| series-2/3 bulk gold | 0.50–0.54 | |

## Probe farm (N=20 faithful dual)
BASE **0.80**; most soft levers **0.75** (−1); many **silent** under GM+exact.

## Flip swarm
TWO_OMIN2 only candidate on seed-duel; **failed to move full N=50**.

## Short-loss analysis
20380387: freeze multi-climb trap (not free-lead gift). NO_GIFT_HARD rejected (dual −2).

## Live baseline
`v9.2 (race+ maxBudget base)` — pure policy + race leaf, no dual-regressing structure bulk.

## Ship / GitHub
**No dual pass yet** — no freeze/push of a successful rung. Evidence docs committed when ready.

## Next
- Multi-climb refuse (perfect-info better opp multi)
- Avoid AA burn on low pairs early  
- Continue subagent swarm
