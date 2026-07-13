# CF Human Mines — Grandmaster v9.1

**Date:** 2026-07-12  
**Source:** `evolve/counterfactual-all-latest-summary.json` (rewritten by live CF re-run)  
**Also:** `evolve/counterfactual-79-latest-summary.json` (legacy alias, same content)  
**AI:** v9.1 (`AI_BUILD` stamped `2026-07-12T23:24:28Z`)  
**Method:** `getAIMove` in human seat · `hiddenInfo=true` · `perfectInfo=false`  
**Index:** `evolve/playlog-index.json` — 97 completed 1v1 / 103 issues (`refreshedAt` 2026-07-12T23:35:36Z)  
**Corpus outcomes:** **human-win 87 / ai-win 10 → human wins 89.7%** (still >85%)

CF match rate is **imitation**, not ladder win rate. Use patterns to rank **strength levers**, not to maximize match%.

**Note:** v9.1 CF aggregate is **numerically identical** to v9.0 CF-all (`matchRate=0.6137`, 304 differs, same `differPatterns` / `classDisagreeTop`). Live multiTie was already nudged toward longer multi (`search.js` L1007) without changing hidden-info human-seat decisions on this corpus.

Related prior writeup: `evolve/HUMAN-LOSS-MINES-v11.md` (v9.0 branch designs). This file is the EV-ranked mine for next patches.

---

## 1. Counts (authoritative)

| Metric | Value |
|--------|------:|
| Completed 1v1 games | **97** |
| Human actions scored | **787** |
| Match | **483** |
| Differ | **304** |
| Match rate | **61.37%** |
| Human-win games | **87 (89.7%)** |
| AI-win games | **10 (10.3%)** |
| Differ rate on human-wins | 279/708 = **39.4%** |
| Differ rate on ai-wins | 25/79 = **31.6%** |

### Differ pattern totals (full corpus)

| Pattern | N | % of 304 | Meaning |
|---------|--:|---------:|---------|
| `combatDiffer` | **188** | 61.8% | Mid-trick contest / answer choice |
| `freeLeadDiffer` | **116** | 38.2% | Open-lead class / length |
| `classDisagree` | **202** | 66.4% | Different action class (or pass) |
| `multiVsSingle` | **71** | 23.4% | One side multi, other single |
| `humanTwoAltNot` | **33** | 10.9% | Human burns 2; AI does not |
| `humanPassAltPlay` | **33** | 10.9% | Human **passes**; AI **plays** |
| `altTwoHumanNot` | **13** | 4.3% | AI burns 2; human does not |
| `humanPlayAltPass` | **0** | **0%** | AI **never** passes when human plays |

**Hard asymmetry:** AI is strictly more aggressive than the human on this corpus (`humanPlayAltPass=0`). Every pass disagreement is human fold / AI contest.

### Top class pairs (human → AI)

| Rank | Pair | N | Theme |
|-----:|------|--:|-------|
| 1 | `triple→triple` | 28 | Same-class micro (wrong triple / order) |
| 2 | `single_mid→single_mid` | 24 | Wrong mid single beat |
| 3 | `pair→pair` | 23 | Wrong pair among legals |
| 4 | `pass→pair` | 22 | **Human folds; AI plays pair** |
| 5 | `single_trash→pair` | 20 | Free-lead trash vs AI pair |
| 6 | `single_two→single_mid` | 17 | Human 2; AI mid single |
| 7 | `single_trash→single_mid` | 16 | Trash vs mid single |
| 8 | `single_trash→single_trash` | 15 | Wrong trash card |
| 9 | `single_mid→single_trash` | 14 | AI dumps lower than human mid |
| 10 | `bomb_or_long→triple` | 12 | Human long multi; AI triple |
| — | `pass→triple` | 7 | Fold vs contest triple |
| — | `pair→bomb_or_long` | 7 | Short multi vs long lead |
| — | `single_two→single_high` | 7 | 2 vs high single |

### Proxy buckets (frequency × theme)

