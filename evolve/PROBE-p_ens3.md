# PROBE p_ens3 — STACK(v92) + gold-surgical structure + FL hybrid

**Date:** 2026-07-13  
**Challenger:** `p_ens3` (policies only; root `ai.js` / `search.js` untouched)  
**Freeze:** `v91`  
**Build:** `AI_BUILD` id `v9.2-ens3`

## Composition

| Layer | Source / locus |
|-------|----------------|
| Base | `policies/v92-search.js` (STACK softSamples default 10 + EXACT_ONLY free-lead exactMs 320) |
| Structure package (gold-surgical) | inflate `structureBreakCost`; combat `orderLegals` structure-first; combat BR soft-tie |
| FL hybrid trash | `pickFreeLeadHard`: `handLen>=9` && multi `topRank>6` && (twos≥1 or control≥2) → lowest trash single |
| AI wire | `policies/p_ens3-ai.js` from `v92-ai.js` → `require('./p_ens3-search.js')` |

### Structure package detail

1. **`structureBreakCost` inflate** — pair smash 14/8 (was 8/5); single run: ≥3-chain interior 16 / edge 8, else 10 / 4  
2. **`orderLegals` combat structure-first** — when `cur`: break cost → min top → `expertScore`  
3. **Combat BR soft-tie** — among combat BR candidates:  
   `multiTie -= min(0.01, sbc * 0.0005)`; `+0.0015` if not expensive

### FL hybrid detail

```javascript
// pickFreeLeadHard, after multiPick, before multi-always return
if (
  trashPlays.length >= 1 &&
  (info.twos >= 1 || info.control >= 2) &&
  handLen >= 9 &&
  multiPick &&
  topRank(multiPick) > 6
) {
  return trashPlays[0];
}
```

Residual `_exploitFlMode === 'hybrid'` branch left intact. STACK soft/exact paths from v92 retained.

## Protocol

```bash
BOTH_SEATS=1 FREEZE=v91 CHALL=p_ens3 GAMES=25 SEED=20260711 MS=180 TRIALS=16 SOFT=6 \
  OUT=probe-p_ens3-vs-v91-fair-both-n50.json \
  node evolve/lean-fair-dual-n20.js
```

- Fair dual: both seats GM, hidden, BR-on, equal lean budgets  
- `BOTH_SEATS=1` → 25 seeds × 2 seats = **50** games  
- Artifact: `evolve/probe-p_ens3-vs-v91-fair-both-n50.json`  
- Log: `evolve/probe-p_ens3-vs-v91-fair-both-n50.log`

## Results

| Side | Wins | WR |
|------|-----:|---:|
| **p_ens3 (live)** | **25/50** | **0.50** |
| v91 freeze | 25/50 | 0.50 |
| Identity baseline (`identity-v91-fair-both-n50.json`) | 25/50 | 0.50 |
| Prior best combo (`p_combo` struct+FL hybrid, no STACK) | 26/50 | 0.52 |

| Metric | Value |
|--------|------:|
| **Delta wins vs identity** | **0** (25 − 25) |
| **Delta WR** | **0.00** |
| Per-game flips vs identity | **4 / 50** (gain 2, loss 2) |
| Wall time | ~18.4s |

### Flips vs identity (same seed×seat)

| Seed | Seat | Identity | p_ens3 |
|-----:|-----:|:--------:|:------:|
| 20290630 | 0 | L | **W** |
| 20390360 | 0 | W | L |
| 20390360 | 1 | L | **W** |
| 20470144 | 0 | W | L |

Net flip balance = 0.

## Verdict

**FLAT / NO GAIN.** STACK(v92) + gold-surgical structure + FL hybrid trash (`handLen≥9`, multi top `>6`) is **identity-tied at 25/50** under fair BOTH_SEATS dual.

- Does **not** beat identity (+0)  
- Trails prior `p_combo` (v91-base struct+FL, **26/50**, +1) by 1 win  
- 4 outcome flips cancel (2 gain / 2 loss) — levers fire but cancel under this seed block  

**Do not promote.** Ship gate remains WR >0.70 and identity +2; neither met.

## Files (policies only; no root edits)

- `/Users/johnhoang/Developer/Grok/tieng-len/policies/p_ens3-search.js`
- `/Users/johnhoang/Developer/Grok/tieng-len/policies/p_ens3-ai.js`
- `/Users/johnhoang/Developer/Grok/tieng-len/evolve/probe-p_ens3-vs-v91-fair-both-n50.json`
- `/Users/johnhoang/Developer/Grok/tieng-len/evolve/PROBE-p_ens3.md`
