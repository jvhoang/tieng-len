# 🚨 URGENT AUTHOR FIX — Residual orphan definition (run structure)

**File:** `john_uploads/RECOMMEND-RESIDUAL-ORPHAN-RUN-STRUCTURE-URGENT.md`  
**Stamped:** 2026-07-18  
**Priority:** **URGENT** — residual soft prior / dual leaf / PAIR residual freezes are **wrong** until this lands  
**Type:** New upload so gold-watcher marks **added** + dirty (fileCount +1)  
**Audience:** Grok Build / PAIR / champion search (`residualOrphans`) implementers  
**Complements / supersedes partial fix:**  
- `RECOMMEND-RESIDUAL-ORPHAN-DEF-FIX.md` (pair-adjacent must still count — **keep**)  
- `RECOMMEND-FREELEAD-RESIDUAL-TRASH.md` (full residual family)  
- **Does not** relax ship bar: still **WR ≥ 0.90 vs v6.0 / v60**

---

## 0. Status — what went wrong

### Old bug (pre L2s258) — **under-count**

```text
count mid singles ONLY IF no adjacent rank at all
```

→ Leftover **8 next to 77** wrongly **not** trash.  
→ Free-lead **34567** vs **345678** tied on orphans → soft prior cannot prefer longer clean line.

### L2s258 “fix” — **over-count** (current champion)

```text
count EVERY leftover mid single (rank < 10, count === 1)
```

→ Fixed pair-adjacent (good) but **destroyed run structure** (bad).  
→ Intact remaining runs are scored as many orphans.

**Canonical failure (IMG_0538-class) — primary author example:**

After free-lead **345**, leftover mid package is intact **910J** (+ AA + 22).

| Free-lead played | Leftover mid shape | Author residual trash | s258 / “count all mids” |
|------------------|--------------------|----------------------:|------------------------:|
| **345** (primary) | intact **910J** + AA + 22 | **0** | **3** ← WRONG |
| **910J** (symmetric) | intact **345** + AA + 22 | **0** | **3** ← WRONG |

Author: leftover **910J** is a **remaining multi-card run plan** → **residual orphans = 0**, not 3.  
s258 counts 9, 10, and J as three separate mid singles → wrongly **3**.

---

## 1. Correct definition (implement this)

After removing the played cards, count leftover **mid singles** (`by[r] === 1`, typically `r < 10`; exclude pure control K/A/2 as already coded) that are **not** part of a remaining structured single-run:

### Count as residual trash (orphan)

1. **Isolated** mid single (no adjacent rank present), **or**
2. Mid single whose only adjacency is to a **pair/trip** (or higher multipack) — e.g. leftover **8** next to **77**, or **6** next to **55** — **still trash**.  
   Adjacency to pairs does **not** redeem.

### Do **not** count as residual trash

3. Mid single that sits in a remaining **consecutive single-run of length ≥ 3**  
   (presence of ranks with at least one card each is enough for run membership; the singles on that run are **structured**, not orphans).  
   Examples: leftover **345**, leftover **910J**, leftover **6789**.

### Optional tightening (matches main thought process)

- A length-**2** single-run (e.g. only **3s + 4h** left) may still be treated as awkward / trash (author RECOMMEND often used **≥3-run** as the clear non-trash bar).  
- Prefer definitions where **≥3 remaining single-run ⇒ 0 contribution from those ranks**.

### One-line rule for agents

> Mid singles are residual trash **unless** they sit inside a remaining **≥3 consecutive run**.  
> Being next to a **pair/trip only** does **not** clear trash.  
> Being inside **345 / 789 / 910J** leftover **does** clear trash.

---

## 2. Canonical checks (must pass unit tests)

Use ranks after the play; suit irrelevant for orphan **count**.

### A. Run remainder must be zero trash (this URGENT)

| After play | Leftover shape | Author `residualOrphans` |
|------------|----------------|-------------------------:|
| **345** (IMG_0538 primary) | **910J** + pairs/control | **0** (not 3) |
| **910J** (symmetric) | **345** + pairs/control | **0** (not 3) |
| **345678** (0609-class) | singleton mid + pair | **1** (only true trash mid) |

