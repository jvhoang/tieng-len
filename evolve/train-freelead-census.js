'use strict';
/**
 * TRAIN free-lead outcome census: play CHALL vs FREEZE on random seeds,
 * record free-lead class of CHALL first move when available + game outcome.
 * Aggregate-only; no residual packaging.
 *
 *   CHALL=p_l2s15 FREEZE=v60 GAMES=80 WORKERS=9 node evolve/train-freelead-census.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const engine = require('../engine.js');

const ROOT = path.join(__dirname, '..');
const CHALL = process.env.CHALL || 'p_l2s15';
const FREEZE = process.env.FREEZE || 'v60';
const GAMES = parseInt(process.env.GAMES || '80', 10);
const TRIALS = parseInt(process.env.TRIALS || '16', 10);
const W_MAX = Math.max(1, Math.floor((os.cpus().length || 2) / 2));

const live = require('../policies/' + CHALL + '-ai.js');
const freeze = require('../policies/' + FREEZE + '-ai.js');
const liveSearch = require('../policies/' + CHALL + '-search.js');
const freezeSearch = require('../policies/' + FREEZE + '-search.js');

if (liveSearch.setExploitOpponent) {
  liveSearch.setExploitOpponent(function (s, seat) {
    var dec = freezeSearch.expertPolicy(s, seat);
    return dec && dec.pass ? null : (dec && dec.play != null ? dec.play : null);
  });
}

function seatOpts() {
  return {
    difficulty: 'grandmaster', useSearch: true, perfectInfo: false, hiddenInfo: true,
    timeMs: 0, iterations: 60, maxSims: 120, brTrials: TRIALS, bestResponse: true,
    exploit: true, softSamples: 0, maxBranch: 12, mode: 'auto'
  };
}

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

function classPlay(play) {
  if (!play || !play.length) return 'PASS';
  const c = engine.detectCombo(play);
  if (!c) return 'other';
  return c.type + '_L' + play.length + (c.top ? '_t' + c.top.rank : '');
}

function playOne(seed, liveSeat) {
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  let firstFL = null;
  const opts = seatOpts();
  while (!state.roundOver && steps < 240) {
    const cp = state.currentPlayer;
    const pol = cp === liveSeat ? live : freeze;
    const isFree = !state.currentCombo;
    const mv = withDetRng(String(seed) + '|' + steps + '|' + cp, function () {
      return pol.getAIMove(state, cp, opts);
    });
    if (isFree && cp === liveSeat && firstFL == null) {
      firstFL = classPlay(mv && mv.play ? mv.play : mv);
    }
    state = apply(state, cp, mv);
    state.isFirstLead = false;
    steps++;
  }
  let winner = null;
  if (state.finishOrder && state.finishOrder.length) winner = state.finishOrder[0];
  else if (state.loser === 0) winner = 1;
  else if (state.loser === 1) winner = 0;
  return { win: winner === liveSeat, firstFL: firstFL };
}

function main() {
  const crypto = require('crypto');
  const seeds = [];
  while (seeds.length < GAMES) {
    const s = 2000000000 + (crypto.randomBytes(4).readUInt32BE(0) % 900000000);
    if (s === 20260801 || s === 20260802) continue;
    seeds.push(s);
  }
  const by = {};
  let wins = 0, n = 0;
  for (let i = 0; i < seeds.length; i++) {
    for (const seat of [0, 1]) {
      const r = playOne(seeds[i], seat);
      n++;
      if (r.win) wins++;
      const k = r.firstFL || 'unknown';
      if (!by[k]) by[k] = { wins: 0, n: 0 };
      by[k].n++;
      if (r.win) by[k].wins++;
    }
    if ((i + 1) % 10 === 0) {
      console.log(JSON.stringify({ i: i + 1, wr: wins / n }));
    }
  }
  const rows = Object.keys(by).map(function (k) {
    return { cls: k, n: by[k].n, wr: by[k].n ? by[k].wins / by[k].n : 0, wins: by[k].wins };
  }).sort(function (a, b) { return b.n - a.n; });
  const out = {
    protocol: 'train-freelead-census-v1',
    chall: CHALL, freeze: FREEZE, games: n, wr: wins / n,
    byClass: rows.slice(0, 40)
  };
  const outPath = path.join(ROOT, 'evolve', 'eval-registry', 'train-freelead-census.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ wr: out.wr, top: rows.slice(0, 12), out: outPath }, null, 2));
}

main();
