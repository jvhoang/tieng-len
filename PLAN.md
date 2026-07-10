# PLAN — Hidden info + beat Grandmaster v3.0 ≥80%

**Goal:** New AI beats frozen v3.0 by **>80%** over **≥1000** strict 2p single deals (no best-of-N). Do not stop until achieved.

## Steps
1. **Freeze** — `policies/v30-ai.js` + `policies/v30-search.js` (done).
2. **Hidden vs-AI** — controller `perfectInfo: false`, `hiddenInfo: true`.
3. **publicHistory** — record plays/passes in engine (full + fast paths); clone in `cloneStateFast`.
4. **Constrained determinize** — reject samples inconsistent with pass events (non-bomb beaters that were passed on).
5. **v4 strength** — build id `v4.0-hidden-constrained`; stronger 2p search under hidden + policy polish; BR must not peek under hidden.
6. **Bench** — `evolve/bench-v4-vs-v30.js`, 1000 games, target 0.80, single deals only.
7. **Iterate** until gate passes; tests + badge + STATUS.

## Gate command
```bash
TIENLEN_BENCH_GAMES=1000 TIENLEN_TARGET=0.80 node evolve/bench-v4-vs-v30.js
```
