# W28 — Holdout flip candidates under `p_w26_ex_seqclimb`

**Date:** 2026-07-14  
**Mode:** analysis only — **do not promote** · SoftN **FORBIDDEN** · W16 pass **FORBIDDEN** · ctrl2hi **reheat FORBIDDEN**  
**Base / best holdout:** `p_w26_ex_seqclimb` (**27/27**)  
**Freeze:** `v91` · fair dual · `MS=200 TRIALS=20 SOFT=0`  
**Identity:** `evolve/holdout-{A,B}-id-t20-w24-climbtax.json`  
**Challenger holdout:** `evolve/holdout-{A,B}-ch-t20-w26-seqclimb.json`  
**Prior residual census:** `evolve/NOTE-w27-holdout-residual.md`  
**Scratch:** `{SCRATCH}/w28/flip-candidates.json`, `freeze-id-multi-structure.json`, `cf-lever-convert.json`

---

## 0. Headline

| Metric | A | B | A+B |
|--------|--:|--:|----:|
| seqclimb wins | **27/50** | **27/50** | **54/100** |
| both-lose (seq L ∧ id L) | **22** | **20** | **42** |
| freeze-identical both-lose (no firstdiff vs v91) | **14** | **13** | **27 (64%)** |
| diverged-still-loss | **8** | **7** | **15** |
| Soft multi-tax | **diverge∩¬convert plateau** | (same) | |

**Read:** Absolute gains need **win convert** on freeze-identical skill seats, not more soft score tax (W26 multi tax already firstdiffs residual multi climbs without flipping outcomes). W27 `ctrl2hi` dual-null / holdout reverse. SoftN dead.

---

## 1. Both-lose seats A+B under seqclimb

Both-lose = holdout `liveWin=false` **and** identity `liveWin=false` on the same `seed@seat`.  
Freeze-identical = residual firstdiff vs `v91` on the loss seat has `diverged=false` (`firstdiff-w27-seqclimb-residual-holdout{A,B}.json`).

### 1a. Holdout A — 22 both-lose

#### Freeze-identical — 14 (skill-class focus)

| # | seed@seat | steps | freeze-path class (W27 + multi structure) |
|--:|-----------|------:|-------------------------------------------|
| 1 | **20300693@1** | 9 | unique multi `JH QS KS` (suit-only pool) — dual-null soft tax |
| 2 | 20390450@1 | 14 | long seq FL; late stranded high climb |
| 3 | 20430342@1 | 17 | mega seq burn |
| 4 | 20290720@1 | 18 | long seq FL → stranded pair |
| 5 | 20410396@1 | 19 | high seq climb |
| 6 | **20350558@1** | 19 | pair ladder + early **22** on AA; FREE residual multi |
| 7 | 20370504@0 | 20 | 22 reclaim then high free multi |
| 8 | 20490180@1 | 20 | single war; 2s available |
| 9 | 20340585@0 | 21 | low-seq answer then KKK |
| 10 | **20480207@0** | 21 | pair residual low; mid **2-control** CF convert |
| 11 | 20420369@0 | 22 | pair ladder then pass wall (unique multi mid) |
| 12 | 20310666@1 | 22 | deep over-pass |
| 13 | 20470234@0 | 23 | high seq; ctrl2 CF convert secondary |
| 14 | **20270774@0** | 23 | **multi-alt seq** `8D9DTD` vs low `345` — **CF WIN convert** |

#### Diverged-still-loss — 8 (path moved, win not)

| seed@seat | firstdiff freeze → seqclimb |
|-----------|------------------------------|
| **20280747@1** | multi tax `TS JS QC KH` → `6S 7S 8H 9C` |
| 20330612@1 | FREE pair → single |
| 20380477@0 | FREE long-4 → pair |
| **20400423@1** | multi tax `TD JC QS` → `8S 9H TS` |
| 20440315@0 | FREE weak multi → trash (flweakmp) |
| 20450288@1 | single `TC` → `8D` |
| **20460261@1** | multi tax 4-seq → lower 4-seq |
| 20500153@0 | FREE long-10 → 6-seq |

