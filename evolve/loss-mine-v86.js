/**
 * Mine losses on default seed band for v8.x vs frozen v7.5.
 * Usage: GAMES=100 node evolve/loss-mine-v86.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');
const search = require('../search.js');
const v80 = require('../ai.js');
const v75 = require('../policies/v75-ai.js');

var _oppMemo = Object.create(null);
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
    var ids = state.currentCombo.cards.map(function (c) {
      return c.rank * 4 + c.suit;
    }).sort(function (a, b) { return a - b; });
    key += state.currentCombo.type + ':' + ids.join(',') + '|';
  } else {
    key += 'L|';
  }
  for (var p = 0; p < state.players.length; p++) {
    var h = state.players[p].hand;
    key += h.length + ':';
    for (var i = 0; i < h.length; i++) key += (h[i].rank * 4 + h[i].suit) + ',';
    key += state.players[p].passed ? 'P' : 'N';
  }
  return key;
}
function v75Move(state, seat) {
  var key = _stateKey(state, seat);
  if (_oppMemo[key] !== undefined) return _oppMemo[key];
  var seed = _hashKey(key);
  var saved = Math.random;
  Math.random = function () {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  var mv;
  try {
    mv = v75.getAIMove(state, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' });
  } finally {
    Math.random = saved;
  }
  _oppMemo[key] = mv;
  return mv;
}
if (search.setExploitOpponent) {
  search.setExploitOpponent(function (s, seat) {
    return v75Move(s, seat);
  });
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
  const sig = choice.map(function (c) {
    return c.rank * 4 + c.suit;
  }).sort(function (a, b) { return a - b; }).join(',');
  const ok = legals.find(function (l) {
    return l.map(function (c) {
      return c.rank * 4 + c.suit;
    }).sort(function (a, b) { return a - b; }).join(',') === sig;
  });
  if (!ok) return engine.passFast(state, cp);
  return engine.applyPlayFast(state, cp, ok);
}
function play(seed) {
  _oppMemo = Object.create(null);
  const v80Seat = seed % 2;
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  const firstHands = [
    state.players[0].hand.map(function (c) { return c.rank; }).sort(function (a, b) { return a - b; }),
    state.players[1].hand.map(function (c) { return c.rank; }).sort(function (a, b) { return a - b; })
  ];
  while (!state.roundOver && steps < 320) {
    const cp = state.currentPlayer;
    let choice;
    if (cp === v80Seat) {
      choice = v80.getAIMove(state, cp, {
        difficulty: 'hard', timeMs: 140, iterations: 160, maxSims: 320,
        brTrials: 80, bestResponse: true, useSearch: true,
        perfectInfo: true, hiddenInfo: false, maxBranch: 20,
        dualSelf: true, exactExploit: true, mode: 'auto'
      });
    } else {
      choice = v75Move(state, cp);
    }
    state = apply(state, cp, choice);
    state.isFirstLead = false;
    steps++;
  }
  let winner = null;
  if (state.finishOrder && state.finishOrder.length) winner = state.finishOrder[0];
  else if (state.loser === 0) winner = 1;
  else if (state.loser === 1) winner = 0;
  return {
    seed: seed, v80Win: winner === v80Seat, v80Seat: v80Seat, steps: steps,
    firstHands: firstHands, winner: winner
  };
}

const seed0 = parseInt(process.env.TIENLEN_BENCH_SEED || '20260711', 10);
const games = parseInt(process.env.GAMES || '100', 10);
const startG = parseInt(process.env.START_G || '0', 10);
const losses = [];
let wins = 0;
const t0 = Date.now();
for (let g = startG; g < startG + games; g++) {
  const r = play(seed0 + g * 9973);
  r.g = g;
  if (r.v80Win) wins++;
  else losses.push(r);
  if ((g - startG + 1) % 20 === 0) {
    console.log(JSON.stringify({
      g: g + 1, wins: wins, rate: wins / (g - startG + 1),
      losses: losses.length, ms: Date.now() - t0
    }));
  }
}
const out = {
  seed0: seed0, startG: startG, games: games, wins: wins,
  rate: wins / games, losses: losses
};
console.log('=== LOSS MINE ===');
console.log(JSON.stringify({
  games: games, wins: wins, rate: wins / games,
  lossCount: losses.length, lossSeeds: losses.map(function (l) { return l.seed; })
}, null, 2));
fs.writeFileSync(path.join(__dirname, 'v86-loss-mine.json'), JSON.stringify(out, null, 2));
