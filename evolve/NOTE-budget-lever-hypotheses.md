# Budget / root levers — dual strength without expertPolicy gold changes

**Date:** 2026-07-13  
**Constraint:** Do **not** rewrite `expertPolicy` / `pickStructureSafe` / gold decision ranking.  
**Baseline live:** pure v9.1 (ladder restart; policy ≡ freeze `policies/v91-*` aside from require paths + AI_BUILD stamp).  
**Freeze:** `TIENLEN_FREEZE=v91` (`policies/v91-ai.js` + `policies/v91-search.js`).  
**Source of truth for live/freeze GM opts:** `evolve/bench-ladder.js` → `liveOpts()` / `freezeOpts()`.

---

## 1. Current live vs freeze GM budgets (defaults)

From `evolve/bench-ladder.js` (env defaults when unset):

| Opt | Live env | Live default | Freeze env | Freeze default | Notes |
|-----|----------|-------------:|------------|---------------:|-------|
| `difficulty` | `TIENLEN_V8_DIFF` | `grandmaster` | `TIENLEN_FREEZE_DIFF` | `grandmaster` | |
| `timeMs` | `TIENLEN_V8_MS` | **150** | `TIENLEN_FREEZE_MS` | **120** | Live already +25% wall-clock |
| `iterations` | `TIENLEN_V8_ITERS` | **120** | `TIENLEN_FREEZE_ITERS` | **80** | Live +50% MCTS iters |
| `maxSims` | `TIENLEN_V8_SIMS` | **320** | `TIENLEN_FREEZE_SIMS` | **160** | Live 2× free-lead MC cap |
| `brTrials` | `TIENLEN_BR_TRIALS` | **48** | (none; freeze BR off) | n/a | Live BR on by default |
| `bestResponse` | `TIENLEN_BR` | **on** (`!== '0'`) | `TIENLEN_FREEZE_BR` | **off** (`=== '1'`) | Asymmetric BR |
| `maxBranch` | `TIENLEN_V8_BRANCH` | **20** | `TIENLEN_FREEZE_BRANCH` | **16** | |
| `exactExploit` | `TIENLEN_EXACT` | **on** | `TIENLEN_FREEZE_EXACT` | **on** | Both default on |
| `dualSelf` | `TIENLEN_DUAL_SELF` | **off** (`=== '1'`) | `TIENLEN_FREEZE_DUAL_SELF` | off | |
| `softSamples` | `TIENLEN_SOFT_SAMPLES` | **0** | `TIENLEN_FREEZE_SOFT_SAMPLES` | **0** | See forwarding gap |
| `flRoot` | `TIENLEN_FL_ROOT` | **off** in opts | `TIENLEN_FREEZE_FL_ROOT` | off in opts | See forwarding gap |
| `combatRoot` | `TIENLEN_COMBAT_ROOT` | **off** in opts | `TIENLEN_FREEZE_COMBAT_ROOT` | off in opts | See forwarding gap |
| `exploit` | `TIENLEN_EXPLOIT` | **on** | `TIENLEN_FREEZE_EXPLOIT` | **off** | Freeze exploit off |
| `perfectInfo` | `TIENLEN_V8_PERFECT` | on | `TIENLEN_FREEZE_PERFECT` | on | |
| `mode` | `TIENLEN_V8_MODE` | `auto` | `TIENLEN_FREEZE_MODE` | `auto` | |

**Already asymmetric by default:** live has higher `timeMs` / `iters` / `maxSims` / `maxBranch`, BR on, exploit on; freeze is slightly cheaper and BR/exploit off.

**Historical identity note:** pure v9.1 vs freeze v91 with elevated live budget still tends ~0.5 WR (same policy). Budget levers are for (a) same-policy search quality edge, or (b) future patched live vs frozen v91.

---

## 2. Forwarding gap (important)

`bench-ladder.js` sets `combatRoot`, `flRoot`, `softSamples` on `liveOpts()`, but **live `ai.js` does not pass them into `searchMove`** (only `timeMs`, `iterations`, `maxSims`, `maxBranch`, `dualSelf`, `brTrials`, `exactExploit`, `exploit`, `bestResponse`, …).

In `search.js`:

- `opts.flRoot !== false` → **ON by default** when unset  
- `opts.combatRoot !== false` → **ON by default** when unset  
- `softSamples` defaults to **3** (node) when unset  

So `TIENLEN_FL_ROOT=0` / `TIENLEN_COMBAT_ROOT=0` / `TIENLEN_SOFT_SAMPLES=N` currently **do not control live** unless `ai.js` is extended to forward those three fields. That forward is **not** an expertPolicy change and is safe if/when needed.

Freeze path: freeze seat also goes through `policies/v91-ai.js` which has the same missing forwards — freeze opts for fl/combat/soft are likewise no-ops at the AI layer.

---

## 3. Lever list (env-only; no expertPolicy gold change)

