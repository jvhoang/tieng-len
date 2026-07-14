# v9.3 baseline — live ≡ freeze v92 under dual protocol

**Date:** 2026-07-13  
**N=20 seed 20260711:** **18/20 WR=0.90** (`evolve/v93-baseline-vs-v92-n20.json`)

## Why identity still wins
Live budget **280ms / BR96 / softN10** + BR models freeze as **GM@40ms**.  
Freeze seat plays **120ms / no BR**. Same search code → budget/BR asymmetry alone is dual-strong under current protocol.

## Loss seeds (N20)
`20310576`, `20380387` (short 5-step multi-climb trap)

## Implication
Shipping a pure stamp as v9.3 would pass dual gate but is **not a newer AI**.  
v9.3 must include a **real search/policy micro-delta** targeting residual losses, then re-dual N=50×2.

## Next
1. N=50 baseline measurement (optional evidence)
2. Residual lever probes on loss seeds
3. Promote best lever; dual N=50 primary + re-run vs freeze v92
