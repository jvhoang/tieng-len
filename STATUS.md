# STATUS — Fair dual ladder (honest residual handoff)

**Updated:** 2026-07-14T16:45Z  
**Live / freeze:** **v9.7** (`AI_BUILD.id=v9.7`)  
**SoftN:** **DEAD**  
**Ship protocol:** fresh random A/B seeds + freeze-vs-freeze control · MS=0 TRIALS=20 SOFT=0  

## Goal status: INCOMPLETE — honest residual handoff

**Not v11.0.** Blocker: under fresh-seed fair dual, no pure transfer-safe lever clears  
WR>0.70 both partitions with +≥2 wins over freeze identity on the same seeds.

### Fresh-seed evidence (authoritative)

| Probe | Freeze | A | B | ΔA | ΔB | Class |
|-------|--------|--:|--:|---:|---:|-------|
| v97 vs v96 | v96 | 25/50 | 25/50 | 0 | 0 | dual-null |
| p_t1_ex_xfer | v97 | 21/50 | 21/50 | −4 | −4 | reverse |
| p_t2a_fltrash | v97 | 23/50 | 24/50 | −2 | −1 | reverse |
| p_t2b_midclimb | v97 | 25/50 | 24/50 | 0 | −1 | dual-null |

Full writeup: `evolve/NOTE-fair-residual-handoff-v97.md`  
Runner: `evolve/fresh-seed-fair-dual.js` · Note: `evolve/NOTE-fresh-seed-anti-overfit.md`

### Historical fixed-seed ships (not anti-overfit certified)
v9.5 / v9.6 / v9.7 at 36/36 on fixed HOLDOUT_A/B only.

### Multi-seed residual census
`evolve/force-census-v97-identity.json` — hits exist; packaging transfers poorly.

## SoftN
FORBIDDEN forever under this goal.

## Resume
See handoff note § Resume path. Next ship must use **new** seed set and clear identity-lift gates.
