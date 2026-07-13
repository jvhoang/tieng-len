# FLIP-SWARM summary

**Goal:** dual +2 (34→36/50) via loss-seed flips without win regressions.

**Protocol:** maxBudget dual (MS280/IT200/SIMS480/BR96 branch24) live vs freeze v91 GM (MS120/IT80), `setExploitOpponent` + `applyFast` via `$SCRATCH/seed-duel-light.js`.

**Base:** `probes/search.race-base.js` (v9.2 race+ leaf).

**Loss seeds (16):** from maxbudget dual race losses.

**Win seeds (first 12 of first-20 wins):** from `evolve/v92-race-loggames-n50.json`.

## Candidate rule

`loss_flips >= 2 AND win_regs <= 1`

## Results table

| Patch | loss_flips | win_regs | candidate | flipSeeds | regSeeds | ms |
|-------|-----------:|---------:|:---------:|-----------|----------|---:|
| RACE_HARD | 1 | 0 | no | 20290630 | — | 884053 |
| EXACT_WIDE | 1 | 0 | no | 20290630 | — | 901956 |
| NO_SOFTPASS | 1 | 0 | no | 20290630 | — | 845230 |
| TWO_OMIN2 | 2 | 0 | **YES** | 20290630, 20549928 | — | 901995 |
| BR_SOFT | 1 | 0 | no | 20290630 | — | 895402 |
| STRUCT_SOFT | 1 | 0 | no | 20290630 | — | 897813 |

## Patch descriptions

1. **RACE_HARD** — leafEval race weight 0.068→0.08, 1-card pen 0.12→0.18
2. **EXACT_WIDE** — totalCards thresholds +4 (handLenBudget + exactMs bands), free-lead exactMs floor 400
3. **NO_SOFTPASS** — remove deep mid multi soft-pass + TWO soft-pass lines (handLen≥9/10)
4. **TWO_OMIN2** — 2-tempo when omin≤2 and curTop 7–10 (was omin≤3, curTop 8–10)
5. **BR_SOFT** — softSamples default 6→12, free-lead exactMs floor 400
6. **STRUCT_SOFT** — pair-break structure cost +4 only (8→12, 5→9)

## Best candidate

**TWO_OMIN2** — loss_flips=2, win_regs=0

- flipSeeds: 20290630, 20549928
- regSeeds: none
- Copied to `$SCRATCH/flip/BEST-search.js`

### Per-seed detail (TWO_OMIN2)

| seed | kind | liveWin |
|------|------|:-------:|
| 20290630 | loss | true **FLIP** |
| 20310576 | loss | false |
| 20320549 | loss | false |
| 20350468 | loss | false |
| 20380387 | loss | false |
| 20470144 | loss | false |
| 20490090 | loss | false |
| 20539955 | loss | false |
| 20549928 | loss | true **FLIP** |
| 20559901 | loss | false |
| 20599793 | loss | false |
| 20609766 | loss | false |
| 20659631 | loss | false |
| 20669604 | loss | false |
| 20689550 | loss | false |
| 20709496 | loss | false |
| 20260711 | win | true |
| 20270684 | win | true |
| 20280657 | win | true |
| 20300603 | win | true |
| 20330522 | win | true |
| 20340495 | win | true |
| 20360441 | win | true |
| 20370414 | win | true |
| 20390360 | win | true |
| 20400333 | win | true |
| 20410306 | win | true |
| 20420279 | win | true |

## Notes

- All six patches flipped seed `20290630` (possibly soft / protocol-edge vs original dual loss).
- Only **TWO_OMIN2** also flipped `20549928` → sole candidate.
- No win regressions on the 12 checked win seeds for any patch.
- Main repo `search.js` was **not** modified by this swarm (isolated under `$SCRATCH/flip/`).
- Isolated copies: `$SCRATCH/flip/<PATCH>/search.js`.
