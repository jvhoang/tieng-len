# W26 — Holdout A residual losses (`p_w25_ex_flweakmp` vs freeze/identity)

**Date:** 2026-07-14  
**Mode:** analysis only — **do not promote** · SoftN **FORBIDDEN** · W16 pass **FORBIDDEN**  
**Package:** `p_w25_ex_flweakmp` (stack = climbtax singles + flweakmp FL weak multiPower + W17 brfltrash)  
**Identity baseline:** `evolve/holdout-A-id-t20-w24-climbtax.json` (freeze ≡ identity; v91 self-play 25/50)  
**Challenger:** `evolve/holdout-A-ch-t20-w25-flweakmp.json` (**27/50 = 0.54**, Δ+2 vs identity)  
**Firstdiff residual census:** `evolve/firstdiff-w26-flweakmp-residual-holdoutA.json`  
**Scratch:** `/var/folders/…/implementer/w26/holdout-A-residual.json`  
**Protocol:** fair dual · `MS=200 TRIALS=20 SOFT=0` · BOTH_SEATS where noted

---

## 0. Headline

| Metric | Value |
|--------|------:|
| flweakmp holdout A | **27/50 (0.54)** |
| identity / freeze | **25/50 (0.50)** |
| residual losses (liveWin=false) | **23 seats** |
| freeze-identical losses (firstdiff no-diverge on loss seat) | **16 / 23 (70%)** |
| diverged-still-loss | **6 / 23 (26%)** |
| new-loss (id won, fl lost) | **1 / 23** (`20320639@0`) |
| win flips vs identity | **3** (`20260801@0`, `20320639@1`, `20360531@1`) |
| residual firstdiff divergeRate (23 seeds × 2 seats) | **14/46 ≈ 0.30** |

**Read:** flweakmp moved ~3 seats net (+3 win flips, −1 reverse) and raised both-lose firstdiff from brfltrash ~13% / climbtax ~22% to **~28–30%**. The residual mass is still **~70% freeze-identical** — almost all combat midgame / structure-burn paths that **singles-only climbtax never sees**.

---

## 1. All seats flweakmp still loses (holdout A)

23 loss seats (10× seat0, 13× seat1). Classification uses **firstdiff on the loss seat** vs freeze (`v91`), not step-count equality (step match can coincide after early diverge).

### 1a. Freeze-identical losses — **16 seats**

No live-seat firstdiff vs freeze; freeze also loses. Path is shared skill/deal under equal BR.

| # | seed | seat | steps | failure mode (freeze-path trace) |
|--:|------|-----:|------:|----------------------------------|
| 1 | 20270774 | 0 | 23 | deal control deficit; **2H on Ace** mid |
| 2 | 20280747 | 1 | 10 | short collapse; high single / high seq |
| 3 | 20290720 | 1 | 18 | long seq FL then stranded pair |
| 4 | **20300693** | **1** | **9** | **`JH QS KS` seq climb** then legal PASS on 777/888 |
| 5 | 20310666 | 1 | 22 | deep over-pass then late 2 burn |
| 6 | 20340585 | 0 | 21 | low-seq answer then KKK lead |
| 7 | 20350558 | 1 | 19 | **early 22** on high pair |
| 8 | 20370504 | 0 | 20 | 22 reclaim then **JH QS KS** free lead |
| 9 | 20390450 | 1 | 14 | long seq FL; **QD KH AD** climb |
| 10 | 20410396 | 1 | 19 | **high seq climb** `9H TS JS QD` |
| 11 | 20420369 | 0 | 22 | pair ladder then pass wall |
| 12 | 20430342 | 1 | 17 | **mega seq burn** 6-card 789TJQ |
| 13 | 20460261 | 1 | 17 | **high seq** `TS JC QS KD` then AAA |
| 14 | 20470234 | 0 | 23 | **high seq** `JD QC KS AD` |
| 15 | 20480207 | 0 | 21 | single ladder TD→QS→**2D** |
| 16 | 20490180 | 1 | 20 | AC climb then 2D |

**Step buckets:** short ≤12: **2** · mid 13–20: **8** · long ≥21: **6**  
**Dominant class:** high **seq multi climb** over low faces while residual 2s/control remain (**~8/16** clearly seq-climb addressable).

### 1b. Diverged-still-loss — **6 seats**

Firstdiff fires, holdout still L. flweakmp/climbtax moved the path but did not convert.

