# STATUS — Fair dual ladder (resumable handoff)

**Updated:** 2026-07-14T18:50Z  
**Live AI:** Grandmaster **v9.5** (fair dual sbc0) — **SHIPPED**  
**Design freeze (prior):** **v9.1**  
**New freeze:** **v9.5** ≡ `policies/v95-*` ≡ live `ai.js`/`search.js`  
**SoftN:** **DEAD**

## PRIMARY GOLD
`john_uploads/tien_len_AI.txt` + IMG_0498–0552 + `tienlen-playlogs-1784002833123.json`

## Ladder (fair dual only)

| Rung | Tag | Holdout A/B | Sum | Ship notes |
|------|-----|-------------:|----:|------------|
| **v9.5 LIVE** | **`v95` / `p_w47_ex_sbc0`** | **36 / 36** | **72** | fair hidden BR-both SOFT=0 T20 vs freeze **v91** |
| bank prior | `p_w45_ex_twoshed` | 36 / 35 | 71 | base of sbc0 |
| discard | `p_w46_ex_sbcuniq` | 34 / 34 | 68 | thrash |
| invalidated | v9.2–v9.4 | — | — | perfect-info harness, not fair dual |

Ship WR **strict >0.70**: **A YES (0.72)** · **B YES (0.72)** · Δid **+22** both.

## Live wiring (verifier-critical)
- `ai.js` AI_BUILD.id = **`v9.5`**
- `search.js` contains **`pickComSbc0`** + **`com-sbc0-hard`**
- `policies/v95-{ai,search}.js` freeze copy (policy-relative requires)
- Bank alias: `policies/p_w47_ex_sbc0-*`

## Dual artifacts (fair)
- `{SCRATCH}/dual-primary.json` ← HOLDOUT_A seed0=20260801 36/50
- `{SCRATCH}/dual-rerun.json` ← HOLDOUT_B seed0=20260802 36/50
- `evolve/holdout-{A,B}-ch-t20-v95-fair.json`
- `SHIP_READY.md` (fair dual — replaces perfect-info v9.4 note)

## Stack (convert-first, SoftN dead)
combat: mulowg · pairhi · pairhi_wide · seqhi · **sbc0**  
FREE: flvol · flshort5 · flhidetight · brseq3 · tripair · pairshed · lotesh · pairseq · twoshed

## SoftN
Forbidden. Rogue softN14/16 cancelled. Do not relaunch.

## Next (ladder continues → v11.0)
1. Next freeze target: **v9.6** must dual-pass fair vs freeze **v95** (holdout A+B WR>0.70).  
2. Residual under v95: A 14 / B 14 losses — see `evolve/NOTE-fair-w48-residual.md` + scratch `w48/`.  
3. Dual-safe CF under BASE=v95 FREEZE=v95: 22 non-pass converts (FREE longer-open + combat climb dominate); **20320640@1 stale**; prefer uniqueness-gated structure only.  
4. Gold series 1–3 non-negotiable. SoftN stays dead.

## Evidence
`NOTE-fair-w47-results.md`, `SHIP_READY.md`,  
`policies/v95-*`, live `ai.js`/`search.js`,  
`evolve/dual-primary.json`, `evolve/dual-rerun.json`,  
scratch `ship-v95/`
