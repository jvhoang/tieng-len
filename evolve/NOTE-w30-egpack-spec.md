# W30 — `p_w30_ex_egpack` implementable gates (design only)

**Date:** 2026-07-14  
**Mode:** **design only — do not implement from this note as code change** · SoftN **FORBIDDEN** · W16 pass **FORBIDDEN** · W27 `ctrl2hi` reverse **FORBIDDEN** · pure `omin1hi` expert-only re-skin **FORBIDDEN**  
**Base:** `policies/p_w29_ex_mulowg-{ai,search}.js`  
 (stack: band-gated min-top multi + seqclimb + climbtax + flweakmp · holdout **A 28 / B 27 sum 55**)  
**Tag:** **`p_w30_ex_egpack`** (copy base → `p_w30_ex_egpack-{ai,search}.js`)  
**Gold:** `john_uploads/tien_len_AI.txt` **IMG_0532** — *omin=1 highest structure-safe single (not K-pair break)*  
**Scratch:** `/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-2452caa32616/implementer/explore`  
**Protocol:** fair dual · hidden GM · BR both equal · `injectOpp` = freeze `expertPolicy` · `SOFT=0` · firstdiff→split→DEV→DEV_VAL→holdout A/B

---

## 0. Why this probe (convert-first, orthogonal to mulowg)

| Fact | Source |
|------|--------|
| Best package | **`p_w29_ex_mulowg` A28 / B27** (`NOTE-fair-w29-results.md`) |
| Convert kept | `20270774@0`: minTop rank **2** → force low `345` over high `89T` |
| Reverse blocked | mid multi minTop rank **5** (`20460262@1` B, `20440315@1` A) no longer forced |
| Gold 0532 hole | combat single vs **omin=1**: min-beat **K from pair** loses race package; human wants **highest structure-safe single** |
| `p_w27_ex_omin1hi` | expert-only max single · **nDiv=0 dual-null** (BR still rates full cheap) |
| SoftN / pass / ctrl2hi | burned / forbidden |

**Read:** Mulowg owns **mid/deep multi min-top band** (`curTop≤6`, `handLen≥7`, fire only `minTopRank≤3`). Egpack owns **short-opp race package** (`omin≤2`) — primarily **structure-safe high singles**, optional multi volume arm. Must **never invert** mulowg convert, and must **never re-enter** mid multi min-top reverse band on holdout B.

**Convert-seat check (trace):** `20270774@0` first multi decision has `omin≈10`, `handLen=13` — **outside** egpack gates. Ordering mulowg **before** egpack is still mandatory so any later seat that is both mulowg-eligible and omin≤2 keeps convert semantics.

---

## 1. Code map (base `p_w29_ex_mulowg-search.js`)

| Symbol | ~Lines | Role for W30 |
|--------|-------:|--------------|
| `structureBreakCost` | 139–179 | **sbc &lt; 8** = structure-safe / loose single |
| `analyzeHand` | 229–268 | twos / control (mulowg residual; leave alone) |
| `expertScore` omin≤2 | 402–405 | soft volume race only — **not** enough for 0532 force |
| `expertPolicy` **mulowg** pre-cheap | **487–515** | min-top multi if `topRank(min)≤3` — **DO NOT EDIT** |
| `expertPolicy` cheap + mulowg cheap | **517–543** | cheap mirror — **DO NOT EDIT gate** |
| `expertPolicy` insert locus | **after mulowg pre-cheap, before cheap** + **inside cheap after mulowg cheap** | egpack hard return |
| freeLead `omin===1` | 676–696 | already multi/high — **out of combat scope** |
| `enforcePolicyGuards` combat | 931–937 | optional triple: race-pool veto |
| `bestResponseMove` combat | **1209–1254** | cheap → **mulowg strip first** → **egpack strip second** |

---

## 2. Exact fire gates (all must hold)

```text
EGPACK_GATE:
  (G1) cur truthy                         // combat only
  (G2) omin = oppMinHand(state, cp) ≤ 2
  (G3) handLen ∈ [2, 10]                   // not opening 13-card; not go-out (handled above)
  (G4) not pure bomb-only path             // existing bomb-vs-2s unchanged
  (G5) always play if any legal            // never pass (W16 forbidden)
  (G6) SoftN = 0                           // forbidden entirely
  (G7) MULOWG_PRIORITY: if mulowg would
       force min-top this seat, egpack
       does NOT fire (order + explicit veto)
```

