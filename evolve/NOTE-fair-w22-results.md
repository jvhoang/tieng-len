# W22 — 2overbreak + pair_minsbc on brfltrash base

**Date:** 2026-07-14  
**Base:** `p_w17_brfltrash`  
**SoftN:** dead (subagent force-killed; scripts DISABLED)

## Axes
| Tag | Gold class | Lever |
|-----|------------|-------|
| `p_w22_br_2overbreak` | 0513/0525/0544 | BR free-lead: re-inject single-2 from pre-cheap full legals when cand set is only pair-breaks |
| `p_w22_br_pair_minsbc` | 0546 | BR free-lead: prefer min-sbc among pair cands when spread allows |

## Fair dual (SOFT=0, T20 = MS200 TRIALS20)

| Stage | 2overbreak | pair_minsbc | brfltrash base |
|-------|-----------:|------------:|---------------:|
| Split design Δ | +3 | +3 | +3 |
| Split check Δ | +4 | +5 | +5 |
| Split full | **32/50** pass | **32/50** pass | 32/50 |
| **DEV T20** | **33/50** | **33/50** | **33/50** |
| vs base flips | **0** (identical) | **0** (identical) | — |
| DEV_VAL | not burned | not burned | Δ+2 PASS |
| Holdout | not burned | not burned | 26/50 |

First-diff vs freeze shows FL_other mass (same class as brfltrash trash-first).  
DEV perGame bit-identical to base: levers do not change fair dual outcomes under T20.

## Decision
**DISCARD both.** Dual-null on best base. Do not promote. Do not burn DEV_VAL/holdout.

## Implication
Another BR free-lead cand micro on the plateau. Absolute holdout 0.70 needs a **larger behavioral axis** (structure/pass/endgame), not more unique-max FL surgery.

## Evidence
- `evolve/dev-ch-t20-w22-2overbreak.json` / `…-pair-minsbc.json`
- `evolve/split-latest-p_w22_*`
- `policies/p_w22_br_*`
