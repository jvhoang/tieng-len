# W41 — tripair (FREE low dual-triple → pair split)

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w40_ex_brseq3` (A34/B32 sum66)

## Dual-safe hunt (B under brseq3)
Scratch `w41/cf-dual-safe-B-all.json`: 18 B losses → 39 non-pass converts.  
Top structured families:
- FREE **triple→pair** `20370505@0` (n=7)
- FREE seq5→seq6 `20400424@0` (n=4)
- FREE seq5→seq3 midshort (force-only risk)

Gold residual (scratch `w41/NOTE-gold-residual-themes.md`): rank **fl_tripair** first.

## Discarded: seqmax6
- Expert/BR lengthen seq5→seq6 converts `20400424@0` in micro
- Full holdout: **B 33 / A 32** (−2 A reverse: `20410396@0`, `20370504@1`)
- Tight BR-only gates either reversed or nullified convert
- **Not banked**

## Selected: `p_w41_ex_tripair`
FREE when ≥2 distinct low triple ranks (top≤4): play min-top **pair that splits** a triple (same rank), before flvol volume-dumps the triple.

Gates: handLen 8–12, omin≥5, pair top≤4, no 2/bomb.

Micro dual SOFT=0:
| Seat | base | tripair |
|------|:----:|:-------:|
| `20370505@0` | L | **W** |
| `20370504@0/1` A twins | L/W | L/W flat |
| `20260802@1` brseq3 | W | W |
| `20410397@1` pairhi | W | W |

## Fair dual (SOFT=0 T20 BOTH n=50)

| Gate | tripair | brseq3 |
|------|--------:|-------:|
| DEV | **32** | 32 |
| DEV_VAL | **25** | 25 |
| HOLDOUT_A | **34 (0.68)** | 34 |
| HOLDOUT_B | **33 (0.66)** | 32 |
| **A+B sum** | **67** | 66 |
| A/B reverse | **0 / 0** | — |
| Ship WR>0.70 | **NO** | NO |

### Key seats
| Seat | tripair | brseq3 | Role |
|------|:-------:|:------:|------|
| `20370505@0` | **W** | L | pure B convert |
| banked all | W | W | kept |

## Decision
**BANK** new best **A 34 / B 33 (sum 67)**. **NO SHIP** (0.68 / 0.66).  
A **+1 to bar**; B **+2 to bar**. Live **v9.4**. SoftN dead.

## Next
W42 dual-safe under tripair: residual B (+2) / A (+1). Avoid unguarded seqmax6/midshort/SoftN.

## Evidence
`policies/p_w41_ex_tripair-*`, holdout/dev JSONs, scratch `w41/cf-dual-safe-B-all.json`
