# W24 — Fair dual architecture levers (beyond BR cand-set surgery)

**Date:** 2026-07-14  
**Mode:** READ-MOSTLY design (no code ship this note)  
**Base:** `policies/p_w17_brfltrash-search.js` (holdout 0.52; DEV 33/50; DEV_VAL Δ+2)  
**Plateau:** W18–W23 one-axis BR free-lead / combat **candidate-set** micros dual-null or −1  

## Protocol lock (do not violate)

| Rule | State |
|------|--------|
| Hidden info | ON |
| GM both seats | ON |
| BR both equal | ON |
| BR **opp** leaf | freeze `expertPolicy` via `injectOpp` in `evolve/lean-fair-dual-n20.js` L26–38 |
| SoftN | **FORBIDDEN** |
| Fair opts self | `strongSelf: false` unless both seats set equal (`STRONG=1`) |

```js
// lean-fair-dual-n20.js — locked leaf inject
searchMod.setExploitOpponent(function (s, seat) {
  var dec = freezeSearchMod.expertPolicy(s, seat);
  return dec && dec.pass ? null : (dec && dec.play != null ? dec.play : null);
});
```

## Why architecture, not more BR filters

| Evidence | Implication |
|----------|-------------|
| Holdout both-lose sample: **nDiv 3/16 (18.75%)**, class **FL_other only** | Absolute losses are mostly **freeze-identical** full paths |
| W18–W23 BR cand micros on brfltrash | Dual-null / −1; cannot close +9 holdout wins |
| Equal BR + shared expert leaves | Cand filters that **agree with unique-max rates** do not change `playSig` (W12/W13 lesson) |
| `strongSelf: false` in fair dual | BR trial self = pure `expertPolicy` — soft ε / near-rate never moves discrete `wins/nTry` when rates unique |

**Live `search.js` vs base:** live carries `V93_RESIDUAL_MT` soft residual multiTie on BR free-lead only (`search.js` ~L1063–1084). **`p_w17_brfltrash` does not.** Fair dual both-BR makes that soft ε nearly free-lead-only and dual-flat when rates unique — not a W24 bet.

---

## Burned / near-burned (do not re-skin)

| Wave | Axis | Outcome | Lesson for W24 |
|------|------|---------|----------------|
| **W12 / W13** | BR residual soft / near-rate residual band / combat sbc×weight / expert smash→pass | Design first-diff ≈ 0 or FAIL gate | Soft residual on BR alone does not flip freeze-identical games |
| **W16** | BR combat **pass unique** when best multi top≥9 & sbc≥8 | DEV +1 flip; **DEV_VAL reverse** | Gold pass-vs-smash is DEV-local; do not retune pass gates |
| **W21** | Combat residual **BR root cand rewrite** on brfltrash | DEV −1 | Mid combat cand surgery on identical paths nets reverse |
| mintop / ovkgap / brgap | Hard min-top orderLegals / BR gap strip | Holdout-fragile or dual-null | Pure min-top cascade is not residual skill |
| shself / mbnest (always or FL nest) | Always `shallowSelfPick` as BR self | DEV ok → **DEV_VAL / holdout reverse** | Unbounded nest overfits; leaf must be gated |

---

## Shared code map (`p_w17_brfltrash-search.js`)

| Symbol | Approx lines | Role under fair dual |
|--------|-------------:|----------------------|
| `structureBreakCost` | 139–179 | sbc for order / pass gates |
| `analyzeHand` / `isTrashSinglePlay` | 185–234 | trash + control |
| `expertScore` | 240–341 | order key (lower better); combat sbc×2.2, free multi volume |
| `orderLegals` | 343–347 | sort by `expertScore` only |
| `expertPolicy` | 353–493 | BR self leaf + fallback; combat **cheap always play** L419–420 |
| `freeLeadCandidates` | 496–529 | MC/BR free-lead pool (multi + gated trash) |
| `pickFreeLeadHard` | 540–669 | expert free-lead (multi-always core) |
| `bestResponseMove` | 949–1095 | root BR; FL trash force W17 L1006–1021; combat = cheap+order |
| BR self playout | 1058–1060 | `strongSelf ? shallowSelfPick : expertPolicy` |
| `exploitPlayoutLeaf` | 1103–1120 | self expert / opp inject |
| `shallowSelfPick` | 1127–1164 | combat bail `hand.length > 9` → expert |
| `enforcePolicyGuards` | 726–818 | post-BR keep proposed if cheap legal |

