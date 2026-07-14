# Fair dual W12 — transfer-safe combat residual BR levers

**Date:** 2026-07-14  
**Base:** pure v91 · freeze v91  
**Reject:** SoftN · brflo re-tune · mintop orderLegals · FL pin · soft multiTie

## SoftN
**Dead.** Subagent `019f5d42-0b43-7da3-8825-964c4ce33b81` status=cancelled (force-killed). Scripts `.DISABLED`. Live AI = v9.4 clean.

## Why brflo_g2 failed DEV_VAL
Split + full DEV T20 hit 32/50 p&lt;0.05, but DEV_VAL T20 **24/50 Δ−1**. FL low-pair BR surgery is seed-block overfit (DEV-mass without selection transfer). Do not re-tune brflo.

## W12 BR cand-set levers (one axis each)

| Rank | Tag | Axis | Locus |
|-----:|-----|------|-------|
| 1 | `p_w12_brptmin` | pair/triple keep min-top only | BR combat after orderLegals |
| 2 | `p_w12_brrkeep` | multi drop below max residual pairR | BR combat + residualPairR helper |
| 3 | `p_w12_brphfold` | mid pair-war only high pairs → pass unique | BR combat strip → allowPass |

## Protocol
```bash
FREEZE=v91 CHALL=p_w12_brptmin node evolve/fair-dev-split.js
# Interest: design Δ≥+2 and check non-negative
# Then full DEV ≥32/50 + DEV_VAL Δ≥+2 before any holdout
```

## Explicit REJECT
SoftN · brflo re-tune · mintop · soft multiTie · FL pin · expert FOVK alone · stack brflo_g2 without DEV_VAL.
