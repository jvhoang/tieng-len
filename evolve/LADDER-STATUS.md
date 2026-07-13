# Ladder STATUS — v9.0 → v11.0

Updated: 2026-07-13T04:55Z

## Protocol
N≥50 · WR>0.70 strict · seed 20260711 dual · GM vs GM · ship main+gh-pages

## Completed
| Rung | Dual GM | Ship |
|------|---------|------|
| **v9.1** | **36/50 ×2 (0.72)** vs v90 | main+gh-pages `2e35aac` · freeze `policies/v91-*` |

### v9.1 (shipped — playable live now)
1. **Structure-break singles** — exact-endgame no longer splits pairs when a loose beat ties (user report fixed + tests)
2. **Broader 2-tempo** mid tops J–K when `omin≤3` (flips seed 20510036)
3. leafEval race/trash/ctrl/lead; short multi soft bias

## In progress: v9.2 vs freeze v91
Harder rung: freeze has full v9.1 package.

| Probe | Result |
|-------|--------|
| race/ctrl micro only | 34/50 |
| broader 2-tempo omin≤4 | 34/50 |
| dualSelf=1 + higher budget | 34/50 |
| exact depth 20 | **33/50** (reverted; hung/worse) |
| lockBonus + short multi win | in tree; dual WIP |

Need a **real policy differentiator** vs v91 (loss-mine + flip) before dual will clear 36/50.

## User-facing
Hard-refresh the live site for **Grandmaster v9.1** (title stamp). Structure-break fix is in this build.
