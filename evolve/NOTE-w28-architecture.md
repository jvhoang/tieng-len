# W28 — ONE larger architecture lever (beyond score / cand micros)

**Date:** 2026-07-14  
**Mode:** design only — **do not implement** · **do not dual** · SoftN **FORBIDDEN** · W16 pass **FORBIDDEN**  
**Base best holdout:** `policies/p_w26_ex_seqclimb-{ai,search}.js`  
 (DEV **34**, DEV_VAL **Δ+3**, holdout **27/27**)  
**Plateau:** W18–W27 score/cand dual-null or reverse · SoftN dead · W16 pass burned  
**Protocol lock:** fair dual · hidden GM · BR both equal · `injectOpp` = freeze `expertPolicy` · `SOFT=0`  
**Scratch:** `/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-2452caa32616/implementer/explore`

---

## 0. Why “architecture,” not another micro

| Fact | Source |
|------|--------|
| Best package stuck at holdout **27/27** | `NOTE-fair-w26-results.md`, `NOTE-fair-w27-results.md` |
| Residual L A+B **46**; freeze-identical **27 (58.7%)** | `NOTE-w27-holdout-residual.md` |
| Soft multi climb tax: **diverge ∩ ¬convert** | multi-tax hits still L: `20280747@1`, `20400423@1`, `20460261@1`, `20420370@0` |
| Unique multi `JH QS KS` (`20300693@1`) | **still freeze-identical** — score tax dual-null when pool size = 1 |
| W27 `ctrl2hi` | firstdiff sparse → holdout A **−1 reverse** — discard |
| W18–W23 BR cand micros | dual-null / −1 |
| W24 `exp_sbc` residual force | **nDiv=0** — agreed with `orderLegals` (sbc-first) |
| W18 `brseqres` seq residual BR-only | identical W/L dual-null |
| W19 `exresmax` singles residual expert | identical W/L dual-null |
| Fair dual leaf | `lean-fair-dual-n20.js` L26–38 `injectOpp` freeze expert; `strongSelf: STRONG==='1'` (default **false**) |

**Read:** absolute gap is not “one more tax coefficient.” Need a **discrete multi-answer architecture** that (a) disagrees with min-top `orderLegals`, (b) lives in **expert leaf + BR order** (anti dual-null), (c) is not SoftN / pass / BR multionly.

---

## 1. Code map (base `p_w26_ex_seqclimb-search.js`)

| Symbol | ~Lines | Fair-dual role |
|--------|-------:|----------------|
| `structureBreakCost` | 139–179 | sbc in score + residual keys |
| `multiBurnsHighResidual` | 182–200 | W26 climb tax gate |
| `expertScore` | 284–409 | order key; combat `topRank*0.85` = **min-top bias** |
| `orderLegals` | 411–415 | pure `expertScore` sort |
| `expertPolicy` combat cheap | **488–489** | BR self leaf + root fallback: `orderLegals(cheap)[0]` |
| `enforcePolicyGuards` combat cheap | 875–880 | keeps proposed if cheap legal; else `orderLegals(cheap)[0]` |
| `bestResponseMove` combat cand | **1153–1156** | `cheapLegals` → `orderLegals` → branch |
| BR self playout | 1189–1190 | `strongSelf ? shallowSelfPick : expertPolicy` |
| `exploitPlayoutLeaf` | ~1245+ | self expert / opp inject |
| `shallowSelfPick` | 1255–1296 | combat bail `hand.length > 9` → expert; first forced win in order |
| `injectOpp` (runner) | `lean-fair-dual-n20.js` 26–38 | freeze `expertPolicy` only — never touch |

**Min-top vs gold multi residual (critical):**

Combat multi scoring (`expertScore` combat arm):

```text
score += topRank(play) * 0.85   // higher multi top = worse
```

So among same-type multi answers, `orderLegals` prefers **lower** tops.  
Gold **0503** wants **9-10-J-Q** (leaves 7-8-9 run + J) over **7-8-9-10** (leaves trash 9) — **anti min-top residual-max**.  
That is why soft climb tax can reorder high burns down without ever implementing residual-max packaging, and why W24 sbc-first residual force dual-nulled (already agrees with score).

---

## 2. Three architecture options

### Option A — **residual-max multi answer sort** (among ≥2 same-type multi legals)  
### in expert + BR order

