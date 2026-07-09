# Tieng Len — STATUS

**Date:** 2026-07-09  
**Goal:** Flawless web Tiến Lên for https://jvhoang.github.io/tieng-len/

## Complete

1. **Free lead** — When all other active players pass, pile clears; last player to play leads any legal combo.
2. **2/3/4 vs AI** — Controller recreates state; all AI seats act; zones visible.
3. **Smarter AI** — Multi-combo leads, conserves 2s, strategic pass.
4. **Hand order** — Default low→high; drag-reorder; sort button / R.
5. **Trick stack + banners** — Prior combos under new plays; large YOUR TURN / PASSED.
6. **Friends multiplayer** — PeerJS host/join + hotseat; README steps.
7. **Bomb after pass** — `playHuman` no longer hard-rejects `p.passed`; legal bombs vs 2s apply (controller test on real path).
8. **UI wired test stabilized** — Fixed seed + drive until legals>0 or pass path (5/5 stable).
9. **Verification** — `launch-verify.js` ALL GATES PASSED; live Pages deploy.

## Deploy

- Live: https://jvhoang.github.io/tieng-len/
- main + gh-pages updated with bomb-after-pass fix.
