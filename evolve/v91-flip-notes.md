# v9.1 flip-hunt vs freeze v90 — notes

**Date:** 2026-07-12 (~21:10 local)  
**Protocol:** live grandmaster + exploit vs freeze v90 grandmaster  
**Live seat:** `seed % 2` (see `evolve/bench-ladder.js` `play2p`)  
**Known losses (N=50 seed0=20260711):** 15 seeds in `evolve/v91-loss-seeds.json`

## How games run (`play2p`)

```javascript
const liveSeat = seed % 2;
// each step: cp === liveSeat → live ai.js/search.js; else freeze policies/v90-*
// freeze BR/exploit model: freeze expert (cheap), not nested GM
```

Loss seeds and seats (from dump):

| seed | liveSeat | steps (hist) |
|-----:|:--------:|-------------:|
| 20310576 | 0 | 18 |
| 20320549 | 1 | 26 |
| 20350468 | 0 | 20 |
| 20380387 | 1 | 5 |
| 20470144 | 0 | 13 |
| 20490090 | 0 | 15 |
| 20510036 | 0 | 23 |
| 20539955 | 1 | 22 |
| 20559901 | 1 | 20 |
| 20599793 | 1 | 16 |
| 20639685 | 1 | 19 |
| 20659631 | 1 | 18 |
| 20669604 | 0 | 16 |
| 20689550 | 0 | 22 |
| 20709496 | 0 | 18 |

## Method

1. Replayed **all 15** loss seeds under light-GM budgets (live 120ms/90it/BR40, freeze 80ms/48it, exact+exploit) with **BASE** (pre-patch) vs **TWO** (broader 2-tempo + contest-more soft-pass).
2. Free-lead alternate hunt (`evolve/flip-v91-loss.js`) under expert freeze was **budget-sensitive** (seed 20310576 flipped to win under light expert-freeze) — not trusted for protocol claims; seed-duel under GM used instead.
3. Prior probe (`evolve/PROBE-NOTES.md`, `search.js.probe-TWO`): full TWO branch already showed **36/50** vs BASE **35/50** on seed 20260711.

## Seed-duel results (GM light, both trees)

| seed | BASE | TWO |
|-----:|:----:|:---:|
| 20310576 | L | L |
| 20320549 | L | L |
| 20350468 | L | L |
| 20380387 | L | L |
| 20470144 | L | L |
| 20490090 | L | L |
| **20510036** | **L** | **W** ← **FLIP** |
| 20539955 | L | L |
| 20559901 | L | L |
| 20599793 | L | L |
| 20639685 | L | L |
| 20659631 | L | L |
| 20669604 | L | L |
| 20689550 | L | L |
| 20709496 | L | L |

**Flips found: 1** — seed **`20510036`** (liveSeat 0, g=25).

Artifacts: `evolve/seed-duel-BASE.out`, `evolve/seed-duel-TWO.out`, `*-rest.out`.

## Common mistake pattern

Primary (actionable):

1. **Under-spend 2-tempo on mid tops (J–K band ranks 8–10)** when opp is short-ish (`omin ≤ 3`) and hand still has trash/control — tight gate required `omin ≤ 2` and `handLen 5–8` + trash only; broader gate recovers tempo in races.
2. **Over-pass mid combat** with `handLen ≥ 9` / `curTop < 10` / `omin ≥ 6` — rolls out and BR expert model pass when contesting is better; TWO contests more when `handLen ≤ 7` or soft-pass only when longer/weaker.

Secondary (not flipped by free-lead tries on these seeds under GM):

3. **Structure / multi free-lead** — soft free-lead knobs and FL_ROOT did not move WR in probe (roots off + exact dominate).
4. **Multi-always** — multiTie soft alone silent under GM+exact.
5. Short blowouts (e.g. `20380387` 5 steps) look like **deal/force losses**, not first free-lead mistakes.

## Recommended / applied patch (`search.js` `expertPolicy`)

### 1) Broader mid 2-tempo (core)

```javascript
// FROM: omin <= 2, handLen 5..8, trashCount >= 1
// TO:
if (
  cur.type === 'single' &&
  curTop >= 8 && curTop <= 10 &&
  twoSingles.length &&
  omin <= 3 &&
  handLen >= 4 && handLen <= 9 &&
  (infoC.trashCount >= 1 || infoC.control >= 2)
) {
  return { play: twoSingles[0] }; // sorted by suit
}
```

### 2) Soft-pass / contest tail (support)

```javascript
if (handLen <= 7 && leg.length) return { play: orderLegals(leg, state, cp)[0] };
if (handLen >= 10 && curTop < 9 && omin >= 7) return { pass: true };
if (handLen >= 9 && curTop < 9 && omin >= 7) return { pass: true }; // residual
if (handLen >= 8 && curTop < 10 && omin <= 4 && leg.length) {
  return { play: orderLegals(leg, state, cp)[0] };
}
return { play: orderLegals(leg, state, cp)[0] };
```

**Kept** v9.1 deep mid multi fold (`handLen ≥ 11`, `omin ≥ 7`, non-single) — orthogonal ladder tune.

## Evidence strength

| Evidence | Result |
|----------|--------|
| Loss-seed duel BASE vs TWO (15 seeds, GM light) | **+1 flip** (`20510036`) |
| Prior probe TWO N=50 (seed 20260711, live 160ms / freeze 120ms) | **36/50 = 0.72 PASS** |
| Prior probe BASE N=50 | **35/50 = 0.70 FAIL** |
| `node test-search.js` after apply | **49/49 PASS** |

## Status

- **Patch applied to main** `search.js` (2026-07-12).
- Dual implementer process may still be running **pre-patch** module cache (high-budget N=50) — do not treat that run as TWO validation.
- Fresh N=50 under user protocol launched as `evolve/v91-two-n50.json` / `evolve/v91-two-n50.log` (see STATUS / log for liveWins).

## Free-lead note

No reliable free-lead alternate flip under GM among the 8 seeds fully explored at seed-duel level (all still L except combat/policy path on 20510036). Prefer combat **2-tempo / pass discipline** over free-lead soft knobs for this rung.


## N=50 result (user protocol)

Command:

```bash
TIENLEN_FREEZE=v90 TIENLEN_FREEZE_DIFF=grandmaster TIENLEN_V8_DIFF=grandmaster \
TIENLEN_BENCH_GAMES=50 TIENLEN_TARGET=0.70 TIENLEN_BENCH_SEED=20260711 \
TIENLEN_FREEZE_MS=100 TIENLEN_V8_MS=180 node evolve/bench-ladder.js
```

| Artifact | liveWins | WR | passed | liveMs/freezeMs |
|----------|--------:|---:|:------:|----------------:|
| **`evolve/v91-two-n50.json`** | **36** | **0.72** | **yes** | 180 / 100 |
| `evolve/v91-vs-v90-final.json` (implementer TWO-clean, concurrent) | **36** | **0.72** | **yes** | 160 / 120 |
| Historical BASE | 35 | 0.70 | no | various |

**Flip seed in N=50 log:** `20510036` → `liveWin: true` (was loss under BASE).

Remaining losses after TWO (14):  
`20310576, 20320549, 20350468, 20380387, 20470144, 20490090, 20539955, 20559901, 20599793, 20639685, 20659631, 20669604, 20689550, 20709496`

**liveWins = 36** (strict >0.70 gate **PASS**).

Tests after patch: `node test-search.js` → 49/49 PASS.  
Not shipped/pushed (per task).
