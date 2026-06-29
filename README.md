# Tiến Lên • Tieng Len (Thirteen / 13)

High-quality, polished, decorative web implementation of Vietnam's national card game.

- **2-4 players**
- **vs Smart AI** (hybrid expert strategies + MCTS search + lightweight self-play TD learning — demonstrably competent)
- **Live players** (local hotseat with seat switching + BroadcastChannel sync + WebRTC copy-paste P2P for remote)
- Pure static. GitHub Pages ready (gh-pages branch). Easy embed on GoDaddy / finalworth.com.

## Play
Open `index.html` directly or visit the GitHub Pages URL.

## Rules Fidelity
See [RULES.md](./RULES.md) — locked to core Pagat.com + Wikipedia authoritative set (including correct 2p/3p first-lead lowest card when 3♠ discarded).

All engine and AI decisions validated by committed unit tests driving shipped code.

## Hosting & Embed
- Repo: https://github.com/jvhoang/tieng-len
- Pages: https://jvhoang.github.io/tieng-len/ (served from gh-pages)
- Embed: copy the folder to finalworth.com

## AI
Hybrid expert + MCTS. Own ML: linear eval weights updated via self-play TD-style hill-climb from outcomes (see ai.js).