# W24 — expertScore climb tax on brfltrash base (architecture)

**Date:** 2026-07-14  
**SoftN:** dead  
**Gold / data drivers:** Series1 residual mass; playlog combat residual; holdout both-lose recon (87% freeze-identical under W17)

## Why not BR cand micro
W18–W23 dual-null/−1. Holdout both-lose full census: **6/46 (13%)** diverge under brfltrash, all `FL_other`. Absolute gap needs expert leaf / score architecture.

## Dead ends this wave (dual-null vs base first-diff)
| Tag | Axis | vs base nDiv design |
|-----|------|--------------------:|
| `p_w24_exp_sbc` | hard sbc filter / residual force sort | **0** (agrees with orderLegals) |
| `p_w24_ex_multicontest` | multi soft-pass disable | **0** (BR root never uses that pass) |

## Selected: `p_w24_ex_climbtax`
**Locus:** `expertScore` combat singles (not BR cand set)  
**Axis:** tax high climbs over low faces when residual 2s/control remain (`gap≥2`, top≥10, curTop≤6, + extra gap≥3 top≥11)

Holdout recon class: freeze-identical burns `JH QS KS` while multi/2 remain.

## Fair dual (SOFT=0 T20 MS200 TRIALS20)

| Gate | id | ch | Δ | WR | Result |
|------|---:|---:|--:|---:|--------|
| Split design | 12 | 15 | +3 | — | interest |
| Split check | 12 | 18 | +6 | — | ok |
| Split full T12 | 24 | **33** | +9 | 0.66 | sig |
| **DEV T20** | 25 | **34** | **+9** | **0.68** | **PASS ≥32** |
| vs brfltrash DEV | — | — | **+1** | — | flip `20420279@0` only |
| **DEV_VAL T20** | 25 | **29** | **+4** | 0.58 | **PASS Δ≥+2** (base was +2) |
| reverse vs id | — | — | 0 | — | none |
| HOLDOUT_A | 25 | 26 | +1 | **0.52** | no ship |
| HOLDOUT_B | 25 | 25 | 0 | **0.50** | no ship |

Ship WR>0.70 on both holdouts: **NO**.

## First-diff (vs freeze T12 SOFT=0)
- Design: 6/24 FL_other (same W17 mass)
- Check: **13/26** with **4 combat_other** (new vs brfltrash check’s 0 combat)

## Decision
**NO SHIP.** Keep live **v9.4**. SoftN dead.  
**Package status:** best **DEV/DEV_VAL** package to date (34 / Δ+4). Holdout absolute still ~0.50–0.52 (same wall as brfltrash A; B −1).  
Use as **optional next base** only if further levers improve holdout; otherwise stay on brfltrash for holdout stability.

## Evidence
`policies/p_w24_ex_climbtax-*`  
`evolve/dev-ch-t20-w24-climbtax.json`  
`evolve/devval-*-t20-w24-climbtax.json`  
`evolve/holdout-*-t20-w24-climbtax.json`  
`evolve/NOTE-w24-*.md` (gold / playlog / holdout / architecture)  
scratch: `{SCRATCH}/w24/`
