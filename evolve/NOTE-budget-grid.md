# BUDGET_GRID — dual (race-base BASE) vs freeze v91 pure

- **Date:** 2026-07-13
- **Protocol:** `evolve/run-isolated-probe.sh` (bench-faithful)
- **Live policy:** race-base BASE (`AI_BUILD` v9.2 probe BASE)
- **Freeze:** policies/v91-ai.js fixed MS=120 IT=80 SIM=160 BR=off
- **N:** 15 duals, seed0=20260711, seed_g = seed0 + g*9973
- **Concurrency:** max 3 parallel (wall-clock `timeMs` shared — see notes)
- **Env levers:** TIENLEN_V8_MS, TIENLEN_BR_TRIALS, TIENLEN_V8_ITERS, TIENLEN_V8_SIMS, TIENLEN_DUAL_SELF

## Ranked by WR (desc)

| Rank | Combo | MS | BR | IT | SIM | DUAL_SELF | Wins | WR | elapsed | lossSeeds |
|-----:|-------|---:|---:|---:|----:|:---------:|-----:|-----:|--------:|-----------|
| 1 | BUDGET_G6_MS320 | 320 | 120 | 220 | 520 | 0 | 11/15 | **0.7333** | 520s | 20310576, 20320549, 20350468, 20380387 |
| 2 | BUDGET_G4_BR160 | 280 | 160 | 200 | 480 | 0 | 11/15 | **0.7333** | 529s | 20310576, 20320549, 20350468, 20380387 |
| 3 | BUDGET_G5_SELF | 280 | 96 | 200 | 480 | 1 | 11/15 | **0.7333** | 529s | 20310576, 20320549, 20350468, 20380387 |
| 4 | BUDGET_G1_MS200 | 200 | 64 | 150 | 400 | 0 | 11/15 | **0.7333** | 550s | 20310576, 20320549, 20350468, 20380387 |
| 5 | BUDGET_G3_MS400 | 400 | 128 | 250 | 600 | 0 | 10/15 | **0.6667** | 492s | 20290630, 20310576, 20320549, 20350468, 20380387 |
| 6 | BUDGET_G2_MS280 | 280 | 96 | 200 | 480 | 0 | 10/15 | **0.6667** | 498s | 20290630, 20310576, 20320549, 20350468, 20380387 |

## Combo notes

1. **BUDGET_G6_MS320** — MS=320 BR=120 IT=220 SIM=520 EXACT=1 — mid-high + exact (exact default on)
2. **BUDGET_G4_BR160** — MS=280 BR=160 IT=200 SIM=480 — BR-heavy
3. **BUDGET_G5_SELF** — MS=280 BR=96 IT=200 SIM=480 DUAL_SELF=1 — dual-self on
4. **BUDGET_G1_MS200** — MS=200 BR=64 IT=150 SIM=400 — lower budget
5. **BUDGET_G3_MS400** — MS=400 BR=128 IT=250 SIM=600 — high budget
6. **BUDGET_G2_MS280** — MS=280 BR=96 IT=200 SIM=480 — known ~0.68–0.80 (ref config)

## Recommendation

**No N=50 recommended from this grid.** Max N=15 WR = 0.7333 (< 0.80 threshold).

N=15 is noisy (±~1–2 games ≈ ±0.07–0.13 WR). Prior solo BASE n20 with MS=280/BR=96 hit **0.80** (16/20), and at n15 mid-run was **0.733** (11/15) — same band as this grid’s top cluster.

## Observations

1. **Four combos tie at 11/15 = 0.7333:** G1 (low), G4 (BR-heavy), G5 (dual-self), G6 (mid-high). No clear budget winner at N=15.
2. **Ref config G2 (MS=280) and high G3 both 10/15 = 0.6667** — slightly below the known ~0.68–0.80 band for G2; within N=15 sampling + concurrent wall-clock noise.
3. **More budget did not help** at this N: G3 (highest) tied worst; G1 (lowest) tied best. Suggests dual WR vs freeze v91 is not primarily budget-bound under race-base at N=15, or contention masked budget effects.
4. **DUAL_SELF=1 (G5)** same WR as BR-heavy / mid-high — no lift visible at N=15.
5. **BR 64→160** (G1 vs G4, not pure BR sweep) both 0.733; G2 BR=96 at 0.667 — no monotone BR effect.
6. **Concurrency caveat:** 3 parallel duals share CPU; `timeMs` is wall-clock so effective search quality drops under load. Solo BASE n20 (MS=280) previously reached 0.80; treat grid WRs as slightly conservative.
7. **EXACT:** `run-isolated-probe.sh` hardcodes `exactExploit: true` for live; G6 EXACT=1 is already the default path.

## Artifacts

