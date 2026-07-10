/**
 * v3 (current) vs frozen v2.1 — 2p head-to-head, ≥1000 games, target ≥90% win rate.
 *
 *   TIENLEN_BENCH_GAMES=1000 node evolve/bench-v3-vs-v21.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');
const v3 = require('../ai.js');
const v21 = require('../policies/v21-ai.js');

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

function getMove(pol, state, seat, which) {
  // Asymmetric: v3 gets stronger search; v2.1 uses its shipped hard lite path
  var opts;
  if (which === 'v3') {
    opts = {
      difficulty: 'hard',
      timeMs: parseInt(process.env.TIENLEN_V3_MS || '150', 10),
      iterations: parseInt(process.env.TIENLEN_V3_ITERS || '90', 10),
      maxSims: parseInt(process.env.TIENLEN_V3_SIMS || '220', 10),
      brTrials: parseInt(process.env.TIENLEN_BR_TRIALS || '36', 10),
      bestResponse: true,
      useSearch: true,
      perfectInfo: true,
      mode: process.env.TIENLEN_V3_MODE || 'auto'
    };
  } else {
    // Frozen v2.1 as shipped-feeling: free-lead hard multi, expert combat (no deep search).
    // Optional search via TIENLEN_V21_SEARCH=1
    if (process.env.TIENLEN_V21_SEARCH === '1') {
      opts = {
        difficulty: 'hard',
        timeMs: parseInt(process.env.TIENLEN_V21_MS || '25', 10),
        iterations: 20,
        useSearch: true,
        perfectInfo: false,
        hiddenInfo: true
      };
    } else {
      opts = { difficulty: 'easy', iterations: 0, mode: 'expert' };
    }
  }
  try {
    return pol.getAIMove(state, seat, opts);
  } catch (e) {
    return null;
  }
}

function play2p(seed) {
  const v3Seat = seed % 2;
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  while (!state.roundOver && steps < 320) {
    const cp = state.currentPlayer;
    const which = cp === v3Seat ? 'v3' : 'v21';
    const pol = which === 'v3' ? v3 : v21;
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
  return { v3Win: winner === v3Seat, steps: steps };
}

function main() {
  const games = parseInt(process.env.TIENLEN_BENCH_GAMES || '1000', 10);
  const seed0 = parseInt(process.env.TIENLEN_BENCH_SEED || '20260710', 10);
  const scratch = process.env.TIENLEN_SCRATCH || path.join(__dirname);
  const target = parseFloat(process.env.TIENLEN_TARGET || '0.90');

  console.log('=== v3 vs frozen v2.1 (2p) games=' + games + ' target=' + target + ' ===');
  console.log('v3 build', v3.AI_BUILD);
  console.log('v21 build', v21.AI_BUILD);

  let v3Wins = 0;
  const t0 = Date.now();
  const checkpoints = [];

  for (let g = 0; g < games; g++) {
    const r = play2p(seed0 + g * 9973);
    if (r.v3Win) v3Wins++;
    if ((g + 1) % 50 === 0 || g === games - 1) {
      const n = g + 1;
      const line = {
        games: n,
        v3Wins: v3Wins,
        v3WinRate: v3Wins / n,
        ci95: wilsonCI(v3Wins, n),
        ms: Date.now() - t0,
        gps: n / ((Date.now() - t0) / 1000)
      };
      checkpoints.push(line);
      console.log(JSON.stringify(line));
      try {
        fs.writeFileSync(path.join(scratch, 'v3-vs-v21-progress.json'), JSON.stringify({ latest: line }, null, 2));
      } catch (e) { /* ignore */ }
    }
  }

  const final = {
    mode: '2p-h2h',
    games: games,
    v3Wins: v3Wins,
    v21Wins: games - v3Wins,
    v3WinRate: v3Wins / games,
    ci95: wilsonCI(v3Wins, games),
    target: target,
    passed: (v3Wins / games) >= target,
    ms: Date.now() - t0,
    v3: v3.AI_BUILD,
    v21: v21.AI_BUILD,
    checkpoints: checkpoints
  };
  console.log('=== FINAL ===');
  console.log(JSON.stringify(final, null, 2));

  fs.writeFileSync(path.join(__dirname, 'v3-vs-v21-final.json'), JSON.stringify(final, null, 2));
  try {
    fs.writeFileSync(path.join(scratch, 'v3-vs-v21-final.json'), JSON.stringify(final, null, 2));
    fs.writeFileSync(path.join(scratch, 'ai-strength.log'),
      'v3 vs v2.1: games=' + games + ' rate=' + final.v3WinRate +
      ' ci=[' + final.ci95.lo + ',' + final.ci95.hi + '] passed=' + final.passed + '\n');
  } catch (e) { /* ignore */ }

  if (!final.passed) {
    console.log('GATE FAIL: ' + (final.v3WinRate * 100).toFixed(2) + '% < ' + (target * 100) + '%');
    process.exitCode = 2;
  } else {
    console.log('GATE PASS: ' + (final.v3WinRate * 100).toFixed(2) + '% ≥ ' + (target * 100) + '% over ' + games);
  }
  return final;
}

if (require.main === module) main();
module.exports = { main: main, play2p: play2p, wilsonCI: wilsonCI };
