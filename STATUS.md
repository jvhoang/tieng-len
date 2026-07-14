# STATUS — Fair dual ladder (resumable handoff)

**Updated:** 2026-07-14T20:50Z  
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

## Intermediate bank toward v9.7 (vs freeze **v96**, MS=0)
Identity baseline: **25/25**

| Tag | A | B | Convert |
|-----|--:|--:|---------|
| `p_w76_ex_acetrip_lowopen` | 26 | 25 | 20260801@1 multi-ply |
| `p_w77_ex_fltrash3` | 27 | 25 | 20270774@1 FREE trash3 |
| `p_w78_ex_flseq5shed` | 28 | 25 | 20430342@0 FREE seq5shed |
| `p_w79_ex_comkclimb` | 29 | 25 | 20360531@1 combat K |
| `p_w80_ex_comjmid` | 30 | 25 | 20280747@1 combat J |
| `p_w81_ex_comtclimb` | 30 | 26 | 20280748@0 combat T (B) |
| `p_w82_ex_com6over3` | 30 | 27 | 20300694@0 combat 6 (B) |
| `p_w83_ex_fl9open` | 30 | 28 | 20320640@0 FREE 9 (B) |
| `p_w84_ex_fljopen` | 31 | 28 | 20320639@1 FREE J (A) |
| `p_w85_ex_comtover4` | 32 | 28 | 20330612@0 combat T (A) |
| `p_w86_ex_comaceover9` | 32 | 29 | 20360532@0 combat Ace (B) |
| `p_w87_ex_flseq678` | 33 | 29 | **20340585@0 combat seq678 (A)** |

**Ship bar v9.7:** A≥**36** · B≥**36** → need **+3 A** and **+7 B** pure.  

## Next
1. Dual-safe 1/2-force residual under `p_w87` (many seats 1-force empty → multi-ply)
2. Package pure 0-reverse converts → climb to 36/36 vs freeze v96
3. Freeze **v9.7**, repeat rungs → **v11.0**
4. SoftN never

## Goal end-state
**v11.0** under same gates (or honest residual handoff with machine evidence).  
**Not complete** — intermediate bank only (A33/B29 vs freeze v96).
