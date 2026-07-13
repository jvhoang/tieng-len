# User observation: low single breaks multi vs loose single

**Date:** 2026-07-12  
**Source:** live play / AI hints (user report)

## Symptom
AI (hints / `getAIMove`) prefers a **low single that breaks a multi-combo** (pair or sequence) over playing the next **loose / non-structure single**.

## Repro (minimal)
Hand: `3, 5-5, 10, J, A, 2` facing a lone `3`.

| Path | Before fix | After fix |
|------|------------|-----------|
| `orderLegals` / `expertScore` | 10 (correct) | 10 |
| `exploitMove` | 10 (correct) | 10 |
| **`exactEndgameMove` → `searchMove`** | **5 from pair** | **A (or 10/J)** |
| `getAIMove` hard/GM | **5 from pair** | structure-safe beat |

## Root cause
`exactEndgameMove` returns the **first** root legal with max exact value. When several beats all win (value=1), legal order is deck/hand order — often the **lowest pair-split single**, not the structure-preserving loose mid/high.

CF-all also shows combat micro selection mass (`single_mid→single_mid`, trash↔mid) where same-class wrong card matters.

## Fix (v9.1, `search.js`)
1. **Root exact endgame:** `orderLegals` (structure-aware) before max-value scan; keep first max (structure wins ties).
2. **`structureBreakCost`:** stronger sequence interior/edge penalties for singles.
3. **Combat `expertScore`:** extra penalty when single has high structure-break cost.

## Tests
`test-search.js` — user-reported guard: loose beat over pair-break for `orderLegals` + `exactEndgameMove`.

## Follow-ups for later rungs
- Mine playlogs for free-lead cases where hybrid trash should beat multi (separate from this combat bug).
- Optional: same structure tie-break inside exact endgame **child** max when many equal wins (root fix covers hint path).
