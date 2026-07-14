# v9.5 lever hypotheses — beat freeze v9.4

**Date:** 2026-07-14  
**Freeze now:** `policies/v94-ai.js` + `policies/v94-search.js`  
(STACK + residual multiTie BR + TWO_OMIN2)  
**Live build stamp:** still `v9.4` (`ai-build.js` @ 2026-07-14T01:40Z)  
**Dual:** live MS280 BR96 softN10 exploit-on vs freeze MS120 BR-off exploit-off; BR model freeze-GM@40ms  
**Ship gate:** N≥50 WR>0.70 primary (`20260711`) + re-run (`20260712`)  
**Gold:** series 1–3 locked — **no bulk expertScore rewrites**

---

## 1. Playlog freshness

| Source | Status |
|--------|--------|
| `~/Downloads/tienlen*.json` | **None present** (export gone / not re-exported) |
| Last known export | `tienlen-playlogs-1783931122937.json` · **2026-07-13T08:25Z** · 158g |
| `evolve/issues` | Still **#1–#103** only |
| `evolve/playlog-index.json` | `refreshedAt` **2026-07-13T02:50:53Z** |

**Verdict: STALE.** No new human mine for v9.5. Dual residual set is the authority.

---

## 2. Residual primary (v94 TWO_OMIN2 vs freeze v93)

| Run | Artifact | WR |
|-----|----------|---:|
| Primary | `v94-two-omin2-primary.json` | **40/50 = 0.80** |
| Re-run | `v94-two-omin2-rerun-s12.json` | **42/50 = 0.84** |

### Primary lossSeeds (10) — **identical to v93 residual set**

| g | seed | seat | steps | class |
|--:|-----:|:----:|------:|-------|
| 12 | **20380387** | 1 | **5** | multi-climb trap — **structural REJECT** |
| 35 | **20609766** | 0 | 15 | free-lead multi mine |
| 5 | **20310576** | 0 | 16 | mid combat hard residual |
| 29 | **20549928** | 0 | 16 | short multi tempo (TWO seed-duel only) |
| 41 | **20669604** | 0 | 16 | mid residual |
| 21 | **20470144** | 0 | 17 | pair-war AA→22 |
| 40 | **20659631** | 1 | 18 | mid residual |
| 45 | **20709496** | 0 | 18 | mid residual |
| 28 | **20539955** | 1 | 20 | mid residual |
| 43 | **20689550** | 0 | 22 | long mid residual |

**Critical:** TWO_OMIN2 shipped as code delta but **primary 10 L unchanged**. Free-lead residual multiTie **and** TWO_OMIN2 are now in freeze body → dual novelty cancels. Edge remains protocol asymmetry only.

**Live WIP dirt:** `search.js` already carries unmeasured `V95_COMBAT_BR` (56→80), `V95_MULTI_CHAIN`, `V95_COMBAT_STRUCT`. Freeze v94 lacks all three. **Identity dual (live≡v94) is dirty until measured or reverted.**

---

## 3. Top 3 dual-safe levers (ranked) — BR / exploit only

Prefer paths freeze seat never runs (`bestResponse:false`, `exploit:false`, `softSamples:0`).

### #1 — Combat BR denser trials + structure soft-tie ⭐

| | |
|--|--|
| **Mechanism** | **6/10** primary losses are mid combat. Freeze combat BR never runs. Raise combat trials (v94: **56**) and among equal rates prefer cheap answers that leave residual pair ranks (not blanket multiTie). |
| **Freeze loci** | combat cand: `bestResponseMove` `else` branch **L1011–1014** (`cheapLegals` + `orderLegals`); score end **L1057–1086**; caller trials **L2925** (`freeBR ? 96 : 56`); maxBranch **L2938** (`freeBR ? 22 : 16`) |
| **Live WIP** | trials **L2946–2952** (`: 80`); combat struct **L1103–1109** — **measure dual first** |
| **Targets** | 20310576, 20539955, 20659631, 20669604, 20689550, 20709496 |
| **Risk** | Low gold (BR-only); wall-clock; no blanket multiTie |
| **Expected dual Δ** | **+0–1** if mid residual roots flip under BRGM |

### #2 — BR residual multi-chain (seq spine, not pair-only)

