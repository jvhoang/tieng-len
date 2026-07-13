# Deep analysis: local playlog export + series-3 gold

**Source:** `/Users/johnhoang/Downloads/tienlen-playlogs-1783931122937.json`  
**Exported:** 2026-07-13T08:25:22Z · **158 games** (141 human wins, 12 AI wins, 5 abandoned)

## Method

Playlog events do **not** store a hint suggestion on human turns (`ai` is only attached to AI actor moves).  
For each human decision we:

1. Reconstruct state from `handBefore`, `currentComboBefore`, `handSizesBefore`.
2. Run **current live** `expertPolicy` (series-3) as simulated AI from the human seat.
3. Compare human cards vs live (exact + rank-level).

## Headline match rates (current live vs historical human)

| Games played under build | Human decisions | Live match rate |
|--------------------------|-----------------|-----------------|
| v9.2 @ 07:15 (screenshot window) | 32 | **0.56 exact** → **~0.75 after suit-order** |
| All 2p completed (current policy) | ~1218 | **~0.60** |

Screenshot-window (**≥07:30 UTC Jul 13**, 5 games on stamp 07:15): **24/32 exact match (75%)** after series-3; remaining 8 are mostly:

| Type | Count | Notes |
|------|-------|-------|
| Suit-order only (same ranks) | several | e.g. 2H2C vs 2C2H — not policy |
| Human low multi vs live high multi | 2–3 | Opening 33 vs AA; answer 3456 vs 10JQK |
| Human save K vs live 2 | 1 | face Q: human K, live 2 (human keeps 2 for later) |
| Human minimal 10 vs live K | 1 | face 6: human 10, live K |
| Human 2 vs live residual 7 (omin=1) | 1 | **log gold** — we aligned policy to human |

## Series-3 gold fingerprints in the export

| Gold | Log game | Human | Live (series-3) | Status |
|------|----------|-------|-----------------|--------|
| **0517** free 10-J-Q-K | g_mriwqrjo… 07:35 | 10♥ J♥ K♣ Q♠ | 10-J-Q-K | **MATCH** |
| **0518** free 22 | same game end | 2♣ 2♥ | 22 | **MATCH** |
| **0519** combat 10-J-Q | g_mriwt9t9… 07:37 | 10♥ J♣ Q♣ | same | **MATCH** |
| **0521** free 6789 omin=1 | g_mriwwj6w… 07:39 | 6-7-8-9 | same | **MATCH** |
| **0514** trash 5 | g_mriwjwji… 07:30 later free | 5♦ | 5♦ | **MATCH** |
| **0516** 2 vs K | same game face K♦ | 2♠ | 2♠ | **MATCH** |
| **0520** residual | g_mriwwj6w face 5♥ omin=1 | **2♦** (not 7) | was 7 → **now 2** | **Aligned to log** |

### Important log vs screenshot nuance (0520)

- **Screenshot text:** beat 5 with **7** not **6** (residual 4-run).  
- **Actual human play** in the same shape with **omin=1 + 2s:** **2** for sure control (39s think).  
- Policy now: **omin≤1 → 2**; **omin>1 → residual maxRun (7 not 6)**.

## Why humans still diverge (learnable, not always “AI wrong”)

1. **Low pair open vs high pair open** (33 vs AA): human dumps volume early; live still loves high multi/pairs for control.  
2. **Answer low seq with low residual seq** (3456 vs 10JQK): human keeps high package; live sometimes spends control multi early (mirror of 0510 pass tension).  
3. **K before 2** when not sure 2 is needed yet — tempo of 2s.  
4. **Near-go-out long seqs** (9-card 3→J): human empties; live shorter multi.

These are **plan style** differences; series-3 covers the explicit screenshot gold + log-confirmed control plan. Remaining gaps are candidates for ladder probes, not silent reverts of gold.

## Human plan themes (near-gold corpus)

From recent v9.2 games + gold shots:

1. **Control before trash finish** when holding 22 (0517/0518).  
2. **Trash before mid multi** when lacking 22 (0514).  
3. **Residual multi** — don’t orphan pairs (0517/0519).  
4. **Residual singles** — keep longest remaining run (0520b).  
5. **Sure outs vs 1-card** — 2 or unanswerable multi (0520a/0521).  
6. **Don’t break AA/KK for cheap** unless plan is clear (0516).

## Artifacts

- Export: Downloads `tienlen-playlogs-1783931122937.json`  
- CF div dump: `evolve/playlog-human-vs-live-divs.json` (if regenerated)  
- Series-3 note: `evolve/NOTE-series3-control-plan-gold.md`
