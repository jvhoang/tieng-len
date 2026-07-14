# NOTE — W55 `p_w55_ex_seq5adj` bank (A+1 pure)

**Live freeze still v9.5.** SoftN FORBIDDEN.

## SoftN rogue
`STACK softN14 and softN16 N50` (`019f5d42-…964c4ce33b81`) status=**cancelled** / force-killed.
No softN node process. Scripts `.DISABLED`. Reconfirmed 2026-07-14T10:31Z.

## Lever
Combat **seq5** mid-face **adjacent +1** climb (not residual-max farther).
Convert A `20430342@1` s1: base `7D 8S 9C TS JD` → `8D 9C TS JD QS`.

### Why uncovered
| Lever | Why null on star |
|-------|------------------|
| seqhi | curTop≤3 required; star curTop=4 |
| seqadj | curLen===4, curTop≤3, omin===9; star curLen=5, curTop=4, omin=8 |
| seqhi_res | minT≤3, handLen===11; star minT=J, handLen=13 |
| mulowg | minT≤3; star minT=J=8 |

### Gates
`curLen===5`, `curTop===4`, `handLen===13`, `omin===8`, `twos≥2`,
`minT≥7`, `maxT===minT+1` (adjacent only), pick expertScore-min among top===minT+1.

## Results
| vs | A | B |
|----|--:|--:|
| freeze **v95** identity | **27** | **30** |
| freeze **v91** ship protect | **36** | **37** |

- **New:** `20430342@1` only  
- **Reverse:** none vs `p_w54_ex_seqadj`  
- firstdiff: freeze min 789TJ → chall 89TJQ at step 1  

## Stack vs freeze v95 identity
| Layer | A | B |
|-------|--:|--:|
| v95 | 25 | 25 |
| +maxedge..pairseq3 | 25 | 30 |
| +seqadj | 26 | 30 |
| **+seq5adj** | **27** | **30** |

Need **36/36 vs v95** for v9.6 (~+9 A, +6 B pure). SoftN never.
