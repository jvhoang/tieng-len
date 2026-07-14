# W29 — Holdout residual under `p_w28_ex_mulow` (best A 28/50, B 26/50)

**Date:** 2026-07-14  
**Mode:** analysis only — **do not promote** · SoftN **FORBIDDEN** · W16 pass **FORBIDDEN** · dual-null ctrl2hi **FORBIDDEN**  
**Base / best holdout A:** `p_w28_ex_mulow` (**28/50**)  
**Best holdout B / sum-stable peer:** `p_w26_ex_seqclimb` (**27/27**, sum **54** = mulow 28+26)  
**Freeze identity:** `evolve/holdout-{A,B}-id-t20-w24-climbtax.json` (v91 self-play 25/50)  
**Challenger holdout:** `evolve/holdout-{A,B}-ch-t20-w28-mulow.json`  
**Residual firstdiff (mulow vs v91, residual-L seeds × both seats):**  
- A: `evolve/firstdiff-w29-mulow-residual-holdoutA.json` (42 games, nDiv=17, rate 0.40)  
- B: `evolve/firstdiff-w29-mulow-residual-holdoutB.json` (44 games, nDiv=15, rate 0.34)  
**Scratch:** `{SCRATCH}/w29/mulow-residual.json`  
**Protocol:** fair dual · `MS=200 TRIALS=20 SOFT=0` · BOTH_SEATS on residual firstdiff

---

## 0. Headline

| Metric | A | B | A+B |
|--------|--:|--:|----:|
| mulow wins | **28/50 (0.56)** | **26/50 (0.52)** | **54/100** |
| seqclimb wins | 27/50 | 27/50 | 54/100 |
| identity wins | 25/50 | 25/50 | 50/100 |
| residual L (`liveWin=false`) | **22** | **24** | **46** |
| both-lose (mulow L ∧ id L) | **20** | **20** | **40** |
| freeze-identical both-lose (no firstdiff vs v91 on loss seat) | **12** | **13** | **25** |
| freeze-identical rate of both-lose | **12/20 = 60%** | **13/20 = 65%** | **25/40 = 62.5%** |
| diverged-still-loss (both-lose) | **8** | **7** | **15** |
| freeze-identical residual L | **12/22 = 54.5%** | **13/24 = 54.2%** | **25/46 = 54.3%** |
| convert vs seqclimb | **+2** | **0** | **+2** |
| reverse vs seqclimb | **−1** | **−1** | **−2** |
| net vs seqclimb | **+1** | **−1** | **0** |

### vs seqclimb both-lose baseline (W27/W28)

| Package | both-lose A+B | freeze-id both-lose | rate |
|---------|--------------:|--------------------:|-----:|
| seqclimb | 42 (22+20) | 27 (14+13) | 64.3% |
| **mulow** | **40 (20+20)** | **25 (12+13)** | **62.5%** |
| Δ | **−2** (converted out of both-lose) | **−2** | −1.8 pp |

**Read:** Mulow **converted two freeze-identical skill seats on A** (`20270774@0`, `20340585@0`) out of both-lose, matching the design CF. Net holdout is **flat sum 54** because **two mintop mid-band reverses** (`20440315@1` A, `20460262@1` B) cancel the converts. Absolute remaining hole is still **~62% freeze-identical both-lose** — unique multi / pair ladder / 2-burn / FL, not “mulow never fired.” SoftN dead. Do **not** reheat residual-max (anti-convert on 20270774) or ctrl2hi (W27 reverse).

---

## 1. Both-lose seats A+B under mulow

Both-lose = holdout `liveWin=false` **and** identity `liveWin=false` on the same `seed@seat`.  
Freeze-identical = residual firstdiff vs `v91` on the **loss seat** has `diverged=false`.

### 1a. Holdout A — 20 both-lose

#### Freeze-identical — 12 (skill-class focus)

| # | seed@seat | steps | class (from W27/W28 freeze-path + still-L) |
|--:|-----------|------:|-------------------------------------------|
| 1 | **20300693@1** | 9 | unique multi `JH QS KS` — pool=1 dual-null for multi reorder |
| 2 | 20390450@1 | 14 | long seq FL; late high climb |
| 3 | 20430342@1 | 17 | mega seq burn |
| 4 | 20290720@1 | 18 | long seq FL → stranded pair |
| 5 | 20410396@1 | 19 | high seq climb |
| 6 | **20350558@1** | 19 | pair ladder + early 22 on AA; FREE residual multi (no one-step mintop convert) |
| 7 | 20370504@0 | 20 | 22 reclaim then high free multi |
| 8 | 20490180@1 | 20 | single war; 2s available |
| 9 | **20480207@0** | 21 | pair residual; mid **2-control CF convert** (ctrl2 family; reverse risk) |
| 10 | 20420369@0 | 22 | pair ladder then pass wall |
| 11 | 20310666@1 | 22 | deep over-pass |
| 12 | 20470234@0 | 23 | high seq; ctrl2 CF secondary |

