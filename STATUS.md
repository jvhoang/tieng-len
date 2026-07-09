# Tieng Len — STATUS

**Date:** 2026-07-09  
**10M-game self-play + multi-card free leads**

## AI behavior fixes
- Free lead **hard-prefers** pairs/sequences/triples over singles when legal (`pickFreeLead`)
- 2s contest high tops (K/A) instead of eternal fold
- Genome floors prevent evolution from unlearning multi-lead

## Evolution (this run)
- **100,000 loops × 100 games = 10,000,000** self-play matches
- Strategist every 20 loops
- Final champion in `champion-genome.json` / baked into `genome.js`
- Runner: `TIENLEN_EVOLVE_LOOPS=100000 node evolve/run-evolve.js`

## Play
https://jvhoang.github.io/tieng-len/ (hard refresh)
