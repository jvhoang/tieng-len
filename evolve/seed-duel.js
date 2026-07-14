/**
 * Play specific seeds: live (this tree) vs freeze v90 GM.
 * Usage: SEEDS=a,b,c node evolve/seed-duel.js
 */
'use strict';
const path = require('path');
// Reuse play2p from bench-ladder by extracting via env-driven single-seed loop
process.env.TIENLEN_FREEZE = process.env.TIENLEN_FREEZE || 'v91';
process.env.TIENLEN_FREEZE_DIFF = process.env.TIENLEN_FREEZE_DIFF || 'grandmaster';
process.env.TIENLEN_V8_DIFF = process.env.TIENLEN_V8_DIFF || 'grandmaster';
process.env.TIENLEN_FREEZE_MS = process.env.TIENLEN_FREEZE_MS || '100';
process.env.TIENLEN_FREEZE_ITERS = process.env.TIENLEN_FREEZE_ITERS || '64';
process.env.TIENLEN_FREEZE_EXACT = process.env.TIENLEN_FREEZE_EXACT || '0';
process.env.TIENLEN_V8_MS = process.env.TIENLEN_V8_MS || '160';
process.env.TIENLEN_V8_ITERS = process.env.TIENLEN_V8_ITERS || '120';
process.env.TIENLEN_BR_TRIALS = process.env.TIENLEN_BR_TRIALS || '48';
process.env.TIENLEN_EXACT = process.env.TIENLEN_EXACT || '1';
process.env.TIENLEN_FL_ROOT = '0';
process.env.TIENLEN_COMBAT_ROOT = '0';
process.env.TIENLEN_DUAL_SELF = '0';

// Inline minimal play using same modules as bench-ladder
const engine = require('../engine.js');
const live = require('../ai.js');
const search = require('../search.js');
const freeze = require('../policies/' + process.env.TIENLEN_FREEZE + '-ai.js');

var _oppMemo = Object.create(null);
var _oppMemoN = 0;
var _brMemo = Object.create(null);
var _brMemoN = 0;
function _hashKey(str) {
  var h = 2166136261 >>> 0;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}
