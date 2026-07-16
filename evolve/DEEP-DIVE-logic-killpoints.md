# Deep dive — logic kill-points blocking gold / intended AI

**Stamped:** 2026-07-16  
**Trigger:** Product force-expert bug + free-lead BRD root order wiped by `orderLegals`  
**Question:** Why do “obvious” mistakes in `john_uploads/tien_len_AI.txt` still happen? Did training try to imitate author logic but get blocked?

---

## Executive answer

**Yes — multiple structural bugs and pipeline gaps block gold logic from becoming the dual/product brain.**

Your instinct is right: it is not only “the model is weak.” Several layers **overwrite, ignore, or never encode** the recommendations in `tien_len_AI.txt`. Training often learns a signal (BR-distill, BC weights) that is then **re-sorted away**, **never loaded**, or **only tested on expert leaf** while duals run a different path.

| Layer | Status | Blocks gold? |
|-------|--------|--------------|
| Product force-expert (controller) | **Fixed** (L2s97) | Was product-only; duals OK |
| Free-lead BRD sort → `orderLegals` wipe | **STILL LIVE** in `search.js` | **Yes — dual free-lead BR root** |
| `freeLeadCandidates` ends with `orderLegals` | **STILL LIVE** | **Yes — before BRD even runs** |
| MC/MCTS root also `orderLegals` + maxBranch | **STILL LIVE** | Yes — search branch set |
| BC action weights trained, not in live | **Dead artifact** | Training never enters live search |
| `tien_len_AI.txt` → machine tests | **~71% unencoded** | Gold never becomes a gate |
| Gold suite path = expert, duals = BR | Split brain | Green gold ≠ dual behavior |
| Controller `cheap-force` pass veto | **STILL LIVE** | Pass gold can be overridden |
| BR rollouts = `dualRolloutPolicy` / expert leaf | By design | Teacher ≠ full human plan |

---

## 1. Confirmed still-live: BR free-lead BRD wiped by `orderLegals`

### Code (`search.js` `bestResponseMove`)

```text
if (!cur) {
  leg = freeLeadCandidates(...);     // ← already orderLegals at end
  leg = sort by brdLogit DESC;       // L2s85 intended teacher order
}
leg = orderLegals(leg, ...);         // ← WIPES BRD ORDER
leg = leg.slice(0, maxBranch);       // free lead maxBranch=16
// then only those roots get trials
```

### Why this kills intended logic

1. **BR-distill teacher ranking is dead for candidate selection.**  
   Only the soft `brdTerm` (±0.05 on rate) remains for actions that *already* survived the expert cut.

2. **`freeLeadCandidates` also ends with `orderLegals`** (L1433).  
   Even the BRD sort input is expert-prioritized, not teacher-prioritized.

3. **Accept 0100 (`p_l2s86`) claimed “BR free-lead root candidate order”** as a method.  
   That claim is **partially defeated by this wipe** unless the useful plays already ranked high under `expertScore`. Distill may still help slightly via `brdTerm` / `pickFreeLeadHard` residual, but **not** as a root-order prior.

4. **Same class as you suspected** — STATUS even analogizes force-expert to “orderLegals wiping BRD.” The wipe is **still in live `search.js` and `policies/p_l2s86-search.js`.**

### Minimal mental model

```text
intended:  many free-lead acts → BRD ranks human-like multi/trash → top-K trials → pick max rate
actual:    free-lead acts → expertScore order → top-K only → BRD re-sort is NO-OP for K
                                              → weak brdTerm on survivors
```

---

## 2. Other overwrite / veto points (same family)

### 2a. MC / MCTS root (`flatMonteCarlo` ~L1005)

```text
candidates = orderLegals(legals)
candidates = candidates.slice(0, maxBranch)
```

Any search mode that is not BR still explores **expert-first branch**, not gold structure-first.

### 2b. `enforcePolicyGuards` free-lead high-single veto (~L849–855)

If search returns a high single free-lead (rank ≥ 9) while multi exists → **rewrites to `orderLegals(multi)[0]`**.  
Can help or hurt depending on gold case; not BR-aware.

**Note:** On BR path, `getAIMove` **skips** full `enforcePolicyGuards` (only omin=1 low-single fix). Good for BR fidelity; bad if BR already wrong.

### 2c. Controller safety nets (`controller.js`)

Still present after force-expert fix:

| Guard | Effect |
|-------|--------|
| `cheap-force` | If AI returns **pass** but any non-2 non-bomb legal exists → **force cheapest beat** |
| `illegal-or-guard` | Invalid / gift low single vs 1-card opp → fallback |
| High free-lead single + multi + handLen>5 | Reject, force multi fallback |

