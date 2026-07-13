# SHORT_LOSS — free-lead gift analysis + NO_GIFT_HARD probe

**Date:** 2026-07-13  
**Scratch:** `$SCRATCH/probes/SHORT_LOSS/`, `$SCRATCH/probes/NO_GIFT_HARD/`  
**Live baseline:** TWO_OMIN2 / race+ GM (`v9.2`) vs freeze **v91** GM  
**Short seeds (few steps):** `20380387` (5), `20549928` (~10–12), `20470144` (13–17), `20490090` (15–19)

---

## 1. Replay first 8 plies (live race+ / TWO_OMIN2 vs freeze)

Logged free-leads + gift flags (`giftLowSingle` = live free-lead single with `rank < 10` and `omin ≤ 3`).

| Seed | steps | liveWin | Live free-lead gifts | Pattern |
|------|------:|:-------:|----------------------|---------|
| **20380387** | **5** | L | **0** | Combat 5-seq climb, not free-lead |
| 20549928 | 12 | L | **0** | Live multi free-leads @ omin=13; freeze drains |
| 20470144 | 17 | L | **0** | Pair war → freeze 2-pair locks |
| 20490090 | 19 | L | **0** | Single climb war → freeze control |

**Finding:** None of the four short dual-losses are free-lead low-single gifts vs short opp. Zero `giftLowSingle` events on the live path.

Artifacts: `probes/SHORT_LOSS/replay-short.{js,out,json}`

---

## 2. Root cause — seed **20380387** (5-step blowout)

### Deals
- **P0 freeze:** `4♥ 5♦ 5♥ 6♠ 6♣ 7♠ 7♣ 8♦ J♣ Q♣ K♥ A♦ 2♠`
- **P1 live:** `5♠ 5♣ 6♦ 7♦ 10♠ J♠ J♦ Q♦ Q♥ K♣ A♠ A♣ 2♥`
- liveSeat = 1, freeze starts with first lead `4♥`

### Trace (all 5 plies)
| ply | who | type | play | note |
|----:|-----|------|------|------|
| 0 | FREEZE | free-lead | `4♥ 5♥ 6♣ 7♣ 8♦` | low 5-seq |
| 1 | LIVE | combat | `10♠ J♦ Q♥ K♣ A♣` | only legal 5-seq answer |
| 2 | FREEZE | combat | `J♣ Q♣ K♥ A♦ 2♠` | higher 5-seq **with 2** |
| 3 | LIVE | combat | PASS | cannot beat |
| 4 | FREEZE | free-lead | `5♦ 6♠ 7♠` | **go-out** (3 cards) |

### Why it dies in 5 steps
1. Freeze’s multi structure is lethal: **low 5-seq + high 5-seq ending in 2 + residual 3-seq**.
2. Live’s only 5-seq answer is `10-J-Q-K-A`. Under perfect info freeze **can** recapture with `J-Q-K-A-2`.
3. After recapture, freeze free-leads the remaining three and empties immediately.
4. **Not** a free-lead gift of a low single; **not** a weak multi free-lead. It is a **forced multi climb into a known superior climb**, then tempo wipeout.

### Counterfactual
Forcing LIVE **pass** on ply 1 still loses (freeze free-leads `J-Q-K-A`, live climbs with 2, freeze later empties residual seq). Hand is **structurally lost** to freeze’s multi tempo under this deal — free-lead gift policy cannot flip it.

`probes/SHORT_LOSS/force-pass-20380387.js` / `force-pass.out`

### Other short seeds (brief)
- **20549928:** Live leads good multi (`3-4-5-6-7`, then `9-10-J`); freeze answers high, takes control with trips/pairs and drains. No low-single gift.
- **20470144:** Pair ladder; freeze holds `2-2` and wins the pair war, then chips remaining singles.
- **20490090:** Single climb; freeze keeps control and finishes with triples/pairs while live never free-leads under omin≤3.