All of these only change **search budgets / search-mode routing**. They do **not** alter `expertPolicy` outputs used by gold expert-mode tests.

| # | Lever | Env | Effect in search | Gold risk | Promise |
|---|-------|-----|------------------|-----------|---------|
| **L1** | Wall-clock | `TIENLEN_V8_MS` | Caps exactExploit (`exactExploitMs≈timeMs`), combat BR when not free-lead soft floor, MCTS/MC loops | None (expert mode ignores search) | **Highest** — multiplies every timed path |
| **L2** | BR trials | `TIENLEN_BR_TRIALS` | `bestResponseMove` sample count; soft path also raises floor (90–140) | None | **High** — primary soft solver quality |
| **L3** | MCTS iters | `TIENLEN_V8_ITERS` | Determinized MCTS / fallback depth when time remains | None | Medium — often time-bound before iter-bound |
| **L4** | MC sims | `TIENLEN_V8_SIMS` | Free-lead / MC `maxSims` | None | Medium — free-lead ranking resolution |
| **L5** | Branch width | `TIENLEN_V8_BRANCH` | Exploit / root candidate cap | None | Medium-low — more candidates under time |
| **L6** | Dual free-lead | `TIENLEN_DUAL_SELF=1` | Hybrid multi+self free-lead scoring (`dualSelf`) | None for gold expert; can change GM free-leads | Medium — path diversity, not policy rewrite |

**Not env-effective today (without tiny `ai.js` forward):** `TIENLEN_SOFT_SAMPLES`, `TIENLEN_FL_ROOT`, `TIENLEN_COMBAT_ROOT`.

**Freeze hold (recommended for duals):** leave freeze at defaults or pin explicitly:

```bash
TIENLEN_FREEZE=v91 TIENLEN_FREEZE_DIFF=grandmaster \
TIENLEN_FREEZE_MS=120 TIENLEN_FREEZE_ITERS=80 TIENLEN_FREEZE_SIMS=160 \
TIENLEN_FREEZE_BR=0 TIENLEN_FREEZE_EXACT=1
```

---

## 4. Smoke (N=10) — most promising pure budget package

**Hypothesis:** Joint scale of **time + BR + iters + sims** (L1+L2+L3+L4) is the cleanest pure-budget probe. `timeMs` alone is necessary but combat soft/BR floors already bump free-lead BR to ≥1100ms; joint package still helps combat non-soft BR, exact midgame, and MC/MCTS tails.

**Command (smoke):**

```bash
cd /Users/johnhoang/Developer/Grok/tieng-len
TIENLEN_FREEZE=v91 TIENLEN_FREEZE_DIFF=grandmaster TIENLEN_V8_DIFF=grandmaster \
TIENLEN_BENCH_GAMES=10 TIENLEN_TARGET=0.50 TIENLEN_BENCH_SEED=20260711 \
TIENLEN_FREEZE_MS=120 TIENLEN_FREEZE_ITERS=80 TIENLEN_FREEZE_SIMS=160 \
TIENLEN_FREEZE_BR=0 TIENLEN_FREEZE_EXACT=1 \
TIENLEN_V8_MS=280 TIENLEN_V8_ITERS=200 TIENLEN_V8_SIMS=480 \
TIENLEN_BR_TRIALS=96 TIENLEN_V8_BRANCH=24 TIENLEN_EXACT=1 TIENLEN_BR=1 \
TIENLEN_DUAL_SELF=0 TIENLEN_DET_RNG=1 \
TIENLEN_BENCH_OUT=probe-budget-smoke10.json \
TIENLEN_SCRATCH=/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-2452caa32616/implementer \
TIENLEN_PROGRESS_EVERY=1 TIENLEN_CHECKPOINT_EVERY=5 \
node evolve/bench-ladder.js
```

Target set to `0.50` so gate is informative for same-policy dual (expect ~0.5–0.6; N=10 is noisy).

Results appended under §7 when smoke finishes.

---

## 5. Top 3 budget levers — exact dual N=25 commands

Hold freeze fixed at ladder defaults. Live pure budget only. Seed `20260711`. No expertPolicy edits.

### #1 — Wall-clock + BR package (recommended primary)

```bash
cd /Users/johnhoang/Developer/Grok/tieng-len
TIENLEN_FREEZE=v91 TIENLEN_FREEZE_DIFF=grandmaster TIENLEN_V8_DIFF=grandmaster \
TIENLEN_BENCH_GAMES=25 TIENLEN_TARGET=0.50 TIENLEN_BENCH_SEED=20260711 \
TIENLEN_FREEZE_MS=120 TIENLEN_FREEZE_ITERS=80 TIENLEN_FREEZE_SIMS=160 \
TIENLEN_FREEZE_BR=0 TIENLEN_FREEZE_EXACT=1 \
TIENLEN_V8_MS=280 TIENLEN_V8_ITERS=200 TIENLEN_V8_SIMS=480 \
TIENLEN_BR_TRIALS=96 TIENLEN_V8_BRANCH=24 TIENLEN_EXACT=1 TIENLEN_BR=1 \
TIENLEN_DET_RNG=1 TIENLEN_BENCH_OUT=probe-budget-MS280-BR96-n25.json \
node evolve/bench-ladder.js
```

