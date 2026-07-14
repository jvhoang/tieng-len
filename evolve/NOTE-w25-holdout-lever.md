# W25 — ONE fair dual holdout lever (architecture)

**Date:** 2026-07-14  
**Mode:** design only — **do not promote**, SoftN **FORBIDDEN**  
**Target:** holdout both-lose freeze-identical mass under equal BR  
**Protocol lock:** hidden · GM both · BR both equal · `injectOpp` = freeze `expertPolicy` · `SOFT=0`

---

## Locked facts

| Item | Value |
|------|--------|
| Holdout-stable base | `p_w17_brfltrash` — DEV **33**, DEV_VAL **+2**, holdout **26/26** |
| Best DEV/VAL | `p_w24_ex_climbtax` — DEV **34**, DEV_VAL **+4**, holdout **26/25** |
| Holdout both-lose under brfltrash | **87% freeze-identical** (6/46 firstdiff), class **FL_other only** |
| W24 `p_w24_ex_multicontest` | expert soft-pass disable → **dual-null** firstdiff |
| W24 climb tax | singles-only `expertScore` tax; does **not** tax seq climbs (`JH QS KS`) |
| Recon skill sample | `20300693@1` — climbs `JH QS KS`, then PASS on triples (JJJ already burned) |
| Recon weak-multi sample | `20440315@0` — multiPower ~4.5 (only 444) free-leads low seq `345` |

---

## 1. Code map — `bestResponseMove` allowPass + combat cand

Locus (identical shape in `p_w17_brfltrash-search.js` and `p_w24_ex_climbtax-search.js`):

| Region | Lines (climbtax) | Behavior |
|--------|-----------------:|----------|
| FL cand | ~979–1029 | `freeLeadCandidates` + extras → W14 low-pair force → **W17 trash-first** |
| Combat cand | ~1030–1034 | `cheapLegals(leg)` if any → `orderLegals` |
| **allowPass** | ~1037–1041 | `allowPass = !!cur && cheapLegals(fullLegals).length === 0` only |
| Actions | ~1040–1041 | `actions = leg`; push `null` iff `allowPass` |
| Self leaf | ~1066–1068 | `strongSelf ? shallowSelfPick : expertPolicy` (fair dual: expert) |
| Post-guard | `enforcePolicyGuards` ~799–804 | if cheap exists and proposed empty/expensive → **force cheap play** |

### allowPass invariant (why expert multi-contest dual-nulls)

```
cheap same-type multi legal  ⇒  cheapLegals ≠ ∅  ⇒  allowPass = false
                             ⇒  BR never scores PASS
                             ⇒  expert soft-pass / pass-disc never changes BR root playSig
```

Legal answers to pair/triple/seq are already same-type multi (or bombs/2s). So:

- Expert “contest multi / disable soft-pass when multi answerable” does not move BR root when multi is cheap.
- BR “strip to same-type multi only” (`p_w25_br_multionly`) is **near-identity** on combat multi faces.

### Empirical dead-end (do not re-probe)

| Tag | Axis | Evidence |
|-----|------|----------|
| `p_w24_ex_multicontest` | expert soft-pass disable before cheap | dual-null vs base firstdiff |
| `p_w25_br_multionly` | BR combat: `leg = same-type multiOnly`, `allowPass=false` | **vs climbtax design firstdiff `0/24`** (`evolve/firstdiff-p_w25_vs_climbtax-design.json`) |

`p_w25_br_multionly` stacks climbtax + multiOnly and is path-identical to pure climbtax on design seeds. **Reject as holdout lever.**

### W16 landmine (do not invert into pass-unique)

`p_w16_brbestpass`: force **pass unique** when best multi top≥9 & sbc≥8 → DEV +1 flip, **DEV_VAL reverse** (`20290634@0`).  
W25 must **never** force pass / empty-leg pass-unique / high-smash fold gates.

---

## 2. Diagnosis — what holdout both-lose still needs

| Klass (recon) | n (approx) | Freeze path failure | Lever class that can firstdiff |
|---------------|-----------:|---------------------|--------------------------------|
| midgame-skill / short-collapse | ~12 | combat order + over-pass after structure burn | score/leaf (climbtax partial; seq tax open) |
| deal-doomed weak multi | ~5–8 | step-0 **multi-always** low seq / naked trip | **FL hard structure** |
| already FL_other diverge | 3 seats | W17 trash band only | more BR FL trash = micro thrash (**forbidden**) |

