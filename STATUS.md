# STATUS — Tiến Lên AI

**Updated:** 2026-07-11 (v8.4 CF79 cycle — gate passed)

## Live AI
- **Grandmaster v8.4** (`v8.4-hybrid-tempo`)
  - Long/volume-aware multi free-lead + hybrid trash shed with control
  - 2-tempo vs mid singles when opp short (human CF)
  - Ladder climb vs short opp; dual-self free-lead scoring
  - BR vs injected frozen expert; wider exact BR window
- Frozen baseline: `policies/v75-ai.js` + `policies/v75-search.js` (immutable **v7.5**)

## Play-log inventory (public GitHub `play-log`)
- **79 completed 2p** with deal hands: `1–9, 13–72, 75–79, 81–85`
- Abandoned excluded: `10, 11, 12, 73, 74`
- 4p excluded: `80`

## Counterfactual (human seat, hidden-info, live AI at CF time = v7.5)
- Games: **79** · Human actions: **633** · Match: **61.0%** · Differ: **247**
- Patterns: combat 159, free-lead 88, human 2-use 29, human pass 29, multi-vs-single 60
- Summary: `evolve/counterfactual-79-latest-summary.json`
- Analysis: `evolve/human-vs-v80-counterfactual-79.md`
- Runner: `evolve/counterfactual-79-latest.js`

## Human next-move predictor (hold-out by game id)
- Majority 23.0% · Heuristic 43.7% · Logistic SGD **51.1%** · AI-alt class 77.8%
- `evolve/human-predict.js` · `{SCRATCH}/human-predict-eval.log`

## Strength gate (continuous 2p single-deal)
- Bench: `evolve/bench-v80-vs-v75.js` vs frozen v7.5 expert
- **Primary:** N=200 seed0=**314159** → **v8 wins 161 / 200 = 80.5%** (`passed: true`)  
  - `evolve/v80-vs-v75-final.json` · `{SCRATCH}/bench-vnew-vs-v75.log`
- **Re-run:** same config → `{SCRATCH}/bench-vnew-vs-v75-rerun.log` / `v80-vs-v75-rerun.json`
- Note: seed `20260711` was ~77–78% (harder block); gate seed logged in final JSON

## UI (prior)
- 2-row fan hands, suit under rank, title AI difficulty grandmaster, HINT in action bar
