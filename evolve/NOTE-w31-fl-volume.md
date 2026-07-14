# W31 — ONE free-lead volume/structure lever on `p_w30_ex_pairhi`

**Date:** 2026-07-14  
**Mode:** **design only — do not implement from this note alone**  
**Base:** `policies/p_w30_ex_pairhi-{ai,search}.js` (stack: climbtax · flweakmp · seqclimb · mulowg · **pairhi**)  
**SoftN:** **FORBIDDEN**  
**Also forbidden:** W16 pass · `ctrl2hi` · dual-null FL thrash · reverse-B ship · residual-max combat reheat · expert-only FL reorder

---

## 0. Goal

Convert-first absolute gain on the **free-lead volume / package** residual left after pairhi, without touching combat pairhi/mulowg converts already banked.

| Banked (must keep) | Seat / role |
|--------------------|-------------|
| pairhi convert | `20480207@0` combat max-top pair `55→66` |
| mulowg convert | `20270774@0` combat min-top low seq |
| reverse band recover | `20460262@1`, `20440315@1` |
| Holdout package | A **29** / B **27** (sum **56**) under pairhi |

Ship bar unchanged: both holdouts WR>0.70 + Δid≥+2. SoftN dead.

---

## 1. Gold + residual CF (why volume, not shorter)

### Gold (primary authority: `john_uploads/tien_len_AI.txt`)

| IMG | Human free-lead | Wrong AI class | Volume/structure read |
|-----|-----------------|----------------|------------------------|
| **0506** | **334455 / 667788 doubleseq** over long single-seq | long 6-seq | prefer **high combo package** (dseq) |
| **0507** | **whole 334455** (game open, lowest 3s) | naked pair of 3s | **volume upgrade** pair → dseq |
| **0517** | **10-J-Q-K** leave 99 | 9–K mega-seq | **shorter** residual (orthogonal) |
| **0521** | **6-7-8-9** leave one 7 | pair of 7s | **volume** pair → 4-seq |
| **0545** | **split 678 then 8910** | full 678910 | **shorter/split** (orthogonal) |

Gold series 2–4 free-lead structure mass is **not pure length**. Two sub-axes:

1. **FL_volume** — low naked pair open → longer / higher-type multi (0506/0507/0521)  
2. **FL_shorter** — mega-seq refuse / residual split (0517/0545)

### Residual CF (mulowg freeze-id hunt; still valid under pairhi for FREE seats)

| Seat | Freeze open | Convert alt | Class |
|------|-------------|-------------|-------|
| **`20310666@1`** | `3C 3S` | **4-seq** `3S4S5H6H` | ⭐ FL_volume |
| **`20390451@1`** | `3H 3S` | **triple** `3H3D3S` | ⭐ FL_volume |
| **`20290720@1`** | mega **7-seq** | **5-seq** | FL_shorter — **defer** |

W30 residual class mass (mulowg freeze-id): **FL_shorter 23 · FL_volume 10 · maxtop_multi 10**.  
Pairhi already took combat maxtop_multi (`20480207`). Next convert-first free-lead slice with **two measured WIN CFs that agree with gold 0507/0521** is **volume**, not shorter.

**Why not ONE lever that does both volume and shorter?**  
Opposite length keys. A single hard length preference dual-nulls or reverse-fires across the two CF classes. Ship **volume first**; reopen `flshort5` only after volume dual results.

---

## 2. Why freeze / pairhi still opens low pair

Loci in `p_w30_ex_pairhi-search.js` (line refs approximate; re-grep on implement):

| Path | Behavior that kills volume |
|------|----------------------------|
| **`pickFreeLeadHard` multi pool** ~L803–825 | Among multi: if `|topA−topB|≤1` prefer **longer**; else **`expertScore`**. Pair-of-3s (`top=0`) vs 4-seq (`top=3`) has **gap=3 > 1** → expertScore min-top wins → **naked 33**. |
| **`expertScore` free multi** ~L367–378 | Soft length bonus **weaker** for len≥5 than for pair/triple; heavy **`topRank * 0.9`** min-bias. |
| **`bestResponseMove` W14 `forcedLP`** ~L1180–1188 | FREE · `handLen≥11` · `omin≥6` → **strip leg to low pairs only** (`len===2`, top≤6, sbc&lt;8). BR **never explores** 4-seq / triple / dseq → rates unique-max pair even if expert wants volume. |
| **W25 flweakmp** ~L754–769 / BR ~L1206–1251 | Weak multiPower → drop naked low pair **and** low seq/triple; trash-first if control. Must **not** override when flweakmp trash path owns the seat. |

