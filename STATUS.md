# STATUS — Superhuman Tiến Lên (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-16T04:40Z  
**W_max:** 9  
**Dual champion:** `p_l2s86` ✅  
**Live:** `p_l2s86` · gold **62/0** · gold manifest clean (81 files)  
**Ladder:** L1 ✅ · **L2 open** (streak **1**/3) · L3–L5 pending  
**Git:** `3c02e4a` feat(ai): accept PAIR 0100 p_l2s86 (pushed origin/main)

## Ship bar
CERT ≥ **0.90** vs freeze v6.0 (Wilson LB > 0.87).

## Accepts (ΣΔ = **+0.1699**)

| step | NEW | Δ | n | WR_new |
|------|-----|---|---|--------|
| 0007 | p_l2s7 | +0.0875 | 240 | 0.51 |
| 0010 | p_l2s9 | +0.015 | 400 | 0.48 |
| 0053 | p_l2s46 | +0.0329 | 700 | 0.50 |
| 0056 | p_l2s48 | +0.0175 | 800 | 0.526 |
| **0100** | **p_l2s86** | **+0.0170** | **1000** | **0.524** |

**Streak:** **1** · **EMA:** ~0.51–0.53 · **ΣΔ gate:** ✅  

### Accept 0100 (method that worked)
Offline high-trials BR distill (TRAIN only, BR_TRIALS=48, n=623, acc~0.71) into:
- free-lead multi residual scoring
- BR free-lead root candidate order  
- soft rate prior (brdTerm)
No PAIR residual packaging. Gold 62/0.

## Post-0100 stack attempts (streak still 1)
| step | cand | vs | Δ | note |
|------|------|----|---|------|
| 0101 | re-distill p_l2s87 | p_l2s86 | ~0 | identity |
| 0102 | V retrain λ0.30 | p_l2s86 | −0.6pp | |
| 0103 | free+combat distill | p_l2s86 | **−2.1pp** | combat distill hurts |
| 0104 | mega free distill | p_l2s86 | ~0 | |
| 0105 | value pass residual | p_l2s86 | 0 | |

## Working thesis
1. **Free-lead BR-distill is the dual-transfer lever** (0100). Combat distill does not transfer.
2. SoftN=0 trials=20 still caps absolute WR ~50–53% vs v60; need more orthogonal free-lead/search leaps for consecutive accepts and path to CERT 90%.
3. Next stack candidates: larger free-lead teacher diversity (different opp models in BR teacher), free-lead nested high-trials only at root (budget reallocate), ISMCTS free-lead.

## Tools
- `evolve/train-br-distill.js` (free-lead teacher; combat mode rejected)
- `evolve/train-bc-action.js`, `train-value-expanded.js`
- Dual inject freeze dualRollout
- PAIR registry through step-0105

## Next
1. Stack consecutive accept #2 and #3 → **L2 milestone** commit/tag  
2. Climb L3–L5 → CERT ≥90%  

Never residual-pack PAIR_STEP/CERT. Gold living authoritative.
