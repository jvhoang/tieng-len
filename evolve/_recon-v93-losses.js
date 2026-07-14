'use strict';
/** One-shot residual dual-loss deal reconstruction for v9.3 note. */
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
    // skip pure-2 / bomb-like expensive free leads for summary
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
  // prefer unique by type+len+top rank, keep short list
  multis.sort((a, b) => b.len - a.len || a.top.localeCompare(b.top));
  return multis.slice(0, 12);
}

const SEEDS = [
  { seed: 20380387, liveSeat: 1, steps: 5, klass: 'multi-climb structural' },
  { seed: 20549928, liveSeat: 0, steps: 16, klass: 'short multi tempo' },
  { seed: 20470144, liveSeat: 0, steps: 17, klass: 'pair-war / AA burn' },
  { seed: 20609766, liveSeat: 0, steps: 15, klass: 'free-lead multi mine' },
  { seed: 20310576, liveSeat: 0, steps: 16, klass: 'mid combat residual' }
];

const out = [];
for (const row of SEEDS) {
  const st = engine.createGameState(2, row.seed);
  const live = row.liveSeat;
  const opp = 1 - live;
  const liveFirst = st.currentPlayer === live;
  const first = st.firstLeadCard ? cardStr(st.firstLeadCard) : null;
  const liveHand = st.players[live].hand;
  const oppHand = st.players[opp].hand;
  const multi = multiSummary(liveHand, liveFirst && st.isFirstLead, st.firstLeadCard);
  out.push({
    seed: row.seed,
    steps: row.steps,
    klass: row.klass,
    liveSeat: live,
    firstPlayer: st.currentPlayer,
    firstLeadCard: first,
    liveFirst,
    liveHand: handStr(liveHand),
    oppHand: handStr(oppHand),
    freeLeadMultiTop: multi,
    multiCount: multi.length
  });
}
console.log(JSON.stringify(out, null, 2));
