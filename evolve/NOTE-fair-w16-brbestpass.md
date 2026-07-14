# W16 — gold pass when best multi is high smash (0501 class)

**Date:** 2026-07-14  
**Gold:** Series 1 IMG_0501, Series 2 0510/0511, Series 4 0547/0550  
**Base:** stack on `p_w14_bropair`

## Axis
BR combat: if best ordered multi answer has `topRank ≥ 9` and `sbc ≥ 8`, and hand can re-take (2s / control / mid pair), force **pass unique** (empty leg + allowPass).

## Results
| Eval | Result | Gate |
|------|--------|------|
| Split | des Δ+2, chk Δ+5, full 31/50 | PASS |
| DEV T20 | **32/50** Δ+7 vs id 25; vs bropair **+1** (new flip `20410306@0` PASS) | **PASS ≥32** |
| Reverse flips on DEV | **0** | good |
| **DEV_VAL T20** seed 20260715 | **24/50** Δ**−1** (one reverse `20290634@0`) | **FAIL** |

## Interpretation
Same family as brflo_g2: **DEV significant, DEV_VAL reverse**. Pass-on-high-smash helps DEV check mass (`20410306`) but harms at least one DEV_VAL seat. **Do not holdout.** SoftN still dead.

## Process lessons
1. Design still-loss under pure bropair has **0 first-diff** (freeze-identical) — need combat path change after FL diverge.  
2. Gold pass-vs-smash **does** convert +1 on DEV when BR finally evaluates PASS.  
3. Selection block still rejects seed-local combat pass.  
4. Absolute fair dual 0.70 remains far (best DEV WR 0.64).

## Next (slow)
- Do **not** re-tune pass gates to chase DEV_VAL.  
- Prefer new gold theme with first-diff on **design still-loss** seats (trash-first FL orthogonal to pair force, carefully).  
- Or architectural leaf work beyond cand-set surgery.

Live AI remains v9.4. No ship.
