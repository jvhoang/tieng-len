# Fair dual evaluation protocol (anti-overfit)

**Locked:** 2026-07-14  
**Why:** Design iterated heavily on `seed0=20260711` (first 25 seeds) and peeked at next-25 / s12–s14. Reporting train WR as ship evidence caused false promotion candidates (e.g. s11 0.76 with N100 next25 ≈ 0.50).

## Seed partitions (immutable)

| Role | seed0 | GAMES (BOTH_SEATS=1) | Games | Use |
|------|------:|---------------------:|------:|-----|
| **DEV (train)** | `20260711` | 25 | 50 | Probe design, ablation. **Never ship on this alone.** |
| **DEV_VAL** | `20260715` | 25 | 50 | Model *selection* only (not ship). Must pass before burning holdout. Locked after 2026-07-14; not used for lever editing after first peek. |
| **HOLDOUT_A** | `20260801` | 25 | 50 | Primary ship gate (never used in design). |
| **HOLDOUT_B** | `20260802` | 25 | 50 | Independent re-run ship gate. |
| Contaminated | `20260712–14`, N100 next25 from 20260711 | — | — | Historical only. **Not** ship or selection evidence. |

Seed formula (unchanged): `seed_i = seed0 + i * 9973`, each played liveSeat 0 and 1.

## Fair dual opts (locked)
```
BOTH_SEATS=1 FREEZE=v91 MS=150 TRIALS=12 SOFT=4 BRANCH=12
hidden · GM · BR both · equal budget · expertPolicy BR leaf
```

## Decision rules

1. **Design loop:** Run DEV only. Record `devWR` as exploratory. Prefer one-axis levers.
2. **Selection gate (before holdout):** Candidate must have:
   - DEV: `wins ≥ 32/50` (binomial p<0.05 vs 0.5) **and** `Δid ≥ +2`
   - DEV_VAL (`20260715`): `Δid ≥ +2` (absolute need not be >0.70 yet)
   - Do **not** edit levers after seeing DEV_VAL; if fail, discard branch.
3. **Holdout (ship) — all required, pre-registered, no re-tune:**
   - HOLDOUT_A: `WR > 0.70` and `Δid ≥ +2`
   - HOLDOUT_B: `WR > 0.70` and `Δid ≥ +2`
   - Gold series 1–3 recommendations documented
4. **Forbidden as ship evidence:**
   - seed0 ∈ {20260711–20260714} or mixed N100 that includes train
   - SoftN / hollow BR asymmetry / perfect-info duals
   - Reporting DEV WR without holdout

## Reporting format
Always print:
```
dev (biased):     seed0=20260711  W/N  WR  Δid
holdout_A:        seed0=20260801  W/N  WR  Δid  ship?
holdout_B:        seed0=20260802  W/N  WR  Δid  ship?
```
Ship only if both holdout rows pass.

## Runner
```bash
# Full eval (identity + challenger on dev + holdouts)
FREEZE=v91 CHALL=p_mbnest node evolve/fair-eval-holdout.js
```
