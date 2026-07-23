'use strict';
/**
 * TRAIN-only dual hill-climb (H1 TRAIN layer).
 * Mutates search dual knobs, scores vs v60 on fresh TRAIN seeds (never PAIR_STEP S_t).
 * Does NOT package residuals into fingerprints.
 *
 * Usage:
 *   BASE=p_l2s15 ROUNDS=6 TRAIN_GAMES=30 TRIALS=18 WORKERS=9 \
 *     node evolve/train-dual-hillclimb.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BASE = process.env.BASE || 'p_l2s15';
const ROUNDS = parseInt(process.env.ROUNDS || '6', 10);
const TRAIN_GAMES = parseInt(process.env.TRAIN_GAMES || '30', 10);
const TRIALS = parseInt(process.env.TRIALS || '18', 10);
// Author 2026-07-22: default laptop budget ~25% (CPU_DIV=4). Override: CPU_DIV=2 for blast.
const CPU_DIV = Math.max(2, parseInt(process.env.CPU_DIV || '4', 10) || 4);
const W_MAX = Math.max(1, Math.floor((os.cpus().length || 2) / CPU_DIV));
const WORKERS = Math.min(W_MAX, parseInt(process.env.WORKERS || String(W_MAX), 10));

function freezeTag(tag, id) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'evolve', 'freeze-live.js'), tag, id], {
    cwd: ROOT, encoding: 'utf8'
  });
  if (r.status !== 0) throw new Error('freeze failed ' + tag + ' ' + (r.stderr || r.stdout));
}

function dualWR(chall) {
  const out = path.join(ROOT, 'evolve', 'eval-registry', 'pair-steps', 'train-hc-' + chall + '.json');
  const env = Object.assign({}, process.env, {
    CHALL: chall,
    FREEZE: 'v60',
    GAMES: String(TRAIN_GAMES),
    TRIALS: String(TRIALS),
    SOFT: '0',
    MS: '0',
    BOTH_SEATS: '1',
    SKIP_IDENTITY: '1',
    WORKERS: String(WORKERS),
    OUT: out
  });
  const r = spawnSync(process.execPath, [path.join(ROOT, 'evolve', 'fresh-seed-fair-dual.js')], {
    cwd: ROOT, env: env, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024
  });
  if (!fs.existsSync(out)) {
    throw new Error('dual missing ' + out + ' ' + (r.stderr || '').slice(-400));
  }
  const j = JSON.parse(fs.readFileSync(out, 'utf8'));
  const a = j.summary.challA;
  const b = j.summary.challB;
  const wins = a.wins + b.wins;
  const games = a.games + b.games;
  return { wr: games ? wins / games : 0, wins: wins, games: games, path: out };
}

function loadBaseSearch() {
  let se = fs.readFileSync(path.join(ROOT, 'policies', BASE + '-search.js'), 'utf8');
  se = se.replace(/require\(['"]\.\.\/engine\.js['"]\)/g, "require('./engine.js')");
  return se;
}

function loadBaseAi() {
  // Shared rewrites (classic require + _loadNode) for post-2026-07 freezes.
  const P = require('./policy-path-rewrite');
  return P.freezeToLiveAi(fs.readFileSync(path.join(ROOT, 'policies', BASE + '-ai.js'), 'utf8'));
}

/** Mutate dualRollout pass/contest thresholds and BR soft-tie window. */
function applyMutation(se, knobs) {
  // dual pass threshold
  se = se.replace(
    /if \(handLen >= \d+ && curTop < \d+\) return \{ pass: true \};/,
    'if (handLen >= ' + knobs.passHand + ' && curTop < ' + knobs.passTop + ') return { pass: true };'
  );
  // structure-safe threshold in dualRollout
  se = se.replace(
    /if \(structureBreakCost\(hand, leg\[i\]\) >= \d+\) continue;/,
    'if (structureBreakCost(hand, leg[i]) >= ' + knobs.sbcSafe + ') continue;'
  );
  // BR soft-tie window
  se = se.replace(
    /if \(rate > bestRate \+ 0\.\d+\) \{/,
    'if (rate > bestRate + ' + knobs.softWin + ') {'
  );
  return se;
}

function main() {
  const log = [];
  let bestSe = loadBaseSearch();
  let bestAi = loadBaseAi();
  fs.writeFileSync(path.join(ROOT, 'search.js'), bestSe);
  fs.writeFileSync(path.join(ROOT, 'ai.js'), bestAi);
  freezeTag('p_hc_base', 'hc-base');
  let best = dualWR('p_hc_base');
  log.push({ tag: 'p_hc_base', wr: best.wr, knobs: 'base' });
  console.log(JSON.stringify({ base: best }));

  const candidates = [
    { passHand: 9, passTop: 10, sbcSafe: 4, softWin: 0.06 },
    { passHand: 10, passTop: 9, sbcSafe: 5, softWin: 0.1 },
    { passHand: 8, passTop: 10, sbcSafe: 4, softWin: 0.05 },
    { passHand: 9, passTop: 9, sbcSafe: 5, softWin: 0.08 },
    { passHand: 11, passTop: 10, sbcSafe: 6, softWin: 0.04 },
    { passHand: 9, passTop: 10, sbcSafe: 3, softWin: 0.12 }
  ];

  for (let r = 0; r < Math.min(ROUNDS, candidates.length); r++) {
    const knobs = candidates[r];
    let se = applyMutation(loadBaseSearch(), knobs);
    let ai = loadBaseAi();
    const tag = 'p_hc_' + r;
    const id = 'hc-' + r;
    ai = ai.replace(/id:\s*['"][^'"]+['"]/, "id: '" + id + "'");
    fs.writeFileSync(path.join(ROOT, 'search.js'), se);
    fs.writeFileSync(path.join(ROOT, 'ai.js'), ai);
    freezeTag(tag, id);
    const res = dualWR(tag);
    log.push({ tag: tag, wr: res.wr, knobs: knobs, wins: res.wins, games: res.games });
    console.log(JSON.stringify({ round: r, tag: tag, wr: res.wr, knobs: knobs }));
    if (res.wr > best.wr + 0.01) {
      best = res;
      bestSe = se;
      bestAi = ai;
      console.log(JSON.stringify({ newBest: true, wr: best.wr }));
    }
  }

  // Write best live
  fs.writeFileSync(path.join(ROOT, 'search.js'), bestSe);
  bestAi = bestAi.replace(/id:\s*['"][^'"]+['"]/, "id: 'v1.0-sh-L2s-hc'");
  fs.writeFileSync(path.join(ROOT, 'ai.js'), bestAi);
  freezeTag('p_l2s_hc', 'v1.0-sh-L2s-hc');

  const outLog = path.join(ROOT, 'evolve', 'eval-registry', 'pair-steps', 'train-hillclimb-log.json');
  fs.writeFileSync(outLog, JSON.stringify({ protocol: 'train-dual-hillclimb-v1', log: log, bestWR: best.wr }, null, 2));
  console.log(JSON.stringify({ done: true, bestWR: best.wr, log: outLog, championTag: 'p_l2s_hc' }));
}

main();
