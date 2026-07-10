# Grandmaster AI Plan — Tiến Lên

**Target:** 80–90%+ win rate vs prior heuristic/genome AI; feel strong vs good humans.  
**Rules:** Pagat core (`RULES.md`) — bombs vs 2s only, pass lockout, free lead after control.  
**Stack:** Pure static JS (browser + Node v10+).

## Phases
1. **Engine** — Correct legal gen, bombs, free lead; fast clone/apply for sims; rules flags. ✅
2. **Expert baseline** — Structure-preserving heuristics, pass/lead/bomb/endgame discipline. ✅
3. **Search** — Determinized MC + MCTS (UCT), expert rollouts, time budgets, multi-player place utility. ✅
4. **Improve loop** — Parallel benchmarks, promote if stronger, meta-analyst on losses (not genome-only). ✅ (loop runnable)
5. **Integrate** — Wire into controller/UI, difficulty knobs, tests, deploy cache-bust. ✅

## Acceptance
- [x] Engine tests green + fast apply helpers
- [x] Expert alone beats lowest-legal (~65% firsts in 2v2)
- [x] Search (lite) beats expert-only ≥70%+ firsts in 2v2 self-play (measured 72–76%)
- [x] Browser hard decisions ~1–1.5s; grandmaster ~3.5s
- [x] Versioned STATUS + benchmark JSON evidence
- [ ] Ship to Pages with cache bust (deploy step)

## Non-goals this cycle
- Heavy ML (PyTorch) — pure search + heuristics first
- Changing RULES.md bomb contract without user request

## Next improvements (optional)
- Longer self-play curriculum with population of prior versions
- Hidden-info mode for multiplayer AI seats
- Transposition tables / move ordering from prior sims
- Bitmask hand representation if sim throughput becomes bottleneck
