# Fair dual DEV — pure freeze v9.1 one-axis WAVE2 (post mintop holdout fail)

**Date:** 2026-07-13  
**Freeze body:** `policies/v91-search.js` + `policies/v91-ai.js` (do **not** mutate freeze; probe via `policies/p_w2_*` copy)  
**Protocol:** hidden · GM · BR both · equal budget · expertPolicy BR leaf  
```
DEV only:  seed0=20260711  GAMES=25  BOTH_SEATS=1  → 50 games
DEV_VAL (selection only, no re-edit after peek): seed0=20260715
Ship holdouts (NEVER peek in design): 20260801, 20260802
MS=150  TRIALS=12  SOFT=4  BRANCH=12
```

**Why wave2:** Wave1 one-axis on pure v91:

| Tag | Axis | DEV (20260711) | Ship |
|-----|------|---------------:|------|
| `p_p1_mintop` | `orderLegals` combat min-top→sbc **before** expertScore | **32/50** (sig) | **HOLDOUT fail** (~0.42) |
| `p_p1_cntie` | combat near-rate hard min-top→sbc | 27/50 | not promoted |
| `p_p1_cres` | combat residual **soft-ε** (sbc drag + cheap +0.0015) | 26/50 | — |
| `p_p1_two` | TWO_OMIN2 expert gate | 25/50 | — |

**Lesson:** pure **min-top** ordering (mintop/cntie family) can inflate DEV then die on holdout — same class as seed11 free-lead overfit. Soft-ε residual (cres) and 2-tempo (two) were dual-flat. Wave2 shifts to **residual multi keys** (human residual 186:48) and **gated fold** (H_pass_E_play 30 / humanPassAltPlay 33 / humanPlayAltPass 0) — **not** another min-top or soft multiTie weight.

Prior stacked packages still warn: DEV 0.74 → HOLDOUT_A ~0.50. Prefer **SMALL transferable Δ** (interest ≥ identity +2, not theater 0.74).

---

## 1. Residual human edges (wave2 focus)

Sources: `evolve/playlog-strategy-inference.json`, `NOTE-fair-human-levers-v91.md`, CF-all.

| Edge | Mass | Wave2 use |
|------|-----:|-----------|
| **Structure residual** | hBetter **186** / eBetter **48** | W2A hard residual keys among near-rate combat |
| Same-class combat | ~**75** CF (pair/triple/mid) | Residual prefers keep-pair/run plan over pure min-top |
| **Gated fold** | H_pass_E_play **30**, humanPassAltPlay **33**, humanPlayAltPass **0** | W2B BR pass cand + W2C expert cheap sbc gate |
| Overkill / min-beat | 59 / 42 | Secondary via residual pairR (not mintop re-probe) |
| Long multi dump | E_longer **47** | Deferred (FL pin / multiTie forbidden this wave) |

---

## 2. Exactly 3 NEW ONE-AXIS levers (≤15 lines each)

Each is standalone vs pure freeze v91. **Not** mintop / cres soft-ε / two_omin2 / cntie min-top near-tie.

### W2A — `COMBAT_NEAR_RESIDUAL` (combat near-rate hard residual multi)

| | |
|--|--|
| **Axis** | After BR rates: among combat plays with `rate ≥ bestRate − 1/nTry`, hard pick **higher residual pairR → higher maxRun → lower sbc → lower top**. Pass stays last. |
| **Human edge** | residualScore 186:48 — largest quantitative edge; same-class structure. |
| **Why not wave1** | **cntie** = min-top→sbc (holdout-risk class). **cres** = always-on soft ε (flat). This is **hard residual-first** inside the one-trial band only. |
| **Why might transfer** | Anti-mintop: can keep slightly higher top if residual plan (pairs/run) survives — matches human residual, not seed11 min-top FL fingerprint. |
| **Function** | `bestResponseMove` post-score select |
| **Lines** | `policies/v91-search.js` **1056–1068** (+ small helper ~15 lines near `structureBreakCost` **139–178**) |
| **Budget** | helper ~12 + post-select ~12 (helper shared; edit surface ≤15 in BR if helper inlined compact) |

