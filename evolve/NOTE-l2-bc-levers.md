# L2 BC levers — general dual-strength (no convert-on-S)

**Date:** 2026-07-15  
**Author task:** Analyze newest living gold playlog + `tien_len_AI.txt` Series 1–5 for **GENERAL** (non-fingerprint) dual-strength levers that can raise WR vs freeze **v60** without convert-on-S residual packaging.

### Protocol constraints (locked)

| Constraint | Value |
|------------|--------|
| Fair gold path | `getAIMove` · `hiddenInfo` · `mode=expert` |
| Fair dual path | GM · BR both · SoftN=**0** · equal budget · both seats |
| Forbidden | SoftN · convert-on-S · ultra-exact byR multiset force roots |
| PAIR_STEP | Do **not** edit policies based on PAIR_STEP seed losses |
| W_max | `floor(cores/2)` = **9** (18 logical cores) |
| Champion | `milestone-L1` · EMA ~0.50 · ΣΔ accepted = 0 |

### Code baseline note

- **Gold expert path** lives in `search.js` `expertPolicy` / `expertScore` / `pickFreeLeadHard` (Series 1–3 already green 48/0).
- **Dual BR path** intended for L2: `policies/p_l2s2b-search.js` (`dualRolloutPolicy` + `bestResponseMove`, SoftN=0). Micro dual vs v60: ~0.45 / 0.525 (n=40×2).  
- **Integrity watch:** live root `search.js` exports currently omit `bestResponseMove` / `dualRolloutPolicy` while `ai-build.js` still labels `v1.0-sh-L2s2b`. Restore from `p_l2s2b-search.js` before shipping PAIR_STEP 0002 if live body drifted. Analysis below targets the **L2s2b lineage** + gold expert shared scoring.

---

## 1. Inventory — `john_uploads` playlogs (newest first)

| # | Path | exportedAt | games | vsAI | notes |
|---|------|------------|------:|-----:|-------|
| **1 (newest / only in-repo)** | `john_uploads/tienlen-playlogs-1784093993176.json` | **2026-07-15T05:39:53.148Z** | **201** | **196** | ~12.0 MB · manifest pointer `newestPlaylog` · stamp span v8.9→v9.9 + null builds |
| — prior (not in `john_uploads` now) | `tienlen-playlogs-1784002833123.json` | 2026-07-14T04:20Z | 179 | mostly | cited in older NOTE-gold-primary-sources |
| — prior (Downloads) | `tienlen-playlogs-1783931122937.json` | 2026-07-13T08:25Z | 158 | 158 | older CF / inference corpus |

**Manifest** (`evolve/eval-registry/gold-manifest.json`, stamped 2026-07-15T07:39Z):

- `fileCount` **81** (79 images + text + playlog)
- `pointers.playlogs` = only the newest file above
- `diff.dirty` = false

### Event census — newest playlog (`1784093993176`)

Counts from structured field greps (decision events are `type: play|pass` under `events[]`):

| Event class | Count | Notes |
|-------------|------:|-------|
| **games** | 201 | top-level `count` |
| **vsAI** | 196 | `"vsAI": true` |
| **game_start** | ~200 | paired with ends; a few abandoned/aborts |
| **game_end** | ~196 | |
| **play** | **≥1999** | rg result truncated at ≥1999; true total higher (~3k+) |
| **pass** | **815** | exact |
| **humanWon:true** (result+event) | 360 lines → **~180 unique wins** | double-counted (event + game.result) |
| **humanWon:false** | 28 lines → **~14 unique losses** | human seat dominates export |

**aiBuild id histogram (stamped games only, n=75 with `aiBuild.id`):**

| Build | n |
|-------|--:|
| v9.9 | 6 |
| v9.5 | 9 |
| v9.4 | 2 |
| v9.3 | 9 |
| v9.2 | 21 |
| v9.1 | 9 |
| v9.0 | 15 |
| v8.9 | 4 |
| null / unstamped | remainder of 196 vsAI |

**BC refresh rule:** always re-census this newest file (or a newer export) before coding the next lever. Do not design from PAIR_STEP seed loss lists.

---

## 2. Top 10 recurring human-vs-bad-AI patterns (Series 1–5) — GENERAL rules

