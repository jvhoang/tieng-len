# STATUS — Fair dual ladder (resumable handoff)

**Updated:** 2026-07-14T14:45Z  
**Live / freeze:** **v9.6** SHIPPED (commit `384d3aa` main · `4d2abf4` gh-pages)  
**SoftN:** **DEAD**  
**Freeze package:** `policies/v96-*` ≡ live `ai.js`/`search.js`

## v9.6 ship (closed)
| vs freeze **v95** | Protocol | Wins | WR |
|-------------------|----------|-----:|---:|
| Holdout A | MS=0 T20 dual-rerun | **36/50** | **0.72** |
| Holdout B | MS=0 T20 dual-rerun | **36/50** | **0.72** |
| Protect A vs v91 | MS=0 | **37/50** | 0.74 |
| Protect B vs v91 | MS=0 | **36/50** | 0.72 |

- Lever: **`fl_jpair`** FREE force pair-J over high T-J-Q seq  
- Convert: **`20280747@0`** pure NEW · REV ∅  
- Evidence: `evolve/dual-primary.json`, `dual-rerun.json`, `SHIP_READY.md`, `GAPS-CLOSED-FAIR-V96.json`  
- Tests: `test-engine` + `test-ai` pass  

## Protocol lock
**Ship duals use MS=0 TRIALS=20 SOFT=0** (deterministic).  
MS=200 wall-clock BR thrash rejected as ship evidence (W74 acemid).

## Next — ladder v9.7 → v11.0
Residual A after v96 (14 seats, need A≥37 for WR>0.70 vs freeze **v96**):
```
20260801@1  20290720@0  20300693@1  20350558@1  20370504@1
20380477@0  20390450@1  20400423@1  20410396@1  20420369@0
20440315@0  20450288@1  20470234@0  20480207@0
```
1-force MS=0 vs v95 residual: **in progress / expect empty** (multi-ply skill).  
Next: dual-safe 2/3-force + gold CF under MS=0; SoftN never.

## Stack
… → flseq4nineshed A35 → **fljpair A36** / B36 (MS=0) · freeze **v9.6**
