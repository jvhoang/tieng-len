# Tieng Len — STATUS

**Date:** 2026-07-09  
**Self-play evolution complete**

## Evolution
- **1000 loops × 100 games = 100,000** self-play matches (2p candidate vs champion)
- Winner of each matchup promoted as champion (strict majority)
- **Strategist every 20 loops** (50 strategist reports) directs mutation focus
- Final champion: see `champion-genome.json` (gen ≥ 400 after evolution)
- Runner: `node evolve/run-evolve.js` (smoke: `TIENLEN_EVOLVE_SMOKE=1`)

## Evidence (scratch)
- evolve-full.log, evolve-summary.json, strategist-audit.log, strategist/*.json
- champion-genome.json shipped as default policy params

## Default AI
- `genome.js` loads champion-genome.json
- `ai.js` `getAIMove` uses active/champion genome
- Browser loads `genome.js` before `ai.js`
