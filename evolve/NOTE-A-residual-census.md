# W42 — Holdout A residual census under `p_w41_ex_tripair`

**Date:** 2026-07-14  
**SoftN:** FORBIDDEN  
**Base:** `p_w41_ex_tripair` (fair dual A **34**/50 · B **33**/50 · sum **67**)  
**Protocol:** SOFT=0 T20 BOTH · live vs freeze v91  
**Scope:** A residual losses only · read-only (no policy / live AI edits)  
**Evidence base:**  
`evolve/holdout-A-ch-t20-w41-tripair.json` · `evolve/holdout-B-ch-t20-w41-tripair.json` ·  
`evolve/NOTE-fair-w41-results.md` · prior W41 A census under brseq3 ·  
scratch `w41/cf-B-all.summary.json` · `w41/gate-seqmax6-compare.json` ·  
scratch `w42/aloss.txt` · `w42/bloss.txt` · `w42/NOTE-A-residual-census.md`

---

## 0. Headline

| Metric | Value |
|--------|------:|
| Holdout A | **34/50 (0.68)** |
| Residual L | **16 seats** |
| A reverse under tripair vs brseq3 | **0** (A set **identical** to W36→W41) |
| A +1 to ship bar (~35) | yes |
| B residual after tripair | **17** (was 18; pure convert `20370505@0`) |
| Dual-safe force hunt under **tripair** on A | **not yet run** |
| Dual-safe force hunt under **tripair** on B | **not yet run** (last full B hunt = brseq3 base) |

**Read:** A has been **flat at 34** since W36 (`flhidetight`). W37–W41 banked **B-only** converts (or free B gains) with **0 A reverse**. Residual A mass is **stable** — same 16 `seed@seat` through `pairhi_wide` → `brseq3` → **`tripair`**. W41 closed B dual-safe star **triple→pair**; discarded **seqmax6** after holdout **A reverse −2**. Midshort remains force-only. Closest remaining structured B convert is **late FREE high→low trash** (`20280748@1`); A still has **no proven dual-safe one-step FREE convert**.

---

## 1. Full A loss list (seed@seat) under tripair

From `holdout-A-ch-t20-w41-tripair.json` / scratch `w42/aloss.txt` (16 = 50−34).  
Seat list **byte-identical** to W41 residual under `p_w40_ex_brseq3`.

| # | seed@seat | steps | Prior class (w26–w41 stack) | One-step status under tripair |
|--:|-----------|------:|-----------------------------|-------------------------------|
| 1 | `20280747@1` | 10 | **diverge∩L** multi tax `TS JS QC KH`→`6S 7S 8H 9C` | lever fired; short collapse still L |
| 2 | `20300693@1` | 9 | unique multi `JH QS KS` (suit-only pool) | **pass-only** CF · W16 **forbidden** |
| 3 | `20320639@0` | 22 | FL multi-force **reverse-class** (id won → chall L historically) | do **not** re-widen FL multi force |
| 4 | `20350558@1` | 19 | pair ladder; CF `33→22` / FL volume | **toxic** 2-pair / not clean |
| 5 | `20370504@0` | 20 | FREE pair→single / combat `TT→22` | **reverse-risk** · **not** triple→pair; twin of banked B star |
| 6 | `20380477@0` | 18 | **diverge∩L** FREE long-4 → pair | lever fired |
| 7 | `20390450@1` | 20 | long seq FL; hunt: **no usable CF** | dual-null skill |
| 8 | `20400423@1` | 23 | **diverge∩L** multi `TD JC QS`→`8S 9H TS` | lever fired · twin of B seq5→seq6 seed |
| 9 | `20410396@1` | 19 | high seq climb; **no usable CF** | dual-null skill · **seqmax6 flipped A win `@0`** (not this seat) |
| 10 | `20420369@0` | 22 | pair ladder → pass wall; **no usable CF** | dual-null skill |
| 11 | `20430342@1` | 17 | mega seq burn; late FL shorter CF (pair→single) | weak midgame FL · not dual-safe verified |
| 12 | `20440315@0` | 12 | FREE weak multi → trash (flweakmp); deal-doomed | **do not** retune BR-FL trash |
| 13 | `20450288@1` | 25 | **diverge∩L** single `TC`→`8D` | combat single thrash |
| 14 | `20470234@0` | 23 | ctrl2 CF only | **forbidden** family |
| 15 | `20490180@1` | 22 | single war CF `7H→9S` | weak one-off thrash |
| 16 | `20500153@0` | 8 | **diverge∩L** FREE long-10 → 6-seq | flshort already fired; still L |

