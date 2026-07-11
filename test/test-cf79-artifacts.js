/**
 * Structural + light functional checks for CF79 + v8 gate artifacts / freezes.
 * node test/test-cf79-artifacts.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

let passed = 0, failed = 0;
function ok(name, cond, extra) {
  if (cond) { passed++; console.log('PASS:', name); }
  else { failed++; console.log('FAIL:', name, extra || ''); }
}

const summaryPath = path.join(root, 'evolve/counterfactual-79-latest-summary.json');
ok('CF79 summary exists', fs.existsSync(summaryPath));
if (fs.existsSync(summaryPath)) {
  const s = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  ok('CF79 completedGames === 79', s.completedGames === 79, 'got ' + s.completedGames);
  ok('CF79 has human actions', s.totalHumanActions >= 500, 'got ' + s.totalHumanActions);
  ok('CF79 matchRate defined', typeof s.matchRate === 'number' && s.matchRate > 0.4);
  ok('CF79 method is hidden-info', /hiddenInfo=true/.test(s.method || ''));
  ok('CF79 issue list length 79', Array.isArray(s.issueList) && s.issueList.length === 79);
}

ok('analysis markdown exists', fs.existsSync(path.join(root, 'evolve/human-vs-v80-counterfactual-79.md')));
ok('human-predict script exists', fs.existsSync(path.join(root, 'evolve/human-predict.js')));
ok('counterfactual runner exists', fs.existsSync(path.join(root, 'evolve/counterfactual-79-latest.js')));
ok('bench v80 vs v75 exists', fs.existsSync(path.join(root, 'evolve/bench-v80-vs-v75.js')));

ok('frozen v75-ai exists', fs.existsSync(path.join(root, 'policies/v75-ai.js')));
ok('frozen v75-search exists', fs.existsSync(path.join(root, 'policies/v75-search.js')));

const live = require(path.join(root, 'ai.js'));
const frozen = require(path.join(root, 'policies/v75-ai.js'));
ok('live AI is v8', live.AI_BUILD && /v8/.test(live.AI_BUILD.id || live.AI_BUILD.label || ''));
ok('frozen AI is v7.5', frozen.AI_BUILD && /v7\.5|v75/.test(JSON.stringify(frozen.AI_BUILD)));
ok('live !== frozen build id', live.AI_BUILD.id !== frozen.AI_BUILD.id);

// Free-lead volume preference smoke (shipped pickFreeLeadHard)
const engine = require(path.join(root, 'engine.js'));
const search = require(path.join(root, 'search.js'));
const st = engine.createGameState(2, 99);
st.isFirstLead = false;
st.currentCombo = null;
st.players[0].hand = [
  { rank: 0, suit: 0 }, { rank: 1, suit: 1 }, { rank: 2, suit: 2 },
  { rank: 3, suit: 0 }, { rank: 4, suit: 1 }, { rank: 5, suit: 0 },
  { rank: 5, suit: 1 }, { rank: 8, suit: 0 }, { rank: 9, suit: 1 },
  { rank: 10, suit: 2 }, { rank: 11, suit: 0 }, { rank: 12, suit: 0 },
  { rank: 12, suit: 1 }
];
const leg = engine.getLegalPlays(st.players[0].hand, null, false, false, null);
const pick = search.pickFreeLeadHard(leg, st, 0);
ok('pickFreeLeadHard returns multi length>=2', pick && pick.length >= 2, 'len=' + (pick && pick.length));

console.log('Passed:', passed, 'Failed:', failed);
if (failed) process.exit(1);
console.log('ALL CF79 ARTIFACT TESTS PASSED');
