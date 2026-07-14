# W30 — pair max-top convert on mulowg

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w29_ex_mulowg` (A28/B27 sum55)

## Diagnosis
Mulowg residual: **~63% freeze-identical both-lose**.  
CF hunt: **`20480207@0`** freeze/mulowg min-top pair `55` → force **`66` WIN** (max-top pair).  
egpack (omin≤2): residual firstdiff mass but **holdout reverse** A26/B26 — discard.  
pairhi tight gates dual-null on convert (handLen/omin); loosened gates fire.

## Selected: `p_w30_ex_pairhi`
Combat **pair only**: hard **max-top** among non-2 pairs when pool has distinct tops, before mulowg min-top.  
Gates: curTop≤6, handLen 4–13, omin≥2, gap≤4, best top≤10 (not AA).  
Expert + cheap + BR force. SoftN/pass forbidden. Seq convert 20270774 untouched.

## Fair dual (SOFT=0 T20)

| Gate | pairhi | mulowg | egpack |
|------|-------:|-------:|-------:|
| DEV T20 | **34** | 34 | 34 |
| DEV_VAL | **28 Δ+3** | 28 Δ+3 | 28 Δ+3 |
| HOLDOUT_A | **29 (0.58)** | 28 | 26 |
| HOLDOUT_B | **27 (0.54)** | 27 | 26 |
| **A+B sum** | **56** | 55 | 52 |
| A Δid / B Δid | **+4 / +2** | +3 / +2 | — |
| Ship WR>0.70 | **NO** | NO | NO |

### Key seats
| Seat | pairhi | mulowg | Role |
|------|:------:|:------:|------|
| `20480207@0` | **W** | L | convert confirmed (55→66) |
| `20270774@0` | W | W | mulowg convert kept |
| `20460262@1` | W | W | reverse band kept |
| `20440315@1` | W | W | reverse band kept |

## Dead ends
| Tag | Result |
|-----|--------|
| `p_w30_ex_egpack` | holdout A26/B26 reverse — discard |
| pairhi tight gates | dual-null on convert seed — loosen required |

## Decision
**NO SHIP** (best A 0.58 / B 0.54; need ~35/50).  
**New best package:** `p_w30_ex_pairhi` — **A 29 / B 27 (sum 56)**.  
Live stays **v9.4**. SoftN dead.

## Evidence
`policies/p_w30_ex_pairhi-*`, dual JSONs, `firstdiff-pairhi-key-seeds.json`,  
`NOTE-w30-mulowg-residual.md`, `NOTE-w30-egpack-spec.md`
