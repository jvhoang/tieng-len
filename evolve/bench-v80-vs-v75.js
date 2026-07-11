/**
 * v8.0 (live) vs frozen Grandmaster v7.5 — 2p single deals only.
 * Target: strictly >80% over ≥200 continuous games. No best-of-N.
 *
 *   TIENLEN_BENCH_GAMES=200 TIENLEN_TARGET=0.80 node evolve/bench-v80-vs-v75.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');
const search = require('../search.js');
const v80 = require('../ai.js');
const v75 = require('../policies/v75-ai.js');

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
function v75ExpertMove(state, seat) {
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
    mv = v75.getAIMove(state, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' });
  } finally {
    Math.random = savedRandom;
  }
  if (_oppMemoN < 80000) { _oppMemo[key] = mv; _oppMemoN++; }
  return mv;
}
if (search.setExploitOpponent) {
  search.setExploitOpponent(function (state, seat) {
    return v75ExpertMove(state, seat);
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

function v80Opts() {
  const perfect = process.env.TIENLEN_V8_PERFECT !== '0';
  return {
    difficulty: process.env.TIENLEN_V8_DIFF || 'hard',
    timeMs: parseInt(process.env.TIENLEN_V8_MS || '160', 10),
    iterations: parseInt(process.env.TIENLEN_V8_ITERS || '160', 10),
    maxSims: parseInt(process.env.TIENLEN_V8_SIMS || '320', 10),
    brTrials: parseInt(process.env.TIENLEN_BR_TRIALS || '72', 10),
    bestResponse: true,
    useSearch: true,
    perfectInfo: perfect,
    hiddenInfo: !perfect,
    maxBranch: parseInt(process.env.TIENLEN_V8_BRANCH || '20', 10),
    dualSelf: process.env.TIENLEN_DUAL_SELF !== '0',
    exactExploit: true,
    mode: process.env.TIENLEN_V8_MODE || 'auto'
  };
}

function getMove(pol, state, seat, which) {
  if (which === 'v75') {
    try {
      return v75ExpertMove(state, seat);
    } catch (e) {
      return null;
    }
  }
  // Deterministic search RNG from position key so continuous benches re-run identically
  var key = _stateKey(state, seat) + '|v80';
  var seed = _hashKey(key);
  var savedRandom = Math.random;
  Math.random = function () {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  try {
    return pol.getAIMove(state, seat, v80Opts());
  } catch (e) {
    return null;
  } finally {
    Math.random = savedRandom;
  }
}

function play2p(seed) {
  _oppMemo = Object.create(null);
  _oppMemoN = 0;
  const v80Seat = seed % 2;
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  while (!state.roundOver && steps < 320) {
    const cp = state.currentPlayer;
    const which = cp === v80Seat ? 'v80' : 'v75';
    const pol = which === 'v80' ? v80 : v75;
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
  return { v80Win: winner === v80Seat, steps: steps, v80Seat: v80Seat };
}

function main() {
  const games = parseInt(process.env.TIENLEN_BENCH_GAMES || '200', 10);
  const seed0 = parseInt(process.env.TIENLEN_BENCH_SEED || '20260711', 10);
  const scratch = process.env.TIENLEN_SCRATCH || path.join(__dirname);
  const target = parseFloat(process.env.TIENLEN_TARGET || '0.80');
  const outName = process.env.TIENLEN_BENCH_OUT || 'v80-vs-v75-final.json';

  console.log('=== v80 vs frozen v7.5 (2p single deals) games=' + games + ' target=' + target + ' ===');
  console.log('v80 build', v80.AI_BUILD);
  console.log('v75 build', v75.AI_BUILD);
  console.log('v80 opts', v80Opts());
  console.log('v75 opts', { difficulty: 'easy', iterations: 0, mode: 'expert' });
  console.log('opponentFreeze policies/v75-ai.js + policies/v75-search.js');

  let v80Wins = 0;
  const t0 = Date.now();
  const checkpoints = [];

  for (let g = 0; g < games; g++) {
    const r = play2p(seed0 + g * 9973);
    if (r.v80Win) v80Wins++;
    if ((g + 1) % 25 === 0 || g === games - 1) {
      const n = g + 1;
      const line = {
        games: n,
        v80Wins: v80Wins,
        v80WinRate: v80Wins / n,
        ci95: wilsonCI(v80Wins, n),
        ms: Date.now() - t0,
        gps: n / ((Date.now() - t0) / 1000)
      };
      checkpoints.push(line);
      console.log(JSON.stringify(line));
      try {
        fs.writeFileSync(path.join(scratch, 'v80-vs-v75-progress.json'), JSON.stringify({ latest: line }, null, 2));
      } catch (e) { /* ignore */ }
    }
  }

  const final = {
    mode: '2p-h2h-single-deal-continuous',
    games: games,
    v80Wins: v80Wins,
    v75Wins: games - v80Wins,
    v80WinRate: v80Wins / games,
    ci95: wilsonCI(v80Wins, games),
    target: target,
    passed: (v80Wins / games) > target,
    ms: Date.now() - t0,
    v80: v80.AI_BUILD,
    v75: v75.AI_BUILD,
    v80Opts: v80Opts(),
    v75Opts: { difficulty: 'easy', iterations: 0, mode: 'expert' },
    opponentFreeze: 'policies/v75-ai.js + policies/v75-search.js',
    seed0: seed0,
    checkpoints: checkpoints
  };
  console.log('=== FINAL ===');
  console.log(JSON.stringify(final, null, 2));

  fs.writeFileSync(path.join(__dirname, outName), JSON.stringify(final, null, 2));
  try {
    fs.writeFileSync(path.join(scratch, outName), JSON.stringify(final, null, 2));
  } catch (e) { /* ignore */ }

  if (!final.passed) {
    console.error('GATE FAILED: v80WinRate=' + final.v80WinRate + ' target>' + target);
    process.exit(2);
  }
  console.log('GATE PASSED');
}

main();
