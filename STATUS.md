# STATUS — Fair dual ladder (resumable handoff)

**Updated:** 2026-07-14T19:00Z  
**Live AI / freeze:** Grandmaster **v9.5** ≡ `policies/v95-*` ≡ `ai.js`/`search.js` (**SHIPPED** fair dual)  
**SoftN:** **DEAD**

## Skeptic gaps (v9.5) — RESOLVED
| Gap | Status |
|-----|--------|
| live AI_BUILD | **v9.5** |
| `pickComSbc0` in live `search.js` | **yes** + `com-sbc0-hard` |
| `policies/v95-*` freeze | **yes** |
| fair `dual-primary` / `dual-rerun` | HOLDOUT A/B **36/36** WR **0.72** SOFT=0 BR-both |
| git main + gh-pages | **cd2aff6** (+ bank commits) |

## Shipped fair dual rungs
| Rung | vs freeze | Holdout A/B | Sum | Git |
|------|-----------|-------------:|----:|-----|
| **v9.5** | v91 | **36 / 36** | **72** | `2a29964` + site `e8766cc` |

v9.2–v9.4 perfect-info harness **invalidated**.

## Banked intermediate (not yet a freeze)
| Tag | vs v95 id | vs v91 | Ship v9.6? |
|-----|-----------|--------|------------|
| **`p_w49_ex_maxedge`** | 25 / **26** (0 rev) | **36 / 37** sum73 | **NO** — need both >0.70 vs **v95** |

Lever: unique naked Queen climb (`20400424@0` 8H→QD).  
Evidence: `evolve/NOTE-fair-w49-maxedge.md`, `BANK-w49-maxedge.json`.

## Stack
combat: mulowg · pairhi · pairhi_wide · seqhi · sbc0 · **maxedge (banked)**  
FREE: flvol · flshort5 · flhidetight · brseq3 · tripair · pairshed · lotesh · pairseq · twoshed

## Next (v9.6 → v11.0)
1. Base **`p_w49_ex_maxedge`** (or live v95 + maxedge).  
2. Hunt pure 0-reverse converts under freeze **v95** until holdout A **and** B WR **>0.70**.  
3. Then freeze **v9.6**, stamp live, dual-primary/rerun, commit main + gh-pages.  
4. SoftN never. Full-policy firstdiff before code (pairkeep/maxedge thrash lessons).

## W50 note
`sbc0wide` REJECT — target convert is anti-SBC climb (AC sbc13 > KD sbc5). See `NOTE-fair-w50-sbc0wide-reject.md`.

## Evidence
`SHIP_READY.md`, `evolve/dual-primary.json`, `evolve/dual-rerun.json`,  
`policies/v95-*`, live `ai.js`/`search.js`,  
`NOTE-fair-w47/w48/w49-*.md`, scratch `ship-v95/`, `w49/`
