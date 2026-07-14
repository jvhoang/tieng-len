# W39 — B residual hunt under pairhi_wide — **no new bank**

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w38_ex_pairhi_wide` (A34/B31 sum**65**)

## B residual census
- B losses: **19**  
- Force-alt non-pass converts: **24** (mostly singles thrash, pass forbidden, path-sensitive FREE shortens)

## Candidates tested
| Tag | CF | bothBase force | vs v91 dual | Decision |
|-----|-----|:--------------:|:-----------:|----------|
| fl_midshort | `20360532@1` seq5→seq4/pair | yes (path-sensitive) | **no** | reject |
| com_seqlo | `20420370@0` residual min seq | reported | no clean dual | reject |
| pairhi further | already banked wide | — | — | done W38 |

## Decision
**No W39 package.** Keep **`p_w38_ex_pairhi_wide`**.  
Path-sensitive force-alt under base-vs-base does not imply v91 dual convert (opponent model mismatch).

## Next
- Prefer convert CFs verified with **live vs v91** after force, not only both-base.  
- Revisit gold `com_minsbc` / multi-seat B residual with dual-safe force protocol.

## Evidence
`{SCRATCH}/w39/cf-convert-hunt-B.json`
