# Fair dual s12 absolute — WAVE2 one-axis levers (post nest/ovk)

**Date:** 2026-07-14  
**Base package:** `policies/p_mbntie_all-search.js` (champion) · optional stack base `p_mbnest-search.js` when lever needs nest path  
**Protocol:** locked fair dual — hidden · GM both · BR both · equal · BOTH_SEATS · MS150 T12 SOFT4  
**SoftN:** forbidden forever

## Locked evidence (do not re-argue)

| Probe | s11 | s12 | s13 | Read |
|-------|----:|----:|----:|------|
| p_mbntie_all | **0.76** | 0.54 | 0.54 | FL+ntie min-top seed-local |
| p_mbnest | 0.72 | 0.56 | 0.48 | nest hSelf≤11 helps s12 tiny; s13 soft |
| **p_mbnest_ovk** | 0.72 | **0.58** | **0.40** | best s12 · **s13 REGRESS** |
| p_mbovk alone | 0.68 | 0.52 | — | gap>2 blind = dual-flat |
| p_mbntie_rr | 0.70 | **0.46** | — | residual-**first** FL+combat **regresses s12** |

**s12 residual class (mbnest_ovk still loses):** long midgames 13–27 steps; many seat1 after seat0 win — combat rate / structure, not more FL pin. Sticky seeds: `20310577`, `20330523`, `20340496`, `20350469`, `20370415`, `20380388`, `20450199`–`20500064`, `20480118`.

**Wave1 already burned:** loose nest `hSelf≤11` · blind `GUARD_COMBAT_OVERKILL` · residual-first ntie on FL+combat.  
**Prefer:** tighter nest gates · equal leaf quality · residual **combat** (tertiary / gated) — **NOT** more free-lead pin.

### Package already in (do not re-axis)
FL hybrid strong · combat residual soft-ε · orderLegals min-top→sbc · TWO_OMIN2 · BR_FL_PIN trash+pairs top≤6 · near-tie hard min top→sbc→len (FL+combat)

### Forbidden
SoftN · hollow budget · perfect duals · soft multiTie weight retune · expert-first FL · forcelow · pair-first · passc re-run · cheapfold · residual-first ntie (mbntie_rr shape) · ms280-as-skill · more FL pin bulk

---

## Top 3 NEW one-axis levers (wave2)

Base each as **p_mbntie_all + ONE axis** (copy → tag). For lever A, nest gate is the sole delta vs pure expert self. For B, either stack on `p_mbnest` body **or** enable the A gate so `shallowSelfPick` is live under fair dual.

---

### Lever A — `BR_SELF_NEST_COMBAT_ONLY` ⭐ (tighter nest gate)

**Why new / why absolute:** Wave1 nest fires on **free-lead and combat** whenever `hSelf≤11`. That inflates FL open rates (s11-ish optimism) and, stacked with ovk, **s13 both-seat cliffs**. s12 residual losses are **mid combat** (13–27 steps). **Combat-only** nest + **tighter hand cap (≤9)** still flips forced-win rates when unique-max blocks ntie, without FL nest free-lead noise.

**Not:** mbnest `hSelf≤11` always · mbnest_fl (FL always nest + combat≤8) · c12 combat-bail widen alone.

**Function:** `bestResponseMove` playout self branch (mbntie_all ~L1084–1086; mbnest ~L1084–1089).

**Edit shape (~10 lines):**

```js
// BR_SELF_NEST_COMBAT_ONLY — replace self branch in BR trial playout
var dec;
if (cp === myIdx) {
  var hSelf = s.players[myIdx].hand.length;
  var curSelf = s.currentCombo;
  // Nest ONLY in combat, short/mid hand — never free-lead nest under fair dual
  if (strongSelf || (curSelf && hSelf <= 9)) {
    dec = shallowSelfPick(s, myIdx);
  } else {
    dec = expertPolicy(s, cp);
  }
} else {
  dec = oppPol;
}
```

**Risk:** Low–med wall-clock (combat nest only). If first-diff rare, raise combat cap to `hSelf<=10` (still no FL).  
**s12 residual class:** mid combat forced-wins on sticky seeds above; seat1 long losses.  
**s13 guard:** no FL nest → less open-rate overfit; do **not** stack blind ovk in same probe.  
**Probe tag:** `p_mbnest_co`

