# Human vs live AI counterfactual — 79 completed 2p (ladder v8.5)

**AI:** `v8.5` (Grandmaster v8.5)
**Method:** getAIMove human-seat hiddenInfo=true perfectInfo=false
**Completed games:** 79
**Human actions:** 633
**Match rate:** 60.3% (382 match / 251 differ)

## Differ patterns
```
{
  "humanTwoAltNot": 29,
  "altTwoHumanNot": 12,
  "humanPassAltPlay": 29,
  "humanPlayAltPass": 0,
  "freeLeadDiffer": 90,
  "combatDiffer": 161,
  "multiVsSingle": 60,
  "classDisagree": 168
}
```

## Top class disagreements
```
[
  {
    "pair": "triple\u2192triple",
    "n": 26
  },
  {
    "pair": "pass\u2192pair",
    "n": 20
  },
  {
    "pair": "single_mid\u2192single_mid",
    "n": 18
  },
  {
    "pair": "single_trash\u2192pair",
    "n": 17
  },
  {
    "pair": "pair\u2192pair",
    "n": 17
  },
  {
    "pair": "single_two\u2192single_mid",
    "n": 16
  },
  {
    "pair": "single_trash\u2192single_mid",
    "n": 14
  },
  {
    "pair": "single_trash\u2192single_trash",
    "n": 12
  },
  {
    "pair": "single_mid\u2192single_trash",
    "n": 10
  },
  {
    "pair": "single_high\u2192single_mid",
    "n": 9
  },
  {
    "pair": "bomb_or_long\u2192triple",
    "n": 9
  },
  {
    "pair": "bomb_or_long\u2192bomb_or_long",
    "n": 8
  }
]
```

Artifacts: `evolve/counterfactual-79-v85-summary.json`, scratch CF full dump.
