# Fair dual — next one-axis levers **after** p_mbtwo

**Date:** 2026-07-13  
**Protocol (locked):** hidden · GM both · BR ON both · equal budget · BOTH_SEATS  
**Identity v91:** 25/50 = 0.50  
**Best probe p_mbtwo:** s11 **30/50 (+5)**, s12 **26/50 (+1)**, s13 **28/50 (+3)** · abs max **0.60** ≪ ship **WR>0.70 AND identity+2 durable**  
**Forbidden:** SoftN · perfect-info duals (hollow)

### Sources skimmed
| Artifact | Takeaway |
|----------|----------|
| `/Users/johnhoang/Downloads/tienlen-playlogs-1783931122937.json` | 158 vsAI games; newest stamp v9.2 GM; human seat 0 |
| `evolve/playlog-strategy-inference.json` | pure v9.1 expert vs human: 1218 dec, exact 64.8%; residual hBetter **186** / eBetter **48**; top class mass: H_play_E_pass 76, H_overkill 59, H_2_E_non2 53, E_longer_multi 47, H_minimal_beat 42, H_single_E_multi 38, H_pass_E_play 30, H_trash_first 13 |
| `evolve/HUMAN-LOSS-MINES-v11.md` | CF combatDiffer 188 · freeLeadDiffer 116 · multiVsSingle 71 · humanPassAltPlay 33 · humanTwoAltNot 33 · humanPlayAltPass **0** |
| `evolve/NOTE-fair-human-levers-v91.md` | Rank: (1) combat residual BR soft-tie · (2) FL short/trash · (3) min-beat order · (4) gated fold · (5) 2-tempo |
| `policies/p_mbtwo-search.js` | Package body (challenger) |

---

## p_mbtwo package (already in)

| Axis | Function | Shape |
|------|----------|--------|
| FL hybrid strong | `pickFreeLeadHard` | trash-first when `trash≥1 && (twos\|control) && handLen≥9 && (multiTop>6 \|\| multiLen≥4)` — **not** gated on `_exploitFlMode` |
| Combat residual soft-tie | `bestResponseMove` score | `act && cur`: `multiTie -= min(0.01, sbc*0.0005); +0.0015 if !expensive` |
| orderLegals min-top | `orderLegals` | combat: lower `topRank` then lower `sbc` then `expertScore` |
| TWO_OMIN2 | `expertPolicy` | single 2 vs `curTop∈[7,10]` when `omin≤2`, handLen 4–10 |

## Already tried on/near mbtwo (flat or regressed) — **do not re-probe**

| Probe | Axis | s11 note |
|-------|------|----------|
| `p_mbshort` / short-first BR | FL BR cand length-asc | flat |
| `p_mbpool` / `p_mbtwopair` | pair-first / short pool | mbtwopair **28/50** regress |
| `p_mbtwosbc` / sbc inflate | structureBreakCost weights | flat 30/50 |
| `p_mbtwoaggfl` | earlier trash (handLen≥7) | flat 30/50 |
| `p_mbtwocombat` | stronger combat multiTie | flat 30/50 |
| `p_mbtwopass` | BR passTie | flat 30/50 |
| `p_mbtwofold` | earlier expert fold (`handLen≥10`) | flat 30/50 |
| `p_mbtwoscore` | combat expertScore multi-top bump | flat 30/50 |
| race leafEval, softN, BR density alone | harness / silent | reject |

---

## First-diff insight (why +5 plateaus)

On many residual dual losses, **challenger and freeze never take a different root action** → identical playout → both lose same seat path.

**No-diff examples (shared residual losses, identical playout):**  
`20320549`, `20380387`, `20480117`, `20300603`

Implication: soft ε on near-rate BR ties **only** fire when both cands are scored and rates already near-equal. They do **not** force:
1. **Early free-lead class change** (trash/short vs long multi) when expert multi-always + BR multi-first + `maxBranch=12` starve trash cands.
2. **Cheap-path combat override** when `orderLegals(cheap)[0]` always returns a structure-smashing legal that BR never re-ranks away under equal trials.

Need **hard early gates** on expert free-lead **or** BR **candidate set** **or** cheap-path fold — not more multiTie weight.

**Exclude from ship math:** `20380387` (structural multi-climb trap).

---

## Top 3 **NEW** one-axis levers (not in mbtwo, not in flat list)

