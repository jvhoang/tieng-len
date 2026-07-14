# W19 — holdout-gap levers on brfltrash base

**Date:** 2026-07-14  
**Base:** `p_w17_brfltrash` (DEV 33, DEV_VAL Δ+2, holdout 26)

## Holdout diagnosis
Sample of holdout still-loss seats under brfltrash: **almost all freeze-identical** (no first-diff). FL levers rarely fire on holdout losses; absolute ~0.50 is identity skill under equal BR.

## Probes (SOFT=0 T20)

| Tag | Axis | DEV T20 | vs base | DEV_VAL | Note |
|-----|------|--------:|--------:|--------:|------|
| p_w19_brflsure2 | short FL force 22/2 | 33 | +0 | — | dual-null |
| p_w19_pairpass | pair-war allowPass top≥10 | 33 | +0 | — | dual-null |
| p_w19_exsbc | combat sbc×3.6 | 32 | −1 | — | slight reverse |
| p_w19_exresmax | expert residual max single | 33 | +0 | Δ+2 | same W/L as base |

## Conclusion
Micros on top of brfltrash **plateau**. Best package remains pure **`p_w17_brfltrash`**. Absolute fair dual **0.70** requires more than one-axis BR cand surgery (leaf model, larger behavioral change, or more gold-aligned multi-step residual plans with careful DEV_VAL).

## Ship
No. Live v9.4. SoftN dead. Gold primary.
