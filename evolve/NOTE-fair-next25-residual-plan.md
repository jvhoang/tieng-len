# Fair dual next25 residual plan (p_mbnest absolute skill)

**Date:** 2026-07-13  
**Base:** `policies/p_mbnest-search.js` · N100 **0.62** (first25 **0.74** / next25 **0.50**)  
**Protocol:** hidden · GM both · BR both equal · BOTH_SEATS · MS150 T12 SOFT4  
**Ship:** N100 overall **>0.70** (need ~+8/100) · interim gate **next25 ≥ 0.55 → 0.65**  
**Forbidden:** SoftN · free-lead pin retune · soft multiTie weight · perfect-info duals  
**Burned on N100 next25 (do not re-axis):** `mbpairhf` / `mbcmul` / `mbnest_sp` / `mbleaf_br` / `mbresid` / dense BR / `mbnest_co` / `mbntie_all` general  

Artifacts:  
- `evolve/probe-p_mbnest-vs-v91-fair-both-n100.json`  
- `evolve/identity-v91-fair-both-n100.json`  
- recon: `evolve/_recon-next25-residual.js` · `evolve/_uint32_deal_trace.js` · `evolve/_manual_deal_calc.py`

---

## 1. Next25 seed filter (g=25..49 · seed = 20260711 + g·9973)

Per-seed wins = seat0 + seat1 under BOTH_SEATS (max 2).

| seed | g | mbnest | identity | Δ (mb−id) | mb seats | id seats | class |
|-----:|--:|:------:|:--------:|----------:|----------|----------|-------|
| 20510036 | 25 | **2** | 1 | +1 | WW | LW | **mb win** |
| **20520009** | 26 | **0** | 1 | **−1** | LL | LW | **0/2 both-lose** |
| 20529982 | 27 | 1 | 1 | 0 | WL | WL | tie |
| 20539955 | 28 | 1 | 1 | 0 | WL | WL | tie |
| 20549928 | 29 | 1 | 1 | 0 | LW | LW | tie (short multi hist.) |
| 20559901 | 30 | 1 | 1 | 0 | LW | LW | tie |
| 20569874 | 31 | 1 | 1 | 0 | WL | WL | tie |
| 20579847 | 32 | 1 | 1 | 0 | WL | WL | tie |
| **20589820** | 33 | **0** | 1 | **−1** | LL | LW | **0/2 both-lose** |
| 20599793 | 34 | **2** | 1 | +1 | WW | WL | **mb win** |
| 20609766 | 35 | 1 | 1 | 0 | LW | LW | tie (FL multi hist.) |
| 20619739 | 36 | 1 | 1 | 0 | WL | WL | tie |
| **20629712** | 37 | **0** | 1 | **−1** | LL | LW | **0/2 both-lose** |
| 20639685 | 38 | 1 | 1 | 0 | LW | LW | tie |
| 20649658 | 39 | 1 | 1 | 0 | WL | WL | tie |
| 20659631 | 40 | 1 | 1 | 0 | WL | WL | tie |
| 20669604 | 41 | 1 | 1 | 0 | LW | LW | tie |
| 20679577 | 42 | **2** | 1 | +1 | WW | LW | **mb win** |
| 20689550 | 43 | 1 | 1 | 0 | LW | LW | tie |
| 20699523 | 44 | 1 | 1 | 0 | LW | LW | tie |
| 20709496 | 45 | 1 | 1 | 0 | LW | LW | tie |
| 20719469 | 46 | 1 | 1 | 0 | WL | LW | **seat-flip tie** |
| 20729442 | 47 | 1 | 1 | 0 | LW | LW | tie |
| 20739415 | 48 | 1 | 1 | 0 | LW | WL | **seat-flip tie** |
| 20749388 | 49 | 1 | 1 | 0 | LW | LW | tie |

### Filter: `mbnest wins < identity wins` OR `mbnest 0/2`

| seed | mbnest | identity | note |
|-----:|:------:|:--------:|------|
| **20520009** | 0/2 | 1/2 | both seats L; id won seat1 |
| **20589820** | 0/2 | 1/2 | both seats L; id won seat1 |
| **20629712** | 0/2 | 1/2 | both seats L; id won seat1 |

**Only three seeds** match. next25 math: 25/50 → flip these 0→1 is +3 (next25 0.56); 0→2 is +6 (0.62). Still need ~+2–5 more from 1/2→2/2 seat-flips (20719469 / 20739415 class) or other ties.

next25 absolute wins: **mb 25 / id 25** (mb three 2/2 cancel three 0/2).

---

