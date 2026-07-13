# Ladder restart dual trajectory (2026-07-13)

## Protocol
GM live (elevated budget/BR/exploit) vs freeze v91 GM · seed0 20260711 · N=50 · target WR>0.70  
**GitHub ship:** only after dual pass (freeze + push main + gh-pages)

## N=20 gold-layer map
| Layer | WR |
|-------|---:|
| pure-v91 | 0.80 |
| series-1 | 0.75 |
| series-2 | 0.70 |
| gold-fix | 0.65 |
| series-3 / playlog-align | 0.50 |

## N=50 gates
| Build | WR | Notes |
|-------|---:|-------|
| series-1 structure gold | **0.56** | N=20 over-optimistic |
| pure-v91 maxBudget MS280 BR96 | **0.68 (34/50)** | **best** |
| pure-v91 ultraBudget MS350 BR128 | **0.68 (34/50)** | no gain |
| multiTie0.008+dualSelf+maxBudget | 0.66 | hurt |
| residual multiTie+maxBudget | 0.66 | hurt |

## Ceiling
Budget alone tops ~**0.68** same-policy. Need **+2 wins** from a real policy edge that does not dual-regress (series-2+ bulk failed).

## Playlogs
`~/Downloads/tienlen-playlogs-1783931122937.json` · pure-v91 expert match ~0.65 · see NOTE-ladder-v92-restart-analysis.md

## Next levers
1. Seed+1 re-run maxBudget for variance
2. LeafEval / race micro one-at-a-time with seed-duel ≥2 loss flips
3. Surgical gold series-1 only after dual ≥0.70 pure path
