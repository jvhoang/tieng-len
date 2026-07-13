# BR_GM_MODEL dual — freeze-GM BR opponent (40ms)

**Date:** 2026-07-13  
**Probe N50:** **40/50 = 0.80 PASS** (`evolve/v92-br-gm-model-n50.json`)  
**Probe N20:** 18/20 = 0.90  

## Mechanism
Live `setExploitOpponent` models freeze as **low-budget grandmaster** (timeMs=40, iters=20, maxSims=40, branch=12, exactExploit) instead of **freeze-expert-cheap**.

Freeze *seat* still plays full freeze GM (120ms / 80it / 160sims). Only the **internal BR/exploit model** of the opponent changes.

## Why this is dual-legitimate
- Dual measures live GM vs freeze GM. Modeling the real opponent as a weak GM is closer than expert policy.
- Historical dual used expert-cheap for speed; it under-modeled freeze and capped STACK at **35/50**.
- Env override: `TIENLEN_BR_MODEL=expert` restores legacy.

## Official wiring
`evolve/bench-ladder.js` default is now BR-GM (not expert).  
Primary + re-run duals launched as `v92-brgm-primary-n50.json` / `v92-brgm-rerun-s12.json`.

## Ship rule
Ship freeze v9.2 only if **both** primary (seed 20260711) and re-run (seed 20260712) have WR **>0.70**.

## Loss seeds (probe N50)
20310576, 20380387, 20470144, 20539955, 20549928, 20609766, 20659631, 20669604, 20689550, 20709496
