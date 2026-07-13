# STACK +1 analysis — pure race 34/50 → STACK 35/50

**Date:** 2026-07-13  
**Flipped seed:** **`20599793`** (g=34, liveSeat=1)  
**Net dual:** pure race-loggames **34/50** → STACK **35/50** (+1)

---

## 1. Evidence that STACK lacks perGame

| Artifact | Wins | perGame | Notes |
|----------|-----:|:-------:|-------|
| `evolve/v92-race-loggames-n50.json` | 34 | **yes** | pure race+ leafEval, maxbudget dual |
| `evolve/v92-n50-STACK.json` | 35 | **no** | LOG_GAMES off |
| `evolve/v92-n50-EXACT_ONLY.json` | 34 | no | exact floors alone, no soft force |
| `evolve/v92-n50-PURE_MAX.json` | 34 | no | pure maxbudget |

### Checkpoint sandwich (locates the +1)

| games | pure liveWins | STACK liveWins |
|------:|--------------:|---------------:|
| 10 | 6 | 6 |
| 20 | 15 | 15 |
| 30 | 21 | 21 |
| **40** | **28** | **29** |
| 50 | 34 | 35 |

→ The sole net +1 occurs in **g30–g39**. No further net change in g40–g49.

### Pure losses in g30–g39 (flip candidates)

| g | seed | pure | steps | ms (pure dual) |
|--:|-----:|:----:|------:|---------------:|
| 30 | 20559901 | L | 20 | 28127 |
| 34 | **20599793** | **L** | **16** | **34547** |
| 35 | 20609766 | L | 15 | 15410 |

Wins in that decade: 20569874, 20579847, 20589820, 20619739, 20629712, 20639685, 20649658.

---

## 2. Seed-duel / dual re-run identification

Re-ran dual protocol (`bench-ladder`, maxbudget, `TIENLEN_LOG_GAMES=1`) on seeds of g30–g39 only (`BENCH_SEED=20559901`, N=10) from frozen probe trees:

- **STACK** (`probes/n50-STACK/search.js`): **`20599793` → WIN** (21 steps, ~11s)
- Other pure losses 20559901 / 20609766 still lose under STACK
- Checkpoint logic + this re-run pin the original dual +1 to **`20599793`**

Notes on noise:

- Under today’s lighter machine load, **race-base also wins 20599793** in re-run (exact finishes inside the pure 220ms free-lead floor). Original pure dual spent **34.5s / 16 steps** on this seed → loaded wall-clock; exact free-lead proof was **budget-bound**.
- One re-run also flipped **20589820** W→L for *both* race and STACK (shared flaky seed, not STACK-specific). Original dual checkpoints show pure and STACK matched through g30 and only STACK gained +1 by g40 → original net was **+1 without that reg**.

Seed-duel (det live RNG, `evolve/seed-duel.js`) also showed **20599793 flip** under STACK (`softSamples:10`) vs loss under some soft=0 paths; treat dual LOG_GAMES as ground truth.

---

## 3. Position: why softSamples / exact helped

### Deal (seed 20599793, liveSeat=1, first player=live)

| Seat | Hand |
|------|------|
| **Live** | `3♣ 4♦ 5♠ 5♦ 6♦ 7♣ 7♥ 9♦ Q♥ A♠ A♦ A♥ 2♠` |
| Opp | `4♠ 6♣ 6♥ 7♦ 8♦ 8♥ 9♣ 10♣ 10♦ J♥ K♠ K♥ 2♥` |

- `firstLeadCard` = **3♣** (must include on opening lead).
- Live has a clean low **multi spine** through 3–7 plus trip Aces + 2.

### STACK vs pure race-base code delta

From `search.race-base.js` → `search.STACK.js` (only material dual levers):

1. **softSamples force-enable**  
   - pure: `opts.softSamples !== 0` → dual’s `softSamples:0` **skips** soft multi-sample  
   - STACK: `opts.softSamples !== false` + default **softN=10** even when bench passes 0  
   - softNRoot default **3 → 10**

2. **exactExploit deeper windows**  
   - `totalCards` exactMs bands shifted +2 cards (12/16/20/24 → 14/18/22/26)  
   - free-lead floor **220 → 320** (`// EXACT_ONLY`)  
   - `handLenBudget` deeper earlier (e.g. total≤18: 14→16; total≤14: 18)

EXACT_ONLY dual alone was still **34/50** (same checkpoints as pure) → **exact floors under load were not always enough alone**, or soft interaction / dual noise. STACK packages exact+soft; measured mechanism on **this** seed is **exact free-lead proof**.

### Measured mechanism on 20599793

Isolated `exactExploitMove` at root free-lead (freeze-expert as exploit opp):

