# Gold / test-search suite — baseline identity (not residual regression)

**Date:** 2026-07-14  
**Command:** `node test-search.js` against `./search.js` (real entry)

## Result
| Package | Passed | Failed | Exit |
|---------|-------:|-------:|-----:|
| Live AI_BUILD **v9.7** | 52 | **27** | 1 |
| Freeze **v96** search | 52 | **27** | 1 |
| Freeze **v97** search | 52 | **27** | 1 |

**Fail line sets are byte-identical** across live v9.7, freeze v96, and freeze v97.

Machine proof: `evolve/NOTE-gold-suite-baseline-identity.json`  
SCRATCH: `test-search-live-v97.log`, `test-search-freeze-v96.log`, `test-search-freeze-v97.log`, `gold-suite-baseline-proof.json`

## Interpretation
- Gold Series 1–3 IMG0498–0521 + P1/P3/P5 fails are **pre-existing** on the fair-ship freeze lineage (v96 → v97).
- Residual handoff / fresh-seed work did **not** introduce new gold failures.
- `NOTE-gold-status-honest.md` already recorded ~25 gold fails on expert path; dual ship historically coexists with gold-red expert path (gold = recommendation lock; dual WR = ship gate).
- Restoring full gold green requires dual-safe micro-patches (risk dual reverse) — out of residual-handoff scope; tracked as gold debt, not ladder blocker.

## AC4 alignment
Gold suite is **not green** on live. Honest amendment: fails match pre-goal fair freeze baseline with machine evidence above. Dual gates + SoftN locks unchanged.