**20300693 narrative correction:** after step-1 `JH QS KS`, hand is no longer JJJ (JH burned). Later PASSes on 777/888 are **legally forced** — not BR soft-pass with multi still held. Multi-contest-at-root cannot flip those steps. Climbtax (singles) also misses that **seq** climb.

**20440315:** multiPower weak (only 444). W17 trash-first needs `hasControl && trash && multiHi` — naked low trip is **not** `multiHi` → multi-always free-lead `345` survives entire identity path.

**BR multiOnly cannot create combat mass on holdout both-lose** (structural dual-null). The non-null architecture option from the allowed OR-set is **free-lead hard structure for weak multiPower**.

---

## 3. ONE recommended lever

### Tag: **`p_w25_ex_flweakmp`**

**Name:** free-lead hard structure when multiPower weak  
**Class:** architecture (expert FL + BR FL cand) — **not** SoftN, **not** BR free-lead trash micro  
**Opposite of W16:** never force pass; only **re-rank / restrict multi leads** on weak structure hands

### Stack base

| Choice | Why |
|--------|-----|
| **Primary stack: `p_w24_ex_climbtax`** | Best DEV/VAL; climbtax is **combat singles score** — orthogonal to FL structure; holds DEV floor while FL hits step-0 identity |
| Fallback base: `p_w17_brfltrash` | If DEV_VAL reverse or holdout B regresses vs climbtax stack; isolate FL-only Δ |

Copy: `policies/p_w24_ex_climbtax-{ai,search}.js` → `policies/p_w25_ex_flweakmp-{ai,search}.js`  
(One axis only — do not re-add multionly.)

### Exact code loci

1. **Primary (fair dual BR root):** `bestResponseMove` free-lead branch **after** W17 trash filter, **before** `maxBranch` slice  
   — climbtax ~L1014–1029 region (end of `if (!cur) { ... }`)
2. **Mirror (expert leaf + guards):** `pickFreeLeadHard` multi-always core ~L593–649  
3. **Optional same-axis:** `freeLeadCandidates` pool filter ~L521–528 (drop weak naked low multi when safer trash/unans exists)

Do **not** edit: allowPass formula, combat cheap strip, pass-unique, SoftN, BR FL trash gates (W17 already owned).

### multiPower helper (recon-compatible)

```js
// ranks: 3=0 … A=11, 2=12
// recon anchors: 20440315 only-444 → weak (~3–4.5); 20300693 multi wall → strong (~9–12)
function multiPowerOf(hand) {
  var by = {}, i, r, c, mp = 0, nFam = 0;
  for (i = 0; i < hand.length; i++) {
    r = hand[i].rank;
    by[r] = (by[r] || 0) + 1;
  }
  for (r = 0; r <= 12; r++) {
    c = by[r] || 0;
    if (c >= 4) { mp += 4; nFam++; }
    else if (c >= 3) { mp += 3; nFam++; }
    else if (c >= 2) { mp += 2; nFam++; }
  }
  return { mp: mp, nFam: nFam, by: by };
}
```

**Weak gate (tight — anti DEV_VAL):**

```js
function isWeakMultiPower(hand) {
  var m = multiPowerOf(hand);
  // only one multi family, or very low volume; deep hand only
  if (hand.length < 10) return false;
  if (m.mp <= 4) return true;          // single trip/pair family (444 class)
  if (m.nFam === 1 && m.mp <= 5) return true;
  return false;
}
```

### Pseudocode — BR root FL (primary)

