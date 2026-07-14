# W24 — Playlog combat diverge census (human vs AI residual)

**Date:** 2026-07-14  
**Mode:** READ-ONLY analysis (no duals, SoftN forbidden)  
**Source:** `john_uploads/tienlen-playlogs-1784002833123.json`  
**Exported:** 2026-07-14T04:20:33Z · **179 games**  
**Base package:** `p_w17_brfltrash` (BR free-lead trash/pair only)  
**Artifact:** `scratch/playlog-combat-diverge.json`  
**Full sbc re-runner:** `evolve/_tmp_playlog_combat_diverge.py`

---

## 1. Counts table (human play|pass)

| Bucket | N | Share | Source |
|--------|--:|------:|--------|
| **Human decisions (play\|pass)** | **1389** | 100% | exact grep `"actor": "human"` |
| **Human play** | **1176** | 84.7% | 1389 − pass |
| **Human pass** | **213** | 15.3% | exact multiline type+seat+actor |
| **Free-lead** (no `currentCombo`) | **~575** | **~41.4%** | prior free/combat ratio on human decisions |
| **Combat** (`currentCombo` present) | **~814** | **~58.6%** | residual = total − free |
| ↳ combat play | ~601 | ~43.3% | combat − pass |
| ↳ combat pass | **213** | 15.3% | exact (all passes are combat) |
| Free-lead events all seats (`currentComboBefore: null`) | 894 | — | exact; human+AI free-leads |

**Split note:** free vs combat shares scaled from `playlog-strategy-inference.json` (older export: free 504 / combat 714 of 1218). Consistency: free-lead null count 894 across both seats aligns with human free ~575 + AI free ~319. Re-run `_tmp_playlog_combat_diverge.py` for exact free/combat join on this export.

---

## 2. Combat structure classes

| Class | Est. N | vs combat | Notes |
|-------|-------:|----------:|-------|
| **Structure-preserving min-sbc / loose single** | ~320 | ~39% | Dominant human combat *play* style; residual structure |
| Structure-preserving no pair-break (broader) | ~380 | ~47% | includes multi answers with sbc&lt;8 |
| **Structure-breaking pair-split single** | ~90 | ~11% | human *does* min-beat break sometimes (sample below) |
| Structure-breaking min-beat high-sbc | ~70 | ~9% | forced when all cheap answers break |
| **Pass with any legal** | ~95 | ~12% | voluntary fold mid-combat |
| Pass forced (`legalsCount=0`) | ~118 | ~14% | not a policy residual |
| **Pass with cheap legal** | ~55 | ~7% | **expert never does this** (always-play cheap) |
| **2-for-control** | ~60 | ~7% | prior `H_2_E_non2`=53 scaled |
| **Pass-save-2s** | ~40 | ~5% | hold 2s, pass mid multi/pair |

### Sampled gold events (this export)

| Game / line | Class | Detail |
|-------------|-------|--------|
| `g_mrk08snv…` i=3 | **pair-break min-beat** | Face 4♦; play **6♥** from pair-of-6 while **8♥ loose** legal |
| line ~6549 | **pass-with-legal** | Face seq 7-6-5; legal **9-10-J**; **PASS** handLen=10 |
| line ~6864 | pass forced | Face pair AA; `legalsCount=0` |
| line ~9095 | **pass-save-2s** | Hand holds **22**; face pair 6s; PASS |
| line ~24954 | pass forced + 2s in hand | Face KQJ seq; no legal |
| `g_mriwwj6w…` (prior CF) | **2-for-control** | Face 5; human **2** vs expert 6; omin=1 |

---

## 3. Top 5 human pattern classes

| # | Pattern | Est. count | Example game ids |
|--:|---------|----------:|------------------|
| 1 | **Struct-preserve loose single / min-sbc beat** | ~320 | `g_mriwwj6w_26fce1tp`, `g_mriwt9t9_r6o1gcsp`, `g_mriwqrjo_6lz7mni3`, `g_mrk08snv_pgi0xvst`, `g_mrjzqrhs_j5ip9wec` |
| 2 | **Pass forced no legal** | ~118 | `g_mrjzqrhs…` (AA face), mid-export seq-face zeros |
| 3 | **Pass with legal** (voluntary) | ~95 | `g_mrjzqrhs…` seq-face PASS; CF `H_pass_E_play` corpus |
| 4 | **2-for-control** | ~60 | `g_mriwwj6w_26fce1tp`, `g_mriwjwji_8pgetxhk` |
| 5 | **Pass-save-2s** | ~40 | lines ~9095 (22 vs pair6), ~41823 (2 vs long seq) |

