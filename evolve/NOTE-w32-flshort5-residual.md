# W32 residual under `p_w32_ex_flshort5` (best A 30 / B 28 / sum **58**)

**Date:** 2026-07-14  
**SoftN:** FORBIDDEN  
**Base:** `p_w32_ex_flshort5`  
**Identity:** `holdout-{A,B}-id-t20-w24-climbtax.json` (25/25)

## Headline

| Metric | A | B | A+B |
|--------|--:|--:|----:|
| flshort5 wins | **30/50 (0.60)** | **28/50 (0.56)** | **58** |
| flvol wins | 29 | 28 | 57 |
| identity | 25 | 25 | 50 |
| both-lose | **19** | **18** | **37** |
| freeze-id both-lose | **9** | **10** | **19** |
| freeze-id rate of both-lose | **47%** | **56%** | **51%** |
| diverged-still-loss | **10** | **8** | **18** |

vs flvol: pure convert `20290720@1` only; **0 reverse**. Freeze-id rate dropped from ~62% (pairhi era) to ~51% — progress, still majority skill hole is freeze-identical path.

## Freeze-id both-lose (skill-class focus)

### A (9)
`20300693@1` · `20310666@1` · `20340585@0` · `20350558@1` · `20370504@0` · `20410396@1` · `20420369@0` · `20430342@1` · `20470234@0`

### B (10)
`20280748@1` · `20290721@0` · `20310667@0` · `20330613@1` · `20400424@1` · `20410397@1` · `20430343@1` · `20440316@0` · `20450289@1` · `20470235@0`

### Known CF status
| Seat | Prior CF | Status under flshort5 |
|------|----------|------------------------|
| `20290720@1` | mega7→5 WIN | **converted** (holdout A W) |
| `20310666@1` | pair33→4-seq WIN (force-alt) | **still freeze-id L** (flvol dual-null on seat) |
| `20300693@1` | unique multi / pass only | forbidden (W16) |
| `20470234@0` | ctrl2 family | forbidden |

## Diverged-still-loss notes
- Several FL flshort side-effects (6→5 / 10→5) still lose — path moved, win not.
- Combat multi tax / single war residual remains.

## Next convert-first (W33 candidates)
1. **Re-hunt force-alt** on freeze-id A+B only (prefer multi-seat family).  
2. Reopen **volume dual-fix** for `20310666` (why flvol dual-nulls).  
3. Avoid SoftN / pass / ctrl2hi / residual-max combat reheat.

## Evidence
`firstdiff-w32-flshort5-residual-holdout{A,B}.json`, `/tmp/w32_both{A,B}.txt`
