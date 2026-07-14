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
| `p_w49_ex_maxedge` | 25/26 | 36/37 | Queen climb |
| `p_w50_ex_egunder` | 25/27 | 36/36 | Ace underclimb |
| `p_w54_ex_seqadj` | 26/30 | 36/36 | mulowg-band adj seq4 |
| `p_w55_ex_seq5adj` | 27/30 | 36/37 | mid-face adj seq5; A 20430342@1 |
| `p_w56_ex_seqmidunder` | 28/30 | 36/37 | mid-face underclimb; A 20340585@1 |
| `p_w57_ex_qpairclimb` | 28/31 | 36/37 | Queen pair-peel; B 20430343@1 |
| `p_w58_ex_flpair88` | 29/31 | 36/38 | FREE pair-88; A 20460261@1 |
| `p_w59_ex_flmidshed` | 29/32 | 36/37 | FREE mid shed 99→6; B 20460262@0 |
| `p_w60_ex_flegpair` | 30/32 | 37/37 | FREE eg dual-pair→8; A 20490180@1 |
| `p_w61_ex_flpair5` | 30/33 | 37/38 | FREE pair-5 over seq; B 20360532@1 |
| `p_w62_ex_flquad4lead` | 30/34 | 37/38 | FREE trash-3 +quad4; B 20450289@1 |
| `p_w63_ex_flpair6` | 30/35 | 37/38 | FREE pair-6 over seq; B 20300694@0 |
| `p_w64_ex_acejunder` | 30/36 | 37/38 | Ace→J underclimb; B 20470235@0 (**B>0.70**)|
| `p_w65_ex_seqhires13` | 31/36 | 36/38 | open residual J-top; A 20270774@0 |
| `p_w66_ex_comkpeel` | 32/36 | 36/38 | K-peel from quad-K; A 20330612@1 |
| **`p_w68_ex_flseq5exact`** | **33/36** | **36/37** | FREE exact L=5 open; A 20360531@0 |

## Live wiring (must hold)
- `AI_BUILD.id === "v9.5"`
- `search.js` exports/uses `pickComSbc0` + search-root `com-sbc0-hard`
- Dual evidence: `evolve/dual-primary.json`, `evolve/dual-rerun.json`, `SHIP_READY.md`

## Stack (convert-first)
combat: mulowg · pairhi · pairhi_wide · seqhi · sbc0 · maxedge · egunder · qpairclimb · seqhi_res · seqadj · seq5adj · seqmidunder  
FREE: flvol · flshort5 · flhidetight · brseq3 · tripair · pairshed · lotesh · pairseq · twoshed · seqopen · pairseq3 · flpair88 · flmidshed · flegpair · flpair5 · flquad4lead · flpair6 · acejunder · seqhires13 · comkpeel · **flseq5exact**

## Next
1. **v9.6** — stack pure 0-reverse converts on **flseq5exact** until holdout A/B both WR>0.70 **vs freeze v95**  
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
