# W26 — ONE seq-climb tax lever (`p_w26_ex_seqclimb`)

**Date:** 2026-07-14  
**Mode:** design only — **do not implement** · **do not dual** · SoftN **FORBIDDEN**  
**Base:** `policies/p_w25_ex_flweakmp-{ai,search}.js`  
 (stack = W24 climbtax singles + W25 flweakmp weak multiPower FL)  
**Tag:** **`p_w26_ex_seqclimb`**  
**Protocol lock:** fair dual · `SOFT=0` · hidden · GM both · BR equal · `injectOpp` = freeze `expertPolicy` · **no pass-unique** · **no SoftN**

---

## 0. Why this lever

| Fact | Evidence |
|------|----------|
| Best holdout package | `p_w25_ex_flweakmp` — DEV 34, DEV_VAL Δ+3, holdout **27/26** |
| Climbtax scope hole | W24 tax is **`cur.type==='single' && com.type==='single'` only** — never fires on seq/pair/triple |
| Holdout recon freeze-identical | **`20300693@1`**: step-1 climb **`JH QS KS`** over low seq face (`curTop=2`), burns JH from **JJJ**, then legal-forced PASS on 777/888 |
| Gold series-1 residual | 0500–0504: preserve run/pair residual; 0503 residual-max multi among equal answers |
| Forbidden siblings | SoftN · mintop hard `orderLegals` · pass-unique (W16/W18 DEV_VAL reverse `20290634@0`) · BR multionly (dual-null) · more BR FL trash micros |

**Narrative (20300693):** after `JH QS KS`, hand is no longer JJJ. Later PASSes are **legal**, not soft multi-contest. Singles climbtax never saw that step. Multi-contest-at-root cannot un-burn JH. Need a **combat multi + sequential high-climb tax** that reorders / devalues high burns when residual multi/2s remain.

---

## 1. Exact code locus (base `p_w25_ex_flweakmp-search.js`)

### Primary — `expertScore` combat branch

| | |
|--|--|
| **Function** | `expertScore(play, state, myIdx)` |
| **Region** | combat arm `} else {` after free-lead (`!cur`) — **~L325–363** |
| **Existing W24 climbtax** | **L341–361** inside `if (cur.type === 'single' && com.type === 'single')` |
| **Insert** | (1) tighten/extend **singles** climbtax in-place; (2) **new multi arm immediately after** the singles block, still inside combat `else`, **before** the closing of combat scoring (~L362) |
| **Do not touch** | `orderLegals` sort keys · `cheapLegals` / `playIsExpensive` · `allowPass` · pass-unique · SoftN · BR FL trash / flweakmp · mintop hard rekey |

### Why score-only (not orderLegals / not pass)

- Climbtax already proved **DEV_VAL-safe** as soft `expertScore` mass (+4).
- Hard **mintop-before-expertScore** cascade is the burned fingerprint (`NOTE-fair-dev-screen`: holdout A 0.42).
- Pass-unique / empty-leg fold is W16 landmine — **never** force pass when multi is legal.
- Soft score reorders among **competing** same-type answers and reshapes leaf `orderLegals` mass; it does **not** invent pass.

### Secondary effect surface (no extra edits)

`orderLegals` → `expertScore` only. Cheap path, BR cand order, nest leaf, guards all inherit the tax **without** rekeying min-top.

---

## 2. Rank / gate constants (engine ranks)

```
3=0 … 10=7, J=8, Q=9, K=10, A=11, 2=12
top ≥ Q  ⇔  rank ≥ 9
curTop low ⇔  curTop ≤ 6   (face ≤ 9)
```

---

## 3. Lever definition — ONE axis

### Name
**SEQCLIMB_TAX** — tax sequential **high climbs** when residual multi / 2s / control remain.

### Scope
1. **Singles** (extend W24 climbtax): top ≥ **Q** (was K-only `≥10`), still residual-gated.  
2. **Multi** (new): pair / seq / triple / longer **non-bomb** multi that **burns high cards** (Q+ material or multi-set peel) over a **low** face while residual multi/2s remain.

