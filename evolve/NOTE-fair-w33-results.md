# W33 — flvol SBC dual-null fix (maxSeq===4 gate)

**Date:** 2026-07-14  
**SoftN:** dead  
**Base:** `p_w32_ex_flshort5` (A30/B28 sum58)

## Diagnosis (data-first)
Force-alt hunt on freeze-id both-lose (19 seats): **21 non-pass converts**, 6 seats.

| Star CF | Force | Status under flshort5 |
|---------|-------|------------------------|
| **`20310666@1`** | FREE `33` → **4-seq** WIN | freeze-id dual-null: flVolPool empty (seq SBC~40 ≥ 12) |
| `20390451@1` | triple | already W (SBC 0; flvol works) |
| `20410397@0` | (anti) 4-seq while maxSeq=5 | reverse if ungated SBC relax |

Ungated “drop sbc&lt;12” converted 20310666 but **reversed B `20410397@0`** (A31/B27 sum58).  
Gate: **seq volume only when maxSeqLen===4** (and len===4); triples/dseq/quad unchanged.

## Selected: `p_w33_ex_flvolfix`
On flshort5 base:
1. Drop `structureBreakCost < 12` hard gate on volume multi.  
2. Seq volume only if `p.length === 4 && maxSeqLen === 4`.  
3. Triple/dseq/quad still volume.  
4. flshort before flvol order unchanged.

## Fair dual (SOFT=0 T20 BOTH_SEATS GAMES=25 → n=50)

| Gate | flvolfix | flshort5 |
|------|----------:|---------:|
| DEV | **33** | 34 |
| DEV_VAL | **27** | 27 |
| HOLDOUT_A | **31 (0.62)** | 30 |
| HOLDOUT_B | **28 (0.56)** | 28 |
| **A+B sum** | **59** | 58 |
| A Δid / B Δid | **+6 / +3** | +5 / +3 |
| Ship WR>0.70 | **NO** | NO |

### Key seats
| Seat | flvolfix | flshort5 | Role |
|------|:---------:|:--------:|------|
| `20310666@1` | **W** | L | volume CF convert |
| `20410397@0` | W | W | reverse avoided |
| `20290720@1` | W | W | flshort kept |
| `20390451@1` | W | W | flvol triple kept |
| `20380478@1` | W | W | flvol B kept |
| `20270774@0` | W | W | mulowg kept |
| `20480207@0` | W | W | pairhi kept |

A: **+1 pure convert, 0 reverse**. B: **identical 28**.

## Decision
**NO SHIP** (A 0.62 / B 0.56; need ~35/50).  
**New best package:** `p_w33_ex_flvolfix` — **A 31 / B 28 (sum 59)**.  
Live stays **v9.4**. SoftN dead.

## Evidence
`policies/p_w33_ex_flvolfix-*`, dual JSONs,  
`{SCRATCH}/w33/cf-convert-hunt.json`, `force-alt-hunt.js`
