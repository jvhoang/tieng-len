# v9.2 flip-hunt vs freeze v91 — notes

**Date:** 2026-07-13  
**Protocol:** live grandmaster + exploit vs freeze v91 grandmaster  
**Seed0:** 20260711 · N=50 · target WR>0.70 (≥36/50)  
**Budgets:** live ~180ms/140it/BR56 exact=1 · freeze ~100ms/64it exact=0  
**Live seat:** `seed % 2`

## Context

- **v9.1** dual-passed **36/50 ×2** vs freeze **v90** and shipped (`policies/v91-*`).
- v9.2 must clear **freeze v91** (full v9.1 package: structure-break singles + probe-TWO 2-tempo `omin≤3`).
- Pre-series-2 leaf micro (race/ctrl/lock/minimal-beat) stuck **33–34/50** vs v91.
- Series-2 + gold-fix structure-safe package (user IMG_0498–0521) duals **27/50 (0.54)** vs v91 — regression vs pre-series-2.

## Dual results (primary protocol)

| Build | Artifact | liveWins | WR | Notes |
|-------|----------|--------:|---:|-------|
| Pre-series-2 micro (early) | `evolve/v92-vs-v91-final.json` | **33** | 0.66 | leaf micros only |
| Series-2 structure-safe | `evolve/v92-series2-vs-v91.json` | **27** | 0.54 | IMG_0505–0513 |
| Gold-fix narrow pass | `evolve/v92-gold-vs-v91.json` | **27** | 0.54 | stamp 07:15:52Z |
| Soft structure costs | `evolve/v92-softcost-vs-v91.json` | **27** | 0.54 | cost scale down no flip |
| Free-lead soft force (ai.js) | smoke N=5 → **1/5** | **reverted** | hurt early WR |

## Loss seeds (gold dual N=50, 23 losses)

```
20260711, 20270684, 20310576, 20350468, 20360441, 20380387, 20410306,
20470144, 20480117, 20490090, 20510036, 20520009, 20539955, 20549928,
20559901, 20579847, 20599793, 20609766, 20659631, 20669604, 20689550,
20709496, 20719469
```

First-20 wins: 13/20 under gold dual.

`evolve/v92-loss-seeds.json` tracks latest dump.

## Seed-duel method

- Tool: `evolve/seed-duel.js` (updated freeze default **v91**, **det RNG** for live+freeze).
- Light GM: live 140–160ms / freeze 100ms, exact=1.
- Det BASE on gold package: **27/50** (matches dual).
- Candidate rule: flip ≥2 loss seeds and flip <2 of first-20 wins.

## One-lever results (det, gold baseline 0/23 loss-wins)

| Patch | Loss flips | Win regs (first-20) | Net | Candidate? |
|-------|----------:|--------------------:|----:|:----------:|
| MIDGAP (stronger min-beat) | 0 | — | 0 | no |
| SOFTPASS11 (deep mid multi) | 0 | — | 0 | no |
| TWO7 (curTop 7–10) | 2 | 4 | −2 | no |
| TRASHFL (trash FL multi top≥9) | 4 | 4 | 0 | no |
| STRUCT (×3.4 structure weight) | 4 | 4 | 0 | no |
| NOPASS / LADDER (relax structure-pass) | 1 | — | +1 | no (<2 flips) |
| COMBATV91 (orderLegals cheap only) | **−5 net** on full 50 | | −5 | **hurt** |
| Soft structure costs (permanent try) | dual still 27 | | 0 | no |

TRASHFL/STRUCT flipped the **same** 4 losses and the **same** 4 wins — free-lead multi reordering coin-flip, not asymmetric edge.

## Why series-2 loses to freeze v91

1. **Freeze already has v9.1 structure-break + TWO.** Live no longer has a free “package gap.”
2. **Structure-safe free-lead / combat** (doubleseq force, residual multi, structure-pass, inflated costs) optimizes human-screenshot cases but **cedes tempo** vs GM freeze rollouts.
3. **Budget edge alone is insufficient** once policy is more passive than freeze; det and dual both sit at **~0.54**.
4. Soft knobs (leaf race/ctrl, mid-gap, soft-pass, 2-tempo broaden) **do not move root decisions** enough under FL_ROOT=0 / COMBAT_ROOT=0 + exact+BR (same lesson as v9.1 probes).

## What was kept (requirements)

- Structure-break singles (loose beat over pair/run smash) — v9.1 + gold ranking.
- probe-TWO 2-tempo `curTop∈[8,10]`, `omin≤3`, handLen 4–9, trash|control.
- Screenshot regression suite: **76/76 PASS** on clean HEAD (+ free-lead soft still green).

## Applied patch

**None shipped.** All experimental levers either:
- netted ≤0 under det win-regression criteria, or
- dualed **27/50** (series-2/gold package), or
- smoke-failed when free-lead force was softened (1/5).

Working tree restored to **HEAD gold-fix** (tests 76/76).

## Recommended next levers

1. **Soft-revert doubleseq always-force** at full 13-card free-lead (conflict with IMG_0506/0507 — needs gated screenshot-safe path).
2. **Restore multi-always free-lead core closer to v91** while keeping residual ranking only among equal-cost multis.
3. **Combat:** keep `pickStructureSafe` ordering (COMBATV91 hurt −5) but never structure-pass under perfect-info GM dual (already narrow in gold-fix).
4. **Budget dualSelf / higher MS** already failed pre-series-2 at 34/50 — not a path to 36 alone.
5. **Do not** set exact total>18 (hung/hurt before).

## Best WR this hunt

| Metric | Value |
|--------|------:|
| Best dual vs freeze v91 (this session, series-2+) | **27/50 = 0.54** |
| Best dual vs freeze v91 (pre-series-2 tree) | **33/50 = 0.66** |
| Target | **≥36/50 = 0.72** |
| Gate | **NOT PASSED** |

## Artifacts

- Loss dumps: `evolve/v92-loss-seeds.json`, `evolve/v92-gold-vs-v91.json`
- Seed-duel: `evolve/v92-seed-*-ALL.out`, `evolve/v92-seed-*-L.out`, `evolve/v92-seed-*-wins20.out`
- Hunt logs: `evolve/v92-hunt.log`, `evolve/v92-c91.log`, `evolve/v92-recov.log`
- Duals: `evolve/v92-*-vs-v91.json`

## Status

- **No dual ≥36/50** found for live v9.2 package vs freeze v91.
- Series-2 structure-safe is a **ladder regression** vs pre-series-2 (~33 → 27).
- **Best dual WR this hunt:** pre-series-2 **33/50 (0.66)**; series-2/gold **27/50 (0.54)**.
- **Do not ship/push** until dual >0.70.
- Tests: `node test-search.js` → **76/76 PASS** on clean HEAD gold-fix.
- **Highest-value next step:** soft-revert free-lead doubleseq/residual force toward v9.1 multi-always while keeping screenshot hard-gates (or dual a branch that is v9.1 + TWO only vs freeze v91 to measure pure budget+TWO ceiling).
