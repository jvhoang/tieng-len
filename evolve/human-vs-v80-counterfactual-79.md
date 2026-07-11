# Human vs live AI counterfactual — 79 completed 2p play-logs

**Method:** Rebuild engine state from each game’s deal + ordered events. For every **human** play/pass, call **live** `getAIMove` as the **human seat** with `perfectInfo: false`, `hiddenInfo: true` (determinized — **no peek** at opponent hole cards). Compare to the logged human action.

- AI under test: **Grandmaster v7.5** (live at CF time; id `v7.5-human-counterfactual`)
- Issues: **79 completed 2p** with deal hands (abandoned #10–12, #73–74 and 4p #80 excluded)
- Completed games: **79**
- Total human actions: **633**
- Match rate: **61.0%** (386 match / 247 differ)

Artifacts:

- `evolve/counterfactual-79-latest-summary.json`
- `{SCRATCH}/counterfactual-79-latest.json`
- `{SCRATCH}/human-action-features.jsonl`
- `{SCRATCH}/cf-79-run.log`
- `{SCRATCH}/playlog-index.json`

Completed issue numbers:  
`1–9, 13–72, 75–79, 81–85`

---

## 1. Outcomes (completed 2p)

| Outcome | Count (from titles) |
|---------|--------------------:|
| human-win | ~72 |
| ai-win | ~8 |
| abandoned (excluded) | 5 |
| 4p (excluded) | 1 |

---

## 2. Where human and latest AI disagree

| Pattern | Count | Interpretation |
|---------|------:|----------------|
| Combat differs | 159 | Most divergence is mid-trick answers |
| Free-lead differs | 88 | Multi volume / trash vs structure |
| Multi vs single structure | 60 | Human often longer combos |
| Human uses 2, AI would not | 29 | 2-tempo for control |
| AI would use 2, human did not | 12 | Conservatism residual |
| Human pass, AI would play | 29 | Sandbag / soft fold |
| Human play, AI would pass | **0** | Humans almost never over-play vs pass |
| Class-level disagree | 167 | Same class still different cards |

### Top class confusions (human→AI)

| Pair | n |
|------|--:|
| triple→triple (different cards) | 27 |
| pass→pair | 20 |
| single_mid→single_mid | 18 |
| pair→pair | 18 |
| single_trash→pair | 18 |
| bomb_or_long→triple | 16 |
| single_two→single_mid | 15 |

---

## 3. Deep themes — why moves differ

### 3a. Control with 2s (tempo)

**29** human actions spent a **2** where hidden-info AI preferred a non-2. Humans treat 2s as **tempo weapons** when opponents are short or after mid singles, then free-lead multi. AI still conserves 2s when a cheaper legal exists — strong vs fixed experts, weaker vs humans who punish that.

### 3b. Free-lead multi volume / long sequences

**88** free-lead disagreements. Humans lead **longer sequences / bombs** more often; AI’s hard free-lead preferred shorter low multi (e.g. triple over 5–8 card seq when both legal). Class pair `bomb_or_long→triple` (16) is the signature.

### 3c. Combat aggression / sandbag

**29** times human **passed** when AI would play. **0** times human played when AI would pass. Humans sandbag large hands against non-critical piles; AI’s pass discipline is near-zero on cheap beats.

### 3d. Ladder climbing

Combat differs often change **which** mid card answers: humans climb higher to force 2s; AI plays minimal legal.

---

## 4. Human next-move predictor

Features (public): freeLead, handSize, oppMin, twos, aces, pairs, control, legal counts, curTop.  
Labels: action **class** (`pass`, `single_trash`, `single_mid`, `single_high`, `single_two`, `pair`, `triple`, `bomb_or_long`).

Hold-out: last **20% of games by issue id** (16 test games, 135 actions).

| Model | Test accuracy |
|-------|-------------:|
| Majority class baseline (`pair`) | **23.0%** |
| Rule heuristic (CF themes) | **43.7%** |
| Multiclass logistic (SGD, 40 epochs) | **51.1%** (train 63.9%) |
| AI alt class as predictor | **77.8%** (class match; exact-sig CF match is 61%) |

Artifacts: `{SCRATCH}/human-predict-eval.log`, `human-predict-eval.json`.

**Takeaway:** Public features alone predict human **class** ~½ the time (>> majority). Exact card identity is harder; AI policy class already aligns with humans more often than pure heuristics, but **exact** play still differs on 2-tempo and free-lead length — the upgrade levers for v8.0.

---

## 5. Policy upgrades for Grandmaster v8.0

Derived from CF + predictor:

1. **Long multi free-lead** — among non-expensive multi, prefer longer seq/bomb when top within +2 of short multi.
2. **2-tempo vs short opp** — when facing single rank 6–10, opp ≤3 cards, hold 2, and hand still has structure → play 2 before cheap mid.
3. **Stronger exploit multi length bonus** in perfect-info BR playouts vs frozen experts.
4. **Wider exact-exploit window** (`totalCards ≤ 20`).
5. Bench opponent = **frozen v7.5** expert via `setExploitOpponent`.

Gate: continuous 2p single-deal **N≥200**, v8 win rate **>80%** vs frozen v7.5.
