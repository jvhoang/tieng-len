'use strict';
/**
 * TRAIN-only action-value Q(s,a) learner (general features, not byR fingerprints).
 * Self-play with dualRollout; labels win/loss for (state,action) feature vectors.
 * Writes evolve/eval-registry/q-weights.json
 *
 *   SP_GAMES=400 ROUNDS=4 EPOCHS=20 CHALL=p_l2s48 \
 *     node evolve/train-q-action.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const REG = path.join(ROOT, 'evolve', 'eval-registry');
const OUT = path.join(REG, 'q-weights.json');
const CHALL = process.env.CHALL || 'p_l2s48';
const SP_GAMES = parseInt(process.env.SP_GAMES || '350', 10);
const ROUNDS = parseInt(process.env.ROUNDS || '4', 10);
const EPOCHS = parseInt(process.env.EPOCHS || '18', 10);
const LR = parseFloat(process.env.LR || '0.05');

// Q features (action-conditioned, imperfect-info safe):
// 0 bias
// 1 afterHandLen/13  2 omin/13  3 afterTwos/2  4 afterControl/4
// 5 afterTrash/6     6 afterPairs/6  7 freeLead
// 8 isPass  9 isSingle  10 isPair  11 isMulti
// 12 top/12  13 playLen/13  14 sbc/12  15 orphans/6
// 16 dumpVol (playLen/handLen)  17 endgame (afterLen<=4)
const FDIM = 18;

function emptyW() {
  return new Array(FDIM).fill(0);
}
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

function analyze(hand) {
  const by = {};
  let twos = 0, control = 0, trash = 0, pairs = 0;
  for (const c of hand) {
    by[c.rank] = (by[c.rank] || 0) + 1;
    if (c.rank === 12) twos++;
    if (c.rank >= 10) control++;
  }
  for (const r of Object.keys(by)) {
    if (by[r] >= 2) pairs++;
    if (by[r] === 1 && +r <= 9) {
      const rk = +r;
      if (!by[rk - 1] && !by[rk + 1]) trash++;
    }
  }
  return { by, twos, control, trash, pairs };
}

function sbc(hand, play) {
  if (!play || !play.length) return 0;
  const by = {};
  for (const c of hand) by[c.rank] = (by[c.rank] || 0) + 1;
  const used = {};
  for (const c of play) used[c.rank] = (used[c.rank] || 0) + 1;
  let cost = 0;
  for (const k of Object.keys(used)) {
    const r = +k;
    const had = by[r] || 0;
    const u = used[r];
    const left = had - u;
    if (had >= 2 && left === 1 && u === 1) cost += 3.5;
    if (had >= 2 && u === 1 && left === 0) cost += 3;
    if (had >= 3 && left > 0 && left < 3) cost += 5;
    if (left === 0 || (had >= 2 && left === 1)) {
      if (by[r - 1] && by[r + 1]) cost += 4;
      else if (by[r - 1] || by[r + 1]) cost += 1.5;
    }
  }
  return cost;
}

function orphansAfter(hand, play) {
  const by = {};
  for (const c of hand) by[c.rank] = (by[c.rank] || 0) + 1;
  if (play) for (const c of play) by[c.rank] = (by[c.rank] || 0) - 1;
  let o = 0;
  for (let r = 0; r <= 9; r++) {
    if ((by[r] || 0) === 1 && !(by[r - 1] > 0) && !(by[r + 1] > 0)) o++;
  }
  return o;
}

function qFeatures(state, myIdx, act, engine) {
  const hand = state.players[myIdx].hand;
  const freeLead = !state.currentCombo;
  let omin = 99;
  for (let i = 0; i < state.players.length; i++) {
    if (i !== myIdx && !state.players[i].finished) {
      omin = Math.min(omin, state.players[i].hand.length);
    }
  }
  const isPass = act == null;
  let afterHand = hand;
  let play = null;
  let top = 0;
  let playLen = 0;
  let cost = 0;
  let orph = 0;
  if (!isPass) {
    play = act;
    playLen = play.length;
    top = 0;
    for (const c of play) if (c.rank > top) top = c.rank;
    cost = sbc(hand, play);
    orph = orphansAfter(hand, play);
    // simulate residual hand multiset
    const used = {};
    for (const c of play) used[c.rank + ':' + c.suit] = 1;
    afterHand = hand.filter(c => !used[c.rank + ':' + c.suit]);
  } else {
    orph = orphansAfter(hand, null);
  }
  const a = analyze(afterHand);
  const isSingle = !isPass && playLen === 1;
  const isPair = !isPass && playLen === 2;
  const isMulti = !isPass && playLen >= 2;
  return [
    1,
    afterHand.length / 13,
    omin / 13,
    Math.min(2, a.twos) / 2,
    Math.min(4, a.control) / 4,
    Math.min(6, a.trash) / 6,
    Math.min(6, a.pairs) / 6,
    freeLead ? 1 : 0,
    isPass ? 1 : 0,
    isSingle ? 1 : 0,
    isPair ? 1 : 0,
    isMulti ? 1 : 0,
    top / 12,
    playLen / 13,
    Math.min(12, cost) / 12,
    Math.min(6, orph) / 6,
    hand.length ? playLen / hand.length : 0,
    afterHand.length <= 4 ? 1 : 0
  ];
}

function collectSamples(nGames) {
  const engine = require(path.join(ROOT, 'engine.js'));
  let search;
  try {
    search = require(path.join(ROOT, 'policies', CHALL + '-search.js'));
  } catch (e) {
    search = require(path.join(ROOT, 'search.js'));
  }
  const pol = search.dualRolloutPolicy || search.expertPolicy;
  const samples = [];
  if (!pol) return samples;

  for (let g = 0; g < nGames; g++) {
    const seed = 2100000000 + (crypto.randomBytes(4).readUInt32BE(0) % 800000000);
    let st = engine.createGameState(2, seed);
    const snaps = [];
    let steps = 0;
    while (!st.roundOver && steps < 240) {
      const cp = st.currentPlayer;
      if (st.players[cp].finished) break;
      const hand = st.players[cp].hand;
      const cur = st.currentCombo;
      const leg = engine.getLegalPlays(
        hand, cur, st.players[cp].passed, st.isFirstLead, st.firstLeadCard
      );
      // Record Q features for the policy action (and occasionally a random alt)
      const dec = pol(st, cp);
      let act = null;
      if (dec && dec.pass) act = null;
      else if (dec && dec.play) act = dec.play;
      snaps.push({ seat: cp, f: qFeatures(st, cp, act, engine) });

      // 20% explore: also store a random legal's features with same eventual label
      // (helps Q contrast) — labeled by game outcome for that seat
      if (leg.length > 1 && Math.random() < 0.15) {
        const alt = leg[(Math.random() * leg.length) | 0];
        snaps.push({ seat: cp, f: qFeatures(st, cp, alt, engine), explore: true });
      }

      try {
        if (act == null) st = engine.pass(st, cp);
        else st = engine.applyPlay(st, cp, act);
      } catch (e) {
        break;
      }
      if (st.isFirstLead != null) st.isFirstLead = false;
      steps++;
    }
    let winner = null;
    if (st.finishOrder && st.finishOrder.length) winner = st.finishOrder[0];
    else if (st.loser != null) winner = st.loser === 0 ? 1 : 0;
    else {
      for (let i = 0; i < st.players.length; i++) {
        if (st.players[i].finished || st.players[i].hand.length === 0) {
          winner = i;
          break;
        }
      }
    }
    if (winner == null) continue;
    for (const sn of snaps) {
      // explore alts get soft labels inverted slightly to not poison
      let y = sn.seat === winner ? 1 : 0;
      if (sn.explore) y = y === 1 ? 0.35 : 0.65; // weak opposite prior
      samples.push({ f: sn.f, y: y });
    }
  }
  return samples;
}

function main() {
  let w = emptyW();
  if (fs.existsSync(OUT)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
      if (prev.weights && prev.weights.length === FDIM) w = prev.weights.slice();
    } catch (e) { /* ignore */ }
  }
  const log = [];
  for (let r = 0; r < ROUNDS; r++) {
    const samples = collectSamples(SP_GAMES);
    if (!samples.length) {
      console.log(JSON.stringify({ round: r, skip: 'no samples' }));
      continue;
    }
    w = fit(samples, w);
    let ok = 0;
    for (const s of samples) {
      const p = predict(w, s.f);
      if ((p >= 0.5 ? 1 : 0) === (s.y >= 0.5 ? 1 : 0)) ok++;
    }
    const acc = ok / samples.length;
    log.push({ round: r, n: samples.length, acc: acc });
    console.log(JSON.stringify({
      round: r,
      n: samples.length,
      acc: +acc.toFixed(4),
      w: w.map(x => +x.toFixed(4))
    }));
    fs.writeFileSync(OUT, JSON.stringify({
      protocol: 'train-q-action-v1',
      stamped: new Date().toISOString(),
      fdim: FDIM,
      weights: w,
      acc: acc,
      n: samples.length,
      chall: CHALL,
      log: log
    }, null, 2));
  }
  console.log(JSON.stringify({ done: true, out: OUT }));
}

main();
