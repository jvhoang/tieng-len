# Ladder STATUS — v9.0 → v11.0

Updated: 2026-07-13T02:50Z

## Protocol (user)
| Setting | Value |
|---------|--------|
| N | **≥50** continuous 2p |
| Target | **WR > 0.70** (strict ≥36/50) |
| Seed | **20260711** primary + independent re-run |
| Live | **grandmaster** + exploit/BR |
| Freeze | **grandmaster** (search of frozen policy) |
| CF | refresh ALL 1v1 playlogs each phase |
| Ship | freeze + main + gh-pages after dual pass |

## Versions
v9.1 … v9.9, v10.0 … v10.9, **v11.0**

## Completed rungs
| Rung | Freeze | Dual GM N=50 | Notes |
|------|--------|--------------|-------|
| **v9.0** | `policies/v90-*` | prior expert N=100 + GM baseline | freeze champion until v9.1 |
| **v9.1** | `policies/v91-*` | **36/50 + 36/50 (0.72)** vs v90 GM | **SHIPPED** |

### v9.1 package (real strength)
1. **Structure-break singles** — exact-endgame no longer splits pairs/runs when a loose beat ties (user report)
2. **Broader 2-tempo** (probe-TWO) — mid tops J–K band when `omin≤3`; flips seed `20510036`
3. Soft-pass contest merge (TWO) — contest more mid-tops when short
4. leafEval race 0.056 / trash / ctrl / lead / 1-card
5. Short multi BR bias + multiBonus
6. Mild combat pass (ladder-tuned)

Artifacts: `evolve/v91-vs-v90-final.json`, `evolve/v91-vs-v90-rerun.json`  
CF: 97 completed 1v1; human WR in corpus ~89.7%  
Note: user structure-break fixed in `evolve/NOTE-structure-break-single.md`

## Next
- Refresh playlogs → CF → **v9.2** dual GM N=50 vs freeze **v91** → ship
- Continue 0.1 steps to **v11.0**
