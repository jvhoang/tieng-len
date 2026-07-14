# Fair dual WAVE6 — 3 NEW one-axis levers (post OA–W5 flat + mintop holdout fail)

**Date:** 2026-07-14  
**Freeze body:** pure `policies/v91-search.js` (+ `v91-ai.js` unchanged)  
**Protocol (locked):** hidden · GM · BR both · equal budget ·  
`MS=150 TRIALS=12 SOFT=4 BRANCH=12` · BOTH_SEATS  
**DEV design only:** `seed0=20260711` N50. **Never peek holdout** `20260801` / `20260802` until DEV≥32 **and** DEV_VAL Δ≥+2.  
**Ship:** both holdouts WR>0.70 and Δid≥+2.

### Sources
| Artifact | Takeaway |
|----------|----------|
| `NOTE-mintop-firstdiff.json` | Mintop flip seeds: combat singles **overkill→min-beat** (`As→Ts`, `Qd→5s`, `Td→6s`, `Qs→Js`); FL first-diffs may be budget noise |
| `playlog-strategy-inference.json` | residual hBetter **186** / e **48**; `H_overkill_E_minimal` **59**; `H_pass_E_play` **30** |
| `HUMAN-LOSS-MINES-v11.md` / CF-all | combatDiffer **188**; humanPassAltPlay **33**; humanPlayAltPass **0**; same-class ~**75** |
| `NOTE-fair-dev-screen-20260714.md` + `STATUS.md` | OA/W2–W5 all **25–26/50**; hard mintop **32** then holdout fail; mbnest stack theater |
| Playlog export | `/Users/johnhoang/Downloads/tienlen-playlogs-1783931122937.json` (158 games; inference above) |

---

## Mechanism lesson (why W2–W5 died)

Under fair dual, **BR picks unique max `k/12` rates**. Soft multiTie / near-rate bands / order softenings almost never change the unique max → dual-flat.

| What moved DEV | Why | Ship |
|----------------|-----|------|
| `p_p1_mintop` hard `orderLegals` min-top→sbc **before** expertScore | Cascades leaf + root order; first-diff combat gap overkill | **HOLDOUT fail** (A 0.42) |
| `p_mbnest` multi-axis stack | Interaction theater (pin×mintop×…) | HOLDOUT fail |
| SoftN / multiTie weight / FL pin alone / residual soft / gated pass pin / cheap sbc pass | Do not change unique BR max set | flat 25–26 |

**Wave6 rule:** each lever must either (1) **remove** overkill from the BR action set, (2) **hard-force** a different expert leaf so playout rates move, or (3) **strip** structure-smash plays so pass can become unique max. Soft ε and near-rate-only are forbidden.

**Burned (do not re-propose):** mintop hard orderLegals-before-expertScore · mbnest stack · FL pin · soft multiTie weight · SoftN · all OA/W2–W5 flats · bulk expertScore rewrite · SoftN.

**Also do not re-tag as “new”:** draft `p_w6_ovkgap` / `p_w6_mtsing2` (mintop-family orderLegals) · `p_w6_brgap` (near-rate only) · `p_w6_exovk` (soft score weight). Those are mintop/soft clones, not wave6.

---

## Exactly 3 NEW one-axis levers (≤15 lines each)

Base: copy `policies/v91-search.js` → `policies/<tag>-search.js`; pair ai = v91-ai. **One axis only.**

---

### W6A — `BR_DROP_GAP_OVERKILL` ⭐ (combat min-beat gap≥2 via **cand-set**, not orderLegals)

