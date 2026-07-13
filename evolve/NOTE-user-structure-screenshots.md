# User screenshots IMG_0498–0504 — structure preservation (2026-07-12)

Gold-standard hint failures (hard-refresh to **Grandmaster v9.2** after ship).

| Shot | Situation | AI was | Correct |
|------|-----------|--------|---------|
| 0498 | Beat 4♦; hand has 6-pair + A | 6♠ (breaks pair) | **A♦** |
| 0499 | Free lead; opp 2 cards; 66 + 2 | pair of 6s | **2♥** (sure) |
| 0500 | Beat Q; hand J-Q-K + 2 | Q♥ (breaks JQK) | **2♣** |
| 0501 | Beat pair 10s; JQKA + two 2s | QQ | **PASS** |
| 0502 | Beat 5; long run + K | 6♦ (breaks run) | **K♣** |
| 0503 | Beat seq 3456; dual seq answers | 7-8-9-10 (leaves trash 9) | **9-10-J-Q** (leaves 789) |
| 0504 | Beat 7; 789 + J | 8♣ (breaks 789) | **J♦** |

## Root causes
1. “Cheapest legal beat” ranked by top rank, ignoring pair/run destruction.
2. `exactEndgame` free-lead dumped multi vs short opp (override 2).
3. Guards re-forced cheap play after intentional structure **PASS**.
4. Seq residual not considered among equal-length multi answers.

## Fixes (`search.js` + `ai.js`)
- Heavy `structureBreakCost` for pair/≥3-run breaks (not mere 2-card links).
- `residualQuality` + seq-vs-seq residual-first pick (0503).
- `orderLegals`: structure → minimal safe single → residual multi.
- Structure-pass mid pair/trip with 2s (0501).
- Free-lead 2 vs opp ≤2 cards (0499); post-exact re-assert.
- Combat guards always structure-safe; no cheap re-force after pass.
- Prefer 2 when only high-structure cheap singles remain (0500).

## Tests
`test-search.js` IMG0498–0504 + existing structure tests; `test-ai.js` all pass.
