# STATUS — Fair dual ladder (resumable handoff)

**Updated:** 2026-07-14T10:59Z  
**Live / freeze:** **v9.5** fair dual SHIPPED (36/36 vs v91)  
**SoftN:** **DEAD** — rogue softN14/16 n50 cancelled; no process; scripts DISABLED  

## SoftN rogue quit
- Subagent `019f5d42-0b43-7da3-8825-964c4ce33b81` (`STACK softN14 and softN16 N50`)
- status=**cancelled** · force_killed · reconfirmed dead  
- Flags: `evolve/SOFTN-FORBIDDEN.flag`, `evolve/SOFTN-ROGUE-QUIT.confirmed`

## Shipped
| Rung | vs | A/B |
|------|----|----:|
| **v9.5** | v91 | **36/36** |

## Stack toward v9.6 (vs freeze **v95** identity 25/25)
| Tag | A | B | vs v91 |
|-----|--:|--:|--------|
| seqadj | 26 | 30 | 36/36 |
| seq5adj | 27 | 30 | 36/37 |
| seqmidunder | 28 | 30 | 36/37 |
| qpairclimb | 28 | 31 | 36/37 |
| **flpair88** | **29** | **31** | **36/38** |

**Gap:** need **36/36 vs v95**. Now **A29/B31** (0.58/0.62). ~+7 A and +5 B pure.

## Best bank
`policies/p_w58_ex_flpair88-*` — pure 0-reverse stack.

## Rejects this session
- fl_pairpeel (dual-null + reverse A20430342)

## Next
Base `p_w58_ex_flpair88`; more pure A+B converts; freeze v9.6 only at dual >0.70 vs v95. SoftN never.