**Buckets (A freeze-id):** SEQ/structure **~6** · 2_BURN/tempo **~4** · OVERPASS **1** · UNIQUE_MULTI **1**

#### Diverged-still-loss — 8 (path moved, win not)

| seed@seat | firstdiff freeze → mulow |
|-----------|--------------------------|
| **20280747@1** | multi tax `TS JS QC KH` → `6S 7S 8H 9C` (seqclimb stack; still L) |
| 20330612@1 | FREE pair → single (FL) |
| 20380477@0 | FREE long-4 → pair (FL) |
| **20400423@1** | multi `TD JC QS` → **`7S 8S 9H`** (mulow lower than seq’s `8S9HTS`; still L) |
| 20440315@0 | FREE weak multi → trash (flweakmp; still doomed) |
| 20450288@1 | single `TC` → `8D` |
| **20460261@1** | multi tax 4-seq → lower 4-seq |
| 20500153@0 | FREE long-10 → 6-seq |

Multi-tax / mulow **diverge∩L** seats are **not** closest-to-flip for W29 — lever already fired, outcome fixed.

#### Converted out of both-lose vs seqclimb (A)

| seed@seat | seq | mulow | firstdiff mulow vs seq |
|-----------|-----|-------|------------------------|
| **20270774@0** | L23 | **W16** | `8D 9D TD` → **`3C 4C 5D`** — **CF convert proven** |
| **20340585@0** | L21 | **W20** | `6S 7S 8D` → `6C 7S 8D` — **suit-only** (same top rank 5) |

#### Reverse vs seqclimb (A)

| seed@seat | seq | mulow | mechanism |
|-----------|-----|-------|-----------|
| **20440315@1** | **W12** | L21 | mintop mid multi: freeze `9S TC JH` → chall **`6D 7C 8H`** (minTop rank **5**); opp answers high seq → tempo death |

### 1b. Holdout B — 20 both-lose

#### Freeze-identical — 13

| # | seed@seat | steps |
|--:|-----------|------:|
| 1 | 20280748@1 | 23 |
| 2 | 20290721@0 | 23 |
| 3 | 20310667@0 | 17 |
| 4 | 20330613@1 | 16 |
| 5 | 20360532@1 | 21 |
| 6 | 20380478@1 | 23 |
| 7 | 20390451@1 | 20 |
| 8 | 20400424@1 | 19 |
| 9 | 20410397@1 | 21 |
| 10 | 20430343@1 | 22 |
| 11 | 20440316@0 | 20 |
| 12 | 20450289@1 | 16 |
| 13 | 20470235@0 | 18 |

Same skill buckets as A (multi-alt midgame, 2-burn, FL structure). No B seat left both-lose was converted by mulow.

#### Diverged-still-loss — 7

| seed@seat | firstdiff freeze → mulow |
|-----------|--------------------------|
| 20260802@0 | FREE `3H 3C` → `4D` |
| 20270775@1 | FREE `3S` → `3C 3S` |
| 20300694@1 | single `QS` → `6S` |
| 20340586@0 | single `KD` → `9C` |
| 20350559@0 | FREE `3H` → `3C 3H` |
| **20420370@0** | seq `QC KC AS` → **`6C 7D 8C`** (mulow min-top on high face answer; still L) |
| 20480208@0 | FREE `3C 4C 5H` → `KC KH` |

#### Reverse vs seqclimb (B) — **the B hole**

| seed@seat | seq | mulow | mechanism |
|-----------|-----|-------|-----------|
| **20460262@1** | **W18** | L17 | mintop mid multi: freeze `8H 9S TH` (or v91 `7S 8H 9S TH`) → chall **`5S 6D 7S`** / **`5S 6D 7S 8H`** (minTop rank **5**); opp `QC KH AC 2D` smash → PASS wall |

**B converts vs seqclimb:** **none.** Mulow’s only B outcome flip is this reverse.

---

## 2. Freezes-identical vs diverged-still-loss rates

| Scope | freeze-id | diverged-still | rate freeze-id |
|-------|----------:|---------------:|---------------:|
| Both-lose A | 12 | 8 | **60.0%** |
| Both-lose B | 13 | 7 | **65.0%** |
| Both-lose A+B | **25** | **15** | **62.5%** |
| Residual L A | 12 | 10 | 54.5% |
| Residual L B | 13 | 11 | 54.2% |
| Residual L A+B | 25 | 21 | 54.3% |

