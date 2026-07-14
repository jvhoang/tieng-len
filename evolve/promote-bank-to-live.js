'use strict';
/**
 * Promote a policies/<bank>-{ai,search}.js bank to live ai.js + search.js,
 * stamp AI_BUILD, and freeze as policies/<tag>-*.
 *
 *   node evolve/promote-bank-to-live.js p_r98e_p10 v9.8 v98
 *
 * SoftN stays forbidden. Does not git commit/push.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const bank = process.argv[2];
const rid = process.argv[3] || 'v9.8';
const tag = process.argv[4] || 'v98';
if (!bank) {
  console.error('Usage: node evolve/promote-bank-to-live.js <bankTag> [rungId] [freezeTag]');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const bankAi = path.join(ROOT, 'policies', bank + '-ai.js');
const bankSe = path.join(ROOT, 'policies', bank + '-search.js');
if (!fs.existsSync(bankAi) || !fs.existsSync(bankSe)) {
  console.error('missing bank', bankAi, bankSe);
  process.exit(1);
}

function bankToLiveSearch(src) {
  return src
    .replace(/require\(['"]\.\.\/engine\.js['"]\)/g, "require('./engine.js')")
    .replace(/require\(['"]\.\.\/genome\.js['"]\)/g, "require('./genome.js')");
}

function bankToLiveAi(src, searchName) {
  let ai = src
    .replace(/require\(['"]\.\.\/engine\.js['"]\)/g, "require('./engine.js')")
    .replace(/require\(['"]\.\.\/genome\.js['"]\)/g, "require('./genome.js')")
    .replace(/require\(['"]\.\/[^'"]+-search\.js['"]\)/g, "require('./search.js')");
  const build = 'const AI_BUILD = {\n  id: ' + JSON.stringify(rid) + ',\n  stamped: ' +
    JSON.stringify(stamp) + ',\n  label: ' + JSON.stringify('Grandmaster ' + rid) + '\n};';
  if (/const AI_BUILD = \{[\s\S]*?\n\};/.test(ai)) {
    ai = ai.replace(/const AI_BUILD = \{[\s\S]*?\n\};/, build);
  }
  return ai;
}

function liveToFreezeAi(src, freezeTag) {
  let ai = src
    .replace(/require\(['"]\.\/engine\.js['"]\)/g, "require('../engine.js')")
    .replace(/require\(['"]\.\/genome\.js['"]\)/g, "require('../genome.js')")
    .replace(/require\(['"]\.\/search\.js['"]\)/g, "require('./" + freezeTag + "-search.js')");
  return ai;
}

function liveToFreezeSearch(src) {
  return src
    .replace(/require\(['"]\.\/engine\.js['"]\)/g, "require('../engine.js')")
    .replace(/require\(['"]\.\/genome\.js['"]\)/g, "require('../genome.js')");
}

const seLive = bankToLiveSearch(fs.readFileSync(bankSe, 'utf8'));
const aiLive = bankToLiveAi(fs.readFileSync(bankAi, 'utf8'));

fs.writeFileSync(path.join(ROOT, 'search.js'), seLive);
fs.writeFileSync(path.join(ROOT, 'ai.js'), aiLive);

// Freeze under policies/<tag>
fs.writeFileSync(path.join(ROOT, 'policies', tag + '-search.js'), liveToFreezeSearch(seLive));
fs.writeFileSync(path.join(ROOT, 'policies', tag + '-ai.js'), liveToFreezeAi(aiLive, tag));

// ai-build.js stamp
const buildJs = `/**
 * ai-build.js — zero-dependency build identity for the title screen.
 * Auto-synced by evolve/promote-bank-to-live.js from AI_BUILD.
 */
(function (root) {
  var BUILD = {
    id: ${JSON.stringify(rid)},
    stamped: ${JSON.stringify(stamp)},
    label: ${JSON.stringify('Grandmaster ' + rid)}
  };
  root.TIENLEN_AI_BUILD = BUILD;
  root.TienLenAI = root.TienLenAI || {};
  root.TienLenAI.AI_BUILD = BUILD;
  if (typeof module === 'object' && module.exports) module.exports = BUILD;
}(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this)));
`;
fs.writeFileSync(path.join(ROOT, 'ai-build.js'), buildJs);

// index.html fallback if present
const idxPath = path.join(ROOT, 'index.html');
if (fs.existsSync(idxPath)) {
  let idx = fs.readFileSync(idxPath, 'utf8');
  idx = idx.replace(
    /window\.TIENLEN_AI_BUILD = window\.TIENLEN_AI_BUILD \|\| \{[\s\S]*?\};/,
    "window.TIENLEN_AI_BUILD = window.TIENLEN_AI_BUILD || {\n      id: '" + rid +
      "',\n      stamped: '" + stamp + "',\n      label: 'Grandmaster " + rid + "'\n    };"
  );
  const tok = stamp.slice(0, 10).replace(/-/g, '') + stamp.slice(11, 13) + stamp.slice(14, 16);
  idx = idx.replace(/window\.TIENLEN_SITE_BUILD = '[^']*';/, "window.TIENLEN_SITE_BUILD = '" + tok + "';");
  fs.writeFileSync(idxPath, idx);
}

console.log(JSON.stringify({
  promoted: bank,
  rung: rid,
  freezeTag: tag,
  stamp: stamp,
  live: ['ai.js', 'search.js', 'ai-build.js'],
  freeze: ['policies/' + tag + '-ai.js', 'policies/' + tag + '-search.js']
}, null, 2));
