# STATUS — Superhuman Tiến Lên (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-15T21:59Z  
**W_max:** 9  
**Dual champion:** `p_l2s48`  
**Live:** `p_l2s48` · gold **62/0**  
**Ladder:** L1 ✅ · **L2 open** · L3–L5 pending  
**SoftN / convert-on-S:** FORBIDDEN  

## Ship bar

CERT ≥ **0.90** vs freeze v6.0 (Wilson LB > 0.87).

## Accepts (ΣΔ = **+0.1529**)

| step | NEW | Δ | LB | n | WR_new | method |
|------|-----|---|-----|---|--------|--------|
| 0007 | p_l2s7 | +0.0875 | +0.029 | 240 | 0.51 | gold structure dual |
| 0010 | p_l2s9 | +0.015 | +0.0025 | 400 | 0.48 | dual structure refine |
| **0053** | **p_l2s46** | **+0.0329** | **+0.0014** | **700** | **0.50** | **TRAIN linear V in BR** |
| **0056** | **p_l2s48** | **+0.0175** | **+0.006** | **800** | **0.526** | **value-guided FL multi** |

**Consecutive streak:** **0**  
**EMA vs v6:** ≈ **0.50–0.53** (need ≥0.60)  
**ΣΔ ≥ +0.10:** ✅  

## Post-0056 dual plateau (rejects 0057–0079)

Progressive FL BR, league FL knobs (TRAIN peak 0.56 unpaired), low-pair expand, mixture,
action-Q, FL distill — **no PAIR transfer**. Dual skill local max ~50–53% under SoftN=0 trials=20.

## TRAIN tooling

| Script | Role |
|--------|------|
| train-value-selfplay.js | V(s) self-play |
| train-value-vs-v60.js | V vs fixed v60 expert |
| train-q-action.js | Q(s,a) — dumpVol overfit risk |
| train-fl-distill.js | FL BR teacher prior |
| train-league-fl.js | **NEW** population FL gate league |

## L2 needs

1. **3 consecutive** PAIR_STEP accepts **or** EMA ≥ 0.60  
2. Gold latest green (OK)  
3. milestone-L2 commit/push/tag  

## Next (architecture, not knobs)

1. ISMCTS / det-MCTS free-lead with value leaf (equal budget vs flat BR)  
2. Self-play policy network (larger feature policy, not just FL gates)  
3. Population league on **full dualRollout combat params** with larger TRAIN n (GAMES≥100) before PAIR  
4. Avoid unpaired TRAIN WR as accept signal (league 0.56 → PAIR 0)  

Never residual-pack PAIR_STEP / CERT.
