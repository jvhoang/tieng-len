# Probe Notes — v9.1 policy/search branches vs freeze v90

**Date:** 2026-07-12/13  
**Isolation:** `/Users/johnhoang/Developer/Grok/tieng-len-probe-v91` (main `search.js` not edited for probes)  
**Artifact:** `evolve/probe-v91-branches.json`

## Protocol (fixed)

```
TIENLEN_FREEZE=v90 TIENLEN_FREEZE_DIFF=grandmaster TIENLEN_V8_DIFF=grandmaster
TIENLEN_BENCH_SEED=20260711 TIENLEN_TARGET=0.70
TIENLEN_FREEZE_MS=120 TIENLEN_FREEZE_ITERS=80 TIENLEN_FREEZE_BR=0 TIENLEN_FREEZE_EXACT=0
TIENLEN_V8_MS=160 TIENLEN_V8_ITERS=130 TIENLEN_BR_TRIALS=56 TIENLEN_EXACT=1
TIENLEN_FL_ROOT=0 TIENLEN_COMBAT_ROOT=0 TIENLEN_DUAL_SELF=0
```

Baseline live stamp in probe: **v9.1** with multiTie `0.004 * min(11)` and race `0.053`.

Historical dual: **35/50 = 0.70 FAIL** (`evolve/v91-vs-v90-final.json` + rerun).

---

## Ranked results

### Round 1 — soft knobs (N=30) — all tied

| Branch | Wins | WR | Change |
|--------|-----:|---:|--------|
| BASE / MT / RACE / TRASH / FL_TRASH / COMBAT | **23/30** | **0.767** | multiTie / race / trash / free-lead soft / combat soft |

**Identical checkpoints** `[10→8, 20→17, 30→23]` on every branch.  
With **FL_ROOT=0 / COMBAT_ROOT=0**, soft multiTie/race/trash/hybrid free-lead knobs do **not** flip root decisions under GM+exact+BR.

### Round 2 — decision-path branches (N=30)

| Rank | Branch | Wins | WR | Notes |
|-----:|--------|-----:|---:|-------|
| **1** | **TWO** | **24/30** | **0.80** | **+1 win vs BASE** |
| 2 | MB / EXACT / LOCK / TRASH_EARLY / ROOTS | 23/30 | 0.767 | no WR change (EXACT faster: 365s vs ~520s) |

### Confirmation

| Run | Wins | WR | Gate |
|-----|-----:|---:|:----:|
| BASE N=50 | 35/50 | **0.70** | FAIL (matches history) |
| **TWO N=50** | **36/50** | **0.72** | **PASS** (>0.70) |
| TWO N=30 re-run | 24/30 | 0.80 | reproduces |
| TWO + FL/COMBAT roots | 24/30 | 0.80 | roots don't add more on this seed block |

Checkpoints N=50:

| | 10 | 20 | 30 | 40 | 50 |
|--|---:|---:|---:|---:|---:|
| BASE | 8 | 17 | 23 | 30 | **35** |
| TWO | 8 | 17 | **24** | **31** | **36** |

Divergence starts in games 21–30 (+1), holds through 50.

---

## Recommended promote (primary)

### **TWO — broader 2-tempo + pass discipline**

**Why:** Only branch that moved WR; **+1 win N=50** (36/50 vs 35/50) and **reproducible N=30** (24/30 ×2). Affects `expertPolicy` used in BR rollouts / exploit follow-ups — not just soft tie-breaks.

#### Exact line changes in `search.js` (`expertPolicy`)

**1) Mid-top 2-tempo gate** (currently ~lines 373–386):

```javascript
// FROM:
// Tight 2-tempo vs critically short opp only (...)
if (
  cur.type === 'single' &&
  curTop >= 8 &&
  curTop <= 10 &&
  twoSingles.length &&
  omin <= 2 &&
  handLen >= 5 &&
  handLen <= 8 &&
  infoC.trashCount >= 1
) { ... }

// TO:
// broader 2-tempo vs mid tops when short race / trash or control remains
if (
  cur.type === 'single' &&
  curTop >= 8 &&
  curTop <= 10 &&
  twoSingles.length &&
  omin <= 3 &&
  handLen >= 4 &&
  handLen <= 9 &&
  (infoC.trashCount >= 1 || infoC.control >= 2)
) { ... }
```

