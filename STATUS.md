# STATUS — Ladder v9.1 → v11.0

**Updated:** 2026-07-13T22:47Z

## Completed rung: v9.1 → **v9.2** ✅ SHIPPED

| Gate | Seed | Result |
|------|-----:|--------|
| Primary dual | 20260711 | **40/50 WR=0.80** |
| Re-run dual | 20260712 | **41/50 WR=0.82** |

- **Git:** `f265285` on `main` + `gh-pages`
- **Freeze:** `policies/v92-ai.js` + `policies/v92-search.js`
- **Live label:** Grandmaster v9.2

### What won the dual (data-first)
1. **STACK** (exact free-lead deeper + softSamples force N=10) — expert-cheap BR ceiling **35/50**
2. **BR-GM dual model** — live BR models freeze as GM@40ms not expert-cheap → **+5 wins** to 40/50

### Rejected (this session)
- SoftN14/16, BR160 under expert-cheap BR (flat at 0.70)
- FL_EXACT_MULTI_FIRST (regressed STACK flip seed)
- Broad P1–P5 / series-2 / gold bulk rewrites (historical dual harm)

## Next: v9.3
- Opponent freeze: **v92**
- Same gate: GM N≥50 WR>0.70 primary + re-run
- Prefer small orthogonal levers + playlog analysis vs freeze v92 losses
- Gold series 1–3 remain recommendations for human CF

## Evidence
- `evolve/v92-brgm-primary-n50.json`, `evolve/v92-brgm-rerun-s12.json`
- `evolve/NOTE-br-gm-model-n50.md`, `NOTE-stack-plus1-analysis.md`, `NOTE-next-plus1-levers.md`
- `SHIP_READY.md`, `evolve/LADDER-STATUS.md`
