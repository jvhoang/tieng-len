# W32 — free-lead mega-seq shorter (flshort5) on flvol base

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w31_ex_flvol` (A29/B28 sum57)

## Diagnosis
After flvol, residual FL_shorter CF still open: freeze mega **7-seq** on `20290720@1` loses; force **5-seq** wins under freeze continuation. Gold 0517/0545 agree (shorter residual package). Opposite length key from flvol — stack only after flvol banked.

## Selected: `p_w32_ex_flshort5`
FREE only: when seq≥7 and seq==5 both legal, hard-pick best len-5 (min-top, then lower SBC).  
Expert `pickFreeLeadHard` **before** flvol (flvol volume re-picks mega). BR strip to short5 pool first.  
**No SBC hard gate** — short splits of a long run score SBC~24 on CF; gating dual-nulls.

## Fair dual (SOFT=0 T20, BOTH_SEATS, GAMES=25 → n=50)

| Gate | flshort5 | flvol |
|------|---------:|------:|
| DEV T20 | **34** | 33 |
| DEV_VAL | **27** | 28 |
| HOLDOUT_A | **30 (0.60)** | 29 |
| HOLDOUT_B | **28 (0.56)** | 28 |
| **A+B sum** | **58** | 57 |
| A Δid / B Δid | **+5 / +3** | +4 / +3 |
| Ship WR>0.70 | **NO** | NO |

### Key seats
| Seat | flshort5 | flvol | Role |
|------|:--------:|:-----:|------|
| `20290720@1` | **W** | L | FL shorter convert (7→5) |
| `20390451@1` | W | W | flvol convert kept |
| `20380478@1` | W | W | flvol B flip kept |
| `20270774@0` | W | W | mulowg convert kept |
| `20480207@0` | W | W | pairhi convert kept |
| `20310666@1` | L | L | volume CF still open |

A: +1 pure convert, **0 reverse**. B: identical 28.

## Decision
**NO SHIP** (best A 0.60 / B 0.56; need ~35/50).  
**New best package:** `p_w32_ex_flshort5` — **A 30 / B 28 (sum 58)**.  
Live stays **v9.4**. SoftN dead.

## Deferred
- `20310666@1` still both-lose (volume CF not dual-converted under flvol path on that seat)  
- egpack / residual combat reheat — no new CF this wave  
- SoftN — never

## Evidence
`policies/p_w32_ex_flshort5-*`, dual JSONs, `firstdiff-w32-flshort5-vs-flvol-key.json`
