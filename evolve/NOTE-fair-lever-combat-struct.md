# Fair dual lever — combat residual structure soft-tie (ONE AXIS)

**Date:** 2026-07-14  
**Protocol:** hidden · GM both · **BR ON both** · equal budget · freeze **v9.1**  
**Status:** design only — do **not** mutate freeze `policies/v91-*.js`; do **not** permanently overwrite live `ai.js`/`search.js` without a clear note. Prefer `policies/custom-*.js` under CHALL.

---

## 0. Context (from notes)

| Note | Takeaway |
|------|----------|
| `NOTE-hidden-ladder-human-levers.md` | Primary lever #1 = **combat residual structure soft-tie** (+ gated fold later). CF: combatDiffer 188; residual 186:48 human-better. Reject hollow BR density alone. |
| `NOTE-fair-br-both.md` | Freeze without BR is unfair. Ship duals: BR both, equal budgets. Identity live≡freeze → ~0.50. |
| `NOTE-gold-status-honest.md` | Live expert is pure v91 cheap/min-top; bulk gold structure restore cliffs dual. Prefer micro BR-path ties over series-3 bulk. |
| `NOTE-fair-v91-next-rung.md` | Lever #1 locus = `bestResponseMove` combat score (multiTie free-lead-only today). Not bulk `expertPolicy`. |

**Critical fair-dual constraint:** both seats run BR. Any patch that lands in the freeze body cancels on dual. Lever must live in **CHALLENGER only**.

---

## 1. Locus audit — `structureBreakCost` + BR combat score

### 1.1 `structureBreakCost` — identical freeze vs live

| File | Lines |
|------|------:|
| `policies/v91-search.js` | 139–179 |
| `search.js` (live) | 139–179 |

Behavior (unchanged by this lever):

- Pair split into single: +8 / +5  
- Triple partial break: +4  
- Sequence link holes: +3 / +1  
- Single from pair: **+12**  
- Single interior run: **+10**; edge: **+4**

Used today by:

- `expertScore` base: `score += structureBreakCost(hand, play) * 2.2` (~L258)  
- Combat singles smash: if `sbc >= 8` → extra `+18 + sbc*0.5` (~L323–328)  
- **Not** used in `bestResponseMove` rate ranking

### 1.2 `bestResponseMove` combat path — identical freeze vs live

| File | Function | Score assembly |
|------|----------|----------------|
| `policies/v91-search.js` | L949–1069 | L1042–1054 |
| `search.js` | L949–1069 | L1042–1054 |

**Combat cand filter** (`cur` truthy) ~L996–999:

```js
} else {
  var ch = cheapLegals(leg);
  if (ch.length) leg = ch;
  leg = orderLegals(leg, state, myIdx);
}
```

**Score today** (free-lead soft-tie only):

```js
var rate = wins / nTry;
var multiTie = 0;
if (act && act.length >= 2 && !cur) {
  multiTie = 0.005 * Math.min(10, Math.max(0, 8 - act.length) + 2); // v9.1 short multi
}
var score = rate + multiTie;
```

| Path | Soft-tie today |
|------|----------------|
| Free-lead (`!cur`) | short-multi `multiTie` only |
| **Combat (`cur`)** | **none** — pure win-rate; structure only via cand order (`orderLegals`) and playout leaf noise |
| Pass (`act == null`) | no multiTie |

**Caller combat trials** (Node defaults, `brTrials` unset): freeBR ? 96 : **56** (~L2885–2910).  
**Lean fair dual:** `brTrials: 12`, `timeMs: 120`, `strongSelf: false` — both seats equal.

### 1.3 What already exists and is **out of scope**

| Prior art | Where | Why not this lever |
|-----------|-------|--------------------|
| Free-lead residual multiTie (v93/v94) | `multiTie` under `!cur` only | Free-lead axis; dual-flat once freeze has it |
| Combat denser trials (56→80/96) | caller `brTrials` | Hollow under equal-BR dual (both get density) |
| Bulk `expertScore` structure weights | expertScore combat | Gold/dual reg risk; not BR residual |
| Gated fold / combat pass prior | expertPolicy / soft root | **Second axis** — defer after this probe |

---

## 2. ONE-AXIS design

### Name
**Combat residual structure soft-tie** (`COMBAT_STRUCT_TIE`)

### Intent
Among **near-equal BR win-rates** in combat, prefer answers that:

1. Leave **residual pairs / trips / seq≥3** after the play, and  
2. Have **lower `structureBreakCost`** (loose beats over pair/run smashes).

Does **not**:

- Change free-lead multiTie  
- Change combat trial density / maxBranch  
- Change `expertScore` / `orderLegals` / `structureBreakCost` formula  
- Boost pass via residual (no gated fold)  
- Touch `ai.js`

### Why it survives fair dual
Both seats already run combat BR with the same trials/budget. Ranking quality among near-rate combat answers is pure **policy skill**. Freeze v91 has zero combat soft-tie → CHALL-only delta is real.