| Bucket | Approx N | Notes |
|--------|---------:|-------|
| Same-class micro (top same pairs) | **~100** | `triple/pair/single_mid/trash/bomb` same→same |
| Long multi timing (cross length) | **~30** | bomb↔pair/triple |
| Pass-related | **29** | pass→pair 22 + pass→triple 7 |
| Trash free-lead → multi | **~28+** | trash→pair/triple (+ samples trash→long) |
| 2 under-burn class pairs | **~27** | two→mid/high/trash |

### Highest-differ human-win games (branch stress tests)

| Issue | Differ | Match | Actions |
|------:|-------:|------:|--------:|
| #27 | 8 | 3 | 11 |
| #46 | 8 | 5 | 13 |
| #19 | 6 | 3 | 9 |
| #23 | 6 | 4 | 10 |
| #98 | 6 | 5 | 11 |
| #5, #17, #24, #25, #33, #35, #53 | 5 each | — | — |

### Sample window (`differSample` n=100)

Qualitative only (first 100 differs, not full 304):

- Free-lead 39 / combat 61
- Modes: `exact-endgame` 53, `best-response-det` 47
- `pass→pair` samples: avg hand **~11.6**, avg omin **~8.7** — deep midgame folds, not endgame
- Combat pass tops are mostly **pairs** (10/14 sample passes), not Ace races
- Free-lead single→multi: 17 samples; hand≥9 in 9, hand≤7 in 8 (multi-always hits both early and mid)
- Human 2 AI-not often on **low–mid tops** (curTop 1–8), not only Ace — AI keeps mid singles while human reclaims with 2

---

## 2. Top recurring loss patterns

### P1 — Combat over-contest / missing pass discipline (**largest EV**)

**Evidence:** `combatDiffer=188`; `humanPassAltPlay=33`; `humanPlayAltPass=0`; `pass→pair=22` + `pass→triple=7`.  
Samples: human folds mid **pairs** with hand 11–13 and omin 5–11; AI always answers.

**Why strength (not just imitation):** Contesting mid multi with structure-breaking answers leaves trash + dead control; human reclaims with 2s and free-lead volume. Historical #43–#72 lesson still echoes.

**Mechanism today:**
- `expertPolicy` soft-pass is narrow: only `handLen≥9 && curTop<10 && omin≥6` (`search.js` L450–451), and only after cheap/non-2 paths fail.
- Once `cheapLegals` nonempty → always play (L388–389).
- `ai.js` `shouldPassStrategically` (L365–405): **ALWAYS play cheap beat** (L371–372).
- Combat soft root (`search.js` L2753–2755) allows pass when no cheap **or** hand≥9 & omin≥5 — but CF is hidden-info so soft root often does not run; expert still dominates rollouts.

### P2 — Free-lead multi-always vs human trash / short multi

**Evidence:** `freeLeadDiffer=116`; `multiVsSingle=71`; `single_trash→pair=20`; samples: trash vs length-4/5 multi; pair vs long multi.

**Why strength:** Early long multi dumps structure without lock; human keeps pairs/trash-shed with control and wins races later.

**Mechanism today:**
- `pickFreeLeadHard` multi-always core L539–603: any multi → prefer low multi by **length** (`lb - la` when tops close).
- Hybrid trash only if `_exploitFlMode === 'hybrid'` (L593–601) — not default expert path.
- Perfect-info free-lead soft root already demotes long multi early (hybridB L2679–2691) — **does not run under CF**; ladder can still use it.
- BR `multiTie` L1007 currently **rewards longer multi** (`0.004 * min(11, length)`) — anti-CF for short multi preference.

### P3 — Same-class micro-selection (minimal beat / structure)

**Evidence:** `triple→triple=28` + `pair→pair=23` + `single_mid→single_mid=24` + trash/bomb same ≈ **100** of classDisagreeTop mass.

**Why strength:** Wrong pair/triple often breaks residual structure or over-climbs; same class but different card is still a real EV leak in rollouts + cheap path.

