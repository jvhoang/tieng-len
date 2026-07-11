# Human vs live v4.0 — analysis of 9 public play-logs

**Source:** GitHub issues [#1–#9](https://github.com/jvhoang/tieng-len/issues?q=label%3Aplay-log) (`play-log` label), all **2p · human-win**.  
**Parsed artifact:** `{SCRATCH}/parsed-9games.json` (session) / re-fetchable from issues.

| Issue | Steps | Duration | Human 2s | AI 2s | First player | AI fallbacks | AI passes | Human passes |
|------:|------:|---------:|---------:|-----:|-------------:|-----------:|-----------:|-------------:|
| #1 | 16 | 44s | 1 | 0 | AI | 4 | 4 | 0 |
| #2 | 11 | 59s | 0 | 1 | Human | 2 | 3 | 0 |
| #3 | 8 | 32s | 2 | 1 | AI | 2 | 2 | 0 |
| #4 | 14 | 55s | 2 | 0 | AI | 4 | 3 | 0 |
| #5 | 21 | 75s | 1 | 1 | Human | 6 | 4 | 3 |
| #6 | 17 | 52s | 1 | 1 | Human | 6 | 2 | 2 |
| #7 | 13 | 37s | 2 | 1 | Human | 3 | 3 | 0 |
| #8 | 15 | 41s | 1 | 1 | Human | 5 | 2 | 2 |
| #9 | 16 | 48s | 2 | 0 | AI | 5 | 3 | 1 |

**Aggregate:** 9–0 human. Human free-leads multi **21** vs single **10**; AI free-leads multi **6** vs single **6**. AI fallback events **37**; AI pass events **26**.

---

## 1. Search never engaged (systemic)

**Finding:** Every AI move in all 9 logs has `ai.stats.mode === null/undefined`. Every non-null AI play is tagged `fallbackUsed: true` with reasons `null-free-lead` or `cheap-force`.

**Evidence:**
- #1 event i=1: AI free-lead `3s`, fallback `null-free-lead`
- #3 event i=1: AI free-lead `3h 4c 5d`, fallback `null-free-lead`
- #1–#9: zero logged modes (`det-mcts`, `best-response`, `exploit-v30`, etc.)

**Implication:** Live hard path often returned null from `getAIMove` / failed guards, so controller `freeLeadFallback` / `cheap-force` played. Human beat a **degraded** policy, not full v4 exploit strength. Gate opponent must be **frozen full v4 code**, not only the live fallback behavior—but v5 should also **stop null free-leads** and log real search modes.

---

## 2. Free-lead: AI dumps low singles / weak structure; human multi-pressure

**Human edge:** Prefer multi free-leads (volume + structure). AI free-leads were 50% singles, including forced 3♠ opens that are required but then poorly followed.

**AI low single free-leads (non-forced or poor midgame):**

| Issue | Event | Play | Hand sizes before |
|------:|------:|------|-------------------|
| #1 | 1 | `3s` (first lead OK) | [13,13] |
| #4 | 1 | `3c` (first lead OK) | [13,13] |
| #5 | 14 | `3h` with AI at 2 cards, human 5 | [5,2] |
| #6 | 16 | `5h` with human 1 card, AI 4 | [1,4] |
| #8 | 10 | `3c` midgame | [6,7] |
| #9 | 1 | `3d` (first lead OK) | [13,13] |

**Critical gifts:**
- **#5 i=14:** AI free-leads `3h` with only 1 card left after lead while human holds a 2 → human plays `2d`, AI passes, human finishes with multi/singles while AI stuck with 1 card.
- **#6 i=16:** AI free-leads low `5h` when human has **1 card** → human plays `Js` and goes out. Classic no-gift violation vs 1-card opponent.

**Human multi free-leads examples:** #2 final `8d 8h`; #3 `8d 9c Ts Jh Qc` then `2s 2c`; #4 bomb `5s 5c 5d 5h` then seq; #7/#8 long sequences after AI passes.

---

## 3. Combat: AI never strategically passes cheap; human never “soft” passes early

**AI passes (legalsCount often 0):** AI only passes when it truly has no legal beat (locked). Human **never** passes early in #1–#4, #7; only late strategic passes in #5/#6/#8/#9 when sandbagging high.

**AI over-contests then bleeds pairs:**
- #1: AI forced `Ac`, then pairs `6h6s`, `ThTs`; human climbs pairs `9c9d` → `JdJh` → `TcTd` → `QcQh` while AI passes with 7 cards left and **zero 2s**.
- #2: AI beats singles with `4h`/`Kc` then folds Ace; human dumps long seq + pair for go-out with AI still at **11 cards**.

**Human never wastes 2s early** when holding bomb/seq outs (#4: 2s as free leads after AI folds; #3: pair of 2s to finish).

---

## 4. Endgame: AI loses control with more cards remaining

| Issue | Final sizes when human goes out | Pattern |
|------:|----------------------------------|---------|
| #1 | human 0, AI **7** | AI out of pairs; no 2s |
| #2 | human 0, AI **11** | Catastrophic; AI held most of deck |
| #3 | human 0, AI **7** | Human seq chains after AI folds Ace-high seq |
| #4 | human 0, AI **9** | Human 2-leads + quad bomb + seq |
| #5 | human 0, AI **1** | AI 1-card gift free-lead |
| #6 | human 0, AI **3** | AI low free-lead vs human 1 card |
| #7 | human 0, AI **8** | Human 2-lead + long seq after AI fold |
| #8 | human 0, AI **5** | Human 2 then long seq |
| #9 | human 0, AI **3** | Pair climb after AI folds high pair |

**Median AI leftover cards at loss: ~7.** Not close endgames—AI structure collapsed mid-hand.

---

## 5. Control-card imbalance (deal luck + play)

| Issue | Human 2s | AI 2s |
|------:|---------:|------:|
| #1 | 1 | 0 |
| #2 | 0 | 1 |
| #3 | 2 | 1 |
| #4 | 2 | 0 |
| #5 | 1 | 1 |
| #6 | 1 | 1 |
| #7 | 2 | 1 |
| #8 | 1 | 1 |
| #9 | 2 | 0 |

Human held **≥ AI 2s in 8/9 games** (strictly more in 5/9). Still, #2 human had **0 twos** and still crushed (AI 11 cards left)—not only deal luck.

---

## 6. Fix list for v5 (actionable)

1. **Never null free-lead** — if search returns null/illegal, hard free-lead policy must run *before* raw fallback; always log `mode`.
2. **No-gift free-lead** when any opp has 1 card: never single rank &lt; 10 (enforce even on fallback path)—fixes #5/#6.
3. **Prefer multi free-lead** when safe multi exists (match human 21:10 multi bias).
4. **Pair-race awareness** in 2p: do not climb mid pairs into human’s higher pair ladder without an exit (#1).
5. **2p exploit vs frozen v4 expert** as primary perfect-info search (same strategy that beat v3): deterministic BR to v4 expert + late exact endgame.
6. **Hidden-info live path:** more dets + same free-lead/endgame hard rules so human games don’t degrade to fallback-only.

---

## 7. Gate note

Formal gate = **new AI vs frozen v4.0 code** over ≥1000 single-deal 2p games, **rate &gt; 0.80**. Live human 9–0 informs defects; it is **not** the formal metric (plan non-goal: replaying the 9 deals as gate).
