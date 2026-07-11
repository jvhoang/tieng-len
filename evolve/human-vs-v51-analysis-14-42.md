# Human vs live v5.1 — analysis of play-logs #14–#42

**Source:** GitHub issues [#14–#42](https://github.com/jvhoang/tieng-len/issues?q=label%3Aplay-log) (`play-log` label), site build `20260710j`.  
**Range size:** 29 games (not 42 total issues — #1–#13 are earlier sessions).  
**Parsed artifact:** `{SCRATCH}/deep-analysis-14-42.json` / `issues/raw-*.json`.

| Outcome | Count | Rate |
|---------|------:|-----:|
| human-win | 25 | 86.2% |
| ai-win | 4 | 13.8% |
| abandoned | 0 | — |

| # | Outcome | Steps | AI fallbacks | H/AI free multi | H/AI free single | H/AI 2s | Final sizes [H,AI] |
|--:|---------|------:|-------------:|----------------:|-----------------:|--------:|--------------------|
| 14 | **ai-win** | 22 | 10 | 1/1 | 1/3 | 1/1 | [5, **0**] |
| 15 | human | 14 | 4 | 3/1 | 0/1 | 0/4 | [0, 7] |
| 16 | human | 17 | 5 | 3/0 | 1/0 | 0/1 | [0, 7] |
| 17 | human | 17 | 5 | 3/2 | 1/1 | 0/1 | [0, 4] |
| 18 | human | 15 | 4 | 2/0 | 2/0 | 2/1 | [0, 7] |
| 19 | human | 18 | 5 | 2/3 | 2/0 | 2/0 | [0, 1] |
| 20 | human | 15 | 5 | 3/1 | 0/1 | 0/3 | [0, 3] |
| 21 | human | 12 | 2 | 3/1 | 1/0 | 3/0 | [0, 9] |
| 22 | **ai-win** | 12 | 6 | 1/3 | 0/0 | 0/0 | [7, **0**] |
| 23 | human | 20 | 6 | 3/3 | 1/1 | 2/0 | [0, 2] |
| 24 | human | 16 | 5 | 2/2 | 1/0 | 2/1 | [0, 5] |
| 25 | human | 19 | 5 | 4/2 | 1/1 | 1/1 | [0, 4] |
| 26 | human | 11 | 3 | 2/0 | 1/0 | 1/2 | [0, 7] |
| 27 | human | 22 | 6 | 3/3 | 2/1 | 0/1 | [0, 2] |
| 28 | **ai-win** | 11 | 6 | 0/4 | 0/1 | 1/0 | [10, **0**] |
| 29 | human | 14 | 4 | 1/1 | 2/0 | 0/0 | [0, 8] |
| 30 | human | 14 | 5 | 2/1 | 0/2 | 1/2 | [0, 5] |
| 31 | **ai-win** | 17 | 8 | 0/3 | 1/2 | 0/1 | [7, **0**] |
| 32 | human | 11 | 2 | 3/1 | 1/0 | 1/1 | [0, 7] |
| 33 | human | 18 | 5 | 2/0 | 2/1 | 3/0 | [0, 8] |
| 34 | human | 14 | 6 | 1/1 | 0/1 | 0/2 | [0, 6] |
| 35 | human | 12 | 3 | 2/0 | 1/1 | 2/0 | [0, 10] |
| 36 | human | 12 | 5 | 1/2 | 0/1 | 0/1 | [0, 4] |
| 37 | human | 11 | 3 | 3/1 | 0/0 | 2/0 | [0, 4] |
| 38 | human | 9 | 3 | 1/0 | 1/0 | 1/1 | [0, 6] |
| 39 | human | 11 | 3 | 1/0 | 2/0 | 1/3 | [0, 10] |
| 40 | human | 12 | 3 | 2/1 | 1/0 | 1/0 | [0, 6] |
| 41 | human | 18 | 5 | 2/1 | 2/0 | 2/0 | [0, 6] |
| 42 | human | 18 | 5 | 2/2 | 2/0 | 2/0 | [0, 5] |

**Aggregate free-leads:** human multi **58** / single **29**; AI multi **40** / single **18**.  
**AI fallbacks:** **137** total — `cheap-force` **79**, `null-free-lead` **58**.  
**Search modes logged:** **0** across **all** AI moves (every AI decision is fallback).  
**Median AI leftover cards when human wins:** **6**.

---

## 1. Systemic: search never runs (still)

**Finding:** `aiBuild` is null in every log body; every AI `play`/`pass` has `ai.stats.mode === null/undefined` and `fallbackUsed: true`.

**Evidence:**
- #14–#42: modes any = 0; AI moves all tagged fallback.
- Free lead → controller `null-free-lead` (58 times).
- Combat → `cheap-force` (79 times).

**Implication:** Live human beat a **degraded** free-lead/combat policy, not full v5.1 perfect-info exploit. Formal gate must freeze **full** v5.1 code; v6 must also stop null free-leads and log real modes.

---

## 2. AI wins (#14, #22, #28, #31) — what worked

Even under fallback, AI wins share patterns:

| Issue | Pattern | Human leftover |
|------:|---------|----------------|
| **#22** | Pair ladder climb (5s→9s→Js), then multi free-leads `6-7-8`, `KK`, `AA` go-out | 7 |
| **#28** | Multi free-lead volume only: pairs 3s/5s → seq → beat human seq → AA → T | **10** |
| **#31** | Pair contest then triple free-lead + pair + T + 2 go-out | 7 |
| **#14** | Climb singles 5→T→K, beat pair with AA, then seq/multi free-leads, finish with 2 | 5 |

**Lesson:** Multi free-lead volume + chain control after human folds wins even without search. When AI **holds structure** and human is forced to pass, go-out is fast.

---

## 3. Human wins — failure modes

### 3a. Pair / single climb then structure collapse
- **#16:** AI cheap-forces singles 4→7→T→Q then pair; human multi free-leads while AI stuck with 7 cards (0 human 2s vs 1 AI 2).
- **#18:** AI climbs pairs 5s→9s then mid singles; human holds 2 twos and finishes; AI left 7.
- **#29:** Opening pair free-lead then mid singles K; human multi pressure; AI left **8**.

### 3b. Control-card deficit (not only luck)
- Human held **≥ AI 2s in 17/25** human-wins; strictly more in **12/25**.
- But **#15** human had **0** twos vs AI **4** and still won (AI leftover 7) — pure structure/tempo loss under fallback.
- **#39** AI held **3** twos and still left with **10** cards.

### 3c. Catastrophic leftover (≥8 cards)
| Issue | AI leftover | Notes |
|------:|------------:|-------|
| 21 | 9 | Human 3 twos; AI free-lead seq then folds |
| 29 | 8 | No twos either side |
| 33 | 8 | Human 3 twos |
| 35 | **10** | AI opens lonely `4s` free-lead |
| 39 | **10** | AI had 3 twos — worst waste |

### 3d. Lonely low free-leads
- **#35 i=1:** AI free-leads single `4s` with full hands → human seizes multi structure.
- **#17 i=8:** After dumping multi, AI free-leads lonely `3d` with 6 cards — hands initiative back.

### 3e. Over-contest then fold
- **#23:** AI climbs pair to KK then dumps triples/pairs; human recovers with 2s; AI left with 2 but loses race.
- AI pass count often **3–5** per loss (legal lockouts after burning mid ranks).

### 3f. No classic 1-card gift free-leads in this sample
No-gift guard appears to fire on fallback free-lead (0 low-single free-leads vs 1-card human). Residual losses are midgame structure, not endgame gifts.

---

## 4. Fix list for v6 (actionable)

1. **Never null free-lead** — search/hard free-lead must always return a legal lead; log `mode` always.
2. **Engage exploit/search on hard** — eliminate live `cheap-force`/`null-free-lead` dominance (137 fallbacks / 29 games).
3. **Prefer multi free-lead** when multi exists (AI already 40:18 multi bias under hard free-lead; keep and strengthen vs trash singles like #35).
4. **Pair-race discipline** — do not climb mid pairs into human higher ladder without exit (#16/#18).
5. **Conserve 2s for true control** — #15/#39 show holding many 2s without structure loses.
6. **2p exploit vs frozen v5.1 expert** as primary perfect-info root (same pattern that beat v4).
7. **Broader shallowSelf + soft incomplete scoring** retained from v5.1 gate fixes.

---

## 5. Gate note

Formal gate = **new AI vs frozen v5.1** over **≥300 continuous** single-deal 2p games, rate **strictly > 0.70**.  
Human #14–#42 inform defects; they are **not** the formal metric.
