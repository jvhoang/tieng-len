# W31 — Holdout residual under `p_w30_ex_pairhi` (best A 29/50, B 27/50, sum **56**)

**Date:** 2026-07-14  
**Mode:** analysis only — **do not promote** · SoftN **FORBIDDEN** · W16 pass **FORBIDDEN** · ctrl2hi **FORBIDDEN**  
**Base / best package:** `p_w30_ex_pairhi` (**A 29 / B 27 / sum 56**)  
**Peers:** `p_w29_ex_mulowg` 28/27 sum55 · `p_w28_ex_mulow` 28/26 sum54 · identity 25/25  
**Freeze identity:** `evolve/holdout-{A,B}-id-t20-w24-climbtax.json`  
**Challenger holdout:** `evolve/holdout-{A,B}-ch-t20-w30-pairhi.json`  
**Residual firstdiff (pairhi vs v91, residual-L seeds × both seats):**  
- A: `evolve/firstdiff-w31-pairhi-residual-holdoutA.json` (42 games, nDiv=16, rate 0.38)  
- B: `evolve/firstdiff-w31-pairhi-residual-holdoutB.json` (42 games, nDiv=13, rate 0.31)  
**CF hunt:** `{SCRATCH}/w31/cf-convert-hunt.json`  
**Force-alt verify:** `{SCRATCH}/w31/force-alt-verify.json`  
**Scratch census:** `{SCRATCH}/w31/pairhi-residual.json`  
**Protocol:** fair dual · `MS=200 TRIALS=20 SOFT=0` · BOTH_SEATS on residual firstdiff · CF = force alt legal then freeze continuation

---

## 0. Headline

| Metric | A | B | A+B |
|--------|--:|--:|----:|
| pairhi wins | **29/50 (0.58)** | **27/50 (0.54)** | **56/100** |
| mulowg wins | 28 | 27 | 55 |
| mulow wins | 28 | 26 | 54 |
| identity wins | 25 | 25 | 50 |
| residual L (`liveWin=false`) | **21** | **23** | **44** |
| both-lose (pairhi L ∧ id L) | **20** | **20** | **40** |
| freeze-identical both-lose (no firstdiff vs v91 on loss seat) | **12** | **13** | **25** |
| freeze-identical rate of both-lose | **12/20 = 60.0%** | **13/20 = 65.0%** | **25/40 = 62.5%** |
| diverged-still-loss (both-lose) | **8** | **7** | **15** |
| freeze-identical residual L | **12/21 = 57.1%** | **13/23 = 56.5%** | **25/44 = 56.8%** |

### vs mulowg (W30 base)

| Seat | mulowg | pairhi | Role |
|------|:------:|:------:|------|
| `20480207@0` | L | **W** | pairhi convert confirmed (`55`→`66`) |
| `20270774@0` | W | **W** | seq mintop convert **kept** |
| `20460262@1` | W | **W** | reverse band kept |
| `20440315@1` | W | **W** | reverse band kept |
| `20340585@0` | L | L | re-entered residual under mulowg; still both-lose |

**Net:** A **+1** (28→29) via `20480207@0` only; B flat 27; sum **55→56**. SoftN dead. Ship bar still WR>0.70 — **no promote**.

### vs prior both-lose baselines

| Package | both-lose A+B | freeze-id both-lose | rate |
|---------|--------------:|--------------------:|-----:|
| seqclimb | 42 | 27 | 64.3% |
| mulow | 40 | 25 | 62.5% |
| mulowg | 41 | 26 | 63.4% |
| **pairhi** | **40** | **25** | **62.5%** |

**Read:** Pairhi removed exactly one freeze-id both-lose seat (`20480207@0`) with a type-split combat pair max-top. Absolute residual is still **~⅝ freeze-identical both-lose**. Remaining hole is dominated by **free-lead structure** (mega-seq burn, low-pair open vs volume multi), not by another combat pair mintop invert. Soft score tax without hard playSig change will dual-null. Absolute gains need **gated hard FREE playSig change with measured win convert** that leaves combat type-split banked:

- **keep** `20270774@0` seq min-top (mulowg)  
- **keep** `20480207@0` pair max-top (pairhi)

---

## 1. Both-lose seats A+B under pairhi

Both-lose = holdout `liveWin=false` **and** identity `liveWin=false` on the same `seed@seat`.  
Freeze-identical = residual firstdiff vs `v91` on the **loss seat** has `diverged=false`.

