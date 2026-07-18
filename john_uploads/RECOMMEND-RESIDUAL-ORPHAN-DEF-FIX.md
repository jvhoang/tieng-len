# AUTHOR POINTER — Residual orphan definition fix (read now)

**Stamped:** 2026-07-18  
**Priority:** High for free-lead residual / PAIR residual work  
**Type:** New upload so gold-watcher marks **added** + dirty (fileCount +1)

## Do this

Re-read and act on the **author correction** inside:

**`john_uploads/RECOMMEND-FREELEAD-RESIDUAL-TRASH.md`**  
→ section: **“Author correction — residual orphans / residual trash (IMG_0609)”**

## One-line rule

After a play, a **mid single next to a pair/trip only** (e.g. leftover **8** next to **77** after free-lead **34567**) is still **residual trash**.  
Current `residualOrphans` that skips singles with *any* adjacent rank is **wrong** for author intent.

## Canonical check

| Open | Author residual trash | Broken code often reports |
|------|----------------------:|---------------------------:|
| 34567 | **2** (e.g. 4 and 8) | **1** (misses 8 next to 77) |
| 345678 | **1** (e.g. 4 only) | **1** |

→ Prefer **345678** when residual trash is lower.

## Ship bar unchanged

Still **WR ≥ 0.90 vs v6.0**. This only fixes residual **classification** so soft priors / leaf scores can match gold.

## Full detail

See full residual + combat directive: `RECOMMEND-FREELEAD-RESIDUAL-TRASH.md`  
Control-plan signals: `RECOMMEND-FREELEAD-CONTROL-SIGNALS.md`  
Self-play ship: `RECOMMEND-WR90-SELFPLAY.md`

---

## 🚨 Superseding urgent (read next)

L2s258-style “count **all** mid singles” fixed pair-adjacent trash but **over-counts** intact remaining runs  
(e.g. free-lead **345** leaving **910J** wrongly scored as **3** orphans; author = **0**).

**→ `john_uploads/RECOMMEND-RESIDUAL-ORPHAN-RUN-STRUCTURE-URGENT.md`**  
Correct def: mid singles are trash **unless** inside a remaining **≥3 single-run**; pair-adjacent still trash.
