/**
 * Tiến Lên (Tien Len / Thirteen) - Pure Rules Engine
 * Canonical rules per Pagat.com (John McLeod) + Wikipedia core 4p set.
 * Supports 2-4 players, 13 cards each.
 * All functions pure or seeded where noted. No DOM.
 *
 * Card model: { rank: 0..12 (3..2), suit: 0..3 (s,c,d,h) } with suit 3=♥ highest.
 */

const RANKS = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
const SUITS = ['s','c','d','h']; // 0=♠ low ... 3=♥ high
const SUIT_SYMBOLS = { s: '♠', c: '♣', d: '♦', h: '♥' };

function createCard(rankIdx, suitIdx) {
  return { rank: rankIdx, suit: suitIdx };
}

function cardToString(c) {
  return RANKS[c.rank] + SUIT_SYMBOLS[SUITS[c.suit]];
}

function cardCompare(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  return a.suit - b.suit;
}

function getTopCard(cards) {
  if (!cards || !cards.length) return null;
  return cards.reduce((best, c) => cardCompare(c, best) > 0 ? c : best);
}

// Seeded RNG for reproducible tests / AI rollouts
function seededRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shuffle(array, seed = null) {
  const arr = array.slice();
  const rand = seed != null ? seededRandom(seed) : Math.random;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createDeck() {
  const deck = [];
  for (let r = 0; r < 13; r++) {
    for (let s = 0; s < 4; s++) {
      deck.push(createCard(r, s));
    }
  }
  return deck;
}

// Deal 13 each to n players (2-4). Excess discarded (not used).
function dealCards(numPlayers = 4, seed = null) {
  if (numPlayers < 2 || numPlayers > 4) throw new Error('Only 2-4 players supported');
  const deck = shuffle(createDeck(), seed);
  const hands = Array.from({ length: numPlayers }, () => []);
  for (let i = 0; i < 13; i++) {
    for (let p = 0; p < numPlayers; p++) {
      hands[p].push(deck[p * 13 + i]);
    }
  }
  // Find player with 3 of spades (rank 0, suit 0) for first lead
  let firstPlayer = 0;
  for (let p = 0; p < numPlayers; p++) {
    if (hands[p].some(c => c.rank === 0 && c.suit === 0)) {
      firstPlayer = p;
      break;
    }
  }
  return { hands, firstPlayer, discarded: deck.slice(numPlayers * 13) };
}

// Normalize: sort descending (highest first)
function sortCombo(cards) {
  return cards.slice().sort((a, b) => cardCompare(b, a));
}

// Detect combo type and top. Returns null if invalid.
function detectCombo(rawCards) {
  if (!rawCards || rawCards.length === 0) return null;
  const cards = sortCombo(rawCards);
  const n = cards.length;
  if (n === 1) {
    return { type: 'single', cards, top: cards[0], size: 1 };
  }
  // Group by rank
  const groups = {};
  for (const c of cards) {
    groups[c.rank] = (groups[c.rank] || 0) + 1;
  }
  const ranks = Object.keys(groups).map(Number).sort((a,b)=>b-a); // high to low
  const counts = Object.values(groups);

  // Pair / triple / quad
  if (ranks.length === 1) {
    const cnt = groups[ranks[0]];
    if (cnt === 2) return { type: 'pair', cards, top: cards[0], size: 2 };
    if (cnt === 3) return { type: 'triple', cards, top: cards[0], size: 3 };
    if (cnt === 4) return { type: 'quad', cards, top: cards[0], size: 4 };
    return null;
  }

  // Sequence: consecutive unique ranks, any suits, >=3
  const isSeq = ranks.length === n && counts.every(c => c === 1);
  if (isSeq) {
    let consec = true;
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i-1] - ranks[i] !== 1) { consec = false; break; }
    }
    if (consec && n >= 3) {
      return { type: 'seq', cards, top: cards[0], size: n };
    }
  }

  // Double sequence: exactly pairs of consecutive ranks, >=3 pairs
  const allPairs = counts.every(c => c === 2) && ranks.length >= 3;
  if (allPairs) {
    let consec = true;
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i-1] - ranks[i] !== 1) { consec = false; break; }
    }
    if (consec) {
      return { type: 'doubleseq', cards, top: cards[0], size: n, numPairs: ranks.length };
    }
  }

  return null;
}

function comboTypeString(c) {
  if (!c) return 'none';
  if (c.type === 'doubleseq') return `double-seq (${c.numPairs} pairs)`;
  return `${c.type} (${c.size})`;
}

// Same type & length required (except bombs handle separately)
function sameTypeAndLen(a, b) {
  if (!a || !b) return false;
  if (a.type !== b.type) return false;
  if (a.type === 'doubleseq') return a.numPairs === b.numPairs;
  return a.size === b.size;
}

// Compare two same-type combos. Returns >0 if a beats b.
function compareSameTypeCombos(a, b) {
  if (!sameTypeAndLen(a, b)) return 0;
  return cardCompare(a.top, b.top);
}

