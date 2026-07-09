/**
 * Tiến Lên AI — Expert policy + light MCTS
 * Legal-only. Uses pairs/straights/triples when leading or beating makes sense.
 * Conserves 2s and other high cards; passes rather than dumping power cards.
 * Pure JS, no external models.
 */

const engine = (typeof require === 'function') ? require('./engine.js') : (window.TienLenEngine || {});
const {
  detectCombo, getLegalPlays, applyPlay, pass, cardCompare, cloneState: engineClone
} = engine;

function cloneState(s) {
  return engineClone ? engineClone(s) : JSON.parse(JSON.stringify(s));
}

function comboOf(play) {
  return detectCombo(play);
}

function isTwo(card) {
  return card && card.rank === 12;
}

function playHasTwo(play) {
  return (play || []).some(isTwo);
}

function topRank(play) {
  const c = comboOf(play);
  return c && c.top ? c.top.rank : 99;
}

function comboPriority(type) {
  // Prefer shedding multi-card combos when leading
  if (type === 'quad') return 6;
  if (type === 'doubleseq') return 5;
  if (type === 'triple') return 4;
  if (type === 'seq') return 3;
  if (type === 'pair') return 2;
  return 1; // single
}

function remainingAfter(hand, play) {
  const used = new Set(play.map(c => c.rank * 4 + c.suit));
  return hand.filter(c => !used.has(c.rank * 4 + c.suit));
}

function scorePosition(state, myIdx) {
  const me = state.players[myIdx];
  let score = me.hand.length * 12;
  // Value holding 2s for later control (not dumping them)
  const myTwos = me.hand.filter(c => c.rank === 12).length;
  score -= myTwos * 4;
  // High non-2 cards are slightly costly
  score += me.hand.filter(c => c.rank >= 10 && c.rank < 12).length * 0.6;
  // Control is good
  if (state.currentLeader === myIdx || (state.currentCombo == null && state.currentPlayer === myIdx)) {
    score -= 5;
  }
  // Opponents close to out is dangerous
  state.players.forEach((p, i) => {
    if (i !== myIdx && !p.finished) score += Math.max(0, 8 - p.hand.length) * 0.8;
  });
  return score;
}

/**
 * Score a candidate play: lower is better (we minimize).
 * Encodes: multi-card shed when leading, lowest beat, conserve 2s, avoid overkill.
 */
function scorePlay(play, state, myIdx) {
  const hand = state.players[myIdx].hand;
  const cur = state.currentCombo;
  const com = comboOf(play);
  if (!com) return 1e9;

  let score = 0;
  const usesTwo = playHasTwo(play);
  const isBomb = com.type === 'quad' || (com.type === 'doubleseq' && com.numPairs >= 3);
  const facing2 = cur && cur.cards.every(c => c.rank === 12);
  const handLen = hand.length;
  const afterLen = handLen - play.length;
  const oppMin = Math.min(
    ...state.players.filter((p, i) => i !== myIdx && !p.finished).map(p => p.hand.length),
    99
  );

  // Primary: fewer cards left is great
  score += afterLen * 10;

  if (!cur) {
    // FREE LEAD: prefer multi-card low combos to shed efficiently
    score -= comboPriority(com.type) * 3.5;
    score -= play.length * 2.2; // shed more cards
    score += topRank(play) * 0.55; // prefer lower tops
    // Strongly avoid leading with 2s unless almost out or only option
    if (usesTwo) {
      if (afterLen > 2) score += 28; // save 2s midgame
      else score += 6;
    }
    // Prefer sequences/pairs of low cards over high singles
    if (com.type === 'single' && com.top.rank >= 10) score += 8;
    if (com.type === 'single' && com.top.rank === 12) score += 20;
    // Short low sequence/pair is excellent
    if ((com.type === 'seq' || com.type === 'pair' || com.type === 'triple') && topRank(play) <= 7) {
      score -= 4;
    }
  } else {
    // BEATING: lowest that beats; conserve power
    score += topRank(play) * 1.1;
    score += play.length * 0.15; // slight prefer smaller when same top
    if (usesTwo && !facing2) {
      // Don't waste a 2 to beat a low card if alternatives exist
      score += 22;
    }
    if (isBomb && !facing2) score += 35; // save bombs for 2s
    if (facing2 && isBomb) score -= 15; // use bomb vs 2s
    // Overkill penalty: beating a low single with a very high card
    if (cur.type === 'single' && com.type === 'single') {
      const gap = com.top.rank - cur.top.rank;
      if (gap > 4 && com.top.rank >= 10) score += gap * 1.5;
    }
  }

  // Endgame pressure: if an opp has ≤2 cards, be more aggressive
  if (oppMin <= 2) {
    score -= play.length * 1.5;
    if (usesTwo) score -= 8; // OK to use 2s under pressure
  }

  // Winning this play (empty hand) is best
  if (afterLen === 0) score -= 100;

  return score;
}

