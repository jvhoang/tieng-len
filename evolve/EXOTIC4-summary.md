# EXOTIC4 — four exotic dual levers from race-base

**Date:** 2026-07-13  
**Scratch:** `$SCRATCH/probes/{BOMB_SAVE,PAIR_FIRST_LEAD,ROOT_EXPAND,COMBAT_MIN_GAP}/` (isolated; main / race-base **not** patched)  
**Base:** race-base (`search.race-base.js` / `ai.race-base.js`, MD5 `5f0c222f…`)  
**Goal:** beat BASE **0.80** N=20, or equal 0.80 with **more residual flips** and no win regs  
**Result:** **all four REJECT**

---

## Dual protocol (faithful max budget)

| Knob | Live | Freeze |
|------|------|--------|
| N / seed0 / stride | 20 / `20260711` / 9973 | — |
| MS / IT / SIMS | 280 / 200 / 480 | 120 / 80 / 160 |
| BR / BRANCH | 96 / 24 | off / 16 |
| exact + exploit | on | exact only |
| dualSelf | **off** | — |
| setExploitOpponent | freeze expert | — |

**BASE reference (prior):** 16/20 = **0.80**  
BASE losses: `20310576, 20320549, 20350468, 20380387`  
BASE W/L: `WWWWWLLWWLWWLWWWWWWW`

---

## Lever designs (isolated `search.js` only)

### 1. BOMB_SAVE
**Where:** `expertPolicy` pure-expensive branch (only bomb/2 answers remain).  
**Rule:** facing **mid multi** (`cur.type !== 'single'`, `curTop < 10`, not bomb-on-table), `handLen ≥ 8`, `omin ≥ 4` → **PASS** (save bombs/2s).  
**Unit:** mid pair of 8s, only legal `22` → BASE plays `22`, BOMB_SAVE **PASS**.

### 2. PAIR_FIRST_LEAD
**Where:** `pickFreeLeadHard` after unanswerable/force-expensive multi, before multi-always length pool.  
**Rule:** `handLen ≥ 10` and `twos ≥ 1` and any non-2 non-bomb **pair** exists → lead **lowest pair** (skip long seq preference).  
**Unit:** free-lead decision diffs on 2/80 seat-hands over first 40 dual seeds.

### 3. ROOT_EXPAND
**Where:** `freeLeadCandidates` candidate construction.  
**Rule:** if `trashCount ≥ 3`, also include **mid singles** rank 5–9 (non-expensive) so MC/MCTS/BR roots can fish/shed beyond multi+trash-only.  
**Unit:** candidate set strictly larger than BASE on 2/80 seat-hands.

### 4. COMBAT_MIN_GAP
**Where:** `expertScore` combat singles gap term.  
**Rule:** when `gap > 2` and top ≥ 9 and not a 2: if `structureBreakCost ≤ 4` (residual structure intact), gap penalty **`gap * 0.25`** instead of **`gap * 0.8`** (encourage climb). Hard break (`sbc ≥ 8`) path unchanged.  
**Unit:** sample climb 9-over-6 score BASE `13.7` → COMBAT_MIN_GAP `12.05` (lower = preferred).

---

## Results — Dual N=20 ranked

| Rank | Probe | liveWins | **WR** | flips vs BASE | regs vs BASE | wall ms | Verdict |
|-----:|-------|---------:|-------:|--------------:|-------------:|--------:|---------|
| T1 | **BOMB_SAVE** | 15/20 | **0.75** | 0 | 1 (`20290630`) | 315k | **REJECT** |
| T1 | **PAIR_FIRST_LEAD** | 15/20 | **0.75** | 0 | 1 (`20290630`) | 358k | **REJECT** |
| T1 | **ROOT_EXPAND** | 15/20 | **0.75** | 0 | 1 (`20290630`) | 315k | **REJECT** |
| T1 | **COMBAT_MIN_GAP** | 15/20 | **0.75** | 0 | 1 (`20290630`) | 312k | **REJECT** |
| — | BASE | 16/20 | **0.80** | — | — | 545k* | reference |

\*BASE wall from prior `BASE-n20-v2` run (same protocol).

**Ranking note:** all four tied at WR **0.75** (−1 vs BASE). Secondary sort (flips, regs) also ties. Listed by task order; no lever outranks another on dual strength.

### Checkpoints (all four identical)

| games | liveWins | WR |
|------:|---------:|---:|
| 5 | 4 | 0.80 |
| 10 | 6 | 0.60 |
| 15 | 10 | 0.667 |
| **20** | **15** | **0.75** |