| # | seed | seat | flSteps | firstdiff | freeze → chall |
|--:|------|-----:|--------:|-----------|----------------|
| 1 | 20330612 | 1 | 24 | step6 FREE FL_other | `KH KC` → `5S` |
| 2 | 20380477 | 0 | 18 | step0 FREE FL_other | `3H 4D 5H 6H` → `3C 3H` |
| 3 | 20400423 | 1 | 11 | step9 single combat | `AS` → `9H` (omin=1) |
| 4 | 20440315 | 0 | 10 | step0 FREE FL_other | `3S 4C 5D` → `3S` (**flweakmp target**) |
| 5 | 20450288 | 1 | 25 | step1 single combat | `TC` → `8D` |
| 6 | 20500153 | 0 | 16 | step0 FREE FL_other | long-10 seq → 6-seq |

**Note:** `20440315@0` is the recon weak-multi seed flweakmp was built for — path now diverges (trash single) but still loses (**deal-doomed multi fortress**). Do **not** retune more BR-FL trash micros for this seat.

### 1c. New-loss (id won) — **1 seat**

| seed | seat | firstdiff |
|------|-----:|-----------|
| 20320639 | 0 | step0 FREE: freeze `3S` → chall `3D 3S` |

Offset by win on `20320639@1` (and net still +2 holdout). Reverse risk class for any FL multi-force expansion.

### 1d. Win flips vs identity (context)

| seed | seat | fl steps | id steps |
|------|-----:|---------:|---------:|
| 20260801 | 0 | 13 | 22 |
| 20320639 | 1 | 20 | 23 |
| 20360531 | 1 | 18 | 21 |

---

## 2. Freeze-identical vs diverged-still-loss (summary)

```
residual L = 23
├── freeze-identical-loss  16  (70%)  ← primary W26 mass
├── diverged-still-loss     6  (26%)  ← path moved, still L
└── new-loss (id won)       1  ( 4%)  ← reverse sample
```

| Comparison | freeze-identical of both-lose seats |
|------------|-------------------------------------:|
| brfltrash (W24 census) | **20/23 ≈ 87%** |
| flweakmp (this census) | **16/22 ≈ 73%** of both-lose |
| of all residual L | **16/23 ≈ 70%** |

**Architecture gap remaining:** climbtax is hard-gated  
`if (cur.type === 'single' && com.type === 'single')`  
so **seq / pair / triple high climbs never get the tax**. Recon anchor **`20300693@1` step1 `JH QS KS`** is still freeze-identical under flweakmp.

After that climb peels JH from JJJ, later PASSes on 777/888 are **legally forced** — multi-contest / pass levers cannot un-burn the structure. Need **earlier multi climb tax** (score reorder when lower multi alts exist), not W16 pass.

---

## 3. Top 3 lever targets for +1…+3 holdout wins

Constraints: **not SoftN**, **not W16 pass-unique**, prefer non-BR-FL-cand micro, stack on `p_w25_ex_flweakmp`.

### Rank 1 ⭐ — **SEQCLIMB_TAX** (multi + singles) · tag `p_w26_ex_seqclimb`

| | |
|--|--|
| **Class** | `expertScore` combat only (soft score; inherits via `orderLegals`) |
| **Hole** | Climbtax singles-only; jclimb multi arm is **dead** (nested under single∧single — see §4) |
| **Hits freeze-identical** | 20300693, 20410396, 20430342, 20460261, 20470234, 20390450, 20280747, 20340585 (~8 seats) |
| **Axis** | Tax seq/pair/triple with top≥Q over curTop≤6 when residual 2s/control/multi remain; peel/sbc burn gate (shield gold 0503) |
| **Not** | pass-unique · allowPass · mintop hard orderLegals · SoftN · flweakmp retune |
| **Risk** | Medium (score-only family matched climbtax DEV_VAL-safe); unique multi may keep root playSig — leaf still moves; do not “fix” with pass |
| **Spec** | `evolve/NOTE-w26-seqclimb.md` (canonical design) |
| **Expected Δ** | **+1…+3** holdout if multi alternatives exist on half the seq-climb seats |

### Rank 2 — **EARLY_2_BUDGET / smash-save** (expert combat, non-pass)

