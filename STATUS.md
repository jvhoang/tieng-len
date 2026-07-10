# Tieng Len — STATUS

**Date:** 2026-07-10  
**Grandmaster v4.0** + **live play-log data collection**

## New: Game History & Play Logs
Every **vs Computer** (and reconfigured) live game is recorded in the browser:

| Field | Purpose |
|-------|---------|
| Full deal hands | Reconstruct / analyze opening |
| Every play & pass | Move-by-move human + AI trail |
| Legal counts + sample | Decision context |
| Human think ms | Tempo / difficulty |
| AI think ms + search stats | Compare AI modes / fallbacks |
| Hand sizes, combos, outcome | Win/loss & trajectory |

- **UI:** title screen → **Game History & Play Logs**
- **Storage:** `localStorage` (GitHub Pages safe, this browser only)
- **Export:** per-game or all-as-JSON for offline deep dives
- Module: `play-log.js` · wired in `controller.js`

### How to collect data
1. Hard-refresh the site (badge should show **logs OK**).
2. Play vs Computer (finish rounds).
3. Open **Game History**, inspect, **Export all JSON**.
4. Share exports for AI improvement analysis.

## Prior gate
v4 vs frozen v3.0: **80.8%** over 1000 single-deal 2p games (`evolve/v4-vs-v30-final.json`).

## Build
Cache-bust: `?v=20260710g` · `TIENLEN_SITE_BUILD=20260710g`

## Tests
```bash
node test/test-play-log.js
node test-engine.js && node test-search.js
```
