/**
 * Tiến Lên (Tien Len / Thirteen) - Pure Rules Engine
 * Canonical rules per Pagat.com (John McLeod) + Wikipedia core 4p set.
 * Supports 2-4 players, 13 cards each.
 * All functions pure or seeded where noted. No DOM.
 *
 * Card model: { rank: 0..12 (3..2), suit: 0..3 (s,c,d,h) } with suit 3=♥ highest.
 */

const RANKS = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
const SUITS = ['s','c','d','h'];
const SUIT_SYMBOLS = { s: '♠', c: '♣', d: '♦', h: '♥' };

function createCard(rankIdx, suitIdx) { return { rank: rankIdx, suit: suitIdx }; }

function cardToString(c) { return RANKS[c.rank] + SUIT_SYMBOLS[SUITS[c.suit]]; }

function cardCompare(a, b) { if (a.rank !== b.rank) return a.rank - b.rank; return a.suit - b.suit; }

function getTopCard(cards) { if (!cards || !cards.length) return null; return cards.reduce((best, c) => cardCompare(c, best) > 0 ? c : best); }

function seededRandom(seed) { let s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function shuffle(array, seed = null) { const arr = array.slice(); const rand = seed != null ? seededRandom(seed) : Math.random; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

function createDeck() { const deck = []; for (let r = 0; r < 13; r++) { for (let s = 0; s < 4; s++) { deck.push(createCard(r, s)); } } return deck; }

function dealCards(numPlayers = 4, seed = null) {
  if (numPlayers < 2 || numPlayers > 4) throw new Error('Only 2-4 players supported');
  const deck = shuffle(createDeck(), seed);
  const hands = Array.from({ length: numPlayers }, () => []);
  for (let i = 0; i < 13; i++) { for (let p = 0; p < numPlayers; p++) { hands[p].push(deck[p * 13 + i]); } }
  let firstLeadCard = null; let firstPlayer = 0;
  for (let p = 0; p < numPlayers; p++) {
    const three = hands[p].find(c => c.rank === 0 && c.suit === 0);
    if (three) { firstPlayer = p; firstLeadCard = three; break; }
  }
  if (!firstLeadCard) {
    let lowest = null; let owner = 0;
    for (let p = 0; p < numPlayers; p++) {
      for (const c of hands[p]) { if (!lowest || cardCompare(c, lowest) < 0) { lowest = c; owner = p; } }
    }
    firstPlayer = owner; firstLeadCard = lowest;
  }
  return { hands, firstPlayer, firstLeadCard, discarded: deck.slice(numPlayers * 13) };
}

function cloneState(s) { return JSON.parse(JSON.stringify(s)); }

function detectCombo(cards) {
  if (!cards || !cards.length) return null;
  const sorted = cards.slice().sort(cardCompare);
  const len = sorted.length;
  if (len === 1) return { type: 'single', cards: sorted, top: sorted[0] };
  const ranks = sorted.map(c => c.rank);
  const allSame = ranks.every(r => r === ranks[0]);
  if (allSame) {
    const t = len === 2 ? 'pair' : len === 3 ? 'triple' : len === 4 ? 'quad' : null;
    if (t) return { type: t, cards: sorted, top: sorted[len-1] };
  }
  let consec = true;
  for (let i = 1; i < len; i++) { if (sorted[i].rank !== sorted[i-1].rank + 1) { consec = false; break; } }
  if (consec && len >= 3) return { type: 'seq', cards: sorted, top: sorted[len-1], length: len };
  if (len % 2 === 0 && len >= 6) {
    let ok = true;
    for (let i = 0; i < len; i += 2) {
      if (sorted[i].rank !== sorted[i+1].rank) { ok = false; break; }
      if (i > 0 && sorted[i].rank !== sorted[i-2].rank + 1) { ok = false; break; }
    }
    if (ok) return { type: 'doubleseq', cards: sorted, top: sorted[len-1], numPairs: len/2 };
  }
  return null;
}

function sameTypeAndLen(a, b) { if (!a || !b || a.type !== b.type) return false; if (a.type === 'seq' || a.type === 'doubleseq') return (a.length || a.numPairs) === (b.length || b.numPairs); return true; }

function compareSameTypeCombos(cand, cur) { return cardCompare(cand.top, cur.top); }

function isBomb(com) { return com && (com.type === 'quad' || (com.type === 'doubleseq' && com.numPairs >= 3)); }

function bombBeats2s(bomb, twos) {
  if (!isBomb(bomb) || !twos || !twos.cards || twos.cards.some(c => c.rank !== 12)) return false;
  const n2 = twos.cards.length;
  if (bomb.type === 'quad') return n2 <= 1;
  const p = bomb.numPairs || 0;
  if (p >= 3 && n2 === 1) return true;
  if (p >= 4 && n2 === 2) return true;
  if (p >= 5 && n2 === 3) return true;
  return false;
}

function canBeat(current, candidate, hasPassed = false) {
  if (!candidate) return false;
  if (!current) return true;
  if (bombBeats2s(candidate, current)) return true;
  if (!sameTypeAndLen(current, candidate)) return false;
  if (hasPassed) return false;
  return compareSameTypeCombos(candidate, current) > 0;
}

function getCombinations(arr, k) {
  const res = [];
  function rec(start, cur) { if (cur.length === k) { res.push(cur.slice()); return; } for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i+1, cur); cur.pop(); } }
  rec(0, []);
  return res;
}

