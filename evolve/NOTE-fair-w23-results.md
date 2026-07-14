# W23 — combat sbc_gate on brfltrash base

**Date:** 2026-07-14  
**Base:** `p_w17_brfltrash`  
**Axis:** gold Series1 residual — drop high `structureBreakCost` combat answers when any low-break legal remains (`sbc < 8` keeps, else drop)

## Motivation
Holdout A both-lose sample: brfltrash diverges on only **3/16** seats (18.75%), all FL_other.  
~81% freeze-identical paths → absolute 0.70 needs combat path change.

## First-diff vs freeze (T12 SOFT=0)
| Half | nDiv | combat | FL |
|------|-----:|-------:|---:|
| design | 8/24 | 2 | 6 |
| check | 11/26 | 1 | 10 |

Combat first-diffs exist (unlike W18 br2ctrl).

## Fair dual

| Stage | Result | vs base |
|-------|-------:|--------:|
| Split design Δ | +2 | −1 vs base +3 |
| Split check Δ | +5 | 0 |
| Split full T12 | **31/50** n.s. | −1 |
| **DEV T20** | **32/50** | **−1** (lost trash flip `20350468@0`) |

## Decision
**DISCARD.** Reverse of W17 trash-first mass. Same failure class as W21 pairdrop_mid.  
Do not burn DEV_VAL/holdout.

## Evidence
`policies/p_w23_br_sbc_gate-*`, `evolve/dev-ch-t20-w23-sbc-gate.json`, firstdiff + split latest.
