# Honest lever hypotheses — dual residual restart (post hollow rungs)

**Date:** 2026-07-14  
**Status:** Analysis only (no `ai.js` / `search.js` mutation)  
**Freeze authority:** `policies/v94-*` (live ≈ freeze v9.4 after hollow rungs)  
**Dual protocol (locked):** live **280ms BR-on softN10 exploit-on** vs freeze **120ms BR-off exploit-off**; BR opp model = freeze-GM@40ms  
**Primary seed:** `20260711` · gate historically WR>0.70 N≥50 + re-run `20260712`  
**Gold:** series 1–3 in `test-search.js` (IMG_0498–0521 + P1/P3/P5) must stay green — **no bulk `expertScore` rewrite**

---

## 0. Honest restart premise (do not re-ship hollow)

### Fact pattern

| Artifact | Result | Same 10 lossSeeds? |
|----------|--------|:------------------:|
| v92 BR-GM primary vs freeze v91 | 40/50 | yes |
| `v93-baseline-vs-v92-n50.json` **identity** live≡v92 | **40/50** | **yes** |
| v93 residual multiTie primary | 40/50 | yes |
| `v94-two-omin2-primary.json` vs freeze v93 | **40/50 = 0.80** | **yes** |
| v95 combat-BR denser (hollow) | 40/50 | yes |

Exact shared residual set (primary seed11):

```
20310576, 20380387, 20470144, 20539955, 20549928,
20609766, 20659631, 20669604, 20689550, 20709496
```

**Implication:** after BR-GM dual protocol, **code-identical live already scores 40/50** under budget/BR asymmetry. Policy stamps that land in the freeze body (STACK softN, residual multiTie, TWO_OMIN2, hollow combat-BR density) **cancel as dual novelty**. Absolute WR>0.70 is **not** proof of a stronger AI.

### Honest accept rule (required)

1. **Identity baseline first:** dual live≡freeze under dual budgets → expect ~0.80 on seed11; record lossSeeds.  
2. **Promote only if** N=50 primary **beats identity by ≥+2 wins** on same seed0 **and** re-run holds, **and** ≥1 residual loss flips under LOG_GAMES (not 20380387 alone).  
3. **No ship** for env-only / protocol-only / dual-flat one-axis stamps that leave the residual set unchanged.

### Dual ≠ human strength (brief)

| | Human play | Dual gate |
|--|------------|-----------|
| Info | hidden | perfect both sides |
| Time | browser GM ~900ms | live 280 vs freeze 120 |
| Opp model | human noise | freeze seat det GM |
| Signal | you still win >90% | live >70% vs half-time freeze |

---

## 1. Residual class rollup (primary 10)

| Class | Seeds | Steps | Flip hope (honest) |
|-------|-------|------:|--------------------|
| **Structural multi-climb** | **20380387** | 5 | **REJECT** — force-pass CF still L |
| **Pair-war AA→22** | 20470144 | 17 | Low (AA_SAVE dual reg; high-pair climb) |
| **Short multi tempo** | 20549928 | 16 | Med seed-duel only (TWO_OMIN2 flipped duel, dual primary still L) |
| **Free-lead multi mine** | 20609766 | 15 | Med — BR/exploit FL rank only (not pair multiTie again) |
| **Mid combat residual** | 20310576, 20539955, 20659631, 20669604, 20689550, 20709496 | 16–22 | **Primary target** — 6/10; freeze never runs combat BR |

### Hand reconstructions (key mines)

Helper: `node evolve/_recon-v93-losses.js` (engine deal; liveSeat = dual seat).

**20380387** (liveSeat=1, firstLead freeze `4♥`) — structural REJECT  
- Freeze: `4♥ 5♦ 5♥ 6♠ 6♣ 7♠ 7♣ 8♦ J♣ Q♣ K♥ A♦ 2♠`  
- Live: `5♠ 5♣ 6♦ 7♦ 10♠ J♠ J♦ Q♦ Q♥ K♣ A♠ A♣ 2♥`  
- Trace: freeze 5-seq → live only 5-seq rebeat → freeze KA2 rebeat → PASS → freeze residual go-out. Unflippable deal shape.

