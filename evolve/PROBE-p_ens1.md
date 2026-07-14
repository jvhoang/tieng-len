# PROBE p_ens1 — FL hybrid strong + short multi pool (ensemble)

**Date:** 2026-07-14  
**Challenger:** `policies/p_ens1-{ai,search}.js` (from freeze v91)  
**Freeze:** v91  
**Root `ai.js` / `search.js`:** **not edited**  
**AI_BUILD:** `v9.2-ens1`

## Axes (two free-lead levers on v91 base)

1. **FL hybrid trash (from p_flstrong):** when free-leading multi exists, prefer lowest trash single if:
   - `trashPlays.length >= 1`
   - `(twos >= 1 || control >= 2)`
   - `handLen >= 9`
   - `multiPick` with `topRank > 6` **or** `length >= 4`
2. **Short multi pool:** among free-lead multi candidates, prefer length **2–3** over **4+** when tops within **2**
3. **Otherwise:** pure v91 (residual `_exploitFlMode === 'hybrid'` branch intact)

### Locus

| File | Change |
|------|--------|
| `policies/p_ens1-search.js` | `pickFreeLeadHard` multi pool sort + hard hybrid trash gate |
| `policies/p_ens1-ai.js` | requires `p_ens1-search.js`; `AI_BUILD.id = "v9.2-ens1"` |

## Protocol

```bash
BOTH_SEATS=1 FREEZE=v91 CHALL=p_ens1 GAMES=25 SEED=20260711 MS=150 TRIALS=12 SOFT=4 \
  OUT=probe-p_ens1-vs-v91-fair-both-n50.json \
  node evolve/lean-fair-dual-n20.js
```

- Fair dual: both seats GM, hidden, BR-on, equal lean budgets  
- `BOTH_SEATS=1` → 25 seeds × 2 seats = **50 games**  
- Identity baseline: `evolve/identity-v91-fair-both-n50.json` = **25/50** (0.50)

## Results

| Metric | Value |
|--------|------:|
| **liveWins** | **25** |
| freezeWins | 25 |
| **liveWinRate** | **0.50** |
| games | 50 |
| identity v91≡v91 | **25/50** (0.50) |
| **Δ vs identity** | **0** |
| ship gate (>0.70) | **FAIL** |

Artifact: `evolve/probe-p_ens1-vs-v91-fair-both-n50.json`  
Log: `evolve/probe-p_ens1-vs-v91-fair-both-n50.log`

### Flips / regs vs identity (by seed, seat)

| Type | (seed, seat) | Identity | p_ens1 |
|------|--------------|----------|--------|
| **Flip** | `(20390360, 1)` | L | **W** |
| **Reg** | `(20390360, 0)` | W | **L** |

- **Flips:** 1  
- **Regs:** 1  
- **Net Δ wins:** 0  

Same seed, opposite seats — pure seat-swap of the outcome under the free-lead patch; no aggregate skill signal.

## Verdict

| Promote? | **NO** |
|----------|--------|
| Keep artifact? | YES — isolatable ens1 FL hybrid + short-multi baseline |
| Headline | **liveWins=25 · delta=0** vs identity 25/50 |

Combining p_flstrong hard hybrid trash with short-multi (2–3 over 4+) pool ranking does **not** move fair dual N=50 vs freeze v91. Net-zero with one flip and one matching reg on seed `20390360`. Do not promote; free-lead multi-always remains dual-stable default for this seed block.
