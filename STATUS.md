# STATUS — Superhuman Tiến Lên (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-23T08:30Z  
**W_max:** **4** (CPU_DIV=4 ~25% · author MACBOOK-CPU-CAP-25)  
**Dual champion:** **`p_l2s337`** (0348 ACCEPT) · streak **0** · **L2 OPEN** · **CERT never**  
**Live product (GH Pages):** **`v1.0-sh-L2s337`** · SITE_BUILD **`202607231400`** (real GM bind)  
**Live evolve:** FDIM36 BRD candidate **p_l2s402** (0383b smoke / re-freeze after path fix)  
**Abs WR_v60:** **~0.63–0.67** · **NOT CERT ship** (~25pp to 0.90)  
**Gold:** 119 clean · K6 green · G7 critical 18/0 (suite) / playlog human edge real after bind fix  

## Goal NOT complete
| Bar | State |
|-----|--------|
| **S0 CERT ≥0.90 vs v60** | **never** |
| **L2** (3 consecutive accepts) | **OPEN** streak **0** |
| CS1 `p_l2s86` / streak1 / mid-50s | **STALE** → real θ_prev **`p_l2s337`**, abs ~0.65 |

---

## Path integrity (product GH + main PAIR) — mandatory

| Surface | Contract |
|---------|----------|
| **Product / GH Pages** | `ai.js` uses `_loadNode` + **never `require()` under `window`**. Free-lead always stamps stats. SITE_BUILD cache-bust after product edits. |
| **Freeze bank** | `evolve/freeze-live.js` rewrites **both** `require('./search.js')` and `_loadNode('./search.js')` → `./<tag>-search.js`. **Validates** before write (exit 2 if still live `./search.js`). |
| **Restore / promote / hillclimb** | Shared **`evolve/policy-path-rewrite.js`** only — no one-off half-updated regex. |
| **Regression** | `test/test-product-gm-path.js` + `test/test-policy-path-rewrite.js` (bank scan: no `p_l2s*`-ai loads live `./search.js`). |

### Incidents 2026-07-23 (do not re-open wrong fix)

1. **Product:** module-first UMD + stub `require` on iPhone → `TienLenAI.getAIMove missing` → 100% free-lead `null-free-lead` / mass `cheap-force-error-only` / thinkMs≈0. Human WR inflated to ~90% vs **false GM**.  
   **Fix:** browser-first UMD + `_loadNode` never under window · SITE_BUILD `202607231400`. Post-fix playlogs: fallback ~3%, BR modes live, human WR ~58% on n=19.

2. **Main dual:** freeze-live only rewrote classic `require('./search.js')`, not `_loadNode` → freezes loaded null/wrong search → dual WR **0%** (0383 abort).  
   **Fix:** `policy-path-rewrite.js` + freeze validation + re-freeze post-`_loadNode` tags before PAIR.

**Do not** revert product to bare `require('./search.js')` (re-breaks iPhone).  
**Do not** freeze without `node evolve/freeze-live.js <tag>` validation.  
**Do not** treat phone human WR as dual CERT evidence.

Author mandate (detail): `john_uploads/RECOMMEND-PRODUCT-DUAL-PATH-INTEGRITY-URGENT.md`

---

## Critical infra (main session note)
**freeze-live.js** `_loadNode` rewrite is in tree. Re-freeze any post-browser-first policies before PAIR if they still point at live `./search.js`.  
Smoke 0383b uses fixed freeze for **p_l2s402**.

## Climb (no accept yet)
| step | lever | n | Δ / note | result |
|------|-------|--:|----------|--------|
| 0377 | residual-gated FL leaf | 4000 | Δ=−0.002 LB−0.009 | **REJECT** |
| 0378 | winfilter BRD | 1200 | reverse | reverse |
| 0379 | CB-OVERPASS soft tax | 1200 | thin null McNemar 1/3 | near-null |
| 0380 | allowPass tighten | 1200 | reverse | reverse |
| 0381–0382 | hard no-PASS if clean beat | 1200 | near-null | near-null |
| **0383** | p_l2s402 FDIM36 (bad freeze) | — | dual WR 0% | **abort / re-freeze** |
| **0383b** | p_l2s402 FDIM36 residual BRD | smoke | fixed freeze | **in flight** |

## Ops
CPU_DIV=4 · gold G2 119 clean · no orphans · kill-points green · product SITE_BUILD 202607231400.

## Single concrete gap blocking ship
**Abs fair dual WR vs v60 must rise from ~0.66 to ≥0.90** under one-shot CERT.  
Soft/hard combat pass knobs and residual leaf thrash dual-null or false-lead at n≥1200.  
Need self-play / search scale with dual-transfer, then 3 consecutive PAIR accepts → L2 → CERT.

## Ship bar
CERT ≥0.90, Wilson LB>0.87, 3 blocks ≥0.88. **Unmet.** Mid-60s dual WR ≠ ship. Streak 0 ≠ L2.  
Product dual-champion push ≠ CERT. Phone human WR ≠ dual WR.
