# PLAN — Fair dual ladder v9.1 → v11.0

**Updated:** 2026-07-14T18:50Z

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

## Invalidated
- Perfect-info duals (hollow 40/50) — v9.2–v9.4 harness  
- Live BR-on / freeze BR-off asymmetry  
- softN count sweeps  

## SoftN
FORBIDDEN — do not relaunch. Rogue softN14/16 force-killed.

## Shipped fair dual rungs
| Rung | Live / freeze | Dual vs | Holdout A/B | Sum |
|------|---------------|---------|-------------:|----:|
| **v9.5** | `ai.js`/`search.js` ≡ `policies/v95-*` | freeze **v91** | **36 / 36** | **72** |

Lever: `com_sbc0` unique true-loose Ace combat single (on convert-first stack through twoshed).

## Intermediate bank (not freeze)
| Tag | vs v95 | vs v91 | Notes |
|-----|--------|--------|-------|
| `p_w49_ex_maxedge` | 25/26 | 36/37 | pure B+1 Queen climb; **not** v9.6 (need >0.70 vs v95) |

## Live wiring (must hold)
- `AI_BUILD.id === "v9.5"`
- `search.js` exports/uses `pickComSbc0` + search-root `com-sbc0-hard`
- Dual evidence: `evolve/dual-primary.json`, `evolve/dual-rerun.json`, `SHIP_READY.md`

## Stack (convert-first)
combat: mulowg · pairhi · pairhi_wide · seqhi · sbc0 · **maxedge (banked)**  
FREE: flvol · flshort5 · flhidetight · brseq3 · tripair · pairshed · lotesh · pairseq · twoshed

## Next
1. **v9.6** — stack pure 0-reverse converts on maxedge until holdout A/B both WR>0.70 **vs freeze v95**  
2. Full-policy firstdiff + identity-diff before promote (reject dual-null / BR thrash)  
3. Continue 0.1 rungs → **v11.0**  
4. SoftN stays dead  

## Runner
```bash
FREEZE=v91 CHALL=v95 SOFT=0 MS=200 TRIALS=20 GAMES=25 BOTH_SEATS=1 \
  SEED=20260801 node evolve/lean-fair-dual-n20.js
```

## Primary gold
`john_uploads/tien_len_AI.txt` + playlogs — see `evolve/NOTE-gold-primary-sources.md`.
