# W27 — Holdout A+B residual losses (`p_w26_ex_seqclimb` best 27/27)

**Date:** 2026-07-14  
**Mode:** analysis only — **do not promote** · SoftN **FORBIDDEN** · W16 pass **FORBIDDEN** · BR multionly **FORBIDDEN**  
**Package:** `p_w26_ex_seqclimb` (stack = climbtax@Q singles + multi climb tax + flweakmp FL weak-mp + W17 brfltrash)  
**Identity baseline:** `evolve/holdout-{A,B}-id-t20-w24-climbtax.json` (v91 self-play 25/50 each)  
**Challenger:** `evolve/holdout-{A,B}-ch-t20-w26-seqclimb.json` (**27/50 + 27/50**)  
**Prior package:** `p_w25_ex_flweakmp` holdout **27/26**  
**Firstdiff residual:**  
- A: `evolve/firstdiff-w27-seqclimb-residual-holdoutA.json` (23 loss seeds × both seats)  
- B: `evolve/firstdiff-w27-seqclimb-residual-holdoutB.json`  
**Scratch:** `/var/folders/…/implementer/w27/holdout-AB-residual.json`  
**Protocol:** fair dual · `MS=200 TRIALS=20 SOFT=0` · BOTH_SEATS on residual firstdiff

---

## 0. Headline

| Metric | A | B | A+B |
|--------|--:|--:|----:|
| seqclimb wins | **27/50 (0.54)** | **27/50 (0.54)** | **54/100** |
| identity wins | 25/50 | 25/50 | 50/100 |
| flweakmp wins | 27/50 | 26/50 | 53/100 |
| residual L (liveWin=false) | **23** | **23** | **46** |
| both-lose (seq L ∧ id L) | **22** | **20** | **42** |
| freeze-identical L (no firstdiff vs v91 on loss seat) | **14** | **13** | **27** |
| freeze-identical rate of residual L | **14/23 = 60.9%** | **13/23 = 56.5%** | **27/46 = 58.7%** |
| freeze-identical rate of both-lose | **14/22 = 63.6%** | **13/20 = 65.0%** | **27/42 = 64.3%** |
| diverged-still-loss | **8** | **7** | **15** |
| new-loss (id W, seq L) | **1** | **3** | **4** |
| win flips vs identity | **3** | **5** | **8** |
| outcome flips vs flweakmp | **0** | **+1** (`20500154@0`) | **+1 net** |
| residual firstdiff divergeRate (both seats of loss seeds) | **15/46 ≈ 0.33** | **12/42 ≈ 0.29** | — |

### Freeze-identical rate **vs flweakmp** (same protocol, holdout A residual)

| Package | freeze-identical residual L | rate | residual firstdiff nDiv (loss seeds × 2) |
|---------|----------------------------:|-----:|------------------------------------------:|
| flweakmp (W26 census) | **16 / 23** | **69.6%** | 14/46 ≈ 0.30 |
| **seqclimb (this census)** | **14 / 23** | **60.9%** | 15/46 ≈ 0.33 |
| Δ | **−2 seats** | **−8.7 pp** | +1 path |

**Read:** seqclimb **moved ~2 freeze-identical residual seats into diverged-still** on A (multi tax firstdiffs) but **converted zero A outcomes** vs flweakmp (A is **byte-identical 27 seats** to flweakmp). B gains the only holdout flip (`20500154@0`). Soft multi tax is in **diverge-without-convert** plateau on residual mass. Primary remaining hole is still **~59–64% freeze-identical** both-lose paths — now dominated by **unique multi** / mid structure / FL, not “climbtax never saw seq.”

---

## 1. Both-lose seats under seqclimb

Both-lose = `liveWin=false` **and** identity `liveWin=false` on the same seed@seat.  
Classification = firstdiff **loss seat** vs freeze `v91` (not step equality).

### 1a. Holdout A — **22 both-lose**

#### Freeze-identical — **14 seats**

