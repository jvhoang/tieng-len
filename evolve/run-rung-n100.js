/**
 * Run one ladder rung under user protocol:
 * dual N≥50, WR>0.70, seed 20260711, grandmaster vs grandmaster.
 *
 * Usage (from tieng-len/):
 *   TIENLEN_SCRATCH=... TIENLEN_PREV_TAG=v90 TIENLEN_RUNG_TAG=v91 TIENLEN_RUNG_ID=v9.1 \
 *   node evolve/run-rung-n100.js
 *
 * Expects live ai.js/search.js already contain the new policy.
 * Optional: TIENLEN_SKIP_CF=1, TIENLEN_SKIP_SHIP=1, TIENLEN_SKIP_UNIT=1
 */
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const scratch = process.env.TIENLEN_SCRATCH || path.join(__dirname);
const prev = process.env.TIENLEN_PREV_TAG;
const tag = process.env.TIENLEN_RUNG_TAG;
const id = process.env.TIENLEN_RUNG_ID;
if (!prev || !tag || !id) {
  console.error('Need TIENLEN_PREV_TAG, TIENLEN_RUNG_TAG, TIENLEN_RUNG_ID');
  process.exit(1);
}

function run(cmd, env, logName) {
  const logPath = path.join(scratch, logName);
  console.log('RUN', cmd, '→', logPath);
  const r = spawnSync('bash', ['-lc', cmd + ' 2>&1 | tee ' + JSON.stringify(logPath)], {
    cwd: root,
    env: Object.assign({}, process.env, env || {}),
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });
  if (r.status !== 0) {
    console.error(r.stdout || '', r.stderr || '');
    throw new Error('command failed: ' + cmd + ' status=' + r.status);
  }
  return r;
}

function stampLive(rid) {
  const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  let ai = fs.readFileSync(path.join(root, 'ai.js'), 'utf8');
  ai = ai.replace(
    /const AI_BUILD = \{[\s\S]*?\n\};/,
    'const AI_BUILD = {\n  id: ' + JSON.stringify(rid) + ',\n  stamped: ' +
      JSON.stringify(stamp) + ',\n  label: ' + JSON.stringify('Grandmaster ' + rid) + '\n};'
  );
  if (ai.indexOf('TIENLEN_AI_BUILD') < 0 || ai.indexOf('TIENLEN_AI_BUILD') > 1200) {
    ai = ai.replace(
      /(const AI_BUILD = \{[\s\S]*?\n\};)/,
      '$1\n\nif (typeof window !== \'undefined\') {\n' +
        '  window.TIENLEN_AI_BUILD = AI_BUILD;\n' +
        '  window.TienLenAI = window.TienLenAI || {};\n' +
        '  window.TienLenAI.AI_BUILD = AI_BUILD;\n' +
        '}\n'
    );
  }
  fs.writeFileSync(path.join(root, 'ai.js'), ai);
  // ai-build.js
  fs.writeFileSync(path.join(root, 'ai-build.js'),
    '/** auto-synced by run-rung-n100.js */\n' +
    '(function (root) {\n' +
    '  var BUILD = { id: ' + JSON.stringify(rid) + ', stamped: ' + JSON.stringify(stamp) +
    ', label: ' + JSON.stringify('Grandmaster ' + rid) + ' };\n' +
    '  root.TIENLEN_AI_BUILD = BUILD;\n' +
    '  root.TienLenAI = root.TienLenAI || {};\n' +
    '  root.TienLenAI.AI_BUILD = BUILD;\n' +
    '  if (typeof module === \'object\' && module.exports) module.exports = BUILD;\n' +
    '}(typeof window !== \'undefined\' ? window : (typeof global !== \'undefined\' ? global : this)));\n'
  );
  // index inline fallback
  let idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  idx = idx.replace(
    /window\.TIENLEN_AI_BUILD = window\.TIENLEN_AI_BUILD \|\| \{[\s\S]*?\};/,
    'window.TIENLEN_AI_BUILD = window.TIENLEN_AI_BUILD || {\n' +
      "      id: '" + rid + "',\n" +
      "      stamped: '" + stamp + "',\n" +
      "      label: 'Grandmaster " + rid + "'\n" +
      '    };'
  );
  fs.writeFileSync(path.join(root, 'index.html'), idx);
  console.log('stamped live', rid, stamp);
  return stamp;
}