---

### Lever B — `LEAF_EQ_FORCEWIN_RESID` (equal leaf quality among forced wins)

**Why new / why absolute:** `shallowSelfPick` returns the **first** candidate with `exploitPlayoutLeaf>=0.99` in `orderLegals` order (min-top). Under nest, BR rates then credit a **min-top forced line** even when another forced win leaves pair/run residual — leaf quality is **unequal / order-biased**, not structure-equal. Collecting all forced wins in the cap and picking by **residual pairs → min sbc → min top** equalizes leaf selection without soft multiTie weights and without residual-first ntie at root (mbntie_rr failed).

**Not:** residual-first root ntie · soft multiTie retune · binary→float util (separate honorable).

**Depends:** nest path must be live — **base = copy `p_mbnest`** (or nest_co) + this axis only inside `shallowSelfPick`.

**Function:** `shallowSelfPick` forced-win scan (~L1212–1218 mbnest / ~L1190s).

**Edit shape (~12 lines):**

```js
// LEAF_EQ_FORCEWIN_RESID — replace first-found forced return
var fallback = expertPolicy(state, myIdx);
var forced = [];
for (i = 0; i < leg.length; i++) {
  var n = applyPlayFast(state, myIdx, leg[i]);
  n.isFirstLead = false;
  if (exploitPlayoutLeaf(n, myIdx, 200) >= 0.99) forced.push(leg[i]);
}
if (!forced.length) return fallback;
function resPairs(play) {
  var by = {}, j, r, left = 0;
  for (j = 0; j < hand.length; j++) by[hand[j].rank] = (by[hand[j].rank] || 0) + 1;
  for (j = 0; j < play.length; j++) by[play[j].rank] = (by[play[j].rank] || 0) - 1;
  for (r in by) if (by[r] >= 2) left++;
  return left;
}
forced.sort(function (a, b) {
  var ra = resPairs(a), rb = resPairs(b);
  if (ra !== rb) return rb - ra; // more residual pairs first
  var ca = structureBreakCost(hand, a), cb = structureBreakCost(hand, b);
  if (ca !== cb) return ca - cb;
  function top(p){var t=-1;for(var k=0;k<p.length;k++)if(p[k].rank>t)t=p[k].rank;return t;}
  return top(a) - top(b);
});
return { play: forced[0] };
```

**Risk:** Med CPU (eval all cap candidates, not early exit). Cap already ≤10/14 — OK under MS150 if nest_co.  
**s12 residual class:** mid multi answers where min-top force-win burns second pair (20480118-class).  
**s13 guard:** only re-ranks **already forced** wins — no new false optimism vs first-found.  
**Probe tag:** `p_mbleaf_eq`

---

### Lever C — `NTIE_COMBAT_RESID_TERTIARY` (residual combat — not residual-first)

**Why new / why absolute:** `p_mbntie_rr` put residual pairs **first** on **FL+combat** near-ties → s12 **0.46** (anti-ship). Package ntie is pure **top→sbc→len** (min-top FL bias). Wave2 residual combat puts residual **after** min-top and sbc, and **only when `cur`** (combat roots). Free-lead near-ties keep package min-top. Hard structure discrimination on mid combat near-ties without reopening FL residual-first cliff.

**Not:** mbntie_rr residual-first · soft combat multiTie weight · more FL pin · blind ovk.

**Function:** near-tie `pool.sort` in `bestResponseMove` (~L1123–1134 p_mbntie_all).

**Edit shape (~14 lines):**