| # | seed | seat | steps | failure mode (freeze-path class) |
|--:|------|-----:|------:|----------------------------------|
| 1 | 20270774 | 0 | 23 | deal control deficit; **2H on Ace** mid |
| 2 | 20290720 | 1 | 18 | long seq FL then stranded pair |
| 3 | **20300693** | **1** | **9** | **`JH QS KS` unique multi climb** — **still freeze-identical** |
| 4 | 20310666 | 1 | 22 | deep over-pass then late 2 burn |
| 5 | 20340585 | 0 | 21 | low-seq answer then KKK lead |
| 6 | 20350558 | 1 | 19 | **early 22** on high pair |
| 7 | 20370504 | 0 | 20 | 22 reclaim then JH QS KS free lead |
| 8 | 20390450 | 1 | 14 | long seq FL; **QD KH AD** climb |
| 9 | 20410396 | 1 | 19 | **high seq climb** `9H TS JS QD` |
| 10 | 20420369 | 0 | 22 | pair ladder then pass wall |
| 11 | 20430342 | 1 | 17 | **mega seq burn** 6-card 789TJQ |
| 12 | 20470234 | 0 | 23 | **high seq** `JD QC KS AD` |
| 13 | 20480207 | 0 | 21 | single ladder TD→QS→**2D** |
| 14 | 20490180 | 1 | 20 | AC climb then 2D |

**Buckets (A freeze-id):** SEQ_CLIMB_STILL **7** · 2_BURN/tempo **5** · OVERPASS **1** · PAIR_LADDER **1**

#### Diverged-still-loss — **8 seats**

| # | seed | seat | steps | firstdiff (freeze → seqclimb) |
|--:|------|-----:|------:|-------------------------------|
| 1 | **20280747** | **1** | 10 | step6 **seq** `TS JS QC KH` → `6S 7S 8H 9C` (**multi tax hit**) |
| 2 | 20330612 | 1 | 24 | step6 FREE `KH KC` → `5S` (FL stack) |
| 3 | 20380477 | 0 | 18 | step0 FREE long-4 → pair (FL) |
| 4 | **20400423** | **1** | 23 | step1 **seq** `TD JC QS` → `8S 9H TS` (**multi tax**) |
| 5 | 20440315 | 0 | 10 | step0 FREE weak multi → trash single (flweakmp target; still doomed) |
| 6 | 20450288 | 1 | 25 | step1 single `TC` → `8D` |
| 7 | **20460261** | **1** | 19 | step1 **seq** `TS JC QS KD` → `8S 9D TS JC` (**multi tax**) |
| 8 | 20500153 | 0 | 16 | step0 FREE long-10 → 6-seq |

**Seqclimb multi-tax residual hits that still L:** `20280747@1`, `20400423@1`, `20460261@1` — path fixed, win not.

#### New-loss — **1 seat**

| seed | seat | firstdiff |
|------|-----:|-----------|
| 20320639 | 0 | step0 FREE `3S` → `3D 3S` (same reverse class as flweakmp) |

#### Win flips vs identity (context, not residual)

| seed | seat | seq steps | id steps | also fl W? |
|------|-----:|----------:|---------:|:----------:|
| 20260801 | 0 | 13 | 22 | yes |
| 20320639 | 1 | 20 | 23 | yes |
| 20360531 | 1 | 18 | 21 | yes |

**A vs flweakmp:** **0** seat outcome flips (seq ≡ fl on all 50).

---

### 1b. Holdout B — **20 both-lose**

#### Freeze-identical — **13 seats**

| # | seed | seat | steps |
|--:|------|-----:|------:|
| 1 | 20280748 | 1 | 23 |
| 2 | 20290721 | 0 | 23 |
| 3 | 20310667 | 0 | 17 |
| 4 | 20330613 | 1 | 16 |
| 5 | 20360532 | 1 | 21 |
| 6 | 20380478 | 1 | 23 |
| 7 | 20390451 | 1 | 20 |
| 8 | 20400424 | 1 | 19 |
| 9 | 20410397 | 1 | 21 |
| 10 | 20430343 | 1 | 22 |
| 11 | 20440316 | 0 | 20 |
| 12 | 20450289 | 1 | 16 |
| 13 | 20470235 | 0 | 18 |

(B freeze-id not fully playlog-traced this wave; step mix mid/long — same skill/deal class as A.)

#### Diverged-still-loss — **7 seats**

| # | seed | seat | steps | firstdiff |
|--:|------|-----:|------:|-----------|
| 1 | 20260802 | 0 | 17 | FREE `3H 3C` → `4D` |
| 2 | 20270775 | 1 | 20 | FREE `3S` → `3C 3S` |
| 3 | **20300694** | **1** | 22 | single `QS` → `6S` (singles tax family) |
| 4 | 20340586 | 0 | 18 | single `KD` → `9C` |
| 5 | 20350559 | 0 | 18 | FREE `3H` → `3C 3H` |
| 6 | **20420370** | **0** | 15 | **seq** `QC KC AS` → `9D TD JS` (**multi tax**) |
| 7 | 20480208 | 0 | 21 | FREE `3C 4C 5H` → `KC KH` |

