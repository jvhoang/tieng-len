'use strict';
/**
 * TRAIN: distill high-trials best-response free-lead choices into a linear action
 * scorer for dualRollout SoftN=0 leaf. Does NOT touch PAIR_STEP/CERT seeds.
 *
 *   SP_GAMES=200 BR_TRIALS=48 CHALL=p_l2s48 FREEZE=v60 \
 *     node evolve/train-br-distill.js
 *
 * Writes evolve/eval-registry/br-distill-weights.json
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const REG = path.join(ROOT, 'evolve', 'eval-registry');
const OUT = path.join(REG, 'br-distill-weights.json');
const CHALL = process.env.CHALL || 'p_l2s48';
const SP_GAMES = parseInt(process.env.SP_GAMES || '180', 10);
const BR_TRIALS = parseInt(process.env.BR_TRIALS || '40', 10);
const EPOCHS = parseInt(process.env.EPOCHS || '35', 10);
const LR = parseFloat(process.env.LR || '0.07');
const FDIM = 28;

function emptyW() { return new Array(FDIM).fill(0); }
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

function actionFeats(state, myIdx, cards, search) {
  const hand = state.players[myIdx].hand;
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
  let omin = 99;
  for (let i = 0; i < state.players.length; i++) {
    if (i !== myIdx && !state.players[i].finished) {
      omin = Math.min(omin, state.players[i].hand.length);
    }
  }
  if (omin === 99) omin = 0;
  const handLen = hand.length;
  const len = cards.length;
  let top = 0, hasTwo = false;
  for (const c of cards) {
    if (c.rank > top) top = c.rank;
    if (c.rank === 12) hasTwo = true;
  }
  const typ = len === 1 ? 'single' : len === 2 ? 'pair' : len === 3 ? 'triple' : len === 4 ? 'quad_or_seq' : 'long';
  const sbc = search.structureBreakCost ? search.structureBreakCost(hand, cards) : 0;
  const free = !state.currentCombo;
  const isTrashSingle = len === 1 && top <= 6 && by[top] === 1;
  const isLowPair = len === 2 && top <= 6 && !hasTwo;
  const isLowMulti = len >= 2 && top <= 8 && !hasTwo;
  return [
    1, handLen / 13, omin / 13, Math.min(2, twos) / 2, Math.min(4, control) / 4,
    Math.min(6, trash) / 6, Math.min(6, pairs) / 6, free ? 1 : 0,
    handLen >= 10 ? 1 : 0, handLen <= 5 ? 1 : 0, omin <= 1 ? 1 : 0, omin <= 2 ? 1 : 0,
    len / 13, top / 12, hasTwo ? 1 : 0, isTrashSingle ? 1 : 0, isLowPair ? 1 : 0,
    isLowMulti ? 1 : 0, typ === 'single' ? 1 : 0, typ === 'pair' ? 1 : 0,
    typ === 'triple' ? 1 : 0, typ === 'quad_or_seq' ? 1 : 0, typ === 'long' ? 1 : 0,
    Math.min(8, sbc) / 8, free && isTrashSingle ? 1 : 0, free && isLowPair ? 1 : 0,
    free && isLowMulti ? 1 : 0, !free && isTrashSingle ? 1 : 0
  ];
}

function playSig(play) {
  if (!play) return 'PASS';
  return play.map(c => c.rank * 4 + c.suit).sort((a, b) => a - b).join(',');
}

function collect() {
  const engine = require(path.join(ROOT, 'engine.js'));
  const search = require(path.join(ROOT, 'policies', CHALL + '-search.js'));
  const samples = [];
  let freeN = 0;
  for (let g = 0; g < SP_GAMES; g++) {
    const seed = 2200000000 + (crypto.randomBytes(4).readUInt32BE(0) % 700000000);
    const ourSeat = g % 2;
    let st = engine.createGameState(2, seed);
    st.isFirstLead = true;
    let steps = 0;
    while (!st.roundOver && steps < 40) {
      const cp = st.currentPlayer;
      if (cp === ourSeat && !st.currentCombo) {
        // High-trials BR teacher on free lead
        const br = search.bestResponseMove(st, cp, {
          trials: BR_TRIALS,
          timeMs: 0,
          maxBranch: 12,
          perfectInfo: false,
          oppModel: 'v21'
        });
        const chosen = br && br.play;
        if (chosen && chosen.length) {
          const hand = st.players[cp].hand;
          const leg = engine.getLegalPlays(
            hand, st.currentCombo, st.players[cp].passed, st.isFirstLead, st.firstLeadCard
          );
          const fl = search.freeLeadCandidates
            ? search.freeLeadCandidates(leg, st, cp)
            : leg;
          const feats = [];
          let chosenIdx = -1;
          const want = playSig(chosen);
          for (let i = 0; i < fl.length && i < 14; i++) {
            feats.push(actionFeats(st, cp, fl[i], search));
            if (playSig(fl[i]) === want) chosenIdx = feats.length - 1;
          }
          if (chosenIdx >= 0 && feats.length >= 2) {
            samples.push({ feats, chosen: chosenIdx });
            freeN++;
          }
        }
      }
      // advance with dual/expert leaf (fast)
      const pol = search.dualRolloutPolicy || search.expertPolicy;
      const dec = pol(st, cp);
      try {
        if (dec && dec.pass) st = engine.passFast(st, cp);
        else if (dec && dec.play) st = engine.applyPlayFast(st, cp, dec.play);
        else st = engine.passFast(st, cp);
      } catch (e) { break; }
      st.isFirstLead = false;
      steps++;
    }
    if ((g + 1) % 20 === 0) {
      console.log(JSON.stringify({ progress: g + 1, freeN, samples: samples.length }));
    }
  }
  return { samples, freeN };
}

function train(samples) {
  const w = emptyW();
  for (let ep = 0; ep < EPOCHS; ep++) {
    for (let i = samples.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = samples[i]; samples[i] = samples[j]; samples[j] = t;
    }
    for (const s of samples) {
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
  console.log(JSON.stringify({ start: true, SP_GAMES, BR_TRIALS, CHALL }));
  const { samples, freeN } = collect();
  console.log(JSON.stringify({ collected: samples.length, freeN }));
  if (!samples.length) throw new Error('no samples');
  const { w, acc } = train(samples);
  const out = {
    protocol: 'br-distill-v1',
    stamped: new Date().toISOString(),
    fdim: FDIM,
    weights: w,
    acc,
    n: samples.length,
    freeN,
    brTrials: BR_TRIALS,
    chall: CHALL
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ done: true, acc: +acc.toFixed(4), out: OUT }));
}
main();
