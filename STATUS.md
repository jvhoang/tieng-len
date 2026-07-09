# Tieng Len — STATUS

**Date:** 2026-07-09  
**Goal:** Flawless web Tiến Lên for https://jvhoang.github.io/tieng-len/

## Complete

1. **Free lead** — When all other active players pass, pile clears; last player to play leads any legal combo (not forced to beat their own prior play). Engine `pass`/`applyPlay` + unit tests.
2. **2/3/4 vs AI** — Controller always recreates state on start/reconfigure; all AI seats act via `runAITurnIfNeeded`. Player zones visible for every seat.
3. **Smarter AI** — Multi-combo leads (pair/seq/triple/doubleseq), conserves 2s, strategic pass. Types seen in multi-seed games: single, pair, triple, seq, doubleseq.
4. **Hand order** — Default low→high; drag-reorder with visual feedback; sort button + `R` key; pure `hand-order.js` + tests.
5. **Trick stack + juice** — Prior combos peek under new plays; fly-in animation; large YOUR TURN / PASSED banners.
6. **Friends multiplayer** — Host/join room code + share link via PeerJS; hotseat option; README steps; logic-level sync test.
7. **Verification** — `node launch-verify.js` ALL GATES PASSED (engine 42, AI 19, seats, hand-order, mp, ui-feedback, wired, launch×2).

## Deploy

- Pushed `main` + `gh-pages` (force) 2026-07-09; Pages build status `built`.
- Live verified: all scripts 200, free-lead engine symbols present, banners + hand-order + multiplayer + peerjs in index.
- Live URL: https://jvhoang.github.io/tieng-len/

## Residual risks

- PeerJS/NAT: some networks may block P2P; hotseat still works.
- No login/accounts (by design).
