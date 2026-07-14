# W75 — `p_w75_ex_fljpair` pure A+1 → ship v9.6

**Date:** 2026-07-14  
**Base bank:** `p_w71_ex_flseq4nineshed` A35/B36 (MS=0 stable)  
**Ship protocol:** **MS=0 TRIALS=20 SOFT=0** (deterministic; MS=200 wall-clock BR thrash rejected)

## Convert
| Seat | Phase | Base | Force | Protocol |
|------|-------|------|-------|----------|
| **20280747@0** | FREE step 5 | `TH JH QD` | **`JH JC`** (pair J) | dual-safe 1-force MS=0 |

Firstdiff vs w71: FREE high seq → pair J, handLen 11 omin 11.

## Gate (ultra multiset)
FREE · handLen===11 · omin===11 ·  
byR: 5/6/7/8===1, T/J/Q===2, K===1, no 3/4/9/A/2 ·  
force legal pair rank J (min suit sum). Search-root hard only.

## Dual vs freeze **v95** (MS=0, dual-rerun identity-stable)
| Holdout | Primary | Rerun | NEW | REV |
|---------|--------:|------:|-----|-----|
| A `20260801` | **36** | **36** | `20280747@0` | ∅ |
| B `20260802` | **36** | **36** | ∅ | ∅ |

Both WR **0.72 > 0.70**. Identity Δ vs freeze = +22 ≥ +2.

## Protect vs v91 (MS=0)
| Holdout | Wins | WR |
|---------|-----:|---:|
| A | **37** | 0.74 |
| B | **36** | 0.72 |

## Rejected path (W74)
`p_w74_ex_acemid` converts 20280747@1 only under MS>0; dual-null MS=0; thrash A/B at MS=200. Not shipped.

## SoftN
FORBIDDEN.
