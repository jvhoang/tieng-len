# v9.2 +2 hunt — pure v9.1 maxbudget vs freeze v91

**Date:** 2026-07-13  
**Goal:** Flip ≥2 pure-v91 maxbudget dual losses vs freeze v91 without win-regression → dual ≥36/50 (>0.70).  
**Constraint:** Do **not** ship blanket multiTie 0.008 + dualSelf (already hurt **33/50 = 0.66**).  
**Scratch:** `/var/folders/.../implementer/plus2-hunt/` (and `scratch/plus2-hunt.md`).

---

## 1. Baseline dual (pure v9.1, max budget)

| Artifact | liveWins | WR | Budget | Notes |
|----------|--------:|---:|--------|-------|
| `evolve/v91-maxbudget-vs-v91-n50.json` | **34** | **0.68** | MS=280 IT=200 SIMS=480 BR=96 BRANCH=24 | No per-game log |
| `evolve/v91-ultrabudget-vs-v91-n50.json` | **34** | **0.68** | MS=350 BR=128 BRANCH=28 | **No lift** vs maxbudget |
| `evolve/v92-multitie-maxbudget-vs-v91-n50.json` | **33** | **0.66** | multiTie 0.008 + dualSelf=1 + maxbudget | **Hurt** — do not re-apply |

**Seed formula** (`evolve/bench-ladder.js`): `seed = seed0 + g * 9973`, `seed0 = 20260711`.

**Protocol asymmetry (why pure-v91 ≠ 0.50):** live has BR+exploit+higher budgets; freeze is cheaper GM with BR/exploit off, exact on.

**Budget saturation:** BR free-lead soft floor already **≥1100–1800ms** independent of `TIENLEN_V8_MS`. `ai.js` sets `exactExploitMs = opts.timeMs`, so maxbudget already spends full 280ms on exact. Ultra (350/128) matched 34/50 checkpoints → **wall-clock alone cannot buy the last +2**.

---

## 2. Det loss dump (seed-duel, maxbudget protocol)

Tool: `evolve/seed-duel.js` (updated to honor `TIENLEN_FREEZE_EXACT`, live sims/branch/dualSelf envs).

```
TIENLEN_FREEZE=v91 FREEZE_MS=120 FREEZE_EXACT=1
V8_MS=280 V8_ITERS=200 V8_SIMS=480 BR_TRIALS=96 BRANCH=24 EXACT=1
```

| Run | liveWins | rate | Artifact |
|-----|--------:|-----:|----------|
| **BASE pure v91 det** | **33** | 0.66 | `plus2-hunt/BASE-maxbudget-all50.out` |
| **MT_ONLY residual det** | **34** | 0.68 | `plus2-hunt/MT_ONLY_ALL50.out` |

### 17 BASE det losses

```
20290630, 20310576, 20320549, 20350468, 20380387,
20470144, 20490090, 20510036, 20539955, 20549928,
20559901, 20599793, 20609766, 20659631, 20669604,
20689550, 20709496
```

(JSON: `plus2-hunt/BASE-loss-seeds.json`)

Note: det seed-duel (33) vs dual non-det (34) differ by ~1 — wall-clock search is not fully det even with `DET_RNG`/`seed-duel` LCG.

---

## 3. Surgical levers tested (scratch only)

Repo `search.js` left **pure v9.1** multiTie `0.005 * short-factor` (no blanket 0.008).

| Lever | Change | Loss flips (smoke) | Full det N=50 | Notes |
|-------|--------|-------------------:|--------------:|-------|
| **MT_ONLY residual** ⭐ | multiTie **only** when residual pair-ranks ≥1/2; weight 0.008 if `resPairs≥2`, 0.003 if `=1`, **0 if no residual pairs** | **2** in isolation (`20290630`, `20510036`) | **+1 stable** (`20290630` only) → **34/50** | Best candidate |
| residual-mt (base 0.005 +0.003 if resPairs≥2) | softer | +1 (`20290630`) | — | Subset of MT_ONLY |
| residual-v2 (+ exploit multiBonus residual) | multiTie+multiBonus | +1 | — | multiBonus added no extra flips |
| FLSTRUCT | free-lead `structGain` pair weight 0.01→0.028 | +1 same seed (partial) | — | Same free-lead axis |
| STRONG (MT_ONLY + multiBonus + FLSTRUCT) | combo | +2 isolation; **20510036 fragile 2/3** | not full-50 | Timing-sensitive |
| multiTie 0.008 + dualSelf | prior dual | — | **33/50 hurt** | Forbidden |
| leafEval race/ctrl, exact depth 20, dualSelf+budget | prior ladder | — | ≤34 | Silent / hurt |
| ultra budget only | MS 350 BR 128 | — | **34/50** | No gain |

### Recommended lever (exact code)

In `bestResponseMove` free-lead scoring (`search.js` ~L1045):

```javascript
var multiTie = 0;
if (act && act.length >= 2 && !cur) {
  // multiTie ONLY when residual pairs high — not blanket 0.008
  var usedR = Object.create(null);
  var ui;
  for (ui = 0; ui < act.length; ui++) usedR[act[ui].rank * 4 + act[ui].suit] = 1;
  var resBy = Object.create(null);
  for (ui = 0; ui < hand.length; ui++) {
    var cid = hand[ui].rank * 4 + hand[ui].suit;
    if (!usedR[cid]) resBy[hand[ui].rank] = (resBy[hand[ui].rank] || 0) + 1;
  }
  var resPairs = 0;
  for (ui in resBy) if (resBy[ui] >= 2) resPairs++;
  if (resPairs >= 2) multiTie = 0.008 * Math.min(10, Math.max(0, 8 - act.length) + 2);
  else if (resPairs === 1) multiTie = 0.003 * Math.min(10, Math.max(0, 8 - act.length) + 2);
  // resPairs === 0: multiTie stays 0 (rate-only / prefer non-dump)
}
var score = rate + multiTie;
```

