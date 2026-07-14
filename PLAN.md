# PLAN — Fair dual ladder v9.1 → v11.0

**Updated:** 2026-07-14T16:30Z

## Locked protocol
1. Hidden info only  
2. Grandmaster vs grandmaster  
3. **BR ON both seats** (fair; published GM uses BR)  
4. Equal budgets  
5. BR playout leaf = freeze expertPolicy (seats still GM+BR)  
6. N≥50 WR **>0.70** + identity lift **+≥2 wins on the same seeds**  
7. Gold series 1–3 recommendations  
8. Data-first, one lever at a time  
9. **Fresh random A/B seed sets every eval round** (anti-overfit) — see below  
10. **Ship dual budget: MS=0 TRIALS=20 SOFT=0** (deterministic; avoid MS>0 wall-clock thrash)

## Addendum — anti-overfit seed protocol (2026-07-14)
**Why:** Fixed HOLDOUT_A `20260801` / HOLDOUT_B `20260802` shopping overfits convert packages.
User still wins **>90%** vs shipped v9.6 — fixed-seed dual WR does not measure true skill.

**Each A/B test round must:**
1. Generate a **new random** seed list for partition A and for partition B (saved under `evolve/seed-sets/`).
2. On those **same** seeds run:
   - **CHALL (new AI) vs FREEZE (previous AI)**
   - **FREEZE vs FREEZE** (identity control baseline ≈ 0.50 WR)
3. Ship/pass only if both partitions: chall WR **>0.70** **and** `challWins − identityWins ≥ +2`.
4. Dual-rerun for determinism uses the **same** seed set (MS=0).  
   The **next** ship/bank gate uses a **new** random seed set.
5. Banned as ship seeds: `20260801`, `20260802`, `20260711`, `20260712`.

**Runner:** `evolve/fresh-seed-fair-dual.js`  
**Note:** `evolve/NOTE-fresh-seed-anti-overfit.md`

## Invalidated
- Perfect-info duals (hollow 40/50) — v9.2–v9.4 harness  
- Live BR-on / freeze BR-off asymmetry  
- softN count sweeps  
- MS=200 dual thrash as ship evidence (Date.now BR cutoff)  
- **Fixed-holdout-only ship duals / bank promotion** (pre-addendum v9.5–v9.7 evidence is historical, not anti-overfit certified)

## SoftN
FORBIDDEN — do not relaunch. Scripts .DISABLED.

## Shipped fair dual rungs (historical fixed-seed protocol)
| Rung | Live / freeze | Dual vs | Holdout A/B | Sum | Protocol |
|------|---------------|---------|-------------:|----:|----------|
| **v9.5** | `policies/v95-*` | freeze **v91** | **36 / 36** | **72** | T20 fixed |
| **v9.6** | `policies/v96-*` | freeze **v95** | **36 / 36** | **72** | MS=0 fixed |
| **v9.7** | `ai.js`/`search.js` ≡ `policies/v97-*` | freeze **v96** | **36 / 36** | **72** | MS=0 fixed |

> **Status of v9.5–v9.7:** shipped under fixed holdouts. Live remains **v9.7**.  
> All **future** rungs (v9.8+) and any re-certification require **fresh-seed** protocol above.  
> Fixed-seed intermediate banks (p_w98+) are **dev-only** until re-validated on a fresh seed set.

## Live wiring (must hold)
- `AI_BUILD.id === "v9.7"`
- Dual evidence (legacy): `evolve/dual-primary.json`, `evolve/dual-rerun.json`
- Dual evidence (new): `evolve/fresh-dual-*.json` + `evolve/seed-sets/ship-*.json`

## Next
1. **Baseline fresh-seed eval:** live v9.7 vs freeze v9.6 (+ freeze identity control)  
2. Climb toward real skill on **fresh seeds** (not fixed-holdout convert farming alone)  
3. Ship **v9.8+** only under fresh-seed gates → **v11.0**  
4. SoftN stays dead  

## Runner (ship protocol — anti-overfit)
```bash
# New random A/B each run; also runs freeze-vs-freeze on same seeds
FREEZE=v96 CHALL=v97 SOFT=0 MS=0 TRIALS=20 GAMES=25 BOTH_SEATS=1 \
  node evolve/fresh-seed-fair-dual.js

# Deterministic re-run of the same seed set:
SEED_SET=evolve/seed-sets/ship-....json FREEZE=v96 CHALL=v97 \
  SOFT=0 MS=0 TRIALS=20 GAMES=25 BOTH_SEATS=1 \
  node evolve/fresh-seed-fair-dual.js
```

## Primary gold
`john_uploads/tien_len_AI.txt` + playlogs — see `evolve/NOTE-gold-primary-sources.md`.
