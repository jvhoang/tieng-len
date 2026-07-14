# STATUS — Fair dual ladder (resumable handoff)

**Updated:** 2026-07-14T12:28Z  
**Live / freeze:** **v9.5** fair dual SHIPPED (36/36 vs v91) — commit `2a29964`  
**SoftN:** **DEAD**  
**Best bank:** `p_w69_ex_flmidshort` **A34/B36** vs freeze v95 (0.68/0.72)

## Skeptic gaps (v9.5 ship) — CLOSED
All 6 stale claims machine-refuted: `{SCRATCH}/skeptic-close/GAPS-CLOSED.json` **PASS**  
- live `AI_BUILD.id=v9.5` + `pickComSbc0` + `com-sbc0-hard`  
- fair dual primary/rerun **36/50 WR 0.72** (hidden BR-both SOFT=0) vs v91  
- `policies/v95-*` tracked; ship commit `2a29964`; gh-pages has v9.5  
- dual-primary/rerun at `{SCRATCH}/` are fair dual (not harness)

## Goal gap (honest — goal NOT complete)
Full goal = ladder **v9.1 → v11.0**. Only **v9.5** fair dual shipped.

| vs freeze **v95** | Wins | WR | Ship bar |
|-------------------|-----:|---:|----------|
| **A** | **34/50** | 0.68 | need ≥36 |
| **B** | **36/50** | **0.72** | ✓ >0.70 |

**Single concrete blocker:** need **+2 pure A** converts (0 reverse) for v9.6 dual ship, then continue 0.1 rungs to v11.0.

## A residual hardness
Under dual-safe CF (`BASE=p_w69_ex_flmidshort`, MAX_FORCE_STEP=20):
- **0 non-pass** force converts remaining  
- **3 pass-only** (PASS forbidden)  
- **13 empty** (no single-force convert)  
- firstdiff bank≡v95 on all remaining A losses (both seats)  
- Budget T40 identical fingerprint to T20  

Next A lifts need multi-ply structure, gold residual, or architecture (BR leaf / combat order) — not single-force thrash FREE.

## Stack (pure vs freeze v95 identity 25/25)
… → comkpeel A32 → flseq5exact A33 → **flmidshort A34** / B36

## SoftN
Rogue softN14/16 cancelled. Scripts `.DISABLED`. Do not relaunch.
