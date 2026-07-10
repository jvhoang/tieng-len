/**
 * Tests for search.js + grandmaster AI path
 */
'use strict';

const engine = require('./engine.js');
const search = require('./search.js');
const ai = require('./ai.js');

let passed = 0;
let failed = 0;

function ok(cond, msg) {
  if (cond) {
    passed++;
    console.log('PASS:', msg);
  } else {
    failed++;
    console.log('FAIL:', msg);
  }
}

console.log('=== Fast clone / apply equivalence ===');
{
  const s = engine.createGameState(4, 12345);
  const fast = engine.cloneStateFast(s);
  ok(fast.players.length === 4, 'cloneStateFast has 4 players');
  ok(fast.players[0].hand.length === 13, 'hand size 13');
  ok(fast.players[0].hand[0] !== s.players[0].hand[0], 'cards are copied');

  const legals = engine.getLegalPlays(
    s.players[s.currentPlayer].hand, null, false, true, s.firstLeadCard
  );
  ok(legals.length > 0, 'first lead has legals');
  const play = legals[0];
  const a1 = engine.applyPlay(engine.cloneState(s), s.currentPlayer, play);
  const a2 = engine.applyPlayFast(s, s.currentPlayer, play);
  ok(a1.players[s.currentPlayer].hand.length === a2.players[s.currentPlayer].hand.length,
    'applyPlayFast matches hand len after play');
  ok(a2.currentCombo != null, 'applyPlayFast sets combo');
}

console.log('=== Expert policy never illegal ===');
{
  for (let seed = 100; seed < 120; seed++) {
    let st = engine.createGameState(4, seed);
    st.isFirstLead = true;
    let steps = 0;
    while (!st.roundOver && steps < 80) {
      const cp = st.currentPlayer;
      const dec = search.expertPolicy(st, cp);
      const legals = engine.getLegalPlays(
        st.players[cp].hand, st.currentCombo, st.players[cp].passed,
        st.isFirstLead, st.firstLeadCard
      );
      if (!legals.length) {
        ok(dec.pass === true, 'pass when no legals seed=' + seed + ' step=' + steps);
        st = engine.passFast(st, cp);
      } else if (dec.pass) {
        ok(!!st.currentCombo, 'pass only when combating seed=' + seed);
        st = engine.passFast(st, cp);
      } else {
        const sig = search.playSig(dec.play);
        const okL = legals.some(function (l) { return search.playSig(l) === sig; });
        if (!okL) {
          ok(false, 'expert illegal seed=' + seed + ' step=' + steps);
          break;
        }
        st = engine.applyPlayFast(st, cp, dec.play);
      }
      st.isFirstLead = false;
      steps++;
    }
  }
  ok(true, 'expert policy games completed without illegal plays');
}

console.log('=== Free lead multi preference (expert) ===');
{
  // Crafted hand with pair + singles
  const st = engine.createGameState(3, 7);
  const seat = st.currentPlayer;
  // Replace hand with known multi structure
  st.players[seat].hand = [
    { rank: 0, suit: 0 }, { rank: 0, suit: 1 }, // pair of 3s
    { rank: 1, suit: 0 }, { rank: 2, suit: 0 },
    { rank: 5, suit: 1 }, { rank: 6, suit: 2 },
    { rank: 7, suit: 0 }, { rank: 8, suit: 1 },
    { rank: 9, suit: 0 }, { rank: 10, suit: 0 },
    { rank: 11, suit: 1 }, { rank: 4, suit: 2 },
    { rank: 3, suit: 3 }
  ];
  st.currentCombo = null;
  st.isFirstLead = false;
  st.firstLeadCard = null;
  const dec = search.expertPolicy(st, seat);
  ok(dec.play && dec.play.length >= 2, 'expert free-leads multi when pair available (len=' +
    (dec.play && dec.play.length) + ')');
}

