'use strict';
/**
 * TRAIN population league over free-lead gates (general features only).
 * Mutates pickFreeLeadHard / VALUE_LAMBDA params; scores via absolute dual vs v60
 * on fresh TRAIN seeds (never PAIR_STEP S_t). Winner freeze → policies/p_league_best-*.
 *
 *   ROUNDS=5 POP=6 GAMES=40 TRIALS=16 BASE=p_l2s48 \
 *     node evolve/train-league-fl.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const REG = path.join(ROOT, 'evolve', 'eval-registry', 'pair-steps');
const BASE = process.env.BASE || 'p_l2s48';
const ROUNDS = parseInt(process.env.ROUNDS || '5', 10);
const POP = parseInt(process.env.POP || '6', 10);
const GAMES = parseInt(process.env.GAMES || '40', 10);
const TRIALS = parseInt(process.env.TRIALS || '16', 10);
const W_MAX = Math.max(1, Math.floor((os.cpus().length || 2) / 2));
const WORKERS = Math.min(W_MAX, parseInt(process.env.WORKERS || String(W_MAX), 10));

function loadBase() {
  let se = fs.readFileSync(path.join(ROOT, 'policies', BASE + '-search.js'), 'utf8');
  se = se.replace(/require\(['"]\.\.\/engine\.js['"]\)/g, "require('./engine.js')");
  let ai = fs.readFileSync(path.join(ROOT, 'policies', BASE + '-ai.js'), 'utf8');
  ai = ai.replace(/require\(['"]\.\.\/engine\.js['"]\)/g, "require('./engine.js')");
  ai = ai.replace(/require\(['"]\.\.\/genome\.js['"]\)/g, "require('./genome.js')");
  ai = ai.replace(new RegExp("require\\(['\"]\\./" + BASE + "-search\\.js['\"]\\)"), "require('./search.js')");
  return { se: se, ai: ai };
}

function inject(se, knobs) {
  se = se.replace(/\/\* LEAGUE_KNOBS_START \*\/[\s\S]*?\/\* LEAGUE_KNOBS_END \*\//g, '');
  const block = [
    '/* LEAGUE_KNOBS_START */',
    '  var LEAGUE = ' + JSON.stringify(knobs) + ';',
    '/* LEAGUE_KNOBS_END */'
  ].join('\n');
  // After VALUE_LAMBDA if present
  if (se.indexOf('var VALUE_LAMBDA') >= 0) {
    se = se.replace(
      /var VALUE_LAMBDA = [0-9.]+;/,
      'var VALUE_LAMBDA = (typeof LEAGUE!=="undefined"&&LEAGUE.lambda!=null?LEAGUE.lambda:0.22);'
    );
  }
  // Inject LEAGUE near dualRollout
  const anchor = 'function dualRolloutPolicy(state, cp) {';
  if (se.indexOf(anchor) < 0) throw new Error('no dualRollout');
  if (se.indexOf('LEAGUE_KNOBS_START') < 0) {
    se = se.replace(anchor, block + '\n  ' + anchor);
  }

  // Patch low-pair pin thresholds if present
  se = se.replace(
    /if \(info\.hasControl && handLen >= \d+\) \{\s*\n\s*var lowPairs = \[\];/,
    'if (info.hasControl && handLen >= (typeof LEAGUE!=="undefined"&&LEAGUE.pairHand||9)) {\n      var lowPairs = [];'
  );
  se = se.replace(
    /if \(multi\[i\]\.length === 2 && topRank\(multi\[i\]\) <= \d+ && !playHasTwo\(multi\[i\]\)\)/g,
    'if (multi[i].length === 2 && topRank(multi[i]) <= (typeof LEAGUE!=="undefined"&&LEAGUE.pairTop||6) && !playHasTwo(multi[i]))'
  );
  // Trash rank max
  se = se.replace(
    /isTrashSinglePlay\(legals\[i\], info\) && legals\[i\]\[0\]\.rank <= \d+/g,
    'isTrashSinglePlay(legals[i], info) && legals[i][0].rank <= (typeof LEAGUE!=="undefined"&&LEAGUE.trashMax||6)'
  );
  // Soft window
  se = se.replace(
    /if \(rateV > bestRate \+ 0\.\d+\) \{/g,
    'if (rateV > bestRate + (typeof LEAGUE!=="undefined"&&LEAGUE.softWin!=null?LEAGUE.softWin:0.03)) {'
  );
  se = se.replace(
    /\} else if \(Math\.abs\(rateV - bestRate\) <= 0\.\d+\) \{/g,
    '} else if (Math.abs(rateV - bestRate) <= (typeof LEAGUE!=="undefined"&&LEAGUE.softWin!=null?LEAGUE.softWin:0.03)) {'
  );
  return se;
}

function writeCandidate(tag, knobs, base) {
  let se = inject(base.se, knobs);
  let ai = base.ai;
  // Write as live temporarily then freeze
  fs.writeFileSync(path.join(ROOT, 'search.js'), se);
  // Fix require for live
  se = se.replace(/require\(['"]\.\/engine\.js['"]\)/g, "require('./engine.js')");
  fs.writeFileSync(path.join(ROOT, 'search.js'), se);
  // ai already points to search
  const r = spawnSync(process.execPath, [path.join(ROOT, 'evolve', 'freeze-live.js'), tag, 'league-' + tag], {
    cwd: ROOT, encoding: 'utf8'
  });
  if (r.status !== 0) throw new Error('freeze ' + tag + ' ' + (r.stderr || r.stdout || '').slice(-200));
}

function dualWR(tag) {
  const out = path.join(REG, 'league-' + tag + '.json');
  const env = Object.assign({}, process.env, {
    CHALL: tag, FREEZE: 'v60', GAMES: String(GAMES), TRIALS: String(TRIALS),
    SOFT: '0', MS: '0', BOTH_SEATS: '1', SKIP_IDENTITY: '1', WORKERS: String(WORKERS), OUT: out
  });
  spawnSync(process.execPath, [path.join(ROOT, 'evolve', 'fresh-seed-fair-dual.js')], {
    cwd: ROOT, env: env, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024
  });
  if (!fs.existsSync(out)) return { wr: 0, wins: 0, games: 0 };
  const j = JSON.parse(fs.readFileSync(out, 'utf8'));
  const a = j.summary.challA, b = j.summary.challB;
  const wins = a.wins + b.wins, games = a.games + b.games;
  return { wr: games ? wins / games : 0, wins: wins, games: games };
}

function randKnobs(base) {
  const j = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  const f = function (a, b) { return a + Math.random() * (b - a); };
  return {
    lambda: base ? Math.max(0.12, Math.min(0.35, base.lambda + f(-0.04, 0.04))) : f(0.18, 0.30),
    softWin: base ? Math.max(0.02, Math.min(0.08, base.softWin + f(-0.015, 0.015))) : f(0.025, 0.05),
    pairHand: base ? Math.max(7, Math.min(10, base.pairHand + j(-1, 1))) : j(8, 10),
    pairTop: base ? Math.max(5, Math.min(8, base.pairTop + j(-1, 1))) : j(5, 7),
    trashMax: base ? Math.max(5, Math.min(8, base.trashMax + j(-1, 1))) : j(5, 7)
  };
}

function main() {
  const base = loadBase();
  // Restore live from base first
  fs.writeFileSync(path.join(ROOT, 'search.js'), base.se);
  fs.writeFileSync(path.join(ROOT, 'ai.js'), base.ai);

  let best = { knobs: { lambda: 0.22, softWin: 0.03, pairHand: 9, pairTop: 6, trashMax: 6 }, wr: 0 };
  // baseline
  writeCandidate('p_lg_base', best.knobs, base);
  best = Object.assign({ tag: 'p_lg_base' }, dualWR('p_lg_base'), { knobs: best.knobs });
  console.log(JSON.stringify({ base: best.wr, knobs: best.knobs }));

  const log = [{ tag: 'p_lg_base', wr: best.wr, knobs: best.knobs }];

  for (let r = 0; r < ROUNDS; r++) {
    const cands = [];
    for (let p = 0; p < POP; p++) {
      const kn = randKnobs(best.knobs);
      const tag = 'p_lg_r' + r + 'p' + p;
      try {
        writeCandidate(tag, kn, base);
        const sc = dualWR(tag);
        cands.push({ tag: tag, knobs: kn, wr: sc.wr, wins: sc.wins, games: sc.games });
        console.log(JSON.stringify({ round: r, tag: tag, wr: sc.wr, knobs: kn }));
      } catch (e) {
        console.log(JSON.stringify({ round: r, tag: tag, err: String(e.message || e) }));
      }
    }
    cands.sort(function (a, b) { return b.wr - a.wr; });
    if (cands.length && cands[0].wr > best.wr) {
      best = cands[0];
      console.log(JSON.stringify({ newBest: true, wr: best.wr, knobs: best.knobs, tag: best.tag }));
    }
    log.push({ round: r, best: best, cands: cands.map(function (c) { return { tag: c.tag, wr: c.wr }; }) });
  }

  // Write best as p_league_best freeze already exists; copy to p_league_best
  if (best.tag) {
    fs.copyFileSync(path.join(ROOT, 'policies', best.tag + '-search.js'), path.join(ROOT, 'policies', 'p_league_best-search.js'));
    fs.copyFileSync(path.join(ROOT, 'policies', best.tag + '-ai.js'), path.join(ROOT, 'policies', 'p_league_best-ai.js'));
    // Install as live
    let se = fs.readFileSync(path.join(ROOT, 'policies', 'p_league_best-search.js'), 'utf8');
    se = se.replace(/require\(['"]\.\.\/engine\.js['"]\)/g, "require('./engine.js')");
    fs.writeFileSync(path.join(ROOT, 'search.js'), se);
    let ai = fs.readFileSync(path.join(ROOT, 'policies', 'p_league_best-ai.js'), 'utf8');
    ai = ai.replace(/require\(['"]\.\.\/engine\.js['"]\)/g, "require('./engine.js')");
    ai = ai.replace(/require\(['"]\.\.\/genome\.js['"]\)/g, "require('./genome.js')");
    ai = ai.replace(/require\(['"]\.\/p_league_best-search\.js['"]\)/g, "require('./search.js')");
    ai = ai.replace(/require\(['"]\.\/p_lg_[^'"]+-search\.js['"]\)/g, "require('./search.js')");
    fs.writeFileSync(path.join(ROOT, 'ai.js'), ai);
  }

  const out = path.join(ROOT, 'evolve', 'eval-registry', 'league-fl-log.json');
  fs.writeFileSync(out, JSON.stringify({ protocol: 'train-league-fl-v1', best: best, log: log, stamped: new Date().toISOString() }, null, 2));
  console.log(JSON.stringify({ done: true, bestWR: best.wr, bestKnobs: best.knobs, tag: best.tag, out: out }));
}

main();
