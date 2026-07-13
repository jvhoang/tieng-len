# Ladder v9.2 restart analysis — pure freeze v9.1 baseline

**Date:** 2026-07-13  
**Policy under test:** live `search.js` ≡ pure v9.1 (`d7f053a` / ladder restart baseline; MD5 matches ship, require path `./engine.js` only)  
**Method:** reconstruct human-seat state from export `handBefore` / `currentComboBefore` / `handSizesBefore`; compare human cards vs **`expertPolicy` only** (not full GM search)

---

## 1. Source

| Field | Value |
|-------|-------|
| **Path** | `/Users/johnhoang/Downloads/tienlen-playlogs-1783931122937.json` |
| **mtime** | 2026-07-13 03:25 local |
| **exportedAt** | `2026-07-13T08:25:22.916Z` |
| **Total games** | **158** |
| **2p vsAI completed** | **152** (140 human wins, 12 AI wins) |
| **Other** | 5 hotseat, 1×4p |
| **GitHub issues** | `evolve/issues` #1–#103 only (refreshed ~2026-07-12); **no newer than Downloads export** |
| **Human decisions scored** | **1218** (2p vsAI only) |

Prior CF corpus (`evolve/playlog-index.json`, 97 completed 1v1 issues) is a **subset** of older GitHub exports; the Downloads file is the **newest full local export**.

---

## 2. Human vs pure-v91 `expertPolicy` match rates

| Scope | N | Exact | Rank-level | Exact rate | Rank rate |
|-------|--:|------:|-----------:|-----------:|----------:|
| **All 2p vsAI** | 1218 | 789 | 817 | **0.648** | **0.671** |
| Free-lead | 504 | 334 | 351 | 0.663 | 0.696 |
| Combat | 714 | 455 | 466 | 0.637 | 0.653 |
| Recent window (≥07:00Z Jul 13, 5 games) | 32 | 22 | 22 | **0.688** | **0.688** |

Suit-only gaps (rank match − exact): **28** decisions (~2.3%) — not policy.

### By historical build stamp of the *played* game (policy under test is still pure v91)

| Build stamp in log | N | Exact | Rank |
|--------------------|--:|------:|-----:|
| (no stamp / early) | 908 | 0.641 | 0.664 |
| v9.0 | 123 | 0.659 | 0.683 |
| v9.1 freeze stamp | 74 | 0.676 | 0.703 |
| v9.2 @ 05:15 | 49 | 0.612 | 0.633 |
| v9.2 @ 07:15 (screenshot window) | 32 | 0.688 | 0.688 |

**Note:** full GM `getAIMove` CF (hidden-info) historically sat ~**0.614** on the 97-issue corpus — lower than expert-only on this export because search/BR can diverge further from pure expert. Expert match is an **imitation metric**, not dual WR.

**Artifacts (regenerated this run):**

- `evolve/playlog-human-vs-live-divs.json` — 429 div samples + agree/disagree  
- `evolve/playlog-strategy-inference.json` — class histogram + residual score  

---

## 3. Top diverge classes (pure v91 expert)

Disagree = **429**. Residual on both-play divs: **human better residual 186 / expert better 48 / tie 89** — humans preserve structure far more often when they disagree.

| Rank | Class | N | Free/Combat | Reading |
|-----:|-------|--:|-------------|--------|
| 1 | **`H_play_E_pass`** | **76** | 0/76 | Human **contests** cheap mid multi; expert **soft-passes** (handLen≥11, omin≥7, curTop&lt;8 **before** cheapLegals) |
| 2 | **`H_overkill_E_minimal`** | **59** | 0/59 | Human climbs (higher single/multi top); expert min-beats |
| 3 | **`H_2_E_non2`** | **53** | 17/36 | Human burns **2** (or 22 free-lead); expert keeps 2 / plays non-2 |
| 4 | **`E_longer_multi_H_shorter`** | **47** | 47/0 | Expert free-leads **longer** multi; human shorter multi / pair |
| 5 | **`H_minimal_beat_E_overkill`** | **42** | 0/42 | Human min-beats; expert overkills (structure-climb / wrong single) |
| 6 | **`H_single_E_multi`** | **38** | 38/0 | Human trash/single free-lead; expert multi-always |
| 7 | **`H_pass_E_play`** | **30** | 0/30 | Human folds high multi/2 answers; expert contests |
| 8 | **`H_diff_multi`** | **26** | 18/8 | Same multi-class, different ranks/composition |
| 9 | **`H_longer_multi`** | 15 | mostly free | Human longer multi than expert |
| 10 | **`H_trash_first_E_high_multi`** | 13 | free | Gold-adjacent trash-before-control (0514 theme) |