### 1a. Holdout A — 20 both-lose

#### Freeze-identical — 12 (skill-class focus)

| # | seed@seat | steps | notes (path / CF) |
|--:|-----------|------:|-------------------|
| 1 | **20300693@1** | 9 | unique multi `JH QS KS` — pool suit-only; CF only via **PASS** (forbidden) |
| 2 | 20390450@1 | 14 | long seq FL; no usable one-step convert in hunt |
| 3 | 20430342@1 | 17 | late FL shorter CF (pair→single) — midgame free-lead |
| 4 | **20290720@1** | 18 | ⭐ **FL_shorter CF:** mega **7-seq** → **5-seq WIN** |
| 5 | 20410396@1 | 19 | high seq climb; no usable CF |
| 6 | **20350558@1** | 19 | pair ladder; CF `33→22` (2-pair burn) / later FL volume — **not clean lever** |
| 7 | 20370504@0 | 20 | CF `TT→22` (2-burn) / FL shorter — reverse-risk |
| 8 | 20490180@1 | 20 | single war; CF `7H→9S` weak one-off |
| 9 | 20420369@0 | 22 | pair ladder then pass wall; no usable CF |
| 10 | **20310666@1** | 22 | ⭐ **FL_volume CF:** open `33` → **4-seq WIN** |
| 11 | 20470234@0 | 23 | ctrl2 CF only (forbidden family) |
| 12 | **20340585@0** | 21 | mulowg cost seat; CF maxtop `678→789` / pair `99→KK` — **anti type-split** (would fight seq mintop / pairhi band) |

**Buckets (A freeze-id):** SEQ/FL structure **~5** · PAIR ladder / multi **~3** · 2_BURN **~2** · UNIQUE_MULTI **1** · single war **1**  
**Delta vs mulowg freeze-id:** removed **`20480207@0`** only (pairhi convert).

#### Diverged-still-loss — 8 (path moved, win not)

| seed@seat | firstdiff freeze → pairhi |
|-----------|---------------------------|
| **20280747@1** | multi tax `TS JS QC KH` → `6S 7S 8H 9C` |
| 20330612@1 | FREE pair → single |
| 20380477@0 | FREE long-4 → pair |
| **20400423@1** | multi `TD JC QS` → `8S 9H TS` |
| 20440315@0 | FREE weak multi → trash (flweakmp; still doomed) |
| 20450288@1 | single `TC` → `8D` |
| **20460261@1** | multi tax 4-seq → lower 4-seq |
| 20500153@0 | FREE long-10 → 6-seq |

Multi-tax / FL **diverge∩L** seats are **not** closest-to-flip for W31 — lever already fired, outcome fixed.

### 1b. Holdout B — 20 both-lose

#### Freeze-identical — 13

| # | seed@seat | steps | CF note |
|--:|-----------|------:|---------|
| 1 | 20280748@1 | 23 | late FL single reorder |
| 2 | 20290721@0 | 23 | late FL pair→single |
| 3 | 20310667@0 | 17 | no usable CF |
| 4 | 20330613@1 | 16 | no usable CF |
| 5 | 20360532@1 | 21 | late FL volume (pair→3-seq) |
| 6 | **20380478@1** | 23 | early single climb CF; later FL volume / higher multi |
| 7 | **20390451@1** | 20 | ⭐ **FL_volume CF:** `33` → **triple 333** WIN |
| 8 | 20400424@1 | 19 | CF only PASS (forbidden) |
| 9 | 20410397@1 | 21 | late FL shorter |
| 10 | 20430343@1 | 22 | single climb / ctrl2 alts |
| 11 | 20440316@0 | 20 | no usable CF |
| 12 | 20450289@1 | 16 | no usable CF |
| 13 | 20470235@0 | 18 | late FL single |

#### Diverged-still-loss — 7

| seed@seat | firstdiff freeze → pairhi |
|-----------|---------------------------|
| 20260802@0 | FREE `3H 3C` → `4D` |
| 20270775@1 | FREE `3S` → `3C 3S` |
| 20300694@1 | single `QS` → `6S` |
| 20340586@0 | single `KD` → `9C` |
| 20350559@0 | FREE `3H` → `3C 3H` |
| **20420370@0** | seq `QC KC AS` → `9D TD JS` (multi reorder; still L) |
| 20480208@0 | FREE `3C 4C 5H` → `KC KH` |

