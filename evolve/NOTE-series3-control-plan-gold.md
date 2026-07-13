# Series 3 gold — control plan (IMG_0514, 0516–0521)

Human GM principles (core policy, not hint-only):

| Shot | AI was | Correct | Principle |
|------|--------|---------|-----------|
| **0514** | free-lead 9-10-J | **5♦ trash first** | Shed loose trash before mid multi that needs A/2 backup |
| **0516** | A♣ (breaks AA) | **2♠** then AA then 9-10-J | 2 takes control; don't break AA for K |
| **0517** | 9-10-J-Q-K | **10-J-Q-K** then 99, 22, 7 | Residual keeps 99; with 22 lead high control multi first |
| **0518** | free-lead 7 trash | **22** then 7 | Short hand: sure control (22) before last trash |
| **0519** | 9-10-J (breaks 99) | **10-J-Q** | Same-len seq residual — save mid pairs |
| **0520** | 6 (leaves 789+loose7) | **7** | Maximize residual maxRun (6789 intact) |
| **0521** | 77 vs omin=1 | **6-7-8-9** | Vs 1 card, long multi unanswerable; keep 2 for later |

## Implementation (`search.js` / `ai.js`)

- Free-lead multi: residual-first; with **pair of 2s** prefer high control seq (top≥9), longer when residual close.
- Trash-before-high-multi when **twos < 2** (0514), not when 22 backs multi (0517).
- Short hand ≤4 + 22 → lead 22 (0518).
- omin=1: longest residual multi over 2/pair (0521); omin=2 short hand still prefers 2 (0499).
- Combat singles: residual maxRun → residual quality → minimal top (0520 vs 0498).
- Combat same-len seq: residual first (0519).
- GM free-lead always re-applies `forceMultiFreeLead` after search/BR.

## Playlogs

GitHub public issues still max **#103 (2026-07-12)**. Screenshot games (~2026-07-13 02:31–02:41 local) not present yet as of re-fetch. When #104+ appear, re-run CF mine vs human actions.

## Tests

`test-search.js` IMG0514–0521 + prior 0498–0513; all green.
