'use strict';
/**
 * Multi-seed dual-safe 1-force census under fresh random seeds.
 * Clusters convert alts by structural features (not exact byR) for transfer-safe levers.
 *
 *   BASE=v97 FREEZE=v97 GAMES=40 BOTH_SEATS=1 MS=0 TRIALS=20 \
 *     node evolve/multi-seed-force-census.js
 *
 * Writes evolve/force-census-<base>-vs-<freeze>.json + stdout summary.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const engine = require('../engine.js');

const baseTag = process.env.BASE || process.env.CHALL || 'v97';
const freezeTag = process.env.FREEZE || 'v97';
const games = parseInt(process.env.GAMES || '40', 10);
const ms = parseInt(process.env.MS || '0', 10);
const trials = parseInt(process.env.TRIALS || '20', 10);
const bothSeats = process.env.BOTH_SEATS !== '0';
const maxForceStep = parseInt(process.env.MAX_FORCE_STEP || '20', 10);
const maxAlts = parseInt(process.env.MAX_ALTS || '12', 10);
const masterSeed = process.env.MASTER_SEED || null;
const outName = process.env.OUT || ('force-census-' + baseTag + '-vs-' + freezeTag + '.json');

const live = require('../policies/' + baseTag + '-ai.js');
const freeze = require('../policies/' + freezeTag + '-ai.js');
const liveS = require('../policies/' + baseTag + '-search.js');
const freezeS = require('../policies/' + freezeTag + '-search.js');

function inject(s, f) {
  if (!s.setExploitOpponent) return;
  s.setExploitOpponent(function (st, seat) {
    var d = f.expertPolicy && f.expertPolicy(st, seat);
    return d && d.pass ? null : (d && d.play != null ? d.play : null);
  });
}
inject(liveS, freezeS);
inject(freezeS, freezeS);

function opts() {
  return {
    difficulty: 'grandmaster', useSearch: true, perfectInfo: false, hiddenInfo: true,
    timeMs: ms, iterations: 60, maxSims: 120, brTrials: trials, bestResponse: true,
    exactExploit: false, exploit: true, softSamples: 0, maxBranch: 12, mode: 'auto', strongSelf: false
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
function playSig(play) {
  if (play == null || play.pass) return 'PASS';
  const c = play.play || play;
  if (!Array.isArray(c)) return 'PASS';
  return c.map(function (x) { return x.rank * 4 + x.suit; }).sort(function (a, b) { return a - b; }).join(',');
}
function lab(play) {
  if (play == null || play.pass) return 'PASS';
  const c = Array.isArray(play) ? play : (play.play || play);
  if (!Array.isArray(c)) return 'PASS';
  return c.map(function (x) {
    return ('3456789TJQKA2'[x.rank] || '?') + ('SHDC'[x.suit] || '?');
  }).join(' ');
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
function normalize(mv) {
  if (mv == null || mv.pass) return { pass: true };
  if (Array.isArray(mv)) return { play: mv };
  if (mv.play) return { play: mv.play };
  return { pass: true };
}
function winner(s) {
  if (s.finishOrder && s.finishOrder.length) return s.finishOrder[0];
  if (s.loser === 0) return 1;
  if (s.loser === 1) return 0;
  return null;
}
function parseLab(labS) {
  if (labS === 'PASS') return { pass: true };
  const rankMap = {};
  '3456789TJQKA2'.split('').forEach(function (ch, i) { rankMap[ch] = i; });
  const suitMap = { S: 0, H: 1, D: 2, C: 3 };
  return {
    play: labS.split(/\s+/).map(function (tok) {
      return { rank: rankMap[tok[0]], suit: suitMap[tok[1]] };
    })
  };
}

function runForced(seed, liveSeat, forceAt) {
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  const o = opts();
  while (!state.roundOver && steps < 240) {
    const cp = state.currentPlayer;
    let mv;
    if (forceAt && forceAt.step === steps && cp === liveSeat) {
      mv = parseLab(forceAt.lab);
    } else {
      const pol = cp === liveSeat ? live : freeze;
      mv = normalize(withDetRng(String(seed) + '|' + steps + '|' + cp, function () {
        return pol.getAIMove(state, cp, o);
      }));
    }
    state = apply(state, cp, mv);
    state.isFirstLead = false;
    steps++;
  }
  return winner(state) === liveSeat;
}

function dumpPath(seed, liveSeat) {
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  const o = opts();
  const pathDec = [];
  while (!state.roundOver && steps < 240) {
    const cp = state.currentPlayer;
    const pol = cp === liveSeat ? live : freeze;
    const mv = normalize(withDetRng(String(seed) + '|' + steps + '|' + cp, function () {
      return pol.getAIMove(state, cp, o);
    }));
    if (cp === liveSeat) {
      const leg = engine.getLegalPlays(
        state.players[cp].hand, state.currentCombo, state.players[cp].passed,
        state.isFirstLead, state.firstLeadCard
      );
      const alts = leg.filter(function (l) { return playSig(l) !== playSig(mv); }).map(lab).slice(0, maxAlts);
      const byR = {};
      state.players[cp].hand.forEach(function (c) {
        byR[c.rank] = (byR[c.rank] || 0) + 1;
      });
      var omin = 99;
      for (var i = 0; i < state.players.length; i++) {
        if (i !== cp) omin = Math.min(omin, state.players[i].hand.length);
      }
      pathDec.push({
        steps: steps,
        phase: !state.currentCombo ? 'FREE' : String(state.currentCombo.type || 'C'),
        play: lab(mv),
        handLen: state.players[cp].hand.length,
        omin: omin,
        curTop: state.currentCombo && state.currentCombo.top ? state.currentCombo.top.rank : null,
        byR: byR,
        alts: alts
      });
    }
    state = apply(state, cp, mv);
    state.isFirstLead = false;
    steps++;
  }
  return { win: winner(state) === liveSeat, path: pathDec };
}

function genSeeds(n) {
  const out = [];
  const seen = Object.create(null);
  var state = masterSeed != null
    ? hashKey(String(masterSeed) + '|census')
    : (crypto.randomBytes(4).readUInt32BE(0) || 1);
  while (out.length < n) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    var s = 2100000000 + (state % 800000000);
    if (s === 20260801 || s === 20260802 || seen[s]) continue;
    seen[s] = 1;
    out.push(s);
  }
  return out;
}

function clusterKey(h) {
  // Structural bucket: phase | handLen band | omin band | curTop band | baseLen | altLen | altMinRank
  var hlB = h.handLen <= 6 ? 's' : h.handLen <= 10 ? 'm' : 'd';
  var omB = h.omin == null ? 'x' : h.omin <= 4 ? 's' : h.omin <= 9 ? 'm' : 'd';
  var topB = h.curTop == null ? 'free' : h.curTop <= 3 ? 'lo' : h.curTop <= 7 ? 'mid' : 'hi';
  var baseLen = h.base === 'PASS' ? 0 : h.base.split(/\s+/).length;
  var altLen = h.alt === 'PASS' ? 0 : h.alt.split(/\s+/).length;
  var altR = h.alt === 'PASS' ? -1 : '3456789TJQKA2'.indexOf(h.alt[0]);
  var altRB = altR < 0 ? 'P' : altR <= 3 ? 'lo' : altR <= 7 ? 'mid' : altR <= 10 ? 'hi' : 'top';
  return [h.phase, hlB, omB, topB, 'b' + baseLen, 'a' + altLen, altRB].join('|');
}

// ── main ──
const seeds = genSeeds(games);
const lossSeats = [];
const hits = [];
const o = opts();

console.log(JSON.stringify({
  start: true, base: baseTag, freeze: freezeTag, games: games, bothSeats: bothSeats,
  seeds0: seeds[0], nSeeds: seeds.length
}));

for (var gi = 0; gi < seeds.length; gi++) {
  var seed = seeds[gi];
  var seats = bothSeats ? [0, 1] : [seed % 2];
  for (var si = 0; si < seats.length; si++) {
    var liveSeat = seats[si];
    var base = dumpPath(seed, liveSeat);
    if (base.win) continue;
    var seatStr = seed + '@' + liveSeat;
    lossSeats.push(seatStr);
    process.stderr.write('LOSS ' + seatStr + ' pathLen=' + base.path.length + '\n');
    for (var di = 0; di < base.path.length; di++) {
      var d = base.path[di];
      if (d.steps > maxForceStep) break;
      for (var ai = 0; ai < d.alts.length; ai++) {
        var alt = d.alts[ai];
        if (runForced(seed, liveSeat, { step: d.steps, lab: alt })) {
          var h = {
            seat: seatStr,
            step: d.steps,
            phase: d.phase,
            base: d.play,
            alt: alt,
            handLen: d.handLen,
            omin: d.omin,
            curTop: d.curTop,
            byR: d.byR
          };
          h.cluster = clusterKey(h);
          hits.push(h);
          process.stderr.write('HIT ' + JSON.stringify({ seat: seatStr, step: d.steps, phase: d.phase, base: d.play, alt: alt, cluster: h.cluster }) + '\n');
        }
      }
    }
  }
}

// cluster stats
const clusters = {};
hits.forEach(function (h) {
  if (!clusters[h.cluster]) clusters[h.cluster] = { n: 0, seats: {}, samples: [] };
  clusters[h.cluster].n++;
  clusters[h.cluster].seats[h.seat] = 1;
  if (clusters[h.cluster].samples.length < 5) clusters[h.cluster].samples.push(h);
});
const ranked = Object.keys(clusters).map(function (k) {
  return {
    cluster: k,
    nHits: clusters[k].n,
    nSeats: Object.keys(clusters[k].seats).length,
    samples: clusters[k].samples
  };
}).sort(function (a, b) { return b.nSeats - a.nSeats || b.nHits - a.nHits; });

const report = {
  protocol: 'multi-seed-1force-census-v1',
  base: baseTag,
  freeze: freezeTag,
  ms: ms,
  trials: trials,
  games: games,
  bothSeats: bothSeats,
  seeds: seeds,
  nLossSeats: lossSeats.length,
  lossSeats: lossSeats,
  nHits: hits.length,
  topClusters: ranked.slice(0, 30),
  hits: hits
};

const outPath = path.join(__dirname, outName);
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log('=== CENSUS ===');
console.log(JSON.stringify({
  nLossSeats: lossSeats.length,
  nHits: hits.length,
  topClusters: ranked.slice(0, 12).map(function (c) {
    return { cluster: c.cluster, nSeats: c.nSeats, nHits: c.nHits, sample: c.samples[0] };
  })
}, null, 2));
console.log('wrote', outPath);