**Mechanism today:**
- `orderLegals` = pure `expertScore` sort (L325–328).
- Combat `expertScore` uses `topRank * 0.85` + weak gap penalty (gap>2 * 0.8) L294–312; structure cost is base `*2.2` but often ties two legal pairs/triples.
- Cheap path returns `orderLegals(cheap)[0]` with tiny CF budget (~BR det) — first ordered legal wins ties.

### P4 — 2-tempo mismatch (human burns 2 more)

**Evidence:** `humanTwoAltNot=33` vs `altTwoHumanNot=13`; class `single_two→single_mid=17`, `→single_high=7`.  
Samples: human 2 on curTop 1–8 midgame; AI answers with mid/trash single.

**Why strength:** Human spends 2s to reclaim lead while holding trash; AI conserves 2 and gifts tempo.

**Mechanism today:**
- Ace+2 hard path L363–371 (good).
- Tight 2-tempo only `omin≤2` and curTop∈[8,10] L373–386.
- Mild 2 vs K when only high non-2 remain L404–417.
- No reclaim 2 vs mid tops when hand deep + trash + omin not short.

### P5 — Long multi / bomb timing + length bias

**Evidence:** `bomb_or_long→triple=12`; `bomb_or_long→bomb_or_long=10`; `pair→bomb_or_long=7`; `triple→bomb_or_long=5`.  
Samples: human pair lead vs AI length-4; human trash vs AI length-5.

**Why strength:** Long multi without lock wastes volume; wrong length loses control cycles.

**Mechanism today:**
- Unanswerable multi prefers **longer** first (L567–571) — correct under perfect info.
- Hidden multi-always still length-sorts low multi (L586–590).
- `multiBonus` exploit L1216–1220 mild length growth; BR multiTie L1007 stronger length reward in v9.1.

### Secondary (lower priority)

- **Gift to 1-card:** climb path exists for omin==1 (L419–434); expertScore forbids low single free-lead vs omin==1 (L254–257). Few sample fails — not a top CF mass.
- **Late stuck trash:** `single_trash→*` appears in deep hands; mostly free-lead multi-always and combat micro, not a separate endgame bug.
- **Bad bomb/2 use:** covered by P4 (under-burn) and rare over-burn (`altTwoHumanNot=13`, often AI 2 vs Ace when human passes).

---

## 3. Code lever map (live tree)

| Lever | File | Lines | Role |
|-------|------|------:|------|
| Structure break cost | `search.js` | 139–169 | Residual pair/triple damage |
| `expertScore` | `search.js` | 231–323 | Free-lead + combat ordering |
| `orderLegals` | `search.js` | 325–328 | Sort-only micro selection |
| `expertPolicy` combat / soft-pass | `search.js` | 335–457 | Rollouts + CF fallback |
| Ace+2 / tight 2-tempo | `search.js` | 363–386 | 2 reclaim gates |
| Cheap always-play | `search.js` | 388–389 | Blocks pass when cheap exists |
| Soft-pass window | `search.js` | 450–454 | Only deep + omin≥6 |
| `freeLeadCandidates` | `search.js` | 460–494 | Root multi + trash set |
| `pickFreeLeadHard` multi-always | `search.js` | 504–631 | Default free-lead |
| Unanswerable / force-exp multi | `search.js` | 549–580 | Perfect-info length max |
| Hybrid trash (mode only) | `search.js` | 593–601 | `_exploitFlMode==='hybrid'` |
| BR `multiTie` | `search.js` | 1006–1008 | **v9.1 length bias** |
| `exploitMove` multiBonus / lock | `search.js` | 1215–1235 | Soft free-lead scoring |
| `leafEval2p` | `search.js` | 1414–1438 | Race / control leaf |
| Free-lead soft root hybridB | `search.js` | 2596–2708 | Perfect-info trash preference |
| Combat soft root `cAllowPass` | `search.js` | 2749–2758 | Pass candidate gate |
| `shouldPassStrategically` | `ai.js` | 365–405 | Post-search pass genome |
| `forceMultiFreeLead` / `pickFreeLead` | `ai.js` | 482–529 | Post-search free-lead guard |
| `getAIMove` entry | `ai.js` | ~813–1008 | Guards after search |

