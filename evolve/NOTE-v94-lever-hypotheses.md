# v9.4 lever hypotheses — beat freeze v9.3

**Date:** 2026-07-13  
**Freeze now:** `policies/v93-ai.js` + `policies/v93-search.js` (STACK + residual multiTie BR)  
**Live:** ≈ freeze v93 (same body; dual edge = budget/BR/exploit asymmetry)  
**Dual protocol:** live MS280 BR96 softN10 exploit-on vs freeze MS120 BR-off exploit-off; BR model freeze-GM@40ms  
**Ship gate:** N≥50 WR>0.70 primary (`20260711`) + re-run (`20260712`)  
**Gold:** series 1–3 locked — **no bulk expertScore rewrites**

---

## 1. Residual primary (v93 residual multiTie vs freeze v92)

**Artifact:** `evolve/v93-residual-mt-primary.json` — **40/50 = 0.80**  
**Re-run:** `v93-residual-mt-rerun-s12.json` — **41/50 = 0.82**  
**Identity baseline:** `v93-baseline-vs-v92-n50.json` — **also 40/50, identical lossSeeds**

### Primary lossSeeds (10) — short first

| g | seed | seat | steps | class |
|--:|-----:|:----:|------:|-------|
| 12 | **20380387** | 1 | **5** | multi-climb trap — **structural** |
| 35 | **20609766** | 0 | 15 | free-lead multi mine (exact-near) |
| 5 | **20310576** | 0 | 16 | mid combat — budget-insensitive |
| 29 | **20549928** | 0 | 16 | short multi tempo (TWO_OMIN2 seed flip) |
| 41 | **20669604** | 0 | 16 | mid residual |
| 21 | **20470144** | 0 | 17 | pair-war / AA→22 lock |
| 40 | **20659631** | 1 | 18 | mid residual |
| 45 | **20709496** | 0 | 18 | mid residual |
| 28 | **20539955** | 1 | 20 | mid residual |
| 43 | **20689550** | 0 | 22 | long mid residual |

**Critical:** residual multiTie **shipped as code delta but dual-flat** on seed11 residual set (same 10 L as pure identity). Free-lead pair residual multiTie is **exhausted** as a +1 source under BRGM.

### Playlog / issues
`~/Downloads/tienlen-playlogs-1783931122937.json` still newest (158g, `2026-07-13T08:25Z`); `evolve/issues` #1–#103 only. No new human mine.

---

## 2. Residual seed reconstructions (`engine.createGameState(2, seed)`)

Helper: `evolve/_recon-v93-losses.js` (liveSeat = dual `liveSeat`; firstPlayer from deal).

### A. `20380387` — 5-step multi-climb (liveSeat=1) — **REJECT target**

| | |
|--|--|
| **P0 freeze** | `4♥ 5♦ 5♥ 6♠ 6♣ 7♠ 7♣ 8♦ J♣ Q♣ K♥ A♦ 2♠` |
| **P1 live** | `5♠ 5♣ 6♦ 7♦ 10♠ J♠ J♦ Q♦ Q♥ K♣ A♠ A♣ 2♥` |
| **firstLead** | `4♥` (freeze) |

**Trace:** freeze `4♥5♥6♣7♣8♦` → live only 5-seq `10♠J♦Q♥K♣A♣` → freeze rebeat `J♣Q♣K♥A♦2♠` → PASS → freeze go-out residual. Force-pass CF still L. **Unflippable structural**.

### B. `20549928` — short multi tempo (liveSeat=0)

| | |
|--|--|
| **P0 live** | `3♠ 3♦ 3♥ 4♣ 5♦ 6♣ 7♠ 9♥ 10♣ J♦ Q♠ Q♣ 2♣` |
| **P1 freeze** | `5♥ 6♠ 7♦ 8♦ 8♥ J♠ J♣ J♥ K♣ A♠ A♣ A♦ 2♦` |
| **firstLead** | `3♠` (live; must include) |

