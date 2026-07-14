# W48 p_w48_ex_pairkeep — REJECT (dual-null)

**Date:** 2026-07-14  
**Base freeze:** v95  
**SoftN:** FORBIDDEN

## Hypothesis
Combat naked-over-Ace-pair-break from dual-safe CF `20470235@0` force `AC→JC`.

## Result
- Full-policy micro vs freeze v95: seat0 **still L** (force≠full path).
- Path replay at s4 under v95: current combo / legals are **pair** pool (`ACAS`,`2C2D`), not singles — CF single force was path-fragile.
- First drafts thrash-prone (min-naked 6S; reverse risk 20370505).

## Decision
**Discard.** Do not promote. Keep live **v9.5** banked.

## Next
Re-hunt dual-safe converts under BASE=v95 FREEZE=v95 with **full-policy firstdiff confirmation** before coding; prefer FREE uniqueness with gold lock or multi-type orthogonal to banked combat.