---

## Lever A — `EXPERT_COMBAT_RESIDUAL_FORCE`  
### expertPolicy combat residual force (**not BR-only**)

### Exact locus
**Primary:** `expertPolicy` combat cheap return  
`policies/p_w17_brfltrash-search.js` **L419–420**:

```js
var cheap = cheapLegals(leg);
if (cheap.length) return { play: orderLegals(cheap, state, cp)[0] };
```

**Secondary (same axis, same probe only if primary first-diff mass low):** non-2 return **L467** `orderLegals(non2)[0]` with identical residual hard key (same-type answers only).

**Do not touch:** BR `actions` construction (W21), pass-unique (W16), soft multiTie (W12).

### Design shape (one axis, ~15–25 lines)

Insert a small helper once near `structureBreakCost`:

```js
function residualAfter(hand, play) {
  var used = Object.create(null), i, r;
  for (i = 0; i < play.length; i++) used[play[i].rank * 4 + play[i].suit] = 1;
  var byR = Object.create(null);
  for (i = 0; i < hand.length; i++) {
    if (!used[hand[i].rank * 4 + hand[i].suit]) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
  }
  var pairR = 0, maxRun = 0, run = 0;
  for (r = 0; r <= 11; r++) {
    var c = byR[r] || 0;
    if (c >= 2) pairR++;
    if (c > 0) { run++; if (run > maxRun) maxRun = run; }
    else run = 0;
  }
  return { pairR: pairR, maxRun: maxRun, sbc: structureBreakCost(hand, play) };
}
```

Replace bare cheap return with **hard residual force** (still always plays — no pass):

```js
var cheap = cheapLegals(leg);
if (cheap.length) {
  // W24 EXPERT_COMBAT_RESIDUAL_FORCE: mid combat, same-type cheap answers
  if (
    handLen >= 7 && omin >= 4 &&
    curTop < 10 &&
    !playIsBomb(cur.cards || []) &&
    (cur.type === 'single' || cur.type === 'pair' || cur.type === 'triple' || cur.type === 'seq')
  ) {
    var pool = cheap.filter(function (p) {
      var c = detectCombo(p);
      return c && c.type === cur.type;
    });
    if (pool.length >= 2) {
      pool.sort(function (a, b) {
        var ra = residualAfter(hand, a), rb = residualAfter(hand, b);
        if (ra.sbc !== rb.sbc) return ra.sbc - rb.sbc;           // preserve structure
        if (ra.pairR !== rb.pairR) return rb.pairR - ra.pairR;   // residual pairs
        if (ra.maxRun !== rb.maxRun) return rb.maxRun - ra.maxRun;
        // tertiary min-beat only among residual ties (anti-mintop cascade)
        var ga = topRank(a) - curTop, gb = topRank(b) - curTop;
        if (ga !== gb) return ga - gb;
        return expertScore(a, state, cp) - expertScore(b, state, cp);
      });
      return { play: pool[0] };
    }
  }
  return { play: orderLegals(cheap, state, cp)[0] };
}
```

### Fairness argument
- Challenger edits **its own** policy. Freeze seat still runs freeze `expertPolicy`.
- `injectOpp` stays freeze expert — **no asymmetric BR bomb**, protocol-compliant.
- Both seats remain GM + BR + equal budget; skill edge is the policy under test, not budget.
- Change is **seat-symmetric if both run the same package** (identity dual still fair).

