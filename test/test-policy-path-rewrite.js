'use strict';
/**
 * Freeze / restore path rewrites must keep dual freezes on policy search
 * and product live on browser-safe _loadNode (no require under window).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const P = require('../evolve/policy-path-rewrite');

// ── Unit: rewrite helpers ──
const liveSnippet = [
  "function _loadNode(path) { return require(path); }",
  "const engine = (typeof window !== 'undefined') ? (window.TienLenEngine || {}) : (_loadNode('./engine.js') || {});",
  "const genomeMod = (typeof window !== 'undefined') ? (window.TienLenGenome || null) : _loadNode('./genome.js');",
  "const searchMod = (typeof window !== 'undefined') ? (window.TienLenSearch || null) : _loadNode('./search.js');"
].join('\n');

const frozen = P.liveToFreezeAi(liveSnippet, 'p_test99');
assert(frozen.indexOf("_loadNode('./p_test99-search.js')") >= 0, 'freeze must rewrite _loadNode search to tag');
assert(frozen.indexOf("_loadNode('./search.js')") < 0, 'freeze must not keep live ./search.js');
assert(frozen.indexOf("_loadNode('../engine.js')") >= 0, 'freeze engine goes up to repo root');
P.assertFrozenAi(frozen, 'p_test99');

const back = P.freezeToLiveAi(frozen);
assert(back.indexOf("_loadNode('./search.js')") >= 0, 'restore must map tag-search → ./search.js');
assert(back.indexOf("_loadNode('./engine.js')") >= 0, 'restore engine to live');
assert(back.indexOf('p_test99-search') < 0, 'restore must drop tag-search name');

// Classic require pattern still works
const classic = "const s = require('./search.js'); const e = require('./engine.js');";
const cf = P.liveToFreezeAi(classic, 'p_x');
assert(cf.indexOf("require('./p_x-search.js')") >= 0);
P.assertFrozenAi(cf, 'p_x');

// assertFrozenAi rejects live pointer
let threw = false;
try {
  P.assertFrozenAi("_loadNode('./search.js')", 'p_bad');
} catch (e) {
  threw = true;
}
assert(threw, 'assertFrozenAi must reject ./search.js');

// Product live must pass safety check
const liveAi = fs.readFileSync(path.join(ROOT, 'ai.js'), 'utf8');
P.assertProductLiveAi(liveAi);

// ── Integration: freeze-live.js validates ──
const tag = 'p_path_rewrite_smoke';
const r = spawnSync(process.execPath, [path.join(ROOT, 'evolve', 'freeze-live.js'), tag, 'v-test-path'], {
  cwd: ROOT,
  encoding: 'utf8'
});
assert.strictEqual(r.status, 0, 'freeze-live should succeed: ' + (r.stderr || r.stdout));
const outAi = fs.readFileSync(path.join(ROOT, 'policies', tag + '-ai.js'), 'utf8');
P.assertFrozenAi(outAi, tag);
assert(outAi.indexOf("_loadNode('./" + tag + "-search.js')") >= 0 ||
  outAi.indexOf("require('./" + tag + "-search.js')") >= 0);

// Dual can require frozen ai and get a real searchMove
const polAi = require(path.join(ROOT, 'policies', tag + '-ai.js'));
assert(polAi && typeof polAi.getAIMove === 'function', 'frozen ai exports getAIMove');
assert(polAi.search && typeof polAi.search.searchMove === 'function',
  'frozen ai must bind policy search (not null) — dual WR depends on this');

// Cleanup smoke freeze files
try {
  fs.unlinkSync(path.join(ROOT, 'policies', tag + '-ai.js'));
  fs.unlinkSync(path.join(ROOT, 'policies', tag + '-search.js'));
} catch (e) { /* ok */ }

// ── Bank scan: no p_l2s* freeze may point at live ./search.js via _loadNode ──
const polDir = path.join(ROOT, 'policies');
const bad = [];
fs.readdirSync(polDir).forEach(function (name) {
  if (!/^p_l2s\d+-ai\.js$/.test(name)) return;
  const t = fs.readFileSync(path.join(polDir, name), 'utf8');
  if (/_loadNode\(['"]\.\/search\.js['"]\)/.test(t) || /require\(['"]\.\/search\.js['"]\)/.test(t)) {
    bad.push(name);
  }
});
assert.strictEqual(bad.length, 0, 'p_l2s* freezes must not load live ./search.js: ' + bad.join(', '));

console.log('OK test-policy-path-rewrite');
