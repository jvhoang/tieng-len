# Fair dual — p_flct identity+2 (seed-local)

**Date:** 2026-07-14  
**Protocol:** BOTH_SEATS fair dual, MS=150, TRIALS=12, SOFT=4, freeze v91

## Result
| Seed | identity | flct | Δ |
|------|----------|------|--:|
| 20260711 N=50 | 25/50 | **27/50** | **+2** |
| 20260711 N=80 | 40/80 | 42/80 | +2 |
| 20260712 N=50 | 25/50 | 24/50 | −1 |

## Package
- **FL_HYBRID_STRONG** in `pickFreeLeadHard`  
- **Combat residual soft-tie** in `bestResponseMove` score loop  

## Flips (seed11 only)
| Seed,seat | identity | flct |
|-----------|----------|------|
| 20290630,0 | L | **W** |
| 20410306,0 | L | **W** |

No regressions on seed11. Not robust on seed12.

## Promote rule
Do **not** promote to live/freeze until:
1. Δ≥+2 on primary **and** independent seed, **and**
2. absolute WR > 0.70 (still far — needs multi-lever stack beyond flct).
