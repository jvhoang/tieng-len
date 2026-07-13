
## 2026-07-13T13:00:00Z — P1–P5 surgical (on dual baseline)
- Broad P1–P5 duals failed **0.48** then **0.44** vs v91.
- Restored search to playlog-align `9b20d49` (P1/P2/P5 already dual-safe there).
- Surgical only: **P3** AA/KK→low pair free-lead; **P4** same-len seq lower top when residual tied.
- Tests 79/79. Dual N=50 re-run `v92-p15c-vs-v91`.

## 2026-07-13T12:30:00Z — P1–P5 dual-safe refinement (superseded)
- First dual P1–P5 raw: **24/50 = 0.48 FAIL**. Soften still **22/50 = 0.44 FAIL**.

## 2026-07-13T12:00:00Z — strategy priorities P1–P5
- P1 minimal-beat singles (residual run → quality → lower top)
- P2 contest mid; narrow structure-pass only (0501/0510)
- P3 free-lead low pair before high pair/AA (deep hand, no 22)
- P4 same-len seq residual then lower top
- P5 2-budget: safe non-2 sc&lt;12; spend 2 on structure smash (0500)
- Fixed 0500 (2 not K) + 0520b (7 not Q). All gold 0498–0521 green.


## 2026-07-13T08:20:04Z — series-3 control-plan gold (0514/0516–0521)
- Free-lead: trash-before-mid-multi (no 22); with 22 prefer high residual multi; short 22 first; omin=1 multi.
- Combat: residual maxRun singles; residual same-len seq.
- GitHub playlogs still max #103 (Jul 12) — screenshot games not uploaded yet.
- Dual N=50 vs freeze v91 next with stamp series-3.


## 2026-07-13T07:16:33Z — structure gold-interpretation fix (v9.2)
- Gold 0498–0513 kept; over-general series-2 pass/doubleseq force fixed.
- cheap-exists pass rate ~2.1% (was over-pass on dual).
- Doubleseq free-lead residual-gated; 0510/0511 narrow.
- Dual N=50 vs freeze v91 launching.


## 2026-07-13T06:13:31Z — series-2 structure-safe ship
- Fixed IMG_0505–0513 (doubleseq free-lead, pair-back pass, structure singles).
- Root: exploit free-lead skipped enforce → plain seq over doubleseq.
- All test-engine/search/ai pass. Stamp v9.2 @ 2026-07-13T06:13:02Z.

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
