# PLAN — v5.1: beat frozen v4.0 after human play-log analysis

## Goal
1. Extensive analysis of 9 public human-vs-v4 play-log games
2. Newer AI that beats **frozen current v4.0** by **strictly >80%** over **≥1000** 2p single-deal games

## Checklist
- [x] Parse 9 play-log issues → structured analysis
- [x] Write `evolve/human-vs-v4-analysis.md` with evidence
- [x] Freeze live AI as `policies/v40-ai.js` + `policies/v40-search.js`
- [x] Implement v5 strength (no-gift, multi free-lead, shallowSelf exploit, det inject)
- [x] Bench v5 vs frozen v4 ≥1000 games, rate **> 0.80**
- [x] Unit tests green; STATUS + badge not v4-only

## Gate result
**PASS:** 803/1000 = **80.3%** (`evolve/v5-vs-v40-final.json`)

## Non-goals
- Replaying the 9 human deals as formal gate metric
- Changing rules / engine legality