| | |
|--|--|
| **Axis** | In `bestResponseMove` combat: after cheap + `orderLegals`, **drop** single answers with `gap > 2` when any single with `gap ≤ 2` exists. BR only scores the min-band → **unique max rate changes**. |
| **Human / first-diff** | Mintop first-diff: `As→Ts` (facing 3s), `Qd→5s` (facing 3c) — pure overkill singles under deep hands. Inference `H_overkill_E_minimal` **59**. |
| **Why not burned mintop** | Mintop **reorders** all combat before expertScore (holdout-fragile multi-class cascade). This **never touches `orderLegals` / expertScore** — only BR root cand set. Soft near-rate (`cntie`/`brgap`) still scores overkill; drop removes it. |
| **Why mass ≥7 possible** | Same decision mass as mintop combat singles; forces first-diff even when overkill had unique `k/12` (soft multiTie cannot). |
| **Function** | `bestResponseMove` combat branch |
| **Lines** | `policies/v91-search.js` **996–1001** (after `leg = orderLegals(...)`, before `maxBranch` slice) |
| **Probe tag** | `p_w6_brdrop` |

```js
// after: leg = orderLegals(leg, state, myIdx);   // combat only (!!cur path)
// W6A BR_DROP_GAP_OVERKILL — remove gap>2 singles if a tighter single exists
if (cur && cur.type === 'single' && cur.top) {
  var cTop = cur.top.rank, minGap = 99, i;
  for (i = 0; i < leg.length; i++) {
    if (leg[i] && leg[i].length === 1) {
      var g0 = leg[i][0].rank - cTop;
      if (g0 >= 1 && g0 < minGap) minGap = g0;
    }
  }
  if (minGap <= 2) {
    leg = leg.filter(function (p) {
      if (!p || p.length !== 1) return true;
      return (p[0].rank - cTop) <= 2;
    });
  }
}
```

**Reject siblings:** orderLegals mintop / ovkgap / mtsing · near-rate min only · gap penalty in expertScore · drop multi answers · free-lead.

**Risk:** Medium — may deny race climb when gap>2 is the only tempo (gate already keeps gap≤2 if any exists; if all gaps>2, no drop). Holdout risk lower than full mintop (no multi-class reorder) but still anti-overkill fingerprint — require DEV_VAL.

---

### W6B — `EXPERT_CHEAP_RESID_HARD` (residual structure hard pick on cheap path)

| | |
|--|--|
| **Axis** | In `expertPolicy`, replace bare `orderLegals(cheap)[0]` with hard pick: **max residual pairR → max maxRun → min sbc → min top**. Fires every combat cheap leaf + expert root fallback. |
| **Human edge** | residualScore **186:48** (largest quantitative edge); CF same-class structure ~75; not pure min-top. |
| **Why not burned / flat** | `p_w2_cnres` = near-rate residual only (flat — unique rates dominate). `p_w3_ordres` = residual-first full `orderLegals` (flat). `p_p1_cres` = soft ε (flat). This is **hard cheap-path pick always**, not band/ε — changes **leaf playout rates** so BR unique max can move on *all* combat classes. |
| **Why mass ≥7 possible** | Cheap path is the dominant combat leaf; residual re-rank every playout step = mintop-scale cascade without mintop primary key. |
| **Function** | `expertPolicy` (+ tiny helper near `structureBreakCost`) |
| **Lines** | helper ~**139–178**; cheap return **419–420** |
| **Probe tag** | `p_w6_cresid` |

```js
// helper once near structureBreakCost (shared, compact)
function residualMultiKeys(hand, play) {
  var used = Object.create(null), i, r;
  for (i = 0; i < play.length; i++) used[play[i].rank * 4 + play[i].suit] = 1;
  var byR = Object.create(null);
  for (i = 0; i < hand.length; i++) {
    if (!used[hand[i].rank * 4 + hand[i].suit]) {
      r = hand[i].rank; byR[r] = (byR[r] || 0) + 1;
    }
  }
  var pairR = 0, maxRun = 0, run = 0;
  for (r = 0; r <= 11; r++) {
    var c = byR[r] || 0;
    if (c >= 2) pairR++;
    if (c > 0) { run++; if (run > maxRun) maxRun = run; } else run = 0;
  }
  return { pairR: pairR, maxRun: maxRun };
}

// replace: if (cheap.length) return { play: orderLegals(cheap, state, cp)[0] };
// W6B EXPERT_CHEAP_RESID_HARD
if (cheap.length) {
  cheap = cheap.slice().sort(function (a, b) {
    var ra = residualMultiKeys(hand, a), rb = residualMultiKeys(hand, b);
    if (ra.pairR !== rb.pairR) return rb.pairR - ra.pairR;
    if (ra.maxRun !== rb.maxRun) return rb.maxRun - ra.maxRun;
    var ca = structureBreakCost(hand, a), cb = structureBreakCost(hand, b);
    if (ca !== cb) return ca - cb;
    return topRank(a) - topRank(b); // tertiary only — not primary mintop
  });
  return { play: cheap[0] };
}
```

