# Tiến Lên • Tieng Len (Thirteen / 13)

High-quality, polished web implementation of Vietnam's national card game.

- **2–4 players**
- **vs Grandmaster AI** (UCT MCTS + expert rollouts + optional determinization; Easy/Medium/Hard/Grandmaster strengths)
- **Play with Friends** — same-device hotseat **or** real-time online (separate computers) via room code + share link
- Pure static site — GitHub Pages ready — embeddable on finalworth.com

## Play

- Local: open `index.html` or `python3 -m http.server 8080`
- Live: **https://jvhoang.github.io/tieng-len/**

## How to play with friends (different computers)

1. One person opens **https://jvhoang.github.io/tieng-len/**
2. Click **Play with Friends** → choose **2 / 3 / 4** players
3. Host clicks **Host online game**
4. Share the **room code** (or the **share link** with `?room=CODE`) with friends
5. Friends open the link **or** enter the code under **Join a friend’s room**
6. Host clicks **Enter table** and everyone plays on their own turn

**Notes**

- Host is the game authority; everyone stays in sync automatically
- Uses PeerJS free signaling (works on GitHub Pages). Some strict corporate NATs may block P2P — use hotseat or another network if connect fails
- **Hotseat (one device)** is also available from the same Friends menu

## Hand UX

- Your cards default **lowest → highest** (left to right)
- **Drag** cards to group pairs, straights, or trash as you like
- **Sort low→high** button (or **R** key) restores default order

## Rules fidelity

See [RULES.md](./RULES.md) — Pagat + Wikipedia core:

- 13 cards; rank 2 high → 3 low; suits ♥ > ♦ > ♣ > ♠
- First lead includes 3♠ (or lowest card when 3♠ not dealt)
- Same-type beat, pass lockout, bombs vs 2s
- **Free lead**: when everyone else has passed, the pile clears and the last player to play may lead **any** legal combination (not forced to beat their own prior combo)

## Controls

| Action | How |
|--------|-----|
| Select cards | Click |
| Play | **PLAY** or `P` / `Enter` |
| Pass | **PASS** or `S` / `Space` (only when beating a pile) |
| Clear selection | **CLEAR** or `C` / `Esc` |
| Re-sort hand | Sort button or `R` |
| Hint | Hint button or `H` |

## Tech

- Vanilla JS + Tailwind CDN + Font Awesome + PeerJS (CDN)
- Modules: `engine.js`, `ai.js`, `controller.js`, `hand-order.js`, `multiplayer.js`, `ui.js`
- No build step

## Tests

```bash
node test-engine.js
node test-ai.js
node test/test-controller.js
node test/test-controller-seats.js
node test/test-hand-order.js
node test/test-multiplayer-sync.js
node test/test-ui-feedback.js
node test/test-ui-wired.js
# optional full launcher:
node launch-verify.js
```

## Hosting & embed

- Repo: https://github.com/jvhoang/tieng-len  
- Pages: https://jvhoang.github.io/tieng-len/  
- Embed on finalworth.com: iframe the Pages URL or copy the folder into your site

## License

Personal, educational, fun. Not for real-money gambling.
