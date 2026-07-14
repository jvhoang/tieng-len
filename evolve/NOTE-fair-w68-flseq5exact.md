# NOTE — W68 `p_w68_ex_flseq5exact` bank (A+1 pure)

**Live freeze still v9.5.** SoftN FORBIDDEN.

## Lever
FREE open **exact length-5** seq (not residual maxL).
Convert A `20360531@0` s0: base `345` → `34567`.
W67 dual-null forced maxL `345678`; exact L=5 converts.

### Gates
FREE, handLen===13, omin===13, twos===1, byR[A]≥2,
pick expertScore-min among seq length===5 only.

## Results
| vs | A | B |
|----|--:|--:|
| freeze **v95** | **33** | **36** |
| freeze **v91** | **36** | **37** |

- **New:** `20360531@0` · **Reverse:** none  
- firstdiff: freeze 345 → chall 34567  

## Stack vs freeze v95 identity
| Layer | A | B |
|-------|--:|--:|
| +comkpeel | 32 | 36 |
| **+flseq5exact** | **33** | **36** |

Need **A≥36** for v9.6 (~+3 more). SoftN never.
