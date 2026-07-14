# W30 — Holdout residual under `p_w29_ex_mulowg` (best A 28/50, B 27/50, sum **55**)

**Date:** 2026-07-14  
**Mode:** analysis only — **do not promote** · SoftN **FORBIDDEN** · W16 pass **FORBIDDEN** · ctrl2hi **FORBIDDEN**  
**Base / best package:** `p_w29_ex_mulowg` (**A 28 / B 27 / sum 55**)  
**Peers:** `p_w28_ex_mulow` 28/26 sum54 · `p_w26_ex_seqclimb` 27/27 sum54 · identity 25/25  
**Freeze identity:** `evolve/holdout-{A,B}-id-t20-w24-climbtax.json`  
**Challenger holdout:** `evolve/holdout-{A,B}-ch-t20-w29-mulowg.json`  
**Residual firstdiff (mulowg vs v91, residual-L seeds × both seats):**  
- A: `evolve/firstdiff-w30-mulowg-residual-holdoutA.json` (44 games, nDiv=16, rate 0.36)  
- B: `evolve/firstdiff-w30-mulowg-residual-holdoutB.json` (42 games, nDiv=12, rate 0.29)  
**CF hunt:** `{SCRATCH}/w30/cf-convert-hunt.json`  
**Scratch:** `{SCRATCH}/w30/mulowg-residual.json`  
**Protocol:** fair dual · `MS=200 TRIALS=20 SOFT=0` · BOTH_SEATS on residual firstdiff · CF = force alt legal then freeze continuation

---

## 0. Headline

| Metric | A | B | A+B |
|--------|--:|--:|----:|
| mulowg wins | **28/50 (0.56)** | **27/50 (0.54)** | **55/100** |
| mulow wins | 28 | 26 | 54 |
| seqclimb wins | 27 | 27 | 54 |
| identity wins | 25 | 25 | 50 |
| residual L (`liveWin=false`) | **22** | **23** | **45** |
| both-lose (mulowg L ∧ id L) | **21** | **20** | **41** |
| freeze-identical both-lose (no firstdiff vs v91 on loss seat) | **13** | **13** | **26** |
| freeze-identical rate of both-lose | **13/21 = 61.9%** | **13/20 = 65.0%** | **26/41 = 63.4%** |
| diverged-still-loss (both-lose) | **8** | **7** | **15** |
| freeze-identical residual L | **13/22 = 59.1%** | **13/23 = 56.5%** | **26/45 = 57.8%** |

### vs mulow (W29 ship of gate)

| Seat | mulow | mulowg | Role |
|------|:-----:|:------:|------|
| `20270774@0` | W | **W** | convert kept (minTop rank 2) |
| `20460262@1` | L | **W** | reverse-B recovered |
| `20440315@1` | L | **W** | reverse-A recovered |
| `20340585@0` | **W** | L | suit/mid multi noise — re-entered both-lose under mulowg |

**Net:** B **+1** (26→27), A flat 28 (recover reverse, lose suit-noise), sum **54→55**. SoftN dead. Ship bar still WR>0.70 — **no promote**.

### vs prior both-lose baselines

| Package | both-lose A+B | freeze-id both-lose | rate |
|---------|--------------:|--------------------:|-----:|
| seqclimb | 42 | 27 | 64.3% |
| mulow | 40 | 25 | 62.5% |
| **mulowg** | **41** | **26** | **63.4%** |

**Read:** Band-gated mulow fixed the measured mid-band reverses and kept the low-seq convert, but absolute residual is still **~63% freeze-identical both-lose**. Mulowg’s remaining hole is **not** “gate never fired” — it includes seats where **min-top multi still fires on pairs** and is **anti-convert**, plus FL structure / 2-burn / unique-multi dual-nulls. Soft score tax and mid mintop without type split produce diverge∩¬convert. Absolute gains need **gated hard playSig change with measured win convert and blocked reverse band**.

---

## 1. Both-lose seats A+B under mulowg

Both-lose = holdout `liveWin=false` **and** identity `liveWin=false` on the same `seed@seat`.  
Freeze-identical = residual firstdiff vs `v91` on the **loss seat** has `diverged=false`.