Multi-tax **diverge∩L** seats are **not** “closest to flip” for W28 — lever already fired, outcome fixed.

### 1b. Holdout B — 20 both-lose

Freeze-identical **13** (see scratch / W27 §1b). Same skill buckets: multi-alt midgame, 2-burn, FL structure.  
Diverged-still **7** (incl. multi tax `20420370@0`).

---

## 2. Three freeze-identical skill-class losses (deep)

Selection: highest multi-structure flip scores among freeze-identical both-lose **plus** proven CF convert anchors.  
Method: freeze-path playout (`fair-playout-trace` / custom multi census), firstdiff vs v91 (all three: **identical**), hand multi + legal multi alts at **first combat**.

### Seat A — `20270774@0` ⭐ **closest to flip (convert proven)**

| Field | Value |
|-------|--------|
| Outcome | both-lose, freeze-identical, 23 steps |
| Firstdiff vs v91 | **none** (seqclimb ≡ freeze path) |
| First combat | step1 · `seq@2` · handLen=13 · omin=10 |
| Freeze/chall play | **`8D 9D TD`** (identical) |
| Hand | `5S 3C 4C TD JD JH 8D 9D KH 5D 2H 6C JS` |
| Structure | pairs **5**; maxRun **4**; twos **1**; J-material triple-ish |
| Multi alts (same type) | `3C4C5D`, `4C5*6C`, **`8D9DTD`**, `9DTD J*` (7 legal multi) |
| Residual after play | **low 345:** pairR=1 · trash high · **high 89T:** pairR=**2** · trash lower |

**Loss mechanism:** mid-high seq climb over low face → opp answers `KD AH 2C` → live forced PASS → tempo death.  
**Convert CF:** force `3C 4C 5D` at step1, freeze policy thereafter → **`liveWin=true`** (16 steps).  
**Key insight:** pure **residual-max (pairR)** *prefers the losing climb* (`8D9DTD`). Gold “residual multi” as residual-max is **dual-null for convert** on this seat. Convert key = **min-top same-type multi** among pool≥2 (keep high package + 2).

### Seat B — `20350558@1` (structure-richest freeze-id)

| Field | Value |
|-------|--------|
| Outcome | both-lose, freeze-identical, 19 steps |
| Firstdiff | **none** |
| First combat | step1 · `pair@0` · **`3C 3D`** |
| Multi alts | `33`, `55`, `99`, **`22`** (residual multi order + pair ladder) |
| FREE later | step5 lead `55` with many seq alts (789 / 89T / 9TJ…) |
| Flip score | **max 11** (structure census top) |

**Path:** answer lowest pair → face AA → forced **22** reclaim → lead mid pairs → lose control.  
**CF one-step multi force:** no first-step multi reorder vs freeze (freeze already min-top `33`).  
**Lever fit:** not residual multi at step1; optional later FL residual / plan-pass (pass burned). **Not W28 primary** — high structure score but no one-move convert found.

### Seat C — `20480207@0` (2-control CF convert)

| Field | Value |
|-------|--------|
| Outcome | both-lose, freeze-identical, 21 steps |
| Firstdiff | **none** |
| First combat | step1 · `pair@0` · `5C 5H` (alts: 5-suit variants + 6-pairs) |
| Later single | step5 freeze `4H` with **2D** legal |
| Structure | triple-ish 6s / 5s residual; twos=1 |

**Convert CF:** force `2D` instead of `4H` at step5 → **WIN**.  
**Lever fit:** gold **2-control** (0513/0525/0544 family).  
**Why not W28 #1:** W27 `p_w27_ex_ctrl2hi` already **holdout A reverse**; broader CF ctrl2 = **2 converts / 6 forces** (also still-L on 20270774, 20310667, …). Convert exists but **reverse mass dominates**.

