# Race micro → fair dual (hidden, BR both, equal budget)

**Date:** 2026-07-14  
**Question:** What actually produced pre-series-2 dual ~0.66 vs freeze v91, and can any of that skill help under **fair dual**?  
**Fair protocol:** `evolve/lean-fair-dual-n20.js` — both seats GM, **hidden**, **BR on both**, equal `timeMs` / `brTrials` / soft.  
**Identity bar:** `evolve/identity-v91-fair-ex-n20.json` = **8/20 (0.40)** @ MS=180 TRIALS=16 SOFT=6.

---

## 1. What race maxbudget actually measured (opts)

Artifact: `evolve/v92-race-maxbudget-vs-v91-n50.json`  
Label on live: `Grandmaster v9.2 (race+ leafEval)` · **34/50 = 0.68**

| Seat | timeMs | iters | maxSims | brTrials | bestResponse | perfectInfo | hiddenInfo | exactExploit | exploit | softSamples |
|------|-------:|------:|--------:|---------:|:------------:|:-----------:|:----------:|:------------:|:-------:|------------:|
| **Live** (race+) | **280** | 200 | 480 | **96** | **on** | **true** | **false** | **true** | **on** | 0 |
| **Freeze v91** | **120** | 80 | 160 | n/a | **off** | **true** | **false** | **true** | **off** | 0 |

Same package as pure-v91 maxbudget (`evolve/v91-maxbudget-vs-v91-n50.json` → also **34/50 = 0.68**).

Related pre-series-2 duals (same *class* of harness, slightly lower live budget):

| Artifact | liveWins | WR | Live vs freeze (summary) |
|----------|--------:|---:|--------------------------|
| `v92-race-maxbudget-vs-v91-n50.json` | 34 | **0.68** | MS280 BR96 exact BR-on vs MS120 BR-off perfect |
| `v91-maxbudget-vs-v91-n50.json` (identity policy) | 34 | **0.68** | same harness, **no race code** |
| `v91-ultrabudget-vs-v91-n50.json` | 34 | **0.68** | more ms, no gain |
| `v92-vs-v91-final.json` (pre-series-2 leaf micros) | 33 | **0.66** | MS180 BR56 exact vs MS100 BR-off; freeze exact **off** |
| Series-2 / gold structure duals | 27 | 0.54 | policy regressed under same dual class |

**Conclusion:** ~0.66–0.68 is a **budget + BR-on/off + perfect-info** ceiling. Race leafEval did **not** move the dual vs pure v91 under maxbudget.

---

## 2. Skill vs harness

### Harness-only (explains ~0.66–0.68)

1. Live **BR-on** vs freeze **BR-off** (largest seat asymmetry).  
2. Live **280ms / BR96** vs freeze **120ms** (search quality edge).  
3. **Perfect info** both seats (not human-relevant; not fair dual).  
4. Live **exploit-on** vs freeze **exploit-off**.  
5. Later hollow rungs (BR_GM_MODEL, identity 40/50 under same asymmetry) — see `NOTE-v91-real-skill-deltas.md`, `NOTE-dual-protocol-suspicion.md`.

### Code that was *labeled* skill but dual-neutral at 0.68

| Delta (pre-series-2 / v92 race+) | Locus | Dual effect vs freeze v91 |
|----------------------------------|-------|---------------------------|
| `leafEval2p` race 0.056→**0.068**, ctrl 0.028→0.032, trash/lead/1-card bumps | `leafEval2p` | **Neutral** (same 34/50 as pure v91 maxbudget) |
| Soft multiTie / race soft knobs (probe RACE branch) | free-lead soft | Silent under FL_ROOT/COMBAT_ROOT off + exact+BR (`PROBE-NOTES.md`) |
| Minimal-beat gap, lockBonus 0.11→0.13 (early v92 bak) | expertScore / soft free-lead | Below decision threshold under exact+BR |

### Real skill elsewhere (not “race”, and mostly cancelled once freeze catches up)

| Delta | Effect | Fair dual note |
|-------|--------|----------------|
| probe-TWO (omin≤3, hand 4–9, trash\|control) | +1 N50 vs freeze **v90** under asym dual | Already **in freeze v91** → no CHALL edge |
| STACK exact floors + softN force | free-lead multi exact completeness | Equal-budget STACK ≈ 0.50–0.54; fair exact often **off** |
| Series-2 structure-safe / gold bulk | dual **0.54** | **Regression** — do not re-import |
| Combat residual soft-tie (`combat-struct` fair n20) | **7/20** | Flat/reg under fair — not race |

---

## 3. Why race *might* matter under fair dual (and not under maxbudget)

| Axis | Race maxbudget dual | Fair dual (`lean-fair-dual-n20`) |
|------|---------------------|----------------------------------|
| Info | perfect | **hidden** |
| exactExploit | **on** (dominates ranking) | **off** (identity-ex) |
| softSamples | 0 (STACK force only on later stamps) | **6** |
| BR | live only | **both equal** |
| leafEval usage | truncated by exact win/loss | ranks **soft / incomplete / det BR** tails |

