# W45 — twoshed (double-2 + naked low pair → single)

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w44_ex_pairseq` (A35/B35 sum70)

## Dual-safe hunt
A residual star **`20370504@0`**: FREE 33 → 3H dual-safe WIN under pairseq base.  
Gate uniqueness: **twos≥2** + naked pair (rank count exactly 2) + no seq3 — 0 prior A-win seats share gate.

## Reverse fix
First holdout: B reverse `20390451@1` (three 2s + **triple** 333 split to 3S).  
Fixed: require `byR[rank] === 2` (naked pair only — never split triples).

## Selected: `p_w45_ex_twoshed`
FREE, handLen≥12, omin≥10, twos≥2, naked low pair top≤3 (count exactly 2), no seq3 top≤5 → min-suit single of that rank.  
Search-root hard after tripair, before pairseq.

## Fair dual (SOFT=0 T20 BOTH n=50)

| Gate | twoshed | pairseq |
|------|--------:|--------:|
| DEV | **32** | 32 |
| DEV_VAL | **25** | 25 |
| HOLDOUT_A | **36 (0.72)** | 35 |
| HOLDOUT_B | **35 (0.70)** | 35 |
| **A+B sum** | **71** | 70 |
| A/B reverse | **0 / 0** | — |
| Ship WR **>**0.70 | **A YES / B NO** | NO |

### Key seats
| Seat | twoshed | pairseq | Role |
|------|:-------:|:-------:|------|
| `20370504@0` | **W** | L | pure A convert |
| banked all | W | W | kept |

## Decision
**BANK** new best **A 36 / B 35 (sum 71)**.  
**A ships** (0.72 > 0.70). **B still 0.70** — need **36/50** for strict >0.70.  
Live **v9.4** (no promote until dual ship). SoftN dead.

## Next W46
B residual dual-safe force for pure +1 (combat multi-seat thrash risk high).  
Ship only both A/B WR **>**0.70 + Δid≥+2.

## Evidence
`policies/p_w45_ex_twoshed-*`, holdout/dev JSONs, scratch `w45/`
