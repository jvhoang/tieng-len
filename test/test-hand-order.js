/**
 * test/test-hand-order.js
 * Drives shipped hand-order.js helpers (default sort low→high, custom reorder).
 */
const ho = require('../hand-order.js');
const engine = require('../engine.js');
const fs = require('fs');
const path = require('path');

const SCRATCH = process.env.TIENLEN_SCRATCH ||
  '/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-788f87ebb8d7/implementer';
if (!fs.existsSync(SCRATCH)) fs.mkdirSync(SCRATCH, { recursive: true });
const out = [];
const log = (m) => { out.push(m); console.log(m); };
let passed = 0, failed = 0;
function t(name, c, d) {
  if (c) { passed++; log('PASS: ' + name); }
  else { failed++; log('FAIL: ' + name + (d ? ' ' + d : '')); }
}

log('=== HAND ORDER UNIT TESTS (shipped hand-order.js) ===\n');

const hand = [
  { rank: 12, suit: 3 }, // 2♥ highest
  { rank: 0, suit: 0 },  // 3♠ lowest
  { rank: 5, suit: 1 },
  { rank: 5, suit: 3 },
  { rank: 0, suit: 3 },
  { rank: 10, suit: 0 }
];

const sorted = ho.sortHandDefault(hand);
t('sortHandDefault returns same length', sorted.length === hand.length);
t('leftmost is lowest (3♠)', sorted[0].rank === 0 && sorted[0].suit === 0);
t('rightmost is highest (2♥)', sorted[sorted.length - 1].rank === 12 && sorted[sorted.length - 1].suit === 3);
// Fully ascending via cardCompare
let asc = true;
for (let i = 1; i < sorted.length; i++) {
  if (engine.cardCompare(sorted[i - 1], sorted[i]) > 0) asc = false;
}
t('default order matches cardCompare ascending', asc);

// Custom order: keep pairs together by putting both 5s first
const customKeys = [
  5 * 4 + 1,
  5 * 4 + 3,
  0 * 4 + 0,
  0 * 4 + 3,
  10 * 4 + 0,
  12 * 4 + 3
];
const custom = ho.applyHandOrder(hand, customKeys);
t('applyHandOrder length preserved', custom.length === hand.length);
t('custom order: first is first 5', custom[0].rank === 5 && custom[0].suit === 1);
t('custom order: second is second 5', custom[1].rank === 5 && custom[1].suit === 3);

// Reorder drag: move index 0 to index 3
const reordered = ho.reorderCards(sorted, 0, 3);
t('reorderCards length same', reordered.length === sorted.length);
t('reorderCards moved item to new index', reordered[3].rank === sorted[0].rank && reordered[3].suit === sorted[0].suit);
t('reorderCards removed from old position', reordered[0].rank === sorted[1].rank);

// sync after play (drop a card)
const afterPlay = hand.filter(c => !(c.rank === 12 && c.suit === 3));
const keys = ho.syncOrderKeys(afterPlay, customKeys);
const applied = ho.applyHandOrder(afterPlay, keys);
t('syncOrderKeys drops played card', applied.every(c => !(c.rank === 12 && c.suit === 3)));
t('syncOrderKeys preserves relative custom order of remaining', applied[0].rank === 5);

log('\nSUMMARY passed=' + passed + ' failed=' + failed);
fs.writeFileSync(path.join(SCRATCH, 'hand-order-tests.log'), out.join('\n') + '\n');
if (failed > 0) process.exit(1);
log('HAND ORDER TESTS PASSED');
process.exit(0);
