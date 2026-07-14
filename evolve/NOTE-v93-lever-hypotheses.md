# v9.3 lever hypotheses — beat freeze v9.2

**Date:** 2026-07-13  
**Freeze:** `policies/v92-ai.js` + `policies/v92-search.js` (STACK exact deeper + softN10 force)  
**Live:** ≈ freeze v92 (same STACK body; dual edge = budget/BR/exploit asymmetry)  
**Dual protocol:** live GM@280ms BR=on exploit=on softN10 vs freeze GM@120ms BR=off exploit=off; BR model = freeze-GM@40ms  
**Ship gate:** N≥50 WR>0.70 primary (seed `20260711`) + re-run (`20260712`)  
**Gold:** series 1–3 (IMG_0498–0521) locked — **no bulk expertScore rewrites**

---

## 1. Playlog / issues freshness

| Source | Status |
|--------|--------|
| `~/Downloads/tienlen-playlogs-1783931122937.json` | **Still newest** full export (exportedAt `2026-07-13T08:25:22Z`, 158 games) |
| `evolve/issues` | #1–#103 only (through ~2026-07-12) — **no newer than Downloads** |
| Prior CF index | subset of older GitHub exports |

No new human residual to re-mine for v9.3; dual residual from v92 ship is the primary mine.

---

## 2. Residual dual-loss classes (v92-brgm-primary N50)

**Artifact:** `evolve/v92-brgm-primary-n50.json` — **40/50 = 0.80** vs freeze **v91** (STACK + BR-GM).  
**Re-run:** `v92-brgm-rerun-s12.json` — **41/50 = 0.82**.

### 10 primary losses (perGame)

| g | seed | seat | steps | class |
|--:|-----:|:----:|------:|-------|
| 5 | **20310576** | 0 | 16 | mid combat — budget-insensitive |
| 12 | **20380387** | 1 | **5** | multi-climb trap — **structural deal loss** |
| 21 | **20470144** | 0 | 17 | pair-war / AA→22 lock |
| 28 | **20539955** | 1 | 20 | mid residual |
| 29 | **20549928** | 0 | 16 | short multi tempo (TWO_OMIN2 seed-duel flip) |
| 35 | **20609766** | 0 | 15 | free-lead multi mine (STACK still L under expert-BR) |
| 40 | **20659631** | 1 | 18 | mid residual |
| 41 | **20669604** | 0 | 16 | mid residual |
| 43 | **20689550** | 0 | 22 | long mid residual |
| 45 | **20709496** | 0 | 18 | mid residual |

### Class rollup

| Class | Seeds | Flip hope under live≡freeze |
|-------|-------|------------------------------|
| **Structural multi-tempo** | 20380387 | **Near-zero** (pass CF still L) |
| **Pair-war / high-pair burn** | 20470144 | Low (AA_SAVE dual reg) |
| **Short multi free-lead tempo** | 20549928 | Med (TWO_OMIN2 seed flip; dual fragile) |
| **Free-lead multi ranking / exact-near** | 20609766 | Med if BR/soft ranks better open |
| **Mid combat residual** | 20310576, 20539955, 20659631+ | Med via **BR-path only** (freeze BR off) |

**Critical asymmetry when live code ≈ freeze v92:** STACK exact floors + softN force **cancel** (both seats share them). Dual edge is **only** live `timeMs=280` / BR / exploit / higher iters·sims·branch vs freeze `120` / BR-off / exploit-off. Prefer levers on **BR/exploit paths freeze seat never runs**.

---

## 3. Residual seed reconstructions (`engine.createGameState(2, seed)`)

Source: SHORT_LOSS replay (`probes/SHORT_LOSS/replay-short.{out,json}`) — hands match deal.

### A. `20380387` — 5-step multi-climb (liveSeat=1) — **REJECT target**

| | |
|--|--|
| **P0 freeze** | `4♥ 5♦ 5♥ 6♠ 6♣ 7♠ 7♣ 8♦ J♣ Q♣ K♥ A♦ 2♠` |
| **P1 live** | `5♠ 5♣ 6♦ 7♦ 10♠ J♠ J♦ Q♦ Q♥ K♣ A♠ A♣ 2♥` |
| **firstLead** | `4♥` (freeze starts) |