### 1a. Holdout A — 21 both-lose

#### Freeze-identical — 13 (skill-class focus)

| # | seed@seat | steps | notes (path / CF) |
|--:|-----------|------:|-------------------|
| 1 | **20300693@1** | 9 | unique multi `JH QS KS` — pool suit-only; CF only via **PASS** (forbidden) |
| 2 | 20390450@1 | 14 | long seq FL; no usable one-step convert in hunt |
| 3 | 20430342@1 | 17 | late FL shorter CF (pair→single) — midgame free-lead |
| 4 | **20290720@1** | 18 | ⭐ **FL_shorter CF:** mega 7-seq → 5-seq WIN |
| 5 | 20410396@1 | 19 | high seq climb; no usable CF |
| 6 | **20350558@1** | 19 | pair ladder; CF `33→22` (2-pair burn) / later FL volume — **not clean lever** |
| 7 | 20370504@0 | 20 | CF `TT→22` (2-burn) / FL shorter — reverse-risk |
| 8 | 20490180@1 | 20 | single war; CF `7H→9S` weak one-off |
| 9 | **20480207@0** | 21 | ⭐ **pair max-top CF:** freeze/mulowg `5C5H` → **`66` WIN**; also ctrl2 secondary (forbidden) |
| 10 | 20420369@0 | 22 | pair ladder then pass wall; no usable CF |
| 11 | 20310666@1 | 22 | ⭐ **FL_volume CF:** open `33` → **4-seq WIN** |
| 12 | 20470234@0 | 23 | ctrl2 CF only (forbidden family) |
| 13 | **20340585@0** | 21 | re-entered both-lose vs mulow; CF maxtop `678→789` / suit; mulowg vs mulow firstdiff picks higher multi |

**Buckets (A freeze-id):** SEQ/FL structure **~5** · PAIR ladder / multi **~4** · 2_BURN **~2** · UNIQUE_MULTI **1** · single war **1**

#### Diverged-still-loss — 8 (path moved, win not)

| seed@seat | firstdiff freeze → mulowg |
|-----------|---------------------------|
| **20280747@1** | multi tax `TS JS QC KH` → `6S 7S 8H 9C` |
| 20330612@1 | FREE pair → single |
| 20380477@0 | FREE long-4 → pair |
| **20400423@1** | multi `TD JC QS` → `8S 9H TS` |
| 20440315@0 | FREE weak multi → trash (flweakmp; still doomed) |
| 20450288@1 | single `TC` → `8D` |
| **20460261@1** | multi tax 4-seq → lower 4-seq |
| 20500153@0 | FREE long-10 → 6-seq |

Multi-tax / FL **diverge∩L** seats are **not** closest-to-flip for W30 — lever already fired, outcome fixed.

### 1b. Holdout B — 20 both-lose

#### Freeze-identical — 13

| # | seed@seat | steps | CF note |
|--:|-----------|------:|---------|
| 1 | 20280748@1 | 23 | late FL single reorder |
| 2 | 20290721@0 | 23 | late FL pair→single |
| 3 | 20310667@0 | 17 | no usable CF |
| 4 | 20330613@1 | 16 | no usable CF |
| 5 | 20360532@1 | 21 | late FL volume |
| 6 | **20380478@1** | 23 | early single climb CF `4C→5C/7H`; later FL volume |
| 7 | **20390451@1** | 20 | ⭐ **FL_volume CF:** `33` → **triple 333** WIN |
| 8 | 20400424@1 | 19 | CF only PASS (forbidden) |
| 9 | 20410397@1 | 21 | late FL shorter |
| 10 | 20430343@1 | 22 | single climb / ctrl2 alts |
| 11 | 20440316@0 | 20 | no usable CF |
| 12 | 20450289@1 | 16 | no usable CF |
| 13 | 20470235@0 | 18 | late FL single |

#### Diverged-still-loss — 7

