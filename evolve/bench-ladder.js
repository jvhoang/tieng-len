/**
 * Live AI vs frozen policy — continuous 2p single-deal bench.
 *
 * Protocol (2026-07-12): freeze opponent at grandmaster difficulty by default.
 *   TIENLEN_FREEZE=v88 TIENLEN_BENCH_GAMES=50 TIENLEN_TARGET=0.70 \
 *   TIENLEN_BENCH_SEED=20260711 TIENLEN_FREEZE_DIFF=grandmaster \
 *   TIENLEN_BENCH_OUT=v89-vs-v88-gm-final.json \
 *   node evolve/bench-ladder.js
 *
 * Set TIENLEN_FREEZE_DIFF=expert for legacy expert-policy opponent.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');

const freezeTag = process.env.TIENLEN_FREEZE || 'v87hf';
const challengerTag = process.env.TIENLEN_CHALLENGER_FREEZE || ''; // if set, load challenger from policies/
const live = challengerTag
  ? require('../policies/' + challengerTag + '-ai.js')
  : require('../ai.js');
// Prefer live's bundled search for exploit injection when available
const search = (function () {
  try {
    if (challengerTag) return require('../policies/' + challengerTag + '-search.js');
  } catch (e) { /* fall through */ }
  return require('../search.js');
})();
const freeze = require('../policies/' + freezeTag + '-ai.js');

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
  var key = seat + '|' + state.currentPlayer + '|' +
    (state.isFirstLead ? 'F' : 'f') + '|' +
    (state.lastPlayBy == null ? 'n' : state.lastPlayBy) + '|';
  if (state.currentCombo && state.currentCombo.cards) {
    var cc = state.currentCombo.cards;
    var ids = [];
    for (var ci = 0; ci < cc.length; ci++) ids.push(cc[ci].rank * 4 + cc[ci].suit);
    ids.sort(function (a, b) { return a - b; });
    key += state.currentCombo.type + ':' + ids.join(',') + '|';
  } else {
    key += 'L|';
  }
  for (var p = 0; p < state.players.length; p++) {
    var h = state.players[p].hand;
    key += h.length + ':';
    for (var i = 0; i < h.length; i++) key += (h[i].rank * 4 + h[i].suit) + ',';
    key += state.players[p].passed ? 'P' : 'N';
    if (state.players[p].finished) key += 'X';
  }
  return key;
}

/** Freeze seat opts — default grandmaster (full search of frozen policy). */
function freezeOpts() {
  const diff = process.env.TIENLEN_FREEZE_DIFF || 'grandmaster';
  if (diff === 'expert' || diff === 'easy') {
    return { difficulty: 'easy', iterations: 0, mode: 'expert' };
  }
  const perfect = process.env.TIENLEN_FREEZE_PERFECT !== '0';
  return {
    difficulty: diff,
    useSearch: true,
    perfectInfo: perfect,
    hiddenInfo: !perfect,
    timeMs: parseInt(process.env.TIENLEN_FREEZE_MS || '250', 10),
    iterations: parseInt(process.env.TIENLEN_FREEZE_ITERS || '200', 10),
    maxSims: parseInt(process.env.TIENLEN_FREEZE_SIMS || '160', 10),
    bestResponse: process.env.TIENLEN_FREEZE_BR !== '0',
    maxBranch: parseInt(process.env.TIENLEN_FREEZE_BRANCH || '16', 10),
    mode: process.env.TIENLEN_FREEZE_MODE || 'auto',
    // Keep soft roots off for freeze seat unless explicitly enabled
    combatRoot: process.env.TIENLEN_FREEZE_COMBAT_ROOT === '1',
    flRoot: process.env.TIENLEN_FREEZE_FL_ROOT === '1',
    dualSelf: process.env.TIENLEN_FREEZE_DUAL_SELF === '1',
    exactExploit: process.env.TIENLEN_FREEZE_EXACT !== '0',
    softSamples: parseInt(process.env.TIENLEN_FREEZE_SOFT_SAMPLES || '0', 10),
    exploit: process.env.TIENLEN_FREEZE_EXPLOIT === '1'
  };
}