### 2.1 Structure-safe high single (gold **0532** primary arm)

When `cur.type === 'single'`:

1. Collect legal **non-2** singles from candidate set (`leg` or `cheap`).  
2. Partition: `loose = { p | structureBreakCost(hand, p) < 8 }`.  
3. Pool = `loose` if non-empty else all non-2 singles.  
4. Sort **max rank**, then **max suit**.  
5. Return pool (expert takes `[0]`; BR strips to full pool).  
6. **2** only if: (a) go-out already returned, (b) **no** non-2 single legal, or (c) existing Ace-path / only-answers 2 logic **above** egpack (do not invent new 2-tempo).  

**Never** pick pair-break K (sbc ≥ 8) when a loose higher/equal package single exists.

### 2.2 Multi package arm (secondary; race volume)

When `cur.type !== 'single'` **and** egpack gate holds **and** mulowg did **not** force:

1. Same-type non-2 non-bomb multis.  
2. Sort: **longer first** (volume), then **higher top** (race — opposite of mulowg min-top), then lower sbc.  
3. Fire only if pool non-empty.  

**Hard ban:** do **not** implement residual-max / pairR edge selection (anti-convert on 20270774).  
**Hard ban:** do **not** force min-top multi under egpack (that is mulowg’s job; mid min-top reverse is holdout B poison).

### 2.3 Explicit mulowg veto (belt + suspenders)

Treat as **true** when all of:

```text
MULOWG_ACTIVE:
  cur && cur.type !== 'single'
  && !playIsBomb(cur.cards || [])
  && curTop ≤ 6
  && handLen ≥ 7
  && (info.twos ≥ 1 || info.control ≥ 2)
  && sameType non-2 multi pool length ≥ 2
  && topRank(minTopPick) ≤ 3
```

If `MULOWG_ACTIVE` → **egpack returns null / does not strip** (mulowg owns the seat).

This keeps convert `20270774@0` even if a future path has `omin≤2` at a low min-top multi.

---

## 3. Shared helper (exact triple-mirror pseudocode)

Place near `structureBreakCost` / after `analyzeHand` in `*-search.js` only (ai file requires the same search module).

```js
/**
 * W30 p_w30_ex_egpack — endgame race package pool.
 * Gold 0532: omin≤1/2 structure-safe high single (not pair/run smash).
 * Returns non-empty subset of `leg`, or null if gate not applied.
 * SoftN forbidden. Never pass. Yields to mulowg min-top band.
 */
function endgameRacePool(hand, leg, cur, state, cp) {
  var omin = oppMinHand(state, cp);
  var handLen = hand.length;
  if (!cur || omin > 2 || handLen < 2 || handLen > 10) return null;

  // ── mulowg veto: never invert convert 20270774 / mid reverse band ──
  var curTop = cur.top ? cur.top.rank : 0;
  if (
    cur.type !== 'single' &&
    !playIsBomb(cur.cards || []) &&
    curTop <= 6 &&
    handLen >= 7
  ) {
    var infoM = analyzeHand(hand);
    if (infoM.twos >= 1 || infoM.control >= 2) {
      var lowM = [], iM, pM, cM;
      for (iM = 0; iM < leg.length; iM++) {
        pM = leg[iM];
        cM = detectCombo(pM);
        if (cM && cM.type === cur.type && !playHasTwo(pM) && !playIsBomb(pM)) lowM.push(pM);
      }
      if (lowM.length >= 2) {
        lowM.sort(function (a, b) {
          var ta = topRank(a), tb = topRank(b);
          if (ta !== tb) return ta - tb;
          if (a.length !== b.length) return b.length - a.length;
          return 0;
        });
        if (topRank(lowM[0]) <= 3) return null; // MULOWG owns this seat
      }
    }
  }

  var singles = [], multi = [], i, p, sbc;
  for (i = 0; i < leg.length; i++) {
    p = leg[i];
    if (!p || playIsBomb(p)) continue;
    if (p.length === 1) {
      if (p[0].rank === 12) continue; // 2 not primary package
      singles.push(p);
    } else if (!playHasTwo(p)) {
      multi.push(p);
    }
  }

  // (1) Multi face: volume then high top (race) — only if mulowg veto did not fire
  if (cur.type !== 'single' && multi.length) {
    var same = [];
    for (i = 0; i < multi.length; i++) {
      var c = detectCombo(multi[i]);
      if (c && c.type === cur.type) same.push(multi[i]);
    }
    if (same.length) {
      same.sort(function (a, b) {
        if (a.length !== b.length) return b.length - a.length; // volume
        var ta = topRank(a), tb = topRank(b);
        if (ta !== tb) return tb - ta; // HIGH package race (≠ mulowg min-top)
        return structureBreakCost(hand, a) - structureBreakCost(hand, b);
      });
      return same;
    }
  }

  // (2) Single face: structure-safe high (gold 0532)
  if (cur.type === 'single' && singles.length) {
    var loose = [];
    for (i = 0; i < singles.length; i++) {
      sbc = structureBreakCost(hand, singles[i]);
      if (sbc < 8) loose.push(singles[i]);
    }
    var pool = loose.length ? loose : singles.slice();
    pool.sort(function (a, b) {
      return b[0].rank - a[0].rank || b[0].suit - a[0].suit;
    });
    return pool;
  }

  return null;
}
```

