# AUTHOR MANDATE — Gold-suite / reconstructed hidden hands (eval integrity)

**File:** `john_uploads/RECOMMEND-GOLD-HIDDEN-HAND-RECONSTRUCTION-URGENT.md`  
**Stamped:** 2026-07-18  
**Amended:** 2026-07-18 — clarify priority: **not** a live dual-champion bug; **yes** gold/playlog eval hygiene + future opp-unknown inference  
**Type:** Gold-watcher dirty via content/mtime (eval tooling, not ship-policy core)  
**Audience:** Grok Build / PAIR / evolve / gold dual-path / any script that builds a full `state` from playlog or gold TRAIN rows  
**Ship bar unchanged:** dual fair **WR ≥ 0.90 vs v6.0 / v60**

---

## 0. Priority — what this is / is not (author clarification)

### 0.1 Does **not** block the dual champion

| Path | Affected by densest-low reconstruction bug? |
|------|:-------------------------------------------:|
| **Live dual / PAIR fair vs v60** (`createGameState` full deals + determinize) | **No** |
| **In-game AI** (real remaining cards in state) | **No** |
| Absolute WR / ship ladder | **No** — recon does **not** change dual fair WR |

The champion does **not** “have this problem” on the product dual path.  
Do **not** pause dual/PAIR ship work solely for this file.  
Do **not** claim “0268+ uses correct recon” for dual WR peeks — dual never needed this fix.

### 0.2 Where it **does** matter (eval integrity — still do this)

| Path | Broken without fair recon? |
|------|:--------------------------:|
| Gold-hand BR rates from `handBefore` + `handSizesBefore` | **Yes** |
| Playlog mid-hand replay / residual free-lead “why this move?” | **Yes** |
| Soft weights / narratives tuned on **corrupt gold rates** | **Yes** (wasted / misleading) |

**Priority label:**

- **High for diagnostics / gold BR tables** — do not trust reconstructed rates until fixed.  
- **Not ship-blocking** for live dual champion vs v60.  
- Treat as **eval hygiene**, not “champ peeks” or “champ dual is wrong.”

### 0.3 Author incident (why we noticed)

On **IMG_0538** (free-lead gold **345**, suite often diagnosed single **3**):

| Reported BR signal (broken recon) | Fair remaining-deck sample |
|-----------------------------------|----------------------------|
| `rate(345) ≈ 0`, `rate(3) ≈ 1` | Artifact |
| Author: **345** backed by **910J + AA + 22** | **345 ≫ 3** (~0.99 vs ~0.70 WR class) |

### Root cause (reconstruction bug — suite only)

Gold playlog rows often give:

- actor `handBefore`
- `handSizesBefore` (opp lengths)
- optional `currentComboBefore` / history

**Broken pattern (seen in suite sims):**

```text
remaining = deck − myHand   // sorted low→high
oppHand   = remaining.slice(0, oppN)   // densest lows only
```

Example pathol opp multiset on 0538-class:

```text
333 444 555 66
```

Then `determinize()` only **shuffles cards already in opp hands** — it does **not** re-sample the full unknown deck.  
Seeds change order, **not multiset** → identical bogus rates across seeds (`rate` cliff 0 vs 1).

After free-lead **345**, that illegal opp always answers **345/456** and climbs → BR “proves” gold is a loss.  
That is **not** an author residual story and **not** a dual-ship failure; it is **gold-eval corruption**.

### 0.4 Peeking / privacy (unchanged)

Correct reconstruction still **must not peek**:

- Unknown pool = deck − **deciding seat’s hand** − **publicly played** cards  
- Never inject the **true** private opp hand for imperfect-info BR  
- AI opponent does **not** get the hero’s exact hand as ground truth  

This mandate fixes **fair sampling of unknowns**, not perfect-info cheating.

---

## 1. Mandate — correct reconstruction (gold / playlog tooling)

### 1.1 Legal card universe

When rebuilding a position for AI / BR / residual / gold diagnostics from incomplete logs:

**Hidden (unknown) cards may only be sampled from:**

```text
FULL_DECK
  − my current hand
  − all cards already played by me (any prior trick / event)
  − all cards already played by opponents (any prior trick / event)
  − any other publicly known exhausted cards (e.g. finished players’ dumped cards if tracked)
```

**Must never include:**

