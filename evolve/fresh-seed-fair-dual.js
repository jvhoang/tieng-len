'use strict';
/**
 * Fresh-seed fair dual eval (anti-overfit protocol).
 *
 * Each eval round generates (or loads) NEW random seed partitions A and B.
 * On the SAME seeds it runs:
 *   1. CHALL vs FREEZE  (candidate strength)
 *   2. FREEZE vs FREEZE (identity control baseline ~0.50)
 *
 * Ship evidence requires both partitions and a lift over identity on the
 * same seed set — not fixed forever-holdouts (20260801/20260802 shopping).
 *
 * Usage:
 *   FREEZE=v96 CHALL=v97 SOFT=0 MS=0 TRIALS=20 GAMES=25 BOTH_SEATS=1 \
 *     node evolve/fresh-seed-fair-dual.js
 *
 *   # Re-run deterministically on a saved seed set:
 *   SEED_SET=evolve/seed-sets/ship-....json FREEZE=v96 CHALL=v97 \
 *     node evolve/fresh-seed-fair-dual.js
 *
 *   # Optional master seed for reproducible "random" generation:
 *   MASTER_SEED=42 FREEZE=v96 CHALL=v97 node evolve/fresh-seed-fair-dual.js
 *
 * Env:
 *   FREEZE, CHALL, GAMES (deal count per partition; BOTH_SEATS=1 → 2*GAMES games)
 *   MS, TRIALS, SOFT, BRANCH, BOTH_SEATS (default 1)
 *   MASTER_SEED — if set, seeds are det-derived (still a NEW set per MASTER_SEED)
 *   SEED_SET — path to existing seed-set JSON (skip generation)
 *   OUT — report JSON path (default evolve/fresh-dual-<chall>-vs-<freeze>.json)
 *   SKIP_IDENTITY=1 — only run chall vs freeze (not recommended for ship)
 *   TARGET — default 0.70 WR for chall partitions
 *   MIN_DELTA — min (challWins - idWins) per partition (default 2)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const engine = require('../engine.js');

const freezeTag = process.env.FREEZE || 'v96';
const challTag = process.env.CHALL || freezeTag;
const games = parseInt(process.env.GAMES || '25', 10);
const ms = parseInt(process.env.MS || '0', 10);
const trials = parseInt(process.env.TRIALS || '20', 10);
const soft = parseInt(process.env.SOFT || '0', 10);
const branch = parseInt(process.env.BRANCH || '12', 10);
const bothSeats = process.env.BOTH_SEATS !== '0'; // default ON
const skipIdentity = process.env.SKIP_IDENTITY === '1';
let target = parseFloat(process.env.TARGET || '0.70');
if (!isFinite(target)) {
  // Guard against ladder TARGET_RUNG / version strings leaking into TARGET
  console.warn('WARN: TARGET env not a WR threshold (' + process.env.TARGET + '); using 0.70');
  target = 0.70;
}
const minDelta = parseInt(process.env.MIN_DELTA || '2', 10);
const outName = process.env.OUT || ('fresh-dual-' + challTag + '-vs-' + freezeTag + '.json');
// Prefer cwd-relative OUT so evolve/eval-registry/... lands at repo root (not evolve/evolve/...)
const outPath = path.isAbsolute(outName) ? outName : path.join(process.cwd(), outName);
const os = require('os');
const W_MAX = Math.max(1, Math.floor((os.cpus().length || 2) / 2));
const WORKERS = Math.max(1, Math.min(W_MAX, parseInt(process.env.WORKERS || String(W_MAX), 10) || W_MAX));

const live = require('../policies/' + challTag + '-ai.js');
const freeze = require('../policies/' + freezeTag + '-ai.js');
const liveSearch = require('../policies/' + challTag + '-search.js');
const freezeSearch = require('../policies/' + freezeTag + '-search.js');

function injectOpp(searchMod, freezeSearchMod) {
  if (!searchMod.setExploitOpponent) return;
  searchMod.setExploitOpponent(function (s, seat) {
    if (freezeSearchMod && typeof freezeSearchMod.expertPolicy === 'function') {
      var dec = freezeSearchMod.expertPolicy(s, seat);
      return dec && dec.pass ? null : (dec && dec.play != null ? dec.play : null);
    }
    return null;
  });
}
injectOpp(liveSearch, freezeSearch);
injectOpp(freezeSearch, freezeSearch);

function seatOpts() {
  return {
    difficulty: 'grandmaster',
    useSearch: true,
    perfectInfo: false,
    hiddenInfo: true,
    timeMs: ms,
    iterations: 60,
    maxSims: 120,
    brTrials: trials,
    bestResponse: true,
    exactExploit: process.env.EXACT === '1',
    exploit: true,
    softSamples: soft,
    maxBranch: branch,
    mode: 'auto',
    strongSelf: process.env.STRONG === '1'
  };
}

function hashKey(str) {
  var h = 2166136261 >>> 0;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}
function withDetRng(key, fn) {
  var seed = hashKey(key);
  var saved = Math.random;
  Math.random = function () {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  try { return fn(); } finally { Math.random = saved; }
}

function apply(state, cp, choice) {
  const legals = engine.getLegalPlays(
    state.players[cp].hand, state.currentCombo, state.players[cp].passed,
    state.isFirstLead, state.firstLeadCard
  );
  if (!legals.length) return engine.passFast(state, cp);
  if (choice == null || choice.pass) {
    if (!state.currentCombo) return engine.applyPlayFast(state, cp, legals[0]);
    return engine.passFast(state, cp);
  }
  const play = choice.play || choice;
  if (!Array.isArray(play)) return engine.passFast(state, cp);
  const sig = play.map(function (c) { return c.rank * 4 + c.suit; })
    .sort(function (a, b) { return a - b; }).join(',');
  const ok = legals.find(function (l) {
    return l.map(function (c) { return c.rank * 4 + c.suit; })
      .sort(function (a, b) { return a - b; }).join(',') === sig;
  });
  return engine.applyPlayFast(state, cp, ok || legals[0]);
}

/**
 * Play one game. livePol/freezePol are the two seat policies.
 * "liveSeat" is the seat evaluated for liveWin (the candidate seat in chall runs;
 * for identity, still tracks seat 0/1 as assigned).
 */