**B converts vs mulowg:** none new (pairhi combat pair axis is A-only convert). Freeze-id B set **identical** to mulowg freeze-id B.

---

## 2. Freeze-identical vs diverged-still-loss rates

| Scope | freeze-id | diverged-still | rate freeze-id |
|-------|----------:|---------------:|---------------:|
| Both-lose A | 12 | 8 | **60.0%** |
| Both-lose B | 13 | 7 | **65.0%** |
| Both-lose A+B | **25** | **15** | **62.5%** |
| Residual L A | 12 | 9 | 57.1% |
| Residual L B | 13 | 10 | 56.5% |
| Residual L A+B | 25 | 19 | 56.8% |

**Residual firstdiff divergeRate (loss seeds × both seats):** A 16/42 ≈ 0.38 · B 13/42 ≈ 0.31.

**Sample freeze-id firstdiff (5 both-lose seats):**  
`20290720@1`, `20310666@1`, `20390451@1`, `20300693@1`, `20470234@0` all **identical on the loss seat** (loss-seat nDiv=0; pairhi first live = freeze). Confirms skill-class freeze path for CF hunting.

**Implication:** ~⅝ of both-lose is still freeze-identical skill/deal. SoftN dead. Need **hard FREE playSig** with CF win convert; combat type-split is already banked and must not be inverted.

---

## 3. Convert CF hunt (freeze-id both-lose × alt legal)

Method: follow freeze path; at each live decision try up to 8 alternate legals; continue with freeze `getAIMove`; record `liveWin`. Exclude **pass** and **ctrl2** from “usable” (forbidden levers).

| | count |
|--|------:|
| freeze-id both-lose seats hunted | **25** |
| seats with any convert (incl. pass/ctrl2) | 18 |
| usable converts (no pass/ctrl2) | **54** |
| seats with usable convert | **15** |
| **omin≤2 usable converts (egpack band)** | **0** |

### Usable convert class mass

| class | n | lever fit |
|-------|--:|----------|
| **FL_shorter** | **23** | mega-seq / multi free-lead refuse → shorter |
| **FL_volume** | **10** | pair open → longer multi / triple |
| maxtop_multi | 7 | combat higher multi/pair — **mostly reverse-risk** |
| other (single climb etc.) | 7 | weak one-offs |
| FL_other | 6 | late free single reorder |
| FL_higher_multi | 1 | free-lead higher multi |

### ⭐ Convert CF #1 — `20290720@1` (FREE mega-seq shorter)

| Field | Value |
|-------|--------|
| Outcome | both-lose, **freeze-identical**, 18 steps |
| Step0 FREE | handLen=13 · omin=13 |
| Freeze / pairhi play | **`3D 4D 5H 6C 7H 8D 9H`** (7-seq; IDENT) |
| Hand | `2C 6C 5H AD 8D 7S 7C 9D 7H 3D 6H 9H 4D` |
| Multi pool | many **L7** seqs + shorter 5/4/3 variants |
| **Convert CF** | force **`3D 4D 5H 6C 7S`** (or any 5-card 34567) at step0 → **`liveWin=true`** (15 steps) |
| Force-alt verify | confirmed WIN under freeze continuation |
| Secondary | none required |

**Key insight:** free-lead multi-always + length-desc sort prefers **mega 7-seq**, which over-sheds mid ranks and loses under freeze continuation. Cap / prefer **len ≤ 5** when a mega seq (≥6) and a shorter seq (3–5) both exist. **FREE-only** → cannot invert combat mulowg seq mintop or pairhi pair maxtop.

### ⭐ Convert CF #2 — `20310666@1` / `20390451@1` (FL volume)

| Seat | freeze open | alt WIN |
|------|-------------|---------|
| `20310666@1` | `3C 3S` | **4-seq** `3S4S5H6H` |
| `20390451@1` | `3H 3S` | **triple** `3H3D3S` |

**Key insight:** W14 deep low-pair force / multi-always open with low pair when volume multi (seq/triple) also legal. Converting requires **prefer volume multi over low pair** on FREE — **fights W14 bropair**, higher reverse surface than mega-seq cap. Rank as deferred after flshort5.

### Explicit non-converts / forbidden