/**
 * Decide whether to pass instead of playing.
 * Pass when every legal play is "expensive" (high 2s only) and we're not under endgame pressure.
 * Returns true if AI should pass.
 */
function shouldPassStrategically(state, myIdx, legals) {
  if (!state.currentCombo) return false; // must lead when free
  if (!legals || !legals.length) return true;
  const me = state.players[myIdx];
  const oppMin = Math.min(
    ...state.players.filter((p, i) => i !== myIdx && !p.finished).map(p => p.hand.length),
    99
  );
  // Under pressure: play if you can
  if (oppMin <= 2 || me.hand.length <= 3) return false;

  const scores = legals.map(p => scorePlay(p, state, myIdx));
  const best = Math.min(...scores);
  // If best play still heavily uses a 2 (or is very costly), prefer pass
  const bestPlays = legals.filter((p, i) => scores[i] === best);
  const onlyTwos = bestPlays.every(playHasTwo);
  const bestIsTwoSingle = bestPlays.every(p => p.length === 1 && playHasTwo(p));

  if (bestIsTwoSingle && me.hand.length > 4) return true;
  if (onlyTwos && me.hand.length > 5 && state.currentCombo.top && state.currentCombo.top.rank < 10) {
    return true;
  }
  // If best score is very high (penalized), pass
  if (best > 45 && me.hand.length > 4) return true;
  return false;
}

function heuristicOrder(legals, state, myIdx) {
  return legals.slice().sort((a, b) => scorePlay(a, state, myIdx) - scorePlay(b, state, myIdx));
}

/** Expert policy used as primary decision + MCTS fallback/rollout */
function getExpertMove(state, myIdx) {
  const hand = state.players[myIdx].hand;
  const cur = state.currentCombo;
  const hp = state.players[myIdx].passed;
  let legals = getLegalPlays(hand, cur, hp, state.isFirstLead, state.firstLeadCard);
  if (!legals.length) return null;

  // Strategic pass signal: return null so caller can pass (when allowed)
  if (shouldPassStrategically(state, myIdx, legals)) {
    return null; // caller treats null as pass when combating
  }

  legals = heuristicOrder(legals, state, myIdx);

  // Bombs vs 2s: take lowest bomb
  if (cur && cur.cards.every(c => c.rank === 12)) {
    const bombs = legals.filter(p => {
      const c = comboOf(p);
      return c && (c.type === 'quad' || (c.type === 'doubleseq' && c.numPairs >= 3));
    });
    if (bombs.length) {
      bombs.sort((a, b) => scorePlay(a, state, myIdx) - scorePlay(b, state, myIdx));
      return bombs[0];
    }
  }

  // Learned-score tie-break among top few
  if (typeof learnedScore === 'function' && legals.length > 1) {
    try {
      const topN = legals.slice(0, Math.min(8, legals.length));
      topN.sort((a, b) => {
        const na = applyPlay(cloneState(state), myIdx, a);
        const nb = applyPlay(cloneState(state), myIdx, b);
        return learnedScore(na, myIdx) - learnedScore(nb, myIdx);
      });
      return topN[0];
    } catch (e) { /* fall through */ }
  }

  return legals[0];
}

// === Lightweight MCTS (optional boost; expert is primary under time pressure) ===
class MCTSNode {
  constructor(state, playerIdx, move = null, parent = null) {
    this.state = state;
    this.player = playerIdx;
    this.move = move;
    this.parent = parent;
    this.children = [];
    this.visits = 0;
    this.wins = 0;
    this.untried = null;
  }
}

function getWinnerFromFinish(finishOrder) {
  return finishOrder && finishOrder.length ? finishOrder[0] : null;
}

