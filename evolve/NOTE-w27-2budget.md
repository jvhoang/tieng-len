# W27 — ONE non-pass 2-budget / control lever on `p_w26_ex_seqclimb`

**Date:** 2026-07-14  
**Base:** `policies/p_w26_ex_seqclimb-{ai,search}.js` (holdout **27/27**, DEV 34, DEV_VAL Δ+3)  
**SoftN:** **FORBIDDEN**  
**Pass-unique:** **FORBIDDEN** (W16 `brbestpass` / W18 `trash_pass` DEV_VAL reverse `20290634@0`)  
**Save-2s PASS (0511/0547):** already PASS in gold — **do not re-open**; this lever never touches multi-face / 22 answers.

---

## 0. Gold targets (2-for-control only)

| Gold | Face | Wrong AI | Correct | Class |
|------|------|----------|---------|-------|
| **0513** | K | K♥ from KK | **single 2** (control) | pair-break min-beat |
| **0525** | mid-high single | A♥ from AA | **2♣** control | high pair-break |
| **0544** | mid-high single | A♠ from AA | **2♦** control | high pair-break |
| 0500 / 0516 | Q / high | Q/A from run/pair | **2** control | same family (support) |

**Avoid (already PASS — out of scope):** 0511 (22 vs AA), 0547 (22 vs pair with long trash).

---

## 1. Current `expertPolicy` TWO / Ace+2 / probe-TWO on base

**File:** `policies/p_w26_ex_seqclimb-search.js` · `expertPolicy` ~L421–561

| Gate | Trigger | Action | Gap vs gold |
|------|---------|--------|-------------|
| **Ace+2 (v7 FIRST)** | `single && curTop≥11 && twoSingles && (handLen≥3 \|\| omin≤3)` | lowest-suit **2** before cheap | Covers *facing Ace* only. 0525/0544/0513 face **non-Ace**; AI burns **A/K from pair**. |
| **probe-TWO** | `single && curTop∈[8,10] && twoSingles && omin≤3 && handLen∈[4,9] && (trash≥1 \|\| control≥2)` | **2** | Short-race only (`omin≤3`). Midgame control reclaim with deep opps **misses**. |
| **cheap short-circuit** | `cheap = cheapLegals(leg); if (cheap.length) return orderLegals(cheap)[0]` | any non-2/non-bomb | **Structural hole:** K/A from pair is “cheap” (`playIsExpensive` = 2 or bomb only). Never reaches later 2 logic. |
| **onlyHighNon2** | *after* no-cheap; `curTop≥10 && only non2 singles rank≥10` | **2** | Dead when pair-break K/A is still in `cheap` (always, midgame). |
| **guards Ace** | `enforcePolicyGuards` `curTop≥11` → force 2 | **2** | Same Ace-only scope. |
| **guards cheap** | if cheap exists and proposed is expensive → **force cheap** | strips root **2** | Any expert/search 2 vs smash is **vetoed** unless Ace path. |

**Helpers (unchanged):**
- `cheapLegals` = strip `playHasTwo` / bombs (`~L103–108`)
- `structureBreakCost` pair single ≥ **25** (`had≥2` + `had===2` + single-from-pair +12); run interior +10 (`~L139–178`)
- `analyzeHand`: `trashCount`, `control`, `twos`, `hasControl`

---

## 2. Why W25 `p_w25_ex_smash2` was dual-null

**Axis (W25):** pre-cheap, if *all* cheap non-2 singles have `sbc ≥ 8`, play 2.  
Gates: `handLen∈[5,11]`, `curTop∈[5,11]`, `omin≥2`.

| Failure mode | Detail |
|--------------|--------|
| **Root BR strips 2s** | `bestResponseMove` combat: `ch = cheapLegals(leg); if (ch.length) leg = ch` — 2 never a cand → unique-max rates unchanged (`p_w26` ~L1154–1156). |
| **Guards veto 2** | `enforcePolicyGuards` cheap path rejects expensive proposed → root 2 dies even if search wanted it. |
| **Gate too wide / rare-overlap** | `curTop≥5` + `allBrk sbc≥8` either never flips DEV seats *or* only fires where leaf symmetry cancels under equal-BR. |
| **vs Ace already covered** | `curTop≥11` Ace+2 already returns 2 → smash2 redundant on Ace faces. |
| **Historical** | `NOTE-fair-w25-results.md`: smash2 **DEV 34 dual-null vs climbtax**. W18 `br2ctrl` post-cheap (2s already stripped) identical. W22 `2overbreak` BR reinject with `sbc<12` also failed to ship. |

