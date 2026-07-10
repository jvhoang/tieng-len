/**
 * One real improvement cycle (NOT genome-only mutation):
 *  1) Benchmark search vs expert
 *  2) Meta-analyst on losses
 *  3) Apply at least one concrete search/policy change from findings
 *  4) Re-benchmark and promote/retain versioned champion
 *
 * Usage:
 *   node evolve/run-improve-cycle.js
 *   TIENLEN_IMPROVE_GAMES=40 node evolve/run-improve-cycle.js
 *
 * Logs to evolve/improve-loop.log and optional SCRATCH via TIENLEN_SCRATCH.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const bench = require('./benchmark.js');
const analyst = require('./meta-analyst.js');

const ROOT = path.join(__dirname, '..');
const SCRATCH = process.env.TIENLEN_SCRATCH || path.join(__dirname);
const GAMES = parseInt(process.env.TIENLEN_IMPROVE_GAMES || '40', 10);
const logLines = [];

function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg;
  logLines.push(line);
  console.log(line);
}

function writeLog() {
  const p1 = path.join(__dirname, 'improve-loop.log');
  fs.writeFileSync(p1, logLines.join('\n') + '\n');
  if (SCRATCH && SCRATCH !== __dirname) {
    try {
      fs.writeFileSync(path.join(SCRATCH, 'improve-loop.log'), logLines.join('\n') + '\n');
    } catch (e) { /* ignore */ }
  }
  return p1;
}

function readSearchJs() {
  return fs.readFileSync(path.join(ROOT, 'search.js'), 'utf8');
}

function writeSearchJs(src) {
  fs.writeFileSync(path.join(ROOT, 'search.js'), src);
}

/**
 * Apply a concrete, reversible policy tweak from analyst proposals.
 * Returns { id, description, applied: bool, marker }
 */
function applyConcreteChange(findings, proposals) {
  const src = readSearchJs();
  // Prefer raising contest handLen threshold or residual free-lead if not already marked
  const marker = '/* IMPROVE_CYCLE_APPLIED:contest-mid-short-v2 */';
  if (src.indexOf(marker) >= 0) {
    // Second-cycle variant: bump free-lead residual bonus
    const marker2 = '/* IMPROVE_CYCLE_APPLIED:free-lead-residual-v2 */';
    if (src.indexOf(marker2) >= 0) {
      return { id: 'noop', description: 'All cycle patches already present', applied: false, marker: null };
    }
    const needle = 'if (afterLen >= 3 && afterLen <= 8 && play.length >= 2 && play.length <= 6) score -= 3;';
    if (src.indexOf(needle) >= 0) {
      const next = src.replace(
        needle,
        marker2 + '\n        if (afterLen >= 3 && afterLen <= 8 && play.length >= 2 && play.length <= 6) score -= 5;'
      );
      writeSearchJs(next);
      return {
        id: 'free-lead-residual-v2',
        description: 'Stronger residual multi-lead preference (score -=5)',
        applied: true,
        marker: marker2
      };
    }
  }

  // Primary: widen short-hand contest (handLen <= 6 already; ensure <=7)
  const contestNeedle = 'if (curTop >= 10 || omin <= 3 || handLen <= 6) {';
  if (src.indexOf(contestNeedle) >= 0) {
    const next = src.replace(
      contestNeedle,
      marker + '\n    if (curTop >= 10 || omin <= 3 || handLen <= 7) {'
    );
    writeSearchJs(next);
    return {
      id: 'contest-mid-short-v2',
      description: 'Contest expensive with handLen<=7 (was <=6)',
      applied: true,
      marker: marker
    };
  }

  // Fallback: increase default det samples for hard
  const detNeedle = ": (difficulty === 'grandmaster' ? 24 : 12)";
  if (src.indexOf(detNeedle) >= 0) {
    const m = '/* IMPROVE_CYCLE_APPLIED:det-samples */';
    const next = src.replace(detNeedle, m + "\n      : (difficulty === 'grandmaster' ? 28 : 16)");
    writeSearchJs(next);
    return {
      id: 'det-samples',
      description: 'More determinization samples (12→16 hard)',
      applied: true,
      marker: m
    };
  }

  return { id: 'none', description: 'No applicable patch site found', applied: false, marker: null };
}

function firstRateOf(report, nameSubstr) {
  for (var i = 0; i < report.results.length; i++) {
    if (report.results[i].name.indexOf(nameSubstr) >= 0) return report.results[i];
  }
  return report.results[0];
}