**20549928** (liveSeat=0, firstLead live `3♠`)  
- Live: `3♠ 3♦ 3♥ 4♣ 5♦ 6♣ 7♠ 9♥ 10♣ J♦ Q♠ Q♣ 2♣`  
- Freeze: `5♥ 6♠ 7♦ 8♦ 8♥ J♠ J♣ J♥ K♣ A♠ A♣ A♦ 2♦`  
- Loss path: multi drain @ omin=13; freeze answers high. TWO seed-duel flip; dual still L.

**20470144** (liveSeat=0; freeze starts)  
- Live: `4♠ 4♣ 5♥ 6♠ 6♣ 6♦ 7♦ 8♠ 9♠ 10♠ J♥ A♣ A♦`  
- Freeze: `3♣ 3♦ 5♠ 5♦ 6♥ 7♠ 10♣ Q♦ K♣ K♥ A♠ 2♣ 2♥`  
- Trace: 33→44→55→66→KK→**AA**→**22** lock.

**20609766 / 20310576** — free-lead multi + hardest mid combat; survive residual multiTie, softN14, EXACT_PLUS N15 fingerprint, budget grid.

---

## 2. v91 → v94 policy deltas (key only)

Freeze bodies: `policies/v91-search.js` → `policies/v94-search.js`.

| Axis | v91 | v94 | Dual novelty now? |
|------|-----|-----|-------------------|
| Free-lead exactMs floor | 220 | **320** (STACK/EXACT_ONLY) | Cancelled in freeze body |
| Exact totalCards bands | ≤12/16/20/24 | **≤14/18/22/26** | Cancelled |
| softSamples force | `!== 0` skip when 0 | **STACK force default 10** when 0/false | Cancelled (live softN10 env) |
| softN default | 6 / root 3 | **10 / root 10** | Cancelled |
| BR free-lead multiTie | short-multi only | **+ residual pairRanks** (V93) | Cancelled (in freeze) |
| TWO_OMIN2 | absent | **omin≤2, curTop 7–10** | Cancelled (in freeze); primary 10 L unchanged |
| Combat BR trials | free 96 / combat **56** | same | **Still asymmetric only via live BR-on** |
| Combat soft-root structure tie | cheap/pass leaf only | same | Live-only when soft-exploit path |

**Net:** dual edge after identity is almost purely **MS280 + BR-on + exploit-on + softN + branch** vs freeze **MS120 + BR-off + exploit-off**. Prefer levers on **paths freeze seat never runs**.

---

## 3. Gold constraints (series 1–3 must stay green)

Locus: `test-search.js` ~L502–770.

| Series | Theme | Fragile under wrong lever |
|--------|--------|---------------------------|
| 1 (0498–0504) | Structure: don't break pair/run for low beat; pass QQ; high residual seq | Broad combat pass / over-structure |
| 2 (0505–0513) | Doubleseq free-lead; pass vs mid seq / AA; 2 not K-from-pair | Bulk free-lead multi rewrite; AA_SAVE-ish |
| 3 (0514–0521) | Trash before high multi; residual 4-run; omin=1 2-spend | Hybrid trash bulk; 2-tempo bulk |
| P1/P3/P5 | Min-beat, low pair before AA, 2-budget | `expertScore` bulk |

**Safe pattern:** BR / exploit / combat soft-root **tie-breaks only** (rate-primary).  
**Unsafe:** bulk `expertScore`, series-3 wholesale, broad pass gates, AA_SAVE, multi-always force.

---

## 4. Human-facing insight (what dual GM misses)

Sources: `HUMAN-LOSS-MINES-v11.md`, `playlog-strategy-inference.json`, `counterfactual-79-latest-summary.json`  
(Playlog export `~/Downloads/tienlen-playlogs-1783931122937.json` not present on disk; inference artifact still points at that export / 2026-07-13.)

### Aggregate human signal

