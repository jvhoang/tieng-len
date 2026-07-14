# PLAN — Fair dual ladder v9.1 → v11.0

**Updated:** 2026-07-14T14:35Z

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
| **v9.6** | `ai.js`/`search.js` ≡ `policies/v96-*` | freeze **v95** | **36 / 36** | **72** | **MS=0** T20 |

Lever v9.6: `fl_jpair` FREE pair-J over high T-J-Q seq (convert 20280747@0).

## Intermediate bank (not freeze) → shipped
| Tag | vs v95 MS0 | Notes |
|-----|------------|-------|
| `p_w71_ex_flseq4nineshed` | 35/36 | prior best bank |
| **`p_w75_ex_fljpair`** | **36/36** | **SHIPPED as v9.6** |

## Live wiring (must hold)
- `AI_BUILD.id === "v9.6"`
- `search.js` exports/uses `pickFlJPair` + search-root `fl-jpair-hard`
- Dual evidence: `evolve/dual-primary.json`, `evolve/dual-rerun.json`, `SHIP_READY.md`

## Stack (convert-first)
combat: mulowg · pairhi · pairhi_wide · seqhi · sbc0 · maxedge · egunder · qpairclimb · seqhi_res · seqadj · seq5adj · seqmidunder  
FREE: flvol · flshort5 · flhidetight · brseq3 · tripair · pairshed · lotesh · pairseq · twoshed · seqopen · pairseq3 · flpair88 · flmidshed · flegpair · flpair5 · flquad4lead · flpair6 · acejunder · seqhires13 · comkpeel · flseq5exact · flmidshort · flseq4nineshed · **fljpair**

## Intermediate bank (post v9.6, vs freeze v96 MS=0)
| Tag | A/B | Notes |
|-----|-----|-------|
| identity | 25/25 | baseline |
| `p_w76_ex_acetrip_lowopen` | **26/25** | multi-ply 20260801@1 |
| `p_w77_ex_fltrash3` | **27/25** | FREE trash3 20270774@1 |

Ship v9.7 needs **36/36** vs freeze v96.

## Next
1. **v9.7+** — pure 0-reverse converts on v9.6 freeze until next 0.1 rung  
2. Full-policy firstdiff + identity-diff before promote  
3. Continue → **v11.0**  
4. SoftN stays dead  

## Runner (ship protocol)
```bash
FREEZE=v95 CHALL=v96 SOFT=0 MS=0 TRIALS=20 GAMES=25 BOTH_SEATS=1 \
  SEED=20260801 node evolve/lean-fair-dual-n20.js
```

## Primary gold
`john_uploads/tien_len_AI.txt` + playlogs — see `evolve/NOTE-gold-primary-sources.md`.
