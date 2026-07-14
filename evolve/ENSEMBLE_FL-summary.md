# ENSEMBLE_FL — dual-self free-lead ensemble

**Date:** 2026-07-13  
**Scratch:** `$SCRATCH/probes/ENSEMBLE_FL/` (isolated; main / race-base **not** patched)  
**Base:** race-base (`search.race-base.js` / `ai.race-base.js`)  
**Idea:** At free-lead soft root, ensemble `expertPolicy` + `pickFreeLeadHard` (+ hybrid dual-self); **prefer multi if either chooses multi of length ≥ 2**. Combat uses search as now.

---

## Lever design

Replaces **v8.7 free-lead soft-root scoring** only (exact exploit / hard forced-win paths above still run). Combat soft-root + BR + MCTS unchanged.

When free-lead soft path fires (`!cur`, soft exploit, `flRoot !== false`):

1. **`expertPolicy`** → free-lead play (multi-always via `pickFreeLeadHard`)
2. **`pickFreeLeadHard`** → multi-mode hard free-lead
3. **`pickFreeLeadHard` under `_exploitFlMode = 'hybrid'`** → dual-self hybrid trash-shed sample
4. If **any** of the three is multi with **length ≥ 2** → take the multi (prefer longer, then lower `expertScore`)
5. Else fall back hard → expert → hybrid single
6. No-gift guard vs 1-card opp retained

**Not** applied in combat; combat continues with existing soft-root / BR / search.

### Smoke

First free-lead on seed `20260711` (short budget):  
`mode=ensemble-fl`, `via=ensemble-fl-hard`, ep/hard/hybrid all agreed on single (`len=1`).

---

## Dual protocol

- N=20, seed0=`20260711`, stride 9973  
- Live max budget: MS=280 IT=200 SIMS=480 BR=96 BRANCH=24 exact+exploit  
- Freeze: **v91** MS=120 IT=80 SIMS=160  
- Gate (task): WR **> 0.80** excited promote; **= 0.80** silent; **< 0.80** reject  
- BASE reference: **0.80** (16/20)

---

## Result — Dual N=20

| Metric | ENSEMBLE_FL | BASE |
|--------|------------:|-----:|
| **liveWins / N** | **14 / 20** | 16 / 20 |
| **WR** | **0.70** | **0.80** |
| freezeWins | 6 | 4 |
| vs BASE | **−2 games (reg)** | — |
| wall ms | ~281k (~4.7 min) | — |

### Checkpoints
- 5g: 0.80 (4/5)
- 10g: 0.60 (6/10)
- 15g: 0.60 (9/15)
- **20g: 0.70 (14/20)**

### Loss seeds
- **ENSEMBLE_FL:** `20290630, 20310576, 20320549, 20350468, 20360441, 20380387`
- **BASE:** `20310576, 20320549, 20350468, 20380387`

### vs BASE
| | seeds |
|--|-------|
| **flips** | *(none)* |
| **regs** | `20290630`, `20360441` |

W/L vector: `WWWLWLLWWLLWLWWWWWWW`  
BASE:         `WWWWWLLWWLWWLWWWWWWW`

---

## Interpretation

- Free-lead soft root scoring (hybrid trash bias + expert leaf) was **net protective** on this dual block; replacing it with multi-prefer policy ensemble **regressed two BASE wins**.
- `expertPolicy` free-lead already calls `pickFreeLeadHard` (multi-always), so the dual of those two is usually degenerate; hybrid self only differs when multi-top is high and trash conditions fire — multi-prefer then **overrides hybrid trash with multi**, which is the opposite of soft-root’s early trash preference (seed `20799253` class).
- No BASE dual losses flipped; free-lead multi-prefer alone does not fix residual mines (`20380387` multi-climb still L).

---

## Verdict

**REJECT ENSEMBLE_FL.**  
**WR = 0.70** (14/20) — **below 0.80**; −2 vs BASE; 0 flips.

Do **not** merge into race-base / main.

---

## Artifacts

- Probe: `probes/ENSEMBLE_FL/{search.js,ai.js,run-dual.js}`
- Dual JSON/log: `probes/ENSEMBLE_FL-n20.json` / `ENSEMBLE_FL-n20.log`
- Summary: `probes/ENSEMBLE_FL-summary.md` + `evolve/ENSEMBLE_FL-summary.md`