### Why CHALLENGER only
If the patch is written into `policies/v91-search.js` (or live later stamped as freeze), identity dual cancels. Ship path:

1. **Probe:** `policies/custom-search.js` + `policies/custom-ai.js` (v91 fork + one block)  
2. **Test:** `FREEZE=v91 CHALL=custom … lean-fair-dual-n20.js`  
3. **Ship later:** stamp into next freeze body only after fair N50 clears — not into freeze v91.

---

## 3. Exact code change

### 3.1 File
`policies/custom-search.js` — copy of `policies/v91-search.js`, **one** edit in `bestResponseMove` score assembly (~L1042–1054).

Also: `policies/custom-ai.js` — copy of `policies/v91-ai.js` with:

```js
const AI_BUILD = {
  id: "custom-combat-struct",
  stamped: "2026-07-14T00:00:00Z",
  label: "Probe: combat residual structure soft-tie"
};
// ...
const searchMod = _isNodeCjs
  ? require('./custom-search.js')
  : (typeof window !== 'undefined' ? window.TienLenSearch : null);
```

### 3.2 Replace score block

**Before (v91 / live):**

```js
      var rate = wins / nTry;
      // Soft multi free-lead tie-break among equal rates
      // Prefer short multi (pair/triple) over long dumps — CF multiVsSingle / short-multi
      var multiTie = 0;
      if (act && act.length >= 2 && !cur) {
        multiTie = 0.005 * Math.min(10, Math.max(0, 8 - act.length) + 2); // v9.1 short multi
      }
      var score = rate + multiTie;
      details.push({ sig: playSig(act), rate: rate, n: nTry, score: score });
```

**After (custom only):**

```js
      var rate = wins / nTry;
      // Soft multi free-lead tie-break among equal rates
      // Prefer short multi (pair/triple) over long dumps — CF multiVsSingle / short-multi
      var multiTie = 0;
      if (act && act.length >= 2 && !cur) {
        multiTie = 0.005 * Math.min(10, Math.max(0, 8 - act.length) + 2); // v9.1 short multi
      }
      // COMBAT_STRUCT_TIE (one-axis): combat residual structure soft-tie.
      // Only when facing a combo + playing (not pass). Magnitude << 1/trials so
      // only near-equal rates flip. Free-lead multiTie untouched.
      var combatStructTie = 0;
      if (act && cur) {
        var sbcC = structureBreakCost(hand, act);
        var usedC = Object.create(null);
        var uiC, hiC, rC;
        for (uiC = 0; uiC < act.length; uiC++) {
          usedC[act[uiC].rank * 4 + act[uiC].suit] = 1;
        }
        var byRC = Object.create(null);
        for (hiC = 0; hiC < hand.length; hiC++) {
          if (!usedC[hand[hiC].rank * 4 + hand[hiC].suit]) {
            byRC[hand[hiC].rank] = (byRC[hand[hiC].rank] || 0) + 1;
          }
        }
        var pairR = 0, tripR = 0, maxRun = 0, run = 0;
        // Ranks 0..11 (3..A); exclude 2s from run spine (2 is control, not seq)
        for (rC = 0; rC <= 11; rC++) {
          var cntC = byRC[rC] || 0;
          if (cntC >= 2) pairR++;
          if (cntC >= 3) tripR++;
          if (cntC > 0) {
            run++;
            if (run > maxRun) maxRun = run;
          } else {
            run = 0;
          }
        }
        // Residual multi structure (prefer keep pairs/trips/seq after beat)
        combatStructTie += 0.003 * Math.min(3, pairR);
        if (tripR >= 1) combatStructTie += 0.002;
        if (maxRun >= 3) combatStructTie += 0.002 + 0.001 * Math.min(2, maxRun - 3);
        // Penalize structure-breaking answers (reuse structureBreakCost, soft scale)
        combatStructTie -= 0.0005 * Math.min(24, sbcC);
      }
      var score = rate + multiTie + combatStructTie;
      details.push({
        sig: playSig(act),
        rate: rate,
        n: nTry,
        score: score,
        combatStructTie: combatStructTie
      });
```

### 3.3 Magnitude contract

| Trials (lean dual) | Rate quantum `1/n` | Max `|combatStructTie|` (design) |
|-------------------:|-------------------:|----------------------------------:|
| 12 | ≈0.083 | ≈0.003×3 + 0.002 + 0.004 − 0 ≈ **0.015** |
| 56 (ship Node combat) | ≈0.018 | same **~0.015** (can break ±0–1 win ties) |

- Always-on additive term (same pattern as free-lead `multiTie`) — no explicit `if (|rateA−rateB| < ε)` gate needed; rate dominates.  
- **Pass** (`act == null`): `combatStructTie = 0` — does not invent folds.  
- Cap sbc penalty at 24 → max break drag ≈ 0.012 (still soft).

