'use strict';
/**
 * TRAIN expanded linear value vs v60 (general features, no fingerprints).
 * FDIM=24: base 13 + structure/control differentials.
 * Writes evolve/eval-registry/value-expanded-weights.json
 *
 *   SP_GAMES=1000 ROUNDS=6 CHALL=p_l2s48 node evolve/train-value-expanded.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const REG = path.join(ROOT, 'evolve', 'eval-registry');
const OUT = path.join(REG, 'value-expanded-weights.json');
const CHALL = process.env.CHALL || 'p_l2s48';
const SP_GAMES = parseInt(process.env.SP_GAMES || '900', 10);
const ROUNDS = parseInt(process.env.ROUNDS || '6', 10);
const EPOCHS = parseInt(process.env.EPOCHS || '22', 10);
const LR = parseFloat(process.env.LR || '0.05');
const FDIM = 24;

function emptyW() { return new Array(FDIM).fill(0); }
function sigmoid(x) {
  if (x > 20) return 1;
  if (x < -20) return 0;
  return 1 / (1 + Math.exp(-x));
}
function predict(w, f) {
  let s = 0;
  for (let i = 0; i < FDIM; i++) s += w[i] * f[i];
  return sigmoid(s);
}
function fit(samples, w0) {
  const w = w0.slice();
  for (let ep = 0; ep < EPOCHS; ep++) {
    for (let i = samples.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = samples[i]; samples[i] = samples[j]; samples[j] = t;
    }
    for (const s of samples) {
      const p = predict(w, s.f);
      const err = s.y - p;
      for (let k = 0; k < FDIM; k++) w[k] += LR * err * s.f[k];
    }
  }
  return w;
}

function features(state, myIdx) {
  const hand = state.players[myIdx].hand;
  const handLen = hand.length;
  let omin = 99, omax = 0, osum = 0, on = 0;
  for (let i = 0; i < state.players.length; i++) {
    if (i !== myIdx && !state.players[i].finished) {
      const L = state.players[i].hand.length;
      omin = Math.min(omin, L);
      omax = Math.max(omax, L);
      osum += L;
      on++;
    }
  }
  if (omin === 99) omin = 0;
  const by = {};
  let twos = 0, control = 0, trash = 0, pairs = 0, triples = 0, quads = 0;
  let highPairs = 0, midCards = 0, lowCards = 0, aces = 0;
  for (const c of hand) {
    by[c.rank] = (by[c.rank] || 0) + 1;
    if (c.rank === 12) twos++;
    if (c.rank === 11) aces++;
    if (c.rank >= 10) control++;
    if (c.rank >= 5 && c.rank <= 9) midCards++;
    if (c.rank <= 4) lowCards++;
  }
  for (const r of Object.keys(by)) {
    const n = by[r];
    const rr = +r;
    if (n >= 2) pairs++;
    if (n >= 3) triples++;
    if (n >= 4) quads++;
    if (n >= 2 && rr >= 9) highPairs++;
    if (n === 1 && rr <= 9 && !by[rr - 1] && !by[rr + 1]) trash++;
  }
  // longest seq estimate (ranks present)
  let longest = 1, run = 0;
  for (let r = 0; r <= 11; r++) {
    if (by[r]) { run++; longest = Math.max(longest, run); }
    else run = 0;
  }
  const curTop = state.currentCombo && state.currentCombo.top ? state.currentCombo.top.rank : -1;
  const freeLead = !state.currentCombo;
  const oavg = on ? osum / on : 0;
  return [
    1,
    handLen / 13,
    omin / 13,
    Math.min(2, twos) / 2,
    Math.min(4, control) / 4,
    Math.min(6, trash) / 6,
    Math.min(6, pairs) / 6,
    curTop >= 0 ? 1 : 0,
    Math.max(0, curTop) / 12,
    freeLead ? 1 : 0,
    handLen >= 10 ? 1 : 0,
    handLen >= 6 && handLen <= 9 ? 1 : 0,
    handLen <= 5 ? 1 : 0,
    // expanded
    Math.min(2, triples) / 2,
    Math.min(1, quads),
    Math.min(3, highPairs) / 3,
    Math.min(2, aces) / 2,
    Math.min(8, midCards) / 8,
    Math.min(8, lowCards) / 8,
    Math.min(8, longest) / 8,
    Math.max(-1, Math.min(1, (oavg - handLen) / 8)),
    omin <= 1 ? 1 : 0,
    omin <= 2 ? 1 : 0,
    handLen - omin <= 0 ? 1 : 0
  ];
}

function collect() {
  const engine = require(path.join(ROOT, 'engine.js'));
  let ourSearch;
  try {
    ourSearch = require(path.join(ROOT, 'policies', CHALL + '-search.js'));
  } catch (e) {
    ourSearch = require(path.join(ROOT, 'search.js'));
  }
  const v60 = require(path.join(ROOT, 'policies', 'v60-search.js'));
  const ourPol = ourSearch.dualRolloutPolicy || ourSearch.expertPolicy;
  const oppPol = v60.expertPolicy;
  const samples = [];
  for (let g = 0; g < SP_GAMES; g++) {
    const seed = 2100000000 + (crypto.randomBytes(4).readUInt32BE(0) % 800000000);
    const ourSeat = g % 2;
    let st = engine.createGameState(2, seed);
    const snaps = [];
    let steps = 0;
    while (!st.roundOver && steps < 240) {
      const cp = st.currentPlayer;
      if (cp === ourSeat) snaps.push({ f: features(st, ourSeat) });
      const pol = cp === ourSeat ? ourPol : oppPol;
      const dec = pol(st, cp);
      try {
        if (dec && dec.pass) st = engine.pass(st, cp);
        else if (dec && dec.play) st = engine.applyPlay(st, cp, dec.play);
        else st = engine.pass(st, cp);
      } catch (e) { break; }
      if (st.isFirstLead != null) st.isFirstLead = false;
      steps++;
    }
    let winner = null;
    if (st.finishOrder && st.finishOrder.length) winner = st.finishOrder[0];
    else if (st.loser != null) winner = st.loser === 0 ? 1 : 0;
    if (winner == null) continue;
    const y = winner === ourSeat ? 1 : 0;
    for (const sn of snaps) samples.push({ f: sn.f, y: y });
  }
  return samples;
}

function main() {
  let w = emptyW();
  const log = [];
  for (let r = 0; r < ROUNDS; r++) {
    const samples = collect();
    console.log(JSON.stringify({ round: r, n: samples.length }));
    if (!samples.length) continue;
    w = fit(samples, w);
    let ok = 0;
    for (const s of samples) {
      if ((predict(w, s.f) >= 0.5 ? 1 : 0) === s.y) ok++;
    }
    const acc = ok / samples.length;
    log.push({ round: r, n: samples.length, acc });
    console.log(JSON.stringify({ round: r, acc: +acc.toFixed(4), w: w.map(x => +x.toFixed(4)) }));
    fs.writeFileSync(OUT, JSON.stringify({
      protocol: 'train-value-expanded-v1',
      stamped: new Date().toISOString(),
      fdim: FDIM,
      weights: w,
      acc,
      n: samples.length,
      chall: CHALL,
      log
    }, null, 2));
  }
  console.log(JSON.stringify({ done: true, out: OUT }));
}
main();