```js
// inside bestResponseMove, after W17 trash-first block, still !cur:
// leg is current free-lead candidate set

if (!cur && isWeakMultiPower(hand) && oppMinHand(state, myIdx) >= 4) {
  var infoW = analyzeHand(hand);
  var trashW = [], unansW = [], safeMulti = [], lowNaked = [], iW, pW, comW;

  for (iW = 0; iW < leg.length; iW++) {
    pW = leg[iW];
    if (!pW) continue;
    if (isTrashSinglePlay(pW, infoW)) trashW.push(pW);
    if (pW.length >= 2 && !playIsExpensive(pW)) {
      // prefer mid+ multi / unanswerable; mark naked low seq/trip
      comW = detectCombo(pW);
      var topW = topRank(pW);
      var nakedLow =
        (comW && comW.type === 'seq' && topW <= 5) ||
        (comW && comW.type === 'triple' && topW <= 4) ||
        (comW && comW.type === 'pair' && topW <= 3);
      if (nakedLow) lowNaked.push(pW);
      else safeMulti.push(pW);
    }
  }

  // Optional 2p: keep unanswerable multi even if low
  if (state.players.length === 2) {
    var oppH = state.players[myIdx === 0 ? 1 : 0].hand;
    if (oppH && oppH.length) {
      for (iW = 0; iW < leg.length; iW++) {
        pW = leg[iW];
        if (!pW || pW.length < 2 || playIsExpensive(pW)) continue;
        comW = detectCombo(pW);
        if (!comW) continue;
        if (!getLegalPlays(oppH, comW, false, false, null).length) unansW.push(pW);
      }
    }
  }

  // Hard structure priority (NO pass — free lead always plays):
  // 1) unanswerable multi  2) trash single if hasControl  3) non-naked multi
  // 4) else keep leg but DROP naked low multi if anything else remains
  if (unansW.length) {
    leg = orderLegals(unansW, state, myIdx);
  } else if (infoW.hasControl && trashW.length) {
    leg = trashW.slice().sort(function (a, b) {
      return a[0].rank - b[0].rank || a[0].suit - b[0].suit;
    });
  } else if (safeMulti.length) {
    leg = orderLegals(safeMulti, state, myIdx);
  } else if (lowNaked.length && leg.length > lowNaked.length) {
    // drop naked low multi from cand set; leave trash/high/other
    var drop = {};
    for (iW = 0; iW < lowNaked.length; iW++) drop[playSig(lowNaked[iW])] = 1;
    var kept = [];
    for (iW = 0; iW < leg.length; iW++) {
      if (!drop[playSig(leg[iW])]) kept.push(leg[iW]);
    }
    if (kept.length) leg = kept;
  }
  // else: leave leg unchanged (no legal improvement)
}
```

### Pseudocode — `pickFreeLeadHard` mirror (same axis)

```js
// replace bare multi-always return when weak:
if (multi.length && isWeakMultiPower(hand) && omin >= 4) {
  // same priority: unans → trash+control → safeMulti → default multi pool
  // NEVER return null / pass on free lead
  ...
}
```

---

## 4. Gates — avoid DEV_VAL reverse (W16 family)

| Gate | Rule |
|------|------|
| **No pass force** | Free-lead only; never touch combat `allowPass` / pass-unique |
| **Weak-only** | `handLen ≥ 10` and `mp ≤ 4` (or single family ≤5) — do not rewire healthy multi walls |
| **omin ≥ 4** | No gift / endgame multi pressure change when opp short |
| **Keep unanswerable multi** | Structure fix must not drop lock leads |
| **Trash only with `hasControl`** | Same spirit as W17; no lonely low open without control |
| **No high-smash pass** | Do not re-skin W16 (`top≥9 & sbc≥8 → pass`) |
| **No SoftN** | `SOFT=0` only |
| **No BR FL trash micro retune** | Do not widen W17 trash band; this lever is multiPower-gated structure |
| **One axis** | Do not stack multionly / climbtax retune / nest in same probe |
| **No post-DEV_VAL threshold chase** | If DEV_VAL reverse → discard package; do not loosen weak gate into W16 territory |

---

## 5. Why this firstdiffs holdout both-lose (unlike multionly)

| Mechanism | Effect |
|-----------|--------|
| Freeze multi-always on weak mp | step-0 `345` / naked trip on identity paths |
| Challenger drops naked low multi | **FL_other / FL_struct** firstdiff on previously identical both-lose seats |
| W17 non-overlap | trash-first needs multiHi; weak naked trip often never enters W17 |
| Fair dual | own-policy FL cand + expert leaf; injectOpp still freeze expert |
| Not rate-ε | hard cand rewrite on FL only when weak — discrete playSig change |

Expected class shift on holdout both-lose census:

- Raise `divergeRate` above **0.13** (brfltrash baseline)
- New diffs at **step 0–4 FREE**, not only W17 trash band
- Combat mass: secondary (path divergence after better FL); primary metric still FL structure on both-lose seeds

