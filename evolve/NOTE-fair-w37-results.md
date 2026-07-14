# W37 — flvol3 (3-seq volume when maxSeqLen===3)

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w36_ex_flhidetight` (A34/B29 sum63)

## Diagnosis
B-focused force-alt: star **`20350559@0`** FREE `33` → **3-seq 345** WIN.  
flvolfix only allowed seq when maxSeq===4; this seat maxSeq===3 only → dual-null.  
Expand: maxSeq===3 → allow 3-seq volume (parallel to 4-seq rule).

## Selected: `p_w37_ex_flvol3`
In `flVolPool` seq branch:
- `p.length===4 && maxSeqLen===4` (W33, keep)
- **`p.length===3 && maxSeqLen===3` (W37 new)**  
Still: no maxSeq≥5 (flshort/multi-always). Triple/dseq unchanged.

## Fair dual (SOFT=0 T20 BOTH n=50)

| Gate | flvol3 | flhidetight |
|------|-------:|------------:|
| DEV | **33** | 33 |
| DEV_VAL | **25** | 26 |
| HOLDOUT_A | **34 (0.68)** | 34 |
| HOLDOUT_B | **30 (0.60)** | 29 |
| **A+B sum** | **64** | 63 |
| A Δid / B Δid | **+9 / +5** | +9 / +4 |
| Ship WR>0.70 | **NO** | NO |

### Key seats
| Seat | flvol3 | tight | Role |
|------|:------:|:-----:|------|
| `20350559@0` | **W** | L | B convert 33→345 |
| banked all | W | W | kept |
| A flips | none | — | **0 reverse** |

## Decision
**BANK** new best **A 34 / B 30 (sum 64)**. **NO SHIP** (0.68 / 0.60).  
A still **+1 from 0.70**; B still **+5 from 0.70**. Live **v9.4**. SoftN dead.

## Evidence
`policies/p_w37_ex_flvol3-*`, dual JSONs, `{SCRATCH}/w37/cf-convert-hunt-B-all.json`
