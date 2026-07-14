# Fair dual s12 absolute skill — 3 NEW levers (post p_mbntie_all)

**Date:** 2026-07-13  
**Base:** `policies/p_mbntie_all-search.js` (champion package on v91 body)  
**Protocol:** fair dual locked — hidden · GM both · BR both · equal budget · BOTH_SEATS · MS150 T12 SOFT4  
**Ship gap:** s11 **38/50 = 0.76** · s12 **27/50 = 0.54** · s13/14 ~0.52–0.54 → need **WR>0.70 on primary AND independent re-run**  
**Diagnosis:** package is **seed11 free-lead overfit** (FL pin + near-tie min-top). Independent seeds barely clear identity. s12 `lossSeeds` are long midgames (12–26 steps, both seats) — need **combat / leaf discrimination**, not more FL pin bulk.

### Package already in (do not re-axis)
FL hybrid strong · combat residual soft-tie ε · orderLegals min-top→sbc · TWO_OMIN2 · BR_FL_PIN trash+low pairs top≤6 · **near-tie hard argmin top→sbc→len on FL+combat**

### Forbidden / do not re-try
SoftN · hollow budget · perfect-info duals · soft multiTie weight retune · expert-first FL · forcelow bulk · pair-first pool · passc re-run · cheapfold · passTie · lowpair keep-high · sbc inflate · hunting 20380387 · ms280-as-skill

### Why s11 ≠ absolute skill
| Seed | WR | Read |
|------|---:|------|
| 20260711 | 0.76 | FL pin + ntie min-top freeloads on this deal stream |
| 20260712 | 0.54 | Δ≈+2 vs identity — **no general midgame edge** |
| 20260713/14 | ~0.52–0.54 | same |

Fair dual `strongSelf:false` → BR playouts are **pure `expertPolicy`**. Unique max-rate roots (`k/12`) ignore soft-ε and only fire ntie when band non-empty. Overkill climbs with unique rates never flip. Leaf model never nests forced wins mid-combat.

---

## Grep map (p_mbntie_all-search.js)

| Locus | Lines | Role under fair dual |
|-------|------:|----------------------|
| `orderLegals` min-top→sbc | 343–359 | Combat sort (in package) |
| `expertPolicy` cheap always-play | 443–444 | Leaf for all BR trials |
| `enforcePolicyGuards` combat cheap | 823–828 | Keeps any legal cheap proposed — **no overkill veto** |
| `bestResponseMove` playout self | 1084–1086 | `strongSelf ? shallow : expert` — **always expert under fair dual** |
| near-tie hard argmin | 1114–1136 | top → sbc → length only (no residual multi key) |
| `shallowSelfPick` combat bail | 1185–1186 | `hand.length > 9` → expert; **dead path** while strongSelf false |

---

## Top 3 NEW one-axis levers (absolute skill / s12 midgame)

Base each probe as **p_mbntie_all + ONE axis** (copy → `p_mbnest` / `p_mbovk` / `p_mbntie_rr`).

---

### Lever A — `BR_SELF_NEST_MID` ⭐ (leaf model → rate discrimination)

**Why new / why absolute:** Fair dual never runs shallow self in BR (`strongSelf:false`). Root rates are expert-vs-expert playouts that **miss forced-win and 1-ply structure nests** in mid combat. Enabling nest for **self only inside BR trials** changes discrete `wins/nTry` ranks — genuine evaluation skill, not soft-ε, not budget, not FL pin.

**Not:** hollow trial density · softN · expert-first free-lead rewrite.

**Function:** `bestResponseMove` playout loop L1084–1086 (and only there — leave root `strongSelf` flag alone).

**Edit shape (~8 lines):**

```js
// replace self branch inside BR trial playout (L1084–1086):
// BR_SELF_NEST_MID: mid-hand shallow nest even when strongSelf:false
var selfDec;
if (cp === myIdx) {
  var hSelf = s.players[myIdx].hand.length;
  // Nest free-lead always; combat nest while hand still deep enough to matter
  if (strongSelf || hSelf <= 11) {
    selfDec = shallowSelfPick(s, myIdx);
  } else {
    selfDec = expertPolicy(s, cp);
  }
} else {
  selfDec = oppPol;
}
var dec = selfDec;
```

