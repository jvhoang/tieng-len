# Fair dual next rung — freeze v9.1 baseline

**Date:** 2026-07-14  
**Protocol (locked):** hidden only · GM both seats · **BR ON both** · **equal budgets** · start freeze **v9.1**  
**Identity:** live≡freeze → expect **~0.50** WR  
**Ship:** WR **>0.70** **and** **≥ identity +2** wins (same seed0) · gold series 1–3 recommendations locked  
**Status:** plan only (no `ai.js` / `search.js` mutation)

---

## 1. Why fair dual invalidates hollow 40/50 rungs

| Hollow era (v9.2–v9.5 streak) | Fair dual (this restart) |
|------------------------------|--------------------------|
| Live 280ms **BR-on** vs freeze 120ms **BR-off** | Live ≡ freeze budgets, **BR both** |
| Perfect-info duals (or mixed) | **Hidden only** |
| Identity live≡freeze already **~40/50 = 0.80** | Identity live≡freeze expect **~0.50** |
| Absolute WR>0.70 = budget/BR harness | Absolute WR>0.70 **and** +2 vs identity = **policy skill** |

**Fact pattern (primary seed `20260711`):** v92 BR-GM, v93 identity≡v92, v93 residual multiTie, v94 TWO_OMIN2, v95 combat-BR density all scored **40/50 with the same 10 lossSeeds**. Code-identical live already “won” the gate under asymmetric seats — later stamps re-sold harness as ladder progress.

**Implication under fair dual:**

1. Any rung that only restores live BR-on / freeze BR-off, unequal ms, or perfect info is **not AI skill**.
2. Absolute WR>0.70 without beating **fair identity** is meaningless (identity itself is ~0.50 now, not 0.80).
3. Ship must prove a **freeze-body policy delta** that still wins when the freeze seat runs the **same search class** (GM + BR + equal budget + hidden).
4. STACK / softN / BR_GM model / wall-clock floors alone do **not** clear the new gate (equal-budget STACK vs v91 historically ≈ 0.50–0.54).

See: `NOTE-hidden-info-dual-protocol.md`, `NOTE-dual-protocol-suspicion.md`, `NOTE-v91-real-skill-deltas.md`.

---

## 2. Top 3 ONE-AXIS levers (fair-dual safe)

**Constraint:** real decision skill that will live in the **freeze body** when stamped — not harness, not env-only, not “path freeze never runs.” Under fair dual **both seats run BR**; asymmetry lever “freeze never BR” is dead. Prefer **one axis per probe**.

Sources: `NOTE-hidden-ladder-human-levers.md`, `HUMAN-LOSS-MINES-v11.md` (combatDiffer 188, residualScore 186:48 human-better, pass→pair 22, same-class ~75, free-lead multi vs trash).

### #1 — Combat residual **structure soft-tie + gated fold** ⭐ primary

| | |
|--|--|
| **One axis** | Among **near-equal BR rates** in combat, prefer answers that leave residual pairs / seq≥3; mild **gated** pass prior when deep + opp not short + mid multi/pair top. |
| **Why fair-dual works** | Both seats already run combat BR — this changes **root ranking quality**, not who gets BR. Structure residual is the largest human CF gap; not a budget stamp. |
| **Locus** | `bestResponseMove` combat score / multiTie (today free-lead-only); combat soft-root structure + pass prior (`policies/v91-search.js` / live `search.js` BR + combat soft). **Not** bulk `expertPolicy` pass rewrite. |
| **Gold risk** | Low–med if pass gate too wide; keep `handLen≥9`, `omin≥5`, mid tops, non-single. |
| **Reject sibling** | Combat trial density alone (56→80/96) — hollow under equal BR budgets. |

### #2 — Free-lead **short multi / trash hybrid + invert length bias**

