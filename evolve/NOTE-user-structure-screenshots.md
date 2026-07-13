# User screenshots — structure preservation

## Series 1: IMG_0498–0504 (2026-07-12)

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

## Series 2: IMG_0505–0513 (2026-07-13)

| Shot | Situation | AI was | Correct |
|------|-----------|--------|---------|
| 0505 | Beat 4; hand 345 + loose 8s | 4♥ (breaks 345) | **8♣** (any 8) |
| 0506 | Free lead; 345 + 667788 | 6-card straight | **6-6-7-7-8-8** doubleseq |
| 0507 | First lead; 334455 | pair of 3s | **3-3-4-4-5-5** doubleseq |
| 0510 | Beat seq 456; QQ KK + mid pairs | Q-K-A | **PASS** (save pair-backs) |
| 0511 | Beat AA; hold 22 + weak singles | 2-2 | **PASS** (save 22 for singles) |
| 0512 | Beat 5; 66 + loose 10 | 6♦ (breaks pair) | **10♥** |
| 0513 | Beat K; KK + 2s | K♥ (breaks pair) | **2** (take control) |

## Root causes
1. “Cheapest legal beat” ranked by top rank, ignoring pair/run destruction.
2. `exactEndgame` free-lead dumped multi vs short opp (override 2).
3. Guards re-forced cheap play after intentional structure **PASS**.
4. Seq residual not considered among equal-length multi answers.
5. **Exploit free-lead skipped `enforcePolicyGuards`**, so BR/search preferred plain seq over doubleseq (0506/0507).
6. Doubleseq is bomb-classed (≥3 pairs) and filtered from “cheap multi” free leads.
7. Structure-pass on mid **seq** was too broad and regressed 0503 (residual 9-10-J-Q) — only pass when answer burns Q/K/A pair-backs.

## Fixes (`search.js` + `ai.js`)
- Heavy `structureBreakCost` for pair/≥3-run breaks (not mere 2-card links).
- `residualQuality` + seq-vs-seq residual-first pick (0503).
- `orderLegals`: structure → minimal safe single → residual multi.
- Structure-pass mid pair/trip with 2s (0501); seq pass only if high pair-backs smashed (0510 vs 0503).
- Free-lead 2 vs opp ≤2 cards (0499); post-exact re-assert.
- Combat guards always structure-safe; no cheap re-force after pass.
- Prefer 2 when only high-structure cheap singles remain (0500/0513).
- `pickFreeLeadHard`: prefer doubleseq (include bomb-classed dseqAll); first-lead with 3♠.
- `enforcePolicyGuards` + `forceMultiFreeLead`: always force doubleseq free lead.
- **getAIMove**: always run free-lead guards even in exploit/BR modes (0506/0507).
- Ace-guard limited to single Ace (not AA — 0511).
- Save 22 vs high multi when only 2-answers (0511).

## Tests
`test-search.js` IMG0498–0504 + IMG0505–0513 (expert + grandmaster paths); `test-ai.js` all pass.

## Ship
Grandmaster **v9.2** stamped `2026-07-13T06:13:02Z` (series-2 structure-safe).