### Why it changes freeze-identical games
Under fair dual, BR self rollouts and many mid-combat roots collapse to `orderLegals(cheap)[0]`. That path is **shared** with freeze → no first-diff. Hard residual sort changes the expert leaf **and** every BR self playout step → discrete rate + root playSig can move even when freeze would keep overkill/structure-smash unique-max.

Human signal: residual hBetter **186** / eBetter **48**; classes `H_minimal_beat`, structure-preserving multi answers (not pass-first).

### Expected dual mass
| Metric | Expectation |
|--------|-------------|
| First-diff | Combat midgame on previously identical both-lose seats (not only FL_other) |
| DEV Δ vs brfltrash | Target **+1..+3** if residual mass real; 0 if pool same-type rarely ≥2 |
| Absolute WR path | Improves only if residual pick wins more finish races than freeze smash |

### DEV_VAL risk
**Medium.** Cousin of mintop if tertiary gap dominates — mitigate by **sbc/pairR first**, gap only on residual ties, gate `omin≥4` / `handLen≥7` / no bomb.  
**Not** W16 pass (always play).  
**Not** bulk `expertScore` rewrite (W13 sbc×weight dual-null).

### Burned-if-similar
- W12 residual soft multiTie → **this is hard expert path**, not BR ε  
- W16 pass → **no pass branch**  
- W21 combat BR cand → **no BR leg rewrite**  
- mintop holdout → **reject pure min-top primary key**

---

## Lever B — `ORDER_FL_RESIDUAL_PRIORITY`  
### orderLegals / freeLeadCandidates structure priority

### Exact loci
1. **`orderLegals`** L343–347 — global sort used by expert cheap, BR combat, shallow nest, freeLeadCandidates tail  
2. **`freeLeadCandidates`** L496–529 — BR/MC free-lead pool construction  
3. Optional companion only if B1 flat: **`pickFreeLeadHard` multi `pool` sort** L622–627 (expert free-lead multi-always)

### Design shape (prefer single sub-axis)

**B1 (recommended form of B):** free-lead-only residual hard key **inside `orderLegals`**:

```js
function orderLegals(legals, state, myIdx) {
  var cur = state.currentCombo;
  var hand = state.players[myIdx].hand;
  return legals.slice().sort(function (a, b) {
    var ea = expertScore(a, state, myIdx), eb = expertScore(b, state, myIdx);
    if (!cur) {
      // FL residual priority when expertScore near-ties (hard secondary, not soft ε)
      if (Math.abs(ea - eb) <= 4) {
        var ra = residualAfter(hand, a), rb = residualAfter(hand, b);
        if (ra.pairR !== rb.pairR) return rb.pairR - ra.pairR;
        if (ra.maxRun !== rb.maxRun) return rb.maxRun - ra.maxRun;
        if (a.length !== b.length) return a.length - b.length; // shorter multi
      }
    }
    return ea - eb;
  });
}
```

**B2 (harder first-diff, closer to cand surgery):** in `freeLeadCandidates`, when `handLen≥9 && omin≥4` and any multi with `topRank≤7 && residualAfter.pairR≥1` exists, **drop** multi with `topRank≥9` from `out` before fallback. Orthogonal to W17 trash-force (does not require `hasControl` trash + multiHi).

### Fairness argument
Symmetric own-policy change; injectOpp untouched. orderLegals affects both seats’ policies if both load the package — identity-fair.

### Why freeze-identical can move
- B1: free-lead near-ties flip playSig where freeze multi-always picks long/high multi that kills residual pairs (human `E_longer_multi_H_shorter` / residual free-lead).  
- B2: BR free-lead unique-max **deletes** freeze high multi — rate-moving cand change, but **not** another W17-style trash pin; residual structure gate.

### Expected dual mass
| Form | Mass |
|------|------|
| B1 | Moderate FL first-diff; may be dual-flat if \|ea−eb\|>4 always |
| B2 | Higher FL first-diff; risk of W10/W14-class FL overfit if gate wide |

