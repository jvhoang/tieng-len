# W24 — Holdout both-lose freeze-identical paths (fair dual ladder)

**Package:** `p_w17_brfltrash` (best)  
**Freeze:** `v91`  
**Holdout A:** `evolve/holdout-A-ch-t20-brfltrash.json` + `evolve/holdout-A-id-t20-brfltrash.json`  
**Full firstdiff:** `evolve/firstdiff-brfltrash-holdout-bothlose-full.json`  
**Recon:** scratch `holdout-recon.json`  
**Opts:** `MS=200 TRIALS=20 SOFT=0 BOTH_SEATS=1` (no SoftN, no promote)

---

## 1. Both-lose seats (challenger lost AND identity lost)

Intersection of CH `liveWin=false` and ID `liveWin=false` on the same `(seed, liveSeat)`.

| # | seed | seat | chSteps | idSteps |
|---|------|------|---------|---------|
| 1 | 20260801 | 0 | 22 | 22 |
| 2 | 20270774 | 0 | 23 | 23 |
| 3 | 20280747 | 1 | 10 | 10 |
| 4 | 20290720 | 1 | 18 | 18 |
| 5 | 20300693 | 1 | 9 | 9 |
| 6 | 20310666 | 1 | 22 | 22 |
| 7 | 20330612 | 1 | 24 | 26 |
| 8 | 20340585 | 0 | 21 | 21 |
| 9 | 20350558 | 1 | 19 | 19 |
| 10 | 20370504 | 0 | 20 | 20 |
| 11 | 20380477 | 0 | 18 | 18 |
| 12 | 20390450 | 1 | 14 | 14 |
| 13 | 20400423 | 1 | 19 | 19 |
| 14 | 20410396 | 1 | 19 | 19 |
| 15 | 20420369 | 0 | 22 | 22 |
| 16 | 20430342 | 1 | 17 | 17 |
| 17 | 20440315 | 0 | 12 | 12 |
| 18 | 20450288 | 1 | 17 | 17 |
| 19 | 20460261 | 1 | 17 | 17 |
| 20 | 20470234 | 0 | 23 | 23 |
| 21 | 20480207 | 0 | 21 | 21 |
| 22 | 20490180 | 1 | 20 | 20 |
| 23 | 20500153 | 0 | 14 | 14 |

- **n both-lose seats:** 23  
- **unique seeds:** 23 (one seat each)  
- **Context:** CH alone-loss vs ID-win: `20320639:s0` only. ID alone-loss vs CH-win: `20320639:s1`, `20360531:s1`.

---

## 2. Full firstdiff census (all both-lose unique seeds)

```
FREEZE=v91 CHALL=p_w17_brfltrash \
SEEDS=<23 unique both-lose seeds> BOTH_SEATS=1 MS=200 TRIALS=20 SOFT=0 \
OUT=firstdiff-brfltrash-holdout-bothlose-full.json \
node evolve/fair-firstdiff.js
```

| metric | value |
|--------|------:|
| **nGames** | **46** (23 seeds × 2 seats) |
| **nDiverged** | **6** |
| **divergeRate** | **0.1304** (~13.0%) |
| **identicalRate** | **0.8696** (~87.0%) |
| classCount | `{ FL_other: 6 }` only |

Prior sample (`firstdiff-brfltrash-holdout-bothlose-sample.json`) was 8 seeds / 16 games → 3/16 (18.75%) diverge; full census settles to **~13%**.

### All 6 divergences (FL-only)

| seed | seat | both-lose? | step | freeze | chall |
|------|------|------------|------|--------|-------|
| 20260801 | 0 | yes | 2 | `6C 6D` | `QC` |
| 20310666 | 0 | no | 3 | `3H 4D 5C 6S` | `6C 6S` |
| 20330612 | 1 | yes | 6 | `KH KC` | `5S` |
| 20380477 | 0 | yes | 0 | `3H 4D 5H 6H` | `3C 3H` |
| 20450288 | 0 | no | 4 | `TS JH QC` | `4C` |
| 20460261 | 0 | no | 0 | `3H 4C 5H 6D` | `3H 3D` |