| | |
|--|--|
| **Mechanism** | V93 residual multiTie scores **pairRanks only** — flat on 20609766. Boost free-lead multi that leave residual **seq run ≥3** (second multi path). BR free-lead score only. |
| **Freeze loci** | `bestResponseMove` multiTie **L1060–1084** (pairRanks only) |
| **Live WIP** | `residualAfter` + multiChain **L1062–1101** — **measure dual first** |
| **Targets** | 20609766; FL multi-choice residuals |
| **Risk** | Low gold; **must not** re-apply blanket 0.008 + dualSelf (**33/50**) |
| **Expected dual Δ** | **+0–1** fragile; seed-duel 20609766 first |

### #3 — Exploit soft residual-multi order (soft pool, not softN count)

| | |
|--|--|
| **Mechanism** | Freeze: exploit off / softSamples 0. Live STACK softN10. softN14 count alone was W/L-identical (no residual flips). Prefer soft **order**: among near-rate FL soft cands, rank residual multi-chain / shorter multi first (mirrors #2 on exploit path). **Greenfield — not in live WIP.** |
| **Loci** | exploit soft re-rank **L1481–1484** (`bonusS` length-only today); softNRoot **L2610–2612**; optional softN 10→14 only as env after order lands |
| **Targets** | free-lead soft incomplete-exact residuals (20609766 class) |
| **Risk** | Low gold; wall-clock; softN count alone = low priority |
| **Expected dual Δ** | **+0–1** fragile under BRGM vs freeze v94 |

**Side (not ship):** BR_OPP 40→60ms — protocol-only N20.  
**Do not re-probe TWO_OMIN2** as novelty vs freeze v94 (now freeze body).

---

## 4. Explicit REJECT list

| Lever | Why reject for v9.5 |
|-------|---------------------|
| **TWO_OMIN2 re-tune / stack** | Shipped; primary 10 L identical; now freeze body |
| **Re-weight residual multiTie pairRanks** | Dual-flat since v93; freeze body |
| **Blanket multiTie 0.008 + dualSelf** | Dual **33/50** |
| **SOFTN14 count alone** | N15 fingerprint = EXACT_PLUS; no residual flips |
| **EXACT_PLUS / ultra MS350 BR128 alone** | Budget-insensitive hard mines; historical ≤34 under expert-BR |
| **MULTI_REFUSE / SOFT_MULTI_REFUSE** | Dual **0.70 n20 (−2)**; 20380387 still L |
| **NO_GIFT_HARD omin≤3** | Dual **0.70 n20** |
| **AA_SAVE broad** | Dual **0.75 n20 (−1)**; 20470144 ungated |
| **FL_EXACT_MULTI_FIRST bulk** | Weaker dual asymmetry than BR; regressed STACK seed historically |
| **Series-2 bulk doubleseq / multi-always** | Dual **27/50** |
| **Broad P1–P5 / expertScore rewrite** | Dual **0.48 / 0.44**; gold locked |
| **ENSEMBLE_FL** | Dual **0.70 n20 (−2)** |
| **Bulk soft-pass reverse / overkill combat** | Dual hurt |
| **Hunting 20380387** | Structural unflippable |

---

## 5. Probe order (v9.5)

1. **Baseline** live≡clean-v94 vs freeze v94 BRGM N20 (expect ~0.80 pure asymmetry). If live WIP stays, report dirty delta vs identity.  
2. **#1 combat BR structure + denser trials** alone N20 LOG_GAMES vs freeze v94.  
3. If flat: **#2 residual multi-chain** alone seed-duel 20609766 + N20.  
4. If flat: **#3 soft residual-multi order** alone (not softN14 count).  
5. Ship only dual **≥36/50** + re-run; gold 0498–0521 green; one-axis only.

**Path math:** freeze v94 = freeze v93 + TWO_OMIN2 (dual-flat on primary residual). Need **≥1 stable dual flip** of residual class (not 20380387) without win regs.

---

## Artifacts / loci map

| Item | Path |
|------|------|
| Primary / re-run | `evolve/v94-two-omin2-primary.json` · `v94-two-omin2-rerun-s12.json` |
| Prior | `NOTE-v94-lever-hypotheses.md`, `LADDER-STATUS.md` |
| Freeze combat BR | `policies/v94-search.js` L1011–1014, L1060–1086, L2925, L2938 |
| Live WIP V95 | `search.js` L1062–1109, L2950–2952 |
| Soft order greenfield | `search.js` L1481–1484, L2610–2612 |
| Reconstruct | `evolve/_recon-v93-losses.js` |