| Seat / class | Why not W31 #1 |
|--------------|----------------|
| egpack omin≤2 | **0** usable CF on freeze-id residual set |
| ctrl2 (`20470234`, `20430343`, …) | W27 reverse mass |
| pass (`20300693` unique multi, `20400424`) | W16 forbidden |
| `20350558` / `20370504` `→22` | burns 2-pair — reverse fingerprint |
| `20340585@0` maxtop/suit | mulowg cost seat; **not type-split safe** vs seq mintop |
| Soft flshort history (`oa_flshort`, `p_w3_flshort2`) | DEV dual-null / soft only — need **hard BR strip** |

---

## 4. Type-split safety (banked combat)

| Banked convert | Axis | Must keep under W31 |
|----------------|------|---------------------|
| `20270774@0` | combat **seq** min-top (mulowg) | no residual-max / no mid multi invert / no FREE lever that rewrites combat |
| `20480207@0` | combat **pair** max-top (pairhi) | no re-enable min-top on pairs; pairhi gates stay |

**Orthogonal FREE lever is the only convert-proven residual axis that is type-split safe by construction.**

---

## 5. ONE convert-proven W31 probe on pairhi base

### ⭐ **`p_w31_ex_flshort5`** — FREE mega-seq length cap (hard prefer len ≤ 5)

| Field | Choice |
|-------|--------|
| **Base** | `p_w30_ex_pairhi` (copy → `p_w31_ex_flshort5-{ai,search}.js`) |
| **ONE axis** | Free-lead only: when non-expensive multi legals include a **seq with length ≥ 6** **and** at least one **seq with length ∈ [3,5]** (same low start preferred), **hard-pick** the best **len ≤ 5** seq (then lower top / suit / expertScore). BR cand **strip** mega seqs out of FREE pool when shorter seq exists. |
| **Convert hypothesis** | `20290720@1` step0: freeze/pairhi **7-seq** `3456789` → force **5-seq** `34567` → **win** (CF proven under freeze continuation). Combat paths untouched → `20270774` seq mintop + `20480207` pair maxtop kept. |
| **Why not flvol first** | convert-proven on 2 seats but **overrides W14 bropair** low-pair force; larger reverse surface |
| **Why not SoftN / W16 pass / ctrl2hi** | Forbidden |
| **Why not residual-max / combat maxtop seq** | anti-convert on 20270774; reopens 20340585 noise |
| **Why not soft score “prefer short multi”** | `oa_flshort` / `p_w3_flshort2` history dual-null on fair dual — expert soft bonus never moves BR root when mega-seq is first after length sort |
| **Why hard strip (not soft)** | BR free-lead sorts `b.length - a.length` (longer first); expert multi-always returns long multiPick. Without strip, playSig stays 7-seq |

### 5.1 Gates (exact)

Fire only when **all** hold:

1. `!cur` (FREE lead only).  
2. `handLen ∈ [11, 13]` (deep open — convert seat 13).  
3. `omin ≥ 6` (not late race; convert 13).  
4. Build `seqs =` non-expensive multi legals with `detectCombo.type === 'seq'` (not doubleseq unless you explicitly want; **default: pure seq only**).  
5. `mega = seqs.filter(p => p.length >= 6)`; `short = seqs.filter(p => p.length >= 3 && p.length <= 5)`.  
6. Require `mega.length ≥ 1` **and** `short.length ≥ 1`.  
7. Prefer short with **lowest top** among len∈[3,5], then longer among short (prefer 5 over 3 if tops equal/near), then expertScore.  
8. **Go-out exception:** if any legal play empties hand, play it (never block go-out).  
9. Always play if legal — **never pass** on free lead.  
10. **Do not** fire on combat (`cur` truthy). **Do not** touch pairs/triples selection.

Optional tight gate (if dual thrash): only when `maxSeqLen >= 7` (convert seat is 7; leaves 6-card alone). Prefer **≥6** first for mass, kill if B reverse.

### 5.2 Exact locus (triple mirror)

Base file: `policies/p_w30_ex_pairhi-search.js`

| Site | ~Lines | Change |
|------|-------:|--------|
| 1. `pickFreeLeadHard` multi pool | ~803–825 | before `return multiPick`, if flshort5 gates: return best short seq |
| 2. `expertPolicy` FREE branch | ~470+ / freeLead path | same helper before multi-always return |
| 3. `bestResponseMove` FREE cand | ~1155–1179 after merge/sort, and after W14/W17/W25 FL forces | if flshort5 gates on current `leg`: **strip** `leg` to short-seq pool (or re-rank mega last / remove len≥6 seq when short exists) |

