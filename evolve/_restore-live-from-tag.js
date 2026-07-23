'use strict';
/**
 * Restore live ai.js + search.js + ai-build.js from policies/<tag>-*.
 * Reverses freeze-live path rewrites for classic require AND _loadNode.
 *
 *   node evolve/_restore-live-from-tag.js p_l2s337
 *
 * WARNING: overwrites product roots. Prefer champion freeze (p_l2s337) for GH ship.
 * After restore, product browser safety (_loadNode + no require under window) is
 * preserved if the bank was frozen from a post-2026-07 product ai.js.
 */
const fs = require('fs');
const path = require('path');
const P = require('./policy-path-rewrite');
const ROOT = path.join(__dirname, '..');
const tag = process.argv[2];
if (!tag) {
  console.error('Usage: node evolve/_restore-live-from-tag.js <tag>');
  process.exit(1);
}
const bankAi = path.join(ROOT, 'policies', tag + '-ai.js');
const bankSe = path.join(ROOT, 'policies', tag + '-search.js');
const bankBuild = path.join(ROOT, 'policies', tag + '-ai-build.js');
if (!fs.existsSync(bankAi) || !fs.existsSync(bankSe)) {
  console.error('missing policies for', tag);
  process.exit(1);
}

const seLive = P.freezeToLiveSearch(fs.readFileSync(bankSe, 'utf8'));
let aiLive = P.freezeToLiveAi(fs.readFileSync(bankAi, 'utf8'));

// Product safety: if restored ai lacks _loadNode (ancient freeze), do not ship as-is.
try {
  P.assertProductLiveAi(aiLive);
} catch (e) {
  console.error('WARN: restored ai.js fails product browser-safety check:', e.message);
  console.error('WARN: prefer restoring a post-2026-07 freeze (e.g. p_l2s337) or re-freeze from current live.');
}

fs.writeFileSync(path.join(ROOT, 'search.js'), seLive);
fs.writeFileSync(path.join(ROOT, 'ai.js'), aiLive);

if (fs.existsSync(bankBuild)) {
  fs.writeFileSync(path.join(ROOT, 'ai-build.js'), fs.readFileSync(bankBuild, 'utf8'));
} else {
  const m = aiLive.match(/const AI_BUILD = \{[\s\S]*?\n\};/);
  let id = tag;
  let stamped = new Date().toISOString();
  let label = 'Restored ' + tag;
  if (m) {
    try {
      const idM = m[0].match(/id:\s*['"]([^'"]+)['"]/);
      const stM = m[0].match(/stamped:\s*['"]([^'"]+)['"]/);
      const lbM = m[0].match(/label:\s*['"]([^'"]+)['"]/);
      if (idM) id = idM[1];
      if (stM) stamped = stM[1];
      if (lbM) label = lbM[1];
    } catch (e) { /* ok */ }
  }
  const build =
    '(function(r){var B={id:' + JSON.stringify(id) +
    ',stamped:' + JSON.stringify(stamped) +
    ',label:' + JSON.stringify(label) +
    '};r.TIENLEN_AI_BUILD=B;if(typeof module==="object")module.exports=B;}(typeof window!=="undefined"?window:global));\n';
  fs.writeFileSync(path.join(ROOT, 'ai-build.js'), build);
}

console.log('restored live from policies/' + tag + '-{ai,search}.js');