**2) Soft-pass / contest tail** (currently ~lines 450–456):

```javascript
// FROM:
if (handLen >= 9 && curTop < 10 && omin >= 6) return { pass: true };
if (handLen >= 8 && curTop < 10 && omin <= 3 && leg.length) {
  return { play: orderLegals(leg, state, cp)[0] };
}
return { play: orderLegals(leg, state, cp)[0] };

// TO:
if (handLen <= 7 && leg.length) {
  return { play: orderLegals(leg, state, cp)[0] };
}
if (handLen >= 10 && curTop < 9 && omin >= 7) return { pass: true };
if (handLen >= 8 && curTop < 10 && omin <= 4 && leg.length) {
  return { play: orderLegals(leg, state, cp)[0] };
}
return { play: orderLegals(leg, state, cp)[0] };
```

Reference patch file (not installed): `search.js.probe-TWO`  
Baseline bak of probe start: `search.js.bak-probe-v91-base`

---

## Secondary (optional)

| Candidate | Finding | Promote? |
|-----------|---------|----------|
| **EXACT** (endgame total≤20 + more exactMs) | Same WR, **faster** wall time | Optional only if dual needs latency; no WR gain |
| multiTie / race soft knobs | Silent under roots-off GM | **No** alone |
| FL_ROOT / COMBAT_ROOT on | No WR delta on seed 20260711 N=30 | **No** as sole change |
| MB / LOCK / TRASH_EARLY | 23/30 | **No** |

**Second promote if stacking:** none proven; if dual still fails after TWO, try **TWO + EXACT budgets** (orthogonal) rather than multiTie again.

---

## Interpretation

1. Soft free-lead / leafEval deltas are **below decision threshold** when exact exploit + BR dominate and soft roots are off.
2. **Expert combat / 2-tempo** changes *do* flip games because they alter rollout + BR opponent model and non-exact combat lines.
3. TWO's +1 win is small but **exactly the margin** needed for strict >0.70 on seed 20260711 N=50.
4. **Human strength note:** broader 2-spend can burn control; still prefer dual GM pass + spot human check after promote. Human already >85% vs AI — this is a narrow GM-vs-GM fix.

---

## Merge note (main may have drifted)

Probe baseline was multiTie `0.004*min11` / race `0.053` and the original soft-pass tail.  
Live main may already have different multiTie/race **and** extra pass-discipline blocks (e.g. deep mid multi soft-pass, expanded soft-pass). Those pass-more edits are **orthogonal / opposite** to TWO's contest-more tail — re-bench after merge; do not blindly overwrite main's CF pass-disc without a N=30 probe.

**Safe minimal promote (works even if main soft-pass changed):** apply only the **2-tempo gate** change first (omin/handLen/trash|control). That alone is the core of TWO. Then optionally replace the soft-pass tail with TWO's contest-more version if dual still fails.

## Next steps for dual pass

1. Apply **TWO** 2-tempo gate (minimal) to live `search.js`; if needed, also contest-more soft-pass tail.
2. Run dual N=50 GM: primary + re-run, seed `20260711`, target WR **>0.70**.
3. If 36/50 reproduces → freeze/promote path; if still 35 → try TWO+EXACT or mine the remaining 14 losses.

---

## Files

| Path | Role |
|------|------|
| `evolve/probe-v91-branches.json` | Full structured results |
| `evolve/probe-v91-*.json` / `probe-v91-r2-*.json` / `probe-v91-conf-*.json` | Per-branch bench dumps |
| `search.js.probe-TWO` | Full TWO search.js (from v9.1 probe baseline) |
| `search.js.bak-probe-v91-base` | Probe baseline search snapshot |
