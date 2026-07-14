# W42 — pairshed (FREE high pair K+ → low single)

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w41_ex_tripair` (A34/B33 sum67)

## Dual-safe hunt (B under tripair)
Scratch `w42/cf-dual-safe-B-all.json`: 17 B losses → 26 non-pass converts.  
Top FREE families still open:
- **pair→single** `20480208@0` (KK→3C)
- high single→low `20280748@1` (lotesh)
- seq5→seq6 / midshort (prior reverse/path-null)

Gold residual ranked **fl_pairshed** first.

## Diagnosis `20480208@0`
- hand: 2s + 345 + KK + mid seq material  
- **hidefer** blocked (345 is low struct)  
- **brfltrash** misses (345 not analyzeHand.trash)  
- **brseq3** multi-only strips singles → BR scores **KK**  
- Expert prefers high seq; force `3C`/`4C` dual-safe WIN

## Selected: `p_w42_ex_pairshed`
FREE when twos≥1, pair top≥K, single rank≤4 (3–7), handLen 9–12, omin≥8, no low triple:  
pick min-rank low single (expert + BR restore after multi-only).

## Fair dual (SOFT=0 T20 BOTH n=50)

| Gate | pairshed | tripair |
|------|---------:|--------:|
| DEV | **32** | 32 |
| DEV_VAL | **25** | 25 |
| HOLDOUT_A | **34 (0.68)** | 34 |
| HOLDOUT_B | **34 (0.68)** | 33 |
| **A+B sum** | **68** | 67 |
| A/B reverse | **0 / 0** | — |
| Ship WR>0.70 | **NO** | NO |

### Key seats
| Seat | pairshed | tripair | Role |
|------|:--------:|:-------:|------|
| `20480208@0` | **W** | L | pure B convert |
| banked all | W | W | kept |

## Decision
**BANK** new best **A 34 / B 34 (sum 68)**. **NO SHIP** (0.68 / 0.68).  
A **+1 to bar**; B **+1 to bar**. Live **v9.4**. SoftN dead.

## Deferred
- `fl_lotesh` (`20280748@1`) for W43  
- seqmax6 / midshort remain discard/force-only

## Evidence
`policies/p_w42_ex_pairshed-*`, holdout/dev JSONs, scratch `w42/`
