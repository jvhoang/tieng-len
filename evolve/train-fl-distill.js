'use strict';
/**
 * TRAIN free-lead distillation: high-trial BR teacher vs dualRollout student.
 * Learns linear prior over free-lead action features (no byR fingerprints).
 * Writes evolve/eval-registry/fl-prior-weights.json
 *
 *   SP_GAMES=120 TEACHER_TRIALS=36 STUDENT_TRIALS=12 CHALL=p_l2s48 \
 *     node evolve/train-fl-distill.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const REG = path.join(ROOT, 'evolve', 'eval-registry');
const OUT = path.join(REG, 'fl-prior-weights.json');
const CHALL = process.env.CHALL || 'p_l2s48';
const SP_GAMES = parseInt(process.env.SP_GAMES || '100', 10);
const TEACHER = parseInt(process.env.TEACHER_TRIALS || '36', 10);
const STUDENT = parseInt(process.env.STUDENT_TRIALS || '12', 10);
const EPOCHS = parseInt(process.env.EPOCHS || '25', 10);
const LR = parseFloat(process.env.LR || '0.08');

// Free-lead action features:
// 0 bias  1 isTrash  2 isPair  3 isSeq  4 isTriple  5 isDseq
// 6 top/12  7 len/8  8 sbc/10  9 orphans/5  10 residualPairs/5
// 11 lowTop(top<=6)  12 midTop  13 hasTwos  14 handLen/13  15 omin/13
const FDIM = 16;

function emptyW() { return new Array(FDIM).fill(0); }
function sigmoid(x) {
  if (x > 20) return 1;
  if (x < -20) return 0;
  return 1 / (1 + Math.exp(-x));
}
function predict(w, f) {
  let s = 0;
  for (let i = 0; i < FDIM; i++) s += w[i] * (f[i] || 0);
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
      for (let k = 0; k < FDIM; k++) w[k] += LR * err * (s.f[k] || 0);
    }
  }
  return w;
}

function sbc(hand, play) {
  const by = {};
  for (const c of hand) by[c.rank] = (by[c.rank] || 0) + 1;
  const used = {};
  for (const c of play) used[c.rank] = (used[c.rank] || 0) + 1;
  let cost = 0;
  for (const k of Object.keys(used)) {
    const r = +k, had = by[r] || 0, u = used[r], left = had - u;
    if (had >= 2 && left === 1 && u === 1) cost += 3.5;
    if (had >= 2 && u === 1 && left === 0) cost += 3;
    if (had >= 3 && left > 0 && left < 3) cost += 5;
  }
  return cost;
}

function flFeatures(hand, play, omin, twos) {
  const engine = require(path.join(ROOT, 'engine.js'));
  const com = engine.detectCombo(play);
  let top = 0;
  for (const c of play) if (c.rank > top) top = c.rank;
  const by = {};
  for (const c of hand) by[c.rank] = (by[c.rank] || 0) + 1;
  // trash single: singleton low not in run
  let isTrash = 0;
  if (play.length === 1 && top <= 6) {
    const r = play[0].rank;
    if ((by[r] || 0) === 1 && !by[r + 1]) isTrash = 1;
  }
  // residual after play
  const used = {};
  for (const c of play) used[c.rank + ':' + c.suit] = 1;
  const leftBy = {};
  for (const c of hand) {
    if (!used[c.rank + ':' + c.suit]) leftBy[c.rank] = (leftBy[c.rank] || 0) + 1;
  }
  let pairs = 0, orph = 0;
  for (const k of Object.keys(leftBy)) {
    const r = +k, n = leftBy[r];
    if (n >= 2) pairs++;
    if (n === 1 && r <= 9 && !leftBy[r - 1] && !leftBy[r + 1]) orph++;
  }
  const typ = com && com.type;
  return [
    1,
    isTrash,
    typ === 'pair' ? 1 : 0,
    typ === 'seq' ? 1 : 0,
    typ === 'triple' ? 1 : 0,
    typ === 'doubleseq' ? 1 : 0,
    top / 12,
    play.length / 8,
    Math.min(10, sbc(hand, play)) / 10,
    Math.min(5, orph) / 5,
    Math.min(5, pairs) / 5,
    top <= 6 ? 1 : 0,
    top >= 7 && top <= 9 ? 1 : 0,
    twos >= 1 ? 1 : 0,
    hand.length / 13,
    omin / 13
  ];
}

function playSig(play) {
  if (!play) return 'PASS';
  return play.map(c => c.rank + '' + c.suit).sort().join(',');
}

function collect() {
  const engine = require(path.join(ROOT, 'engine.js'));
  let search;
  try {
    search = require(path.join(ROOT, 'policies', CHALL + '-search.js'));
  } catch (e) {
    search = require(path.join(ROOT, 'search.js'));
  }
  if (!search.bestResponseMove) throw new Error('no BR');
  const samples = [];
  let disagree = 0, total = 0;

  for (let g = 0; g < SP_GAMES; g++) {
    const seed = 2100000000 + (crypto.randomBytes(4).readUInt32BE(0) % 800000000);
    let st = engine.createGameState(2, seed);
    // Only first free-lead of each seat (opening decisions)
    const doneSeat = {};
    let steps = 0;
    while (!st.roundOver && steps < 40) {
      const cp = st.currentPlayer;
      if (!st.currentCombo && !doneSeat[cp] && st.players[cp].hand.length >= 8) {
        doneSeat[cp] = 1;
        total++;
        const hand = st.players[cp].hand;
        let omin = 99;
        for (let i = 0; i < st.players.length; i++) {
          if (i !== cp && !st.players[i].finished) omin = Math.min(omin, st.players[i].hand.length);
        }
        let twos = 0;
        for (const c of hand) if (c.rank === 12) twos++;

        const teacher = search.bestResponseMove(st, cp, {
          trials: TEACHER,
          maxBranch: 14,
          perfectInfo: false,
          timeMs: 0,
          oppModel: 'v21'
        });
        const student = search.bestResponseMove(st, cp, {
          trials: STUDENT,
          maxBranch: 14,
          perfectInfo: false,
          timeMs: 0,
          oppModel: 'v21'
        });
        const tPlay = teacher && teacher.play;
        const sPlay = student && student.play;
        if (tPlay && sPlay && playSig(tPlay) !== playSig(sPlay)) disagree++;

        // Label: teacher action y=1, other legals y=0 (soft)
        const leg = engine.getLegalPlays(
          hand, null, st.players[cp].passed, st.isFirstLead, st.firstLeadCard
        );
        const multi = leg.filter(p => p.length >= 2 || (p.length === 1 && p[0].rank <= 7));
        const pool = multi.length ? multi : leg.slice(0, 12);
        const tSig = playSig(tPlay);
        for (const p of pool.slice(0, 14)) {
          const f = flFeatures(hand, p, omin, twos);
          const y = playSig(p) === tSig ? 1 : 0;
          samples.push({ f, y });
        }
      }
      // advance with dualRollout
      const pol = search.dualRolloutPolicy || search.expertPolicy;
      const dec = pol(st, cp);
      try {
        if (dec && dec.pass) st = engine.pass(st, cp);
        else if (dec && dec.play) st = engine.applyPlay(st, cp, dec.play);
        else st = engine.pass(st, cp);
      } catch (e) {
        break;
      }
      if (st.isFirstLead != null) st.isFirstLead = false;
      steps++;
    }
  }
  return { samples, disagree, total };
}

function main() {
  console.log(JSON.stringify({ start: true, SP_GAMES, TEACHER, STUDENT, CHALL }));
  const { samples, disagree, total } = collect();
  console.log(JSON.stringify({ samples: samples.length, disagree, total, disagreeRate: total ? disagree / total : 0 }));
  if (!samples.length) throw new Error('no samples');
  let w = emptyW();
  w = fit(samples, w);
  let ok = 0;
  for (const s of samples) {
    if ((predict(w, s.f) >= 0.5 ? 1 : 0) === s.y) ok++;
  }
  const acc = ok / samples.length;
  fs.writeFileSync(OUT, JSON.stringify({
    protocol: 'train-fl-distill-v1',
    stamped: new Date().toISOString(),
    fdim: FDIM,
    weights: w,
    acc: acc,
    n: samples.length,
    disagree: disagree,
    totalFL: total,
    teacher: TEACHER,
    student: STUDENT,
    chall: CHALL
  }, null, 2));
  console.log(JSON.stringify({ done: true, acc: +acc.toFixed(4), w: w.map(x => +x.toFixed(4)), out: OUT }));
}

main();
