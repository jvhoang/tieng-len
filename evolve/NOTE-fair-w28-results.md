# W28 — min-top multi convert on seqclimb

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w26_ex_seqclimb`  
**Data:** holdout flip CF `20270774@0` (freeze `8D9DTD` → low `345` keeps high package + 2 → WIN)

## Diagnosis
- Residual-max multi (`p_w28_ex_multires`) prefers losing high multi (pairR) — anti-convert on anchor.
- Soft multi tax dual-null on unique multi; BR rate re-selects high multi unless **min-top cand forced**.
- Convert CF: hard min-top same-type multi when pool≥2, curTop≤6, residual 2/control.

## Selected: `p_w28_ex_mulow`
Expert + BR: among ≥2 same-type multi answers, **force min-top only** (BR cand strip to min top rank).  
Not SoftN, not pass, not residual-max.

## Fair dual (SOFT=0 T20)

| Gate | Result | vs seqclimb |
|------|--------|-------------|
| Firstdiff design | 4 combat (lower multi) | — |
| Convert seed 20270774 | **8D9DTD → 3C4C5D** seat0 | path+win |
| Split full | 32/50 Δ+8 | −1 |
| **DEV T20** | **33/50** | **−1** (lost climbtax flip 20420279@0) |
| **DEV_VAL** | **29 Δ+4 PASS** | **+1** (best absolute VAL) |
| **HOLDOUT_A** | **28/50 (0.56) Δ+3** | **+1** convert 20270774@0 + 20340585@0; reverse 20440315@1 |
| **HOLDOUT_B** | **26/50 (0.52) Δ+1** | **−1** |
| Ship WR>0.70 | **NO** | — |

## Dead ends
| Tag | Note |
|-----|------|
| `p_w28_ex_multires` | residual-max anti-convert on 20270774 CF |
| Soft multi tax retune | unique multi dual-null; diverge∩¬convert |
| ctrl2hi reheat | W27 reverse |

## Decision
**NO SHIP.**  
**Best holdout A:** `p_w28_ex_mulow` **28/50**.  
**Best holdout B / sum-stable:** `p_w26_ex_seqclimb` **27/27** (sum 54 = mulow 28+26).  
**Best DEV_VAL absolute:** mulow **29**.  

Live stays **v9.4**. SoftN dead.

## Evidence
`policies/p_w28_ex_mulow-*`, `evolve/dev*-w28-mulow.json`, holdout JSONs,  
`firstdiff-mulow-20270774.json`, `NOTE-w28-flip-candidates.md`, `NOTE-w28-architecture.md`