Source: `john_uploads/tien_len_AI.txt` Series **#1–#5** (IMG 0498–0581).  
Features only: structure break · trash-first · 2-tempo · multi free-lead residual · pass when deep. **No byR fingerprints.**

| Rank | GENERAL rule | Feature axes | Series mass (examples) | Dual-transfer note |
|-----:|--------------|--------------|------------------------|--------------------|
| **1** | **Never min-beat by breaking pair / run-start / triple when a loose single exists** | structure break (sbc), combat residual | 0498 A≻6pair; 0502 K≻6run; 0504 J≻8run; 0505 8≻4run; 0512 10≻6pair; 0523 Q≻5trip; 0524 T≻5pair; 0529 A≻T-run; 0533 7≻4run; 0534 A≻K-from-QKA; 0537 J≻4run; 0541 J≻5pair; 0552 9≻8run; 0554 9≻5pair; 0557 8≻5trip; 0560 7≻3pair; 0562 A≻8pair; 0565 J≻6run; 0567 J≻Tpair; 0571 Q≻6pair; 0578 7≻3run; 0580 J≻6run | Largest class. Shared `structureBreakCost` + combat safe filter already in gold; dual BR must **score** residual not only rate. |
| **2** | **Trash-first free-lead when you hold control (2s / high reserve) and low deadwood** | trash-first, free-lead | 0514 5 trash; 0531 4 first; 0539/0540 low then high; 0542/0543 low pair before high; 0556 low≻10; 0561 low pair≻A triple; 0568 456≻6trip; 0575 789≻9trip | Dual multi-always dumps long multi first → human loses control later. |
| **3** | **2-tempo: spend single 2 for control vs high tops / omin short; never open 22 midgame with deep trash** | 2-tempo | 0499 free 2; 0500 2≻Q-from-JQK; 0511 pass 22; 0513 2≻K-pair-break; 0516 2 then AA; 0518 free 22 short; 0525 2≻A-pair; 0528 3≻22; 0544 2≻A; 0547 pass 22; 0555 2/pass≻J-pair; 0558 2≻A when omin=1; 0563/0569 2≻pair-break; 0573 A then multi when omin=1 | dualRollout conserves 2 midgame (good); gold hard-spend vs A/Q already. Dual needs BR cand that includes single 2. |
| **4** | **Multi free-lead: choose residual quality (clean packages, no orphan trash), not max length dump** | multi free-lead residual | 0503/0517 residual edge; 0506/0507 doubleseq lock; 0521 multi vs omin=1; 0545 split 678+8910; 0548 short 345 not 3456; 0549 789≻678; 0551 high seq residual; 0553 extend max clean; 0559 short chain; 0566 extend 56789TJ; 0579 low multi first then high backup; 0581 short chain | Core dual cliff: v60 multi-long bias vs human short/clean multi. Prefer short multi or residual-clean over long orphan-makers. |
| **5** | **Pass when deep + only high smash / 22 answers (save control)** | pass when deep | 0501 pass QQ; 0510 pass QKA; 0511 pass 22; 0547 pass 22; 0550 pass QKA; 0555 pass/J-pair | Expert already passes some high multi; dual BR `allowPass` only when **no cheap** — under-passes when cheap is structure-smash. |
| **6** | **Low pair open over mid multi when high pairs/Aces back you** | free-lead pair ladder | 0526 55≻8910; 0527 AA ladder; 0535 55≻QKA; 0538 345≻AA; 0542 55≻JJ; 0561 33≻AAA | Conflicts with pure multi-first dual lineage — needs **gated** low-pair pin (control reserve ≥2 high pairs or twos). |
| **7** | **omin≤1 / short opp: play highest single or long multi first (convert)** | 2-tempo / endgame | 0520a 2; 0532 high≻K-pair; 0558 2 first; 0564 high multi≻TT; 0572 A when omin=2; 0573 A when omin=1 | Already partial in `pickFreeLeadHard` omin≤1 branch; combat needs hard high-single when omin=1. |
| **8** | **Do not free-lead high singles / high pairs early with low trash still in hand** | trash-first + free-lead | 0530 2≻TJQ; 0535/0538/0540/0543 AA/high; 0576 K-trip waste | Guard: veto free-lead top≥9 single when trashCount≥1 && handLen≥6. |
| **9** | **Pair-split min-beat over run-start peel when both beat (and converse: loose over pair-break)** | structure break | 0520b 7-from-77≻6-from-6789; series-4/5 loose-card mass | Gold HARD block exists; dual `orderLegals(cheap)` may still pick run-start if cheap set is wrong. |
| **10** | **Seq combat residual: pick edge that leaves pair/run intact, not min-top peel of lower run** | multi residual | 0519 TJQ≻9TJ; 0549 789≻678; 0551 10JQ≻456; series-5 chain splits | `expertScore` has TJQK-like bias; dual combat soft-tie on sbc is the transfer path. |

