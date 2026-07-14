# W29 — band-gated mulow (keep convert, block reverse)

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w28_ex_mulow` / compare `p_w26_ex_seqclimb`

## Diagnosis
Mulow converts `20270774@0` (minTop rank **2**) but reverses:
- B `20460262@1`: `8H9STH` → low `567` (minTop **5**) W→L  
- A `20440315@1`: high mid seq → low mid (minTop **5**) W→L  

`mulow_rg` residualBetter gate: **nDiv=0** on convert seed — kills convert.  
Band gate **minTop rank ≤ 3** (card top ≤ 6): keeps convert, blocks reverse band.

## Selected: `p_w29_ex_mulowg`
Same min-top multi force as mulow, fire only if `topRank(minPick) ≤ 3`.  
Expert + BR triple pattern. SoftN/pass forbidden.

## Fair dual (SOFT=0 T20)

| Gate | mulowg | mulow | seqclimb |
|------|-------:|------:|---------:|
| DEV T20 | **34** | 33 | 34 |
| DEV_VAL | **28 Δ+3** | 29 Δ+4 | 28 Δ+3 |
| HOLDOUT_A | **28** | 28 | 27 |
| HOLDOUT_B | **27** | 26 | 27 |
| **A+B sum** | **55** | 54 | 54 |
| A Δid / B Δid | **+3 / +2** | +3 / +1 | +2 / +2 |
| Ship WR>0.70 | **NO** | NO | NO |

### Key seats
| Seat | mulowg | mulow | seq |
|------|:------:|:-----:|:---:|
| `20270774@0` convert | **W** | W | L |
| `20460262@1` reverse B | **W** | L | W |
| `20440315@1` reverse A | **W** | L | W |
| `20340585@0` suit flip | L | W | L |

## Dead ends
| Tag | Note |
|-----|------|
| `p_w29_ex_mulow_rg` | residualBetter kills convert nDiv=0 |
| egpack design | deferred; orthogonal endgame for later |

## Decision
**NO SHIP** (best A 0.56 / B 0.54; need ~35/50).  
**New best package:** `p_w29_ex_mulowg` — **A 28 / B 27 (sum 55)**.  
Live stays **v9.4**. SoftN dead.

## Evidence
`policies/p_w29_ex_mulowg-*`, dual JSONs, `firstdiff-mulowg-key-seeds.json`,  
`NOTE-w29-mulow-residual.md`, `NOTE-w29-gold-endgame.md`