---

## 6. Success metrics (probe gates)

### A. Firstdiff (required before DEV)

```bash
# Holdout both-lose 23 seeds × both seats (same census as W24)
FREEZE=v91 CHALL=p_w25_ex_flweakmp \
SEEDS=<23 both-lose seeds> BOTH_SEATS=1 MS=200 TRIALS=20 SOFT=0 \
OUT=firstdiff-w25-flweakmp-holdout-bothlose.json \
node evolve/fair-firstdiff.js
```

| Metric | Pass bar |
|--------|----------|
| `divergeRate` vs freeze on both-lose census | **> 0.20** (clearly above 0.13) preferred; hard fail if **≤ 0.13** (dual-null) |
| Both-lose seats freeze-identical | **< 17/23** (was 20/23) |
| classCount | new **FL_*** mass; combat secondary OK |
| vs climbtax base firstdiff (design T12) | **nDiv ≥ 1** (must not be multionly-style 0) |

### B. Fair dual Δ (`SOFT=0`, T20, MS200, TRIALS20)

| Gate | Bar |
|------|-----|
| DEV T20 vs id | **≥ 33** and Δid **≥ +2** |
| vs stack base (climbtax) | do not lose climbtax DEV flips; Δbase **≥ −1** absolute (prefer ≥0) |
| DEV_VAL Δ | **≥ +2** (climbtax bar was +4 — accept ≥+2 if holdout firstdiff real) |
| Reverse seats | **0** new DEV_VAL reverse vs id |
| Holdout A/B | only if DEV_VAL pass; ship still needs WR>0.70 both (**not** this note’s promote) |

### C. Explicit fail → discard

- firstdiff dual-null (≤ brfltrash FL-only 6/46 pattern with no new both-lose seats)
- DEV_VAL reverse (W16 pattern)
- Any SoftN / pass-unique edit introduced while “tuning”

---

## 7. Rejected alternatives (this wave)

| Lever | Why rejected |
|-------|----------------|
| `p_w25_br_multionly` | Combat same-type strip + allowPass=false → **0 firstdiff vs climbtax** |
| Expert multi soft-pass disable | BR allowPass already false when multi cheap → dual-null |
| More W17-style BR FL trash | Forbidden micro thrash; holdout already FL_other-only when diverge |
| W16-style pass-unique | DEV_VAL reverse landmine |
| Seq climb tax alone | Strong for `20300693` but **outside** this note’s OR (multi-contest root vs FL weak); defer if FL weak fails skill seats |

---

## 8. Implementation checklist (implementer)

1. Copy climbtax → `p_w25_ex_flweakmp-*`; bump `AI_BUILD.id`.  
2. Add `multiPowerOf` / `isWeakMultiPower` near `analyzeHand`.  
3. Patch BR FL branch + `pickFreeLeadHard` only. SoftN stays 0.  
4. Smoke: `firstdiff` vs climbtax design must be **>0**; holdout both-lose census divergeRate **>0.13**.  
5. Split → DEV T20 → DEV_VAL (no threshold edits after VAL peek).  
6. Holdout A/B only if VAL pass. **Do not promote live.**

---

## 9. Headline recommendation

| Field | Value |
|-------|--------|
| **Tag** | **`p_w25_ex_flweakmp`** |
| **Axis** | Free-lead hard structure when multiPower weak (drop naked low multi; prefer unans / control-trash) |
| **Stack** | **`p_w24_ex_climbtax`** (fallback `p_w17_brfltrash`) |
| **Locus** | `bestResponseMove` FL post-W17 + `pickFreeLeadHard` multi-always |
| **Not** | SoftN · BR multionly · W16 pass · W17 trash retune |
| **Success** | holdout both-lose firstdiff divergeRate **>0.13** with new FL mass + dual DEV≥33 / VAL Δ≥+2 |

**Why not BR multi-contest:** allowPass + legal multi typing make “remove pass when same-type multi legal” a no-op; `p_w25_br_multionly` empirically dual-null vs climbtax.  
**Why FL weak multiPower:** hits freeze-identical deal-doomed step-0 multi-always (`20440315` class) without pass landmines and without BR FL trash micros.
