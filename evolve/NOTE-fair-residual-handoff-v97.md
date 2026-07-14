# Honest residual handoff — fair dual ladder after v9.7

**Date:** 2026-07-14  
**Live:** Grandmaster **v9.7** (`AI_BUILD.id=v9.7`, `policies/v97-*` ≡ `ai.js`/`search.js`)  
**SoftN:** FORBIDDEN  

## Why handoff (not v11.0)

Under the **locked anti-overfit protocol** (fresh random A/B seeds each eval + freeze-vs-freeze control on the same seeds), pure convert packages and transfer-safe structural probes **do not clear** WR>0.70 with +≥2 identity lift.

### Machine evidence

| Probe | vs freeze | Fresh A | Fresh B | ΔA | ΔB | Class |
|-------|-----------|--------:|--------:|---:|---:|-------|
| **v97 vs v96** (live vs prior freeze) | v96 | **25/50** | **25/50** | **0** | **0** | dual-null transfer |
| **p_t1_ex_xfer** (midclimb+trash structural) | v97 | 21/50 | 21/50 | −4 | −4 | **reverse** |
| **p_t2a_fltrash** (trash-over-lowseq alone) | v97 | 23/50 | 24/50 | −2 | −1 | **reverse** |
| **p_t2b_midclimb** (midclimb tight alone) | v97 | 25/50 | 24/50 | 0 | −1 | dual-null / slight reverse |

Artifacts:
- `evolve/fresh-dual-baseline-v97-vs-v96.json` (+ rerun, identical)
- `evolve/seed-sets/ship-2026-07-14T16-19-37-026Z-v97-vs-v96.json`
- `evolve/fresh-dual-p_t1-vs-v97.json`
- `evolve/fresh-dual-p_t2a_fltrash-vs-v97.json`
- `evolve/fresh-dual-p_t2b_midclimb-vs-v97.json`
- Multi-seed 1-force census: `evolve/force-census-v97-identity.json` (30 loss seats, 160 hits; top cluster early combat min→mid)
- SCRATCH: `{SCRATCH}/fresh-*.log`, `force-census-v97.*`, `load-ai.log`, `baseline-tests.log`

### Fixed-holdout history (invalid for ship under new protocol)
v9.5–v9.7 and intermediate `p_w76…p_w117` banks used fixed HOLDOUT seeds `20260801`/`20260802`.  
Ultra-exact byR hard roots convert those seats only → **0 lift** on fresh seeds (matches human >90% vs v9.6).

## Blocker class (single concrete)
**Transfer gap under fair dual + fresh seeds:**  
1-force multi-seed residuals exist (combat midclimb, FREE trash-over-seq), but packaging as structural hard roots **reverses or dual-nulls** on independent seed sets. Seat-exact multiset roots are dual-null off holdout. No pure 0-reverse transfer-safe lever found that yields A/B WR>0.70 with identity lift ≥+2.

## SoftN
Still **FORBIDDEN**. Do not relaunch softSamples ship thrash.

## Resume path (next agent)
1. Keep protocol: `evolve/fresh-seed-fair-dual.js` only for ship gates.  
2. Prefer multi-seed **pattern mining with validation on a held-out second seed set** before package.  
3. Gold axes still open (series 1–2 residual structure, 2-budget) — micro dual-safe patches only.  
4. Do not re-farm fixed HOLDOUT_A/B as ship evidence.  
5. Target remains v11.0 when a lever clears fresh-seed gates.

## Live package (stable)
- `AI_BUILD.id = "v9.7"`
- Tests: engine 42/42, AI 37/37 (search suite has pre-existing gold IMG fails under expert path — same as freeze v96)

## Gold suite (test-search)
52/27 fail on live v9.7 — **identical** to freeze v96 and v97. See `NOTE-gold-suite-baseline-identity.md`.