| Pattern | N | Meaning |
|---------|--:|---------|
| `combatDiffer` | 188 / 61.8% of differs | Mid-trick choice is the main human/AI gap |
| `humanPassAltPlay` | 33 | Human **passes**; AI **plays** |
| `humanPlayAltPass` | **0** | AI **never** folds when human contests |
| `pass→pair` + `pass→triple` | 22+7 | Over-contest mid multi |
| residualScore hBetterRes : eBetterRes | **186 : 48** | Human leaves better residual structure |
| `H_overkill_E_minimal` / reverse | 59 / 42 | Min-beat vs overkill split |
| `E_longer_multi_H_shorter` | 47 | AI longer multi free-lead |
| `H_2_E_non2` | 53 | Human burns 2 more often (ONE-AXIS only historically) |

### What humans do that dual perfect-info GM misses

1. **Mid-combat fold discipline** — when deep + opp not short, pass mid pair/triple/seq rather than structure-break answers. Dual BR scores **winrate under perfect info + freeze model**; human folds to reclaim lead with 2s/multi later.  
2. **Residual structure first** — prefer answers that leave pairs / second multi (seq≥3); dual soft ties are length/pair-count stubs that did not flip residual under BRGM.  
3. **Min-beat over overkill** — same-class micro-selection (pair→pair, triple→triple, single_mid) dominates CF; `orderLegals`/cheap path returns first structure-ish legal, not BR among near-ties under tight combat budgets.  
4. **Short multi / trash free-lead** — not long dumps; BR multiTie short bias exists but residual pair multiTie is dual-flat.  
5. **Imitation ≠ dual strength** — gold series-3 / playlog-align collapsed dual to 0.50 historically (`NOTE-gold-layer-dual-map.md`). Use human patterns only as **structure priors on BR/exploit paths**, not expert rewrites.

**Bridge to residual mid-combat dual losses:** freeze seat never runs combat BR; live combat BR is **under-sampled (56 trials)** vs free-lead (96), **cheap-only cand set**, **no structure soft-tie**, allowPass only when no cheap. That is exactly where human fold/structure signal is invisible to dual today.

---

## 5. Ranked honest levers (flip residual mid-combat without bulk expertScore)

Prefer: **one-axis**, freeze-asymmetric path, seed-duel proof **before** N50, accept only vs **identity baseline**.

### #1 — Combat BR denser trials + structure soft-tie (not hollow density alone) ⭐

| | |
|--|--|
| **Mechanism** | 6/10 residual losses are mid combat. Freeze `bestResponse:false` → **never** combat BR. Raise combat trials toward free-lead density **and** among **equal/near rates** prefer cheap answers that leave residual pair ranks **or** residual seq run ≥3. Density alone (56→80 stamp) was dual-flat — **require flip proof**. |
| **Locus** | `bestResponseMove` combat cand (`else` / `cheapLegals`+`orderLegals`) ~`policies/v94-search.js` L1011–1016; score end L1057–1086 (**today free-lead-only multiTie**); caller trials L2923–2926 (`freeBR ? 96 : 56`); maxBranch L2938 (`freeBR ? 22 : 16`) |
| **Targets** | 20310576, 20539955, 20659631, 20669604, 20689550, 20709496 |
| **Expected dual Δ** | **+0–1** if structure-tie changes root on mid residual; density-only expected **0** (hollow history) |
| **Gold risk** | **Low** (BR-only; expert gold unchanged). Wall-clock up. |
| **Seed-duel test** | 1) Patch combat-only trials 56→96 **or** structure-tie alone. 2) `SEEDS=20310576,20539955,20659631,20669604,20689550,20709496` under dual BRGM env vs freeze **v94**. 3) Require ≥1 flip + win-seed smoke (first 8 primary wins) win_regs≤0. 4) N20 LOG_GAMES vs identity baseline before N50. |

### #2 — Combat soft-root structure / mild fold prior (live soft-exploit path)

