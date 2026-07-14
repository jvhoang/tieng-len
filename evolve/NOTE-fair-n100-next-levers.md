# Fair dual N100 next-seed levers (post p_mbnest)

**Date:** 2026-07-14  
**Base:** `policies/p_mbnest-search.js` (best general N100 **0.62** = first25 **0.74** / next25 **0.50**)  
**Goal:** raise **next-25-seed absolute** ~0.50 → **0.65+** (overall or independent WR >0.70 for ship)  
**Protocol locked:** hidden · GM both · BR both equal · BOTH_SEATS · MS150 T12 SOFT4  
**Forbidden:** SoftN · perfect-info duals · more free-lead pin · soft multiTie weight retune

---

## Package already in p_mbnest (do not re-axis)

| # | Axis | Locus in `p_mbnest-search.js` |
|---|------|-------------------------------|
| 1 | FL hybrid strong | `pickFreeLeadHard` ~658–667 |
| 2 | Combat residual soft-ε | `bestResponseMove` ~1107–1111 |
| 3 | orderLegals min-top → sbc | `orderLegals` ~343–358 |
| 4 | TWO_OMIN2 | `expertPolicy` ~403–415 |
| 5 | BR pin trash + low pairs top≤6 | free-lead BR ~1022–1047 |
| 6 | Near-tie hard min top→sbc→len | `bestResponseMove` ~1120–1141 |
| 7 | BR_SELF_NEST_MID hSelf≤11 | BR playout self ~1084–1089 |

## Burned / flat (do not re-probe same shape)

| Tag | Result | Why not again |
|-----|--------|---------------|
| passc / passTie / mbtwopass | ~0.64 s11-ish / dual flat | Broad mid-multi pass pin; over-passive noise |
| cheapfold / mbtwofold | flat | All-sbc fold / handLen≥10 band too coarse |
| mbnest_ovk | s12 0.58 · **s13 0.40** | Blind gap>2 both seats cliff |
| mbleaf_eq | 34/50 flat | Forced-win residual among plays weak alone |
| mbnest_cn / co_cr | N100 worse / flat | Combat-only ntie + nest stacks poorly |
| mbntie_rr residual-first | s12 **0.46** | Residual **before** min-top toxic |
| soft multiTie weight / FL pin bulk | s11 overfit | Next25 still ~0.50 |

---

## Combat patterns **not** yet solved by p_mbnest

Sources: `playlog-strategy-inference.json`, `playlog-human-vs-live-divs.json`, `HUMAN-LOSS-MINES-v11.md`, `NOTE-fair-human-levers-v91.md`.

### P-A — Pair-war high-pair over-contest (mid-game fold quality)

| Evidence | Detail |
|----------|--------|
| CF | `humanPassAltPlay=33`, `pass→pair=22`, `humanPlayAltPass=0` |
| Inference | `H_pass_E_play=30` (useful); **do not** reverse `H_play_E_pass=76` |
| Playlog samples | PASS vs **AA** (expert AD/AH); PASS vs **QQ** (expert KK); PASS vs **99** (expert AA); PASS vs **55** (expert 1010); PASS vs **AA** (expert **22** when deep) |

**Gap in p_mbnest:**  
- Expert: after soft-pass band (`handLen≥11`, ~431–441), **cheap always plays** (~443–444). High-pair answers (top≥9) are legal cheap → never fold.  
- BR: `allowPass` only if **no** cheap (~1055–1059). Pair always has cheap → pass never scored.  
- Soft residual ε + near-tie min-top only reorder **plays**; cannot choose fold when unique max rate is “play AA.”  
- **passc** pinned pass for **all** mid multi — too wide (flat). Need **high-pair-only** gate.

### P-B — Multi-climb / long multi answers (keep high package)

| Evidence | Detail |
|----------|--------|
| Inference | `E_longer_multi_H_shorter=47`, residual hBetter **186**/eBetter **48** |
| Playlog | Free + combat: human shorter multi (e.g. 10JQK vs 9–K length-5; pair 44 vs 8–J seq); combat same-class triple/pair ~75 CF |
| Dual mines | Mid combat residual seeds (13–27 steps); pair ladder 20470144-class AA→22 |