Live drains multi @ omin=13 (`3♠4♣5♦6♣7♠`…); freeze answers high (KA2, trip J, pairs). TWO_OMIN2 seed-duel flipped; dual primary still L under BRGM.

### C. `20470144` — pair war (liveSeat=0; freeze starts)

| | |
|--|--|
| **P0 live** | `4♠ 4♣ 5♥ 6♠ 6♣ 6♦ 7♦ 8♠ 9♠ 10♠ J♥ A♣ A♦` |
| **P1 freeze** | `3♣ 3♦ 5♠ 5♦ 6♥ 7♠ 10♣ Q♦ K♣ K♥ A♠ 2♣ 2♥` |

**Trace:** 33→44→55→66→KK→**AA**→**22** lock. AA_SAVE dual **0.75 n20 (−1)**; does not gate AA vs KK.

### D. `20609766` / `20310576` — free-lead multi mine + hardest mid combat

| seed | seat | steps | dual notes |
|-----:|:----:|------:|------------|
| 20609766 | 0 | 15 | free-lead multi; residual multiTie still L; softN14/EXACT_PLUS N15 still L |
| 20310576 | 0 | 16 | hardest mid residual; survives BR-GM, budget grid, residual multiTie, softN14, EXACT_PLUS |

Reconstruct anytime: `node evolve/_recon-v93-losses.js`.

---

## 3. Top 3 dual-safe levers (ranked) — BR/exploit path prefer

Context: live ≈ freeze **v93** → residual multiTie **cancels as novelty** (already in freeze body; live-only via BR-on). Dual edge remains **MS280 / BR / exploit / softN** vs freeze **MS120 / BR-off / exploit-off**. Prefer levers on paths freeze seat never runs.

### #1 — BR combat structure-tie + denser combat BR ⭐

| | |
|--|--|
| **Mechanism** | Free-lead residual multiTie is dual-flat; **6/10** primary losses are mid combat. Combat BR uses **trials 56** (vs free-lead 96), `cheapLegals` only, maxBranch 16, no structure soft-tie. Raise combat BR trials toward free-lead density **or** among equal rates prefer cheap answers that preserve residual pair/seq (structure-tie, not blanket multiTie). |
| **Locus** | `bestResponseMove` combat branch ~L996–1000 + score ~L1045; caller trials ~L2907–2910 (`freeBR ? 96 : 56`) |
| **Targets** | 20310576, 20539955, 20659631, 20669604, 20689550, 20709496 |
| **Risk** | Low gold (BR-only); wall-clock; avoid reintroducing blanket multiTie |
| **Expected dual Δ** | **+0–1** if combat structure-tie changes mid residual roots under BRGM |

### #2 — BR residual multi-chain (second multi / seq residual — not pair-only)

| | |
|--|--|
| **Mechanism** | V93 residual multiTie scores **pairRanks only** — flat on 20609766 free-lead multi mine. Orthogonal: boost free-lead multi that leave a **second multi** (residual seq len≥3 or trip) after open, not just residual pairs. Still BR free-lead score only. |
| **Locus** | `bestResponseMove` free-lead multiTie block ~L1045–1069 (extend residual features) |
| **Targets** | 20609766; other FL multi-choice residuals |
| **Risk** | Low gold; **must not** re-apply blanket 0.008 + dualSelf (33/50) |
| **Expected dual Δ** | **+0–1** fragile; seed-duel first on 20609766 |

### #3 — Exploit soft residual-multi order (soft pool, not softN count)

