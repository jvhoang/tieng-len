'use strict';
/**
 * TRAIN free-lead abstract regret matching (general actions only).
 * Actions: trash | lowpair | midmulti | himulti | control | other
 * Play CHALL vs FREEZE; if free-lead, force abstract action when legal;
 * update regrets by outcome. Emits dual free-lead prior JSON.
 *
 *   BASE=p_l2s15 GAMES=100 ROUNDS=5 node evolve/train-fl-regret.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const engine = require('../engine.js');

const ROOT = path.join(__dirname, '..');
const BASE = process.env.BASE || 'p_l2s15';
const GAMES = parseInt(process.env.GAMES || '80', 10);
const ROUNDS = parseInt(process.env.ROUNDS || '4', 10);
const TRIALS = parseInt(process.env.TRIALS || '12', 10);

const freeze = require('../policies/v60-ai.js');
const freezeSearch = require('../policies/v60-search.js');
const live = require('../policies/' + BASE + '-ai.js');
const liveSearch = require('../policies/' + BASE + '-search.js');
if (liveSearch.setExploitOpponent) {
  liveSearch.setExploitOpponent(function (s, seat) {
    var d = freezeSearch.expertPolicy(s, seat);
    return d && d.pass ? null : (d && d.play != null ? d.play : null);
  });
}

const ACTS = ['trash', 'lowpair', 'midmulti', 'himulti', 'control', 'default'];
const regret = {};
const count = {};
ACTS.forEach(function (a) { regret[a] = 0; count[a] = 0; });

function hashKey(str) {
  var h = 2166136261 >>> 0;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
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

function analyze(hand) {
  const by = {};
  let twos = 0;
  hand.forEach(function (c) {
    by[c.rank] = (by[c.rank] || 0) + 1;
    if (c.rank === 12) twos++;
  });
  return { by: by, twos: twos };
}

function classifyPlay(play) {
  if (!play || !play.length) return 'default';
  const c = engine.detectCombo(play);
  if (!c) return 'default';
  const top = c.top ? c.top.rank : 0;
  if (c.type === 'single' && top <= 5) return 'trash';
  if (c.type === 'pair' && top <= 6) return 'lowpair';
  if ((c.type === 'pair' || c.type === 'triple' || c.type === 'seq') && play.length <= 3 && top <= 8) return 'midmulti';
  if (play.length >= 2 && top >= 9) return 'himulti';
  if (c.type === 'single' && top >= 10) return 'control';
  return 'default';
}

function pickByClass(legals, hand, cls) {
  const info = analyze(hand);
  const scored = [];
  for (let i = 0; i < legals.length; i++) {
    const p = legals[i];
    if (classifyPlay(p) === cls) scored.push(p);
  }
  if (!scored.length) return null;
  scored.sort(function (a, b) {
    return a.length - b.length || (a[0] && b[0] ? a[0].rank - b[0].rank : 0);
  });
  return scored[0];
}

function strategy() {
  // regret matching
  let sum = 0;
  const pos = {};
  ACTS.forEach(function (a) {
    pos[a] = Math.max(0, regret[a]);
    sum += pos[a];
  });
  if (sum <= 0) {
    const u = 1 / ACTS.length;
    const out = {};
    ACTS.forEach(function (a) { out[a] = u; });
    return out;
  }
  const out = {};
  ACTS.forEach(function (a) { out[a] = pos[a] / sum; });
  return out;
}

function sampleAct(strat, rng) {
  let r = rng();
  for (let i = 0; i < ACTS.length; i++) {
    r -= strat[ACTS[i]];
    if (r <= 0) return ACTS[i];
  }
  return 'default';
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
  const sig = play.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; }).join(',');
  const ok = legals.find(function (l) {
    return l.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; }).join(',') === sig;
  });
  return engine.applyPlayFast(state, cp, ok || legals[0]);
}

function playGame(seed, liveSeat, forceAct) {
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  let forced = false;
  const opts = {
    difficulty: 'grandmaster', useSearch: true, perfectInfo: false, hiddenInfo: true,
    timeMs: 0, brTrials: TRIALS, bestResponse: true, exploit: true, softSamples: 0,
    maxBranch: 12, mode: 'auto'
  };
  while (!state.roundOver && steps < 200) {
    const cp = state.currentPlayer;
    let mv;
    if (cp === liveSeat && !state.currentCombo && !forced && forceAct) {
      const hand = state.players[cp].hand;
      const leg = engine.getLegalPlays(hand, null, false, state.isFirstLead, state.firstLeadCard);
      const pick = pickByClass(leg, hand, forceAct);
      if (pick) {
        mv = pick;
        forced = true;
      }
    }
    if (!mv) {
      const pol = cp === liveSeat ? live : freeze;
      mv = withDetRng(seed + '|' + steps + '|' + cp, function () {
        return pol.getAIMove(state, cp, opts);
      });
    }
    state = apply(state, cp, mv);
    state.isFirstLead = false;
    steps++;
  }
  let winner = null;
  if (state.finishOrder && state.finishOrder.length) winner = state.finishOrder[0];
  else if (state.loser === 0) winner = 1;
  else if (state.loser === 1) winner = 0;
  return winner === liveSeat ? 1 : 0;
}

function main() {
  const util = {};
  ACTS.forEach(function (a) { util[a] = []; });
  for (let r = 0; r < ROUNDS; r++) {
    const strat = strategy();
    for (let g = 0; g < GAMES; g++) {
      const seed = 2100000000 + (crypto.randomBytes(4).readUInt32BE(0) % 800000000);
      const seat = g % 2;
      // counterfactual: play each action, update regrets vs strat average
      const pays = {};
      let avg = 0;
      ACTS.forEach(function (a) {
        pays[a] = playGame(seed, seat, a);
        avg += strat[a] * pays[a];
      });
      ACTS.forEach(function (a) {
        regret[a] += pays[a] - avg;
        count[a]++;
        util[a].push(pays[a]);
      });
    }
    const mean = {};
    ACTS.forEach(function (a) {
      const arr = util[a];
      mean[a] = arr.length ? arr.reduce(function (s, x) { return s + x; }, 0) / arr.length : 0;
    });
    console.log(JSON.stringify({ round: r, strat: strat, meanUtil: mean, regret: regret }));
  }
  const strat = strategy();
  const out = {
    protocol: 'train-fl-regret-v1',
    base: BASE,
    strat: strat,
    regret: regret,
    dualHints: {
      // prefer actions with highest average strat
      ranked: ACTS.slice().sort(function (a, b) { return strat[b] - strat[a]; })
    }
  };
  const outPath = path.join(ROOT, 'evolve', 'eval-registry', 'train-fl-regret.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ done: true, strat: strat, out: outPath }));
}

main();
