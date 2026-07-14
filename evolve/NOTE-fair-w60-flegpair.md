# NOTE — W60 `p_w60_ex_flegpair` bank (A+1 pure)

**Live freeze still v9.5.** SoftN FORBIDDEN.

## Lever
FREE endgame dual-pair hand: force mid single **8** instead of multi-always **99**.
Convert A `20490180@1`: hand 77+99+8+2 → force 8H.

### Gates
FREE, handLen===6, omin===10, twos===1, byR[7]===2, byR[9]===2, byR[8]===1,
pick expertScore-min among rank-8 singles.

## Results
| vs | A | B |
|----|--:|--:|
| freeze **v95** | **30** | **32** |
| freeze **v91** | **37** | **37** |

- **New:** `20490180@1` · **Reverse:** none  
- firstdiff also showed earlier suit-of-2 diverge (path); identity dual pure convert confirmed  

## Stack vs freeze v95 identity
| Layer | A | B |
|-------|--:|--:|
| +flmidshed | 29 | 32 |
| **+flegpair** | **30** | **32** |

Need **36/36 vs v95** for v9.6 (~+6 A, +4 B). SoftN never.
