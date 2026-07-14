# PROBE p_flhyb — free-lead trash hybrid (one-axis)

**Date:** 2026-07-13  
**Challenger:** `p_flhyb` (policies only; root `ai.js` / `search.js` untouched)  
**Freeze:** `v91`  
**Axis:** free-lead — prefer lowest trash single over multi under deep-hand + high multi + control/2s

## Hypothesis

Human `freeLeadDiffer` trash: early free-lead often sheds lowest trash single when multi top is high, instead of multi-always.  
v91 only applies hybrid trash under `_exploitFlMode === 'hybrid'` (dual-self exploit). This probe applies a **hard** trash preference on the multi-always path.

## Patch (challenger-only)

**Files:**
- `policies/p_flhyb-search.js` (from `v91-search.js`)
- `policies/p_flhyb-ai.js` (from `v91-ai.js`, requires p_flhyb-search)

**Locus:** `pickFreeLeadHard`, after multi pool built / `multiPick` selected, **before** multi-always return:

```javascript
// When handLen>=9 && multi topRank>7 && trash singles exist
// && (twos>=1 || control>=2) → return lowest trash single
if (
  trashPlays.length >= 1 &&
  (info.twos >= 1 || info.control >= 2) &&
  handLen >= 9 &&
  multiPick &&
  topRank(multiPick) > 7
) {
  return trashPlays[0];
}
```

Residual `_exploitFlMode === 'hybrid'` branch left intact.

## Protocol

```bash
FREEZE=v91 CHALL=p_flhyb GAMES=20 SEED=20260711 MS=150 TRIALS=16 \
  OUT=probe-p_flhyb-vs-v91-fair-n20.json \
  node evolve/lean-fair-dual-n20.js
```

- Fair dual: both seats GM, hidden, BR-on, equal lean budgets  
- Artifact: `evolve/probe-p_flhyb-vs-v91-fair-n20.json`  
- Log: `evolve/probe-p_flhyb-vs-v91-fair-n20.log`

## Results

| Side | Wins | WR |
|------|-----:|---:|
| **p_flhyb (live)** | **7/20** | **0.35** |
| v91 freeze | 13/20 | 0.65 |
| Identity baseline (`identity-v91-fair-n20.json`) | 7/20 | 0.35 |

| Metric | Value |
|--------|------:|
| **Delta vs identity** | **0** (7 − 7) |
| Per-game flips vs identity | **0 / 20** |
| Wall time | ~7.0s |

## Verdict

**FLAT / NO GAIN.** Hard free-lead trash hybrid does not move fair dual N=20 vs v91 on this seed block. Outcome is identity-identical (same 7 win seeds, 0 flips) despite slightly higher MS/TRIALS than the identity run (150/16 vs 120/12).

**Do not promote.** Multi-always free-lead remains the dual-stable default; early trash shed either does not fire often enough under hidden BR or does not flip outcomes on SEED=20260711 × N=20.

## Next levers (if revisiting FL trash)

- Softer gate: `handLen >= 10` + `omin >= 5` (custom FL_TRASH_EARLY) vs hard root override  
- Soft score bias only (hybridB / free-lead root scorer) without hard return  
- Combine with FL_SHORT multi ranking, not trash-only
