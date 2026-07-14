# PROBE p_two — broaden 2-tempo reclaim (H_2_E_non2)

**Date:** 2026-07-13  
**Axis:** one — combat `expertPolicy` 2-tempo mid-top reclaim only (no bulk `expertScore` rewrite)  
**Root:** `ai.js` / `search.js` **untouched**

## Setup

| Item | Value |
|------|--------|
| Freeze | `v91` (`policies/v91-ai.js` + `policies/v91-search.js`) |
| Challenger | `p_two` (`policies/p_two-ai.js` + `policies/p_two-search.js`) |
| AI_BUILD | `v9.2-probe-two` |
| Protocol | fair dual N=20 (`evolve/lean-fair-dual-n20.js`) |
| Env | `FREEZE=v91 CHALL=p_two GAMES=20 SEED=20260711 MS=150 TRIALS=16` |
| OUT | `evolve/probe-p_two-vs-v91-fair-n20.json` |
| Identity baseline | `evolve/identity-v91-fair-n20.json` = **7/20** |

## Patch (challenger only)

Copy of v91 with a **slight expand** of existing `probe-TWO` mid 2-tempo gate:

**v91 (freeze):**
```js
curTop >= 8 && curTop <= 10 &&
twoSingles.length &&
omin <= 3 &&
handLen >= 4 && handLen <= 9 &&
(infoC.trashCount >= 1 || infoC.control >= 2)
```

**p_two:**
```js
curTop >= 8 && curTop <= 10 &&
twoSingles.length &&
handLen >= 4 && handLen <= 10 &&
(omin <= 4 || infoC.trashCount >= 1)
// → prefer play 2 (lowest suit) over mid single
```

Deltas vs v91:
- `omin <= 3` → gate becomes **`omin <= 4 || trashCount >= 1`** (broader short-opp + trash path; drops control-only path unless trash also present)
- `handLen <= 9` → **`handLen <= 10`**
- Still prefer play 2 over mid single when hold 2 and tops in [8,10]

## Results

| Run | liveWins | freezeWins | WR | Δ vs identity 7/20 |
|-----|---------:|-----------:|---:|-------------------:|
| identity v91 (MS120/TRIALS12) | **7** | 13 | 0.35 | — |
| **p_two** (MS150/TRIALS16) | **7** | 13 | 0.35 | **0** |

**Headline: 7/20 · delta vs 7 = 0**

Win seeds identical to identity (no flips, no regs):

`20300603, 20320549, 20340495, 20370414, 20380387, 20420279, 20450198`

Loss seeds (13): see `probe-p_two-vs-v91-fair-n20.json` `lossSeeds`.

## Verdict

- **Neutral** on fair dual N=20 vs freeze v91: no skill delta from this gate expansion alone.
- Expansion is real (omin 3→4, hand 9→10, OR-trash) but insufficient to flip any of the 20 seeds under lean fair BR budgets.
- Do **not** promote to freeze; keep as documented one-axis null result for H_2_E_non2 reclaim.

## Artifacts

- `policies/p_two-search.js` — one-axis 2-tempo broaden
- `policies/p_two-ai.js` — wires `./p_two-search.js`, `AI_BUILD` `v9.2-probe-two`
- `evolve/probe-p_two-vs-v91-fair-n20.json` / `.log`
