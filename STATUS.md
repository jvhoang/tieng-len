# Tieng Len — STATUS

**Date:** 2026-07-11  
**Grandmaster v7.5** + finalworth-inspired UI theme

## Deliverables

### 1. Counterfactual analysis #1–#72
- Doc: `evolve/human-vs-v70-counterfactual-1-72.md`
- Summary JSON: `evolve/counterfactual-1-72-summary.json`
- Method: frozen **v7.0** `getAIMove` as human seat, **hiddenInfo only** (no AI-hand peek)
- **549** human actions in **69** completed games; match rate **60.1%** (330 match / 219 differ)
- Themes: human spends 2s for tempo (24×), longer free-lead multi (67 free-lead differs), combat climbs (114)

### 2. Grandmaster v7.5 vs frozen v7.0
- Freeze: `policies/v70-ai.js` + `policies/v70-search.js`
- Live: `v7.5-human-counterfactual` / **Grandmaster v7.5**
- Bench: `evolve/bench-v75-vs-v70.js`
- Gate artifact: `evolve/v75-vs-v70-final.json` (target **>70%** / **≥200** continuous)

### 3. UI / visuals
- Hearts & diamonds ranks+suits: **red** (`#dc2626`)
- Theme: midnight blue / teal / grey / violet (not maroon/gold)
- Poker-style card backs (no Chinese glyph)
- **Fixed** Play / Pass / Clear bar (`#action-bar`)
- Fanned overlapping hands (`.hand-fan`)
- Cache: `?v=20260711c`

### Tests
```bash
node test-engine.js && node test-search.js && node test-ai.js && node test/test-ui-theme.js
```


### Gate final
**157/200 = 78.5%** passed=True