**Buckets (16) — unchanged from W41:**

| Bucket | n | seats |
|--------|--:|-------|
| **diverge∩¬convert** (lever already moved path) | **6** | 20280747@1, 20380477@0, 20400423@1, 20440315@0, 20450288@1, 20500153@0 |
| **dual-null / no usable non-pass CF** | **4** | 20300693@1, 20390450@1, 20410396@1, 20420369@0 |
| **toxic / reverse-risk CF only** | **3** | 20350558@1, 20370504@0, 20320639@0 |
| **forbidden family** | **1** | 20470234@0 (ctrl2) |
| **weak thrash / unproven** | **2** | 20430342@1, 20490180@1 |

**Machine list:**
```
20280747@1  20300693@1  20320639@0  20350558@1
20370504@0  20380477@0  20390450@1  20400423@1
20410396@1  20420369@0  20430342@1  20440315@0
20450288@1  20470234@0  20490180@1  20500153@0
```

---

## 2. Overlap with B convert families (post-W41)

### Family status under tripair

| Dual-safe family | B star / mass | Status after W41 | A residual overlap |
|------------------|---------------|------------------|--------------------|
| FREE `triple3→pair2` | `20370505@0` | **BANKED** (`p_w41_ex_tripair`) · pure B convert · A flat | **none as convert** — twin `20370504@0` is pair→single / 2-burn **toxic**, not triple→pair |
| FREE `seq5→seq6` | `20400424@0` | **discarded seqmax6** — holdout A **−2 reverse** (`20370504@1`, `20410396@0`) | twin `20400423@1` is multi-tax **diverge∩L**, not lengthen; reverse hit A **wins**, not residual L seats |
| FREE `seq5→seq3` midshort | `20360532@1` | **force-only** · full-policy dual-null (W39/W40) · still in B residual | A shorten seats `20500153@0`, `20380477@0` are diverge∩L — **not** clean convert |
| FREE `single1→seq3` | `20260802@1` | **brseq3 banked** W40 | **none** on A L |
| FREE late high single → low trash | `20280748@1` s9 JH→7D/5D | **OPEN** (next structured B star) | A residual has `20280747@1` (adjacent seed, multi tax diverge∩L — **not** lotesh class) |
| combat `single1→single1` | many B seats | thrash mass | A: `20450288@1`, `20490180@1` — weak / one-off |
| FREE `pair2→single1` | `20480208@0` | thrash / hidefer family | A residual no hidefer star left |
| PASS / ctrl2 | scattered | **forbidden** | `20300693@1`, `20470234@0` |

### Twin-seed map (A residual ↔ B residual after tripair)

| A residual | B neighbor (tripair bloss) | Shared family? |
|------------|----------------------------|----------------|
| `20370504@0` | **`20370505@0` now W** (tripair) | **No** — adjacent seed, different CF class (A toxic pair/2-burn) |
| `20400423@1` | **`20400424@0` still L** (seq5→seq6 dual-safe but reverse-risk) | **No** — multi reorder already diverged; not lengthen |
| `20410396@1` | (B no exact twin residual) | seqmax6 reverse was A **`20410396@0`** (win seat) — protect that win |
| `20300693@1` | `20300694@1` combat single | **No** — unique multi dual-null |
| `20280747@1` | `20280748@1` lotesh candidate | **Theme adjacency only** — A is multi-tax diverge∩L |
| `20430342@1` | `20430343@1` combat singles | **Weak** thrash both sides |
| `20450288@1` | `20450289@1` | thrash |
| `20470234@0` | `20470235@0` | ctrl2 forbidden vs late FL single |