| | |
|--|--|
| **Tag candidate** | `p_w28_ex_mulres` |
| **Class** | Hard residual **pool sort** (not score tax, not BR cand strip-only) |
| **Gate** | combat · `handLen≥7` · `omin≥3` · `curTop<11` · not bomb face · `cur.type ∈ {pair,triple,seq,doubleseq}` · **same-type cheap pool `≥2`** |
| **Key (must disagree with orderLegals)** | `pairR ↓desc` → `maxRun ↓desc` → `sbc ↑asc` → same-len prefer → `expertScore` last |
| **Locus** | (1) helper `residualAfter` near L179 · (2) `expertPolicy` cheap return L488–489 · (3) `bestResponseMove` combat after cheap L1153–1156 · (4) optional same sort on non-2 same-type path L535 if cheap empty rare |
| **Gold** | **0503** residual-max same-len seq · **0519** combat 10-J-Q save 99 |
| **Residual hits** | freeze-id SEQ multi-**alt** seats (subset of 20410396 / 20430342 / 20470234 / 20390450 / …) when ≥2 same-type legals exist |
| **Explicit null** | **unique multi** (`20300693@1` `JH QS KS`) — pool size 1 → no rekey (honest; no pass invent) |
| **Anti-null vs history** | W18 `brseqres` = **BR-only** → dual-null · W19 singles resmax → dual-null · W24 sbc-first agreed score → dual-null. **A = multi-only + pairR/maxRun primary + expert∧BR dual mirror** |
| **Fairness** | Own-policy only; `injectOpp` freeze expert untouched; both seats equal budget; SOFT=0 |
| **Not** | SoftN · pass-unique · BR multionly · mintop primary · singles resmax re-skin · score retune |

**Sketch (expert cheap path):**

```js
// helper once
function residualAfter(hand, play) {
  var used = Object.create(null), i, r, byR = Object.create(null);
  for (i = 0; i < play.length; i++) used[play[i].rank * 4 + play[i].suit] = 1;
  for (i = 0; i < hand.length; i++) {
    if (!used[hand[i].rank * 4 + hand[i].suit]) {
      r = hand[i].rank; byR[r] = (byR[r] || 0) + 1;
    }
  }
  var pairR = 0, maxRun = 0, run = 0;
  for (r = 0; r <= 11; r++) {
    var c = byR[r] || 0;
    if (c >= 2) pairR++;
    if (c > 0) { run++; if (run > maxRun) maxRun = run; } else run = 0;
  }
  return { pairR: pairR, maxRun: maxRun, sbc: structureBreakCost(hand, play) };
}

function sortMultiResidual(pool, hand, state, cp, curTop) {
  return pool.slice().sort(function (a, b) {
    var ra = residualAfter(hand, a), rb = residualAfter(hand, b);
    if (ra.pairR !== rb.pairR) return rb.pairR - ra.pairR;     // residual pairs first
    if (ra.maxRun !== rb.maxRun) return rb.maxRun - ra.maxRun; // residual run
    if (ra.sbc !== rb.sbc) return ra.sbc - rb.sbc;
    if (a.length !== b.length) return a.length - b.length;     // mild short among residual ties
    return expertScore(a, state, cp) - expertScore(b, state, cp);
  });
}

// expertPolicy after: var cheap = cheapLegals(leg);
if (cheap.length) {
  if (
    handLen >= 7 && omin >= 3 && curTop < 11 &&
    !playIsBomb(cur.cards || []) &&
    (cur.type === 'pair' || cur.type === 'triple' ||
     cur.type === 'seq' || cur.type === 'doubleseq')
  ) {
    var pool = [], iP, pP, cP;
    for (iP = 0; iP < cheap.length; iP++) {
      pP = cheap[iP]; cP = detectCombo(pP);
      if (cP && cP.type === cur.type) pool.push(pP);
    }
    if (pool.length >= 2) {
      return { play: sortMultiResidual(pool, hand, state, cp, curTop)[0] };
    }
  }
  return { play: orderLegals(cheap, state, cp)[0] };
}
```

**BR combat mirror (same axis only):** after `ch = cheapLegals(leg); if (ch.length) leg = ch;`, if combat multi gate and same-type count ≥2, set `leg = sortMultiResidual(pool, …)` (full residual-ranked pool, not single keep) then existing `orderLegals` only as stable tail if mixed types remain. Do **not** strip to one action (rate exploration preserved under unique rates).

---

### Option B — **gated `shallowSelfPick` as BR self leaf**  
### both seats equal (`STRONG=1` fair)

