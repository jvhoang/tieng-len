# STATUS — Superhuman goal (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-15T12:15Z  
**Dual champion:** `p_l2s9` (last PAIR_STEP accept 0010)  
**Live product:** `p_l2s15` (gold 62/0; dual ≈ peer with champion)  
**W_max:** 9 (18 logical cores / 2)  
**SoftN / convert-on-S:** FORBIDDEN  
**Ladder:** **L1 done** · **L2 plateau** · L3–L5 pending  
**Gold:** GREEN **62/0** · manifest clean  

## PAIR_STEP accepts

| step | NEW | Δ_WR | CI LB | n | notes |
|------|-----|------|-------|---|-------|
| 0007 | p_l2s7 | +0.0875 | +0.029 | 240 | vs L1 |
| 0010 | p_l2s9 | +0.015 | +0.0025 | 400 | vs p_l2s7 |

**ΣΔ = +0.1025**  
**Consecutive accept streak:** broken (many rejects 0011–0037)  
**EMA WR vs v6 (dev):** ~0.46–0.50 — **not ≥0.60**

## L2 criteria (not yet met)

Need **EMA ≥ 0.60** **OR** (ΣΔ ≥ +0.10 **and ≥3 consecutive accepts**).  
ΣΔ ok; consecutive and EMA both short.

## Recent TRAIN / dual experiments (all general; no convert)

| Candidate | Idea | PAIR vs p_l2s9 | Notes |
|-----------|------|----------------|-------|
| p_l2s23 | soft leafEval BR | reject −3.3pp | incomplete soft hurt |
| p_l2s24 | dual min-beat | reject ~0 | large-n slight − |
| p_l2s_sp | TRAIN selfplay knobs ~0.54 | reject ~0 | train noise no transfer |
| p_l2s25 | opening multi + 2-tempo | reject −0.8pp | |
| p_l2s26–28 | forced-win / progressive BR / multiBonus | reject ~0 to −2pp | |
| p_l2s29 | v60 dualRollout + gold expert split | +0.3pp n=600 LB− | dual-null |

## Diagnosis

Dual strength is a **local max ~50% vs v60**. Micro general knobs and BR tweaks do not clear **LB>0** vs champion. TRAIN dual hill-climbs overfit seed noise. Gold structure and dual multi bias continue to trade off.

## Tools

- `evolve/train-dual-hillclimb.js`
- `evolve/train-selfplay-dual.js` — TRAIN dual knob search + gold gate
- Living gold suite Series 4–5

## Next (highest value)

1. **Large-scale self-play** with isolated worktrees + linear/value features learned on TRAIN only  
2. **Playlog BC** → dualRollout prior features (not fingerprints)  
3. Stack **3 consecutive** accepts once a dual-positive general change sticks  
4. milestone-L2 then L3–L5 → CERT ≥90%  

## Git

- L1: `89ccbe0` tag `milestone-L1`  
- Accepts: `9cb2f82`, `d22e1c3`  
- Gold suite+train tools: `8da9a2d`  