### Theme → dual-safe class map

| Theme | Dual-safe locus | Avoid |
|-------|-----------------|-------|
| Combat structure residual | BR combat score soft-tie on sbc / residual pairs; root cand include sbc&lt;5 | Bulk expertScore rewrite; byR force |
| Trash / low-pair FL | `pickFreeLeadHard` gate + BR free-lead **pin** trash/short/low-pair into maxBranch | Multi-always; SoftN |
| 2-tempo | dualRollout conserve + gold hard-spend vs A/Q; BR include single-2 cand | Open 22 midgame |
| Pass when deep | expert pass gates + BR allowPass when min sbc of “cheap” ≥ threshold | Bulk pass reverse |
| Multi residual | FL residual orphan tax; combat seq residual preference | Long-multi dump |

---

## 3. Concrete `expertPolicy` / `expertScore` parameter changes (proposed)

All proposals are **general features** (handLen, omin, twos, trashCount, sbc, topRank, combo type). No byR multiset roots.  
**Gold risk** assumes suite stays on fair path (`mode=expert` both `expertPolicy` + `getAIMove`).

### A. `expertScore` — free-lead low-pair preference when control-backed

**Locus:** `expertScore` free-lead branch (`!cur`, pair / multi).

| Param | Current (approx) | Proposed | Rationale |
|-------|------------------|----------|-----------|
| Low pair free-lead bonus | top≤4: −26; top≤7: −12 | If `handLen≥9` && `twos≥1` && hold ≥1 high pair (rank≥10 count≥2): **extra −18** for pair top≤6 | Series 4: 55/33 open with AA/KK/2s backup (0526,0535,0542,0561) |
| Mid multi free-lead | length 3–6: −12; top≤9: −8 | If same control-backed gate **and** multi leaves orphan trash (analyzeHand trash would rise): **+14** tax on multi | 0526/0527 8910 loses control risk |
| Orphan-tax multi | (weak) | After hypothetical multi, if residual has isolated rank≤8: score **+10 + 4×orphanCount** | 0545,0548,0559,0581 |

**Gold risk:** Low–med. Existing doubleseq (−55) and 0517 hi-seq (−55) still dominate. Risk cases: P3 33 already wanted; 0506/0507 doubleseq first. **Re-run full fair gold** after edit. Dual: raises first-diff vs v60 multi-first.

### B. `expertScore` — combat sbc weight micro-tune (not bulk)

| Param | Current | Proposed | Rationale |
|-------|---------|----------|-----------|
| `sbreak * 6.5` | 6.5 | keep **6.5** | Already gold-dominant; do not bulk reweight (historical dual cliffs) |
| Pair-break single combat | sbc includes pair peel | Add: if single from pair (`cntR≥2`) **and** any legal loose single exists with sbc&lt;2: **+22** | Series 4–5 pair-break mass without changing global sbc |
| Triple peel | had≥3 cost +5 | If single from triple **and** loose exists: **+18** | 0523,0557 |

**Gold risk:** Low if gated on existence of loose alternative (0498/0502 already pass). Dual: helps cheap-path ranking shared via `orderLegals`.

### C. `expertPolicy` — pass when deep + high multi only (series 4–5)

**Locus:** combat after safe filter / midgame pass block (~640–656).

| Gate | Proposed | Gold images |
|------|----------|-------------|
| High seq only answer | already: loS≥9 && twos≥1 && handLen≥10 && omin≥5 → pass | 0510 |
| Extend | if `handLen≥9 && omin≥5 && twos≥1 && best is seq length≥3 with lo≥9` → pass even if handLen 9 | 0550 |
| Pair-of-2s | already handLen≥8 omin≥4 onlyPairTwos → pass | 0511; strengthen: if `handLen≥7 && omin≥6 && many trash (trashCount≥2)` → pass 22 | 0528,0547 |