// Is this a bomb candidate vs 2s?
function isBomb(combo) {
  if (!combo) return false;
  if (combo.type === 'quad') return true;
  if (combo.type === 'doubleseq' && combo.numPairs >= 3) return true;
  return false;
}

// Check if bomb beats a current play that is made of 2s (rank=12).
// Returns true only for the documented bomb powers.
function bombBeats2s(bomb, current) {
  if (!isBomb(bomb) || !current) return false;
  // Current must be composed purely of 2s for the exceptions
  const allTwos = current.cards.every(c => c.rank === 12);
  if (!allTwos) return false;
  const numTwos = current.cards.length;
  if (bomb.type === 'quad') {
    return numTwos === 1; // beats single 2
  }
  if (bomb.type === 'doubleseq') {
    const p = bomb.numPairs;
    if (numTwos === 1) return p >= 3;
    if (numTwos === 2) return p >= 4;
    if (numTwos === 3) return p >= 5;
  }
  return false;
}

// Can candidate beat the current? (includes bomb exception)
function canBeat(current, candidate, hasPassed = false) {
  if (!candidate) return false;
  if (!current) return true; // leading anything
  // Bombs allowed even if passed
  if (bombBeats2s(candidate, current)) return true;
  // Normal: same type/len and strictly higher top
  if (!sameTypeAndLen(current, candidate)) return false;
  if (hasPassed) return false; // locked out
  return compareSameTypeCombos(candidate, current) > 0;
}

// Find 3 of spades in a hand
function hasThreeSpades(hand) {
  return hand.some(c => c.rank === 0 && c.suit === 0);
}

// Get legal plays from hand given current combo (or null), and pass flag.
function getLegalPlays(hand, currentCombo, hasPassed, isFirstLeadOfGame) {
  const legal = [];
  const n = hand.length;
  // All subsets? Too many. Generate by type smartly.
  // Singles, pairs, etc.
  const byRank = {};
  hand.forEach((c, i) => {
    (byRank[c.rank] || (byRank[c.rank] = [])).push(c);
  });

  // Singles
  hand.forEach(c => {
    const com = detectCombo([c]);
    if (canBeat(currentCombo, com, hasPassed)) legal.push([c]);
  });

  // Pairs, triples, quads from groups
  Object.keys(byRank).forEach(rk => {
    const grp = byRank[rk].slice();
    for (let k = 2; k <= Math.min(4, grp.length); k++) {
      // combinations of k from grp
      const combs = getCombinations(grp, k);
      for (const cmb of combs) {
        const com = detectCombo(cmb);
        if (com && canBeat(currentCombo, com, hasPassed)) legal.push(cmb);
      }
    }
  });

  // Sequences (3+)
  const uniqueRanks = Object.keys(byRank).map(Number).sort((a,b)=>a-b);
  for (let len = 3; len <= uniqueRanks.length; len++) {
    for (let start = 0; start <= uniqueRanks.length - len; start++) {
      let ok = true;
      for (let i=1; i<len; i++) if (uniqueRanks[start+i] !== uniqueRanks[start] + i) {ok=false; break;}
      if (!ok) continue;
      // one card per rank, all possible suit choices (but since compare uses top, we can pick any)
      // To generate all? Expensive. For legality we need plays that are valid.
      // Generate cartesian product limited: pick one from each rank group.
      const groups = uniqueRanks.slice(start, start+len).map(r => byRank[r]);
      const seqs = cartesian(groups);
      for (const seq of seqs) {
        const com = detectCombo(seq);
        if (com && canBeat(currentCombo, com, hasPassed)) legal.push(seq);
      }
    }
  }

  // Double sequences: find runs of >=3 consecutive ranks that each have >=2
  for (let lenP = 3; lenP <= uniqueRanks.length; lenP++) {
    for (let st=0; st <= uniqueRanks.length-lenP; st++) {
      let ok = true;
      const pairRanks = [];
      for (let i=0; i<lenP; i++) {
        const r = uniqueRanks[st+i];
        if ((byRank[r] || []).length < 2) {ok=false; break;}
        pairRanks.push(r);
      }
      if (!ok) continue;
      // Generate: choose 2 from each
      const pairGroups = pairRanks.map(r => getCombinations(byRank[r], 2));
      const dseqs = cartesian(pairGroups).map(grp => [].concat.apply([], grp));
      for (const ds of dseqs) {
        const com = detectCombo(ds);
        if (com && canBeat(currentCombo, com, hasPassed)) legal.push(ds);
      }
    }
  }

  // Special: even if passed, bombs vs 2s
  if (hasPassed && currentCombo && currentCombo.cards.every(c=>c.rank===12)) {
    // Already included above because bombBeats2s bypasses hasPassed check inside canBeat.
    // Nothing extra.
  }

  // First lead constraint: must contain 3♠ if it is the very first lead of the whole game
  if (isFirstLeadOfGame && currentCombo == null) {
    const filtered = legal.filter(play => play.some(c => c.rank===0 && c.suit===0));
    return filtered.length ? filtered : []; // must play it if you have it (starter does)
  }

  // De-dupe by signature (sorted card ids)
  const seen = new Set();
  const uniqueLegal = [];
  for (const play of legal) {
    const sig = play.map(c => c.rank*4 + c.suit).sort((a,b)=>a-b).join(',');
    if (!seen.has(sig)) {
      seen.add(sig);
      uniqueLegal.push(play);
    }
  }
  return uniqueLegal;
}

