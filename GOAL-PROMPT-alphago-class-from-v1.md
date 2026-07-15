# Paste-ready `/goal` prompt — Superhuman Tiến Lên from v1.0 (hybrid paired-Δ + one-shot CERT)

Copy everything inside the fence below into a new Grok Build `/goal`.

**Primary ship bar:** crush freeze **v6.0 at ≥90%** on **one-shot CERT** (author already beats v6 ~90%+).  
**No human match required for ship.**  
**Dev iterations:** **hybrid paired-Δ** — new random seeds each checkpoint, but **old and new models share that seed set** so luck cancels; next iteration gets a **new** set (anti convert-on-fixed-VAL).  
**Gold:** `john_uploads/` is a **living** folder — author may add playlogs / images / `tien_len_AI.txt` anytime; goal must **re-scan frequently**, not freeze to a one-time file list.  
**GitHub:** on each milestone **L1→L5**, commit + push the champion AI (and evidence); tags `milestone-L{k}` recommended.  
**Compute:** parallel subagents + multi-process workers where independent, but **cap total heavy CPU workers at ≤ half of M5 performance/logical cores** (leave headroom for you / UI / other apps). Orchestrator owns serial gates (PAIR_STEP accept, CERT, gold-refresh conflict resolution, milestone commits).

---

