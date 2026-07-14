# W27 — residual on seqclimb (27/27 best holdout)

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w26_ex_seqclimb`

## Residual diagnosis
Holdout A under seqclimb: **22 both-lose**, **14 freeze-identical (61%)**.  
`20300693@1` still L and still freeze-identical (unique multi `JH QS KS` — soft tax dual-null).  
Multi-tax diverges without converting wins (`20280747@1` etc.).

## Probes

| Tag | Axis | Firstdiff vs seqclimb | DEV | DEV_VAL | Holdout A/B | Decision |
|-----|------|----------------------:|----:|--------:|------------:|----------|
| `p_w27_ex_omin1hi` | gold 0532 omin=1 high single | **0/50** dual-null | — | — | — | discard |
| `p_w27_ex_ctrl2hi` | 2-for-control triple mirror (expert+guards+BR) | design 1 combat, check 0 | **34** dual-null | Δ+3 | **26 / 27** | **discard** (A −1 reverse `20450288@0`) |

## Lessons
1. Gold 2-for-control needs triple mirror to firstdiff at all; still low mass under fair dual.
2. Single firstdiff AS→2S did not flip DEV/holdout wins; loosened gates still dual-flat DEV and **hurt** holdout A.
3. Soft multi climb tax has plateaued for absolute WR — unique multi burns and deal-doomed seats dominate residual.
4. SoftN / W16 pass still forbidden.

## Best package unchanged
**`p_w26_ex_seqclimb`** — DEV 34, DEV_VAL Δ+3, holdout **27/27**.  
Live **v9.4**. Ship WR>0.70 open (~+8 wins).

## Next directions (not implemented)
- Architecture beyond score tax: leaf nest gated, exactExploit equal both, or larger residual package
- Gold loosebeat hard filter with unit tests on screenshots
- Do not re-skin ctrl2hi / SoftN / pass
