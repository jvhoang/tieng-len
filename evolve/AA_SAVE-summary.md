# AA_SAVE — don't burn AA/KK on low mid pairs early

**Date:** 2026-07-13  
**Scratch:** `$SCRATCH/probes/AA_SAVE/` (isolated; main repo untouched)  
**Base:** race-base (`search.race-base.js` / `ai.race-base.js`)  
**Motivating loss:** `20470144` — pair war; live eventually answers with AA then freeze locks `22` (replay: 33→44→55→66→KK→**AA**→22)

---

## Lever design (expertPolicy only)

When **`cur.type === 'pair'`** and **`curTop ≤ 5`** and **`handLen ≥ 8`** and hand holds **AA (rank 11) and/or KK (rank 10)**:

1. If a **cheaper pair** answer exists (pair rank ∉ {10,11}, beats `curTop`) → play the ordered cheapest.
2. Else **PASS** (save high pair) **unless `omin ≤ 2`** (short-opp race: allow AA/KK).

Placed after v9.1 deep multi combat-pass, **before** `cheapLegals` so AA/KK are not auto-selected as “cheap” non-2 answers.

Does **not** gate AA vs KK (`curTop = 10`) — so the exact `20470144` ply-5 AA answer is outside this rule by design (that is a high-pair climb, not a low-mid burn).

### Sanity (unit)

| Position | Decision |
|----------|----------|
| handLen 9, AA only vs 33, omin 9 | **PASS** |
| handLen 9, 55+AA vs 33 | **play 55** |
| handLen 9, AA only, omin 2 | **play AA** |
| AA vs KK (curTop 10) | **play AA** (unchanged) |

---

## Dual protocol

- N=20, seed0=`20260711`, stride 9973  
- Live max budget: MS=280 IT=200 SIMS=480 BR=96 BRANCH=24 exact+exploit  
- Freeze: v91 MS=120 IT=80 SIMS=160  
- Target gate: WR > 0.70 (compare to BASE **0.80**)

---

## Result — Dual N=20

| Metric | AA_SAVE | BASE |
|--------|--------:|-----:|
| **liveWins / N** | **15 / 20** | 16 / 20 |
| **WR** | **0.75** | **0.80** |
| freezeWins | 5 | 4 |
| vs BASE | **−1 game (reg)** | — |
| target >0.70 | pass (weak) | pass |
| wall ms | ~323k (~5.4 min) | — |

### Checkpoints
- 5g: 0.80 (4/5)
- 10g: 0.60 (6/10)
- 15g: 0.667 (10/15)
- **20g: 0.75 (15/20)**

### Loss seeds
- **AA_SAVE:** `20290630, 20310576, 20320549, 20350468, 20380387`
- **BASE:** `20310576, 20320549, 20350468, 20380387`

**Regression:** dual loses **`20290630`** (BASE win). No new flips of the four BASE dual losses.

W/L sketch (AA_SAVE extra L on seed `20290630` only among first 20).

---

## Result — seed-duel residual 16 losses

Residual list (N=50 race+/TWO primary losses):  
`20290630, 20310576, 20320549, 20350468, 20380387, 20470144, 20490090, 20539955, 20549928, 20559901, 20599793, 20609766, 20659631, 20669604, 20689550, 20709496`

| Probe | flips / 16 | flip seeds | **20470144** |
|-------|----------:|------------|:------------:|
| BASE / RES_MT | 3 | `20290630, 20320549, 20599793` | **L** |
| **AA_SAVE** | **3** | **same three** | **L** (17 steps) |

**No new residual flips.** Motivating short loss `20470144` still loses (AA vs KK path not gated by `curTop≤5`).

---

## Interpretation

- Expert-policy save of AA/KK vs low pairs is **directionally sound** for structure, but under full GM dual + BR/exact it is **net harmful** on N=20 (−1 vs BASE).
- Likely mechanism: over-passive early pair folds cede tempo / free-lead when freeze is not actually about to 22-lock; search leaf uses expertPolicy so the pass also softens playouts.
- Does **not** address the stated `20470144` failure mode (AA burned on **KK**, then freeze `22`) — would need a separate high-pair-war / 22-behind-KK rule.

---

## Verdict

**REJECT for promote.**  
**WR = 0.75** (15/20) — dual regression vs BASE 0.80; seed-duel silent (3/16, no 20470144 flip).

Do **not** merge into race-base / main. If revisiting: tighten to only pass when **no** mid pair (6–9) **and** opp shows pair-war willingness / holds 22 (perfect-info), or gate AA specifically vs mid pairs when holding unpaired trash that needs the free-lead later — not a blanket early pass.

---

## Artifacts

- Probe: `probes/AA_SAVE/{search.js,ai.js,run-dual.js,run-seed-duel.js}`
- Dual: `probes/AA_SAVE-n20.json` / `AA_SAVE-n20.log`
- Seed-duel: `probes/AA_SAVE-seed-duel-loss16.json` / `.log`
- Summary: `probes/AA_SAVE-summary.md`
