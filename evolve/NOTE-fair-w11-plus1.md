# W11 +1 hunt on brflo_g2 (31/50)

## Outcome
No probe reached ≥32 at T12. Equal T20 gave DEV 32/50 but **DEV_VAL 0.48 Δ−1**.

## Attempts (on brflo_g2 base unless noted)
| Probe | Result |
|-------|--------|
| brpc (pass cand mid multi) | identical 31 |
| brgap min-gap strip | 27 (lost design) |
| omin2 / somulti / brsm expert | identical 31 (no first-diff on hard losses) |
| br2race / racepack BR short-opp | 31 |
| brflo+fovk | 30 |
| T20 equal budget | DEV 32 → DEV_VAL fail |

## Hard losses
Remaining design losses are **shared with identity** (both lose). First-diff freeze vs brflo_g2: **no live-seat diverge** on those paths — lever never fires; pure freeze-vs-freeze losses.

## Do not re-probe
mintop · SoftN · FL pin · soft multiTie · brflo widen hand9 · brgap as written · DEV_VAL-failed brflo_g2 as ship