---

## 4. Triple-mirror insertion (exact)

### 4.1 `expertPolicy` — after mulowg pre-cheap return, before cheap

**Locus:** immediately after mulowg block that ends `if (topRank(lowM[0]) <= 3) return { play: lowM[0]; }` (~L513–515), **before** `var cheap = cheapLegals(leg)`.

```js
// W30 p_w30_ex_egpack: omin≤2 race package (gold 0532) — AFTER mulowg, BEFORE cheap
// SoftN forbidden. Never pass. BR strip required (anti omin1hi dual-null).
var raceE = endgameRacePool(hand, leg, cur, state, cp);
if (raceE && raceE.length) return { play: raceE[0] };
```

### 4.2 `expertPolicy` — cheap path mirror (after mulowg cheap, before `orderLegals`)

Inside `if (cheap.length) { ... }` **after** the mulowg `cheapLow` force returns, **before** `return { play: orderLegals(cheap, ...)[0] }`:

```js
var raceC = endgameRacePool(hand, cheap, cur, state, cp);
if (raceC && raceC.length) return { play: raceC[0] };
// existing: return { play: orderLegals(cheap, state, cp)[0] };
```

### 4.3 `bestResponseMove` combat — **mulowg strip FIRST, egpack strip SECOND**

**Critical order (convert-safe):** do **not** put egpack before mulowg.  
`omin1hi` dual-null lesson: strip must change BR candidate set.  
`mulowg` lesson: strip must match expert force band.

```js
} else {
  // combat branch
  var ch = cheapLegals(leg);
  if (ch.length) leg = ch;

  // (A) W29 mulowg BR strip FIRST — preserve 20270774 convert / block mid reverse
  var mulowgForced = false;
  if (
    cur &&
    cur.type !== 'single' &&
    !playIsBomb(cur.cards || []) &&
    (cur.top ? cur.top.rank : 0) <= 6 &&
    hand.length >= 7
  ) {
    var infoBR = analyzeHand(hand);
    if (infoBR.twos >= 1 || infoBR.control >= 2) {
      var brLow = [], iBL, pBL, cBL;
      for (iBL = 0; iBL < leg.length; iBL++) {
        pBL = leg[iBL];
        cBL = detectCombo(pBL);
        if (cBL && cBL.type === cur.type && !playHasTwo(pBL) && !playIsBomb(pBL)) brLow.push(pBL);
      }
      if (brLow.length >= 2) {
        brLow.sort(function (a, b) {
          var ta = topRank(a), tb = topRank(b);
          if (ta !== tb) return ta - tb;
          if (a.length !== b.length) return b.length - a.length;
          return expertScore(a, state, myIdx) - expertScore(b, state, myIdx);
        });
        var minT = topRank(brLow[0]);
        if (minT <= 3) {
          var onlyMin = [];
          for (var iMin = 0; iMin < brLow.length; iMin++) {
            if (topRank(brLow[iMin]) === minT) onlyMin.push(brLow[iMin]);
          }
          leg = onlyMin.length ? onlyMin : [brLow[0]];
          mulowgForced = true;
        }
      }
    }
  }

  // (B) W30 egpack BR strip SECOND — only if mulowg did not force
  if (!mulowgForced) {
    var raceBR = endgameRacePool(hand, leg, cur, state, myIdx);
    if (raceBR && raceBR.length) {
      leg = raceBR; // FORCE strip — anti omin1hi dual-null
    } else if (!mulowgForced) {
      leg = orderLegals(leg, state, myIdx);
    }
  }
  // if mulowgForced, leave leg as onlyMin (do not orderLegals-widen)
}
```