### Explicit non-goals
- No SoftN  
- No pass-unique / no widen expert soft-pass bands  
- No `orderLegals` min-top hard sort  
- No BR combat cand strip (multionly dead)  
- No flweakmp retune  

---

## 4. Helper (local to search.js; pure, tiny)

```js
/**
 * True if multi play peels high material needed for residual packages.
 * Gold 0503 shield: pure residual-max high seq with low sbc / no multi-set peel → false.
 *
 * burn if:
 *   (a) uses ≥1 card rank≥Q (9) that sat in a multi-set (hand count at that rank ≥ 2), OR
 *   (b) structureBreakCost(hand, play) ≥ 8  (pair/run/triple damage)
 * AND not bomb / not usesTwo (caller also gates usesTwo).
 */
function multiBurnsHighResidual(hand, play) {
  if (!play || play.length < 2) return false;
  var by = {}, i, r, used = {}, k, pr, peels = false;
  for (i = 0; i < hand.length; i++) {
    r = hand[i].rank;
    by[r] = (by[r] || 0) + 1;
  }
  for (i = 0; i < play.length; i++) {
    pr = play[i].rank;
    used[pr] = (used[pr] || 0) + 1;
  }
  for (k in used) {
    if (!used.hasOwnProperty(k)) continue;
    pr = +k;
    if (pr >= 9 /* Q+ */ && (by[pr] || 0) >= 2) peels = true; // e.g. JH from JJJ into JQK
  }
  if (peels) return true;
  return structureBreakCost(hand, play) ≥ 8;
}

/** Residual multi/2s still useful after play (control left to justify saving high climb). */
function residualCtrlAfter(hand, play, info) {
  // Prefer pre-play info for 2s/control (play usually does not spend 2s here).
  if (info.twos >= 1 || info.control >= 2) return true;
  // Else: any pair/triple remaining after removing play ranks
  var by = {}, i, r, leftPairs = 0;
  for (i = 0; i < hand.length; i++) {
    r = hand[i].rank;
    by[r] = (by[r] || 0) + 1;
  }
  for (i = 0; i < play.length; i++) {
    r = play[i].rank;
    by[r] = (by[r] || 0) - 1;
  }
  for (r = 0; r <= 11; r++) {
    if ((by[r] || 0) >= 2) leftPairs++;
  }
  return leftPairs >= 1;
}
```

---

## 5. Exact pseudocode (drop-in shape)

**Locus:** replace / extend climbtax block ~L353–361; add multi arm. Keep v9.1 sbc single penalty untouched.

```js
// ── combat arm of expertScore (cur truthy) ──
// … existing usesTwo / bomb / facing2 scoring …

// ── SINGLES: W24 climbtax → W26 seqclimb (top≥Q, residual multi/2s) ──
if (cur.type === 'single' && com.type === 'single') {
  var gap = com.top.rank - cur.top.rank;
  if (gap > 2 && com.top.rank >= 9 && !usesTwo) score += gap * 0.8;

  var sbc = structureBreakCost(hand, play);
  if (sbc >= 8) {
    score += 18 + sbc * 0.5; // v9.1 no-break-multi (unchanged)
  }

  // W26 p_w26_ex_seqclimb (singles): was climbtax top≥K; now top≥Q
  // Gate: overshoot low face + residual 2s/control + deep enough hand
  // Avoid mintop cascade: soft score only; no orderLegals rekey
  if (
    !usesTwo &&
    gap >= 2 &&
    com.top.rank >= 9 &&          // Q+  (was ≥10)
    curTop <= 6 &&
    handLen >= 6 &&
    (info.twos >= 1 || info.control >= 2 || residualCtrlAfter(hand, play, info))
  ) {
    score += 35 + gap * 3;
  }
  // Keep secondary Ace overshoot tax (unchanged spirit)
  if (!usesTwo && gap >= 3 && com.top.rank >= 11 && handLen >= 8) {
    score += 25;
  }
}

// ── MULTI: W26 seqclimb — tax high multi that burns Q+ / multi-sets over low faces ──
// Recon: 20300693 JH-QS-KS (seq, top=K=10, curTop=2, peels J from JJJ, holds 22)
// Gold shield 0503: residual-max higher seq without multi-set peel + low sbc → no tax
// Gold 0500/0504: singles path; multi arm off
if (
  !usesTwo &&
  !bomb &&
  play.length >= 2 &&
  handLen >= 6 &&
  com &&
  (com.type === 'seq' || com.type === 'pair' || com.type === 'triple' ||
   com.type === 'doubleseq')
) {
  var playTopM = com.top.rank;
  var gapM = playTopM - curTop;
  if (
    playTopM >= 9 &&             // top ≥ Q
    curTop <= 6 &&               // face still low
    gapM >= 3 &&                 // real overshoot (not min-top equal-ish)
    multiBurnsHighResidual(hand, play) &&
    residualCtrlAfter(hand, play, info) &&
    omin >= 4                    // not short-race force contest
  ) {
    // Magnitude: same family as singles climbtax; slightly softer than 35+gap*3
    // so multi residual races (0503-class low-sbc) stay dominated by residual/sbc terms
    score += 40 + gapM * 2 + Math.max(0, playTopM - 8) * 3;
  }
}

// do NOT add: pass bonus, allowPass change, cheapLegals reclass, mintop sort key
```

