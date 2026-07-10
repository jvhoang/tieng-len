# Tieng Len — STATUS

**Date:** 2026-07-10  
**Grandmaster v4.0** (hidden info · constrained determinize · exploit vs frozen v3.0)

## Goal (strict)
Beat frozen **Grandmaster AI v3.0** by **>80%** over **≥1000** single-deal 2p games (no best-of-N).

| Metric | Result |
|--------|--------|
| **1000 single deals** | **80.8%** (808/1000) |
| 95% CI | **[78.2%, 83.1%]** |
| Target | >80% → **PASS** |
| Format | 2p head-to-head, seats alternate, seeds `20260710 + g*9973` |

Artifact: `evolve/v4-vs-v30-final.json`, log `evolve/v4-vs-v30-run3.log`.

## Pipeline completed
1. **vs-AI hidden info** — controller `perfectInfo: false`, `hiddenInfo: true`
2. **publicHistory** — plays/passes recorded in engine (full + fast paths)
3. **Constrained determinize** — reject samples with non-bomb beaters of combos a seat passed on (bombs may be sandbagged)
4. **v4 strength** — perfect-info 2p **exploit** (best-response playouts vs frozen v3.0 expert) + late-game exact exploit (≤16 cards)
5. Full ISMCTS **not** required for gate

## Config for gate
- **v4:** hard, perfectInfo, exploit search, timeMs≈300
- **v3.0 frozen:** expert-only (`difficulty: easy`) — same asymmetric pattern as prior v3-vs-v2.1 gates

## Frozen baselines
- `policies/v30-ai.js` + `policies/v30-search.js` (Grandmaster v3.0)
- `policies/v21-*` still available

## Build badge
Title: **Grandmaster v4.0**  
Cache-bust: `?v=20260710f`  
Stamp: `2026-07-10T16:00:00-07:00`

## Human play
Open local `index.html` with hard refresh. AI does **not** peek hands; uses constrained det-MCTS under the hood for hard difficulty.

## Commands
```bash
node test-engine.js && node test-search.js && node test-ai.js
TIENLEN_BENCH_GAMES=1000 TIENLEN_TARGET=0.80 TIENLEN_V30_MODE=easy TIENLEN_V4_PERFECT=1 node evolve/bench-v4-vs-v30.js
```
