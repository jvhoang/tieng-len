# STATUS — Fair dual ladder (resumable handoff)

**Updated:** 2026-07-14T10:02Z  
**Live AI / freeze:** Grandmaster **v9.5** ≡ `policies/v95-*` ≡ live `ai.js`/`search.js`  
**SoftN:** **DEAD**

## Skeptic gaps (v9.5 ship) — CLOSED
Evidence: `{SCRATCH}/audit-v95/SKEPTIC-AUDIT.txt`

| Check | Result |
|-------|--------|
| live AI_BUILD | **v9.5** |
| pickComSbc0 live | **function** + com-sbc0-hard |
| policies/v95-* | **tracked + pushed** |
| dual-primary/rerun | fair HOLDOUT A/B **36/36 WR 0.72** SOFT=0 BR-both |
| SHIP_READY | fair dual (not perfect-info harness) |
| main ≡ gh-pages | **yes** |

## Shipped
| Rung | vs | A/B | Sum | Commit |
|------|----|----:|----:|--------|
| **v9.5** | freeze v91 | **36/36** | **72** | `2a29964` |

## Intermediate bank (stack toward v9.6)
| Tag | vs v95 id | vs v91 | Notes |
|-----|-----------|--------|-------|
| p_w49_ex_maxedge | 25/26 | 36/37 | Queen climb 20400424@0 |
| **p_w50_ex_egunder** | **25/27** | **36/36** | Ace underclimb 20320640@0; binary legals only |

## Gap to v9.6
vs freeze **v95** need both holdouts **>0.70** (36+/50). Current best bank **27/50 (0.54)** on B. Need ~**+9 net** more pure converts, 0 reverse.

## Next
1. Base `p_w50_ex_egunder`  
2. CF + full-policy force + identity-diff + protect v91 ship  
3. Freeze v9.6 only when A&B >0.70 vs v95  
4. SoftN never

## Evidence
`SHIP_READY.md`, `evolve/dual-primary.json`, `evolve/dual-rerun.json`,  
`NOTE-fair-w49-maxedge.md`, `NOTE-fair-w50-egunder.md`,  
`audit-v95/`, `w49/`, `w50/`