## 2. Worst seeds (6) — deal recon + first-diff

Hands via `engine.createGameState(2, seed)` (same LCG as `engine.js`).  
**Reproduce:** `node evolve/_recon-next25-residual.js` or `python3 evolve/_manual_deal_calc.py`.

### Method

```js
const st = engine.createGameState(2, seed);
// st.players[0|1].hand, st.currentPlayer, st.firstLeadCard
```

Per-game steps from N100 (seat0 / seat1):

| seed | mb steps | first-diff / prior notes | seat losses vs id |
|-----:|----------|--------------------------|-------------------|
| **20520009** | 22 / 13 | both-lose sticky | seat1 (id W) + seat0 |
| **20589820** | 18 / 13 | **seat1 nest free-lead trash** where **identity won with pair** | seat1 (id W) + seat0 |
| **20629712** | 13 / 28 | **seat0 nest played 22** where **v91 PASSed** | seat1 (id W) + seat0 |
| **20719469** | 24 / 22 | long mid seat-flip | mb L seat1 / id W seat1 |
| **20609766** | 25 / 23 | historic free-lead multi residual | shared 1/2 |
| **20739415** | 21 / 17 | seat-flip mid residual | mb L seat0 / id W seat0 |

### Behavioral reconstruction (first-diff → mechanism)

#### A. `20589820` — nest free-lead trash vs identity pair ⭐

| | |
|--|--|
| **Fact** | seat1: mbnest nest path opens **trash single**; identity **pair lead** wins that seat. |
| **Why nest does this** | `shallowSelfPick` free-lead (`!cur`): `leg = freeLeadCandidates` then **first** `exploitPlayoutLeaf≥0.99` in scan order (`orderLegals` / freeLead cand order). Trash is in `freeLeadCandidates` when `hasControl && handLen≥7`. Under det noise, trash can be a **false forced-win** early-exit before pair is scored. |
| **Why not FL pin** | BR root already pins trash+low pairs (`~1022–1047`). Fail is **nest leaf quality among forced-wins**, not root cand starvation. |
| **Package gap** | No “among forced-wins prefer pair residual” in `shallowSelfPick` (~1218–1224). `mbleaf_eq` was residual-among-plays but N100 flat — need **class-gated** pair>trash among FW only on free-lead. |

#### B. `20629712` — nest 22 over v91 PASS ⭐

| | |
|--|--|
| **Fact** | seat0: nest (or nest-driven BR rate) **contests with pair-of-2s**; freeze/v91 **PASS** and wins the shared residual path. |
| **Why nest does this** | Combat nest when `hSelf≤11`: cheap path includes **22** if legal; `exploitPlayoutLeaf` can mark 22 as forced-win vs weak det opp; early-exit returns `{play:22}`. Expert soft-pass bands (`handLen≥9/10`, `curTop<9`) **never see** 22 as “expensive enough” once cheap path exists — 22 is cheap? **No** — `playIsExpensive` includes 2s. But nest “expensive when racing” branch (`hand≤7 \|\| omin≤3`) and go-out paths still surface 22. Also BR `allowPass` is false whenever **any** cheap non-2 answer exists; when **only** 22 answers, allowPass should be true but nest leaf never scores pass. |
| **Why not soft multiTie / ovk** | Soft ε cannot demote unique-max rate “play 22.” Full `GUARD_COMBAT_OVERKILL` cliffed s13. Need **pair-of-2 / top≥12 multi refuse** only, mid-deep, not gap>2 singles. |

#### C. `20520009` — dual both-lose (22 / 13 steps)

| | |
|--|--|
| **Fact** | LL both seats; identity 1/2 (seat1). Mid/long games → combat structure, not 5-step trap. |
| **Hypothesis** | Shared pair-war / high-answer contest with nest false forced-wins on one seat and expert cheap-always on the other. Same pass-discovery gap as B; possibly free-lead class on the shorter seat1 (13 steps). |

#### D. Seat-flip ties `20719469`, `20739415`

Long midgames (17–24 steps). mb and id swap which seat wins → pure combat residual discrimination, not FL pin pets. Levers that only move free-lead will not flip both seats.

#### E. `20609766` (context)

Historic free-lead multi mine under hollow duals; under fair equal-BR next25 it is **1/2 = identity**. Lower priority than the three 0/2.

### Inventory reconstruction (run helper)

```bash
node evolve/_uint32_deal_trace.js
# or
python3 evolve/_manual_deal_calc.py
# or
node evolve/_recon-next25-residual.js
```

Helpers emit `firstPlayer`, `firstLeadCard`, sorted hands, multi inventory for seeds  
`20520009, 20589820, 20629712, 20719469, 20609766, 20549928, 20739415`.