function playGame(seed, liveSeat, livePol, freezePol) {
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  const t0 = Date.now();
  const opts = seatOpts();
  while (!state.roundOver && steps < 240) {
    const cp = state.currentPlayer;
    const pol = cp === liveSeat ? livePol : freezePol;
    const mv = withDetRng(String(seed) + '|' + steps + '|' + cp, function () {
      return pol.getAIMove(state, cp, opts);
    });
    state = apply(state, cp, mv);
    state.isFirstLead = false;
    steps++;
  }
  let winner = null;
  if (state.finishOrder && state.finishOrder.length) winner = state.finishOrder[0];
  else if (state.loser === 0) winner = 1;
  else if (state.loser === 1) winner = 0;
  return {
    seed: seed,
    liveWin: winner === liveSeat,
    liveSeat: liveSeat,
    steps: steps,
    ms: Date.now() - t0
  };
}

function runPartitionSerial(label, seeds, livePol, freezePol, mode) {
  const perGame = [];
  let liveWins = 0;
  const t0 = Date.now();
  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const seats = bothSeats ? [0, 1] : [seed % 2];
    for (let si = 0; si < seats.length; si++) {
      const r = playGame(seed, seats[si], livePol, freezePol);
      if (r.liveWin) liveWins++;
      perGame.push(r);
      console.log(JSON.stringify({
        mode: mode,
        partition: label,
        g: perGame.length - 1,
        seed: seed,
        liveSeat: r.liveSeat,
        liveWin: r.liveWin,
        steps: r.steps,
        ms: r.ms,
        liveWins: liveWins,
        games: perGame.length,
        wr: liveWins / perGame.length
      }));
    }
  }
  const n = perGame.length;
  return {
    mode: mode,
    partition: label,
    games: n,
    liveWins: liveWins,
    freezeWins: n - liveWins,
    liveWinRate: n ? liveWins / n : 0,
    seeds: seeds.slice(),
    bothSeats: bothSeats,
    ms: Date.now() - t0,
    perGame: perGame,
    lossSeats: perGame.filter(function (x) { return !x.liveWin; })
      .map(function (x) { return x.seed + '@' + x.liveSeat; })
  };
}

