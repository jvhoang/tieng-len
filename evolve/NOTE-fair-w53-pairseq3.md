# NOTE — W53 `p_w53_ex_pairseq3` bank

**Live freeze still v9.5.** SoftN FORBIDDEN.

## Lever
FREE mid pair (8–T) → residual 3-seq without quad requirement (unlike fl_pairseq).

Convert: B `20270775@0` 9H9C → 8H9HTD. Gates: handLen===9, omin===9, unique mid pair, unique rank-pattern seq3 with pair as middle.

## Results
{
  "tag": "p_w53_ex_pairseq3",
  "base": "p_w52_ex_seqopen",
  "lever": "fl_pairseq3 FREE mid pair\u2192seq3 no-quad",
  "convert": "20270775@0 99\u219289T",
  "vs_v95_id": {
    "A": 25,
    "B": 30,
    "rev": []
  },
  "vs_v91": {
    "A": 36,
    "B": 36
  },
  "ship_v96": false,
  "stack": "B 25\u219230 (+5 pure vs v95 id)"
}

## Stack vs freeze v95 identity
| Layer | A | B |
|-------|--:|--:|
| v95 | 25 | 25 |
| +maxedge | 25 | 26 |
| +egunder | 25 | 27 |
| +seqhires | 25 | 28 |
| +seqopen | 25 | 29 |
| **+pairseq3** | **25** | **30** |

Need 36/36 vs v95 for v9.6 (~+6 more on B, also need A lifts).