### DEV_VAL risk
**Medium–high for B2** (FL unique-max surgery family: brflo_g2 DEV_VAL reverse). **Medium-low for B1** if ε band narrow.  
Holdout both-lose already shows **only FL_other** when diverge — more FL residual may help absolute **or** overfit DEV FL pets (W17 holdout plateau 0.52).

### Burned-if-similar
- W17 brfltrash / W14 bropair — **do not** re-force trash or low-pair set  
- W12 residual multiTie soft — B1 is **hard secondary key on orderLegals**, not BR score ε  
- V93_RESIDUAL_MT live — BR-path soft only; do not port as sole lever  

---

## Lever C — `BR_SELF_RESIDUAL_NEST`  
### Fair leaf self-model (symmetric) / optional challenger-only with fairness note

### Exact loci
1. **`bestResponseMove` self playout** L1058–1060  
2. **`shallowSelfPick`** L1127–1164 (combat bail L1131; forced-win scan L1158–1163)  
3. **`exploitPlayoutLeaf`** L1103–1120 (only if nest calls it — already does)

### Design shape

**C-sym (fair symmetric — preferred):** change **policy** so BR self uses a gated nest **whenever this package runs**, independent of `opts.strongSelf` (both seats equal when both use package; freeze stays freeze package without nest).

```js
// bestResponseMove playout — replace self branch L1058–1060
var dec;
if (cp === myIdx) {
  var hSelf = s.players[myIdx].hand.length;
  var curSelf = s.currentCombo;
  // W24: combat residual nest only (no free-lead nest — anti mbnest_fl / s13)
  if (strongSelf || (curSelf && hSelf <= 9)) {
    dec = shallowSelfPick(s, myIdx);
  } else {
    dec = expertPolicy(s, cp);
  }
} else {
  dec = oppPol; // still inject freeze expert
}
```

**C-leaf residual (same probe or follow-up):** inside `shallowSelfPick`, when ranking nest candidates, order by `residualAfter` before forced-win scan so the first leaf-win found is structure-preserving (not first `orderLegals` smash that still wins vs freeze expert).

```js
// after orderLegals(leg) in shallowSelfPick:
if (cur) {
  leg = leg.slice().sort(function (a, b) {
    var ra = residualAfter(hand, a), rb = residualAfter(hand, b);
    if (ra.sbc !== rb.sbc) return ra.sbc - rb.sbc;
    if (ra.pairR !== rb.pairR) return rb.pairR - ra.pairR;
    return 0;
  });
}
```

### Fairness argument
| Mode | Fair? |
|------|-------|
| **C-sym in package** | Yes: freeze uses freeze search; chall uses chall search; budgets equal; opp leaf = freeze expert for **both** injects |
| **Env `STRONG=1` both** | Yes (protocol-equal) but freezes also nest → may cancel dual edge |
| **Challenger-only strongSelf flag with freeze strongSelf false** | **Unfair** — forbidden |

Protocol: *BR opp leaf = freeze expert* remains. Self model is part of GM policy under test, not a budget cheat.

### Why freeze-identical can move
Shared expert unique-max roots stay identical **until** nest finds a 1-ply forced win or different forced-win among candidates → `wins/nTry` flips without cand-set surgery. Targets long midgames (12–26 steps) where freeze/challenger climb the same.

### Expected dual mass
| Gate | Expectation |
|------|-------------|
| combat + hSelf≤9 only | Sparse but high-value rate flips; wall-clock +10–40% on combat roots |
| + residual order in nest | Biases which forced win is taken toward human structure |

### DEV_VAL risk
**High if FL nest or always-on** (shself DEV_VAL 0.42; mbnest holdout overfit).  
**Medium if combat-only ≤9** (mbnest_co family — less tested on **brfltrash** base).  
Cap wall-clock; reject if SOFT≠0 used as crutch (SoftN forbidden).

### Burned-if-similar
- W12 residual — rate skill via nest, not soft BR ε  
- W16 pass — nest does not force pass  
- W21 BR combat cand — no leg rewrite  
- always shself / FL nest packages — **explicitly excluded** by combat-only gate  