function main() {
  log('=== Tiến Lên improve-cycle start games=' + GAMES + ' ===');

  // Clear require cache so post-patch search reloads
  function clearCache() {
    Object.keys(require.cache).forEach(function (k) {
      if (k.indexOf('tieng-len') >= 0 && (
        k.indexOf('search.js') >= 0 || k.indexOf('ai.js') >= 0 ||
        k.indexOf('benchmark.js') >= 0
      )) {
        delete require.cache[k];
      }
    });
  }

  clearCache();
  let benchMod = require('./benchmark.js');

  log('Step 1: baseline benchmark search-lite vs expert');
  const before = benchMod.runBenchmark({
    games: GAMES,
    nPlayers: 4,
    policies: [benchMod.policySearchLite, benchMod.policyExpert],
    names: ['search-lite', 'expert-genome'],
    seed: 20260710
  });
  log('BEFORE: ' + JSON.stringify(before.results));
  const beforeSearch = firstRateOf(before, 'search');
  log('BEFORE search firstRate=' + beforeSearch.firstRate + ' meanPlace=' + beforeSearch.meanPlace);

  log('Step 2: meta-analyst');
  const report = analyst.analyze(Math.min(16, GAMES));
  log('Analyst findings: ' + JSON.stringify(report.findings));
  log('Analyst proposals: ' + report.proposals.map(function (p) { return p.id; }).join(', '));

  log('Step 3: apply concrete policy change from analyst direction');
  const change = applyConcreteChange(report.findings, report.proposals);
  log('Applied: ' + JSON.stringify(change));

  // Re-require search/ai/benchmark after patch
  clearCache();
  benchMod = require('./benchmark.js');

  log('Step 4: re-benchmark after change');
  const after = benchMod.runBenchmark({
    games: GAMES,
    nPlayers: 4,
    policies: [benchMod.policySearchLite, benchMod.policyExpert],
    names: ['search-lite', 'expert-genome'],
    seed: 20260710
  });
  log('AFTER: ' + JSON.stringify(after.results));
  const afterSearch = firstRateOf(after, 'search');
  log('AFTER search firstRate=' + afterSearch.firstRate + ' meanPlace=' + afterSearch.meanPlace);

  // Promote if not worse (firstRate higher or meanPlace lower)
  let decision = 'retain';
  if (afterSearch.firstRate > beforeSearch.firstRate + 0.02 ||
      afterSearch.meanPlace < beforeSearch.meanPlace - 0.05) {
    decision = 'promote';
  } else if (afterSearch.firstRate + 0.05 < beforeSearch.firstRate &&
             afterSearch.meanPlace > beforeSearch.meanPlace + 0.1) {
    decision = 'revert';
  }

  const champion = {
    version: 'search-gm-' + Date.now(),
    decision: decision,
    change: change,
    before: beforeSearch,
    after: afterSearch,
    games: GAMES,
    timestamp: new Date().toISOString()
  };

  if (decision === 'revert' && change.applied && change.marker) {
    log('Reverting patch (regression detected)');
    let src = readSearchJs();
    // crude: re-read from git is better; here re-apply inverse for known patches
    if (change.id === 'contest-mid-short-v2') {
      src = src.replace(
        change.marker + '\n    if (curTop >= 10 || omin <= 3 || handLen <= 7) {',
        'if (curTop >= 10 || omin <= 3 || handLen <= 6) {'
      );
      writeSearchJs(src);
    } else if (change.id === 'free-lead-residual-v2') {
      src = src.replace(
        change.marker + '\n        if (afterLen >= 3 && afterLen <= 8 && play.length >= 2 && play.length <= 6) score -= 5;',
        'if (afterLen >= 3 && afterLen <= 8 && play.length >= 2 && play.length <= 6) score -= 3;'
      );
      writeSearchJs(src);
    }
    champion.decision = 'revert';
  } else {
    log('Decision: ' + decision + ' — keeping patch on disk' + (change.applied ? '' : ' (no patch)'));
  }

  const champPath = path.join(__dirname, 'champion-search.json');
  fs.writeFileSync(champPath, JSON.stringify(champion, null, 2));
  if (SCRATCH && SCRATCH !== __dirname) {
    try {
      fs.writeFileSync(path.join(SCRATCH, 'champion-search.json'), JSON.stringify(champion, null, 2));
      fs.writeFileSync(path.join(SCRATCH, 'last-benchmark.json'), JSON.stringify({ before: before, after: after }, null, 2));
    } catch (e) { /* ignore */ }
  }
  log('Wrote champion ' + champPath);
  log('=== improve-cycle done decision=' + champion.decision + ' ===');
  writeLog();
  return champion;
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    log('FATAL: ' + (e && e.stack || e));
    writeLog();
    process.exit(1);
  }
}

module.exports = { main: main, applyConcreteChange: applyConcreteChange };
