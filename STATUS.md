# Tieng Len — STATUS

**Date:** 2026-07-11  
**Grandmaster v6.0** — beats frozen v5.1 at **80.0%** over 300 continuous 2p games

## Goal complete: analyze #14–#42 + beat frozen v5.1 >70%/≥300

### 1. Analysis of play-logs #14–#42 (done)
- Write-up: `evolve/human-vs-v51-analysis-14-42.md`
- 29 games: **human 25 – AI 4** (AI wins: #14, #22, #28, #31)
- Systemic: **0 search modes** logged; **137** fallbacks (`null-free-lead` 58, `cheap-force` 79)
- Free-leads: human multi 58 / single 29; AI multi 40 / single 18
- Median AI leftover on human-win: **6** cards; worst **10** (#35, #39)
- Live path was degraded (controller forced hidden-info → no exploit modes)

### 2. Grandmaster v6.0 vs frozen v5.1 (GATE PASS)

| Metric | Value |
|--------|------:|
| Games | **300** continuous 2p single-deal |
| v6 wins | **240** |
| Rate | **0.80 (80.0%)** |
| Target | **> 0.70** |
| Result | **PASS** |
| Artifact | `evolve/v6-vs-v51-final.json` |

#### Design
- Freeze: `policies/v51-ai.js` + `policies/v51-search.js` (`v5.1-frozen-baseline`)
- Live: `ai.js` id `v6.0-anti-v51-human-lessons` / **Grandmaster v6.0**
- Search: multi free-lead + no lonely low opens (#35); exploit mode `exploit-v51`; shallowSelf BR
- Live controller: hard/grandmaster **2p** uses perfect-info exploit + logs `AI_BUILD`
- Bench: `evolve/bench-v6-vs-v51.js`

### Prior gates
| Matchup | Rate | Games |
|---------|-----:|------:|
| v4 vs frozen v3.0 | 80.8% | 1000 |
| v5.1 vs frozen v4.0 | 80.3% | 1000 |
| **v6.0 vs frozen v5.1** | **80.0%** | **300** |

### Build
- Cache-bust: `?v=20260711a` · `TIENLEN_SITE_BUILD=20260711a`

### Tests
```bash
node test-engine.js && node test-search.js && node test-ai.js
# all green
```
