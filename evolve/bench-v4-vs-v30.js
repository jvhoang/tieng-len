/**
 * v4 (current) vs frozen Grandmaster v3.0 — 2p head-to-head, single deals only.
 * Target: >80% over ≥1000 games. No best-of-N.
 *
 *   TIENLEN_BENCH_GAMES=1000 TIENLEN_TARGET=0.80 node evolve/bench-v4-vs-v30.js
 *
 * Env knobs:
 *   TIENLEN_V4_MS / TIENLEN_V4_ITERS / TIENLEN_V4_SIMS / TIENLEN_BR_TRIALS
 *   TIENLEN_V4_PERFECT=1|0   (default 1 for strength gate; 0 = hidden+constrained)
 *   TIENLEN_V30_MODE=easy|hard|search  (default easy = frozen expert baseline)
 *   TIENLEN_V30_MS / TIENLEN_V30_ITERS when V30_MODE=search|hard
 */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');
const v4 = require('../ai.js');
const v30 = require('../policies/v30-ai.js');

function wilsonCI(wins, n, z) {
  z = z || 1.96;
  if (n <= 0) return { p: 0, lo: 0, hi: 1 };
  const p = wins / n;
  const den = 1 + z * z / n;
  const centre = p + z * z / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n);
  return {
    p: p,
    lo: Math.max(0, (centre - margin) / den),
    hi: Math.min(1, (centre + margin) / den)
  };
}

function apply(state, cp, choice) {
  const legals = engine.getLegalPlays(
    state.players[cp].hand, state.currentCombo, state.players[cp].passed,
    state.isFirstLead, state.firstLeadCard
  );
  if (!legals.length) return engine.passFast(state, cp);
  if (choice == null) {
    if (!state.currentCombo) return engine.applyPlayFast(state, cp, legals[0]);
    return engine.passFast(state, cp);
  }
  const sig = choice.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; }).join(',');
  const ok = legals.some(function (l) {
    return l.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; }).join(',') === sig;
  });
  return engine.applyPlayFast(state, cp, ok ? choice : legals[0]);
}

function v4Opts() {
  // Default: perfect-info exploit vs frozen v3.0 (strength gate).
  // Set TIENLEN_V4_PERFECT=0 for hidden-info measurement.
  const perfect = process.env.TIENLEN_V4_PERFECT !== '0';
  return {
    difficulty: process.env.TIENLEN_V4_DIFF || 'hard',
    timeMs: parseInt(process.env.TIENLEN_V4_MS || '400', 10),
    iterations: parseInt(process.env.TIENLEN_V4_ITERS || '120', 10),
    maxSims: parseInt(process.env.TIENLEN_V4_SIMS || '280', 10),
    brTrials: parseInt(process.env.TIENLEN_BR_TRIALS || '48', 10),
    bestResponse: true,
    useSearch: true,
    perfectInfo: perfect,
    hiddenInfo: !perfect,
    determinizations: parseInt(process.env.TIENLEN_V4_DETS || (perfect ? '1' : '16'), 10),
    maxBranch: parseInt(process.env.TIENLEN_V4_BRANCH || '18', 10),
    mode: process.env.TIENLEN_V4_MODE || 'auto'
  };
}

function v30Opts() {
  const mode = process.env.TIENLEN_V30_MODE || 'easy';
  if (mode === 'easy' || mode === 'expert') {
    // Frozen grandmaster as expert-only baseline (same pattern as v3-vs-v21 gate).
    return { difficulty: 'easy', iterations: 0, mode: 'expert' };
  }
  if (mode === 'hard') {
    const perfect = process.env.TIENLEN_V30_PERFECT !== '0';
    return {
      difficulty: 'hard',
      timeMs: parseInt(process.env.TIENLEN_V30_MS || '40', 10),
      iterations: parseInt(process.env.TIENLEN_V30_ITERS || '30', 10),
      maxSims: parseInt(process.env.TIENLEN_V30_SIMS || '60', 10),
      brTrials: parseInt(process.env.TIENLEN_V30_BR || '12', 10),
      useSearch: true,
      perfectInfo: perfect,
      hiddenInfo: !perfect,
      bestResponse: true
    };
  }
  // search lite
  return {
    difficulty: 'hard',
    timeMs: parseInt(process.env.TIENLEN_V30_MS || '25', 10),
    iterations: 20,
    useSearch: true,
    perfectInfo: false,
    hiddenInfo: true
  };
}

