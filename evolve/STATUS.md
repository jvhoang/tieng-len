# STATUS — v8.7 vs frozen v7.5 strength gate — COMPLETE

**Updated:** 2026-07-12T05:30Z

## Goal — ACHIEVED
Beat frozen Grandmaster v7.5 at **strictly >80%** over **continuous N≥200** 2p single-deal games on **a priori seed `20260711`**, with independent re-run also >80%. No seed shopping.

## Gate results

| Run | Seed | Wins | Rate | CI95 lo | Passed |
|-----|-----:|-----:|-----:|--------:|:------:|
| Primary | **20260711** | **173/200** | **0.865** | 0.811 | YES |
| Re-run (same seed, DET_RNG off) | 20260711 | 173/200 | 0.865 | 0.811 | YES |
| 2nd a priori seed | **20260712** | **176/200** | **0.880** | 0.828 | YES |

- AI: `v8.7-hybrid-fl` / Grandmaster v8.7
- Freeze: `policies/v75-ai.js` + `policies/v75-search.js`
- Artifacts: `evolve/v80-vs-v75-final.json`, `evolve/v80-vs-v75-rerun.json`, `evolve/v87-vs-v75-seed20260712.json`

## Why it beat the ~79.5% plateau

1. **Bug fix:** free-lead soft root used `analyzeHand().pairs` (missing) → all soft scores `NaN` → fl-root never returned → multi-biased BR always won.
2. **Hybrid free-lead soft root:** when no hard forced win, prefer trash/low singles early (preserves structure); demote long multi early. Expert leaf + 1-ply frozen opp.
3. Free-lead forced-win claims multi-sample verified before hard commit.
4. Soft path: BR before alpha-beta (AB early-return cost ~1%).

Loss mine: seed `20799253` — trash `0♦` wins, long multi loses. After fix, AI picks trash single.

Prior best: 159/200 (79.5%) `v8.5-unanswerable-lead`.

## CF 79 + human predictor (delivered)

| Item | Result |
|------|--------|
| Completed 2p games | **79** |
| Human actions | 633 |
| Match rate (hidden-info) | **61.0%** |
| Analysis | `evolve/human-vs-v80-counterfactual-79.md` |
| Summary | `evolve/counterfactual-79-latest-summary.json` |
| Predictor | `evolve/human-predict-eval-summary.json` |

## Tests
`node test-search.js` → 47/47 PASS