### #2 — BR-heavy (isolate L2 under moderate time)

```bash
cd /Users/johnhoang/Developer/Grok/tieng-len
TIENLEN_FREEZE=v91 TIENLEN_FREEZE_DIFF=grandmaster TIENLEN_V8_DIFF=grandmaster \
TIENLEN_BENCH_GAMES=25 TIENLEN_TARGET=0.50 TIENLEN_BENCH_SEED=20260711 \
TIENLEN_FREEZE_MS=120 TIENLEN_FREEZE_ITERS=80 TIENLEN_FREEZE_SIMS=160 \
TIENLEN_FREEZE_BR=0 TIENLEN_FREEZE_EXACT=1 \
TIENLEN_V8_MS=200 TIENLEN_V8_ITERS=160 TIENLEN_V8_SIMS=400 \
TIENLEN_BR_TRIALS=120 TIENLEN_EXACT=1 TIENLEN_BR=1 \
TIENLEN_DET_RNG=1 TIENLEN_BENCH_OUT=probe-budget-BR120-n25.json \
node evolve/bench-ladder.js
```

### #3 — Dual free-lead search mode + modest budget (L6 + L1)

```bash
cd /Users/johnhoang/Developer/Grok/tieng-len
TIENLEN_FREEZE=v91 TIENLEN_FREEZE_DIFF=grandmaster TIENLEN_V8_DIFF=grandmaster \
TIENLEN_BENCH_GAMES=25 TIENLEN_TARGET=0.50 TIENLEN_BENCH_SEED=20260711 \
TIENLEN_FREEZE_MS=120 TIENLEN_FREEZE_ITERS=80 TIENLEN_FREEZE_SIMS=160 \
TIENLEN_FREEZE_BR=0 TIENLEN_FREEZE_EXACT=1 \
TIENLEN_V8_MS=220 TIENLEN_V8_ITERS=160 TIENLEN_V8_SIMS=400 \
TIENLEN_BR_TRIALS=64 TIENLEN_DUAL_SELF=1 TIENLEN_EXACT=1 TIENLEN_BR=1 \
TIENLEN_DET_RNG=1 TIENLEN_BENCH_OUT=probe-budget-dualSelf-n25.json \
node evolve/bench-ladder.js
```

**Baseline control (defaults only, for delta):**

```bash
TIENLEN_FREEZE=v91 TIENLEN_FREEZE_DIFF=grandmaster TIENLEN_V8_DIFF=grandmaster \
TIENLEN_BENCH_GAMES=25 TIENLEN_TARGET=0.50 TIENLEN_BENCH_SEED=20260711 \
TIENLEN_DET_RNG=1 TIENLEN_BENCH_OUT=probe-budget-BASE-n25.json \
node evolve/bench-ladder.js
```

---

## 6. Interpretation rules

1. **Same policy (live ≡ v91 freeze):** expect WR ≈ 0.5. Budget-only lift is small; N=25 CI is wide (~±0.2). Treat ≥14/25 as interesting, ≥16/25 as strong signal under det RNG.
2. **Gold safety:** re-run expert gold / structure cases under `mode: 'expert'` / `difficulty: 'easy'` — search budgets never run on that path.
3. **Do not promote** budget-only wins as a “new policy”; ship as **runtime GM profile** if dual WR improves without gold drift.
4. If budget dual stays flat at 0.5, policy/search ranking (not wall-clock) is the bottleneck — return to structure/combat patches, not more ms.

---

## 7. Smoke results

**Artifact:** `evolve/probe-budget-smoke10.json`  
**Scratch log:** `…/implementer/probe-budget-smoke10.log`  
**Package:** live `MS=280 IT=200 SIMS=480 BR=96 BRANCH=24` vs freeze `MS=120 IT=80 SIMS=160 BR=off EXACT=on`  
**Det RNG:** `TIENLEN_DET_RNG=1`  
**Wall:** ~257s (~0.039 gps)

| N | liveWins | WR | CI95 | Gate (>0.50) |
|--:|---------:|---:|-----|:------------:|
| 5 | 4 | 0.80 | [0.38, 0.96] | — |
| **10** | **6** | **0.60** | **[0.31, 0.83]** | **PASS** |

**Read:** Directional +1 win vs coin-flip on same-policy dual; **not significant** at N=10. Game 9 (`seed=20350468`) was a slow loss (~63s). Worth promoting package to **N=25** (#1 command in §5) before treating budget as a dual lever.

**No code policy changes** were made for this probe.
