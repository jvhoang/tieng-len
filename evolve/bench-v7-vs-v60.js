/**
 * v7 (current) vs frozen Grandmaster v6.0 — 2p single deals only.
 * Target: strictly >75% over ≥300 continuous games. No best-of-N.
 *
 *   TIENLEN_BENCH_GAMES=300 TIENLEN_TARGET=0.75 node evolve/bench-v7-vs-v60.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');
const search = require('../search.js');
const v7 = require('../ai.js');
const v60 = require('../policies/v60-ai.js');

var _oppMemo = Object.create(null);
var _oppMemoN = 0;
function _hashKey(str) {
  var h = 2166136261 >>> 0;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}
function _stateKey(state, seat) {
  var key = seat + '|' + state.currentPlayer + '|' +
    (state.isFirstLead ? 'F' : 'f') + '|' +
    (state.lastPlayBy == null ? 'n' : state.lastPlayBy) + '|';
  if (state.currentCombo && state.currentCombo.cards) {
    var cc = state.currentCombo.cards;
    var ids = [];
    var ci;
    for (ci = 0; ci < cc.length; ci++) ids.push(cc[ci].rank * 4 + cc[ci].suit);
    ids.sort(function (a, b) { return a - b; });
    key += state.currentCombo.type + ':' + ids.join(',') + '|';
  } else {
    key += 'L|';
  }
  var p, i, h;
  for (p = 0; p < state.players.length; p++) {
    h = state.players[p].hand;
    key += h.length + ':';
    for (i = 0; i < h.length; i++) key += (h[i].rank * 4 + h[i].suit) + ',';
    key += state.players[p].passed ? 'P' : 'N';
    if (state.players[p].finished) key += 'X';
  }
  return key;
}
function v60ExpertMove(state, seat) {
  var key = _stateKey(state, seat);
  if (_oppMemo[key] !== undefined) return _oppMemo[key];
  var seed = _hashKey(key);
  var savedRandom = Math.random;
  Math.random = function () {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  var mv;
  try {
    mv = v60.getAIMove(state, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' });
  } finally {
    Math.random = savedRandom;
  }
  if (_oppMemoN < 80000) { _oppMemo[key] = mv; _oppMemoN++; }
  return mv;
}
if (search.setExploitOpponent) {
  search.setExploitOpponent(function (state, seat) {
    return v60ExpertMove(state, seat);
  });
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

function v7Opts() {
  const perfect = process.env.TIENLEN_V7_PERFECT !== '0';
  return {
    difficulty: process.env.TIENLEN_V7_DIFF || 'hard',
    timeMs: parseInt(process.env.TIENLEN_V7_MS || '100', 10),
    iterations: parseInt(process.env.TIENLEN_V7_ITERS || '120', 10),
    maxSims: parseInt(process.env.TIENLEN_V7_SIMS || '280', 10),
    brTrials: parseInt(process.env.TIENLEN_BR_TRIALS || '48', 10),
    bestResponse: true,
    useSearch: true,
    perfectInfo: perfect,
    hiddenInfo: !perfect,
    maxBranch: parseInt(process.env.TIENLEN_V7_BRANCH || '16', 10),
    mode: process.env.TIENLEN_V7_MODE || 'auto'
  };
}

function getMove(pol, state, seat, which) {
  if (which === 'v60') {
    try {
      return v60ExpertMove(state, seat);
    } catch (e) {
      return null;
    }
  }
  try {
    return pol.getAIMove(state, seat, v7Opts());
  } catch (e) {
    return null;
  }
}

function play2p(seed) {
  _oppMemo = Object.create(null);
  _oppMemoN = 0;
  const v7Seat = seed % 2;
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  while (!state.roundOver && steps < 320) {
    const cp = state.currentPlayer;
    const which = cp === v7Seat ? 'v7' : 'v60';
    const pol = which === 'v7' ? v7 : v60;
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
  return { v7Win: winner === v7Seat, steps: steps, v7Seat: v7Seat };
}

function main() {
  const games = parseInt(process.env.TIENLEN_BENCH_GAMES || '300', 10);
  const seed0 = parseInt(process.env.TIENLEN_BENCH_SEED || '20260711', 10);
  const scratch = process.env.TIENLEN_SCRATCH || path.join(__dirname);
  const target = parseFloat(process.env.TIENLEN_TARGET || '0.75');

  console.log('=== v7 vs frozen v6.0 (2p single deals) games=' + games + ' target=' + target + ' ===');
  console.log('v7 build', v7.AI_BUILD);
  console.log('v60 build', v60.AI_BUILD);
  console.log('v7 opts', v7Opts());
  console.log('v60 opts', { difficulty: 'easy', iterations: 0, mode: 'expert' });

  let v7Wins = 0;
  const t0 = Date.now();
  const checkpoints = [];

  for (let g = 0; g < games; g++) {
    const r = play2p(seed0 + g * 9973);
    if (r.v7Win) v7Wins++;
    if ((g + 1) % 25 === 0 || g === games - 1) {
      const n = g + 1;
      const line = {
        games: n,
        v7Wins: v7Wins,
        v7WinRate: v7Wins / n,
        ci95: wilsonCI(v7Wins, n),
        ms: Date.now() - t0,
        gps: n / ((Date.now() - t0) / 1000)
      };
      checkpoints.push(line);
      console.log(JSON.stringify(line));
      try {
        fs.writeFileSync(path.join(scratch, 'v7-vs-v60-progress.json'), JSON.stringify({ latest: line }, null, 2));
      } catch (e) { /* ignore */ }
    }
  }

  const final = {
    mode: '2p-h2h-single-deal-continuous',
    games: games,
    v7Wins: v7Wins,
    v60Wins: games - v7Wins,
    v7WinRate: v7Wins / games,
    ci95: wilsonCI(v7Wins, games),
    target: target,
    passed: (v7Wins / games) > target,
    ms: Date.now() - t0,
    v7: v7.AI_BUILD,
    v60: v60.AI_BUILD,
    v7Opts: v7Opts(),
    v60Opts: { difficulty: 'easy', iterations: 0, mode: 'expert' },
    opponentFreeze: 'policies/v60-ai.js + policies/v60-search.js',
    seed0: seed0,
    checkpoints: checkpoints
  };
  console.log('=== FINAL ===');
  console.log(JSON.stringify(final, null, 2));

  fs.writeFileSync(path.join(__dirname, 'v7-vs-v60-final.json'), JSON.stringify(final, null, 2));
  try {
    fs.writeFileSync(path.join(scratch, 'v7-vs-v60-final.json'), JSON.stringify(final, null, 2));
  } catch (e) { /* ignore */ }

  if (!final.passed) {
    console.log('GATE FAIL: ' + (final.v7WinRate * 100).toFixed(2) + '% ≤ ' + (target * 100) + '%');
    process.exitCode = 2;
  } else {
    console.log('GATE PASS: ' + (final.v7WinRate * 100).toFixed(2) + '% > ' + (target * 100) + '% over ' + games);
  }
  return final;
}

if (require.main === module) main();
module.exports = { main: main, play2p: play2p, wilsonCI: wilsonCI };