### Gates checklist (anti-cascade)

| Gate | Purpose |
|------|---------|
| Soft `expertScore` only | Avoid mintop holdout fingerprint |
| `gap≥2` / `gapM≥3` | Tax **overshoot**, not every min-legal high card |
| `curTop≤6` | Only “low face → high burn” class (recon + gold) |
| `top≥Q` | User axis; singles extended from K |
| `multiBurnsHighResidual` | Multi must **burn** high/multi-set — shields 0503 residual-max |
| `residualCtrlAfter` / twos/control | Only when saving high climb is coherent |
| `!usesTwo && !bomb` | Never tax 2-tempo / bomb answers |
| `omin≥4` (multi) | Do not soft-fold races vs short opp |
| `handLen≥6` | Endgame climbs free |
| No pass-unique | BR still plays unique multi; tax reorders when alternatives exist |

---

## 6. Worked examples

### A. Holdout recon `20300693@1` — `JH QS KS`

| Field | Value |
|-------|------:|
| cur | seq 345, `curTop=2` |
| play | `JH QS KS`, top=K=10, `gapM=8` |
| hand multi | JJJ (3), 99, 22 |
| `multiBurnsHighResidual` | **true** (JH peels J-set ≥2) |
| residual | 22 + leftover JJ + 99 → **true** |
| tax | `40 + 16 + 6 = 62` score penalty |

**Honest mass note:** if **only one** same-type multi legal, BR cand is unique → root playSig may still be `JH QS KS`. Tax still:
- reshapes **leaf** order when later branches have multi alternatives;
- interacts with any seat that has **lower multi** answers on similar faces;
- documents the failure class for a **later** non-pass architecture (e.g. optional “expensive climb” reclass — **out of scope**, high reverse risk).

Do **not** “fix” unique multi by forcing pass (W16).

### B. Gold 0503 — residual-max `9-10-J-Q` vs `7-8-9-10`

| Answer | top | burn? | tax? |
|--------|----:|:-----:|:----:|
| 9-10-J-Q | Q=9 | low sbc, no multi-set peel (typical) | **no** |
| 7-8-9-10 | 10=7 | top &lt; Q | **no** |

Residual / existing sbc terms keep gold preference. **If** a hand variant peels a held QQ into the high seq, tax may fire — acceptable (true burn).

### C. Gold 0502 / 0504 — high **loose single** over structure-break low

Singles arm: may tax K/J over low face **if** control/2s remain — same tension as shipped climbtax. Existing `sbc≥8` penalty on the low break (~+18+sbc·0.5) plus `structureBreakCost*2.2` still dominate → gold loose high single wins. **Do not** raise singles tax above climbtax family without re-check 0502/0504 tests.