| seed@seat | firstdiff freeze → mulowg |
|-----------|---------------------------|
| 20260802@0 | FREE `3H 3C` → `4D` |
| 20270775@1 | FREE `3S` → `3C 3S` |
| 20300694@1 | single `QS` → `6S` |
| 20340586@0 | single `KD` → `9C` |
| 20350559@0 | FREE `3H` → `3C 3H` |
| **20420370@0** | seq `QC KC AS` → `9D TD JS` (multi reorder; still L) |
| 20480208@0 | FREE `3C 4C 5H` → `KC KH` |

**B converts vs mulow:** **`20460262@1` only** (gate recovery). No new B both-lose converted out of the set vs mulow.

---

## 2. Freeze-identical vs diverged-still-loss rates

| Scope | freeze-id | diverged-still | rate freeze-id |
|-------|----------:|---------------:|---------------:|
| Both-lose A | 13 | 8 | **61.9%** |
| Both-lose B | 13 | 7 | **65.0%** |
| Both-lose A+B | **26** | **15** | **63.4%** |
| Residual L A | 13 | 9 | 59.1% |
| Residual L B | 13 | 10 | 56.5% |
| Residual L A+B | 26 | 19 | 57.8% |

**Residual firstdiff divergeRate (loss seeds × both seats):** A 16/44 ≈ 0.36 · B 12/42 ≈ 0.29.

**Sample freeze-id firstdiff (5 both-lose seats × both seats, n=10):**  
`20290720`, `20300693`, `20350558@1`, `20480207@0`, `20470234@0` all **identical on the loss seat** (loss-seat nDiv=0). Confirms skill-class freeze path for CF hunting.

**Implication:** ~⅝ of both-lose is still freeze-identical skill/deal. SoftN dead. Need **hard playSig** with CF win convert.

---

## 3. Convert CF hunt (freeze-id both-lose × alt legal)

Method: follow freeze path; at each live decision try up to 8 alternate legals; continue with freeze `getAIMove`; record `liveWin`. Exclude **pass** and **ctrl2** from “usable” (forbidden levers).

| | count |
|--|------:|
| freeze-id both-lose seats hunted | 26 |
| seats with any convert (incl. pass/ctrl2) | 19 |
| usable converts (no pass/ctrl2) | **60** |
| seats with usable convert | **16** |
| **omin≤2 usable converts (egpack band)** | **0** |

### Usable convert class mass

| class | n | lever fit |
|-------|--:|----------|
| FL_shorter | 23 | mega-seq / multi free-lead refuse |
| FL_volume | 10 | pair/triple open → longer multi |
| **maxtop_multi** | **10** | combat higher multi/pair |
| other (single climb etc.) | 10 | weak one-offs |
| FL_other | 6 | late free single reorder |
| FL_higher_multi | 1 | free-lead higher multi |

### ⭐ Convert CF #1 — `20480207@0` (combat pair max-top)

| Field | Value |
|-------|--------|
| Outcome | both-lose, **freeze-identical**, 21 steps |
| Step1 | `pair@0` · handLen=13 · omin=11 |
| Freeze / mulowg play | **`5C 5H`** (identical; mulowg **min-top fires**: minTop rank **2** ≤ 3) |
| Hand | `TD 6H 5C 7S 6S QS 2D 6C 5H JH 5D 4H 8D` |
| Pair alts | `55` (3 suit variants), **`66`** (3 suit variants) |
| **Convert CF** | force **`6H 6S`** (or any `66`) at step1 → **`liveWin=true`** (18 steps) |
| Secondary CF | step5 `4H→2D` ctrl2 — **forbidden** (W27 reverse) |

**Key insight:** mulowg’s band gate correctly blocks mid-seq reverse, but **min-top still applies to pairs**. On this seat min pair `55` is **anti-convert**; max pair `66` wins under freeze continuation. Expert score also min-biases (`topRank*0.85`), so removing force alone is **not** enough — need **hard max-top pair** (BR strip mirror) or type-split.

### Convert CF #2 — `20290720@1` (FL mega-seq shorter)

| Field | Value |
|-------|--------|
| Step0 FREE | freeze **7-card** `3D4D5H6C7H8D9H` |
| Convert | force **5-card** `3D4D5H6C7S` (or suit variants) → **WIN** |
| Lever fit | free-lead structure / flshort family; flweakmp already stacked but does not cap mega-seq length here |