**Dual-null lesson (omin1hi / brseqres):** expert-only multi reorder without BR cand change → BR re-selects freeze play.  
**FL thrash lesson (brflo_g2 / brfltrash widen):** ungated BR free-lead strip → DEV_VAL reverse.  
Therefore volume must be **hard, gated, expert ∧ BR**, and **must override forcedLP** when it fires.

Combat pairhi / mulowg live only under `cur` truthy — **free-lead lever cannot touch them** if gated on `!cur`.

---

## 3. ONE probe

### ⭐ Tag: **`p_w31_ex_flvol`**

| Field | Choice |
|-------|--------|
| **Base** | copy `p_w30_ex_pairhi-{ai,search}.js` → `p_w31_ex_flvol-{ai,search}.js` |
| **ONE axis** | Free-lead only: when multi-always / forcedLP would open a **low naked pair**, and a legal **volume multi** (triple / seq≥3 / doubleseq / quad) exists under structure gates, **hard-pick best volume multi** instead. |
| **Not** | SoftN · pass · combat rekey · mega-seq cap · residual-max combat · trash-first retune · forcedLP widen |

### Convert hypothesis

| CF | Mechanism under flvol |
|----|------------------------|
| `20310666@1` | Freeze `33` → force **4-seq** (len≥3 seq, top≤6) → **WIN** under freeze continuation |
| `20390451@1` | Freeze `33` → force **triple 333** → **WIN** |
| Gold 0507 | Open dseq 334455 when legal (comboPriority dseq ≫ pair) |
| Gold 0521 | Open 6789 when multi-always would pick 77 (pair top mid-low → volume 4-seq) |
| Gold 0506 | Among volume multis, **comboPriority** prefers doubleseq over single-seq of similar top |

Deferred (orthogonal, do not stack this wave):

| CF / gold | Later tag |
|-----------|-----------|
| `20290720@1` mega7→5 | `p_w31_ex_flshort5` or later |
| 0517 / 0545 shorter | same shorter family |

---

## 4. Exact gates (fire only when **all** hold)

### 4.1 Context

1. **Free lead only:** `!state.currentCombo` (and pickFreeLeadHard / BR FL branch).  
2. `handLen ∈ [8, 13]` (open / deep mid — convert seats are full or near-full).  
3. `omin ≥ 4` (not race endgame; avoids egpack / omin≤2 reverse band).  
4. **Not** flweakmp trash path: if `isWeakMultiPower(hand) && info.hasControl && trashPlays.length` → **defer** (keep W25).  
5. No SoftN, no pass branch, no 2-lead primary.

### 4.2 Candidate partition (from non-expensive multi legals)

```text
lowPair  = multi where detectCombo.type === 'pair'
           && topRank ≤ 4          // card ≤ 7 (covers 33 CF + gold 0521 pair-7)
           && !playHasTwo && !playIsBomb
           && structureBreakCost(hand, p) < 8

volMulti = multi where !playHasTwo && !playIsBomb && !playIsExpensive
           && (
                type ∈ {triple, doubleseq, quad}
                || (type === 'seq' && length ≥ 3)
              )
           && topRank(p) ≤ 7       // card ≤ 10 — early/mid package, not QKA burn
           && structureBreakCost(hand, p) < 12
```

### 4.3 Fire condition

```text
fire ⇔ lowPair.length ≥ 1
     ∧ volMulti.length ≥ 1
     ∧ (optional anti-thrash) best vol is not pure high-climb trash:
         residualAfter(hand, bestVol).pairR ≥ 0 always;
         prefer: afterLen ≤ 10 OR residual maxRun≥3 OR residual pairR≥1
           OR com.type === 'doubleseq'   // gold 0506/0507 lock package
```