Scratch copy: `plus2-hunt/search.js.mt-only-res`.

### Why this (and not blanket 0.008)

- Blanket multiTie 0.008 always biases free-lead multi length even when residual structure is gone → dualSelf combo **regressed**.
- Gating on **residual pair ranks** only rewards multi that **leave plan structure**, demotes long dumps when rates tie under BR.
- Affects **live BR only** (freeze has BR off) → pure policy dual edge, gold expert path unchanged.

---

## 4. Flip evidence detail

| Seed | BASE det | MT_ONLY isolation | MT_ONLY full N=50 | Notes |
|-----:|:--------:|:-----------------:|:-----------------:|-------|
| **20290630** | L | **W** | **W** | **Stable +1** |
| **20510036** | L | **W** | **L** | **Fragile** — 2/3 W under STRONG re-duel same seed |
| other 15 losses | L | L | L | No flip |

**Win-regression:** 0 regs on 21 sampled BASE wins (first 11 + 10 more) under MT_ONLY isolation smoke.

**Full det N=50 MT_ONLY:** 34/50, flips=`[20290630]`, regs=`[]`, net **+1** vs BASE det 33.

---

## 5. Estimated flip count → dual gate

| Scenario | Est. liveWins | Pass >0.70? |
|----------|-------------:|:-----------:|
| Dual pure maxbudget (measured) | 34 | no |
| Det pure maxbudget (measured) | 33 | no |
| Det + MT_ONLY residual (measured full 50) | **34** | no |
| Dual + MT_ONLY if **only** stable flip lands | **35** | no |
| Dual + MT_ONLY if stable + fragile both land | **36** | **yes** |
| Dual + MT_ONLY + second independent lever | **36–37** | **yes** |

**Best estimated flip count: +1 stable, +0–1 fragile → net +1 to +2.**  
**Not yet a reliable ≥+2 for gate.** Need a second *orthogonal* stable flip (combat/exact path, not free-lead multiTie).

---

## 6. What will *not* get +2 alone

1. More wall-clock / BR trials (ultra = 34).  
2. Blanket multiTie 0.008 + dualSelf (33).  
3. leafEval race/ctrl micro (historically silent under exact+BR).  
4. exact endgame total>18 (hung/hurt 33).  
5. Series-2 structure package (27 — regression).

---

## 7. Next highest-value steps

1. **Ship candidate for dual validation:** MT_ONLY residual multiTie only (scratch file). Run dual N=50 maxbudget **with** `TIENLEN_LOG_GAMES=1` + `DET_RNG=1`.  
2. **Stabilize 20510036:** mine first free-lead decision under det; if multiTie residual changes root play, raise residual gate certainty or couple with fixed `exactExploitMs` floor independent of wall clock.  
3. **Second lever (orthogonal):** short-race combat contest (expertPolicy omin/handLen) on losses that are **not** free-lead multi ties (e.g. `20380387` 5-step deal, `20549928` 10-step).  
4. Do **not** re-enable dualSelf with multiTie.

---

## 8. Repo state after this hunt

- `search.js` = **pure v9.1** multiTie 0.005 (require path only vs `policies/v91-search.js`).  
- **No** blanket multiTie 0.008 left in main.  
- Scratch patches only under `plus2-hunt/search.js.*`.  
- `seed-duel.js` env parity improved (freeze exact / live sims/branch).

---

## 9. Dual smoke N=10 (MT_ONLY, DET live)

`plus2-hunt/plus2-mt-only-smoke10.json` — maxbudget protocol, `DET_RNG=1`, LOG_GAMES.

| N | liveWins | WR | lossSeeds |
|--:|---------:|---:|-----------|
| 10 | **6** | 0.60 | 20290630, 20310576, 20320549, 20350468 |

**Critical:** seed `20290630` remains **L** under dual (steps=22, same loss shape as BASE).  
So the seed-duel flip of 20290630 is **protocol-sensitive** (seed-duel det-both + memo keys ≠ bench-ladder DET live-only).  
N=10 dual MT_ONLY **matches pure dual** first-10 checkpoint (6/10) — **no dual evidence of +2 yet**.

---

## 10. Best proposed lever (summary)

| Field | Value |
|-------|-------|
| **Lever** | BR free-lead **multiTie only when residual pair ranks high** |
| **seed-duel flips** | **+1 stable** (`20290630`), **+0–1 fragile** (`20510036`) |
| **Full seed-duel N=50** | **34/50** (BASE det 33 → +1) |
| **Dual N=10 smoke** | **6/10** — **no flip** of 20290630 under dual protocol |
| **Estimated dual net** | **+0 to +1** until dual N=50 confirms; **not ≥+2 proven** |
| **Win-regression risk** | Low on seed-duel (0/50 regs) |
| **Dual ≥36 confidence** | **Low** without a dual-validated second flip |
| **Do not apply** | multiTie 0.008 always + dualSelf |

### Honest recommendation
Still the **best surgical free-lead lever** found (structure-gated multiTie beats blanket 0.008), but **estimated flip count for dual gate is +0–1, not a reliable +2**.  
Next work must target **combat/exact** losses that dual and seed-duel agree on (e.g. short blowouts / mid combat), or run dual N=50 with LOG_GAMES after applying MT_ONLY to measure real dual delta.