/**
 * Parallel partition: shard seeds across WORKERS child processes (≤ W_max).
 * Orchestrated via bash `wait` so parent stays synchronous.
 */
function runPartitionParallel(label, seeds, mode) {
  const { execSync } = require('child_process');
  const t0 = Date.now();
  const nW = Math.max(1, Math.min(WORKERS, seeds.length || 1));
  const shards = [];
  for (let w = 0; w < nW; w++) shards.push([]);
  for (let i = 0; i < seeds.length; i++) shards[i % nW].push(seeds[i]);

  const tmpDir = path.join(os.tmpdir(), 'tieng-len-dual-' + process.pid + '-' + label + '-' + Date.now());
  try { fs.mkdirSync(tmpDir); } catch (e) { if (e.code !== 'EEXIST') throw e; }

  const workerJs = path.join(__dirname, 'dual-shard-worker.js');
  const root = path.join(__dirname, '..');
  const lines = ['set -e', 'cd ' + JSON.stringify(root)];
  const outFiles = [];
  for (let w = 0; w < nW; w++) {
    if (!shards[w].length) continue;
    const seedFile = path.join(tmpDir, 'seeds-' + w + '.json');
    const outFile = path.join(tmpDir, 'out-' + w + '.json');
    outFiles.push(outFile);
    fs.writeFileSync(seedFile, JSON.stringify({ seeds: shards[w], bothSeats: bothSeats }));
    // Background each worker with env
    lines.push(
      'CHALL=' + JSON.stringify(challTag) +
      ' FREEZE=' + JSON.stringify(freezeTag) +
      ' SEED_FILE=' + JSON.stringify(seedFile) +
      ' OUT=' + JSON.stringify(outFile) +
      ' MS=' + String(ms) +
      ' TRIALS=' + String(trials) +
      ' SOFT=' + String(soft) +
      ' BRANCH=' + String(branch) +
      ' MODE=' + JSON.stringify(mode) +
      ' BOTH_SEATS=' + (bothSeats ? '1' : '0') +
      ' ' + JSON.stringify(process.execPath) + ' ' + JSON.stringify(workerJs) +
      ' >' + JSON.stringify(path.join(tmpDir, 'log-' + w + '.txt')) + ' 2>&1 &'
    );
  }
  lines.push('wait');
  lines.push('echo SHARDS_DONE');
  try {
    execSync(lines.join('\n'), { stdio: ['ignore', 'inherit', 'inherit'], timeout: 0 });
  } catch (e) {
    throw new Error('parallel workers failed: ' + (e.message || e));
  }

  const perGame = [];
  for (let i = 0; i < outFiles.length; i++) {
    if (!fs.existsSync(outFiles[i])) throw new Error('missing shard out ' + outFiles[i]);
    const res = JSON.parse(fs.readFileSync(outFiles[i], 'utf8'));
    const pg = res.perGame || [];
    for (let j = 0; j < pg.length; j++) perGame.push(pg[j]);
  }
  perGame.sort(function (a, b) {
    return a.seed - b.seed || a.liveSeat - b.liveSeat;
  });
  let liveWins = 0;
  for (let k = 0; k < perGame.length; k++) if (perGame[k].liveWin) liveWins++;
  const n = perGame.length;
  return {
    mode: mode,
    partition: label,
    games: n,
    liveWins: liveWins,
    freezeWins: n - liveWins,
    liveWinRate: n ? liveWins / n : 0,
    seeds: seeds.slice(),
    bothSeats: bothSeats,
    ms: Date.now() - t0,
    workers: nW,
    perGame: perGame,
    lossSeats: perGame.filter(function (x) { return !x.liveWin; })
      .map(function (x) { return x.seed + '@' + x.liveSeat; })
  };
}