function _stateKey(state, seat) {
  var key =
    seat +
    '|' +
    state.currentPlayer +
    '|' +
    (state.isFirstLead ? 'F' : 'f') +
    '|' +
    (state.lastPlayBy == null ? 'n' : state.lastPlayBy) +
    '|';
  if (state.currentCombo && state.currentCombo.cards) {
    var ids = [];
    for (var ci = 0; ci < state.currentCombo.cards.length; ci++)
      ids.push(state.currentCombo.cards[ci].rank * 4 + state.currentCombo.cards[ci].suit);
    ids.sort(function (a, b) {
      return a - b;
    });
    key += state.currentCombo.type + ':' + ids.join(',') + '|';
  } else key += 'L|';
  for (var p = 0; p < state.players.length; p++) {
    var h = state.players[p].hand;
    key += h.length + ':';
    for (var i = 0; i < h.length; i++) key += h[i].rank * 4 + h[i].suit + ',';
    key += state.players[p].passed ? 'P' : 'N';
  }
  return key;
}
function freezeOpts() {
  // Hidden-info dual only (user 2026-07-14). Perfect only if FREEZE_PERFECT=1 (debug).
  var perfect = process.env.TIENLEN_FREEZE_PERFECT === '1';
  return {
    difficulty: 'grandmaster',
    useSearch: true,
    perfectInfo: perfect,
    hiddenInfo: !perfect,
    timeMs: parseInt(process.env.TIENLEN_FREEZE_MS || '100', 10),
    iterations: parseInt(process.env.TIENLEN_FREEZE_ITERS || '64', 10),
    maxSims: parseInt(process.env.TIENLEN_FREEZE_SIMS || '160', 10),
    bestResponse: process.env.TIENLEN_FREEZE_BR === '1',
    maxBranch: parseInt(process.env.TIENLEN_FREEZE_BRANCH || '16', 10),
    mode: 'auto',
    exactExploit: process.env.TIENLEN_FREEZE_EXACT === '1',
    exploit: process.env.TIENLEN_FREEZE_EXPLOIT === '1'
  };
}
function liveOpts() {
  var perfect = process.env.TIENLEN_V8_PERFECT === '1';
  return {
    difficulty: 'grandmaster',
    timeMs: parseInt(process.env.TIENLEN_V8_MS || '160', 10),
    iterations: parseInt(process.env.TIENLEN_V8_ITERS || '120', 10),
    maxSims: parseInt(process.env.TIENLEN_V8_SIMS || '320', 10),
    brTrials: parseInt(process.env.TIENLEN_BR_TRIALS || '48', 10),
    bestResponse: process.env.TIENLEN_BR !== '0',
    useSearch: true,
    perfectInfo: perfect,
    hiddenInfo: !perfect,
    maxBranch: parseInt(process.env.TIENLEN_V8_BRANCH || '20', 10),
    dualSelf: process.env.TIENLEN_DUAL_SELF === '1',
    exactExploit: process.env.TIENLEN_EXACT === '1',
    mode: 'auto',
    combatRoot: process.env.TIENLEN_COMBAT_ROOT === '1',
    flRoot: process.env.TIENLEN_FL_ROOT === '1',
    softSamples: parseInt(process.env.TIENLEN_SOFT_SAMPLES || '0', 10),
    exploit: process.env.TIENLEN_EXPLOIT !== '0'
  };
}
function freezeExpertMove(state, seat) {
  var key = 'E|' + _stateKey(state, seat);
  if (_brMemo[key] !== undefined) return _brMemo[key];
  var seed = _hashKey(key);
  var saved = Math.random;
  Math.random = function () {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  var mv;
  try {
    mv = freeze.getAIMove(state, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' });
  } finally {
    Math.random = saved;
  }
  if (_brMemoN < 80000) {
    _brMemo[key] = mv;
    _brMemoN++;
  }
  return mv;
}
function freezeMove(state, seat) {
  var opts = freezeOpts();
  var key = 'G|' + _stateKey(state, seat) + '|' + opts.timeMs + '|' + opts.iterations;
  if (_oppMemo[key] !== undefined) return _oppMemo[key];
  var seed2 = _hashKey(key);
  var saved2 = Math.random;
  Math.random = function () {
    seed2 = (Math.imul(seed2, 1664525) + 1013904223) >>> 0;
    return seed2 / 4294967296;
  };
  var mv2;
  try {
    mv2 = freeze.getAIMove(state, seat, opts);
  } catch (e) {
    mv2 = freezeExpertMove(state, seat);
  } finally {
    Math.random = saved2;
  }
  if (_oppMemoN < 40000) {
    _oppMemo[key] = mv2;
    _oppMemoN++;
  }
  return mv2;
}
if (search.setExploitOpponent) {
  search.setExploitOpponent(function (state, seat) {
    return freezeExpertMove(state, seat);
  });
}
function apply(state, cp, choice) {
  const legals = engine.getLegalPlays(
    state.players[cp].hand,
    state.currentCombo,
    state.players[cp].passed,
    state.isFirstLead,
    state.firstLeadCard
  );
  if (!legals.length) return engine.passFast(state, cp);
  if (choice == null) {
    if (!state.currentCombo) return engine.applyPlayFast(state, cp, legals[0]);
    return engine.passFast(state, cp);
  }
  const sig = choice
    .map(function (c) {
      return c.rank * 4 + c.suit;
    })
    .sort(function (a, b) {
      return a - b;
    })
    .join(',');
  const ok = legals.find(function (l) {
    return (
      l
        .map(function (c) {
          return c.rank * 4 + c.suit;
        })
        .sort(function (a, b) {
          return a - b;
        })
        .join(',') === sig
    );
  });
  return engine.applyPlayFast(state, cp, ok || legals[0]);
}
function liveMove(state, seat) {
  var opts = liveOpts();
  var key = 'L|' + _stateKey(state, seat) + '|' + opts.timeMs + '|' + opts.iterations;
  if (_oppMemo[key] !== undefined) return _oppMemo[key];
  var seed2 = _hashKey(key);
  var saved2 = Math.random;
  Math.random = function () {
    seed2 = (Math.imul(seed2, 1664525) + 1013904223) >>> 0;
    return seed2 / 4294967296;
  };
  var mv2;
  try {
    mv2 = live.getAIMove(state, seat, opts);
  } catch (e) {
    mv2 = null;
  } finally {
    Math.random = saved2;
  }
  if (_oppMemoN < 40000) {
    _oppMemo[key] = mv2;
    _oppMemoN++;
  }
  return mv2;
}
function play2p(seed) {
  _oppMemo = Object.create(null);
  _oppMemoN = 0;
  _brMemo = Object.create(null);
  _brMemoN = 0;
  const liveSeat = seed % 2;
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  while (!state.roundOver && steps < 320) {
    const cp = state.currentPlayer;
    let choice;
    if (cp === liveSeat) {
      choice = liveMove(state, cp);
    } else {
      choice = freezeMove(state, cp);
    }
    state = apply(state, cp, choice);
    state.isFirstLead = false;
    steps++;
  }
  let winner;
  if (state.finishOrder && state.finishOrder.length) winner = state.finishOrder[0];
  else if (state.loser === 0) winner = 1;
  else if (state.loser === 1) winner = 0;
  else winner = null;
  return { liveWin: winner === liveSeat, steps: steps, liveSeat: liveSeat };
}

const seeds = (process.env.SEEDS || '20470144,20490090,20510036')
  .split(',')
  .map(Number);
console.log('seed-duel live', live.AI_BUILD, 'patch', process.env.TIENLEN_PATCH || '', 'freeze', process.env.TIENLEN_FREEZE, 'seeds', seeds.length);
console.log('liveOpts', liveOpts());
console.log('freezeOpts', freezeOpts());
let wins = 0;
for (const seed of seeds) {
  const t0 = Date.now();
  const r = play2p(seed);
  const ms = Date.now() - t0;
  if (r.liveWin) wins++;
  console.log(JSON.stringify({ seed: seed, liveWin: r.liveWin, liveSeat: r.liveSeat, steps: r.steps, ms: ms }));
}
console.log(JSON.stringify({ liveWins: wins, n: seeds.length, rate: wins / seeds.length }));