```js
// helper once near structureBreakCost — residual multi after answer
function residualMultiKeys(hand, play) {
  var used = Object.create(null), i, r;
  for (i = 0; i < play.length; i++) used[play[i].rank * 4 + play[i].suit] = 1;
  var byR = Object.create(null);
  for (i = 0; i < hand.length; i++) {
    if (!used[hand[i].rank * 4 + hand[i].suit]) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
  }
  var pairR = 0, maxRun = 0, run = 0;
  for (r = 0; r <= 11; r++) {
    var c = byR[r] || 0;
    if (c >= 2) pairR++;
    if (c > 0) { run++; if (run > maxRun) maxRun = run; }
    else run = 0;
  }
  return { pairR: pairR, maxRun: maxRun };
}

// end bestResponseMove — W2A COMBAT_NEAR_RESIDUAL (after details.sort)
// Leave free-lead multiTie coefficients untouched. Combat only.
if (cur && details.length) {
  var bestR = details[0].rate;
  var band = 1 / Math.max(1, trials);
  var actBySig = {};
  for (var ai2 = 0; ai2 < actions.length; ai2++) actBySig[playSig(actions[ai2])] = actions[ai2];
  var pool = details.filter(function (d) { return d.rate >= bestR - band - 1e-9; });
  pool.sort(function (da, db) {
    var a = actBySig[da.sig], b = actBySig[db.sig];
    if (a == null && b != null) return 1;
    if (a != null && b == null) return -1;
    if (a == null && b == null) return 0;
    var ra = residualMultiKeys(hand, a), rb = residualMultiKeys(hand, b);
    if (ra.pairR !== rb.pairR) return rb.pairR - ra.pairR;
    if (ra.maxRun !== rb.maxRun) return rb.maxRun - ra.maxRun;
    var ca = structureBreakCost(hand, a), cb = structureBreakCost(hand, b);
    if (ca !== cb) return ca - cb;
    return topRank(a) - topRank(b); // tertiary only — not primary mintop
  });
  if (pool.length && actBySig[pool[0].sig] !== undefined) bestPlay = actBySig[pool[0].sig];
}
```

**Reject siblings:** min-top-first near-tie (cntie); soft residual ε (cres); band `2/nTry`; apply to free-lead; stack multiTie weight.

**DEV probe tag:** `p_w2_cnres`

---

### W2B — `BR_GATED_PASS_CAND` (pin pass into combat BR set)

| | |
|--|--|
| **Axis** | When facing mid multi/pair and deep non-race hand, **score pass as a BR candidate even if cheap answers exist**. Gate only; BR rates still decide. |
| **Human edge** | H_pass_E_play **30**; CF humanPassAltPlay **33**; humanPlayAltPass **0** (AI never folds when human plays). |
| **Why not wave1** | Wave1 never opened pass cand set. Expert fold widen (`mbtwofold`) and soft `passTie` were package-flat historically; this is **cand-set** (hard first-diff), not soft score or bulk expert pass. |
| **Why might transfer** | Under fair dual both seats get same gate; skill = when fold is scored, not “who has BR.” Narrow gate avoids over-active reverse of H_play_E_pass (76). |
| **Function** | `bestResponseMove` combat actions after `allowPass` |
| **Lines** | `policies/v91-search.js` **1003–1007** |
| **Budget** | ~8–12 lines |

```js
// after: var actions = leg.slice(); if (allowPass) actions.push(null);
// W2B BR_GATED_PASS_CAND — pin null when deep mid multi; never singles/bombs/race
if (cur && !allowPass) {
  var hLen = hand.length;
  var oMn = oppMinHand(state, myIdx);
  var cTop = cur.top ? cur.top.rank : 0;
  if (
    hLen >= 9 &&
    oMn >= 5 &&
    cTop < 9 &&
    cur.type !== 'single' &&
    !playIsBomb(cur.cards || [])
  ) {
    actions.push(null);
  }
}
```

