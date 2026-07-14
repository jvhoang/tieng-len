# Fair dual +4 hunt — NEW one-axis residual levers (post p_mbpin_s)

**Date:** 2026-07-13  
**Base:** `policies/p_mbpin_s-search.js` (champion package on v91 body)  
**Protocol:** fair dual locked — hidden, GM both, BR both, equal budget, BOTH_SEATS  
**Ship gap:** absolute WR 0.64 → need **>0.70** ≈ **+4 wins / N=50**  
**Forbidden:** SoftN · perfect-info duals · soft multiTie weight retune · pair-first pool · re-probes of STATUS flat list

---

## Grep map (p_mbpin_s-search.js)

| Locus | Lines | Role under fair dual (hidden, `perfectInfo:false`) |
|-------|------:|-----------------------------------------------------|
| `cheapLegals` | 103–109 | Strip 2/bomb; BR combat + expert cheap path filter |
| `orderLegals` min-top→sbc | 343–359 | Combat sort (already in package) |
| `expertPolicy` cheap return | 443–444 | **Always plays** if any cheap exists — no pass pin |
| `pickFreeLeadHard` | 564–701 | Expert FL hard; hybrid strong 653–662; multi-always core |
| `bestResponseMove` free-lead pin | 1003–1047 | `BR_FL_PIN` trash + pairs `top≤6` before maxBranch |
| `bestResponseMove` combat | 1048–1059 | `cheapLegals` → `orderLegals` → slice; **`allowPass` only if cheap empty** |
| combat residual soft-tie | 1101–1105 | `rate + multiTie` ε only on **exact** rate ties |
| combat soft-root | 2837–2934 | **SKIPPED** on fair dual (`perfectInfo` required) |
| FL soft-root | 2701+ | **SKIPPED** on fair dual |
| root BR path | 2936–3040 | Primary fair dual skill path |
| `enforcePolicyGuards` combat cheap | 823–828 | Keeps any legal cheap proposed — no overkill veto |
| `shallowSelfPick` combat bail | 1161–1162 | `hand.length > 9` → pure expert (no nest) |

**Why residual no-diff persists:** fair dual is BR-primary. Soft multiTie ε only flips **exact** discrete rate ties (`k/nTry`). Unique max-rate action → identical root vs freeze → identical playout. Combat soft-root never runs. Need **cand-set**, **near-tie band hard argmin**, or **post-BR hard guard** — not another ε weight.

### Structural REJECT (do not hunt)
`20380387` — structural; prior notes mark REJECT.

### Combat / FL residual seeds (target first-diff)
| Seed | Seat note | Hand sketch | Expected diverge class |
|------|-----------|-------------|------------------------|
| **20320549** | live0 freeze starts | QQQ AA 22 + 99 78x | combat only — answer class / pass vs smash |
| **20480117** | live0 freeze starts | 66 88 JJ AA 22 | combat — min-gap vs climb / mid-pair fold |
| **20370414** | live1 first | 33 66 88 + seqs | FL low pair; if no-diff BR ignores expert pin |
| **20430252** | live0 first | 555 1010 JJ + seqs | FL package open |
| 20390360, 20430252, … | (list) | residual pack | same axes |

### Package already shipped (do not re-axis)
FL hybrid strong · combat residual soft-tie · orderLegals min-top · TWO_OMIN2 · BR_FL_PIN trash+low pairs top≤6

### Flat / do not re-try
pair-first pool · sbc inflate · agg FL · stronger combat multiTie · passTie · earlier fold · cheapfold · lowpair keep-high · full pin short multi · softN · hollow budget

---

## Top 3 NEW one-axis levers

### Lever A — `BR_COMBAT_PASS_CAND` (hard candidate-set)

**Why new:** `allowPass` is only when `cheapLegals` empty (L1055–1059). Mid multi/pair always has a cheap answer → BR **never scores pass**. Distinct from `passTie` (soft score), `mbtwofold` (expert fold band), `cheapfold` (expert all-sbc≥8). This is **pin null into BR actions** when cheap exists — same class as FL pin.

**Function:** `bestResponseMove` combat branch, after building `actions` from cheap legals.

**Edit shape (~10 lines):**

```js
// after: var actions = leg.slice();  if (allowPass) actions.push(null);
// BR_COMBAT_PASS_CAND: score fold even when cheap answers exist
if (cur && !allowPass) {
  var hLen = hand.length, oMn = oppMinHand(state, myIdx);
  var cTop = cur.top ? cur.top.rank : 0;
  if (
    hLen >= 8 && oMn >= 5 && cTop < 9 &&
    cur.type !== 'single' && !playIsBomb(cur.cards || [])
  ) {
    actions.push(null); // pin pass into BR combat set
  }
}
```

**Risk:** Med — over-passive if BR rates prefer pass too often on winnable mid pairs. Gate: `cur.type` in `{pair,triple,seq}` only; require `hLen≥9` if N20 regs.  
**First-diff:** mid-combat on **20320549**, **20480117** (freeze-starts).  
**Probe tag:** `p_mbpassc`

---

### Lever B — `BR_NEAR_TIE_BUCKET_MIN` (hard post-select, not soft ε)

**Why new:** residual soft-tie adds ≤0.01 to score — only breaks **exact** `rate` equality. Fair dual `TRIALS=12` → rates are `k/12`; unique max rate is common → no-diff. This lever widens “near-tie” to **one trial bucket** (`1/nTry`) then **hard argmin** topRank → sbc → length. Not a multiTie weight retune.

