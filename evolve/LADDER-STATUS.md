# Ladder STATUS — grandmaster N=50, CF-all, target v9.5 (indefinite)

Updated: 2026-07-12 ~12:55 local

## Protocol
- Freeze opponent: **grandmaster** search
- Challenger: grandmaster + exploit/BR
- Gate: seed 20260711, **>70%**, **N≥50** + re-run
- CF corpus: ALL completed 1v1 playlogs (~97+)
- **Ship to GitHub after each dual-passed rung** for live testing

## Dual GM N=50 results
| Rung | Primary | Re-run | Status |
|------|---------|--------|--------|
| v8.5 vs v87hf | 36/50 (0.72) | 36/50 (0.72) | dual PASS |
| v8.6 vs v85 (old freeze) | 30/50 (0.60) | — | FAIL |
| v8.6 live-strengthened | mid ~40@0.625 | — | FAIL risk |
| v8.7 vs v86 | 36/50 (0.72) | 36/50 (0.72) | dual PASS |
| v8.8 vs v87 | 36/50 (0.72) | 36/50 (0.72) | dual PASS **SHIPPED live** |
| v8.9 vs v88 | 36/50 (0.72) | need freeze+rerun | primary PASS |

## Live on GitHub
- `ai.js` / `search.js` stamped **v8.8** for live play (highest dual-passed)
- Freezes under `policies/v85`…`v88`, `v87hf`

## Next
1. Repair v8.6 hole: promote code that beats v85 GM (e.g. v87-lineage) as new v8.6 freeze
2. Dual gate + ship v8.9
3. Ladder v9.0…v9.5