**Optional tighter (still one axis):** require `hLen >= 10 && oMn >= 6` if N20 over-passive; do not also change expertPolicy pass bands in same probe.

**Reject siblings:** bulk reverse H_play_E_pass; always-pin pass mid single; soft passTie ε only; expert fold handLen≥10 alone (prior flat); free-lead pass nonsense.

**DEV probe tag:** `p_w2_gpass`

---

### W2C — `EXPERT_CHEAP_SBC_PASS` (gated fold before cheap force-play)

| | |
|--|--|
| **Axis** | In `expertPolicy` combat: before `if (cheap.length) return orderLegals(cheap)[0]`, if **every** cheap legal has `structureBreakCost ≥ 10` and deep mid multi fold gate holds → **pass** instead of smash. |
| **Human edge** | residual + fold: cheap path today **never** passes (~419–420); humans fold when only answers smash pairs/runs (pass→pair 22 CF class). |
| **Why not wave1** | mintop only reordered cheap; never refused smash. Distinct from W2B (BR cand) — this hits **leaf rollouts + expert root** so BR rates themselves shift. |
| **Why might transfer** | Structure-preserving fold is state-local (sbc + gate), not seed11 FL pin. Small Δ: fires only when all cheap answers are structural disasters. |
| **Function** | `expertPolicy` cheap return |
| **Lines** | `policies/v91-search.js` **407–420** (insert between deep multi fold block and cheap return) |
| **Budget** | ~10–14 lines |

```js
// after existing deep mid multi fold (handLen≥11 …); before: if (cheap.length) return …
// W2C EXPERT_CHEAP_SBC_PASS
var cheap = cheapLegals(leg);
if (
  cheap.length &&
  handLen >= 9 &&
  omin >= 5 &&
  curTop < 9 &&
  cur.type !== 'single' &&
  !playIsBomb(cur.cards || [])
) {
  var allSmash = true;
  for (var si = 0; si < cheap.length; si++) {
    if (structureBreakCost(hand, cheap[si]) < 10) { allSmash = false; break; }
  }
  if (allSmash) return { pass: true };
}
if (cheap.length) return { play: orderLegals(cheap, state, cp)[0] };
// (remove duplicate cheap = cheapLegals(leg) if inlining over existing line 419)
```

**Reject siblings:** pass if *any* cheap sbc≥8 (too wide; prior cheapfold flat); widen bulk soft-pass 76 reverse; sbc inflate in `structureBreakCost`; stack W2B+W2C before each clears alone.

**DEV probe tag:** `p_w2_csbc`

---

## 3. Explicit REJECT list (wave2 — do not probe as skill)

| Reject | Why |
|--------|-----|
| **SoftN** | Fingerprint / hollow; dual-flat history |
| **mintop / ORDER_MINBEAT re-tune** | DEV sig → HOLDOUT fail (wave1) |
| **cntie min-top near-tie** | Same min-top family; 27/50 only |
| **cres soft residual multiTie ε** | Flat 26/50; soft multiTie weight class |
| **two / TWO_OMIN2** | Dual-null 25/50 |
| **FL pin stacks** (`mbpin*`, trash pin) | DEV 0.74 → HOLDOUT ~0.50 seed11 FL overfit |
| **Soft multiTie weight sweeps** | Documented dual regs / cliffs |
| **Near-tie free-lead** (`mbntie_all` FL) | Absolute train theater |
| **Bulk `expertScore` rewrite** | Imitation ≠ dual |
| **Stacked multi-locus packages** before each W2 clears alone | Overfit pattern |
| **Bulk reverse `H_play_E_pass` (76)** | Over-active dual risk |
| **Combat BR density alone** | Equal-BR cancels |
| **Hollow budget / BR-off / perfect-info duals** | Not fair dual skill |
| **Hunting seed 20380387** | Structural unflippable |
| **Peek HOLDOUT 20260801/2 during design** | Contaminates ship gate |
| **DEV absolute WR as ship evidence** | Only dual holdout both seats |

