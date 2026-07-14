# Fair dual — top 5 human-vs-AI patterns for skill gains (v9.1 freeze)

**Date:** 2026-07-13  
**Protocol (locked):** fair dual = both seats **GM · hidden · BR-on · equal budget**.  
**Constraint:** levers must be **real policy skill in challenger `search.js` / freeze body** — not budget, not BR-on/off asymmetry, not perfect-info theater, not softN count alone.  
**Freeze baseline:** v9.1 (`policies/v91-*` / ladder restart). Live≡freeze under fair dual → expect **~0.50** WR.

### Sources
| Artifact | What it measures |
|----------|------------------|
| `/Users/johnhoang/Downloads/tienlen-playlogs-1783931122937.json` | 158 human vsAI games (incl. v9.2 GM) |
| `evolve/playlog-strategy-inference.json` | Expert pure v9.1 vs human: **1218** decisions, exact **64.8%**, residual hBetter **186** / eBetter **48** |
| `evolve/HUMAN-LOSS-MINES-v11.md` + `counterfactual-79-latest-summary.json` | CF-all hidden `getAIMove`: **787** human acts, match **61.4%**, differ **304** |
| Live code | `/Users/johnhoang/Developer/Grok/tieng-len/search.js` expert/BR/soft roots |

### Inference diverge mass (pure expert vs human)
| Class | N | Fair-dual note |
|-------|--:|----------------|
| `H_play_E_pass` | 76 | **Do not bulk reverse** — v91 soft-pass ladder-tuned; dual over-active risk |
| `H_overkill_E_minimal` | 59 | Min-beat / structure micro skill |
| `H_2_E_non2` | 53 | 2-tempo one-axis only |
| `E_longer_multi_H_shorter` | 47 | Short multi / invert length bias |
| `H_minimal_beat_E_overkill` | 42 | Opposite of overkill; tie-break, not bulk climb |
| `H_single_E_multi` | 38 | Free-lead trash/short vs multi-always |
| `H_pass_E_play` | 30 | Gated fold only (CF humanPassAltPlay 33; humanPlayAltPass **0**) |
| `H_trash_first_E_high_multi` | 13 | Hybrid free-lead residual |
| residualScore | hBetter **186** / eBetter **48** | Dominant human edge = **structure residual** |

### CF differ mass (hidden GM in human seat)
`combatDiffer=188` · `freeLeadDiffer=116` · `classDisagree=202` · `multiVsSingle=71` · `humanPassAltPlay=33` · `humanTwoAltNot=33` · `humanPlayAltPass=0`

---

## Ranking rule (fair dual)

Score each pattern on:
1. **Mass** in CF + inference (how often human diverges with residual advantage).  
2. **Mechanism** that can change root ranking when **both** seats already run BR + expert rollouts.  
3. **Dual safety** — documented cliffs reject bulk imitation (series-2 multi-always, blanket multiTie 0.008, bulk soft-pass reverse, bulk `expertScore`).

Hollow under fair dual (reject as “skill”): MS280 vs MS120, live BR-on / freeze BR-off, BR_GM_MODEL alone, combat trial density alone, softN14/16 alone, perfect-info duals.

---

## Top 5 patterns (ranked for fair dual skill Δ)

### #1 — Combat residual structure (human better residual after answer)

**Evidence**
- residualScore: human better **186** vs expert **48** (largest quantitative human edge).  
- CF combatDiffer **188** (61.8% of differs); same-class combat noise `triple→triple` 28 + `pair→pair` 23 + `single_mid→single_mid` 24 ≈ **75**.  
- Inference: overkill/min-beat split (`H_overkill_E_minimal` 59, `H_minimal_beat_E_overkill` 42) sits on the same structure axis.

**Why this is fair dual skill (not harness)**  
Both seats already run combat BR + expert rollouts. Changing **near-rate ranking** among legal answers (prefer residual pairs / seq≥3 / lower `structureBreakCost`) improves decision quality for **whoever** has the seat. No budget stamp required.

**Mechanism gap today**
- `bestResponseMove` soft tie (`multiTie`) is **free-lead only** — combat actions score pure `rate` with no residual/structure pass/answer prior (`search.js` ~1045–1049).  
- Combat path truncates to cheap + `orderLegals` (`~997–1000`); pass only when **no** cheap (`allowPass` ~1003–1007).  
- Combat soft root (perfect-info ladder; weaker under pure hidden CF) has mild pass prior but weak residual structure soft (`~2842–2853`).

