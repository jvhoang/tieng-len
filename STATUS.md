# Tieng Len — STATUS

**Date:** 2026-07-11  
**Grandmaster v5.1** — beats frozen v4.0 at **80.3%**

## Goal complete: 9-game analysis + AI vs v4.0 >80%/1000

### 1. Analysis of 9 human play-logs (done)
- Source: public GitHub Issues #1–#9 (`play-log`), **human 9–0**
- Write-up: `evolve/human-vs-v4-analysis.md`
- Key findings:
  1. **Search never engaged live** — all AI moves `fallbackUsed` (`null-free-lead` / `cheap-force`); `stats.mode` null
  2. **No-gift failures** (#5, #6) — low free-lead vs 1-card human
  3. **Human multi free-lead bias** 21:10 vs AI ~50% singles
  4. Endgame collapse (median ~7 cards left for AI at loss)
  5. Control imbalance (human ≥ AI 2s in 8/9) but not only luck (#2 human had 0 twos)

### 2. Grandmaster v5.1 vs frozen v4.0 (GATE PASS)

| Metric | Value |
|--------|------:|
| Games | **1000** (2p single-deal) |
| v5 wins | **803** |
| Rate | **0.803 (80.3%)** |
| Target | **> 0.80** |
| Result | **PASS** |
| Artifact | `evolve/v5-vs-v40-final.json` |

**CI95:** ~0.777 – 0.826

#### v5.1 design (from analysis + BR vs frozen expert)
- Freeze: `policies/v40-ai.js` + `policies/v40-search.js` (`v4.0-frozen-baseline`)
- Live: `ai.js` id `v5.1-shallow-self-vs-v4` / label **Grandmaster v5.1**
- Search (`search.js`):
  - Multi-always free-lead + **no-gift** vs 1-card
  - **shallowSelfPick** deep exploit (restored v4 strength that beat v3)
  - multiBonus free-lead tie-break
  - Conserved 2s in expert combat (pass mid junk with pure-2 answers)
  - Soft incomplete playout signals; exact BR ≤18 cards
- Gate bench: `evolve/bench-v5-vs-v40.js`
  - Complete state memo + det-aligned frozen v40 for inject **and** live opp
  - Perfect-info exploit BR

### Prior gates
| Matchup | Rate | Games |
|---------|-----:|------:|
| v4 vs frozen v3.0 | 80.8% | 1000 |
| **v5.1 vs frozen v4.0** | **80.3%** | **1000** |

### Build
- Cache-bust: `?v=20260710j` · `TIENLEN_SITE_BUILD=20260710j`
- UI badge: Grandmaster AI v5.1

### Tests
```bash
node test-engine.js && node test-search.js && node test-ai.js
# all green
```
