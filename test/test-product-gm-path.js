'use strict';
/**
 * Product GM path: free-lead never null; search always stamps stats;
 * intentional pass is not cheap-forced when stats present.
 * Regression for post-7/16 playlog fallback census (null-free-lead / cheap-force-error-only).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');
const ai = require('../ai.js');

// ─── Structural: browser-first UMD on product modules ───
function assertBrowserFirst(file, label) {
  const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  assert(
    /Browser-first|typeof window !== 'undefined'[\s\S]{0,200}module\.exports/.test(src) ||
      /if \(typeof window !== 'undefined'\)/.test(src),
    label + ' must browser-first bind when window exists'
  );
  // Must not ONLY use module-first without window branch first
  const umdStart = src.indexOf('(function');
  const slice = src.slice(umdStart, umdStart + 600);
  if (file !== 'ai.js' && file !== 'engine.js') {
    const windowBeforeModule =
      slice.indexOf("typeof window") >= 0 &&
      (slice.indexOf("typeof window") < slice.indexOf("typeof module") ||
        /window[\s\S]*module\.exports/.test(slice));
    assert(windowBeforeModule || /Browser-first/.test(src),
      label + ' UMD should prefer window before module.exports path');
  }
}

assertBrowserFirst('search.js', 'search.js');
assertBrowserFirst('genome.js', 'genome.js');
assertBrowserFirst('controller.js', 'controller.js');
assertBrowserFirst('ai.js', 'ai.js');

// ─── Behavioral: free-lead never null + stats always ───
const seeds = [42, 99, 12345, 777, 20260722];
for (let i = 0; i < seeds.length; i++) {
  const st = engine.createGameState(2, seeds[i]);
  assert(!st.currentCombo, 'fresh deal free lead');
  const mv = ai.getAIMove(st, 0, {
    difficulty: 'grandmaster',
    perfectInfo: false,
    hiddenInfo: true,
    useSearch: true,
    timeMs: 200,
    bestResponse: true,
    seed: seeds[i]
  });
  assert(mv && mv.length, 'free-lead must return cards seed=' + seeds[i]);
  const stats = ai.getLastSearchStats();
  assert(stats, 'free-lead must stamp search stats seed=' + seeds[i]);
  assert(!stats.error, 'free-lead stats should not be error-only seed=' + seeds[i]);
}

// ─── Combat: intentional pass keeps stats (controller must not mass-force) ───
// Build a state where seat 0 faces a high single and may pass or beat.
const st2 = engine.createGameState(2, 4242);
// Force a combat context if possible by playing one card from seat 0 then seat 1 responds
// Simpler: if getAIMove on free lead works with stats, combat with legals also stamps stats.
const hand = st2.players[0].hand.slice();
const leg = engine.getLegalPlays(hand, null, false, true, st2.firstLeadCard);
assert(leg.length, 'has free legals');
const played = leg.find(function (p) { return p.length === 1; }) || leg[0];
let sCombat = engine.applyPlay(st2, 0, played);
sCombat.isFirstLead = false;
// Seat 1 AI responds
const resp = ai.getAIMove(sCombat, 1, {
  difficulty: 'grandmaster',
  perfectInfo: false,
  hiddenInfo: true,
  useSearch: true,
  timeMs: 250,
  bestResponse: true,
  seed: 9
});
const stCombat = ai.getLastSearchStats();
assert(stCombat, 'combat decision must stamp stats (even if pass)');
// resp may be cards or null (pass) — either is fine if stats present
if (resp == null) {
  assert(
    stCombat.intentionalPass ||
      stCombat.mode === 'best-response' ||
      stCombat.mode === 'best-response-det' ||
      stCombat.mode === 'search-pass-no-stats' ||
      stCombat.mode,
    'pass must leave mode/intentionalPass for controller'
  );
} else {
  assert(resp.length, 'combat play non-empty');
}

// ─── Controller structural gate still present ───
const ctrl = fs.readFileSync(path.join(__dirname, '..', 'controller.js'), 'utf8');
assert(/cheap-force-error-only/.test(ctrl), 'cheap-force-error-only label retained');
assert(/intentionalPass/.test(ctrl), 'controller respects intentionalPass stats');
assert(/Browser-first/.test(ctrl) || /typeof window !== 'undefined'/.test(ctrl),
  'controller browser-first');

console.log('OK test-product-gm-path');
