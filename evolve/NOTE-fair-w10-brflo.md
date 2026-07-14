# W10 breakthrough — BR free-lead low-pair force

## Axis (`p_w10_brflo`)
In `bestResponseMove` free-lead path, after `leg = mergedBR`:

```js
if (!cur && hand.length >= 11) {
  var lps = [];
  for (var iL = 0; iL < leg.length; iL++) {
    if (leg[iL] && leg[iL].length === 2 && topRank(leg[iL]) <= 5 &&
        structureBreakCost(hand, leg[iL]) < 8) lps.push(leg[iL]);
  }
  if (lps.length) leg = lps;
}
```

## Why it works on design half
- Mintop only flipped design `20330522@0` (FREE single3 → pair33).
- Fair dual root is BR; `pickFreeLeadHard` alone is dual-null (only BR fallback).
- Forcing BR free-lead cand set to low pairs when they exist changes unique max rates.
- Design flips: 20280657@1, 20330522@0 (Δ+2).

## Stack
`p_w10_brflo_g2` adds expert combat “2 when best cheap is high smash” → full DEV **31/50** (one short of p&lt;0.05).

## Gate status
Split PASS. Full DEV not yet significant. No DEV_VAL/holdout yet.
