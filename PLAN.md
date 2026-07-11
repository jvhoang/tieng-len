# PLAN — v6.0: analyze #14–#42, beat frozen v5.1 >70%/≥300

## Goal
1. Deep analysis of public play-logs **#14–#42**
2. Newer AI that beats **frozen v5.1** by **strictly >70%** over **≥300 continuous** 2p single-deal games

## Checklist
- [x] Fetch/parse #14–#42; write `evolve/human-vs-v51-analysis-14-42.md`
- [x] Freeze v5.1 as `policies/v51-ai.js` + `policies/v51-search.js`
- [x] Implement v6 (human-log lessons + exploit vs frozen v5.1)
- [x] Continuous ≥300-game bench vs frozen v5.1, target **> 0.70**
- [x] Unit tests green; STATUS + badge not v5.1-only

## Gate result
**PASS:** 240/300 = **80.0%** (`evolve/v6-vs-v51-final.json`)

## Non-goals
- Replaying human deals as formal strength metric
- 1000-game / 80% bar (this objective is >70% / ≥300)