Do **not** require residual-max as primary sort (combat residual-max anti-converted 20270774; this is FREE only, but keep residual as **tie / safety**, not sole key).

### 4.4 Sort key for `volMulti` (hard pick)

```text
1. comboPriority DESC     // dseq(5) > triple(4) > seq(3) — gold 0506/0507
2. length DESC            // volume among same type (4-seq > 3-seq)
3. topRank ASC            // keep package low (not race high multi)
4. structureBreakCost ASC
5. residualAfter.pairR DESC, maxRun DESC  // mild residual preference
6. expertScore ASC        // suit / residual soft
```

Return `volMulti[0]` (or BR strip to top-K same type/top for rate exploration — see §5).

### 4.5 Explicit non-fires

| Case | Why |
|------|-----|
| Only pairs in multi pool | dual-null; do not invent pass |
| Volume multi only with top≥8 | high multi open thrash (brflo family) |
| `omin ≤ 3` | race package / egpack domain |
| flweakmp weak-mp + trash + control | keep flweakmp convert class |
| Combat `cur` set | **pairhi / mulowg own this** |
| Volume is pair-breaking single-card no | already multi-only |

---

## 5. Dual mirror (BR + expert) — anti dual-null

### 5.1 Helper (single predicate)

Add once near `multiPowerOf` / after `pickPairHi`:

```js
/** W31 flvol: FREE low-pair → volume multi (triple/seq/dseq). Convert 20310666 / 20390451. */
function pickFlVol(hand, multiOrLeg, state, cp) { /* gates §4; return play or null */ }
function flVolPool(hand, multiOrLeg, state, cp) { /* same gates; return sorted volMulti or [] */ }
```

**Same predicate** must gate expert return and BR strip. Do not soft-score only.

### 5.2 Expert — `pickFreeLeadHard` (~L753–825)

Insert **after** flweakmp trash-first and weak-mp safeMulti filter, **before** unanswerable-multi / multi-always pool sort:

```text
if (multi.length) {
  // existing flweakmp ...
  var vol = pickFlVol(hand, multi, state, cp);
  if (vol) return vol;
  // existing unans / pool sort ...
}
```

Optional: if unanswerable multi exists, **keep unans first** (unanswerable lock > volume hypothesis). Order:

1. go-out / omin===1 (unchanged)  
2. flweakmp trash (unchanged)  
3. **2p unanswerable multi** (unchanged — still beats volume)  
4. **NEW flvol**  
5. multi-always pool sort (unchanged)

### 5.3 BR — `bestResponseMove` free-lead branch (~L1155–1252)

**Critical:** run **after** `forcedLP` (or replace forcedLP when volume exists).

```text
// after freeLeadCandidates merge + sort by length
// W14 forcedLP may set leg = low pairs, forcedLP=true

var volPool = flVolPool(hand, /* full multi from original merged multi, NOT stripped pairs */, state, myIdx);
if (volPool.length) {
  leg = volPool;           // or top 3 by sort key if BRANCH small
  forcedLP = false;        // volume owns cand set
}
// then existing brfltrash / flweakmp — do NOT let trash strip kill vol when vol just fired
// Recommendation: if volPool fired, skip brfltrash multiHi→trash force for this root
// (trash-first is orthogonal gold 0514; convert CFs are multi volume)
// flweakmp after: if weak-mp trash path, it may re-strip — respect §4.1.4 by
// building volPool only when flweakmp trash would not own expert path
```

**BR source pool:** compute `flVolPool` from **all non-expensive multi in original leg** (pre-forcedLP), not from pair-stripped leg. forcedLP is exactly what dual-nulls volume rates.

### 5.4 Do **not** edit

| Keep frozen | Reason |
|-------------|--------|
| `pickPairHi` + BR pairhi strip | W30 convert |
| mulowg min-top expert + BR | W29 convert / reverse band |
| climbtax / seqclimb scores | combat stack |
| SoftN / softSamples / allowPass widen | forbidden |
| `orderLegals` global primary key | FL thrash / dual-null risk |
| forcedLP when **no** volPool | keep W14 deep pair force elsewhere |

