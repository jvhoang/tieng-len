# PROBE p_minb — combat min-beat order (ONE AXIS)

**Date:** 2026-07-14  
**Challenger:** `policies/p_minb-{ai,search}.js` (from freeze v91)  
**Freeze:** v91  
**Root `ai.js` / `search.js`:** **not edited**

## Axis

In combat (`currentCombo` exists), re-order legals so cheap / same-class answers prefer **minimal top rank (min-beat)** when structure cost ties:

```
sort key (asc): structureBreakCost → topRank → expertScore
```

Free-lead (`!cur`) remains pure `expertScore` (v91).

### Locus

| File | Change |
|------|--------|
| `policies/p_minb-search.js` | `orderLegals` combat branch only |
| `policies/p_minb-ai.js` | requires `p_minb-search.js`; `AI_BUILD.id = "p_minb"` |

Motivation (from `NOTE-fair-human-levers-v91.md` #3 / CF): same-class combat overshoot (`H_minimal_beat_E_overkill` 42; same-class ~75). Prior struct-order probes put expertScore first; this probe **elevates min-top before score** after structure.

## Protocol

```bash
FREEZE=v91 CHALL=p_minb GAMES=20 SEED=20260711 MS=150 TRIALS=16 \
  OUT=probe-p_minb-vs-v91-fair-n20.json \
  node evolve/lean-fair-dual-n20.js
```

- Hidden · GM both · BR ON both · equal budget  
- Leaf = freeze `expertPolicy`  
- Seed0 `20260711`

## Result

| Metric | Value |
|--------|------:|
| **liveWins** | **8** |
| freezeWins | 12 |
| **liveWinRate** | **0.40** |
| games | 20 |
| wall ms | ~6953 |
| identity v91≡v91 | **7/20** (0.35) |
| **Δ vs identity** | **+1** |
| ship gate (>0.70) | **FAIL** |

Artifact: `evolve/probe-p_minb-vs-v91-fair-n20.json`  
Log: `evolve/probe-p_minb-vs-v91-fair-n20.log`

### Win seeds (8)

`20300603, 20320549, 20340495, 20370414, 20380387, 20420279, 20430252, 20450198`

### Loss seeds (12)

`20260711, 20270684, 20280657, 20290630, 20310576, 20330522, 20350468, 20360441, 20390360, 20400333, 20410306, 20440225`

## Interpretation

- **+1 vs identity at N=20** is within fair-dual noise (same band as prior struct-order / STACK +1).  
- Not a promote candidate under ship bar (need N≥50 WR **>0.70** and liveWins ≥ identity+2).  
- Min-beat ordering alone does not move fair dual materially; residual structure / gated fold levers remain higher priority for skill signal.

## Verdict

| Promote? | **NO** |
|----------|--------|
| Keep artifact? | YES — isolatable one-axis baseline |
| Next | Prefer combat residual BR soft-tie or gated mid-combat fold; do not stack min-beat into bulk `expertScore` rewrite |