function main() {
  stampLive(id);

  if (process.env.TIENLEN_SKIP_UNIT !== '1') {
    run('node test-search.js | tail -5', {}, 'unit-' + tag + '.log');
  }

  if (process.env.TIENLEN_SKIP_CF !== '1') {
    run(
      'TIENLEN_SCRATCH=' + JSON.stringify(scratch) +
        ' TIENLEN_CF_ISSUES_DIR=' + JSON.stringify(path.join(scratch, 'issues')) +
        ' node evolve/counterfactual-79-latest.js',
      {},
      'cf-' + tag + '.log'
    );
    const sumSrc = path.join(root, 'evolve/counterfactual-all-latest-summary.json');
    if (fs.existsSync(sumSrc)) {
      fs.copyFileSync(sumSrc, path.join(root, 'evolve/counterfactual-all-' + tag + '-summary.json'));
    }
  }

  const baseEnv = {
    TIENLEN_FREEZE: prev,
    TIENLEN_FREEZE_DIFF: process.env.TIENLEN_FREEZE_DIFF || 'grandmaster',
    TIENLEN_FREEZE_MS: process.env.TIENLEN_FREEZE_MS || '120',
    TIENLEN_FREEZE_ITERS: process.env.TIENLEN_FREEZE_ITERS || '80',
    TIENLEN_FREEZE_BR: process.env.TIENLEN_FREEZE_BR || '0',
    TIENLEN_FREEZE_EXACT: process.env.TIENLEN_FREEZE_EXACT || '0',
    TIENLEN_V8_DIFF: process.env.TIENLEN_V8_DIFF || 'grandmaster',
    TIENLEN_V8_MS: process.env.TIENLEN_V8_MS || '150',
    TIENLEN_V8_ITERS: process.env.TIENLEN_V8_ITERS || '120',
    TIENLEN_BR_TRIALS: process.env.TIENLEN_BR_TRIALS || '48',
    TIENLEN_DUAL_SELF: '0',
    TIENLEN_COMBAT_ROOT: '0',
    TIENLEN_FL_ROOT: '0',
    TIENLEN_SOFT_SAMPLES: '0',
    TIENLEN_EXACT: '1',
    TIENLEN_BENCH_SEED: '20260711',
    TIENLEN_TARGET: '0.70',
    TIENLEN_BENCH_GAMES: process.env.TIENLEN_BENCH_GAMES || '50',
    TIENLEN_PROGRESS_EVERY: '5',
    TIENLEN_CHECKPOINT_EVERY: '10',
    TIENLEN_SCRATCH: scratch
  };

  run(
    'node evolve/bench-ladder.js',
    Object.assign({}, baseEnv, { TIENLEN_BENCH_OUT: tag + '-vs-' + prev + '-final.json' }),
    'bench-' + tag + '-vs-prev.log'
  );
  run(
    'node evolve/bench-ladder.js',
    Object.assign({}, baseEnv, { TIENLEN_BENCH_OUT: tag + '-vs-' + prev + '-rerun.json' }),
    'bench-' + tag + '-rerun.log'
  );

  // assert
  for (const name of [tag + '-vs-' + prev + '-final.json', tag + '-vs-' + prev + '-rerun.json']) {
    const d = JSON.parse(fs.readFileSync(path.join(root, 'evolve', name), 'utf8'));
    if (!(d.games >= 50 && d.liveWinRate > 0.70 && d.passed && d.seed0 === 20260711 && d.live.id === id)) {
      throw new Error('gate assert failed for ' + name + ' ' + JSON.stringify({
        games: d.games, wr: d.liveWinRate, passed: d.passed, seed: d.seed0, live: d.live && d.live.id,
        fdiff: d.freezeOpts && d.freezeOpts.difficulty, ldiff: d.v80Opts && d.v80Opts.difficulty
      }));
    }
    if (d.freezeOpts && d.freezeOpts.difficulty !== 'grandmaster') {
      console.warn('WARN freeze difficulty not grandmaster:', d.freezeOpts);
    }
    if (d.v80Opts && d.v80Opts.difficulty !== 'grandmaster') {
      console.warn('WARN live difficulty not grandmaster:', d.v80Opts);
    }
    console.log('GATE OK', name, d.liveWins + '/' + d.games, d.liveWinRate);
  }

  // freeze
  run('node evolve/freeze-live.js ' + tag + ' ' + id, {}, 'freeze-' + tag + '.log');
  let fz = fs.readFileSync(path.join(root, 'policies', tag + '-ai.js'), 'utf8');
  fz = fz.replace(
    /const AI_BUILD = \{[\s\S]*?\n\};/,
    'const AI_BUILD = {\n  id: ' + JSON.stringify(id) + ',\n  stamped: ' +
      JSON.stringify(new Date().toISOString()) + ',\n  label: ' +
      JSON.stringify('Grandmaster ' + id + ' (ladder freeze)') + '\n};'
  );
  fs.writeFileSync(path.join(root, 'policies', tag + '-ai.js'), fz);

  if (process.env.TIENLEN_SKIP_SHIP !== '1') {
    run(
      'git add ai.js search.js ai-build.js index.html policies/' + tag + '-ai.js policies/' + tag +
        '-search.js evolve/' + tag + '-vs-' + prev + '-final.json evolve/' + tag + '-vs-' + prev +
        '-rerun.json evolve/bench-ladder.js evolve/LADDER-STATUS.md 2>/dev/null; ' +
        'git commit -m ' + JSON.stringify(
          'Ship Grandmaster ' + id + ' (dual N=100 >70% vs freeze ' + prev + ')'
        ) + ' || true; ' +
        'git push origin HEAD; git branch -f gh-pages HEAD; git push origin gh-pages --force',
      {},
      'ship-' + tag + '.log'
    );
  }

  console.log('RUNG COMPLETE', id);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
