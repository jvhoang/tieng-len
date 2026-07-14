# PRIMARY GOLD SOURCES — locked for ladder (v9.1 → v11.0)

**Updated:** 2026-07-14  
**Authority:** User personal live play + written analysis. These outrank internal dual heuristics when designing levers.  
**Cadence:** Implement **slowly, one axis at a time**, with fair-dev-split → full DEV → DEV_VAL → holdout. Never bulk-rewrite from gold dumps.

---

## 1. Directory (canonical)

```
tieng-len/john_uploads/
```

| Asset | Role |
|-------|------|
| **`tien_len_AI.txt`** | GOLD written recommendations per screenshot (Series 1–4) |
| **`IMG_0498.PNG` … `IMG_0552.PNG`** (51 images) | Live positions the text refers to |
| **`tienlen-playlogs-*.json`** (newest: `tienlen-playlogs-1784002833123.json`) | Full event streams of personally played vsAI games (deal, handBefore, play/pass, legals) |

Always prefer the **newest** `tienlen-playlogs-*.json` by mtime / `exportedAt` when refreshing analysis.

---

## 2. Gold series index (`tien_len_AI.txt`)

| Series | Images | Dominant lessons |
|--------|--------|------------------|
| **#1** | 0498–0504 | Residual structure: don't break pairs/runs; free-lead keep pair; combat 2 vs smash high; pass when smash high multi; run residual order |
| **#2** | 0505–0513 | Free-lead trash vs break run; lock multi (334455); pass save 2s/high pairs; loose single not pair-break |
| **#3** | 0514–0521 | Trash-first free-lead; 2-control before junk; run-edge residual; low multi before high pair open |
| **#4** | 0523–0552 (added 7/13/26) | Same axes at scale: loose card > pair-break; low pair open; preserve straights; pass high when deep trash; omin=1 play high |

**Ship rule:** Gold green is a **recommendation lock**, not a substitute for fair dual WR>0.70. Dual gate still ships.

---

## 3. Theme → lever design classes (map for future, not bulk implement)

Ordered by gold frequency + dual-transfer lessons:

| Theme (from text + playlog) | Dual-safe class | Status |
|-----------------------------|-----------------|--------|
| Free-lead low pair / don't open trash multi | FL BR unique-max deletion (brflo family) | W14 **split-pass**, T20 **31/50** (one short of DEV≥32) |
| Don't break pair/run for min beat | Residual keep / combat structure | W12–13 dual-null or reverse-split if reorder-only |
| Pass when only high smash answers | Expert smash→pass / BR pass unique | Gates often dual-null under equal BR |
| Trash-first when control | FL trash force when no low pair | Not yet clean dual mass |
| 2 for control / save 2 midgame | TWO race / g2hi | g2 alone design Δ+1 weak; stack unproven for DEV_VAL |
| omin=1 play high | Endgame high single | Narrow; low dual mass |

**Process:** One theme → one probe tag → first-diff census → split → DEV → DEV_VAL. No multi-theme packages until each axis is selected.

---

## 4. Playlog JSON (live behavior)

**Newest:** `john_uploads/tienlen-playlogs-1784002833123.json`  
- `exportedAt`: 2026-07-14T04:20:33Z  
- **179 games** (mostly vsAI)  
- Events include: `handBefore`, `cards`, `legals`, `isFirstLead`, `currentComboBefore`, actor human/AI  

Prior census (structure only; AI-hint field often empty): high combat volume; min-top plays common; FL low pairs and singles-while-pair present; human pass-with-cheap-legal exists.

Refresh analysis after each new export before designing the next lever.

---

## 5. Ladder protocol (unchanged, gold-aware)

1. Read gold text + newest playlog **before** coding a lever.  
2. Prefer levers that fix a **named gold image class** *and* show design-half first-diff under fair dual.  
3. Fair dual only: hidden · GM · BR both · equal · SoftN **forbidden**.  
4. Gates: split design Δ≥+2 → full DEV ≥32 → DEV_VAL Δ≥+2 → holdout A+B WR>0.70.  
5. If gold and dual conflict: **do not drop gold tests**; redesign axis or accept dual-flat and try next gold theme slowly.

---

## 6. Current best dual candidates (pause stack thrash)

| Tag | Note |
|-----|------|
| `p_w14_brflopen` | Best first-diff des:chk balance; split PASS; T20 30/50 |
| `p_w14_bropair` | Split PASS; T20 **31/50**; clean +6 flips 0 reverse on T20 |
| `p_w14_brlmulti` | Same 31/50 class |
| `p_w15_g2hi` | Split FAIL design Δ+1 — do not promote alone |
| `p_w15_bropair_g2` | Split PASS full 31/50 — same ceiling as pure bropair; **do not ship**; DEV_VAL risk like brflo_g2 |

Next slow step: one gold-aligned **orthogonal +1** for seats still lost under bropair (design still-loss list in W14 notes), not another multi-lever package.