**Loci (challenger / freeze body)**

| Path | Function | Lines (approx) | Edit class |
|------|----------|----------------|------------|
| **Primary** | `bestResponseMove` combat score loop | `search.js` **949–1055**, esp. **1042–1054** | After `rate`, add **combat residual soft-tie** when `|rateA−rateB|` small: +ε if residual `pairCount`/seq≥3 improves; optional mild **gated** `passTie` if `act==null && handLen≥9 && omin≥5 && mid multi/pair` |
| Structure metric | `structureBreakCost`, `analyzeHand` | **139–178**, **186–224** | Reuse; do not bulk-reweight `expertScore` |
| Soft root (optional stack later) | combat soft root | **2780–2877**, pass prior **2846–2847** | Structure-aware fold prior; only if BR tie lands first |
| Ordering support | `orderLegals` / exact equal-value keep | **343–347**, **1890–1905** | Secondary: keep structure-first among equal exact values (already partial) |

**Probe shape:** one axis = combat BR residual soft-tie (± gated pass). Seed-duel mid-combat residuals; dual N20 fair vs freeze v91.  
**Reject siblings:** combat BR trials 56→96 alone; bulk `expertPolicy` pass rewrite; bulk combat `expertScore` rewrite.

---

### #2 — Free-lead short multi / trash vs long multi dump

**Evidence**
- CF: freeLeadDiffer **116**; multiVsSingle **71**; class pairs `single_trash→pair` 20, `bomb_or_long→triple` 12, `pair→bomb_or_long` 7.  
- Inference: `E_longer_multi_H_shorter` **47**, `H_single_E_multi` **38**, `H_trash_first_E_high_multi` **13**, `H_longer_multi` **15**.

**Why fair dual skill**  
Free-lead choice is pure policy under equal soft/BR. Humans prefer **pair/triple volume** and early trash when multi is not locking; expert multi-always + length-prefer still over-sheds long multi early.

**Mechanism gap today**
- `pickFreeLeadHard`: multi-always core; pool sorts **longer first** when tops close (`~619–627`); hybrid trash only under `_exploitFlMode === 'hybrid'` (`~631–640`).  
- BR free-lead: `mergedBR` sorts by **length desc** (`~991–994`); `multiTie` already short-biased (`0.005 * min(10, max(0,8−len)+2)` ~1047) but candidate order still length-first.  
- Exploit `multiBonus` short-biased (~1257–1261); free-lead soft root has hybridB demoting long multi (~2727–2742) — **hidden fair dual still heavily uses BR + expert free-lead**, not only perfect soft root.

**Loci**

| Path | Function | Lines (approx) | Edit class |
|------|----------|----------------|------------|
| **Prefer first probe** | `bestResponseMove` free-lead `multiTie` + cand order | **971–995**, **1045–1048** | Residual-gated multiTie (pair-ranks left ≥1/2) **or** sort free-lead BR cands short-first among non-lock; **one sub-locus only** |
| Expert free-lead | `pickFreeLeadHard` | **540–641** esp. **619–641** | Prefer shortMulti pool (len 2–3) before long; gated hybrid trash when control + multi top>6 / len≥4 |
| Candidates | `freeLeadCandidates` | **496–529** | Ensure trash + short multi enter root set |
| Soft / exploit | free-lead soft hybridB; `exploitMove` multiBonus | **2714–2747**, **1257–1261** | Polish only after BR/expert axis; do not force multi-always |

**Reject:** series-2 doubleseq / multi-always force (dual cliffs); blanket multiTie 0.008 + dualSelf (**33/50**); bulk gold FL expertScore rewrite.

---

### #3 — Same-class combat min-beat micro (pair/triple/mid single selection)

**Evidence**
- CF same-class: triple→triple **28**, pair→pair **23**, single_mid→single_mid **24** (~**75** differs without class change).  
- Inference: `H_overkill_E_minimal` **59** vs `H_minimal_beat_E_overkill` **42** — humans more often minimal; expert overshoots tops / breaks structure.

**Why fair dual skill**  
Among equal BR rates, **lower top + lower structureBreakCost** is pure ordering skill. Survives equal BR budgets: changes cand order and soft ties without extra trials.