**Optional one-line companion (same probe only if nest still rare):** in `shallowSelfPick` L1186 change `hand.length > 9` → `> 12` so combat nest covers 10–12 card hands when called.

**Risk:** Med wall-clock per root (shallow leaf × trials × branch). Cap: only nest when `hSelf <= 11` or `!cur`. If N20 wall >2× baseline, tighten to `hSelf <= 9` combat-only.  
**s12 residual class:** mid losses 12–26 steps where freeze/challenger share unique-max climb but nest would flip a candidate rate by ≥1/12.  
**Probe tag:** `p_mbnest`

---

### Lever B — `GUARD_COMBAT_OVERKILL` (post-BR hard min-gap)

**Why new / why absolute:** Human residual `H_minimal_beat_E_overkill` 42 + CF same-class min-beat mass. Package ntie only fires inside one-trial band; when climb has **unique max rate**, soft multiTie and ntie never demote AA/JJ over 66/88. `enforcePolicyGuards` cheap path **always keeps proposed** (L825–828) — freeze overkill is free.

Hard **gap cap** is post-BR override → guaranteed playSig diverge on overkill roots. Orthogonal to soft multiTie weight and forcelow FL bulk.

**Function:** `enforcePolicyGuards` combat, inside `if (cheap.length)` before keep-proposed (L823–828).

**Edit shape (~14 lines):**

```js
var cheap = cheapLegals(leg);
if (cheap.length) {
  // GUARD_COMBAT_OVERKILL: never climb >2 ranks when a min-gap cheap exists
  if (
    cur &&
    (cur.type === 'single' || cur.type === 'pair' || cur.type === 'triple') &&
    hand.length >= 7 &&
    oppMinHand(state, myIdx) >= 4
  ) {
    var cTopG2 = cur.top ? cur.top.rank : 0;
    var minTop = 99, i2;
    for (i2 = 0; i2 < cheap.length; i2++) {
      var t = topRank(cheap[i2]);
      if (t < minTop) minTop = t;
    }
    if (proposed && isLegalPlay(proposed) && !playIsExpensive(proposed)) {
      var pTop = topRank(proposed);
      if (pTop - cTopG2 > 2 && minTop - cTopG2 <= 2) {
        return orderLegals(cheap.filter(function (p) {
          return topRank(p) <= minTop;
        }), state, myIdx)[0];
      }
      return proposed;
    }
  } else if (proposed && isLegalPlay(proposed) && !playIsExpensive(proposed)) {
    return proposed;
  }
  return orderLegals(cheap, state, myIdx)[0];
}
```

**Risk:** Med — racing when omin≤3 may need climb (gate `omin≥4`). If dual over-min, require `hand.length >= 8` or types `{pair,triple}` only.  
**s12 residual class:** pair-ladder / mid single climbs (20480118-class, long midgames).  
**Probe tag:** `p_mbovk`  
**Note:** Never shipped as one-axis on this package; plus4 proposed it pre-ntie_all.

---

### Lever C — `NEAR_TIE_RESIDUAL_HARD` (hard residual multi key — not soft multiTie)

**Why new / why absolute:** Package ntie sorts **top → sbc → length** only. That is a **min-top free-lead bias** that inflated s11. s12 midgame often has near-tie band with **same top** (or top within band) but different **residual pair/run structure**. Soft multiTie ε already in package and is dual-flat at unique rates; this is a **hard** secondary key on residual **after** play — not a weight retune.

Replaces pure “always lowest top” among near-ties with structure-aware absolute skill that generalizes beyond s11 FL dumps.

**Function:** near-tie pool sort L1123–1134 (and optionally mirror in `orderLegals` combat only if nest/ovk flat — **default: ntie only**).

**Edit shape (~18 lines):**

