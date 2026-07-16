# STATUS — Superhuman Tiến Lên (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-16T06:20Z  
**W_max:** 9  
**Dual champion:** `p_l2s86` ✅ (PAIR 0100)  
**Live product:** `p_l2s100` — DEEP-DIVE kill-points + 2-for-control + controller GM search (see below)  
**Gold:** **62/0** · manifest **108 files** (new playlog + Series 6 IMG_0582–0610)  
**Ladder:** L1 ✅ · **L2 open** (streak **1**/3) · L3–L5 pending

## Ship bar
CERT ≥ **0.90** vs freeze v6.0 (Wilson LB > 0.87).

## Accepts (ΣΔ = **+0.1699**)

| step | NEW | Δ | n | WR_new |
|------|-----|---|---|--------|
| 0007 | p_l2s7 | +0.0875 | 240 | 0.51 |
| 0010 | p_l2s9 | +0.015 | 400 | 0.48 |
| 0053 | p_l2s46 | +0.0329 | 700 | 0.50 |
| 0056 | p_l2s48 | +0.0175 | 800 | 0.526 |
| **0100** | **p_l2s86** | **+0.0170** | **1000** | **0.524** |

**Streak:** **1** · **EMA:** ~0.51–0.53 · **ΣΔ gate:** ✅  

### Accept 0100 (method that worked)
Offline high-trials BR distill (TRAIN only, BR_TRIALS=48, n=623, acc~0.71) into:
- free-lead multi residual scoring
- BR free-lead root candidate order  
- soft rate prior (brdTerm)
No PAIR residual packaging. Gold 62/0.

## Post-0100 stack attempts (streak still 1)
| step | cand | vs | Δ | note |
|------|------|----|---|------|
| 0101 | re-distill p_l2s87 | p_l2s86 | ~0 | identity |
| 0102 | V retrain λ0.30 | p_l2s86 | −0.6pp | |
| 0103 | free+combat distill | p_l2s86 | **−2.1pp** | combat distill hurts |
| 0104 | mega free distill | p_l2s86 | ~0 | |
| 0105 | value pass residual | p_l2s86 | 0 | |

## Working thesis
1. **Free-lead BR-distill is the dual-transfer lever** (0100). Combat distill does not transfer.
2. SoftN=0 trials=20 still caps absolute WR ~50–53% vs v60; need more orthogonal free-lead/search leaps for consecutive accepts and path to CERT 90%.
3. Next stack candidates: larger free-lead teacher diversity (different opp models in BR teacher), free-lead nested high-trials only at root (budget reallocate), ISMCTS free-lead.

## Tools
- `evolve/train-br-distill.js` (free-lead teacher; combat mode rejected)
- `evolve/train-bc-action.js`, `train-value-expanded.js`
- Dual inject freeze dualRollout
- PAIR registry through step-0105

## Product bugfix (2026-07-16) — AI opponent vs Hint discrepancy

**Symptom:** Opponent almost never spent a **2 for control** unless forced; Hint often suggested 2s correctly.

**Root cause (yes, an overwrite/split-path bug, analogous to orderLegals wiping BRD):**

| Path | Code | Effect |
|------|------|--------|
| **AI opponent** (`controller.js`) | Forced `mode:'expert'` + `iterations:0` + `bestResponse:false` for GM when not perfectInfo | **Never ran search/BR** — pure `expertPolicy` leaf |
| **Hint** (`index.html` `requestHint`) | `getAIMove` with search + time budget | Ran search; 2p GM auto-enabled BR inside `searchMove` |

So opponent and hint were **not the same brain**. Expert leaf also returned “safe” non-2 answers first (A/K climbs, structure peels) **before** ever considering single-2 tempo.

**Fixes shipped (live `p_l2s97`):**
1. `controller.js` — product GM uses hidden search/BR (same family as duals/hints); no force-expert.
2. `search.js` `expertPolicy` / `dualRollout` — **2-for-control before safe return** vs high singles (Q+); do not auto-climb A/K when single-2 held on high combat.
3. `index.html` hint — `bestResponse` aligned with hard/GM.
4. Regression: `test/test-2-for-control.js`. Gold suite **62/0**.

**Note:** Dual champion for PAIR_STEP remains `p_l2s86` until a hybrid accept promotes `p_l2s97`. Product play uses live controller+search immediately.

**Living gold:** Series 6 (IMG_0582–0610) + new playlog present; suite still 62 cases (new images not all machine-encoded yet).

## Kill-point fixes (DEEP-DIVE L2s100)

Implemented from `evolve/DEEP-DIVE-logic-killpoints.md` (analysis holds):
1. BR free-lead BRD order final (no orderLegals wipe) + unit test
2. `freeLeadCandidates` ranks by BRD after gold pins (not pure expert)
3. MC free-lead uses freeLeadCandidates
4. Controller: no cheap-force over intentional GM/search pass
5. Re-applied 2-for-control before safe return (expert + dualRollout)
6. Gold suite 70/0 including S6 2-control + omin1 free high single

Still open: wire BC weights; dual-path gold gate; bulk Series 4–6 encoding.

## Next
1. Stack consecutive accept #2 and #3 → **L2 milestone** commit/tag  
2. Encode Series 6 gold cases that are fully specified  
3. Climb L3–L5 → CERT ≥90%  

Never residual-pack PAIR_STEP/CERT. Gold living authoritative.
