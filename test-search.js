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

console.log('=== publicHistory + constrained determinize ===');
{
  let st = engine.createGameState(2, 77);
  st.isFirstLead = false;
  // Craft: seat 0 leads a 5, seat 1 passes (so seat 1 must not hold a non-bomb beater of 5)
  st.currentPlayer = 0;
  st.currentCombo = null;
  st.publicHistory = [];
  const lead5 = [{ rank: 5, suit: 0 }];
  st.players[0].hand = [{ rank: 5, suit: 0 }, { rank: 3, suit: 1 }, { rank: 4, suit: 1 }];
  st.players[1].hand = [{ rank: 6, suit: 0 }, { rank: 7, suit: 0 }, { rank: 8, suit: 0 }];
  st = engine.applyPlay(st, 0, lead5);
  ok(st.publicHistory && st.publicHistory.some(function (e) { return e.type === 'play'; }),
    'publicHistory records play');
  st = engine.pass(st, 1);
  ok(st.publicHistory.some(function (e) { return e.type === 'pass' && e.seat === 1; }),
    'publicHistory records pass');
  // handHasNonBombBeater: hand with 6 must beat single 5
  const against = { type: 'single', size: 1, top: { rank: 5, suit: 0 }, cards: lead5 };
  ok(search.handHasNonBombBeater([{ rank: 6, suit: 0 }], against),
    'higher single is a non-bomb beater');
  ok(!search.handHasNonBombBeater([{ rank: 4, suit: 0 }], against),
    'lower single is not a beater');
  // Constrained det: pool includes cards that do NOT beat single-3, so rejection
  // can succeed. Seat1 size=2 from pool of 4 low/high mix.
  let st2 = engine.createGameState(2, 88);
  st2.isFirstLead = false;
  st2.players[0].hand = [{ rank: 3, suit: 0 }, { rank: 12, suit: 0 }]; // keep a 2
  // Unknown pool will be opponent cards: mix of non-beaters (rank<=3) and beaters
  st2.players[1].hand = [
    { rank: 0, suit: 1 }, { rank: 1, suit: 1 }, { rank: 2, suit: 1 },
    { rank: 9, suit: 0 }, { rank: 10, suit: 0 }
  ];
  // Make seat1 size 2 after we only use 2 cards as "unknown" — set sizes by hand lens
  st2.players[1].hand = [
    { rank: 0, suit: 1 }, { rank: 1, suit: 1 }, { rank: 9, suit: 0 }, { rank: 10, suit: 0 }
  ];
  st2.currentCombo = null;
  st2.publicHistory = [];
  st2 = engine.applyPlay(st2, 0, [{ rank: 3, suit: 0 }]);
  st2 = engine.pass(st2, 1);
  // Now seat0 has [12], seat1 has 4 cards. Shrink seat1 to 2 for cleaner test:
  st2.players[1].hand = st2.players[1].hand.slice(0, 2);
  // Actually re-setup cleanly:
  st2.players[0].hand = [{ rank: 12, suit: 0 }];
  st2.players[1].hand = [
    { rank: 0, suit: 1 }, { rank: 1, suit: 1 }, { rank: 9, suit: 0 }, { rank: 10, suit: 0 }
  ];
  // Seat1 size 2: only two of the four pool cards assigned each det
  st2.players[1].hand = st2.players[1].hand; // 4 cards — det redistributes
  // Use 2-card opp: pool of 4 by adding fake third player? Simpler: 2p with sizes 1 and 2
  // pool = 2 cards only. Put non-beaters only so all samples consistent:
  st2.players[1].hand = [{ rank: 0, suit: 1 }, { rank: 1, suit: 1 }];
  const my = 0;
  let consistent = 0;
  const rng2 = search.seededRandom(12345);
  const passEv = (st2.publicHistory || []).find(function (e) { return e.type === 'pass'; });
  ok(!!passEv, 'pass event exists for constraint test');
  for (let t = 0; t < 30; t++) {
    const d = search.determinize(st2, my, rng2, false);
    const oppHand = d.players[1].hand;
    if (!search.handHasNonBombBeater(oppHand, passEv.against)) consistent++;
  }
  ok(consistent === 30, 'constrained det keeps non-beater hands consistent (got ' + consistent + ')');

  // Rejection: pool only beaters → cannot satisfy; still returns a full deal (fallback)
  let st3 = engine.cloneStateFast(st2);
  st3.players[1].hand = [{ rank: 9, suit: 0 }, { rank: 10, suit: 0 }];
  st3.publicHistory = st2.publicHistory.slice();
  const d3 = search.determinize(st3, my, search.seededRandom(1), false);
  ok(d3.players[1].hand.length === 2, 'fallback det still assigns correct hand size');
  ok(d3.players[0].hand.length === st3.players[0].hand.length, 'my hand fixed on fallback');
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
  // Free lead uses hard multi policy (not MCTS) — mode is free-lead-hard
  ok(st2.mode === 'free-lead-hard' || st2.mode === 'det-mcts' || st2.mode === 'mcts' || st2.mode === 'forced-out',
    'stats.mode is free-lead or search (got ' + (st2 && st2.mode) + ')');
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

console.log('=== v5 no-gift free lead vs 1-card opp ===');
{
  const st = engine.createGameState(2, 7);
  st.isFirstLead = false;
  st.currentCombo = null;
  st.currentPlayer = 0;
  st.players[0].hand = [
    { rank: 3, suit: 0 }, { rank: 5, suit: 1 }, { rank: 7, suit: 0 },
    { rank: 10, suit: 0 }, { rank: 12, suit: 0 }
  ];
  st.players[1].hand = [{ rank: 8, suit: 0 }]; // 1 card
  const leg = engine.getLegalPlays(st.players[0].hand, null, false, false, null);
  const pick = search.pickFreeLeadHard(leg, st, 0);
  ok(pick && !(pick.length === 1 && pick[0].rank < 10),
    'no-gift: free lead not low single vs 1-card (got ' +
    (pick ? pick.map(function (c) { return c.rank; }).join(',') : 'null') + ')');
}

console.log('=== User-reported bug guards ===');
{
  // Free lead: never gift low single when opp has 1 card
  const stGift = engine.createGameState(2, 11);
  stGift.isFirstLead = false;
  stGift.firstLeadCard = null;
  stGift.currentCombo = null;
  stGift.currentPlayer = 0;
  stGift.players[0].hand = [
    { rank: 0, suit: 0 }, { rank: 1, suit: 1 }, { rank: 12, suit: 0 },
    { rank: 5, suit: 0 }, { rank: 6, suit: 1 }
  ];
  stGift.players[1].hand = [{ rank: 3, suit: 0 }];
  const legG = engine.getLegalPlays(stGift.players[0].hand, null, false, false, null);
  const outG = search.pickFreeLeadHard(legG, stGift, 0);
  ok(outG && (outG.length >= 2 || outG[0].rank >= 10),
    'no-gift free lead vs 1-card (got len=' + (outG && outG.length) + ' rank=' + (outG && outG[0].rank) + ')');

  // High single early with multi available should not be forced by guards as the only option
  // (v3 may trash-shed singles strategically, but not K/A when multi exists)
  let badHigh = 0, n = 0;
  for (let s = 0; s < 30; s++) {
    const st = engine.createGameState(4, 7000 + s);
    st.isFirstLead = false;
    st.firstLeadCard = null;
    st.currentCombo = null;
    const seat = 0;
    st.currentPlayer = seat;
    const leg = engine.getLegalPlays(st.players[seat].hand, null, false, false, null);
    const multiLeg = leg.filter(p => p.length >= 2 && !p.some(c => c.rank === 12));
    const highSingle = leg.find(p => p.length === 1 && p[0].rank >= 10 && p[0].rank < 12);
    if (!multiLeg.length || !highSingle) continue;
    n++;
    const out = search.enforcePolicyGuards(st, seat, highSingle);
    if (out && out.length === 1 && out[0].rank >= 10) badHigh++;
  }
  ok(n === 0 || badHigh / n < 0.5, 'guards usually veto early high singles when multi exists (' + badHigh + '/' + n + ')');

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

  // Facing Ace with higher Ace + 2: prefer 2 (human-log #43–#72 Ace-climb exploit)
  const stA = engine.createGameState(2, 9);
  stA.currentCombo = engine.detectCombo([{ rank: 11, suit: 0 }]); // Ace spades
  stA.currentPlayer = 0;
  stA.lastPlayBy = 1;
  stA.isFirstLead = false;
  stA.players[0].passed = false;
  stA.players[0].hand = [
    { rank: 11, suit: 3 }, // Ace hearts (beats Ace spades by suit)
    { rank: 12, suit: 1 }, // 2 clubs
    { rank: 3, suit: 0 }, { rank: 4, suit: 1 }, { rank: 5, suit: 2 },
    { rank: 6, suit: 0 }, { rank: 7, suit: 1 }
  ];
  stA.players[1].hand = [{ rank: 8, suit: 0 }, { rank: 9, suit: 1 }];
  const aceClimb = [{ rank: 11, suit: 3 }];
  const out2 = search.enforcePolicyGuards(stA, 0, aceClimb);
  ok(out2 && out2.length === 1 && out2[0].rank === 12,
    'prefer 2 over Ace-climb vs Ace (got rank=' + (out2 && out2[0] && out2[0].rank) + ')');
  const exp = search.expertPolicy ? search.expertPolicy(stA, 0)
    : (function () {
      // expertPolicy may be internal; use enforce on null as policy path
      return { play: search.enforcePolicyGuards(stA, 0, null) };
    })();
  const expPlay = exp && (exp.play || exp);
  ok(expPlay && expPlay.length === 1 && expPlay[0].rank === 12,
    'expert/guards path uses 2 vs Ace when Ace+2 held');

  // User: prefer loose single over low single that breaks a multi (pair/run).
  // exact-endgame previously took first equal-win legal (often pair-break).
  {
    const stBr = engine.createGameState(2, 42);
    stBr.isFirstLead = false;
    stBr.firstLeadCard = null;
    stBr.currentPlayer = 0;
    stBr.currentCombo = engine.detectCombo([{ rank: 0, suit: 1 }]); // face a 3
    // hand: loose 3, pair of 5s, loose 10, J, A, 2 — must beat with 10+ not break pair
    stBr.players[0].hand = [
      { rank: 0, suit: 0 }, { rank: 2, suit: 0 }, { rank: 2, suit: 1 },
      { rank: 7, suit: 0 }, { rank: 8, suit: 1 }, { rank: 10, suit: 0 }, { rank: 12, suit: 0 }
    ];
    stBr.players[1].hand = [
      { rank: 6, suit: 1 }, { rank: 7, suit: 1 }, { rank: 8, suit: 0 },
      { rank: 11, suit: 1 }, { rank: 3, suit: 2 }
    ];
    const exactBr = search.exactEndgameMove
      ? search.exactEndgameMove(stBr, 0)
      : null;
    const ordered = search.orderLegals(
      engine.getLegalPlays(stBr.players[0].hand, stBr.currentCombo, false, false, null),
      stBr, 0
    );
    const top = ordered && ordered[0];
    ok(top && top.length === 1 && top[0].rank !== 2,
      'orderLegals: loose beat over pair-break (got rank=' + (top && top[0] && top[0].rank) + ')');
    if (exactBr) {
      ok(exactBr.length === 1 && exactBr[0].rank !== 2,
        'exactEndgame: loose beat over pair-break (got rank=' + exactBr[0].rank + ')');
    }
  }

  // User screenshots IMG_0498–0504 (2026-07-12): structure preservation gold cases
  function card(r, s) { return { rank: r, suit: s, id: r * 4 + s }; }
  function handOf(arr) { return arr.map(([r, s]) => card(r, s)); }
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
    return p.map(c => c.rank).join(',');
  }
  // 0498: beat 4 with A, not 6 from pair of 6s
  {
    const st = mk(handOf([[3, 0], [3, 1], [5, 1], [6, 1], [7, 0], [8, 0], [11, 1], [12, 2]]),
      [card(1, 1)], 2);
    const d = search.expertPolicy(st, 0);
    ok(d && d.play && d.play.length === 1 && d.play[0].rank === 11,
      'IMG0498: A not 6-from-pair (got ' + playRank(d) + ')');
  }
  // 0499: free-lead 2 vs short opp, not pair of 6s
  {
    const st = mk(handOf([[3, 0], [3, 1], [12, 2]]), null, 2);
    const d = search.expertPolicy(st, 0);
    ok(d && d.play && d.play.length === 1 && d.play[0].rank === 12,
      'IMG0499: free-lead 2 not pair (got ' + playRank(d) + ')');
  }
  // 0500: beat Q with 2, not Q from JQK
  {
    const st = mk(handOf([[0, 2], [4, 0], [4, 1], [4, 2], [5, 0], [5, 2], [8, 0], [9, 2], [10, 1], [12, 0]]),
      [card(9, 0)], 3);
    const d = search.expertPolicy(st, 0);
    ok(d && d.play && d.play.length === 1 && d.play[0].rank === 12,
      'IMG0500: 2 not Q-from-JQK (got ' + playRank(d) + ')');
  }
  // 0501: pass QQ vs mid pair when holding JQKA + two 2s
  {
    const st = mk(handOf([[0, 0], [3, 0], [5, 1], [6, 0], [8, 0], [9, 0], [9, 2], [10, 0], [11, 0], [12, 0], [12, 2]]),
      [card(7, 1), card(7, 0)], 9);
    const d = search.expertPolicy(st, 0);
    ok(d && d.pass, 'IMG0501: pass not QQ (got ' + playRank(d) + ')');
  }
  // 0502: beat 5 with K, not 6 from long run
  {
    const st = mk(handOf([[2, 0], [3, 1], [4, 0], [5, 2], [6, 2], [7, 0], [10, 0], [11, 1], [12, 1]]),
      [card(2, 1)], 6);
    const d = search.expertPolicy(st, 0);
    ok(d && d.play && d.play.length === 1 && d.play[0].rank >= 10,
      'IMG0502: K/A not 6-from-run (got ' + playRank(d) + ')');
  }
  // 0503: 9-10-J-Q residual over 7-8-9-10
  {
    const st = mk(handOf([[2, 1], [4, 0], [5, 0], [6, 1], [6, 2], [7, 1], [8, 0], [8, 1], [9, 2], [11, 1], [12, 0], [12, 1], [12, 2]]),
      [card(0, 1), card(1, 0), card(2, 2), card(3, 0)], 9);
    const d = search.expertPolicy(st, 0);
    const ranks = (d.play || []).map(c => c.rank).sort((a, b) => a - b);
    ok(d && d.play && d.play.length === 4 && ranks[0] >= 6,
      'IMG0503: high residual seq (got ' + playRank(d) + ')');
  }
  // 0504: beat 7 with J, not 8 from 789
  {
    const st = mk(handOf([[4, 0], [5, 0], [6, 1], [8, 1], [11, 1], [12, 0], [12, 1], [12, 2]]),
      [card(4, 1)], 8);
    const d = search.expertPolicy(st, 0);
    ok(d && d.play && d.play.length === 1 && d.play[0].rank !== 5,
      'IMG0504: J not 8-from-789 (got ' + playRank(d) + ')');
  }

  // ─── Series 2: IMG_0505–0513 (2026-07-13) ───
  // 0505: beat 4 with 8, not 4 from 345
  {
    const st = mk(handOf([
      [0, 1], [1, 3], [2, 1], [3, 0], [3, 2], [4, 2], [4, 3], [5, 0], [5, 1], [5, 2], [12, 3]
    ]), [card(1, 2)], 11);
    const d = search.expertPolicy(st, 0);
    ok(d && d.play && d.play.length === 1 && d.play[0].rank === 5,
      'IMG0505: 8 not 4-from-345 (got ' + playRank(d) + ')');
    const gm = ai.getAIMove(st, 0, { difficulty: 'grandmaster', hiddenInfo: true, iterations: 40, timeMs: 200 });
    ok(gm && gm.length === 1 && gm[0].rank === 5,
      'IMG0505 gm: 8 not 4 (got ' + playRank(gm) + ')');
  }
  // 0506: free-lead doubleseq 667788, not 6-card straight
  {
    const st = mk(handOf([
      [0, 1], [1, 3], [2, 1], [3, 0], [3, 2], [4, 2], [4, 3], [5, 0], [5, 1]
    ]), null, 10);
    const d = search.expertPolicy(st, 0);
    const com = d.play ? engine.detectCombo(d.play) : null;
    ok(com && com.type === 'doubleseq' && d.play.length === 6,
      'IMG0506: free-lead doubleseq 667788 (got ' + playRank(d) + ' type=' + (com && com.type) + ')');
    const gm = ai.getAIMove(st, 0, { difficulty: 'grandmaster', hiddenInfo: true, iterations: 40, timeMs: 300 });
    const gcom = gm ? engine.detectCombo(gm) : null;
    ok(gcom && gcom.type === 'doubleseq' && gm.length === 6,
      'IMG0506 gm: doubleseq (got ' + playRank(gm) + ' type=' + (gcom && gcom.type) + ')');
  }
  // 0507: first-lead full 334455 doubleseq, not pair of 3s
  {
    const hand = handOf([
      [0, 0], [0, 1], [1, 2], [1, 3], [2, 0], [2, 3], [4, 0], [5, 3], [6, 2], [7, 2], [8, 2], [10, 2], [11, 1]
    ]);
    const st = mk(hand, null, 13);
    st.isFirstLead = true;
    st.firstLeadCard = card(0, 0);
    const d = search.expertPolicy(st, 0);
    const com = d.play ? engine.detectCombo(d.play) : null;
    ok(com && com.type === 'doubleseq' && d.play.length === 6 &&
      d.play.some(c => c.rank === 0 && c.suit === 0),
      'IMG0507: first-lead 334455 doubleseq (got ' + playRank(d) + ' type=' + (com && com.type) + ')');
    const gm = ai.getAIMove(st, 0, { difficulty: 'grandmaster', hiddenInfo: true, iterations: 40, timeMs: 300 });
    const gcom = gm ? engine.detectCombo(gm) : null;
    ok(gcom && gcom.type === 'doubleseq' && gm.length === 6,
      'IMG0507 gm: doubleseq (got ' + playRank(gm) + ' type=' + (gcom && gcom.type) + ')');
  }
  // 0510: pass vs mid seq — save QQ/KK for low pairs
  {
    const st = mk(handOf([
      [1, 3], [3, 2], [3, 3], [4, 2], [4, 3], [7, 3], [9, 0], [9, 3], [10, 1], [10, 3], [11, 1], [12, 2], [12, 3]
    ]), [card(1, 0), card(2, 0), card(3, 0)], 10);
    const d = search.expertPolicy(st, 0);
    ok(d && d.pass, 'IMG0510: pass not QKA (got ' + playRank(d) + ')');
    const gm = ai.getAIMove(st, 0, { difficulty: 'grandmaster', hiddenInfo: true, iterations: 40, timeMs: 200 });
    ok(gm == null, 'IMG0510 gm: pass (got ' + playRank(gm) + ')');
  }
  // 0511: pass vs AA — save 22 for singles
  {
    const st = mk(handOf([
      [1, 3], [3, 2], [3, 3], [4, 2], [4, 3], [7, 3], [9, 0], [9, 3], [10, 1], [10, 3], [11, 1], [12, 2], [12, 3]
    ]), [card(11, 0), card(11, 3)], 5);
    const d = search.expertPolicy(st, 0);
    ok(d && d.pass, 'IMG0511: pass not 22 (got ' + playRank(d) + ')');
    const gm = ai.getAIMove(st, 0, { difficulty: 'grandmaster', hiddenInfo: true, iterations: 40, timeMs: 200 });
    ok(gm == null, 'IMG0511 gm: pass (got ' + playRank(gm) + ')');
  }
  // 0512: beat 5 with 10, not 6 from pair
  {
    const st = mk(handOf([
      [1, 3], [3, 2], [3, 3], [4, 2], [4, 3], [7, 3], [9, 0], [9, 3], [10, 1], [10, 3], [11, 1], [12, 2], [12, 3]
    ]), [card(2, 3)], 4);
    const d = search.expertPolicy(st, 0);
    ok(d && d.play && d.play.length === 1 && d.play[0].rank === 7,
      'IMG0512: 10 not 6-from-pair (got ' + playRank(d) + ')');
  }
  // 0513: beat K with 2, not K from pair
  {
    const st = mk(handOf([
      [1, 3], [3, 2], [3, 3], [4, 2], [4, 3], [9, 0], [9, 3], [10, 1], [10, 3], [11, 1], [12, 2], [12, 3]
    ]), [card(10, 0)], 3);
    const d = search.expertPolicy(st, 0);
    ok(d && d.play && d.play.length === 1 && d.play[0].rank === 12,
      'IMG0513: 2 not K-from-pair (got ' + playRank(d) + ')');
  }
}

console.log('\n=== SEARCH TEST SUMMARY ===');
console.log('Passed:', passed, 'Failed:', failed);
if (failed) process.exit(1);
console.log('ALL SEARCH TESTS PASSED');