**Reject siblings:** residual soft multiTie · combat near-rate residual · residual-first full orderLegals · sbc inflate weights · min-top primary.

**Risk:** Low–med dual; tertiary top is anti-overkill-light only. If DEV null, do **not** widen to non-cheap legals in same probe.

---

### W6C — `BR_SMASH_STRIP_PASS` (gated fold that **changes unique BR max rate**)

| | |
|--|--|
| **Axis** | Deep mid multi/pair: if **every** cheap legal has `structureBreakCost ≥ 10`, **strip all cheap from BR `leg`**, force `actions` include `null`. Pass is no longer drowned by smash plays that uniquely max `k/12`. |
| **Human edge** | `H_pass_E_play` **30**; CF humanPassAltPlay **33** / humanPlayAltPass **0**; pass→pair **22**. |
| **Why not burned / flat** | `p_w2_gpass` only **pins** pass while still scoring smash → smash unique rate wins → flat. `p_w2_csbc` expert-only fold (flat under equal BR root). `p_w3_fold9` wider soft-pass (flat). This **removes** smash from the scored set so pass can be unique max. |
| **Why mass ≥7 possible** | CF pass mass is large; first-diff mid multi when freeze contests with pair-smash. Hard set surgery ≈ mintop mass class for fold seeds. |
| **Function** | `bestResponseMove` combat actions |
| **Lines** | `policies/v91-search.js` **996–1007** |
| **Probe tag** | `p_w6_smashbr` |

```js
// combat branch after: var ch = cheapLegals(leg); if (ch.length) leg = ch; leg = orderLegals(...)
// before maxBranch — W6C BR_SMASH_STRIP_PASS
if (cur && ch && ch.length) {
  var hLen = hand.length, oMn = oppMinHand(state, myIdx);
  var cTop = cur.top ? cur.top.rank : 0;
  if (
    hLen >= 9 && oMn >= 5 && cTop < 9 &&
    cur.type !== 'single' && !playIsBomb(cur.cards || [])
  ) {
    var allSmash = true, ci;
    for (ci = 0; ci < ch.length; ci++) {
      if (structureBreakCost(hand, ch[ci]) < 10) { allSmash = false; break; }
    }
    if (allSmash) {
      leg = []; // strip smash cheap from BR set
      // after actions = leg.slice(): force pass cand
      // (inline: set a flag smashPass=true; later actions = [null] or actions.push(null))
    }
  }
}
// ... after: var actions = leg.slice(); if (allowPass) actions.push(null);
// if (smashPass) { actions = [null]; }  // unique BR max = pass only among cheap-only world
```

Compact one-block form (≤15 lines total including flag):

```js
// Insert in combat path replacing allowPass / actions init (~1003–1007)
var smashPass = false;
if (cur && ch && ch.length) {
  var hL = hand.length, oM = oppMinHand(state, myIdx), cT = cur.top ? cur.top.rank : 0;
  if (hL >= 9 && oM >= 5 && cT < 9 && cur.type !== 'single' && !playIsBomb(cur.cards || [])) {
    smashPass = ch.every(function (p) { return structureBreakCost(hand, p) >= 10; });
  }
}
if (smashPass) leg = [];
if (leg.length > maxBranch) leg = leg.slice(0, maxBranch);
var allowPass = smashPass || (!!cur && cheapLegals(
  getLegalPlays(hand, cur, state.players[myIdx].passed, state.isFirstLead, state.firstLeadCard)
).length === 0);
var actions = leg.slice();
if (allowPass) actions.push(null);
```