| Search tree | timeMs budget | Result |
|-------------|--------------:|--------|
| race-base | **220** (pure free-lead floor) | **no proof** (`mode:null`, play falls through) |
| race-base | ≥280 | proves forced win |
| STACK | ≥**200** | proves forced win (deeper recursive `handLenBudget`) |
| STACK dual path | free-lead floor **320** | `mode:'exact-exploit' avg:1` |

**Winning free-lead class:** low multi including 3♣ (STACK dual logs: 3-card / multi seq on the 3–7 spine, e.g. `3♣-4♦-5♠` or longer 3–7 when exploit path fires). Once exact returns `avg≥0.99`, play is forced-win thereafter (re-run: 21 steps, all exact-endgame).

**Original pure loss path (16 steps, 34s):** free-lead exact **timed out** under load → fell into high-variance exploit/playout with **softSamples skipped** (`softSamples:0`) → wrong opening / mid-line → short loss.

**Soft samples role on this seed:** when exact *succeeds*, soft is **not** entered (`if (!primary.anyWin …)`). Soft is the **backstop** for the same class of position when exact is incomplete: multi-sample win-rate over top free-lead candidates (N=10) instead of a single noisy playout. STACK force-enables that backstop under dual’s `softSamples:0`.

```
pure dual:  exact@220 (often timeout under load) → soft SKIP → noisy free-lead → LOSS
STACK dual: exact@320 + deeper tree (usually prove multi FL) → WIN
            if exact still incomplete → softN=10 ranks free-leads → fewer coin-flip opens
```

---

## 4. Remaining pure losses (still targets)

From `v92-race-loggames-n50.json` lossSeeds (16):

`20290630, 20310576, 20320549, 20350468, 20380387, 20470144, 20490090, 20539955, 20549928, 20559901, 20599793★, 20609766, 20659631, 20669604, 20689550, 20709496`

★ flipped by STACK. Similar “exact nearly proves free-lead multi” mines are the next +1 candidates among short/mid losses where free-lead multi exists.

---

## 5. ONE small additional lever (proposal)

### **FL_EXACT_MULTI_FIRST** — free-lead exact action order: multi before singles

**Where:** `exactExploitMove` in `search.js` (~root free-lead action loop), only when `!state.currentCombo`.

**Change (minimal):** after `genActions2p(..., broad=true)`, sort free-lead acts:

1. longer plays first (`length` desc) — multi opens before singles  
2. among equal length, keep existing expert-score / exp-first bias  

**Why this targets the same class as 20599793:**

- Failure mode was **time**: forced multi free-lead exists but is searched late; budget expires on singles/weak branches first.  
- Race-base @220ms failed to prove; STACK’s extra ms/depth compensated. Ordering multi-first **finds the same PV earlier inside the same ms**, without raising dual wall-clock floors (EXACT_WIDE / free-lead 400 already tried in flip-swarm with only seed `20290630` noise).  
- Orthogonal to softSamples: improves the exact path that already flipped 20599793; soft remains the incomplete-exact backstop.

**Not proposed (already tested / weaker):**

| Lever | Why not |
|-------|---------|
| free-lead exact floor 320→400 | EXACT_WIDE / BR_SOFT style; dual wall-clock cost; flip-swarm only +1 noisy |
| softN 10→14/16 | STACK_softN14/16 dirs exist; diminishing; doesn’t help when exact already wins |
| global handLenBudget bump | costlier; broader dual risk |

**Accept rule (same as +2 hunt):** loss flips ≥1 on pure residual losses, win regs ≤0 on a 12–20 win-seed sample, then dual N=50 LOG_GAMES.

**Smoke seeds:** `20599793` (must stay win), pure losses with free-lead multi (`20559901`, `20609766`, short blowouts `20380387`), plus 8 pure wins for reg check.

---

## 6. Return summary

| Item | Value |
|------|-------|
| **Flipped seed** | **`20599793`** |
| **Why STACK** | Deeper exact free-lead (floor 320 + wider bands + deeper `handLenBudget`) proves forced multi open including 3♣; pure’s 220ms exact often timed out under original dual load → soft skipped → short loss |
| **softSamples** | Force-enable N=10 is the dual backstop when exact incomplete; not on the critical path once exact proves this seed |
| **Next lever** | **FL_EXACT_MULTI_FIRST** — free-lead exact tries multi opens before singles |

### Artifacts

- Pure perGame: `evolve/v92-race-loggames-n50.json`  
- STACK aggregate: `evolve/v92-n50-STACK.json`  
- STACK g30–39 re-log: scratch `probes/STACK-duel/evolve/v92-STACK-g30-39.json`  
- Code snapshots: scratch `probes/search.race-base.js`, `probes/search.STACK.js`, `probes/n50-STACK/`