```js
// helper (once, near structureBreakCost):
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

// BR_NEAR_TIE_RESIDUAL_HARD — replace pool.sort body (L1123–1134):
pool.sort(function (da, db) {
  var a = actBySig[da.sig], b = actBySig[db.sig];
  if (a == null && b != null) return 1;
  if (a != null && b == null) return -1;
  if (a == null && b == null) return 0;
  var ra = residualMultiKeys(hand, a), rb = residualMultiKeys(hand, b);
  // Prefer more residual pairs, then longer residual run (structure plan)
  if (ra.pairR !== rb.pairR) return rb.pairR - ra.pairR;
  if (ra.maxRun !== rb.maxRun) return rb.maxRun - ra.maxRun;
  // then package min-top → sbc → length
  function top(p){var t=-1;for(var i=0;i<p.length;i++)if(p[i].rank>t)t=p[i].rank;return t;}
  var ta = top(a), tb = top(b);
  if (ta !== tb) return ta - tb;
  var ca = structureBreakCost(hand, a), cb = structureBreakCost(hand, b);
  if (ca !== cb) return ca - cb;
  return a.length - b.length;
});
```

**Risk:** Low–med — residual-first can pick slightly higher top when it leaves a pair plan (anti-s11-min-top overfit; good for absolute). If s11 collapses >3 wins, demote residual keys **after** min-top (pairR only as tertiary).  
**s12 residual class:** mid multi answers that burn second pair path; free-lead near-ties that dump long multi vs pair+run residual.  
**Probe tag:** `p_mbntie_rr`  
**Explicit not:** soft multiTie weight change · combatStructTie ε re-probe · pair-first pool collapse.

---

## Ranked execute order

| Rank | Tag | Axis | Why s12-absolute |
|-----:|-----|------|------------------|
| **1** | `p_mbnest` | BR_SELF_NEST_MID | Shifts discrete rates midgame; works when unique-max blocks ntie |
| **2** | `p_mbovk` | GUARD_COMBAT_OVERKILL | Hard override unique-max overkill climbs |
| **3** | `p_mbntie_rr` | NEAR_TIE_RESIDUAL_HARD | Structure key in band; de-biases pure min-top s11 overfit |

### Honorable (if A–C first-diff but dual-flat)
- **`ORDER_RESIDUAL_AFTER`:** same residual keys inside `orderLegals` combat (leaf sort) — stacks with nest rates; one-axis only after A fails to first-diff.
- **`BR_CHEAP_ALL_SBC_PASS`:** pin `null` into combat BR set only when **every** cheap has `sbc≥10` and `handLen≥8 && omin≥5` — not passc (always-pin mid multi).
- **Do not:** re-enable softN, ms280-as-skill, forcelow, expert-first FL.

### Still reject
SoftN · hollow budget · expert-first FL · forcelow bulk · soft multiTie weight · passc · cheapfold · pair-first · hunting structural 20380387 · perfect duals

---

## Probe protocol

```bash
# Base = copy p_mbntie_all → p_mbnest / p_mbovk / p_mbntie_rr (ONE axis each)
FREEZE=v91 CHALL=p_mbnest GAMES=20 SEED=20260712 BOTH_SEATS=1 \
  node evolve/lean-fair-dual-n20.js
# Require: first playSig ≠ freeze on ≥1 s12 mid residual (not FL-only s11 pet)
# Interest: liveWins ≥ identity +1 on s12 N20 → N50 s12 primary, then s11 regression check
# Ship: WR>0.70 on s11 AND s12 (and preferably s13) under fair dual
```

**Success (pre-ship):**
1. s12 N50 absolute **≥0.64** interest / **>0.70** ship candidate  
2. s11 N50 **≥0.70** (no free-lead cliff >−4 wins)  
3. win-smoke regs ≤0 on prior s11 wins sample  
4. first-diff on mid combat residual — not only free-lead pin seeds

**Honest ceiling:** s11 0.76 with s12 0.54 means **package skill is seed-local**. These three axes target **evaluation + hard combat structure** that should move s12 without depending on FL pin overfit.

---

## One-liners (top 3)

1. **`p_mbnest` — BR_SELF_NEST_MID:** use `shallowSelfPick` for self in BR playouts (hand≤11) even when `strongSelf:false` so midgame rates discriminate forced wins.  
2. **`p_mbovk` — GUARD_COMBAT_OVERKILL:** post-BR hard cap gap>2 when a min-gap cheap exists (`omin≥4`, hand≥7).  
3. **`p_mbntie_rr` — NEAR_TIE_RESIDUAL_HARD:** among one-trial near-ties, maximize residual pairR/maxRun before min-top/sbc/len (hard keys, not soft multiTie).
