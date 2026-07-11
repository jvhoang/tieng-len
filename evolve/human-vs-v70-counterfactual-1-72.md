# Human vs v7.0 counterfactual — play-logs #1–#72

**Method:** For every **human** play/pass in **completed** games, rebuild engine state from the deal + public history, then call shipped **frozen Grandmaster v7.0** `getAIMove` as the **human seat** with `perfectInfo: false`, `hiddenInfo: true` (determinized — **no peeking** at AI private cards). Compare to the logged human action.

- AI under test: `v7.0-frozen-baseline` / Grandmaster v7.0 (frozen)
- Issues: #1–#72
- Completed games with full counterfactual: **57**
- Abandoned / incomplete / skipped: **15** (3 abandoned + 12 incomplete/no-deal)
- **Total human actions processed: 445**
- Match v7.0: **264** (59.3%)
- Differ from v7.0: **181** (40.7%)

Artifacts: `evolve/counterfactual-1-72-summary.json`, full rows in `{SCRATCH}/counterfactual-1-72.json`.

---

## 1. Outcomes (completed subset)

| Outcome | Count |
|---------|------:|
| human-win | 51 |
| ai-win | 6 |

---

## 2. Where human and v7.0 disagree

| Pattern | Count | Interpretation |
|---------|------:|----------------|
| Combat differs | 114 | Most divergence is mid-trick |
| Free-lead differs | 67 | Structure / multi vs single |
| Multi vs single structure | 44 | Human often longer combos |
| Human uses 2, AI would not | 24 | Human spends 2s for control |
| AI would use 2, human did not | 8 | Rare after Ace+2 fix |
| Human pass, AI would play | 21 | Human sandbags / soft folds |
| Human play, AI would pass | 0 | Almost never |

**Free-lead bias:** human multi/single ≈ **116/64**; v7 alt multi/single ≈ **141/39**.

---

## 3. Deep themes — why your moves differ

### 3a. Control with 2s

**24** human actions spent a **2** where hidden-info v7.0 preferred a non-2. You treat 2s as **tempo weapons** after high singles/pairs, then multi free-lead. v7 still conserves 2s when a cheaper legal beat exists — strong vs fixed experts, weaker vs humans who punish that.

- **#4** e8: human `2s` vs v7 `Qs` (cur=single top=8, free=False)
- **#4** e10: human `2d` vs v7 `5c 5d 5h` (cur=None top=None, free=True)
- **#5** e15: human `2d` vs v7 `Qs` (cur=single top=0, free=False)
- **#6** e5: human `2c` vs v7 `8h` (cur=single top=5, free=False)
- **#7** e9: human `2c` vs v7 `9h` (cur=single top=3, free=False)
- **#8** e13: human `2h` vs v7 `9h` (cur=single top=6, free=False)
- **#9** e6: human `2s` vs v7 `8s` (cur=single top=4, free=False)
- **#18** e11: human `2s` vs v7 `Jd` (cur=single top=7, free=False)
- **#21** e6: human `2s` vs v7 `7d` (cur=single top=1, free=False)
- **#24** e14: human `2s 2h` vs v7 `8d 9s Th` (cur=None top=None, free=True)

### 3b. Free-lead multi volume

**67** free-lead disagreements. You lead **longer sequences** / multi pressure; v7 often picks shorter low multi under determinization.

- **#2** free-lead: human `4d` vs v7 `8c 8d 8h` (hand 10)
- **#2** free-lead: human `6d 7h 8c 9h Tc` vs v7 `8c 8d 8h` (hand 7)
- **#3** free-lead: human `8d 9c Ts Jh Qc` vs v7 `8d 9c Ts` (hand 7)
- **#4** free-lead: human `2d` vs v7 `5c 5d 5h` (hand 9)
- **#4** free-lead: human `5s 5c 5d 5h` vs v7 `5c 5d 5h` (hand 8)
- **#5** free-lead: human `3d 4c 5s 6c` vs v7 `3d 4c 5s` (hand 13)
- **#5** free-lead: human `4h` vs v7 `9s 9d` (hand 7)
- **#6** free-lead: human `6h 7c 8h 9c Tc` vs v7 `6h 7c 8h` (hand 10)
- **#7** free-lead: human `4s` vs v7 `9h Tc Jc Qh` (hand 7)
- **#9** free-lead: human `8s 9s Tc Jc Qc` vs v7 `9s 9d 9h` (hand 10)

### 3c. Combat aggression

**21** times you **passed** when v7 would play. **0** times you played when v7 would pass. You are aggressive on legal beats and selective on passes.

### 3d. Ladder climbing

**114** combat differs often change **which** mid card answers: you climb higher to force 2s; v7 plays minimal legal.

---

## 4. Highest disagreement games

| Issue | Outcome | Match | Differ | Differ% |
|------:|---------|------:|-------:|--------:|
| 35 | human-win | 1 | 5 | 83% |
| 53 | human-win | 2 | 5 | 71% |
| 19 | human-win | 3 | 6 | 67% |
| 27 | human-win | 4 | 7 | 64% |
| 24 | human-win | 3 | 5 | 62% |
| 55 | ai-win | 3 | 5 | 62% |
| 23 | human-win | 4 | 6 | 60% |
| 28 | ai-win | 2 | 3 | 60% |
| 38 | human-win | 2 | 3 | 60% |
| 4 | human-win | 3 | 4 | 57% |
| 30 | human-win | 3 | 4 | 57% |
| 59 | human-win | 3 | 4 | 57% |
| 17 | human-win | 4 | 5 | 56% |
| 33 | human-win | 4 | 5 | 56% |
| 46 | human-win | 6 | 7 | 54% |

---

## 5. Lessons for v7.5

1. Free-lead: prefer longer low multi when available (human volume).
2. Combat 2s: keep Ace+2 preference; slightly more 2s when holding multi after reclaim.
3. Exploit BR vs frozen v7.0 expert remains formal gate.

---

## 6. Coverage

- Every human action in **57 completed** games is in the JSON (`results[].humanActions[]`).

- Total rows: **445**.

- Incomplete/abandoned excluded with counts above.