```
/goal Build a superhuman-tier Tiến Lên AI (2-player primary, 3–4p secondary) starting from freeze policies/v1-* only.

PRIMARY SHIP BAR (no human play required): dominate freeze v6.0 under BLIND duals at author-comparable strength (≥90% WR on one-shot CERT).
  - Fact: human author beats v6.0 >90% of the time.
  - Proxy: frozen model must beat policies/v60-* at WR ≥ 0.90 on CERT (CIs below) — not “55% slightly better than v6.”
  - v6.0 is the strongest useful freeze anchor from independent blind audits; late convert freezes (v9.5–v10.x) were dual-null or weaker.

DEV / ITERATION (required hybrid — do NOT use a forever-fixed TRAIN_VAL as the only ladder):
  - TRAIN: always new/random (or huge stream) for self-play, BC, residual experiments.
  - CHECKPOINT ACCEPT: each step t draw fresh seed set S_t; evaluate BOTH θ_{t-1} and θ_t on the SAME S_t vs v6.0; accept only if paired Δ is significantly positive.
  - CERT: freeze git SHA → generate/unseal new seeds → one dual for ship. Never residual-pack CERT.

GOLD SOURCE (living — not a static snapshot):
  - Canonical directory: tieng-len/john_uploads/ (poll the folder; inventory is not frozen at goal start).
  - Author may add/update during training: tien_len_AI.txt, IMG_*.PNG/JPG, tienlen-playlogs-*.json, notes.
  - DO NOT hardcode a permanent list like “only IMG_0498–0552” or one playlog filename.
  - Frequent re-ingest required — section GOLD LIVING FOLDER (G0–G5). Poll every PAIR_STEP and ≤2h.

Methodology: AlphaGo/AlphaZero + imperfect-info methods. MacBook Pro M5: parallelize aggressively **within a hard cap of ≤ 50% of machine cores** for dual/self-play/train workers (detect via `os.cpus().length` / `sysctl`; e.g. 16 logical cores → max 8 heavy workers). Prefer specialized subagents over single-threaded loops when independent. Tokens cheap; wall-clock matters; machine still usable for the author. Bad stats and convert-on-S forbidden.

══════════════════════════════════════════════════════════════════
HYBRID EVAL PROTOCOL (CORE — READ CAREFULLY)
══════════════════════════════════════════════════════════════════

H0. WHY HYBRID (not fixed VAL forever, not unpaired random)
   Fixed TRAIN_VAL forever: comparable absolute WR, but convert incentive —
     dual VAL → fingerprint residual losses → re-dual same VAL → fake climb (v1→v10.x failure mode).
   New random seeds only for the new model (unpaired): high luck; hard to know if checkpoint improved.
   Hybrid (required): new S_t each iteration; BOTH previous and new play S_t; decision from paired Δ.
     - Same S_t ⇒ seed luck cancels for “did we improve?”
     - New S_{t+1} next round ⇒ last round’s ultra-exact roots don’t transfer ⇒ wasted convert dies faster.

H1. THREE LAYERS
   ┌────────────┬────────────────────────────────────────────────────────────┐
   │ TRAIN      │ Unlimited new/random deals. Self-play, BC, probes, residuals.│
   │            │ ONLY place allowed to inspect per-seed losses for learning. │
   ├────────────┼────────────────────────────────────────────────────────────┤
   │ PAIR_STEP  │ Fresh S_t each checkpoint (not a permanent list).           │
   │ (dev)      │ θ_prev and θ_new both dual vs v6.0 on identical S_t.         │
   │            │ Accept/reject from paired Δ only. Eval-only — no packaging  │
   │            │ residuals from S_t into policy, then re-scoring same S_t.   │
   ├────────────┼────────────────────────────────────────────────────────────┤
   │ CERT       │ Ship only. Freeze git SHA first, THEN open/generate CERT.   │
   │ (ship)     │ One shot. Fail ⇒ new training + NEW cert seeds next try.    │
   └────────────┴────────────────────────────────────────────────────────────┘

H2. PAIR_STEP PROCEDURE (every candidate checkpoint θ_new vs champion θ_prev)
   1. Draw S_t: n≥100 deal seeds × both seats (≥200 games each model vs v6.0).
      Cryptographic random; ban PLAN.md shopping seeds (20260801/20260802/etc.).
      Save S_t under evolve/eval-registry/pair-steps/step-XXXX-seeds.json + hash (audit trail).
   2. Run fair duals (H4 protocol):
        A = results of θ_new  vs v6.0 on S_t  (per seed@seat win/loss)
        B = results of θ_prev vs v6.0 on S_t  (same seed@seat keys)
   3. Paired metrics (prefer game-level pairing on seed@seat):
        Δ_WR = WR_new − WR_prev
        For each game g: d_g ∈ {−1,0,+1} = new win − prev win on same g
        Use McNemar test and/or bootstrap CI on mean(d_g) / on Δ_WR.
   4. ACCEPT θ_new as new champion only if ALL hold:
        - Δ_WR > 0 AND 95% CI lower bound on Δ_WR > 0
          (or stricter: LB > +0.01 for meaningful gain)
        - Gold suite still green on fair getAIMove after G2 refresh (no gold regression;
          includes any newly uploaded john_uploads cases)
        - No new ultra-exact fingerprint pack as the sole change (H5)
   5. If REJECT: keep θ_prev; discard S_t for training forever (do not mine S_t residuals).
   6. If ACCEPT: θ_prev ← θ_new; log step to STATUS (WR_new, WR_prev, Δ, CI, seed hash, git SHA).
   7. Next iteration: draw entirely new S_{t+1}. Never reuse S_t for another accept test
      after policy edits.

H3. RUNNING STRENGTH ESTIMATE (milestones without fixed-VAL mountain)
   Absolute WR on a single S_t is NOT a stable “L3 = 70%” number (hard/easy seed draws).
   Track instead:
     - Champion git SHA
     - Cumulative sum of accepted Δ_WR (rough progress)
     - Optional: exponential moving average of champion’s WR_new on recent PAIR_STEPs
       (report as “dev estimate,” never as ship)
   Milestone ladder L2–L4 uses EMA / cumulative paired gains against v6.0 — see M1.

H4. FAIR DUAL PROTOCOL (PAIR_STEP and CERT)
   - hiddenInfo=true, perfectInfo=false
   - grandmaster, bestResponse=true BOTH seats, equal budget (document ms/trials; SoftN=0)
   - both seats per deal seed
   - identity sanity when needed: model vs self ~50%

H5. BAN CONVERT MECHANISM
   Forbidden as skill: ultra-exact roots (exact handLen+omin+twos+byR multiset → force play)
   that only exist to flip residual seats on a fixed seed list.
   Allowed: general features, learned nets, parametric heuristics, search+prior, self-play.
   Ship PR / code review: reject fingerprint-root density as primary brain.
   PAIR_STEP must not: dump losses on S_t → add fingerprint → re-dual same S_t → accept.

H6. ONE-SHOT CERT (ship only)
   1. Freeze candidate to git commit SHA (no further policy edits for this claim).
   2. ONLY THEN generate CERT seeds (or unseal sealed envelope created at goal start).
   3. CERT size: ≥300 deal seeds × both seats (≥600 games) vs v6.0.
   4. Ship thresholds vs v6.0:
        - Aggregate WR ≥ 0.90 with 95% Wilson LB > 0.87
        - Split CERT into 3 disjoint blocks ≥100 seeds; EACH block WR ≥ 0.88
   5. Same frozen SHA: vs v1 and latest convert freeze WR ≥ 0.85 (LB > 0.80);
      never lose overall to any freeze; identity sane.
   6. FAIL ⇒ train more with PAIR_STEP hybrid; next ship attempt needs NEW cert seeds + NEW SHA.
      Forbidden: patch exact CERT losses and re-run the same CERT seeds.

H7. OPTIONAL PROBE (not ship, not packaging)
   Rare sealed mini-probe for human-readable report card OK if aggregate-only and not used
   for residual packing. Prefer EMA of PAIR_STEP for status.

══════════════════════════════════════════════════════════════════
GOLD LIVING FOLDER (john_uploads — DYNAMIC, FREQUENT REFRESH)
══════════════════════════════════════════════════════════════════

G0. AUTHORITY
   john_uploads/ is the primary human-elite curriculum. It outranks internal dual heuristics for
   what “good play” means. New author data during training is intentional and must be consumed.

G1. WHAT TO WATCH (re-scan; do not assume a fixed inventory)
   - **/tien_len_AI.txt** (or successor names) — written recommendations; may grow series over time
   - **Images** (IMG_*.PNG/JPG/etc.) referenced by the text or newly added
   - **Playlog JSON** — prefer **newest** tienlen-playlogs-*.json by mtime / exportedAt, but keep
     older playlogs for BC unless author supersedes them
   - Any new notes / catalogs the author drops in this folder

G2. CADENCE (mandatory)
   - At goal start: full inventory + hash manifest evolve/eval-registry/gold-manifest.json
     (file paths, sizes, mtimes, content hashes).
   - **At least every PAIR_STEP accept attempt** (or every ≤2 hours of autonomous work, whichever
     is more frequent): re-scan john_uploads/; if manifest changes → GOLD REFRESH (G3).
   - At STATUS/checkpoint writes: note “gold manifest dirty/clean.”
   - Before every CERT ship attempt: mandatory full gold refresh + suite re-run.
   - Do not wait for the author to ping the agent; poll the folder.

G3. GOLD REFRESH PROCEDURE (when new/changed files detected)
   1. Update gold-manifest.json (diff: added/changed/removed).
   2. Parse new/updated tien_len_AI.txt lines → add or update machine tests on fair getAIMove path.
   3. Ingest new playlog events into BC dataset / supervised targets.
   4. Re-run full gold suite; failures become high-priority work (pause pure dual-climbing if needed).
   5. Log in STATUS.md: what was added, new fail count, next levers from new gold.
   6. PAIR_STEP accept requires green on the **current** suite (including new cases), not an old snapshot.

G4. SHIP / ACCEPT RULES WITH GROWING GOLD
   - “Gold green” means green on the **latest** suite after refresh — not green on day-1 tests only.
   - If author adds gold that fails the current champion: champion is NOT ship-ready; fix or justify
     with dual-safe redesign (never delete author gold tests to pass).
   - Expanding gold may temporarily increase fail count; that is expected and valuable signal.

G5. IMPLEMENTATION HINTS
   - Small script evolve/refresh-gold-manifest.js (or similar) for inventory + hash.
   - Watch paths: john_uploads/** ; ignore .DS_Store only.
   - BC retraining may be incremental on new playlog deltas.

══════════════════════════════════════════════════════════════════
ABSOLUTE NON-NEGOTIABLES
══════════════════════════════════════════════════════════════════

1. NO CONVERT-ON-S / CONVERT-ON-VAL / CONVERT-ON-PAIR-STEP / CONVERT-ON-CERT
2. NO SHIP AT 55–70% VS v6 — author-tier proxy is ≥90% on CERT only
3. PAIR_STEP: always paired θ_new vs θ_prev on same fresh S_t; never train on S_t
4. STATISTICS: wins/games, WR, Δ_WR, Wilson/bootstrap CI, n, seed hash, model SHA every step
5. GOLD BINDING (LIVING): john_uploads/ is dynamic — frequent re-scan (G2); suite GREEN on
   **current** fair getAIMove path for PAIR_STEP accept and CERT ship; never treat day-1 file
   list as the permanent gold set; never drop author tests to pass duals
6. FAIR INFO: rating duals hidden; product fair GM aligned; no perfectInfo cheat for rated GM
7. START FROM policies/v1-*; SoftN forbidden; MS>0 not primary dual evidence

══════════════════════════════════════════════════════════════════
MILESTONE LADDER (progress only; ship = H6)
══════════════════════════════════════════════════════════════════

  L1. Gold living pipeline: manifest + refresh-on-change; initial suite green on fair path;
      PAIR_STEP harness implemented (paired duals + Δ CI).
  L2. Dev estimate: champion EMA WR vs v6 ≥ 0.60 OR cumulative accepted ΣΔ ≥ +0.10 from v1 baseline
      with ≥3 consecutive accepts; gold still green on **latest** suite after refresh.
  L3. EMA WR vs v6 ≥ 0.70 OR ΣΔ ≥ +0.20; gold latest suite green.
  L4. EMA WR vs v6 ≥ 0.80 OR ΣΔ ≥ +0.30; gold latest suite green; ready to attempt CERT.
  L5. SHIP: gold refresh + green → H6 one-shot CERT ≥90% vs v6.0 (LB > 0.87) + secondary freeze gates.

Never call L2–L4 “ship” or “superhuman.” Never climb L2–L4 by residual-packing a fixed seed file.

══════════════════════════════════════════════════════════════════
GITHUB MILESTONE COMMITS (required at each L1→L5)
══════════════════════════════════════════════════════════════════

M0. On first achievement of each ladder level L1, L2, L3, L4, L5: commit the champion AI to git
    and push to GitHub (origin) so progress is durable and reviewable offline.
    Do this immediately when the milestone criteria are met — do not batch “commit later.”

M1. WHAT TO INCLUDE IN EACH MILESTONE COMMIT
    - Live AI identity: ai.js, search.js, ai-build.js (and index.html build stamp if used)
    - Freeze stamp of that champion: policies/vNN-ai.js + policies/vNN-search.js (or
      milestone-tagged policies/milestone-L{k}-* if not promoting a public v-number yet)
    - Evidence for that L-level: STATUS.md section, PAIR_STEP accept log snippet / dual report
      paths, gold-manifest hash, CERT report if L5
    - evolve/eval-registry updates relevant to the milestone
    - Do NOT bulk-commit thousands of intermediate force-*.json residual dumps unless needed
      for the evidence claim; prefer the ship-relevant champion + docs + registry

M2. COMMIT MESSAGE FORMAT (clear, searchable)
    feat(ai): milestone L{k} — <one-line strength claim>
    Body: gold status, EMA/ΣΔ or CERT WR±CI vs v6, git-facing AI_BUILD.id, seed-set hashes used.
    Examples:
      feat(ai): milestone L1 — gold living pipeline + PAIR_STEP harness green
      feat(ai): milestone L3 — champion EMA ≥0.70 vs v6 (paired-Δ climb); gold latest green
      feat(ai): milestone L5 — CERT ship ≥90% vs v6.0 (Wilson LB>0.87); freeze vXX

M3. BRANCH / TAG (recommended)
    - Push to main (or the project’s default branch) unless author policy says otherwise
    - Also tag: milestone-L1 … milestone-L5 (annotated tags preferred) for easy checkout
    - L5 may additionally tag ship/superhuman-v6-proxy or similar

M4. RULES
    - Only commit a milestone once per level (first time criteria are truly met under this protocol)
    - If gold refresh breaks green after a commit, fix and commit as fix; do not rewrite history
      of the milestone tag without author approval
    - Never force-push main
    - Auth: use existing git remote credentials; if push fails, leave commit local + STATUS note
      with recovery steps — still create the local commit so work is not lost

══════════════════════════════════════════════════════════════════
PROBLEM DIAGNOSIS (do not repeat)
══════════════════════════════════════════════════════════════════

Convert-on-S (and convert-on-fixed-VAL) produced v1→v10.x iterations with dual-null transfer;
v6.0 still beats late freezes ~58% on blind audits; author >> v6. Hybrid PAIR_STEP stops
rewarding memorization of one seed list; CERT one-shot is the only ship number that matters (≥90% vs v6).

══════════════════════════════════════════════════════════════════
ARCHITECTURE
══════════════════════════════════════════════════════════════════

Phase A — Foundations
  A1. v1 baseline live; engine tests green.
  A2. Implement PAIR_STEP runner (draw S_t, dual θ_prev & θ_new vs v6, paired Δ + CI, accept log).
  A3. CERT runner (post-freeze seed gen, block split, rating card).
  A4. Living gold: refresh-gold-manifest + suite builder from john_uploads (not static file list);
      playlog BC importer that prefers newest export and merges new files over time.
  A5. Fair product mode (hidden both; hint = opponent path).
  A6. Poll john_uploads/ every PAIR_STEP and ≤2h wall clock (G2); STATUS notes gold dirty/clean.

Phase B — Author floor
  B1. BC + gold modules from **current** john_uploads (structure, trash-first+control, 2-tempo, …).
  B2. Gold green on latest suite; PAIR_STEP accepts only with Δ CI + latest gold green.
  B3. When manifest dirty mid-run: interrupt dual thrash → GOLD REFRESH (G3) first.

Phase C — Search
  C1. Hidden det-MCTS/ISMCTS + prior (PUCT).
  C2. Value head; equal budgets; optional endgame exact solve.

Phase D — Self-play toward CERT 90%
  D1. Massive self-play on TRAIN (new deals always).
  D2. Checkpoint cadence: after each meaningful train block, PAIR_STEP vs current champion.
  D3. League of checkpoints optional; mix BC/gold so gold does not regress.
  D4. When L4 met, freeze SHA and attempt H6 CERT.

Phase E — Optional CFR/belief if PAIR_STEP plateaus before CERT-ready.

Phase F — Certification
  F1. H6 one-shot CERT; publish full card.
  F2. Ship only if H6 + latest gold green (post-refresh) + no fingerprint primary policy.
  F3. On each L1–L5 first achievement: git commit + push + tag per M0–M4 (L5 = ship commit).

══════════════════════════════════════════════════════════════════
COMPUTE (M5) — MAXIMAL SUBAGENT + PROCESS PARALLELISM
══════════════════════════════════════════════════════════════════

C0. PRINCIPLE
   Default to parallel **within a resource budget**. Only serialize when the protocol
   requires a single writer (PAIR_STEP accept, CERT one-shot, git milestone commit,
   gold-manifest conflict merge). Concurrent subagents and multi-process workers are
   preferred for independent work — but do **not** pin the whole laptop.

C0b. CORE CAP (MANDATORY) — ≤ HALF OF M5 CORES
   - Let N = number of logical CPUs (`os.cpus().length` or `sysctl -n hw.logicalcpu`).
   - Max concurrent **heavy** workers W_max = max(1, floor(N / 2)).
     Heavy = dual-force games, fair duals, self-play rollouts, train steps that peg a core.
   - Orchestrator + gold-watcher + status-scribe count as light; still keep total
     runnable Node dual/selfplay processes ≤ W_max.
   - Example: N=16 → W_max=8; N=10 → W_max=5.
   - Document W_max in STATUS.md at goal start. Do not raise without author approval.
   - Goal: long runs that leave the machine responsive for browsing, coding, uploads.

C1. ORCHESTRATOR (parent agent) — owns serial gates only
   - Maintains PLAN.md / STATUS.md / champion SHA / gold-manifest authority
   - Spawns/reaps subagents; merges results; never blocks on one long dual when
     others can run
   - PAIR_STEP accept/reject is single-threaded (one decision per step)
   - CERT ship attempt is single-threaded (one frozen SHA, one CERT draw)
   - Milestone L1–L5 git commit+push is single-threaded after evidence is ready

C2. ALWAYS-ON OR HIGH-CADENCE PARALLEL ROLES (spawn as separate subagents)
   Use distinct subagents (or process pools) for independent workstreams:

   | Role | Work | Parallelism |
   |------|------|-------------|
   | **gold-watcher** | Poll john_uploads/, refresh manifest, expand tests, report dirty | Continuous / every PAIR_STEP + ≤2h |
   | **dual-worker pool** | Fair dual shards for PAIR_STEP (θ_prev and θ_new vs v6 on S_t) | Multi-process across seeds/seats; 2 models can run in parallel on same S_t |
   | **selfplay-workers** | Generate self-play games → shards on disk | Max CPU workers; never waits on duals |
   | **train-worker** | BC / policy-value updates from shards + gold | Overlap with selfplay when safe |
   | **probe-analyst** | After PAIR_STEP: aggregate stats only (no CERT packaging) | Parallel with next train |
   | **harness-builder** | PAIR_STEP/CERT tooling, tests, registry scripts | Early phases; parallel with docs |
   | **freeze-librarian** | Snapshot policies/, AI_BUILD stamps, milestone commit prep | On L-level ready |
   | **cert-runner** | Only after freeze SHA; full CERT dual shards in parallel | Max cores for one-shot CERT |
   | **status-scribe** | Write STATUS checkpoints from other agents’ JSON outputs | Frequent, non-blocking |

   Spawn dual/selfplay workers up to **W_max = floor(cores/2)** total heavy processes
   (C0b). Prefer sharding seeds across those workers over one giant sequential dual.
   If both θ_prev and θ_new duals run at once, their worker counts **share** the same W_max budget.

C3. PAIR_STEP PARALLEL RECIPE (example)
   1. gold-watcher: refresh (must finish before accept if dirty)
   2. In parallel: generate S_t; dual-worker pool runs θ_prev vs v6 on S_t shards
      AND θ_new vs v6 on S_t shards (2× model eval, sharded by seed ranges)
   3. orchestrator merges paired outcomes → Δ + CI → accept/reject
   4. If accept: freeze-librarian prepares files; status-scribe logs; optionally
      start next selfplay batch immediately

C4. SELF-PLAY + TRAIN OVERLAP
   - Pipeline: selfplay-workers fill shards continuously while train-worker consumes
     completed shards (producer/consumer). Do not stop the world for one epoch.
   - PAIR_STEP can run on a candidate checkpoint while selfplay continues for the
     *next* candidate (different worktree or tagged build id) if isolation is clean.

C5. CERT PARALLEL RECIPE
   - After SHA freeze: shard CERT seeds across ≤ W_max workers; merge WR/CI once
   - Secondary freezes (vs v1, vs latest) may run as parallel cert jobs only if total
     heavy processes stay ≤ W_max; else queue. Orchestrator ANDs pass criteria.

C6. ISOLATION / SAFETY UNDER PARALLELISM
   - No two writers on the same live ai.js/search.js without orchestrator lock
   - Prefer worktree or policies/candidate-* copies for concurrent evals
   - Gold suite runs can parallelize by test file shards; merge junit/JSON
   - Never parallelize “package residual on S_t” — forbidden path

C7. SUBAGENT PROMPTS (efficiency)
   - Each subagent gets a narrow goal, explicit inputs/outputs on disk, and “no
     git push unless orchestrator asks”
   - Prefer background subagents for long duals/selfplay; orchestrator continues
   - On M5: use subagents freely for I/O-bound / light coordination work; heavy CPU
     work is gated by W_max so ~half the machine stays free for the author

C8. STATUS / RESUMABILITY
   - PLAN.md + STATUS.md every 30–60 min and at every PAIR_STEP / gold refresh / L-level
   - Record W_max and current worker counts in STATUS
   - Disk is source of truth so killed workers can resume without chat history

- Prefer large fixed n per S_t (n≥100 seeds both seats) over MS>0 noise.
- Tokens: use more **light** subagents to cut wall-clock; cap **heavy** workers at half cores.

══════════════════════════════════════════════════════════════════
SUCCESS CRITERIA (SHIP = all)
══════════════════════════════════════════════════════════════════

S0. PRIMARY: frozen git SHA → one-shot CERT vs v6.0: WR ≥ 0.90, Wilson LB > 0.87;
    three CERT blocks each WR ≥ 0.88.  ← SHIP BAR
S1. Gold suite 100% on fair getAIMove path for the **latest** john_uploads manifest after refresh
    (not a frozen day-1 subset).
S2. Same CERT commit: vs other freezes WR ≥ 0.85 (LB > 0.80); never lose overall to any freeze.
S3. Identity duals sane (~50%).
S4. No ultra-exact-byR primary policy (H5).
S5. PAIR_STEP history in STATUS (each accept: Δ, CI, seed hash, SHAs) proving hybrid was used —
    not a single fixed VAL climb.
S6. CERT seed hash + model SHA committed; proof CERT not used for residual packaging.
S7. Fair product mode (no perfectInfo in rated GM).
S8. GitHub: each of L1–L5 has a dedicated commit (and recommended tag milestone-L{k}) pushed to
    origin with champion AI + evidence (M0–M4).

Optional: human smoke only — not required for ship.

══════════════════════════════════════════════════════════════════
DELIVERABLES
══════════════════════════════════════════════════════════════════

- Live AI meeting S0–S7.
- evolve/eval-registry/pair-steps/ + cert reports with CIs.
- evolve/eval-registry/gold-manifest.json history (or diffs) showing living-folder re-scans.
- evolve/NOTE-methodology-alphago.md (hybrid PAIR_STEP + one-shot CERT; ban convert-on-*; living gold).
- STATUS.md with accept/reject log, gold refresh events, and L1–L5.
- Tests committed; gold green on current suite.
- GitHub history: commits (and tags milestone-L1 … milestone-L5) for each ladder level.

══════════════════════════════════════════════════════════════════
FORBIDDEN
══════════════════════════════════════════════════════════════════

- Shipping at “beat v6 55–70%.”
- Forever-fixed TRAIN_VAL as the only iteration metric with residual packing on that list.
- Unpaired random eval (new model only on new seeds; no θ_prev on same seeds).
- Convert-on-S / on PAIR_STEP S_t / on CERT (residual → fingerprint → re-dual same seeds).
- Re-using S_t after policy edit for another accept test.
- SoftN/perfectInfo/MS>0 as ship duals.
- Calling PAIR_STEP or EMA scores “ship.”
- Requiring human match for ship.
- Treating gold as a static one-time file list; ignoring new john_uploads during long runs;
  shipping while latest gold suite is red; deleting author gold tests to pass duals.
- Reaching L1–L5 without a corresponding GitHub commit/push of the champion AI for that level.

Start by: (1) spawn harness + living-gold pipelines in parallel, (2) v1 as θ_prev champion,
(3) BC from current playlogs/text while dual harness is built, (4) self-play workers continuous,
(5) PAIR_STEP climb with max dual sharding, (6) milestone git commits L1–L5, (7) freeze SHA and
one-shot CERT (≥90% vs v6) with parallel cert shards. Maximize subagents/processes; serialize
only accept/CERT/git. Author-tier proxy = CERT 90% vs v6, not version numbers.

```

