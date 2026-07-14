# Fair dual DEV — pure freeze v9.1 one-axis levers (anti-overfit)

**Date:** 2026-07-13  
**Freeze body:** `policies/v91-search.js` + `policies/v91-ai.js` (do **not** mutate live until probe)  
**Protocol:** hidden · GM · BR both · equal budget · expertPolicy BR leaf  
```
DEV only:  seed0=20260711  GAMES=25  BOTH_SEATS=1  → 50 games
Ship holdouts (NEVER peek in design): 20260801, 20260802
MS=150  TRIALS=12  SOFT=4  BRANCH=12
```

**Why this note exists:** Prior **stacked** packages (`p_mbnest`, pin+cntie, `mbntie_all`, multi-locus FL) hit **DEV ~0.74** then **HOLDOUT_A ~0.50** — seed11 free-lead overfit, not transferable skill. Prefer **one axis ≤15 lines** from **pure freeze v9.1**, rank on DEV Δ only, promote to holdout **once** per NOTE-fair-eval-protocol.

---

## 1. Residual human edges (skim — not bulk expertScore)

Sources: `evolve/playlog-strategy-inference.json`, `NOTE-fair-human-levers-v91.md`, CF-all (`combatDiffer` 188 / `freeLeadDiffer` 116).

| Edge (rank) | Mass | Mechanism class | Fair-dual note |
|-------------|-----:|-----------------|----------------|
| **Structure residual** | hBetter **186** / eBetter **48** | After-answer pairs / seq / lower sbc | Largest quantitative edge; BR near-rate ranking |
| **Overkill vs min-beat** | `H_overkill_E_minimal` **59** + same-class ~**75** CF | Lower top among pair/triple/mid single | Ordering skill; survives equal BR |
| **Long multi dump** | `E_longer_multi_H_shorter` **47**, multiVsSingle **71** | Short multi / pair volume free-lead | Policy at hard free-lead + cand order |
| **Gated fold** | `H_pass_E_play` **30**, humanPassAltPlay **33** | Deep mid multi fold | Narrow gate only |
| 2-tempo | `H_2_E_non2` **53** | Mid climb with 2 | `p_two` one-axis historically **null** under fair dual — defer |
| **Anti-edge** | `H_play_E_pass` **76** | Human plays, expert passes | **Do not reverse bulk** (over-active dual risk) |

**Not levers:** bulk `expertScore` rewrites, softN, free-lead pin stacks, soft multiTie weight sweeps, near-tie applied to **free-lead** (seed11 fingerprint).

---

## 2. Exactly 3 ONE-AXIS levers (≤15 lines each)

Each lever is a **standalone** probe vs freeze v91. No stacks. Expected DEV effect: **small** (Δ ≈ +1..+3 / 50 noise floor) — success = transferable Δ that survives holdout, not DEV 0.74 theater.

### OA1 — `ORDER_MINBEAT` (same-class combat micro)

| | |
|--|--|
| **Axis** | Among **equal** `expertScore`, stable secondary keys: lower `topRank` → lower `structureBreakCost` → shorter length. |
| **Human edge** | Overkill 59 + same-class ~75; residual structure secondary. |
| **Why small/transferable** | No weight rewrite; only breaks true score ties. Cascades into expert cheap path, BR combat cand order (`orderLegals` at ~999), and leaf rollouts. |
| **Function** | `orderLegals` |
| **Lines** | `policies/v91-search.js` **343–347** |
| **Budget** | ~6–10 lines (replace single-key sort) |

```js
// orderLegals — OA1 ORDER_MINBEAT (tie-break only; do not touch expertScore weights)
function orderLegals(legals, state, myIdx) {
  var hand = state.players[myIdx].hand;
  return legals.slice().sort(function (a, b) {
    var sa = expertScore(a, state, myIdx);
    var sb = expertScore(b, state, myIdx);
    if (sa !== sb) return sa - sb;
    var ta = topRank(a), tb = topRank(b);
    if (ta !== tb) return ta - tb;
    var ca = structureBreakCost(hand, a), cb = structureBreakCost(hand, b);
    if (ca !== cb) return ca - cb;
    return a.length - b.length;
  });
}
```

**Reject siblings:** combat `expertScore` bulk (`topRank * 0.85` retune); soft ε on rate without ordering.

**DEV probe tag:** `p_oa_minbeat` (challenger = v91 + this only).

---

### OA2 — `COMBAT_NEAR_MIN` (combat-only near-rate hard argmin)

