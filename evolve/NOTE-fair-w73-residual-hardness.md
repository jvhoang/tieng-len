# W73 — A residual hardness under bank `p_w71_ex_flseq4nineshed`

**Date:** 2026-07-14  
**Bank:** A **35**/50 · B **36**/50 vs freeze **v95** (sequential dual-rerun stable)  
**Ship bar v9.6:** A≥**36** (WR **>0.70**) · SoftN FORBIDDEN  
**Live freeze:** still **v9.5**

## Residual A (15 seats)
```
20260801@1  20280747@1  20290720@0  20300693@1  20350558@1
20370504@1  20380477@0  20390450@1  20400423@1  20410396@1
20420369@0  20440315@0  20450288@1  20470234@0  20480207@0
```

## Convert-first probes (all under dual-safe BR both SOFT=0)

| Probe | Result |
|-------|--------|
| Dual-safe 1-force MAX_STEP=20 | **0 non-pass** (3 pass-only forbidden) |
| Dual 2-force lean + hi budget MS150 | **0 hits** on FREE residual seats |
| Dual 3-force pruned | **0 hits** |
| Expert multi-ply (expert path) | several hits; **dual T20 dual-null** |
| Expert-over-BR first-diverge force | **0 converts** |
| `mulres_uniq` architecture dual | A35/B36 flat (dual-null) |
| `seqrespair` gold 0503/0519 dual | A35/B36 flat (dual-null) |
| A dual re-run ×3 sequential | **stable 35** (0 thrash) |

## Read
Remaining A losses are **freeze-identical skill / multi-ply depth >3** under fair dual.  
Not SoftN. Not parallel thrash. Next lifts need:
1. Gold residual with **deeper path CF** (4+ ply) or  
2. BR leaf architecture that firstdiffs freeze on residual without reverse, or  
3. New gold/playlog themes not yet force-exhausted.

## Bank still pure
`p_w71_ex_flseq4nineshed` A35/B36 remains best intermediate (not freeze).
