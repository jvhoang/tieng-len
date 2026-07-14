'use strict';
/**
 * Fair dual evaluation with locked train/holdout split (anti-overfit).
 *
 *   FREEZE=v91 CHALL=p_mbnest node evolve/fair-eval-holdout.js
 *   FREEZE=v91 CHALL=p_mbnest SKIP_DEV=1 node evolve/fair-eval-holdout.js   # holdout only
 *   FREEZE=v91 CHALL=p_mbnest DEV_ONLY=1 node evolve/fair-eval-holdout.js   # design only
 *
 * Env (dual lean defaults):
 *   MS=150 TRIALS=12 SOFT=4 BRANCH=12 BOTH_SEATS always on
 *   GAMES_DEV=25 GAMES_HOLD=25
 *
 * Ship: holdout_A and holdout_B both WR>0.70 and Δid≥+2.
 * Never report train WR as ship evidence.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const freeze = process.env.FREEZE || 'v91';
const chall = process.env.CHALL || freeze;
const ms = process.env.MS || '150';
const trials = process.env.TRIALS || '12';
const soft = process.env.SOFT || '4';
const branch = process.env.BRANCH || '12';
const gamesDev = process.env.GAMES_DEV || '25';
const gamesHold = process.env.GAMES_HOLD || '25';
const skipDev = process.env.SKIP_DEV === '1';
const devOnly = process.env.DEV_ONLY === '1';

// Locked partitions — do not change without writing a new protocol note + new holdout seeds.
const PARTITIONS = {
  dev: { seed0: 20260711, games: gamesDev, role: 'DEV (biased — design only)' },
  dev_val: { seed0: 20260715, games: gamesHold, role: 'DEV_VAL (selection only — not ship)' },
  holdout_A: { seed0: 20260801, games: gamesHold, role: 'HOLDOUT_A (primary ship)' },
  holdout_B: { seed0: 20260802, games: gamesHold, role: 'HOLDOUT_B (re-run ship)' }
};

const dualJs = path.join(__dirname, 'lean-fair-dual-n20.js');
const outDir = __dirname;

function runDual(tag, seed0, games, outName) {
  const env = Object.assign({}, process.env, {
    FREEZE: freeze,
    CHALL: tag,
    SEED: String(seed0),
    GAMES: String(games),
    BOTH_SEATS: '1',
    MS: String(ms),
    TRIALS: String(trials),
    SOFT: String(soft),
    BRANCH: String(branch),
    OUT: outName
  });
  // strip EXACT/STRONG unless explicitly set — fair lean default
  const r = spawnSync(process.execPath, [dualJs], {
    cwd: path.join(__dirname, '..'),
    env: env,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
  if (r.status !== 0 && r.status !== 2) {
    // exit 2 = failed WR gate inside dual; still may have written JSON
    console.error('dual stderr', (r.stderr || '').slice(-500));
  }
  const jp = path.join(outDir, outName);
  if (!fs.existsSync(jp)) {
    throw new Error('missing dual output ' + jp + ' status=' + r.status);
  }
  return JSON.parse(fs.readFileSync(jp, 'utf8'));
}

/** One-sided binomial P(X >= k | n, p=0.5) */
function binomSf(k, n) {
  if (k <= 0) return 1;
  if (k > n) return 0;
  var s = 0;
  var logC = 0; // log C(n,i) iterative
  // use recursive ratio for stability
  var term = Math.pow(0.5, n); // C(n,0)/2^n
  for (var i = 0; i <= n; i++) {
    if (i >= k) s += term;
    if (i < n) term = term * (n - i) / (i + 1);
  }
  return s;
}