#### New-loss — **3 seats**

| seed | seat | steps | note |
|------|-----:|------:|------|
| 20320640 | 1 | 19 | id W; combat diverge `5D`→`8S` |
| 20400424 | 0 | 24 | id W; FREE `7D 7H`→`JH` |
| 20470235 | 1 | 19 | id W; FREE pair→single |

#### Win flips vs identity (B)

| seed | seat | fl W? | note |
|------|-----:|:-----:|------|
| 20320640 | 0 | yes | |
| 20370505 | 1 | yes | |
| 20460262 | 0 | yes | |
| 20490181 | 0 | yes | |
| **20500154** | **0** | **no** | **only seqclimb-vs-flweakmp holdout flip** |

---

## 2. Freeze-identical vs flweakmp (path + outcome)

### 2a. Outcome identity

```
Holdout A: seqclimb ≡ flweakmp on all 50 seats (27 W / 23 L)
Holdout B: +1 only  (20500154@0  fl L → seq W); 0 reverse
```

### 2b. Path identity on flweakmp’s freeze-identical residual mass

Prior W26 firstdiff `seqclimb` vs `flweakmp` on the **16 A freeze-identical seeds × both seats** (`firstdiff-seqclimb-vs-flweakmp-holdout-identical.json`):

| | |
|--|--:|
| nGames | 32 |
| nDiverged | **4** |
| divergeRate | **0.125** |
| path-identical | **28/32 = 87.5%** |

Diverged paths (vs flweakmp, not vs v91):

| seed@seat | freeze(fl) → chall(seq) | holdout outcome |
|-----------|-------------------------|-----------------|
| 20280747@1 | high seq → low seq | still **L** |
| 20300693@0 | `AS AD` → `7C 7S` | **W** (was already W) |
| 20300693@1 | `QS` → `JH` | still **L** |
| 20490180@0 | `QH` → `KD` | **W** (was already W) |

**Caveat:** firstdiff freeze-tag changes opponent `injectOpp` leaf, so flweakmp-as-freeze paths ≠ v91-as-freeze paths. Authoritative residual class is **vs v91** (§1).

### 2c. Seats that left freeze-identical under seqclimb (A vs v91)

flweakmp freeze-id **16** → seqclimb freeze-id **14**. Newly diverged residual L:

| seed@seat | freeze → seqclimb | still L? |
|-----------|-------------------|:--------:|
| 20280747@1 | `TS JS QC KH` → `6S 7S 8H 9C` | **yes** |
| 20460261@1 | `TS JC QS KD` → `8S 9D TS JC` | **yes** |

Soft multi tax **works as a firstdiff lever** and **fails as a win lever** on residual.

---

## 3. Did `20300693` flip? What still loses after seqclimb diverge?

### 3a. `20300693` — **NO flip**

| seat | id | flweakmp | seqclimb | firstdiff seq vs v91 |
|-----:|:--:|:--------:|:--------:|:---------------------|
| 0 | **W** (9) | **W** (9) | **W** (9) | **identical** |
| 1 | **L** (9) | **L** (9) | **L** (9) | **identical (freeze-identical residual)** |

- Anchor seat **`20300693@1` still loses** under best package.  
- Still **freeze-identical** vs v91 — multi tax **never creates a root playSig change** on the freeze path.  
- Design prediction confirmed (`NOTE-w26-seqclimb` §6A): when **only one** same-type multi is legal (`JH QS KS`), score tax is **dual-null at root**; later PASS on 777/888 remains **legally forced** after J-set peel.  
- Side firstdiff vs flweakmp (`QS`→`JH` singles) is an **alternate freeze-tag path** — does **not** transfer to the v91 residual path.

### 3b. What still loses **after** seqclimb multi/combat diverge (residual L)

These loss seats **do** firstdiff vs v91 under seqclimb (path moved) but remain L:

**A combat multi-tax class (the W26 target):**

| seed@seat | freeze → chall | read |
|-----------|----------------|------|
| 20280747@1 | high 4-seq → low 4-seq | tax fired; short collapse still L |
| 20400423@1 | `TD JC QS` → `8S 9H TS` | tax fired; long mid still L |
| 20460261@1 | 4-seq to KD → lower 4-seq | tax fired; still L |

