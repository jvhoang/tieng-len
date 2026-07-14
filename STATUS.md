# STATUS — Dual protocol honesty check (paused hollow rungs)

**Updated:** 2026-07-14T02:05Z

## User report (gold)
- Human still wins **>90%** vs latest GM
- Mild improvement only across v9.2→v9.4
- Hints sometimes better than opponent GM (e.g. 2-tempo)
- Suspicious flat **40/50** primary duals

## Confirmed by data
Primary seed `20260711` loss set is **byte-identical** across:
v9.2 ship · v9.3 **identity** · v9.3 residual-mt · v9.4 TWO_OMIN2 · v9.5 combat-BR

→ After BR-GM, dual **>70% is mostly budget asymmetry (280 vs 120 + BR-on vs BR-off)**, not policy skill.

See `evolve/NOTE-dual-protocol-suspicion.md`.

## Immediate policy
- **Do not ship further 0.1 rungs** solely on absolute WR>0.70 under current asymmetric dual.
- Require **+2 wins vs identity baseline** on same seed0 before ship.
- Align human CF / playlog gates with dual work.

## Still running
v9.5 dual re-run may complete for evidence only — do not auto-ship without identity-delta proof.
