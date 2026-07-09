# Tieng Len — STATUS

**Date:** 2026-07-09  
**Strong AI update**

## AI strength
- Chronic-pass fixed: pass rate on cheap (non-2/non-bomb) beats = **0%** (was ~52%).
- Free lead always plays (never null).
- Ranking by estimated P(win) + expert heuristic + MCTS (hard).
- Multi-combo leads; conserves 2s/bombs; prefers minimal beat over overkill.
- Strength: AI seat wins **11/16** vs always-lowest-legal baseline (3p seeds).
- Tests: `node test-ai.js` 32/32; launch-verify ALL GATES PASSED.
- Evidence: `{SCRATCH}/ai-pass-rate.log`, `ai-strength.log`, `ai-tests.log`.

## Live
https://jvhoang.github.io/tieng-len/