function cartesian(arrays) {
  if (!arrays.length) return [[]];
  let res = [[]];
  for (const arr of arrays) { const next = []; for (const x of res) for (const y of arr) next.push([...x, y]); res = next; }
  return res;
}

function getLegalPlays(hand, currentCombo, hasPassed, isFirstLeadOfGame, firstLeadCard = null) {
  if (!hand || !hand.length) return [];
  const legal = [];
  const byRank = {};
  hand.forEach(c => { (byRank[c.rank] || (byRank[c.rank] = [])).push(c); });
  hand.forEach(c => { const com = detectCombo([c]); if (com && canBeat(currentCombo, com, hasPassed)) legal.push([c]); });
  Object.keys(byRank).forEach(rk => {
    const grp = byRank[rk];
    for (let k = 2; k <= Math.min(4, grp.length); k++) {
      getCombinations(grp, k).forEach(cmb => { const com = detectCombo(cmb); if (com && canBeat(currentCombo, com, hasPassed)) legal.push(cmb); });
    }
  });
  const uniqueRanks = Object.keys(byRank).map(Number).sort((a,b)=>a-b);
  for (let len = 3; len <= uniqueRanks.length; len++) {
    for (let start = 0; start <= uniqueRanks.length - len; start++) {
      let ok = true;
      for (let i = 1; i < len; i++) if (uniqueRanks[start+i] !== uniqueRanks[start] + i) { ok = false; break; }
      if (!ok) continue;
      const groups = uniqueRanks.slice(start, start+len).map(r => byRank[r]);
      cartesian(groups).forEach(seq => { const com = detectCombo(seq); if (com && canBeat(currentCombo, com, hasPassed)) legal.push(seq); });
    }
  });
  for (let lenP = 3; lenP <= uniqueRanks.length; lenP++) {
    for (let st = 0; st <= uniqueRanks.length - lenP; st++) {
      let ok = true;
      const pairRanks = [];
      for (let i = 0; i < lenP; i++) {
        const r = uniqueRanks[st+i];
        if ((byRank[r] || []).length < 2) { ok = false; break; }
        pairRanks.push(r);
      }
      if (!ok) continue;
      const pairGroups = pairRanks.map(r => getCombinations(byRank[r], 2));
      cartesian(pairGroups).map(grp => [].concat.apply([], grp)).forEach(ds => { const com = detectCombo(ds); if (com && canBeat(currentCombo, com, hasPassed)) legal.push(ds); });
    }
  });
  if (hasPassed && currentCombo && currentCombo.cards.every(c => c.rank === 12)) {
    // bombs already included via canBeat
  }
  if (isFirstLeadOfGame && currentCombo == null && firstLeadCard) {
    const filtered = legal.filter(play => play.some(c => c.rank === firstLeadCard.rank && c.suit === firstLeadCard.suit));
    if (filtered.length) return filtered;
  }
  const seen = new Set();
  const uniqueLegal = [];
  for (const play of legal) {
    const sig = play.map(c => c.rank*4 + c.suit).sort((a,b)=>a-b).join(',');
    if (!seen.has(sig)) { seen.add(sig); uniqueLegal.push(play); }
  }
  return uniqueLegal;
}