| | |
|--|--|
| **Tag candidate** | `p_w28_br_nestco` |
| **Class** | Leaf model (true architecture; not score/cand) |
| **Gate** | combat only · `hSelf ≤ 9` · never free-lead nest (anti mbnest_fl / s13) |
| **Locus** | `bestResponseMove` self branch L1189–1190; optional residual order inside `shallowSelfPick` L1275–1293 |
| **Fairness** | `STRONG=1` **both** seats (runner equal) **or** package-forced nest for whoever loads the package; opp leaf stays freeze expert |
| **Why it could move freeze-id** | Rate flips on long midgames without needing multi pool ≥2; unique-multi roots can still change **later** nest steps |
| **Burn history** | `p_w6_shself` always → DEV_VAL **0.42 Δ−4** · mbnest / nest stacks holdout-fragile · W24 lever C risk **high** if ungated |
| **Wall-clock** | +10–40% combat roots under T20 MS200 |
| **Expected mass** | Sparse high-value rate flips; dual edge may thin if freeze also nests under STRONG=1 and nest logic is near-identical |
| **Not** | always-on shself · FL nest · SoftN · asymmetric strongSelf |

**Risk read:** largest theoretical architecture, **highest reverse fingerprint** after W27 ctrl2hi reverse. Prefer only after a lower-risk residual package fails firstdiff.

---

### Option C — **multi short residual**  
### prefer shorter high multi leaving run/pair (gold 0503 / 0517 / 0545)

| | |
|--|--|
| **Tag candidate** | `p_w28_ex_mshort` |
| **Class** | Free-lead + multi packaging hard preference |
| **Gold** | **0517** FL 10-J-Q-K not 9-10-J-Q-K (keep 99) · **0545** FL 678 then 8910 not 678910 · **0503** residual (same-len; short is secondary) |
| **Locus** | `pickFreeLeadHard` multi pool sort · optional combat multi length among residual ties |
| **Overlap** | expertScore free-lead already soft-prefers short multi (`len===2/3` bonuses); W17 trash FL + W25 flweakmp already move FL residual mass |
| **Holdout residual fit** | Holdout both-lose under seqclimb is **combat / freeze-id SEQ** dominated, not FL_other (seqclimb already moved multi combat paths) |
| **Risk** | FL overfit family (brflo_g2 DEV_VAL reverse); 0503 is **not** primarily “shorter” |
| **Expected mass** | **+0…+2** holdout; may dual-flat if soft length already unique-max |

---

## 3. Comparison matrix

| Criterion | **A mulres** | B nestco | C mshort |
|-----------|:------------:|:--------:|:--------:|
| Beyond score/cand micro | **Yes** (hard multi residual pool) | Yes (leaf model) | Partial (FL packaging) |
| Anti dual-null design | **expert ∧ BR** + anti min-top key | STRONG equal both | expert FL hard key |
| Gold primary | **0503 / 0519** | forced-win quality | 0517 / 0545 (+0503 weak) |
| Holdout residual class | combat multi-**alt** freeze-id | long mid rate ties | FL residual |
| Unique multi `20300693` | **null** (pool=1) | maybe later steps | null |
| Burned cousins | W18 BR-only · W24 sbc-first | shself / mbnest | brflo FL |
| DEV_VAL reverse risk | **Med** (mintop-cousin if gap-primary — **avoid gap primary**) | **High** | Med–high FL |
| Firstdiff fail mode | nDiv=0 if pool rarely ≥2 | nDiv=0 if nest never finds forced win | nDiv=0 if soft already agrees |
| Impl complexity | Low–med | Med + time | Low |

---

## 4. ONE pick for W28

### ⭐ **`p_w28_ex_mulres`** — residual-max multi answer sort (Option A)