| | |
|--|--|
| **Class** | expertPolicy / expertScore 2-tempo: **save 2** when answering mid single/pair with residual multi; prefer cheap non-2 |
| **Hits** | 20270774 `2H` on Ace; 20350558 early 22; 20480207 `2D`; 20490180 `2D`; 20310666 late 2 |
| **Why not #1** | `p_w25_ex_smash2` was **DEV dual-null** vs climbtax; 2-save is related but must be **narrower** (only when non-2 legal beat exists + residual multi) |
| **Not** | W16 plan-pass · SoftN |
| **Expected Δ** | **+0…+2**; higher reverse risk than seq tax |

### Rank 3 — **EXPERT_CHEAP_LOOSE_SBC_FILTER** · `p_w24_ex_loosebeat` shape on flweakmp base

| | |
|--|--|
| **Class** | expertPolicy combat cheap path: if any single has sbc&lt;8, hard-filter to loose-only set |
| **Gold mass** | 17 frames (highest gold theme) |
| **Hits residual** | mid single smash / structure break seats (subset of freeze-identical long midgames) |
| **Why not #1** | Historically dual-null / soft residual flat when only reordering; needs **hard filter**. Orthogonal to seq climb but less specific to holdout freeze-identical census |
| **Expected Δ** | **+0…+2** holdout; gold transfer strong |

### Explicitly rejected this wave

| Lever | Why |
|-------|-----|
| SoftN | Forbidden |
| W16 / W18 pass-unique | DEV_VAL reverse `20290634@0` |
| BR multionly / multi-contest root | dual-null (allowPass already false when multi legal) |
| More BR FL trash / flweakmp retune | 20440315 already diverges, still L; FL micro plateau |
| `p_w26_ex_jclimb` as coded | multi tax **unreachable**; Jack singles-only ≈ climbtax; DEV 34 dual-flat vs flweakmp |

---

## 4. Rank ONE best W26 probe

### **`p_w26_ex_seqclimb`** ⭐

| Field | Choice |
|-------|--------|
| **Base** | `p_w25_ex_flweakmp` |
| **One axis** | combat `expertScore` **seq/multi climb tax** + optional singles top≥Q extension |
| **Locus** | `expertScore` combat ~L341–363; multi arm **outside** `single&&single` block |
| **Canonical design** | `evolve/NOTE-w26-seqclimb.md` |
| **Why best** | Largest residual freeze-identical mass is high-seq burn; climbtax comment cites JH→QS→KS but code never taxes seq; flweakmp already owns FL weak-mp; orthogonal stack |
| **Why not jclimb** | Current `p_w26_ex_jclimb` multi branch is nested under singles guard → **dead code**; DEV **34/50 identical** to flweakmp; firstdiff mostly FL_other from stack, not combat multi |
| **Eval ladder** | firstdiff vs flweakmp (expect combat_*/multi) → DEV ≥33 → DEV_VAL Δ≥+2 → holdout A/B |
| **Ship bar** | unchanged (both holdouts WR&gt;0.70 + Δid≥+2) — **not promoting** |

### Probe anti-patterns

1. Do **not** force PASS when only high multi is legal (W16).  
2. Do **not** hard rekey `orderLegals` min-top (mintop holdout fingerprint).  
3. Do **not** stack SoftN / flweakmp retune / loosebeat in the same probe.

---

## 5. Artifacts

| Path | Role |
|------|------|
| `evolve/holdout-A-ch-t20-w25-flweakmp.json` | CH holdout A |
| `evolve/holdout-A-id-t20-w24-climbtax.json` | ID / freeze baseline |
| `evolve/holdout-A-ch-t20-brfltrash.json` | prior package reference |
| `evolve/firstdiff-flweakmp-holdout-bothlose.json` | prior both-lose census |
| `evolve/firstdiff-w26-flweakmp-residual-holdoutA.json` | **this** residual firstdiff (23 seeds × 2) |
| `evolve/NOTE-w26-seqclimb.md` | ranked probe design |
| `evolve/NOTE-fair-w25-results.md` | flweakmp gate results |
| scratch `holdout-A-residual.json` | machine-readable residual |

---

## 6. Decision (analysis only)

| | |
|--|--|
| Residual L seats | **23** |
| Freeze-identical | **16** |
| Diverged-still | **6** |
| New-loss | **1** |
| Top levers | (1) **seqclimb tax** (2) early 2-budget (3) cheap loose SBC |
| **ONE W26 probe** | **`p_w26_ex_seqclimb`** on flweakmp base |
| SoftN / promote | **FORBIDDEN / NO** |

---

*Identity file name says climbtax but build is v91 freeze self-play (25/50) — used as freeze/identity fair dual baseline per protocol.*