- `BUDGET_G6_MS320-n15-v2.json` / `BUDGET_G6_MS320-n15-v2.log` / `BUDGET_G6_MS320-n15-run.out`
- `BUDGET_G4_BR160-n15-v2.json` / `BUDGET_G4_BR160-n15-v2.log` / `BUDGET_G4_BR160-n15-run.out`
- `BUDGET_G5_SELF-n15-v2.json` / `BUDGET_G5_SELF-n15-v2.log` / `BUDGET_G5_SELF-n15-run.out`
- `BUDGET_G1_MS200-n15-v2.json` / `BUDGET_G1_MS200-n15-v2.log` / `BUDGET_G1_MS200-n15-run.out`
- `BUDGET_G3_MS400-n15-v2.json` / `BUDGET_G3_MS400-n15-v2.log` / `BUDGET_G3_MS400-n15-run.out`
- `BUDGET_G2_MS280-n15-v2.json` / `BUDGET_G2_MS280-n15-v2.log` / `BUDGET_G2_MS280-n15-run.out`
- Progress: `BUDGET_GRID-progress.log`
- Launcher: `run-budget-grid.sh`

## Raw liveOpts (from JSON)

```json
[
  {
    "probe": "BUDGET_G6_MS320",
    "wr": 0.7333333333333333,
    "liveWins": 11,
    "liveOpts": {
      "difficulty": "grandmaster",
      "timeMs": 320,
      "iterations": 220,
      "maxSims": 520,
      "brTrials": 120,
      "bestResponse": true,
      "useSearch": true,
      "perfectInfo": true,
      "hiddenInfo": false,
      "maxBranch": 24,
      "dualSelf": false,
      "exactExploit": true,
      "exploit": true,
      "mode": "auto"
    },
    "lossSeeds": [
      20310576,
      20320549,
      20350468,
      20380387
    ]
  },
  {
    "probe": "BUDGET_G4_BR160",
    "wr": 0.7333333333333333,
    "liveWins": 11,
    "liveOpts": {
      "difficulty": "grandmaster",
      "timeMs": 280,
      "iterations": 200,
      "maxSims": 480,
      "brTrials": 160,
      "bestResponse": true,
      "useSearch": true,
      "perfectInfo": true,
      "hiddenInfo": false,
      "maxBranch": 24,
      "dualSelf": false,
      "exactExploit": true,
      "exploit": true,
      "mode": "auto"
    },
    "lossSeeds": [
      20310576,
      20320549,
      20350468,
      20380387
    ]
  },
  {
    "probe": "BUDGET_G5_SELF",
    "wr": 0.7333333333333333,
    "liveWins": 11,
    "liveOpts": {
      "difficulty": "grandmaster",
      "timeMs": 280,
      "iterations": 200,
      "maxSims": 480,
      "brTrials": 96,
      "bestResponse": true,
      "useSearch": true,
      "perfectInfo": true,
      "hiddenInfo": false,
      "maxBranch": 24,
      "dualSelf": true,
      "exactExploit": true,
      "exploit": true,
      "mode": "auto"
    },
    "lossSeeds": [
      20310576,
      20320549,
      20350468,
      20380387
    ]
  },
  {
    "probe": "BUDGET_G1_MS200",
    "wr": 0.7333333333333333,
    "liveWins": 11,
    "liveOpts": {
      "difficulty": "grandmaster",
      "timeMs": 200,
      "iterations": 150,
      "maxSims": 400,
      "brTrials": 64,
      "bestResponse": true,
      "useSearch": true,
      "perfectInfo": true,
      "hiddenInfo": false,
      "maxBranch": 24,
      "dualSelf": false,
      "exactExploit": true,
      "exploit": true,
      "mode": "auto"
    },
    "lossSeeds": [
      20310576,
      20320549,
      20350468,
      20380387
    ]
  },
  {
    "probe": "BUDGET_G3_MS400",
    "wr": 0.6666666666666666,
    "liveWins": 10,
    "liveOpts": {
      "difficulty": "grandmaster",
      "timeMs": 400,
      "iterations": 250,
      "maxSims": 600,
      "brTrials": 128,
      "bestResponse": true,
      "useSearch": true,
      "perfectInfo": true,
      "hiddenInfo": false,
      "maxBranch": 24,
      "dualSelf": false,
      "exactExploit": true,
      "exploit": true,
      "mode": "auto"
    },
    "lossSeeds": [
      20290630,
      20310576,
      20320549,
      20350468,
      20380387
    ]
  },
  {
    "probe": "BUDGET_G2_MS280",
    "wr": 0.6666666666666666,
    "liveWins": 10,
    "liveOpts": {
      "difficulty": "grandmaster",
      "timeMs": 280,
      "iterations": 200,
      "maxSims": 480,
      "brTrials": 96,
      "bestResponse": true,
      "useSearch": true,
      "perfectInfo": true,
      "hiddenInfo": false,
      "maxBranch": 24,
      "dualSelf": false,
      "exactExploit": true,
      "exploit": true,
      "mode": "auto"
    },
    "lossSeeds": [
      20290630,
      20310576,
      20320549,
      20350468,
      20380387
    ]
  }
]
```
