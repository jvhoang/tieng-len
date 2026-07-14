# SHIP READY — Grandmaster v9.5 (fair dual)

**Protocol:** fair hidden · GM vs GM · BR both · equal budget · SOFT=0 · T20 · expertPolicy BR leaf  
**Freeze:** v9.1 (`policies/v91-*`)  
**Live / freeze ship:** v9.5 (`ai.js` + `search.js` ≡ `policies/v95-*`)

## Dual gates (holdout ship partitions — anti-overfit)

| Role | seed0 | Wins | WR | Δid vs freeze | passed |
|------|------:|-----:|---:|--------------:|:------:|
| **Primary (HOLDOUT_A)** | 20260801 | **36/50** | **0.72** | +22 | YES |
| **Re-run (HOLDOUT_B)** | 20260802 | **36/50** | **0.72** | +22 | YES |

Evidence: `{SCRATCH}/dual-primary.json`, `{SCRATCH}/dual-rerun.json`,  
`evolve/holdout-{A,B}-ch-t20-v95-fair.json`, `evolve/dual-primary.json`, `evolve/dual-rerun.json`.

## Lever (one-axis on banked stack)
`com_sbc0`: combat single · unique true-loose **Ace** (`structureBreakCost===0`, rank 11)  
Gates: secondS≥4 · handLen 7–11 · omin 2–8 · curTop≥5 · never force 2  
Pure convert: B `20270775@1` QH→AD · A flat 36 · **0 reverse** vs prior bank `p_w45_ex_twoshed`.

## Stack (fair dual convert-first)
combat: mulowg · pairhi · pairhi_wide · seqhi · **sbc0**  
FREE: flvol · flshort5 · flhidetight · brseq3 · tripair · pairshed · lotesh · pairseq · twoshed

## Invalidated
- SoftN / softSamples sweeps  
- Perfect-info hollow duals (prior v9.2–v9.4 harness numbers)  
- DEV seed 20260711 alone as ship evidence  

## Tests
`node test-engine.js` / `test-search.js` / `test-ai.js` — ALL PASSED (see `{SCRATCH}/ship-v95/baseline-tests.log`)

## Next ladder
v9.6+ fair dual vs freeze **v95** (not v91) once residual +1 found; continue to v11.0.