function runPartition(label, seeds, livePol, freezePol, mode) {
  if (WORKERS > 1 && seeds.length >= 2 && process.env.NO_SHARD !== '1') {
    try {
      return runPartitionParallel(label, seeds, mode);
    } catch (e) {
      console.error('WARN: parallel shard failed, falling back serial:', e.message);
    }
  }
  return runPartitionSerial(label, seeds, livePol, freezePol, mode);
}

/** Generate `n` unique positive int seeds in [2e9, 3e9) style range. */
function generateSeeds(n, masterSeed, salt) {
  const out = [];
  const seen = Object.create(null);
  let state;
  if (masterSeed != null && masterSeed !== '') {
    state = hashKey(String(masterSeed) + '|' + salt);
  } else {
    state = crypto.randomBytes(4).readUInt32BE(0) || 1;
  }
  while (out.length < n) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    // Keep seeds in a high range; avoid tiny ints and legacy fixed holdouts.
    var s = 2000000000 + (state % 900000000);
    if (s === 20260801 || s === 20260802 || s === 20260711 || s === 20260712) continue;
    if (seen[s]) continue;
    seen[s] = 1;
    out.push(s);
  }
  return out;
}

function loadOrCreateSeedSet() {
  if (process.env.SEED_SET) {
    const p = path.isAbsolute(process.env.SEED_SET)
      ? process.env.SEED_SET
      : path.join(process.cwd(), process.env.SEED_SET);
    const set = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!set.A || !set.B) throw new Error('SEED_SET missing A/B arrays: ' + p);
    return { set: set, path: p, generated: false };
  }
  const master = process.env.MASTER_SEED != null ? process.env.MASTER_SEED : null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const set = {
    protocol: 'fresh-seed-fair-dual-v1',
    stamped: new Date().toISOString(),
    masterSeed: master,
    gamesPerPartition: games,
    bothSeats: bothSeats,
    // n deal seeds; BOTH_SEATS doubles games
    A: generateSeeds(games, master, 'A'),
    B: generateSeeds(games, master, 'B'),
    note: 'One-time seed set for this eval round. Do not reuse across ship rungs as a fixed holdout.'
  };
  // Forbid accidental reuse of legacy fixed holdouts
  const banned = { 20260801: 1, 20260802: 1, 20260711: 1, 20260712: 1 };
  set.A = set.A.filter(function (s) { return !banned[s]; });
  set.B = set.B.filter(function (s) { return !banned[s]; });
  while (set.A.length < games) {
    set.A = set.A.concat(generateSeeds(games - set.A.length, master, 'A-fix-' + set.A.length));
  }
  while (set.B.length < games) {
    set.B = set.B.concat(generateSeeds(games - set.B.length, master, 'B-fix-' + set.B.length));
  }
  set.A = set.A.slice(0, games);
  set.B = set.B.slice(0, games);

  const dir = path.join(__dirname, 'seed-sets');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fname = 'ship-' + stamp + '-' + challTag + '-vs-' + freezeTag + '.json';
  const setPath = path.join(dir, fname);
  fs.writeFileSync(setPath, JSON.stringify(set, null, 2));
  return { set: set, path: setPath, generated: true };
}

// ─── main ───────────────────────────────────────────────────────────
const loaded = loadOrCreateSeedSet();
const seedSet = loaded.set;

