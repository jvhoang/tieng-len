# W15 — gold residual loose-single (0498/0523 class)

**Date:** 2026-07-14  
**Gold sources:** `john_uploads/tien_len_AI.txt` Series 1 (0498/0502/0504) + Series 4 (0523/0524/…)  
**Base:** stack on `p_w14_bropair` (FL pair + combat brloose)

## Axis
BR combat: facing single, hand≥8, omin≥4: if any single with `structureBreakCost < 8` exists, **drop** singles with `sbc ≥ 8` from cand set (unique-max surgery).

## First-diff (SOFT=0)
| Half | nDiv | Classes |
|------|-----:|---------|
| Design | 6/24 | **3 combat** + 3 FL |
| Check | 8/26 | 2 combat + 6 FL |

Combat first-diffs on design still-loss seed **20270684@0/1** (freeze high/mid → chall alternate single).  
Also 20350468@1 combat.

## Dual results
| Eval | Result |
|------|--------|
| Split | **PASS** design Δ+2, check Δ+3 |
| T20 full DEV | **31/50** (id 25), Δ+6, **0 reverse flips** |
| vs pure bropair T20 | **identical 31/50** (same 6 good flips) |

## Interpretation
Gold combat residual **does** change midgame first-diff under equal BR, but on this seed block those diffs **do not convert to extra wins** vs bropair alone. Ceiling remains 31 — **no DEV_VAL burn**.

## Next (slow)
Do **not** stack more axes hoping for 32. Next single gold theme should target seats that remain losses *with* a first-diff path that can change finish (or a different rate-moving class). Prefer analyzing one design still-loss game full playout before coding.

SoftN still forbidden. Live AI stays v9.4.
