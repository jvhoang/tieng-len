# STATUS — Superhuman Tiến Lên (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-15T17:07Z  
**W_max:** 9 (18 cores / 2)  
**Dual champion:** `p_l2s48` (accepts **0053→0056** value climb)  
**Live product:** `p_l2s48` · gold **62/0**  
**Ladder:** L1 ✅ · **L2 in progress** · L3–L5 pending  
**SoftN / convert-on-S:** FORBIDDEN  
**Gold manifest:** clean (81 files)

## Ship bar

CERT ≥ **0.90** vs freeze v6.0 (Wilson LB > 0.87) — **not** dual ~50–53%.

## Accepts (ΣΔ = **+0.1529**)

| step | NEW | Δ | LB | n | WR_new | method |
|------|-----|---|-----|---|--------|--------|
| 0007 | p_l2s7 | +0.0875 | +0.029 | 240 | 0.51 | gold structure dual |
| 0010 | p_l2s9 | +0.015 | +0.0025 | 400 | 0.48 | dual structure refine |
| **0053** | **p_l2s46** | **+0.0329** | **+0.0014** | **700** | **0.50** | **TRAIN linear V in BR** |
| **0056** | **p_l2s48** | **+0.0175** | **+0.006** | **800** | **0.526** | **value-guided FL multi** |

**Consecutive streak:** **0** (rejects after 0056 broke 2-in-a-row; need **3 consecutive** for L2).  
**EMA vs v6 (dev):** champion WR ≈ **0.51–0.53** (need ≥0.60 for L2 alt).  
**ΣΔ gate:** ✅ already ≥ +0.10; missing only **3 consecutive accepts** or EMA 0.60.

## Session breakthrough

Broke dual identity plateau (~47–50%) with **AlphaZero-lite linear value**:

1. `evolve/train-value-selfplay.js` — TRAIN self-play features → logistic V(s)  
2. `evolve/eval-registry/value-weights.json` — weights (~66–68% train acc)  
3. BR blend: `rateV = rate + λ·ΔV` (λ=0.22) → accept **0053**  
4. Value-guided multi free-lead → accept **0056**  

Gold suite **62/0** throughout (living john_uploads refresh clean).

## Rejects after 0056 (streak break)

| step | NEW | idea | Δ |
|------|-----|------|---|
| 0057 | p_l2s49 | retrain V + λ0.26 | 0 identity |
| 0058 | p_l2s50 | value combat dualRollout | −1.7pp |
| 0059 | p_l2s51 | BR FL value re-rank | −0.7pp |
| 0060 | p_l2s52 | UCB trial allocation | +0.17 LB=0 |
| 0061 | p_l2s53 | trash≤7 + λ0.32 | −0.4pp |
| 0062 | p_l2s54 | FL maxBranch 24 | 0 identity |

## L2 still needs

1. **3 consecutive** PAIR_STEP accepts (Δ CI LB > 0) **or** EMA ≥ 0.60  
2. Gold latest green (OK)  
3. `milestone-L2` commit/push/tag  

## Next levers (priority)

1. Action-conditioned / deeper V (mid-game dual-labeled TRAIN, not only self-play snapshots)  
2. High-trial BR distillation into dualRollout prior (TRAIN only)  
3. Stack 3 accepts in a row carefully (avoid streak-breaking micro-rejects)  
4. Absolute WR climb toward EMA 0.60 then L3–L5 → CERT 90%  

## Git

- `04c90ab` accept 0053 value-blend  
- `aa99529` accept 0056 value free-lead  
- L1: `89ccbe0` + tag `milestone-L1`  

Never residual-pack PAIR_STEP / CERT. Gold living folder authoritative.
