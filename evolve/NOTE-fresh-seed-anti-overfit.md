# Fresh-seed anti-overfit dual protocol

**Locked:** 2026-07-14 (user addendum)

## Problem
Repeated ship duals on fixed HOLDOUT_A `20260801` / HOLDOUT_B `20260802` (and
convert-first packaging that only fires on those seats) overfits the ladder.
User still wins **>90%** vs shipped v9.6 — fixed-seed WR 0.72 does not transfer.

## Protocol (mandatory for ship / bank promotion)
Each **eval round** uses a **new random seed set** (never the legacy fixed holdouts).

On the **same** A and B seed lists, run:

| Arm | Live | Opp | Purpose |
|-----|------|-----|---------|
| chall-vs-freeze A/B | CHALL (new) | FREEZE (previous) | Candidate strength |
| freeze-vs-freeze A/B | FREEZE | FREEZE | Identity control (~0.50 WR) |

### Pass (default)
- Both partitions: chall WR **> 0.70** (N≥50 with BOTH_SEATS=1, GAMES=25)
- Both partitions: `challWins - identityWins` **≥ +2** (same seeds)
- MS=0 TRIALS=20 SOFT=0 dual-rerun on the **same seed set** (determinism)
- SoftN FORBIDDEN

### Seed lifecycle
1. Generate once per eval → `evolve/seed-sets/ship-<stamp>-….json`
2. Record path in dual report JSON
3. **Next** ship / bank gate uses a **new** random set
4. Re-run determinism only reuses the **same** set for that round
5. Banned forever as ship seeds: `20260801`, `20260802`, `20260711`, `20260712`

## Runner
```bash
FREEZE=v96 CHALL=v97 SOFT=0 MS=0 TRIALS=20 GAMES=25 BOTH_SEATS=1 \
  node evolve/fresh-seed-fair-dual.js

# Deterministic re-run of the same round:
SEED_SET=evolve/seed-sets/ship-....json FREEZE=v96 CHALL=v97 \
  SOFT=0 MS=0 TRIALS=20 GAMES=25 BOTH_SEATS=1 \
  node evolve/fresh-seed-fair-dual.js
```

## Invalidated
- Ship duals solely on fixed HOLDOUT_A/B shopping
- Bank scores measured only on fixed holdouts without a fresh-seed control
- Convert packages that only improve fixed-seed seats without generalizing

## Still allowed (dev only, not ship)
- Residual force mining may use any seeds for hypothesis generation
- Before **promote/ship**, re-eval on a **fresh** seed set with identity control