function wilsonCI(k, n, z) {
  z = z == null ? 1.96 : z;
  if (n === 0) return [0, 1];
  var phat = k / n;
  var z2 = z * z;
  var den = 1 + z2 / n;
  var center = (phat + z2 / (2 * n)) / den;
  var half = (z * Math.sqrt((phat * (1 - phat) + z2 / (4 * n)) / n)) / den;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

function summarize(label, idj, chj) {
  const idW = idj.liveWins;
  const chW = chj.liveWins;
  const n = chj.games;
  const wr = chW / n;
  const idWr = idW / n;
  const delta = chW - idW;
  const pVal = binomSf(chW, n); // vs H0 fair 0.5
  const ci = wilsonCI(chW, n);
  const shipAbs = wr > 0.70;
  const shipDelta = delta >= 2;
  const ship = shipAbs && shipDelta;
  return {
    label: label,
    seed0: chj.seed0,
    n: n,
    idWins: idW,
    idWr: idWr,
    chWins: chW,
    wr: wr,
    delta: delta,
    pValVsHalf: pVal,
    wilson95: ci,
    significant05: pVal < 0.05,
    shipAbs: shipAbs,
    shipDelta: shipDelta,
    ship: ship
  };
}

function printRow(s, isHoldout) {
  const flag = isHoldout
    ? (s.ship ? 'SHIP_OK' : 'no_ship')
    : 'dev_only';
  const sig = s.significant05 ? 'p<0.05' : 'n.s.';
  console.log(
    s.label.padEnd(36) +
      ' seed0=' + s.seed0 +
      '  id=' + s.idWins + '/' + s.n + '=' + s.idWr.toFixed(3) +
      '  ch=' + s.chWins + '/' + s.n + '=' + s.wr.toFixed(3) +
      '  Δ' + (s.delta >= 0 ? '+' : '') + s.delta +
      '  CI95=[' + s.wilson95[0].toFixed(2) + ',' + s.wilson95[1].toFixed(2) + ']' +
      '  ' + sig +
      '  ' + flag
  );
}

const stamp = Date.now();
const results = { protocol: 'fair-holdout-v1', freeze: freeze, chall: chall, partitions: PARTITIONS, rows: {} };

function evalPartition(key, part) {
  const idOut = 'eval-id-' + freeze + '-' + key + '-s' + part.seed0 + '-n' + (part.games * 2) + '.json';
  const chOut = 'eval-ch-' + chall + '-' + key + '-s' + part.seed0 + '-n' + (part.games * 2) + '.json';
  console.log('--- running', key, part.role, '---');
  const idj = runDual(freeze, part.seed0, part.games, idOut);
  const chj = runDual(chall, part.seed0, part.games, chOut);
  // BOTH_SEATS doubles games
  const row = summarize(part.role, idj, chj);
  results.rows[key] = {
    summary: row,
    idFile: idOut,
    chFile: chOut,
    id: { liveWins: idj.liveWins, games: idj.games, wr: idj.liveWinRate, seed0: idj.seed0 },
    ch: { liveWins: chj.liveWins, games: chj.games, wr: chj.liveWinRate, seed0: chj.seed0, build: chj.live }
  };
  printRow(row, key !== 'dev');
  return row;
}

console.log('=== Fair dual holdout eval ===');
console.log('freeze=' + freeze + ' chall=' + chall + ' MS=' + ms + ' TRIALS=' + trials + ' SOFT=' + soft);
console.log('Protocol: evolve/NOTE-fair-eval-protocol.md');
console.log('');

const runDevVal = process.env.RUN_DEV_VAL === '1' || (!skipDev && !devOnly);
// DEV_VAL used for selection; skip if DEV_ONLY unless RUN_DEV_VAL=1
if (!skipDev) {
  evalPartition('dev', PARTITIONS.dev);
}
if (runDevVal && !devOnly) {
  evalPartition('dev_val', PARTITIONS.dev_val);
}
if (!devOnly && process.env.SKIP_HOLDOUT !== '1') {
  evalPartition('holdout_A', PARTITIONS.holdout_A);
  evalPartition('holdout_B', PARTITIONS.holdout_B);
}

const a = results.rows.holdout_A && results.rows.holdout_A.summary;
const b = results.rows.holdout_B && results.rows.holdout_B.summary;
const dv = results.rows.dev_val && results.rows.dev_val.summary;
const ship = !!(a && b && a.ship && b.ship);
results.ship = ship;
results.shipRule = 'holdout_A.WR>0.70 && holdout_B.WR>0.70 && both Δid≥+2';
results.selectionRule = 'DEV wins≥32 & Δ≥2 and DEV_VAL Δ≥2 before holdout';

console.log('');
console.log('=== SELECTION (dev_val) ===');
if (dv) {
  console.log('dev_val', dv.wr.toFixed(3), 'Δ' + dv.delta, dv.delta >= 2 ? 'SELECT_OK' : 'select_fail');
} else {
  console.log('dev_val not run (set RUN_DEV_VAL=1 or full eval)');
}
console.log('');
console.log('=== SHIP DECISION (holdout only) ===');
if (devOnly) {
  console.log('DEV_ONLY=1 — no ship decision');
} else if (process.env.SKIP_HOLDOUT === '1') {
  console.log('SKIP_HOLDOUT=1 — no ship decision');
} else {
  console.log('holdout_A', a ? (a.wr.toFixed(3) + ' Δ' + a.delta + (a.ship ? ' PASS' : ' FAIL')) : 'missing');
  console.log('holdout_B', b ? (b.wr.toFixed(3) + ' Δ' + b.delta + (b.ship ? ' PASS' : ' FAIL')) : 'missing');
  console.log(ship ? 'SHIP: YES' : 'SHIP: NO');
}

const reportPath = path.join(outDir, 'eval-holdout-' + chall + '-vs-' + freeze + '-' + stamp + '.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
// also stable latest path
const latest = path.join(outDir, 'eval-holdout-latest-' + chall + '-vs-' + freeze + '.json');
fs.writeFileSync(latest, JSON.stringify(results, null, 2));
console.log('wrote', reportPath);
console.log('wrote', latest);
process.exit(ship ? 0 : 2);
