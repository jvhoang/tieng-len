/**
 * Automate one ladder rung after live AI is already stamped:
 *   TIENLEN_FREEZE=v85 TIENLEN_RUNG=v86 TIENLEN_BENCH_GAMES=100 \
 *   TIENLEN_TARGET=0.70 TIENLEN_SCRATCH=... node evolve/run-ladder-rung.js
 *
 * Expects: live AI_BUILD already set; freeze already on disk.
 * Runs: primary N gate + re-run on seed+1. CF is separate (long).
 */
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const freeze = process.env.TIENLEN_FREEZE;
const rung = process.env.TIENLEN_RUNG || 'rung';
const scratch = process.env.TIENLEN_SCRATCH || path.join(__dirname);
const games = process.env.TIENLEN_BENCH_GAMES || '100';
const target = process.env.TIENLEN_TARGET || '0.70';
const seed0 = process.env.TIENLEN_BENCH_SEED || '20260711';
const seed1 = String(parseInt(seed0, 10) + 1);

function run(label, envExtra, outName, logName) {
  const env = Object.assign({}, process.env, envExtra, {
    TIENLEN_FREEZE: freeze,
    TIENLEN_BENCH_GAMES: games,
    TIENLEN_TARGET: target,
    TIENLEN_SCRATCH: scratch,
    TIENLEN_BENCH_OUT: outName,
    TIENLEN_V8_MS: process.env.TIENLEN_V8_MS || '120',
    TIENLEN_BR_TRIALS: process.env.TIENLEN_BR_TRIALS || '64'
  });
  console.log('=== RUN', label, '===');
  const r = spawnSync('node', [path.join(__dirname, 'bench-ladder.js')], {
    cwd: root,
    env: env,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });
  fs.writeFileSync(path.join(scratch, logName), (r.stdout || '') + (r.stderr || ''));
  console.log(r.stdout);
  if (r.stderr) console.error(r.stderr);
  if (r.status !== 0) {
    console.error('FAILED', label, 'status', r.status);
    process.exit(r.status || 2);
  }
  return JSON.parse(fs.readFileSync(path.join(__dirname, outName), 'utf8'));
}

if (!freeze) {
  console.error('TIENLEN_FREEZE required');
  process.exit(1);
}

const primary = run(
  'primary',
  { TIENLEN_BENCH_SEED: seed0 },
  rung + '-vs-' + freeze + '-final.json',
  'bench-' + rung + '-vs-prev.log'
);
const rerun = run(
  'rerun',
  { TIENLEN_BENCH_SEED: seed1 },
  rung + '-vs-' + freeze + '-rerun.json',
  'bench-' + rung + '-rerun.log'
);

console.log('PRIMARY', primary.liveWinRate, primary.passed);
console.log('RERUN', rerun.liveWinRate, rerun.passed);
if (!primary.passed || !rerun.passed) process.exit(2);
console.log('RUNG GATES PASSED', rung);
