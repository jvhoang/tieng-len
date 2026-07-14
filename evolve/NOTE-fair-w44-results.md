# W44 — pairseq (low pair → seq3 **with residual quad**)

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w43_ex_lotesh` (A34/B35 sum69)

## Dual-safe hunt
- A star **`20320639@0`**: FREE 33 → 345 dual-safe WIN (force)
- First holdout **without** quad gate: reverse thrash A33/B33 (path-sensitive family)
- **Tight gate:** require hand rank count ≥4 (quad residual) — convert has four 7s; reverse seats lack quad

## Selected: `p_w44_ex_pairseq`
FREE, handLen≥12, omin≥10, pair top≤3, seq3 top≤5, **hasQuad**, not tripair (≥2 low triples) → min-top seq3.  
Search-root hard after tripair protect.

## Fair dual (SOFT=0 T20 BOTH n=50)

| Gate | pairseq | lotesh |
|------|--------:|-------:|
| DEV | **32** | 32 |
| DEV_VAL | **25** | 25 |
| HOLDOUT_A | **35 (0.70)** | 34 |
| HOLDOUT_B | **35 (0.70)** | 35 |
| **A+B sum** | **70** | 69 |
| A/B reverse | **0 / 0** | — |
| Ship WR **>**0.70 | **NO** | NO |

Both at **0.70** exactly — ship needs **strict >0.70** → need **36/50** each.

### Key seats
| Seat | pairseq | lotesh | Role |
|------|:-------:|:------:|------|
| `20320639@0` | **W** | L | pure A convert |
| banked all | W | W | kept |

## Decision
**BANK** new best **A 35 / B 35 (sum 70)**. **NO SHIP**.  
A **+1 to bar (need 36)**; B **+1 to bar (need 36)**. Live **v9.4**.

## Evidence
`policies/p_w44_ex_pairseq-*`, holdout/dev JSONs, scratch `w44/`