`freeLeadCandidates` already includes non-expensive multi — **no required edit** if BR merge still adds all multi (`extraBR`). Verify volume multi stays in merged set before forcedLP; if not, add only a comment + use full `getLegalPlays` multi for `flVolPool`.

---

## 6. Gates to **keep** pairhi / mulowg converts

| Check | How ensured |
|-------|-------------|
| `20480207@0` pairhi | combat `cur.type==='pair'` only; flvol is FREE-only |
| `20270774@0` mulowg | combat multi min-top; flvol never sees `cur` |
| `20460262` / `20440315` reverse band | mulowg gates untouched; flvol does not re-enter mid multi min-top |
| Holdout B ≥ 27 (no reverse-B) | kill if B ≤ mulowg/pairhi − 1 without A gain |
| No SoftN / pass | code review + test grep |
| No ctrl2hi | no 2-force branch |

---

## 7. Anti-patterns (kill probe if any)

1. **SoftN** / softSamples &gt; 0 as the lever.  
2. **W16 pass** on free lead or unique multi.  
3. **ctrl2hi** / 2-pair max as volume.  
4. **Expert-only** multi pool sort tweak without BR strip (omin1hi dual-null).  
5. **BR-only** forcedLP exception without expert pickFlVol (asymmetric dual-null).  
6. **Ungated length always** (reheats mega-seq burn on 20290720 / gold 0517).  
7. **Stack flvol + flshort5 + egpack** in one probe.  
8. **Override flweakmp trash** on weak-mp + control seats.  
9. **Combat residual-max** reheat (kills 20270774).  
10. **Reverse B:** ship/select only if holdout B does not drop vs pairhi without clear A convert mass.

---

## 8. Eval ladder (when implement wave opens)

```text
0. Copy p_w30_ex_pairhi-* → p_w31_ex_flvol-*
1. firstdiff vs p_w30_ex_pairhi (SOFT=0 T20 design half)
   REQUIRE:
   - FREE firstdiff nDiv > 0 on 20310666@1 and/or 20390451@1
   - playSig step0: pair 33 ↛ still 33; expect seq≥3 or triple
   - combat seats 20480207@0 / 20270774@0 IDENT or still W
2. playout-trace convert:
   - 20310666@1 force 4-seq → liveWin true (or package-path W)
   - 20390451@1 force triple → liveWin true
3. gold unit (hint / pickFreeLeadHard smoke):
   - 0507-class: prefer dseq/triple over naked 33 when both legal
   - 0521-class: prefer 4-seq over mid pair when gates fire
   - do not require 0517/0545 this wave
4. DEV T20 ≥ pairhi 34 − 1; Δid ≥ 0
5. DEV_VAL Δ ≥ 0 vs pairhi (kill if reverse like brflo_g2)
6. holdout A/B only after VAL
   success stretch: A ≥ 29 and B ≥ 27; ship only both WR>0.70
```

### Firstdiff fail modes

| Result | Meaning |
|--------|---------|
| nDiv=0 FREE | dual-null (forcedLP still owns BR, or expert already volume) |
| nDiv&gt;0 but still L on CF seats | path moved, not convert — gate/sort wrong |
| combat nDiv on pairhi seats | accidental combat bleed — **abort** |
| only trash/FL_other thrash | flweakmp interaction; tighten §4.1.4 |

---

## 9. Why this over alternatives

| Candidate | Verdict |
|-----------|---------|
| **`p_w31_ex_flvol` (this)** | Two convert WIN CFs + gold 0507/0521; FREE-only; dual mirror forcedLP override |
| `p_w31_ex_flshort5` mega-seq cap | CF `20290720` real, but opposite axis; residual mass large but gold 0517/0545 — **#2 after volume dual** |
| Soft residual length in expertScore only | dual-null vs BR forcedLP |
| Re-widen brfltrash / forcedLP | burned FL thrash / DEV_VAL reverse family |
| Combat residual-max | anti-convert mulowg |
| egpack omin≤2 | 0 usable CF on prior freeze-id set; holdout reverse under W30 |
| SoftN / pass / ctrl2 | **FORBIDDEN** |