### 3.4 What not to change in the same probe

- `structureBreakCost` body  
- `expertScore` weights  
- combat `brTrials` / `maxBranch`  
- free-lead residual multiTie (v93 style)  
- gated fold / `allowPass` expansion  
- live `search.js` / `ai.js` (unless temporary probe with STATUS note)

---

## 4. How to test

### 4.1 Scaffold custom challenger

```bash
cd /Users/johnhoang/Developer/Grok/tieng-len
cp policies/v91-search.js policies/custom-search.js
cp policies/v91-ai.js policies/custom-ai.js
# 1) Edit custom-search.js: insert COMBAT_STRUCT_TIE block (section 3.2)
# 2) Edit custom-ai.js: AI_BUILD id + require('./custom-search.js')
```

### 4.2 Identity control (sanity)

```bash
FREEZE=v91 CHALL=v91 GAMES=20 SEED=20260711 \
  node evolve/lean-fair-dual-n20.js
# Expect liveWinRate ≈ 0.50 (noise). Record liveWins + lossSeeds.
```

### 4.3 Lever N20 (fair dual)

```bash
FREEZE=v91 CHALL=custom GAMES=20 SEED=20260711 \
  OUT=lean-fair-custom-combat-struct-n20.json \
  node evolve/lean-fair-dual-n20.js
```

Harness already sets both seats:

- `difficulty: grandmaster`, `hiddenInfo: true`, `perfectInfo: false`  
- `bestResponse: true`, `brTrials: 12`, `timeMs: 120`  
- `strongSelf: false`, equal everything  

**Promote interest only if** `liveWins >= identity.liveWins + 1` (noise floor).

### 4.4 Optional seed-duel / LOG_GAMES (before N20 if desired)

Targets: mid-combat residual roots (not structural unflippable `20380387`).  
Pass smoke: ≥1 root play/sig flip vs freeze v91 on a combat decision where both rates were near-tied and CHALL picks lower-sbc / higher residual.

Env knobs (if using longer budget for debug only — **not** ship gate):

```bash
MS=250 TRIALS=24 FREEZE=v91 CHALL=custom GAMES=5 node evolve/lean-fair-dual-n20.js
```

### 4.5 Ship gate (later, not this design step)

N50 × 2 under fair dual: WR **>0.70** and **≥ identity +2** wins same seed0; gold series 1–3 not regressed beyond locked policy.

---

## 5. Gold risk

| Risk | Level | Why |
|------|-------|-----|
| Gold series 1–3 bulk | **Low** | BR root ranking only; expert path / gold assertions on cheap min-top unchanged |
| Loose-beat vs pair-smash (0498–0505) | **Helps or neutral** | Soft prefers lower `structureBreakCost` among near-rate BR answers |
| Residual maxRun same-len seq (0503 / 0520) | **Helps when BR rates tie** | `maxRun ≥ 3` residual term |
| Plan-pass QQ / QKA / 22 (0501, 0510, 0511) | **None** | Pass not boosted; no gated fold in this axis |
| Dual cliff (series-3 style) | **Low** | Soft-tie magnitude cannot override clear rate gaps |
| Over-prefer residual multi that loses race | **Med-Low** | If rates truly equal, residual multi is usually human-aligned; watch N20 lossSeeds |
| Hang / wall-clock | **Negligible** | O(hand) residual scan once per action, not per trial |

**Do not** widen this probe into:

- `handLen≥9 && omin≥5` combat pass prior (gated fold = next axis)  
- bulk inflated `structureBreakCost` in expertScore  
- series-2 multi-always / doubleseq free-lead force  

Those are gold-fragile and dual-cliffy (`NOTE-gold-status-honest.md`, series-3 bulk).

---

## 6. Accept / reject criteria (probe)

| Result | Action |
|--------|--------|
| Identity N20 ~0.50, custom N20 ≥ identity +1, ≥1 residual combat flip | Interest → optional denser seed-duel → N50 fair ship gate |
| Custom N20 ≤ identity (flat/reg) | **Reject axis weight** or retune magnitude once; do not stack free-lead residual or trial density |
| Flips only via budget/env, not structure term | Reject as hollow |

---

## 7. Summary (execute order)

1. **Fork** v91 → `custom-ai.js` / `custom-search.js`  
2. **One block** in `bestResponseMove`: combat residual structure soft-tie (`act && cur`)  
3. **Identity** `CHALL=v91` N20 → baseline  
4. **Lever** `CHALL=custom` N20 fair dual vs freeze v91  
5. **No** live permanent overwrite until ship stamp; keep analysis under `evolve/`

**Axis name:** `COMBAT_STRUCT_TIE`  
**Locus:** `bestResponseMove` score, combat only  
**Seat:** CHALLENGER only (`CHALL=custom`)  
**Gold risk:** low (BR soft-tie; no pass, no expert bulk)