### Bonus (not top-3 writeup, for lever contrast)

| seed@seat | note |
|-----------|------|
| `20300693@1` | still unique multi `JH QS KS` — only suit variants; residual multi order **cannot** change residual ranks; still freeze-identical L |
| `20310667@0` | first combat single `4H`; later QH pair-smash; loose/2 CF did not convert cleanly |

---

## 3. Gold levers → convert (not just path diverge)

| Lever | Gold mass | Hits freeze-id multi structure? | CF win convert on freeze-id? | Fair dual history |
|-------|----------:|----------------------------------|------------------------------|-------------------|
| **Residual multi order** | 8 (0503/0517/0519/0520/…) | **Yes** — 20270774 7 multi alts; 20350558 pair ladder | **Depends on key:** residual-**max** = **0 force / 0 convert** on freeze-id set (agrees with freeze; picks losing `89T` on 20270774). **Min-top multi among pool≥2** = **1 force / 1 convert** (`20270774@0`) | W18 brseqres dual-null · W19 exresmax dual-null · W3 ordres flat · live `p_w28_ex_multires` residual-max firstdiffs design **higher** multi (mintop invert) but **nDiff=0** on convert anchor |
| **2-control** | 5+ (0513/0516/0525/0544…) | mid single wars | **2/6** convert (`20480207@0`, `20470234@0`) | **W27 ctrl2hi discard** (holdout A reverse) |
| **FL structure** | 5 (0498/0505–07/0521) | some FREE multi tension | no one-step CF convert on freeze-id sample | flweakmp already in seqclimb stack; A ≡ fl on outcomes |

### Ranking among the three (convert-first)

1. **Residual multi order — but min-top / low-climb band, not residual-max pairR**  
   - Only lever with a **clean 100% convert CF** on a freeze-identical both-lose seat (`20270774@0`).  
   - Orthogonal to seqclimb soft Q-tax (89T top=T rank7 **never taxed**; tax needs top≥Q).  
   - Existing residual-max multires **fails the convert seat** (pairR favors 89T).

2. **2-control** — convert exists, **burned reverse** as W28 primary.

3. **FL structure** — already stacked; residual FL not the freeze-id combat hole.

---

## 4. ONE W28 probe with convert hypothesis

### ⭐ **`p_w28_ex_mulow`** — hard **min-top same-type multi** (low-climb multi filter)

| Field | Choice |
|-------|--------|
| **Base** | `p_w26_ex_seqclimb` |
| **ONE axis** | Combat: when `cur.type ∈ {pair,seq,triple,doubleseq}`, **≥2** non-2 same-type multi legals, `curTop ≤ 6`, `handLen ≥ 8`, and (`twos≥1` ∨ `control≥2`): **hard-pick argmin top** (then shorter, then suit), **before** cheap `orderLegals` / residual-max |
| **Convert hypothesis** | `20270774@0` step1: freeze `8D 9D TD` → **`3C 4C 5D`** → keep T/J/K/2 package → **win** (CF proven under freeze continuation) |
| **Why not residual-max `multires`** | On convert anchor, residual-max **agrees with freeze** (pairR 2 vs 1). Architecture note’s residual-max firstdiffs *other* seeds toward **higher** multi — opposite of convert seat. Risk: mintop-invert reverse without convert. |
| **Why not ctrl2hi** | W27 reverse; CF reverse mass 4/6 |
| **Why not SoftN / pass** | Forbidden |
| **Why not more climb score tax** | Soft multi tax already diverge∩¬convert on `20280747@1` etc.; need **hard playSig change** on freeze-identical multi-alt pool |
| **Exact locus** (when implementing) | copy base → `p_w28_ex_mulow-{ai,search}.js` · helper near `multiBurnsHighResidual` · **`expertPolicy` before cheap return** · **`bestResponseMove` combat cand reinject / reorder** (triple mirror; anti dual-null) |
| **Expected firstdiff** | `combat_other` / lower multi top vs seqclimb on multi-alt seats; **fail if nDiv=0** |
| **Expected convert mass** | **+1…+2** holdout if 20270774-class multi-alt low-face seats exist beyond the CF anchor; **0** if pool≥2 rarely co-occurs with gates |
| **Honest null seats** | `20300693@1` unique multi (suit-only) — **still dual-null** (must not invent pass) |
| **Ship** | **NO promote** this note; ship bar unchanged both holdouts WR>0.70 |

