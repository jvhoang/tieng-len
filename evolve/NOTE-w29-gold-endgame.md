# W29 — ONE gold endgame/structure lever on `p_w28_ex_mulow` (convert-first)

**Date:** 2026-07-14  
**Mode:** design only — **do not implement** · SoftN **FORBIDDEN** · W16 pass **FORBIDDEN** · W27 `ctrl2hi` reverse **FORBIDDEN** · dual-null `omin1hi` re-skin **FORBIDDEN**  
**Base:** `policies/p_w28_ex_mulow-{ai,search}.js`  
 (stack: min-top multi + seqclimb + climbtax + flweakmp · holdout A **28** / B **26**)  
**Gold:** `john_uploads/tien_len_AI.txt` Series 1–4 (IMG_0498–0552)  
**Scratch:** `/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-2452caa32616/implementer/explore`  
**Protocol:** fair dual · hidden GM · BR both equal · `injectOpp` = freeze `expertPolicy` · `SOFT=0` · firstdiff→split→DEV→DEV_VAL→holdout A/B

---

## 0. Why stack on mulow (convert-first)

| Fact | Source |
|------|--------|
| Best holdout **A** | **`p_w28_ex_mulow` 28/50** convert `20270774@0` (low multi keeps high package + 2) |
| Best holdout **B** / sum-stable | `p_w26_ex_seqclimb` **27/27** (mulow B **26** = −1 vs seqclimb) |
| Residual-max multi (`p_w28_ex_multires`) | **anti-convert** on 20270774 (pairR favors losing high multi) |
| `p_w29_ex_mulow_rg` residualBetter gate | **nDiv=0** on convert seed 20270774 — residual gate **kills** mulow convert |
| SoftN / W16 pass / ctrl2hi | burned / forbidden |
| `p_w27_ex_omin1hi` | **0/50 firstdiff dual-null** vs seqclimb (expert reorder only; BR re-selects) |

**Read:** W28 proved **hard BR cand force + expert mirror** converts freeze-identical multi-alt seats. W29 must (a) stay convert-first, (b) not reverse mulow’s min-top convert, (c) not reheat residual-max, (d) attack **orthogonal residual class** so holdout **B** is not another mid-multi thrash.

---

## 1. Code map (base `p_w28_ex_mulow-search.js`)

| Symbol | ~Lines | Fair-dual role |
|--------|-------:|----------------|
| `structureBreakCost` | 139–179 | pair/run smash cost; singles interior-run tax |
| `analyzeHand` / trash | 229–268 | trash singles, twos, control |
| `expertScore` combat | 346–400 | min-top bias `topRank*0.85` + sbc + climbtax/seqclimb |
| `expertScore` omin≤2 | 402–405 | soft volume race: `−play.length*3.5` |
| `expertPolicy` free lead | 432–433 | `pickFreeLeadHard` |
| `expertPolicy` **mulow** | **487–513** | hard min-top same-type multi (pre-cheap) |
| `expertPolicy` **cheap return** | **515–541** | mulow cheap mirror + `orderLegals(cheap)[0]` |
| freeLead `omin===1` | 629–633 / 674–694 | multi or high single only (no low gift) |
| `enforcePolicyGuards` combat | 929–935 | keeps proposed if cheap legal |
| `bestResponseMove` combat | **1207–1248** | cheap → **mulow BR strip to min-top only** |

**Critical dual-null lesson (omin1hi vs mulow):**

- `omin1hi` changed **expert return only** → BR root still rated full cheap set → **nDiv=0**.
- `mulow` **stripped BR cand** to min-top pool → convert + firstdiff mass.

Any W29 endgame lever that only reorders expert without BR strip is **pre-null**.

---

## 2. Three candidate levers (ranked convert-first)

### A. Residual multi edge selection (gold 0503 / 0519 / 0549)

| | |
|--|--|
| **Gold** | **0503** leave 7-8-9 + high J not trash 9 · **0519** 10-J-Q save 99 · **0549** 7-8-9 leave no trash |
| **Theme mass** | 8 frames (seq residual multi) |
| **Mechanism** | Among ≥2 same-type multi, pick residual package (`maxRun` / `pairR` / min residual trash) — “which edge of the multi” |
| **Conflict with mulow** | Residual-**max** prefers **high** multi on convert CF `20270774@0` (pairR 2 vs 1) → **anti-convert** (live multires discard) |
| **mulow_rg attempt** | Force min-top *only if* `residualBetter(min, max)` → **nulls convert** (`firstdiff-mulowrg-key-seeds.json` 20270774 nDiv=0) |
| **Same-top residual edge only** | Safe w.r.t. mulow, but expected **low mass** / dual-flat (orderLegals already length/sbc ties) |
| **Convert CF** | **None** proven that is not residual-max (which reverses mulow) |
| **Convert-first rank** | **#2 — defer** until a non-max residual edge CF converts without 20270774 reverse |

