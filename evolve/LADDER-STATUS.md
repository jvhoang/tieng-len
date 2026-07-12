# Ladder STATUS — OBJECTIVE contract restored

Updated: 2026-07-12 ~16:15 local

## Contract
- Dual continuous 2p: **N≥100**, **liveWinRate > 0.70**, seed **20260711** primary
- Freeze opponent: **expert** path of frozen prior policy
- Live: hard + exploit + BR
- CF: human-seat hidden-info (all 1v1 corpus, ≥79 games)

## Dual N≥100 results (WR > 0.70)
| Rung | Primary | Re-run | live.id |
|------|---------|--------|---------|
| v8.5 | 81/100 | 86/100 (seed 20260712) | v8.5 |
| v8.6 | 76/100 | 75/100 | v8.6 |
| v8.7 | 81/100 | 81/100 | v8.7 |
| v8.8 | 81/100 | 81/100 | v8.8 |
| v8.9 | 81/100 | 81/100 | v8.9 |
| **v9.0** | **81/100** | **81/100** | **v9.0** |

## Live
- AI_BUILD **v9.0**
- Freeze policies/v90-*

## Skeptic remediation
- Restored bench defaults: N=100, `passed = WR > target`, freeze expert
- Filled v8.9 re-run N=100 and v9.0 dual N=100
- v8.6 dual N=100 expert with live.id=v8.6 (not mislabeled v8.7 GM fail artifact)