### Convert hypothesis (one paragraph)

Under fair dual freeze-identical paths, seqclimb already reorders **Q+** multi climbs via soft score, but mid multi tops (**T/J**) over low faces remain min-score / residual-max preferred and burn control packages. Gold residual multi is not pure residual-max on this residual: the holdout convert is **answer low multi, keep high multi + 2**. Hard min-top among same-type multi when the face is low and control remains is the smallest discrete lever that **changes root playSig on freeze-identical skill seats** and has a **measured win convert** (`20270774@0`), not merely path diverge.

### Probe anti-patterns

1. Do **not** residual-max / sbc-first multires as the W28 convert bet (fails anchor).  
2. Do **not** reheat ctrl2hi / SoftN / W16 pass / BR multionly.  
3. Do **not** force PASS on unique multi.  
4. Do **not** stack mulow + residual-max + nest in one probe.  
5. If live `p_w28_ex_multires` is already forked: treat as **orthogonal experiment**; convert ranking prefers **mulow** until residual-max shows holdout convert.

---

## 5. Eval ladder (when implementing)

```text
1. firstdiff vs p_w26_ex_seqclimb — require nDiv>0 combat multi lower-top
2. unit: 20270774@0 first combat playSig = low multi (3-4-5 class)
3. CF / fair dual seed check: 20270774@0 liveWin true under mulow
4. DEV T20 ≥ 34, Δid ≥ 0
5. DEV_VAL Δ ≥ +2
6. holdout A/B only after VAL — no promote from this note
```

---

## 6. Artifacts

| Path | Role |
|------|------|
| `evolve/holdout-A-ch-t20-w26-seqclimb.json` | CH A 27/50 |
| `evolve/holdout-B-ch-t20-w26-seqclimb.json` | CH B 27/50 |
| `evolve/holdout-{A,B}-id-t20-w24-climbtax.json` | identity |
| `evolve/firstdiff-w27-seqclimb-residual-holdout{A,B}.json` | freeze-id labels |
| `evolve/fair-firstdiff.js` / `fair-playout-trace.js` | tools |
| `policies/p_w26_ex_seqclimb-search.js` | base |
| `policies/p_w28_ex_multires-*` | residual-max sibling (not convert-ranked) |
| `{SCRATCH}/w28/flip-candidates.json` | machine census |
| `{SCRATCH}/w28/freeze-id-multi-structure.json` | multi structure ranks |
| `{SCRATCH}/w28/cf-lever-convert.json` | CF mintop / resmax / ctrl2 |

---

## 7. Decision

| | |
|--|--|
| Both-lose A+B | **42** (22+20) |
| Freeze-identical both-lose | **27 (64%)** |
| Closest flip seat | **`20270774@0`** (multi-alt seq; CF WIN via low multi) |
| Secondary | `20480207@0` (2-control CF WIN; reverse risk) · `20350558@1` (structure, no one-step convert) |
| Unique multi doom | `20300693@1` still L identical |
| Gold lever for convert | **residual multi order as min-top multi filter** (not residual-max; not 2-control reheat; not FL retune) |
| **ONE W28 probe** | **`p_w28_ex_mulow`** on seqclimb base |
| SoftN / promote | **FORBIDDEN / NO** |

---

*Analysis only. Identity files are v91 freeze self-play used as fair dual baseline.*
