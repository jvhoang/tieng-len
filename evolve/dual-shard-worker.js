'use strict';
/**
 * Dual shard worker — plays a list of seeds for CHALL vs FREEZE (or freeze identity).
 * Invoked by fresh-seed-fair-dual.js parallel path. SoftN=0 fair hidden GM.
 *
 * Env: CHALL, FREEZE, SEED_FILE, OUT, MS, TRIALS, SOFT, BRANCH, BOTH_SEATS, MODE
 * MODE: chall-vs-freeze | freeze-vs-freeze
 */
const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');

const challTag = process.env.CHALL;
const freezeTag = process.env.FREEZE;
const seedFile = process.env.SEED_FILE;
const outPath = process.env.OUT;
const ms = parseInt(process.env.MS || '0', 10);
const trials = parseInt(process.env.TRIALS || '20', 10);
const soft = parseInt(process.env.SOFT || '0', 10);
const branch = parseInt(process.env.BRANCH || '12', 10);
const bothSeats = process.env.BOTH_SEATS !== '0';
const mode = process.env.MODE || 'chall-vs-freeze';

const live = require('../policies/' + challTag + '-ai.js');
const freeze = require('../policies/' + freezeTag + '-ai.js');
const liveSearch = require('../policies/' + challTag + '-search.js');
const freezeSearch = require('../policies/' + freezeTag + '-search.js');

function injectOpp(searchMod, freezeSearchMod) {
  if (!searchMod.setExploitOpponent) return;
  searchMod.setExploitOpponent(function (s, seat) {
    if (!freezeSearchMod) return null;
    var pol = freezeSearchMod.dualRolloutPolicy || freezeSearchMod.expertPolicy;
    if (typeof pol !== 'function') return null;
    var dec = pol(s, seat);
    return dec && dec.pass ? null : (dec && dec.play != null ? dec.play : null);
  });
}
injectOpp(liveSearch, freezeSearch);
injectOpp(freezeSearch, freezeSearch);

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
    softSamples: soft,
    maxBranch: branch,
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

function playGame(seed, liveSeat, livePol, freezePol) {
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  const t0 = Date.now();
  const opts = seatOpts();
  while (!state.roundOver && steps < 240) {
    const cp = state.currentPlayer;
    const pol = cp === liveSeat ? livePol : freezePol;
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

const payload = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
const seeds = payload.seeds || [];
const livePol = mode === 'freeze-vs-freeze' ? freeze : live;
const freezePol = freeze;

const perGame = [];
let liveWins = 0;
for (let i = 0; i < seeds.length; i++) {
  const seed = seeds[i];
  const seats = bothSeats ? [0, 1] : [seed % 2];
  for (let si = 0; si < seats.length; si++) {
    const r = playGame(seed, seats[si], livePol, freezePol);
    if (r.liveWin) liveWins++;
    perGame.push(r);
    console.log(JSON.stringify({
      shard: true,
      seed: seed,
      liveSeat: r.liveSeat,
      liveWin: r.liveWin,
      steps: r.steps,
      ms: r.ms,
      liveWins: liveWins,
      games: perGame.length,
      wr: liveWins / perGame.length
    }));
  }
}

fs.writeFileSync(outPath, JSON.stringify({
  mode: mode,
  chall: challTag,
  freeze: freezeTag,
  games: perGame.length,
  liveWins: liveWins,
  liveWinRate: perGame.length ? liveWins / perGame.length : 0,
  perGame: perGame
}, null, 2));
process.exit(0);