| | |
|--|--|
| **Mechanism** | Combat soft root ranks cheap + pass via exploit leaf (`via: combat-soft-root-v85`). Today: pass bonus only when `cOmin≥5 && cHandLen≥9` (+0.02), else pass −0.04; **no residual structure soft-tie** on plays. Add mild: among soft (non-hard) scores, prefer (a) lower `structureBreakCost`, (b) residual pairRanks after answer, (c) optional +0.008 pass when mid multi/pair top and hand deep — **mirror CF humanPassAltPlay without expertPolicy pass rewrite**. |
| **Locus** | combat soft root ~`policies/v94-search.js` L2817–2912 (`cAllowPass`, `csoft` block L2878–2890). Requires `opts._softExploit` + `combatRoot !== false` + perfectInfo (live dual path). |
| **Targets** | same mid-combat six; also alignment with CF pass→pair class |
| **Expected dual Δ** | **+0–1** fragile; path only when soft-exploit→combat-root fires before/with BR |
| **Gold risk** | **Low–med** if pass prior too strong (IMG0501/0510 already pass; risk is over-pass vs short race). Keep pass prior gated `omin≥5`, `handLen≥9`, `curTop` mid, non-single. |
| **Seed-duel test** | Isolate soft-root structure-tie **without** changing expertPolicy. Dual BRGM seed-duel mid residual set; if combat-root rarely fires, log `via` stats first — if dead path, demote lever. |

### #3 — Exploit soft residual-multi **order** (not softN count)

| | |
|--|--|
| **Mechanism** | Freeze: exploit off / softSamples 0. Live STACK softN10. **softN14 count alone** = identical N15 W/L to EXACT_PLUS (still L 20310576/20380387). Change soft **ranking**: among near-rate free-lead soft cands, prefer residual multi-chain (seq≥3 left) / shorter multi — currently `bonusS` is mild length-only (`search.js` / v94 ~L1457–1459). |
| **Locus** | exploit soft re-rank ~v94 L1455–1460; softNRoot L2585–2587. Optional softN 10→14 **only after** order lands. |
| **Targets** | 20609766 class FL multi-choice; incomplete-exact free-lead residuals |
| **Expected dual Δ** | **+0–1** fragile under BRGM |
| **Gold risk** | **Low** (exploit soft path; expert gold unchanged). |
| **Seed-duel test** | Seed-duel `20609766` alone + N20; fingerprint must **differ** from softN14-only (which was L-identical). |

### #4 (secondary) — BR combat allowPass / structure-preserving fold among near rates

| | |
|--|--|
| **Mechanism** | BR `allowPass` today only when **no cheap** answers. Human often passes **despite** cheap mid answers. Allow pass into BR action set when `handLen≥9`, `omin≥6`, mid multi/pair top — score pass with trials (not expert hard pass). |
| **Locus** | `bestResponseMove` allowPass ~v94 L1018–1022 |
| **Targets** | mid residual where over-contest burns structure |
| **Expected dual Δ** | **+0–1**; higher reg risk than #1 |
| **Gold risk** | Med if BR pass overrides series-2 contest cases under GM — re-run full gold after any dual green |
| **Seed-duel test** | Mid residual six + win smoke; gold full suite mandatory before N50 |

### Side protocol (not ship policy)

| Lever | Note |
|-------|------|
| BR_OPP 40→60ms | Protocol-only; N20 measure; do **not** count as AI ship |
| Equal-budget dual report | live@200 vs freeze@200 same BR — diagnostic identity |
| Hint/GM info align | separate product issue (hidden vs perfect) |

---

## 6. Explicit REJECT list

