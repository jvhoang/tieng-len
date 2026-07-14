'use strict';
// Pure deal reimplementation matching engine.js LCG + dealCards (no require).
// node evolve/_deal_compute_helper.js

const RANKS = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
const SUITS = ['s','c','d','h'];
const SYM = { s: '♠', c: '♣', d: '♦', h: '♥' };

function seededRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function createDeck() {
  const deck = [];
  for (let r = 0; r < 13; r++) {
    for (let su = 0; su < 4; su++) {
      deck.push({ rank: r, suit: su });
    }
  }
  return deck;
}

function shuffle(array, seed) {
  const arr = array.slice();
  const rand = seededRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

function cardCompare(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  return a.suit - b.suit;
}

function cardStr(c) {
  return RANKS[c.rank] + SYM[SUITS[c.suit]];
}

function handStr(hand) {
  return hand.slice().sort(cardCompare).map(cardStr).join(' ');
}

function deal2(seed) {
  const deck = shuffle(createDeck(), seed);
  const hands = [[], []];
  for (let i = 0; i < 13; i++) {
    for (let p = 0; p < 2; p++) {
      hands[p].push(deck[p * 13 + i]);
    }
  }
  let firstLeadCard = null;
  let firstPlayer = 0;
  for (let p = 0; p < 2; p++) {
    const three = hands[p].find(c => c.rank === 0 && c.suit === 0);
    if (three) {
      firstPlayer = p;
      firstLeadCard = three;
      break;
    }
  }
  if (!firstLeadCard) {
    let lowest = null;
    let owner = 0;
    for (let p = 0; p < 2; p++) {
      for (const c of hands[p]) {
        if (!lowest || cardCompare(c, lowest) < 0) {
          lowest = c;
          owner = p;
        }
      }
    }
    firstPlayer = owner;
    firstLeadCard = lowest;
  }
  // pairs / multi-ish inventory
  function inv(hand) {
    const by = {};
    for (const c of hand) by[c.rank] = (by[c.rank] || 0) + 1;
    const pairs = [];
    const trips = [];
    const twos = [];
    for (let r = 0; r < 13; r++) {
      const n = by[r] || 0;
      if (n >= 2 && r < 12) pairs.push(RANKS[r] + 'x' + n);
      if (n >= 3 && r < 12) trips.push(RANKS[r] + 'x' + n);
      if (r === 12 && n) twos.push('2x' + n);
    }
    return { pairs, trips, twos, by };
  }
  return {
    seed,
    firstPlayer,
    firstLeadCard: cardStr(firstLeadCard),
    p0: handStr(hands[0]),
    p1: handStr(hands[1]),
    inv0: inv(hands[0]),
    inv1: inv(hands[1])
  };
}

// Note: Math.imul for LCG matches engine when product fits; engine uses s*1664525
// which for uint32 is exact in IEEE for these values. Cross-check imul vs *.
function seededRandomStar(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function shuffleStar(array, seed) {
  const arr = array.slice();
  const rand = seededRandomStar(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
function deal2Star(seed) {
  const deck = shuffleStar(createDeck(), seed);
  const hands = [[], []];
  for (let i = 0; i < 13; i++) {
    for (let p = 0; p < 2; p++) hands[p].push(deck[p * 13 + i]);
  }
  let firstLeadCard = null;
  let firstPlayer = 0;
  for (let p = 0; p < 2; p++) {
    const three = hands[p].find(c => c.rank === 0 && c.suit === 0);
    if (three) { firstPlayer = p; firstLeadCard = three; break; }
  }
  if (!firstLeadCard) {
    let lowest = null, owner = 0;
    for (let p = 0; p < 2; p++) for (const c of hands[p]) {
      if (!lowest || cardCompare(c, lowest) < 0) { lowest = c; owner = p; }
    }
    firstPlayer = owner; firstLeadCard = lowest;
  }
  return {
    seed,
    firstPlayer,
    firstLeadCard: cardStr(firstLeadCard),
    p0: handStr(hands[0]),
    p1: handStr(hands[1])
  };
}

const SEEDS = [20520009, 20589820, 20629712, 20719469, 20609766, 20549928];
const out = SEEDS.map(s => ({ imul: deal2(s), star: deal2Star(s) }));
console.log(JSON.stringify(out, null, 2));
