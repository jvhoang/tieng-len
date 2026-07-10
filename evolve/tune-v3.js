/**
 * Meta-strategist style parameter search for v3 free-lead / contest thresholds.
 * Fitness = 2p win rate vs frozen v2.1 expert over N games.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');
const search = require('../search.js');
const v21 = require('../policies/v21-ai.js');

// Tunable globals injected into search via setTuneParams if available
const DEFAULTS = {
  trashMaxRank: 9,
  trashMinHand: 5,
  requireControlForTrash: false, // always dump trash early
  giftMinRank: 10,
  contestTop: 7,
  aggressiveContestTrash: true
};

let TUNE = Object.assign({}, DEFAULTS);

// Monkey-patch analyzeHand trash rank via wrapping pickFreeLeadHard is hard;
// instead we re-implement fitness mover using search primitives + TUNE.

function apply(st, cp, ch) {
  const leg = engine.getLegalPlays(
    st.players[cp].hand, st.currentCombo, st.players[cp].passed,
    st.isFirstLead, st.firstLeadCard
  );
  if (!leg.length) return engine.passFast(st, cp);
  if (ch == null) {
    if (!st.currentCombo) return engine.applyPlayFast(st, cp, leg[0]);
    return engine.passFast(st, cp);
  }
  const sig = ch.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; }).join(',');
  const ok = leg.some(function (l) {
    return l.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; }).join(',') === sig;
  });
  return engine.applyPlayFast(st, cp, ok ? ch : leg[0]);
}

function tunedFreeLead(st, cp) {
  const hand = st.players[cp].hand;
  const leg = engine.getLegalPlays(hand, null, false, st.isFirstLead, st.firstLeadCard);
  if (!leg.length) return null;
  for (let i = 0; i < leg.length; i++) {
    if (leg[i].length === hand.length) return leg[i];
  }
  const info = search.analyzeHand(hand);
  // re-filter trash by TUNE.trashMaxRank
  const trash = info.trash.filter(function (c) { return c.rank <= TUNE.trashMaxRank; });
  const omin = st.players[1 - cp] ? st.players[1 - cp].hand.length : 99;

  if (omin === 1) {
    const multi = leg.filter(function (p) {
      return p.length >= 2 && !p.some(function (c) { return c.rank === 12; });
    });
    if (multi.length) return search.orderLegals(multi, st, cp)[0];
    const highs = leg.filter(function (p) { return p.length === 1 && p[0].rank >= TUNE.giftMinRank; });
    if (highs.length) {
      highs.sort(function (a, b) { return b[0].rank - a[0].rank; });
      return highs[0];
    }
    const allS = leg.filter(function (p) { return p.length === 1; });
    if (allS.length) {
      allS.sort(function (a, b) { return b[0].rank - a[0].rank; });
      return allS[0];
    }
  }

  const hasCtrl = info.twos >= 1 || info.control >= 1 || !TUNE.requireControlForTrash;
  if (trash.length && hand.length >= TUNE.trashMinHand && hasCtrl) {
    const plays = [];
    for (let i = 0; i < leg.length; i++) {
      if (leg[i].length === 1) {
        for (let t = 0; t < trash.length; t++) {
          if (trash[t].rank === leg[i][0].rank && trash[t].suit === leg[i][0].suit) {
            plays.push(leg[i]);
          }
        }
      }
    }
    if (plays.length) {
      plays.sort(function (a, b) { return a[0].rank - b[0].rank; });
      return plays[0];
    }
  }

  return search.pickFreeLeadHard(leg, st, cp);
}

function tunedMove(st, cp) {
  if (!st.currentCombo) return tunedFreeLead(st, cp);
  // BR light for combat when short
  const omin = st.players[1 - cp] ? st.players[1 - cp].hand.length : 99;
  if (st.players[cp].hand.length <= 6 || omin <= 2) {
    const br = search.bestResponseMove(st, cp, { trials: 20, timeMs: 200, maxBranch: 10 });
    if (br.play != null) return br.play;
  }
  const leg = engine.getLegalPlays(
    st.players[cp].hand, st.currentCombo, st.players[cp].passed,
    st.isFirstLead, st.firstLeadCard
  );
  if (!leg.length) return null;
  const cheap = leg.filter(function (p) { return !p.some(function (c) { return c.rank === 12; }); });
  if (cheap.length) return search.orderLegals(cheap, st, cp)[0];
  const top = st.currentCombo.top ? st.currentCombo.top.rank : 0;
  if (top >= TUNE.contestTop || st.players[cp].hand.length <= 9) {
    return search.orderLegals(leg, st, cp)[0];
  }
  return null;
}

function fitness(n, seed0) {
  let w = 0;
  for (let i = 0; i < n; i++) {
    const s3 = i % 2;
    let st = engine.createGameState(2, seed0 + i * 17);
    st.isFirstLead = true;
    let steps = 0;
    while (!st.roundOver && steps < 300) {
      const cp = st.currentPlayer;
      let ch;
      if (cp === s3) ch = tunedMove(st, cp);
      else ch = v21.getAIMove(st, cp, { difficulty: 'easy', iterations: 0, mode: 'expert' });
      st = apply(st, cp, ch);
      st.isFirstLead = false;
      steps++;
    }
    const winner = (st.finishOrder && st.finishOrder[0] != null)
      ? st.finishOrder[0]
      : (st.loser === 0 ? 1 : 0);
    if (winner === s3) w++;
  }
  return w / n;
}

function mutate(p, rng) {
  const n = Object.assign({}, p);
  const keys = Object.keys(DEFAULTS);
  const k = keys[Math.floor(rng() * keys.length)];
  if (typeof n[k] === 'boolean') n[k] = !n[k];
  else if (k === 'trashMaxRank') n[k] = 6 + Math.floor(rng() * 5);
  else if (k === 'trashMinHand') n[k] = 4 + Math.floor(rng() * 5);
  else if (k === 'giftMinRank') n[k] = 9 + Math.floor(rng() * 3);
  else if (k === 'contestTop') n[k] = 6 + Math.floor(rng() * 5);
  return n;
}

function main() {
  let best = Object.assign({}, DEFAULTS);
  TUNE = best;
  let bestFit = fitness(80, 90000);
  console.log('baseline', bestFit, best);
  const rng = function () { return Math.random(); };
  for (let gen = 0; gen < 24; gen++) {
    const cand = mutate(best, rng);
    TUNE = cand;
    const fit = fitness(80, 91000 + gen * 1000);
    console.log('gen', gen, fit, cand);
    if (fit > bestFit) {
      bestFit = fit;
      best = cand;
      console.log('  NEW BEST', bestFit, best);
    }
  }
  TUNE = best;
  const val = fitness(200, 99000);
  console.log('validate200', val, best);
  const out = { best: best, fit80: bestFit, validate200: val };
  fs.writeFileSync(path.join(__dirname, 'tune-v3-best.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

if (require.main === module) main();
module.exports = { fitness: fitness, tunedMove: tunedMove, DEFAULTS: DEFAULTS };