---

## 10. Implementation sketch (not to apply yet)

```js
// --- search.js helper (conceptual) ---
function pickFlVol(hand, leg, state, cp) {
  var info = analyzeHand(hand);
  var omin = oppMinHand(state, cp);
  var handLen = hand.length;
  if (handLen < 8 || handLen > 13) return null;
  if (omin < 4) return null;
  // flweakmp trash owns weak-mp control seats
  if (isWeakMultiPower(hand) && info.hasControl) {
    for (var t = 0; t < leg.length; t++) {
      if (isTrashSinglePlay(leg[t], info)) return null;
    }
  }
  var lowPair = [], vol = [], i, p, c, top;
  for (i = 0; i < leg.length; i++) {
    p = leg[i];
    if (!p || p.length < 2 || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
    c = detectCombo(p);
    if (!c) continue;
    top = topRank(p);
    if (c.type === 'pair' && top <= 4 && structureBreakCost(hand, p) < 8) lowPair.push(p);
    if (
      (c.type === 'triple' || c.type === 'doubleseq' || c.type === 'quad' ||
        (c.type === 'seq' && p.length >= 3)) &&
      top <= 7 &&
      structureBreakCost(hand, p) < 12
    ) vol.push(p);
  }
  if (!lowPair.length || !vol.length) return null;
  vol.sort(function (a, b) {
    var ca = detectCombo(a), cb = detectCombo(b);
    var pa = comboPriority(ca.type), pb = comboPriority(cb.type);
    if (pa !== pb) return pb - pa;
    if (a.length !== b.length) return b.length - a.length;
    var ta = topRank(a), tb = topRank(b);
    if (ta !== tb) return ta - tb;
    var sa = structureBreakCost(hand, a), sb = structureBreakCost(hand, b);
    if (sa !== sb) return sa - sb;
    return expertScore(a, state, cp) - expertScore(b, state, cp);
  });
  return vol[0];
}
```

**BR:** `var pool = flVolPool(...from full multi...); if (pool.length) leg = pool;` after forcedLP block using pre-strip multi list.

**ai.js:** no logic if policy loads search module only — keep package pair files in sync (copy base ai with search tag).

---

## 11. Decision

| | |
|--|--|
| Base | **`p_w30_ex_pairhi`** |
| **ONE W31 probe** | **`p_w31_ex_flvol`** |
| Axis | FREE low naked pair → hard volume multi (triple / seq≥3 / dseq) |
| Dual mirror | **`pickFreeLeadHard` return + BR FL cand strip** (override **forcedLP**) |
| Convert seeds | `20310666@1`, `20390451@1` |
| Gold | 0506 / 0507 / 0521 (0517/0545 deferred) |
| Keep | pairhi · mulowg · flweakmp trash path · no SoftN |
| Deferred | `flshort5` (`20290720`, 0517, 0545) |
| Implement | **NO** from this note alone |

---

## 12. Artifacts / refs

| Path | Role |
|------|------|
| `policies/p_w30_ex_pairhi-search.js` | base loci: pickFreeLeadHard, freeLeadCandidates, BR FL, pairhi, mulowg, flweakmp |
| `evolve/NOTE-w30-mulowg-residual.md` | CF table FL_volume / FL_shorter; deferred flvol rank 3 |
| `evolve/NOTE-fair-w30-results.md` | pairhi A29/B27 sum 56 |
| `john_uploads/tien_len_AI.txt` | gold 0506/0507/0517/0521/0545 |
| `evolve/NOTE-w24-gold-architecture.md` | FL structure package class |
| `evolve/NOTE-fair-eval-protocol.md` | DEV / VAL / holdout ship |
| This note | **`evolve/NOTE-w31-fl-volume.md`** |

---

*Design only. Do not implement SoftN, pass, ctrl2hi, or dual-null expert-only FL thrash. Implement wave must re-verify convert CFs under live pairhi continuation before dual.*
