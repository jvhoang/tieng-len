# NOTE — W54 `p_w54_ex_seqadj` bank (first A lift)

**Live freeze still v9.5.** SoftN FORBIDDEN.

## Lever
Combat seq mulowg-band **adjacent** climb only (not residual-max).
Convert A `20310666@0` s1: base 3456 → 4567.

Gates: handLen===13, omin===9, curLen===4, curTop≤3, minT≤3, maxT===minT+1, twos≥1.

## Results
{
  "tag": "p_w54_ex_seqadj",
  "base": "p_w53_ex_pairseq3",
  "lever": "seqadj mulowg-band adjacent climb seq4",
  "convert": "A 20310666@0 3456\u21924567",
  "vs_v95_id": {
    "A": 26,
    "B": 30,
    "rev": []
  },
  "vs_v91": {
    "A": 36,
    "B": 36,
    "sum": 72
  },
  "ship_v96": false,
  "stack": "A 25\u219226, B 25\u219230 pure vs v95 id"
}

## Stack vs freeze v95 identity
| Layer | A | B |
|-------|--:|--:|
| v95 | 25 | 25 |
| +maxedge..pairseq3 | 25 | 30 |
| **+seqadj** | **26** | **30** |

First A pure convert. Need 36/36 vs v95 for v9.6.