---

## Comparison matrix

| | A expert residual force | B order/FL residual | C combat self nest |
|--|-------------------------|---------------------|--------------------|
| Changes freeze-identical | **High** (every combat cheap leaf) | Med (FL near-tie / cand) | Med (only nest fires) |
| Beyond BR cand surgery | **Yes** | Partial (B1 yes / B2 no) | **Yes** (leaf model) |
| SoftN needed | No | No | No |
| DEV_VAL pattern risk | mintop-cousin if gap-primary | FL overfit (B2) | nest reverse (shself) |
| Holdout class target | combat mid identical | FL_other expand | long mid rate ties |
| Impl complexity | Low–med | Low | Med (time) |

---

## W24 pick (implement next — not this note)

### **Pick: Lever A — `EXPERT_COMBAT_RESIDUAL_FORCE`**

**Why this over B/C for one-shot W24 on brfltrash**

1. **Plateau diagnosis:** holdout both-lose is **~81% freeze-identical**; BR FL/combat cand micros (W18–W23) cannot create midgame skill. Expert cheap path is the shared leaf that makes BR+expert freeze-identical.  
2. **Not burned:** hard residual among same-type cheap answers is **not** W12 soft residual, **not** W16 pass, **not** W21 BR cand rewrite, **not** mintop-primary.  
3. **Dual mechanism:** moves expert self in BR trials **and** non-BR fallback without SoftN or budget asymmetry.  
4. **Gold/human align:** residual structure + min-beat tertiary matches playlog residual census without pass-structure DEV_VAL landmines.  
5. **B deferred:** FL residual overlaps W17 mass already captured; holdout divergences already FL-only — more FL may not lift absolute 0.52.  
6. **C deferred:** nest wall-clock + DEV_VAL history; use only if A first-diff mass is zero or DEV_VAL fails without reverse from pass-family.

### W24 implementation checklist (for implementer)

1. Copy `p_w17_brfltrash-*` → `p_w24_exresforce-*` (ai + search).  
2. One axis only: Lever A shape above. SoftN remains 0.  
3. Smoke first-diff on holdout-bothlose **identical** seats (expect combat class, not only FL_other).  
4. DEV T20 SOFT=0 vs identity + vs brfltrash base. Gate: DEV ≥32 and Δid≥+2 **and** not lose brfltrash flips (20350468@0 etc.).  
5. DEV_VAL only if DEV pass; **no lever edit after DEV_VAL peek**.  
6. Holdout A/B only if DEV_VAL Δ≥+2. Ship still needs WR>0.70 both (honest: A alone may not reach 0.70 — measure Δ and first-diff quality).  
7. If A dual-null first-diff: try **C combat nest only** next (not more BR filters). If A DEV_VAL reverse: discard; do **not** retune thresholds into W16 pass.

### Explicit non-goals for W24
- SoftN / softSamples sweeps  
- BR free-lead trash/pair/sbc gates (W14–W23 family)  
- Pass-unique on smash (W16)  
- Live `V93_RESIDUAL_MT` port as sole change  
- Perfect-info duals / BR-off freeze asymmetry  

---

## Runner reference

```bash
# Identity / base
FREEZE=v91 CHALL=p_w17_brfltrash GAMES=25 BOTH_SEATS=1 SEED=20260711 SOFT=0 \
  MS=200 TRIALS=20 node evolve/lean-fair-dual-n20.js

# W24 probe (after implement)
FREEZE=v91 CHALL=p_w24_exresforce GAMES=25 BOTH_SEATS=1 SEED=20260711 SOFT=0 \
  MS=200 TRIALS=20 node evolve/lean-fair-dual-n20.js
```

**Eval protocol:** `evolve/NOTE-fair-eval-protocol.md`  
**Best base evidence:** `evolve/NOTE-fair-w17-brfltrash.md`, `STATUS.md` W22–W23 table  
**Inject:** `evolve/lean-fair-dual-n20.js` L26–38  
