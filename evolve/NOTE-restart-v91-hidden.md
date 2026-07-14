# Restart from freeze v9.1 under **hidden GM** duals

**Date:** 2026-07-14

## Contract
- Seats: grandmaster vs grandmaster  
- Info: **hidden only** (bench refuses perfect unless `TIENLEN_ALLOW_PERFECT=1`)  
- Ship: N≥50 WR>0.70 **and** ≥ identity+2  
- Gold series 1–3: recommendations; ~25 fails on pure expert (see NOTE-gold-status-honest.md)  

## What BR means
Best-response playout scoring — not a difficulty level.

## Baseline pipeline
`evolve/run-hidden-gm-dual.sh` + `$SCRATCH/honest/run-baselines.sh`:
1. identity v91≡v91 N=20 (budget 200 vs 100, BR-off)  
2. STACK v92 vs v91 N=20  
3. v94 vs v91 N=20  

BR-off for wall-clock (nested BR+GM under hidden det was pathological). Seats still GM search.

## Next levers (after baselines)
From human data (NOTE-hidden-ladder-human-levers.md):
1. Combat residual structure soft-tie + gated fold  
2. Free-lead short multi / trash  
3. Min-beat structure ties  

Not: softN count, perfect duals, bulk series-3.

## SoftN contamination
Previous softN14/16 perfect dual pipelines corrupted live AI. softn policies renamed `.FORBIDDEN`; perfect duals exit(3) by default.