**Gap:**  
- `orderLegals` is min-top → sbc → expertScore — **no multi length / residual-run key**.  
- Combat BR truncates to cheap + orderLegals then `maxBranch` (~1048–1053). Long high multi can still unique-max under binary win rates.  
- residual soft-ε is **sbc-only** (~1108–1110), not residual **seq length** preference among multi answers.

### P-C — Nest leaf never evaluates fold

| Evidence | Detail |
|----------|--------|
| Package | Nest fires `shallowSelfPick` for self when `hSelf≤11` (~1084–1089) |
| `shallowSelfPick` | Scans **plays only** (~1219–1223); **no `null`/pass** candidate |
| Effect | Mid combat forced-win folds invisible to nest leaf; pair-war pass never rate-shifts |

---

## Map: pattern → exact loci (`policies/p_mbnest-search.js`)

| Pattern | Primary function | Lines (approx) | What to change |
|---------|------------------|----------------|----------------|
| Pair-war high fold | `expertPolicy` pre-cheap | **431–444** | High-pair-only pass before cheap return |
| Pair-war BR score | `bestResponseMove` allowPass / actions | **1055–1059** | Pin `null` **only** when all cheap pair tops ≥9 |
| Multi-climb answer | `orderLegals` combat branch | **350–358** | After min-top+sbc: shorter multi / residual maxRun |
| Multi residual BR | `bestResponseMove` combat soft-ε | **1107–1111** | **Not** multiTie weight — optional hard key in ntie only if lever 2 is orderLegals-only |
| Nest fold discovery | `shallowSelfPick` | **1187–1224** | Try pass leaf when combat mid multi deep |
| Binary rate blindness | BR trial score | **1097–1112** | Mean `leafEval2p` blend (not soft multiTie) |

---

## Top 3 NEW one-axis levers (next-seed absolute)

Base each as **copy of `p_mbnest` + ONE axis only**. Measure **N100** (or next25 split) not only s11.  
Reject if s11 cliffs >−4 wins **or** s13 <0.48.

---

### Lever 1 — `PAIR_WAR_HIGH_FOLD` ⭐ (mid-game pass quality, pair-war)

**Why new / why next-seed:** Distinct from passc (all mid multi), cheapfold (all sbc≥8), mbtwofold (handLen band). Only folds when **every cheap pair answer is high (top≥9)** midgame — matches playlog PASS vs AA/KK/1010 while **still contesting** 66/77/88 ladders. Shifts independent seeds with long pair-wars, not FL pin s11 pets.

**Not:** passc re-run · passTie soft · reverse H_play_E_pass · AA_SAVE · SoftN.

**Functions:** (A) `expertPolicy` before cheap return; optional one-axis pure expert is enough for leaf+root consistency under fair dual.

**Edit shape (~10 lines)** — insert **before** `var cheap = cheapLegals(leg);` (~443):

```js
// PAIR_WAR_HIGH_FOLD: fold mid pair-war when only high pairs answer (playlog H_pass_E_play)
// Keeps low/mid ladder contest (66 over 33); blocks AA/KK/1010 climbs when deep.
if (
  cur.type === 'pair' &&
  handLen >= 8 &&
  omin >= 5 &&
  curTop < 10 &&
  !playIsBomb(cur.cards || [])
) {
  var chP = cheapLegals(leg).filter(function (p) { return p.length === 2; });
  if (chP.length && chP.every(function (p) { return topRank(p) >= 9; })) {
    return { pass: true };
  }
}
```

**Risk:** Med-low — if dual over-folds KK vs 1010 races, raise gate to `top≥10` or require `handLen≥9`.  
**Next25 class:** pair ladder mid losses; seat1 combat after FL settled.  
**Probe tag:** `p_mbpairhf`

---

### Lever 2 — `COMBAT_MULTI_LEN_RESID` (multi-climb answer micro)