Base each probe as **p_mbtwo + ONE axis** (copy `policies/p_mbtwo-search.js` → `p_mbX-search.js`). Fair dual N20 first-diff audit (`LOG_GAMES` / first playSig diverge) before N50.

---

### Lever A — `BR_FL_PIN_TRASH_SHORT` (force free-lead cand divergence)

**Why new:** Short-first *sort* was tried; this is **pin-before-slice**, not a global length sort. Multi-first `mergedBR` + `maxBranch=12` routinely drops trash / short multi so BR never scores human-like opens → no-diff on FL residual seeds.

**Function:** `bestResponseMove` free-lead branch (`!cur` merge, ~1003–1033 in mbtwo)

**Edit shape (~8 lines):** after `mergedBR` is built, **before** length sort / `maxBranch` slice:

```js
// BR_FL_PIN_TRASH_SHORT: force trash + short multi into BR root set
var pins = [];
var infoBr = analyzeHand(hand);
for (var pi = 0; pi < mergedBR.length; pi++) {
  var pp = mergedBR[pi];
  if (isTrashSinglePlay(pp, infoBr)) pins.push(pp);
  else if (pp.length >= 2 && pp.length <= 3 && !playIsExpensive(pp) && topRank(pp) <= 8) pins.push(pp);
}
// de-dupe: pins first (cap 4), then rest of mergedBR
var seenP = {}, pinned = [];
function take(arr, lim) {
  for (var i = 0; i < arr.length && pinned.length < lim; i++) {
    var sg = playSig(arr[i]);
    if (!seenP[sg]) { seenP[sg] = 1; pinned.push(arr[i]); }
  }
}
take(pins, 4);
take(mergedBR, maxBranch);
leg = pinned;
// skip original length-desc sort OR sort only non-pin tail
```

**Risk:** Medium — BR may pick weak trash gifts when omin short (guard: skip pins if `omin≤2`). Cost: 4 extra trials only if they were truncated (usually free within branch cap).

**Expected residual seeds to diverge:** free-lead residual / multi-always losses — `20549928`, `20609766`, deep-hand FL opens in no-diff pack (`20320549` if first lead was long multi under freeze). First-diff should appear at **step 0–2 free-lead**, not mid combat.

**Probe tag:** `p_mbpin` · reject if N20 first-diff rate still ≈0 on residual FL set.

---

### Lever B — `FL_LOW_PAIR_KEEP_HIGH` (expert free-lead hard class change)

**Why new:** Human mass `H_single_E_multi` 38 + playlog “33 vs AA” / low pair open vs high multi; mbtwo hybrid only switches to **trash singles**, not **low pairs**. Pair-first *pool collapse* (`mbtwopair`, all pairs when handLen≥8) regressed — this is **gated residual-high keep**, not bulk pair-only.

**Function:** `pickFreeLeadHard` multi pool (~643–673 in mbtwo), after `pool` built, **before** FL_HYBRID_STRONG

**Edit shape (~8 lines):**

```js
// FL_LOW_PAIR_KEEP_HIGH: dump low pair volume; keep AA/KK/high multi residual
if (handLen >= 9 && multi.length) {
  var byR = info.byRank || {};
  var hasHighPairRes = false;
  for (var hr = 10; hr <= 12; hr++) if ((byR[hr] || 0) >= 2) hasHighPairRes = true;
  var lowPairs = multi.filter(function (p) {
    return p.length === 2 && topRank(p) <= 6;
  });
  if (hasHighPairRes && lowPairs.length) {
    lowPairs.sort(function (a, b) {
      return topRank(a) - topRank(b) || expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    // only intercept if default multiPick spends high top or long multi
    if (multiPick && (topRank(multiPick) >= 9 || multiPick.length >= 4)) {
      return lowPairs[0];
    }
  }
}
```

**Risk:** Low–medium — only when residual high pair exists and default pick is high/long. Dual cliff if gate too wide (`top≤8` or always low pair). Do **not** collapse entire pool to pairs (that was `mbtwopair`).

**Expected residual seeds to diverge:** any deep free-lead where freeze/mbtwo leads AA/KK/long multi while low pair sits — early FL class flip; also helps `E_longer_multi_H_shorter` / `H_single_E_multi` residual. No-diff pack: diverge when seat-0/1 first multi is high package.

**Probe tag:** `p_mblowpair`

