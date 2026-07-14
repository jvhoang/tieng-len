# Dual protocol: fair **HIDDEN** GM vs GM, **BR ON both seats**

**Updated:** 2026-07-14

## User rules
1. **Never perfect info** for new vs freeze testing.
2. **Always grandmaster** seats.
3. **BR on for both live and freeze** — freeze BR-off is unfair harness.

## Why freeze BR must be ON

Published grandmaster uses `bestResponse: true` (controller.js).

If live has BR and freeze does not, live can beat freeze **even with identical policy code**
(budget/BR asymmetry). That is not “smarter AI” — it is a weaker freeze seat.

**Honest identity:** live≡freeze, same budgets, both BR-on → expect **~0.50** WR.  
**Honest ship:** candidate beats identity by **≥+2 wins** and WR **>0.70** only if the *code* is stronger under the same search class.

## Ship dual defaults

| Setting | Live | Freeze |
|---------|------|--------|
| difficulty | grandmaster | grandmaster |
| perfectInfo | false | false |
| hiddenInfo | true | true |
| bestResponse (BR) | **true** | **true** |
| exploit | true | true |
| softSamples | 6 (default) | 6 (default) |
| timeMs / iters / sims | **equal** (200/120/240) | **equal** |
| brTrials | 32 | 32 |

Opt out of freeze BR only for experiments: `TIENLEN_FREEZE_BR=0` (not a ship gate).

## What “BR” means
**Best Response** = playout-based root scoring. Not a difficulty level.

**BR playout model** (`TIENLEN_BR_MODEL`): who acts as “opponent” *inside* BR rollouts.
Default `expert` for wall-clock (freeze expertPolicy leaf). Seats remain GM+BR.

## Ship gate
1. N≥50, hidden, GM vs GM, **BR both**, equal budget (or documented fair protocol)
2. WR **strict >0.70**
3. `liveWins ≥ identity.liveWins + 2` on same seed0
4. Gold series 1–3 recommendations locked

## Invalidated
- Perfect-info duals (v9.2–v9.5 40/50 streak)
- Live BR-on / freeze BR-off “easy 80%” identity rungs
