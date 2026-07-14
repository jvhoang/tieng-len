# W21 — combat residual on brfltrash (holdout midgame attempt)

**Date:** 2026-07-14  
**Base:** `p_w17_brfltrash`

## Diagnosis
Holdout still-losses under base are nearly freeze-identical. W21 targeted combat BR root rewrite for mid singles.

## Results (T20 SOFT=0)

| Tag | DEV | vs base | Note |
|-----|----:|--------:|------|
| p_w21_br_hirez | 32 | **−1** | combat first-diff exists; net reverse |
| p_w21_br_pairdrop_mid | 32 | **−1** | lost prior trash flip 20350468@0 |

## Conclusion
Combat residual cand surgery on freeze-identical midgames **does not improve** over brfltrash under equal BR. Best package remains **p_w17_brfltrash** (DEV 33, DEV_VAL +2, holdout 0.52).

Absolute fair dual 0.70 still requires larger behavioral change than one-axis BR cand filters.
