# Next dual-safe +1/+2 levers beyond STACK

**Date:** 2026-07-13  
**Baseline:** STACK dual **35/50 = 0.70 FAIL** (need **strict >0.70 → 36/50**)  
**Freeze:** `policies/v91-*` · Gold series 1–3 locked (no bulk expertScore rewrites)  
**Sources:** `v92-race-loggames-n50.json`, NOTE-stack-plus1, NOTE-v92-plus2-hunt, NOTE-ladder-v92-restart, SHORT/MULTI_REFUSE summaries, playlog divs

---

## 1. Residual pure-race losses (15 after STACK flip)

From race-loggames 16 losses; ★ = STACK flipped:

| g | seed | seat | steps | class |
|--:|-----:|:----:|------:|-------|
| 3 | 20290630 | 0 | 22 | flaky (many patches flip; dual often still L) |
| 5 | 20310576 | 0 | 16 | mid combat / budget-insensitive |
| 6 | 20320549 | 1 | 26 | long midgame |
| 9 | 20350468 | 0 | 20 | mid combat (60s wall) |
| 12 | **20380387** | 1 | **5** | multi-climb trap — structural deal loss |
| 21 | 20470144 | 0 | 13 | pair-war / AA burn (AA_SAVE reg) |
| 23 | 20490090 | 0 | 15 | single climb |
| 28 | 20539955 | 1 | 22 | mid |
| 29 | **20549928** | 0 | **10** | short multi tempo (TWO_OMIN2 seed-duel flip) |
| 30 | 20559901 | 1 | 20 | free-lead multi mine (STACK still L) |
| 34 | 20599793★ | 1 | 16 | **exact multi free-lead timeout** → STACK W |
| 35 | 20609766 | 0 | 15 | free-lead multi mine (STACK still L) |
| 40–45 | 20659631, 20669604, 20689550, 20709496 | mix | 16–22 | mid residual |

**STACK mechanism (20599793):** liveSeat=1 first lead; hand spine `3♣–7` + trip A + 2. Exact multi open needs ≥~280ms pure / STACK proves @≥200ms with deeper handLen + floor **320**. Pure dual: exact@220 timeout → softSamples=0 skip → short L.

**Targets for next +1:** mid losses with free-lead multi that exact nearly proves (`20559901`, `20609766`, maybe `20320549`).  
**Not free-lead mines:** `20380387` (force-pass CF still L), short pair-war `20470144`.

---

## 2. Playlog dual-relevant human patterns (not yet dual-safe)

| Class | N | Dual-safe use? |
|-------|--:|----------------|
| `H_play_E_pass` | 76 | **NO** bulk reverse — v91 soft-pass ladder-tuned; GM often overrides already |
| `H_2_E_non2` | 53 | **ONE-AXIS only** (TWO history); TWO_OMIN2 dual **34/50** flat |
| `E_longer_multi_H_shorter` | 47 | Soft residual/short multiTie — blanket 0.008 dual **hurt** |
| `H_single_E_multi` / trash | 38+13 | TRASHFL dual coin-flip / series-2 **0.54** |
| Min-beat split 59 vs 42 | — | Soft structure-tie only; not broad |

Human residual favors structure (186 vs 48) — **imitation ≠ dual strength**.

---

## 3. Ranked dual-safe levers (after STACK)

### #1 FL_EXACT_MULTI_FIRST — free-lead exact action order multi→singles
| | |
|--|--|
| **Mechanism** | Same class as 20599793: forced multi free-lead exists but searched late; budget dies on singles. Sort root exact acts by `length` desc (then expert), free-lead only (`!currentCombo`). |
| **Locus** | `exactExploitMove` + `exactExploitValue` action loops (`search.js` ~1616 / ~1568) after `genActions2p(..., broad=true)` |
| **Risk** | **Low** — search order only; no expertPolicy/gold change; may *reduce* wall-clock for PV multi |
| **Expected dual Δ** | **+0–1** on residual exact-near mines (`20559901`, `20609766`); stabilizes STACK under load. Orthogonal to softN. |
| **Smoke** | Keep 20599793 W; try residual FL multi losses; 12–20 pure wins for reg |

### #2 SoftN backstop raise (STACK softN 10→14/16) — env/force only
| | |
|--|--|
| **Mechanism** | When exact incomplete, multi-sample free-lead ranking. STACK already force-enables soft under dual’s `softSamples:0`. |
| **Locus** | `searchMove` softNRoot default + exploit softSamples force (`~1367`, `~2548`) |
| **Risk** | **Low–med** — wall-clock; diminishing once exact proves |
| **Expected dual Δ** | **+0–1** fragile; only if dual softN10 still fails incomplete-exact seeds. Run after softN duals finish. |