### Class detail that matters for dual

1. **`H_play_E_pass` (76)** is almost entirely **deep midgame multi** (hand 11–13, omin 7–11, facing tops 3–7). This is the **v9.1 dual-tuned soft-pass** (pass fires *before* cheap multi). Full GM CF historically had `humanPlayAltPass=0` — search often **overrides** expert pass. Reversing this globally is a dual risk.  
2. **2-tempo (`H_2_E_non2=53`)** faces Q/J/9 band often; free-lead 22-before-trash also appears (gold 0518).  
3. **Free-lead length (`E_longer_multi=47`, `H_single_E_multi=38`)** — multi-always vs human short multi / trash. Residual score favors human.  
4. **Min-beat is split** (overkill 59 vs minimal 42) — do **not** flip to broad overkill or broad min-beat; only structure-safe soft min-beat.

---

## 4. REJECT levers (historically dual-hurt unless tightly gated)

| Lever | Evidence | Status |
|-------|----------|--------|
| **Series-2 bulk doubleseq force** (`forceMultiFreeLead` always / always dseq free-lead) | Dual **27/50 = 0.54 FAIL** (`v92-series2-vs-v91.json`); burns bomb-class early | **REJECT** unless plan-shaped gate only |
| **Broad P1–P5 / expertScore rewrite** | **0.48 / 0.44 FAIL** (`v92-p15*`) | **REJECT** |
| **Broad overkill combat** | Conflicts with gold min-beat + residual; mixed human signal | **REJECT** as bulk |
| **COMBATV91 / broad soft-pass expansion or reversal** | Soft knobs silent or dual-regress; pass band ladder-tuned | **REJECT** ungated |
| **Always full free-lead enforce after exploit** | Dual harm (structure notes) | **REJECT** |
| **Broad structure-pass** (`safeCost≥16` mid multi fold) | Dual over-passive | **REJECT** |
| **Exact depth 20 bulk** | **33/50** worse + hung (LADDER-STATUS) | **REJECT** as sole lever |

---

## 5. Top 5 dual-safe lever hypotheses

Ranked by **(1) dual strength potential vs freeze v91**, then **(2) gold / human compatibility**. Prefer small orthogonal knobs — not bulk rewrites.

### #1 — Budget / BR / exact package *(highest dual potential, zero gold risk)*

| | |
|--|--|
| **Why dual** | Live already asymmetric vs freeze budgets; same-policy dual needs search-quality edge. Time+BR multiplies exact midgame + combat soft BR. Pure env — does not move `expertPolicy` gold paths. |
| **Why gold OK** | Expert-mode / easy tests ignore search budgets. |
| **Playlog link** | Not imitation; enables any later policy delta. Softly helps free-lead ranking resolution (`E_longer_multi` / multi ties). |
| **Impl hint** | Env-only: `TIENLEN_V8_MS=280 TIENLEN_BR_TRIALS=96 TIENLEN_V8_ITERS=200 TIENLEN_V8_SIMS=480 TIENLEN_EXACT=1` vs freeze defaults; see `evolve/NOTE-budget-lever-hypotheses.md`. Optionally forward `softSamples`/`flRoot`/`combatRoot` in `ai.js` (not policy). |

### #2 — 2-tempo gate tweak *(only historically dual-proven decision lever)*

| | |
|--|--|
| **Why dual** | probe-TWO vs v90: **36/50** vs BASE **35/50**; flipped seed `20510036`. Still the only soft decision path that moved GM dual WR. |
| **Why gold OK** | Narrow gate (already shipped in v91 for 8–10 tops / omin≤3). Extend **one axis only**. |
| **Playlog link** | **`H_2_E_non2` = 53** (combat Q/J/9 + free-lead 22). |
| **Impl hint** | In `expertPolicy` mid-top 2-tempo (~L391–405): keep base `omin≤3`; **add** `omin===4 && handLen≤6 && infoC.trashCount≥1` only. Do **not** rewrite soft-pass tail again in the same probe. |