| | |
|--|--|
| **One axis** | Prefer pair/triple volume and early trash when multi not locking; invert BR/exploit **length** multiTie (peak length 2–3, demote long dumps). |
| **Why fair-dual works** | Free-lead choice is pure policy under equal soft/BR; CF freeLeadDiffer 116 + multiVsSingle 71 + `E_longer_multi_H_shorter` 47. |
| **Locus** | `pickFreeLeadHard` hybrid/short pool; BR free-lead multiTie; exploit multiBonus — **one of these sub-loci only** per probe (prefer multiTie invert first if hybrid already partially present). |
| **Gold risk** | Med — series-2 doubleseq / multi-always fragile; do **not** force multi-always or bulk FL rewrite. |

### #3 — Same-class combat **min-beat micro** (tie-break only)

| | |
|--|--|
| **One axis** | Among same-class legals (pair→pair, triple→triple, single_mid), prefer lower top + lower `structureBreakCost` as **stable secondary key** after rate/score ties. |
| **Why fair-dual works** | ~75 CF same-class differs; ordering skill survives equal BR (changes cand order / soft ties without extra trials). Lowest hang risk. |
| **Locus** | `orderLegals` secondary key and/or combat BR near-rate tie after #1 structure residual (do **not** re-tune bulk `expertScore` weights). |
| **Gold risk** | Low if tie-break only; high if bulk combat `expertScore` rewrite. |

**Deferred (not top-3 for this rung):** 2-tempo reclaim (one-axis after #1–#2; interacts with fold); BR combat allowPass among cheap (higher reg); exact multi-first (budget/order, weaker under equal fair soft).

---

## 3. Explicit probe order

```
1. Identity N20
   live≡freeze v91 · hidden · GM · BR both · equal budget
   (lean: FREEZE=v91 CHALL=v91 GAMES=20 node evolve/lean-fair-dual-n20.js
    or ship harness with equal opts from NOTE-hidden-info-dual-protocol.md)
   Expect WR ≈ 0.50. Record liveWins + lossSeeds. This is the accept baseline.

2. Lever seed-duel (ONE axis only)
   Patch live only vs freeze v91 body.
   Seed pack: mid-combat + FL residual (exclude structural unflippable 20380387 as ship math).
   Pass: ≥1 flip on targets, win-smoke regs ≤0, LOG_GAMES shows different root via/play.

3. Lever N20 vs freeze v91 (fair dual, same opts as identity)
   Promote interest only if liveWins ≥ identity.liveWins + 1 (noise floor).

4. Ship gate: N50 × 2 (primary seed0 + re-run seed)
   Require:
   - WR strict > 0.70
   - liveWins ≥ identity.liveWins + 2 (same seed0 protocol)
   - ≥1 residual loss flip (not only 20380387)
   - gold series 1–3 recommendations not regressed beyond locked policy
```

**One lever at a time.** Do not stack #1+#2 before each clears seed-duel + N20 alone.

---

## 4. What NOT to do

| Do not | Why |
|--------|-----|
| Perfect-info duals | Invalidated; theater vs human hidden play |
| Freeze BR-off / live BR-on only | Unfair seat; identity 40/50 hollow |
| Unequal budgets (280 vs 120) as ship gate | Harness, not skill |
| softN count alone (14/16) | Fingerprint-flat historically |
| Hollow combat BR density without structure-tie | Equal-BR dual cancels; dual-flat history |
| Shipping any stamp that only re-hits identity score | Hollow 0.1 rungs |
| Bulk `expertScore` / series-3 wholesale | Dual cliff + gold red |
| AA_SAVE broad, multi-always force, blanket multiTie 0.008 | Documented dual regs |
| Hunting **20380387** for ship math | Structural unflippable deal |
| SoftN contamination / perfect dual pipelines | `.FORBIDDEN`; exit(3) by default |
| Claiming ship without +2 vs **fair** identity | Absolute WR alone is dead under fair dual |
| Restoring gold bulk into freeze to “green” dual | Imitation ≠ fair dual strength |

---

## 5. Concise top-3 (execute order)

1. **Combat residual structure soft-tie + gated fold** (BR near-rate + mild deep fold)  
2. **Free-lead short multi / trash + invert length bias** (one sub-locus)  
3. **Same-class combat min-beat micro** (tie-break only; no bulk expertScore)

**Baseline freeze:** v9.1 · **Harness:** fair dual only · **Next action:** identity N20 → lever #1 seed-duel.