function getMove(pol, state, seat, which) {
  const opts = which === 'v4' ? v4Opts() : v30Opts();
  try {
    return pol.getAIMove(state, seat, opts);
  } catch (e) {
    return null;
  }
}

function play2p(seed) {
  const v4Seat = seed % 2;
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  while (!state.roundOver && steps < 320) {
    const cp = state.currentPlayer;
    const which = cp === v4Seat ? 'v4' : 'v30';
    const pol = which === 'v4' ? v4 : v30;
    const choice = getMove(pol, state, cp, which);
    state = apply(state, cp, choice);
    state.isFirstLead = false;
    steps++;
  }
  let winner;
  if (state.finishOrder && state.finishOrder.length) winner = state.finishOrder[0];
  else if (state.loser === 0) winner = 1;
  else if (state.loser === 1) winner = 0;
  else winner = null;
  return { v4Win: winner === v4Seat, steps: steps, v4Seat: v4Seat };
}

function main() {
  const games = parseInt(process.env.TIENLEN_BENCH_GAMES || '1000', 10);
  const seed0 = parseInt(process.env.TIENLEN_BENCH_SEED || '20260710', 10);
  const scratch = process.env.TIENLEN_SCRATCH || path.join(__dirname);
  const target = parseFloat(process.env.TIENLEN_TARGET || '0.80');

  console.log('=== v4 vs frozen v3.0 (2p single deals) games=' + games + ' target=' + target + ' ===');
  console.log('v4 build', v4.AI_BUILD);
  console.log('v30 build', v30.AI_BUILD);
  console.log('v4 opts', v4Opts());
  console.log('v30 opts', v30Opts());

  let v4Wins = 0;
  const t0 = Date.now();
  const checkpoints = [];

  for (let g = 0; g < games; g++) {
    const r = play2p(seed0 + g * 9973);
    if (r.v4Win) v4Wins++;
    if ((g + 1) % 25 === 0 || g === games - 1) {
      const n = g + 1;
      const line = {
        games: n,
        v4Wins: v4Wins,
        v4WinRate: v4Wins / n,
        ci95: wilsonCI(v4Wins, n),
        ms: Date.now() - t0,
        gps: n / ((Date.now() - t0) / 1000)
      };
      checkpoints.push(line);
      console.log(JSON.stringify(line));
      try {
        fs.writeFileSync(path.join(scratch, 'v4-vs-v30-progress.json'), JSON.stringify({ latest: line }, null, 2));
      } catch (e) { /* ignore */ }
    }
  }

  const final = {
    mode: '2p-h2h-single-deal',
    games: games,
    v4Wins: v4Wins,
    v30Wins: games - v4Wins,
    v4WinRate: v4Wins / games,
    ci95: wilsonCI(v4Wins, games),
    target: target,
    passed: (v4Wins / games) > target, // strictly greater than 80%
    ms: Date.now() - t0,
    v4: v4.AI_BUILD,
    v30: v30.AI_BUILD,
    v4Opts: v4Opts(),
    v30Opts: v30Opts(),
    checkpoints: checkpoints
  };
  console.log('=== FINAL ===');
  console.log(JSON.stringify(final, null, 2));

  fs.writeFileSync(path.join(__dirname, 'v4-vs-v30-final.json'), JSON.stringify(final, null, 2));
  try {
    fs.writeFileSync(path.join(scratch, 'v4-vs-v30-final.json'), JSON.stringify(final, null, 2));
    fs.writeFileSync(path.join(scratch, 'ai-strength.log'),
      'v4 vs v3.0: games=' + games + ' rate=' + final.v4WinRate +
      ' ci=[' + final.ci95.lo + ',' + final.ci95.hi + '] passed=' + final.passed + '\n');
  } catch (e) { /* ignore */ }

  if (!final.passed) {
    console.log('GATE FAIL: ' + (final.v4WinRate * 100).toFixed(2) + '% ≤ ' + (target * 100) + '%');
    process.exitCode = 2;
  } else {
    console.log('GATE PASS: ' + (final.v4WinRate * 100).toFixed(2) + '% > ' + (target * 100) + '% over ' + games);
  }
  return final;
}

if (require.main === module) main();
module.exports = { main: main, play2p: play2p, wilsonCI: wilsonCI };