**Impact on gold:** Many author notes say **Pass** (0501, 0510, 0511, 0547, 0550…).  
If the model correctly passes but a “cheap” smash exists, **controller forces the smash** — exactly the structure-break class in Series 1–2.

This is product path (and any controller-driven self-play). Pure dual harness does **not** use controller, so dual WRs ignore this veto; **live play still has it.**

### 2d. `dualRolloutPolicy` combat “safe then cheap” (~L1650–1659)

BR playouts use `dualRolloutPolicy` (not full BR nested):

```text
if safe (sbc<5) exists → orderLegals(safe)[0]
else if cheap exists → orderLegals(cheap)[0]   // often structure-blind min
```

So even when root BR considers a gold-like act, **future leaves** often play smash-min. That biases rates toward “whatever wins against a smash-happy leaf,” not against human-like opponents.

### 2e. Product force-expert (fixed)

Was: GM opponent = expert leaf only.  
**Duals never used this.** Explains opponent vs hint discrepancy only.

---

## 3. Gold / training pipeline: recommendations never reach “next level”

### 3a. Encoding gap (hard numbers)

| Source | Count |
|--------|------:|
| Unique `IMG_*` in `tien_len_AI.txt` | **105** |
| Roughly asserted in gold suite / test-search | **~30** |
| **Not machine-encoded** | **~75 (~71%)** |

STATUS admits: *“Series 6 … suite still 62 cases (new images not all machine-encoded yet).”*

**Unencoded gold cannot fail a gate, cannot train a loss, cannot block accept.**  
Training “tries” only what is in playlogs / synthetic BR teachers — **not** the prose recommendations in `tien_len_AI.txt`.

### 3b. Gold suite tests the **wrong path for duals**

`run-gold-fair-suite.js`:

```js
mode: 'expert', iterations: 0, bestResponse: false
```

PAIR_STEP / audits:

```js
mode: 'auto', bestResponse: true, brTrials: 20, difficulty: 'grandmaster'
```

So:

- Green **62/0** = expert leaf + handcrafted assertions  
- Dual strength = BR + dualRollout leaves  
**Passing gold does not prove dual plays gold.** Failures on product/hint GM can still match author screenshots while gold is green.

### 3c. Historical dual vs gold tension (documented)

`NOTE-gold-status-honest.md` (2026-07-14):

- Full series-3 bulk → dual cliff (~0.50)  
- Rule: *gold remains recommendations; ship needs dual under hidden GM*  
- Bulk gold patches were **deliberately not** fully merged when they dual-regressed  

So training sessions often **chose dual WR over gold fidelity**. That is a process bug relative to your goal of imitating author logic — not just a code wipe.

### 3d. BC training is a dead end today

- `train-bc-action.js` reads **playlogs only** (not `tien_len_AI.txt` images)  
- Writes `bc-action-weights.json` (acc ~0.60)  
- **Live `search.js` has no `BC_W` / `bcLogit`** (only `BRD_W`)  
- Older freezes (e.g. p_l2s77/82) had BC wired + same orderLegals wipe pattern  

**Human imitation from BC never lands in current champion path.**

### 3e. BR-distill teacher ≠ author gold

`train-br-distill.js`:

- Teacher = high-trial BR  
- Opp / advance leaf = freeze `dualRolloutPolicy` / expert  
- Not labeled from `tien_len_AI.txt` preferred moves  

So distill imitates **“what high-trial BR vs smash leaf likes”**, not “what John wrote next to IMG_0599.”

---

## 4. Why dumb mistakes in AI.txt still appear

Map common author themes → kill-points:

| Author theme (examples) | Why it still fires |
|-------------------------|-------------------|
| Don’t smash pair/run for min beat (0500–0504, 0523+) | dualRollout/cheap path + controller cheap-force; BR root may not include loose beat if filtered |
| Pass plan hands (0501, 0510, 0547, 0550) | controller cheap-force; dualRollout rarely passes mid; BR allowPass only when **no** cheap legal |
| Free-lead trash / low first with control (0514, 0531, 0540, 0599) | freeLeadCandidates prefers multi; expertScore + maxBranch may drop pure trash; BRD wipe |
| omin=1 highest single (0597, 0601) | Partially patched in pickFreeLeadHard; product force-expert used to skip it; still fails if not in BR set |
| Extend full straight (0553, 0566, 0588) | Long seq may lose expertScore to short multi; maxBranch cuts it; BRD wipe |
| 2-for-control (0513, 0525, 0584) | Fixed on expert/dualRollout combat; product force-expert used to hide it |

