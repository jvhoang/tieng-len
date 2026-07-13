# Gold-layer dual map (ladder restart)

**Date:** 2026-07-13  
**Protocol dual:** live (commit `search.js`+`ai.js`) vs freeze **v91** GM, N=20, seed `20260711`, target 0.70  
**Protocol gold:** HEAD `test-search.js` gold suite (IMG0498–0521 + P1/P3/P5) vs each commit’s isolated search/ai  
**Artifacts:** scratch `gold-layer-dual-map.json`, per-commit `layer-<sha>/dual-n20.json` + `gold-full.log`  
**Repo restore:** `search.js` + `ai.js` restored to **d7f053a** (pure v9.1) after runs

> Live GM budget (150ms / 120 iters) is higher than freeze (120ms / 80 iters), so pure-v91 live can post dual WR ≫ 0.5 vs the freeze policy even when policy text is “same generation.”

## Summary table

| commit | label | gold fails | dual N=20 WR | wins | notes |
|--------|-------|------------|--------------|------|-------|
| **d7f053a** | pure v9.1 ship | **25** | **0.80** | 16/20 | Dual king. No structure-gold. Baseline restart. |
| **acf108c** | series-1 IMG_0498–0504 | **18** | **0.75** | 15/20 | Fixes series-1 expert cases; dual still strong. |
| **8a713e2** | series-2 IMG_0505–0513 | **8** | **0.70** | 14/20 | Clears series-2; dual on target gate. |
| **b16e087** | gold-fix narrow | **8** | **0.65** | 13/20 | Same gold as series-2; dual slips below 0.70. |
| **bc9e381** | series-3 control plan | **2** | **0.50** | 10/20 | Almost all gold; dual cliff. Fails: IMG0520a, P3. |
| **9b20d49** | playlog-align series-3 | **1** | **0.50** | 10/20 | Best gold (only P3 left); dual still 0.50. |

## Ranked by dual WR (primary)

1. **d7f053a** — 0.80 (16/20) — gold fails 25  
2. **acf108c** — 0.75 (15/20) — gold fails 18  
3. **8a713e2** — 0.70 (14/20) — gold fails 8  
4. **b16e087** — 0.65 (13/20) — gold fails 8  
5. **9b20d49** — 0.50 (10/20) — gold fails 1 *(tie dual, better gold than bc9e381)*  
6. **bc9e381** — 0.50 (10/20) — gold fails 2  

## Gold residual detail (HEAD suite)

| commit | residual fail IDs |
|--------|-------------------|
| d7f053a | IMG0498–0503, 0505–0507, 0510–0511, 0513–0514, 0516–0518, 0520a/b, 0521, P1, P3, P5 |
| acf108c | IMG0505–0507, 0510–0511, 0514, 0517–0518, 0520a/b, 0521, P1, P3 |
| 8a713e2 | IMG0514, 0517–0518, 0520a/b, 0521, P1, P3 |
| b16e087 | same as 8a713e2 (gold-fix does not change this suite score) |
| bc9e381 | IMG0520a, P3 |
| 9b20d49 | P3 only |

## Interpretation

### Dual cliff

- **Dual-safe band:** d7f053a → acf108c → 8a713e2 (WR ≥ 0.70 on this N=20 seed).  
- **Soft drop:** b16e087 gold-fix (0.65) — same gold residual as series-2, costs dual.  
- **Hard cliff:** series-3 (`bc9e381`) and playlog-align (`9b20d49`) both **0.50** dual — gold gains fully paid by dual.

### Dual-safest gold layer

- **Overall dual-safest:** `d7f053a` (pure v9.1) — **WR 0.80**, but **no gold**.  
- **Dual-safest among gold-improving layers:** **`acf108c` (series-1)** — WR **0.75**, gold fails 25→18.  
- **Best dual/gold tradeoff on-gate:** **`8a713e2` (series-2)** — WR **0.70** with gold fails **8** (series-1+2 cleared).

### Ladder restart recommendation

1. **Freeze / live baseline:** ship from **d7f053a** pure v9.1 (already restored in tree).  
2. **Do not stack series-3 / playlog-align wholesale** — dual collapses to coin-flip vs freeze v91.  
3. **Re-apply gold surgically under dual gate:**  
   - Prefer **series-1** (`acf108c` ideas) first (dual-safest gold step).  
   - Then selective **series-2** structure (toward `8a713e2`) if dual holds N≥20 ≥0.70.  
   - Treat series-3 / playlog / P1–P5 as **gated micro-patches**, not bulk merges.  
4. **Skip bulk `b16e087`** unless it gains gold; here it only hurt dual.

## Method notes

- Each commit’s `search.js`+`ai.js` extracted to isolated `scratch/layer-<sha>/` (gold ran there with a **copy** of HEAD `test-search.js` — not a symlink, which would resolve requires to repo root).  
- Dual: sequential swap into repo root → `node evolve/bench-ladder.js` → JSON under layer dir; EXIT trap restored d7f053a.  
- N=20 is ranking-quality only; ship decisions should reconfirm dual-safe candidates at N≥50.

## Machine-readable

See scratch: `gold-layer-dual-map.json`