**Reject siblings:** passTie soft · gpass pin-only · expert fold widen alone · reverse H_play_E_pass (76) · singles fold gate.

**Risk:** Medium–high over-passive if sbc≥10 is common on pairs (pair answers often cost 0 → gate rare; good). If too rare, only then try threshold 8 in a **separate** probe — not same axis.

---

## Ranked execute order

| Rank | Tag | Axis | First-diff locus | Fair dual bet |
|-----:|-----|------|------------------|---------------|
| **1** | `p_w6_brdrop` | BR_DROP_GAP_OVERKILL | combat single overkill (As/Qd class) | unique BR max among gap≤2 |
| **2** | `p_w6_cresid` | EXPERT_CHEAP_RESID_HARD | every cheap combat leaf | residual rates cascade |
| **3** | `p_w6_smashbr` | BR_SMASH_STRIP_PASS | mid multi smash→pass | pass unique max when all cheap smash |

### Honorable (defer)
- `BR_HARD_MIN_OVERRIDE` after scores (force min if gap>2 regardless of rate) — harsher than drop; only if brdrop DEV null.
- Combat-only nest alone already flat (W4); do not revive stack.

---

## Explicit REJECT (wave6)

| Reject | Why |
|--------|-----|
| mintop / ovkgap / mtsing* orderLegals-before-expert | Burned holdout family (even if DEV 32) |
| soft multiTie · SoftN · FL pin | Burned / hollow |
| OA–W5 flats | Dual-null under fair dual |
| near-rate residual / near-rate min / pass pin without strip | Cannot flip unique max |
| bulk expertScore / sbc×N weight | W5 softmin/sbchvy flat |
| holdout peek during design | Contaminates ship gate |

---

## Probe protocol

```bash
# Identity sanity
DEV_ONLY=1 FREEZE=v91 CHALL=v91 node evolve/fair-eval-holdout.js   # expect 25/50

# One axis at a time (DEV only)
DEV_ONLY=1 FREEZE=v91 CHALL=p_w6_brdrop node evolve/fair-eval-holdout.js
DEV_ONLY=1 FREEZE=v91 CHALL=p_w6_cresid node evolve/fair-eval-holdout.js
DEV_ONLY=1 FREEZE=v91 CHALL=p_w6_smashbr node evolve/fair-eval-holdout.js

# Interest: ch ≥ 32/50 and Δid ≥ +2 → then DEV_VAL seed 20260715
# Ship holdout only after DEV_VAL; never retune after peek
```

**Success pre-ship:** DEV ≥32 + DEV_VAL Δ≥+2 + first-diff on combat residual/overkill/fold seeds (not FL-only noise).  
**Ship:** HOLDOUT_A **and** HOLDOUT_B both WR>0.70 and Δid≥+2.

---

## Top-3 one-liners

1. **`p_w6_brdrop` — BR_DROP_GAP_OVERKILL:** combat singles drop gap>2 when gap≤2 exists (`bestResponseMove` ~996–1001).  
2. **`p_w6_cresid` — EXPERT_CHEAP_RESID_HARD:** cheap path hard residual pairR→maxRun→sbc→top (`expertPolicy` ~419–420).  
3. **`p_w6_smashbr` — BR_SMASH_STRIP_PASS:** strip all-smash cheap + force pass cand so pass can unique-max (`bestResponseMove` ~996–1007).

*Path:* `/Users/johnhoang/Developer/Grok/tieng-len/evolve/NOTE-fair-wave6-levers.md`