### Both-lose seat slice

| | n |
|--|--:|
| both-lose seats in census | 23 |
| freeze-identical | **20** |
| freeze-identical & freeze loses | **20** |
| diverged (still both-lose in holdout) | **3** |

**Conclusion:** W17 BR-FL-trash only diverges on a thin free-lead band. **~87% of both-lose seed×seat games are path-identical to freeze**; of the 23 holdout both-lose seats, **20/23 never first-diff at all**. Absolute holdout ~0.52 is mostly identity skill under equal BR.

---

## 3. Freeze-identical sample (3 seeds) — deal-doomed vs midgame skill

Traced with `fair-playout-trace.js` (follow freeze path; nDiffs=0 on all three).

### A. `20300693` seat 1 — **midgame skill (short collapse)**

| | live | opp |
|--|------|-----|
| hand | `3H 3D 4D 5S 9S 9H JS JH JC QS KS 2S 2C` | `3S 4S 5D 7S 7H 7C 8S 8D 8C QD KC AS AD` |
| multiPower | **12** (JJJ, 99, 33, 2×2) | 8 (777, 888, AA) |
| deltaAvg / multi / twos | **+0.85 / +4 / +2** | |

**Trace (9 steps, live loses):**  
1. Climb low seq with **`JH QS KS`** (burns high connected cards)  
2–4. **PASS** on mid triples while still holding **JJJ** and both 2s; opp races out  

**Class:** Not deal-doomed. Expert/search **over-pass** + **high-seq climb tax missing**. BR-FL-trash never fires (combat path).

### B. `20440315` seat 0 — **deal-doomed (weak multi)**

| | live | opp |
|--|------|-----|
| hand | `3S 4S 4D 4C 5D 6C 7D 9C TS QS KC AS 2H` | `6H 6D 7H 7C 8S 8H 8C 9S TC JH AH AD AC` |
| multiPower | **4.5** (only 444) | **10** (66, 77, 888, AAA) |

**Trace (12 steps):** free-lead **`3S 4C 5D`** → climb **`QS KC AS`** → lead `44` → stuck singles `6/7/9/T/2` vs multi fortress.  

**Class:** **Deal-doomed multi structure**. Secondary skill: early multi-always FL + QKA climb. Path freeze-identical entire game.

### C. `20270774` seat 0 — **deal-doomed (control deficit)**

| | live | opp |
|--|------|-----|
| hand | `3C 4C 5S 5D 6C 8D 9D TD JS JH JD KH 2H` | `3H 4H 4D 5H 6D 8S 9C JC KD AH AD 2S 2C` |
| multiPower | 6.5 | 9 |
| high / twos | 2 / 1 | **5 / 2** |

**Trace (23 steps):** climb seq → PASS bomb-ish → burn **`2H` on Ace** → dump JJJ / 55 / trash → stuck **lone `4C`** while opp finishes.  

**Class:** **Deal-doomed control**. Long identity grind; no root lever short of different early expert choices (2-tempo, multi contest).

### Aggregate both-lose classification (heuristic deal strength)

| klass | n | notes |
|-------|--:|-------|
| midgame-skill | 11 | competitive or live-favored multi; freeze path still loses |
| deal-doomed (+short/control) | 8 | multi/high/two deficit |
| skill-short-collapse | 1 | 20300693 |
| diverged-still-loss | 3 | FL_other first-diff but holdout still L |

≈ **half skill-addressable**, ≈ **third pure deal-doomed**, rest already diverge without flipping.

---

## 4. Why BR-FL-trash does not escape identical paths

`p_w17_brfltrash` only edits `bestResponseMove` free-lead candidate set:

1. W14 deep low-pair force (`hand≥11`, `omin≥6`)  
2. W17 trash-first when `hasControl && trashCount≥1 && multiHi` (`hand 8–12`, `omin≥4`)

It does **not** touch:

- `expertPolicy` combat pass-disc / soft-pass bands  
- `orderLegals` / `expertScore`  
- `pickFreeLeadHard` multi-always  
- combat BR branch (`cheapLegals` → `orderLegals`)

On freeze-identical both-lose traces, decisions are almost all **combat pass/play** or **expert multi FL**, so W17 is a no-op → shared freeze path → both lose.

---

## 5. Three architecture levers (must change expertPolicy / orderLegals early)

### L1 — `expertPolicy` multi-contest (answerable mid multi)

**Where:** `expertPolicy` combat, **before** cheap gate and soft-pass bands  
(`handLen≥11 && omin≥7 && curTop<8` multi fold; `handLen≥9/10 && curTop<9` soft-pass).

**Change:** If any legal play is same-type multi with higher top than `cur`, and `omin ≤ 5` (or race `omin ≤ handLen - 3`), **force** `orderLegals(answerable)[0]` instead of pass.

**Hits:** 20300693 JJJ-pass on triple 7/8; many midgame-skill over-passes.  
**Not BR-FL:** pure expertPolicy early combat.

### L2 — `orderLegals` / `expertScore` seq-climb tax

**Where:** shared `expertScore` used by `orderLegals` (expert, rollouts, combat BR root order).

**Change:** Penalty when climbing **seq** with play top ≥ Q (`rank≥9`) while `curTop ≤ 5` **and** hand retains unpaired multi or `twos ≥ 1`. Prefer low multi answer or pass-to-reclaim trash.

**Hits:** 20300693 `JH QS KS`; 20440315 `QS KC AS`.  
**Diverges early** on both identical skill and some deal-doomed traces.

### L3 — `pickFreeLeadHard` structure-aware (replace multi-always)

**Where:** `pickFreeLeadHard` + `freeLeadCandidates` (expert FL **and** BR FL root **before** W17 filter).

**Change:** When multiPower is weak (single multi family / naked low trip only), prefer:

- trash single if `hasControl`, or  
- unanswerable multi only  

instead of v5 multi-always.

**Hits:** 20440315 step-0 `345`; other step-0 identity FL paths.  
**Diverges at first free lead** — maximum firstdiff leverage without SoftN.

---

## 6. Recommended next package direction (do not promote yet)

| priority | lever | expected firstdiff effect |
|----------|-------|---------------------------|
| 1 | L1 multi-contest | raise divergeRate on combat both-lose; target skill-short + midgame |
| 2 | L2 seq-climb tax | change early combat order even when pass/play same class |
| 3 | L3 structure-aware FL | convert more of the 87% identical mass at step 0–4 FREE |

**Do not** stack more BR-FL-only filters (W17 already best package; holdout still ~identity).  
**SoftN forbidden** for this ladder branch.  
**Gate:** DEV fair dual must not drop; holdout both-lose freeze-identical rate should fall below ~70% on a re-run of this census before promotion talk.

---

## 7. Artifacts

| path | role |
|------|------|
| `evolve/firstdiff-brfltrash-holdout-bothlose-full.json` | full 46-game census |
| `evolve/firstdiff-brfltrash-holdout-bothlose-sample.json` | earlier 8-seed sample |
| `evolve/holdout-A-ch-t20-brfltrash.json` | CH holdout |
| `evolve/holdout-A-id-t20-brfltrash.json` | ID holdout |
| scratch `holdout-recon.json` | machine-readable recon + levers |
| this note | human summary |

**Headline numbers to quote:**  
**divergeRate = 6/46 = 0.130** · **both-lose freeze-identical = 20/23 seats** · **3 concrete levers = L1 multi-contest, L2 seq-climb tax, L3 structure-aware FL**.
