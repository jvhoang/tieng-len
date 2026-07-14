# NOTE — W50 `p_w50_ex_egunder` bank

**Live freeze still v9.5.** SoftN FORBIDDEN.

## Lever
Binary late combat Ace underclimb: handLen 2–4, omin 3–6, exactly 2 non-2 singles (Ace + one), pick non-Ace.

Convert: B `20320640@0` AD→QC. Reverse kill: require |legals|===2 (not 4-way 20260801@1).

## Results
{
  "tag": "p_w50_ex_egunder",
  "base": "p_w49_ex_maxedge",
  "lever": "com_egunder binary Ace underclimb hl2-4",
  "convert": "20320640@0 AD\u2192QC",
  "vs_v95": {
    "A": 25,
    "B": 27,
    "new": [
      "20320640@0",
      "20400424@0"
    ],
    "rev": []
  },
  "vs_v91": {
    "A": 36,
    "B": 36,
    "sum": 72,
    "note": "B reverse 20420370@1 vs maxedge-only 37; still ship-bar vs v91"
  },
  "ship_v96": false,
  "reason": "vs v95 only 0.54; need ~+9 more net pure converts"
}

## Stack progress vs freeze v95 identity (25/25)
| Layer | A | B | ΔB |
|-------|--:|--:|---:|
| v95 | 25 | 25 | 0 |
| +maxedge | 25 | 26 | +1 |
| +egunder | 25 | 27 | +2 |

Need B≥36 and A≥36 vs **v95** for v9.6 ship (WR>0.70 both).
