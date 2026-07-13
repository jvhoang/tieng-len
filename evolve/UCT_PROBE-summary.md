# UCT / search hyperparameter probes (dual strength)

**Date:** 2026-07-13  
**Base:** pure race-base (`probes/search.race-base.js` / `ai.race-base.js`)  
**Protocol:** isolated dual N=20 max budget vs freeze v91  
- Live: MS=280 IT=200 SIMS=480 BR=96 BRANCH=24 perfectInfo exact+exploit  
- Freeze: MS=120 IT=80 SIMS=160 BRANCH=16  
- seed0=20260711  
**Not expertPolicy** — dual strength only.  
**Main:** probes are isolated under `probes/{UCT_C,DET_N,PLACE_HUNGRY}/`; this agent did not patch main. (Main may show unrelated GOLD_SURGICAL drift from other work.)

## Knobs

| Probe | Change vs race-base |
|-------|---------------------|
| **UCT_C** | Default UCT exploration `C`: **1.25 → 1.625** (+30%) in `runMCTSOnState` |
| **DET_N** | Imperfect-info default det counts **+50%**: detMCTS 16→24, flat MC 24→36, chooseMove GM 24→36 / non-GM 12→18, ai.js imperfect 16→24 |
| **PLACE_HUNGRY** | `PLACE_SCORE = [1.0, 0.45, 0.15, 0]` (was `[1.0, 0.55, 0.25, 0.0]`) |

### Dual-path notes
- Faithful dual uses **`perfectInfo: true`**, so `determinizedMCTS` forces **`detN = 1`**. DET_N defaults never fire on dual — expected silent.
- 2p `finalUtility` is hard win/loss (0/1); `PLACE_SCORE` only affects incomplete `placeUtility` estimates mid-tree (and 4p). Soft effect only.

## Dual N=20 results

| Probe | liveWins | **WR** | Δ vs BASE | lossSeeds |
|-------|--------:|-------:|----------:|-----------|
| **BASE** (race-base prior) | **16** | **0.80** | — | 20310576, 20320549, 20350468, 20380387 |
| **UCT_C** | 15 | **0.75** | −1 game | +20290630, same 4 |
| **DET_N** | 15 | **0.75** | −1 game | same as UCT_C |
| **PLACE_HUNGRY** | **16** | **0.80** | 0 | identical to BASE |

### Per-seed diffs vs BASE
Only seed **20290630**: BASE/PLACE_HUNGRY **W** → UCT_C/DET_N **L**. All other 19 seeds identical across all four.

### Checkpoints (dual)
| Probe | 5g | 10g | 20g |
|-------|----|-----|-----|
| UCT_C | 0.80 | 0.60 | **0.75** |
| DET_N | 0.80 | 0.60 | **0.75** |
| PLACE_HUNGRY | 1.00 | 0.70 | **0.80** |

Wall ~8.5 min each (3-way parallel CPU contention).

## Seed-duel 16 race N=50 losses

Seeds from `evolve/v92-race-loggames-n50.json` `lossSeeds` (16). Same maxbudget dual opts.

| Probe | liveWins | rate | flips |
|-------|--------:|-----:|-------|
| BASE ref (prior RES_MT/BASE duel) | 3 | 0.1875 | 20290630, 20320549, 20599793 |
| **UCT_C** | 3 | **0.1875** | **identical** |
| **PLACE_HUNGRY** | 3 | **0.1875** | **identical** |
| DET_N (extra) | 3 | 0.1875 | identical |

**True loss flips vs BASE:** none  
**True win regs vs BASE:** none  

## Verdict

| Probe | Dual WR | Seed-duel | Call |
|-------|--------:|-----------|------|
| **UCT_C** (+30% C) | 0.75 (−1) | silent | **NO SHIP** — flat/slightly hurt; no loss flips |
| **DET_N** (+50% det defaults) | 0.75 (−1) | silent | **NO SHIP / dual-silent** — perfectInfo forces detN=1; −1 game is timing noise under parallel load, not det effect |
| **PLACE_HUNGRY** | **0.80** (tie BASE) | silent | **NO SHIP** — fully silent on dual + seed-duel (2p hard util drowns place scores) |

None of the three search hyperparameters improve dual strength over race-base on N=20. Do **not** promote any of these knobs.

### Noise caveat
UCT_C and DET_N both lost only seed 20290630. DET_N cannot change dual under perfectInfo, so that −1 is almost certainly **time-budget noise** (parallel runs). UCT_C’s same single-seed regression is therefore weak evidence of real hurt; still no upside.

## Artifacts
- Dual JSON: `probes/{UCT_C,DET_N,PLACE_HUNGRY}-n20-v2.json`
- Dual logs: `probes/*-n20-v2.log`
- Seed-duel: `probes/{UCT_C,PLACE_HUNGRY,DET_N}-seed-duel-loss16.json`
- Probe trees: `probes/{UCT_C,DET_N,PLACE_HUNGRY}/{search.js,ai.js,run-dual.js}`
- BASE dual ref: `probes/BASE-n20-v2.json` (WR **0.80**)
