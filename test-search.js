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
        if (dec.pass !== true) { ok(false, 'must pass when no legals seed=' + seed); break; }
        st = engine.passFast(st, cp);
      } else if (dec.pass) {
        if (!st.currentCombo) { ok(false, 'pass only when combating seed=' + seed); break; }
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

console.log('=== Det-MCTS default (imperfect info) ===');
{
  const st = engine.createGameState(4, 42);
  const seat = st.currentPlayer;
  const myBefore = st.players[seat].hand.map(function (c) {
    return c.rank + '-' + c.suit;
  }).sort().join(',');
  const res = search.searchMove(st, seat, {
    difficulty: 'hard',
    mode: 'mcts',
    timeMs: 80,
    iterations: 30,
    perfectInfo: false,
    hiddenInfo: true,
    determinizations: 4
  });
  ok(res.stats && res.stats.mode === 'det-mcts', 'searchMove perfectInfo:false → mode det-mcts (got ' +
    (res.stats && res.stats.mode) + ')');
  ok(res.play != null && res.play.length > 0, 'det-mcts free lead returns a play');
  const legals = engine.getLegalPlays(
    st.players[seat].hand, null, false, true, st.firstLeadCard
  );
  ok(legals.some(function (l) { return search.playSig(l) === search.playSig(res.play); }),
    'det-mcts play is legal for my real hand');
  const myAfter = st.players[seat].hand.map(function (c) {
    return c.rank + '-' + c.suit;
  }).sort().join(',');
  ok(myBefore === myAfter, 'det-mcts does not mutate my hand on the real state');

  // getAIMove default must also use det path (no perfectInfo)
  delete process.env.TIENLEN_TEST_FAST;
  delete process.env.NODE_ENV;
  const mv2 = ai.getAIMove(st, seat, {
    difficulty: 'hard',
    timeMs: 70,
    iterations: 25,
    useSearch: true,
    mode: 'mcts',
    hiddenInfo: true,
    perfectInfo: false
  });
  ok(mv2 != null && mv2.length > 0, 'getAIMove hard+hidden returns free lead');
  const st2 = ai.getLastSearchStats();
  ok(st2 != null, 'getLastSearchStats after hidden hard move');
  ok(st2.mode === 'det-mcts' || st2.mode === 'mcts' || st2.mode === 'forced-out',
    'stats.mode is search mode (got ' + (st2 && st2.mode) + ')');
}

console.log('=== Adversarial opponent nodes (go-out preferred) ===');
{
  // Utility of opponent go-out is worse for us than a non-finishing discard
  ok(search.opponentPrefersLowerUtility(0.0, 0.55),
    'opponent prefers lower myIdx utility (go-out util 0 < discard 0.55)');
  ok(!search.opponentPrefersLowerUtility(0.9, 0.1),
    'opponent would not prefer high myIdx utility');

  // Crafted 2p: myIdx=0 just led; opponent seat 1 can go out with one card OR play a lower that doesn't finish
  // We verify placeUtility: if opponent finishes first, util for me is low
  const st = engine.createGameState(2, 9);
  st.players[0].hand = [
    { rank: 4, suit: 0 }, { rank: 5, suit: 0 }, { rank: 6, suit: 0 }
  ];
  st.players[1].hand = [{ rank: 7, suit: 0 }]; // can go out on free lead
  st.players[0].finished = false;
  st.players[1].finished = false;
  st.currentCombo = null;
  st.currentPlayer = 1;
  st.isFirstLead = false;
  st.finishOrder = [];
  st.roundOver = false;

  const goOut = [{ rank: 7, suit: 0 }];
  const afterGo = engine.applyPlayFast(st, 1, goOut);
  const utilGo = search.placeUtility(afterGo, 0);
  ok(afterGo.players[1].finished, 'opponent go-out marks finished');
  ok(utilGo < 0.6, 'my utility after opponent go-out is poor (got ' + utilGo + ')');

  // Non-finishing "helpful" scenario: opponent still has cards → better for me than them finishing
  st.players[1].hand = [{ rank: 7, suit: 0 }, { rank: 3, suit: 1 }];
  const notOut = [{ rank: 3, suit: 1 }];
  const afterNot = engine.applyPlayFast(st, 1, notOut);
  const utilNot = search.placeUtility(afterNot, 0);
  ok(utilNot > utilGo, 'my utility higher when opponent does not finish (' +
    utilNot + ' > ' + utilGo + ')');
  ok(search.opponentPrefersLowerUtility(utilGo, utilNot),
    'adversarial chooser ranks go-out over non-finishing discard for opponent');

  // UCT at opponent node: with visits, lower my-util child should win when minimizing
  // Simulate mini node tree
  const parent = { player: 1, visits: 20, children: [] };
  const childGo = { player: 1, move: goOut, visits: 10, value: 1.0 }; // mean 0.1 (bad for me)
  childGo.value = 1.0; // mean 0.1
  const childHelp = { player: 1, move: notOut, visits: 10, value: 8.0 }; // mean 0.8 (good for me)
  parent.children = [childHelp, childGo];
  // uctSelect should pick childGo when chooser is opponent (myIdx=0)
  const picked = search.uctSelect(parent, 0.01, 0); // low C → exploit dominates
  ok(picked === childGo || (picked && picked.value === childGo.value),
    'uctSelect at opponent node prefers low myIdx-utility child (go-out)');
}

console.log('=== User-reported bug guards ===');
{
  // Free lead: never single when multi available
  let swm = 0, n = 0;
  for (let s = 0; s < 40; s++) {
    const st = engine.createGameState(4, 7000 + s);
    const seat = st.currentPlayer;
    const leg = engine.getLegalPlays(st.players[seat].hand, null, false, true, st.firstLeadCard);
    const multiLeg = leg.filter(p => p.length >= 2 && !p.some(c => c.rank === 12));
    if (!multiLeg.length) continue;
    const guarded = search.enforcePolicyGuards(st, seat, multiLeg[0].length ? [leg.find(p => p.length === 1)].filter(Boolean)[0] : null);
    // force a single proposal if possible
    const single = leg.find(p => p.length === 1);
    const out = search.enforcePolicyGuards(st, seat, single || null);
    n++;
    if (out && out.length === 1) swm++;
  }
  ok(swm === 0, 'enforcePolicyGuards never free-leads single when multi exists (violations=' + swm + '/' + n + ')');

  // Ace + 2 in hand: never pass
  const st = engine.createGameState(4, 8);
  st.currentCombo = engine.detectCombo([{ rank: 11, suit: 3 }]);
  st.currentPlayer = 1;
  st.lastPlayBy = 0;
  st.isFirstLead = false;
  st.players[1].passed = false;
  st.players[1].hand = [
    { rank: 12, suit: 0 }, { rank: 4, suit: 1 }, { rank: 5, suit: 2 },
    { rank: 6, suit: 0 }, { rank: 7, suit: 1 }, { rank: 8, suit: 2 }
  ];
  const out = search.enforcePolicyGuards(st, 1, null);
  ok(out != null && out.length > 0, 'never pass vs Ace when 2 in hand');
  ok(out.some(c => c.rank === 12), 'contests Ace with a 2');
}

console.log('\n=== SEARCH TEST SUMMARY ===');
console.log('Passed:', passed, 'Failed:', failed);
if (failed) process.exit(1);
console.log('ALL SEARCH TESTS PASSED');