Prior CF class histogram (older export, for rank-order support):  
`H_overkill_E_minimal` 59 · `H_2_E_non2` 53 · `E_longer_multi` 47 · `H_minimal_beat` 42 · `H_pass_E_play` 30 · residual hBetter **186** : eBetter **48**.

---

## 4. Least covered by `p_w17_brfltrash` (combat residual gaps)

**W17 axis (what it actually does):** free-lead BR only  
1. Low-pair force (bropair) when hand≥11, omin≥6  
2. Trash-first when control + trash + hi multi, hand 8..12  

**Combat path under W17:** `cheapLegals` → `orderLegals` → always play. No combat cand rewrite. No voluntary pass when cheap exists.

| Residual gap | Est. mass | W17 coverage |
|--------------|----------:|--------------|
| Struct-preserve min-sbc / loose single among multi answers | ~320 | **UNCOVERED** |
| Pass-with-legal / pass-with-cheap | ~95 / ~55 | **UNCOVERED** (hard always-play) |
| Pass-save-2s | ~40 | **UNCOVERED** |
| 2-for-control (non-race mid) | ~60 | partial via live expert TWO, **not** via W17 FL |
| Pair-break (human does) | ~90 | not a ship lever (AI already anti-break) |

**Holdout context (STATUS):** brfltrash holdout both-lose ~**81% freeze-identical**; W18–W23 BR FL/combat cand micros dual-null/−1. Absolute 0.70 needs **expertPolicy residual** (or larger leaf), not more FL trash filters.

---

## 5. ONE combat `expertPolicy` lever (fires often)

### Name: `ex_combat_residual_force_minsbc`  
### Tag: `p_w24_exresforce` (same family as architecture Lever A)

**Locus:** `expertPolicy` cheap return  
`if (cheap.length) return { play: orderLegals(cheap)[0] };`

**Rule (one axis, always play — no pass):**

When combating, cheap nonempty, handLen≥7, omin≥4, curTop&lt;10, and ≥2 same-type cheap answers:

1. `structureBreakCost` ASC (loose / no pair-break first)  
2. residual pairCount DESC  
3. residual maxRun DESC  
4. gap ASC (min-beat tertiary only)  

Return first. **Do not** add voluntary pass (W16 pass-unique burned DEV_VAL).

**Why this lever:**
- Fires on **most combat plays with multi cheap answers** (~hundreds of decisions / export).  
- Targets the #1 human mass (structure preserve) and the freeze-identical leaf that makes BR duals null.  
- Completely **orthogonal to W17 FL trash/pair**.  
- SoftN forbidden; duals not run in this note.

**Not chosen as primary:** `ex_combat_struct_pass_breakonly` (pass when all cheap break / deep multi fold) — high human mass on pass-with-cheap, but pass-structure is DEV_VAL landmine per W16 / STATUS.

---

## 6. Next (when implementing)

1. `python3 evolve/_tmp_playlog_combat_diverge.py` → exact sbc/pattern counts into JSON.  
2. Copy brfltrash → `p_w24_exresforce-*` with lever only.  
3. First-diff smoke vs freeze brfltrash (SOFT=0).  
4. DEV T20 → DEV_VAL → holdout only if gates pass.  
5. SoftN stays dead. No duals until first-diff shows combat mass.

---

## Artifacts

| Path | Role |
|------|------|
| `scratch/playlog-combat-diverge.json` | counts + top5 + lever |
| `evolve/_tmp_playlog_combat_diverge.py` | full stream census |
| `evolve/NOTE-w24-architecture-levers.md` | fair dual architecture map (sibling) |
| `policies/p_w17_brfltrash-search.js` | base package |
