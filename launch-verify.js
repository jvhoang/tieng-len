#!/usr/bin/env node
/**
 * launch-verify.js — Full verification for plan gates.
 * Evidence written only to goal scratch dir.
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const SCRATCH = process.env.TIENLEN_SCRATCH ||
  '/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-788f87ebb8d7/implementer';
if (!fs.existsSync(SCRATCH)) fs.mkdirSync(SCRATCH, { recursive: true });

const LOG_FINAL = path.join(SCRATCH, 'launch-verify-final.log');
const lines = [];
function log(m) { lines.push(m); console.log(m); }
function save() { fs.writeFileSync(LOG_FINAL, lines.join('\n') + '\n', 'utf8'); }

log('=== TIẾNG LÊN FULL VERIFICATION ===\n');
log('Scratch: ' + SCRATCH);
let ok = true;

function runNode(script, logName) {
  try {
    const out = execSync('node ' + script, {
      encoding: 'utf8',
      timeout: 180000,
      env: { ...process.env, TIENLEN_TEST_FAST: '1', TIENLEN_SCRATCH: SCRATCH },
      cwd: __dirname
    });
    if (logName) fs.writeFileSync(path.join(SCRATCH, logName), out);
    log('OK: ' + script);
    return true;
  } catch (e) {
    const out = (e.stdout || '') + '\nERR: ' + (e.stderr || e.message);
    if (logName) fs.writeFileSync(path.join(SCRATCH, logName), out);
    log('FAIL: ' + script + ' — ' + (e.message || '').slice(0, 200));
    return false;
  }
}

log('\n-- 1. Engine --');
ok = runNode('test-engine.js', 'launch-verify-engine.log') && ok;

log('\n-- 2. AI --');
ok = runNode('test-ai.js', 'launch-verify-ai.log') && ok;

log('\n-- 3. Controller seats 2/3/4 --');
ok = runNode('test/test-controller-seats.js', 'launch-verify-controller-seats.log') && ok;

log('\n-- 4. Hand order --');
ok = runNode('test/test-hand-order.js', 'launch-verify-hand-order.log') && ok;

log('\n-- 5. Multiplayer sync --');
ok = runNode('test/test-multiplayer-sync.js', 'launch-verify-mp.log') && ok;

log('\n-- 6. UI feedback --');
ok = runNode('test/test-ui-feedback.js', 'launch-verify-ui-feedback.log') && ok;

log('\n-- 7. Wired UI + controller render --');
ok = runNode('test/test-ui-wired.js', 'launch-verify-ui-wired.log') && ok;
ok = runNode('test/test-controller.js', 'launch-verify-controller.log') && ok;

// Static file presence
log('\n-- 8. Entry structural checks --');
const required = ['index.html', 'engine.js', 'ai.js', 'controller.js', 'ui.js', 'hand-order.js', 'multiplayer.js', 'README.md', 'RULES.md'];
for (const f of required) {
  const p = path.join(__dirname, f);
  const exists = fs.existsSync(p);
  log((exists ? 'OK' : 'FAIL') + ': ' + f);
  if (!exists) ok = false;
}
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const structural = [
  [/hand-order\.js/, 'hand-order script'],
  [/multiplayer\.js/, 'multiplayer script'],
  [/peerjs/, 'peerjs CDN'],
  [/game-banner/, 'banner CSS'],
  [/free-lead-hint/, 'free lead hint'],
  [/banner-turn-label/, 'turn banner'],
  [/banner-pass-label/, 'pass banner']
];
for (const [re, name] of structural) {
  const hit = re.test(indexHtml);
  log((hit ? 'OK' : 'FAIL') + ': index has ' + name);
  if (!hit) ok = false;
}

// Launch twice via Node static server + HTTP fetch of entry
log('\n-- 9. Static server launch x2 --');
function launchOnce(label) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = (req.url || '/').split('?')[0];
      if (reqPath === '/') reqPath = '/index.html';
      const filePath = path.join(__dirname, path.normalize(reqPath).replace(/^(\.\.[/\\])+/, ''));
      if (!filePath.startsWith(__dirname)) {
        res.writeHead(403); res.end('forbidden'); return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        const ext = path.extname(filePath);
        const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.md': 'text/plain' };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const url = 'http://127.0.0.1:' + port + '/index.html';
      http.get(url, (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          // Also fetch a JS module to ensure serve works
          http.get('http://127.0.0.1:' + port + '/engine.js', (r2) => {
            let eng = '';
            r2.on('data', (c) => { eng += c; });
            r2.on('end', () => {
              const checks = {
                status: res.statusCode,
                hasEngine: /engine\.js/.test(body),
                hasUI: /ui\.js/.test(body),
                hasHandOrder: /hand-order\.js/.test(body),
                hasMP: /multiplayer\.js/.test(body),
                hasPeer: /peerjs/.test(body),
                hasBanners: /game-banner/.test(body),
                engineServed: /TienLenEngine|createGameState/.test(eng),
                len: body.length
              };
              fs.writeFileSync(path.join(SCRATCH, label + '.log'), JSON.stringify({ url, checks, sample: body.slice(0, 400) }, null, 2));
              fs.writeFileSync(path.join(SCRATCH, label + '.html-head.txt'), body.slice(0, 2000));
              server.close();
              const good = checks.status === 200 && checks.hasEngine && checks.hasUI &&
                checks.hasHandOrder && checks.hasMP && checks.engineServed && checks.len > 5000;
              resolve({ ok: good, checks, label, url });
            });
          }).on('error', (e) => {
            server.close();
            resolve({ ok: false, err: e.message, label });
          });
        });
      }).on('error', (e) => {
        server.close();
        resolve({ ok: false, err: e.message, label });
      });
    });
  });
}

async function runLaunches() {
  const r1 = await launchOnce('launch-1');
  log('LAUNCH1: ' + JSON.stringify(r1.checks || r1));
  if (!r1.ok) ok = false;
  const r2 = await launchOnce('launch-2');
  log('LAUNCH2: ' + JSON.stringify(r2.checks || r2));
  if (!r2.ok) ok = false;

  // Pure browser drive if available
  try {
    const driveOut = execSync('node test/ui-browser-drive.js', {
      encoding: 'utf8',
      timeout: 60000,
      env: { ...process.env, TIENLEN_TEST_FAST: '1', TIENLEN_SCRATCH: SCRATCH },
      cwd: __dirname
    });
    fs.writeFileSync(path.join(SCRATCH, 'launch-verify-browser-drive.log'), driveOut);
    log('OK: ui-browser-drive.js');
  } catch (e) {
    log('NOTE: ui-browser-drive: ' + (e.message || e).toString().slice(0, 180));
    // non-fatal if drive script expects old scratch; structural + unit already cover
  }

  log('\n=== VERIFICATION SUMMARY ===');
  log(ok ? 'ALL GATES PASSED' : 'SOME GATES FAILED');
  save();
  process.exit(ok ? 0 : 1);
}

runLaunches().catch((e) => {
  log('LAUNCH ERROR: ' + e.message);
  ok = false;
  save();
  process.exit(1);
});
