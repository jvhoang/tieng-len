# Deal recon helpers (next25 residual)

```bash
# Preferred (uses engine.js)
node evolve/_recon-next25-residual.js

# Standalone LCG (no require) — must match engine
node evolve/_uint32_deal_trace.js
python3 evolve/_manual_deal_calc.py
```

Seeds: 20520009, 20589820, 20629712, 20719469, 20609766, 20549928, 20739415

First-diff anchors (behavioral, from seed-duel notes):
- 20589820 seat1: nest free-lead **trash** vs identity **pair**
- 20629712 seat0: nest **22** vs v91 **PASS**
- 20520009: both-lose (22/13 steps)
