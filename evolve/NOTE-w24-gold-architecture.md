# W24 — Gold architecture levers (beyond BR free-lead cand micros)

**Date:** 2026-07-14  
**Status:** READ-ONLY analysis + written specs only. **Do not** run duals. **Do not** edit live `ai.js`/`search.js`. SoftN **forbidden**.  
**Base package:** `policies/p_w17_brfltrash-search.js` — best transfer-safe dual (DEV 33, DEV_VAL Δ+2, holdout ~0.52).  
**Primary gold:** `john_uploads/tien_len_AI.txt` Series 1–4 + `john_uploads/IMG_*.PNG`.  
**Context:** Holdout both-lose paths ~**81% freeze-identical** under brfltrash. W18–W23 BR FL / combat **cand micros plateau / dual-null**. Absolute fair dual WR>0.70 needs **larger behavioral change** that moves **expertPolicy self-playout leaf + root expert picks**, not another BR free-lead cand filter.

---

## 1. Gold theme catalog (by frequency)

Primary assignment per image (51 gold frames, Series 1–4). Dual-label frames counted once under the dominant correction.

| Rank | Theme | n | Image IDs | Gold correction in one line |
|-----:|-------|--:|-----------|-----------------------------|
| 1 | **Loose / structure-safe combat beat** | **17** | 0500, 0502, 0504, 0512, 0513, 0516, 0523, 0524, 0525, 0529, 0532, 0533, 0534, 0537, 0541, 0544, 0552 | Do not break pair/run/triple; answer with loose single or **2-control** |
| 2 | **Trash / low-first free-lead plan** | **12** | 0514, 0518, 0526, 0527, 0530, 0531, 0535, 0538, 0539, 0540, 0542, 0543 | Shed trash or low package before high multi/AA; keep control package for later |
| 3 | **Seq residual multi** | **8** | 0503, 0517, 0519, 0520, 0545, 0548, 0549, 0551 | Same-class multi: leave pair/run residual, not trash singles |
| 4 | **Plan-pass / 2-budget save** | **6** | 0501, 0510, 0511, 0528, 0547, 0550 | Pass (or low single) vs high multi/22; save 2s and high packages |
| 5 | **FL structure / package integrity** | **5** | 0498, 0505, 0506, 0507, 0521 | Free lead must not split pair/run; prefer full dseq / intact low multi |
| 6 | **Sure-control first** | **3** | 0499, 0518†, 0530† | Lead unanswerable 22 / 2-ladder when finish is locked († also in trash/low plan) |

**Cross-cutting sub-signals (not primary rows):**
- **2-tempo reclaim over pair-break:** 0500, 0513, 0516, 0525, 0544 (subset of theme 1).
- **omin=1 highest-single climb:** 0532 (overrides “min top” instincts).
- **Early high multi risk:** 0526, 0527, 0535, 0538 (theme 2).

Historical gold fail themes (`NOTE-gold-status-honest.md`) match this census: loose>smash, 2-budget, plan-pass, FL plan, residual multi.

---

## 2. Theme → code class map (prefer non-BR-cand)

| Theme | expertPolicy | orderLegals / expertScore | BR-cand | pass | leaf (self-playout) | Prefer? |
|-------|:---:|:---:|:---:|:---:|:---:|---------|
| 1 Loose combat beat | **PRIMARY** cheap-path hard filter | secondary soft sbc already present | W21 pairdrop/hirez **failed** | — | **cascades every BR trial** | **YES — #1** |
| 2 Trash/low FL plan | **pickFreeLeadHard** multi-always today | FL expertScore trash bonus soft | **W17 brfltrash** (best package; plateau) | — | FL leaf still multi-always ≠ BR root | YES as #3 (expert FL, not more BR FL) |
| 3 Seq residual multi | hard multi residual pick on cheap | residual-first order (W3 flat) | W18 brseqres **dual-null** | — | yes if expert multi pick changes | YES but lower mass / historically flat |
| 4 Plan-pass / 2-budget | gated pre-cheap pass or 2 | — | **W16 brbestpass DEV_VAL reverse** | **PRIMARY risk class** | pass leaf changes rates | CAUTIOUS — pass family burned transfer |
| 5 FL package integrity | pickFreeLeadHard dseq/low multi | multi sort keys | bropair / brflo family | — | yes | Medium — overlaps W14 pair force |
| 6 Sure-control first | 2/unans before trash race | — | W19 brflsure2 **dual-null** | — | yes | Low alone |

