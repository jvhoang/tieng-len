# SHIP READY — Grandmaster v9.2

**Shipped:** 2026-07-13T22:46Z  
**Commit:** a7416c6 + evidence follow-up  
**Branches:** main + gh-pages

## Dual gate (strict WR > 0.70)
| | Seed | Wins | WR |
|--|-----:|-----:|---:|
| Primary | 20260711 | 40/50 | **0.80** |
| Re-run | 20260712 | 41/50 | **0.82** |

vs freeze **v9.1**, GM vs GM, BR model = freeze-GM low-budget 40ms.

## Contents
- STACK search (exact free-lead deeper + softSamples force N=10)
- Dual BR model: freeze grandmaster 40ms (not expert-cheap)
- Freeze snapshots: `policies/v92-ai.js`, `policies/v92-search.js`

## Live test
Hard-refresh the GitHub Pages site to load new AI.
