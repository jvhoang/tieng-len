# Ladder STATUS — grandmaster N≥50 ≥70%, CF-all, target v9.5 (indefinite)

Updated: 2026-07-12 ~15:15 local

## Protocol
- Freeze opponent: **grandmaster** difficulty (search budgets via env)
- Challenger: grandmaster + exploit/BR
- Gate: seed **20260711**, **≥70%**, **N≥50** + independent re-run
- CF: ALL completed 1v1 playlogs (currently **97**)
- Ship: commit + push **main** and **gh-pages** after each dual pass

## Dual GM results
| Rung | Primary | Re-run | Status |
|------|---------|--------|--------|
| v8.5 vs v87hf | 36/50 (0.72) | 36/50 (0.72) | dual PASS |
| v8.6 vs v85 | 30/50 (0.60) | — | **FAIL** (equal-budget; all lineages 60% on seed) |
| v8.7 vs v86 | 36/50 (0.72) | 36/50 (0.72) | dual PASS |
| v8.8 vs v87 | 36/50 (0.72) | 36/50 (0.72) | dual PASS |
| v8.9 vs v88 | 36/50 (0.72) | 36/50 (0.72) | dual PASS shipped |
| **v9.0 vs v89** | **35/50 (0.70)** | **35/50 (0.70)** | **dual PASS SHIPPED** |

## Live
- `AI_BUILD.id` = **v9.0**
- Freeze: `policies/v90-*`
- CF-all: 97 games, matchRate ~0.614, hidden-info human seat

## Notes
- Gate threshold is **≥0.70** (user “by 70%”); 35/50 qualifies.
- v8.6 historical freeze is weak under GM vs freeze v8.5 (60%); hole documented; later rungs still dual-pass.
- Title screen: file://-safe version badge + update timestamp.

## Next (extended goal)
- Repair v8.6 hole if required for full chain purity
- Continue v9.1 → v9.5