/** Cheap expert model of freeze for live BR/exploit (speed). */
function freezeExpertMove(state, seat) {
  var key = 'E|' + _stateKey(state, seat);
  if (_brMemo[key] !== undefined) return _brMemo[key];
  var seed = _hashKey(key);
  var savedRandom = Math.random;
  Math.random = function () {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  var mv;
  try {
    mv = freeze.getAIMove(state, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' });
  } finally {
    Math.random = savedRandom;
  }
  if (_brMemoN < 80000) { _brMemo[key] = mv; _brMemoN++; }
  return mv;
}

/** Actual freeze seat move (grandmaster by default). */
function freezeMove(state, seat) {
  var opts = freezeOpts();
  // Expert path: memoize fully
  if (opts.mode === 'expert' || opts.difficulty === 'easy') {
    var ekey = _stateKey(state, seat);
    if (_oppMemo[ekey] !== undefined) return _oppMemo[ekey];
    var seed = _hashKey(ekey);
    var savedRandom = Math.random;
    Math.random = function () {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    var mv;
    try {
      mv = freeze.getAIMove(state, seat, opts);
    } finally {
      Math.random = savedRandom;
    }
    if (_oppMemoN < 80000) { _oppMemo[ekey] = mv; _oppMemoN++; }
    return mv;
  }
  // Grandmaster/search path: memoize with det RNG so moves are reproducible
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
    mv2 = freeze.getAIMove(state, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' });
  } finally {
    Math.random = saved2;
  }
  if (_oppMemoN < 40000) { _oppMemo[key] = mv2; _oppMemoN++; }
  return mv2;
}

if (search.setExploitOpponent) {
  // Live BR models freeze via cheap expert of frozen code (not nested grandmaster).
  search.setExploitOpponent(function (state, seat) {
    return freezeExpertMove(state, seat);
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
  const sig = choice.map(function (c) {
    return c.rank * 4 + c.suit;
  }).sort(function (a, b) { return a - b; }).join(',');
  const ok = legals.some(function (l) {
    return l.map(function (c) {
      return c.rank * 4 + c.suit;
    }).sort(function (a, b) { return a - b; }).join(',') === sig;
  });
  return engine.applyPlayFast(state, cp, ok ? choice : legals[0]);
}

function liveOpts() {
  const perfect = process.env.TIENLEN_V8_PERFECT !== '0';
  return {
    // Default grandmaster so challenger matches UI strongest tier
    difficulty: process.env.TIENLEN_V8_DIFF || 'grandmaster',
    timeMs: parseInt(process.env.TIENLEN_V8_MS || '250', 10),
    iterations: parseInt(process.env.TIENLEN_V8_ITERS || '200', 10),
    maxSims: parseInt(process.env.TIENLEN_V8_SIMS || '320', 10),
    brTrials: parseInt(process.env.TIENLEN_BR_TRIALS || '48', 10),
    bestResponse: process.env.TIENLEN_BR !== '0',
    useSearch: true,
    perfectInfo: perfect,
    hiddenInfo: !perfect,
    maxBranch: parseInt(process.env.TIENLEN_V8_BRANCH || '20', 10),
    dualSelf: process.env.TIENLEN_DUAL_SELF === '1',
    exactExploit: process.env.TIENLEN_EXACT !== '0',
    mode: process.env.TIENLEN_V8_MODE || 'auto',
    combatRoot: process.env.TIENLEN_COMBAT_ROOT === '1',
    flRoot: process.env.TIENLEN_FL_ROOT === '1',
    softSamples: parseInt(process.env.TIENLEN_SOFT_SAMPLES || '0', 10),
    exploit: process.env.TIENLEN_EXPLOIT !== '0'
  };
}

function getMove(pol, state, seat, which) {
  if (which === 'freeze') return freezeMove(state, seat);
  var useDet = process.env.TIENLEN_DET_RNG === '1';
  var savedRandom = Math.random;
  if (useDet) {
    var key = _stateKey(state, seat) + '|live';
    var seed = _hashKey(key);
    Math.random = function () {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  try {
    return pol.getAIMove(state, seat, liveOpts());
  } catch (e) {
    return null;
  } finally {
    if (useDet) Math.random = savedRandom;
  }
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
    const which = cp === liveSeat ? 'live' : 'freeze';
    const pol = which === 'live' ? live : freeze;
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
  return { liveWin: winner === liveSeat, steps: steps, liveSeat: liveSeat };
}

function main() {
  // Protocol: N≥50 grandmaster-vs-grandmaster by default (user override 2026-07-12)
  const games = parseInt(process.env.TIENLEN_BENCH_GAMES || '50', 10);
  const seed0 = parseInt(process.env.TIENLEN_BENCH_SEED || '20260711', 10);
  const scratch = process.env.TIENLEN_SCRATCH || path.join(__dirname);
  const target = parseFloat(process.env.TIENLEN_TARGET || '0.70');
  const outName = process.env.TIENLEN_BENCH_OUT || ('ladder-vs-' + freezeTag + '-final.json');
  const fOpts = freezeOpts();
  const lOpts = liveOpts();

  console.log('=== live vs freeze ' + freezeTag + ' games=' + games + ' target=' + target + ' ===');
  console.log('live build', live.AI_BUILD);
  console.log('freeze build', freeze.AI_BUILD);
  console.log('live opts', lOpts);
  console.log('freeze opts', fOpts);
  console.log('opponentFreeze policies/' + freezeTag + '-ai.js + search');
  console.log('protocol', {
    freezeDifficulty: fOpts.difficulty,
    liveDifficulty: lOpts.difficulty,
    brModel: 'freeze-expert-cheap'
  });

  let liveWins = 0;
  const t0 = Date.now();
  const checkpoints = [];
  const progressEvery = Math.max(1, parseInt(process.env.TIENLEN_PROGRESS_EVERY || '5', 10));
  const checkpointEvery = Math.max(1, parseInt(process.env.TIENLEN_CHECKPOINT_EVERY || '10', 10));

  for (let g = 0; g < games; g++) {
    const gt0 = Date.now();
    const r = play2p(seed0 + g * 9973);
    const gms = Date.now() - gt0;
    if (gms > 60000) console.error(JSON.stringify({slowGame:g, seed:seed0+g*9973, ms:gms, win:r.liveWin}));
    if (r.liveWin) liveWins++;
    if ((g + 1) % progressEvery === 0 || g === games - 1) {
      try {
        fs.writeFileSync(path.join(scratch, 'ladder-progress.json'), JSON.stringify({
          latest: { games: g+1, liveWins: liveWins, liveWinRate: liveWins/(g+1), ms: Date.now()-t0 },
          freeze: freezeTag,
          freezeDiff: fOpts.difficulty
        }, null, 2));
      } catch (e) {}
    }
    if ((g + 1) % checkpointEvery === 0 || g === games - 1) {
      const n = g + 1;
      const line = {
        games: n,
        liveWins: liveWins,
        liveWinRate: liveWins / n,
        ci95: wilsonCI(liveWins, n),
        ms: Date.now() - t0,
        gps: n / ((Date.now() - t0) / 1000)
      };
      checkpoints.push(line);
      console.log(JSON.stringify(line));
      try {
        fs.writeFileSync(
          path.join(scratch, 'ladder-progress.json'),
          JSON.stringify({ latest: line, freeze: freezeTag, freezeDiff: fOpts.difficulty }, null, 2)
        );
      } catch (e) { /* ignore */ }
    }
  }

  const final = {
    mode: '2p-h2h-single-deal-continuous',
    protocol: 'grandmaster-vs-grandmaster',
    games: games,
    liveWins: liveWins,
    freezeWins: games - liveWins,
    liveWinRate: liveWins / games,
    // aliases for gate readers expecting v80*
    v80Wins: liveWins,
    v80WinRate: liveWins / games,
    ci95: wilsonCI(liveWins, games),
    target: target,
    passed: (liveWins / games) > target,
    ms: Date.now() - t0,
    live: live.AI_BUILD,
    freeze: freeze.AI_BUILD,
    v80: live.AI_BUILD,
    v80Opts: lOpts,
    freezeOpts: fOpts,
    opponentFreeze: 'policies/' + freezeTag + '-ai.js + policies/' + freezeTag + '-search.js',
    freezeTag: freezeTag,
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
    console.error('GATE FAILED: liveWinRate=' + final.liveWinRate + ' target>' + target);
    process.exit(2);
  }
  console.log('GATE PASSED');
}

main();
