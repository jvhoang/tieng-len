# W38 — pairhi_wide (low-min pair max-top gap widen)

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w37_ex_flvol3` (A34/B30 sum64)

## Diagnosis
B loss force-alt (20 seats): combat pair residual with large gap converts:
- **`20410397@1`**: base `55` → force **JJ/QQ** WIN (gap 8–9; pairhi gap≤4 blocked)
- `20320640@1`: force `TT` WIN under base-continuation but dual-still-L (later path)
- AA dual-null on same seat — **cap max top at Q**

Banked pairhi `55→66` has min pair top 5 → stays in normal gap≤4 band.

## Selected: `p_w38_ex_pairhi_wide`
Extend `pickPairHi`:
- Default: gapLim=4, maxTop≤K (unchanged for mid min-pairs)
- **When min pair top ≤2 and curTop ≤2**: gapLim=9, maxTop≤**Q** (not AA)
- Require higher option exists (max ≠ min)

## Fair dual (SOFT=0 T20 BOTH n=50)

| Gate | pairhi_wide | flvol3 |
|------|------------:|-------:|
| DEV | **32** | 33 |
| DEV_VAL | **25** | 25 |
| HOLDOUT_A | **34 (0.68)** | 34 |
| HOLDOUT_B | **31 (0.62)** | 30 |
| **A+B sum** | **65** | 64 |
| A Δid / B Δid | **+9 / +6** | +9 / +5 |
| Ship WR>0.70 | **NO** | NO |

### Key seats
| Seat | wide | flvol3 | Role |
|------|:----:|:------:|------|
| `20410397@1` | **W** | L | B convert |
| `20320640@1` | L | L | dual-null later path |
| banked all | W | W | kept |
| A flips | none | — | **0 reverse** |

## Decision
**BANK** new best **A 34 / B 31 (sum 65)**. **NO SHIP** (0.68 / 0.62).  
A still **+1 to bar**; B still **+4 to bar**. Live **v9.4**. SoftN dead.

## Deferred
- `fl_midshort` (seq5→seq4, 20360532) — path-sensitive; re-probe after bank
- `com_seqlo` (20420370 residual min seq) — reverse-risk vs seqhi

## Evidence
`policies/p_w38_ex_pairhi_wide-*`, dual JSONs, `{SCRATCH}/w38/cf-convert-hunt-B-all-losses.json`