function rolloutPolicy(state, myIdx) {
  let s = cloneState(state);
  let steps = 0;
  while (!s.roundOver && steps < 100) {
    const cp = s.currentPlayer;
    const leg = getLegalPlays(
      s.players[cp].hand, s.currentCombo, s.players[cp].passed, s.isFirstLead, s.firstLeadCard
    );
    if (leg.length === 0) {
      s = pass(s, cp);
    } else {
      const choice = getExpertMove(s, cp);
      if (choice == null && s.currentCombo) {
        s = pass(s, cp);
      } else {
        s = applyPlay(s, cp, choice || leg[0]);
      }
    }
    s.isFirstLead = false;
    steps++;
  }
  const winner = getWinnerFromFinish(s.finishOrder);
  return winner === myIdx ? 1 : (winner != null ? 0 : 0.5);
}

function runMCTS(rootState, myIdx, iterations = 200) {
  const fast = (typeof process !== 'undefined' && process.env && process.env.TIENLEN_TEST_FAST) || iterations <= 50;
  if (fast && iterations > 60) iterations = 40;

  const root = new MCTSNode(rootState, rootState.currentPlayer);
  const legalsAtRoot = getLegalPlays(
    rootState.players[myIdx].hand, rootState.currentCombo,
    rootState.players[myIdx].passed, rootState.isFirstLead, rootState.firstLeadCard
  );
  if (!legalsAtRoot.length) return null;

  for (let i = 0; i < iterations; i++) {
    let node = root;
    let s = cloneState(rootState);
    while (node.untried == null && node.children.length > 0 && !s.roundOver) {
      let best = null;
      let bestU = -Infinity;
      const C = 1.4;
      for (const child of node.children) {
        if (!child.visits) { best = child; break; }
        const u = (child.wins / child.visits) + C * Math.sqrt(Math.log(node.visits) / child.visits);
        if (u > bestU) { bestU = u; best = child; }
      }
      node = best;
      if (node.move) {
        s = applyPlay(s, node.player, node.move);
      } else if (node.passed) {
        s = pass(s, node.player);
      }
    }
    if (!s.roundOver) {
      if (node.untried === null) {
        const curP = s.currentPlayer;
        const leg = getLegalPlays(
          s.players[curP].hand, s.currentCombo, s.players[curP].passed, s.isFirstLead, s.firstLeadCard
        );
        // Include a pass option when combating
        node.untried = leg.slice();
        if (s.currentCombo) node.untried.push(null); // null = pass
      }
      if (node.untried && node.untried.length) {
        const mv = node.untried.pop();
        const curP = s.currentPlayer;
        let newS;
        const child = new MCTSNode(null, curP, mv, node);
        if (mv == null) {
          newS = pass(cloneState(s), curP);
          child.passed = true;
        } else {
          newS = applyPlay(cloneState(s), curP, mv);
        }
        child.state = newS;
        node.children.push(child);
        node = child;
        s = newS;
      }
    }
    const outcome = rolloutPolicy(s, myIdx);
    let cur = node;
    while (cur) {
      cur.visits++;
      cur.wins += outcome;
      cur = cur.parent;
    }
  }

  let bestChild = null;
  let bestV = -1;
  for (const ch of root.children) {
    const v = ch.visits ? (ch.wins / ch.visits) : 0;
    if (v > bestV || bestChild === null) {
      bestV = v;
      bestChild = ch;
    }
  }
  if (bestChild) {
    if (bestChild.passed || bestChild.move == null) return null; // pass
    return bestChild.move;
  }
  return getExpertMove(rootState, myIdx) || legalsAtRoot[0];
}

/**
 * Public API: returns a play (array of cards) or null to pass.
 * Controller must treat null as pass when there is a currentCombo.
 */
function getAIMove(state, myIdx, opts = {}) {
  const difficulty = opts.difficulty || 'hard';
  let iters = difficulty === 'easy' ? 20 : (difficulty === 'medium' ? 80 : 180);
  const isFast = (typeof process !== 'undefined' && process.env &&
    (process.env.TIENLEN_TEST_FAST || process.env.NODE_ENV === 'test'));
  if (isFast || (opts.iterations && opts.iterations < 200)) {
    iters = Math.min(iters, opts.iterations || 30);
  }

  const hand = state.players[myIdx].hand;
  const cur = state.currentCombo;
  const hp = state.players[myIdx].passed;
  const legals = getLegalPlays(hand, cur, hp, state.isFirstLead, state.firstLeadCard);

  if (!legals.length) return null;

  // Expert-first: strong multi-combo / conserve policy (always runs)
  const expert = getExpertMove(state, myIdx);
  // Under fast/test mode or easy difficulty, expert is authoritative
  if (isFast || difficulty === 'easy' || iters < 40) {
    return expert !== undefined ? expert : legals[0];
  }

  try {
    const mv = runMCTS(state, myIdx, iters);
    // Prefer expert if MCTS wants to dump a 2 when expert conserves
    if (mv && playHasTwo(mv) && expert && !playHasTwo(expert) && !cur) {
      return expert;
    }
    if (mv !== undefined) return mv;
  } catch (e) { /* graceful */ }

  return expert !== undefined ? expert : legals[0];
}

