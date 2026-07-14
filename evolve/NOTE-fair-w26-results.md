# W26 — seqclimb tax on flweakmp base

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w25_ex_flweakmp` (holdout 27/26)

## Diagnosis
Holdout A residual under flweakmp: **16/23 freeze-identical**. Anchor `20300693@1` plays multi **`JH QS KS`**.  
W24 climbtax is **`single&&single` only** — never taxes seq/pair.  
W26 jclimb nested multi tax under singles guard → **dead code**, dual-null.

## Selected: `p_w26_ex_seqclimb`
1. Singles climbtax extended to top≥Q (rank 9)  
2. **Multi arm OUTSIDE** singles guard: tax pair/seq/triple top≥Q over curTop≤6 when `multiBurnsHighResidual` + residual 2s/control  
3. Score-only — no SoftN, no pass-unique

## First-diff vs flweakmp
| Half | nDiv | class |
|------|-----:|-------|
| design | **3/24** | combat pair/seq |
| check | **2/26** | combat |
| holdout identical residual | **4/32** | combat |
| **20300693 both seats** | **2/2** | seat1 QS→JH (less overclimb) |

## Fair dual (SOFT=0 T20)

| Gate | Result | vs flweakmp |
|------|--------|-------------|
| DEV T20 | **34/50** | 0 identical |
| DEV_VAL | **28 Δ+3 PASS** | 0 |
| **HOLDOUT_A** | **27/50 (0.54) Δ+2** | 0 |
| **HOLDOUT_B** | **27/50 (0.54) Δ+2** | **+1** (flip `20500154@0`) |
| Ship WR>0.70 | **NO** | — |

## Decision
**NO SHIP** (need ~35/50).  
**New best holdout package:** `p_w26_ex_seqclimb` — A **27** / B **27** (first B≥27).  
Live stays **v9.4**. SoftN dead.

## Dead end
`p_w26_ex_jclimb` — multi tax nested wrong; dual-null; discard.

## Evidence
`policies/p_w26_ex_seqclimb-*`, `evolve/dev-*-w26-seqclimb.json`, holdout JSONs, firstdiff residual, `NOTE-w26-seqclimb.md`, `NOTE-w26-holdout-A-residual.md`
