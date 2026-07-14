# STATUS — Fair dual ladder (resumable handoff)

**Updated:** 2026-07-14T11:08Z  
**Live / freeze:** **v9.5** fair dual SHIPPED (36/36 vs v91) — commit `2a29964`  
**SoftN:** **DEAD**  
**Best bank:** `p_w59_ex_flmidshed` **A29/B32** vs freeze v95 (0.58/0.64)

## Skeptic gaps — CLOSED (re-proved)
`{SCRATCH}/skeptic-close/GAPS-CLOSED.json` → **PASS: true**
- live AI_BUILD **v9.5** + `pickComSbc0` + `com-sbc0-hard`
- fair dual primary/rerun **36/36 WR 0.72** vs v91 (hidden BR-both SOFT=0)
- policies/v95-* tracked; ship commit `2a29964`; live ≡ v95 (require-path only)

## Stack toward v9.6 (vs freeze **v95** identity 25/25)
| Tag | A | B | vs v91 |
|-----|--:|--:|--------|
| flpair88 | 29 | 31 | 36/38 |
| **flmidshed** | **29** | **32** | **36/37** |

**Gap:** need **36/36 vs v95**. ~+7 A and +4 B pure remaining.

## SoftN
Rogue softN14/16 n50 cancelled/dead. Do not relaunch.

## Next
Base `p_w59_ex_flmidshed`; more pure converts; freeze v9.6 only at dual >0.70 vs v95.