**Gold risk:** Med. Over-pass can lose tempo vs aggressive dual opp. Keep **require twos≥1** and **omin≥5**. Dual: mild; BR may still play if rate wins.

### D. `expertPolicy` — omin≤1 combat high single

**Locus:** omin≤1 block (~536–544).

| Current | Proposed |
|---------|----------|
| Prefer single 2, else ordered[0] | If no 2: prefer **highest** legal single (rank desc) before multi; if multi length≥3 legal, prefer multi only when handLen−len ≤1 (near out) | 0532,0558,0573 |

**Gold risk:** Low–med. 0520a already 2. May conflict if high single is pair-break — prefer high **loose** first.

### E. `pickFreeLeadHard` — low-pair pin before multi-first

**Locus:** after trash-first block, before multi-first (~749–767).

```
// GENERAL: low pair open when deep + control reserve (series 4)
if (handLen >= 9 && info.twos >= 1) {
  var hiPairs = 0;
  for (r = 9; r <= 11; r++) if ((info.byRank[r]||0) >= 2) hiPairs++;
  if (hiPairs >= 1 || info.twos >= 2) {
    var lowPairs = multi.filter pair with topRank <= 6;
    if (lowPairs.length) return orderLegals(lowPairs)[0];
  }
}
```

**Gold risk:** Med. Must not beat doubleseq / 0517 hi-seq / 0518 22 short / omin≤1 multi. Place **after** those hard branches. Dual: high first-diff mass vs freeze multi.

### F. Dual-only (BR) — do not ship as gold-only residual package

| Lever | Locus (`p_l2s2b` lineage) | Shape |
|-------|---------------------------|-------|
| **BR_FL_PIN** | `bestResponseMove` free-lead cand set before maxBranch | Pin trash singles (rank≤6), low pairs (top≤6), short multi (len≤3) into root set |
| **BR_COM_SBC_SOFT** | BR score loop after rate | If `|rateA−rateB| < 0.08`, prefer lower `structureBreakCost` by ε=0.01 * Δsbc (not absolute WR package on one seed) |
| **BR_PASS_WHEN_SMASH_CHEAP** | allowPass | Allow pass when min sbc among non-2 legals ≥ 5 even if “cheap” (no 2/bomb) exists |

These raise dual skill **without** convert-on-S: no seed-list packaging; SoftN stays 0.

---

## 4. Minimal test cases for `evolve/run-gold-fair-suite.js` (Series 4–5)

**Current suite coverage:** Series 1–3 + P1/P3/P5 only (0498–0521). **Zero** Series 4–5 cases.

Add **minimal general** cases (construct hands from text; suits arbitrary as long as ranks/structure match). Use existing `both(mk(...), check, label)` pattern.

### Priority A — structure break (combat loose over pair/run)

```js
// IMG0523: loose Q over 5-from-triple
both(mk(handOf([[2,0],[2,1],[2,2], /*...*/ [9,0] /*Q*/]), [card(1,0)], 6),
  d => d.play && d.play.length===1 && d.play[0].rank !== 2 && d.play[0].rank >= 8,
  'IMG0523 loose not triple-peel');

// IMG0524: loose T over 5-from-pair
both(mk(handOf([[2,0],[2,1],[7,0] /*T*/]), [card(1,1)], 5),
  d => d.play && d.play.length===1 && d.play[0].rank === 7,
  'IMG0524 T not pair5');

// IMG0529: A over 10-from-TJQ
// IMG0533: 7 over 4-from-4567
// IMG0541: J over 5-from-pair (preserve TJQK)
```

### Priority B — free-lead trash / low pair

```js
// IMG0531: trash 4 first (not high 10) when deep + opp deep
// IMG0526: low pair 55 over mid multi 8910 when AA/KK backup
// IMG0540: trash 4 over free AA when deep trash + 22
// IMG0561: low pair over A-triple free-lead
```

### Priority C — 2-tempo / pass deep

```js
// IMG0525: single 2 over A-from-pair
// IMG0528: 3 / pass over pair-of-2s midgame deep
// IMG0547: pass pair-of-2s with many low cards
// IMG0550: pass QKA when deep low trash
```

