'use strict';
const engine = require('../engine.js');
const search = require('../policies/v91-search.js');
const freeze = require('../policies/v91-ai.js');
search.setExploitOpponent(function (s, seat) {
  return freeze.getAIMove(s, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' });
});
const st = engine.createGameState(2, 20260711);
st.isFirstLead = true;
function t(label, perfect) {
  const t0 = Date.now();
  const r = search.searchMove(st, st.currentPlayer, {
    difficulty: 'grandmaster',
    perfectInfo: perfect,
    hiddenInfo: !perfect,
    timeMs: 100,
    brTrials: 8,
    bestResponse: true,
    maxBranch: 8,
    exactExploit: false,
    exploit: false,
    softSamples: 0,
    inBrowser: false,
    mode: 'auto'
  });
  console.log(label, Date.now() - t0, 'ms mode', r && r.stats && r.stats.mode);
}
console.log('begin');
t('perfect', true);
t('hidden', false);
console.log('done');
