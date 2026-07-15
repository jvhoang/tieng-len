'use strict';
/**
 * TRAIN-only linear value learner (AlphaZero-lite features).
 * Self-play / dual vs freeze on fresh TRAIN seeds; fit V(s) → P(win).
 * Writes evolve/eval-registry/value-weights.json + optionally injects into live search.
 *
 *   ROUNDS=6 GAMES=40 TRIALS=16 WORKERS=9 FREEZE=v60 \
 *     node evolve/train-value-selfplay.js
 *
 * Forbidden: PAIR_STEP / CERT seed residual packaging.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const REG = path.join(ROOT, 'evolve', 'eval-registry');
const OUT_W = path.join(REG, 'value-weights.json');
const FREEZE = process.env.FREEZE || 'v60';
const CHALL = process.env.CHALL || 'p_l2s9';
const ROUNDS = parseInt(process.env.ROUNDS || '5', 10);
const GAMES = parseInt(process.env.GAMES || '40', 10);
const TRIALS = parseInt(process.env.TRIALS || '16', 10);
const W_MAX = Math.max(1, Math.floor((os.cpus().length || 2) / 2));
const WORKERS = Math.min(W_MAX, parseInt(process.env.WORKERS || String(W_MAX), 10));
const LR = parseFloat(process.env.LR || '0.08');
const EPOCHS = parseInt(process.env.EPOCHS || '12', 10);

// Feature layout (public + own hand structure only — imperfect-info safe)
// [bias, handLen/13, omin/13, twos/2, control/4, trash/6, pairs/6,
//  hasCur, curTop/12, freeLead, afterLead, midgame, endgame]
const FDIM = 13;

function emptyW() {
  const w = new Array(FDIM).fill(0);
  w[0] = 0.0; // bias logit ~0.5
  return w;
}

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

/**
 * Extract features from a dual result game log if present; else synthetic from summary.
 * Prefer loading per-game traces from dual OUT when available.
 */
function featuresFromHandLens(handLen, omin, twos, control, trash, pairs, curTop, freeLead) {
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
    handLen <= 5 ? 1 : 0
  ];
}

function fitLogistic(samples, w0) {
  const w = w0.slice();
  for (let ep = 0; ep < EPOCHS; ep++) {
    // shuffle
    for (let i = samples.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = samples[i];
      samples[i] = samples[j];
      samples[j] = t;
    }
    for (const s of samples) {
      const p = predict(w, s.f);
      const err = s.y - p;
      for (let k = 0; k < FDIM; k++) {
        w[k] += LR * err * s.f[k];
      }
    }
  }
  return w;
}

function dualCollect() {
  const out = path.join(REG, 'pair-steps', 'train-value-dual-' + Date.now() + '.json');
  const env = Object.assign({}, process.env, {
    CHALL: CHALL,
    FREEZE: FREEZE,
    GAMES: String(GAMES),
    TRIALS: String(TRIALS),
    SOFT: '0',
    MS: '0',
    BOTH_SEATS: '1',
    SKIP_IDENTITY: '1',
    WORKERS: String(WORKERS),
    OUT: out
  });
  spawnSync(process.execPath, [path.join(ROOT, 'evolve', 'fresh-seed-fair-dual.js')], {
    cwd: ROOT,
    env: env,
    encoding: 'utf8',
    maxBuffer: 80 * 1024 * 1024
  });
  if (!fs.existsSync(out)) throw new Error('missing dual ' + out);
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}

/**
 * Build weak samples from dual game results using only public outcome + seat.
 * Richer mid-game traces would need engine instrumentation; this still learns
 * open-hand prior by seat from win/loss (coarse but legal TRAIN signal).
 */
function samplesFromDual(dual) {
  const samples = [];
  const games = dual.games || dual.results || [];
  // Support multiple dual report shapes
  const list = Array.isArray(games) ? games : [];
  if (list.length) {
    for (const g of list) {
      const win = g.challWin === true || g.win === true || g.winner === 'chall' ? 1 : 0;
      const seat = g.seat != null ? g.seat : 0;
      // Proxy open features from seed hash mix (deterministic weak prior) — prefer real fields
      const handLen = g.handLen0 != null ? g.handLen0 : 13;
      const omin = g.handLen1 != null ? g.handLen1 : 13;
      samples.push({
        f: featuresFromHandLens(handLen, omin, g.twos || 1, g.control || 2, g.trash || 2, g.pairs || 2, -1, true),
        y: win
      });
      // Seat-symmetric: invert
      samples.push({
        f: featuresFromHandLens(omin, handLen, g.twosOpp || 1, 2, 2, 2, -1, true),
        y: 1 - win
      });
    }
  }
  // Fallback: aggregate WR only → one global bias sample (still moves bias)
  if (!samples.length && dual.summary) {
    const a = dual.summary.challA || {};
    const b = dual.summary.challB || {};
    const wins = (a.wins || 0) + (b.wins || 0);
    const n = (a.games || 0) + (b.games || 0);
    const wr = n ? wins / n : 0.5;
    for (let i = 0; i < Math.max(20, n); i++) {
      samples.push({
        f: featuresFromHandLens(13, 13, 1, 2, 3, 2, -1, true),
        y: i / Math.max(20, n) < wr ? 1 : 0
      });
    }
  }
  return samples;
}

