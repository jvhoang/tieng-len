# NOTE — W51 `p_w51_ex_seqhires` bank

**Live freeze still v9.5.** SoftN FORBIDDEN.

## Lever
`seqhi_res`: combat seq in **mulowg min-band** (minT≤3) with residual **Jack-top** force.
- Base would mulowg-min 456; force 9TJ (top J)
- Disjoint from seqhi (which requires minT>3)

### Gates
handLen===11, omin 7–9, curTop≤2, twos≥1, minT≤3, target top===8 (J), target−minT≥5,
pick expertScore-min among top===J.

## Results
{
  "tag": "p_w51_ex_seqhires",
  "base": "p_w50_ex_egunder",
  "lever": "seqhi_res mulowg-band residual Jack-top seq",
  "convert": "20410397@0 456\u21929TJ",
  "vs_v95_id": {
    "A": 25,
    "B": 28,
    "new": [
      "20320640@0",
      "20400424@0",
      "20410397@0"
    ],
    "rev": []
  },
  "vs_v91": {
    "A": 36,
    "B": 36,
    "sum": 72
  },
  "ship_v96": false,
  "stack_progress": "identity 25\u219228 B (+3 pure)"
}

## Stack vs freeze v95 identity
| Layer | A | B |
|-------|--:|--:|
| v95 | 25 | 25 |
| +maxedge | 25 | 26 |
| +egunder | 25 | 27 |
| **+seqhires** | **25** | **28** |

Need 36/36 vs v95 for v9.6.
