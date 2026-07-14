'use strict';
/**
 * Fair dual ladder orchestrator: promote through 0.1 rungs until v11.0.
 *
 * For each rung:
 *   1. ship-convert-rung.js vs current FREEZE on a NEW seed set S
 *   2. On pass: promote-bank-to-live.js (bank → live + freeze stamp)
 *   3. Advance freeze tag
 *
 *   node evolve/ladder-to-v11.js
 *
 * Env:
 *   START_FROM=v9.9   (first rung id to ship; default next after live AI_BUILD)
 *   TARGET=v11.0
 *   MAX_PACKS=28
 *   FREEZE_OVERRIDE=v98  (optional; else derived from START_FROM - 0.1)
 *   SOFT=0 MS=0 TRIALS=20 GAMES=25 BOTH_SEATS=1 (passed through)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SCRATCH = process.env.SCRATCH ||
  '/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-7f76e5fc4524/implementer';

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
ensureDir(SCRATCH);

function parseRung(id) {
  const m = String(id).replace(/^v/, '').match(/^(\d+)\.(\d+)$/);
  if (!m) throw new Error('bad rung ' + id);
  return { maj: +m[1], min: +m[2], id: 'v' + m[1] + '.' + m[2] };
}

function nextRung(r) {
  let maj = r.maj, min = r.min + 1;
  if (min === 10) { maj++; min = 0; }
  return parseRung(maj + '.' + min);
}

function prevRung(r) {
  let maj = r.maj, min = r.min - 1;
  if (min < 0) { maj--; min = 9; }
  return parseRung(maj + '.' + min);
}

/** freeze tag: v9.8 → v98, v10.0 → v100, v11.0 → v110 */
function freezeTag(r) {
  return 'v' + r.maj + r.min;
}

function liveBuildId() {
  try {
    const b = require(path.join(ROOT, 'ai-build.js'));
    return (b && b.id) || (b && b.AI_BUILD && b.AI_BUILD.id) || null;
  } catch (e) {
    return null;
  }
}

function log() {
  const line = Array.prototype.slice.call(arguments).join(' ');
  console.log(line);
  fs.appendFileSync(path.join(SCRATCH, 'ladder-to-v11.log'), line + '\n');
}

function writeStatus(obj) {
  fs.writeFileSync(path.join(SCRATCH, 'ladder-status.json'), JSON.stringify(obj, null, 2));
  // lightweight STATUS.md checkpoint in repo
  const md = [
    '# STATUS — Fair dual ladder (convert-first climb active)',
    '',
    '**Updated:** ' + new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    '**Live / freeze:** **' + (obj.live || '?') + '** (`AI_BUILD.id=' + (obj.live || '?') + '`)',
    '**SoftN:** **DEAD**',
    '**Ship protocol:** convert-first on ship S · MS=0 TRIALS=20 SOFT=0 · fresh dual identity control',
    '',
    '## Goal status: ' + (obj.done ? 'COMPLETE — live v11.0' : 'IN PROGRESS — climbing to v11.0'),
    '',
    '### Ladder progress',
    '```json',
    JSON.stringify(obj, null, 2),
    '```',
    '',
    '### SoftN',
    'FORBIDDEN',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'STATUS.md'), md);
}

function runConvert(freeze, outTag, maxPacks, baseOverride, seedSetOverride) {
  const base = baseOverride || freeze;
  const env = Object.assign({}, process.env, {
    FREEZE: freeze,
    BASE: base,
    OUT_TAG: outTag,
    MAX_PACKS: String(maxPacks),
    FORCE_SEAT_CAP: process.env.FORCE_SEAT_CAP || '16',
    SOFT: process.env.SOFT || '0',
    MS: process.env.MS || '0',
    TRIALS: process.env.TRIALS || '20',
    GAMES: process.env.GAMES || '25',
    BOTH_SEATS: process.env.BOTH_SEATS || '1'
  });
  if (seedSetOverride) {
    env.SEED_SET = seedSetOverride;
  } else {
    delete env.SEED_SET; // each new rung gets a fresh S
  }
  log('CONVERT', outTag, 'FREEZE=' + freeze, 'BASE=' + base, 'MAX_PACKS=' + maxPacks,
    seedSetOverride ? 'SEED_SET=' + seedSetOverride : 'NEW_S');
  const logPath = path.join(SCRATCH, 'ship-' + outTag + '.log');
  const r = spawnSync('node', ['evolve/ship-convert-rung.js'], {
    cwd: ROOT,
    env: env,
    encoding: 'utf8',
    maxBuffer: 80 * 1024 * 1024
  });
  fs.writeFileSync(logPath, (r.stdout || '') + (r.stderr || ''));
  const reportPath = path.join(ROOT, 'evolve', 'ship-rung-' + outTag + '.json');
  if (!fs.existsSync(reportPath)) {
    log('MISSING report', reportPath, 'status', r.status);
    return { passed: false, chall: base, reportPath: null, logPath: logPath };
  }
  const rep = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  log('CONVERT done', outTag, 'passed', rep.passed, 'chall', rep.chall,
    'A', rep.primary && rep.primary.summary && rep.primary.summary.challA.wins,
    'B', rep.primary && rep.primary.summary && rep.primary.summary.challB.wins);
  return {
    passed: !!rep.passed,
    chall: rep.chall,
    reportPath: reportPath,
    logPath: logPath,
    report: rep,
    seedSetPath: rep.seedSetPath
  };
}