**Residual firstdiff divergeRate (loss seeds × both seats):** A 17/42 ≈ 0.40 · B 15/44 ≈ 0.34 — higher path motion than seqclimb residual census (0.33 / 0.29) because mulow adds min-top combat firstdiffs on multi-alt seats **including converts and reverses**.

**Implication:** ~⅝ of both-lose is still freeze-identical skill/deal. Soft score tax and mid mintop without band control produce **diverge∩¬convert** or **convert−reverse wash**. Absolute gains need **gated hard playSig change with measured win convert and blocked reverse band**.

---

## 3. Which reverse vs seqclimb hurt B (`20460262`) and A (`20440315`)

Both reverses are the **same lever shape as the convert**, wrong band:

| Seat | Role | Freeze multi | Mulow multi | minTop rank | maxTop rank | gap | Outcome |
|------|------|--------------|-------------|------------:|------------:|----:|---------|
| `20270774@0` | **CONVERT** | `8D 9D TD` | **`3C 4C 5D`** | **2** (5) | 7 (T) | **5** | L→**W** |
| `20460262@1` | **REVERSE B** | `8H 9S TH` | **`5S 6D 7S`** | **5** (8) | 7 (T) | **2** | W→**L** |
| `20440315@1` | **REVERSE A** | `9S TC JH` | **`6D 7C 8H`** | **5** (8) | 8 (J) | **3** | W→**L** |
| `20340585@0` | suit convert | `6S 7S 8D` | `6C 7S 8D` | 5 | 5 | 0 | L→W (fragile) |

### Shared loss mechanism (reverses)

1. Face is low (`curTop≤6`, often 345-class lead).  
2. Hand has **≥2** same-type multi answers + residual 2/control → mulow **hard-forces min-top**.  
3. Chosen multi tops at **7–8** (rank 4–5), not true low-face **3–5** (rank 0–2).  
4. Residual still has A/high material but **mid multi was the wrong package burn** → opp high-seq + 2 reclaim → live PASS → tempo death.  
5. Seqclimb / v91 keep **mid-high multi** (`89T` / `9TJ`) and **win** (playout-trace confirmed: seqclimb W on both reverse seats; L on convert seat).

### Why convert still correct on `20270774@0`

Min multi is true low **345** (top rank **2**); residual keeps `T/J/K/2` package. CF under freeze continuation = WIN (W28). Gap max−min tops = **5**.

### Gate separation (machine-checkable)

```text
gate_minTop <= 3  (top card <= 6):
  20270774  minTop=2  → FIRE convert
  20460262  minTop=5  → BLOCK reverse
  20440315  minTop=5  → BLOCK reverse
  20340585  minTop=5  → BLOCK (may drop suit-noise +1)

gate_gap >= 4:
  same separation on the three structural seats
```

---

## 4. ONE convert-proven W29 probe on mulow base

### ⭐ **`p_w29_ex_mulowg`** — gated min-top multi (low-band only)

| Field | Choice |
|-------|--------|
| **Base** | `p_w28_ex_mulow` (copy → `p_w29_ex_mulowg-{ai,search}.js`) |
| **ONE axis** | Keep mulow hard min-top same-type multi, but **fire only if** `topRank(minTopPick) ≤ 3` (top card ≤ **6**). Optional equivalent: `maxSameTypeTop − minSameTypeTop ≥ 4`. |
| **Convert hypothesis** | `20270774@0` still forced `3C4C5D` (minTop=2) → **keep convert**. `20460262@1` no longer forced mid `567(8)` → path ≡ seqclimb → **recover B win**. `20440315@1` no longer forced mid `678` → **recover A reverse**. |
| **Lift B without reverse A** | Expected **B 26→27**; A stays **≥28** (convert kept; reverse recovered; may lose suit-noise `20340585` and net A flat 28). |
| **Why not SoftN / W16 pass** | Forbidden |
| **Why not dual-null ctrl2hi** | W27 reverse mass; CF 2/6 only; user forbid |
| **Why not residual-max / mulow_rg** | resmax **anti-convert** on 20270774; residualBetter gate **`nDiv=0` kills convert** (`NOTE-w29-gold-endgame.md`) |
| **Why not broader mintop (curTop retune only)** | Reverses already have `curTop≤6`; band must constrain **chosen multi top**, not face |
| **Exact locus** | Same three mulow sites — add `topRank(pick) <= 3` **before** force return / BR strip: |
| | 1. `expertPolicy` pre-cheap mulow block (~L490–512) |
| | 2. `expertPolicy` cheap mulow mirror (~L517–539) |
| | 3. `bestResponseMove` combat min-top strip (~L1210–1240) — **must triple-mirror** or BR re-selects mid multi |
| **Expected firstdiff vs mulow** | combat_other on reverse seats only (chall ≡ seqclimb mid multi); **fail if 20270774 nDiv vs mulow** (must stay min-top low) |
| **Expected convert mass** | **+1 B** (20460262 recovery) · **+0…+1 A** net (reverse recover vs suit-noise loss) |
| **Honest null** | Unique multi `20300693@1` still dual-null; freeze-id 2-burn (`20480207`) still needs orthogonal lever (not this probe) |
| **Ship** | **NO promote** from this note |

