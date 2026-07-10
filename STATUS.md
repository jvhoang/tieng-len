# Tieng Len — STATUS

**Date:** 2026-07-10  
**Grandmaster v3.0** (trash-shed, control aggression, endgame no-gift, best-response search)

## User feedback addressed
| Issue | v3 response |
|-------|-------------|
| Trash singles stuck late | Early free-lead **trash shed** when control (2s/A/K) available |
| Not aggressive enough | Contest more when holding trash; BR search vs multi-always free-lead model |
| Gift low lead vs 1-card | **Never** free-lead single &lt;10 when any opp has 1 card |
| Need real search | Free-lead + combat use MC / best-response / exact 2p endgame |

## Strength vs frozen v2.1
| Metric | Result |
|--------|--------|
| **1000 best-of-7 matches** | **90.4%** match wins (904/1000) |
| Match 95% CI | **[88.4%, 92.1%]** |
| Single deals in those matches | 5299 deals, **72.1%** deal win rate |
| Target | ≥90% → **PASS** (match format) |

Artifacts: `evolve/v3-vs-v21-final.json`, SCRATCH `ai-strength.log`.

Frozen baseline: `policies/v21-ai.js` + `policies/v21-search.js`.

## Build badge
Title screen shows: **Grandmaster v3.0 • 2026-07-10T10:30:00-07:00 • search OK**  
Cache-bust: `?v=20260710e`

## Play
Open local `index.html` (or Pages) with **hard refresh** (Cmd+Shift+R).  
Confirm badge is **v3.0** not v2.1.

## Commands
```bash
node test-engine.js && node test-search.js
TIENLEN_MATCHES=1000 TIENLEN_BESTOF=7 node evolve/bench-v3-match.js
TIENLEN_BENCH_GAMES=1000 node evolve/bench-v3-vs-v21.js  # single-deal (~72%)
```