**Design implication:** a 2-control lever must be **the same predicate** in three places or it dual-nulls:
1. `expertPolicy` (leaf / fallback)
2. `enforcePolicyGuards` (before cheap force — Ace+2 pattern)
3. `bestResponseMove` combat cand reinject (pre-`orderLegals`)

One axis, three mirrors. Not SoftN. Not pass.

---

## 3. How this lever **differs** from dual-null smash2

| | W25 smash2 | **W27 `p_w27_ex_ctrl2hi`** |
|--|------------|----------------------------|
| Predicate | *all* cheap singles `sbc≥8` | **min-beat** among cheap non-2 singles is **high smash** (`sbc≥12` **and** `rank≥10`) |
| Face band | `curTop 5..11` (wastey low) | `curTop 8..11` (Q/K/A class) + Ace path already separate |
| Early waste | fires vs low faces with only mid pair-breaks | **requires high card smash** (K/A/Q-from-package) |
| Retake plan | none | `trashCount≥1` **OR** residual multi after removing the 2 |
| Depth | expert only | **expert + guards + BR reinject** (same helper) |
| Pass branch | none (good) | none (good) |
| Multi face | N/A | **single only** — never 22, never pass-save |

Gold language: “next card should take control with a 2” when the **only sensible non-2 beat breaks KK/AA/JQK** — not every low pair-break.

---

## 4. Exact gates (avoid early 2 waste)

Shared helper `shouldCtrl2Hi(state, cp, leg)` — pure boolean + chosen twoSingle play.

### Positive (ALL required)

1. `cur && cur.type === 'single'`
2. `twoSingles.length ≥ 1` (legal single-2 answers)
3. `handLen ∈ [6, 10]` — midgame; not 13-card open, not pure endgame (`≤5` already races 2s)
4. `omin ∈ [3, 8]` — **not** probe-TWO race (`omin≤3` already covered); **not** dead-deep `omin≥9` where holding 2 is free
5. `curTop ∈ [8, 11]` — face Q/K/A class (rank 8=J … 11=A). Lower faces: prefer loose / min-beat structure path.
6. **No loose cheap single:** every cheap non-2 single has `structureBreakCost(hand,p) ≥ 8`  
   (if any `sbc < 8`, **never** spend 2 — gold loose-beat family)
7. **Min-beat is high smash:** among cheap non-2 singles, let  
   `mb = argmin (rank, suit)` (true min-beat by rank then suit)  
   Require `structureBreakCost(hand, mb) ≥ 12` **and** `mb[0].rank ≥ 10` (K/A, or Q only if sbc≥12 from pair/run)
8. **Retake plan after 2:**  
   `info.trashCount ≥ 1` **OR** exists residual pair/triple/seq package in hand after removing one 2  
   (spend 2 only if control buys a dump or multi follow)
9. **Budget:** `info.twos ≥ 1` (have the 2); if `info.twos === 1` and `handLen ≥ 9` and `omin ≥ 7`, require `trashCount ≥ 2` (don’t dump sole 2 deep without trash plan)

### Negative (must NOT fire)

| Block | Why |
|-------|-----|
| `cur.type !== 'single'` | 0511/0547 save-2s PASS domain |
| any cheap non-2 with `sbc < 8` | loose exists — play loose, keep 2 |
| `mb.rank < 10` even if pair-break | mid pair-break vs low face → structure orderLegals / loose family, not 2-budget |
| `handLen ≥ 11` | early; waste 2 |
| `omin ≤ 2` | already race gates (probe-TWO / endgame) |
| `curTop < 8` | early control burn |
| pass / multi answers | forbidden family |

### Ace face

`curTop ≥ 11` already forced by Ace+2 **before** this helper. Keep Ace+2 as-is.  
`ctrl2hi` still allows `curTop === 11` only as no-op redundancy if Ace+2 skips (`handLen < 3 && omin > 3` edge). Prefer **not** duplicating Ace force — helper may start at `curTop ∈ [8, 10]` only to minimize overlap, **OR** include 11 as belt-and-suspenders when Ace+2 gate fails. **Recommendation:** `curTop ∈ [8, 10]` for the new gate; Ace stays sole `≥11` owner.

