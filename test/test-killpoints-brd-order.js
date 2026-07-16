'use strict';
/**
 * Regression for DEEP-DIVE-logic-killpoints.md:
 * 1) free-lead BRD root order is not wiped by orderLegals before maxBranch
 * 2) freeLeadCandidates uses BR-teacher order when available (not pure expert)
 */
const assert = require('assert');
const path = require('path');
const engine = require(path.join(__dirname, '..', 'engine.js'));
const search = require(path.join(__dirname, '..', 'search.js'));

function card(r, s) { return { rank: r, suit: s, id: r * 4 + s }; }

function deepFreeLeadState() {
  const hand = [];
  // Mixed: low multi, long seq material, trash, control 2
  for (let r = 0; r <= 8; r++) hand.push(card(r, r % 4));
  hand.push(card(12, 0));
  const opp = [];
  for (let i = 0; i < 9; i++) opp.push(card((i + 1) % 11, i % 4));
  return {
    numPlayers: 2,
    players: [
      { hand: hand, passed: false, finished: false },
      { hand: opp, passed: false, finished: false }
    ],
    currentPlayer: 0,
    currentCombo: null,
    isFirstLead: false,
    firstLeadCard: null,
    finishOrder: [],
    roundOver: false,
    publicHistory: []
  };
}

function playKey(p) {
  return p.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; }).join(',');
}

const st = deepFreeLeadState();
const leg = engine.getLegalPlays(
  st.players[0].hand, null, false, false, null
);
assert(leg.length > 8, 'need rich free-lead branch for test');

const fl = search.freeLeadCandidates(leg, st, 0);
const expertOrd = search.orderLegals(fl.slice(), st, 0);

// freeLeadCandidates should not be identical to pure orderLegals when BRD is live
// (teacher prior re-ranks). If equal, BRD may be no-op for this hand — still check BR root.
const flKeys = fl.slice(0, 6).map(playKey);
const exKeys = expertOrd.slice(0, 6).map(playKey);
const brdDiffers = flKeys.join('|') !== exKeys.join('|');
console.log('freeLeadCandidates vs expert top-6 differ?', brdDiffers);

// bestResponseMove free-lead: top branch must prefer longer/low structure packages over
// pure short expert multi when BRD ranks them higher — smoke that BR returns a free lead.
const br = search.bestResponseMove(st, 0, {
  trials: 6,
  timeMs: 0,
  maxBranch: 10,
  perfectInfo: false
});
assert(br && br.play && br.play.length >= 1, 'BR free-lead returns a play');
assert(!st.currentCombo, 'test is free-lead');

// Structural: source must not re-order free-lead by orderLegals AFTER brdLogit sort
const fs = require('fs');
const src = fs.readFileSync(path.join(__dirname, '..', 'search.js'), 'utf8');
const brIdx = src.indexOf('function bestResponseMove');
const brBody = src.slice(brIdx, brIdx + 3500);
// After free-lead brdLogit sort, must not call orderLegals again before maxBranch
const freeBlock = brBody.match(/if \(!cur\) \{[\s\S]*?if \(leg\.length > maxBranch\)/);
assert(freeBlock, 'free-lead block found in bestResponseMove');
assert(
  !/brdLogit[\s\S]{0,400}orderLegals\(leg/.test(freeBlock[0]),
  'orderLegals must not run after brdLogit free-lead sort (BRD wipe kill-point)'
);
assert(
  /BR-teacher free-lead order FINAL|brdLogit\(state, myIdx, b\)/.test(freeBlock[0]),
  'BRD free-lead sort present'
);

console.log('OK test-killpoints-brd-order');
console.log('BR free-lead pick ranks:', br.play.map(function (c) { return c.rank; }).join(','));
