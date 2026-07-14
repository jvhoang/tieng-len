# STATUS — Fair dual ladder (resumable handoff)

**Updated:** 2026-07-14T10:17Z  
**Live / freeze:** **v9.5** ≡ `policies/v95-*` ≡ live (`AI_BUILD` + `pickComSbc0`)  
**SoftN:** **DEAD**  
**Git:** main ≡ gh-pages

## Skeptic gaps — CLOSED
Machine proof: `{SCRATCH}/skeptic-close/GAPS-CLOSED.json` (`PASS: true`)
- live v9.5 + pickComSbc0 + com-sbc0-hard
- policies/v95-* tracked/pushed
- dual-primary/rerun fair 36/36 WR 0.72 SOFT=0 BR-both
- SHIP_READY fair dual
- main ≡ gh-pages

## Shipped fair dual
| Rung | vs | A/B | Sum |
|------|----|----:|----:|
| **v9.5** | v91 | **36/36** | **72** |

## Stack toward v9.6 (vs freeze **v95** identity 25/25)
| Tag | B vs v95 id | vs v91 | Convert |
|-----|------------:|--------|---------|
| maxedge | 26 | 36/37 | 20400424@0 QD |
| egunder | 27 | 36/36 | 20320640@0 QC |
| seqhires | 28 | 36/36 | 20410397@0 9TJ |
| **seqopen** | **29** | **36/36** | 20500154@1 max seq6 |

**Gap to v9.6:** need A&B ≥36 vs **v95**. Currently **B 29/50 (0.58)**. ~**+7 pure**.

## Next
1. Base `p_w52_ex_seqopen`  
2. More pure structure converts  
3. Freeze v9.6 only at dual >0.70 vs v95  
4. SoftN never