### B. Pair-break avoid hard when loose exists (Series 1 combat)

| | |
|--|--|
| **Gold** | 0500 / 0502 / 0504 / 0512 / 0523–24 / 0533–34 / 0537 / 0541 / 0552 (loose single > pair/run smash) |
| **Theme mass** | **17** (highest gold theme) |
| **Mechanism** | `expertPolicy` cheap: if any single has `structureBreakCost < 8`, hard-filter to loose-only |
| **Soft already present** | `expertScore`: `sbc*2.2` + combat single `sbc≥8` → `+18+sbc*0.5` |
| **Firstdiff under BR?** | **Not expected.** W24 `p_w24_exp_sbc` hard sbc residual force → **nDiv=0** (agrees with `orderLegals`). Soft already picks loose; BR rates full cheap set and rarely needs hard delete to match expert. |
| **If BR strip high-sbc** | Firstdiff *possible* when rates currently favor smash, but midgame reverse risk high (race climbs that intentionally smash); no convert CF on holdout freeze-id set |
| **User gate** | “only if firstdiff mass expected under BR” → **FAIL** |
| **Convert-first rank** | **#3 — reject this wave** |

### C. Endgame omin≤2 high package force ⭐

| | |
|--|--|
| **Gold** | **0532** omin=1 highest structure-safe single (not K-pair break) · **0521** package straight over pair-break vs short opp · **0499** sure 2 / win package vs omin≈2 · race volume when opp short |
| **Theme mass** | endgame race (subset of structure + sure-control) |
| **Mechanism** | When `omin ≤ 2`, **hard race package**: structure-safe high single / multi volume — **not** min-top pair/run smash. **Triple mirror:** expert + guards + **BR cand strip** (fix omin1hi dual-null). |
| **Why not dual-null omin1hi** | omin1hi = expert-only max single when `omin===1`. BR still explored full cheap → rates identical. **egpack = omin≤2 + package multi arm + BR strip.** |
| **Orthogonal to mulow** | mulow = mid/deep hand · multi face · `curTop≤6` · min-top keep high package. egpack = **short opp** · race high / package · never inverts mulow min-top band when `omin≥3`. |
| **Convert hypothesis** | Freeze-identical losses where min-beat structure-break gifts a 1–2 card opp; force high/safe package changes root playSig **and** BR rates (strip). |
| **Convert-first rank** | **#1 ⭐** |

---

## 3. Comparison matrix

| Criterion | A residual edge | B loosebeat | **C egpack** |
|-----------|:---------------:|:-----------:|:------------:|
| Convert-first vs mulow CF | **Hostile** (resmax) / null (rg) | Neutral | **Neutral–positive** (orthogonal) |
| Gold mass | 8 | **17** | 4–6 endgame |
| BR dual-null risk | High if soft residual | **High** (exp_sbc nDiv=0) | **Low if BR strip** (mulow lesson) |
| Holdout B reverse risk | **High** (mulow B already multi thrash) | Med midgame | **Low–med** (omin≤2 only) |
| SoftN / pass / ctrl2hi free | Yes | Yes | Yes |
| Firstdiff expectation | low / convert-hostile | **nDiv≈0** | combat race class if strip real |
| Ship path honesty | Residual-max discarded | Condition fail | Distinct from omin1hi |

---

## 4. ONE pick

### ⭐ **`p_w29_ex_egpack`** — endgame (`omin≤2`) high package force

| Field | Choice |
|-------|--------|
| **Tag** | **`p_w29_ex_egpack`** |
| **Base** | `p_w28_ex_mulow` (copy → `p_w29_ex_egpack-{ai,search}.js`) |
| **ONE axis** | When `oppMinHand ≤ 2`, combat answers use **race package set**: prefer structure-safe high singles and volume multi; **hard-delete** min-beat pair/run smashes when a safer package exists. BR cand **strip** to that set. |
| **Not** | SoftN · pass · ctrl2hi · residual-max multires · mulow_rg residualBetter · pure omin1hi re-skin · midgame loosebeat |

### 4.1 Gates (exact)

Fire only when **all** hold:

1. `cur` truthy (combat only — free-lead omin=1 already multi/high in base).  
2. `omin = oppMinHand(state, cp) ≤ 2`.  
3. `handLen ∈ [2, 10]` (endgame / late mid — **not** opening 13-card).  
4. Face not pure bomb-only path (existing bomb-vs-2s unchanged).  
5. Always play if any legal — **never pass** (W16 forbidden).  
6. Do **not** spend 2 as the only “high package” when a non-2 structure-safe beat exists (anti-ctrl2hi reverse). 2 only if: (a) go-out, (b) only answers remaining, or (c) `curTop ≥ 11` existing Ace path.

### 4.2 Selection key (expert + BR shared)

Helper (near `structureBreakCost` / after `analyzeHand`):

```js
function endgameRacePool(hand, leg, cur, state, cp) {
  // returns non-empty subset of leg, or null if gate not applied
  var omin = oppMinHand(state, cp);
  var handLen = hand.length;
  if (!cur || omin > 2 || handLen < 2 || handLen > 10) return null;

  var singles = [], multi = [], i, p, sbc;
  for (i = 0; i < leg.length; i++) {
    p = leg[i];
    if (!p || playIsBomb(p)) continue;
    if (p.length === 1) {
      if (p[0].rank === 12) continue; // 2 deferred — not primary package
      singles.push(p);
    } else if (!playHasTwo(p)) {
      multi.push(p);
    }
  }

  // (1) Multi face or multi legal same-type: prefer longest then highest top among same-type
  //     when it sheds ≥2 cards and residual handLen after ≤ omin+2 (race pressure)
  if (cur.type !== 'single' && multi.length) {
    var same = multi.filter(function (m) {
      var c = detectCombo(m);
      return c && c.type === cur.type;
    });
    if (same.length) {
      same.sort(function (a, b) {
        if (a.length !== b.length) return b.length - a.length; // volume first
        var ta = topRank(a), tb = topRank(b);
        if (ta !== tb) return tb - ta; // high package (race), not min-top
        return structureBreakCost(hand, a) - structureBreakCost(hand, b);
      });
      return same;
    }
  }

  // (2) Single face: structure-safe high singles (sbc < 8) max rank; else max rank non-2
  if (cur.type === 'single' && singles.length) {
    var loose = [], all = singles.slice();
    for (i = 0; i < singles.length; i++) {
      sbc = structureBreakCost(hand, singles[i]);
      if (sbc < 8) loose.push(singles[i]);
    }
    var pool = loose.length ? loose : all;
    pool.sort(function (a, b) {
      return b[0].rank - a[0].rank || b[0].suit - a[0].suit;
    });
    return pool;
  }

  return null;
}
```

**expertPolicy** insert: **after** mulow block (487–513), **before / inside** cheap return (515+):

```js
// W29 p_w29_ex_egpack: omin≤2 race package (gold 0532/0521) — BR strip mirror required
var race = endgameRacePool(hand, leg, cur, state, cp);
if (race && race.length) return { play: race[0] };

var cheap = cheapLegals(leg);
if (cheap.length) {
  var raceC = endgameRacePool(hand, cheap, cur, state, cp);
  if (raceC && raceC.length) return { play: raceC[0] };
  // ... existing mulow cheap + orderLegals
}
```

**bestResponseMove combat** (after cheapLegals, parallel to mulow strip ~1207+):

```js
var raceBR = endgameRacePool(hand, leg, cur, state, myIdx);
if (raceBR && raceBR.length) leg = raceBR; // FORCE strip — anti omin1hi dual-null
// else existing mulow min-top strip / orderLegals
```

**enforcePolicyGuards (optional triple mirror):** if `omin≤2` and proposed is high-sbc single while race pool non-empty, replace with `race[0]`.

### 4.3 Gold unit expectations (when implemented)

| Image | Expected |
|-------|----------|
| **0532** | omin=1 single war: highest structure-safe single, not K-from-pair min-ish |
| **0521** | short opp: multi package preferred over pair that breaks straight (FL path already multi-biased; combat residual if any) |
| **0499** | sure control package vs omin≈2 — not weak pair open (mostly FL; out of combat scope if free-lead) |
| **0503/0519/0549** | **Not required green** this wave (residual edge deferred) |
| **0513/0525/0544** | **Must not** force 2 over loose (ctrl2hi reverse) |

### 4.4 Anti-reverse for holdout B

mulow already **−1 B** vs seqclimb (A reverse sample `20440315@1` FL-class). egpack must not add mid-multi reverse mass.

