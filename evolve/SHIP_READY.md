# SHIP_READY — Grandmaster v9.6 fair dual

**Protocol:** `fair-hidden-gm-BR-both-equal`  
**Info:** hidden · perfectInfo=false · BR both · equal budget · **SOFT=0 · MS=0 · TRIALS=20**  
**Evidence:** `evolve/dual-primary.json` (A) + `evolve/dual-rerun.json` (B)  
Also: `holdout-A-v96-ms0-*.json`, `holdout-B-v96-ms0-*.json`

| Run | Seed | Wins | WR |
|-----|------|-----:|---:|
| Holdout A primary/rerun | 20260801 | **36/50** | **0.72** |
| Holdout B primary/rerun | 20260802 | **36/50** | **0.72** |

- Live: `AI_BUILD.id = v9.6` + `pickFlJPair` / `fl-jpair-hard` on full convert-first stack through flseq4nineshed
- Freeze: `policies/v96-*` ≡ live package; prior freeze **v95** (and v91 protect 37/36)
- Lever: FREE force pair-J over high T-J-Q seq (convert `20280747@0` under MS=0)
- SoftN: **FORBIDDEN**

**Ladder next:** v9.7 → v11.0 same fair dual gates (MS=0 preferred ship protocol).