### B. Pair-adjacent still trash (prior fix — keep)

| After play | Leftover shape | Author `residualOrphans` |
|------------|----------------|-------------------------:|
| **34567** | e.g. singleton **4** + **77** + singleton **8** | **≥2** (4 and **8**) |
| **345678** | e.g. singleton **4** + **77** | **1** (only 4) |

→ Prefer **345678** when residual trash is lower (IMG_0609).

### C. Must **not** regress

| Broken over-count pattern | Wrong | Right |
|---------------------------|------:|------:|
| Lead **345**, leave intact high **910J** (author primary) | 3 | **0** |
| Lead **910J**, leave intact low **345** | 3 | **0** |
| Leave **8** next to **77** only | 0 (old) or confused | **1** for the 8 |

---

## 3. Suggested implementation sketch

Replace L2s258 body of `residualOrphans(hand, play)` roughly with:

```text
1. Multiset ranks after removing play.
2. Build set of ranks that participate in any consecutive chain of length ≥ 3
   (using rank presence: by[r] > 0; chain r, r+1, r+2, …).
3. orphans = 0
4. for each rank r with by[r] === 1 and r < 10:
     if r is in a ≥3 chain → skip (structured)
     else → orphans++   // isolated OR only glued to pair/trip / length-2 glue
5. return orphans
```

**Do not** reintroduce “any adjacency clears” — that re-breaks **8 next to 77**.

---

## 4. Where it must land

| Location | Action |
|----------|--------|
| `policies/p_l2sNNN-search.js` (current dual champ) | Fix `residualOrphans` |
| Root `search.js` if mirrored | Same def |
| Soft residual prior (`rateV − 0.025×min(3,orphans)`, short-multi extra) | Auto-heals once count is right |
| Dual-rollout residual leaf | Auto-heals once count is right |
| PAIR / residual freezes / diagnostics | Re-baseline after def fix |

No need to invent new soft weights first — **classification truth** first.

---

## 5. Gold / product impact

- Soft prior currently **over-penalizes** clean run-preserving opens as if they left 3 trash.  
- **IMG_0538 primary:** after free-lead **345**, leftover **910J** must score **0** orphans (not 3).  
- Symmetric: after **910J**, leftover **345** must also score **0**.  
- Can invert free-lead residual ranking vs author (short peel vs structured multi).

Ship bar unchanged: dual fair **WR ≥ 0.90 vs v6.0**. Residual def is diagnostic + soft prior truth, not sole accept criterion.

---

## 6. Agent checklist (do now)

1. [ ] Replace “count all mid singles” with **≥3-run exemption** (section 1).  
2. [ ] Keep **pair-adjacent singles as trash** (section 2B / prior pointer).  
3. [ ] Unit tests on 0538-class: after **345**, leftover **910J** → **0** (not 3); symmetric after **910J** → **0**.  
4. [ ] Unit tests on 0609-class: **34567 → 2**, **345678 → 1**.  
5. [ ] Re-run gold residual free-lead / combat soft rank spot checks.  
6. [ ] Dual WR ≥ 0.90 vs v60 before promote.

---

## 7. Related files

| File | Role |
|------|------|
| `RECOMMEND-FREELEAD-RESIDUAL-TRASH.md` | Full FL-RT / CB-RT family + first author correction |
| `RECOMMEND-RESIDUAL-ORPHAN-DEF-FIX.md` | Pair-adjacent must count (partial; still valid) |
| **This file** | **URGENT:** run structure exemption; s258 over-count fix |
| `RECOMMEND-GOLD-HIDDEN-HAND-RECONSTRUCTION-URGENT.md` | Gold/playlog recon hygiene (not dual-ship; 0538 rate cliff was suite recon, not residual) |
| `RECOMMEND-WR90-SELFPLAY.md` | Ship bar |
| `RECOMMEND-FREELEAD-CONTROL-SIGNALS.md` | Control / plan signals |

---

**Author one-liner:**  
`residualOrphans` must count unstructured mid leftovers (including pair-adjacent), **not** cards that still form a remaining **≥3 straight of singles**.  
**After playing 345, leftover 910J = 0 trash (not 3).**