function promote(bank, rungId, tag) {
  log('PROMOTE', bank, rungId, tag);
  const out = execFileSync('node', ['evolve/promote-bank-to-live.js', bank, rungId, tag], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  log(out.trim());
  return JSON.parse(out);
}

// ── determine start ──
const target = parseRung(process.env.TARGET || 'v11.0');
const liveId = liveBuildId() || 'v9.8';
let start;
if (process.env.START_FROM) {
  start = parseRung(process.env.START_FROM);
} else {
  start = nextRung(parseRung(liveId));
}

const maxPacks = parseInt(process.env.MAX_PACKS || '28', 10);
const history = [];

log('=== ladder-to-v11 start', new Date().toISOString(), 'live', liveId, 'start', start.id, 'target', target.id);

let cur = start;
while (true) {
  const prev = prevRung(cur);
  const freeze = process.env.FREEZE_OVERRIDE && cur.id === start.id
    ? process.env.FREEZE_OVERRIDE
    : freezeTag(prev);
  const nextFreeze = freezeTag(cur);
  // ensure freeze policy exists
  if (!fs.existsSync(path.join(ROOT, 'policies', freeze + '-ai.js'))) {
    log('ERROR missing freeze policies/' + freeze + '-ai.js');
    writeStatus({ live: liveBuildId(), error: 'missing freeze ' + freeze, history: history, done: false });
    process.exit(3);
  }

  let outTag = 'p_r' + cur.maj + cur.min + '_' + Date.now().toString(36).slice(-4);
  writeStatus({
    live: liveBuildId(),
    climbing: cur.id,
    freeze: freeze,
    outTag: outTag,
    history: history,
    done: false
  });

  // Attempt convert; on stall, resume same S from best bank with more packs (up to 3 attempts)
  let res = runConvert(freeze, outTag, maxPacks);
  let attempts = 1;
  while (!res.passed && attempts < 3 && res.chall && res.chall !== freeze) {
    attempts++;
    const resumeTag = outTag + 'r' + attempts;
    log('RESUME attempt', attempts, 'BASE', res.chall, 'S', res.seedSetPath);
    res = runConvert(freeze, resumeTag, maxPacks + 10 * attempts, res.chall, res.seedSetPath);
    outTag = resumeTag;
  }

  history.push({
    rung: cur.id,
    freeze: freeze,
    outTag: outTag,
    chall: res.chall,
    passed: res.passed,
    attempts: attempts,
    reportPath: res.reportPath,
    seedSetPath: res.seedSetPath,
    A: res.report && res.report.primary && res.report.primary.summary.challA.wins,
    B: res.report && res.report.primary && res.report.primary.summary.challB.wins,
    dA: res.report && res.report.primary && res.report.primary.summary.deltaA,
    dB: res.report && res.report.primary && res.report.primary.summary.deltaB
  });

  if (!res.passed) {
    log('STALL at', cur.id, 'best', res.chall, '— not promoting');
    writeStatus({
      live: liveBuildId(),
      stalledAt: cur.id,
      bestBank: res.chall,
      freeze: freeze,
      history: history,
      done: false,
      note: 'Convert failed to reach 36/36 on new S within MAX_PACKS; resume with BASE=best bank'
    });
    process.exit(2);
  }

  // dual-rerun already done inside ship-convert-rung; promote
  promote(res.chall, cur.id, nextFreeze);

  // verify live id
  const nowLive = liveBuildId();
  if (nowLive !== cur.id) {
    log('WARN live id after promote', nowLive, 'expected', cur.id);
  }

  history[history.length - 1].promoted = true;
  history[history.length - 1].freezeTag = nextFreeze;

  if (cur.maj === target.maj && cur.min === target.min) {
    log('=== REACH TARGET', cur.id);
    writeStatus({ live: liveBuildId(), history: history, done: true, target: target.id });
    process.exit(0);
  }
  cur = nextRung(cur);
}
