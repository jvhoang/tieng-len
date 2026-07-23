'use strict';
/**
 * Shared live ↔ policies path rewrites for ai.js / search.js freezes.
 *
 * Live product (repo root) uses browser-first binding:
 *   _loadNode('./engine.js'|./genome.js'|./search.js')  — NEVER require() under window
 * Frozen bank (policies/<tag>-ai.js) must load sibling search:
 *   _loadNode('./<tag>-search.js')  + _loadNode('../engine.js') etc.
 *
 * Classic require('./x.js') freezes still supported for older tags.
 *
 *   const P = require('./policy-path-rewrite');
 *   P.liveToFreezeAi(aiSrc, 'p_l2s402')
 *   P.freezeToLiveAi(bankAiSrc)
 *   P.assertFrozenAi(out, 'p_l2s402')
 */
function liveToFreezeAi(src, tag) {
  if (!tag) throw new Error('liveToFreezeAi: tag required');
  let ai = String(src);
  // Classic require
  ai = ai.replace(/require\(['"]\.\/engine\.js['"]\)/g, "require('../engine.js')");
  ai = ai.replace(/require\(['"]\.\/genome\.js['"]\)/g, "require('../genome.js')");
  ai = ai.replace(/require\(['"]\.\/search\.js['"]\)/g, "require('./" + tag + "-search.js')");
  // Browser-first _loadNode (live ai.js 2026-07+)
  ai = ai.replace(/_loadNode\(['"]\.\/engine\.js['"]\)/g, "_loadNode('../engine.js')");
  ai = ai.replace(/_loadNode\(['"]\.\/genome\.js['"]\)/g, "_loadNode('../genome.js')");
  ai = ai.replace(/_loadNode\(['"]\.\/search\.js['"]\)/g, "_loadNode('./" + tag + "-search.js')");
  return ai;
}

function liveToFreezeSearch(src) {
  let se = String(src);
  se = se.replace(/require\(['"]\.\/engine\.js['"]\)/g, "require('../engine.js')");
  se = se.replace(/require\(['"]\.\/genome\.js['"]\)/g, "require('../genome.js')");
  // Point frozen internal policy loads at policies/ siblings
  se = se.replace(/require\(['"]\.\/policies\//g, "require('./");
  se = se.replace(/require\(['"]\.\.\/policies\//g, "require('./");
  return se;
}

function freezeToLiveAi(src) {
  let ai = String(src);
  // Classic require bank → live
  ai = ai.replace(/require\(['"]\.\.\/engine\.js['"]\)/g, "require('./engine.js')");
  ai = ai.replace(/require\(['"]\.\.\/genome\.js['"]\)/g, "require('./genome.js')");
  ai = ai.replace(/require\(['"]\.\/[^'"]+-search\.js['"]\)/g, "require('./search.js')");
  // _loadNode bank → live
  ai = ai.replace(/_loadNode\(['"]\.\.\/engine\.js['"]\)/g, "_loadNode('./engine.js')");
  ai = ai.replace(/_loadNode\(['"]\.\.\/genome\.js['"]\)/g, "_loadNode('./genome.js')");
  ai = ai.replace(/_loadNode\(['"]\.\/[^'"]+-search\.js['"]\)/g, "_loadNode('./search.js')");
  return ai;
}

function freezeToLiveSearch(src) {
  let se = String(src);
  se = se.replace(/require\(['"]\.\.\/engine\.js['"]\)/g, "require('./engine.js')");
  se = se.replace(/require\(['"]\.\.\/genome\.js['"]\)/g, "require('./genome.js')");
  return se;
}

/**
 * Assert frozen ai source loads the policy sibling search, not live ./search.js.
 * Throws Error with message if invalid.
 */
function assertFrozenAi(src, tag) {
  const s = String(src);
  const liveSearchLoad =
    /_loadNode\(['"]\.\/search\.js['"]\)/.test(s) ||
    /require\(['"]\.\/search\.js['"]\)/.test(s);
  if (liveSearchLoad) {
    throw new Error(
      'frozen ai still loads ./search.js (live root) — freeze path rewrite failed for tag=' + tag
    );
  }
  if (tag) {
    const wantLoad =
      s.indexOf("_loadNode('./" + tag + "-search.js')") >= 0 ||
      s.indexOf('_loadNode("./' + tag + '-search.js")') >= 0 ||
      s.indexOf("require('./" + tag + "-search.js')") >= 0 ||
      s.indexOf('require("./' + tag + '-search.js")') >= 0;
    // Older freezes may use other patterns; only require tag match if _loadNode or require search present
    const hasSearchRef = /search\.js/.test(s) && (/_loadNode\(/.test(s) || /require\(/.test(s));
    if (hasSearchRef && !wantLoad) {
      // allow if any *-search.js sibling style
      const anyTag = /_loadNode\(['"]\.\/[^'"]+-search\.js['"]\)/.test(s) ||
        /require\(['"]\.\/[^'"]+-search\.js['"]\)/.test(s);
      if (!anyTag) {
        throw new Error('frozen ai missing policy *-search.js load for tag=' + tag);
      }
    }
  }
  return true;
}

/** Live product ai.js must never call require() when window is defined. */
function assertProductLiveAi(src) {
  const s = String(src);
  if (!/function _loadNode\s*\(/.test(s)) {
    throw new Error('product ai.js missing _loadNode (browser-safe loader)');
  }
  // Heuristic: after window branch, must not fall through to require('./search for browser
  // The safe pattern is: (typeof window !== 'undefined') ? window... : _loadNode(...)
  if (!/typeof window !== 'undefined'/.test(s)) {
    throw new Error('product ai.js missing window guard');
  }
  // Must use _loadNode for node search path
  if (!/_loadNode\(['"]\.\/search\.js['"]\)/.test(s)) {
    throw new Error('product ai.js node path should use _loadNode(\'./search.js\')');
  }
  return true;
}

module.exports = {
  liveToFreezeAi: liveToFreezeAi,
  liveToFreezeSearch: liveToFreezeSearch,
  freezeToLiveAi: freezeToLiveAi,
  freezeToLiveSearch: freezeToLiveSearch,
  assertFrozenAi: assertFrozenAi,
  assertProductLiveAi: assertProductLiveAi
};
