'use strict';
/**
 * TRAIN self-play dual search (H1 TRAIN only).
 * Mutates dualRollout numeric knobs; scores each candidate vs freeze v60 on
 * fresh TRAIN seeds (never PAIR_STEP S_t). Writes best live + policies/p_sp_best-*.
 *
 * Knobs are general (pass depth, sbc threshold, min-beat gate) — not byR fingerprints.
 *
 *   BASE=p_l2s15 ROUNDS=8 TRAIN_GAMES=50 TRIALS=20 WORKERS=9 \
 *     node evolve/train-selfplay-dual.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BASE = process.env.BASE || 'p_l2s15';
const ROUNDS = parseInt(process.env.ROUNDS || '8', 10);
const TRAIN_GAMES = parseInt(process.env.TRAIN_GAMES || '50', 10);
const TRIALS = parseInt(process.env.TRIALS || '20', 10);
const W_MAX = Math.max(1, Math.floor((os.cpus().length || 2) / 2));
const WORKERS = Math.min(W_MAX, parseInt(process.env.WORKERS || String(W_MAX), 10));
const REG = path.join(ROOT, 'evolve', 'eval-registry', 'pair-steps');

function freeze(tag, id) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'evolve', 'freeze-live.js'), tag, id], {
    cwd: ROOT, encoding: 'utf8'
  });
  if (r.status !== 0) throw new Error('freeze ' + tag + ' ' + (r.stderr || r.stdout || '').slice(-300));
}

function dualWR(chall) {
  const out = path.join(REG, 'sp-dual-' + chall + '.json');
  const env = Object.assign({}, process.env, {
    CHALL: chall, FREEZE: 'v60', GAMES: String(TRAIN_GAMES), TRIALS: String(TRIALS),
    SOFT: '0', MS: '0', BOTH_SEATS: '1', SKIP_IDENTITY: '1', WORKERS: String(WORKERS), OUT: out
  });
  spawnSync(process.execPath, [path.join(ROOT, 'evolve', 'fresh-seed-fair-dual.js')], {
    cwd: ROOT, env: env, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024
  });
  if (!fs.existsSync(out)) throw new Error('missing dual ' + out);
  const j = JSON.parse(fs.readFileSync(out, 'utf8'));
  const a = j.summary.challA, b = j.summary.challB;
  const wins = a.wins + b.wins, games = a.games + b.games;
  return { wr: games ? wins / games : 0, wins: wins, games: games };
}

function loadBase() {
  let se = fs.readFileSync(path.join(ROOT, 'policies', BASE + '-search.js'), 'utf8');
  se = se.replace(/require\(['"]\.\.\/engine\.js['"]\)/g, "require('./engine.js')");
  let ai = fs.readFileSync(path.join(ROOT, 'policies', BASE + '-ai.js'), 'utf8');
  ai = ai.replace(/require\(['"]\.\.\/engine\.js['"]\)/g, "require('./engine.js')");
  ai = ai.replace(/require\(['"]\.\.\/genome\.js['"]\)/g, "require('./genome.js')");
  ai = ai.replace(new RegExp("require\\(['\"]\\./" + BASE + "-search\\.js['\"]\\)"), "require('./search.js')");
  return { se: se, ai: ai };
}

/**
 * Inject DUAL_KNOBS object and dualRollout uses them.
 * Base dualRollout from p_l2s15 patched to read knobs.
 */