function getCombinations(arr, k) {
  const res = [];
  function rec(start, cur) {
    if (cur.length === k) { res.push(cur.slice()); return; }
    for (let i = start; i < arr.length; i++) {
      cur.push(arr[i]);
      rec(i+1, cur);
      cur.pop();
    }
  }
  rec(0, []);
  return res;
}

function cartesian(arrays) {
  if (!arrays.length) return [[]];
  let res = [[]];
  for (const arr of arrays) {
    const next = [];
    for (const x of res) {
      for (const y of arr) next.push([...x, y]);
    }
    res = next;
  }
  return res;
}

// Apply a play: remove cards from player's hand, update trick state etc.
function applyPlay(state, playerIdx, playCards) {
  // Returns NEW state (shallow+hand clone)
  const newState = JSON.parse(JSON.stringify(state)); // simple deep for small state
  const hand = newState.players[playerIdx].hand;
  // Remove played cards (by value match)
  playCards.forEach(played => {
    const idx = hand.findIndex(c => c.rank === played.rank && c.suit === played.suit);
    if (idx >= 0) hand.splice(idx, 1);
  });
  const combo = detectCombo(playCards);
  newState.currentCombo = combo;
  newState.lastPlayBy = playerIdx;
  newState.players[playerIdx].passed = false;
  // Check finished
  if (hand.length === 0) {
    newState.players[playerIdx].finished = true;
    newState.finishOrder = newState.finishOrder || [];
    if (!newState.finishOrder.includes(playerIdx)) newState.finishOrder.push(playerIdx);
  }
  // If everyone else passed or finished, clear trick, next lead by this player
  const active = newState.players.filter((p, i) => !p.finished);
  const allPassed = active.every((p, i) => p.passed || newState.players[i].finished);
  if (allPassed) {
    // clear
    newState.currentCombo = null;
    newState.lastPlayBy = null;
    // reset passed flags for remaining
    newState.players.forEach((p, i) => { if (!p.finished) p.passed = false; });
    // next leader is the one who just played
    newState.currentLeader = playerIdx;
  }
  // Advance turn
  newState.currentPlayer = (playerIdx + 1) % newState.players.length;
  // Skip finished
  while (newState.players[newState.currentPlayer].finished) {
    newState.currentPlayer = (newState.currentPlayer + 1) % newState.players.length;
  }
  // Check round end
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
  // Check if all remaining passed -> clear and leader leads again
  const activeNonFinished = newState.players.filter((p,i) => !p.finished);
  if (activeNonFinished.every(p => p.passed)) {
    newState.currentCombo = null;
    newState.lastPlayBy = null;
    newState.players.forEach((p, i) => { if (!p.finished) p.passed = false; });
    newState.currentLeader = newState.lastPlayBy != null ? newState.lastPlayBy : newState.currentPlayer;
    newState.currentPlayer = newState.currentLeader != null ? newState.currentLeader : newState.currentPlayer;
  }
  const stillIn = newState.players.filter(p => !p.finished).length;
  if (stillIn <= 1) {
    newState.roundOver = true;
    newState.loser = newState.players.findIndex(p => !p.finished);
  }
  return newState;
}

// Initialize game state
function createGameState(numPlayers, seed = Date.now()) {
  const { hands, firstPlayer } = dealCards(numPlayers, seed);
  const players = hands.map((h, i) => ({
    id: i,
    hand: h,
    passed: false,
    finished: false
  }));
  const state = {
    numPlayers,
    players,
    currentPlayer: firstPlayer,
    currentLeader: firstPlayer,
    currentCombo: null,
    lastPlayBy: null,
    roundOver: false,
    loser: null,
    finishOrder: [],
    isFirstLead: true,
    seed
  };
  return state;
}

function getActivePlayers(state) {
  return state.players.map((p,i) => ({...p, idx:i})).filter(p => !p.finished);
}

// Public API surface for UI and tests/AI
const TienLenEngine = {
  RANKS, SUITS, SUIT_SYMBOLS,
  createCard, cardToString, cardCompare, getTopCard,
  shuffle, createDeck, dealCards,
  detectCombo, sortCombo, canBeat, bombBeats2s, isBomb,
  getLegalPlays, applyPlay, pass, createGameState,
  hasThreeSpades,
  // helper
  cloneState: (s) => JSON.parse(JSON.stringify(s))
};

// Export for node + browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TienLenEngine;
}
if (typeof window !== 'undefined') {
  window.TienLenEngine = TienLenEngine;
}
