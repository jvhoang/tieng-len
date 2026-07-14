# v9.3 isolated probes: V93_EXACT_PLUS + V93_SOFTN14

**Date:** 2026-07-13  
**Goal:** policy/search deltas so live beats freeze v92 at dual N=50 WR>0.70  
**Constraint:** isolated probes only — main `search.js` / `ai.js` not modified  
**SCRATCH:** `/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-2452caa32616/implementer/probes/`

## Setup

| Item | Value |
|------|--------|
| Freeze | `policies/v92-ai.js` (MS120 GM seat) |
| Live | probe `search.js` + main `ai.js` snapshot |
| Live budget | MS280, BR96, maxBranch 24, exact+exploit |
| BR opp model | freeze-GM @ 40ms / 20 iters / 40 sims / branch 12 |
| Seed | `20260711`, games = 15 (`seed + g*9973`) |
| Target | WR > 0.70 |
| Runner | BR_GM_MODEL-style `run-dual.js` (isolated; freeze→v92) |

Main dual lock was busy (`LOCKED v93-baseline`) — probes ran fully isolated (no main swap).

## Probe deltas (vs live STACK ≈ freeze v92)

### V93_EXACT_PLUS
Only:
1. Free-lead exact floor **320 → 360** (`// V93_EXACT_PLUS floor 360`)
2. `handLenBudget` **one band deeper** (thresholds +4):
   - `total<=18 → 18` (was `<=14`)
   - `total<=22 → 16` (was `<=18`)
   - `total<=26 → 14` (was `<=22`)
   - else 10

Dual env: `softSamples=10` (STACK softN10 path forced).

### V93_SOFTN14
Only STACK default softN **10 → 14** in both places:
- exploit soft re-rank default
- free-lead root `softNRoot` default  
Comments: `// V93_SOFTN14`

Dual env: `softSamples=0` so STACK default path applies → **effective softN=14**.  
(If `softSamples=10` were forced, the default change would be fully masked.)

## Results (N=15 dual vs freeze v92)

| Probe | liveWins | WR | wall ms | passed (>0.70) | loss seeds |
|-------|----------|-----|---------|----------------|------------|
| **V93_EXACT_PLUS** | **13/15** | **0.867** | 590275 | yes | 20310576, 20380387 |
| **V93_SOFTN14** | **13/15** | **0.867** | 570575 | yes | 20310576, 20380387 |

### Per-game (identical W/L pattern both probes)

| g | seed | EXACT | SOFTN14 |
|---|------|-------|---------|
| 0 | 20260711 | W | W |
| 1 | 20270684 | W | W |
| 2 | 20280657 | W | W |
| 3 | 20290630 | W | W |
| 4 | 20300603 | W | W |
| 5 | 20310576 | **L** | **L** |
| 6 | 20320549 | W | W |
| 7 | 20330522 | W | W |
| 8 | 20340495 | W | W |
| 9 | 20350468 | W | W |
| 10 | 20360441 | W | W |
| 11 | 20370414 | W | W |
| 12 | 20380387 | **L** | **L** |
| 13 | 20390360 | W | W |
| 14 | 20400333 | W | W |

Artifacts:
- `…/V93_EXACT_PLUS/n15-v92.json` + `n15-v92.log`
- `…/V93_SOFTN14/n15-v92.json` + `n15-v92.log`

## Interpretation

1. **Both probes clear N=15 bar** at **WR 0.867 (13/15)** vs freeze v92 under MS280/BR96/BR-GM@40.
2. **Identical loss set** → neither lever flipped the two failures on this seed batch:
   - `20310576` (steps 16, live seat 0)
   - `20380387` (steps 5, live seat 1) — short loss; likely not an exact-floor / softN sensitivity
3. N=15 is noisy for promotion (need N=50 WR>0.70). These probes look **parity / non-harmful** vs each other on this seed window, not a clear ranking between EXACT_PLUS vs SOFTN14.
4. **EXACT_PLUS** is the more interesting search investment (deeper exact free-lead proof + wider budget bands). **SOFTN14** alone did not change outcomes vs EXACT_PLUS on the same seeds (different softN, same W/L).
5. For N=50: prefer stacking **EXACT_PLUS** onto live STACK if CPU budget allows; softN14 is low-priority given identical N=15 fingerprint.

## Probe file locations

```
SCRATCH/V93_EXACT_PLUS/{search.js,ai.js,run-dual.js,n15-v92.json,n15-v92.log}
SCRATCH/V93_SOFTN14/{search.js,ai.js,run-dual.js,n15-v92.json,n15-v92.log}
```

Main `search.js` / `ai.js` left at STACK softN10 + exact floor 320 (probes only).
