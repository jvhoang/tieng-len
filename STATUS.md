# STATUS — Superhuman Tiến Lên (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-15T22:25Z  
**W_max:** 9  
**Dual champion:** `p_l2s48`  
**Live:** `p_l2s48` · gold **62/0**  
**Ladder:** L1 ✅ · **L2 open** · L3–L5 pending  

## Ship bar
CERT ≥ **0.90** vs freeze v6.0 (Wilson LB > 0.87).

## Accepts (ΣΔ = **+0.1529**)

| step | NEW | Δ | n | WR_new |
|------|-----|---|---|--------|
| 0007 | p_l2s7 | +0.0875 | 240 | 0.51 |
| 0010 | p_l2s9 | +0.015 | 400 | 0.48 |
| 0053 | p_l2s46 | +0.0329 | 700 | 0.50 |
| 0056 | p_l2s48 | +0.0175 | 800 | 0.526 |

**Streak:** 0 · **EMA:** ~0.50–0.53 · **ΣΔ gate:** ✅  

## Dual plateau (0057–0081)

All post-0056 candidates rejected under hybrid PAIR_STEP. Methods tried:
progressive FL BR, free-lead population league (TRAIN 0.56 unpaired → PAIR 0),
FL hybrid pin, soft expected utility, mixture, Q, distill, low-pair expand.

**Conclusion:** SoftN=0 trials=20 dual BR is a **hard local max ~50–53%** vs v60.
Micro gates / reallocation do not clear accept. Need architectural leap:
ISMCTS, learned policy head (larger features / NN), or deeper equal-budget search.

## Tools
`train-league-fl.js`, `train-value-*.js`, `train-q-action.js`, `train-fl-distill.js`

## Next
1. Deep equal-budget ISMCTS free-lead  
2. Self-play policy gradient on abstract features (large TRAIN n)  
3. Stack 3 consecutive accepts OR EMA≥0.60 for L2  
4. Climb L3–L5 → CERT 90%  

Never residual-pack PAIR_STEP/CERT. Gold living folder authoritative.
