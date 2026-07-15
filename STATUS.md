# STATUS — Superhuman Tiến Lên (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-15T15:08Z  
**W_max:** 9 (18 cores / 2)  
**Dual champion:** `p_l2s46` (accept **0053**)  
**Live:** value-blend BR λ=0.22 · gold **62/0**  
**Ladder:** L1 ✅ · **L2 in progress (1/3 consecutive accepts)** · L3–L5 pending  
**SoftN / convert-on-S:** FORBIDDEN  
**Gold manifest:** clean (81 files)

## Ship bar

CERT ≥ **0.90** vs freeze v6.0 (Wilson LB > 0.87).

## Accepts (ΣΔ = +0.1354)

| step | NEW | Δ | LB | n | notes |
|------|-----|---|-----|---|-------|
| 0007 | p_l2s7 | +0.0875 | +0.029 | 240 | first climb |
| 0010 | p_l2s9 | +0.015 | +0.0025 | 400 | structure dual |
| **0053** | **p_l2s46** | **+0.0329** | **+0.0014** | **700** | **TRAIN linear value blend BR** |

**Consecutive streak:** **1** (0053). Need 2 more consecutive for L2.  
**EMA vs v6:** champion WR_new ≈ 0.50 on 0053 (dev estimate).

### Accept 0053 detail

- seedHash `6c571c06736a9f5f…`
- McNemar b=51 c=74 χ²=3.87
- Gold suite 62/0 after refresh
- Method: general linear V(s) from TRAIN self-play features; BR uses `rateV = rate + 0.22·ΔV`
- **Not** convert-on-S; no residual packaging of PAIR seeds

## Rejects this session (selected)

| step | idea | Δ |
|------|------|---|
| 0047–0051 | knobs / expert leaf / residual FL / FL-expert root | ≤0 or negative |
| 0052 | value blend n=400 | +3.5pp LB−0.005 (borderline) |
| 0054 | λ=0.30 vs 0.22 | identity 0 |

## Next

1. Stack accepts 2–3 consecutive (value FL / retrain V / distillation)
2. L2 milestone commit when 3-streak or EMA≥0.60
3. Climb L3–L5 → CERT 90%

Never residual-pack PAIR_STEP / CERT.
