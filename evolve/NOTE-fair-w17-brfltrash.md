# W17 — gold trash-first free-lead (0514/0531/0540)

**Date:** 2026-07-14  
**Gold:** Series 3–4 trash before high multi; `john_uploads/tien_len_AI.txt`  
**Base:** stack on `p_w14_bropair` (FL pair force when applicable; else trash-first)

## Axis
Free-lead BR only, when **no** low-pair force applied:
- hand 8..12, omin≥4, `hasControl`, trash singles exist
- high multi cand exists (top>7 or len≥3 top>6)
- force `leg = trash singles` only

## Results (fair dual, SOFT=0, T20 = MS200 TRIALS20)

| Partition | id | ch | Δ | WR | Gate |
|-----------|---:|---:|--:|---:|------|
| Split design | 12 | 15 | +3 | — | interest |
| Split check | 12 | 17 | +5 | — | ok |
| Split full T12 | 24 | 32 | +8 | 0.64 | PASS sig |
| **DEV T20** | 25 | **33** | **+8** | **0.66** | **PASS ≥32** |
| **DEV_VAL T20** | 25 | **27** | **+2** | 0.54 | **PASS Δ≥+2** |
| HOLDOUT_A | 25 | 26 | +1 | 0.52 | no ship |
| HOLDOUT_B | 25 | 26 | +1 | 0.52 | no ship |

DEV reverse flips: **0**. DEV_VAL reverse flips: **0**. Holdout reverse: **0**.

New DEV flips vs pure bropair: `20350468@0`, `20480117@0` (trash opens).

## Ship decision
**NO SHIP.** Absolute WR 0.52 on holdouts (need >0.70).  
**But:** first fair dual package to **clear DEV_VAL** without reverse. Keep as best transfer-safe base.

## Live
Do **not** promote to live v9.4 until holdout ship gate. SoftN dead.

## Next
Build **one more gold axis on this base** only if first-diff targets remaining losses; re-holdout only after new DEV_VAL. Absolute 0.70 remains the gap.
