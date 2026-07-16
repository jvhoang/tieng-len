'use strict';
/**
 * TRAIN BC action scorer from living john_uploads playlogs (human moves only).
 * General features only — no byR fingerprints.
 *
 * Writes evolve/eval-registry/bc-action-weights.json
 *
 *   node evolve/train-bc-action.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const goldDir = path.join(ROOT, 'john_uploads');
const OUT = path.join(ROOT, 'evolve', 'eval-registry', 'bc-action-weights.json');
const EPOCHS = parseInt(process.env.EPOCHS || '40', 10);
const LR = parseFloat(process.env.LR || '0.08');
const FDIM = 28;

function newestPlaylogs() {
  return fs.readdirSync(goldDir)
    .filter(f => /^tienlen-playlogs-.*\.json$/.test(f))
    .map(f => path.join(goldDir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function cardKey(c) { return c.rank * 4 + (c.suit | 0); }

function actionFeats(hand, cards, cur, handSizes, seat) {
  const by = {};
  let twos = 0, control = 0, pairs = 0, trash = 0;
  for (const c of hand) {
    by[c.rank] = (by[c.rank] || 0) + 1;
    if (c.rank === 12) twos++;
    if (c.rank >= 10) control++;
  }
  for (const r of Object.keys(by)) {
    if (by[r] >= 2) pairs++;
    if (by[r] === 1 && +r <= 9) trash++;
  }
  const handLen = hand.length;
  let omin = 99;
  if (handSizes && handSizes.length) {
    for (let i = 0; i < handSizes.length; i++) {
      if (i !== seat) omin = Math.min(omin, handSizes[i]);
    }
  }
  if (omin === 99) omin = 13;
  const len = cards.length;
  const top = cards.reduce((m, c) => Math.max(m, c.rank), 0);
  const hasTwo = cards.some(c => c.rank === 12);
  const typ = len === 1 ? 'single' : len === 2 ? 'pair' : len === 3 ? 'triple' : len === 4 ? 'quad_or_seq' : 'long';
  // rank multiset peel cost proxy: singles from pairs
  let sbc = 0;
  const peel = {};
  for (const c of cards) peel[c.rank] = (peel[c.rank] || 0) + 1;
  for (const r of Object.keys(peel)) {
    if ((by[r] || 0) >= 2 && peel[r] === 1) sbc += 2;
    if ((by[r] || 0) >= 3 && peel[r] < by[r] && peel[r] > 0) sbc += 1;
  }
  const free = !cur;
  const isTrashSingle = len === 1 && top <= 6 && (by[top] === 1);
  const isLowPair = len === 2 && top <= 6 && !hasTwo;
  const isLowMulti = len >= 2 && top <= 8 && !hasTwo;
  return [
    1,
    handLen / 13,
    omin / 13,
    Math.min(2, twos) / 2,
    Math.min(4, control) / 4,
    Math.min(6, trash) / 6,
    Math.min(6, pairs) / 6,
    free ? 1 : 0,
    handLen >= 10 ? 1 : 0,
    handLen <= 5 ? 1 : 0,
    omin <= 1 ? 1 : 0,
    omin <= 2 ? 1 : 0,
    len / 13,
    top / 12,
    hasTwo ? 1 : 0,
    isTrashSingle ? 1 : 0,
    isLowPair ? 1 : 0,
    isLowMulti ? 1 : 0,
    typ === 'single' ? 1 : 0,
    typ === 'pair' ? 1 : 0,
    typ === 'triple' ? 1 : 0,
    typ === 'quad_or_seq' ? 1 : 0,
    typ === 'long' ? 1 : 0,
    Math.min(8, sbc) / 8,
    free && isTrashSingle ? 1 : 0,
    free && isLowPair ? 1 : 0,
    free && isLowMulti ? 1 : 0,
    !free && isTrashSingle ? 1 : 0
  ];
}

function sigmoid(x) {
  if (x > 20) return 1;
  if (x < -20) return 0;
  return 1 / (1 + Math.exp(-x));
}
function dot(w, f) {
  let s = 0;
  for (let i = 0; i < FDIM; i++) s += w[i] * f[i];
  return s;
}

function collect() {
  const samples = []; // {feats: number[][], chosen: number}
  const files = newestPlaylogs();
  let used = 0;
  for (const p of files) {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const g of j.games || []) {
      if (g.numPlayers !== 2 || !g.vsAI) continue;
      const humanSeat = (g.humanSeats && g.humanSeats[0]) != null ? g.humanSeats[0] : 0;
      for (const e of g.events || []) {
        if (e.type !== 'play' || e.actor !== 'human') continue;
        if (!e.handBefore || !e.cards || !e.legals || !e.legals.length) continue;
        const hand = e.handBefore;
        const cur = e.currentComboBefore || null;
        const seat = e.seat != null ? e.seat : humanSeat;
        const sizes = e.handSizesBefore || null;
        const feats = [];
        let chosen = -1;
        const want = (e.cards || []).map(cardKey).sort((a, b) => a - b).join(',');
        for (let i = 0; i < e.legals.length; i++) {
          const L = e.legals[i];
          // legal may be cards array or {cards}
          const cards = Array.isArray(L) ? L : (L.cards || L);
          if (!cards || !cards.length) continue;
          const sig = cards.map(cardKey).sort((a, b) => a - b).join(',');
          feats.push(actionFeats(hand, cards, cur, sizes, seat));
          if (sig === want) chosen = feats.length - 1;
        }
        if (chosen < 0 || feats.length < 2) continue;
        samples.push({ feats, chosen });
        used++;
      }
    }
  }
  return { samples, used, files: files.map(f => path.basename(f)) };
}

function train(samples) {
  const w = new Array(FDIM).fill(0);
  for (let ep = 0; ep < EPOCHS; ep++) {
    // shuffle
    for (let i = samples.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = samples[i]; samples[i] = samples[j]; samples[j] = t;
    }
    for (const s of samples) {
      // softmax CE gradient
      const logits = s.feats.map(f => dot(w, f));
      let m = logits[0];
      for (let i = 1; i < logits.length; i++) if (logits[i] > m) m = logits[i];
      const ex = logits.map(z => Math.exp(z - m));
      let Z = 0;
      for (const e of ex) Z += e;
      const p = ex.map(e => e / Z);
      for (let a = 0; a < s.feats.length; a++) {
        const g = (a === s.chosen ? 1 : 0) - p[a];
        for (let k = 0; k < FDIM; k++) w[k] += LR * g * s.feats[a][k];
      }
    }
  }
  // accuracy
  let ok = 0;
  for (const s of samples) {
    let best = 0, bestL = -1e99;
    for (let a = 0; a < s.feats.length; a++) {
      const L = dot(w, s.feats[a]);
      if (L > bestL) { bestL = L; best = a; }
    }
    if (best === s.chosen) ok++;
  }
  return { w, acc: ok / samples.length };
}

function main() {
  const { samples, used, files } = collect();
  console.log(JSON.stringify({ samples: samples.length, used, files }));
  if (!samples.length) throw new Error('no BC samples');
  const { w, acc } = train(samples);
  const out = {
    protocol: 'bc-action-v1',
    stamped: new Date().toISOString(),
    fdim: FDIM,
    weights: w,
    acc,
    n: samples.length,
    files
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ done: true, acc: +acc.toFixed(4), out: OUT }));
}
main();
