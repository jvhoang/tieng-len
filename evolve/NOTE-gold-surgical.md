# GOLD_SURGICAL — dual-safe combat structure on pure v91

**Timestamp:** 2026-07-13  
**Base:** `d7f053a` pure v9.1 (`layer-d7f053a/search.js` + `ai.js`)  
**Cherry-pick source:** `acf108c` combat-only pieces  
**Probe:** `$SCRATCH/probes/GOLD_SURGICAL/`  
**Main repo:** `search.js` **not** permanently modified by this probe

## Headline results

| Metric | Value |
|--------|------:|
| **Gold IMG/P suite** | **11 / 30 pass** (19 fail) · rate **0.367** |
| **Series-1 expert (0498–0504)** | **6 / 7** |
| **Series-1 combat-only (ex free-lead 0499)** | **6 / 6** |
| **Dual N=20 WR (max budget)** | **0.80 (16/20)** |
| **Dual gate (>0.70)** | **PASS** |
| **vs pure v91 dual N=20** | **tied 0.80** (same wins) |
| **Promote candidate?** | **YES** — dual ≥0.70 and series-1 combat all green |

### Dual N=20 (fixed `run-isolated-probe.sh`)

```
TIENLEN_V8_MS=280 TIENLEN_V8_ITERS=200 TIENLEN_V8_SIMS=480
TIENLEN_BR_TRIALS=96 TIENLEN_V8_BRANCH=24
SEED=20260711 GAMES=20  vs freeze v91
```

| Field | Value |
|-------|------:|
| liveWins | **16** |
| freezeWins | 4 |
| **liveWinRate** | **0.80** |
| wall ms | 760840 (~12.7 min) |
| lossSeeds | `20260711, 20310576, 20320549, 20380387` |

Artifacts: `GOLD_SURGICAL-n20-v2.json`, `GOLD_SURGICAL-n20-v2.log`, `GOLD_SURGICAL-dual-run.out`

### Gold suite (HEAD `test-search.js` IMG0498–0521 + P1/P3/P5)

**PASS (11):** IMG0498, 0500, 0501, 0502, 0503, 0504, 0512, 0513, 0516, 0519, P5  

**FAIL (19):**  
- Free-lead / series-2 force (excluded by design): 0499, 0506×2, 0507×2  
- Series-2 combat not cherry-picked: 0505×2, 0510×2, 0511×2  
- Series-3 / control-plan / priorities: 0514, 0517, 0518, 0520a/b, 0521, P1, P3  

vs pure v91 residual (~25 gold fails): **~6 net gold gains** without dual regression on N=20.

## What was added (combat only)

From `acf108c` onto pure `d7f053a`:

1. **Inflated `structureBreakCost`** — pair/run smash scale (20/14/28/24/…), ≥3-chain aware (not 2-card connectors)
2. **`residualQuality` + `pickStructureSafe`** — residual-first among same-len seq answers (0503)
3. **`orderLegals` structure-first** — break cost → min safe single (non-2) → residual multi → expertScore
4. **Combat cheap paths** (`expertPolicy` + `enforcePolicyGuards`): expand pool with 2s when min cheap structure cost ≥16; prefer 2 over structure-smash high single (0500/0513/0516/P5)
5. **`expertScore` combat**: `sbcC * 2.5` + residual multi term
6. **Soft-pass narrowed to pairs/trips only** — so residual **seq** answers are not auto-folded (needed for 0503); **not** bulk structure-pass

## Explicitly NOT included

| Excluded | Why |
|----------|-----|
| **Structure-pass bulk** (`safeCost ≥ 20` → pass mid pair/trip) | Dual risk; 0501 already PASSes via pure soft-pass |
| **Doubleseq free-lead force** (0506/0507) | Series-2 free-lead; known dual harm |
| **Free-lead 2 vs short opp** (0499) | Free-lead force, not combat ranking |
| **Series-2/3 bulk** (0510/0511 pass rules, trash free-lead, etc.) | Out of scope |

## Series-1 expert detail

| Case | Result | Notes |
|------|--------|-------|
| IMG0498 combat pair | **PASS** | A not 6-from-pair |
| IMG0499 free-lead 2 | **FAIL** | Free-lead force excluded by design |
| IMG0500 combat 2 | **PASS** | 2 not Q-from-JQK |
| IMG0501 structure pass | **PASS** | Pure soft-pass path (no bulk structure-pass) |
| IMG0502 run protect | **PASS** | K/A not run edge |
| IMG0503 residual multi | **PASS** | 9-10-J-Q family |
| IMG0504 J not run-edge | **PASS** | J not 8-from-789 |

## Comparison

| Build | Gold fails (approx) | Dual N=20 WR |
|-------|--------------------:|-------------:|
| pure v91 `d7f053a` | ~25 | **0.80** |
| full series-1 `acf108c` (layer map) | 18 | 0.75 |
| S1_COMBAT_ONLY (race-base + structure-pass) | combat 6/6; FL 0499 fail | 0.75 (v2) |
| **GOLD_SURGICAL (this)** | **19** (11 pass / 30) | **0.80** |

Dropping structure-pass bulk recovered dual to pure level while keeping series-1 **combat** gold.

## Promote recommendation

**YES — promote candidate** under N=20 dual gate:

- Dual **0.80 ≥ 0.70** and matches pure maxbudget N=20  
- Series-1 combat **6/6** green  
- Only series-1 miss is free-lead 0499 (intentionally excluded)

**Before ship:** reconfirm dual at **N≥50** (N=20 is ranking-quality; pure maxbudget N=50 historically ~0.68). Do not stack series-2 free-lead force without a fresh dual gate.

## Artifacts

```
$SCRATCH/probes/GOLD_SURGICAL/{search.js,ai.js,test-search.js,run-dual.js}
$SCRATCH/probes/GOLD_SURGICAL-n20-v2.json
$SCRATCH/probes/GOLD_SURGICAL-n20-v2.log
$SCRATCH/probes/GOLD_SURGICAL-gold-full.log
$SCRATCH/probes/GOLD_SURGICAL-gold-expert.json
$SCRATCH/probes/GOLD_SURGICAL-summary.json
$SCRATCH/probes/GOLD_SURGICAL-summary.md
```