**Architecture diagnosis (why BR cand plateaued):**
- Fair dual leaf = **shared `expertPolicy`** self-playout (not recursive search).
- W17 only mutates **free-lead BR root cand**. Combat `expertPolicy` cheap path remains:
  ```js
  var cheap = cheapLegals(leg);
  if (cheap.length) return { play: orderLegals(cheap, state, cp)[0] };
  ```
- After first lead (or on pure combat seeds), CHALL≈freeze → **~81% freeze-identical both-lose**.
- Soft structure in `expertScore` is not enough: W19 `exresmax` (hard residual single pick) was **dual-null** vs base. Need a **discrete action-set / hard gate** on the cheap leaf, not another soft reorder.

**Forbidden / burned (do not re-propose as “new”):** SoftN · mintop hard `orderLegals`-before-expertScore · bulk series-3 gold · W16/W18 high-smash **BR force-pass** retune · more BR FL trash/pair micros on holdout-loss seats · Soft multiTie.

---

## 3. TOP 3 architecture levers (freeze-path changing)

Levers ranked by expected ability to create **combat first-diffs** on freeze-identical both-lose paths while staying gold-aligned and non-BR-cand-primary.

### Ranked summary table

| Rank | Lever | Class | First-diff class | Gold mass | DEV_VAL reverse risk | Probe tag |
|-----:|-------|-------|------------------|----------:|----------------------|-----------|
| **1** | **EXPERT_CHEAP_LOOSE_SBC_FILTER** | expertPolicy cheap leaf + root | `combat_single_loose` / `combat_sbc_filter` | 17 | Medium (not pass-family; not mintop) | **`p_w24_ex_loosebeat`** ⭐ |
| **2** | **EXPERT_SMASH_CTRL2_THEN_PASS** | expertPolicy pre-cheap (2-tempo / gated pass) | `combat_2_reclaim` / `combat_plan_pass` | 11 (2-tempo+pass) | **High** if pass wide (cite W16/W18) | `p_w24_ex_smash2pass` |
| **3** | **EXPERT_FL_TRASH_LOW_PLAN** | expertPolicy `pickFreeLeadHard` | `free_lead_trash` / `free_lead_low_multi` | 12 | Medium–high (comment: aggressive trash dual re-loss) | `p_w24_ex_flplan` |

---

## 4. Lever specs

### #1 — `EXPERT_CHEAP_LOOSE_SBC_FILTER` ⭐ (recommended first probe)

| | |
|--|--|
| **Axis** | In `expertPolicy` combat, after `cheapLegals`, for **single** current combos: if any cheap **single** has `structureBreakCost < 8`, **return only from that low-sbc set** (hard filter), never pair/run smash singles. Multi-type cheap unchanged. |
| **Why architecture (not BR micro)** | Fires on **every self-playout leaf step** and expert root fallback. Diverges freeze-identical midgames even when BR cand sets match. W21 BR residual cand surgery did **not** convert; leaf model can. |
| **Why not W19 exresmax clone** | `exresmax` *reordered* residual max among all singles → dual-null. This **deletes** high-sbc singles from the chosen set when a loose exists — matches gold language (“next card should be … loose”). |
| **Precise triggers** | `cur` truthy; `cur.type === 'single'`; `handLen >= 5`; `cheap = cheapLegals(leg)` non-empty; among `cheap` with `length===1`, ∃ play with `structureBreakCost(hand,p) < 8`. Then pick `orderLegals(looseOnly)[0]`. If no loose single, fall through to default cheap. |
| **Expected first-diff class** | `combat_single_loose`, `combat_pair_break_avoid`, `combat_run_break_avoid` (rarely `combat_triple_break_avoid`). Not free-lead-only noise. |
| **Gold images satisfied** | **0500**, **0502**, **0504**, **0512**, **0523**, **0524**, **0529**, **0533**, **0534**, **0537**, **0541**, **0552** (core); 0513/0516/0525/0544 only if loose exists *or* left to lever #2 for pure-2 path. |
| **DEV_VAL reverse risk** | **Medium.** Cite: W16/W18 were **pass** failures (`20290634@0`), not loose-filter. Soft residual (W19 exresmax) transferred (Δ+2) but **null mass**. Mintop-family holdout fail was **global orderLegals rekey** — avoid. Risk modes: race climbs that intentionally split a pair when gap forces it; gate keeps multi/non-single + no-loose fallthrough. Require DEV_VAL before holdout. |
| **SoftN** | Forbidden. |

