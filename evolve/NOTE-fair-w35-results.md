# W35 — flhidefer (FREE high-pair defer) — **DISCARDED**

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w34_ex_seqhi` (A32/B29 sum**61**)

## Diagnosis
Force-alt freeze-id under seqhi: star **`20290721@0`** FREE `QQ` → low single `9D` WIN (gold 0538/0540 spirit).  
Root dual-nulls: exact-endgame + soft multi ensemble re-picked QQ over trash.

## Probe: `p_w35_ex_flhidefer`
FREE: handLen 7–11, omin≥5, residual control, high pair (top≥J) legal → hard min-rank single ≤9.  
Search root hard override before exact-endgame.

## Fair dual

| Gate | flhidefer | seqhi |
|------|----------:|------:|
| DEV | 32 | 33 |
| DEV_VAL | 25 | 26 |
| HOLDOUT_A | **32** | 32 |
| HOLDOUT_B | **28** | **29** |
| **A+B sum** | **60** | **61** |

### Flips vs seqhi
- A gains: `20330612@1`, `20460261@1` · losses: `20400423@0`, `20480207@1`  
- B gains: **`20290721@0`** (CF), `20480208@0` · losses: `20260802@1`, `20380478@0`, `20460262@1`  
- Net B **−1** reverse → **discard** (anti-reverse bar).

## Decision
**DISCARD.** Live best remains **`p_w34_ex_seqhi` A32/B29 sum61**.  
CF convert proven but holdout B reverse; do not widen hidefer without tighter gates (e.g. only pair top≥K, handLen≤9).

## Evidence
`policies/p_w35_ex_flhidefer-*` (kept for archive), dual JSONs, `{SCRATCH}/w35/cf-convert-hunt.json`