function applyPlay(state, playerIdx, playCards) {
  const newState = JSON.parse(JSON.stringify(state));
  const hand = newState.players[playerIdx].hand;
  playCards.forEach(played => {
    const idx = hand.findIndex(c => c.rank === played.rank && c.suit === played.suit);
    if (idx >= 0) hand.splice(idx, 1);
  });
  const combo = detectCombo(playCards);
  newState.currentCombo = combo;
  newState.lastPlayBy = playerIdx;
  newState.players[playerIdx].passed = false;
  if (hand.length === 0) {
    newState.players[playerIdx].finished = true;
    newState.finishOrder = newState.finishOrder || [];
    if (!newState.finishOrder.includes(playerIdx)) newState.finishOrder.push(playerIdx);
  }
  const active = newState.players.map((p, idx) => ({p, idx})).filter(({p}) => !p.finished);
  const othersAllPassed = active.filter(({idx}) => idx !== playerIdx).every(({p}) => p.passed || p.finished);
  const wasBeating = state.currentCombo != null;
  if (wasBeating && othersAllPassed) {
    newState.currentCombo = null;
    newState.lastPlayBy = null;
    newState.players.forEach((p, i) => { if (!p.finished) p.passed = false; });
    newState.currentLeader = playerIdx;
    newState.currentPlayer = playerIdx;
  } else {
    newState.currentPlayer = (playerIdx + 1) % newState.players.length;
  }
  while (newState.players[newState.currentPlayer].finished) {
    newState.currentPlayer = (newState.currentPlayer + 1) % newState.players.length;
  }
  const stillIn = newState.players.filter(p => !p.finished).length;
  if (stillIn <= 1) {
    newState.roundOver = true;
    newState.loser = newState.players.findIndex(p => !p.finished);
  }
  return newState;
}

function pass(state, playerIdx) {
  const newState = JSON.parse(JSON.stringify(state));
  newState.players[playerIdx].passed = true;
  newState.currentPlayer = (playerIdx + 1) % newState.players.length;
  while (newState.players[newState.currentPlayer] && newState.players[newState.currentPlayer].finished) {
    newState.currentPlayer = (newState.currentPlayer + 1) % newState.players.length;
  }
  const activeNonFinished = newState.players.filter((p,i) => !p.finished);
  if (activeNonFinished.every(p => p.passed)) {
    newState.currentCombo = null;
    newState.lastPlayBy = null;
    newState.players.forEach((p, i) => { if (!p.finished) p.passed = false; });
    const leader = (typeof newState.lastPlayBy === 'number') ? newState.lastPlayBy : newState.currentPlayer;
    newState.currentLeader = leader;
    newState.currentPlayer = leader;
    while (newState.players[newState.currentPlayer] && newState.players[newState.currentPlayer].finished) {
      newState.currentPlayer = (newState.currentPlayer + 1) % newState.players.length;
    }
  }
  const stillIn = newState.players.filter(p => !p.finished).length;
  if (stillIn <= 1) {
    newState.roundOver = true;
    newState.loser = newState.players.findIndex(p => !p.finished);
  }
  return newState;
}

function createGameState(numPlayers, seed = Date.now()) {
  const deal = dealCards(numPlayers, seed);
  const { hands, firstPlayer, firstLeadCard } = deal;
  const players = hands.map((h, i) => ({ id: i, hand: h, passed: false, finished: false }));
  const state = {
    numPlayers,
    players,
    currentPlayer: firstPlayer,
    currentLeader: firstPlayer,
    currentCombo: null,
    lastPlayBy: null,
    isFirstLead: true,
    firstLeadCard,
    roundOver: false,
    finishOrder: [],
    loser: null
  };
  return state;
}

if (typeof module !== 'undefined' && module.exports) module.exports = { RANKS, SUITS, SUIT_SYMBOLS, createCard, cardToString, createDeck, dealCards, shuffle, createGameState, getLegalPlays, applyPlay, pass, detectCombo, cardCompare, getTopCard, cloneState, canBeat, isBomb, bombBeats2s };
if (typeof window !== 'undefined') window.TienLenEngine = module.exports || {};
