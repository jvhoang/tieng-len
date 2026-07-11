# Human vs v7.0 counterfactual — play-logs #1–#72

**Method:** For every **human** play/pass in **completed** games, rebuild engine state from the deal + public history, then call shipped **frozen Grandmaster v7.0** `getAIMove` as the **human seat** with `perfectInfo: false`, `hiddenInfo: true` (determinized — **no peeking** at AI private cards). Compare to the logged human action.

- AI under test: `v7.0-frozen-baseline` / Grandmaster v7.0 (frozen)
- Issues: **#1–#72** (all numbers in range)
- Completed games with full counterfactual: **69**
- Abandoned only: **3** (issues #10–#12; no incomplete/rate-limit skips)
- **Total human actions processed: 549** (includes **104** from #61–#72)
- Match v7.0: **330** (60.1%)
- Differ from v7.0: **219** (39.9%)

Artifacts: `evolve/counterfactual-1-72-summary.json`, full rows in `{SCRATCH}/counterfactual-1-72.json`.

---

## 1. Outcomes (completed subset)

| Outcome | Count |
|---------|------:|
| human-win | 62 |
| ai-win | 7 |

Completed issue numbers: #1 #2 #3 #4 #5 #6 #7 #8 #9 #13 #14 #15 #16 #17 #18 #19 #20 #21 #22 #23 #24 #25 #26 #27 #28 #29 #30 #31 #32 #33 #34 #35 #36 #37 #38 #39 #40 #41 #42 #43 #44 #45 #46 #47 #48 #49 #50 #51 #52 #53 #54 #55 #56 #57 #58 #59 #60 #61 #62 #63 #64 #65 #66 #67 #68 #69 #70 #71 #72

---

## 2. Where human and v7.0 disagree

| Pattern | Count | Interpretation |
|---------|------:|----------------|
| Combat differs | 140 | Most divergence is mid-trick |
| Free-lead differs | 79 | Structure / multi vs single |
| Multi vs single structure | 53 | Human often longer combos |
| Human uses 2, AI would not | 28 | Human spends 2s for control |
| AI would use 2, human did not | 11 | Rare after Ace+2 fix |
| Human pass, AI would play | 24 | Human sandbags / soft folds |
| Human play, AI would pass | 0 | Almost never |

**Free-lead bias:** human multi/single ≈ **141/80**; v7 alt multi/single ≈ **168/53**.

---

## 3. Deep themes — why your moves differ

### 3a. Control with 2s

**28** human actions spent a **2** where hidden-info v7.0 preferred a non-2. You treat 2s as **tempo weapons** after high singles/pairs, then multi free-lead. v7 still conserves 2s when a cheaper legal beat exists — strong vs fixed experts, weaker vs humans who punish that.

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
- **#30** e12: human `2d` vs v7 `9h` (cur=single top=1, free=False)
- **#33** e8: human `2s` vs v7 `Kc` (cur=single top=8, free=False)

### 3b. Free-lead multi volume

**79** free-lead disagreements. You lead **longer sequences** / multi pressure; v7 often picks shorter low multi under determinization.

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
- **#13** free-lead: human `3c 4s 5s 6h 7d 8d 9d Ts` vs v7 `3c 4s 5s` (hand 13)
- **#13** free-lead: human `3d` vs v7 `Qc` (hand 5)

### 3c. Combat aggression

**24** times you **passed** when v7 would play. **0** times you played when v7 would pass.

### 3d. Ladder climbing

**140** combat differs often change **which** mid card answers: you climb higher to force 2s; v7 plays minimal legal.

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
| 71 | human-win | 2 | 3 | 60% |
| 4 | human-win | 3 | 4 | 57% |
| 30 | human-win | 3 | 4 | 57% |
| 59 | human-win | 3 | 4 | 57% |
| 17 | human-win | 4 | 5 | 56% |
| 33 | human-win | 4 | 5 | 56% |
| 61 | human-win | 4 | 5 | 56% |
| 46 | human-win | 6 | 7 | 54% |
| 2 | human-win | 3 | 3 | 50% |

---

## 5. #61–#72 inclusion (post rate-limit repair)

These 12 completed games were re-fetched after an API rate-limit stub and fully counterfactualized:

| Issue | Outcome | Human acts | Match | Differ |
|------:|---------|----------:|------:|-------:|
| 61 | human-win | 9 | 4 | 5 |
| 62 | human-win | 9 | 5 | 4 |
| 63 | human-win | 8 | 5 | 3 |
| 64 | human-win | 10 | 8 | 2 |
| 65 | human-win | 8 | 5 | 3 |
| 66 | human-win | 9 | 7 | 2 |
| 67 | human-win | 7 | 5 | 2 |
| 68 | human-win | 10 | 6 | 4 |
| 69 | ai-win | 9 | 6 | 3 |
| 70 | human-win | 8 | 5 | 3 |
| 71 | human-win | 5 | 2 | 3 |
| 72 | human-win | 12 | 8 | 4 |

---

## 6. Lessons for v7.5

1. Free-lead: prefer longer low multi when available (human volume).
2. Combat 2s: keep Ace+2 preference; slightly more 2s when holding multi after reclaim.
3. Exploit BR vs frozen v7.0 expert remains formal gate.

---

## 7. Coverage

- Every human action in **69 completed** games is in the JSON (`results[].humanActions[]`).

- Total rows: **549**.

- Only abandoned #10–#12 excluded; **no rate-limit / incomplete mislabels**.
