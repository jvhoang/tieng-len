'use strict';
/**
 * Fair dual N games: both seats GM, hidden, BR-on, equal lean budgets.
 * Identity-friendly (challenger freeze tag). Writes JSON + progress.
 *
 *   FREEZE=v91 CHALL=v91 GAMES=20 node evolve/lean-fair-dual-n20.js
 *   FREEZE=v91 CHALL=v92 GAMES=20 node evolve/lean-fair-dual-n20.js
 */
const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');
const freezeTag = process.env.FREEZE || 'v91';
const challTag = process.env.CHALL || freezeTag;
const live = require('../policies/' + challTag + '-ai.js');
const freeze = require('../policies/' + freezeTag + '-ai.js');
const liveSearch = require('../policies/' + challTag + '-search.js');
const freezeSearch = require('../policies/' + freezeTag + '-search.js');

const games = parseInt(process.env.GAMES || '20', 10);
const seed0 = parseInt(process.env.SEED || '20260711', 10);
const ms = parseInt(process.env.MS || '120', 10);
const trials = parseInt(process.env.TRIALS || '12', 10);
const outName = process.env.OUT || ('lean-fair-' + challTag + '-vs-' + freezeTag + '-n' + games + '.json');
const outPath = path.join(__dirname, outName);

function injectOpp(searchMod, freezeSearchMod) {
  if (!searchMod.setExploitOpponent) return;
  // Use freeze expertPolicy leaf — NOT getAIMove (recursive BR bomb under hidden).
  searchMod.setExploitOpponent(function (s, seat) {
    if (freezeSearchMod && typeof freezeSearchMod.expertPolicy === 'function') {
      var dec = freezeSearchMod.expertPolicy(s, seat);
      return dec && dec.pass ? null : (dec && dec.play != null ? dec.play : null);
    }
    return null;
  });
}
injectOpp(liveSearch, freezeSearch);
injectOpp(freezeSearch, freezeSearch);

function apply(state, cp, choice) {
  const legals = engine.getLegalPlays(
    state.players[cp].hand, state.currentCombo, state.players[cp].passed,
    state.isFirstLead, state.firstLeadCard
  );
  if (!legals.length) return engine.passFast(state, cp);
  if (choice == null || choice.pass) {
    if (!state.currentCombo) return engine.applyPlayFast(state, cp, legals[0]);
    return engine.passFast(state, cp);
  }
  const play = choice.play || choice;
  if (!Array.isArray(play)) return engine.passFast(state, cp);
  const sig = play.map(function (c) { return c.rank * 4 + c.suit; })
    .sort(function (a, b) { return a - b; }).join(',');
  const ok = legals.find(function (l) {
    return l.map(function (c) { return c.rank * 4 + c.suit; })
      .sort(function (a, b) { return a - b; }).join(',') === sig;
  });
  return engine.applyPlayFast(state, cp, ok || legals[0]);
}

// Fair opts: identical for both seats (BR on, hidden, equal budget)
function seatOpts() {
  return {
    difficulty: 'grandmaster',
    useSearch: true,
    perfectInfo: false,
    hiddenInfo: true,
    timeMs: ms,
    iterations: 60,
    maxSims: 120,
    brTrials: trials,
    bestResponse: true,
    exactExploit: process.env.EXACT === '1',
    exploit: true,
    softSamples: parseInt(process.env.SOFT || '6', 10),
    maxBranch: parseInt(process.env.BRANCH || '12', 10),
    mode: 'auto',
    strongSelf: process.env.STRONG === '1'
  };
}


function hashKey(str) {
  var h = 2166136261 >>> 0;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}
function withDetRng(key, fn) {
  var seed = hashKey(key);
  var saved = Math.random;
  Math.random = function () {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  try { return fn(); } finally { Math.random = saved; }
}

function playGame(seed, forcedLiveSeat) {
  const liveSeat = forcedLiveSeat != null ? forcedLiveSeat : (seed % 2);
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  const t0 = Date.now();
  const opts = seatOpts();
  while (!state.roundOver && steps < 240) {
    const cp = state.currentPlayer;
    const pol = cp === liveSeat ? live : freeze;
    // Det key: seed|steps|cp only — do NOT include live/freeze label (was seat-biased)
    const mv = withDetRng(String(seed) + '|' + steps + '|' + cp, function () {
      return pol.getAIMove(state, cp, opts);
    });
    state = apply(state, cp, mv);
    state.isFirstLead = false;
    steps++;
  }
  let winner = null;
  if (state.finishOrder && state.finishOrder.length) winner = state.finishOrder[0];
  else if (state.loser === 0) winner = 1;
  else if (state.loser === 1) winner = 0;
  return {
    seed: seed,
    liveWin: winner === liveSeat,
    liveSeat: liveSeat,
    steps: steps,
    ms: Date.now() - t0
  };
}

console.log(JSON.stringify({
  start: true,
  freeze: freezeTag,
  chall: challTag,
  live: live.AI_BUILD,
  freezeBuild: freeze.AI_BUILD,
  games: games,
  seed0: seed0,
  protocol: 'fair-hidden-gm-BR-both-equal',
  opts: seatOpts()
}));

let liveWins = 0;
const perGame = [];
const tAll = Date.now();
const bothSeats = process.env.BOTH_SEATS === '1';
// When BOTH_SEATS=1: each seed played with live on seat 0 and seat 1 (2N games, balanced)
// START_G: skip first g indices (internal DEV design/check split). seed_i = seed0 + g*9973.
const startG = parseInt(process.env.START_G || '0', 10) || 0;
const outerN = bothSeats ? games : games;
let gameIdx = 0;
for (let g = startG; g < startG + outerN; g++) {
  const seed = seed0 + g * 9973;
  const seats = bothSeats ? [0, 1] : [seed % 2];
  for (let si = 0; si < seats.length; si++) {
    const forcedSeat = seats[si];
    const r = playGame(seed, forcedSeat);
    if (r.liveWin) liveWins++;
    gameIdx++;
    perGame.push(r);
    const row = {
      g: gameIdx - 1, seed: seed, liveWin: r.liveWin, liveSeat: r.liveSeat,
      steps: r.steps, ms: r.ms,
      liveWins: liveWins, games: gameIdx, wr: liveWins / gameIdx
    };
    console.log(JSON.stringify(row));
    fs.writeFileSync(path.join(__dirname, 'lean-fair-progress.json'), JSON.stringify({
      latest: row, freeze: freezeTag, chall: challTag, bothSeats: bothSeats
    }, null, 2));
  }
}
const gamesPlayed = gameIdx;

const final = {
  protocol: 'fair-hidden-gm-BR-both-equal',
  infoModel: 'hidden',
  perfectInfo: false,
  hiddenInfo: true,
  brBoth: true,
  equalBudget: true,
  games: gamesPlayed,
  liveWins: liveWins,
  freezeWins: gamesPlayed - liveWins,
  liveWinRate: liveWins / gamesPlayed,
  seed0: seed0,
  ms: Date.now() - tAll,
  live: live.AI_BUILD,
  freeze: freeze.AI_BUILD,
  freezeTag: freezeTag,
  challTag: challTag,
  opts: seatOpts(),
  perGame: perGame,
  lossSeeds: perGame.filter(function (x) { return !x.liveWin; }).map(function (x) { return x.seed; }),
  target: 0.70,
  passed: (liveWins / gamesPlayed) > 0.70
};
console.log('=== FINAL ===');
console.log(JSON.stringify(final, null, 2));
fs.writeFileSync(outPath, JSON.stringify(final, null, 2));
console.log('wrote', outPath);
process.exit(final.passed ? 0 : 2);
