# Fair dual W13 — rate-moving leaf/BR residual (FAIL)

**Date:** 2026-07-14  
**Base:** pure v91 · SoftN dead · no brflo re-tune

## SoftN
Confirmed cancelled `019f5d42-0b43-7da3-8825-964c4ce33b81`. No live processes.

## Why W12 cand-set was dual-null
Equal BR + expert leaves: filters that **agree with** expert unique-max rates do not change `playSig`. Reorder alone (gres) only hit check-half.

## W13 results (SOFT=0 deterministic)

| Tag | Axis | Des Δ | Chk Δ | Full | Des first-diff | Gate |
|-----|------|------:|------:|-----:|---------------:|:----:|
| p_w13_exsmashpass | expert multi smash→pass | 0 | +1 | 25/50 | 0 | FAIL |
| p_w13_exsmash2 | wider smash pass | 0 | +1 | 25/50 | 0 | FAIL |
| p_w13a_es_sbcw | combat sbc×2.85 | 0 | 0 | 24/50 | 0 | FAIL |
| p_w13_brutilres | BR meanU×0.03 | 0 | +1 | 25/50 | 0 | FAIL |
| p_w13_brresband | residual hard near-rate band | 0 | +1 | 25/50 | 0 (chk 3) | FAIL |

## Structural conclusion
Under equal-BR fair dual, micro leaf/BR residual axes that are **not free-lead unique-max surgery** (brflo class) produce **design first-diff ≈ 0**. Check-half noise is common and must be discarded by split gate.

## Still best discarded candidate
`p_w10_brflo_g2`: design mass + DEV T20 32/50, **DEV_VAL reverse 24/50**. Do not re-tune without a transfer-safe redesign.

## Protocol note
Prefer **SOFT=0** for split screens (removes soft-sample stochasticity). SoftN count still forbidden.

## Next directions (not yet shipable)
1. Design-half **instrumented** first-diff on live loss seats (move-level logs), not more unguided micros.  
2. Free-lead residual axes that **delete** freeze unique-max (brflo class) but with **different gates** validated only via DEV_VAL after design mass.  
3. True architecture: better det / learned leaf (out of pure JS micro scope).  
4. Never holdout without DEV_VAL Δ≥+2.
