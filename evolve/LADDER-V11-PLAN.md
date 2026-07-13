# Ladder Plan: v9.1 → v11.0

## Contract (user-active)
- Dual continuous 2p: **N≥50**, **liveWinRate > 0.70** (strict), primary seed **20260711**
- Independent re-run also **>0.70**
- Both seats: **grandmaster** (freeze = prior freeze GM search; live = GM + exploit/BR)
- CF: refresh ALL 1v1 playlogs each major phase; hidden-info human seat
- Ship: freeze + commit main + gh-pages after each dual pass
- Version ids: v9.1 … v9.9, v10.0 … v10.9, v11.0

## Motivation
Human still wins **>85%** vs live AI in personal play → need real strength leaps, not label-only bumps.
CF + human-loss mining guide policy changes; parallel probes pick branches.

## Rung loop
1. Refresh playlogs (`refresh-playlogs-all.js`)
2. Parallel branch probes (N=25–50) on distinct levers
3. Promote winner → stamp `AI_BUILD` → CF-all
4. Dual N=100 >70% vs previous freeze
5. Freeze + ship

## Levers for strength (priority)
- Free-lead multi / trash-shed / no-gift
- Combat contest vs mid tops; pass discipline
- Exact endgame + exploit budgets (without hangs)
- BR multiTie / race weights / leafEval
- Human-feature imitation from CF differs
- Soft free-lead/combat roots when probe shows edge and speed OK

## Stop
Achieve **v11.0** dual pass, or honest handoff STATUS.
