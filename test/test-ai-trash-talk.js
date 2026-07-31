'use strict';
/**
 * Unit tests for 1v1 filthy trash-talk picker (no DOM).
 */
const talk = require('../ai-trash-talk.js');
let passed = 0;
let failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log('PASS:', msg); }
  else { failed++; console.log('FAIL:', msg); }
}

console.log('=== trash-talk enable gate ===');
ok(talk.enabledForGame({ vsAI: true, playMode: 'ai', numPlayers: 2 }) === true, '1v1 vs AI enabled');
ok(talk.enabledForGame({ vsAI: true, playMode: 'ai', numPlayers: 4 }) === false, '4p disabled');
ok(talk.enabledForGame({ vsAI: false, playMode: 'hotseat', numPlayers: 2 }) === false, 'hotseat disabled');
ok(talk.enabledForGame({ vsAI: true, playMode: 'online', numPlayers: 2 }) === false, 'online disabled');

console.log('=== trash-talk lines ===');
const kinds = ['play', 'pass', 'freeLead', 'afterHumanPlay', 'afterHumanPass', 'win', 'lose', 'start'];
kinds.forEach(function (k) {
  const line = talk.lineFor({ kind: k, rng: function () { return 0; } });
  ok(typeof line === 'string' && line.length > 8, k + ' returns non-empty line');
});

const playLine = talk.lineFor({
  kind: 'play',
  playLabel: 'Pair of A',
  high: true,
  bomb: false,
  rng: function () { return 0.1; }
});
ok(playLine.indexOf('Pair of A') >= 0, 'play line includes combo label');

const bombLine = talk.lineFor({
  kind: 'play',
  playLabel: 'Quad 2',
  bomb: true,
  rng: function () { return 0; }
});
ok(bombLine.length > 10, 'bomb line length ok');

// Explicit / filthy language present in pool (spot-check a few)
const joined = JSON.stringify(talk.LINES);
ok(/fuck|shit|ass|bent|clown|dumbass|lube|pee/i.test(joined), 'pool is explicitly filthy');
ok(/witty|grandmaster|structure|bomb|pass/i.test(joined) || /grandmaster|structure|bomb/i.test(joined),
  'pool has witty game-aware barbs');

console.log('\n=== RESULT: ' + passed + ' passed, ' + failed + ' failed ===');
if (failed) process.exit(1);
