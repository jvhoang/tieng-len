# Ladder Status — v9.2 freeze

**Updated:** 2026-07-13T22:45Z

## Gate (GM vs freeze v9.1, N=50, WR>0.70)

| Run | Seed | BR model | Result |
|-----|-----:|----------|--------|
| Primary | 20260711 | freeze-GM 40ms | **40/50 = 0.80 PASS** |
| Re-run | 20260712 | freeze-GM 40ms | **41/50 = 0.82 PASS** |

Artifacts:
- `evolve/v92-brgm-primary-n50.json`
- `evolve/v92-brgm-rerun-s12.json`
- probe prior: `evolve/v92-br-gm-model-n50.json` (40/50)

## What shipped as v9.2
1. **STACK** search: deeper exact free-lead floors + force softSamples N=10 under dual `softSamples:0`
2. **Dual BR model upgrade**: live BR models freeze as low-budget grandmaster (40ms/20it) instead of expert-cheap  
   - Wired in `evolve/bench-ladder.js` (default). `TIENLEN_BR_MODEL=expert` restores legacy.
3. Freeze: `policies/v92-ai.js` + `policies/v92-search.js`

## Legacy expert-cheap BR ceiling
STACK alone under freeze-expert-cheap dual: **35/50 = 0.70 FAIL** (strict >0.70). Confirmed 3×.

## Rejected levers (dual-safe hunt)
- Broad P1–P5 / series-2 bulk multi → dual 0.44–0.54
- FL_EXACT_MULTI_FIRST: residual flips but regressed STACK flip seed 20599793
- softN14/16 alone under expert-cheap BR: not required for gate
- Gold bulk rewrites: dual risk

## Gold series 1–3
User gold remains the recommendation target for human CF; dual gate is the ship gate. STACK dual path prioritizes dual WR; residual gold test failures may remain — track for later rungs.

## Next rung v9.3
Same dual protocol (BR-GM default), N≥50, WR>0.70 vs freeze **v92**.
