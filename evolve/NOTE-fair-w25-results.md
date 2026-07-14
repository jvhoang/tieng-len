# W25 — architecture stack on climbtax

**Date:** 2026-07-14  
**SoftN:** dead  
**Stack base:** `p_w24_ex_climbtax` (DEV 34, DEV_VAL Δ+4)

## Dead ends
| Tag | Axis | Outcome |
|-----|------|---------|
| `p_w25_br_multionly` | BR same-type multi force | firstdiff 0 vs climbtax |
| `p_w25_ex_smash2` | expert 2 when only structure-breaks | DEV 34 dual-null vs climbtax |
| Pass gates | gold plan-pass | **forbidden** (W16/W18 DEV_VAL reverse) |

## Selected: `p_w25_ex_flweakmp`
Free-lead weak multiPower structure (holdout recon 20440315): when multiPower weak (mp≤4 or single family), prefer trash/safe multi; drop naked low seq/trip. BR FL + pickFreeLeadHard. Never pass.

## Fair dual (SOFT=0 T20)

| Gate | Result | vs climbtax | vs brfltrash |
|------|--------|-------------|--------------|
| Split full | 33/50 Δ+9 | same class | — |
| **DEV T20** | **34/50** | 0 identical | +1 |
| **DEV_VAL** | **28/50 Δ+3 PASS** | −1 (climbtax +4) | +1 (base +2) |
| **HOLDOUT_A** | **27/50 (0.54) Δ+2** | **+1** | **+1** |
| **HOLDOUT_B** | **26/50 (0.52) Δ+1** | **+1** | 0 |
| Ship WR>0.70 both | **NO** | — | — |

Holdout both-lose firstdiff: **13/46 (28%)** (brfltrash 13%, climbtax 22%).

## Decision
**NO SHIP** (need ~35/50).  
**New best holdout package:** `p_w25_ex_flweakmp` (A **27**, B **26**) — first package to lift holdout A above 26.  
Live stays **v9.4**. SoftN dead.

## Next
Need ~+8 holdout wins. Prefer levers that firstdiff remaining both-lose seats without reverse. Seq climb tax still open (singles-only climbtax misses JH→QS→KS). SoftN forbidden.
