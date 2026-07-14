# BR_GM_MODEL — stronger BR opponent model (freeze GM low-budget)

**Date:** 2026-07-13  
**Scratch:** `$SCRATCH/probes/BR_GM_MODEL/` (isolated; main / race-base / `evolve/bench-ladder.js` **not** permanently patched)  
**Base:** pure race-base (`probes/search.race-base.js` / `ai.race-base.js`)  
**Lever:** live `setExploitOpponent` / bestResponse models freeze via **grandmaster low budget** instead of cheap **expert**.

---

## Lever design

Default dual protocol (`run-dual` / `bench-ladder`) injects:

```js
// BEFORE (BASE / main bench-ladder)
freeze.getAIMove(state, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' })

// AFTER (this probe)
freeze.getAIMove(state, seat, {
  difficulty: 'grandmaster',
  useSearch: true,
  perfectInfo: true,
  timeMs: 40,          // TIENLEN_BR_OPP_MS
  iterations: 20,      // TIENLEN_BR_OPP_ITERS
  maxSims: 40,
  maxBranch: 12,
  bestResponse: false,
  exactExploit: true,
  exploit: false,
  mode: 'auto'
})
```

Memoized per state (`BRGM|…`) with det RNG, same pattern as freeze-seat GM memo.

**What did not change**
- Live race-base policy / search (no expertPolicy edits)
- Freeze **seat** still full GM (MS=120 IT=80 SIMS=160 BRANCH=16)
- Live seat max budget (MS=280 IT=200 SIMS=480 BR=96 BRANCH=24 exact+exploit perfectInfo)

**Main safety**
- `evolve/bench-ladder.js` **unchanged** (still `brModel: freeze-expert-cheap`)
- Scratch-only copy: `probes/bench-ladder-BR_GM_MODEL.js` (GM low-budget BR model)

---

## Dual protocol

| | Live | Freeze seat | BR / exploit model |
|--|------|-------------|--------------------|
| **This probe** | race-base GM max | v91 GM | freeze **GM 40ms/20it** |
| **BASE / PURE_MAX ref** | race-base GM max | v91 GM | freeze **expert** |

- seed0=`20260711`, stride 9973  
- target (bench): 0.70  
- N=20 first; N=50 because N=20 WR≥0.85

---

## Result — Dual N=20

| Metric | BR_GM_MODEL | BASE (expert BR) |
|--------|------------:|-----------------:|
| **liveWins / N** | **18 / 20** | 16 / 20 |
| **WR** | **0.90** | 0.80 |
| freezeWins | 2 | 4 |
| vs BASE | **+2 games** | — |
| wall ms | 640568 (~10.7 min) | ~545k |

### Checkpoints (N=20)
| n | wins | WR |
|--:|-----:|---:|
| 5 | 5 | 1.00 |
| 10 | 9 | 0.90 |
| 15 | 13 | 0.867 |
| **20** | **18** | **0.90** |

### Loss seeds
- **BR_GM_MODEL:** `20310576`, `20380387`
- **BASE:** `20310576`, `20320549`, `20350468`, `20380387`

### vs BASE
| | seeds |
|--|-------|
| **flips** | `20320549`, `20350468` |
| **regs** | *(none)* |

W/L vector: `WWWWWLWWWWWWLWWWWWWW`  
BASE:         `WWWWWLLWWLWWLWWWWWWW`

---

## Result — Dual N=50 (confirmation)

Triggered because N=20 WR **0.90 ≥ 0.85**. Same isolated stack (not main tree).

| Metric | BR_GM_MODEL N=50 | PURE_MAX N=50 (expert BR, ref) | race maxbudget N=50 |
|--------|-----------------:|-------------------------------:|--------------------:|
| **liveWins / N** | **40 / 50** | 34 / 50 | 34 / 50 |
| **WR** | **0.80** | 0.68 | 0.68 |
| Δ vs expert-BR | **+6 games / +0.12** | — | — |
| target 0.70 | **PASS** | FAIL | FAIL |
| wall ms | 1558139 (~26 min) | — | — |

95% Wilson CI (N=50): **[0.670, 0.888]** (point **0.80**)

### Checkpoints (N=50)
| n | wins | WR |
|--:|-----:|---:|
| 5 | 5 | 1.00 |
| 10 | 9 | 0.90 |
| 15 | 13 | 0.867 |
| 20 | 18 | 0.90 |
| 25 | 22 | 0.88 |
| 30 | 25 | 0.833 |
| 35 | 30 | 0.857 |
| 40 | 34 | 0.85 |
| 45 | 36 | 0.80 |
| **50** | **40** | **0.80** |

First 20 games of N=50 **exact match** N=20 (deterministic).

### Loss seeds (N=50, 10)
`20310576, 20380387, 20470144, 20539955, 20549928, 20609766, 20659631, 20669604, 20689550, 20709496`

W/L vector (50):  
`WWWWWLWWWWWWLWWWWWWWWLWWWWWWLLWWWWWLWWWWLLWLWLWWWW`

---

## Interpretation

1. **Stronger BR model is a real dual lever.** Matching freeze with low-budget GM (instead of expert) improves race-base dual by roughly **+0.10 to +0.12 WR** at equal live/freeze seat budgets.
2. **N=20 overstates ceiling** (0.90 → 0.80 at N=50) but direction is stable; first-20 block identical.
3. **Dual gate:** N=50 **WR=0.80 > 0.70 PASS** under this BR model. Expert-BR race-base maxbudget remains **0.68 FAIL**.
4. **Not a free lunch:** nested GM BR adds wall time vs expert BR (still ~26 min for N=50 here thanks to memoization; uncached would be worse).
5. Residual hard mines (`20310576`, `20380387`) still lose — BR model quality alone does not flip multi-climb / structure traps.

### Promotion guidance
- **Protocol change candidate:** set dual `setExploitOpponent` to freeze GM low-budget (40ms/20it) for official ladder benches — would raise measured live strength and may change which policy levers look good.
- **Do not ship race-base alone as v92** without also freezing the BR-model choice into the dual contract; otherwise ship metrics diverge.
- Main `bench-ladder.js` left on expert BR intentionally; adopt via documented protocol patch if desired.

---

## Artifacts

| Artifact | Path |
|----------|------|
| Isolated probe | `$SCRATCH/probes/BR_GM_MODEL/{search.js,ai.js,run-dual.js}` |
| N=20 JSON/log | `$SCRATCH/probes/BR_GM_MODEL-n20.{json,log}` |
| N=50 JSON/log | `$SCRATCH/probes/BR_GM_MODEL-n50.{json,log}` |
| Scratch bench-ladder (GM BR) | `$SCRATCH/probes/bench-ladder-BR_GM_MODEL.js` |
| Main bench-ladder | **unmodified** (`brModel: freeze-expert-cheap`) |
| BASE N=20 ref | `$SCRATCH/probes/BASE-n20-v2.json` (WR 0.80, expert BR) |
| PURE_MAX N=50 ref | `$SCRATCH/probes/n50-PURE_MAX.json` (WR 0.68, expert BR) |

---

## Headline WR

| Run | liveWins | **WR** |
|-----|--------:|-------:|
| Dual N=20 | 18/20 | **0.90** |
| Dual N=50 | 40/50 | **0.80** |

**Primary report WR (N=50 dual): 0.80**
