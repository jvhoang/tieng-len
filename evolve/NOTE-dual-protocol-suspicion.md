# Dual ladder suspicion analysis (user 2026-07-14)

## Verdict: **yes, the 40/50 streak is suspicious and largely explained**

### Primary seed 20260711 loss sets are **identical** across:

| Run | liveWins | same 10 losses? |
|-----|---------:|:---------------:|
| v9.2 ship vs freeze v91 (BR-GM) | 40/50 | yes |
| v9.3 **identity** live≡v92 | 40/50 | **yes (same set)** |
| v9.3 residual multiTie | 40/50 | yes |
| v9.4 TWO_OMIN2 | 40/50 | yes |
| v9.5 combat-BR denser | 40/50 | yes |

Exact shared lossSeeds:
`20310576, 20380387, 20470144, 20539955, 20549928, 20609766, 20659631, 20669604, 20689550, 20709496`

**Implication:** after BR-GM dual protocol landed, **code-identical live already scores 40/50** against the previous freeze under dual budgets. Subsequent 0.1 rungs mostly **re-stamp** the same budget/BR asymmetry. Policy micro-deltas (residual multiTie, TWO_OMIN2, combat BR 56→80) are dual-flat on primary seed11.

### Why v9.1→v9.2 was hard, then rungs became easy

1. **Hard phase:** dual used `freeze-expert-cheap` BR model; pure identity ~0.5–0.68; STACK hit **35/50 = 0.70 FAIL** (strict >0.70).
2. **Break:** change dual BR opponent to freeze GM@40ms → probe **40/50**.
3. **Easy phase:** every later freeze shares STACK+BR-GM world; live still gets **280ms + BR-on + softN10 + BR model of freeze**, freeze seat still **120ms + BR-off**. That asymmetry alone ≈ **80%**.

So the ladder after v9.2 is measuring **search budget / BR harness**, not “smarter policy than last freeze.”

### Dual ≠ human strength

| Setting | Live human play | Dual gate |
|---------|-----------------|-----------|
| Info | **hidden** (AI doesn’t see human cards) | **perfect info** both sides |
| Time | browser GM ~900ms, imperfect BR | live 280ms vs freeze 120ms |
| Opponent model | human-like noise | freeze seat deterministic GM |
| Gate | you still win **>90%** | liveWinRate **>70% vs weak freeze seat** |

Beating a half-time freeze AI with perfect info is a different game than beating you.

### Hints vs GM you play against

Hints (index.html / tests): **hiddenInfo:true, perfectInfo:false** — expert/search under uncertainty; free-lead hard fallbacks; can surface 2-tempo expert lines.

GM seat (controller.js): hard/grandmaster **perfectInfo:true** when 2p, **timeMs ~900**, BR/exact path can **override** expert 2-tempo. Expert has V94_TWO_OMIN2 / Ace+2 rules; full BR playouts often refuse burning 2s if rollouts look worse. Result: **hint can recommend 2s that the GM search never commits**.

### What a honest ladder needs (proposal)

1. **Identity check first:** dual live≡freeze with **equal budgets** must be ~0.50; if live@280 already 0.80 vs freeze@120 same code, **do not ship a rung** without code delta that flips ≥1 residual loss on LOG_GAMES.
2. **Accept rule:** promote only if dual N=50 **beats identity baseline by ≥+2 wins** on same seed0, not just absolute >0.70.
3. **Human-facing gate:** optional N≥20 hidden-info vs fixed human-log / seed mines; or CF match rate on newest playlogs.
4. **Hint/GM alignment:** same info model for hint as GM (or label hints “expert under hidden info”).
5. **Equal-budget dual** as secondary report: live@200 vs freeze@200 same BR model.

### Immediate action

- Pause hollow 0.1 rungs until accept rule #2 is implemented.
- Document this openly; do not treat 40/50 as proof of human-visible strength.