**Patch location (base `p_w17_brfltrash-search.js`):**

- **Function:** `expertPolicy`
- **After comment / lines:** after `// v9.1 combat pass: deep mid multi fold…` block (~407–417) and  
  **`var cheap = cheapLegals(leg);`** (~419)  
  **before**  
  `if (cheap.length) return { play: orderLegals(cheap, state, cp)[0] };` (~420)

**Exact pseudocode:**

```js
var cheap = cheapLegals(leg);
// W24 p_w24_ex_loosebeat: gold loose > pair/run smash (0502/0504/0512/0523/…)
// Hard-filter combat cheap singles when a true low-sbc single exists.
if (cheap.length && cur && cur.type === 'single' && handLen >= 5) {
  var loose = [], iL, pL, sL;
  for (iL = 0; iL < cheap.length; iL++) {
    pL = cheap[iL];
    if (!pL || pL.length !== 1) continue;
    sL = structureBreakCost(hand, pL);
    if (sL < 8) loose.push(pL);
  }
  if (loose.length) return { play: orderLegals(loose, state, cp)[0] };
}
if (cheap.length) return { play: orderLegals(cheap, state, cp)[0] };
```

---

### #2 — `EXPERT_SMASH_CTRL2_THEN_PASS`

| | |
|--|--|
| **Axis** | **Before** cheap return: if *every* cheap legal has `structureBreakCost ≥ 8` and hand can re-take (`twos≥1` or `control≥2` or mid pair≥1): (a) single + `twoSingles` + `curTop≥8` → play lowest-suit 2; (b) else multi/pair + deep mid (`handLen≥9`, `omin≥5`, `curTop<10`) → **pass**. |
| **Why architecture** | Today **any** cheap smash short-circuits forever: `if (cheap.length) return orderLegals(cheap)[0]` never reaches 2-tempo or pass. Gold 0513/0516/0525/0544 lose because K/A from pair is “cheap.” |
| **Precise triggers** | After deep multi fold; before cheap return. `minSbc(cheap) ≥ 8`. Retake: `infoC.twos≥1 \|\| infoC.control≥2 \|\| mid pair ranks 6–11`. Branch (a) `cur.type==='single' && twoSingles.length && curTop>=8`. Branch (b) `cur.type!=='single' && !playIsBomb(cur) && handLen>=9 && omin>=5 && curTop<10`. |
| **Expected first-diff class** | `combat_2_reclaim`, `combat_plan_pass`, `combat_pair_smash_skip`. |
| **Gold images** | 2-path: **0513, 0516, 0525, 0544, 0500**. Pass-path: **0501, 0510, 0511, 0547, 0550**. |
| **DEV_VAL reverse risk** | **High on pass branch.** Cite **W16 `p_w16_brbestpass`**: DEV 32, **DEV_VAL 24 Δ−1** seat `20290634@0`. Cite **W18 `p_w18_trash_pass`**: DEV +1 vs base, **DEV_VAL Δ+1 FAIL**, same reverse seat. **Do not** re-tune BR force-pass gates to chase VAL. If probing #2, ship **2-branch only first** (`p_w24_ex_smash2` without pass) or accept high reverse risk. |
| **vs W16** | W16 emptied **BR cand** to pass-only. This changes **leaf policy** so rates of *all* remaining root acts move — different mechanism, same gold pass theme risk. |

**Patch location:** `expertPolicy`, **immediately before** `var cheap = cheapLegals(leg);` (after v9.1 deep multi fold ~416).

