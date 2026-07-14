# Fair dual W14 — data-first FL-BR unique-max deletion

**Date:** 2026-07-14  
**Base:** pure v91 · SoftN dead · SOFT=0 preferred for screens

## Method upgrade (not hasty micros)

1. **`evolve/fair-firstdiff.js`** — move-level first-diff under fair dual det RNG  
2. Newest playlog `john_uploads/tienlen-playlogs-1784002833123.json` (179 games) residual census  
3. Gold series 1–4 (`tien_len_AI.txt`) structure/pass/low-pair themes  
4. brflo_g2 design vs check first-diff census → **check over-fires** (4/24 des vs 8/26 chk)

## brflo_g2 first-diff (calibration)

| Half | nDiv / n | Classes |
|------|---------:|---------|
| Design | 4/24 | 3× FL single/seq→pair, 1 combat |
| Check | 8/26 | 6 FL + 2 combat |

Design flips include known `20280657@1`, `20330522@0`, plus `20320549@1`.  
DEV_VAL reverse explained: hard deletion false-positives denser off DEV seed block.

## Playlog residual (no AI-hint field in export)

| Class | Count |
|-------|------:|
| combat_play | 596 |
| min_top_among_same_len | 251 |
| combat_pass | 213 |
| FL_multi_ge3 | 198 |
| overkill_top | 138 |
| FL_single_while_pair | 87 |
| FL_low_pair | 80 |
| pass_with_cheap_legal | 31 |

Human gold series 4 reinforces: structure-break avoid, low-pair open, trash-first, 2-budget, pass-vs-smash.

## W14 levers (FL BR unique-max deletion, no g2 stack)

| Tag | Gate | Des first-diff | Chk first-diff | Split des/chk/full | T20 DEV |
|-----|------|---------------:|---------------:|--------------------|--------:|
| **p_w14_brflopen** | hand===13, pair top≤5 sbc&lt;8 | 3/24 | **4/26** best balance | **+2 / +3 / 29** PASS | 30/50 |
| **p_w14_bropair** | hand≥11, omin≥6, pair top≤6 | 3/24 | 6/26 | **+2 / +4 / 30** PASS | **31/50** |
| **p_w14_brlmulti** | hand≥11, multi len≥2 top≤5 | 3/24 | 6/26 | **+2 / +4 / 30** PASS | **31/50** |
| p_w14_bropair5 | omin≥5 variant | — | — | +2/+4/30 PASS | 31/50 |
| p_w14_brflminp | min-top any pair | 3/24 | 7/26 | (not prioritized) | — |
| p_w14_brflpair6 | hand≥12 top≤6 | 3/24 | 5/26 | — | — |

Identity T20: **25/50**.

## Gate status

- **Split PASS** for brflopen / bropair / brlmulti (design Δ+2, check non-neg).  
- Full DEV T20 max **31/50** — **one short of ≥32** (p&lt;0.05).  
- **No DEV_VAL burn** (protocol).  
- **No holdout burn**.  
- SoftN still dead.

## Why this is progress

1. First time since brflo_g2 that levers **split-pass with measured first-diff**.  
2. `brflopen` improves des:chk first-diff ratio vs brflo_g2 (transfer hypothesis).  
3. Stopped at honest significance gate instead of shipping 0.62 WR.

## Next (W15)

1. Find **+1 design-mass** orthogonal to FL pair force without g2hi / SoftN / mintop (instrumented first-diff on remaining design losses).  
2. Or DEV_VAL **only if** a lever hits 32/50 full DEV.  
3. Prefer `brflopen` / `bropair` as base if stacking after significance.

## Evidence paths

- `evolve/fair-firstdiff.js`  
- `evolve/firstdiff-p_w14_*-{design,check}.json`  
- `evolve/split-latest-p_w14_*.json`  
- `evolve/dev-ch-t20-*.json`  
- `{SCRATCH}/w14/`  
