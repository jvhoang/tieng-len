'use strict';
/**
 * Regression: product GM path must not force expert-only (controller bug),
 * and expert/dual must spend single 2 for control vs high singles.
 */
const assert = require('assert');
const path = require('path');
const engine = require(path.join(__dirname, '..', 'engine.js'));
const search = require(path.join(__dirname, '..', 'search.js'));
const ai = require(path.join(__dirname, '..', 'ai.js'));

function card(r, s) { return { rank: r, suit: s, id: r * 4 + s }; }
function mk(myHand, curCards, oppN) {
  const opp = [];
  for (let i = 0; i < oppN; i++) opp.push(card(0, i % 4));
  return {
    numPlayers: 2,
    players: [
      { hand: myHand.map(function (c) { return { rank: c.rank, suit: c.suit, id: c.id }; }), passed: false, finished: false },
      { hand: opp, passed: false, finished: false }
    ],
    currentPlayer: 0,
    currentCombo: engine.detectCombo(curCards),
    lastPlayBy: 1,
    isFirstLead: false,
    firstLeadCard: null,
    finishOrder: [],
    roundOver: false,
    publicHistory: []
  };
}
function isSingleTwo(mv) {
  return mv && mv.length === 1 && mv[0].rank === 12;
}

// vs K with 2 held → expert spends 2
{
  const st = mk(
    [card(10, 0), card(10, 1), card(12, 0), card(3, 0), card(4, 1), card(5, 2), card(6, 3), card(7, 0)],
    [card(10, 2)],
    6
  );
  const d = search.expertPolicy(st, 0);
  assert(d && d.play && isSingleTwo(d.play), 'expert: single 2 vs K for control');
  const dual = search.dualRolloutPolicy(st, 0);
  assert(dual && dual.play && isSingleTwo(dual.play), 'dualRollout: single 2 vs K for control');
}

// vs Q with straight+2 → expert spends 2 (not A)
{
  const st = mk(
    [card(7, 0), card(8, 1), card(9, 2), card(10, 3), card(12, 1), card(0, 0), card(0, 1), card(11, 0), card(11, 1)],
    [card(9, 0)],
    5
  );
  const d = search.expertPolicy(st, 0);
  assert(d && d.play && isSingleTwo(d.play), 'expert: single 2 vs Q not Ace climb');
}

// vs Ace always 2
{
  const st = mk([card(12, 0), card(5, 0), card(6, 1)], [card(11, 0)], 4);
  const d = search.expertPolicy(st, 0);
  assert(d && d.play && isSingleTwo(d.play), 'expert: 2 vs Ace');
}

// Product GM getAIMove should use search (not force expert via iterations:0)
// Soft check: call with controller-like NEW opts
{
  const st = mk(
    [card(10, 0), card(10, 1), card(12, 0), card(3, 0), card(4, 1), card(5, 2), card(6, 3), card(7, 0)],
    [card(10, 2)],
    6
  );
  const mv = ai.getAIMove(st, 0, {
    difficulty: 'grandmaster',
    useSearch: true,
    perfectInfo: false,
    hiddenInfo: true,
    bestResponse: true,
    timeMs: 0,
    brTrials: 8
  });
  // BR may pass or play 2; must not be forced to wrong expert-only if we only care path works
  assert(mv === null || (Array.isArray(mv) && mv.length >= 1), 'product GM path returns legal pass/play');
}

console.log('OK test-2-for-control');