### Convert CF #3 — `20310666@1` / `20390451@1` (FL volume)

| Seat | freeze open | alt WIN |
|------|-------------|---------|
| `20310666@1` | `3C 3S` | **4-seq** `3S4S5H6H` |
| `20390451@1` | `3H 3S` | **triple** `3H3D3S` |

### Explicit non-converts / forbidden

| Seat / class | Why not W30 #1 |
|--------------|----------------|
| egpack omin≤2 | **0** usable CF on freeze-id residual set |
| ctrl2 (`20480207`, `20470234`, …) | W27 reverse mass |
| pass (`20300693` unique multi) | W16 forbidden |
| `20350558` `33→22` | burns 2-pair — reverse fingerprint |
| `20340585@0` maxtop/suit | mulowg↔mulow gate cost; not a new orthogonal family |

---

## 4. egpack check (preferred axis — **fails convert gate**)

`NOTE-w29-gold-endgame.md` ranked **`p_w29_ex_egpack`** (omin≤2 high package + BR strip) as orthogonal endgame mass after mulowg.

| Check | Result |
|-------|--------|
| Freeze-id both-lose with omin≤2 usable CF | **0** |
| Convert-first bar | **FAIL** on residual census |
| Dual-null risk if soft-only | high (omin1hi lesson) |
| Decision | **Defer** — do not ship egpack as W30 ONE without a new CF seed |

Honest read: endgame race package may still matter for gold unit / non-holdout, but it is **not** convert-proven on the mulowg holdout freeze-id hole.

---

## 5. ONE convert-proven W30 probe on mulowg base

### ⭐ **`p_w30_ex_pairhi`** — combat pair max-top (override mulowg min-top for pairs)

| Field | Choice |
|-------|--------|
| **Base** | `p_w29_ex_mulowg` (copy → `p_w30_ex_pairhi-{ai,search}.js`) |
| **ONE axis** | Combat **pair** answers: when ≥2 non-2 pair legals with **distinct tops**, hard-pick **max top** pair (then longer/suit), **before** mulowg min-top and before cheap `orderLegals`. BR cand **strip** to max-top pool. |
| **Convert hypothesis** | `20480207@0` step1: freeze/mulowg `5C5H` → **`66`** → **win** (CF proven under freeze continuation). Mulowg seq convert `20270774@0` untouched (seq-only path). Gate recovery seats `20460262` / `20440315` untouched. |
| **Why not egpack** | 0 omin≤2 CF on residual freeze-id set |
| **Why not SoftN / W16 pass / ctrl2hi** | Forbidden |
| **Why not residual-max seq** | anti-convert on 20270774; mulow_rg nDiv=0 history |
| **Why not FL_shorter / FL_volume as #1** | convert-proven but free-lead class; user preference combat if CF converts; pairhi is combat |
| **Why hard max-top (not “drop pair from mulowg” alone)** | expertScore min-biases pairs (`topRank*0.85`); without hard force, BR/expert still prefer `55` |

### 5.1 Gates (exact)

Fire only when **all** hold:

1. `cur` truthy and `cur.type === 'pair'`.  
2. `curTop ≤ 3` (very low face — convert seat curTop **0**; keeps mid-pair wars out).  
3. `handLen ∈ [8, 13]`.  
4. `info.twos ≥ 1 || info.control ≥ 2` (same residual-control spirit as mulowg).  
5. Build `pairs =` non-2, non-bomb pair legals; require `pairs.length ≥ 2`.  
6. Require **≥2 distinct tops** among pairs (suit-only pool → dual-null; do not invent pass).  
7. **Never** include pairs with a 2 (`playHasTwo`).  
8. Optional safety: `maxTop − minTop ≤ 2` (adjacent ladder only — convert gap 6−5=1; blocks `33` vs `KK` thrash).  
9. Always play if legal — **never pass**.

### 5.2 Exact locus (triple mirror)

Base file: `policies/p_w29_ex_mulowg-search.js`

