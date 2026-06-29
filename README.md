# Tiến Lên • Tieng Len (Thirteen / 13)

High-quality, polished, decorative web implementation of Vietnam's national card game.

- **2-4 players**
- **vs Smart AI** (hybrid expert strategies + MCTS search — demonstrably competent)
- **Live players** (local hotseat + P2P WebRTC for real online across devices/tabs)
- Pure static. GitHub Pages ready. Easy embed on GoDaddy / finalworth.com.

## Play
Open `index.html` directly or visit the GitHub Pages URL after deploy.

## Rules Fidelity
See [RULES.md](./RULES.md) — locked to core Pagat.com + Wikipedia authoritative set:
- 13 cards, rank 2 high > 3 low, suits ♥>♦>♣>♠
- First lead with 3♠
- Full bombs, pass lockout, shedding win (last loses)

All engine and AI decisions validated by committed unit tests.

## Tech / Quality
- Vanilla + Tailwind CDN (like the beyond-good-and-evil pattern)
- Pure JS rules engine + AI (no build step)
- Highly decorative Vietnamese lacquer/gold aesthetic
- Fully playable without errors, intuitive controls
- Tests: `node test-engine.js` and `node test-ai.js` (all pass)

## Hosting & Embed (jvhoang + finalworth.com)
- Repo: https://github.com/jvhoang/tieng-len
- Pages: https://jvhoang.github.io/tieng-len/
- To embed: copy the entire folder contents into a page section on finalworth.com (or the self-contained index if flattened).

## Development
```
python3 -m http.server 8080
# open http://localhost:8080
```

## AI Strength
Uses documented Tien Len tactics + bounded MCTS with position eval. Always legal. Exhibits bomb usage, good control, and competent endgame play.

## License / Use
Personal, educational, fun. Not for real money gambling.

Built autonomously to state-of-the-art static web game standards.
