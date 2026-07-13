# STATUS — Aggressive multi-agent dual hunt

**Updated:** 2026-07-13T22:30Z

## Dual N=50 ceiling (freeze v91, seed 20260711)

**Best: 34/50 = 0.68** (pure race+ maxBudget MS280 BR96) — reproduced many times.

| Candidate | N=50 WR | Outcome |
|-----------|--------:|---------|
| pure / race+ maxBudget | **0.68** | best |
| BR160 / ultraBudget / COMBO / TWO_OMIN2 | 0.68 | flat |
| GOLD_SURGICAL structure | 0.62 | regress |
| series-1/2/3 bulk gold | 0.50–0.56 | regress |

## Aggressive swarm (30+ parallel probes)

**N=20 top:** BASE 0.80; most soft knobs 0.75 or silent  
**Rejects:** multiTie, dualSelf, MULTI_REFUSE, AA_SAVE, SEQ_GATE, NO_GIFT, ENSEMBLE_FL, UCT_C, PLACE_HUNGRY, hard soft-pass flips that dual-regress  

**Flip-swarm:** TWO_OMIN2 looked good on seed-duel; **full dual no move**.

## Short-loss root causes
- 20380387: multi-climb trap (freeze better same-len with 2)
- 20549928: triple race lose control  
- 20290630: long free-lead seq dump  

## Live
`v9.2 (BR160 maxBudget)` dual running; exotic4 + soft multi-refuse subagents.

## GitHub ship
Only after dual **>0.70** primary+rerun → freeze + **push main + gh-pages**.  
Evidence commits on main (ahead of origin).

## Handoff
Dual-safe gold remains open: GOLD_SURGICAL helps series-1 gold but dual 0.62 at N=50.
