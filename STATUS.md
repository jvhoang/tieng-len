# STATUS — Fair dual ladder (resumable handoff)

**Updated:** 2026-07-14T15:38Z  
**Live / freeze:** **v9.7** SHIPPED  
**SoftN:** **DEAD**  
**Ship protocol:** **MS=0 TRIALS=20 SOFT=0** dual-rerun both holdouts  

## Shipped
| Rung | vs freeze | A | B | Protocol |
|------|-----------|--:|--:|----------|
| v9.5 | v91 | 36 | 36 | T20 |
| v9.6 | v95 | 36 | 36 | MS=0 |
| **v9.7** | **v96** | **36** | **36** | **MS=0** dual-rerun |

Live `AI_BUILD.id=v9.7` · `policies/v97-*` ≡ `ai.js`/`search.js`  
Stack: pure convert-first 0-reverse from identity 25/25 → 36/36  
Final convert: `fl_7open` (20400424@1) on bank `p_w97_ex_fl7open`  
Evidence: `evolve/dual-primary.json`, `dual-rerun.json`, `SHIP_READY.md`  

## Intermediate bank (post v9.7 → v9.8)
Identity baseline vs freeze **v97**: not yet run.  

## Next
1. Identity dual vs freeze v97 (expect ~25/25)
2. Pure 0-reverse converts toward **v9.8** (36/36 vs freeze v97)
3. Continue rungs → **v11.0**
4. SoftN never

## Goal end-state
**v11.0** under same gates (or honest residual handoff with machine evidence).  
**In progress** — v9.7 shipped; ladder continues.
