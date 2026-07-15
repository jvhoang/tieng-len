# STATUS — Superhuman goal (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-15T10:20Z  
**Dual champion:** `p_l2s9` / `v1.0-sh-L2s9` (last accepted dual climber)  
**Live product:** `p_l2s15` / pass-QKA living-gold fix (62/0 suite; dual ≈ neutral vs p_l2s9)  
**W_max:** 9 · SoftN FORBIDDEN · convert-on-S FORBIDDEN  
**Ladder:** **L1 ACHIEVED** · **L2 plateau** (ΣΔ=+0.1025 but consecutive streak broken) · L3–L5 pending  
**Gold latest:** **GREEN 62/0** (Series 1–5 sample cases) · manifest clean  

## PAIR_STEP accepts (cumulative)

| step | NEW | Δ | LB | n | notes |
|------|-----|---|-----|---|-------|
| **0007** | p_l2s7 | +0.0875 | +0.029 | 240 | first accept vs L1 |
| **0010** | p_l2s9 | +0.015 | +0.0025 | 400 | second accept |

**ΣΔ = +0.1025** · Consecutive streak after later rejects: **0–1** (need **3 consecutive** for L2 ΣΔ gate)  
**EMA WR vs v6:** ~0.48–0.50 (not ≥0.60)

## Session progress (post-0010)

| Work | Result |
|------|--------|
| Series 4–5 fair gold cases | **62/0** living suite (0523–0558 sample) |
| p_l2s15 pass QKA handLen≥9 | gold green; dual Δ≈0 vs p_l2s9 (n=600) |
| TRAIN hill-climb knobs | train WR~0.54 noise; **PAIR_STEP reject** vs p_l2s9 (−0.7pp) |
| Many dual levers (v60 dualRollout, multi-first, BR soft-tie widen, hybrid selfPol) | reject or dual-null; some dual-hurt |

## L2 remaining

1. **3 consecutive PAIR_STEP accepts** with Δ CI LB>0 **or** EMA ≥ 0.60  
2. Gold latest suite stays green (now 62 cases)  
3. milestone-L2 git commit/push/tag  

## Ship remaining

CERT ≥90% vs v60 after freeze SHA — still far above ~50% peer duals.

## Tools added

- `evolve/train-dual-hillclimb.js` — TRAIN-only dual knob search (no PAIR_STEP residual pack)
- `evolve/run-gold-fair-suite.js` — Series 4–5 cases

## Next levers (general only)

1. Self-play value head / longer BR with better leaf eval  
2. Playlog BC parametric prior (TRAIN ingest)  
3. Conservative dual-only free-lead residual scoring validated on TRAIN then PAIR_STEP  
4. Never residual-pack PAIR_STEP S_t  

## Git

- L1: `89ccbe0` `milestone-L1`  
- Accepts: `9cb2f82` (0007), `d22e1c3` (0010)  
