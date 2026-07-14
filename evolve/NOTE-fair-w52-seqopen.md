# NOTE — W52 `p_w52_ex_seqopen` bank

**Live freeze still v9.5.** SoftN FORBIDDEN.

## Lever
FREE opening max-length seq: handLen===13, omin===13, **twos≥2**, maxL===6, pick min-top among max-L.

Convert: B `20500154@1` 3456→345678. Reverse kill: twos≥2 + maxL===6 (not single-2 thrash seats).

## Results
{
  "tag": "p_w52_ex_seqopen",
  "base": "p_w51_ex_seqhires",
  "lever": "fl_seqopen FREE opening maxL===6 double-2",
  "convert": "20500154@1 len4\u2192len6",
  "vs_v95_id": {
    "A": 25,
    "B": 29,
    "new": [
      "20320640@0",
      "20400424@0",
      "20410397@0",
      "20500154@1"
    ],
    "rev": []
  },
  "vs_v91": {
    "A": 36,
    "B": 36,
    "sum": 72
  },
  "ship_v96": false
}

## Stack vs freeze v95 identity
| Layer | A | B |
|-------|--:|--:|
| v95 | 25 | 25 |
| +maxedge | 25 | 26 |
| +egunder | 25 | 27 |
| +seqhires | 25 | 28 |
| **+seqopen** | **25** | **29** |

Need 36/36 vs v95 for v9.6 (~+7 more).