| | |
|--|--|
| **Axis** | After BR scores actions: among plays with `rate ≥ bestRate − 1/nTry`, **combat only** (`cur` truthy), hard pick lower top → lower sbc → shorter. Pass stays last unless already pinned. |
| **Human edge** | residual 186:48 + min-beat; soft multiTie never fires on unique `k/12` max rates. |
| **Why not FL near-tie** | `mbntie_all` / pin+ntie packages overfit **seed11 free-lead**; holdout flat. Restrict to **combat** so free-lead multi/lock ranking unchanged. |
| **Function** | `bestResponseMove` post-score select |
| **Lines** | `policies/v91-search.js` **1042–1055** (replace single `if (score > bestRate)` winner; or post-pass over `details` before return ~1056–1068) |
| **Budget** | ~12–15 lines |

```js
// end of bestResponseMove action loop — OA2 COMBAT_NEAR_MIN
// Keep multiTie free-lead as-is; do NOT change multiTie coefficient.
// After details filled:
details.sort(function (a, b) {
  return (b.score != null ? b.score : b.rate) - (a.score != null ? a.score : a.rate);
});
if (cur && details.length) {
  var bestR = details[0].rate;
  var band = 1 / Math.max(1, trials); // one-trial bucket only
  var actBySig = {};
  for (var ai2 = 0; ai2 < actions.length; ai2++) {
    actBySig[playSig(actions[ai2])] = actions[ai2];
  }
  var pool = details.filter(function (d) { return d.rate >= bestR - band - 1e-9; });
  pool.sort(function (da, db) {
    var a = actBySig[da.sig], b = actBySig[db.sig];
    if (!a && b) return 1; if (a && !b) return -1; if (!a && !b) return 0;
    var ta = topRank(a), tb = topRank(b);
    if (ta !== tb) return ta - tb;
    var ca = structureBreakCost(hand, a), cb = structureBreakCost(hand, b);
    if (ca !== cb) return ca - cb;
    return a.length - b.length;
  });
  bestPlay = actBySig[pool[0].sig];
}
```

**Reject siblings:** band `2/nTry`; apply to free-lead; stack soft multiTie weight; general `mbntie_all`.

**DEV probe tag:** `p_oa_cntie`.

---

### OA3 — `FL_SHORT_POOL` (hard free-lead length invert among close tops)

| | |
|--|--|
| **Axis** | In `pickFreeLeadHard` multi pool sort: when tops within 1, prefer **shorter** multi (pair/triple) over longer dumps — invert pure v91 `lb - la`. |
| **Human edge** | `E_longer_multi_H_shorter` 47; CF multiVsSingle 71; freeLeadDiffer 116. |
| **Why not multiTie weight** | Soft multiTie sweeps + dualSelf historically **33/50** cliffs; pin stacks seed11-overfit. This is **expert hard free-lead** one-line policy (BR leaf + soft root still see multi-always core). |
| **Function** | `pickFreeLeadHard` |
| **Lines** | `policies/v91-search.js` **619–627** (esp. sort comparator **622–627**) |
| **Budget** | **1 line** core (optionally +2 lines gate `len≥4` demote only) |

```js
// pickFreeLeadHard multi pool — OA3 FL_SHORT_POOL
// BEFORE (v91 pure): if (la !== lb && Math.abs(ta - tb) <= 1) return lb - la; // longer first
// AFTER:
pool = pool.slice().sort(function (a, b) {
  var la = a.length, lb = b.length;
  var ta = topRank(a), tb = topRank(b);
  if (la !== lb && Math.abs(ta - tb) <= 1) return la - lb; // short first among close tops
  return expertScore(a, state, cp) - expertScore(b, state, cp);
});
```

**Optional tighter (still one axis):** only invert when `Math.max(la,lb) >= 4` so pair vs triple stays expertScore-led; long seq dumps demoted. Keep as single probe either pure invert or gated invert — not both.

**Reject siblings:** free-lead pin (`trash`+`low pair` force into BR set); multiTie `0.005→0.008`; series-2 multi-always force; bulk FL `expertScore` gold rewrite; hybrid trash default without `_exploitFlMode`.

**DEV probe tag:** `p_oa_flshort`.

---

## 3. Explicit REJECT list (do not probe as “skill” this round)