console.log(JSON.stringify({
  start: true,
  protocol: 'fresh-seed-fair-dual-v1',
  freeze: freezeTag,
  chall: challTag,
  live: live.AI_BUILD,
  freezeBuild: freeze.AI_BUILD,
  gamesPerPartition: games,
  bothSeats: bothSeats,
  ms: ms,
  trials: trials,
  soft: soft,
  seedSetPath: loaded.path,
  generated: loaded.generated,
  seedsA0: seedSet.A[0],
  seedsB0: seedSet.B[0],
  nA: seedSet.A.length,
  nB: seedSet.B.length,
  target: target,
  minDelta: minDelta,
  skipIdentity: skipIdentity
}));

const tAll = Date.now();

// 1) Chall vs freeze on A/B
const challA = runPartition('A', seedSet.A, live, freeze, 'chall-vs-freeze');
const challB = runPartition('B', seedSet.B, live, freeze, 'chall-vs-freeze');

// 2) Freeze identity on same A/B
let idA = null;
let idB = null;
if (!skipIdentity) {
  idA = runPartition('A', seedSet.A, freeze, freeze, 'freeze-vs-freeze');
  idB = runPartition('B', seedSet.B, freeze, freeze, 'freeze-vs-freeze');
}

function partitionPass(chall, id) {
  const wrOk = chall.liveWinRate > target;
  if (!id) {
    return { wrOk: wrOk, deltaOk: null, delta: null, passed: wrOk };
  }
  const delta = chall.liveWins - id.liveWins;
  const deltaOk = delta >= minDelta;
  return { wrOk: wrOk, deltaOk: deltaOk, delta: delta, passed: wrOk && deltaOk };
}

const passA = partitionPass(challA, idA);
const passB = partitionPass(challB, idB);

const report = {
  protocol: 'fresh-seed-fair-dual-v1',
  antiOverfit: true,
  infoModel: 'hidden',
  perfectInfo: false,
  hiddenInfo: true,
  brBoth: true,
  equalBudget: true,
  softN: soft,
  ms: ms,
  trials: trials,
  bothSeats: bothSeats,
  freezeTag: freezeTag,
  challTag: challTag,
  live: live.AI_BUILD,
  freeze: freeze.AI_BUILD,
  seedSetPath: loaded.path,
  seedSetGenerated: loaded.generated,
  seeds: { A: seedSet.A, B: seedSet.B },
  opts: seatOpts(),
  target: target,
  minDelta: minDelta,
  chall: { A: challA, B: challB },
  identity: skipIdentity ? null : { A: idA, B: idB },
  summary: {
    challA: { wins: challA.liveWins, games: challA.games, wr: challA.liveWinRate },
    challB: { wins: challB.liveWins, games: challB.games, wr: challB.liveWinRate },
    idA: idA ? { wins: idA.liveWins, games: idA.games, wr: idA.liveWinRate } : null,
    idB: idB ? { wins: idB.liveWins, games: idB.games, wr: idB.liveWinRate } : null,
    deltaA: passA.delta,
    deltaB: passB.delta,
    passA: passA,
    passB: passB
  },
  totalMs: Date.now() - tAll,
  // Ship: both partitions WR>target AND lift over freeze-identity by ≥minDelta
  passed: passA.passed && passB.passed,
  note: 'Fixed HOLDOUT seeds 20260801/20260802 are FORBIDDEN for ship under this protocol. Each eval round uses a new seed set recorded in seedSetPath.'
};

console.log('=== FRESH-SEED FINAL ===');
console.log(JSON.stringify({
  summary: report.summary,
  passed: report.passed,
  seedSetPath: report.seedSetPath,
  totalMs: report.totalMs,
  workers: WORKERS,
  wMax: W_MAX
}, null, 2));
try {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
} catch (e) {
  if (e.code !== 'EEXIST') {
    try { fs.mkdirSync(path.dirname(outPath)); } catch (e2) { /* best-effort */ }
  }
}
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log('wrote', outPath);
process.exit(report.passed ? 0 : 2);