| Rule | Why |
|------|-----|
| `omin ≤ 2` only | Midgame multi / FL thrash out of band (mulow + flweakmp own that) |
| Combat-primary | Avoid FL 0531-class “lead high trash late” reverse |
| No 2-primary | ctrl2hi holdout A reverse |
| No residual-max multi | 20270774 convert + multires discard |
| No mulow gate edit | Keep min-top force intact when `omin ≥ 3` |
| BR strip only race pool | Firstdiff real without reordering midgame rates |
| Reject if firstdiff only `free_lead_*` | Wrong residual class |
| Reject if holdout B Δ ≤ −1 vs mulow | Anti-reverse bar |

**B success target:** holdout B ≥ **26** (no regression vs mulow) preferred **≥ 27** (recover seqclimb B) while A stays ≥ **28**.

### 4.5 Forbidden siblings (do not ship in this probe)

| Sibling | Why |
|---------|-----|
| SoftN | Forbidden |
| W16 / plan-pass | DEV_VAL reverse family |
| `ctrl2hi` / smash2 2-tempo | W27 A reverse |
| `omin1hi` expert-only | dual-null |
| `multires` residual-max | anti-convert 20270774 |
| `mulow_rg` residualBetter | nulls convert seed |
| midgame loosebeat hard filter alone | firstdiff mass not expected (exp_sbc) |
| Nest / STRONG leaf | high reverse fingerprint |

---

## 5. Eval ladder (implement later — not this note)

```text
1. firstdiff vs p_w28_ex_mulow
   - require nDiv > 0, class combat_* (race/high single or multi package)
   - require 20270774@0 STILL diverges mulow-style OR stays win path (mulow gate untouched)
2. gold unit: 0532 green; 0503 not required; no SoftN/pass; no 2-over-loose
3. DEV T20: ≥ 33, Δid ≥ 0 vs mulow preferred; reject if 20270774 converts lost
4. DEV_VAL Δ ≥ +2 vs identity (or ≥ mulow absolute 29)
5. holdout A/B only after VAL
   - A ≥ 28 preferred; B ≥ 26 hard floor, ≥ 27 stretch
6. Ship only both holdouts WR>0.70 (unchanged bar — not promoting this note)
```

### Probe kill criteria

- nDiv=0 vs mulow (dual-null like omin1hi)  
- 20270774 convert lost  
- holdout B reverse ≤ −1 vs mulow without A gain  
- firstdiff only FL noise  
- any SoftN / pass / ctrl2hi slip  

---

## 6. Deferred ranking (not W29 ONE)

| Rank | Tag (if later) | When to reopen |
|-----:|----------------|----------------|
| 2 | `p_w29_ex_muedge` residual multi edge **outside** mulow band (`curTop≥7`) or **same-top only** | After convert CF found that is not residual-max invert; unit 0503/0519/0549 |
| 3 | `p_w29_ex_loosebeat` hard loose filter + BR strip high-sbc | Only if census shows BR rate-selects pair-break over loose with mass under mulow paths |

---

## 7. Decision table

| | |
|--|--|
| Base | **`p_w28_ex_mulow`** |
| Ranked ONE | **`p_w29_ex_egpack`** |
| Axis | Endgame `omin≤2` high / volume package force + **BR cand strip** |
| Gold | 0532 · 0521 · 0499 race package (structure-safe high) |
| Gates | combat · omin≤2 · handLen 2..10 · no pass · no 2-primary · no SoftN |
| Anti-reverse B | no mid multi · no residual-max · no ctrl2hi · floor B≥26 |
| Convert-first | orthogonal to mulow; preserve 20270774 min-top convert |
| SoftN / implement | **FORBIDDEN / NO** |

---

## 8. Artifacts

| Path | Role |
|------|------|
| `policies/p_w28_ex_mulow-search.js` | base locus (mulow + cheap + BR strip) |
| `policies/p_w27_ex_omin1hi-search.js` | dual-null negative control |
| `policies/p_w28_ex_multires-search.js` | residual-max anti-convert negative |
| `policies/p_w29_ex_mulow_rg-search.js` | residualBetter kills convert — do not reheat |
| `evolve/NOTE-fair-w28-results.md` | mulow A28/B26 evidence |
| `evolve/NOTE-w28-flip-candidates.md` | convert CF 20270774 |
| `evolve/NOTE-w24-gold-architecture.md` | gold theme census (loose 17 / residual multi 8) |
| `john_uploads/tien_len_AI.txt` | Series 1–4 gold text |
| This note | **`evolve/NOTE-w29-gold-endgame.md`** |

---

*Design only. Do not implement, dual, or promote.*