**Mechanism gap today**
- Combat `expertScore`: `topRank * 0.85` + light gap (`gap>2` * 0.8) + structure * 2.2 base (`~303–329`); v9.1 adds break penalty on singles but multi answers still often **tie**.  
- `orderLegals` is **score-only** — no stable secondary key (top, length, sbc) (`~343–347`).  
- Cheap path returns `orderLegals(cheap)[0]` in expert and BR.

**Loci**

| Path | Function | Lines (approx) | Edit class |
|------|----------|----------------|------------|
| Ordering | `orderLegals` | **343–347** | Tie-break: lower `expertScore`, then lower `topRank`, then lower `structureBreakCost`, then shorter length |
| Combat score | `expertScore` combat branch | **302–332** | **Soft only if needed:** among pair/triple answers, +small for lower top; **no bulk weight rewrite** |
| BR combat | `bestResponseMove` after rate | **1042–1054** | Near-rate: prefer lower top / lower sbc (stacks with #1 residual) |
| Exact | `exactExploit*` equal-value keep | **1890–1905** | Already structure-first order; keep |

**Risk:** low if **tie-break only**; high if bulk combat `expertScore` (historical dual 0.48/0.44).

---

### #4 — Mid-combat pass / fold discipline (`H_pass_E_play` only)

**Evidence**
- CF: `humanPassAltPlay` **33**, `pass→pair` **22**, `pass→triple` **7**, `humanPlayAltPass` **0** (AI never folds when human plays).  
- Inference: `H_pass_E_play` **30** (useful); **`H_play_E_pass` 76 must not drive bulk reverse**.

**Why fair dual skill (narrow)**  
Structure-preserving folds on deep mid multi leave reclaim windows — strength, not just imitation. Under fair dual both seats get same pass prior; the **gate quality** is the skill, not “who gets BR.”

**Mechanism gap today**
- `expertPolicy` pass bands are tight / late: deep multi fold only `handLen≥11 && omin≥7 && curTop<8` (`~407–417`); soft-pass residual `handLen≥9–10 && omin≥7` (`~486–487`). Cheap path **never** passes (`~419–420`).  
- BR combat: pass only if no cheap (`~1003–1007`) — no structure fold among cheap answers.  
- Combat soft: `cAllowPass` when long hand (`~2803–2808`); pass soft `+0.02` only if `cOmin≥5 && cHandLen≥9` (`~2846–2847`).

**Loci**

| Path | Function | Lines (approx) | Edit class |
|------|----------|----------------|------------|
| **Prefer with #1** | `bestResponseMove` `passTie` / allowPass | **1003–1007**, **1042–1049** | Mild pass prior when rates near-equal **and** deep + mid multi + residual structure improves; optionally allow pass among cheap only when sbc of all cheap ≥ threshold |
| Expert (careful) | `expertPolicy` soft-pass | **407–417**, **481–492** | **Do not** widen bulk; if any change, one tight gate only after BR path proven |
| Soft root | `cAllowPass` + pass soft | **2802–2808**, **2846–2847** | Align with BR gate; perfect-info only on some paths |

**Reject:** reverse of `H_play_E_pass` (76) bulk contest; `shouldPassStrategically` cheap-force rewrite early (`ai.js`).

---

### #5 — 2-tempo reclaim (`H_2_E_non2` / humanTwoAltNot)

**Evidence**
- Inference: `H_2_E_non2` **53** (large); CF `humanTwoAltNot` **33** vs `altTwoHumanNot` **13**; class `single_two→single_mid` 17, `single_two→single_high` 7.

**Why fair dual skill (secondary)**  
Contesting K/high mid with 2 when trash remains reclaims free-lead — real endgame tempo. Documented seed-duel flips (`20549928`, flaky `20290630`); dual often **flat** after harness eras, so rank **after** structure/FL levers under fair dual.

**Mechanism gap today**
- Ace+2 hard path (`curTop≥11`) exists (`~379–388`).  
- Mid 2-tempo only `curTop∈[8,10] && omin≤3 && handLen∈[4,9]` (`~391–405`).  
- K-only high path when non2 only high (`~435–448`).  
- Humans burn 2 earlier on reclaim windows; AI under-burns mid climb with trash still held.

**Loci**

| Path | Function | Lines (approx) | Edit class |
|------|----------|----------------|------------|
| Expert 2-tempo | `expertPolicy` probe-TWO block | **391–405** | **One axis only** (e.g. TWO_OMIN2: omin≤2, curTop 7–10) — do not stack with pass widen |
| Guards | `enforcePolicyGuards` / Ace force | `ai.js` combat 2 path | Mirror expert only after dual-safe expert gate |
| Score penalty | `expertScore` usesTwo pen | **306–314** | Soften only when trash≥1 && curTop≥9 && omin mid — high reg risk; prefer hard gate first |

**Reject:** burn 2 on `curTop<8`; broad AA_SAVE; stacking with #4 pass in same probe.

---

## Rank summary (execute order under fair dual)

| Rank | Pattern | Mass | Fair dual skill axis | Primary locus |
|-----:|---------|-----:|----------------------|---------------|
| **1** | Combat residual structure | residual 186:48; combatDiffer 188 | BR near-rate residual soft-tie | `bestResponseMove` combat score ~1042–1054 |
| **2** | FL short multi / trash vs long | freeLead 116; E_longer 47; multiVsSingle 71 | multiTie / short pool / hybrid | BR multiTie ~1045–48 · `pickFreeLeadHard` ~619–641 |
| **3** | Same-class min-beat micro | ~75 CF same-class; overkill 59 | orderLegals secondary key | `orderLegals` ~343–347 (+ BR near-rate) |
| **4** | Gated mid-combat fold | pass→* 29; humanPassAltPlay 33 | passTie / allowPass quality | BR allowPass + passTie ~1003–49 |
| **5** | 2-tempo reclaim | H_2_E_non2 53; humanTwo 33 | one-axis expert 2 gate | `expertPolicy` ~391–405 |

**Deferred / low fair-dual EV:** exact multi-first (budget/order fragile under equal soft); BR combat density alone; softN count; free-lead soft-root-only patches (asymmetric perfect-info).

---

## Explicit non-levers (from human mass)

| Pattern mass | Why not top skill lever under fair dual |
|--------------|----------------------------------------|
| `H_play_E_pass` (76) | Bulk reverse → dual over-active; v91 soft-pass already ladder-tuned |
| Blanket multi length + dualSelf | Historical **33/50** |
| Series-2 multi-always / doubleseq force | Dual **27/50** cliffs |
| Bulk `expertScore` for human FL | Imitation ≠ dual strength |
| Seed **20380387** multi-climb trap | Structural unflippable — not ship math |

---

## Probe protocol (fair dual only)

```
1. Identity N20: live≡freeze v91 · GM · hidden · BR both · equal budget
   Expect ~0.50. Record liveWins + lossSeeds.

2. ONE axis from #1 (combat residual BR soft-tie). Seed-duel mid-combat pack.
   Pass: ≥1 flip, win-smoke regs ≤0, LOG_GAMES root via/play changes.

3. Lever N20 fair vs freeze v91 — interest only if liveWins ≥ identity + 1.

4. Ship N50×2 only if WR > 0.70 AND liveWins ≥ identity + 2 (same seed0)
   AND gold series 1–3 not regressed. One lever at a time; stack only after each clears.
```

---

## Code map (quick anchors)

```
structureBreakCost     search.js ~139–178
analyzeHand            search.js ~186–224
expertScore            search.js ~240–341   (free ~260–298, combat ~302–332)
orderLegals            search.js ~343–347
expertPolicy           search.js ~353–493   (2-tempo ~391–405, pass ~407–417/486–487)
freeLeadCandidates     search.js ~496–529
pickFreeLeadHard       search.js ~540–669   (multi-always ~585–641)
bestResponseMove       search.js ~949–1068  (FL merge ~971–995, combat cheap ~997–1007, multiTie ~1045–1049)
exploitMove multiBonus search.js ~1257–1261
exact equal-value keep search.js ~1890–1905
free-lead soft root    search.js ~2680–2777 (structGain/hybridB ~2714–2747)
combat soft root       search.js ~2780–2877 (cAllowPass ~2803–2808, pass soft ~2846–2847)
```

**Related notes:** `NOTE-fair-v91-next-rung.md`, `NOTE-hidden-ladder-human-levers.md`, `HUMAN-LOSS-MINES-v11.md`, `NOTE-next-plus1-levers.md` (reject list still applies under fair dual).

---

*Imitation match rate is not win rate. Fair dual ship = policy skill that beats fair identity, not harness re-sale.*