So the historical “race leafEval is silent” claim is **protocol-conditioned**. Under fair dual, leafEval is on the live ranking path more often → re-probe is justified.

Expert soft-pass also feeds BR **self** rollouts (`strongSelf: false` in fair opts). A small **race-ahead contest** gate (if `handLen <= omin`, do not soft-pass) is an expert/search micro that maxbudget never isolated.

---

## 4. Recommended challenger-only patch (`policies/p_race-*`)

**Do not** touch root `ai.js` / `search.js` or freeze `policies/v91-*`.

### Axis A (primary) — leafEval race+

Copy of v91 `leafEval2p` with v9.2 race coefficients:

```js
var e = 0.5 + (oppLen - myLen) * 0.068; // was 0.056
e += (info.twos - oinfo.twos) * 0.065;
e += (info.control - oinfo.control) * 0.032;
e += (oinfo.trashCount - info.trashCount) * 0.020;
// lead ±0.05; oppLen==1 −0.12; myLen==1 +0.12; oppLen==2 −0.04
```

### Axis B (secondary, small) — race-ahead contest in expert soft-pass tail

Before the `handLen≥10/9` soft-pass bands:

```js
// if tied/ahead in card race, contest rather than soft-pass mid
if (handLen <= omin && leg.length) {
  return { play: orderLegals(leg, state, cp)[0] };
}
```

### Explicitly **not** in this probe

- Budget / BR density / BR_GM_MODEL / perfect info  
- Series-2 multi-always / doubleseq force  
- Bulk `expertScore` / combat residual soft-tie (already fair-probed ~7–8/20)  
- Broader TWO omin≤4 (`p_two` fair **7/20**)

### Run command

```bash
cd /Users/johnhoang/Developer/Grok/tieng-len
FREEZE=v91 CHALL=p_race GAMES=20 SEED=20260711 MS=180 TRIALS=16 SOFT=6 \
  OUT=probe-p_race-vs-v91-fair-ex-n20.json \
  node evolve/lean-fair-dual-n20.js
```

### Accept rules

| Bar | Meaning |
|-----|---------|
| vs identity-ex **8/20** | Δ ≥ **+1** interesting; Δ ≥ **+2** promote interest |
| Ship | N50 fair WR **>0.70** **and** ≥ identity +2 (same seed0) — not expected from this micro alone |

---

## 5. Probe result

**Command:** `FREEZE=v91 CHALL=p_race GAMES=20 SEED=20260711 MS=180 TRIALS=16 SOFT=6 OUT=probe-p_race-vs-v91-fair-ex-n20.json node evolve/lean-fair-dual-n20.js`

| Metric | Value |
|--------|------:|
| **liveWins** | **8** |
| freezeWins | 12 |
| **liveWinRate** | **0.40** |
| identity-ex (`identity-v91-fair-ex-n20.json`) | **8/20** |
| **Δ vs identity-ex** | **0** |
| wall ms | ~7164 |
| ship gate (>0.70) | **FAIL** |
| Artifact | `evolve/probe-p_race-vs-v91-fair-ex-n20.json` |
| Log | `evolve/probe-p_race-vs-v91-fair-ex-n20.log` |

### Win / flip analysis vs identity-ex

| | seeds |
|--|-------|
| identity-ex wins (8) | `20300603, 20320549, 20340495, 20370414, 20380387, 20400333, 20420279, 20450198` |
| p_race wins (8) | **identical** |
| flips | **0** |
| regs | **0** |

### Verdict

| Promote? | **NO** |
|----------|--------|
| Skill signal | **None** at N=20 — race+ leafEval + race-ahead contest did not flip any fair-ex seed |
| Implication | Even under fair dual (hidden, exact off, softSamples=6), historical race leafEval remains **dual-silent**; race-ahead expert contest also silent on this seed block |
| Keep | Artifacts + `policies/p_race-*` as isolatable null baseline |

---

## 6. p_race is flat — next 1-axis fair candidates

1. **Free-lead short multi residual multiTie only** (BR free-lead; not combat-struct again — that was 7/20).  
2. **Gated multi fold with multi-aware sbc** (p_pass sbc≥12 never fired on multi answers).  
3. **Do not** re-run leafEval race under any dual class — null under maxbudget *and* fair-ex.  
4. Prefer combat/free-lead **decision gates** that change root play under equal BR, not soft leaf weights.

---

## 7. Bottom line

| Claim | Verdict |
|-------|---------|
| Pre-series-2 ~0.66 dual “proved race skill” | **False** — same WR as pure v91 maxbudget; harness |
| Race leafEval under fair dual | **Also null** — 8/20 ≡ identity-ex, 0 flips |
| Race-ahead expert contest | **Also null** on seed0=20260711 N=20 |
| Fair dual skill path | Expert/BR ranking quality with **equal seats**, not MS280 vs MS120 / race leaf |
| This probe | CHALL-only `p_race` → **8/20, Δ=0** vs identity-ex |
