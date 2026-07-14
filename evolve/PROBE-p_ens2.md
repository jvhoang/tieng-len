# PROBE p_ens2 — ensemble combat structure package (4 axes)

**Date:** 2026-07-14  
**Axes:** four — GOLD_SURGICAL `structureBreakCost` inflate · combat `orderLegals` · BR combat residual soft-tie · multi combat structure fold  
**Root:** `ai.js` / `search.js` **untouched** · freeze `policies/v91-*` **untouched**

## Setup

| Item | Value |
|------|--------|
| Freeze | `v91` (`policies/v91-ai.js` + `policies/v91-search.js`) |
| Challenger | `p_ens2` (`policies/p_ens2-ai.js` + `policies/p_ens2-search.js`) |
| AI_BUILD | `v9.2-ens2` |
| Protocol | fair dual BOTH_SEATS (`evolve/lean-fair-dual-n20.js`) |
| Env | `BOTH_SEATS=1 FREEZE=v91 CHALL=p_ens2 GAMES=25 SEED=20260711 MS=150 TRIALS=12 SOFT=4` |
| OUT | `evolve/probe-p_ens2-vs-v91-fair-both-n50.json` |
| Identity baseline | `evolve/identity-v91-fair-both-n50.json` = **25/50** (WR 0.50) |
| Interest bar | liveWins **≥ identity + 2** (i.e. ≥27/50) |

## Patch (challenger only)

Copy of v91 with **four** combat-structure edits:

### 1. GOLD_SURGICAL `structureBreakCost` inflate

```js
// pair smash: 8/5 → 14/8
if (had >= 2 && left === 1 && used === 1) cost += 14;
if (had === 2 && used === 1) cost += 8;

// run singles: interior 16 when ≥3-chain (left2||right2), else 10;
// edge 8 when ≥3-chain, else 4
if (nbrL && nbrR) cost += (left2 || right2) ? 16 : 10;
else if (nbrL || nbrR) {
  if ((nbrL && left2) || (nbrR && right2)) cost += 8;
  else cost += 4;
}
```

### 2. Combat `orderLegals`: sbc → min top → expertScore

```js
// when cur (combat):
//   structureBreakCost asc, then min topRank, then expertScore
// free-lead: expertScore only (unchanged)
```

### 3. Combat BR soft-tie (`COMBAT_STRUCT_TIE`)

From `NOTE-fair-lever-combat-struct.md` — only when `act && cur`:

```js
// residual after play (ranks 0..11):
combatStructTie += 0.003 * Math.min(3, pairR);
if (tripR >= 1) combatStructTie += 0.002;
if (maxRun >= 3) combatStructTie += 0.002 + 0.001 * Math.min(2, maxRun - 3);
combatStructTie -= 0.0005 * Math.min(24, sbcC);
// score = rate + multiTie(free-lead) + combatStructTie
```

Pass (`act == null`) gets no combat soft-tie. Free-lead short-multi multiTie unchanged.

### 4. Multi combat fold

Inserted after v9.1 deep multi fold (`handLen≥11, omin≥7, top<8`):

```js
// handLen>=9, omin>=5, mid multi top<=9, not bomb
// pool = cheapLegals else all legals
// if min structureBreakCost(pool) >= 10 → { pass: true }
```

No perfect-info path. No root `ai.js`/`search.js` mutation. No free-lead hybrid trash force.

## Results

| Run | liveWins | freezeWins | WR | Δ vs identity 25/50 |
|-----|---------:|-----------:|---:|--------------------:|
| identity v91 both-seats | **25** | 25 | 0.50 | — |
| **p_ens2** both-seats | **25** | 25 | 0.50 | **0** |

**Headline: 25/50 · delta vs identity 25 = 0 · WR 0.50 · wall ~13.7s**

Seat split (ens2 = identity): seat0 **9/25**, seat1 **16/25** (net 25).

Per-game vs identity: **1 flip, 1 reg** (net 0):

| Change | Key (seed:seat) | Meaning |
|--------|-----------------|---------|
| Flip | `20410306:0` | ens2 wins where identity lost |
| Reg | `20470144:0` | ens2 loses where identity won |

All other 48 seat-games match identity. Package is dual-null under lean fair BR budgets.

Loss seeds (25, with duplicate on double-loss seed): see `probe-p_ens2-vs-v91-fair-both-n50.json` `lossSeeds`.

## Verdict

- **Neutral** on fair dual both-seats N=50 vs freeze v91 — **below interest bar (≥27)**.
- Stacked combat structure levers (inflate + order + BR soft-tie + multi fold) produce **no net skill delta** under equal-BR lean budgets.
- Likely causes of null:
  1. Multi fold `minSbc≥10` rarely fires on multi answers (pair/triple plays rarely accumulate cost ≥10 even with pair-smash inflate, which targets **singles**).
  2. Combat BR soft-tie magnitude (~0.015 max) only flips near-equal rates; lean `brTrials=12` rate noise dominates.
  3. `orderLegals` / inflate mainly re-rank candidates already shared with freeze expert path under BR playout leaves.
- Do **not** promote. Follow-ups if revisiting ensemble:
  - Lower multi fold threshold (e.g. minSbc≥4) or residual-aware multi smash metric.
  - Isolate axes (order-only / BR-tie-only) before re-stacking.
  - Raise BR trials only for debug seed-duel, not ship gate (hollow under dual equal-BR).

## Artifacts

- `policies/p_ens2-search.js` — four-axis combat structure package
- `policies/p_ens2-ai.js` — wires `./p_ens2-search.js`, `AI_BUILD` `v9.2-ens2`
- `evolve/probe-p_ens2-vs-v91-fair-both-n50.json` / `.log`
- This note: `evolve/PROBE-p_ens2.md`
