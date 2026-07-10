# Tieng Len — STATUS

**Date:** 2026-07-10  
**Grandmaster v4.0** + **live play-log data collection**

## New: Game History & Play Logs (public auto-sync)
Every finished **vs Computer** game is recorded and can **auto-publish to public GitHub Issues**.

| Field | Purpose |
|-------|---------|
| Full deal hands | Reconstruct / analyze opening |
| Every play & pass | Move-by-move human + AI trail |
| Legal counts + sample | Decision context |
| Human think ms | Tempo / difficulty |
| AI think ms + search stats | Compare AI modes / fallbacks |
| Hand sizes, combos, outcome | Win/loss & trajectory |

- **UI:** title screen → **Game History & Play Logs**
- **Local cache:** `localStorage` (crash safety)
- **Public remote:** GitHub Issues label `play-log` on `jvhoang/tieng-len` (auto on game end once a PAT is saved)
- **Read:** public (no token) · **Write:** one-time fine-grained PAT (Issues R/W)
- Module: `play-log.js` · wired in `controller.js`

### Enable automatic public logs (once)
1. Hard-refresh the site (`?v=20260710h`, badge **logs OK**).
2. Open **Game History**.
3. Create a fine-grained PAT: GitHub → Settings → Developer settings → Fine-grained tokens → only **tieng-len** → **Issues: Read and write**.
4. Paste token → **Save & enable auto-publish** → **Test connection**.
5. Play games; each finish uploads as a public issue. No export needed.
6. Browse: `https://github.com/jvhoang/tieng-len/issues?q=label%3Aplay-log`

## Prior gate
v4 vs frozen v3.0: **80.8%** over 1000 single-deal 2p games (`evolve/v4-vs-v30-final.json`).

## Build
Cache-bust: `?v=20260710g` · `TIENLEN_SITE_BUILD=20260710g`

## Tests
```bash
node test/test-play-log.js
node test-engine.js && node test-search.js
```
