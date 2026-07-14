# W40 — brseq3 (FREE BR strip trash singles when low seq3)

**Date:** 2026-07-14  
**SoftN:** dead (rogue `STACK softN14 and softN16 N50` force-killed; no residual process)  
**Base:** `p_w38_ex_pairhi_wide` (A34/B31 sum65)

## Dual-safe hunt (B under pairhi_wide)
Scratch `w40/dual-safe-force-hunt.js` + `cf-dual-safe-B-all.json`:
- 19 B losses → 44 non-pass dual-safe converts (force-alt then live BASE vs v91)
- Families: FREE single→seq3, seq5→seq3, triple→pair, combat singles, …

### Discarded: flmidshort
- Target `20360532@1` FREE seq5→seq3 (force WIN under base continuation)
- Full policy `p_w40_ex_flmidshort` still **L** (path/continuation sensitive)
- Not banked

### Selected: `p_w40_ex_brseq3`
Root cause on dual-safe convert `20260802@1`:
- **Expert** already multi-always picks `3S 4C 5C`
- **BR ON** scores naked trash single `3S` and loses vs freeze v91
- Fix: FREE BR, when cheap seq3 top≤5 exists in multi pool, **strip singles** from BR candidates (keep multi). Before brfltrash/flweakmp so they cannot reintroduce trash.

Gates: FREE, handLen≥11, omin≥4, seq3 top≤5 present.

## Fair dual (SOFT=0 T20 BOTH n=50)

| Gate | brseq3 | pairhi_wide |
|------|-------:|------------:|
| DEV | **32** | 32 |
| DEV_VAL | **25** | 25 |
| HOLDOUT_A | **34 (0.68)** | 34 |
| HOLDOUT_B | **32 (0.64)** | 31 |
| **A+B sum** | **66** | 65 |
| A reverse / B reverse | **0 / 0** | — |
| Ship WR>0.70 | **NO** | NO |

### Key seats
| Seat | brseq3 | pairhi_wide | Role |
|------|:------:|:-----------:|------|
| `20260802@1` | **W** | L | pure B convert |
| `20410397@1` | W | W | banked kept |
| A flips | none | — | **0 reverse** |

## Decision
**BANK** new best **A 34 / B 32 (sum 66)**. **NO SHIP** (0.68 / 0.64).  
A still **+1 to bar**; B still **+3 to bar**. Live **v9.4**. SoftN dead.

## Next levers (dual-safe, convert-first)
- triple→pair FREE (`20370505@0`)
- seq5→seq6 lengthen (`20400424@0`)
- midshort only if full-policy dual W (not force-only)

## Evidence
`policies/p_w40_ex_brseq3-*`,  
`evolve/holdout-{A,B}-ch-t20-w40-brseq3.json`,  
`evolve/dev-ch-t20-w40-brseq3.json`, `devval-ch-t20-w40-brseq3.json`,  
scratch `w40/cf-dual-safe-B-all.json`
