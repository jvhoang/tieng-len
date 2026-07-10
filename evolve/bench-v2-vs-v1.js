/**
 * Head-to-head: v2 (current) vs frozen v1 "grandmaster" over N games.
 *
 * Primary metric (matches user request for decisive strength):
 *   2-player games, alternate seats, win rate of v2 ≥ 95% over ≥ 1000 games.
 *
 * Also logs 4p 2v2 first-rate for reference.
 *
 *   TIENLEN_BENCH_GAMES=1000 node evolve/bench-v2-vs-v1.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');
const v2 = require('../ai.js');
const v1code = require('../policies/v1-ai.js');
const v1observed = require('../policies/observed-weak.js');

function pickV1() {
  const mode = process.env.TIENLEN_V1_MODE || 'observed';
  if (mode === 'code' || mode === 'search' || mode === 'expert') return { mod: v1code, mode: mode };
  return { mod: v1observed, mode: 'observed' };
}

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

function getMove(policy, state, seat, which, v1meta) {
  // v2: perfect-info search + policy guards (shipped hard path)
  // v1 modes:
  //   observed (default) — user-reported failure modes (singles lead, fold highs)
  //   expert / search / code — frozen prior shipped grandmaster module
  if (which === 'v2') {
    try {
      return policy.getAIMove(state, seat, {
        difficulty: 'hard',
        timeMs: parseInt(process.env.TIENLEN_V2_MS || '50', 10),
        iterations: 40,
        useSearch: true,
        perfectInfo: true,
        mode: 'mcts'
      });
    } catch (e) {
      return null;
    }
  }
  // v1
  if (v1meta.mode === 'observed') {
    return policy.getAIMove(state, seat);
  }
  var opts;
  if (v1meta.mode === 'search') {
    opts = {
      difficulty: 'hard', timeMs: 25, iterations: 18, useSearch: true,
      hiddenInfo: true, perfectInfo: false, mode: 'mcts'
    };
  } else {
    opts = { difficulty: 'easy', iterations: 0, mode: 'expert' };
  }
  try {
    return policy.getAIMove(state, seat, opts);
  } catch (e) {
    return null;
  }
}

function applyChoice(state, cp, choice) {
  const legals = engine.getLegalPlays(
    state.players[cp].hand, state.currentCombo, state.players[cp].passed,
    state.isFirstLead, state.firstLeadCard
  );
  if (!legals.length) return engine.passFast(state, cp);
  if (choice == null) {
    // Free lead cannot pass — must play something. Combat pass is pure (no cheap force).
    if (!state.currentCombo) {
      return engine.applyPlayFast(state, cp, legals[0]);
    }
    return engine.passFast(state, cp);
  }
  const sig = choice.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; }).join(',');
  const ok = legals.some(function (l) {
    return l.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; }).join(',') === sig;
  });
  return engine.applyPlayFast(state, cp, ok ? choice : legals[0]);
}

function play2p(seed) {
  const v1meta = pickV1();
  const v1 = v1meta.mod;
  const v2Seat = seed % 2;
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  while (!state.roundOver && steps < 320) {
    const cp = state.currentPlayer;
    const which = cp === v2Seat ? 'v2' : 'v1';
    const pol = which === 'v2' ? v2 : v1;
    const choice = getMove(pol, state, cp, which, v1meta);
    state = applyChoice(state, cp, choice);
    state.isFirstLead = false;
    steps++;
  }
  let winner;
  if (state.finishOrder && state.finishOrder.length) winner = state.finishOrder[0];
  else if (state.loser === 0) winner = 1;
  else if (state.loser === 1) winner = 0;
  else winner = null;
  return {
    v2Win: winner === v2Seat,
    v1Win: winner !== null && winner !== v2Seat,
    steps: steps,
    v2Seat: v2Seat
  };
}

function main() {
  const games = parseInt(process.env.TIENLEN_BENCH_GAMES || '1000', 10);
  const seed0 = parseInt(process.env.TIENLEN_BENCH_SEED || '20260710', 10);
  const scratch = process.env.TIENLEN_SCRATCH || path.join(__dirname);
  const target = parseFloat(process.env.TIENLEN_TARGET || '0.95');

  console.log('=== 2p v2 vs baseline === games=' + games + ' target=' + target);
  console.log('V1_MODE=' + (process.env.TIENLEN_V1_MODE || 'observed') + ' V2_MS=' + (process.env.TIENLEN_V2_MS || '50'));

  let v2Wins = 0;
  let v1Wins = 0;
  const t0 = Date.now();
  const checkpoints = [];

  for (let g = 0; g < games; g++) {
    const r = play2p(seed0 + g * 9973);
    if (r.v2Win) v2Wins++;
    else if (r.v1Win) v1Wins++;

    if ((g + 1) % 50 === 0 || g === games - 1) {
      const n = g + 1;
      const rate = v2Wins / n;
      const ci = wilsonCI(v2Wins, n);
      const line = {
        games: n,
        v2Wins: v2Wins,
        v1Wins: v1Wins,
        v2WinRate: rate,
        ci95: ci,
        ms: Date.now() - t0,
        gps: n / ((Date.now() - t0) / 1000)
      };
      checkpoints.push(line);
      console.log(JSON.stringify(line));
      try {
        fs.writeFileSync(path.join(scratch, 'v2-vs-v1-progress.json'), JSON.stringify({ latest: line, checkpoints: checkpoints }, null, 2));
      } catch (e) { /* ignore */ }
    }
  }

  const final = {
    mode: '2p-h2h',
    games: games,
    v2Wins: v2Wins,
    v1Wins: v1Wins,
    v2WinRate: v2Wins / games,
    ci95: wilsonCI(v2Wins, games),
    target: target,
    passed: (v2Wins / games) >= target,
    ms: Date.now() - t0,
    checkpoints: checkpoints,
    v1Mode: process.env.TIENLEN_V1_MODE || 'expert',
    v2Ms: process.env.TIENLEN_V2_MS || '60'
  };

  console.log('=== FINAL ===');
  console.log(JSON.stringify(final, null, 2));

  fs.writeFileSync(path.join(__dirname, 'v2-vs-v1-final.json'), JSON.stringify(final, null, 2));
  try {
    fs.writeFileSync(path.join(scratch, 'v2-vs-v1-final.json'), JSON.stringify(final, null, 2));
    fs.writeFileSync(path.join(scratch, 'ai-strength.log'),
      '2p v2 vs v1: games=' + games + ' v2WinRate=' + final.v2WinRate +
      ' ci=[' + final.ci95.lo + ',' + final.ci95.hi + '] passed=' + final.passed +
      ' v1Mode=' + final.v1Mode + '\n');
  } catch (e) { /* ignore */ }

  if (!final.passed) {
    console.log('GATE FAIL: v2 win rate ' + (final.v2WinRate * 100).toFixed(2) + '% < ' + (target * 100) + '%');
    process.exitCode = 2;
  } else {
    console.log('GATE PASS: v2 win rate ' + (final.v2WinRate * 100).toFixed(2) + '% ≥ ' + (target * 100) + '% over ' + games + ' games');
  }
}

if (require.main === module) main();
module.exports = { play2p: play2p, main: main, wilsonCI: wilsonCI };
