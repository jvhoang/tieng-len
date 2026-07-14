# NOTE — W71 `fl_seq4nineshed` REJECT (BR thrash reverse)

**Live freeze still v9.5.** SoftN FORBIDDEN.

## Dual-safe multi-ply convert (real)

| Seat | Forces | Dual T20 |
|------|--------|----------|
| **A `20320639@0`** | FREE0 seq3→**seq4** `3456` then FREE1 trip777→**single 9** | **WIN** |
| 1-force alone | seq4 only / seq5 / pair33 | dual-null |

Fingerprint FREE0: handLen13 omin13 twos0 pair3s + trip/quad7s + pair9s maxL=5.
Fingerprint FREE1: handLen9 orphan3 + trip7s + pair9s → single 9.

## Package tried
`p_w71_ex_flseq4nineshed` = flmidshort + `pickFlSeq4Exact` + `pickFlNineShed`
(search-root hard; expert leaf stripped after thrash diagnosis).

## Results vs freeze v95 identity (base A34/B36)
| Run | A | B | Notes |
|-----|--:|--:|-------|
| primary | **35** | 35 | A NEW `20320639@0` pure; B REV thrash `20360532@1` |
| B re-runs | — | 35/36/35 | thrash on identity seat (steps 14 win vs 21 loss) |
| vs v91 protect | 36 | 36 | OK |

## Why reject
- **Not 0-reverse pure.** B thrash reverse on `20360532@1` (firstdiff often identity; path length flip).
- Dual-rerun gate fails (B not stably ≥36 / not stable vs base).
- Expert-leaf presence worsened thrash; search-root-only still thrash ~2/3 runs.

## Keep
- Dual-safe multi-ply discovery method (lean dual 2-force) works for residual empty CF.
- Convert structure is real under force; packaging without B thrash remains open.

## Next
1. Prefer **architecture** levers with dual-mirror expert∧BR order (not FREE multi-ply leaf thrash).
2. Or gate convert even tighter / BR-cand pin without expert leaf change.
3. Need **A≥36** and **B stably >0.70** for v9.6.

SoftN never.
