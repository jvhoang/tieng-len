'use strict';
/**
 * Living gold suite on FAIR path (hiddenInfo, expert-aligned getAIMove).
 * Re-reads john_uploads via manifest; gold cases from test-search series 1–3 + P*.
 *
 * Fair path for L1/accept gates: getAIMove with mode=expert (policy used in dual leaf/rollout)
 * plus expertPolicy direct. GM search path residuals tracked separately.
 *
 * Usage: node evolve/run-gold-fair-suite.js
 * Exit 0 iff all fair-path gold cases pass.
 */
const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');
const search = require('../search.js');
const ai = require('../ai.js');

// refresh manifest first
require('child_process').spawnSync(process.execPath, [path.join(__dirname, 'refresh-gold-manifest.js')], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit'
});

const manifestPath = path.join(__dirname, 'eval-registry', 'gold-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function card(r, s) { return { rank: r, suit: s, id: r * 4 + s }; }
function handOf(arr) { return arr.map(function (x) { return card(x[0], x[1]); }); }
function mk(hand, curCards, oppN) {
  const opp = [];
  for (let i = 0; i < oppN; i++) opp.push(card(i % 11, i % 4));
  return {
    players: [
      { hand: hand.slice(), finished: false, passed: false },
      { hand: opp, finished: false, passed: false }
    ],
    currentPlayer: 0,
    currentCombo: curCards ? engine.detectCombo(curCards) : null,
    isFirstLead: false,
    firstLeadCard: null,
    finishOrder: [],
    roundOver: false,
    playersCount: 2
  };
}
function playRank(mv) {
  if (mv == null) return 'PASS';
  if (mv.pass) return 'PASS';
  const p = mv.play || mv;
  if (!p || !p.length) return 'PASS';
  return p.map(function (c) { return c.rank; }).join(',');
}
function fairMove(st) {
  // Fair training/eval path: expert policy via getAIMove (no perfectInfo)
  return ai.getAIMove(st, 0, {
    difficulty: 'grandmaster',
    hiddenInfo: true,
    perfectInfo: false,
    mode: 'expert',
    iterations: 0,
    useSearch: true,
    bestResponse: false
  });
}

let passed = 0;
let failed = 0;
const fails = [];
function ok(cond, msg) {
  if (cond) {
    passed++;
    console.log('PASS:', msg);
  } else {
    failed++;
    fails.push(msg);
    console.log('FAIL:', msg);
  }
}

// Mirror gold cases — expertPolicy + fair getAIMove
function both(st, check, label) {
  const d = search.expertPolicy(st, 0);
  ok(check(d, 'expert'), label + ' [expert] got ' + playRank(d));
  const g = fairMove(st);
  const gDec = g == null ? { pass: true } : { play: g };
  ok(check(gDec, 'fair'), label + ' [fair] got ' + playRank(gDec));
}

// Series 1–3 + P (same as test-search gold)
both(mk(handOf([[3, 0], [3, 1], [5, 1], [6, 1], [7, 0], [8, 0], [11, 1], [12, 2]]), [card(1, 1)], 2),
  function (d) { return d && d.play && d.play.length === 1 && d.play[0].rank === 11; }, 'IMG0498 A not pair');

both(mk(handOf([[3, 0], [3, 1], [12, 2]]), null, 2),
  function (d) { return d && d.play && d.play.length === 1 && d.play[0].rank === 12; }, 'IMG0499 free 2');

both(mk(handOf([[0, 2], [4, 0], [4, 1], [4, 2], [5, 0], [5, 2], [8, 0], [9, 2], [10, 1], [12, 0]]), [card(9, 0)], 3),
  function (d) { return d && d.play && d.play.length === 1 && d.play[0].rank === 12; }, 'IMG0500 2 not Q');

both(mk(handOf([[0, 0], [3, 0], [5, 1], [6, 0], [8, 0], [9, 0], [9, 2], [10, 0], [11, 0], [12, 0], [12, 2]]), [card(7, 1), card(7, 0)], 9),
  function (d) { return d && d.pass; }, 'IMG0501 pass');

both(mk(handOf([[2, 0], [3, 1], [4, 0], [5, 2], [6, 2], [7, 0], [10, 0], [11, 1], [12, 1]]), [card(2, 1)], 6),
  function (d) { return d && d.play && d.play.length === 1 && d.play[0].rank >= 10; }, 'IMG0502 K/A');

both(mk(handOf([[4, 0], [5, 0], [6, 1], [8, 1], [11, 1], [12, 0], [12, 1], [12, 2]]), [card(4, 1)], 8),
  function (d) { return d && d.play && d.play.length === 1 && d.play[0].rank !== 5; }, 'IMG0504');

both(mk(handOf([[0, 1], [1, 3], [2, 1], [3, 0], [3, 2], [4, 2], [4, 3], [5, 0], [5, 1], [5, 2], [12, 3]]), [card(1, 2)], 11),
  function (d) { return d && d.play && d.play.length === 1 && d.play[0].rank === 5; }, 'IMG0505 8');

{
  const st = mk(handOf([[0, 1], [1, 3], [2, 1], [3, 0], [3, 2], [4, 2], [4, 3], [5, 0], [5, 1]]), null, 10);
  const d = search.expertPolicy(st, 0);
  const com = d.play ? engine.detectCombo(d.play) : null;
  ok(com && com.type === 'doubleseq' && d.play.length === 6, 'IMG0506 doubleseq [expert] got ' + playRank(d));
  const g = fairMove(st);
  const gcom = g ? engine.detectCombo(g) : null;
  ok(gcom && gcom.type === 'doubleseq' && g.length === 6, 'IMG0506 doubleseq [fair] got ' + playRank({ play: g }));
}

{
  const hand = handOf([[0, 0], [0, 1], [1, 2], [1, 3], [2, 0], [2, 3], [4, 0], [5, 3], [6, 2], [7, 2], [8, 2], [10, 2], [11, 1]]);
  const st = mk(hand, null, 13);
  st.isFirstLead = true;
  st.firstLeadCard = card(0, 0);
  const d = search.expertPolicy(st, 0);
  const com = d.play ? engine.detectCombo(d.play) : null;
  ok(com && com.type === 'doubleseq' && d.play.length === 6, 'IMG0507 doubleseq [expert]');
  const g = fairMove(st);
  const gcom = g ? engine.detectCombo(g) : null;
  ok(gcom && gcom.type === 'doubleseq' && g && g.length === 6, 'IMG0507 doubleseq [fair] got ' + playRank({ play: g }));
}

both(mk(handOf([[1, 3], [3, 2], [3, 3], [4, 2], [4, 3], [7, 3], [9, 0], [9, 3], [10, 1], [10, 3], [11, 1], [12, 2], [12, 3]]), [card(1, 0), card(2, 0), card(3, 0)], 10),
  function (d) { return d && d.pass; }, 'IMG0510 pass');

both(mk(handOf([[1, 3], [3, 2], [3, 3], [4, 2], [4, 3], [7, 3], [9, 0], [9, 3], [10, 1], [10, 3], [11, 1], [12, 2], [12, 3]]), [card(11, 0), card(11, 3)], 5),
  function (d) { return d && d.pass; }, 'IMG0511 pass');

both(mk(handOf([[1, 3], [3, 2], [3, 3], [4, 2], [4, 3], [7, 3], [9, 0], [9, 3], [10, 1], [10, 3], [11, 1], [12, 2], [12, 3]]), [card(2, 3)], 4),
  function (d) { return d && d.play && d.play.length === 1 && d.play[0].rank === 7; }, 'IMG0512 10');

both(mk(handOf([[1, 3], [3, 2], [3, 3], [4, 2], [4, 3], [9, 0], [9, 3], [10, 1], [10, 3], [11, 1], [12, 2], [12, 3]]), [card(10, 0)], 3),
  function (d) { return d && d.play && d.play.length === 1 && d.play[0].rank === 12; }, 'IMG0513 2');

both(mk(handOf([[2, 2], [6, 2], [7, 1], [7, 2], [8, 3], [10, 0], [11, 1], [11, 2], [12, 0]]), null, 11),
  function (d) { return d && d.play && d.play.length === 1 && d.play[0].rank === 2; }, 'IMG0514 trash');

both(mk(handOf([[6, 2], [7, 2], [8, 3], [11, 1], [11, 2], [12, 0]]), [card(10, 2)], 8),
  function (d) { return d && d.play && d.play.length === 1 && d.play[0].rank === 12; }, 'IMG0516 2');

both(mk(handOf([[4, 2], [6, 1], [6, 3], [7, 3], [8, 3], [9, 0], [10, 1], [12, 1], [12, 3]]), null, 9),
  function (d) {
    const ranks = (d.play || []).map(function (c) { return c.rank; }).sort(function (a, b) { return a - b; });
    return d && d.play && d.play.length === 4 && ranks[0] === 7 && ranks[3] === 10;
  }, 'IMG0517 TJQK');

both(mk(handOf([[4, 2], [12, 1], [12, 3]]), null, 9),
  function (d) { return d && d.play && d.play.length === 2 && d.play[0].rank === 12; }, 'IMG0518 22');

both(mk(handOf([[1, 3], [3, 0], [3, 1], [6, 1], [6, 2], [7, 3], [8, 1], [9, 1], [10, 2], [10, 3]]), [card(4, 3), card(5, 0), card(6, 0)], 7),
  function (d) {
    const ranks = (d.play || []).map(function (c) { return c.rank; }).sort(function (a, b) { return a - b; });
    return d && d.play && d.play.length === 3 && ranks[0] === 7;
  }, 'IMG0519 TJQ');

both(mk(handOf([[3, 0], [4, 1], [4, 3], [5, 1], [6, 0], [9, 0], [9, 2], [12, 1], [12, 2]]), [card(2, 3)], 1),
  function (d) { return d && d.play && d.play.length === 1 && d.play[0].rank === 12; }, 'IMG0520a 2');

both(mk(handOf([[3, 0], [4, 1], [4, 3], [5, 1], [6, 0], [9, 0], [9, 2], [12, 1], [12, 2]]), [card(2, 3)], 6),
  function (d) { return d && d.play && d.play.length === 1 && d.play[0].rank === 4; }, 'IMG0520b 7');

both(mk(handOf([[3, 0], [4, 1], [4, 3], [5, 1], [6, 0], [12, 1]]), null, 1),
  function (d) { return d && d.play && d.play.length === 4; }, 'IMG0521 6789');

both(mk(handOf([[0, 0], [0, 1], [1, 0], [2, 1], [3, 2], [4, 0], [5, 1], [6, 2], [7, 0], [8, 0], [9, 1], [11, 0], [11, 1]]), null, 10),
  function (d) { return d && d.play && d.play.length === 2 && d.play[0].rank === 0; }, 'P3 33');

both(mk(handOf([[3, 0], [4, 1], [4, 3], [5, 1], [6, 0], [9, 0], [9, 2], [12, 1], [12, 2]]), [card(2, 3)], 6),
  function (d) { return d && d.play && d.play.length === 1 && d.play[0].rank === 4; }, 'P1 7');

both(mk(handOf([[0, 2], [4, 0], [4, 1], [4, 2], [5, 0], [5, 2], [8, 0], [9, 2], [10, 1], [12, 0]]), [card(9, 0)], 3),
  function (d) { return d && d.play && d.play.length === 1 && d.play[0].rank === 12; }, 'P5 2');

console.log('\n=== FAIR GOLD SUITE ===');
console.log('manifest files', manifest.fileCount, 'newestPlaylog', manifest.pointers && manifest.pointers.newestPlaylog);
console.log('Passed:', passed, 'Failed:', failed);
if (fails.length) console.log(fails.join('\n'));
process.exit(failed ? 1 : 0);
