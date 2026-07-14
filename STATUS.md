# STATUS — Fair dual ladder (resumable handoff)

**Updated:** 2026-07-14T16:22Z  
**Live / freeze:** **v9.7** live (fixed-holdout ship history; **fresh-seed lift = 0**)  
**SoftN:** **DEAD**  
**Ship protocol (LOCKED):** fresh random A/B seeds each round + freeze-vs-freeze control · MS=0 TRIALS=20 SOFT=0  

## Protocol addendum (user 2026-07-14) — IMPLEMENTED
- Runner: `evolve/fresh-seed-fair-dual.js`
- Note: `evolve/NOTE-fresh-seed-anti-overfit.md`
- Each eval: **new** A/B seeds · CHALL vs FREEZE **and** FREEZE vs FREEZE on same seeds
- Pass: both WR>0.70 **and** +≥2 wins over identity on those seeds
- Next eval → new seeds again
- Fixed HOLDOUT_A/B ship duals **FORBIDDEN**

## Critical baseline (fresh seeds) — machine evidence
**CHALL=v97 FREEZE=v96** · GAMES=25 BOTH_SEATS=1 MS=0 TRIALS=20 SOFT=0  

| Arm | A | B | WR |
|-----|--:|--:|----:|
| chall vs freeze | **25/50** | **25/50** | **0.50** |
| freeze vs freeze | **25/50** | **25/50** | **0.50** |
| Δ (chall − id) | **0** | **0** | — |

- Seed set: `evolve/seed-sets/ship-2026-07-14T16-19-37-026Z-v97-vs-v96.json`
- Report: `evolve/fresh-dual-baseline-v97-vs-v96.json`
- **Conclusion:** seat-exact convert stack from fixed holdouts does **not** transfer. Matches user report of **>90%** human wins vs v9.6 — fixed-seed 36/50 was overfit.

## Historical fixed-seed ships (not anti-overfit certified)
| Rung | vs freeze | A | B | Protocol |
|------|-----------|--:|--:|----------|
| v9.5 | v91 | 36 | 36 | T20 fixed |
| v9.6 | v95 | 36 | 36 | MS=0 fixed |
| v9.7 | v96 | 36 | 36 | MS=0 fixed |

## Next (honest path to v11.0)
1. **Stop** fixed-holdout convert farming as ship evidence  
2. Prefer **transfer-safe** levers (gold/human patterns, multi-seed residual, architecture)  
3. Validate every bank/ship on a **fresh** seed set with identity control  
4. SoftN never  

## Goal end-state
**v11.0** under **fresh-seed** fair dual gates (or honest residual handoff with machine evidence).  
**Not complete** — v9.7 is live but **fresh-seed null** vs v9.6.