---

## 3. Top 3 lever hypotheses (NEW · not FL pin / soft multiTie / SoftN)

Base each as **copy of `p_mbnest` + ONE axis**. Reject if s11 −≥4 wins or s13 <0.48 or next25 flat.

Burned shapes excluded: pairhf high-pair expert fold · cmul orderLegals len · nest_sp unrestricted nest pass · passc · cheapfold · blind ovk · residual-first ntie.

---

### Lever 1 — `NEST_FL_FW_PAIR` ⭐ (20589820 class)

**One-liner:** Among free-lead forced-wins in `shallowSelfPick`, prefer pair (then short multi) over trash single before early-exit.

**Why next25 / why new:** Direct first-diff on **20589820 seat1**: nest trash FW lost, identity pair won. Not BR FL pin (already shipped). Not soft multiTie. Distinct from `mbleaf_eq` (all residual keys among all FW) — **hard class order** only when `!cur`.

**Locus:** `policies/p_mbnest-search.js` · `shallowSelfPick` **~1217–1224**

**Edit shape (~15 lines):** replace first-FW early-exit with collect-then-pick on free-lead only:

```js
// NEST_FL_FW_PAIR: free-lead forced-win class — pair > short multi > trash
if (!cur) {
  var fw = [];
  for (i = 0; i < leg.length; i++) {
    var n0 = applyPlayFast(state, myIdx, leg[i]);
    n0.isFirstLead = false;
    if (exploitPlayoutLeaf(n0, myIdx, 200) >= 0.99) fw.push(leg[i]);
  }
  if (fw.length) {
    fw.sort(function (a, b) {
      function cls(p) {
        if (p.length === 2) return 0;           // pair best
        if (p.length >= 3 && p.length <= 5) return 1;
        if (p.length === 1) return 3;           // trash/single worst among FW
        return 2;
      }
      var ca = cls(a), cb = cls(b);
      if (ca !== cb) return ca - cb;
      return a.length - b.length;
    });
    return { play: fw[0] };
  }
  return fallback;
}
// combat: keep existing first-FW scan
```

**Risk:** Low–med CPU on free-lead nest (cap already ≤14). If s11 cliffs, restrict sort to when `fw.length≥2 && trash present`.  
**Probe tag:** `p_mbnest_flp`  
**Success signal:** first-diff 20589820 seat1 trash→pair; dual seat1 flip.

---

### Lever 2 — `NEST_REFUSE_PAIR22` ⭐ (20629712 class)

**One-liner:** In nest combat scan, skip pair-of-2s (and optionally pair top≥11) as forced-win candidates when handLen≥8 and omin≥5 — fall through to expert (which can PASS).

**Why next25 / why new:** Direct first-diff **20629712 seat0 nest 22 vs v91 PASS**. Not broad ovk (s13 poison). Not soft multiTie. Not nest_sp (pass leaf always) — **exclude toxic FW play** so fallback expert soft-pass can fire.

**Locus:** `shallowSelfPick` combat loop **~1218–1223** (+ optional mirror in `expertPolicy` expensive branch **~446–516** if nest still forced via BR rates)

**Edit shape (~12 lines):**

```js
// NEST_REFUSE_PAIR22: do not treat 22 / ultra-high pair as nest forced-win mid-deep
function nestToxicPair(p, handLen, omin) {
  if (!p || p.length !== 2) return false;
  if (handLen < 8 || omin < 5) return false;
  var t = Math.max(p[0].rank, p[1].rank);
  return t >= 12 || (t >= 11 && handLen >= 9); // 22 always; AA optional gate
}
// inside FW scan:
if (nestToxicPair(leg[i], hand.length, oppMinHand(state, myIdx))) continue;
```

**Risk:** Med — if races need 22 to lock, gate `omin≥5` keeps short-opp contest. Do **not** stack blind single ovk.  
**Probe tag:** `p_mbnest_r22`  
**Success signal:** 20629712 seat0 playSig pass or non-22; dual flip without s13 <0.48.

---

### Lever 3 — `BR_ALLOWPASS_PAIR22` (rate path twin of #2 / 20520009)

**One-liner:** When combat current is pair and every cheap answer is missing while legal answers are only 2-pair / bombs, **or** all pair answers have top≥11 with handLen≥8, push `null` into BR actions so PASS gets a win-rate.