**Trace:** freeze `4♥5♥6♣7♣8♦` → live only 5-seq `10♠J♦Q♥K♣A♣` → freeze rebeat `J♣Q♣K♥A♦2♠` → live PASS → freeze go-out `5♦6♠7♠`.  
**Live free-lead multi:** none (never free-leads). Force-pass CF still loses. **Unflippable structural**.

### B. `20549928` — short multi tempo (liveSeat=0)

| | |
|--|--|
| **P0 live** | `3♠ 3♦ 3♥ 4♣ 5♦ 6♣ 7♠ 9♥ 10♣ J♦ Q♠ Q♣ 2♣` |
| **P1 freeze** | `5♥ 6♠ 7♦ 8♦ 8♥ J♠ J♣ J♥ K♣ A♠ A♣ A♦ 2♦` |
| **firstLead** | `3♠` (live first; must include) |

**Free-lead multi (must incl. 3♠), multiAvail=6:**  
`333` · `33` · `3-4-5` · `3-4-5-6` · **`3♠4♣5♦6♣7♠`** (played) · residual later `9♥10♣J♦` / `QQ`.  
**Loss path:** live drains good multi opens @ omin=13; freeze answers high (`KA2`, trips J, pairs) and chips. TWO_OMIN2 seed-duel flipped; dual primary still L under BRGM.

### C. `20470144` — pair war (liveSeat=0; freeze starts)

| | |
|--|--|
| **P0 live** | `4♠ 4♣ 5♥ 6♠ 6♣ 6♦ 7♦ 8♠ 9♠ 10♠ J♥ A♣ A♦` |
| **P1 freeze** | `3♣ 3♦ 5♠ 5♦ 6♥ 7♠ 10♣ Q♦ K♣ K♥ A♠ 2♣ 2♥` |
| **firstLead** | `3♣` (freeze) |

**Trace:** freeze `33`→live `44`→`55`→live `66`→freeze `KK`→live **`AA`**→freeze **`22`** lock → live PASS → freeze chips.  
**Live free-lead multi (if/when lead):** `44`, `666`, `6-7-8-9-10` spine, etc. — but game dies in pair climb first. AA_SAVE dual **0.75 n20 (−1)**.

### D. `20609766` / `20310576` — mid free-lead multi + mid combat

| seed | seat | steps | dual notes |
|-----:|:----:|------:|------------|
| 20609766 | 0 | 15 | free-lead multi mine; STACK expert-BR still L; FL_EXACT still L |
| 20310576 | 0 | 16 | hardest mid residual; survives BR-GM, budget grid, most policy probes |

Reconstruct anytime: `engine.createGameState(2, seed)` (liveSeat = `seed % 2`). Helper: `evolve/_recon-v93-losses.js`.

---

## 4. Top 3 dual-safe lever hypotheses (ranked)

Context: live ≈ freeze code → **need BR/exploit/budget multipliers**, not another STACK twin.

### #1 — BR free-lead residual multiTie / BR ranking (BR-path only) ⭐

| | |
|--|--|
| **Mechanism** | Freeze seat has `bestResponse:false` — **never runs BR**. Live BR@96 soft-ranks free-leads. Gate multiTie only when residual pair-ranks ≥1/2 (not blanket 0.008). Amplifies 280ms BR budget without moving expert/gold. |
| **Locus** | `bestResponseMove` free-lead score ~`search.js` L1045 |
| **Targets** | 20609766, mid residuals with multi free-lead choice; seed-duel historically +1 (`20290630`) under expert-BR |
| **Risk** | Low gold (BR-only); dual-fragile under expert-BR N10; **re-test under BRGM vs freeze v92** |
| **Expected dual Δ** | **+0–1** if residual-gated; **REJECT** if re-applied as blanket + dualSelf (historical **33/50**) |

### #2 — TWO_OMIN2 one-axis combat (curTop 7–10, omin≤2)

