# AUTHOR RECOMMENDATION — Combat plan equity / next-level play (beyond min-beat BR)

**File:** `john_uploads/RECOMMEND-COMBAT-PLAN-EQUITY-NEXTLEVEL.md`  
**Stamped:** 2026-07-19  
**Priority:** **High for next PAIR leaps** (human/expert gap) — not a dual-ship blocker by itself  
**Type:** New upload so gold-watcher marks **added** + dirty (fileCount +1)  
**Audience:** Grok Build / PAIR / search leaf + BRD / self-play implementers  
**Ship bar unchanged:** dual fair **WR ≥ 0.90 vs v6.0 / v60**  
**Complements:**  
- `RECOMMEND-FREELEAD-RESIDUAL-TRASH.md` (FL-RT / CB-RT residual family)  
- `RECOMMEND-RESIDUAL-ORPHAN-RUN-STRUCTURE-URGENT.md` (≥3-run residual def — keep)  
- `RECOMMEND-FREELEAD-CONTROL-SIGNALS.md` (control / plan signals)  
- `RECOMMEND-WR90-SELFPLAY.md` (ship bar)  
- Gold combat-overbeat audit (`evolve/GOLD-CHAMP-p_l2s261-ANALYSIS-FOR-REVIEW.md` — diagnostic)

---

## 0. Problem statement (author)

The champion’s **BR rateV** is often **internally consistent** but **strategically shallow**.

Against **v60 dual** it improves slowly. Against **strong human / author play** it still loses heavily (author estimate **>80% human win rate** vs current dual champ class).

Root bottleneck:

```text
rate = win-rate of short playouts under dualRollout / V21 / expert-ish leaves
rateV ≈ rate + value + BRD + residual soft + expert pin
```

When leaves **min-beat**, **break runs for “cheap” answers**, and **undervalue multi-trick packages**, BR **learns the wrong ranking** even with correct residual orphan math.

**Residual fix alone is not enough.** Need **plan equity** in combat (and free-lead after control).

---

## 1. Canonical live example (author 2026-07-19)

| | |
|--|--|
| **Current** | **345** sequence (e.g. 3-4-5♦) |
| **Hand shape** | **6 + 77 + 8 + 10s + JQK + A + 2** (exact suits secondary) |
| **AI / BR** | Min legal edge beat **6** (rateV ≈ 0.74, near-tied with 8) |
| **Author** | **A** (seize / contest high) |

### Author reasoning

1. Beating with **6** **breaks 678** and leaves **8** as awkward residual trash.  
2. Early **A** often **wins the trick** (or forces 2 later) → free lead.  
3. After control: free-lead **678** backed by **JQK**; **77** backed by **10s**; **2** as late control.  
4. Multi-trick **plan equity** ≫ one-ply min-beat.

### What BR gets wrong

| Layer | Failure |
|-------|---------|
| Leaf playouts | Prefer cheap beat; don’t plan 678→JQK after free lead |
| residual / sbc | May not fully punish run-edge peel vs true plan cost |
| Control | Treats A as “expensive” without valuing **free-lead purchase** |
| Rate saturation | 6 vs 8 both ~0.65–0.74 win-rate under weak opp model → soft terms don’t encode plan |

**Name this family:** **CB-PLAN** / **CB-SEIZE** (combat plan equity / control-seize).

Related gold bucket (already measured): **combat_overbeat** — gold loose mid vs AI high card; mirror class is **AI min-peel vs author plan-preserve or seize**.

---

## 2. Pattern tags (for mining & PAIR notes)

| Tag | Description |
|-----|-------------|
| **CB-PLAN** | Prefer beat that **preserves** primary multi packages (runs/pairs with backups) over pure min-top |
| **CB-SEIZE** | Prefer **high single / 2** to take free lead when residual plan after control is strong |
| **CB-LOOSE** | Prefer true **loose** mid (not run-edge, not pair-break) when seizing is not needed |
| **FL-LADDER** | After free lead: seq + backup ladder (e.g. 678 then JQK; 77 then 10s) |
| **CB-OVERBEAT** | AI too high (K/A) when gold wants loose mid — see gold audit |
| **CB-OVERPASS** | AI PASS when gold wants residual-clean beat |

All are **structure + multi-trick**; not only orphan count.

---

## 3. Why dual WR stays ~0.6x while humans crush the bot

| Metric | What it measures |
|--------|------------------|
| Dual fair vs v60 | Two **similar leaf-BR** agents; relative climb |
| Human vs champ | **Plan-depth gap**; humans exploit min-beat / package-break |

Improving dual alone can **miss** CB-PLAN/SEIZE.  
Main must track **human/gold combat diagnostics** alongside dual.

| Gate | Role |
|------|------|
| **A — Dual vs v60 / prev** | Ship / PAIR accept (required) |
| **B — Gold combat plan-hit** | Overbeat ↓, plan cases ↑ |
| **C — Human first-diff** | Author/playlog first action agreement |
| Promote | **A + (B or C)** improved; never B alone without A |

---

## 4. Implementation order (main process)

### Phase 1 — Measure (do first)

