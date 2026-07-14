# W34 — combat seq residual-max adjacent (`seqhi`)

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w33_ex_flvolfix` (A31/B28 sum59)

## Diagnosis
Freeze-id force-alt star: **`20340585@0` s1** combat seq curTop=2.  
Base/mulowg-band idle (minTop rank=5 > 3) → expert min-bias plays **678** and loses; force **789** wins.

pairhi does not cover: s5 99→KK blocked by pairhi `gap>4`. Deferred.

Ungated max-top among all seqs picked **89T** and dual-lost. **Adjacent band only** (max = minTop+1).

## Selected: `p_w34_ex_seqhi`
Combat **seq** only when:
- `curTop ≤ 3`, handLen 8–13, omin≥4, residual 2/control  
- ≥2 same-length seq answers, distinct tops  
- **minTop > 3** (mulowg owns ≤3)  
- pick **max top in [minTop, minTop+1]** only  
- expert + BR strip  

## Fair dual (SOFT=0 T20 BOTH n=50)

| Gate | seqhi | flvolfix |
|------|------:|----------:|
| DEV | **33** | 33 |
| DEV_VAL | **26** | 27 |
| HOLDOUT_A | **32 (0.64)** | 31 |
| HOLDOUT_B | **29 (0.58)** | 28 |
| **A+B sum** | **61** | 59 |
| A Δid / B Δid | **+7 / +4** | +6 / +3 |
| Ship WR>0.70 | **NO** | NO |

### Key seats
| Seat | seqhi | flvolfix | Role |
|------|:-----:|:---------:|------|
| `20340585@0` | **W** | L | seqhi convert 678→789 |
| `20470235@1` | **W** | L | free B gain |
| banked mulowg/pairhi/flvol/flshort | W | W | kept |

A: +1 pure convert, **0 reverse**. B: +1 free, **0 reverse**.

## Decision
**NO SHIP** (A 0.64 / B 0.58; need ~35/50).  
**New best:** `p_w34_ex_seqhi` — **A 32 / B 29 (sum 61)**.  
Live **v9.4**. SoftN dead.

## Gold subagent themes (next)
`fl_pairlad` (0526/0527), `fl_hidefer` (0538/0540), `com_minsbc` — see `{SCRATCH}/w34/NOTE-gold-playlog-themes.md`.

## Evidence
`policies/p_w34_ex_seqhi-*`, dual JSONs, `firstdiff-w34-seqhi-vs-flvolfix-key.json`