| Lever | Why reject for honest restart |
|-------|-------------------------------|
| **softN count alone (14/16)** | N15 fingerprint ≡ EXACT_PLUS; no residual flips |
| **Hollow combat BR density (56→80) without flip proof** | Documented dual-flat same 10 L; density stamp ≠ intelligence |
| **Residual multiTie pairRanks re-weight** | Shipped v93; dual-flat identical residual set |
| **TWO_OMIN2 re-tune / stack** | Shipped v94; primary 10 L unchanged; freeze body |
| **Blanket multiTie 0.008 + dualSelf** | Dual **33/50** historical |
| **Ultra wall-clock alone (MS350/BR128)** | Budget-insensitive hard mines; expert-BR era ≤34/50 |
| **EXACT_PLUS floors alone** | N15 still L on 20310576/20380387 |
| **FL_EXACT_MULTI_FIRST bulk** | Residual flips possible but STACK reg history; weaker asymmetry than BR |
| **MULTI_REFUSE / SOFT_MULTI_REFUSE** | Dual **0.70 n20 (−2)**; 20380387 still L |
| **NO_GIFT_HARD omin≤3** | Dual **0.70 n20** |
| **AA_SAVE broad** | Dual **0.75 n20 (−1)**; 20470144 ungated |
| **Series-2 bulk doubleseq / multi-always force** | Dual **27/50** |
| **Broad P1–P5 / expertScore rewrite** | Dual **0.48 / 0.44**; gold locked |
| **ENSEMBLE_FL** | Dual **0.70 n20 (−2)** |
| **Bulk soft-pass reverse (`H_play_E_pass`)** | Dual over-active risk |
| **Broad overkill / COMBATV91 cheap-only** | Dual hurt |
| **Gold bulk expertScore for human FL length** | Imitation ≠ dual; series locked |
| **Hunting 20380387** | Structural unflippable; refuse for ship-gate math |
| **Shipping any rung that only re-stamps identity 40/50** | Hollow ladder |

---

## 7. Probe order (honest restart)

1. **Identity baseline:** live≡clean-v94 vs freeze v94 BRGM N20/50 — expect ~40/50, record residual set.  
2. **#1 combat BR structure-tie** alone (optional denser trials **only if** structure-tie needs sample resolution) — seed-duel mid-six → N20 vs identity.  
3. If flat: **#2 combat soft-root structure/fold** alone (confirm path fires via stats).  
4. If flat: **#3 soft residual-multi order** alone on 20609766 + N20.  
5. Last resort dual-asymmetric: **#4 BR combat allowPass** — gold suite full before N50.  
6. **Ship only** if dual **≥ identity +2** wins primary + re-run; residual flip ≥1 (not only 20380387); gold 0498–0521 green; one-axis at a time.

---

## 8. Seed-duel recipe (BRGM dual-aligned)

```bash
# Mid-combat residual pack (exclude structural 20380387)
SEEDS=20310576,20539955,20659631,20669604,20689550,20709496,20609766,20549928,20470144 \
TIENLEN_FREEZE=v94 TIENLEN_FREEZE_MS=120 TIENLEN_FREEZE_ITERS=80 TIENLEN_FREEZE_BR=0 \
TIENLEN_V8_MS=280 TIENLEN_V8_ITERS=200 TIENLEN_V8_SIMS=480 TIENLEN_BR_TRIALS=96 \
TIENLEN_BR=1 TIENLEN_EXACT=1 TIENLEN_SOFT_SAMPLES=10 \
# + BR_GM opp model wiring as in run-honest-dual / bench-ladder BRGM
node evolve/seed-duel.js   # or residual seed-duel harness used for BRGM
```

**Pass criterion for a lever:** ≥1 residual flip among targets, win_regs=0 on smoke wins, dual N20 ≥ identity +1 before investing N50.

---

## 9. Artifacts

| Item | Path |
|------|------|
| Dual suspicion | `evolve/NOTE-dual-protocol-suspicion.md` |
| Prior levers | `NOTE-v93/v94/v95-lever-hypotheses.md` |
| Identity dual | `evolve/v93-baseline-vs-v92-n50.json` |
| v94 primary | `evolve/v94-two-omin2-primary.json` |
| Human mines | `evolve/HUMAN-LOSS-MINES-v11.md` |
| Strategy inference | `evolve/playlog-strategy-inference.json` |
| CF summary | `evolve/counterfactual-79-latest-summary.json` |
| Gold suite | `test-search.js` L502–770 |
| Freeze search | `policies/v94-search.js` |
| Recon helper | `evolve/_recon-v93-losses.js` |
| TWO swarm | `evolve/NOTE-flip-swarm-two-omin2.md` |
| SoftN/exact probe | `evolve/NOTE-v93-probe-exact-soft.md` |

---

## 10. One-line summary

**Stop shipping hollow 0.1 rungs.** Residual mid-combat losses need **combat-BR structure (with proven flips)**, then combat soft-root residual/fold, then exploit soft **order** — never softN count, never density stamps, never 20380387, never bulk expertScore.
