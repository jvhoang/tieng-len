# Fair dual baseline results (2026-07-14)

## Protocol
- Hidden info, GM both seats, **BR ON both**, equal MS/trials
- BR playout leaf = freeze `expertPolicy` (not recursive getAIMove)
- Runner: `evolve/lean-fair-dual-n20.js`
- Seed0 `20260711`

## Results

| Dual | liveWins | games | WR | vs identity |
|------|---------:|------:|---:|------------|
| identity v91≡v91 | 7 | 20 | 0.35 | — |
| identity v91≡v91 | **19** | **50** | **0.38** | baseline |
| STACK v92 vs v91 | 8 | 20 | 0.40 | +1 |
| v94 vs v91 | 8 | 20 | 0.40 | +1 |
| combat BR struct-tie | 7 | 20 | 0.35 | 0 |
| FL short multi | 7 | 20 | 0.35 | 0 |
| struct orderLegals | 8 | 20 | 0.40 | +1 (noise) |
| struct orderLegals | **19** | **50** | **0.38** | **0** |

| gold-surgical package | **20** | **50** | **0.40** | **+1** |

## Implications
1. **Old 40/50 perfect duals were harness** (budget + BR asymmetry + perfect info), not policy skill.
2. Under fair dual, **STACK / TWO_OMIN2 / residual multiTie do not reach WR>0.70**.
3. Micro BR multiTie / orderLegals ties are **dual-flat** at N=50.
4. Identity WR 0.38 (not 0.50) likely from **shared Math.random stream** between seats — fix next for cleaner measurement.
5. Need **stronger expert-path** levers (structureBreakCost inflation, residual ranking in expertScore, gated combat pass) with gold care.

## SoftN pipeline
**Killed / FORBIDDEN.** Not relevant. Corrupted live to softN16; restored v9.4.

## Ship bar (unchanged)
N≥50 fair dual WR **strict >0.70** AND liveWins ≥ identity + 2.
