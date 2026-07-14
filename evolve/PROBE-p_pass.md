# PROBE p_pass — gated mid-combat structure-preserving pass (H_pass_E_play)

**Date:** 2026-07-13  
**Axis:** one — combat `expertPolicy` structure fold only (pair/triple mid tops; no bulk `expertScore` rewrite)  
**Root:** `ai.js` / `search.js` **untouched** · freeze `policies/v91-*` **untouched**

## Setup

| Item | Value |
|------|--------|
| Freeze | `v91` (`policies/v91-ai.js` + `policies/v91-search.js`) |
| Challenger | `p_pass` (`policies/p_pass-ai.js` + `policies/p_pass-search.js`) |
| AI_BUILD | `v9.2-probe-pass` |
| Protocol | fair dual N=20 (`evolve/lean-fair-dual-n20.js`) |
| Env | `FREEZE=v91 CHALL=p_pass GAMES=20 SEED=20260711 MS=150 TRIALS=16` |
| OUT | `evolve/probe-p_pass-vs-v91-fair-n20.json` |
| Identity baseline | `evolve/identity-v91-fair-n20.json` = **7/20** |
| Interest bar | liveWins **≥ 9** |

## Patch (challenger only)

Copy of v91 with a **gated mid-combat pass** inserted in `expertPolicy` after the existing deep multi fold and **before** the cheap-answer return:

```js
// handLen>=9, omin>=5, cur pair|triple, curTop<9
// cheapest answer (cheapLegals pool else all legals, orderLegals[0])
// if structureBreakCost(hand, cheapest) >= 12 → { pass: true }
```

Gates (exact):
- `handLen >= 9`
- `omin >= 5`
- `cur.type === 'pair' || cur.type === 'triple'`
- `curTop < 9`
- cheapest answer `structureBreakCost >= 12`
- Prefer pass while combating (already-passed seats have empty legals → early pass)

No perfect-info path. No root `ai.js`/`search.js` mutation.

## Results

| Run | liveWins | freezeWins | WR | Δ vs identity 7/20 |
|-----|---------:|-----------:|---:|-------------------:|
| identity v91 (MS120/TRIALS12) | **7** | 13 | 0.35 | — |
| **p_pass** (MS150/TRIALS16) | **7** | 13 | 0.35 | **0** |

**Headline: 7/20 · delta vs identity 7 = 0 · flips 0 · regs 0**

Win seeds identical to identity:

`20300603, 20320549, 20340495, 20370414, 20380387, 20420279, 20450198`

Loss seeds (13): see `probe-p_pass-vs-v91-fair-n20.json` `lossSeeds`.

## Verdict

- **Neutral** on fair dual N=20 vs freeze v91 — **below interest bar (≥9)**.
- No seed flips or regressions vs identity win set.
- Likely near-null activation: under current `structureBreakCost`, pair/triple answers rarely reach cost **≥12** (that threshold is dominated by **single-from-pair** (+12) / interior-run singles). Multi answers typically cost 3–4 (seq-link / triple partial). Gate is correctly coded per one-axis spec but almost never fires in mid pair/triple combat.
- Do **not** promote. Follow-ups if revisiting H_pass_E_play:
  - Lower multi-specific cost threshold (e.g. ≥4) **or** multi-aware residual smash metric (high-pair spend / doubleseq tear).
  - Optional: stack with gold-shaped control gates (2s + midPairs) rather than raw sbc alone.
  - Or move fold soft-tie into combat BR `act==null` score (NOTE-fair-lever-combat-struct) instead of hard expert override.

## Artifacts

- `policies/p_pass-search.js` — one-axis gated structure pass
- `policies/p_pass-ai.js` — wires `./p_pass-search.js`, `AI_BUILD` `v9.2-probe-pass`
- `evolve/probe-p_pass-vs-v91-fair-n20.json` / `.log`
- This note: `evolve/PROBE-p_pass.md`