| | |
|--|--|
| **Mechanism** | Freeze: `exploit:false`, `softSamples:0`. Live STACK softN10. softN14 alone was **W/L-identical** to EXACT_PLUS on N15 early window (still L on 20310576/20380387). Prefer soft **order**: among near-rate free-lead soft candidates, rank residual multi-chain / shorter multi first (mirrors #2 on exploit path). |
| **Locus** | exploit soft re-rank ~L1387–1400; softNRoot ~L2570; optional softN 10→14 only as env after order lands |
| **Targets** | free-lead soft incomplete-exact residuals |
| **Risk** | Low gold; wall-clock; softN count alone is low priority |
| **Expected dual Δ** | **+0–1** fragile under BRGM vs freeze v93 |

**Side (not ship policy):** BR_OPP deepen 40→60ms — measure N20; protocol-only.  
**Side combat policy (probe after #1–#3 flat):** TWO_OMIN2 one-axis — seed-duel flips 20549928; dual historically flat under expert-cheap — re-eval only under BRGM vs freeze **v93**.

---

## 4. Explicit REJECT list

| Lever | Why reject for v9.4 |
|-------|---------------------|
| **Re-weight residual multiTie pairRanks (v93 axis)** | Already shipped; dual-flat identical 10 losses on primary |
| **Blanket multiTie 0.008 + dualSelf** | Dual **33/50** |
| **FL_EXACT_MULTI_FIRST bulk alone** | Residual still L under FL_EXACT notes; exact is freeze-on (weaker dual asymmetry than BR); probe only if BR levers flat |
| **SOFTN14 count alone** | N15 fingerprint identical to EXACT_PLUS; no residual flips |
| **EXACT_PLUS floors alone** | N15 still L on 20310576/20380387; wall cost |
| **Ultra wall-clock (MS350/BR128) alone** | Historical **34/50** under expert-BR; residual hard mines budget-insensitive |
| **MULTI_REFUSE / SOFT_MULTI_REFUSE** | Dual **0.70 n20 (−2)**; 20380387 still L |
| **NO_GIFT_HARD omin≤3** | Dual **0.70 n20**; short losses not gifts |
| **AA_SAVE broad** | Dual **0.75 n20 (−1)**; 20470144 AA vs KK ungated |
| **Series-2 bulk doubleseq / multi-always** | Dual **27/50** |
| **Broad P1–P5 / expertScore rewrite** | Dual **0.48 / 0.44** |
| **ENSEMBLE_FL free-lead ensemble** | Dual **0.70 n20 (−2)** |
| **Bulk soft-pass reverse (`H_play_E_pass`)** | Dual over-active risk |
| **Broad overkill / COMBATV91 cheap-only** | Dual hurt |
| **Gold bulk expertScore for human FL length** | Imitation ≠ dual; series locked |
| **Hunting 20380387** | Structural; refuse unflippable for ship-gate math |

---

## 5. Probe order (v9.4)

1. **Baseline** live≡v93 vs freeze v93 BRGM N20 (expect ~0.80 from pure asymmetry).  
2. **#1 combat BR structure-tie** alone N20 LOG_GAMES vs freeze v93.  
3. If flat: **#2 residual multi-chain** alone seed-duel on 20609766 + N20.  
4. If flat: **#3 soft residual-multi order** alone (not softN14 count).  
5. Last: TWO_OMIN2 one-axis N50 — not stacked with #1–#3.  
6. Ship only dual **≥36/50** + re-run; gold 0498–0521 green.

**Path math:** freeze v93 = freeze v92 + residual multiTie (dual-flat). Expected pure live≡freeze dual WR **~0.80** from protocol alone. Need **≥1 stable dual flip** of residual class (not 20380387) without win regs for a true newer AI.

---

## Artifacts

- Primary residual: `evolve/v93-residual-mt-primary.json` / `.log`  
- Re-run: `evolve/v93-residual-mt-rerun-s12.json`  
- Identity: `evolve/v93-baseline-vs-v92-n50.json`  
- Prior: `NOTE-v93-lever-hypotheses.md`, `NOTE-v93-baseline.md`, `NOTE-v93-probe-exact-soft.md`, `NOTE-next-plus1-levers.md`, `LADDER-STATUS.md`  
- Reconstruct: `evolve/_recon-v93-losses.js`