| Site | ~Lines | Change |
|------|-------:|--------|
| 1. `expertPolicy` pre-cheap | **before** mulowg block ~487 | pairhi return max-top if gates |
| 2. `expertPolicy` cheap mirror | ~517–541 | pairhi on `cheap` pool before mulowg cheap |
| 3. `bestResponseMove` combat | ~1210–1245 | if pairhi gates: **strip `leg` to max-top pairs only**; do **not** apply mulowg min strip on pairs when pairhi fired |

**Shared helper (sketch):**

```js
function pairHiPool(hand, leg, cur, state, cp) {
  if (!cur || cur.type !== 'pair') return null;
  var curTop = cur.top ? cur.top.rank : 0;
  var handLen = hand.length;
  if (curTop > 3 || handLen < 8 || handLen > 13) return null;
  var info = analyzeHand(hand);
  if (info.twos < 1 && info.control < 2) return null;
  var pairs = [], tops = {}, i, p, t;
  for (i = 0; i < leg.length; i++) {
    p = leg[i];
    if (!p || p.length !== 2 || playHasTwo(p) || playIsBomb(p)) continue;
    pairs.push(p);
    tops[topRank(p)] = 1;
  }
  if (pairs.length < 2) return null;
  if (Object.keys(tops).length < 2) return null; // suit-only
  pairs.sort(function (a, b) {
    var ta = topRank(a), tb = topRank(b);
    if (ta !== tb) return tb - ta; // MAX top
    return expertScore(a, state, cp) - expertScore(b, state, cp);
  });
  var maxT = topRank(pairs[0]);
  var minT = Math.min.apply(null, pairs.map(topRank));
  if (maxT - minT > 2) return null; // adjacent ladder only
  return pairs.filter(function (x) { return topRank(x) === maxT; });
}
```

**expertPolicy insert (before mulowg):**

```js
var phi = pairHiPool(hand, leg, cur, state, cp);
if (phi && phi.length) return { play: phi[0] };
// ... existing mulowg min-top (seq still covered; pairs overridden when pairhi fires)
```

**bestResponseMove:** after cheapLegals, if `pairHiPool(...)` non-null → `leg = that pool` (force strip). Else existing mulowg min strip.

### 5.3 Anti-reverse for holdout B

| Rule | Why |
|------|-----|
| **pair only** | mulowg seq convert `20270774` + reverse recoveries stay |
| `curTop ≤ 3` | mid pair wars / high face out of band |
| non-2 pairs only | no 22 burn (`20350558` CF toxic) |
| distinct tops + gap≤2 | suit-only null; no 33-vs-KK thrash |
| no SoftN / pass / ctrl2 | forbidden |
| reject if firstdiff only FL | wrong residual class for this probe |
| reject if holdout B Δ ≤ −1 vs mulowg | anti-reverse bar |
| reject if `20270774@0` or `20460262@1` lost | must keep W29 wins |

**B success target:** holdout B ≥ **27** (no regression) · A ≥ **28** preferred **≥29** if `20480207@0` converts live.

### 5.4 Deferred ranking (not W30 ONE)

| Rank | Tag (if later) | When to reopen |
|-----:|----------------|----------------|
| 2 | `p_w30_ex_flshort5` mega-seq cap (FL) | After pairhi; CF `20290720@1` |
| 3 | `p_w30_ex_flvol` free-lead volume over low pair | CF `20310666` / `20390451` |
| 4 | `p_w30_ex_egpack` omin≤2 package BR strip | Only if new CF appears with omin≤2 convert |
| — | ctrl2 / pass / SoftN / residual-max seq | **never** this wave |

### Convert hypothesis (one paragraph)

Under mulowg, freeze-identical both-lose is still ~63%. The band gate fixed mid-seq reverse and kept low-seq convert, but **min-top multi still forces low pairs** (minTop rank ≤3). On freeze-id seat `20480207@0`, that force plays `55` and loses; forcing the alternate legal **`66`** wins under freeze continuation — a clean combat convert orthogonal to seq mintop and not SoftN/pass/ctrl2. Endgame egpack has **zero** usable CF on this residual freeze-id set, so it fails convert-first. **`p_w30_ex_pairhi`** is the smallest convert-proven lever on mulowg base: hard max-top among non-2 pairs on very low faces, with BR strip, leaving mulowg seq path intact for A/B dual wins already banked.

