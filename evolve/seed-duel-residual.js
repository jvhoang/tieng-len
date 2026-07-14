'use strict';
/**
 * Seed-duel residual flip check: play one dual game per seed under dual protocol.
 * Compares freeze v94 vs live. Reports which residual losses flip.
 *
 *   node evolve/seed-duel-residual.js
 *   SEEDS=20310576,20549928 node evolve/seed-duel-residual.js
 */
const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');
const live = require('../ai.js');
const search = require('../search.js');
const freezeTag = process.env.TIENLEN_FREEZE || 'v94';
const freeze = require('../policies/' + freezeTag + '-ai.js');

const seeds = (process.env.SEEDS ||
  '20310576,20380387,20470144,20539955,20549928,20609766,20659631,20669604,20689550,20709496'
).split(',').map(Number);

var _brMemo = Object.create(null);
var _brMemoN = 0;
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
  var key = seat + '|' + state.currentPlayer + '|' + (state.isFirstLead ? 'F' : 'f') + '|';
  if (state.currentCombo && state.currentCombo.cards) {
    var ids = state.currentCombo.cards.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; });
    key += state.currentCombo.type + ':' + ids.join(',') + '|';
  } else key += 'L|';
  for (var p = 0; p < state.players.length; p++) {
    var h = state.players[p].hand;
    key += h.length + ':';
    for (var i = 0; i < h.length; i++) key += (h[i].rank * 4 + h[i].suit) + ',';
    key += state.players[p].passed ? 'P' : 'N';
  }
  return key;
}
function freezeExpertMove(state, seat) {
  var useExpert = process.env.TIENLEN_BR_MODEL === 'expert';
  var opts = useExpert ? null : {
    difficulty: 'grandmaster', useSearch: true, perfectInfo: false, hiddenInfo: true,
    timeMs: 40, iterations: 20, maxSims: 40, bestResponse: false, maxBranch: 12,
    exactExploit: false, exploit: false, mode: 'auto'
  };
  var key = useExpert ? ('E|' + _stateKey(state, seat)) : ('BRGM|' + _stateKey(state, seat));
  if (_brMemo[key] !== undefined) return _brMemo[key];
  var seed = _hashKey(key);
  var saved = Math.random;
  Math.random = function () { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  var mv;
  try {
    mv = useExpert
      ? freeze.getAIMove(state, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' })
      : freeze.getAIMove(state, seat, opts);
  } catch (e) {
    mv = freeze.getAIMove(state, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' });
  } finally { Math.random = saved; }
  if (_brMemoN < 80000) { _brMemo[key] = mv; _brMemoN++; }
  return mv;
}
if (search.setExploitOpponent) {
  search.setExploitOpponent(function (s, seat) { return freezeExpertMove(s, seat); });
}
function liveOpts() {
  // Hidden-info dual only (user 2026-07-14)
  return {
    difficulty: 'grandmaster', timeMs: 280, iterations: 200, maxSims: 480, brTrials: 96,
    bestResponse: true, useSearch: true, perfectInfo: false, hiddenInfo: true, maxBranch: 24,
    exactExploit: false, exploit: true, softSamples: 10, mode: 'auto'
  };
}
function freezeOpts() {
  return {
    difficulty: 'grandmaster', useSearch: true, perfectInfo: false, hiddenInfo: true,
    timeMs: 120, iterations: 80, maxSims: 160, bestResponse: false, maxBranch: 16,
    exactExploit: false, exploit: false, mode: 'auto'
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
  const ok = legals.find(function (l) {
    return l.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; }).join(',') === sig;
  });
  return engine.applyPlayFast(state, cp, ok || legals[0]);
}
function playSeed(seed) {
  _brMemo = Object.create(null); _brMemoN = 0;
  _oppMemo = Object.create(null); _oppMemoN = 0;
  const liveSeat = seed % 2;
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  const t0 = Date.now();
  while (!state.roundOver && steps < 320) {
    const cp = state.currentPlayer;
    let choice;
    if (cp === liveSeat) {
      const mv = live.getAIMove(state, cp, liveOpts());
      choice = mv && (mv.play !== undefined ? mv.play : mv);
    } else {
      const opts = freezeOpts();
      const key = 'G|' + _stateKey(state, cp);
      var seed2 = _hashKey(key);
      var saved2 = Math.random;
      Math.random = function () { seed2 = (Math.imul(seed2, 1664525) + 1013904223) >>> 0; return seed2 / 4294967296; };
      try {
        choice = freeze.getAIMove(state, cp, opts);
        if (choice && choice.play !== undefined) choice = choice.play;
      } finally { Math.random = saved2; }
    }
    if (choice === 'PASS' || choice === 'pass') choice = null;
    state = apply(state, cp, choice);
    state.isFirstLead = false;
    steps++;
  }
  let winner = null;
  if (state.finishOrder && state.finishOrder.length) winner = state.finishOrder[0];
  else if (state.loser === 0) winner = 1;
  else if (state.loser === 1) winner = 0;
  return { seed: seed, liveSeat: liveSeat, liveWin: winner === liveSeat, steps: steps, ms: Date.now() - t0 };
}

console.log('live', live.AI_BUILD);
console.log('freeze', freezeTag, freeze.AI_BUILD);
const results = [];
let wins = 0;
for (var i = 0; i < seeds.length; i++) {
  const r = playSeed(seeds[i]);
  results.push(r);
  if (r.liveWin) wins++;
  console.log(JSON.stringify(r));
}
const out = {
  live: live.AI_BUILD,
  freezeTag: freezeTag,
  wins: wins,
  n: seeds.length,
  wr: wins / seeds.length,
  flips: results.filter(function (r) { return r.liveWin; }).map(function (r) { return r.seed; }),
  stillLoss: results.filter(function (r) { return !r.liveWin; }).map(function (r) { return r.seed; }),
  results: results
};
console.log(JSON.stringify({ wins: out.wins, n: out.n, wr: out.wr, flips: out.flips, stillLoss: out.stillLoss }, null, 2));
const outPath = process.env.OUT || path.join(__dirname, 'seed-duel-residual-out.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('wrote', outPath);
process.exit(wins >= 2 ? 0 : 1); // hope flip at least 2 of residual 10
