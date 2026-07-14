# NOTE — W49 `p_w49_ex_maxedge` bank (not v9.6 ship)

**Date:** 2026-07-14  
**SoftN:** FORBIDDEN  
**Live freeze:** still **v9.5 / v95** (shipped fair dual 36/36 vs v91)

## Lever
`com_maxedge` — combat single · unique naked **Queen** climb  
Full-policy force validated: B **`20400424@0`** base 8H → **QD**.

### Gates (fingerprint-locked)
- handLen **=== 10**
- omin **5–7**
- curTop **≤ 2**
- hold **AA + ≥1 two**
- unique max naked rank **=== 9 (Q)**
- max−min naked **≥ 3**
- never force 2
- expert + BR strip + search-root hard (after sbc0)

## Results
| Matchup | A | B | Notes |
|---------|--:|--:|-------|
| vs freeze **v95** (identity bar) | 25 | **26** | pure +1 convert, **0 reverse** |
| vs freeze **v91** (prior ship) | **36** | **37** | protects A36, B+1 → sum **73** |

## Rejected variants
- Loose J/Q + omin 5–8: reverse `20330612@0` via BR thrash (root maxedge null but BR playout rates collapsed)
- pairkeep (W48): dual-null

## Ship decision
**Do not freeze v9.6 yet.** Dual vs previous freeze v95 needs both holdouts WR **>0.70**; single pure convert only reaches 0.52.

## Next
Stack more pure 0-reverse converts on `p_w49_ex_maxedge` base until holdout A/B vs **v95** both clear 0.70, then freeze v9.6 + push.
