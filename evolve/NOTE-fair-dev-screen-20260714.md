# Fair dual DEV screen — 2026-07-14 (post softN kill + main resume)

## SoftN
Rogue subagent `STACK softN14 and softN16 N50` (`019f5d42-…964c4ce33b81`) cancelled / force-killed. No softN node processes. Do not relaunch.

## Harness sanity
| Tag | DEV (20260711) |
|-----|---------------:|
| v91 | 25/50 |
| p_p1_mintop | **32/50** (reproducible) |
| p_mbnest | **37/50** (reproducible) |

## One-axis results (all new probes)
All OA / W2 / W3 / W4 / W5 probes: **25–26/50**, n.s., stop. See `STATUS.md` table.

## Interpretation
Under fair dual (equal BR, equal budget, freeze expert leaf for opp):

- **Local soft-ties / order softenings** almost never flip games (BR rates dominate).
- **Hard mintop-before-expertScore** is the only pure one-axis that clears DEV significance — and **fails holdout** (A 0.42 / B 0.50).
- **mbnest stack** is interaction theater on DEV seed11 (FL pin + mintop + nest + …); components alone are null; holdout fails.
- Absolute ship gate **WR>0.70 on both holdouts** remains open; best honest holdout absolute is still **~0.60**.

## Mintop first-diff (DEV flip seeds)
See `NOTE-mintop-firstdiff.json`. Combat cases are min-beat singles under deep hands. Restricted mintop (singles-only / deep-only / soft band) all dual-flat — full hard mintop appears to need multi-class reordering + cascade, which is exactly the holdout-fragile fingerprint.

## Do not re-probe without new mechanism
mintop family · FL pin · soft multiTie weight · SoftN · bulk expertScore rewrite · series-3 gold bulk · holdout peek during design.
