# Human Loss Mines v11 — CF-all vs Grandmaster v9.0

**Date:** 2026-07-12  
**Source:** `evolve/counterfactual-all-latest-summary.json` (= `counterfactual-all-v90-summary.json`)  
**AI:** v9.0 (`AI_BUILD` stamped 2026-07-12T20:10:01Z)  
**Method:** `getAIMove` in human seat, `hiddenInfo=true`, `perfectInfo=false`  
**Corpus:** 97 completed 1v1 play-logs · 787 human actions · **matchRate 61.37%** (483 match / 304 differ)

This is a **loss-mining / branch design** note for the v9.1→v11 ladder. It does **not** claim any dual gate, probe, or ship outcome.

---

## 1. Differ landscape (aggregate)

| Pattern | N | % of 304 differs | Interpretation |
|---------|--:|----------------:|----------------|
| `combatDiffer` | **188** | 61.8% | Majority of mistakes are mid-trick contest choices |
| `freeLeadDiffer` | **116** | 38.2% | Open-lead multi vs trash / length |
| `classDisagree` | **202** | 66.4% | Different action *class* (not just card id) |
| `multiVsSingle` | **71** | 23.4% | One side multi, other single |
| `humanTwoAltNot` | **33** | 10.9% | Human burns a 2; AI does not |
| `humanPassAltPlay` | **33** | 10.9% | Human **passes**; AI **plays** |
| `altTwoHumanNot` | **13** | 4.3% | AI burns 2; human does not |
| `humanPlayAltPass` | **0** | 0% | AI **never** passes when human plays |

**Hard asymmetry:** AI is strictly more aggressive in combat than humans on this corpus (`humanPlayAltPass=0`). Humans fold mid multi / mid singles; AI almost always contests.

### Free-lead vs combat split

- Combat differs dominate (~2:1). Hidden-info CF mostly hits **best-response-det / expert-ish combat**, not perfect-info free-lead soft root — so combat policy + BR + combat soft (when perfect-info on ladder) are the high-leverage levers.
- Free-lead differs still matter for structure: humans often trash-shed or short multi; AI multi-always / long multi.

### `classDisagreeTop` (human → AI) — top pairs among *all* differs

Note: pairs with identical labels (e.g. `triple→triple`) mean **same class, different cards** (ordering / minimal-beat / structure). Cross-class pairs are true class disagreements.

| Rank | Pair (human→AI) | N | Theme |
|-----:|-----------------|--:|-------|
| 1 | `triple→triple` | 28 | Wrong triple / seq-3 selection |
| 2 | `single_mid→single_mid` | 24 | Wrong mid single beat |
| 3 | `pair→pair` | 23 | Wrong pair among legal pairs |
| 4 | `pass→pair` | 22 | Human folds; AI plays pair |
| 5 | `single_trash→pair` | 20 | Human trash free-lead; AI pair |
| 6 | `single_two→single_mid` | 17 | Human spends 2; AI mid answer |
| 7 | `single_trash→single_mid` | 16 | Trash vs mid single choice |
| 8 | `single_trash→single_trash` | 15 | Wrong trash card |
| 9 | `single_mid→single_trash` | 14 | AI dumps lower than human mid |
| 10 | `bomb_or_long→triple` | 12 | Human long/bomb; AI triple |
| 11 | `triple→pair` | 10 | Human triple; AI pair |
| 12 | `bomb_or_long→bomb_or_long` | 10 | Wrong long multi |
| 13 | `single_high→single_mid` | 10 | Human A/K; AI mid |
| — | `pass→triple` | 7 | Fold vs contest triple |
| — | `single_two→single_high` | 7 | 2 vs high single |
| — | `pair→bomb_or_long` | 7 | Short multi vs long lead |

Differ samples (from summary) confirm free-lead examples: human `pair` vs AI length-4 multi; human `single_trash` vs AI length-5 seq — classic multi-always over-shed.

---

## 2. Top 5 loss patterns (ranked by frequency)