### Priority D — multi residual / omin

```js
// IMG0545/0548/0559/0581: short multi chain not long orphan multi (check length<=3 or residual no trash)
// IMG0553/0566: extend longest clean seq when it doesn't orphan
// IMG0532/0558/0573: omin=1 → highest single / 2
```

**Minimal first ship (6 cases):** 0523, 0524, 0526, 0531, 0547, 0558 — covers structure, low-pair FL, trash FL, pass-22, omin=1. Expand after green.

**Implementation note:** Build hands carefully so `structureBreakCost` / `analyzeHand` see the intended pair/run; mirror Series 1–3 style approximations if full 13-card reconstruction is ambiguous from text alone. Prefer **behavior assertions** (rank class, pass, combo type) over exact suit.

---

## 5. Next 3 PAIR_STEP candidate experiments (GENERAL only)

Protocol: fair dual vs freeze **v60** · SoftN=**0** · BR both · hidden · n≥100 for accept · **W_max=9** · one axis each · **no** convert-on-S · **no** PAIR_STEP seed-loss policy edits.

Base body: restore/sync **L2s2b** (`dualRollout` + BR) if live `search.js` drifted; then one-axis challenger.

| # | Tag | Axis (one) | Mechanism | Gold interaction | Why dual vs v60 |
|---|-----|------------|-----------|------------------|----------------|
| **1** | `p_l2_fl_lowpair` | Free-lead low-pair pin | `pickFreeLeadHard` §E: deep + control → low pair before mid multi; doubleseq/hi-seq/omin≤1 unchanged | Adds Series-4 FL gold; risk to multi-first gold — gate strictly | v60 multi-dumps mid multi; human low-pair ladder first-diff |
| **2** | `p_l2_br_pin_fl` | BR free-lead candidate pin | `bestResponseMove` free-lead: force trash + short multi + low pair into root **before** maxBranch=12 | mode=expert gold suite unchanged | Fixes no-diff FL residual (historical mbtwo lesson); SoftN=0 |
| **3** | `p_l2_com_sbc_soft` | Combat BR residual soft-tie | When `|Δrate|<0.08`, add `−ε·sbc` (and optional pass if min non-2 sbc≥5) | expert combat path unchanged; dual playouts already orderLegals by expertScore | Combat structure is top human residual edge; no seed packaging |

### Accept gates (remind)

1. Fair gold suite **must stay GREEN** (expand Series 4–5 tests as you implement).  
2. PAIR_STEP: WR_new > WR_prev with CI discipline; **discard** any S_t convert packaging.  
3. Do not stack all three; probe **#2** first if dual first-diff mass is low, else **#1** if gold Series-4 FL fails.  
4. Micro dual n=48 both seats before n≥100 accept.

### Explicitly rejected as this note’s candidates

- Ultra-exact byR force roots / convert-on-S residual packs  
- SoftN &gt; 0  
- Bulk `expertScore` sbreak reweight  
- PAIR_STEP seed-loss–driven policy patches  
- Perfect-info duals as ship evidence  

---

## 6. Top 3 recommended levers (executive)

1. **`p_l2_br_pin_fl`** — BR free-lead pin trash/short/low-pair (dual first-diff; gold-safe).  
2. **`p_l2_fl_lowpair`** — gated free-lead low-pair over mid multi when control-backed (Series 4 gold + dual).  
3. **`p_l2_com_sbc_soft`** — combat BR soft-tie on structureBreakCost (Series 1–5 structure mass; SoftN=0).

**Immediate hygiene:** confirm live `search.js` still exports BR + `dualRolloutPolicy` matching `policies/p_l2s2b-search.js` before PAIR_STEP 0002.

---

## Sources

- `john_uploads/tien_len_AI.txt` Series 1–5  
- `john_uploads/tienlen-playlogs-1784093993176.json`  
- `evolve/run-gold-fair-suite.js`  
- `search.js` expertPolicy / expertScore / pickFreeLeadHard  
- `policies/p_l2s2b-search.js` dualRollout + bestResponseMove  
- `STATUS.md` · `evolve/eval-registry/gold-manifest.json`  
- Prior: `NOTE-gold-primary-sources.md`, `NOTE-fair-human-levers-v91.md`, `NOTE-fair-next-levers-after-mbtwo.md`
