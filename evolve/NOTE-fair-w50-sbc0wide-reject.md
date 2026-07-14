# W50 sbc0wide — REJECT

**Attempt:** widen sbc0 Ace bands for CF `20280748@0` s4 force KD→AC.

**Finding:** AC has **sbc=13**, KD has **sbc=5** — convert is **anti-min-SBC high climb**, not structure-preserve. pickComSbc0 correctly null. Force≠structure lever.

**Also validated force converts under maxedge vs v95** (full-policy): many high-climb / FREE thrash candidates; few uniqueness-safe structure stars remain after sbc0+maxedge.

## Banked progress
| Package | vs v95 | vs v91 |
|---------|--------|--------|
| v9.5 ship | — | 36/36 |
| +maxedge | 25/26 | 36/37 |

## Path to v9.6
Need ~+9 net pure converts vs freeze **v95** with 0 reverse (identity bar 25→36). Continue data-first CF + full-policy firstdiff + identity-diff.

SoftN FORBIDDEN.
