# W18 — residual add-ons on DEV_VAL-safe brfltrash base

**Date:** 2026-07-14  
**Base:** `p_w17_brfltrash` (DEV 33, DEV_VAL Δ+2, holdout 26)

## Probes (each one axis on base)

| Tag | Axis | Split full | DEV T20 | vs base | DEV_VAL | Note |
|-----|------|----------:|--------:|--------:|--------:|------|
| p_w18_brseqres | seq residual max force | 32 | **33** | +0 | — | identical W/L to base |
| p_w18_br2ctrl | combat 2 over pair-break | 32 | **33** | +0 | — | identical |
| p_w18_trash_pass | base + 0501 best multi pass | 33 | **34** | **+1** | **Δ+1 FAIL** | gains 20410306; loses 20290634 on VAL |

## Lessons
1. Seq residual and combat-2 on brfltrash **never fire** on win-critical paths (0 combat first-diff on freeze path; dual W/L identical).  
2. Pass-on-high-smash still adds DEV check mass but **DEV_VAL reverse seat** `20290634@0` returns (same as solo brbestpass).  
3. Best **transfer-safe** package remains pure **`p_w17_brfltrash`**.  
4. Absolute holdout ~0.52; need ~+9 wins for 0.70 — beyond one-axis cand surgery alone.

## Ship
No. SoftN dead. Live v9.4.

## Next directions (not implemented)
- Full playout of holdout losses (not just DEV still-loss) for gold alignment  
- Leaf/architecture beyond BR cand-set  
- Multi-seed ensemble selection only after per-lever DEV_VAL  