| Forbidden | Why |
|-----------|-----|
| Cards in **my hand** | Known private; double-count / impossible deal |
| Cards I **already played** earlier in the hand/game | No longer in any hand |
| Cards **opp already played** earlier | No longer in any hand |
| “First N sorted remaining ranks” as a fixed opp hand | Densest-low bias; ruins free-lead seq BR diagnostics |

### 1.2 Randomizing remaining hands (baseline — required for suite)

For 2p with known sizes `[myLen, oppLen]`:

```text
1. pool = legal unknown cards (section 1.1)
2. assert pool.length === sum of unknown hand sizes
   (or pool.length >= oppLen when other seats/history incomplete — document shortfall)
3. shuffle(pool, rng)
4. assign opp hands by handSizesBefore (or deal all hidden seats from pool)
5. my hand = exact handBefore (authoritative)
```

**Randomizing the remaining hands is fine** and is the **default** for gold-suite / playlog reconstruction.

### 1.3 `determinize` consistency

Imperfect-info search already does:

```text
pool = union of non-hero hands in state
shuffle → re-deal to those seats by size
```

So **the multiset stuffed into non-hero hands at root must already be a fair sample of the true unknown universe**.  
If root opp is `slice(0,n)` lows, every det trial is still only lows.

**Rule:** fix reconstruction **at state build time** for gold/playlog tools. Do not assume search det will repair an illegal multiset.  
Live dual states already carry a real multiset from the deal — no change required there.

### 1.4 Where to fix (implementer checklist)

| Location / pattern | Action |
|--------------------|--------|
| `evolve/*gold*` state builders | Use section 1.1–1.2 |
| `GOLD-RECS-PLAYLOG-TRAIN` / MAP replay | Same |
| PAIR / residual combat census sims that rebuild from handBefore | Same |
| Any `makeState(handBefore, handSizes)` helper | Centralize one correct `reconstructHiddenHands(...)` |
| Dual fair PAIR vs v60 / `createGameState` | **Out of scope** (already correct) |
| Unit tests | See section 3 |

**Do not** publish free-lead BR conclusions from playlog hands as “AI truth” until the helper is shared and tested.  
**Do** continue dual/PAIR ship work in parallel.

---

## 2. Future analysis — opponent unknown-hand inference (still stands)

**Reserved for future analysis / later testing runs.**  
Baseline uniform random reconstruction (section 1) is enough for suite integrity.  
**This section remains author-desired** and is **not** cancelled by the dual-champion clarification.

### 2.1 Pass-inference prior on opp holdings

If the opponent **previously PASSed** on a specific **single** or **multi** combo, there is a **strong chance** they do **not** hold any **strictly higher** legal beater of that same class — **unless** they were **saving high cards** early (control / 2s / bombs).

**Implication for future samplers / analysis:**

- When building or reweighting random remaining hands, **down-weight or exclude** deals where opp holds “obvious” beaters of a combo they already passed on.
- Still allow rare “sandbag” worlds (saved 2 / A / bomb) with **low prior**, especially early-game passes.
- Apply per combo type:
  - passed on single X → fewer worlds with single Y > X (except sandbag prior)
  - passed on pair / seq / doubleseq of top T → fewer worlds with higher same-type beaters

Use for:

- richer gold/playlog BR diagnostics  
- future imperfect-info experiments  
- **not** a requirement for dual fair ship ladder until calibrated dual-safe

### 2.2 Suggested future API (non-normative)

```text
sampleHiddenHands({
  myHand,
  playedCardsGlobal,      // all publicly played cards
  handSizes,
  passHistory,            // optional: [{seat, againstCombo}]
  mode: 'uniform' | 'pass-informed',
  sandbagPrior: 0.05..0.15
})
```

`uniform` = section 1 (suite baseline).  
`pass-informed` = **future analysis** (section 2.1) until proven dual-safe.

### 2.3 Do not confuse with residual definition

- Residual orphan / run-structure fix: `RECOMMEND-RESIDUAL-ORPHAN-RUN-STRUCTURE-URGENT.md` (search policy)  
- This file: **gold/playlog deal reconstruction + future opp-unknown inference**  
They are independent (0538 rate cliff was reconstruction-dominant in suite; residual over-count was a separate s258 issue).

---

## 3. Required unit / integration tests (suite tools)

### 3.1 Universe integrity

