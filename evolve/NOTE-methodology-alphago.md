# Methodology — AlphaGo/AlphaZero-class hybrid (Tiến Lên)

**Protocol:** hybrid PAIR_STEP + one-shot CERT. Living gold from `john_uploads/`.  
**Ship bar:** frozen SHA → CERT vs freeze v6.0 with WR ≥ 0.90 (Wilson LB > 0.87).  
**Forbidden:** convert-on-S / convert-on-PAIR_STEP / convert-on-CERT residual fingerprints.

## Why hybrid (not fixed VAL forever)

Forever-fixed TRAIN_VAL invites residual packaging: dual VAL → fingerprint losses → re-dual same VAL → fake climb (v1→v10.x failure).  
Unpaired random-only eval has high luck noise.  
**Hybrid:** each checkpoint draws fresh `S_t`; both θ_prev and θ_new play the same `S_t` vs v6.0; accept only from paired Δ with CI. Next step draws new `S_{t+1}` so ultra-exact roots on last seeds die.

## Three layers

| Layer | Role |
|-------|------|
| **TRAIN** | Unlimited new deals. Self-play, BC, probes. Only place to inspect per-seed losses for learning. |
| **PAIR_STEP** | Dev accept/reject. Fresh S_t; paired duals; no residual packaging from S_t. |
| **CERT** | Ship only. Freeze git SHA first, then generate/unseal CERT seeds. One shot. |

## PAIR_STEP accept rule

1. Draw S_t: n≥100 seeds × both seats (crypto random; ban shop seeds 20260801/20260802/…).
2. Dual θ_new and θ_prev vs v60 on identical S_t (fair H4).
3. Accept only if Δ_WR > 0 and bootstrap/Wilson 95% LB on Δ > 0 (optional LB > +0.01), gold latest suite green, and no ultra-exact byR pack as sole change.
4. Reject ⇒ discard S_t for training forever. Accept ⇒ log Δ, CI, seed hash, SHAs; next S is new.

## Fair dual protocol (H4)

- `hiddenInfo=true`, `perfectInfo=false`
- grandmaster, `bestResponse=true` both seats, equal budget, SoftN=0
- both seats per deal seed
- identity duals ~50% when needed

## One-shot CERT (H6)

1. Freeze candidate to git commit SHA (no further policy edits for that claim).
2. Only then generate CERT seeds (≥300 deals × both seats).
3. Ship: WR ≥ 0.90, Wilson LB > 0.87; 3 blocks each WR ≥ 0.88.
4. Secondary freezes: WR ≥ 0.85 (LB > 0.80); never lose overall to any freeze.
5. Fail ⇒ more PAIR_STEP training; next attempt needs **new** SHA + **new** CERT seeds.

## Living gold (G0–G5)

- Canonical: `tieng-len/john_uploads/` (dynamic; poll every PAIR_STEP and ≤2h).
- Manifest: `evolve/eval-registry/gold-manifest.json` (paths, sizes, mtimes, hashes).
- Suite: `evolve/run-gold-fair-suite.js` on fair getAIMove (mode=expert, hidden).
- Green on **latest** suite required for PAIR_STEP accept and CERT ship. Never drop author tests.

## Convert ban (H5)

Forbidden as skill: ultra-exact roots keyed only to flip residual seats on a fixed seed list.  
Allowed: general features, learned nets, parametric heuristics, search+prior, self-play.

## Workers

`W_max = floor(logical_cores / 2)`. Dual/self-play/train heavy workers must not exceed W_max.

## Scripts

| Script | Purpose |
|--------|---------|
| `evolve/refresh-gold-manifest.js` | Inventory + hash living gold folder |
| `evolve/run-gold-fair-suite.js` | Fair-path gold suite (exit 0 = green) |
| `evolve/pair-step.js` | Paired θ_prev vs θ_new on fresh S_t |
| `evolve/test-pair-step-math.js` | Unit tests for Δ / CI / accept math |
| `evolve/cert-run.js` | One-shot CERT after FREEZE_SHA |
| `evolve/fresh-seed-fair-dual.js` | Underlying fair dual runner |

## Milestone ladder (not ship)

L1 harness+gold → L2 EMA/ΣΔ → L3 → L4 → L5 CERT ship.  
Never call L2–L4 “ship” or “superhuman.” Never climb via residual packing a fixed seed file.

## Evidence layout

- PAIR_STEP: `evolve/eval-registry/pair-steps/step-*-{seeds,report}.json`
- CERT: `evolve/eval-registry/cert/`
- Status: root `STATUS.md` accept/reject + gold refresh log
- Freezes: `policies/milestone-L{k}-*` and/or `policies/vNN-*`
