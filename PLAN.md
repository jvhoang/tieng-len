# PLAN — Fair dual ladder v9.1 → v11.0

**Updated:** 2026-07-14T15:38Z

## Locked protocol
1. Hidden info only  
2. Grandmaster vs grandmaster  
3. **BR ON both seats** (fair; published GM uses BR)  
4. Equal budgets  
5. BR playout leaf = freeze expertPolicy (seats still GM+BR)  
6. N≥50 WR **>0.70** + identity **+≥2 wins**  
7. Gold series 1–3 recommendations  
8. Data-first, one lever at a time  
9. Ship partitions: HOLDOUT_A `20260801` + HOLDOUT_B `20260802` (never DEV alone)  
10. **Ship dual budget: MS=0 TRIALS=20 SOFT=0** (deterministic; avoid MS>0 wall-clock thrash)

## Invalidated
- Perfect-info duals (hollow 40/50) — v9.2–v9.4 harness  
- Live BR-on / freeze BR-off asymmetry  
- softN count sweeps  
- MS=200 dual thrash as ship evidence (Date.now BR cutoff)

## SoftN
FORBIDDEN — do not relaunch. Scripts .DISABLED.

## Shipped fair dual rungs
| Rung | Live / freeze | Dual vs | Holdout A/B | Sum | Protocol |
|------|---------------|---------|-------------:|----:|----------|
| **v9.5** | `policies/v95-*` | freeze **v91** | **36 / 36** | **72** | T20 |
| **v9.6** | `policies/v96-*` | freeze **v95** | **36 / 36** | **72** | **MS=0** T20 |
| **v9.7** | `ai.js`/`search.js` ≡ `policies/v97-*` | freeze **v96** | **36 / 36** | **72** | **MS=0** dual-rerun |

Lever stack v9.7: pure convert-first ultra-multiset hard roots from freeze v96 identity 25/25  
through `p_w76`…`p_w97` (combat + FREE). Final ship tag `p_w97_ex_fl7open`.

## Intermediate bank (not freeze) → shipped as v9.7
| Tag | vs v96 MS0 | Notes |
|-----|------------|-------|
| identity | 25/25 | baseline |
| … | … | pure stack |
| **`p_w97_ex_fl7open`** | **36/36** | **SHIPPED as v9.7** |

## Live wiring (must hold)
- `AI_BUILD.id === "v9.7"`
- Dual evidence: `evolve/dual-primary.json`, `evolve/dual-rerun.json`, `SHIP_READY.md`

## Stack (convert-first, post-v96)
… prior combat/FREE stack … + com8underj · com8over5 · comseq567climb · flpair3open · fltopen · comjover3 · comseq567under · comseqtjq · **fl7open**

## Next
1. **v9.8+** — pure 0-reverse converts on v9.7 freeze until next 0.1 rung  
2. Full-policy firstdiff + identity-diff before promote  
3. Continue → **v11.0**  
4. SoftN stays dead  

## Runner (ship protocol)
```bash
FREEZE=v96 CHALL=v97 SOFT=0 MS=0 TRIALS=20 GAMES=25 BOTH_SEATS=1 \
  SEED=20260801 node evolve/lean-fair-dual-n20.js
```

## Primary gold
`john_uploads/tien_len_AI.txt` + playlogs — see `evolve/NOTE-gold-primary-sources.md`.
