# MULTI_REFUSE — multi-climb refuse probe

**Date:** 2026-07-13  
**Scratch:** `$SCRATCH/probes/MULTI_REFUSE/`  
**Base:** `probes/search.race-base.js` + `ai.race-base.js` (v9.2 race+ leaf)  
**Protocol:** dual GM maxBudget live (MS280 / IT200 / SIMS480 / BR96 / branch24) vs freeze **v91** GM (MS120/IT80), `setExploitOpponent` + `applyFast`

---

## Root cause (20380387)

Live answers freeze’s low 5-seq with `10-J-Q-K-A`; freeze recaptures with `J-Q-K-A-2` and free-leads residual 3-seq go-out (5 plies).  
**Multi-climb trap under perfect info**, not free-lead gift. Force-pass CF still loses (hand structurally dead); refuse is still the right *local* policy.

---

## Implementation (isolated only)

When **2p + opp hand visible** and answering **non-single multi**:

1. **`multiClimbShouldRefuse`** — if every **cheap** (non-2, non-bomb) multi answer can be re-beaten by opp multi (incl. multi-with-2), refuse unless `omin ≤ 2` or `handLen ≤ 4`.
2. **`expertPolicy`** — hard `PASS` when refuse fires (before cheap-path return).
3. **`expertScore`** — large combat penalty when opp can re-beat (`+90` multi-with-2, `+60` cheap multi, `+45` other).
4. **Combat soft-root** — force pass into candidate set; soft bias pass; hard override non-forced-win multi answers.
5. **BR guard** — convert rebeatable multi pick → pass.
6. **`enforcePolicyGuards` + `ai.js` cheap-override** — critical: existing “never pass with cheap beat” was re-introducing the climb after search chose PASS. Both patched so refuse can actually pass.

**Verified unit:** forced freeze lead `4H5H6C7C8D` on seed `20380387` → live **PASS** (was `10S JD QH KC AC`).

**Main:** **not promoted** — no `MULTI_REFUSE` in repo `search.js` / `ai.js`.

---

## Dual N=20 (seed0=`20260711`)

| Build | WR | liveWins | lossSeeds |
|-------|---:|---------:|-----------|
| BASE (race+) | **0.80** | 16/20 | `20310576, 20320549, 20350468, 20380387` |
| **MULTI_REFUSE** | **0.70** | **14/20** | `20290630, 20310576, 20320549, 20350468, 20360441, 20380387` |

W/L vectors:
- BASE:         `WWWWWLLWWLWWLWWWWWWW`
- MULTI_REFUSE: `WWWLWLLWWLLWLWWWWWWW`

**vs BASE n20:** flips **0**; regs **2** (`20290630`, `20360441`).  
**20380387 still L** (5 steps) — consistent with structural CF.

**Gate dual WR ≥ 0.80:** **FAIL** (−2 vs BASE).

---

## Seed-duel (16 residual race losses + 12 win seeds)

Protocol: `seed-duel-light.js` with `LOSS_SEEDS` + `WIN_SEEDS`.

| Metric | MULTI_REFUSE | BASE residual-16 reference |
|--------|-------------:|---------------------------:|
| loss raw wins / 16 | **2** | 3 |
| flipSeeds | `20290630`, `20599793` | `20290630`, `20320549`, `20599793` |
| win_regs / 12 | **1** (`20360441`) | — |
| candidate (flips≥2 ∧ regs≤1) | yes (raw rule) | — |

**Net vs BASE residual flips:** lost `20320549` flip (−1); no new flips.  
**20380387 / short4:** still loss.

Task promote gate: dual WR ≥ 0.80 **and** loss flips ≥1 with win_regs ≤1 → dual WR fails ⇒ **no N=50 on main**.

---

## Verdict

**Reject MULTI_REFUSE (hard pass).**  

- Over-passive multi fold: refuses climbs that search previously converted into wins (`20290630`, `20360441` dual regs).  
- Does not flip the 20380387 mine (structurally lost under force-pass CF).  
- Soft expertScore penalty alone was not enough to drive root decisions without the hard pass path; the hard path is what dual punished.

**Better next levers for multi-tempo mines:**
- Soften: refuse only when opp re-beat leaves them with residual go-out length ≤3–5, or only when opp multi uses **2**.
- Root-only one-ply: if after our multi + opp re-beat, opp can free-lead go-out within 1–2 plies → pass; else allow climb.
- Do **not** blanket-pass all re-beatable cheap multi answers.

---

## Artifacts

- `$SCRATCH/probes/MULTI_REFUSE/{search.js,ai.js,run-dual.js}`
- `$SCRATCH/probes/MULTI_REFUSE/probe-out.json` — dual N=20 (0.70)
- `$SCRATCH/probes/MULTI_REFUSE/seed-duel-loss16.json` — 16 residual (SEEDS=)
- `$SCRATCH/probes/MULTI_REFUSE/seed-duel-flip-check.json` — LOSS+WIN flip check
- This note: `evolve/MULTI_REFUSE-summary.md`

---

## Return numbers

| Metric | Value |
|--------|------:|
| dual N=20 WR | **0.70** (14/20) |
| dual vs BASE | **−2** (regs 20290630, 20360441; flips 0) |
| seed-duel loss flips | **2** / 16 (`20290630`, `20599793`) — same as BASE minus `20320549` |
| seed-duel win_regs | **1** / 12 (`20360441`) |
| N=50 main | **not run** (dual gate fail) |
| main broken? | **no** (probe-only; no MULTI_REFUSE on main) |