### W/L vectors

| Build | vector |
|-------|--------|
| BASE | `WWWWWLLWWLWWLWWWWWWW` |
| all EXOTIC4 | `WWWLWLLWWLWWLWWWWWWW` |

### Loss seeds (all four identical)

`20290630, 20310576, 20320549, 20350468, 20380387`

| vs BASE | seeds |
|---------|-------|
| **flips** | *(none)* |
| **regs** | `20290630` |

Step counts: identical across three levers; **PAIR_FIRST_LEAD** only diverged ply count on win seed `20370414` (20 vs 16 steps) but same outcome. Confirms levers can change lines without fixing dual losses.

---

## Gate evaluation

Task gate: **beat BASE 0.80** OR **equal 0.80 with more flips (no win regs)**.

| Probe | WR vs 0.80 | flips | regs | Gate |
|-------|------------|------:|-----:|------|
| BOMB_SAVE | −0.05 | 0 | 1 | **REJECT** |
| PAIR_FIRST_LEAD | −0.05 | 0 | 1 | **REJECT** |
| ROOT_EXPAND | −0.05 | 0 | 1 | **REJECT** |
| COMBAT_MIN_GAP | −0.05 | 0 | 1 | **REJECT** |

**No promote. No merge into race-base / main.**

---

## Interpretation

1. **Shared fragile reg `20290630`** — same dual-loss pattern as AA_SAVE / ENSEMBLE_FL / MULTI_REFUSE when expert-policy / free-lead / score micro-knobs perturb rollouts. Not a BASE residual flip; it is a **BASE win** that many exotic soft levers knock over.
2. **No residual dual-loss flips** — BASE mines `20310576, 20320549, 20350468, 20380387` remain L under all four.
3. **Lever activity verified in unit smoke** (pass vs play, score delta, free-lead/candidate diffs) but full GM dual + BR/exact is dominated by paths where these micro rules do not recover mines and slightly degrade rollout quality on fragile wins.
4. **BOMB_SAVE** is directionally like soft multi-refuse / bomb conservation; dual still wants more contest on some mid multi wars.
5. **PAIR_FIRST_LEAD / ROOT_EXPAND** free-lead root surgery does not flip multi-climb / short mines.
6. **COMBAT_MIN_GAP** mild climb encouragement does not overcome structure/exact exploit selection on N=20.

### Possible next (not run)

- Seed-duel residual-16 only if a future dual hits ≥0.80.
- Narrow BOMB_SAVE to `omin ≥ 6` and `handLen ≥ 10` (less reg on mid race).
- PAIR_FIRST_LEAD only when lowest pair top ≤6 (avoid high-pair free lead).
- ROOT_EXPAND only rank ≤6 trash-adjacent singles, not full 5–9 band.
- COMBAT_MIN_GAP only when `omin ≤ 3` (race climb) rather than all residual-intact gaps.

---

## Main integrity

| File | Status |
|------|--------|
| `tieng-len/search.js` | **untouched** MD5 `5f0c222f1de409caee11787cff28c235` (= race-base) |
| `tieng-len/ai.js` | **untouched** MD5 `7d41d31ec0439b30b6fceaf18b773296` |
| race-base probe copies | **untouched** |
| EXOTIC4 patches | only under `$SCRATCH/probes/{NAME}/search.js` |

---

## Artifacts

| Probe | dual JSON / log | code |
|-------|-----------------|------|
| BOMB_SAVE | `probes/BOMB_SAVE-n20.json`, `.log` | `probes/BOMB_SAVE/search.js` |
| PAIR_FIRST_LEAD | `probes/PAIR_FIRST_LEAD-n20.json`, `.log` | `probes/PAIR_FIRST_LEAD/search.js` |
| ROOT_EXPAND | `probes/ROOT_EXPAND-n20.json`, `.log` | `probes/ROOT_EXPAND/search.js` |
| COMBAT_MIN_GAP | `probes/COMBAT_MIN_GAP-n20.json`, `.log` | `probes/COMBAT_MIN_GAP/search.js` |
| This note | `EXOTIC4-summary.md` | — |

### Return numbers

| Metric | Value |
|--------|------:|
| BASE dual WR | **0.80** (16/20) |
| BOMB_SAVE | **0.75** (15/20) |
| PAIR_FIRST_LEAD | **0.75** (15/20) |
| ROOT_EXPAND | **0.75** (15/20) |
| COMBAT_MIN_GAP | **0.75** (15/20) |
| Promoted | **none** |