function injectKnobs(se, knobs) {
  // Strip previous injection
  se = se.replace(/\/\* DUAL_KNOBS_START \*\/[\s\S]*?\/\* DUAL_KNOBS_END \*\//g, '');
  const block = [
    '/* DUAL_KNOBS_START */',
    '  var DUAL_KNOBS = ' + JSON.stringify(knobs) + ';',
    '/* DUAL_KNOBS_END */'
  ].join('\n');
  // After analyzeHand export area — inject near top of factory after helpers
  const anchor = 'function dualRolloutPolicy(state, cp) {';
  if (se.indexOf(anchor) < 0) throw new Error('no dualRolloutPolicy');
  se = se.replace(anchor, block + '\n  ' + anchor);

  // Patch dualRollout pass line
  se = se.replace(
    /if \(handLen >= \d+ && curTop < \d+\) return \{ pass: true \}; \/\/ dual:[\s\S]*?\n/,
    ''
  );
  se = se.replace(
    /if \(handLen >= \d+ && curTop < \d+\) return \{ pass: true \};/,
    'if (handLen >= (DUAL_KNOBS.passHand||8) && curTop < (DUAL_KNOBS.passTop||10)) return { pass: true };'
  );
  // Patch sbc threshold
  se = se.replace(
    /if \(structureBreakCost\(hand, leg\[i\]\) >= \d+\) continue;/,
    'if (structureBreakCost(hand, leg[i]) >= (DUAL_KNOBS.sbcSafe||5)) continue;'
  );
  // Patch structure-safe pass minSbc
  se = se.replace(
    /if \(minSbc >= \d+ && curTop <= 10\) return \{ pass: true \};/,
    'if (minSbc >= (DUAL_KNOBS.passSbc||5) && curTop <= 10) return { pass: true };'
  );
  // BR soft window if present
  se = se.replace(
    /if \(rate > bestRate \+ 0\.\d+\) \{/,
    'if (rate > bestRate + (typeof DUAL_KNOBS!=="undefined"&&DUAL_KNOBS.softWin!=null?DUAL_KNOBS.softWin:0.02)) {'
  );
  return se;
}

function randomKnobs(rng) {
  const pick = function (arr) { return arr[(rng() * arr.length) | 0]; };
  return {
    passHand: pick([7, 8, 9, 10, 11]),
    passTop: pick([8, 9, 10, 11]),
    sbcSafe: pick([3, 4, 5, 6]),
    passSbc: pick([4, 5, 6, 7]),
    softWin: pick([0.02, 0.04, 0.06, 0.08, 0.1])
  };
}

function rngFrom(seed) {
  var s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function main() {
  try { fs.mkdirSync(REG); } catch (e) { /* ok */ }
  const base = loadBase();
  const log = [];
  let bestKnobs = { passHand: 8, passTop: 10, sbcSafe: 5, passSbc: 5, softWin: 0.02 };
  let se = injectKnobs(base.se, bestKnobs);
  let ai = base.ai.replace(/id:\s*['"][^'"]+['"]/, "id: 'sp-base'");
  fs.writeFileSync(path.join(ROOT, 'search.js'), se);
  fs.writeFileSync(path.join(ROOT, 'ai.js'), ai);
  freeze('p_sp_base', 'sp-base');
  let best = dualWR('p_sp_base');
  log.push({ tag: 'p_sp_base', wr: best.wr, knobs: bestKnobs });
  console.log(JSON.stringify({ base: best.wr, knobs: bestKnobs }));

  const rng = rngFrom(Date.now() ^ 0x9e3779b9);
  for (let r = 0; r < ROUNDS; r++) {
    // random search + hill from best
    const knobs = r % 2 === 0 ? randomKnobs(rng) : Object.assign({}, bestKnobs, randomKnobs(rng));
    // half the time perturb best
    if (r % 2 === 1) {
      knobs.passHand = bestKnobs.passHand;
      knobs.sbcSafe = bestKnobs.sbcSafe + (rng() < 0.5 ? -1 : 1);
      knobs.sbcSafe = Math.max(3, Math.min(7, knobs.sbcSafe));
    }
    se = injectKnobs(base.se, knobs);
    ai = base.ai.replace(/id:\s*['"][^'"]+['"]/, "id: 'sp-" + r + "'");
    fs.writeFileSync(path.join(ROOT, 'search.js'), se);
    fs.writeFileSync(path.join(ROOT, 'ai.js'), ai);
    const tag = 'p_sp_' + r;
    freeze(tag, 'sp-' + r);
    const res = dualWR(tag);
    log.push({ tag: tag, wr: res.wr, knobs: knobs, wins: res.wins, games: res.games });
    console.log(JSON.stringify({ round: r, wr: res.wr, knobs: knobs }));
    if (res.wr > best.wr + 0.005) {
      best = res;
      bestKnobs = knobs;
      console.log(JSON.stringify({ newBest: true, wr: best.wr }));
    }
  }

  // Write best
  se = injectKnobs(base.se, bestKnobs);
  ai = base.ai.replace(/id:\s*['"][^'"]+['"]/, "id: 'v1.0-sh-L2s-sp'");
  fs.writeFileSync(path.join(ROOT, 'search.js'), se);
  fs.writeFileSync(path.join(ROOT, 'ai.js'), ai);
  freeze('p_l2s_sp', 'v1.0-sh-L2s-sp');
  // gold check
  const g = spawnSync(process.execPath, [path.join(ROOT, 'evolve', 'run-gold-fair-suite.js')], {
    cwd: ROOT, encoding: 'utf8'
  });
  const goldOk = /Failed: 0/.test(g.stdout || '');
  const out = path.join(REG, 'train-selfplay-dual-log.json');
  fs.writeFileSync(out, JSON.stringify({
    protocol: 'train-selfplay-dual-v1',
    base: BASE,
    bestWR: best.wr,
    bestKnobs: bestKnobs,
    goldOk: goldOk,
    log: log
  }, null, 2));
  console.log(JSON.stringify({ done: true, bestWR: best.wr, bestKnobs: bestKnobs, goldOk: goldOk, out: out }));
  process.exit(goldOk ? 0 : 2);
}

main();
