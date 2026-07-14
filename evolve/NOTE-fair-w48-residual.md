# W48 CF census under freeze v95 (post-ship)

**Base=v95 FREEZE=v95** dual-safe force, B residual 14 seats, SOFT=0 T20.

## Summary
- nConverts=26 · nNonPass=22
- **20320640@1**: no convert under v95 (older twoshed-vs-v91 CF stale)
- SoftN forbidden

## Non-pass convert families
| Seat | Force | Class | Ship note |
|------|-------|-------|-----------|
| 20400424@0 s0 | seq3→seq5/6 | FREE open longer | reverse lore (seqmax6/midshort adjacent) — high risk |
| 20400424@0 s6 | 8H→QD/JH | combat climb | thrash risk without uniqueness |
| 20400424@0 s10 | 2D→AC/AD | combat | **suspect** (curTop=11 Ace — re-verify legality) |
| 20430343@1 | 7S→QS; AS→2/K | high climb / 2 | thrash / forbidden 2 auto |
| 20360532@1 | seq5→pair/seq4/single | FREE shorten | midshort reverse lore |
| 20450289@1 | seq5→3H | FREE trash single | reverse prone |
| 20470235@0 | AC→JC | combat underclimb | candidate if unique structure |

## Next implementer
1. Micro-validate each non-pass convert with firstdiff vs v95 path
2. Prefer uniqueness-gated structure levers only (sbc0 lesson)
3. Ship only both holdouts WR>0.70 vs **freeze v95**

## W48 pairkeep attempt
`p_w48_ex_pairkeep` REJECT — dual-null (see NOTE-fair-w48-pairkeep-reject.md). Live remains v9.5.