console.log('=== MCTS returns legal move ===');
{
  const st = engine.createGameState(4, 999);
  st.isFirstLead = true;
  const seat = st.currentPlayer;
  const res = search.searchMove(st, seat, {
    difficulty: 'hard',
    mode: 'mcts',
    timeMs: 100,
    iterations: 40,
    perfectInfo: true
  });
  ok(res.play != null, 'MCTS free lead returns a play');
  const legals = engine.getLegalPlays(
    st.players[seat].hand, null, false, true, st.firstLeadCard
  );
  const sig = search.playSig(res.play);
  ok(legals.some(function (l) { return search.playSig(l) === sig; }), 'MCTS play is legal');
  ok(res.stats && res.stats.mode, 'stats.mode present: ' + (res.stats && res.stats.mode));
}

console.log('=== Flat MC combat ===');
{
  let st = engine.createGameState(4, 55);
  st.isFirstLead = true;
  // Play first lead then search for next player
  const p0 = st.currentPlayer;
  const lead = search.expertPolicy(st, p0).play;
  st = engine.applyPlayFast(st, p0, lead);
  st.isFirstLead = false;
  const p1 = st.currentPlayer;
  const res = search.flatMonteCarlo(st, p1, {
    timeMs: 80,
    maxSims: 40,
    perfectInfo: true
  });
  // may be pass or play
  if (res.play == null) {
    ok(true, 'MC may pass when expensive only');
  } else {
    const legals = engine.getLegalPlays(
      st.players[p1].hand, st.currentCombo, st.players[p1].passed, false, null
    );
    ok(legals.some(function (l) { return search.playSig(l) === search.playSig(res.play); }),
      'MC combat play legal');
  }
}

console.log('=== getAIMove hard uses search ===');
{
  const st = engine.createGameState(4, 777);
  const seat = st.currentPlayer;
  const mv = ai.getAIMove(st, seat, {
    difficulty: 'hard',
    timeMs: 60,
    iterations: 30,
    useSearch: true,
    mode: 'mcts'
  });
  ok(mv != null && mv.length > 0, 'hard getAIMove free lead non-null');
  const stats = ai.getLastSearchStats();
  ok(stats != null, 'getLastSearchStats populated after search');
}

console.log('=== Determinization preserves my hand ===');
{
  const st = engine.createGameState(4, 3);
  const my = 0;
  const before = st.players[my].hand.map(function (c) { return c.rank + '-' + c.suit; }).sort().join(',');
  const rng = search.seededRandom(99);
  const det = search.determinize(st, my, rng, false);
  const after = det.players[my].hand.map(function (c) { return c.rank + '-' + c.suit; }).sort().join(',');
  ok(before === after, 'determinize keeps my hand fixed');
  let total = 0;
  for (let i = 0; i < 4; i++) total += det.players[i].hand.length;
  ok(total === 52 || total === 13 * 4, 'all cards accounted (got ' + total + ')');
}

console.log('=== Go-out forced ===');
{
  const st = engine.createGameState(2, 1);
  const seat = 0;
  st.players[0].hand = [{ rank: 5, suit: 0 }];
  st.players[1].hand = [{ rank: 3, suit: 0 }, { rank: 4, suit: 0 }];
  st.currentCombo = null;
  st.currentPlayer = 0;
  st.isFirstLead = false;
  st.players[0].finished = false;
  st.players[1].finished = false;
  const res = search.searchMove(st, seat, { mode: 'mcts', timeMs: 20, perfectInfo: true });
  ok(res.play && res.play.length === 1, 'go-out with last card');
  ok(res.stats && res.stats.mode === 'forced-out' || (res.play && res.play[0].rank === 5),
    'forced-out or correct card');
}

console.log('\n=== SEARCH TEST SUMMARY ===');
console.log('Passed:', passed, 'Failed:', failed);
if (failed) process.exit(1);
console.log('ALL SEARCH TESTS PASSED');