1. Mine **CB-PLAN / CB-SEIZE** states from:  
   - gold combat mismatches  
   - author live cases (this file §1)  
   - human playlogs (first-diff vs champ)  
2. Re-run gold rank-match combat buckets after each leap.  
3. Add a small **spot suite**: “345 lead + 678+JQK+77+10s+A in hand → prefer A/control seize or non-run-edge over 6.”

### Phase 2 — Fix the **leaf** (highest leverage)

BR rate is only as smart as playout policy.

1. Upgrade **`dualRolloutPolicy` combat**:  
   - Detect remaining ≥3-runs and pair+backup ladders.  
   - Penalize **run-edge peels** (6 from 678, 8 from 6789) when a **true loose** or **control-seize** exists.  
   - When handLen deep + planScore high + current beatable by A/2/high: allow **seize** before min-beat.  
2. Align **`expertPolicy`** combat with gold CB-LOOSE / CB-SEIZE (not only min-top).  
3. Do **not** only tweak residual soft on saturated rates.

### Phase 3 — Teacher / BRD

1. Offline BR distill or combat head with labels = **author/gold/human** actions on mined states.  
2. Features (minimum):  
   - structureBreakCost, residualOrphans  
   - rank in longest remaining run? pair-break?  
   - control after (A/2 count)  
   - rough free-lead package score after winning trick  
   - omin, handLen, current top/type  
3. Inject as leaf ranker and/or soft `brdTerm` — dual-safe scale.

### Phase 4 — Selective deeper refine (not global 10× trials)

When top-2 combat actions have **|ΔrateV| ≤ 0.05**:

- 1-ply **plan value**: if we take free lead, best free-lead multi residual + control  
- or short exact when hand short  

Avoid global trial explosion (dual cost).

### Phase 5 — Self-play that doesn’t copy weak leaves

1. Mixture opponent/self leaf: fraction **plan-aware / expert** vs dual.  
2. Optional aux signal: residual + plan features (diagnostic), win/loss remains primary.  
3. Population vs plan-aware bots, not only v60.

### Phase 6 — PAIR accept discipline

1. Dual n sufficient vs **prev** (standard PAIR).  
2. Report combat gold / spot CB-SEIZE suite.  
3. Reject leaps that gain dual but **worsen** combat_overbeat or CB-SEIZE spot suite.

---

## 5. Soft prior sketch (after leaf is smarter)

Among **legal combat singles**, when rates are near-tied:

```text
score = rateV
      − α · peelFromPrimaryRun
      − β · pairBreakWithoutLooseAlt
      + γ · seizeControlWhenPlanRich   // handLen, package count, backups
      − δ · residualOrphans            // existing
```

**Do not** ship large γ until leaf/BRD support it (dual cliff risk).

---

## 6. What not to do

| Anti-pattern | Why |
|--------------|-----|
| Only raise residual soft / orph weights | Rates still dominated by leaf win/loss |
| Only more brTrials globally | Slow dual; doesn’t fix wrong leaf |
| Force A always vs low seq | Overfit; need planScore gate |
| Ignore dual bar for “human feel” | Ship bar remains WR ≥ 0.90 vs v60 |
| Hint-only UX without policy fix | Hint now mirrors BR; shallow BR still shows 6 |

---

## 7. Success criteria (next-level)

| Metric | Direction |
|--------|-----------|
| Dual WR vs v60 | Not regress; climb toward 0.90 |
| Gold combat plan buckets | Overbeat / wrong min-peel ↓ |
| Spot suite CB-SEIZE (345 + rich plan hand) | Prefer seize/loose plan over run-edge 6 |
| Author human match on logged first-diffs | ↑ |
| Human perceived strength | Fewer “obvious structure breaks” |

---

## 8. Agent checklist

1. [ ] Mine CB-PLAN / CB-SEIZE set (gold + live author + playlogs).  
2. [ ] Patch dualRollout + expert combat for run-edge vs loose vs seize.  
3. [ ] Retrain combat BRD / soft on that set.  
4. [ ] Selective top-2 plan refine when rateV tied.  
5. [ ] Dual accept + gold combat re-audit.  
6. [ ] Optional: self-play mixture with plan-aware leaf.  
7. [ ] Do **not** claim “next level done” from residual def alone.

---

## 9. Related files

| File | Role |
|------|------|
| **This file** | Combat plan equity / next-level roadmap |
| `RECOMMEND-FREELEAD-RESIDUAL-TRASH.md` | Residual trash family |
| `RECOMMEND-RESIDUAL-ORPHAN-RUN-STRUCTURE-URGENT.md` | ≥3-run residual definition |
| `RECOMMEND-FREELEAD-CONTROL-SIGNALS.md` | Control signals |
| `RECOMMEND-WR90-SELFPLAY.md` | Ship bar |
| `RECOMMEND-GOLD-HIDDEN-HAND-RECONSTRUCTION-URGENT.md` | Gold eval integrity (not dual) |

---

**Author one-liner:**  
BR that min-beats with weak leaves will keep choosing **6 over A** and losing to humans. Train **plan equity** (preserve packages, seize free lead when ladders exist) in **dualRollout/expert + BRD**, gate on dual **and** combat/gold diagnostics — residual orphans were necessary but not sufficient.
