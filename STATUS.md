# STATUS — Superhuman goal (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-15T08:15Z  
**Champion:** `p_l2s7` / `v1.0-sh-L2s7` (first hybrid accept)  
**W_max:** 9 · **SoftN:** FORBIDDEN · **convert-on-S:** FORBIDDEN  
**Ladder:** **L1 ACHIEVED** · **L2 in progress** (1 accept, ΣΔ=+0.0875) · L3–L5 pending  
**Gold latest:** GREEN (48/0) · manifest clean  

## Current

| Item | State |
|------|--------|
| Champion | `policies/p_l2s7-*` + live `ai.js`/`search.js` |
| Champion dual WR (dev) | **0.5125** on accept S_t vs v60 (not ship) |
| ΣΔ accepted | **+0.0875** (1 accept) |
| Consecutive accepts | **1** / 3 needed for L2 ΣΔ path |
| EMA WR vs v6 | ~0.51 (single accept point) |
| Gold suite | **48/0** fair path |

## L1 shipped

- Commit **`89ccbe0`** tag **`milestone-L1`** on origin

## PAIR_STEP accept log

| step | NEW | accept | WR_new | WR_prev | Δ | CI 95% LB | n | seedHash |
|------|-----|--------|--------|---------|---|-----------|---|----------|
| smoke-id | id | false | 0.333 | 0.333 | 0 | 0 | 24 | b62d9f0b… |
| 0001 | p_l2s1 | false | 0.500 | 0.500 | 0 | −0.06 | 200 | 130bbc38… |
| 0002 | p_l2s2b | false | 0.419 | 0.488 | −0.069 | −0.14 | 160 | 13486c8c… |
| 0003-v60probe | v60 | false | 0.500 | 0.425 | +0.075 | −0.03 | 80 | 157209e9… |
| 0004 | p_l2s5 | false | 0.469 | 0.475 | −0.006 | −0.08 | 160 | dedb0246… |
| 0005 | p_l2s6 | false | 0.515 | 0.485 | +0.030 | −0.05 | 200 | 8b2d3be2… |
| 0006 | p_l2s6 | false | 0.480 | 0.460 | +0.020 | −0.04 | 300 | 70a2d4ed… |
| **0007** | **p_l2s7** | **ACCEPT** | **0.5125** | **0.425** | **+0.0875** | **+0.029** | **240** | **db7500c5…** |

Accept 0007 levers (general): low-pair free-lead when control-backed; BR residual soft-tie on `structureBreakCost`; dualRollout BR; gold expert path green.

## Next for L2

Need **ΣΔ ≥ +0.10** with **≥3 consecutive accepts** OR EMA ≥ 0.60.

1. PAIR_STEP next candidates on fresh S_t vs **p_l2s7** champion
2. Series 4–5 gold cases into suite
3. Combat/trash levers from `evolve/NOTE-l2-bc-levers.md`
4. BC self-play under W_max=9
5. When L2 met → milestone-L2 commit+push+tag

## Forbidden reminder

No residual packaging of any S_t. Discard reject seeds. CERT only after freeze SHA.