**Anti-pattern (do not ship):** egpack strip **before** mulowg when both could apply → high multi race can reverse convert-class seats under `omin≤2`.

### 4.4 `enforcePolicyGuards` — optional third mirror

Insert in combat path **after** Ace-facing 2-prefer block, **before** generic `cheapLegals` keep-proposed:

```js
// W30 egpack guards (optional triple): force race package when omin≤2
var raceG = endgameRacePool(hand, leg, cur, state, myIdx);
if (raceG && raceG.length) {
  if (proposed && isLegalPlay(proposed)) {
    var sigP = playSig(proposed), okR = false, iR;
    for (iR = 0; iR < raceG.length; iR++) {
      if (playSig(raceG[iR]) === sigP) { okR = true; break; }
    }
    if (okR) return proposed;
  }
  return raceG[0];
}
// existing cheap keep-proposed...
```

Guards alone are **not** sufficient (search may never propose race); BR strip is mandatory.

---

## 5. What must not change (convert + anti-reverse B)

| Rule | Why |
|------|-----|
| **No edit** to mulowg `minTopRank ≤ 3` gate | Convert `20270774@0`; blocks reverse top=5 |
| **No** residual-max / `mulow_rg` residualBetter | Anti-convert / nDiv=0 on convert seed |
| **No** SoftN | Forbidden |
| **No** new combat pass | W16 reverse family |
| **No** 2-primary race when loose non-2 exists | ctrl2hi holdout reverse |
| **egpack only `omin ≤ 2`** | Mid multi / FL thrash out of band (mulowg + flweakmp own mid) |
| **Combat-primary** | Free-lead omin=1 already multi/high; avoid 0531-class FL reverse |
| **Reject firstdiff only `free_lead_*`** | Wrong residual class |
| **Reject holdout B Δ ≤ −1 vs mulowg** | Anti-reverse bar (B floor **27**) |
| **Reject if 20270774 convert lost** | Convert-first hard kill |

### Holdout B anti-reverse (mid multi min-top band)

mulowg already recovered B by **blocking** min-top force when `minTopRank > 3` (e.g. top=5 mid seq). Egpack must:

1. **Not** re-introduce min-top multi force outside mulowg’s `≤3` band.  
2. **Not** force high multi climbs on mid faces when `omin ≥ 3`.  
3. Prefer firstdiff mass in **`combat_single` / race** classes (0532), not `combat_multi` mid mintop.  
4. Success target: **B ≥ 27** hard floor (no regression), stretch **≥ 28**; **A ≥ 28** hard floor (convert kept).

---

## 6. Gold unit expectations

| Image | Expected when implemented |
|-------|---------------------------|
| **0532** | **GREEN:** omin=1 single war → highest **sbc&lt;8** single; not K-from-pair min-beat |
| **0521** | multi package over pair-break vs short opp (mostly FL; combat residual if any) |
| **0499** | sure control package vs omin≈2 (FL-heavy; combat out-of-scope if free-lead) |
| **0513 / 0525 / 0544** | **Must not** force 2 over loose non-2 |
| **0503 / 0519 / 0549** | **Not required** (residual multi edge deferred) |

---

## 7. Eval ladder (implement later — not this note)

