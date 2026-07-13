# Structure gold (IMG_0498–0513) — interpretation audit (2026-07-13)

## Human gold principles (correct)

| Cases | Principle |
|-------|-----------|
| 0498, 0505, 0512 | Prefer **loose** beat over breaking a pair |
| 0500, 0502, 0504 | Prefer **loose / 2** over breaking a ≥3 run interior |
| 0501 | Do not spend high pair (QQ) on mid pair when 2s back control — **pass** |
| 0503 | Among same-len seq answers, pick **residual** structure (9-10-J-Q) |
| 0506 | Free-lead **667788 doubleseq** because residual keeps finishing **345** |
| 0507 | First-lead **334455** with 3♠ — full control, not bare pair of 3s |
| 0510 | Pass **QKA** when it burns QQ/KK pair-backs for mid pairs 66/77 |
| 0511 | Pass **22** vs AA when weak singles need 2-cover later |
| 0513 | Prefer **2** over K-from-pair to take control |

These are **core GM decisions**, not hint-only cosmetics. Hints call the same `getAIMove`.

## What we got wrong (series-2 over-generalization)

1. **Structure-pass too broad** — any `safeCost ≥ 16` + midPairs/2s/control + hand ≥ 8 → pass on pair/trip/**seq**. Fired constantly in dual, folded tempo fights humans would contest with a structure-safe beat.
2. **Always force doubleseq free-lead** after BR/search — correct for 0506/0507 *plans*, wrong as a global override (burns bomb-class early, undoes BR free-lead strength).
3. **Always full free-lead enforce after exploit** — same dual harm.
4. **0511 pass 22** too loose (`hand ≥ 6`, any trash) — often correct to take AA with 22 in races.
5. **TRASHFL/STRUCT “flips”** revalidated as **series-2 stamp noise**, not real patch deltas (identical W/L with/without patch).

Measured after fix: **cheap-exists pass rate ≈ 2.1%** (was effectively much higher under broad structure-pass). Total pass ~33% is mostly *no cheap legal*, which is fine.

## Correct implementation (v9.2 gold-fix)

- **Ranking**: keep strong `structureBreakCost` so loose singles beat pair/run breaks (0498–0505, 0512).
- **Prefer 2** when all cheap non-2 answers smash structure vs mid/high single (0500, 0513).
- **Structure-pass only**:
  - Seq + midPairs ≥ 2 + high pair-back smash (Q/K/A pair→single) → **0510**
  - Pair/trip + 2s + harsh smash / high cost → **0501-adjacent**
  - Thresholds: hand ≥ 10, omin ≥ 5, not vs ultra-high tops
- **Doubleseq free-lead only when plan-shaped**: first-lead with 3♠, residual keeps ≥3 run (0506), residual clearly better than plain multi, or near empty.
- **0511**: pass 22 only if hand ≥ 10, omin ≥ 4, curTop ≥ 11, trashCount ≥ 2.
- **Exploit free-lead**: soft enforce (no-gift / short-opp / residual dseq), not discard all BR multi.

## Ladder

Continue dual GM N≥50 vs freeze v91 with this interpretation. Series-1/2 gold tests must stay green.
