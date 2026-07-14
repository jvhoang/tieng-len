# NOTE — Fair dual W46 reject + W47 bank (ship)

**Updated:** 2026-07-14T18:45Z  
**SoftN:** **FORBIDDEN / DEAD** (rogue `019f5d42-…964c4ce33b81` cancelled; no residual process)

## SoftN rogue (user request)
- Subagent **STACK softN14 and softN16 N50** (`019f5d42-0b43-7da3-8825-964c4ce33b81`)
- Status: **cancelled** + `force_killed_at` reconfirmed
- No live `node`/softN eval processes; scripts `.DISABLED`; `evolve/SOFTN-FORBIDDEN.flag` + `SOFTN-ROGUE-QUIT.confirmed`

## Base (prior bank)
| Tag | A | B | Sum |
|-----|--:|--:|----:|
| `p_w45_ex_twoshed` | 36 | 35 | 71 |

Ship need: **B +1 only** (strict WR **>** 0.70 both).

## W46 `p_w46_ex_sbcuniq` — REJECT (thrash)
Unguarded unique min-SBC combat single.

| Holdout | Wins | WR | Notes |
|---------|-----:|---:|-------|
| A | 34 | 0.68 | reverse `20270774@0`, `20490180@0` |
| B | 34 | 0.68 | convert `20270775@1` but reverse `20370505@1`, `20380478@1` |

Firstdiff thrash loci included early high-climb forces (K/A) and mid uniques.

## W47 `p_w47_ex_sbc0` — BANK / **SHIP**

### Lever
Combat **single** only · unique **true-loose Ace** (`structureBreakCost === 0`, `rank === 11`)  
Expert hard playSig + BR strip + search-root hard (before exact-endgame).

### Gates (firstdiff-locked vs v91 path)
- `cur.type === 'single'`, never force 2
- unique `minS === 0`
- `secondS − minS ≥ 4`
- `handLen ∈ [7, 11]`
- `omin ∈ [2, 8]`
- `curTop ≥ 5`
- **`pick.rank === 11` (Ace only)** — kills reverse `20270774@0` base `6C` → `KH`

### Micro (vs v91, SOFT=0 T20)
| Seat | Path | Result |
|------|------|--------|
| `20270775@1` | base QH → chall **AD** | convert WIN |
| `20270774@0` | no diverge | protect WIN |

### Holdout (SOFT=0 T20 BOTH n=50)
| Partition | Wins | WR | Δ vs W45 | Reverse |
|-----------|-----:|---:|----------|---------|
| **A** `20260801` | **36** | **0.72** | 0 | **none** |
| **B** `20260802` | **36** | **0.72** | +1 pure convert `20270775@1` | **none** |
| **Sum** | **72** | | | |

**Ship gate:** both holdouts WR **strict > 0.70** → **YES** (0.72 / 0.72).  
Δid vs freeze v91: live 36/50 ⇒ freeze 14 ⇒ Δ = **+22 ≥ +2**.

### Files
- `policies/p_w47_ex_sbc0-{ai,search}.js`
- `evolve/holdout-{A,B}-ch-t20-w47-sbc0.json`
- `evolve/BANK-w47-sbc0.json`
- scratch: `{SCRATCH}/implementer/w47/`

## Stack (convert-first, SoftN dead)
combat: mulowg · pairhi · pairhi_wide · seqhi · **sbc0 (Ace unique minS=0)**  
FREE: flvol · flshort5 · flhidetight · brseq3 · tripair · pairshed · lotesh · pairseq · twoshed

## Live promote
Banked ship package ready. **Do not auto-promote** past live v9.4 without explicit ship/promote step (prior freeze discipline). Optional next: stamp live probe or freeze ladder step after human ack.