---

## 5. Ranked ONE probe

### ⭐ `p_w27_ex_ctrl2hi` — **RANK 1 (only probe this wave)**

| | |
|--|--|
| **Tag** | `p_w27_ex_ctrl2hi` |
| **Base copy** | `p_w26_ex_seqclimb-{ai,search}.js` → `p_w27_ex_ctrl2hi-{ai,search}.js` |
| **Axis** | Midgame **single-2 for control** when min-beat is **high structure-break** only |
| **Not** | pass · SoftN · mintop hard orderLegals · BR FL micro · allBrk smash2 clone · 22 vs multi |
| **Gold** | 0513, 0525, 0544 (+ 0500/0516 support) |
| **First-diff class** | `combat_2_reclaim`, `combat_pair_smash_skip` (not FL-only) |
| **Risk** | Medium: tight gates + three-site mirror; reverse if BR reinject too wide — keep identical predicate |
| **Success bar** | design first-diff **>0** on combat; DEV ≥34 & Δid≥0; **DEV_VAL Δ≥+2** before holdout; holdout target incremental vs 27/27 |

### Rejected siblings (do not probe this wave)

| Sibling | Why reject |
|---------|------------|
| Re-skin W25 smash2 (`allBrk sbc≥8`, expert-only) | Proven dual-null |
| W16/W18 pass-unique / plan-pass | DEV_VAL reverse; 0511/0547 are PASS gold but selection-hostile |
| SoftN | Forbidden |
| BR-only 2overbreak without expert+guards | W22-class; leaf still smash |
| Broad `curTop≥5` 2 spend | Early waste; dual noise |
| Save-2 / prefer non-2 when 2 legal | Opposite of gold 0513 family; holdout EARLY_2_BUDGET risk |

---

## 6. Pseudocode (implement later — **do not implement in this note**)

```js
// === shared helper (search.js policy) ===
function pickCtrl2Hi(hand, cur, leg, state, cp) {
  if (!cur || cur.type !== 'single') return null;
  var curTop = cur.top ? cur.top.rank : 0;
  if (curTop < 8 || curTop > 10) return null; // Ace+2 owns ≥11

  var handLen = hand.length;
  var omin = oppMinHand(state, cp);
  if (handLen < 6 || handLen > 10) return null;
  if (omin < 3 || omin > 8) return null;

  var twoSingles = [];
  for (var i = 0; i < leg.length; i++) {
    if (leg[i].length === 1 && leg[i][0].rank === 12) twoSingles.push(leg[i]);
  }
  if (!twoSingles.length) return null;

  var info = analyzeHand(hand);
  // budget: sole 2 deep needs real trash plan
  if (info.twos === 1 && handLen >= 9 && omin >= 7 && info.trashCount < 2) return null;

  var cheap = cheapLegals(leg);
  var minBeat = null; // lowest rank, then suit among cheap non-2 singles
  var nSing = 0, hasLoose = false;
  for (var j = 0; j < cheap.length; j++) {
    var p = cheap[j];
    if (!p || p.length !== 1) continue;
    if (p[0].rank === 12) continue;
    nSing++;
    var sbc = structureBreakCost(hand, p);
    if (sbc < 8) hasLoose = true;
    if (!minBeat ||
        p[0].rank < minBeat[0].rank ||
        (p[0].rank === minBeat[0].rank && p[0].suit < minBeat[0].suit)) {
      minBeat = p;
    }
  }
  if (nSing < 1 || hasLoose || !minBeat) return null;

  var mbSbc = structureBreakCost(hand, minBeat);
  // high smash only: pair/run K-A class (differs from smash2 allBrk@8)
  if (mbSbc < 12 || minBeat[0].rank < 10) return null;

  // retake plan: trash to dump OR residual multi after spending one 2
  var hasTrash = info.trashCount >= 1;
  var hasResMulti = false;
  var by = {};
  for (var h = 0; h < hand.length; h++) by[hand[h].rank] = (by[hand[h].rank] || 0) + 1;
  // after one 2 leaves: any pair/trip remaining, or ≥3-run material
  for (var r = 0; r <= 11; r++) {
    if ((by[r] || 0) >= 2) { hasResMulti = true; break; }
  }
  if (!hasTrash && !hasResMulti) return null;

  twoSingles.sort(function (a, b) { return a[0].suit - b[0].suit; });
  return twoSingles[0];
}

// === 1) expertPolicy: AFTER Ace+2, BEFORE probe-TWO (or after probe-TWO; before deep multi fold) ===
// Locus: p_w26_ex_seqclimb-search.js ~after Ace+2 block (~L458), before cheap short-circuit (~L487)
var ctrl2 = pickCtrl2Hi(hand, cur, leg, state, cp);
if (ctrl2) return { play: ctrl2 };

// === 2) enforcePolicyGuards: combat, BEFORE cheap force (~L875) ===
// Pattern: same as Ace+2 force (~L855–872)
var g2 = pickCtrl2Hi(hand, cur, leg, state, myIdx);
if (g2) {
  if (proposed && proposed.length === 1 && proposed[0].rank === 12 && isLegalPlay(proposed))
    return proposed;
  return g2; // force 2; do NOT fall into cheap smash
}

// === 3) bestResponseMove combat cand: AFTER cheap strip, reinject 2 if predicate ===
// Locus: else-branch ~L1153–1157
var fullC = leg.slice(); // capture before strip if needed
var ch = cheapLegals(leg);
if (ch.length) leg = ch;
var rein = pickCtrl2Hi(hand, cur, fullC.length ? fullC : /* full legals */, state, myIdx);
// practical: recompute from getLegalPlays full set, not stripped leg
if (rein) {
  // reinject single-2s into cand set (or replace with twos-only when min-beat high smash)
  leg = [rein]; // tight: force BR to evaluate 2 (rates move); alt: leg = orderLegals(ch.concat(twos))
}
leg = orderLegals(leg, state, myIdx);
```

