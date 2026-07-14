# W36 — flhidetight (FREE high-pair defer, low-struct blocked)

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w34_ex_seqhi` (A32/B29 sum61)

## Diagnosis
W35 `flhidefer` converted `20290721@0` (QQ→trash) but **B −1** (overfired on low triple multi, etc.).  
Pair max-top / fl_pairlad: **no convert CF** on residual force-alt.  
Tighter gate: only fire when multi pool has **no low/mid structure** (seq top≤8, triple top≤7, pair top≤6, dseq/quad). High QKA + multi high pairs still defer to trash (CF).

## Selected: `p_w36_ex_flhidetight`
FREE · handLen 7–11 · omin≥5 · residual control · ≥2 high pairs (top≥J) · low shed single ≤9 · **no low-struct multi** · search root hard before exact-endgame.

## Fair dual (SOFT=0 T20 BOTH n=50)

| Gate | flhidetight | seqhi |
|------|------------:|------:|
| DEV | **33** | 33 |
| DEV_VAL | **26** | 26 |
| HOLDOUT_A | **34 (0.68)** | 32 |
| HOLDOUT_B | **29 (0.58)** | 29 |
| **A+B sum** | **63** | 61 |
| A Δid / B Δid | **+9 / +4** | +7 / +4 |
| Ship WR>0.70 | **NO** | NO |

### Key seats
| Seat | tight | seqhi | Role |
|------|:-----:|:-----:|------|
| `20290721@0` | **W** | L | hidefer CF convert |
| `20330612@1` | **W** | L | free A gain |
| `20460261@1` | **W** | L | free A gain |
| `20260802@1` | L | W | B free reverse (net B flat) |
| banked mulowg/pairhi/flvol/flshort/seqhi | W | W | kept |

A: **+2 pure, 0 reverse**. B: +1 CF, −1 free (net 0). **Sum +2**.

## Decision
**BANK** as new best (sum 63). **NO SHIP** (A 0.68 / B 0.58; need ~35/50 both).  
A is **+1 from ship bar** absolute wins. Live stays **v9.4**. SoftN dead.

## Evidence
`policies/p_w36_ex_flhidetight-*`, dual JSONs, `firstdiff-w36-flhidetight-vs-seqhi-key.json`