### Convert hypothesis (one paragraph)

Mulow’s proven win convert is **true low multi** (top ≤6 / rank ≤3) that preserves high package + 2. The holdout reverse on B (`20460262@1`) and A (`20440315@1`) is the **same hard force applied to mid multi tops (7–8)**, which burns the package the convert was designed to keep and loses to opp high-seq+2. A one-line **minTop band gate** on the existing mulow expert+BR triple mirror is the smallest convert-proven change on mulow base: it **keeps the CF-proven fire on `20270774@0`**, **blocks reverse band**, and **lifts B without reverse A**. Not SoftN, not pass, not ctrl2hi, not residual-max.

### Probe anti-patterns

1. Do **not** residualBetter / residual-max gate that nulls 20270774.  
2. Do **not** SoftN / W16 pass / ctrl2hi reheat.  
3. Do **not** force PASS on unique multi.  
4. Do **not** only expert-gate without BR strip (omin1hi dual-null lesson).  
5. Do **not** stack mulowg + egpack + nest in one probe.

### Orthogonal note (not this residual’s #1)

`NOTE-w29-gold-endgame.md` ranks **`p_w29_ex_egpack`** (omin≤2 package BR strip) as orthogonal endgame mass. That is a valid **second-wave** axis if mulowg recovers B and residual freeze-id still needs non-multi convert. Residual census priority for B lift **without reverse A** is **mulowg first** (measured reverse locus + proven convert keep).

---

## 5. Eval ladder (when implementing)

```text
1. firstdiff vs p_w28_ex_mulow on SEEDS=20270774,20460262,20440315,20340585
   - require 20270774@0 IDENT or still low multi 345-class (convert preserved)
   - require 20460262@1 diverge back toward mid multi (or IDENT with seqclimb path)
2. playout-trace: 20270774@0 liveWin true; 20460262@1 liveWin true; 20440315@1 liveWin true
3. DEV T20 ≥ mulow (33) − 1 tolerance; Δid ≥ 0
4. DEV_VAL Δ ≥ 0 vs mulow
5. holdout A/B only after VAL — no promote from this note
   success: B ≥ 27 and A ≥ 28 (no reverse A vs mulow)
```

---

## 6. Artifacts

| Path | Role |
|------|------|
| `evolve/holdout-A-ch-t20-w28-mulow.json` | CH A **28/50** |
| `evolve/holdout-B-ch-t20-w28-mulow.json` | CH B **26/50** |
| `evolve/holdout-{A,B}-ch-t20-w26-seqclimb.json` | seqclimb 27/27 |
| `evolve/holdout-{A,B}-id-t20-w24-climbtax.json` | identity |
| `evolve/firstdiff-w29-mulow-residual-holdout{A,B}.json` | freeze-id labels |
| `evolve/firstdiff-w29-mulow-vs-seq-key.json` | convert/reverse seats |
| `evolve/firstdiff-mulow-vs-seq-reverses.json` | prior reverse firstdiff |
| `evolve/fair-firstdiff.js` / `fair-playout-trace-chall.js` | tools |
| `policies/p_w28_ex_mulow-{ai,search}.js` | base |
| `{SCRATCH}/w29/mulow-residual.json` | machine census |

---

## 7. Decision

| | |
|--|--|
| Both-lose A+B under mulow | **40** (20+20) |
| Freeze-identical both-lose | **25 (62.5%)** |
| Diverged-still both-lose | **15** |
| Convert vs seqclimb | A: `20270774@0`, `20340585@0` · B: none |
| Reverse vs seqclimb | A: **`20440315@1`** · B: **`20460262@1`** — both **mintop mid-band** (minTop rank 5) |
| Closest B lift | **Block reverse `20460262@1`** while keeping convert `20270774@0` |
| Gold lever | **min-top multi family — low-band gate only** (not residual-max; not ctrl2; not SoftN) |
| **ONE W29 probe** | **`p_w29_ex_mulowg`** on mulow base · `minTopRank ≤ 3` before force |
| SoftN / promote | **FORBIDDEN / NO** |

---

*Analysis only. Identity files are v91 freeze self-play used as fair dual baseline.*
