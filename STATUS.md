# Tieng Len — STATUS

**Date:** 2026-07-10  
**v2 AI: hard policy guards + search (user-reported bugs fixed)**

## User-reported failures — fixed
| Issue | Fix |
|-------|-----|
| Free-lead singles only | Hard multi-only free lead when safe multi exists (`pickFreeLeadHard` + `enforcePolicyGuards` + MCTS root filter). **singleWhenMulti = 0** on 100-deal sample |
| Breaking pairs/seqs | Structure-break cost ×2.5 in expertScore; combat prefers non-breaking beats |
| Always pass vs high/2s | Never pass vs Ace/2 when legal; contest K when short; cheap beats always played |
| Mid/endgame high-card waste | Free-lead prefers **low** multi; save 2s; endgame shallow solver when ≤4 cards |

## Strength gate (1000 games, 2p, pure-pass harness)
**v2 vs `policies/observed-weak.js`** (encodes user-observed failure modes: singles free-lead, chronic pass, pair-break preference):

| Metric | Value |
|--------|------:|
| Games | **1000** |
| v2 wins | **995** |
| v2 win rate | **99.5%** |
| 95% CI | **[98.8%, 99.8%]** |
| Target | ≥95% |
| Result | **PASS** |

Artifact: `evolve/v2-vs-v1-final.json`, SCRATCH `ai-strength.log`.

Also: ~95.6% vs pure random (500g); frozen prior-code v1 remains peer-level in symmetric expert (~50–65%) — gains are concentrated on the failure modes above.

## Ship
- Cache-bust `?v=20260710c`
- Local vs-AI: **perfectInfo search** + guards (controller)
- Difficulty: Easy / Medium / Hard / Grandmaster

## Play
https://jvhoang.github.io/tieng-len/ — **hard refresh**

## Commands
```bash
node test-engine.js && node test-search.js && TIENLEN_TEST_FAST=1 node test-ai.js
TIENLEN_BENCH_GAMES=1000 TIENLEN_V1_MODE=observed node evolve/bench-v2-vs-v1.js
```