---

## 4. Recommended patches (ranked by expected EV)

Expected EV = **frequency × strength relevance × implementability / risk**.  
Imitation CF match↑ is a **secondary** success metric; dual-vs-freeze is the real gate (not claimed here).

### #1 — Combat pass discipline (targets P1) — **highest EV**

| | |
|--|--|
| **Expected EV** | ★★★★★ |
| **CF mass** | 188 combat + 33 pass disagreements; pass→pair samples avg hand 11.6 |
| **Risk** | Med (can fold races vs short opp) |
| **Hang** | Low (policy + soft prior only) |

**Concrete:**

1. **`search.js` `expertPolicy`** after non-2 expensive path (near L450): expand fold when deep + mid multi top + omin not short:
   - Prefer pass when `handLen≥8`, `omin≥5`, `curTop<9`, and answer is multi (pair/triple/seq) **or** only multi answers remain.
   - Keep force-contest when `omin≤3` or `handLen≤7` or `curTop≥10`.
2. **`search.js` combat soft root** L2753–2755: allow pass earlier with cheap present if mid top + hand≥8 + omin≥5.
3. Mild **pass prior** (+0.008–0.012) when scoring `cact==null` under those gates.
4. **Do not** yet flip `ai.js` cheap-force pass (L371–372) — high risk; only after dual edge from (1–3).

**Probe signal:** dual N≥50 vs freeze; CF `humanPassAltPlay` ↓ without new `humanPlayAltPass` spike on omin≤2 races.

---

### #2 — Hybrid free-lead default + invert multiTie length (targets P2 + P5) — **high EV**

| | |
|--|--|
| **Expected EV** | ★★★★☆ |
| **CF mass** | 116 free-lead + 71 multiVsSingle + trash→pair 20 |
| **Risk** | Med–High (miss locking long multi) |
| **Hang** | Low |

**Concrete:**

1. **`pickFreeLeadHard`** L583–603: among low multi, prefer **length 2–3** when tops within 1; if `handLen≥10`, control/2s present, and multi top>6 or length≥4 → return trash single when available (default path, not only hybrid mode).
2. **Keep** unanswerable multi first (L566–572) — do not demote true locks.
3. **Invert BR multiTie** L1007 from  
   `0.004 * min(11, act.length)` → peak at pair/triple, demote length≥5  
   e.g. `0.004 * (L<=3 ? L : max(0, 6-L))` + small bonus if topRank≤7.
4. **`multiBonus`** L1216–1220: prefer length 2–3 over 5+ free-leads (soft).

**Probe signal:** seed `20799253` trash free-lead; dual free-lead-heavy band; CF `single_trash→pair` ↓ and `multiVsSingle` ↓.

---

### #3 — Minimal-beat + structure ordering (targets P3) — **solid EV, lowest risk**

| | |
|--|--|
| **Expected EV** | ★★★☆☆ |
| **CF mass** | ~75–100 same-class differs |
| **Risk** | Low–Med |
| **Hang** | None |

**Concrete:**

1. Combat branch of **`expertScore`** L293–312: stronger minimal-beat (`topRank` weight ↑), tighter gap penalty (gap>1), extra `structureBreakCost` on multi answers.
2. **`orderLegals`** L325–328: secondary keys `topRank` then `length` on score ties.
3. Optional: among legal pairs/triples, prefer lower top when omin≥3.

**Probe signal:** stacks cleanly after #1/#2; watch omin==1 climb still wins (climb path L419–434 stays).

---

### #4 — 2-tempo reclaim (targets P4) — **medium EV**

| | |
|--|--|
| **Expected EV** | ★★★☆☆ |
| **CF mass** | 33 under-burn vs 13 over-burn |
| **Risk** | Med (over-burn endgames) |
| **Hang** | None |

**Concrete:**

