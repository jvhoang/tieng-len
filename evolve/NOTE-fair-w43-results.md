# W43 — lotesh (FREE late high-single → low trash)

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w42_ex_pairshed` (A34/B34 sum68)

## Dual-safe hunt (B under pairshed)
16 B losses → 25 non-pass converts. Star **`20280748@1`**: JH → 4D/5D/7D WIN.

## Diagnosis
- Expert + pickFreeLeadHard: **4D**
- Search `exact-endgame` / soft-root: **JH** (loses)
- Force low single dual-safe WIN under base continuation

## Selected: `p_w43_ex_lotesh`
Gates: FREE, handLen 6–8, omin 4–7, no cheap multi, single J+, low single rank≤5 (3–8), residual 2 or A/K → min-rank low single.  
Hard at search-root **before** exact-endgame (same pattern as flhidetight).

### Reverse fix
First holdout had B reverse `20460262@1` from accidental **pairshed search-root hoist** (AA→3D). Removed; lotesh-only hard root. Re-holdout clean.

## Fair dual (SOFT=0 T20 BOTH n=50)

| Gate | lotesh | pairshed |
|------|-------:|---------:|
| DEV | **32** | 32 |
| DEV_VAL | **25** | 25 |
| HOLDOUT_A | **34 (0.68)** | 34 |
| HOLDOUT_B | **35 (0.70)** | 34 |
| **A+B sum** | **69** | 68 |
| A/B reverse | **0 / 0** | — |
| Ship WR **>**0.70 | **NO** | NO |

B = 0.70 exactly — ship requires **strict >0.70** → still need **36/50** on B and **35/50** on A.

### Key seats
| Seat | lotesh | pairshed | Role |
|------|:------:|:--------:|------|
| `20280748@1` | **W** | L | pure B convert |
| banked all | W | W | kept |

## Decision
**BANK** new best **A 34 / B 35 (sum 69)**. **NO SHIP**.  
A **+1 to bar**; B **+1 to bar** (need 36 for B strict >0.70). Live **v9.4**.

## Evidence
`policies/p_w43_ex_lotesh-*`, holdout/dev JSONs, scratch `w43/`
