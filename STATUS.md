# STATUS — Superhuman Tiến Lên (hybrid PAIR_STEP + CERT)

**Updated:** 2026-07-16T10:20Z  
**W_max:** 9  
**Dual champion:** `p_l2s112` ✅ (PAIR **0125** ACCEPT)  
**GitHub champion freeze:** `policies/p_l2s112-{ai,search}.js` + `policies/champion-*` (PAIR 0125 ACCEPT)
**Live product:** `v1.0-sh-L2s112` — free-lead mixed-opp BR + nested trials + dual-safe G7  
**Gold:** expert **74/0** · dual-path **17/0** · manifest **111** (GOLD-RECS playlog map mid-session) · **CLEAN**  
**Ladder:** L1 ✅ · **L2 open** (streak **1**/3 after 0125) · L3–L5 pending  
**Gold-watcher:** running  

## Ship bar
CERT ≥ **0.90** vs v6.0. Dual WR still ~50–54% — **not ship**.

## Accepts (ΣΔ ≈ **+0.249**)

| step | NEW | Δ | n | WR_new | note |
|------|-----|---|---|--------|------|
| 0007–0100 | … | Σ≈+0.170 | | | prior ladder |
| **0115** | **p_l2s104** | **+0.0567** | 300 | 0.547 | dual-safe G7 + FL distill vs p_l2s86 |
| **0125** | **p_l2s112** | **+0.0227** | 440 | 0.532 | free-lead mixed-opp + nested trials vs p_l2s104 |

**Streak:** **1** (0125 only; 0126–0130 rejects)  
**ΣΔ gate:** ✅ · **EMA:** ~0.52–0.54  

### Accept 0125 method (architecture leap)
1. Free-lead mixed opponent models in BR (strong/v21 alternate trials)
2. Free-lead self diversity (1/3 expert leaf, 2/3 dualRollout)
3. Nested free-lead trial budget (~1.5× trials, maxBranch 18)
4. Multi-length free-lead soft tie-break
5. Prior dual-safe gold delivery (K4, single-2 inject) retained

## PAIR after 0125 (streak broken)

| step | cand | Δ | LB | result |
|------|------|---|-----|--------|
| 0126 | author FL playlog BC | +0.75pp | −0.01 | REJECT |
| 0127 | BR-distill on 112 | −0.45pp | −0.02 | REJECT |
| 0128 | value-vs-v60 | 0 | ±0.01 | REJECT |
| 0129 | multi-det free-lead | +0.25pp | 0 | REJECT (need LB>0) |
| 0130 | multi-det larger n | +0.14pp | 0 | REJECT |
| 0131 | author FL soft prior | +0.23pp | −0.005 | REJECT |

## Mid-session gold (G3)
Author added:
- `GOLD-RECS-PLAYLOG-MAP.json/md` — 92 verified + 7 probable mapped playlog actions
- `GOLD-RECS-PLAYLOG-TRAIN.jsonl` — 99 train-ready state→action rows
- `evolve/train-gold-playlog-bc.js` — BC trainer (free-lead first)

## Gates
- K6 green · G7 dual 17/0 · expert 74/0 · gold CLEAN 111 files

## Next for L2 (3 consecutive accepts)
1. Stronger free-lead architecture (not residual BRD/value re-fit alone)
2. Ingest combat gold BC dual-safe micro features from TRAIN.jsonl
3. Prefer large n (n≥200 both seats) when Δ small but positive
4. Keep G2 re-scan (uploads already landed)

Never residual-pack. CERT 90% still far.

## N=1000 audit vs v6.0 (in progress)

- **Protocol:** fair dual GM+BR no-peek SoftN=0 TRIALS=20 BOTH_SEATS GAMES=500 → N=1000
- **Seed set:** `evolve/seed-sets/audit-recent-vs-v60-n1000-same-seed.json`
- **Tags:** p_l2s86, p_l2s104, p_l2s112, p_l2s116, p_l2s118, p_l2s119, audit_live (serial)
- **Orchestrator:** `evolve/run-audit-n1000-serial.sh` (nohup)
- **Outputs:** `evolve/audit-n1000-<tag>-vs-v60.json` → aggregate `AUDIT-recent-vs-v60-n1000.md`
- **Note:** prior 6-way parallel thrash aborted; serial redo in progress

