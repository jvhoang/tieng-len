# Fair dual wave8 results — 2026-07-14

## Protocol
Fair dual DEV 20260711 / DEV_VAL 20260715 / holdouts locked. SoftN dead. Mintop family holdout-burned.

## Multi-subagent
1. Mintop gate analysis: **no safe gated mintop** (binary flat vs holdout-toxic).
2. Untried hard levers: br2 / flht / ex2 / bruniq / mllen / fltrash.

## DEV results (all fair BOTH_SEATS N=50)

| Tag | Axis | DEV | DEV_VAL | Note |
|-----|------|----:|--------:|------|
| mintop / ovkgap | orderLegals min-top | **32** | (holdout A 0.42) | burned |
| p_w8_exonly | mintop expert leaf only | **30** | **0.46 Δ−2** | DEV overfit |
| p_w6_shself | always shallowSelf leaf | **30** | **0.42 Δ−4** | DEV overfit |
| p_w8_fovksh | fovk+shallow | 30 | — | |
| p_w8_fovk | forbid overkill expert | **29** | **0.48 Δ−1** | DEV overfit |
| p_w8_mtprim | expertScore top×12 singles | 28 | — | |
| p_w8_brmtsh | BR mintop+shallow | 28 | — | |
| p_w8_flht | BR drop high multi | 27 | — | |
| p_w8_brmt | BR-only mintop | 27 | — | BR path alone weak |
| p_w8_mllen / ovktax | long multi drop / score tax | 26 | — | |
| identity / flats | — | 25 | — | |
| p_w8_br2 / fltrash | 2-smash BR / hard trash | 24–25 | — | null/harm |
| p_w8_ex2 | exact +2s | **23** | — | mild harm |

## Isolation experiment (mintop mass)

| Surface | DEV |
|---------|----:|
| Full mintop (orderLegals) | **32** |
| Expert-only mintop (exonly) | **30** |
| BR-only mintop (brmt) | **27** |

Full mintop ≈ expert leaf (+5) + BR cand (+2). **Neither half is DEV-sig alone; both fail transfer.**

## Critical transfer lesson
Near-miss **DEV +4..+5 is also seed-11 overfit**:
- shself DEV 0.60 → DEV_VAL **0.42**
- exonly DEV 0.60 → DEV_VAL **0.46**
- fovk DEV 0.58 → DEV_VAL **0.48**

Do **not** promote any DEV-only near-miss without DEV_VAL Δ≥+2. Do not burn holdout on these.

## Reject for re-probe
mintop family · SoftN · FL pin · soft multiTie · W8 cand-set surgery flats · always-shallow alone · expert min-beat alone without transfer proof

## Next mechanism search
Need skill that is **positive on DEV_VAL without DEV peek contamination**. Options:
1. Design levers on a **split of DEV only** (first 12 seeds design / last 13 internal val) before touching DEV_VAL — reduces seed11 fit.
2. Structural levers from gold series-1 micros with dual N20 first, ignore absolute 0.70 until relative Δ transfers.
3. Accept fair dual absolute 0.70 may need search architecture (better det / leaf eval) beyond ≤15-line expert micro.