| | |
|--|--|
| **Mechanism** | Only historically dual-proven **decision** soft path (vs v90: 36/50). Seed-duel flips **20549928** (still residual) + flaky `20290630`. Orthogonal to BR ranking. |
| **Locus** | `expertPolicy` 2-tempo gate ~L391–405 — **one axis only** |
| **Risk** | Med (policy); gold 2-tempo recheck; dual under expert-cheap was flat 34/50 — hope is BRGM + freeze-v92 changes combat BR overrides |
| **Expected dual Δ** | **+0–1** dual-true; probe **alone** not stacked with other policy |

### #3 — Exploit softSamples / BR trial quality (live-only search)

| | |
|--|--|
| **Mechanism** | Freeze: `exploit:false`, `softSamples:0`. Live: exploit+on + STACK softN10. Raise softN (10→14) **or** soft candidate order (prefer residual multi / shorter multi among free-lead soft) **or** BR trials 96→160 **only** under BRGM protocol. Multiplies wall-clock live already pays. |
| **Locus** | `searchMove` softNRoot ~L2548; soft pool ~L1367; env `TIENLEN_BR_TRIALS` |
| **Risk** | Low gold; softN14/16 alone was flat under expert-cheap; BR160 flat under expert-cheap — **must re-eval vs freeze v92 + BRGM** (protocol already different) |
| **Expected dual Δ** | **+0–1** fragile; wall-clock cost only |

**Side protocol (not ship policy):** deepen BR_OPP model (40→60ms) — more accurate freeze model; measure N20 before counting as rung lever.

---

## 5. Explicit REJECT list

| Lever | Why reject for v9.3 |
|-------|---------------------|
| **FL_EXACT_MULTI_FIRST** | Residual flips possible but **regressed STACK seed `20599793`** (seed-batch: still L) |
| **MULTI_REFUSE / SOFT_MULTI_REFUSE** | Dual **0.70 n20 (−2 regs)**; `20380387` still L |
| **NO_GIFT_HARD omin≤3** | Dual **0.70 n20**; short losses are not gifts |
| **AA_SAVE broad** | Dual **0.75 n20 (−1)**; does not fix `20470144` high-pair climb |
| **Blanket multiTie 0.008 + dualSelf** | Dual **33/50** |
| **Series-2 bulk doubleseq / multi-always force** | Dual **27/50** |
| **Broad P1–P5 / expertScore rewrite** | Dual **0.48 / 0.44** |
| **Exact depth 20 bulk / EXACT_WIDE floor 400 alone** | ≤34 or hung; dual wall cost |
| **Ultra wall-clock alone (MS350/BR128)** | Same 34/50 under expert-BR; residual hard mines budget-insensitive |
| **Bulk soft-pass reverse (`H_play_E_pass`)** | Dual over-active risk; GM often overrides already |
| **Broad overkill / COMBATV91 cheap-only** | Dual hurt |
| **Gold bulk expertScore for human FL length** | Imitation ≠ dual; gold series locked |
| **Hunting 20380387** | Structural; refuse unflippable for ship gate math |

---

## 6. Probe order (v9.3)

1. **Baseline** live≡v92 vs freeze v92 BRGM N20/50 (confirm pure asymmetry floor).  
2. **#1 residual multiTie** alone N20 LOG_GAMES vs freeze v92.  
3. If flat: **#3 softN14 or BR160** alone under BRGM (env-only).  
4. If flat: **#2 TWO_OMIN2** alone N50 — not stacked with #1.  
5. Ship only dual **≥36/50** + re-run; gold 0498–0521 green; **do not** count protocol-only BR_OPP deepen as policy ship without freeze of protocol in bench.

**Path math:** freeze v92 is stronger than v91; expected pure live≡freeze dual WR **well below** the 0.80 ship vs v91. Need **≥1 stable dual flip** of residual class (not 20380387) without win regs.

---

## Artifacts

- Primary losses: `evolve/v92-brgm-primary-n50.json`  
- Re-run: `evolve/v92-brgm-rerun-s12.json`  
- Prior: `NOTE-next-plus1-levers.md`, `NOTE-stack-plus1-analysis.md`, `NOTE-br-gm-model-n50.md`, SHORT/MULTI_REFUSE/AA_SAVE summaries  
- Hand replays: `$SCRATCH/probes/SHORT_LOSS/replay-short.{out,json}`  
- Reconstruct helper: `evolve/_recon-v93-losses.js`