**Shared helper (sketch):**

```js
function pickFlShort5(hand, leg, state, cp) {
  if (state.currentCombo) return null; // FREE only
  var handLen = hand.length;
  var omin = oppMinHand(state, cp);
  if (handLen < 11 || handLen > 13 || omin < 6) return null;

  var i, p, com, mega = [], short = [];
  for (i = 0; i < leg.length; i++) {
    p = leg[i];
    if (!p || p.length < 3 || playIsExpensive(p)) continue;
    if (p.length === handLen) return p; // go-out
    com = detectCombo(p);
    if (!com || com.type !== 'seq') continue;
    if (p.length >= 6) mega.push(p);
    else if (p.length >= 3 && p.length <= 5) short.push(p);
  }
  if (!mega.length || !short.length) return null;

  short.sort(function (a, b) {
    var ta = topRank(a), tb = topRank(b);
    if (ta !== tb) return ta - tb;          // lower top first
    if (a.length !== b.length) return b.length - a.length; // prefer 5 over 3
    return expertScore(a, state, cp) - expertScore(b, state, cp);
  });
  return short[0];
}
```

**bestResponseMove insert (FREE, after existing FL forces, before combat):**

```js
var fs = pickFlShort5(hand, leg, state, myIdx);
if (fs) {
  // strip to short seqs only (keep suit variants of winning band)
  var shortPool = [];
  for (/* leg */) {
    if (seq && len 3..5 && !expensive) shortPool.push(...);
  }
  if (shortPool.length) leg = shortPool;
}
```

Order relative to W14 bropair / W17 trash / W25 flweakmp:

- If **W14 low-pair force already replaced `leg` with pairs only**, flshort5 no-ops (no mega seq in pool) — **safe**.  
- Convert seat `20290720` is **not** pair-forced (opens 7-seq).  
- Do **not** place flshort5 *before* go-out scan.

### 5.3 Anti-reverse for holdout B

| Rule | Why |
|------|-----|
| **FREE only** | combat type-split (`20270774` mintop + `20480207` maxtop) untouched |
| pure **seq** only (not doubleseq / not pairs) | avoid fighting pairhi / bropair |
| require mega **and** short both legal | dual-null when only mega exists; no invented plays |
| handLen 11–13 · omin ≥ 6 | late free-lead thrash out |
| go-out exception | never throw away win |
| no SoftN / pass / ctrl2 | forbidden |
| reject if firstdiff only combat | wrong residual class for this probe |
| reject if holdout B Δ ≤ −1 vs pairhi | anti-reverse bar |
| reject if `20270774@0` or `20480207@0` or `20460262@1` lost | must keep banked wins |

**B success target:** holdout B ≥ **27** (no regression) · A ≥ **29** preferred **≥30** if `20290720@1` converts live.

### 5.4 Deferred ranking (not W31 ONE)

| Rank | Tag (if later) | When to reopen |
|-----:|----------------|----------------|
| 2 | `p_w31_ex_flvol` FREE volume multi over low pair | After flshort5; CF `20310666@1` / `20390451@1` — gate to not reverse W14 |
| 3 | `p_w31_ex_egpack` omin≤2 package | Only if new CF appears with omin≤2 convert (currently **0**) |
| — | ctrl2 / pass / SoftN / residual-max seq / pair mintop reheat | **never** this wave |
| — | combat maxtop on `20340585` | anti type-split / mulowg cost seat |

### Convert hypothesis (one paragraph)

Under pairhi, freeze-identical both-lose is still **62.5%**. Pair max-top converted `20480207@0` and kept seq mintop `20270774@0`, but the residual freeze-id mass is now **FREE structure**. On freeze-id seat `20290720@1`, multi-always + length-desc BR plays a **7-card seq** and loses; forcing the alternate legal **5-card seq** wins under freeze continuation — a clean free-lead convert orthogonal to combat type-split and not SoftN/pass/ctrl2. Soft flshort history dual-nulled; the lever must be a **hard BR/expert strip**. FL_volume pair→multi also converts (`20310666`, `20390451`) but collides with W14 bropair and is deferred. **`p_w31_ex_flshort5`** is the smallest convert-proven lever on pairhi base: FREE mega-seq cap to len≤5 with BR strip, leaving mulowg seq mintop and pairhi pair maxtop intact.

