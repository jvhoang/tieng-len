'use strict';
/**
 * Fair dual move-level first-diff: same seed/seat, freeze vs challenger decisions.
 * Deterministic det RNG (mirrors lean-fair-dual). SOFT default 0.
 *
 *   FREEZE=v91 CHALL=p_w10_brflo_g2 SEEDS=20280657,20330522 node evolve/fair-firstdiff.js
 *   FREEZE=v91 CHALL=p_xxx DESIGN_HALF=1 node evolve/fair-firstdiff.js
 *
 * Output: evolve/firstdiff-<chall>-vs-<freeze>.json + stdout summary
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

const ms = parseInt(process.env.MS || '150', 10);
const trials = parseInt(process.env.TRIALS || '12', 10);
const soft = parseInt(process.env.SOFT || '0', 10);
const branch = parseInt(process.env.BRANCH || '12', 10);
const seed0 = parseInt(process.env.SEED || '20260711', 10);
const maxSteps = parseInt(process.env.MAX_STEPS || '240', 10);
const outName = process.env.OUT || ('firstdiff-' + challTag + '-vs-' + freezeTag + '.json');

function injectOpp(searchMod, freezeSearchMod) {
  if (!searchMod.setExploitOpponent) return;
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
    exactExploit: false,
    exploit: true,
    softSamples: soft,
    maxBranch: branch,
    mode: 'auto',
    strongSelf: false
  };
}

function playSig(play) {
  if (play == null || play.pass) return 'PASS';
  const cards = play.play || play;
  if (!Array.isArray(cards)) return 'PASS';
  return cards.map(function (c) { return c.rank * 4 + c.suit; })
    .sort(function (a, b) { return a - b; }).join(',');
}

function cardLabel(c) {
  const r = '3456789TJQKA2'[c.rank] || ('?' + c.rank);
  const s = 'SHDC'[c.suit] || '?';
  return r + s;
}

function playLabel(play) {
  if (play == null || play.pass) return 'PASS';
  const cards = play.play || play;
  if (!Array.isArray(cards)) return 'PASS';
  return cards.map(cardLabel).join(' ');
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
  const sig = playSig(play);
  const ok = legals.find(function (l) { return playSig(l) === sig; });
  return engine.applyPlayFast(state, cp, ok || legals[0]);
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

function comboType(state) {
  if (!state.currentCombo) return 'FREE';
  return state.currentCombo.type || 'combat';
}

function classifyDiverge(state, fzMv, chMv) {
  const cur = state.currentCombo;
  const fPass = !fzMv || fzMv.pass || !fzMv.play;
  const cPass = !chMv || chMv.pass || !chMv.play;
  if (fPass && !cPass) return 'freeze_pass_chall_play';
  if (!fPass && cPass) return 'freeze_play_chall_pass';
  if (!cur) {
    const fl = (fzMv && fzMv.play) || [];
    const cl = (chMv && chMv.play) || [];
    if (fl.length === 1 && cl.length === 2) return 'FL_single_to_pair';
    if (fl.length === 2 && cl.length === 1) return 'FL_pair_to_single';
    if (fl.length !== cl.length) return 'FL_len_change';
    if (fl.length >= 2 && cl.length >= 2) {
      const fTop = Math.max.apply(null, fl.map(function (c) { return c.rank; }));
      const cTop = Math.max.apply(null, cl.map(function (c) { return c.rank; }));
      if (cTop < fTop) return 'FL_lower_multi';
      if (cTop > fTop) return 'FL_higher_multi';
    }
    return 'FL_other';
  }
  const fl = (fzMv && fzMv.play) || [];
  const cl = (chMv && chMv.play) || [];
  if (fl.length && cl.length && fl.length === cl.length) {
    const fTop = Math.max.apply(null, fl.map(function (c) { return c.rank; }));
    const cTop = Math.max.apply(null, cl.map(function (c) { return c.rank; }));
    if (cTop < fTop) return 'combat_lower_top';
    if (cTop > fTop) return 'combat_higher_top';
  }
  return 'combat_other';
}

function playGameFirstDiff(seed, liveSeat) {
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  const opts = seatOpts();
  let first = null;
  const path = [];

  while (!state.roundOver && steps < maxSteps) {
    const cp = state.currentPlayer;
    const key = String(seed) + '|' + steps + '|' + cp;

    if (cp === liveSeat) {
      // Parallel decisions under identical det RNG seed
      const fzMv = withDetRng(key, function () { return freeze.getAIMove(state, cp, opts); });
      const chMv = withDetRng(key, function () { return live.getAIMove(state, cp, opts); });
      const fzSig = playSig(fzMv);
      const chSig = playSig(chMv);
      const hand = state.players[cp].hand;
      const row = {
        step: steps,
        seat: cp,
        phase: comboType(state),
        handLen: hand.length,
        omin: state.players[1 - cp].hand.length,
        curTop: state.currentCombo && state.currentCombo.top
          ? state.currentCombo.top.rank : null,
        freeze: playLabel(fzMv),
        chall: playLabel(chMv),
        freezeSig: fzSig,
        challSig: chSig,
        same: fzSig === chSig
      };
      if (fzSig !== chSig && !first) {
        row.class = classifyDiverge(state, fzMv, chMv);
        first = row;
      }
      path.push(row);
      // Advance with freeze path for shared history until first-diff audit only?
      // For win outcome we need chall path. For first-diff locus use freeze path
      // until diverge, then chall — standard is: follow freeze until diverge, then stop.
      state = apply(state, cp, fzMv);
    } else {
      const mv = withDetRng(key, function () { return freeze.getAIMove(state, cp, opts); });
      state = apply(state, cp, mv);
    }
    state.isFirstLead = false;
    steps++;
    if (first) break; // first live-seat diverge found (following freeze path)
  }

  // Outcome if no diverge: play full freeze identity
  let winner = null;
  if (state.finishOrder && state.finishOrder.length) winner = state.finishOrder[0];
  else if (state.loser === 0) winner = 1;
  else if (state.loser === 1) winner = 0;

  return {
    seed: seed,
    liveSeat: liveSeat,
    firstDiff: first,
    pathLen: path.length,
    diverged: !!first,
    stepsUntilDiffOrEnd: steps,
    freezeWinIfNoDiff: first ? null : (winner === liveSeat)
  };
}

function parseSeeds() {
  if (process.env.SEEDS) {
    return process.env.SEEDS.split(',').map(function (s) { return parseInt(s.trim(), 10); })
      .filter(function (n) { return !isNaN(n); });
  }
  if (process.env.DESIGN_HALF === '1') {
    const out = [];
    for (let g = 0; g < 12; g++) out.push(seed0 + g * 9973);
    return out;
  }
  if (process.env.CHECK_HALF === '1') {
    const out = [];
    for (let g = 12; g < 25; g++) out.push(seed0 + g * 9973);
    return out;
  }
  // default: full DEV seeds g0-24
  const out = [];
  for (let g = 0; g < 25; g++) out.push(seed0 + g * 9973);
  return out;
}

const seeds = parseSeeds();
const bothSeats = process.env.BOTH_SEATS !== '0';
const results = [];
const classCount = {};
let nDiv = 0;

console.log(JSON.stringify({
  start: true,
  freeze: freezeTag,
  chall: challTag,
  live: live.AI_BUILD,
  freezeBuild: freeze.AI_BUILD,
  seeds: seeds.length,
  bothSeats: bothSeats,
  opts: seatOpts()
}));

for (let i = 0; i < seeds.length; i++) {
  const seed = seeds[i];
  const seats = bothSeats ? [0, 1] : [seed % 2];
  for (let si = 0; si < seats.length; si++) {
    const r = playGameFirstDiff(seed, seats[si]);
    results.push(r);
    if (r.diverged) {
      nDiv++;
      const c = (r.firstDiff && r.firstDiff.class) || 'unknown';
      classCount[c] = (classCount[c] || 0) + 1;
      console.log(JSON.stringify({
        seed: seed,
        liveSeat: seats[si],
        class: c,
        phase: r.firstDiff.phase,
        freeze: r.firstDiff.freeze,
        chall: r.firstDiff.chall,
        handLen: r.firstDiff.handLen,
        omin: r.firstDiff.omin,
        step: r.firstDiff.step
      }));
    }
  }
}

const summary = {
  protocol: 'fair-firstdiff-v1',
  freeze: freezeTag,
  chall: challTag,
  live: live.AI_BUILD,
  freezeBuild: freeze.AI_BUILD,
  opts: seatOpts(),
  nGames: results.length,
  nDiverged: nDiv,
  divergeRate: results.length ? nDiv / results.length : 0,
  classCount: classCount,
  results: results
};

const outPath = path.join(__dirname, outName);
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log('=== SUMMARY ===');
console.log(JSON.stringify({
  nGames: summary.nGames,
  nDiverged: summary.nDiverged,
  divergeRate: summary.divergeRate,
  classCount: summary.classCount,
  out: outPath
}, null, 2));
