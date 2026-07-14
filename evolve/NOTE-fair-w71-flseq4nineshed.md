# NOTE — W71 `p_w71_ex_flseq4nineshed` bank (A+1 pure)

**Live freeze still v9.5.** SoftN FORBIDDEN.

## Lever
Multi-ply FREE convert (dual-safe 2-force T20):
1. `fl_seq4exact` — open exact L=4 (not maxL5) when pair3s + trip/quad7s + pair9s, maxL===5
2. `fl_nineshed` — FREE handLen===9 single-9 over trip7s (orphan 3 after seq4)

Search-root hard pins; dual convert path verified.

## Results (sequential dual — no parallel CPU thrash)
| vs | A | B |
|----|--:|--:|
| freeze **v95** | **35** | **36** |
| freeze **v91** | **36** | **37** |
| B dual-rerun vs v95 | — | **36** |

- **New:** `20320639@0` · **Reverse:** none  
- Prior parallel duals false-rejected as thrash (wall-clock `timeMs` BR under load).

## Stack vs freeze v95 identity
| Layer | A | B |
|-------|--:|--:|
| +flmidshort | 34 | 36 |
| **+flseq4nineshed** | **35** | **36** |

Need **A≥36** (WR **>0.70**) for v9.6. SoftN never.