### Probe anti-patterns

1. Do **not** SoftN / W16 pass / ctrl2hi reheat.  
2. Do **not** residual-max / mulow_rg on combat seq (kills 20270774).  
3. Do **not** re-min-top pairs (kills 20480207).  
4. Do **not** expert-only short-multi bonus without BR strip (oa_flshort dual-null).  
5. Do **not** stack flshort5 + flvol + egpack in one probe.  
6. Do **not** force 22 / 2-pairs / pass on unique multi.  
7. Do **not** apply length cap in combat answers.

---

## 6. Eval ladder (when implementing)

```text
1. firstdiff vs p_w30_ex_pairhi
   - require nDiv>0 FREE shorter multi on 20290720@1 (7seq → 5seq class)
   - require 20270774@0 IDENT or still low multi 345 (seq mintop preserved)
   - require 20480207@0 IDENT or still max-top pair 66 (pairhi preserved)
   - require 20460262@1 / 20440315@1 still W path (no reverse reheat)
2. playout-trace / force-alt: 20290720@1 liveWin true under flshort5
3. gold unit: no SoftN/pass; no 2-over-loose
4. DEV T20 ≥ pairhi (34) − 1 tolerance; Δid ≥ 0
5. DEV_VAL Δ ≥ 0 vs pairhi
6. holdout A/B only after VAL — no promote from this note
   success: A ≥ 29 (stretch 30) and B ≥ 27
```

### Probe kill criteria

- nDiv=0 vs pairhi (dual-null)  
- 20270774 convert lost  
- 20480207 convert lost  
- 20460262 / 20440315 reverse reheat  
- holdout B ≤ −1 vs pairhi without A gain  
- firstdiff only combat noise  
- any SoftN / pass / ctrl2hi slip  

---

## 7. Artifacts

| Path | Role |
|------|------|
| `evolve/holdout-A-ch-t20-w30-pairhi.json` | CH A **29/50** |
| `evolve/holdout-B-ch-t20-w30-pairhi.json` | CH B **27/50** |
| `evolve/holdout-{A,B}-ch-t20-w29-mulowg.json` | mulowg peer |
| `evolve/holdout-{A,B}-id-t20-w24-climbtax.json` | identity |
| `evolve/firstdiff-w31-pairhi-residual-holdout{A,B}.json` | freeze-id labels |
| `evolve/firstdiff-pairhi-key-seeds.json` | W30 key convert seats |
| `evolve/fair-firstdiff.js` / CF hunt in scratch | tools |
| `policies/p_w30_ex_pairhi-{ai,search}.js` | base |
| `{SCRATCH}/w31/pairhi-residual.json` | machine census |
| `{SCRATCH}/w31/cf-convert-hunt.json` | CF results |
| `{SCRATCH}/w31/force-alt-verify.json` | force-alt on star seats |
| `{SCRATCH}/w31/freeze-id-rates.json` | freeze-id rates |
| This note | **`evolve/NOTE-w31-pairhi-residual.md`** |

---

## 8. Decision

| | |
|--|--|
| Both-lose A+B under pairhi | **40** (20+20) |
| Freeze-identical both-lose | **25 (62.5%)** |
| Diverged-still both-lose | **15** |
| W30 banked | convert `20480207@0` · keep `20270774@0` · keep `20460262@1` / `20440315@1` |
| Closest new flip | **`20290720@1`** FREE mega-seq shorter CF WIN (`7-seq`→`5-seq`) |
| Secondary | `20310666@1` / `20390451@1` FL_volume (deferred — W14 clash) |
| egpack | **0** omin≤2 CF → still defer |
| Gold lever for convert | **FREE mega-seq length cap (flshort5)** |
| **ONE W31 probe** | **`p_w31_ex_flshort5`** on pairhi base · hard FREE seq len≤5 + BR strip |
| Type-split | **keep** seq mintop + pair maxtop |
| SoftN / promote | **FORBIDDEN / NO** |

---

*Analysis only. Identity files are v91 freeze self-play used as fair dual baseline. Do not implement, dual, or promote from this note alone unless a later implement wave is opened.*
