# Free-lead policy probes vs freeze v90 (v9.0)

**Goal:** Find free-lead tweaks that beat freeze v90 on short probes.

**Protocol (fixed):**
```
TIENLEN_FREEZE=v90 TIENLEN_FREEZE_DIFF=expert
TIENLEN_BENCH_GAMES=25 TIENLEN_TARGET=0.70 TIENLEN_BENCH_SEED=20260711
TIENLEN_V8_DIFF=hard TIENLEN_V8_MS=100 TIENLEN_BR_TRIALS=48
TIENLEN_COMBAT_ROOT=0 TIENLEN_FL_ROOT=0
node evolve/bench-ladder.js
```

**Reference baseline (historical N=100 v9.0 vs freeze v8.9 expert):** ~0.75–0.81 live WR.  
**This probe’s same-protocol BASE (N=25, seed 20260711):** **0.92 (23/25)** — ceiling for this short seed block under FL/combat soft roots **off**.

Artifacts:
- Scratch logs/JSON: `$TIENLEN_SCRATCH/probe-fl-{A,B,C,BASE}.{log,json}`
- Repo copies: `evolve/probe-fl-*.json`
- Branch sources (not installed): `search.js.branch-{A,B,C}`, baseline `search.js.bak-probe-fl`

---

## Results

| Branch | Description | Wins | WR | CI95 lo | Notes |
|--------|-------------|------|-----|---------|-------|
| **BASE** | Unmodified search (v9.0 free-lead) | 23/25 | **0.92** | 0.750 | Checkpoints 10/10 → 19/20 → 23/25 |
| **A** | Stronger multi free-lead multiTie + multi soft scoring | 23/25 | **0.92** | 0.750 | Identical checkpoints |
| **B** | Trash-shed / low multi bias | 23/25 | **0.92** | 0.750 | Identical checkpoints |
| **C** | Reduce gifting high singles early | 23/25 | **0.92** | 0.750 | Identical checkpoints |

All four runs share the same win/loss trajectory on this seed ladder (10→19→23).  
**No branch clearly beats BASE on this probe.**

---

## Branch details

### A — stronger multi free-lead multiTie / soft scoring
- BR `multiTie`: `0.003 → 0.008 * min(10,len)` + low-top boosts (`≤7` +0.012, `≤9` +0.005) + length boost; high-single free-lead −0.015
- Exploit `multiBonus`: base `0.016→0.028`, low multi +0.01
- `expertScore` free-lead multi: slightly stronger multi preference

### B — trash-shed / low multi bias
- Stronger trash-shed in `expertScore` when control/2s present
- Low multi preferred (high multi free-lead cost); hybrid trash more often in `pickFreeLeadHard`
- Free-lead candidates include trash singles more liberally
- BR soft bias: low multi / low singles up; high multi/singles down

### C — reduce gifting high singles early
- Harder expert penalties for K/A/2 free-leads early
- Broader veto of high/mid singles when multi exists (`≥9` / early `≥8`)
- Filter high singles out of free-lead candidates when multi available
- BR soft penalties for high single free-leads

---

## Interpretation

1. With **`TIENLEN_FL_ROOT=0`** (and combat soft root off), free-lead choice is dominated by **exact exploit + BR playout win rates**. Soft multiTie / expertScore deltas rarely flip the root when empirical rates already separate candidates.
2. On this **N=25 / seed 20260711** block, live hard already wins **23/25** vs freeze expert — **no headroom** for free-lead soft knobs to show a win-rate delta.
3. Historical N=100 WR ~0.75–0.81 is a different length / variance regime; do not treat 0.92 N=25 as a promotion signal.

---

## Recommendation

| Decision | Detail |
|----------|--------|
| **Winner** | **None** — all branches **tied BASE at 0.92 (23/25)** |
| **Promote?** | **No** |
| **search.js** | **Restored to original** (`git checkout -- search.js` / baseline bak) |
| **Next levers** | (1) Re-probe with `TIENLEN_FL_ROOT=1` so free-lead soft root can express hybrid/trash; (2) larger N≥50–100 for separation; (3) combat / race / endgame exact rather than multiTie-only; (4) mine free-lead *decision diffs* vs BASE even when WR ties |

Branch file copies left for optional FL_ROOT=1 follow-up:
- `search.js.branch-A`, `search.js.branch-B`, `search.js.branch-C`
- `search.js.bak-probe-fl` (pre-probe baseline)
