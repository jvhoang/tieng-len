# W33 residual under `p_w33_ex_flvolfix` (best A 31 / B 28 / sum **59**)

**Date:** 2026-07-14  
**SoftN:** FORBIDDEN  
**Base:** `p_w33_ex_flvolfix`  
**CF hunt W34 prep:** `{SCRATCH}/w33/cf-convert-hunt-w34.json`

## Headline

| Metric | A | B | A+B |
|--------|--:|--:|----:|
| flvolfix wins | **31/50 (0.62)** | **28/50 (0.56)** | **59** |
| flshort5 wins | 30 | 28 | 58 |
| identity | 25 | 25 | 50 |
| both-lose | **18** | **18** | **36** |
| freeze-id both-lose | **8** | **10** | **18** |
| freeze-id rate | **44%** | **56%** | **50%** |

vs flshort5: pure convert `20310666@1`; **0 reverse**. Freeze-id ~50%.

## Freeze-id both-lose

### A (8)
`20300693@1` · `20340585@0` · `20350558@1` · `20370504@0` · `20410396@1` · `20420369@0` · `20430342@1` · `20470234@0`

### B (10)
`20280748@1` · `20290721@0` · `20310667@0` · `20330613@1` · `20400424@1` · `20410397@1` · `20430343@1` · `20440316@0` · `20450289@1` · `20470235@0`

## W34 force-alt (freeze-id only, base flvolfix)

21 non-pass converts across few seats — **no clean multi-seat orthogonal family**:

| Seat / class | Notes | W34 rank |
|--------------|-------|----------|
| **`20340585@0`** combat residual-max (seq / pair higher) | many CFs; historically reverse-risk vs mulowg type-split | probe only if tightly gated |
| `20370504@0` pair→single / 2-pair | 2-burn toxic | **reject** |
| singles thrash | one-offs | **reject** |
| `20450289@1` seq5→single | opposite gold volume | **reject** |
| `20300693@1` | unique multi / pass-only | W16 **forbidden** |
| `20470234@0` | ctrl2 family | **forbidden** |

## Next
1. Optional W34: **tight residual-max combat** on 20340585 only if firstdiff+holdout B no reverse.  
2. Prefer gold-aligned free-lead (0526/0527 pair ladder control, 0538/0540 trash-first) if new CF appears.  
3. SoftN never.

## Evidence
`firstdiff-w33-flvolfix-residual-bothlose.json`, `{SCRATCH}/w33/cf-convert-hunt-w34.json`
