# STATUS — Fair dual ladder (convert-first climb active)

**Updated:** 2026-07-14T23:39Z  
**Live / freeze:** **v9.9** (`AI_BUILD.id=v9.9`, freeze `policies/v99-*`)  
**SoftN:** **DEAD**  
**Ship protocol:** convert-first · MS=0 TRIALS=20 SOFT=0 · fresh dual identity  

## Goal status: IN PROGRESS — ladder climbing v10.0 → v11.0

### Shipped this session
| Rung | Bank | S | Primary | Rerun | Freeze |
|------|------|---|---------|-------|--------|
| **v9.8** | `p_r98e_p17` | ship-…T17-22-34…-v97 | **38/36** Δ13/11 | **38/36** | v98 |
| **v9.9** | `p_r99g_p16` | ship-…T22-01-46…-v98 | **37/36** Δ12/11 | **37/36** | v99 |

### Active
- `ladder-to-v11.js` START_FROM=**v10.0** FREEZE=v99 OUT_TAG=`p_r100_kfvp` MAX_PACKS=35 FORCE_SEAT_CAP=20  
- Watchdog: `{SCRATCH}/watchdog-ladder.sh` restarts ladder if idle before v11.0  
- Logs: `{SCRATCH}/ladder-to-v11.log`, `ship-p_r*.log`, `supervisor.log`

### Tooling fixes (convert climb)
1. Pure-accept keeps best baseline on REJECT  
2. FORCE_SEAT_CAP + **lagging-partition residual interleave**  
3. SKIP_IDENTITY intermediate duals; full identity ship cert + rerun  
4. pair / seq3–7 packaging  

### Unit suite
engine 42/0 · ai 37/0 · search 52/27 (gold baseline). SoftN `.DISABLED`.