1. Reconstructed non-hero hands ∩ my hand = ∅  
2. Reconstructed hands ∩ any historically played card = ∅  
3. Multiset union of all hands + played = full deck (or documented incomplete log)  
4. Never use sorted-`slice(0,n)` as default opp fill in gold helpers  

### 3.2 Regression: IMG_0538-class free-lead BR (diagnostics)

On gold **345** hand with **correct** random hidden reconstruction (many seeds):

- Must **not** systematically report `rate(345) ≈ 0` and `rate(3) ≈ 1` solely from densest-low opp.  
- Fair aggregate: **345** win-rate class **≫** single **3** (author direction).  
- BR may choose **345** when rates are fair (exact modal not mandated if other gold lines also strong, e.g. 910J).

### 3.3 Seed stability check

If rates are **bit-identical** across many seeds on a reconstructed free-lead, treat as **smell test failure** (likely fixed multiset / pathol reconstruction).

### 3.4 Dual fair control

A dual fair N-game peek vs v60 **before vs after** landing recon helpers should be **statistically unchanged** (recon is not on that path). If dual WR jumps, something else changed — investigate.

---

## 4. Repercussions (scope = gold diagnostics, not dual WR)

After fixing gold-suite reconstruction:

| Area | Expected effect |
|------|-----------------|
| Free-lead BR `rate` tables on **gold hands** | Many historical “cliffs” and rankings **invalidate** |
| Narratives “AI hates 345 on 0538” from suite | Re-verify under fair recon |
| Soft residual / BRD **if** tuned on corrupt gold rates | May need re-check |
| **Live dual WR vs v60** | **No automatic change** from recon alone |
| Ship metrics | Still primary; gold diags become trustworthy again |

**Author mandate:** after suite recon lands, **re-evaluate gold-hand conclusions** that depended on reconstructed BR. Do not treat pre-fix gold BR tables as ground truth.  
**Do not** re-litigate dual ship solely because recon landed.

Order of operations:

1. Land shared correct reconstruction for **gold/playlog tools** (section 1) + tests (section 3).  
2. Re-run gold free-lead / combat BR spot suite (0538, 0609, residual family).  
3. Only retouch soft weights if still needed **and** evidence is dual-safe.  
4. Later: pass-informed unknown-hand analysis (section 2) — **still stands**.

---

## 5. Agent checklist

### Suite integrity (do when touching gold BR)

1. [ ] Add shared `reconstructHiddenHands` (or equivalent) using **deck − myHand − all played**.  
2. [ ] Replace gold-suite `pool.slice(0, oppN)` / sorted-low fills.  
3. [ ] Wire playlog history so **played cards** are excluded when eventIndex > deal.  
4. [ ] Unit tests: disjointness + 0538-class fair BR direction.  
5. [ ] Mark pre-fix gold BR diagnostics **stale** in NOTES.  

### Explicitly not required for dual ship

6. [ ] ~~Block PAIR/dual accepts on recon~~ — **do not**; dual path already OK.  
7. [ ] Dual WR ≥ 0.90 vs v60 remains the **ship** bar (independent of this file).  

### Future analysis (still desired)

8. [ ] (Future) pass-informed reweight of opp unknown hands — section 2; not a dual blocker.

---

## 6. Related files

| File | Role |
|------|------|
| **This file** | Gold/playlog hidden-hand reconstruction + future opp-unknown inference |
| `RECOMMEND-RESIDUAL-ORPHAN-RUN-STRUCTURE-URGENT.md` | Residual def (≥3-run leftover = 0 trash) — **policy** |
| `RECOMMEND-RESIDUAL-ORPHAN-DEF-FIX.md` | Pair-adjacent still trash |
| `RECOMMEND-FREELEAD-RESIDUAL-TRASH.md` | FL-RT / CB-RT family |
| `RECOMMEND-WR90-SELFPLAY.md` | Ship bar (dual fair) |
| `GOLD-RECS-PLAYLOG-TRAIN.jsonl` | Gold hands / events to reconstruct carefully |

---

**Author one-liner:**  
Gold-suite densest-low opp fills corrupt **diagnostics**, not live dual ship. Sample unknowns from **deck − my hand − all played** (randomize). Champion dual already OK. **Future:** pass-informed priors on what opp is unlikely to hold after a pass — still stands. Until suite recon lands, **don’t trust reconstructed gold BR rates** as AI truth.
