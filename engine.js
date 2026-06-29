/**
 * Tiến Lên (Tien Len / Thirteen) - Pure Rules Engine (fixed first-lead for 2p/3p + allPassed)
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
function createDeck() { const deck = []; for (let r = 0; r < 13; r++) for (let s = 0; s < 4; s++) deck.push(createCard(r, s)); return deck; }
function dealCards(numPlayers = 4, seed = null) {
  if (numPlayers < 2 || numPlayers > 4) throw new Error('Only 2-4 players supported');
  const deck = shuffle(createDeck(), seed);
  const hands = Array.from({ length: numPlayers }, () => []);
  for (let i = 0; i < 13; i++) for (let p = 0; p < numPlayers; p++) hands[p].push(deck[p * 13 + i]);
  let firstLeadCard = null; let firstPlayer = 0;
  for (let p = 0; p < numPlayers; p++) { const three = hands[p].find(c => c.rank === 0 && c.suit === 0); if (three) { firstPlayer = p; firstLeadCard = three; break; } }
  if (!firstLeadCard) {
    let lowest = null; let owner = 0;
    for (let p = 0; p < numPlayers; p++) for (const c of hands[p]) if (!lowest || cardCompare(c, lowest) < 0) { lowest = c; owner = p; }
    firstPlayer = owner; firstLeadCard = lowest;
  }
  return { hands, firstPlayer, firstLeadCard, discarded: deck.slice(numPlayers * 13) };
}
function sortCombo(cards) { return cards.slice().sort((a, b) => cardCompare(b, a)); }
function detectCombo(rawCards) {
  if (!rawCards || rawCards.length === 0) return null;
  const cards = sortCombo(rawCards); const n = cards.length;
  if (n === 1) return { type: 'single', cards, top: cards[0], size: 1 };
  const groups = {}; for (const c of cards) groups[c.rank] = (groups[c.rank] || 0) + 1;
  const ranks = Object.keys(groups).map(Number).sort((a,b)=>b-a);
  const counts = Object.values(groups);
  if (ranks.length === 1) {
    const cnt = groups[ranks[0]];
    if (cnt === 2) return { type: 'pair', cards, top: cards[0], size: 2 };
    if (cnt === 3) return { type: 'triple', cards, top: cards[0], size: 3 };
    if (cnt === 4) return { type: 'quad', cards, top: cards[0], size: 4 };
    return null;
  }
  const isSeq = ranks.length === n && counts.every(c => c === 1);
  if (isSeq) { let consec = true; for (let i=1;i<ranks.length;i++) if (ranks[i-1]-ranks[i]!==1) {consec=false;break;} if (consec && n>=3) return { type: 'seq', cards, top: cards[0], size: n }; }
  const allPairs = counts.every(c => c === 2) && ranks.length >= 3;
  if (allPairs) { let consec = true; for (let i=1;i<ranks.length;i++) if (ranks[i-1]-ranks[i]!==1){consec=false;break;} if (consec) return { type: 'doubleseq', cards, top: cards[0], size: n, numPairs: ranks.length }; }
  return null;
}
function sameTypeAndLen(a, b) { if (!a || !b) return false; if (a.type !== b.type) return false; if (a.type === 'doubleseq') return a.numPairs === b.numPairs; return a.size === b.size; }
function compareSameTypeCombos(a, b) { if (!sameTypeAndLen(a, b)) return 0; return cardCompare(a.top, b.top); }
function isBomb(combo) { if (!combo) return false; if (combo.type === 'quad') return true; if (combo.type === 'doubleseq' && combo.numPairs >= 3) return true; return false; }
function bombBeats2s(bomb, current) {
  if (!isBomb(bomb) || !current) return false;
  const allTwos = current.cards.every(c => c.rank === 12); if (!allTwos) return false;
  const numTwos = current.cards.length;
  if (bomb.type === 'quad') return numTwos === 1;
  if (bomb.type === 'doubleseq') { const p = bomb.numPairs; if (numTwos===1) return p>=3; if (numTwos===2) return p>=4; if (numTwos===3) return p>=5; }
  return false;
}
function canBeat(current, candidate, hasPassed = false) {
  if (!candidate) return false; if (!current) return true;
  if (bombBeats2s(candidate, current)) return true;
  if (!sameTypeAndLen(current, candidate)) return false;
  if (hasPassed) return false;
  return compareSameTypeCombos(candidate, current) > 0;
}
function hasThreeSpades(hand){return hand.some(c=>c.rank===0&&c.suit===0);}
function getLegalPlays(hand, currentCombo, hasPassed, isFirstLeadOfGame, firstLeadCard = null) {
  const legal = []; const byRank = {}; hand.forEach(c => (byRank[c.rank]||(byRank[c.rank]=[])).push(c));
  hand.forEach(c => { const com=detectCombo([c]); if (canBeat(currentCombo,com,hasPassed)) legal.push([c]); });
  Object.keys(byRank).forEach(rk => { const grp=byRank[rk].slice(); for (let k=2; k<=Math.min(4,grp.length); k++) { getCombinations(grp,k).forEach(cmb=>{ const com=detectCombo(cmb); if(com&&canBeat(currentCombo,com,hasPassed)) legal.push(cmb); }); }); });
  const uniqueRanks = Object.keys(byRank).map(Number).sort((a,b)=>a-b);
  for (let len=3; len<=uniqueRanks.length; len++) {
    for (let st=0; st<=uniqueRanks.length-len; st++) {
      let ok=true; for (let i=1;i<len;i++) if(uniqueRanks[st+i]!==uniqueRanks[st]+i){ok=false;break;} if(!ok)continue;
      const groups = uniqueRanks.slice(st,st+len).map(r=>byRank[r]); const seqs = cartesian(groups);
      seqs.forEach(seq=>{ const com=detectCombo(seq); if(com&&canBeat(currentCombo,com,hasPassed)) legal.push(seq); });
    }
  }
  for (let lenP=3; lenP<=uniqueRanks.length; lenP++) {
    for (let st=0; st<=uniqueRanks.length-lenP; st++) {
      let ok=true; const pairRanks=[];
      for (let i=0;i<lenP;i++){ const r=uniqueRanks[st+i]; if((byRank[r]||[]).length<2){ok=false;break;} pairRanks.push(r); }
      if(!ok) continue;
      const pairGroups=pairRanks.map(r=>getCombinations(byRank[r],2));
      const dseqs = cartesian(pairGroups).map(grp => [].concat.apply([],grp));
      dseqs.forEach(ds=>{ const com=detectCombo(ds); if(com&&canBeat(currentCombo,com,hasPassed)) legal.push(ds); });
    }
  }
  if (isFirstLeadOfGame && currentCombo == null && firstLeadCard) {
    const filtered = legal.filter(play => play.some(c => c.rank === firstLeadCard.rank && c.suit === firstLeadCard.suit));
    if (filtered.length) return filtered;
  }
  const seen = new Set(); const uniqueLegal = [];
  for (const play of legal) { const sig=play.map(c=>c.rank*4+c.suit).sort((a,b)=>a-b).join(','); if(!seen.has(sig)){seen.add(sig);uniqueLegal.push(play);} }
  return uniqueLegal;
}
function getCombinations(arr, k) { const res=[]; function rec(st,cur){ if(cur.length===k){res.push(cur.slice());return;} for(let i=st;i<arr.length;i++){cur.push(arr[i]);rec(i+1,cur);cur.pop();}} rec(0,[]); return res; }
function cartesian(arrays){ if(!arrays.length)return[[]]; let res=[[]]; for(const arr of arrays){const next=[]; for(const x of res)for(const y of arr)next.push([...x,y]); res=next;} return res; }
function applyPlay(state, playerIdx, playCards) {
  const newState = JSON.parse(JSON.stringify(state));
  const hand = newState.players[playerIdx].hand;
  playCards.forEach(played => { const idx=hand.findIndex(c=>c.rank===played.rank&&c.suit===played.suit); if(idx>=0)hand.splice(idx,1); });
  const combo = detectCombo(playCards);
  newState.currentCombo = combo; newState.lastPlayBy = playerIdx; newState.players[playerIdx].passed = false;
  if (hand.length === 0) { newState.players[playerIdx].finished = true; newState.finishOrder = newState.finishOrder || []; if(!newState.finishOrder.includes(playerIdx)) newState.finishOrder.push(playerIdx); }
  const active = newState.players.map((p,idx)=>({p,idx})).filter(({p})=>!p.finished);
  const allPassed = active.every(({p}) => p.passed);
  if(allPassed){ newState.currentCombo=null; newState.lastPlayBy=null; newState.players.forEach((p,i)=>{if(!p.finished)p.passed=false;}); newState.currentLeader=playerIdx; }
  newState.currentPlayer = (playerIdx + 1) % newState.players.length;
  while (newState.players[newState.currentPlayer].finished) newState.currentPlayer = (newState.currentPlayer + 1) % newState.players.length;
  const stillIn = newState.players.filter(p=>!p.finished).length;
  if(stillIn<=1){ newState.roundOver=true; newState.loser=newState.players.findIndex(p=>!p.finished); }
  return newState;
}
function pass(state, playerIdx){
  const newState=JSON.parse(JSON.stringify(state)); newState.players[playerIdx].passed=true;
  newState.currentPlayer=(playerIdx+1)%newState.players.length;
  while(newState.players[newState.currentPlayer]&&newState.players[newState.currentPlayer].finished) newState.currentPlayer=(newState.currentPlayer+1)%newState.players.length;
  const activeNonFinished = newState.players.filter((p,i)=>!p.finished);
  if(activeNonFinished.every(p=>p.passed)){ newState.currentCombo=null; newState.lastPlayBy=null; newState.players.forEach((p,i)=>{if(!p.finished)p.passed=false;}); newState.currentLeader = newState.lastPlayBy!=null ? newState.lastPlayBy : newState.currentPlayer; newState.currentPlayer = newState.currentLeader!=null ? newState.currentLeader : newState.currentPlayer; }
  const stillIn = newState.players.filter(p=>!p.finished).length; if(stillIn<=1){newState.roundOver=true; newState.loser = newState.players.findIndex(p=>!p.finished);} 
  return newState;
}
function createGameState(numPlayers, seed=Date.now()){
  const deal = dealCards(numPlayers,seed);
  const {hands,firstPlayer,firstLeadCard} = deal;
  const players = hands.map((h,i)=>({id:i,hand:h,passed:false,finished:false}));
  return { numPlayers, players, currentPlayer:firstPlayer, currentLeader:firstPlayer, currentCombo:null, lastPlayBy:null, roundOver:false, loser:null, finishOrder:[], isFirstLead:true, firstLeadCard:firstLeadCard||null, seed };
}
function hasThreeSpades(hand){return hand.some(c=>c.rank===0&&c.suit===0);}
const TienLenEngine = { RANKS, SUITS, SUIT_SYMBOLS, createCard, cardToString, cardCompare, getTopCard, shuffle, createDeck, dealCards, detectCombo, sortCombo, canBeat, bombBeats2s, isBomb, getLegalPlays, applyPlay, pass, createGameState, hasThreeSpades, cloneState:(s)=>JSON.parse(JSON.stringify(s)) };
if(typeof module!=='undefined'&&module.exports) module.exports=TienLenEngine;
if(typeof window!=='undefined') window.TienLenEngine=TienLenEngine;