'use strict';
const engine = require('../engine.js');
const search = require('../policies/v91-search.js');
const ai = require('../policies/v91-ai.js');
search.setExploitOpponent(function (s, seat) {
  return ai.getAIMove(s, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' });
});
const st = engine.createGameState(2, 20260711);
st.isFirstLead = true;
function run(label, perfect, trials, branch, ms) {
  const t0 = Date.now();
  const br = search.bestResponseMove(st, st.currentPlayer, {
    trials: trials,
    timeMs: ms,
    maxBranch: branch,
    perfectInfo: perfect,
    strongSelf: false
  });
  console.log(label, Date.now() - t0, 'statsMs', br && br.stats && br.stats.ms, 'mode', br && br.stats && br.stats.mode);
}
console.log('start');
run('perfect_8_8_100', true, 8, 8, 100);
run('hidden_4_4_50', false, 4, 4, 50);
run('hidden_8_8_100', false, 8, 8, 100);
console.log('done');