**A other diverged-still (pre-existing flweakmp/FL stack):**  
`20330612@1`, `20380477@0`, `20440315@0`, `20450288@1`, `20500153@0`

**B multi/combat diverge still L:**

| seed@seat | freeze → chall |
|-----------|----------------|
| 20300694@1 | `QS` → `6S` (singles) |
| 20340586@0 | `KD` → `9C` |
| 20420370@0 | `QC KC AS` → `9D TD JS` (**multi tax**) |

**Implication:** further **soft-score climb tax retunes** are low EV — residual multi-tax seats already diverge and still lose; unique-multi freeze-id seats never diverge. Need a **different axis** (2-control triple-mirror, expensive-climb reclass when alts exist, or hard loose filter) — **not** SoftN / pass-unique / BR multionly.

---

## 4. Top 3 W27 lever targets for +1…+3 holdout

Constraints: **not SoftN**, **not W16 pass-unique**, **not dual-null BR multionly**. Base = `p_w26_ex_seqclimb`.

### Rank 1 ⭐ — **CTRL2HI** (single-2 for control on high smash) · tag `p_w27_ex_ctrl2hi`

| | |
|--|--|
| **Class** | `expertPolicy` + `enforcePolicyGuards` + `bestResponseMove` cand reinject — **one predicate, three mirrors** |
| **Hole** | Cheap path treats K/A-from-pair as cheap; Ace+2 only covers `curTop≥11`; probe-TWO only `omin≤3`; W25 smash2 was **expert-only + allBrk@8 → dual-null** |
| **Hits** | Gold 0513/0525/0544 (K/A pair-break → 2); residual mid single wars on both-lose long games; orthogonal to seqclimb multi arm |
| **Why #1** | Only residual-adjacent lever with a **proven anti-null architecture** (BR reinject + guards). Seqclimb soft multi already plateaued (diverge∩¬convert). |
| **Not** | pass · SoftN · mintop · multionly · smash2 clone · save-2 PASS family |
| **Expected Δ** | **+1…+3** holdout if combat firstdiff real; DEV_VAL gate mandatory |
| **Spec** | `evolve/NOTE-w27-2budget.md` (canonical) |

### Rank 2 — **CLIMBX / expensive multi-climb reclass** · tag `p_w27_ex_climbx`

| | |
|--|--|
| **Class** | `playIsExpensive` / `cheapLegals` combat: multi with `multiBurnsHighResidual` over `curTop≤6` counts **expensive** (like 2/bomb) |
| **Hole** | Soft tax dual-null when unique multi is the only same-type cand; root playSig stuck on `JH QS KS` class (`20300693@1` still freeze-id) |
| **Hits freeze-id** | 20300693, 20410396, 20430342, 20470234, 20390450, 20340585 — **only when a non-burn alt exists** (lower multi / single / other type) |
| **Why not #1** | If **only** burn multi is legal, still forced to play it (must not invent pass = W16). Many recon seats are unique-multi doomed. Higher reverse risk on gold 0503 residual-max. |
| **Not** | force PASS · SoftN · multionly strip |
| **Expected Δ** | **+0…+2** holdout; firstdiff should be `combat_*` / cheap-pool shape |

### Rank 3 — **LOOSEHARD** (hard cheap SBC filter) · tag `p_w27_ex_loosehard`

| | |
|--|--|
| **Class** | expert combat cheap path: if any single has `sbc<8`, hard-filter to loose-only set before `orderLegals` |
| **Hits** | pair-ladder / mid smash residual (`20420369`, long both-lose midgames); gold loose>smash mass |
| **Why not #1** | Soft sbc already large; hard filter historically soft-flat unless BR cand also moves; less specific than ctrl2hi’s gold+architecture story |
| **Expected Δ** | **+0…+2** |

### Explicitly rejected this wave

| Lever | Why |
|-------|-----|
| SoftN | Forbidden |
| W16 / W18 pass-unique / plan-pass | DEV_VAL reverse `20290634@0` |
| BR multionly / multi-contest root | dual-null (allowPass already false when multi legal) |
| Seqclimb retune / jclimb reheat | diverge-without-convert plateau; unique multi dual-null |
| flweakmp / BR FL trash retune | 20440315 already diverges, still L |
| W25 smash2 re-skin (expert-only allBrk) | proven dual-null |
| Save-2 prefer non-2 / PASS on 22 | opposite of gold 0513; pass family burned |

---

## 5. Rank ONE best W27 probe

