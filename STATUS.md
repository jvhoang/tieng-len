# STATUS — Superhuman Tiến Lên (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-17T05:40Z  
**W_max:** 9  
**Dual champion / live product:** **`p_l2s201`** ✅ (PAIR **0213** ACCEPT)  
**Author:** RECOMMEND-WR90-SELFPLAY + RECOMMEND-FREELEAD-CONTROL-SIGNALS  
**Gold:** expert **74/0** · dual G7 critical **17/0** · manifest **113** CLEAN · K6 green  
**Ladder:** L1 ✅ · L2 open (streak **1**/3 after long reject chain; ΣΔ≈**+0.281**) · CERT never  

**CS1 note:** goal `p_l2s86` is **stale**. Dual champion = **`p_l2s201`**.

## PAIR_STEP ACCEPT 0213
| Field | Value |
|-------|--------|
| PREV | p_l2s145 |
| NEW | **p_l2s201** |
| WR_prev | 0.506 |
| WR_new | **0.528** |
| Δ | **+2.2pp** |
| Bootstrap 95% LB | **+1.1pp** |
| McNemar | 30 new-only / 8 prev-only (stat 11.6, p≈0.003) |
| n | 1000 (500 seeds × both seats) |
| seedHash | `5e324f343fd66e67deb1b4a89b3ea1f84d5ef4a2ac03103db41415d4dd7b8ea8` |
| AI_BUILD | v1.0-sh-L2s201 |
| Change | **Free-lead P0-B2 diversity samples** into BR branch (non-expert multis/trash enter maxBranch) + 0165 progressive |

## After accept
| step | NEW | Δ | LB | note |
|------|-----|---|-----|------|
| 0212 | p_l2s201 n=700 | +1.0pp | −0.29pp | near-miss (led to 0213) |
| **0213** | p_l2s201 n=1000 | **+2.2pp** | **+1.1pp** | **ACCEPT** |
| 0214 | diversity 6+top4 nest | 0 | −0.6pp | identity null vs 201 |

## Strength truth
Absolute WR_v60 ≈ **0.53** on S_t 0213 — still far from CERT 0.90. Accept is real paired gain, not ship.

## Lessons
1. **P0-B2 free-lead diversity** dual-transferred (non-expert lines must enter BR).  
2. Near-miss at n=700 → recheck large n; 0212 near-miss → 0213 confirm accept.  
3. Soft plan/value/BRD-force packages dual-null or reverse.  
4. Free-lead architecture > combat residual thrash.

## Next
1. Stack **2 more consecutive accepts** → L2 milestone (or EMA≥0.60).  
2. Build on diversity: more free-lead samples / nested BR / stronger BRD teacher.  
3. CERT only when climbing toward 0.90.  
4. G2 gold every PAIR + ≤2h.

## Infrastructure
- `policies/p_l2s201-{ai,search,ai-build}.js` dual champion  
- `evolve/eval-registry/pair-steps/step-0213-*`  
- train-br-distill / train-freelead-control inject paths  
