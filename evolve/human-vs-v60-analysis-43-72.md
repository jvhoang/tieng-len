# Human vs live v6.0 — analysis of play-logs #43–#72

**Source:** GitHub issues [#43–#72](https://github.com/jvhoang/tieng-len/issues?q=label%3Aplay-log) (`play-log` label), site build `20260711a`.  
**Range:** 30 games.  
**Parsed:** `{SCRATCH}/deep-analysis-43-72.json`.

| Outcome | Count | Rate |
|---------|------:|-----:|
| human-win | 27 | 90.0% |
| ai-win | 3 | 10.0% (#51, #55, #69) |

**Issues in range:** #43 #44 #45 #46 #47 #48 #49 #50 #51 #52 #53 #54 #55 #56 #57 #58 #59 #60 #61 #62 #63 #64 #65 #66 #67 #68 #69 #70 #71 #72.

| Aggregate | Value |
|-----------|------:|
| AI fallbacks | **158** (`cheap-force` 102, `null-free-lead` 56) |
| Search modes logged | **0** |
| Human free multi / single | 61 / 39 |
| AI free multi / single | 32 / 24 |
| Median AI leftover (human-win) | **4** |

---

## Rank-2 usage (user claim: “AI never played any 2s”)

| Metric | AI | Human |
|--------|---:|------:|
| Plays that include a rank-2 card | **2** | **21** |
| Free-lead 2-plays | 2 | 6 |
| **Combat** 2-plays | **0** | **15** |
| Games with zero 2-plays by that side | 28 | (many) |
| Games AI was dealt ≥1 two | **27** / 30 | — |
| Games AI held 2s but **never played** a 2 | **25** / 30 | — |

### Verdict on user claim

**Nearly true, not absolute.**

- Across #43–#72 the AI made **only 2** plays that used a 2 — both **free-lead go-outs** in AI wins:
  - **#51 i=19:** free-lead pair `2s 2h` to finish (human 8 left)
  - **#55 i=17:** free-lead single `2d` to finish (human 7 left)
- **Zero combat 2s** in the entire range. Human used **15** combat 2s (mostly to reclaim lead after AI high singles/pairs).
- In **25/27** games where AI was dealt twos, AI **never played them**.

So the live policy effectively **refuses to spend 2s in combat**; humans exploited that by climbing to A/K knowing AI would answer with Ace/King structure instead of 2s, then human dumps 2 and free-leads multi.

### Concrete exploit examples

| Issue | Event | What AI did | Held 2s | Human reply |
|------:|------:|-------------|---------|-------------|
| **#47 i=12** | Combat single Ace | Played `Ah` (not 2) | 1 | Later `2h` takes control |
| **#50 i=6** | Combat single Ace | Played `Ah` | 1 | **`2d`** then human finishes; AI left **11** |
| **#52 i=7** | Combat K/A high | Played `Ac` with 2 twos in hand | 2 | **`2s`** |
| **#63 i=8,10** | Climb K then A | Played `Kc`, `Ac` while holding **2** twos | 2 | **`2d`** freezes AI; leftover **8** |
| **#64** | Pair climb 5→8→T | Never spent 2 in combat | 1 | Human `2s` late |

**AI wins that used 2s:** only as **last free-lead** after already winning the structure race — not as combat control cards.

---

## Other failure modes (still present)

### 1. Search never engages (systemic)
All AI moves are `fallbackUsed` (`null-free-lead` / `cheap-force`). `aiBuild` null in logs. Same as #14–#42.

### 2. Structure collapse with stuck 2s
AI often ends with **1–4 cards including unplayed 2s** while human goes out:
- #46, #49, #60, #64, #72: final AI size **1** (often dead 2 or A)
- #48, #50, #71: leftover **10–11** — catastrophic with 2s still buried

### 3. Pair ladder then fold
AI cheap-forces mid pairs; human answers higher or folds then multi free-leads with 2-control (#45, #57, #68).

### 4. Lonely / weak free-leads under fallback
AI free-lead multi bias weaker than human (32:24 vs 61:39 multi:single).

---

## Fix list for v7

1. **Combat 2s when facing Ace (and often K):** if only non-2 answer is another Ace/K and hand still has volume/trash, **prefer 2** to seize lead (fixes #47/#50/#63).
2. **Never pass a pure-2 answer vs Ace** when a 2 is legal (hard guard).
3. **When holding 2s and opponent threatens go-out (omin ≤ 2),** spend 2 to contest high singles.
4. **Keep** not dumping 2s on low junk (3–8) — over-spending 2s is still bad.
5. **Engage search/exploit** on live hard 2p (modes must log); freeze full v6 for gate.
6. **Exploit BR vs frozen v6.0** expert as primary perfect-info root.

---

## Gate note

Formal gate = **new AI vs frozen v6.0** over **≥300 continuous** single-deal 2p games, rate **strictly > 0.75**.  
Human logs inform 2-usage defects; they are not the formal metric.
