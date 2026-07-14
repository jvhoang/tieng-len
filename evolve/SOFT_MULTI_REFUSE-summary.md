# SOFT_MULTI_REFUSE — multi-climb refuse only vs multi-with-2

**Date:** 2026-07-13  
**Scratch:** `$SCRATCH/probes/SOFT_MULTI_REFUSE/`  
**Base:** MULTI_REFUSE probe plumbing on race-base (v9.2), softened  
**Protocol:** dual GM maxBudget live (MS280 / IT200 / SIMS480 / BR96 / branch24) vs freeze **v91** GM (MS120/IT80), `setExploitOpponent` + `applyFast`

---

## Motivation

Hard **MULTI_REFUSE** dualed **0.70** (BASE **0.80**): over-passive multi fold on any opp multi re-beat (incl. cheap non-2).  
Suggested soften: refuse only when perfect-info opp re-beat multi **contains a 2** (rank-12).

---

## Implementation (isolated only)

Same hook points as MULTI_REFUSE (`expertPolicy`, `enforcePolicyGuards`, combat soft-root, BR guard, `ai.js` cheap-override).

**Softening delta only:**

1. **`oppCanRebeatWithTwoMulti`** — true iff opp has legal non-bomb multi answer with a 2.
2. **`multiClimbShouldRefuse`** — hard PASS only when every **cheap** multi answer is re-beatable by **multi-with-2** (not cheap-only multi re-beat). Still skips when `omin ≤ 2` or `handLen ≤ 4`.
3. **`multiRebeatPenalty`** — still score-only for any re-beat; multi-with-2 = 90; cheap multi re-beat reduced 60→35 (no hard pass).

**Unit:** synthetic 5-seq: opp multi-with-2 → refuse true; opp cheap-only re-beat → refuse false.

**Main:** **not touched** — no `SOFT_MULTI_REFUSE` / `multiClimbShouldRefuse` in repo `search.js` / `ai.js`.

---

## Dual N=20 (seed0=`20260711`)

| Build | WR | liveWins | lossSeeds |
|-------|---:|---------:|-----------|
| BASE (race+, n20-v2) | **0.80** | 16/20 | `20310576, 20320549, 20350468, 20380387` |
| MULTI_REFUSE (hard) | **0.70** | 14/20 | `20290630, 20310576, 20320549, 20350468, 20360441, 20380387` |
| **SOFT_MULTI_REFUSE** | **0.70** | **14/20** | **same as hard** |

W/L vectors:
- BASE:               `WWWWWLLWWLWWLWWWWWWW`
- MULTI_REFUSE hard:  `WWWLWLLWWLLWLWWWWWWW`
- SOFT_MULTI_REFUSE:  `WWWLWLLWWLLWLWWWWWWW`  (**identical to hard**)

**vs BASE n20-v2:** flips **0**; regs **2** (`20290630`, `20360441`).  
**20380387 still L** (5 steps) — multi-with-2 trap / structural CF.

**Gate dual WR ≥ 0.80:** **FAIL** (−2 vs BASE; same as hard).

---

## Seed-duel (16 residual race losses + 12 win seeds)

Protocol: isolated `run-seed-duel.js` (no `setExploitOpponent`; lighter than dual).

| Metric | SOFT_MULTI_REFUSE | MULTI_REFUSE hard | BASE residual-16 ref |
|--------|------------------:|------------------:|---------------------:|
| loss raw wins / 16 | **3** | 2 | 3 |
| flipSeeds (loss) | `20290630`, `20320549`, `20599793` | `20290630`, `20599793` | `20290630`, `20320549`, `20599793` |
| win_regs / 12 | **4** | **1** | — |
| regSeeds | `20260711`, `20330522`, `20360441`, `20390360` | `20360441` | — |

**vs hard MULTI_REFUSE seed-duel:** recovered flip `20320549` (+1 loss flip, matches BASE residual flips), but **+3 win_regs** (worse).  
Note: seed-duel and dual can disagree on individual seeds (dual uses frozen expert exploit + memoized applyFast).

**Task promote gate:** dual WR ≥ 0.80 **and** loss flips ≥1 **and** win_regs = 0  
→ dual WR fails; win_regs = 4 ≠ 0 ⇒ **no N=50**.

---

## Verdict

**Reject SOFT_MULTI_REFUSE (no promote / no N=50).**

- Dual N=20 is **bit-identical** to hard MULTI_REFUSE (0.70, same 2 regs vs BASE). Softening the hard gate to multi-with-2 only was **silent on dual** — either dual traps already involve multi-with-2, or residual soft penalty + shared plumbing dominate.
- Seed-duel loss flips look BASE-like (3/16), but **win_regs=4** is worse than hard (1) under light seed-duel.
- Does not fix 20380387 mine.

**Better next levers:**
- Root-only one-ply: pass only if after our multi + opp re-beat (with 2), opp free-lead go-out within 1–2 plies.
- Drop hard pass entirely; keep multi-with-2 score penalty only, re-measure dual (expect closer to BASE 0.80 if silent).
- Do not re-run N=50 on main for this lever.

---

## Artifacts

- `$SCRATCH/probes/SOFT_MULTI_REFUSE/{search.js,ai.js,run-dual.js,run-seed-duel.js}`
- `$SCRATCH/probes/SOFT_MULTI_REFUSE/probe-out.json` — dual N=20 (0.70)
- `$SCRATCH/probes/SOFT_MULTI_REFUSE/seed-duel-loss16.json` — 16 residual
- `$SCRATCH/probes/SOFT_MULTI_REFUSE/seed-duel-flip-check.json` — LOSS+WIN
- `$SCRATCH/probes/SOFT_MULTI_REFUSE/seed-duel-flip-metrics.json` — structured flips/regs
- This note + `evolve/SOFT_MULTI_REFUSE-summary.md`

---

## Return numbers

| Metric | Value |
|--------|------:|
| dual N=20 WR | **0.70** (14/20) |
| dual vs BASE | **−2** (regs 20290630, 20360441; flips 0) |
| dual vs hard MULTI_REFUSE | **0** (identical vector) |
| seed-duel loss flips | **3** / 16 (`20290630`, `20320549`, `20599793`) |
| seed-duel win_regs | **4** / 12 |
| N=50 main | **not run** (dual gate fail) |
| main broken? | **no** (probe-only) |
