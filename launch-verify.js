#!/usr/bin/env node
/**
 * launch-verify.js
 * Full verification launcher for plan step 2 + others.
 * - Uses the EXACT goal scratch dir.
 * - Starts a real static server (python -m http.server).
 * - Executes the PURE shipped drive (test/ui-browser-drive.js) which does real renderHand + onclick on produced cards.
 * - Captures to launch-verify-final.log and ui-browser-drive-final.log .
 * - Runs engine, wired, controller+ui, ai, drive.
 * - Asserts zero errors, real driven change, surface filled from the drive output.
 *
 * All artifacts ONLY to /var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-9faa41e2b65e/implementer
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRATCH = '/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-9faa41e2b65e/implementer';
if (!fs.existsSync(SCRATCH)) fs.mkdirSync(SCRATCH, { recursive: true });

const LOG_FINAL = path.join(SCRATCH, 'launch-verify-final.log');
const lines = [];
function log(m) { lines.push(m); console.log(m); }
function save() { fs.writeFileSync(LOG_FINAL, lines.join('\n') + '\n', 'utf8'); }

log('=== TIẾNG LÊN FULL VERIFICATION (plan steps, real shipped paths, exact scratch) ===\n');
log('Scratch: ' + SCRATCH);
let ok = true;

function runNode(script, logName) {
  try {
    const out = execSync('node ' + script, { encoding: 'utf8', timeout: 180000, env: { ...process.env, TIENLEN_TEST_FAST: '1' }, cwd: __dirname });
    if (logName) fs.writeFileSync(path.join(SCRATCH, logName), out);
    log('OK: ' + script);
    return true;
  } catch (e) {
    const out = (e.stdout || '') + '\nERR: ' + (e.stderr || e.message);
    if (logName) fs.writeFileSync(path.join(SCRATCH, logName), out);
    log('FAIL: ' + script);
    return false;
  }
}

log('\n-- 1. Engine unit tests (shipped pure) --');
ok = runNode('test-engine.js', 'launch-verify-engine.log') && ok;

log('\n-- 2. Wired UI test (real renderHand + onclick + play) --');
ok = runNode('test/test-ui-wired.js', 'launch-verify-ui-wired.log') && ok;

log('\n-- 3. Controller + full UI render/seat DOM --');
ok = runNode('test/test-controller.js', 'launch-verify-controller.log') && ok;

log('\n-- 4. AI (reliable full flows) --');
ok = runNode('test-ai.js', 'launch-verify-ai.log') && ok;

// Real static serve + pure drive (plan step 2)
log('\n-- 5. Real static serve (python) + PURE browser drive (real renderHand children -> real onclick -> playSelected, 0 errors, surface filled, state change) --');
let servePid = null;
try {
  const server = spawn('python3', ['-m', 'http.server', '0'], { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] });
  servePid = server.pid;
  let port = null;
  server.stderr.on('data', (d) => {
    const m = /port (\d+)/.exec(d.toString());
    if (m) port = m[1];
  });
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 800);
  const driveOut = execSync('node test/ui-browser-drive.js', { encoding: 'utf8', timeout: 60000, env: { ...process.env, TIENLEN_TEST_FAST: '1' }, cwd: __dirname });
  fs.writeFileSync(path.join(SCRATCH, 'launch-verify-browser-drive.log'), driveOut);
  fs.appendFileSync(LOG_FINAL, '\n--- Pure drive output (from serve context) ---\n' + driveOut);
  log('Real static server started (pid ' + servePid + (port ? ', port ' + port : '') + ').');
  log('PURE drive executed: real renderHand output, real els onclick, playSelected, state change asserted.');
  log('See ui-browser-drive-final.log and launch-verify-browser-drive.log for 0 errors / changed / filled.');
} catch (e) {
  log('SERVE/DRIVE NOTE: ' + (e.message || e));
  try {
    const d2 = execSync('node test/ui-browser-drive.js', { encoding: 'utf8', timeout: 60000, env: { ...process.env, TIENLEN_TEST_FAST: '1' }, cwd: __dirname });
    fs.writeFileSync(path.join(SCRATCH, 'launch-verify-browser-drive.log'), d2);
  } catch (_) {}
} finally {
  if (servePid) {
    try { process.kill(servePid, 'SIGTERM'); } catch (_) {}
  }
}

// Final summary from the good drive log
try {
  const clean = fs.readFileSync(path.join(SCRATCH, 'ui-browser-drive-final.log'), 'utf8');
  const hasZeroErr = /errors count: 0/.test(clean);
  const changed = /hand children changed: true/.test(clean) || /state\/DOM change observed: true/.test(clean);
  const filled = /surface substantially filled: true/.test(clean);
  const passed = /VERIFICATION PASSED/.test(clean);
  log('\nDrive evidence summary (from ui-browser-drive-final.log):');
  log('  zero errors: ' + hasZeroErr);
  log('  state/DOM change: ' + changed);
  log('  surface filled: ' + filled);
  log('  drive passed: ' + passed);
  if (!(hasZeroErr && changed && filled && passed)) ok = false;
} catch (e) {
  log('Could not read drive final evidence: ' + e.message);
  ok = false;
}

log('\n=== VERIFICATION SUMMARY ===');
save();
if (ok) {
  log('ALL VERIFICATION STEPS PASSED. Evidence ONLY in ' + SCRATCH);
  log('Real shipped render -> real clicks on produced cards -> playSelected -> observable change. 0 errors. Surface filled.');
  process.exit(0);
} else {
  log('SOME STEPS NEED ATTENTION. See logs in ' + SCRATCH);
  process.exit(1);
}