| Field | Choice |
|-------|--------|
| **Base** | `p_w26_ex_seqclimb` |
| **ONE axis** | Among **≥2 same-type multi** cheap legals, pick **max residual structure** (`pairR`, `maxRun`) before min-top `expertScore` |
| **Exact locus** | copy base → `p_w28_ex_mulres-{ai,search}.js` |
| | 1. **`residualAfter` + `sortMultiResidual`** after `multiBurnsHighResidual` (~L200) |
| | 2. **`expertPolicy`** combat cheap return **L488–489** — multi residual force when pool≥2 |
| | 3. **`bestResponseMove`** combat cand **L1153–1156** — same residual order on multi pool (dual mirror) |
| | 4. **Do not** edit SoftN · allowPass · pass bands · climbtax scores · flweakmp · guards reinject (cheap residual proposed already kept at L877–878) |
| **Fairness** | Challenger own policy only · freeze seat freeze package · `injectOpp` = freeze expert both · equal MS/TRIALS/SOFT=0 · **no** asymmetric `strongSelf` |
| **Why not B** | Nest reverse mass (shself 0.42); STRONG=1 redefines both leaves and may cancel dual edge; higher wall-clock; try after residual package if A nDiv=0 |
| **Why not C** | Holdout residual is combat freeze-id / SEQ, not FL packaging; 0503 is residual-max same-len not short-first; FL soft length already present |
| **Why not score micro** | Climb tax already plateaued; unique multi dual-null at score; need **hard multi residual key that inverts min-top** |
| **Expected holdout mass** | **+1…+3 seats A+B combined** if multi-alt residual mass real; **0** if almost all freeze-id multi decisions are unique-pool (then document null and escalate to gated nest B) |
| **Firstdiff expectation** | combat multi residual reorder vs seqclimb (e.g. low seq → high residual seq); **fail probe if nDiv=0** on design half |
| **Ship bar** | unchanged — both holdouts WR>0.70 + Δid≥+2 — **not promoting** this note |

### Eval ladder (when implemented later)

```text
1. firstdiff vs p_w26_ex_seqclimb  (require combat multi nDiv > 0)
2. gold unit: IMG0503 / IMG0519 green; no SoftN; no new pass
3. DEV T20 ≥ 34, Δid ≥ 0
4. DEV_VAL Δ ≥ +2
5. holdout A/B only after VAL
```

### Probe anti-patterns

1. Do **not** make residual **sbc-first** (W24 exp_sbc dual-null).  
2. Do **not** BR-only (W18 brseqres dual-null).  
3. Do **not** singles residual re-skin (W19 exresmax dual-null).  
4. Do **not** force PASS when unique multi only (W16).  
5. Do **not** SoftN / mintop primary / BR multionly / ctrl2hi reheat.  
6. Do **not** stack A+B+C in one probe.

---

## 5. Honest residual mass accounting

| Residual subclass | A mulres impact |
|-------------------|-----------------|
| Unique multi freeze-id (`20300693@1`) | **None** at root (pool=1) |
| Multi-alt freeze-id SEQ climbs | **Primary target** — firstdiff + possible convert |
| Seqclimb multi-tax diverge∩L | Secondary — residual-max may re-pick different multi than tax min-top; convert unknown |
| 2-burn / tempo / pair-ladder freeze-id | Out of scope (orthogonal) |
| New-loss risk | Low–med if residual-max overspends high multi vs freeze tempo |

**Bottom line:** A does **not** claim to fix soft-tax dual-null unique multi. It claims the next honest architecture slice: **when humans face ≥2 multi answers, stop picking min-top trash-residual** (0503) under fair dual leaf+BR.

---

## 6. Decision table

| | |
|--|--|
| Best holdout package (unchanged) | **`p_w26_ex_seqclimb` 27/27** |
| W27 discard | `ctrl2hi` reverse · `omin1hi` dual-null |
| Options designed | A mulres · B nestco · C mshort |
| **ONE W28 tag** | **`p_w28_ex_mulres`** |
| **Exact locus** | helper ~L200 · expert cheap **L488–489** · BR combat **L1153–1156** |
| **Fairness** | injectOpp freeze expert · SOFT=0 · equal BR · own residual sort only |
| **Expected holdout mass** | **+1…+3** if multi-alt residual fires; else 0 → escalate B |
| SoftN / implement | **FORBIDDEN / NO (this note)** |

---

## 7. Artifacts

| Path | Role |
|------|------|
| `policies/p_w26_ex_seqclimb-search.js` | base locus |
| `evolve/lean-fair-dual-n20.js` | injectOpp + STRONG protocol |
| `evolve/NOTE-w27-holdout-residual.md` | residual census |
| `evolve/NOTE-fair-w27-results.md` | W27 discards |
| `evolve/NOTE-w24-architecture-levers.md` | prior A/B/C architecture map |
| `evolve/NOTE-w26-seqclimb.md` | climb tax + 0503 shield |
| `john_uploads/tien_len_AI.txt` | gold 0503 / 0517 / 0545 text |
| scratch explore | mirror target for this note |

---

*Do not implement. Do not SoftN. Do not re-skin W16 pass or W27 ctrl2hi.*