**Why next25 / why new:** Today `allowPass` only if `cheapLegals(...).length===0` (**~1055–1059**). High pair answers that are “cheap” (non-2 AA/KK) block PASS forever — pairhf expert fold burned N100, but **BR never scoring PASS on 22-only / high-pair-only** is a separate axis. Complements #2 when root BR (not nest leaf) unique-maxes “play 22.”

**Locus:** `bestResponseMove` allowPass / actions **~1055–1059**

**Edit shape (~12 lines):**

```js
// BR_ALLOWPASS_PAIR22: score PASS when only high/2 pair answers remain
var allowPass = !!cur && cheapLegals(fullLeg).length === 0;
if (!allowPass && cur && cur.type === 'pair' && hand.length >= 8) {
  var ominA = oppMinHand(state, myIdx);
  if (ominA >= 5 && !playIsBomb(cur.cards || [])) {
    var pairAns = leg.filter(function (p) { return p && p.length === 2; });
    if (
      pairAns.length &&
      pairAns.every(function (p) {
        return Math.max(p[0].rank, p[1].rank) >= 11;
      })
    ) {
      allowPass = true;
    }
  }
}
```

**Risk:** Med — wider than #2 (root BR). Keep gate pair-only + top≥11 + omin≥5.  
**Probe tag:** `p_mbnest_p22`  
**Success signal:** 20629712 / 20520009 seat root pass scored; not s11 passc-style collapse.

---

## 4. Ranked execute order

| Rank | Tag | Axis | Primary seeds | Locus |
|-----:|-----|------|---------------|-------|
| **1** | `p_mbnest_flp` | NEST_FL_FW_PAIR | 20589820 seat1 | `shallowSelfPick` ~1217–1224 |
| **2** | `p_mbnest_r22` | NEST_REFUSE_PAIR22 | 20629712 seat0 | `shallowSelfPick` combat FW scan |
| **3** | `p_mbnest_p22` | BR_ALLOWPASS_PAIR22 | 20629712, 20520009 | `bestResponseMove` allowPass ~1055–1059 |

### Honorable (if 1–3 first-diff but next25 flat)

- **`NEST_COMBAT_FW_SBC`:** among combat forced-wins pick min `structureBreakCost` (narrower than burned leaf_eq).  
- **`EXPERT_PAIR22_PASS`:** expert soft-pass when sole multi answer is 22 (`handLen≥8`, `omin≥5`) — leaf consistency if #2 flips nest but BR leaf expert re-contests.  
- **Architectural (STATUS):** determinization quality / equal endgame exact — only after micro levers fail next25 ≥0.55.

### Still reject

SoftN · more FL pin · soft multiTie weight · passc/cheapfold/passTie · pairhf/cmul/nest_sp re-run · blind ovk · residual-first ntie · hunting 20380387 · hollow budget

---

## 5. Probe protocol

```bash
# copy policies/p_mbnest-{ai,search}.js → p_mbnest_flp / r22 / p22
FREEZE=v91 CHALL=p_mbnest_flp GAMES=25 SEED=20260711 BOTH_SEATS=1 \
  MS=150 TRIALS=12 SOFT=4 node evolve/lean-fair-dual-n20.js

# Seed-duel first-diff on residual trio before N100:
# 20520009 20589820 20629712 — require playSig diverge vs freeze on known seat

# Interest: next25 ≥0.55 on N100 split; overall ≥0.66
# Ship: N100 overall >0.70
# Reject: s11 −≥4 · s13 <0.48 · first-diff only on first25 FL pets
```

### Success criteria

1. **Primary:** next25 absolute **≥0.55** interest / **≥0.65** target  
2. Overall N100 **≥0.66** interest / **>0.70** ship  
3. Flip ≥1 of `{20520009,20589820,20629712}` from 0/2 → ≥1/2 with first-diff matching lever thesis  
4. s11 N50 **≥0.68** · s13 N50 **≥0.48**

---

## 6. Top 3 lever one-liners

1. **`p_mbnest_flp` — NEST_FL_FW_PAIR:** free-lead nest forced-wins prefer pair over trash (`shallowSelfPick` ~1217–1224) — fixes 20589820 seat1.  
2. **`p_mbnest_r22` — NEST_REFUSE_PAIR22:** skip 22/ultra-high pair as nest forced-win when deep (`shallowSelfPick` combat) — fixes 20629712 seat0 nest 22 vs PASS.  
3. **`p_mbnest_p22` — BR_ALLOWPASS_PAIR22:** BR scores PASS when only high pair answers remain (`bestResponseMove` allowPass ~1055–1059) — rate path for 20629712 / 20520009.

**Path:** `/Users/johnhoang/Developer/Grok/tieng-len/evolve/NOTE-fair-next25-residual-plan.md`