---

## 4. Edit-locus map (pure freeze `v91-search.js`)

| Lever | Function | Approx lines | Touch surface |
|-------|----------|-------------:|---------------|
| **W2A** | `residualMultiKeys` helper + `bestResponseMove` post-select | **139–178** (helper), **1056–1068** | Combat band only; multiTie **1045–1048** untouched |
| **W2B** | `bestResponseMove` actions / allowPass | **1003–1007** | Pin `null` only; no score ε |
| **W2C** | `expertPolicy` pre-cheap | **407–420** | Gated pass; leave soft-pass **486–487** alone |
| Reuse read-only | `structureBreakCost`, `analyzeHand`, `topRank`, `cheapLegals` | **99–109**, **139–224**, **120–123** | No weight rewrite |
| Soft combat root | combat soft ~**2780–2877** | Perfect-info only — **skip** as primary fair-dual lever |

`v91-ai.js`: **no edit** for W2A–W2C.

---

## 5. DEV probe protocol (only)

```
1. Identity DEV: FREEZE=v91 CHALL=v91 seed0=20260711 GAMES=25 BOTH_SEATS=1
   Expect WR ≈ 0.50.

2. One lever at a time (prefer W2A → W2B → W2C):
   residual ranking first (no pass risk), then BR pass cand, then expert leaf fold.
   Copy policies/v91-search.js → policies/<tag>-search.js; ≤15-line axis; ai = v91-ai pair.

3. DEV interest: liveWins ≥ identity + 2 (and/or ≥32/50 binomial). Prefer small Δ.
   If only FL seed11 fingerprint flips, treat as mintop-class risk — do not promote.

4. DEV_VAL 20260715 once for selection (no re-edit after peek). Need Δid ≥ +2.

5. HOLDOUT_A then HOLDOUT_B once each. Ship iff both WR > 0.70 AND Δid ≥ +2.
   Never retune after holdout peek.

6. Stack only if two independent W2s each clear DEV interest alone.
```

```bash
# Design loop (DEV only)
FREEZE=v91 CHALL=p_w2_cnres SEED0=20260711 GAMES=25 BOTH_SEATS=1 \
  node evolve/fair-eval-holdout.js
# Do NOT set seed0 to 20260801/2 until promotion.
```

---

## 6. Top-3 one-liners (execute order)

1. **W2A `COMBAT_NEAR_RESIDUAL`** — combat near-rate hard residual pairR→maxRun→sbc→top (`bestResponseMove` ~1056–1068); not mintop/cntie.  
2. **W2B `BR_GATED_PASS_CAND`** — pin pass into BR combat actions when deep mid multi (`~1003–1007`); rates still decide.  
3. **W2C `EXPERT_CHEAP_SBC_PASS`** — expert cheap path pass when all cheap sbc≥10 + deep mid multi (`~407–420`).

**Path:** `/Users/johnhoang/Developer/Grok/tieng-len/evolve/NOTE-fair-dev-oneaxis-wave2.md`

---

## 7. Wave1 vs Wave2 contrast (quick)

| | Wave1 | Wave2 |
|--|-------|-------|
| Ranking key | min-top / soft sbc ε | residual multi keys hard |
| Fold | none | BR cand + expert sbc gate |
| DEV best | mintop 0.64 sig | target small transferable Δ |
| Holdout | mintop fail | unknown — design-only until promotion |
| Forbidden | softN, stacks | + re-probe mintop/cres/two/cntie, FL pin, multiTie weight |

---

*Imitation match rate ≠ dual win rate. Prefer residual structure + gated fold over min-top DEV theater that dies on holdout.*