### Probe anti-patterns

1. Do **not** SoftN / W16 pass / ctrl2hi reheat.  
2. Do **not** residual-max / mulow_rg on seq (kills 20270774).  
3. Do **not** only drop pairs from mulowg without max-top hard force (expert still min-biases).  
4. Do **not** expert-only reorder without BR strip (omin1hi dual-null).  
5. Do **not** stack pairhi + flshort5 + egpack in one probe.  
6. Do **not** force 22 / 2-pairs as “max top.”

---

## 6. Eval ladder (when implementing)

```text
1. firstdiff vs p_w29_ex_mulowg
   - require nDiv>0 combat pair higher-top on 20480207@0
   - require 20270774@0 IDENT or still low multi 345 (seq convert preserved)
   - require 20460262@1 / 20440315@1 still W path (no reverse reheat)
2. playout-trace: 20480207@0 liveWin true under pairhi
3. gold unit: no SoftN/pass; no 2-over-loose; 0532 not required this wave
4. DEV T20 ≥ mulowg (34) − 1 tolerance; Δid ≥ 0
5. DEV_VAL Δ ≥ 0 vs mulowg
6. holdout A/B only after VAL — no promote from this note
   success: A ≥ 28 (stretch 29) and B ≥ 27
```

### Probe kill criteria

- nDiv=0 vs mulowg (dual-null)  
- 20270774 convert lost  
- 20460262 / 20440315 reverse reheat  
- holdout B ≤ −1 vs mulowg without A gain  
- firstdiff only FL noise  
- any SoftN / pass / ctrl2hi slip  

---

## 7. Artifacts

| Path | Role |
|------|------|
| `evolve/holdout-A-ch-t20-w29-mulowg.json` | CH A **28/50** |
| `evolve/holdout-B-ch-t20-w29-mulowg.json` | CH B **27/50** |
| `evolve/holdout-{A,B}-ch-t20-w28-mulow.json` | mulow peer |
| `evolve/holdout-{A,B}-ch-t20-w26-seqclimb.json` | seqclimb peer |
| `evolve/holdout-{A,B}-id-t20-w24-climbtax.json` | identity |
| `evolve/firstdiff-w30-mulowg-residual-holdout{A,B}.json` | freeze-id labels |
| `evolve/firstdiff-w30-mulowg-freezeid-sample.json` | 5-seat freeze-id sample |
| `evolve/firstdiff-mulowg-key-seeds.json` | W29 key convert/reverse |
| `evolve/fair-firstdiff.js` / CF hunt in scratch | tools |
| `policies/p_w29_ex_mulowg-{ai,search}.js` | base |
| `{SCRATCH}/w30/mulowg-residual.json` | machine census |
| `{SCRATCH}/w30/cf-convert-hunt.json` | CF results |
| `{SCRATCH}/w30/freeze-id-rates.json` | freeze-id rates |
| This note | **`evolve/NOTE-w30-mulowg-residual.md`** |

---

## 8. Decision

| | |
|--|--|
| Both-lose A+B under mulowg | **41** (21+20) |
| Freeze-identical both-lose | **26 (63.4%)** |
| Diverged-still both-lose | **15** |
| W29 banked | convert `20270774@0` · recover `20460262@1` · recover `20440315@1` · cost `20340585@0` |
| Closest new flip | **`20480207@0`** pair max-top CF WIN (`55`→`66`) |
| Secondary | `20290720@1` FL_shorter · `20310666@1`/`20390451@1` FL_volume |
| egpack | **0** omin≤2 CF → defer |
| Gold lever for convert | **combat pair max-top** (override mulowg min-top for pairs only) |
| **ONE W30 probe** | **`p_w30_ex_pairhi`** on mulowg base · hard max-top pair + BR strip |
| SoftN / promote | **FORBIDDEN / NO** |

---

*Analysis only. Identity files are v91 freeze self-play used as fair dual baseline. Do not implement, dual, or promote from this note alone unless a later implement wave is opened.*
