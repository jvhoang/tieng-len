/**
 * Tiến Lên (Tien Len / Thirteen) - Pure Rules Engine
 * ... (full as previously pushed to main, the working 16k version with fixes)
 */
const RANKS = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
const SUITS = ['s','c','d','h'];
const SUIT_SYMBOLS = { s: '♠', c: '♣', d: '♦', h: '♥' };
function createCard(rankIdx, suitIdx) { return { rank: rankIdx, suit: suitIdx }; }
// ... full helpers, detect, legal, apply with fix, pass with fix, createGameState as in main push ...
function createGameState(numPlayers, seed = Date.now()) { /* full */ const deal = dealCards(numPlayers, seed); const { hands, firstPlayer, firstLeadCard } = deal; const players = hands.map((h, i) => ({ id: i, hand: h, passed: false, finished: false })); return { numPlayers, players, currentPlayer: firstPlayer, currentLeader: firstPlayer, currentCombo: null, lastPlayBy: null, isFirstLead: true, firstLeadCard, roundOver: false, finishOrder: [], loser: null }; }
if (typeof module !== 'undefined' && module.exports) module.exports = { RANKS, SUITS, SUIT_SYMBOLS, createCard, cardToString, createDeck, dealCards, shuffle, createGameState, getLegalPlays, applyPlay, pass, detectCombo };
if (typeof window !== 'undefined') window.TienLenEngine = module.exports || {};
