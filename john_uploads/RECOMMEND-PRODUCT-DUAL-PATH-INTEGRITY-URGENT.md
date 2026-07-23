# AUTHOR MANDATE — Product GH path + dual freeze path integrity (no more degraded champion)

**File:** `john_uploads/RECOMMEND-PRODUCT-DUAL-PATH-INTEGRITY-URGENT.md`  
**Stamped:** 2026-07-23  
**Priority:** **URGENT infrastructure** — product ship + PAIR freeze correctness  
**Type:** New upload (ops / harness) — not a playing-strength lever by itself  
**Audience:** Grok Build main process · freeze-live · promote/restore · product GH Pages  
**Ship bar unchanged:** dual fair **WR ≥ 0.90 vs v60**  
**Complements:** product GM bind commits (`0c86bae`, `2fac90b`, `a9d1ec4`); STATUS path integrity section  

---

## 0. Problem statement (author)

Two separate failures looked like “AI is weak / dual is 0%” but were **path wiring**:

### 0.1 Product / iPhone (GH Pages) — degraded “grandmaster”

| Symptom (playlogs pre-fix) | Reality |
|-----------------------------|---------|
| Human WR ~86–91% | Playing **false GM** |
| 100% free-lead `null-free-lead` | `getAIMove` missing / never ran BR |
| Mass `cheap-force-error-only` | No search stats → controller min-beat |
| `thinkMs ≈ 0`, 0 BR modes | Search not bound |

**Root:** browser stub `module` / `require` + module-first UMD; then `ai.js` falling through to `require('./search.js')` under `window` **aborted the whole module** → `TienLenAI.getAIMove missing`.

**Post-fix (SITE_BUILD `202607231400`, n=19 playlogs):** fallback ~3%, `best-response-det` live, human WR ~**58%** — AI got real; author did not “get worse.”

### 0.2 Main PAIR freezes — dual WR 0%

| Symptom | Reality |
|---------|---------|
| Dual shards ~0% WR | Frozen `*-ai.js` still had `_loadNode('./search.js')` |
| Smoke “looks fine” sometimes | Wrong module / empty search in workers |

**Root:** live product switched to `_loadNode('./search.js')`; **`freeze-live.js` only rewrote classic `require('./search.js')`**. New freezes loaded live/null search under `policies/`.

---

## 1. Mandatory contracts (never trade one for the other)

### 1.1 Product / GH Pages (author plays here)

- [ ] `ai.js` / `genome.js` / `controller.js` / `search.js`: **browser-first** when `window` exists  
- [ ] Product `ai.js`: **`_loadNode`**; **NEVER call `require()` when `window` is defined**  
- [ ] Free-lead: always return a play when legals exist; always stamp `getLastSearchStats`  
- [ ] Combat: intentional BR/expert pass must carry stats so controller does **not** mass cheap-force  
- [ ] After product edits: bump **`TIENLEN_SITE_BUILD`** (cache bust)  
- [ ] Regression: `node test/test-product-gm-path.js`  

**Forbidden “fixes”:**  
- Reverting product to bare `require('./search.js')` to “make freeze simpler”  
- Claiming phone human WR is dual CERT evidence  

### 1.2 Dual freeze bank (main PAIR)

- [ ] Freezes **only** via `node evolve/freeze-live.js <tag> [id]`  
- [ ] Must rewrite **both**:
  - `require('./search.js')` → `require('./<tag>-search.js')`
  - `_loadNode('./search.js')` → `_loadNode('./<tag>-search.js')`
  - engine/genome → `../engine.js` / `../genome.js` (require and `_loadNode`)  
- [ ] **Validate** before write: frozen ai must **not** contain `_loadNode('./search.js')` or `require('./search.js')` (exit non-zero)  
- [ ] Shared implementation: **`evolve/policy-path-rewrite.js`**  
- [ ] Restore/promote/hillclimb must use the **same** module (no copy-paste regex drift)  
- [ ] Regression: `node test/test-policy-path-rewrite.js` (includes `p_l2s*` bank scan)  

**After any freezes created between product `_loadNode` land and freeze-live fix:** re-freeze those tags before PAIR.

### 1.3 Dual workers

- Load `policies/<CHALL>-ai.js` + `policies/<CHALL>-search.js`  
- If search bind is null / WR stuck at 0: **stop**, check freeze paths — do not invent soft levers  

---

## 2. Code map (source of truth)

| File | Role |
|------|------|
| `ai.js` | Product brain bind + `_loadNode` |
| `evolve/policy-path-rewrite.js` | Shared live ↔ freeze path rewrites + asserts |
| `evolve/freeze-live.js` | Freeze + validation |
| `evolve/_restore-live-from-tag.js` | Restore (warn if product safety fails) |
| `evolve/promote-bank-to-live.js` | Promote using shared rewrites |
| `test/test-product-gm-path.js` | Product GM path |
| `test/test-policy-path-rewrite.js` | Freeze rewrite + bank scan |

---

## 3. Acceptance criteria

### Product (author phone / Pages)

- [ ] Playlog AI events: **no** `getAIMove missing`  
- [ ] Free-lead fallback rate ≪ 5% (not 100% `null-free-lead`)  
- [ ] Combat: no mass `cheap-force-error-only`  
- [ ] Stats modes include `best-response` / `best-response-det` with `policyVersion`  
- [ ] Human WR no longer ~90% vs “grandmaster” purely from broken bind  

### Main (PAIR)

- [ ] New freeze: `grep` / assert no live `./search.js` load in `policies/<tag>-ai.js`  
- [ ] Dual smoke: chall `getAIMove` returns moves + search stats; WR not stuck at 0 from null search  
- [ ] `test-policy-path-rewrite` green  

---

## 4. What this does **not** change

- Dual champion remains **`p_l2s337`** until PAIR accept  
- CERT bar **≥0.90** vs v60 fair dual  
- Soft residual / combat thrash still need dual-transfer science  
- Phone human WR is **not** the ship metric  

---

## 5. STATUS one-liner (keep in STATUS.md)

```text
Path integrity: product never require() under window; freeze-live rewrites _loadNode+require; tests green.
```

---

**End mandate.** Keep product GM real on GH Pages **and** dual freezes loading policy search — both required; neither is optional.
