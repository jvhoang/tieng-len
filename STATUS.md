# STATUS — Superhuman Tiến Lên (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-16T19:32Z  
**W_max:** 9  
**Dual champion:** `p_l2s145` ✅ (PAIR **0165**)  
**GitHub champion freeze:** `policies/p_l2s145-*` + product root `ai.js`/`search.js`/`ai-build.js` (PAIR **0165** ACCEPT)  
**Live product:** `v1.0-sh-L2s145`  
**Gold:** dual G7 **17/0** · manifest **111** CLEAN · K6 green  
**Ladder:** L1 ✅ · **L2 open** (streak **1**/3) · CERT not attempted  

## Ship bar
CERT ≥ **0.90** vs v6.0. Dual WR ~53–58% on fair duals — **not ship**.

## Accepts (ΣΔ ≈ **+0.259**)

| step | NEW | Δ | LB | n | note |
|------|-----|---|-----|---|------|
| **0115** | p_l2s104 | +0.0567 | >0 | 300 | FL distill dual-safe |
| **0125** | p_l2s112 | +0.0227 | >0 | 440 | mixed-opp + nested |
| **0165** | **p_l2s145** | **+0.0100** | **+0.0029** | 700 | progressive+cond MC + 2× nested + brdTerm0.13 |

**Streak:** **1** (need 3 consecutive for L2). Rejects after 0165 reset consecutive progress.

## Post-0165 climb (all REJECT)

| step | candidate | Δ | LB | n | note |
|------|-----------|---|-----|---|------|
| 0166 | paired multi-world | +0.67pp | 0 | 600 | near-miss |
| 0167 | always MC amplify | +0.31pp | <0 | 640 | |
| 0168 | paired re-eval n=400 | 0 | ± | 800 | identity |
| 0169 | budget amplify 2.25× | +0.14pp | <0 | 700 | |
| 0170 | soft GOLD_W distill | 0 | ± | 640 | identity |
| 0171 | trash+control + ISMCTS | +0.67pp | <0 | 600 | |
| 0172 | re-eval 150 n=420 | +0.83pp | **0** | 840 | McNemar 11–4 near |
| 0173 | amplify ISMCTS | +0.83pp | <0 | 720 | |
| **0174** | re-eval 150 n=500 | **0** | ±0.9 | **1000** | **noise cleared — null** |
| 0175 | nested BRD leaf diversity | −0.31pp | <0 | 640 | reverse |
| **0176** | free-lead-aware opp model | **−1.88pp** | <0 | 640 | **toxic reverse** |

### Lessons
1. **0165 recipe is the last dual-transferring free-lead architecture.** Micro amplifications rarely clear LB>0.
2. **0174 is critical:** p_l2s150 looked +0.8pp at n≈600–840 but **identity at n=1000** — do not promote on single near-miss without large-n recheck.
3. Soft distill / nested BRD leaf / budget knobs → null or reverse.
4. Free-lead-aware opponent model (0176) is **dual-toxic** (−1.9pp) — do not use.
4. Prefer **qualitatively new** free-lead search (true multi-ply / belief) over residual packages.

## Champion L2s145 recipe (do not regress)
- Progressive free-lead scout → deep top-K
- Conditional top-2 flat MC when rateV close
- Free-lead nested trials **2×**
- Free-lead brdTerm **0.13** (combat 0.10)
- Kill-points K1–K5 honored; K6 green

## Gates
K6 green · G7 17/0 · gold 111 CLEAN · W_max=9

## Next for L2
Need **2 consecutive** accepts vs `p_l2s145`.  
Levers: multi-ply free-lead search, dual-BR value from full game traces (not expert leaf), gold GR encoding if uploads appear.  
Never residual-pack. CERT 90% still far.