```js
// W24 p_w24_ex_smash2pass (or p_w24_ex_smash2 2-only): all-cheap-smash + retake
// ... compute minSbc over cheap preview, then 2 or pass as above ...
var cheap = cheapLegals(leg);
```

---

### #3 — `EXPERT_FL_TRASH_LOW_PLAN`

| | |
|--|--|
| **Axis** | In `pickFreeLeadHard`, when multi exists + `hasControl` + trash≥1 + hand 8..12 + omin≥4: prefer trash single (or low pair top≤6 sbc&lt;8) over high multi (top&gt;7 or len≥3 top&gt;6). Aligns **expert leaf FL** with W17 BR root trash force. |
| **Why architecture** | W17 only BR-root FL; leaf self still **multi-always** (v7.5/v8.5). Playouts after any multi FL still model freeze-like control burns → combat freeze-identical residual. Expert FL plan changes **entire subsequent leaf tree**. |
| **Precise triggers** | `!cur` path inside `pickFreeLeadHard` after unanswerable multi short-circuit; `multi.length`; `info.hasControl && info.trashCount>=1`; `handLen 8..12`; `omin>=4`; exists multi with `topRank>7 || (len>=3 && top>6)`. Then return lowest trash single (or lowest safe low-pair if no trash). |
| **Expected first-diff class** | `free_lead_trash`, `free_lead_low_pair`, then secondary combat diffs from divergent hands. |
| **Gold images** | **0514, 0531, 0535, 0538, 0539, 0540, 0542, 0543, 0526, 0527** (+ package 0505/0506 as low multi variants). |
| **DEV_VAL reverse risk** | **Medium–high.** In-file comment (~629–630): “aggressive trash default re-lost flips”; hybrid trash only under `_exploitFlMode`. W17 BR trash **cleared DEV_VAL** — expert FL is stronger (always-on leaf) so higher dual risk than BR-only. Do **not** stack on more BR FL micros first. |

**Patch location:** `pickFreeLeadHard`, after unanswerable/forceExp block (~602–617), **before** multi-always pool sort (~619–641).

---

## 5. Recommended ONE first probe

| | |
|--|--|
| **Tag** | **`p_w24_ex_loosebeat`** |
| **Base** | Copy `policies/p_w17_brfltrash-{ai,search}.js` → `policies/p_w24_ex_loosebeat-{ai,search}.js` |
| **Axis** | Lever #1 only (one axis). No SoftN. No pass. No BR cand edit. |
| **Function** | `expertPolicy` |
| **Insert after** | `var cheap = cheapLegals(leg);` |
| **Insert before** | `if (cheap.length) return { play: orderLegals(cheap, state, cp)[0] };` |
| **File anchor** | `policies/p_w17_brfltrash-search.js` ~**lines 419–420** (combat cheap return) |
| **Why first** | Highest gold mass (structure-safe combat); non-BR-cand; non-pass (avoids W16/W18 VAL reverse family); discrete filter stronger than dual-null `exresmax`; directly attacks freeze-identical **combat** leaf paths. |
| **Success bar (when duals later)** | Design mass / first-diff on `combat_*` not FL-only; full DEV ≥32 & Δ≥+2 vs id; **DEV_VAL Δ≥+2** before holdout; target absolute WR>0.70 remains multi-step — this probe is the first leaf wedge, not the whole ship. |
| **Reject siblings this wave** | BR FL cand add-ons · BR force-pass retune · SoftN · mintop orderLegals · bulk residual multi · stacking #2 pass branch with #1 in one probe |

---

## 6. Process reminders

1. Prefer **non-BR-cand** architecture until combat first-diff mass appears on holdout-loss seats.  
2. Pass-on-high-smash remains gold-true but **selection-hostile** (W16/W18 `20290634@0`).  
3. SoftN dead / forbidden.  
4. Live stays v9.x until holdout ship gate; brfltrash remains best transfer-safe package until a probe beats it on DEV_VAL **and** absolute WR.

---

*Outputs also mirrored under scratch: `NOTE-w24-gold-architecture.md`.*