```text
1. firstdiff vs p_w29_ex_mulowg
   - require nDiv > 0
   - class preference: combat_single / race high package (0532-class)
   - FAIL if only free_lead_* noise
   - FAIL if 20270774@0 path loses low multi convert (must stay 345-class or IDENT win)
2. key-seed check SEEDS=20270774,20460262,20440315
   - 20270774@0: IDENT or still min-top low multi + liveWin
   - reverse seats: no new L vs mulowg
3. gold unit: 0532 green; no SoftN/pass; no 2-over-loose
4. DEV T20: ≥ mulowg 34 − 1 tolerance; Δid ≥ 0 preferred
5. DEV_VAL Δ ≥ 0 vs mulowg absolute
6. holdout A/B only after VAL
   - A ≥ 28 hard; B ≥ 27 hard; stretch A+B sum ≥ 56
7. Ship only both holdouts WR>0.70 (unchanged bar — not promoting this note)
```

### Probe kill criteria

- nDiv=0 vs mulowg (dual-null like omin1hi)  
- **20270774 convert lost**  
- holdout B ≤ 26 (reverse vs mulowg floor 27)  
- firstdiff only FL noise  
- any SoftN / new pass / ctrl2hi 2-primary slip  
- BR order puts egpack multi high-top **before** mulowg min-top strip  

---

## 8. Forbidden siblings (do not ship in this probe)

| Sibling | Why |
|---------|-----|
| SoftN | Forbidden |
| W16 / plan-pass | DEV_VAL reverse family |
| `ctrl2hi` / smash2 2-tempo | W27 A reverse |
| `omin1hi` expert-only | dual-null |
| `multires` residual-max | anti-convert 20270774 |
| `mulow_rg` residualBetter | nulls convert seed |
| midgame loosebeat hard filter alone | exp_sbc nDiv≈0 |
| Nest / STRONG leaf | high reverse fingerprint |
| Expanding mulowg to minTop&gt;3 | re-opens B reverse band |
| Stacking nest + egpack + residual in one probe | multi-axis noise |

---

## 9. Decision table

| | |
|--|--|
| Base | **`p_w29_ex_mulowg`** (A28/B27) |
| Tag | **`p_w30_ex_egpack`** |
| Axis | Endgame `omin≤2` **structure-safe high single** (+ optional multi volume) + **BR cand strip** |
| Gold | **IMG_0532** highest safe single vs omin=1 |
| Gates | combat · omin≤2 · handLen 2..10 · never pass · no SoftN · **mulowg veto** |
| Triple mirror | expert (pre-cheap + cheap) · BR (**mulowg first**, egpack second) · optional guards |
| Convert-first | preserve **20270774** min-top; no residual-max |
| Anti-reverse B | stay out of mid multi min-top band; B floor **27** |
| SoftN / implement | **FORBIDDEN / NO from this note** |

---

## 10. Artifacts

| Path | Role |
|------|------|
| `policies/p_w29_ex_mulowg-search.js` | **base locus** (mulowg expert + BR strip) |
| `policies/p_w27_ex_omin1hi-search.js` | dual-null negative control |
| `policies/p_w28_ex_multires-search.js` | residual-max anti-convert negative |
| `evolve/NOTE-fair-w29-results.md` | mulowg A28/B27 evidence |
| `evolve/NOTE-w29-mulow-residual.md` | convert vs reverse band diagnosis |
| `evolve/NOTE-w29-gold-endgame.md` | earlier egpack design (mulow base; now rebases to mulowg) |
| `john_uploads/tien_len_AI.txt` L43 | gold 0532 text |
| This note | **`evolve/NOTE-w30-egpack-spec.md`** |

---

## 11. Implementor checklist (when code is allowed later)

1. Copy `p_w29_ex_mulowg-{ai,search}.js` → `p_w30_ex_egpack-{ai,search}.js`; wire id/label.  
2. Add `endgameRacePool` with **mulowg veto** (section 3).  
3. Expert: mulowg unchanged → race return → cheap → mulowg cheap → race cheap → orderLegals.  
4. BR combat: cheap → **mulowg strip** → **egpack strip** → orderLegals fallback.  
5. Optional guards race keep.  
6. **No SoftN.** No new pass. No 2-primary.  
7. firstdiff vs mulowg; key-seed convert check; then DEV ladder.  

---

*Design only. Do not implement, dual, SoftN, or promote from this note.*