### P1 — Combat over-contest / missing pass discipline (largest)

**Evidence:** `combatDiffer=188`; `pass→pair=22` + `pass→triple=7` + other pass→*; `humanPassAltPlay=33`; `humanPlayAltPass=0`.

**Mechanism today:**
- `expertPolicy` almost always plays when any legal remains; soft-pass is narrow:
  - `search.js` ~L451: `if (handLen >= 9 && curTop < 10 && omin >= 6) return { pass: true }; // v8.7 contest more`
- `cheapLegals` path **never** passes once a non-2/non-bomb beat exists (`enforcePolicyGuards`, `shouldPassStrategically` in `ai.js`).
- Combat soft root (`search.js` ~L2730+) only runs under **perfect-info**; CF is hidden-info so it does not rescue imitation; ladder strength still uses it.
- BR root scoring (`bestResponseMove`) multiTie only on free-lead — no pass-preference tie-break in combat.

**Why it hurts strength (not just imitation):** Contesting mid pairs/triples with structure-breaking answers leaves trash and dead control; humans reclaim with 2s and multi free-leads (historical #43–#72 lesson still echoes in pass→pair).

### P2 — Free-lead multi-always vs human trash / short multi

**Evidence:** `freeLeadDiffer=116`; `multiVsSingle=71`; `single_trash→pair=20`; samples: trash vs `bomb_or_long`, pair vs length-4.

**Mechanism today:**
- `pickFreeLeadHard` ~L539–603: **multi-always** when any non-expensive multi exists; hybrid trash only when `_exploitFlMode === 'hybrid'` and multi top > 6.
- Free-lead soft root (v8.7) already demotes long multi early (`hybridB` for length≥4) — but hidden CF and many rollout paths still use multi-always expert.
- BR `multiTie = 0.003 * min(10, act.length)` (v9.0) and exploit `multiBonus` mildly reward **longer** multi.

### P3 — Same-class micro-selection (structure / minimal beat)

**Evidence:** `triple→triple=28` + `pair→pair=23` + `single_mid→single_mid=24` ≈ **75** differs without class change.

**Mechanism today:**
- `orderLegals` = sort by `expertScore` only.
- Combat `expertScore` uses `topRank * 0.85` + light gap penalty; `structureBreakCost` helps but often ties between two legal pairs/triples.
- Cheap path returns `orderLegals(cheap)[0]` — first ordered legal, not BR among near-ties when search budget is tiny (CF: ~40ms / 28 iters).

### P4 — 2-tempo mismatch (human burns 2 more often)

**Evidence:** `humanTwoAltNot=33`; `single_two→single_mid=17`; `single_two→single_high=7`; opposite `altTwoHumanNot=13`.

**Mechanism today:**
- Ace+2 and K-only-high paths exist in `expertPolicy` / `enforcePolicyGuards` (v7+).
- Tight 2-tempo vs mid tops only when `omin≤2` and `curTop∈[8,10]` (~L374–386).
- Humans still spend 2s earlier (mid climb / reclaim) more than AI; residual under-burn when holding trash + need lead back.

### P5 — Long multi / bomb timing (length selection)

**Evidence:** `bomb_or_long→triple=12`; `bomb_or_long→bomb_or_long=10`; `pair→bomb_or_long=7`; `triple→bomb_or_long=5`.

**Mechanism today:**
- Free-lead prefers longer unanswerable multi (good) but also sorts multi by length when tops are close (`pickFreeLeadHard` pool sort).
- `multiBonus` / win multi bonus in `exploitMove` and BR `multiTie` length term push longer plays even when not locking.
- Humans prefer **pair/triple volume** early; long seq later or only when lock.

---

## 3. Code anchors (current v9.0)

| Lever | File | Location (approx) | Role |
|-------|------|-------------------|------|
| Expert combat / soft-pass | `search.js` | `expertPolicy` L335–457 | Rollouts + fallback combat |
| Free-lead hard | `search.js` | `pickFreeLeadHard` L504–631 | Multi-always / hybrid |
| Free-lead candidates | `search.js` | `freeLeadCandidates` L460–494 | MC/MCTS/BR root set |
| Ordering / structure | `search.js` | `expertScore` L231–323, `structureBreakCost` L139–169 | Micro-selection |
| BR multiTie | `search.js` | ~L1006–1008 | Soft free-lead length bias |
| Exploit multiBonus / lock | `search.js` | `exploitMove` L1215–1272 | Perfect-info root scoring |
| leafEval race | `search.js` | `leafEval2p` L1414–1438 | Soft race signal |
| Free-lead soft root | `search.js` | ~L2596–2727 | Hybrid trash when no forced win |
| Combat soft root | `search.js` | ~L2730– | Pass + cheap answers ranking |
| Pass genome / expert | `ai.js` | `shouldPassStrategically` L366–405 | Expensive-only pass |
| Free-lead guard | `ai.js` | `forceMultiFreeLead` / `pickFreeLead` L482–529 | Post-search free-lead |
| Search entry | `ai.js` | `getAIMove` L813–1008 | Guards after search |

---

## 4. Candidate branches (concrete edits)

Each branch is isolated for parallel probes (N=25–50 dual vs freeze). Prefer **one primary lever per branch**. Expected risk is relative to current v9.0 ladder speed / strength.

### Branch A — **Combat pass discipline** (targets P1)

**Hypothesis:** Prefer human-like folds on mid multi when hand is deep and opp is not short → fewer structure breaks, better reclaim windows.

**`search.js` — `expertPolicy` soft-pass (expand fold window):**

Current:
```js
// v8.5: only soft-pass when opp is not short (short opp → contest expensive answers)
if (handLen >= 9 && curTop < 10 && omin >= 6) return { pass: true }; // v8.7 contest more
if (handLen >= 8 && curTop < 10 && omin <= 3 && leg.length) {
  return { play: orderLegals(leg, state, cp)[0] };
}
```

Proposed replacement:
```js
// v9.1 combat pass: fold mid multi/pair answers when deep + opp not short
// (CF: pass→pair 22, humanPassAltPlay 33; AI never humanPlayAltPass)
if (handLen >= 8 && omin >= 5 && curTop < 9) {
  var onlyMultiAns = leg.every(function (p) { return p.length >= 2; });
  var midPairAns = cur.type === 'pair' || cur.type === 'triple' || cur.type === 'seq';
  if (onlyMultiAns || midPairAns) {
    // Prefer pass over breaking structure midgame
    if (handLen >= 9 || infoC.trashCount >= 2) return { pass: true };
  }
}
if (handLen >= 9 && curTop < 10 && omin >= 6) return { pass: true };
if (handLen >= 8 && curTop < 10 && omin <= 3 && leg.length) {
  return { play: orderLegals(leg, state, cp)[0] };
}
```

**`search.js` — combat soft root: allow pass earlier with cheap present (structure-preserving fold):**

In combat soft root (~L2752–2755), change:
```js
var cAllowPass = cCheap.length === 0 ||
  (state.players[myIdx].hand.length >= 9 && oppMinHand(state, myIdx) >= 5);
```
to:
```js
var cAllowPass = cCheap.length === 0 ||
  (state.players[myIdx].hand.length >= 8 && oppMinHand(state, myIdx) >= 5 &&
   cur.top && cur.top.rank < 9) ||
  (state.players[myIdx].hand.length >= 9 && oppMinHand(state, myIdx) >= 5);
```

And in combat soft scoring loop, add mild pass prior when residual structure improves:
```js
// after computing leaf for pass (cact==null):
if (cact == null) score += 0.012; // v9.1 mild fold prior (CF humanPassAltPlay)
```

**`ai.js` — optional:** do **not** change `shouldPassStrategically` cheap-force yet (high risk). Only if Branch A probe wins, consider allowing pass when all cheap answers break a pair (`structureBreakCost≥8`) and `handLen≥9` and `omin≥6`.

| Risk | Level | Notes |
|------|-------|-------|
| Speed hang | **Low** | Policy-only + existing soft root |
| Strength | **Med** | Can throw wins by folding when should contest short races; gate with omin≥5 |

---

### Branch B — **Hybrid free-lead default (trash / short multi)** (targets P2 + P5)

**Hypothesis:** Early free-lead should prefer trash singles and pairs over long multi when no lock / no forced win — matches CF `single_trash→pair` and long multi over-sheds.

**`search.js` — `pickFreeLeadHard` multi-always block (~L549–603):**

After multi exists, **before** lowMulti pool return, insert early hybrid (not only `_exploitFlMode === 'hybrid'`):
```js
// v9.1 free-lead: early trash/short-multi preference (CF single_trash→pair 20)
if (
  trashPlays.length >= 1 &&
  handLen >= 10 &&
  info.hasControl &&
  multiPick /* will be computed below — apply after multiPick exists */
) {
  /* see integrated block below */
}
```

Integrated replacement for the multi-pick tail (from `// v7.5 multi-always core`):
```js
// v7.5 multi-always core + mild length preference among low multi
var lowMulti = multi.filter(function (p) { return topRank(p) <= 8; });
var shortMulti = multi.filter(function (p) {
  return p.length >= 2 && p.length <= 3 && topRank(p) <= 8;
});
var pool = shortMulti.length ? shortMulti : (lowMulti.length ? lowMulti : multi);
pool = pool.slice().sort(function (a, b) {
  var la = a.length, lb = b.length;
  var ta = topRank(a), tb = topRank(b);
  // Prefer length 2–3 over longer when tops close
  if (Math.abs(ta - tb) <= 1) {
    var sa = la <= 3 ? la : 10 - la;
    var sb = lb <= 3 ? lb : 10 - lb;
    if (sa !== sb) return sb - sa;
  }
  return expertScore(a, state, cp) - expertScore(b, state, cp);
});
var multiPick = pool[0];
// Hybrid trash: early + control + multi not locking low
if (
  trashPlays.length >= 1 &&
  handLen >= 10 &&
  (info.twos >= 1 || info.control >= 2) &&
  multiPick &&
  (topRank(multiPick) > 6 || multiPick.length >= 4)
) {
  return trashPlays[0];
}
if (
  _exploitFlMode === 'hybrid' &&
  trashPlays.length >= 2 &&
  (info.twos >= 1 || info.control >= 2) &&
  handLen >= 7 &&
  multiPick &&
  topRank(multiPick) > 6
) {
  return trashPlays[0];
}
return multiPick;
```

**`search.js` — BR multiTie invert length bias for free-lead:**

Current:
```js
if (act && act.length >= 2 && !cur) multiTie = 0.003 * Math.min(10, act.length); // v9.0 multiTie
```

Proposed:
```js
// v9.1 multiTie: prefer pair/triple volume, not max length (CF bomb_or_long vs pair/triple)
if (act && act.length >= 2 && !cur) {
  var L = act.length;
  multiTie = 0.004 * (L <= 3 ? L : Math.max(0, 6 - L)); // peak at 3, demote long
  if (topRank(act) <= 7) multiTie += 0.0015;
}
```

**`search.js` — exploit multiBonus (~L1217–1220):**

Current mild length growth; change to:
```js
if (act && act.length >= 2 && !cur) {
  var trM = topRank(act);
  multiBonus = 0.014;
  if (act.length === 2) multiBonus += 0.006;
  else if (act.length === 3) multiBonus += 0.008;
  else if (act.length === 4) multiBonus += 0.002;
  else multiBonus -= 0.004 * (act.length - 4); // demote long free-leads
  if (trM <= 7 && act.length >= 2 && act.length <= 3) multiBonus += 0.005;
}
```

| Risk | Level | Notes |
|------|-------|-------|
| Speed hang | **Low** | Sort/score only |
| Strength | **Med-High** | Can miss locking long multi; unanswerable path still first in pickFreeLeadHard |

---

### Branch C — **Minimal-beat + structure ordering** (targets P3)

**Hypothesis:** Among same-class combat answers, prefer lowest top and lowest `structureBreakCost` more aggressively — reduces `pair→pair` / `triple→triple` / `single_mid→single_mid` noise and bad structure breaks.

**`search.js` — `expertScore` combat branch (~L293–314):**

Strengthen gap + structure:
```js
} else {
  score += topRank(play) * 1.15; // was 0.85 — stronger minimal beat
  score += play.length * 0.1;
  var curTop = cur.top ? cur.top.rank : 0;
  // ... existing usesTwo / bomb blocks ...
  if (cur.type === 'single' && com.type === 'single') {
    var gap = com.top.rank - cur.top.rank;
    if (gap > 1 && !usesTwo) score += gap * 1.2; // was gap>2 * 0.8
  }
  // Prefer answers that do not break pairs/triples (CF pair→pair / triple→triple)
  score += structureBreakCost(hand, play) * 0.8; // extra on top of base *2.2
  if (com.type === 'pair' || com.type === 'triple') {
    score += topRank(play) * 0.25; // among multi answers, lower top
  }
}
```

**`search.js` — `orderLegals` stable secondary key (optional):**

```js
function orderLegals(legals, state, myIdx) {
  return legals.slice().sort(function (a, b) {
    var sa = expertScore(a, state, myIdx);
    var sb = expertScore(b, state, myIdx);
    if (sa !== sb) return sa - sb;
    var ta = topRank(a), tb = topRank(b);
    if (ta !== tb) return ta - tb;
    return a.length - b.length;
  });
}
```

| Risk | Level | Notes |
|------|-------|-------|
| Speed hang | **None** | Ordering only |
| Strength | **Low-Med** | Usually safe; can under-climb when climb is needed vs omin=1 (climb path still separate) |

---

### Branch D — **2-tempo reclaim** (targets P4)

**Hypothesis:** When holding a 2 and residual trash, contest K/high mid more often so humans cannot Ace-climb for free — without dumping 2s on junk.

**`search.js` — `expertPolicy` after Ace+2 block (~L373–386), broaden:**

Current tight block only `omin≤2`. Add:
```js
// v9.1: reclaim 2 vs K / high mid when we still hold trash (CF humanTwoAltNot 33)
if (
  cur.type === 'single' &&
  curTop >= 9 &&
  curTop <= 10 &&
  twoSingles.length &&
  handLen >= 4 &&
  handLen <= 10 &&
  infoC.trashCount >= 1 &&
  (infoC.twos >= 1 || omin <= 4)
) {
  // Prefer 2 over pure Ace climb if only high non-2 remain
  var non2hi = [];
  for (var qi = 0; qi < leg.length; qi++) {
    if (leg[qi].length === 1 && leg[qi][0].rank >= 10 && leg[qi][0].rank < 12)
      non2hi.push(leg[qi]);
  }
  var cheapMid = cheapLegals(leg).filter(function (p) {
    return p.length === 1 && p[0].rank < 10;
  });
  if (!cheapMid.length && (non2hi.length || curTop >= 10)) {
    twoSingles.sort(function (a, b) { return a[0].suit - b[0].suit; });
    return { play: twoSingles[0] };
  }
}
```

**`search.js` — `enforcePolicyGuards` combat 2 path:** keep Ace≥11 hard force; optionally when `curTop===10` and proposed is Ace while 2 legal and `handLen>=4` and `trashCount>=1`, rewrite proposed to 2 (mirror expert).

**Do not:** burn 2 on `curTop < 8` (historical over-spend risk).

| Risk | Level | Notes |
|------|-------|-------|
| Speed hang | **None** | |
| Strength | **Med** | Over-burn 2s loses endgames; keep trashCount + rank gates |

---

### Branch E — **leafEval / BR race + multi soft (combo)** (targets P1 residual + P2)

**Hypothesis:** Soft scores undervalue card race and overvalue long multi; small leafEval + multiTie co-tune helps BR without hang.

**`search.js` — `leafEval2p` (~L1426):**
```js
var e = 0.5 + (oppLen - myLen) * 0.055; // was 0.05 — slightly sharper race
e += (info.twos - oinfo.twos) * 0.06;
e += (info.control - oinfo.control) * 0.03; // was 0.025
e += (oinfo.trashCount - info.trashCount) * 0.018; // was 0.015
// NEW: penalize holding many cards while leading poorly
if (myLen >= 8 && oppLen <= myLen - 2) e -= 0.02;
```

**`search.js` — BR combat pass action scoring:** when `act==null` and combat, add:
```js
var passTie = 0;
if (act == null && cur) {
  var ominR = oppMinHand(state, myIdx);
  var hLen = state.players[myIdx].hand.length;
  if (hLen >= 9 && ominR >= 5) passTie = 0.008; // mild fold bias in BR
}
var score = rate + multiTie + passTie;
```

| Risk | Level | Notes |
|------|-------|-------|
| Speed hang | **Low** | Same BR trials |
| Strength | **Med** | leafEval changes diffuse; probe carefully vs freeze |

---

## 5. Recommended probe order (top 3 branches)

| Priority | Branch | Primary files | Probe focus | Why first |
|----------|--------|---------------|-------------|-----------|
| **1** | **A — Combat pass** | `search.js` `expertPolicy` + combat soft pass prior | Dual N=50 vs v9.0 freeze; watch mid-pair folds | Largest CF mass (188 combat + 33 pass disagreements); AI never folds when human plays |
| **2** | **B — Hybrid free-lead + multiTie** | `pickFreeLeadHard`, multiTie, multiBonus | Dual N=50; free-lead-heavy seeds + seed 20799253 trash-single | 116 free-lead differs + multiVsSingle 71; unanswerable multi still protected first |
| **3** | **C — Minimal-beat structure** | `expertScore` combat + `orderLegals` | Dual N=50; cheap; stack with A if A wins | 75 same-class differs; lowest hang risk; good stack after A/B |

**Defer / stack later:** Branch D (2-tempo) after A/B — interacts with pass discipline. Branch E only as polish if A/B/C plateaus.

### Probe checklist (no gate claims)

1. `node test-search.js` (full pass)
2. Spot: seed `20799253` free-lead trash still preferred when multi loses
3. Dual continuous N=25–50 vs current freeze (primary seed `20260711`)
4. CF-all refresh only after a dual edge; track `humanPassAltPlay` ↓ and `freeLeadDiffer` ↓ without collapsing match on forced contest positions
5. Hang budget: browser free-lead ≤800ms, combat soft ≤700ms (existing caps)

---

## 6. Explicit non-claims

- CF match rate is **imitation**, not win rate. Matching humans more does not prove ladder strength.
- No dual gate, no v9.1 ship, no freeze comparison is asserted here.
- Perfect-info soft roots do not run under CF (`hiddenInfo=true`); combat/free-lead expert + BR still do — branches A–C affect both paths.

---

## 7. Source numbers (copy)

```
completedGames=97 totalHumanActions=787 match=483 differ=304 matchRate=0.6137
differPatterns:
  humanTwoAltNot=33 altTwoHumanNot=13
  humanPassAltPlay=33 humanPlayAltPass=0
  freeLeadDiffer=116 combatDiffer=188
  multiVsSingle=71 classDisagree=202
```

Artifacts:
- `/Users/johnhoang/Developer/Grok/tieng-len/evolve/counterfactual-all-latest-summary.json`
- `/Users/johnhoang/Developer/Grok/tieng-len/evolve/counterfactual-all-v90-summary.json`
- Code: `/Users/johnhoang/Developer/Grok/tieng-len/search.js`, `/Users/johnhoang/Developer/Grok/tieng-len/ai.js`