**Conclusion:** A residual still does **not** host a documented dual-safe one-step convert in the W40/W41 families. Overlap is **theme adjacency** (twins / thrash), not proven A near-convert seats. **triple→pair is closed** without helping A residual. **seqmax6 is reverse-risk on A wins.** **midshort is force-only.**

### seqmax6 reverse detail (protect A34)

From scratch `w41/gate-seqmax6-compare.json` (full holdout under seqmax6 probe):

| Gate | Result |
|------|--------|
| B | **33** (+1 via `20400424@0`) |
| A | **32** (−2) |
| A reverse seats | `20370504@1`, `20410396@0` |
| Note | Both reverse seats are **tripair A wins** today — any re-probe of seq lengthen must keep them W |

---

## 3. “One step” from documented win patterns?

| Pattern already banked / dual-safe | A residual still one-step? | Notes |
|------------------------------------|:--------------------------:|-------|
| brseq3 single→seq3 (`20260802@1`) | **No** | A never lost that class |
| tripair triple→pair (`20370505@0`) | **No** | banked; A twin wrong CF |
| seqhi / pairhi / pairhi_wide / mulowg | **No** | A stars banked; residual not same axis |
| flvol / flshort5 / flhidetight | **No** | residual shorten/volume seats diverge∩L or toxic |
| **seq5→seq6** | **not on A residual** · **A reverse proven** | do **not** ship unguarded; B-only micro not enough |
| midshort seq5→seq3 | force-only full policy L | **do not** promote for A |
| **lotesh** late high→low | **not on A residual** | B star `20280748@1`; A twin different class |

**Honest A near-convert set under prior hunts:** still **empty** of dual-safe (live-vs-v91) FREE structure converts. Closest historical A CFs: **toxic** (2-burn), **forbidden** (pass/ctrl2), or **diverge∩L**.

---

## 4. A-safe lever order that protects A34

Constraint: **A ≥ 34 hard floor** (0 reverse on the 34 wins). SoftN forbidden.  
Prefer convert-first dual-safe protocol (force-alt **then** live vs v91 full path).  
Ship math under tripair: A **+1** · B **+2** to bar.

### Recommended A-safe lever order (W42)

| Rank | Lever | Why A-safe | A residual hit expectation | B residual hit |
|-----:|-------|------------|----------------------------|----------------|
| **0** | **Dual-safe force hunt A16 + B17 under `p_w41_ex_tripair`** | Measurement — may surface new FREE CF after tripair path drift | identifies true A +1 target if any | re-ranks open B stars |
| **1** | **`fl_lotesh` FREE late high single → min-rank trash** star `20280748@1` | FREE-only · orthogonal to combat bank · gate handLen 6–9 + residual control (2 or high multi) · **never** widen flhidetight | **likely 0** pure A convert (twin multi-tax) — ship only if A flat 34 | **primary B +1** if dual holds |
| **2** | **New dual-safe FREE family from hunt** (if lotesh dual-null) | Only families with live-vs-v91 convert + nDiv=0 on A wins | only if hunt finds A-hosted CF | TBD |
| **3** | combat unique min-SBC (`com_sbcuniq`) | only if hunt shows unique-Δsbc multi-seat converts | weak; thrash risk | thrash mass on B |
| **X** | **unguarded seqmax6 / seq5→seq6** | **proven A reverse −2** | reverse on A wins `20370504@1`, `20410396@0` | B +1 not worth A −2 |
| **X** | midshort / unguarded seq5→seq3 | path-sensitive dual-null | A shorten already diverge∩L | reject unless full dual W |
| **X** | SoftN / W16 pass / ctrl2 / unique-multi pass | forbidden | dual-null or reverse | — |
| **X** | re-widen tripair / flvol invert / FL multi force | reverse-class or already banked | A reverse risk (`20320639@0`) | — |
| **X** | more BR-FL trash / flweakmp retune | `20440315@0` doomed | 0 | — |

### Protect-A34 checklist for any W42 probe