### #3 — Free-lead residual-only ranking *(no doubleseq force)*

| | |
|--|--|
| **Why dual** | Soft sort key among multi candidates — less path rewrite than multi-always kill or dseq force. Orthogonal to #1 budgets (more sims resolve residual ties). |
| **Why gold OK** | Aligns series-3 residual themes (0517 residual pairs, 0514 trash when no 22) **without** series-2 bulk dseq. |
| **Playlog link** | **`E_longer_multi_H_shorter` 47**, **`H_single_E_multi` 38**, **`H_trash_first` 13**; residual score 186 vs 48. |
| **Impl hint** | In `pickFreeLeadHard` multi `pool` sort (~L630–637): when `|topA−topB|≤1`, key **`residualQuality` / residual pairs first**, then **prefer shorter** multi (pair/triple), then expertScore. **Never** unconditional doubleseq return. |

### #4 — Combat min-beat soft (structure-safe only)

| | |
|--|--|
| **Why dual** | Soft tie-break only when structure cost ties — avoids broad combat rewrite that dual-failed. |
| **Why gold OK** | Matches structure-break singles + residual maxRun (0498/0520 themes) without forcing overkill. |
| **Playlog link** | **`H_minimal_beat_E_overkill` 42** (and counters **`H_overkill` 59** — so keep soft, not hard min). |
| **Impl hint** | In `expertScore` combat singles after `structureBreakCost`: if both candidates `sbc≈0`, add **small gap penalty** (`+0.15 * gap` or prefer lower top in `orderLegals` when residual run/pairs equal). Do **not** global min-beat rewrite. |

### #5 — Exploit multiTie / short-multi soft

| | |
|--|--|
| **Why dual** | Soft free-lead BR tie-break only; probe multiTie alone was silent under GM+exact, but cheap and stacks with #1/#3. |
| **Why gold OK** | Does not touch expert free-lead hard path when BR not used; gold expert mode unaffected. |
| **Playlog link** | Short multi preference vs **`E_longer_multi` 47**. |
| **Impl hint** | In free-lead BR scoring (~L1045–1049): raise short-multi `multiTie` **0.005 → 0.008**, or add `+0.002 * residualPairsAfter`. Pair with BR trials (#1), not alone. |

---

## 6. Probe order (recommended)

1. **#1 budget package** N=25 dual vs freeze v91 (det RNG) — establish search-quality ceiling.  
2. **#2 2-tempo one-axis** alone N=30/50 — only policy delta with historical dual flip.  
3. Stack **#3 residual free-lead sort** if #2 flat; gold recheck 0498–0521.  
4. **#4 min-beat soft** only if structure combat still diverges on gold.  
5. **#5 multiTie** as last soft stack under elevated BR.

**Do not** open with bulk free-lead enforce, bulk pass reverse (`H_play_E_pass`), or series-2 dseq force.

---

## 7. Comparison to prior series-3 analysis

| Metric | Prior (series-3 live, older dump) | This run (pure v91) |
|--------|-----------------------------------:|--------------------:|
| Agree / disagree | 771 / 447 | **789 / 429** |
| Exact rate (all) | ~0.60 | **0.648** |
| Top class | H_play_E_pass 59, overkill 58 | H_play_E_pass **76**, overkill **59**, 2-tempo **53** |

Pure v91 **matches humans slightly better** on this export than the earlier series-3 inference dump, but dual-failed v9.2 branches show human-align bulk rewrites **destroy** GM-vs-GM strength. Restart from freeze v91 with **orthogonal micro-levers**.

---

## 8. Handoff

- Baseline: pure v9.1 live (`AI_BUILD` id `v9.1`, stamp `2026-07-13T14:00:00Z`)  
- Freeze for dual: `TIENLEN_FREEZE=v91`  
- Gate: N≥50, WR **>0.70**, seed `20260711`, GM vs GM  
- Scratch summary: `$SCRATCH/playlog-analysis-summary.md`