---

### Lever C — `CHEAP_SBC_ALL_FOLD` (expert cheap-path structure fold)

**Why new:** `mbtwofold` widened **deep multi soft-pass** (`handLen≥10`); `mbtwopass` scored BR `passTie`. Neither changes the **dominant combat path**: `if (cheap.length) return orderLegals(cheap)[0]` — always plays, even when **every** cheap answer smashes pairs/runs. CF `humanPassAltPlay=33`, `pass→pair=22`; residual 186:48. Hard cheap-path override forces mid-combat first-diff even when BR rates equal under shared expert leaves.

**Function:** `expertPolicy` combat, **replace** bare cheap return (~443–444 mbtwo)

**Edit shape (~8 lines):**

```js
var cheap = cheapLegals(leg);
if (cheap.length) {
  // CHEAP_SBC_ALL_FOLD: if all cheap answers smash structure, fold mid multi/pair
  if (
    handLen >= 9 &&
    omin >= 5 &&
    curTop < 9 &&
    cur.type !== 'single' &&
    !playIsBomb(cur.cards || [])
  ) {
    var minSbc = 1e9, ci;
    for (ci = 0; ci < cheap.length; ci++) {
      var sc = structureBreakCost(hand, cheap[ci]);
      if (sc < minSbc) minSbc = sc;
    }
    if (minSbc >= 8) return { pass: true }; // all cheap break pair/run
  }
  return { play: orderLegals(cheap, state, cp)[0] };
}
```

**Risk:** Medium–high — over-passive dual if `minSbc≥8` too common (pair answers often cost 0). Mitigate: require `minSbc≥10` or `≥12`, and `cur.type` in `{pair, triple, sequence}` only. **Do not** combine with TWO widen or bulk pass bands in same probe.

**Expected residual seeds to diverge:** mid-combat residuals — `20310576`, `20539955`, `20659631`, `20669604`, `20689550`, `20709496` class; any no-diff seed whose first diverge point is structure-breaking pair/triple answer. First-diff at **first contested multi**, not free-lead.

**Probe tag:** `p_mbcheapfold`

---

## Ranked execute order

| Rank | Tag | Axis | First-diff locus | Fair dual skill bet |
|-----:|-----|------|------------------|---------------------|
| **1** | `p_mbpin` | BR_FL_PIN_TRASH_SHORT | free-lead cand set | BR finally sees trash/short → rate can beat long multi |
| **2** | `p_mblowpair` | FL_LOW_PAIR_KEEP_HIGH | expert free-lead hard | human low-pair / keep-high plan |
| **3** | `p_mbcheapfold` | CHEAP_SBC_ALL_FOLD | expert cheap combat | structure fold when cheap always smashes |

### Honorable (defer)
- **FL residual seq-chain sort** in `pickFreeLeadHard` (prefer multi leaving maxRun≥3) — overlaps residual multiTie history; only if pin+lowpair fail.  
- **Combat residual maxRun soft-tie** (+ε residual longest run) — ε-only; weak first-diff vs hard gates.  
- **K-before-2 soft score** — 2-tempo mass already covered by TWO_OMIN2; dual often flat.

### Still reject
SoftN · BR density alone · bulk `expertScore` · series-2 multi-always · reverse H_play_E_pass · hunting `20380387` · perfect-info duals · re-running flat mbtwo* stack.

---

## Probe protocol

```bash
# 1) first-diff smoke (N20 fair, both seats, equal budget) — require ≥1 residual seed first playSig ≠ freeze
FREEZE=v91 CHALL=p_mbpin GAMES=20 SEED=20260711 \
  node evolve/lean-fair-dual-n20.js   # + LOG first-diff if available

# 2) interest: liveWins ≥ identity +1 on same seed0
# 3) ship only: N50×2, WR > 0.70 AND liveWins ≥ identity + 2, durable s12/s13
```

**Success for a lever (pre-ship):**  
- First-diff on ≥1 previously no-diff residual loss (not only `20380387`)  
- N20 Δ ≥ +1 vs identity · win-smoke regs ≤0  
- Then N50 durable +2 over identity

**Honest ceiling note:** p_mbtwo absolute **0.60** under fair dual; ship needs **0.70**. These three are the best **unused** hard-diverge axes left that still track human residual mass without re-treading flat multiTie/pass/fold weight knobs.