### D. Gold 0500 — Q from JQK vs 2

Singles smash Q: `sbc` huge (pair/run) already; seqclimb may add if Q≥9 — still loses to 2-tempo expertPolicy paths. No multi arm.

---

## 7. Fair dual protocol

| Rule | W26 |
|------|-----|
| SoftN | **FORBIDDEN** |
| Pass-unique / empty-leg force | **FORBIDDEN** |
| equal BR · hidden · GM both | required |
| `injectOpp` | freeze `expertPolicy` |
| DEV → DEV_VAL before holdout | required |
| Ship | both A/B WR&gt;0.70 + Δid≥+2 (unchanged bar) |

### Suggested eval ladder (when implementing later)

```
1. Copy p_w25_ex_flweakmp-* → p_w26_ex_seqclimb-*
2. Apply expertScore-only patch; bump AI_BUILD.id
3. firstdiff vs flweakmp (design T12 / holdout both-lose census)
   — expect combat_* / multi climb class; nDiv ≥ 1 (not multionly 0)
4. split → DEV T20 (≥33, prefer keep 34)
5. DEV_VAL Δ ≥ +2 (flweakmp was +3; climbtax +4 — accept ≥+2 if holdout mass real)
6. holdout A/B only after DEV_VAL pass; reverse flips = 0 preferred
```

Reject probe if: DEV_VAL reverse · holdout reverse seat · firstdiff 0 · only FL_other noise · any SoftN / pass-unique edit slipped in.

---

## 8. Risk register

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Mintop cascade** (global min-top via score) | High if gates too wide | Keep gap + curTop-low + residual; never hard sort key |
| **0503 inversion** (tax residual-max high multi) | High | `multiBurnsHighResidual` peel/sbc gate; no tax on clean high residual |
| **0502/0504 regression** (tax loose high single) | Med | Magnitude ≤ climbtax family; sbc term still dominates breaks |
| **Under-contest multi midgame** | Med | `omin≥4`, `!bomb`, handLen≥6; no pass force |
| **Unique multi no root firstdiff** (20300693) | Med (mass honesty) | Accept score-only; do not pass-force; measure leaf + multi-alt seats |
| **DEV_VAL reverse** (W16 family) | High if pass added | Score-only; no allowPass change |
| **Stack interaction with flweakmp** | Low–Med | Orthogonal (combat score vs FL structure); keep FL untouched |
| **Doubleseq / bomb false tax** | Low | `!bomb` + playIsBomb already excluded |

---

## 9. Implementation checklist (later; not now)

- [ ] Copy `policies/p_w25_ex_flweakmp-{ai,search}.js` → `p_w26_ex_seqclimb-*`
- [ ] Add helpers `multiBurnsHighResidual` + `residualCtrlAfter` near `structureBreakCost`
- [ ] Patch `expertScore` combat ~L341–363 only
- [ ] `AI_BUILD.id = "v9.1-probe-p_w26_ex_seqclimb"`
- [ ] Run `test-search.js` series-1 (0500–0504) + series-2 structure cases
- [ ] firstdiff → DEV → DEV_VAL → holdout
- [ ] **Do not** edit live `ai.js` / `search.js` until ship gate

---

## 10. Decision summary

| | |
|--|--|
| **Tag** | **`p_w26_ex_seqclimb`** |
| **Base** | `p_w25_ex_flweakmp` |
| **Axis** | ONE: combat `expertScore` seq-climb tax (singles top≥Q + multi high-burn) |
| **Locus** | `expertScore` combat ~L341–363 (`p_w25_ex_flweakmp-search.js`) |
| **Gold** | series-1 residual structure 0500–0504 (preserve; 0503 burn-shield) |
| **Recon** | `20300693` JH QS KS class |
| **Forbidden** | SoftN · pass-unique · mintop hard orderLegals · BR multionly |
| **Status** | **DESIGN ONLY — not implemented** |

---

*Scratch mirror target: `/var/folders/…/implementer/explore` (optional copy). Canonical: `evolve/NOTE-w26-seqclimb.md`.*