**Why new / why next-seed:** Min-top package already shipped; residual-first ntie **failed** on FL+combat. This axis is **combat multi length + residual run only inside `orderLegals`**, after min-top and sbc — affects cheap path, BR cand order, nest leaf order, without soft multiTie weights and without FL residual reorder.

**Not:** soft multiTie retune · mbntie_rr residual-first · pair-first pool · FL pin.

**Function:** `orderLegals` combat sort (~350–358).

**Edit shape (~12 lines)** — extend combat comparator after sbc:

```js
// COMBAT_MULTI_LEN_RESID — after min-top + sbc (package keys stay primary)
if (cur && a && b) {
  function top(p){var t=-1;for(var i=0;i<p.length;i++)if(p[i].rank>t)t=p[i].rank;return t;}
  var ta=top(a), tb=top(b);
  if (ta !== tb) return ta - tb;
  var ca = structureBreakCost(hand, a), cb = structureBreakCost(hand, b);
  if (ca !== cb) return ca - cb;
  // multi-climb: prefer shorter multi among equal top+sbc (E_longer_multi_H_shorter)
  if (a.length >= 2 && b.length >= 2 && a.length !== b.length) {
    return a.length - b.length;
  }
  // residual isolated-run length: prefer answer that leaves longer spine
  function resRun(play) {
    var by = {}, i, r, left = [], k, best = 0, run = 0;
    for (i = 0; i < hand.length; i++) by[hand[i].rank] = (by[hand[i].rank] || 0) + 1;
    for (i = 0; i < play.length; i++) by[play[i].rank] = (by[play[i].rank] || 0) - 1;
    for (r = 0; r <= 11; r++) if ((by[r] || 0) > 0) left.push(r);
    for (k = 0; k < left.length; k++) {
      if (k && left[k] === left[k-1] + 1) { run++; best = Math.max(best, run); }
      else run = 1;
    }
    return best;
  }
  var ra = resRun(a), rb = resRun(b);
  if (ra !== rb) return rb - ra;
}
return expertScore(a, state, myIdx) - expertScore(b, state, myIdx);
```

**Risk:** Low — secondary keys only; min-top preserved. If s11 min-beat regressions, drop resRun keep length-only.  
**Next25 class:** multi-answer mid combat + same-class pair/triple selection noise.  
**Probe tag:** `p_mbcmul`

---

### Lever 3 — `NEST_SHALLOW_PASS` (fold discovery under nest leaf)

**Why new / why next-seed:** Nest already generalizes best (N100 0.62) but `shallowSelfPick` **never tries pass** — so BR rates never credit mid-combat folds that human logs show as structure-preserving. Distinct from BR passc (root action pin) and leaf_eq (residual among **plays** only). One axis: add **pass candidate** under tight pair/multi mid gate; if `exploitPlayoutLeaf(pass)≥0.99` return pass, else existing play scan.

**Not:** passc · passTie · expert bulk soft-pass reverse · SoftN.

**Function:** `shallowSelfPick` after leg built, before/alongside forced-win play loop (~1217–1224).

**Edit shape (~12 lines):**

```js
// NEST_SHALLOW_PASS: evaluate fold as nest leaf when mid multi/pair deep (not free-lead)
var fallback = expertPolicy(state, myIdx);
if (
  cur &&
  hand.length >= 8 &&
  oppMinHand(state, myIdx) >= 5 &&
  cur.type !== 'single' &&
  !playIsBomb(cur.cards || []) &&
  (cur.top ? cur.top.rank : 0) < 10
) {
  var np = passFast(state, myIdx);
  np.isFirstLead = false;
  if (exploitPlayoutLeaf(np, myIdx, 200) >= 0.99) return { pass: true };
}
for (i = 0; i < leg.length; i++) {
  var n = applyPlayFast(state, myIdx, leg[i]);
  n.isFirstLead = false;
  if (exploitPlayoutLeaf(n, myIdx, 200) >= 0.99) return { play: leg[i] };
}
return fallback;
```