### **`p_w27_ex_ctrl2hi`** ⭐

| Field | Choice |
|-------|--------|
| **Base** | `p_w26_ex_seqclimb` |
| **One axis** | Midgame **play lowest-suit single-2** when min cheap non-2 beat is **high structure-break** (K/A-class, `sbc≥12`, `rank≥10`), face `curTop∈[8,10]`, with retake plan |
| **Exact locus** (copy base → `p_w27_ex_ctrl2hi-{ai,search}.js`) | |
| | 1. **Helper** `pickCtrl2Hi` near `cheapLegals` / `structureBreakCost` (~L103–178) |
| | 2. **`expertPolicy`** after Ace+2 (~L458), **before** cheap short-circuit (~L487) |
| | 3. **`enforcePolicyGuards`** combat, **before** cheap-force veto (~Ace+2 pattern ~L855–875) |
| | 4. **`bestResponseMove`** combat cand: after `cheapLegals` strip (~L1153–1157), **reinject** single-2 when helper true |
| **Canonical design** | `evolve/NOTE-w27-2budget.md` |
| **Why best** | Seqclimb residual is **soft-tax plateau + unique-multi dual-null**; next +1…+3 needs a lever that (a) firstdiffs combat, (b) cannot be stripped by cheap/guards, (c) is not pass. Triple-mirror 2-control is the only design that satisfies all three on this base. |
| **Why not climbx first** | 20300693-class unique multi cannot be fixed without pass; climbx only helps multi-**alts** seats — subset already partially moved by seqclimb with 0 converts. |
| **Eval ladder** | firstdiff vs seqclimb (expect combat_2 / pair-smash skip; **fail if nDiv=0**) → DEV ≥34 Δid≥0 → DEV_VAL Δ≥+2 → holdout A/B |
| **Ship bar** | unchanged (both holdouts WR>0.70 + Δid≥+2) — **not promoting** |

### Probe anti-patterns

1. Do **not** expert-only (smash2 null).  
2. Do **not** force PASS / empty-leg when multi legal (W16).  
3. Do **not** SoftN / mintop hard rekey / multionly.  
4. Do **not** stack climbx + ctrl2hi + loosehard in one probe.

---

## 6. Artifacts

| Path | Role |
|------|------|
| `evolve/holdout-A-ch-t20-w26-seqclimb.json` | CH holdout A 27/50 |
| `evolve/holdout-B-ch-t20-w26-seqclimb.json` | CH holdout B 27/50 |
| `evolve/holdout-A-id-t20-w24-climbtax.json` | ID A 25/50 |
| `evolve/holdout-B-id-t20-w24-climbtax.json` | ID B 25/50 |
| `evolve/holdout-A-ch-t20-w25-flweakmp.json` | prior A 27 |
| `evolve/holdout-B-ch-t20-w25-flweakmp.json` | prior B 26 |
| `evolve/firstdiff-w27-seqclimb-residual-holdoutA.json` | residual firstdiff A vs v91 |
| `evolve/firstdiff-w27-seqclimb-residual-holdoutB.json` | residual firstdiff B vs v91 |
| `evolve/NOTE-w26-holdout-A-residual.md` | prior flweakmp residual |
| `evolve/NOTE-w26-seqclimb.md` | seqclimb design |
| `evolve/NOTE-fair-w26-results.md` | seqclimb gate results |
| `evolve/NOTE-w27-2budget.md` | ranked probe design |
| scratch `holdout-AB-residual.json` | machine-readable residual |

---

## 7. Decision (analysis only)

| | |
|--|--|
| Best holdout package | **`p_w26_ex_seqclimb` 27/27** (no ship; need ~35/50) |
| Residual L A+B | **46** |
| Freeze-identical A+B | **27 (58.7%)** — down from flweakmp A 69.6% |
| Diverged-still A+B | **15** |
| New-loss A+B | **4** |
| `20300693@1` | **still L, still freeze-identical** (unique multi dual-null) |
| Multi-tax diverge∩L | 20280747@1, 20400423@1, 20460261@1, 20420370@0, … |
| Top levers | (1) **ctrl2hi** (2) climb expensive reclass (3) loosehard |
| **ONE W27 probe** | **`p_w27_ex_ctrl2hi`** on seqclimb base |
| SoftN / promote | **FORBIDDEN / NO** |

---

*Identity files are v91 freeze self-play (25/50) used as freeze/identity fair dual baseline per protocol.*