1. Identity / firstdiff: **nDiv on A win seats = 0** preferred; any diverge must re-sim to **liveWin=true**.  
2. Hard kill if any of: `20270774@0`, `20290720@1`, `20310666@1`, `20330612@1`, `20340585@0`, `20370504@1`, `20410396@0`, `20460261@1`, `20480207@0`, hidefer-class A wins flip L.  
   - **Especially** `20370504@1` and `20410396@0` (seqmax6 reverse victims).  
3. Prefer BR-strip / expert hard FREE gate over soft score thrash.  
4. Reject if DEV_VAL reverse or A < 34.  
5. SoftN never.

### Best path to A +1 (honest)

- **Do not expect** lotesh, seqmax6, or midshort to convert A residual without a **new** dual-safe A hunt under tripair.  
- A +1 most likely from:  
  (a) **free gain** while banking a B convert (W36/W38/W41 pattern — A flat while B moves), or  
  (b) **new A dual-safe CF** found by force-hunting the 16 under **`BASE=p_w41_ex_tripair`**.  
- Skill dual-null seats (`20300693@1`, long seq climb, pass wall) are **not** lever-addressable without forbidden pass.  
- Re-attempting seqmax6 “tighter” is **second-class** only after A-win firstdiff proof; default **reject**.

---

## 5. Deliverables summary

### A loss list (16) — under `p_w41_ex_tripair`
```
20280747@1  20300693@1  20320639@0  20350558@1
20370504@0  20380477@0  20390450@1  20400423@1
20410396@1  20420369@0  20430342@1  20440315@0
20450288@1  20470234@0  20490180@1  20500153@0
```
**Identical** to residual under brseq3 / pairhi_wide (A flat since W36).

### Overlap with B convert families
| Family | Status | A residual |
|--------|--------|------------|
| triple→pair | **done** W41 | no A convert (twin toxic) |
| seq5→seq6 | **reverse-risk** (A −2 holdout) | no A residual host; **protect** reverse win seats |
| midshort | **force-only** reject | no clean A convert |
| lotesh late high→low | **open** B star | adjacency only (`20280747@1` ≠ class) |

### Recommended A-safe lever order
0. Dual-safe force hunt A16+B17 under tripair  
1. **`fl_lotesh`** (B convert-first; protect A34 flat)  
2. New dual-safe FREE from hunt  
3. combat unique min-SBC last  
4. Never: SoftN, unguarded seqmax6, midshort, pass, ctrl2, FL multi widen

### W42 primary lever (concise)
**Primary implement:** `fl_lotesh` FREE late high-single → low trash (star `20280748@1`), gated tight, after dual-safe reconfirm under **`BASE=p_w41_ex_tripair`**.  
**Prerequisite measurement:** force-hunt residual A16 + B17 under tripair (path may have drifted).  
**Do not** lead with seqmax6 or midshort. SoftN dead. Accept only A≥34 · B net ≥+1 · 0 reverse.

---

## 6. Evidence

| Artifact | Role |
|----------|------|
| `evolve/holdout-A-ch-t20-w41-tripair.json` | A 34/50 + lossSeeds |
| `evolve/holdout-B-ch-t20-w41-tripair.json` | B 33/50 context |
| `evolve/NOTE-fair-w41-results.md` | tripair bank + seqmax6 discard |
| prior W41 A census under brseq3 | superseded by this note |
| scratch `w41/cf-B-all.summary.json` | dual-safe family catalog (brseq3 base) |
| scratch `w41/gate-seqmax6-compare.json` | A reverse seats under seqmax6 |
| scratch `w42/aloss.txt` / `bloss.txt` | machine A/B L lists under tripair |
| scratch `w42/NOTE-A-residual-census.md` | this census (scratch copy) |

**Next measurement:**
```bash
BASE=p_w41_ex_tripair SEATS=<A16> OUT=w42/cf-dual-safe-A-all.json node dual-safe-force-hunt.js
BASE=p_w41_ex_tripair SEATS=<B17> OUT=w42/cf-dual-safe-B-all.json node dual-safe-force-hunt.js
```
Then implement **lotesh** only if `20280748@1` still dual-converts (or promote any new A-hosted FREE dual-safe star for true A +1).