### #3 BR160 (or BR package) under STACK — already maxbudget path
| | |
|--|--|
| **Mechanism** | More BR trials on free-lead soft rates; stacks with residual multiTie / multi ranking when exact null. Ultra budget alone was 34; BR160 N15 tied top but noisy. |
| **Locus** | env `TIENLEN_BR_TRIALS=160` (bench liveOpts); no policy |
| **Risk** | **Low** gold; wall-clock dual only |
| **Expected dual Δ** | **+0–1**; confirm N50 LOG_GAMES under STACK before treating as ship lever |

### #4 TWO_OMIN2 one-axis (curTop 7–10, omin≤2) — combat, orthogonal to exact
| | |
|--|--|
| **Mechanism** | Seed-duel flips `20290630` + `20549928`; dual primary **34/50** flat (protocol noise on flaky seed). Narrower than omin≤4 already tried. |
| **Locus** | `expertPolicy` 2-tempo gate `~391–405` — **one axis only** |
| **Risk** | **Med** — policy delta; gold 2-tempo cases recheck; dual may not land both flips |
| **Expected dual Δ** | **+0–1** dual-true; only after search levers flat |

### #5 Residual multiTie (MT_ONLY) — free-lead BR soft
| | |
|--|--|
| **Mechanism** | multiTie only when residual pair-ranks ≥1/2 (not blanket 0.008). Seed-duel +1 (`20290630`); dual N10 **no flip**. |
| **Locus** | `bestResponseMove` free-lead score `~1045` |
| **Risk** | Low if residual-gated; **high** if re-applied as blanket + dualSelf (**33/50**) |
| **Expected dual Δ** | **+0–1** protocol-fragile; stack only under BR160 + STACK, not alone |

### Side note — BR_GM_MODEL (protocol, not ship policy)
N20 **18/20** with BR opp = freeze GM 40ms (vs freeze-expert-cheap). **Protocol change.** Only consider production wiring if N50 >0.70 **and** live BR path uses same model; do not count as dual-safe expert lever.

---

## 4. REJECT list

| Lever | Why |
|-------|-----|
| Series-2 bulk doubleseq / multi-always force | Dual **27/50** |
| Broad P1–P5 / expertScore rewrite | **0.48 / 0.44** |
| Blanket multiTie 0.008 + dualSelf | **33/50** |
| MULTI_REFUSE / SOFT_MULTI_REFUSE hard pass | **0.70** n20 (−2 regs); 20380387 unfixable |
| NO_GIFT_HARD omin≤3 free-lead ban | **0.70** n20 |
| AA_SAVE broad | **0.75** n20 (−1) |
| Exact depth 20 bulk / EXACT_WIDE floor 400 alone | ≤34 or hung; dual cost |
| leafEval race/ctrl micro alone | silent under exact+BR |
| Bulk soft-pass reverse (`H_play_E_pass`) | dual over-active risk |
| Broad overkill / COMBATV91 cheap-only | dual hurt |
| Gold bulk expertScore for human FL length | imitation ≠ dual |

---

## 5. Recommended order (after STACK softN / BR160 duals finish)

1. **Finish** STACK duals: seed `20260712` reconfirm · **BR160** N50 · softN14/16 smokes.  
2. **#1 FL_EXACT_MULTI_FIRST** isolated seed-batch on residual 15 + 12 wins → dual N50 LOG_GAMES if flips≥1 ∧ regs≤0.  
3. If still ≤35: **#5 residual multiTie** under BR160 (never blanket).  
4. If still ≤35: **#4 TWO_OMIN2** alone (policy), dual N50 — not stacked with other policy.  
5. **BR_GM_MODEL** only as separate protocol/wiring study if N50 holds; not a gold/policy patch.  
6. Ship only on dual **≥36/50** + independent re-run; gold 0498–0521 green.

**Path to 36:** STACK already +1 (34→35). Need **one more stable dual flip**. Highest EV: exact multi-order (#1) on remaining free-lead-near seeds; combat TWO is second path; refuse short blowouts (`20380387`) as unflippable.

---

## Artifacts
- Pure: `evolve/v92-race-loggames-n50.json` (34/50, 16 losses)  
- STACK: `evolve/v92-n50-STACK.json` / reconfirm (35/50)  
- Prior: `NOTE-stack-plus1-analysis.md`, `NOTE-v92-plus2-hunt.md`, `NOTE-ladder-v92-restart-analysis.md`  
- Playlog: `playlog-strategy-inference.json` / `playlog-human-vs-live-divs.json`