---

## 3. NO_GIFT_HARD — isolated probe

### Design (on TWO_OMIN2 / race+ base)
When **`omin ≤ 3` free-lead**:
- **`freeLeadCandidates`:** only multi (non-expensive) or singles `rank ≥ 10` (same filter as old `omin===1`)
- **`pickFreeLeadHard`:** hard path prefers multi → high single → highest single last-resort
- **`expertScore`:** low single `rank < 10` **+500** hard ban; multi volume amplified
- **Root/BR/exact/FL guards:** extend gift veto from `omin===1` to **`omin ≤ 3`**

### Dual N=20 (seed0=`20260711`, max-budget live vs freeze v91)

| Build | WR | liveWins | lossSeeds |
|-------|---:|---------:|-----------|
| BASE (race+) | **0.80** | 16/20 | `20310576, 20320549, 20350468, 20380387` |
| LEAD_VALUE (soft omin≤3) | 0.80 | 16/20 | same as BASE |
| **NO_GIFT_HARD** | **0.70** | **14/20** | `20290630, 20310576, 20320549, 20350468, 20380387, 20410306` |

W/L vectors:
- BASE:          `WWWWWLLWWLWWLWWWWWWW`
- NO_GIFT_HARD:  `WWWLWLLWWLWWLWWLWWWW`  (**regs on 20290630, 20410306**)

**Dual: FAIL / regression (−2 games vs BASE).** Gate >0.70 not met; WR equals 0.70 flat.

### Seed-duel on 16 residual losses

| Probe | flips / 16 | flip seeds | short4 flipped? |
|-------|----------:|------------|-----------------|
| BASE / RES_MT | 3 | `20290630, 20320549, 20599793` | no |
| **NO_GIFT_HARD** | **3** | **same three** | **no** (`20380387, 20549928, 20470144, 20490090` all still L) |

Short4 dedicated duel: **0/4**.  
**NO_GIFT_HARD flips zero new residual losses** and **does not flip any of the four short blowouts**.

---

## 4. Answers (task return)

### Root cause of **20380387**
**Structural multi-tempo wipeout**, not a free-lead gift:
freeze leads a low 5-seq → live is forced to climb with its only 5-seq → freeze recaptures with a higher 5-seq topped by **2** → free-lead residual 3-seq go-out. Five plies total. Perfect-info live still cannot salvage; pass-first also loses.

### Does **NO_GIFT_HARD** flip any losses?
- **Short seeds (4):** **No** (0/4).
- **Residual 16 seed-duel:** **No new flips** (same 3/16 as BASE).
- **Dual N=20:** **No** — **regresses** BASE 0.80 → **0.70** (loses two former wins).

### Verdict
**Reject NO_GIFT_HARD.** Hypothesis “short dual losses = live gifts low single vs short opp” is **false** for these seeds. Soft LEAD_VALUE was already silent; hard ban is **actively harmful** on dual (over-constrains free-lead when omin happens to be ≤3 midgame on winning lines).

**Better next levers for 20380387-class mines:** combat multi-climb refusal when perfect-info opp has a strictly better same-length multi (esp. with 2), or early-pass on answerable but losing multi races — **not** free-lead gift hardening.

---

## Artifacts
- `probes/SHORT_LOSS/replay-short.{js,out,json}` — ply logs
- `probes/SHORT_LOSS/force-pass-20380387.{js,out}` — pass CF
- `probes/NO_GIFT_HARD/{search.js,ai.js,run-dual.js,run-seed-duel.js}`
- `probes/NO_GIFT_HARD/probe-out.json` — dual N=20 (0.70)
- `probes/NO_GIFT_HARD/seed-duel-loss16.json` — 16 residual duel
- `probes/NO_GIFT_HARD/seed-duel-short4.json` — short4 duel
- `probes/NO_GIFT_HARD/replay-nogift.json` — confirm gifts still 0 under hard policy