| Reject | Why |
|--------|-----|
| **SoftN** (softSamples 14/16, `softn*.FORBIDDEN`) | Fingerprint / hollow; dual-flat history |
| **Free-lead pin stacks** (`mbpin*`, pin+cntie packages) | DEV 0.74 → HOLDOUT ~0.50 seed11 FL overfit |
| **Near-tie FL** (`mbntie_all` on free-lead) | Same; absolute 0.76 train, independent seeds fail 0.70 |
| **Soft multiTie weight sweeps** (ε retune, dualSelf multiTie) | Documented dual regs / cliffs |
| **Bulk `expertScore` rewrite** (combat or free-lead weights) | Imitation ≠ dual; historical dual 0.48/0.44 class |
| **Stacked multi-locus packages** on pure v91 before each OA clears | Exactly the overfit pattern |
| **Bulk reverse `H_play_E_pass` (76)** | Over-active dual; v91 soft-pass ladder-tuned |
| **`p_two` / broad 2-tempo expand** | One-axis fair-dual null historically |
| **Combat BR density alone** (trials 12→24/56) | Equal-BR dual cancels; not policy |
| **Hollow budget / BR-off freeze / perfect-info duals** | Not fair dual skill |
| **Hunting seed 20380387** | Structural unflippable — not ship math |
| **Peek HOLDOUT_A/B (20260801/2) during design** | Contaminates ship gate |
| **DEV absolute WR as ship evidence** | Only holdout both seats pass |

---

## 4. Edit-locus map (pure freeze `v91-search.js`)

| Lever | Function | Approx lines | Touch surface |
|-------|----------|-------------:|---------------|
| **OA1** | `orderLegals` | **343–347** | Sort only |
| **OA2** | `bestResponseMove` | **949–1068**, score/select **1042–1068** | Combat post-select only; leave FL multiTie **1045–1048** coefficients alone |
| **OA3** | `pickFreeLeadHard` | **540–669**, multi pool **619–627** | Comparator only |
| Structure helpers (reuse, no rewrite) | `structureBreakCost`, `analyzeHand`, `topRank` | **139–178**, **185–224** | Read-only for OA1/OA2 |
| Soft root structGain (reference only) | free-lead soft | **2715–2723** | Do **not** open as first probe (perfect-info path weaker under pure hidden fair dual) |

`v91-ai.js`: **no edit** for OA1–OA3 (search-body ranking). Guards/gap-cap in ai are a different axis — deferred.

---

## 5. DEV probe protocol (only)

```
1. Identity DEV: FREEZE=v91 CHALL=v91 seed0=20260711 GAMES=25 BOTH_SEATS=1
   Expect WR ≈ 0.50. Record liveWins.

2. One lever at a time (OA1 → OA2 → OA3 order preferred: lowest hang risk first)
   Copy policies/v91-search.js → policies/<tag>-search.js; apply ≤15-line patch; pair ai = v91-ai.

3. DEV dual vs freeze v91 (same opts). Interest if liveWins ≥ identity + 1 (noise).
   Promote interest if Δ ≥ +2 AND absolute DEV not required to be high.

4. Ship: only after interest, HOLDOUT_A once (20260801), then HOLDOUT_B (20260802).
   Ship iff both: WR > 0.70 AND Δ_identity ≥ +2. Never retune after peeking holdout.

5. Stack only if two independent OAs each clear DEV interest alone — still re-eval DEV
   before any holdout; refuse stack that only recovers seed11 FL fingerprint.
```

Runner sketch:
```bash
# Design loop (DEV only)
FREEZE=v91 CHALL=p_oa_minbeat SEED0=20260711 GAMES=25 BOTH_SEATS=1 \
  node evolve/fair-eval-holdout.js   # or lean dual with DEV seed only
# Do NOT set seed0 to 20260801/2 until promotion.
```

---

## 6. Top-3 one-liners (execute order)

1. **OA1 `ORDER_MINBEAT`** — `orderLegals` tie-break: lower top → sbc → short (`v91-search.js` ~343–347).  
2. **OA2 `COMBAT_NEAR_MIN`** — combat-only BR near-rate hard min top/sbc (`bestResponseMove` ~1042–1068); never FL.  
3. **OA3 `FL_SHORT_POOL`** — `pickFreeLeadHard` close-top multi sort short-first (`~622–627`); not multiTie weight.

**Path:** `/Users/johnhoang/Developer/Grok/tieng-len/evolve/NOTE-fair-dev-oneaxis-v91.md`

---

*Imitation match rate ≠ dual win rate. Prefer small transferable axes over DEV 0.74 packages that die on holdout.*