**Risk:** Med wall-clock (+1 leaf when gate hits). Med strength if leaf over-folds under det — gate mirrors pair-war (multi/pair only, omin≥5).  
**Next25 class:** long midgames where nest already fires but leaf always contests.  
**Probe tag:** `p_mbnest_sp`  
**Depends:** nest live — base = `p_mbnest` body (already).

---

## Ranked execute order

| Rank | Tag | Axis | Next-seed thesis |
|-----:|-----|------|------------------|
| **1** | `p_mbpairhf` | PAIR_WAR_HIGH_FOLD | Hard first-diff on pair-war climbs unique-max never folds |
| **2** | `p_mbcmul` | COMBAT_MULTI_LEN_RESID | Cheap/BR/nest order multi-climb micro without multiTie weight |
| **3** | `p_mbnest_sp` | NEST_SHALLOW_PASS | Nest leaf discovers structure folds; complements #1 at rate level |

### Honorable (if 1–3 first-diff but dual-flat on next25)
- **`BR_UTIL_MEAN_COMBAT`:** replace pure `wins/nTry` with `mean(finalUtility)` if util ever soft; or `0.9*(wins/n)+0.1*mean(leafEval2p after one apply)` — continuous equal leaf; **not** soft multiTie.  
- **`BR_PAIR_PASS_PIN`:** passc-shaped pin but **only** when `cur.type==='pair' && all cheap tops≥9` (BR twin of lever 1 if expert-only under-fires).  
- **`GUARD_PAIR_OVK_ONLY`:** gap>2 clamp **pairs only** (soften s13 single-race denial of full ovk).

### Still reject
SoftN · hollow budget · perfect duals · more FL pin · soft multiTie weight · passc/cheapfold/passTie re-run · residual-first ntie · blind ovk+loose nest · hunting structural 20380387

---

## Probe protocol

```bash
# Base = copy policies/p_mbnest-{ai,search}.js → p_mbpairhf / p_mbcmul / p_mbnest_sp
FREEZE=v91 CHALL=p_mbpairhf GAMES=25 SEED=20260711 BOTH_SEATS=1 \
  node evolve/lean-fair-dual-n20.js
# Interest: N50 absolute ≥0.64 overall; split first25 vs next25 if available
# Then N100 vs v91 fair both — ship gate overall or independent WR >0.70
# Reject: s11 −≥4 wins · s13 <0.48 · first-diff only on FL pin seeds
```

**Success**
1. N100 overall **≥0.66** interest / **>0.70** ship  
2. **next25 ≥0.60** interest / **≥0.65** target (primary metric this note)  
3. s11 N50 **≥0.68** (no free-lead cliff)  
4. first-diff mid combat pair-war / multi answer — not FL-only

---

## One-liners (top 3)

1. **`p_mbpairhf` — PAIR_WAR_HIGH_FOLD:** expert fold mid pair-war when every cheap pair answer has top≥9 (playlog PASS vs AA/KK/1010; not broad passc).  
2. **`p_mbcmul` — COMBAT_MULTI_LEN_RESID:** after min-top→sbc in `orderLegals`, prefer shorter multi then longer residual run (multi-climb / E_longer mass).  
3. **`p_mbnest_sp` — NEST_SHALLOW_PASS:** nest leaf tries pass under mid multi/pair deep gate; keep forced-win folds that play-only shallow never sees.

---

## Evidence pointers

- `/Users/johnhoang/Downloads/tienlen-playlogs-1783931122937.json`  
- `evolve/playlog-strategy-inference.json` (H_pass_E_play 30 · E_longer 47 · residual 186:48)  
- `evolve/playlog-human-vs-live-divs.json` (pair-war PASS samples)  
- `evolve/HUMAN-LOSS-MINES-v11.md` (combatDiffer 188 · pass→pair 22)  
- `evolve/NOTE-fair-human-levers-v91.md` · `STATUS.md` (p_mbnest N100 0.62)  
- `policies/p_mbnest-search.js` loci above
)
