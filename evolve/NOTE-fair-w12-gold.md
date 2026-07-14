# Fair dual W12 — series-1 combat gold micros

**Date:** 2026-07-14  
**Base:** pure v91 · freeze v91  
**Gold series 1–3:** recommendations only (not ship gates)

## Burned / toxic
| Probe | Why reject |
|-------|------------|
| GOLD_SURGICAL | fair N50 **0.40** toxic |
| p_g1a | sbc inflate DEV 0.48 |
| p_g1b | all-cheap → 2 DEV 0.54 |
| brflo_g2 | DEV_VAL fail |

## Micros
### `p_w12_gres` — residual order combat singles
- orderLegals when cur and both singles: maxRun DESC → pairR DESC → sbc ASC → expertScore
- Targets 0498 / 0502 residual keep

### `p_w12_gr2` — maxRun-drop admits 2
- When every cheap single drops residual maxRun vs curTop≥9, admit single-2 into pool
- Tighter than g1b (no pair-smash → 2 when run intact)
- Targets 0500

## Probe order
gres alone → gr2 alone → stack only if both Δid≥0 → DEV_VAL → holdout.