---

## How to use

1. Open [tieng-len/GOAL-PROMPT-alphago-class-from-v1.md](tieng-len/GOAL-PROMPT-alphago-class-from-v1.md).
2. Copy the fenced `/goal` block.
3. Paste into a new Grok Build `/goal`.

## Hybrid at a glance

| Layer | Seeds | Purpose |
|-------|--------|---------|
| **TRAIN** | New/random always | Learn |
| **PAIR_STEP** | Fresh \(S_t\) each checkpoint; **both** \(\theta_{prev}\) and \(\theta_{new}\) on \(S_t\) | Accept only if paired \(\Delta\) CI > 0 |
| **CERT** | After freeze SHA; one-shot | Ship if ≥90% vs v6.0 |

**Ship bar:** CERT WR ≥ 90% vs v6.0 (Wilson LB > 87%).  
**Dev:** hybrid paired-Δ on fresh \(S_t\) each iteration.  
**Gold:** living `john_uploads/` — re-scan every PAIR_STEP and ≤2h; new uploads expand the suite; CERT only with **latest** gold green.  
**GitHub:** commit + push champion AI at each **L1→L5** (tags `milestone-L1` … `milestone-L5` recommended).  
**Parallelism:** many subagents OK for light work; **heavy dual/self-play/train ≤ half of M5 cores**; orchestrator for accept / CERT / milestone push.