**ai.js:** mirror only if live path uses separate combat policy; primary dual path is `*-search.js` BR + expert leaf. Copy tag to both `p_w27_ex_ctrl2hi-ai.js` and `-search.js` for bench loader parity.

---

## 7. Why this should first-diff (vs smash2 null)

1. **BR cand includes 2** when high-smash min-beat — root `playSig` can change (smash2 never did).  
2. **Guards keep 2** — search win not vetoed.  
3. **Leaf playouts** prefer control reclaim → divergent later free-leads (trash dump under 2-won lead).  
4. **Tighter face/rank** → fewer null-overlap seats, more intentional combat diffs on Q/K wars.  
5. Non-pass → avoids W16/W18 VAL reverse family.

---

## 8. Eval protocol (when implementing)

1. SoftN = 0. Base = seqclimb.  
2. Identity / first-diff vs `p_w26_ex_seqclimb` on design half — require **combat_*** mass, fail if dual-null (≤0 nDiv).  
3. DEV T20 ≥34, Δid ≥0.  
4. DEV_VAL Δ≥+2 else discard (no threshold fishing).  
5. Holdout A/B only after DEV_VAL; ship only both WR>0.70 (still multi-step).  
6. Gold unit: expertPolicy + guards on synthetic 0513/0525/0544 hands (pair K/A smash → 2).  
7. Negative unit: loose 10 exists vs face 5 → **not** 2; face pair → **not** this gate; 22 legal vs AA → unchanged pass path.

---

## 9. Summary

| Item | Choice |
|------|--------|
| **ONE probe** | **`p_w27_ex_ctrl2hi`** |
| **Base** | `p_w26_ex_seqclimb` |
| **Behavior** | Always **play** lowest-suit single-2 when midgame face Q/K and min cheap beat is high structure-break (K/A-class); never pass |
| **vs smash2** | min-beat high-smash (not allBrk@8); `curTop 8..10`; retake plan; **triple mirror** |
| **vs Ace+2** | complementary (non-Ace faces); Ace path unchanged |
| **vs 0511/0547** | single-face only; no 22 / no pass |
| **SoftN / pass-unique** | forbidden |
| **Implement** | **not this note** — design only |

---

*Scratch mirror optional: `{SCRATCH}/implementer/explore/NOTE-w27-2budget.md`*