```js
// NTIE_COMBAT_RESID_TERTIARY — combat-only residual after min-top→sbc
pool.sort(function (da, db) {
  var a = actBySig[da.sig], b = actBySig[db.sig];
  if (a == null && b != null) return 1;
  if (a != null && b == null) return -1;
  if (a == null && b == null) return 0;
  function top(p){var t=-1;for(var i=0;i<p.length;i++)if(p[i].rank>t)t=p[i].rank;return t;}
  var ta = top(a), tb = top(b);
  if (ta !== tb) return ta - tb;                 // 1) min-top (package)
  var ca = structureBreakCost(hand, a), cb = structureBreakCost(hand, b);
  if (ca !== cb) return ca - cb;                 // 2) min sbc (package)
  if (cur) {                                     // 3) combat residual only
    function resPairs(play) {
      var by = {}, i, r, left = 0;
      for (i = 0; i < hand.length; i++) by[hand[i].rank] = (by[hand[i].rank] || 0) + 1;
      for (i = 0; i < play.length; i++) by[play[i].rank] = (by[play[i].rank] || 0) - 1;
      for (r in by) if (by[r] >= 2) left++;
      return left;
    }
    var ra = resPairs(a), rb = resPairs(b);
    if (ra !== rb) return rb - ra;
  }
  return a.length - b.length;                    // 4) shorter
});
```

**Risk:** Low — only fires in one-trial combat band with same top+sbc.  
**s12 residual class:** pair-ladder mid answers same top, different residual pairs (20480118 / 20310577).  
**s13 guard:** no FL residual reorder; no climb veto → no ovk-style both-seat cliff.  
**Probe tag:** `p_mbntie_cr`

---

## Ranked execute order

| Rank | Tag | Axis | Why s12↑ without s13 collapse |
|-----:|-----|------|-------------------------------|
| **1** | `p_mbnest_co` | BR_SELF_NEST_COMBAT_ONLY | Rate skill mid combat; **no FL nest** (anti s13/ovk interaction) |
| **2** | `p_mbleaf_eq` | LEAF_EQ_FORCEWIN_RESID | Equal leaf among forced wins; structure without root residual-first |
| **3** | `p_mbntie_cr` | NTIE_COMBAT_RESID_TERTIARY | Residual combat hard key; FL ntie unchanged |

### Honorable (if A–C first-diff but dual-flat)
- **`BR_LEAF_UTIL_MEAN`:** score = mean(`finalUtility` or `leafEval2p`) not binary `wins/nTry` — continuous equal leaf; one-axis only if A/B flat.  
- **`GUARD_OVK_RESID`:** apply gap>2 clamp **only if** minTop residual pairs ≥ proposed residual pairs (softens s13 race denial). Never stack with loose nest.  
- **Do not:** more FL pin · residual-first ntie · SoftN · ms280-as-skill.

### Still reject
SoftN · hollow budget · expert-first FL · forcelow · passc · cheapfold · pair-first · hunting 20380387 · perfect duals · mbntie_rr shape · blind ovk+loose nest stack

---

## Probe protocol

```bash
# One axis each from p_mbntie_all (A,C) or p_mbnest (B)
FREEZE=v91 CHALL=p_mbnest_co GAMES=20 SEED=20260712 BOTH_SEATS=1 \
  node evolve/lean-fair-dual-n20.js
# Interest: s12 N20 ≥ identity+1 with mid-combat first-diff
# Then N50: s12 primary, s11 no cliff >−4, **s13 must not collapse** (reject if s13 < 0.48)
# Ship only: WR>0.70 on s11 AND independent s12 (prefer s13 ≥ 0.50)
```

**Accept / reject**
1. s12 N50 absolute **≥0.62** interest / **>0.70** ship candidate  
2. s11 N50 **≥0.70** (no free-lead cliff >−4 wins)  
3. **s13 N50 ≥0.48** hard reject floor (mbnest_ovk 0.40 = toxic)  
4. first-diff on mid combat residual seeds — not FL-only s11 pets

---

## One-liners (top 3)

1. **`p_mbnest_co` — BR_SELF_NEST_COMBAT_ONLY:** nest `shallowSelfPick` only when combat + hand≤9 (never free-lead nest under fair dual).  
2. **`p_mbleaf_eq` — LEAF_EQ_FORCEWIN_RESID:** among shallow forced-wins, pick max residual pairs → min sbc → min top (equal leaf, not first-found).  
3. **`p_mbntie_cr` — NTIE_COMBAT_RESID_TERTIARY:** combat near-ties only: after min-top→sbc, max residual pairs (not residual-first; FL ntie unchanged).