1. After Ace+2 block (~L373): when `cur.type==single`, `curTop∈[9,10]`, hold 2, `handLen∈[4,10]`, `trashCount≥1`, and no cheap mid single — prefer 2 over Ace-only climb (broader than `omin≤2` only).
2. Do **not** burn 2 on `curTop<8` (samples show some human 2s on junk — high risk to imitate).
3. Keep Ace≥11 force (L363–371, L439–442).

**Probe signal:** dual; track `humanTwoAltNot` ↓ without `altTwoHumanNot` explosion.

---

### #5 — leafEval race + BR pass soft (targets residual P1/P2) — **polish EV**

| | |
|--|--|
| **Expected EV** | ★★☆☆☆ |
| **CF mass** | Diffuse (helps BR, not expert imitation directly) |
| **Risk** | Med (diffuse leaf changes) |
| **Hang** | Low (same trial count) |

**Concrete:**

1. **`leafEval2p`** L1414+: slightly sharper race (`oppLen-myLen`), control, trash residual; mild penalty when deep and behind on count.
2. BR combat: when `act==null` and `handLen≥9 && omin≥5`, small `passTie≈0.008`.
3. Only after #1–#3 plateau — do not lead with diffuse eval.

---

## 5. Probe order (no ship / no freeze)

| Priority | Patch | Primary touch | Why first |
|---------:|-------|---------------|-----------|
| 1 | **#1 Combat pass** | `expertPolicy` + combat soft pass | Largest combat mass; total aggression asymmetry |
| 2 | **#2 Hybrid free-lead + multiTie invert** | `pickFreeLeadHard`, L1007, multiBonus | 116 free-lead + length anti-pattern; v9.1 multiTie currently wrong direction |
| 3 | **#3 Minimal-beat structure** | `expertScore`, `orderLegals` | High count, low hang, stacks |
| 4 | **#4 2-tempo** | `expertPolicy` 2 gates | After pass discipline (interaction) |
| 5 | **#5 leafEval / BR pass soft** | `leafEval2p`, BR score | Polish only |

### Checklist

1. `node test-search.js`
2. Spot seed `20799253` free-lead trash preference when multi loses
3. Dual continuous N=25–50 vs current freeze (primary seed `20260711`)
4. CF-all refresh only after dual edge; track:
   - `humanPassAltPlay` ↓
   - `freeLeadDiffer` / `multiVsSingle` ↓
   - no collapse on omin≤2 forced contest
5. Hang budgets: free-lead soft ≤800ms, combat soft ≤700ms (existing)

---

## 6. Explicit non-claims

- No dual gate, ship, or freeze comparison is asserted.
- CF match rate ≠ strength; human still wins **89.7%** of logged 1v1s.
- Perfect-info soft roots do not run under this CF (`hiddenInfo=true`); patches #1–#3 still hit expert + BR paths used in both CF and ladder.
- Do **not** ship from this document alone.

---

## 7. Quick reference — top 5 actionable improvements

1. **Expand combat soft-pass** on mid pair/triple when deep + omin≥5 (`search.js` ~L450, combat soft ~L2753).  
2. **Default hybrid free-lead**: trash / short multi early; keep unanswerable multi first (`pickFreeLeadHard` ~L583).  
3. **Invert multiTie / multiBonus length bias** (`search.js` L1007, L1216) — v9.1 currently rewards longer multi.  
4. **Stronger minimal-beat + structure** in combat `expertScore` / `orderLegals` (~L293, L325).  
5. **Broader 2-reclaim vs K/high mid** when trash remains (`expertPolicy` ~L373), without burning 2 on junk tops.
)

## Addendum — User structure-break single (2026-07-12)

**Report:** AI hints prefer low single that **breaks a multi** over a **loose single**.

**Root:** `exactEndgameMove` first-max-on-ties (hand order) → pair-split beats.

**Fix shipped in live `search.js` (v9.1):** orderLegals root + stronger sequence structure cost + combat single break penalty. See `evolve/NOTE-structure-break-single.md`. Repro fixed: face-3 with pair-5 + loose-10 no longer plays 5.

