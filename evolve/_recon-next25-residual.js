'use strict';
/** Reconstruct next25 residual seeds for fair dual mbnest analysis. */
const engine = require('../engine.js');
const RANKS = engine.RANKS;
const SUITS = engine.SUITS;
const SYM = { s: '♠', c: '♣', d: '♦', h: '♥' };

function cardStr(c) {
  return RANKS[c.rank] + SYM[SUITS[c.suit]];
}
function handStr(hand) {
  return hand
    .slice()
    .sort((a, b) => a.rank - b.rank || a.suit - b.suit)
    .map(cardStr)
    .join(' ');
}
function multiSummary(hand, isFirstLead, firstLeadCard) {
  const leg = engine.getLegalPlays(hand, null, false, isFirstLead, firstLeadCard);
  const multis = [];
  const seen = Object.create(null);
  for (const p of leg) {
    if (!p || p.length < 2) continue;
    const all2 = p.every((c) => c.rank === 12);
    if (all2) continue;
    const com = engine.detectCombo(p);
    if (!com) continue;
    const sig = com.type + ':' + p.map(cardStr).join('');
    if (seen[sig]) continue;
    seen[sig] = 1;
    multis.push({
      type: com.type,
      len: p.length,
      top: cardStr(com.top),
      play: p.map(cardStr).join(' ')
    });
  }
  multis.sort((a, b) => b.len - a.len || a.top.localeCompare(b.top));
  return multis.slice(0, 14);
}
function singlesSummary(hand, isFirstLead, firstLeadCard) {
  const leg = engine.getLegalPlays(hand, null, false, isFirstLead, firstLeadCard);
  return leg
    .filter((p) => p && p.length === 1)
    .map((p) => cardStr(p[0]))
    .slice(0, 13);
}

// Worst residuals: both-lose (0/2) + sticky 1/2 with known first-diff / long midgames
const SEEDS = [
  { seed: 20520009, mbnest: '0/2', id: '1/2', steps: [22, 13], note: 'both-lose; id seat1 win' },
  { seed: 20589820, mbnest: '0/2', id: '1/2', steps: [18, 13], note: 'seat1 nest free-lead trash vs id pair' },
  { seed: 20629712, mbnest: '0/2', id: '1/2', steps: [13, 28], note: 'seat0 nest 22 over v91 PASS' },
  { seed: 20719469, mbnest: '1/2', id: '1/2', steps: [24, 22], note: 'long mid; seat flip vs id' },
  { seed: 20609766, mbnest: '1/2', id: '1/2', steps: [25, 23], note: 'historic FL multi residual' },
  { seed: 20500063, mbnest: '0/2*', id: '1/2*', steps: [28, 17], note: 'first25 border both-lose mbnest (context)' }
];

const out = [];
for (const row of SEEDS) {
  const st = engine.createGameState(2, row.seed);
  const first = st.firstLeadCard ? cardStr(st.firstLeadCard) : null;
  out.push({
    seed: row.seed,
    mbnest: row.mbnest,
    identity: row.id,
    note: row.note,
    firstPlayer: st.currentPlayer,
    firstLeadCard: first,
    p0: handStr(st.players[0].hand),
    p1: handStr(st.players[1].hand),
    p0Multi: multiSummary(st.players[0].hand, st.currentPlayer === 0, st.firstLeadCard),
    p1Multi: multiSummary(st.players[1].hand, st.currentPlayer === 1, st.firstLeadCard),
    p0Singles: singlesSummary(st.players[0].hand, st.currentPlayer === 0, st.firstLeadCard),
    p1Singles: singlesSummary(st.players[1].hand, st.currentPlayer === 1, st.firstLeadCard)
  });
}
console.log(JSON.stringify(out, null, 2));