---

## 5. Did this affect dual training vs v6.0?

| Activity | Affected by force-expert? | Affected by BRD/`orderLegals` wipe? |
|----------|---------------------------|-------------------------------------|
| PAIR_STEP duals | **No** (never controller) | **Yes** for free-lead root selection |
| Independent audits n50/n200 | **No** | **Yes** (same dual code) |
| Gold suite 62/0 | N/A (is expert) | Expert path separate; green ≠ dual gold |
| BR-distill training | No | Teacher uses BR — **same wipe in product BR** when evaluating candidates |
| Live product pre-fix | **Yes** | Hint used BR (wiped); opponent used expert |

So dual WRs are **not** “fake from force-expert,” but free-lead skill **is** capped by expert-first branch + BRD wipe. That can stall absolute WR ~50–58% even when distill “works.”

---

## 6. Priority fix list (highest leverage first)

1. **Remove post-BRD `orderLegals` in `bestResponseMove` free-lead path**  
   - After BRD sort (or after freeLeadCandidates), **do not** re-sort by expertScore before `maxBranch`.  
   - Optional: `orderLegals` only as tie-break within same brdLogit bucket.  
   - Regression: assert top-K after sort matches BRD order (unit test).

2. **Stop ending `freeLeadCandidates` with pure `orderLegals`**  
   - Keep gold pins (doubleseq, omin=1, trash+control) then sort by BRD or hybrid, not expert alone.

3. **Controller: do not `cheap-force` over intentional pass** when model returned pass under GM/search  
   - Or only cheap-force if search stats missing / error fallback.  
   - Gold pass cases will never stick in product otherwise.

4. **Encode Series 4–6 (and remaining Series 1–3) as machine cases**  
   - Prefer dual/GM path tests, not only expert.  
   - Manifest refresh alone does not create assertions.

5. **Wire BC or gold action labels into the same scorer that ranks BR roots**  
   - Dead `bc-action-weights.json` is wasted compute until loaded and **not** wiped by orderLegals.

6. **Dual-path gold gate**  
   - Secondary suite: `getAIMove` GM+BR SoftN=0 on encoded cases.  
   - Accept requires gold expert green **and** dual-path gold not regressed (or explicit allowlist).

7. **Leaf policy**  
   - dualRollout structure-safe is partial; plan-pass and loose-beat still thin. Without leaf improvement, BR rates stay biased.

---

## 7. One-sentence thesis

**Gold text is mostly not encoded; encoded gold is tested on expert; duals run BR whose free-lead roots are re-sorted by expertScore (BRD wipe still live); product also cheap-forces passes — so author logic is systematically prevented from becoming the trained dual/product policy.**

---

## Artifacts / code anchors

| Item | Location |
|------|----------|
| BRD wipe | `search.js` ~1711–1729 |
| freeLeadCandidates orderLegals | `search.js` ~1433 |
| MC branch order | `search.js` ~1005–1007 |
| enforcePolicyGuards | `search.js` ~831–866 |
| getAIMove BR skip guards | `ai.js` ~796–806 |
| controller cheap-force | `controller.js` ~423–441 |
| Gold fairMove expert | `evolve/run-gold-fair-suite.js` ~54–64 |
| BC train (unwired live) | `evolve/train-bc-action.js` |
| Author gold prose | `john_uploads/tien_len_AI.txt` (105 IMGs) |

---

## Implementation status (2026-07-16 L2s100)

| Fix | Status |
|-----|--------|
| §1 BRD wiped by orderLegals in bestResponseMove free-lead | **Fixed** (BRD sort is FINAL after orderLegals; regression `test/test-killpoints-brd-order.js`) |
| §2a freeLeadCandidates pure orderLegals | **Fixed** — BRD-ranked after gold pins; omin=1 includes all singles |
| §2a MC root orderLegals | **Fixed** — free lead uses freeLeadCandidates |
| §2c controller cheap-force | **Fixed** — only when `aiMeta.error` or missing search stats |
| §2e product force-expert | **Fixed** earlier (L2s97 controller) |
| §3a encode Series 6 | **Partial** — S6 2-control + omin1 free + pass22 in gold suite (70 cases) |
| §3d wire BC | **Not yet** — still dead weights; BRD is the live teacher scorer |
| §6.6 dual-path gold gate | **Not yet** — suite still expert fair path primarily |

Live freeze: `policies/p_l2s100-*`. Dual champion remains `p_l2s86` until PAIR_STEP accept.
