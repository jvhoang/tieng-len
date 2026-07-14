# p_mbntie_all — near-tie hard argmin (post pin package)

## Mechanism
After BR scores actions, among all plays with `rate >= bestRate - 1/nTry`, pick hard:
1. lower topRank
2. lower structureBreakCost  
3. shorter multi

Applied to **both combat and free-lead** (`details.length` not just `cur`).

## Results (fair dual BOTH_SEATS MS150 T12)
- seed11: **38/50 = 0.76** (re-run identical) vs identity 0.50
- seed12–14: 0.52–0.54 (Δ+1..+2 only)
- N80 seed11-stream: 0.65 (extra seeds dilute)

## Ship
Primary gate pass; **independent seed re-run fails absolute 0.70**. Not shipped.
