'use strict';
/**
 * PAIR_STEP harness — hybrid paired-Δ checkpoint accept vs freeze v6.0
 *
 * Usage:
 *   PREV=v1 NEW=v1 FREEZE=v60 GAMES=20 \
 *     node evolve/pair-step.js
 *
 *   PREV_AI=./ai.js PREV_SEARCH=./search.js \
 *   NEW_AI=./policies/foo-ai.js NEW_SEARCH=./policies/foo-search.js \
 *     node evolve/pair-step.js
 *
 * Protocol H2/H4: same fresh S_t for both models vs FREEZE; SoftN=0; hidden; both seats.
 * Does NOT residual-pack S_t. Accept only if Δ CI LB > 0 (or FORCE_ACCEPT=1 for plumbing).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const REG = path.join(ROOT, 'evolve', 'eval-registry', 'pair-steps');
const FREEZE = process.env.FREEZE || 'v60';
const GAMES = parseInt(process.env.GAMES || '100', 10);
const TRIALS = parseInt(process.env.TRIALS || '20', 10);
const MS = parseInt(process.env.MS || '0', 10);
const SOFT = 0;
const BOTH = process.env.BOTH_SEATS !== '0';
const W_MAX = Math.max(1, Math.floor((os.cpus().length || 2) / 2));
const STEP = process.env.STEP || String(Date.now());
const MIN_LB = parseFloat(process.env.MIN_DELTA_LB || '0');

function banSeed(s) {
  return s === 20260801 || s === 20260802 || s === 20260711 || s === 20260712;
}

function generateSeeds(n) {
  const out = [];
  const seen = Object.create(null);
  while (out.length < n) {
    const buf = crypto.randomBytes(4);
    let s = 2000000000 + (buf.readUInt32BE(0) % 900000000);
    if (banSeed(s) || seen[s]) continue;
    seen[s] = 1;
    out.push(s);
  }
  return out;
}

function wilson(wins, n, z) {
  z = z == null ? 1.96 : z;
  if (n <= 0) return { lo: 0, hi: 1, wr: 0 };
  const ph = wins / n;
  const den = 1 + (z * z) / n;
  const center = (ph + (z * z) / (2 * n)) / den;
  const half = (z * Math.sqrt((ph * (1 - ph) + (z * z) / (4 * n)) / n)) / den;
  return { lo: center - half, hi: center + half, wr: ph };
}

function bootstrapDeltaCI(dArr, B) {
  B = B || 2000;
  if (!dArr.length) return { lo: 0, hi: 0, mean: 0 };
  const n = dArr.length;
  const means = [];
  for (let b = 0; b < B; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += dArr[(Math.random() * n) | 0];
    means.push(s / n);
  }
  means.sort(function (a, b) { return a - b; });
  const lo = means[Math.floor(0.025 * B)];
  const hi = means[Math.min(B - 1, Math.floor(0.975 * B))];
  let m = 0;
  for (let i = 0; i < n; i++) m += dArr[i];
  return { lo: lo, hi: hi, mean: m / n };
}

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function runDual(challTag, freezeTag, seedSetPath, outPath) {
  // Prefer policy tags if PREV/NEW are tags; else use env CHALL with absolute policy copy
  const env = Object.assign({}, process.env, {
    FREEZE: freezeTag,
    CHALL: challTag,
    SEED_SET: seedSetPath,
    OUT: outPath,
    GAMES: String(GAMES),
    SOFT: '0',
    MS: String(MS),
    TRIALS: String(TRIALS),
    BOTH_SEATS: BOTH ? '1' : '0',
    SKIP_IDENTITY: '1',
    BRANCH: process.env.BRANCH || '12'
  });
  const r = spawnSync(process.execPath, [path.join(ROOT, 'evolve', 'fresh-seed-fair-dual.js')], {
    cwd: ROOT,
    env: env,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });
  if (!fs.existsSync(outPath)) {
    console.error('dual failed', challTag, r.status, r.stderr && r.stderr.slice(-500), r.stdout && r.stdout.slice(-500));
    throw new Error('dual missing out ' + outPath);
  }
  return JSON.parse(fs.readFileSync(outPath, 'utf8'));
}

function flattenGames(dualJson) {
  // fresh-seed report: chall.A.perGame and optionally chall.B
  const games = [];
  const chall = dualJson.chall || {};
  for (const part of ['A', 'B']) {
    const p = chall[part];
    if (!p || !p.perGame) continue;
    for (const g of p.perGame) {
      games.push({
        seed: g.seed,
        liveSeat: g.liveSeat,
        liveWin: !!g.liveWin,
        key: g.seed + '@' + g.liveSeat
      });
    }
  }
  return games;
}

function main() {
  try { fs.mkdirSync(REG); } catch (e) {
    if (e.code !== 'EEXIST') {
      try { fs.mkdirSync(path.dirname(REG)); } catch (e2) { if (e2.code !== 'EEXIST') throw e2; }
      try { fs.mkdirSync(REG); } catch (e3) { if (e3.code !== 'EEXIST') throw e3; }
    }
  }
  const prevTag = process.env.PREV || process.env.PREV_TAG || 'milestone-L0-v1';
  const newTag = process.env.NEW || process.env.NEW_TAG || prevTag;
  const freezeTag = FREEZE;

  // Ensure policy tags exist (fresh-seed-fair-dual requires policies/<tag>-ai.js)
  for (const tag of [prevTag, newTag, freezeTag]) {
    const aiP = path.join(ROOT, 'policies', tag + '-ai.js');
    const seP = path.join(ROOT, 'policies', tag + '-search.js');
    if (!fs.existsSync(aiP) || !fs.existsSync(seP)) {
      throw new Error('missing policies for tag ' + tag + ' (need ' + aiP + ')');
    }
  }

  const seeds = generateSeeds(GAMES);
  const seedSet = {
    protocol: 'pair-step-v1',
    stamped: new Date().toISOString(),
    step: STEP,
    gamesPerPartition: GAMES,
    bothSeats: BOTH,
    freeze: freezeTag,
    prev: prevTag,
    new: newTag,
    A: seeds,
    B: [],
    note: 'PAIR_STEP eval-only. Do not residual-pack. Discard after accept/reject for training.'
  };
  const seedPath = path.join(REG, 'step-' + STEP + '-seeds.json');
  fs.writeFileSync(seedPath, JSON.stringify(seedSet, null, 2));
  const seedHash = sha256File(seedPath);

  const outPrev = path.join(REG, 'step-' + STEP + '-prev-vs-' + freezeTag + '.json');
  const outNew = path.join(REG, 'step-' + STEP + '-new-vs-' + freezeTag + '.json');

  console.log(JSON.stringify({
    start: true,
    step: STEP,
    prev: prevTag,
    new: newTag,
    freeze: freezeTag,
    nSeeds: seeds.length,
    bothSeats: BOTH,
    wMax: W_MAX,
    seedHash: seedHash
  }));

  // Sequential duals to stay within W_max for a single dual process each (fresh-seed is single-threaded).
  // Could parallelize two duals with W_max/2 each later.
  const dualPrev = runDual(prevTag, freezeTag, seedPath, outPrev);
  const dualNew = runDual(newTag, freezeTag, seedPath, outNew);

  const gPrev = flattenGames(dualPrev);
  const gNew = flattenGames(dualNew);
  const mapPrev = Object.create(null);
  for (const g of gPrev) mapPrev[g.key] = g.liveWin;
  const mapNew = Object.create(null);
  for (const g of gNew) mapNew[g.key] = g.liveWin;

  const keys = Object.keys(mapPrev).filter(function (k) { return k in mapNew; }).sort();
  let winsPrev = 0;
  let winsNew = 0;
  const dArr = [];
  const paired = [];
  for (const k of keys) {
    const wp = mapPrev[k] ? 1 : 0;
    const wn = mapNew[k] ? 1 : 0;
    winsPrev += wp;
    winsNew += wn;
    dArr.push(wn - wp);
    paired.push({ key: k, prevWin: !!wp, newWin: !!wn, d: wn - wp });
  }
  const n = keys.length;
  const wrPrev = n ? winsPrev / n : 0;
  const wrNew = n ? winsNew / n : 0;
  const dWr = wrNew - wrPrev;
  const boot = bootstrapDeltaCI(dArr, 4000);
  // Also CI on proportion difference via Wilson on "new exclusive wins" is incomplete;
  // bootstrap on paired d is primary.
  const wNew = wilson(winsNew, n);
  const wPrev = wilson(winsPrev, n);

  // McNemar: b = prev win new lose, c = prev lose new win
  let b = 0, c = 0;
  for (const d of dArr) {
    if (d === -1) b++;
    if (d === 1) c++;
  }
  const mcnemarStat = b + c > 0 ? Math.pow(Math.abs(b - c) - 1, 2) / (b + c) : 0;

  const accept =
    process.env.FORCE_ACCEPT === '1' ||
    (dWr > 0 && boot.lo > MIN_LB);

  const report = {
    protocol: 'pair-step-v1',
    stamped: new Date().toISOString(),
    step: STEP,
    prev: prevTag,
    new: newTag,
    freeze: freezeTag,
    seedSetPath: seedPath,
    seedHash: seedHash,
    nGames: n,
    bothSeats: BOTH,
    softN: SOFT,
    ms: MS,
    trials: TRIALS,
    hiddenInfo: true,
    perfectInfo: false,
    wrPrev: wrPrev,
    wrNew: wrNew,
    winsPrev: winsPrev,
    winsNew: winsNew,
    deltaWR: dWr,
    bootstrapDelta: boot,
    wilsonNew: wNew,
    wilsonPrev: wPrev,
    mcnemar: { b: b, c: c, stat: mcnemarStat },
    accept: accept,
    acceptRule: 'deltaWR>0 && bootstrap 95% LB > MIN_DELTA_LB (default 0); gold check is external',
    forbid: 'Do not residual-pack this S_t. Do not re-use S_t after policy edits.',
    wMax: W_MAX,
    pairedSample: paired.slice(0, 5)
  };

  const outReport = path.join(REG, 'step-' + STEP + '-report.json');
  fs.writeFileSync(outReport, JSON.stringify(report, null, 2));
  console.log('=== PAIR_STEP RESULT ===');
  console.log(JSON.stringify({
    accept: accept,
    wrPrev: wrPrev,
    wrNew: wrNew,
    deltaWR: dWr,
    bootstrapLB: boot.lo,
    bootstrapUB: boot.hi,
    nGames: n,
    seedHash: seedHash,
    report: outReport
  }, null, 2));
  process.exit(accept ? 0 : 2);
}

main();
