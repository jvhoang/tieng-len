# Combat / Endgame / Race probes — ladder v9.1+ vs freeze v90

**Date:** 2026-07-12  
**Protocol:** live hard + exploit + BR vs freeze **v90 expert**  
**Seed:** `20260711` · **N=25** · `TIENLEN_V8_MS=100` · `TIENLEN_BR_TRIALS=48`  
**Roots off:** `COMBAT_ROOT=0` `FL_ROOT=0` `DUAL_SELF=0`  
**Reference dual baseline:** v9.0 hard vs v8.9 expert N=100 → **0.81** (`evolve/v90-vs-v89-final.json`)

## Setup

- Freeze policies present: `policies/v90-ai.js`, `policies/v90-search.js`
- Live `search.js` baseline = v9.0 search (path-adjusted); backed up as `search.js.bak-probe-v11-baseline`
- Branches applied one at a time; restored between runs

## Results (N=25)

| Branch | Wins | WR | CI95 lo | ms | Artifact |
|--------|-----:|---:|--------:|---:|----------|
| **Baseline** (no tweak) | **23/25** | **0.92** | 0.750 | 268s | `probe-combat-Baseline.json` |
| **EG** | 23/25 | 0.92 | 0.750 | 165s | `probe-combat-EG.json` |
| **Combat** | 23/25 | 0.92 | 0.750 | 269s | `probe-combat-Combat.json` |
| **Race** | 22/25 | 0.88 | 0.700 | 221s | `probe-combat-Race.json` |

## Branch changes

### EG — exact endgame threshold + exactExploitMs
- `exactEndgameMove`: total-card gate **18 → 20**, with wall-clock abort (90/140/200ms by total) to avoid historical hangs
- `exactExploitMs` table **~+50%** per bucket; free-lead floor **220 → 320** ms (node)

### Combat — pass/contest when hand short
- Expert policy: contest through **handLen ≤ 6** always; **≤ 8** vs mid tops / short opp; soft-pass only **handLen ≥ 10 && curTop < 9 && omin ≥ 6**
- Opp model: contest **handLen ≤ 7**; soft-pass only **handLen > 9 && curTop < 8**
- Combat soft-root (inactive this probe — `COMBAT_ROOT=0`): stricter pass allow, heavier short-hand pass penalty, boost contest of expensive when short

### Race — leafEval2p race weight
- Card-race coeff **0.05 → 0.08** in `leafEval2p`

## Decision

**No branch clearly beats baseline on N=25.**

- EG and Combat **match** baseline at **0.92** (identical win count on this seed)
- Race is **slightly worse** (0.88)
- All N=25 CIs are wide (lo ≈ 0.70–0.75) and overlap the dual **~0.81** N=100 reference
- Hard vs same-generation expert is already ~0.9 on N=25; these levers did not move the needle

**Action:** restored `search.js` to baseline (`search.js.bak-probe-v11-baseline`). No AI_BUILD stamp.

## Best WR this session

| Metric | Value |
|--------|------:|
| Best probe WR | **0.92** (Baseline / EG / Combat tied) |
| Best branch-only | **0.92** EG & Combat (no gain vs baseline) |
| Race WR | 0.88 |

## Next ideas

- Re-test Combat with `TIENLEN_COMBAT_ROOT=1` (root path was off here)
- Try milder Race (0.06) or asymmetric short-hand race terms
- EG budgets alone (keep total≤18) vs threshold alone on N=50+
- Mine losses on seed path for pass/contest misplays before more threshold nudges