**Function:** `bestResponseMove` end of action loop (replace single `if (score > bestRate)` winner, or post-pass over `details`).

**Edit shape (~12 lines):**

```js
// after details filled; replace bestPlay from raw max score:
details.sort(function (a, b) {
  return (b.score != null ? b.score : b.rate) - (a.score != null ? a.score : a.rate);
});
var bestR = details[0] ? details[0].rate : -1;
var band = 1 / Math.max(1, nTry); // one-trial near-tie
var pool = details.filter(function (d) { return d.rate >= bestR - band - 1e-9; });
// map pool sigs → acts; hard min topRank, then min sbc, then shorter multi
pool.sort(function (da, db) {
  var a = actBySig(da.sig), b = actBySig(db.sig); // null last unless pass-pinned
  if (!a && b) return 1; if (a && !b) return -1;
  if (!a && !b) return 0;
  var ta = topRank(a), tb = topRank(b);
  if (ta !== tb) return ta - tb;
  var ca = structureBreakCost(hand, a), cb = structureBreakCost(hand, b);
  if (ca !== cb) return ca - cb;
  return a.length - b.length;
});
bestPlay = actBySig(pool[0].sig);
```

**Risk:** Low–med — band too wide (`2/n`) flips wins to over-min. Keep band = `1/nTry` only. Do **not** stack multiTie weight changes in same probe.  
**First-diff:** any combat where BR rates sit one trial apart (pair ladder **20480117**, package answers **20320549**).  
**Probe tag:** `p_mbntie`

---

### Lever C — `GUARD_COMBAT_OVERKILL` (post-BR hard gate)

**Why new:** `enforcePolicyGuards` combat keeps any legal cheap proposed (L823–828). BR can climb with AA/JJ when 66/88 min-gap exists because unique rates favor climb under freeze leaf — soft multiTie never fires. Hard **gap cap** forces min legal cheap top when `gap > 2`. Overrides root after BR — guaranteed playSig diverge when freeze overkills.

**Function:** `enforcePolicyGuards` combat path, inside `if (cheap.length)` before keep-proposed.

**Edit shape (~12 lines):**

```js
var cheap = cheapLegals(leg);
if (cheap.length) {
  // GUARD_COMBAT_OVERKILL: never climb >2 ranks when a min-gap cheap exists
  if (
    cur.type === 'single' || cur.type === 'pair' || cur.type === 'triple'
  ) {
    var cTopG2 = cur.top ? cur.top.rank : 0;
    var minTop = 99, i2;
    for (i2 = 0; i2 < cheap.length; i2++) {
      var t = topRank(cheap[i2]);
      if (t < minTop) minTop = t;
    }
    if (proposed && isLegalPlay(proposed) && !playIsExpensive(proposed)) {
      var pTop = topRank(proposed);
      if (pTop - cTopG2 > 2 && minTop - cTopG2 <= 2 && hand.length >= 7) {
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

**Risk:** Med — racing when omin≤2 may need climb; add `&& oppMinHand(state,myIdx) >= 4` if dual regs.  
**First-diff:** **20480117** pair ladder; single climbs on **20320549** (9/A vs lower).  
**Probe tag:** `p_mbovk`

---

## Ranked execute order

| Rank | Tag | Axis | First-diff locus | Why +4-relevant |
|-----:|-----|------|------------------|-----------------|
| **1** | `p_mbpassc` | BR_COMBAT_PASS_CAND | BR combat actions | New action freeze never scores |
| **2** | `p_mbntie` | BR_NEAR_TIE_BUCKET_MIN | BR post-rate select | Flips near-ties soft-ε cannot |
| **3** | `p_mbovk` | GUARD_COMBAT_OVERKILL | enforcePolicyGuards | Hard override when rates unique-max climb |

### Honorable (if A–C first-diff but dual-flat)
- **`SHALLOW_COMBAT_NEST12`:** change `shallowSelfPick` L1162 from `hand.length > 9` → `> 12` so BR self leaves nest mid-combat → rate rank shifts (leaf model axis, not multiTie).
- **`BR_FL_PIN_PAIR_TOP8`:** extend pin `top≤6` → `top≤8` for **20370414** / **20430252** only if FL seat still no-diffs after combat levers (one-axis pin expand — not pair-first pool).

### Still reject
SoftN · perfect-info duals · soft multiTie weight · pair-first pool · cheapfold re-run · passTie re-run · hunting **20380387** · hollow budget

---

## Probe protocol

```bash
# Base = copy p_mbpin_s → p_mbpassc / p_mbntie / p_mbovk (ONE axis each)
FREEZE=v91 CHALL=p_mbpassc GAMES=20 SEED=20260711 BOTH_SEATS=1 \
  node evolve/lean-fair-dual-n20.js
# Require: first playSig ≠ freeze on ≥1 of {20320549,20480117,20370414,20430252}
# Interest: liveWins ≥ identity +1 same seed0 → N50 s11/s12/s13
# Ship: WR > 0.70 AND liveWins ≥ identity + 2 durable
```

**Success (pre-ship):** first-diff on combat-no-diff seed · N20 Δ≥+1 · win-smoke regs≤0 · then N50 absolute >0.70.
