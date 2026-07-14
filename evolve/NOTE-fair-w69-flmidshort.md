# NOTE — W69 `p_w69_ex_flmidshort` bank (A+1 pure)

**Live freeze still v9.5.** SoftN FORBIDDEN.

## Lever
FREE open **exact length-3** midshort (not maxL gate).
Convert A `20500153@0` s0: base seq5 → `345`.
Prior midshort dual-null used `maxL===5` which failed when maxL>5.

### Gates
FREE, handLen===13, omin===13, twos===0, byR[5]===2, byR[7]===2,
maxL≥5, pick expertScore-min among seq length===3.

## Results
| vs | A | B |
|----|--:|--:|
| freeze **v95** | **34** | **36** |
| freeze **v91** | **36** | **37** |

- **New:** `20500153@0` · **Reverse:** none  

## Stack vs freeze v95 identity
| Layer | A | B |
|-------|--:|--:|
| +flseq5exact | 33 | 36 |
| **+flmidshort** | **34** | **36** |

Need **A≥36** for v9.6 (~+2 more). SoftN never.
