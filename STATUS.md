# STATUS — Superhuman Tiến Lên (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-15T13:20Z  
**W_max:** 9 (18 cores / 2)  
**Dual champion:** `p_l2s9` (accept 0010)  
**Live product:** `p_l2s15` — gold **62/0**  
**Ladder:** L1 ✅ · **L2 plateau** · L3–L5 pending  
**SoftN / convert-on-S:** FORBIDDEN  

## Ship bar

CERT ≥ **0.90** vs freeze v6.0 (Wilson LB > 0.87) — **not** dual ~50%.

## Accepts (ΣΔ = +0.1025)

| step | NEW | Δ | LB | n |
|------|-----|---|-----|---|
| 0007 | p_l2s7 | +0.0875 | +0.029 | 240 |
| 0010 | p_l2s9 | +0.015 | +0.0025 | 400 |

**Consecutive streak:** broken (rejects 0011–0043).  
**EMA vs v6:** ~0.47–0.50 (need ≥0.60 for L2 alt path).

## L2 still needs

- **3 consecutive** PAIR_STEP accepts (Δ CI LB > 0) **or** EMA ≥ 0.60  
- Gold latest green (62 cases OK)  
- then `milestone-L2` commit/push/tag  

## Experiment summary (post-0010)

Dozens of general dual levers under hybrid PAIR_STEP:

- Soft leafEval BR, progressive BR, forced-win, multiBonus  
- TRAIN hill-climb / selfplay knobs (~0.54 train WR) — **no transfer**  
- v60 dualRollout / teacher combat / hybrid gold+v60  
- free-lead census + regret midmulti — small +Δ then **n=1000 reject −1.1pp**  

**Conclusion:** dual skill is a **hard local max ~50% vs v60**. Micro dualRollout / BR knobs do not clear accept. Need **large-scale self-play value learning** or deeper search (beyond knob search).

## Tools on disk

| Script | Role |
|--------|------|
| `evolve/pair-step.js` | hybrid accept |
| `evolve/train-selfplay-dual.js` | TRAIN dual knobs |
| `evolve/train-freelead-census.js` | free-lead outcome census |
| `evolve/train-fl-regret.js` | abstract free-lead regret |
| `evolve/bc-dual-prior.js` | playlog BC rates |
| `evolve/run-gold-fair-suite.js` | living gold 62 |

## Git

- `89ccbe0` milestone-L1  
- `9cb2f82` / `d22e1c3` accepts  
- `8da9a2d` / `86abb65` gold+train tools  

## Next session plan

1. Multi-hour self-play with linear/value features learned only on TRAIN  
2. Distill high-trial BR into dualRollout prior  
3. Resume consecutive accept stack; L2 tag when criteria met  
4. Climb toward CERT 90%  

Never residual-pack PAIR_STEP / CERT. Gold living folder still authoritative.  
