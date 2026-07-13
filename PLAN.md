# PLAN — Ladder v9.1 → v11.0 (restart, data-first, incremental)

**Updated:** 2026-07-13  
**Contract:** dual GM N≥50 WR>0.70 vs previous freeze; gold series 1–3 locked  
**Scratch:** `/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-2452caa32616/implementer`

## Phase 0 — Reset
1. Copy `policies/v91-search.js` → `search.js`, `policies/v91-ai.js` → `ai.js` (+ stamp via ai-build)
2. Full tests; note which gold cases fail on pure v91
3. Baseline dual N=20 (identity ~0.5 expected if live≡freeze)

## Phase 1 — Data
1. Newest `~/Downloads/tienlen*.json` + GitHub play-log refresh if available
2. Human-seat expertPolicy diverge analysis → `evolve/NOTE-ladder-v92-restart-analysis.md`
3. Top 3–5 lever hypotheses ranked by dual potential + gold safety

## Phase 2 — Parallel probes
- Orthogonal levers in worktree/isolation or sequential copies
- N=20–25 seed 20260711 GM each; promote only if ≥ baseline probe and gold green

## Phase 3 — Promote / dual / ship
- One lever → N=50 primary + re-run
- Pass → freeze v92, stamp, ship; fail → next lever

## Known priors (do not repeat mistakes)
- Broad expertScore/orderLegals/2-tempo rewrites → dual 0.44–0.48
- Series-2 gold bulk → dual ~0.54 vs pre-series-2 ~0.66
- Soft leaf knobs rarely move root decisions under exact+BR
