'use strict';
/**
 * Standalone deal tracer — identical LCG to engine.js (s*1664525 + 1013904223)>>>0
 * Run: node evolve/_uint32_deal_trace.js
 * Also prints enough that a human can verify without engine require.
 */
function dealHands(seed) {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const deck = [];
  for (let r = 0; r < 13; r++) for (let su = 0; su < 4; su++) deck.push((r << 2) | su);
  for (let i = 51; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
  }
  const hands = [[], []];
  for (let i = 0; i < 13; i++) {
    hands[0].push(deck[i]);
    hands[1].push(deck[13 + i]);
  }
  const R = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
  const S = ['♠','♣','♦','♥'];
  const cs = (id) => R[id >> 2] + S[id & 3];
  const hs = (h) => h.slice().sort((a,b)=>a-b).map(cs).join(' ');
  // first lead: 3♠ = 0, else lowest
  let firstPlayer = 0, firstLead = null;
  for (let p = 0; p < 2; p++) {
    if (hands[p].includes(0)) { firstPlayer = p; firstLead = 0; break; }
  }
  if (firstLead === null) {
    let best = 99, owner = 0;
    for (let p = 0; p < 2; p++) for (const c of hands[p]) {
      if (c < best) { best = c; owner = p; }
    }
    firstPlayer = owner; firstLead = best;
  }
  return { seed, firstPlayer, firstLead: cs(firstLead), p0: hs(hands[0]), p1: hs(hands[1]), raw0: hands[0].slice().sort((a,b)=>a-b), raw1: hands[1].slice().sort((a,b)=>a-b) };
}

const seeds = [20520009, 20589820, 20629712, 20719469, 20609766, 20549928, 20739415];
for (const seed of seeds) {
  console.log(JSON.stringify(dealHands(seed)));
}
