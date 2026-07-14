# W31 — free-lead volume multi over naked low pair

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w30_ex_pairhi` (A29/B27 sum56)

## Diagnosis
Pairhi residual: ~62.5% freeze-id both-lose. FL volume CFs (20310666 33→4-seq, 20390451 33→triple) still freeze-id under pairhi.  
W14 forcedLP strips BR free-lead to low pairs — volume never explored. Expert multi-always uses min-top when top gap >1.

## Selected: `p_w31_ex_flvol`
FREE only: when low naked pair open would fire and volume multi (triple/seq≥3/dseq) exists, hard-pick volume.  
Expert `pickFreeLeadHard` + BR override forcedLP from full multi pool. Combat pairhi/mulowg untouched.

## Fair dual (SOFT=0 T20)

| Gate | flvol | pairhi |
|------|------:|-------:|
| DEV T20 | **33** | 34 |
| DEV_VAL | **28 Δ+3** | 28 Δ+3 |
| HOLDOUT_A | **29 (0.58)** | 29 |
| HOLDOUT_B | **28 (0.56)** | 27 |
| **A+B sum** | **57** | 56 |
| A Δid / B Δid | **+4 / +3** | +4 / +2 |
| Ship WR>0.70 | **NO** | NO |

### Key seats
| Seat | flvol | pairhi | Role |
|------|:-----:|:------:|------|
| `20390451@1` | **W** | L | FL volume convert (33→triple) |
| `20380478@1` | **W** | L | new B flip |
| `20310666@1` | L | L | CF not converted this dual |
| `20370505@0` | L | W | B reverse (−1) |
| `20270774@0` | W | W | mulowg convert kept |
| `20480207@0` | W | W | pairhi convert kept |

## Decision
**NO SHIP** (best A 0.58 / B 0.56; need ~35/50).  
**New best package:** `p_w31_ex_flvol` — **A 29 / B 28 (sum 57)**.  
Live stays **v9.4**. SoftN dead.

## Deferred
`p_w31_ex_flshort5` (mega-seq 7→5, CF 20290720) — opposite length key; do not stack with flvol this wave.

## Evidence
`policies/p_w31_ex_flvol-*`, dual JSONs, `firstdiff-flvol-key-seeds.json`,  
`NOTE-w31-fl-volume.md`, `NOTE-w31-pairhi-residual.md`
