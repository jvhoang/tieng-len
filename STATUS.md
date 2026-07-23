# STATUS — Superhuman Tiến Lên (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-23T12:15Z  
**W_max:** **4** (CPU_DIV=4 ~25%)  
**Dual champion:** **`p_l2s337`** (0348) · streak **0** · **L2 OPEN** · **CERT never**  
**Live:** **`v1.0-sh-L2s337`** · SITE_BUILD **`202607231200`**  
**Abs WR_v60:** **~0.63–0.67** · **NOT CERT ship** (~25pp to 0.90)  
**Gold:** 119 clean · K6 green · G7 23/0  

## Product GM path fix (2026-07-23) — shipped
Post-7/16 GH playlogs: **100% free-lead `null-free-lead`**, mass combat **`cheap-force-error-only`**, `thinkMs≈0`, **0 search stats**.  
Root: module-first UMD on mobile (stub `module`) skipped `window.TienLenSearch` → AI never ran BR.  
**Fix:** browser-first UMD (`search`/`genome`/`controller`/`ai`), `getAIMove` always stamps stats + free-lead never null, controller honors intentional pass.  
Regression: `test/test-product-gm-path.js`. **Main must not reintroduce module-first product roots.**

## Goal NOT complete
| Bar | State |
|-----|--------|
| **S0 CERT ≥0.90 vs v60** | **never** |
| **L2** (3 consecutive accepts) | **OPEN** streak **0** |
| CS1 `p_l2s86` / streak1 / mid-50s | **STALE** → real θ_prev **`p_l2s337`**, abs ~0.65 |

## Climb 0377–0381 (no accept)
| step | lever | n | Δ | LB | McNemar | result |
|------|-------|--:|--:|---:|---------|--------|
| 0377 | residual-gated FL leaf | 4000 | −0.002 | −0.009 | 94/85 | REJECT |
| 0378 | winfilter BRD | 1200 | −0.005 | −0.014 | 21/15 | reverse |
| 0379 | CB-OVERPASS soft tax | 1200 | +0.002 | −0.002 | 1/3 | thin null |
| 0380 | allowPass tighten | 1200 | −0.003 | −0.009 | 9/6 | reverse |
| 0381 | hard no-PASS if clean beat | 1200 | −0.001 | −0.008 | 11/10 | near-null |

## Ops
CPU_DIV=4 · gold G2 119 clean · no orphans · kill-points green.

## Single concrete gap blocking ship
**Abs fair dual WR vs v60 must rise from ~0.66 to ≥0.90** under one-shot CERT. Soft and hard combat pass knobs dual-null at n=1200+. Residual leaf false-led at full n=4000. Need self-play / search scale with dual-transfer, then 3 consecutive PAIR accepts → L2 → CERT.

## Ship bar
CERT ≥0.90, Wilson LB>0.87, 3 blocks ≥0.88. **Unmet.** Mid-60s ≠ ship. Streak 0 ≠ L2.
