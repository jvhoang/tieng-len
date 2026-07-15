# PLAN — Superhuman Tiến Lên (hybrid PAIR_STEP + one-shot CERT ≥90% vs v6.0)

**Updated:** 2026-07-15  
**Protocol source:** `GOAL-PROMPT-alphago-class-from-v1.md`  
**W_max:** floor(logical_cores/2) — currently 18 cores → **W_max=9**

## Non-negotiables
- No convert-on-S / PAIR_STEP residual packaging / CERT residual re-run
- PAIR_STEP: fresh S_t, paired θ_prev vs θ_new vs v60, accept only Δ CI LB > 0 + gold latest green
- CERT only after freeze SHA; ≥90% vs v60; new CERT seeds on fail
- Living gold: re-scan john_uploads/ every PAIR_STEP and ≤2h
- Milestone git commit+push L1–L5
- Heavy workers ≤ W_max

## Ladder
| Level | Criteria | Git |
|-------|----------|-----|
| L1 | Living gold pipeline + PAIR_STEP harness + gold green (latest) + v1 baseline | milestone-L1 |
| L2 | EMA≥0.60 or ΣΔ≥+0.10 + ≥3 accepts + gold green | milestone-L2 |
| L3 | EMA≥0.70 or ΣΔ≥+0.20 + gold green | milestone-L3 |
| L4 | EMA≥0.80 or ΣΔ≥+0.30 + gold green | milestone-L4 |
| L5 | CERT ≥90% vs v60 (LB>0.87), blocks, secondary freezes | milestone-L5 |

## Task checklist
- [x] Restore v1 baseline as live `v1.0-sh`; document W_max
- [x] Living gold manifest + suite on fair getAIMove; drive green (48/0)
- [x] PAIR_STEP harness + unit tests + sample (smoke-id Δ=0)
- [x] CERT harness dry-run (SHIP_GATE=0 plumbing OK)
- [x] L1 commit/push/tag
- [ ] L2–L4 climb + commits
- [ ] L5 CERT ship + commit

## Active approach
1. ~~Infrastructure first~~ **L1 done.**
2. Strength climb: general structure/control + BC from living playlogs + self-play priors — **no** ultra-exact byR convert roots.
3. Every candidate: gold refresh → PAIR_STEP paired Δ vs champion → accept only if CI LB > 0 + gold green.
4. Track ΣΔ / EMA for L2–L4; CERT only at L5 after freeze SHA.

## Risks
- CERT 90% vs v60 from ~33% smoke baseline is extremely hard; long self-play / BC needed.
- Living uploads can re-red gold; never delete author tests.