/**
 * Richer TRAIN: run local self-play rollouts with dualRollout to label leaf features.
 */
function selfPlaySamples(nGames) {
  const engine = require(path.join(ROOT, 'engine.js'));
  let search;
  try {
    search = require(path.join(ROOT, 'policies', CHALL + '-search.js'));
  } catch (e) {
    search = require(path.join(ROOT, 'search.js'));
  }
  const samples = [];
  const pol = search.dualRolloutPolicy || search.expertPolicy;
  if (!pol) return samples;

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
      if (by[r] === 1 && +r <= 9) trash++;
    }
    return { twos, control, trash, pairs };
  }

  for (let g = 0; g < nGames; g++) {
    const seed = 2100000000 + (crypto.randomBytes(4).readUInt32BE(0) % 800000000);
    let st = engine.createGameState(2, seed);
    const snapshots = [];
    let steps = 0;
    while (!st.roundOver && steps < 240) {
      const cp = st.currentPlayer;
      if (st.players[cp].finished) break;
      const hand = st.players[cp].hand;
      const a = analyze(hand);
      let omin = 99;
      for (let i = 0; i < st.players.length; i++) {
        if (i !== cp && !st.players[i].finished) omin = Math.min(omin, st.players[i].hand.length);
      }
      const curTop = st.currentCombo && st.currentCombo.top ? st.currentCombo.top.rank : -1;
      snapshots.push({
        seat: cp,
        f: featuresFromHandLens(hand.length, omin, a.twos, a.control, a.trash, a.pairs, curTop, !st.currentCombo)
      });
      const dec = pol(st, cp);
      try {
        if (dec && dec.pass) st = engine.pass(st, cp);
        else if (dec && dec.play) st = engine.applyPlay(st, cp, dec.play);
        else st = engine.pass(st, cp);
      } catch (ePlay) {
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
        if (st.players[i].finished || st.players[i].hand.length === 0) { winner = i; break; }
      }
    }
    if (winner == null) continue;
    for (const sn of snapshots) {
      samples.push({ f: sn.f, y: sn.seat === winner ? 1 : 0 });
    }
  }
  return samples;
}

function main() {
  let w = emptyW();
  if (fs.existsSync(OUT_W)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT_W, 'utf8'));
      if (prev.weights && prev.weights.length === FDIM) w = prev.weights.slice();
    } catch (e) { /* ignore */ }
  }
  const log = [];
  for (let r = 0; r < ROUNDS; r++) {
    let samples = [];
    try {
      if (GAMES > 0) {
      const dual = dualCollect();
      samples = samples.concat(samplesFromDual(dual));
      const a = dual.summary && dual.summary.challA;
      const b = dual.summary && dual.summary.challB;
      const wins = (a && a.wins || 0) + (b && b.wins || 0);
      const n = (a && a.games || 0) + (b && b.games || 0);
      console.log(JSON.stringify({ round: r, dualWR: n ? wins / n : null, dualGames: n }));
      } else {
        console.log(JSON.stringify({ round: r, dualSkip: true }));
      }
    } catch (e) {
      console.log(JSON.stringify({ round: r, dualErr: String(e.message || e) }));
    }
    try {
      const sp = selfPlaySamples(parseInt(process.env.SP_GAMES || '80', 10));
      samples = samples.concat(sp);
      console.log(JSON.stringify({ round: r, selfPlayN: sp.length }));
    } catch (e) {
      console.log(JSON.stringify({ round: r, spErr: String(e.message || e) }));
    }
    if (!samples.length) {
      console.log(JSON.stringify({ round: r, skip: 'no samples' }));
      continue;
    }
    w = fitLogistic(samples, w);
    // train accuracy
    let ok = 0;
    for (const s of samples) {
      const p = predict(w, s.f);
      if ((p >= 0.5 ? 1 : 0) === s.y) ok++;
    }
    const acc = ok / samples.length;
    log.push({ round: r, n: samples.length, acc: acc, w: w.slice() });
    console.log(JSON.stringify({ round: r, n: samples.length, acc: acc, w: w.map(x => +x.toFixed(4)) }));
    fs.writeFileSync(OUT_W, JSON.stringify({
      protocol: 'train-value-selfplay-v1',
      stamped: new Date().toISOString(),
      fdim: FDIM,
      weights: w,
      acc: acc,
      n: samples.length,
      chall: CHALL,
      freeze: FREEZE,
      log: log
    }, null, 2));
  }
  console.log(JSON.stringify({ done: true, out: OUT_W, w: w }));
}

main();
