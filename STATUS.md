# STATUS — Fair dual ladder (resumable handoff)

**Updated:** 2026-07-14T19:00Z  
**Live / freeze:** **v9.6** SHIPPED (`384d3aa` main · `4d2abf4` gh-pages)  
**SoftN:** **DEAD**  
**Ship protocol:** **MS=0 TRIALS=20 SOFT=0** dual-rerun both holdouts  

## Shipped
| Rung | vs freeze | A | B | Protocol |
|------|-----------|--:|--:|----------|
| v9.5 | v91 | 36 | 36 | T20 |
| **v9.6** | **v95** | **36** | **36** | **MS=0** |

Live `AI_BUILD.id=v9.6` · `policies/v96-*` · lever `fl_jpair`  
Evidence: `evolve/dual-primary.json`, `dual-rerun.json`, SCRATCH dual/load/test logs  

## Intermediate bank toward v9.7 (vs freeze **v96**)
| Tag | A | B | NEW | REV |
|-----|--:|--:|-----|-----|
| identity v96 | 25 | 25 | — | — |
| `p_w76_ex_acetrip_lowopen` | **26** | **25** | `20260801@1` multi-ply | ∅ |
| `p_w77_ex_fltrash3` | **27** | **25** | `20270774@1` FREE trash3 | ∅ |
| `p_w78_ex_flseq5shed` | **28** | **25** | `20430342@0` FREE seq5shed | ∅ |
| `p_w79_ex_comkclimb` | **29** | **25** | `20360531@1` combat K-climb | ∅ |
| `p_w80_ex_comjmid` | **30** | **25** | `20280747@1` combat J-mid | ∅ |

**Ship bar v9.7:** A≥**36** · B≥**36** vs freeze v96 (need **+6 A** and **+11 B** pure from w80).  
w76 vs v95 continuity: **A37/B36**.  

## Residual force (MS=0 under w76)
Many dual-safe 1-force hits available (e.g. FREE trash opens, combat climbs).  
Continuing convert-first package loop. SoftN never.

## Goal end-state
**v11.0** under same gates (or honest residual handoff with machine evidence).  
Not complete: intermediate bank only (A27/B25 vs freeze v96).

## Next
1. Package next pure converts (1-force hits inventory in SCRATCH `v97-w76-1f-*`)  
2. Climb bank to A36/B36 vs freeze v96 → ship **v9.7**  
3. Repeat 0.1 rungs → **v11.0**  