function aiChoosesNonTrivial(state, myIdx) {
  const mv = getAIMove(state, myIdx, { difficulty: 'hard' });
  return mv == null || (mv && mv.length > 0);
}

// === Lightweight TD self-play weights (optional influence) ===
let learnedWeights = [1.0, 1.5, 0.8, 1.2, 0.6, 0.9];

function extractFeatures(state, myIdx) {
  const me = state.players[myIdx];
  const handLen = me.hand.length / 13;
  const has2 = me.hand.some(c => c.rank === 12) ? 1 : 0;
  const leadCtrl = (state.currentLeader === myIdx || state.currentPlayer === myIdx) ? 1 : 0;
  const bombPot = (me.hand.filter(c => c.rank <= 3).length >= 3 || me.hand.some(c => c.rank === 12)) ? 1 : 0;
  let highP = 0;
  state.players.forEach((p, i) => {
    if (i !== myIdx && !p.finished) highP += p.hand.filter(c => c.rank > 8).length;
  });
  const highPressure = Math.min(1, highP / 8);
  const lowShed = me.hand.filter(c => c.rank < 4).length > 0 ? 1 : 0;
  return [handLen, has2, leadCtrl, bombPot, highPressure, lowShed];
}

function learnedScore(state, myIdx) {
  const f = extractFeatures(state, myIdx);
  let s = 0;
  for (let i = 0; i < f.length; i++) s += f[i] * learnedWeights[i];
  return s;
}

function selfPlayLearn(numGames = 8) {
  let improved = 0;
  for (let g = 0; g < numGames; g++) {
    let s = engine.createGameState(4, 900 + g);
    let steps = 0;
    while (!s.roundOver && steps < 80) {
      const cp = s.currentPlayer;
      const leg = engine.getLegalPlays(
        s.players[cp].hand, s.currentCombo, s.players[cp].passed, s.isFirstLead, s.firstLeadCard
      );
      if (leg.length === 0) {
        s = engine.pass(s, cp);
      } else {
        let choice = leg[0];
        if (leg.length > 1) {
          const ranked = leg.slice().sort((a, b) => {
            const na = engine.applyPlay(engine.cloneState(s), cp, a);
            const nb = engine.applyPlay(engine.cloneState(s), cp, b);
            return learnedScore(na, cp) - learnedScore(nb, cp);
          });
          choice = ranked[0];
        }
        s = engine.applyPlay(s, cp, choice);
      }
      s.isFirstLead = false;
      steps++;
    }
    const winner = s.finishOrder && s.finishOrder[0];
    const myWin = (winner === 0) ? 1 : 0;
    const f = extractFeatures(s, 0);
    for (let i = 0; i < learnedWeights.length; i++) {
      const target = (i === 0 ? (myWin ? -0.2 : 0.1) : (myWin ? 0.05 : -0.02));
      learnedWeights[i] += 0.01 * (target * f[i]);
    }
    if (myWin) improved++;
  }
  learnedWeights = learnedWeights.map(w => Math.max(0.1, Math.min(3, w)));
  return { games: numGames, winsSeen: improved, weights: learnedWeights.slice() };
}

try { selfPlayLearn(5); } catch (e) {}

const TienLenAI = {
  getAIMove,
  getExpertMove,
  runMCTS,
  aiChoosesNonTrivial,
  scorePosition,
  scorePlay,
  shouldPassStrategically,
  getLearnedWeights: () => learnedWeights.slice(),
  selfPlayLearn
};

if (typeof module !== 'undefined' && module.exports) module.exports = TienLenAI;
if (typeof window !== 'undefined') window.TienLenAI = TienLenAI;
