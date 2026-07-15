# STATUS — Superhuman Tiến Lên (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-15T20:03Z  
**W_max:** 9  
**Dual champion:** `p_l2s48`  
**Live:** `p_l2s48` · gold **62/0**  
**Ladder:** L1 ✅ · **L2 open** (ΣΔ gate met; consecutive/EMA open) · L3–L5 pending  
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

**Consecutive streak:** **0** (post-0056 rejects 0057–0072).  
**EMA vs v6 (dev):** ≈ **0.50–0.53** (need ≥0.60).  
**ΣΔ ≥ +0.10:** ✅  

## Post-0056 reject log (dual local max ~50–53%)

| step | idea | Δ |
|------|------|---|
| 0063 | action-Q dumpVol | **−4.7pp** |
| 0064 | FL residual prior distill | −0.2pp |
| 0065–66 | short-hand expert dual leaf | +0.8 then −0.8 |
| 0067–68 | mixture 22% expert | +0.7 LB&lt;0 |
| 0069 | V-vs-v60 + mix28 | +0.4 |
| 0070 | sbc always in rateV | −0.7 |
| 0071 | mix15 (TRAIN 0.53 unpaired) | −0.6 PAIR |
| 0072 | expert sbc combat override | −0.4 |

## TRAIN tools added

- `evolve/train-value-selfplay.js` — V(s) self-play  
- `evolve/train-q-action.js` — Q(s,a) (dumpVol overfit — do not ship raw)  
- `evolve/train-fl-distill.js` — free-lead BR teacher prior  
- `evolve/train-value-vs-v60.js` — V trained vs fixed v60 expert  

## L2 blockers & next

1. Need **3 consecutive accepts** without intervening reject **or** EMA ≥ 0.60  
2. Dual BR skill is **hard local max ~52%** vs v60 under SoftN=0 trials=20  
3. Next high-value paths (not knob thrash):  
   - Deep self-play MCTS/PUCT with value leaf (equal budget)  
   - Population self-play / league of policies  
   - Richer imperfect-info belief / ISMCTS  
   - Avoid Q dumpVol; train Q without volume feature  

Gold living folder clean. Never residual-pack PAIR_STEP/CERT.
