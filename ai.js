/**
 * Tiến Lên AI — Strong competitive player
 *
 * Architecture (pure static JS, browser + Node):
 *  1. Legal generator from engine (never illegal).
 *  2. Expert heuristic ranks moves (shed low multi-combos, conserve 2s/bombs).
 *  3. Explicit P(win) estimate via position eval + one-ply rollouts.
 *  4. Optional MCTS (hard difficulty) for deeper search.
 *
 * Pass discipline: NEVER pass when a cheap (non-2, non-bomb) legal beat exists.
 * Free lead: ALWAYS return a legal play (never null).
 */

const engine = (typeof require === 'function') ? require('./engine.js') : (window.TienLenEngine || {});
const {
  detectCombo, getLegalPlays, applyPlay, pass, cardCompare, cloneState: engineClone
} = engine;

function cloneState(s) {
  return engineClone ? engineClone(s) : JSON.parse(JSON.stringify(s));
}

function comboOf(play) {
  return play ? detectCombo(play) : null;
}

function isTwo(card) {
  return card && card.rank === 12;
}

function playHasTwo(play) {
  return (play || []).some(isTwo);
}

function isBombCombo(com) {
  if (!com) return false;
  return com.type === 'quad' || (com.type === 'doubleseq' && com.numPairs >= 3);
}

function playIsBomb(play) {
  return isBombCombo(comboOf(play));
}

function playIsExpensive(play) {
  return playHasTwo(play) || playIsBomb(play);
}

function topRank(play) {
  const c = comboOf(play);
  return c && c.top ? c.top.rank : 99;
}

function comboPriority(type) {
  if (type === 'quad') return 6;
  if (type === 'doubleseq') return 5;
  if (type === 'triple') return 4;
  if (type === 'seq') return 3;
  if (type === 'pair') return 2;
  return 1;
}

function oppMinHand(state, myIdx) {
  let m = 99;
  state.players.forEach((p, i) => {
    if (i !== myIdx && !p.finished) m = Math.min(m, p.hand.length);
  });
  return m;
}

function activeCount(state) {
  return state.players.filter(p => !p.finished).length;
}

// ─── Position evaluation → higher is better for myIdx ───

/**
 * Rich position value. Higher = better for myIdx.
 * Used as leaf eval and for one-ply ranking.
 */
function evaluatePosition(state, myIdx) {
  const me = state.players[myIdx];
  if (me.finished) {
    // Earlier finish is better
    const order = state.finishOrder || [];
    const place = order.indexOf(myIdx);
    if (place === 0) return 1000;
    if (place > 0) return 500 - place * 50;
    return 200;
  }
  if (state.roundOver && state.loser === myIdx) return -500;

  let v = 0;
  const handLen = me.hand.length;
  // Primary: fewer cards is much better
  v -= handLen * 18;

  // Shed potential: multi-card structure in hand
  const byRank = {};
  me.hand.forEach(c => { byRank[c.rank] = (byRank[c.rank] || 0) + 1; });
  let pairs = 0, trips = 0, quads = 0;
  Object.keys(byRank).forEach(r => {
    const n = byRank[r];
    if (n >= 2) pairs++;
    if (n >= 3) trips++;
    if (n >= 4) quads++;
  });
  v += pairs * 2.5 + trips * 4 + quads * 8;

  // Sequence potential (consecutive ranks with ≥1)
  const ranks = Object.keys(byRank).map(Number).sort((a, b) => a - b);
  let run = 1, bestRun = 1;
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] === ranks[i - 1] + 1) { run++; bestRun = Math.max(bestRun, run); }
    else run = 1;
  }
  if (bestRun >= 3) v += (bestRun - 2) * 3;

  // 2s are valuable control cards (hold them)
  const twos = me.hand.filter(c => c.rank === 12).length;
  v += twos * 6;

  // Isolated high cards (A/K without pair) are slightly bad
  me.hand.forEach(c => {
    if (c.rank >= 10 && c.rank < 12 && (byRank[c.rank] || 0) === 1) v -= 1.2;
  });

  // Control of free lead is good
  if (state.currentCombo == null && state.currentPlayer === myIdx) v += 8;
  if (state.currentLeader === myIdx && state.currentCombo == null) v += 4;

  // Opponent pressure: someone close to out is dangerous
  state.players.forEach((p, i) => {
    if (i === myIdx || p.finished) return;
    const oh = p.hand.length;
    if (oh <= 1) v -= 35;
    else if (oh <= 2) v -= 18;
    else if (oh <= 3) v -= 8;
    else if (oh <= 5) v -= 2;
    // Relative: if we have fewer cards than them, good
    if (handLen < oh) v += 1.5;
  });

  // If we can empty next (1-card hand and free lead or can beat), huge
  if (handLen === 1 && state.currentCombo == null) v += 80;
  if (handLen === 0) v += 200;

  return v;
}

/**
 * Map position value difference to approximate P(win) in [0,1].
 * Logistic on eval vs 0 baseline.
 */
function valueToWinProb(value) {
  // squash: eval of 0 ~ 0.5, ± eval → higher P(win)
  const x = value / 40;
  return 1 / (1 + Math.exp(-x));
}

/**
 * Estimate P(win) after taking an action (play cards or null=pass).
 * Uses one-ply apply + position eval + short light rollout blend.
 */
function estimateActionWinProb(state, myIdx, play /* null = pass */) {
  if (!state.currentCombo && play == null) return 0; // illegal pass on free lead

  let next;
  try {
    if (play == null) {
      next = pass(cloneState(state), myIdx);
    } else {
      next = applyPlay(cloneState(state), myIdx, play);
    }
  } catch (e) {
    return 0;
  }

  // Immediate win
  if (next.players[myIdx].finished) {
    const place = (next.finishOrder || []).indexOf(myIdx);
    if (place === 0) return 0.98;
    return 0.7 - place * 0.1;
  }
  if (next.roundOver && next.loser === myIdx) return 0.05;

  const evalV = evaluatePosition(next, myIdx);
  let p = valueToWinProb(evalV);

  // Light rollout blend (a few playouts with fast policy) for calibration
  const rollouts = isFastEnv() ? 0 : 2;
  if (rollouts > 0) {
    let wins = 0;
    for (let r = 0; r < rollouts; r++) {
      wins += fastRollout(next, myIdx, 40 + r);
    }
    const rp = wins / rollouts;
    p = 0.55 * p + 0.45 * rp;
  }

  return p;
}

function isFastEnv() {
  return (typeof process !== 'undefined' && process.env &&
    (process.env.TIENLEN_TEST_FAST || process.env.NODE_ENV === 'test'));
}

// ─── Heuristic move score (lower cost = better for ordering) ───

/**
 * scorePlay: lower is better for ranking among plays.
 * Used for ordering and expert policy — NOT for pass threshold of "45".
 */
function scorePlay(play, state, myIdx) {
  const hand = state.players[myIdx].hand;
  const cur = state.currentCombo;
  const com = comboOf(play);
  if (!com) return 1e9;

  let score = 0;
  const usesTwo = playHasTwo(play);
  const bomb = isBombCombo(com);
  const facing2 = cur && cur.cards.every(c => c.rank === 12);
  const afterLen = hand.length - play.length;
  const omin = oppMinHand(state, myIdx);

  // Prefer emptying
  if (afterLen === 0) return -1000;

  // Prefer fewer remaining (but normalize so absolute level isn't huge)
  score += afterLen * 1.2;

  if (!cur) {
    // FREE LEAD
    score -= comboPriority(com.type) * 4;
    score -= play.length * 2.5;
    score += topRank(play) * 0.5;
    if (usesTwo) score += afterLen > 2 ? 40 : 8;
    if (com.type === 'single' && com.top.rank >= 10) score += 6;
    if (com.type === 'single' && com.top.rank === 12) score += 25;
    if ((com.type === 'seq' || com.type === 'pair' || com.type === 'triple') && topRank(play) <= 8) {
      score -= 5;
    }
  } else {
    // BEATING — prefer minimal beat
    score += topRank(play) * 0.9;
    // Slight prefer just-enough single over multi when same top
    score += play.length * 0.1;
    if (usesTwo && !facing2) score += 30;
    if (bomb && !facing2) score += 50;
    if (facing2 && bomb) score -= 20;
    if (cur.type === 'single' && com.type === 'single') {
      const gap = com.top.rank - cur.top.rank;
      if (gap > 3 && com.top.rank >= 10) score += gap;
    }
  }

  // Endgame aggression
  if (omin <= 2) {
    score -= play.length * 2;
    if (usesTwo) score -= 12;
  }
  if (hand.length <= 3) score -= 5;

  return score;
}

/**
 * Cheap legal = does not use a 2 and is not a bomb.
 */
function cheapLegals(legals) {
  return (legals || []).filter(p => !playIsExpensive(p));
}

/**
 * Pass ONLY when:
 *  - no legals, OR
 *  - every legal is expensive (2/bomb) AND midgame (hand large, no opp near out)
 *    AND win-prob of pass > best expensive play by a margin.
 * Never pass when any cheap legal exists.
 * Never pass on free lead.
 */
function shouldPassStrategically(state, myIdx, legals) {
  if (!state.currentCombo) return false;
  if (!legals || !legals.length) return true;

  const cheap = cheapLegals(legals);
  // ALWAYS play a cheap beat when available — this is the chronic-pass fix
  if (cheap.length > 0) return false;

  // Only expensive options remain
  const me = state.players[myIdx];
  const omin = oppMinHand(state, myIdx);

  // Endgame / short hand: dump even a 2 if needed
  if (omin <= 2 || me.hand.length <= 4) return false;

  // Facing a 2 and we hold a bomb: use it
  if (state.currentCombo.cards.every(c => c.rank === 12)) {
    if (legals.some(playIsBomb)) return false;
  }

  // Midgame: compare P(win) of pass vs best expensive play
  const passP = estimateActionWinProb(state, myIdx, null);
  let bestPlayP = 0;
  for (const pl of legals.slice(0, 6)) {
    bestPlayP = Math.max(bestPlayP, estimateActionWinProb(state, myIdx, pl));
  }
  // Prefer pass only if clearly better than burning a 2/bomb
  return passP > bestPlayP + 0.08;
}

function heuristicOrder(legals, state, myIdx) {
  return legals.slice().sort((a, b) => scorePlay(a, state, myIdx) - scorePlay(b, state, myIdx));
}

// ─── Expert policy ───

function getExpertMove(state, myIdx) {
  const hand = state.players[myIdx].hand;
  const cur = state.currentCombo;
  const hp = state.players[myIdx].passed;
  let legals = getLegalPlays(hand, cur, hp, state.isFirstLead, state.firstLeadCard);
  if (!legals.length) return null;

  // Free lead: never pass
  if (!cur) {
    return pickBestPlay(state, myIdx, legals);
  }

  if (shouldPassStrategically(state, myIdx, legals)) {
    return null;
  }

  // Bombs vs 2s
  if (cur.cards.every(c => c.rank === 12)) {
    const bombs = legals.filter(playIsBomb);
    if (bombs.length) {
      bombs.sort((a, b) => scorePlay(a, state, myIdx) - scorePlay(b, state, myIdx));
      return bombs[0];
    }
  }

  return pickBestPlay(state, myIdx, legals);
}

/**
 * Rank legals by estimated P(win), break ties with scorePlay.
 */
function pickBestPlay(state, myIdx, legals) {
  if (!legals.length) return null;
  if (legals.length === 1) return legals[0];

  // Prefer cheap moves first for evaluation budget
  const ordered = heuristicOrder(legals, state, myIdx);
  const candidates = ordered.slice(0, Math.min(12, ordered.length));

  let best = candidates[0];
  let bestP = -1;
  let bestScore = 1e9;

  for (const pl of candidates) {
    const p = estimateActionWinProb(state, myIdx, pl);
    const sc = scorePlay(pl, state, myIdx);
    // Primary: higher win prob; secondary: lower heuristic cost
    if (p > bestP + 0.02 || (Math.abs(p - bestP) <= 0.02 && sc < bestScore)) {
      bestP = p;
      bestScore = sc;
      best = pl;
    }
  }
  return best;
}

/**
 * Public: estimate values for all actions (play or pass).
 * Returns [{play, winProb, score}] sorted by winProb desc.
 * play=null means pass.
 */
function rankActions(state, myIdx) {
  const hand = state.players[myIdx].hand;
  const cur = state.currentCombo;
  const hp = state.players[myIdx].passed;
  const legals = getLegalPlays(hand, cur, hp, state.isFirstLead, state.firstLeadCard);
  const actions = [];

  for (const pl of legals) {
    actions.push({
      play: pl,
      winProb: estimateActionWinProb(state, myIdx, pl),
      score: scorePlay(pl, state, myIdx)
    });
  }
  if (cur && !shouldForcePlay(state, myIdx, legals)) {
    actions.push({
      play: null,
      winProb: estimateActionWinProb(state, myIdx, null),
      score: 0
    });
  }

  actions.sort((a, b) => {
    if (Math.abs(b.winProb - a.winProb) > 0.01) return b.winProb - a.winProb;
    // among similar P: prefer actual plays over pass, then lower scorePlay
    if (a.play == null && b.play != null) return 1;
    if (b.play == null && a.play != null) return -1;
    return (a.score || 0) - (b.score || 0);
  });
  return actions;
}

function shouldForcePlay(state, myIdx, legals) {
  if (!legals || !legals.length) return false;
  return cheapLegals(legals).length > 0;
}

// ─── Fast rollout for leaf / blend ───

function fastPolicyMove(state, cp) {
  const leg = getLegalPlays(
    state.players[cp].hand, state.currentCombo, state.players[cp].passed,
    state.isFirstLead, state.firstLeadCard
  );
  if (!leg.length) return { pass: true };
  // Must lead
  if (!state.currentCombo) {
    const ordered = heuristicOrder(leg, state, cp);
    return { play: ordered[0] };
  }
  // Cheap first
  const cheap = cheapLegals(leg);
  if (cheap.length) {
    return { play: heuristicOrder(cheap, state, cp)[0] };
  }
  // Expensive only: pass midgame if hand big
  if (state.players[cp].hand.length > 5 && oppMinHand(state, cp) > 3) {
    return { pass: true };
  }
  return { play: heuristicOrder(leg, state, cp)[0] };
}

function fastRollout(state, myIdx, maxSteps) {
  let s = cloneState(state);
  let steps = 0;
  while (!s.roundOver && steps < maxSteps) {
    const cp = s.currentPlayer;
    const dec = fastPolicyMove(s, cp);
    if (dec.pass) s = pass(s, cp);
    else s = applyPlay(s, cp, dec.play);
    s.isFirstLead = false;
    steps++;
  }
  if (s.players[myIdx].finished) {
    const place = (s.finishOrder || []).indexOf(myIdx);
    return place === 0 ? 1 : (place > 0 ? 0.35 : 0.5);
  }
  if (s.roundOver && s.loser === myIdx) return 0;
  // Partial: use eval
  return valueToWinProb(evaluatePosition(s, myIdx));
}

// ─── MCTS ───

class MCTSNode {
  constructor(state, playerIdx, move, parent) {
    this.state = state;
    this.player = playerIdx;
    this.move = move; // cards or null for pass
    this.passed = move === null && parent != null;
    this.parent = parent;
    this.children = [];
    this.visits = 0;
    this.wins = 0;
    this.untried = null;
  }
}

function runMCTS(rootState, myIdx, iterations) {
  const fast = isFastEnv() || iterations <= 50;
  if (fast && iterations > 50) iterations = 36;

  const legalsAtRoot = getLegalPlays(
    rootState.players[myIdx].hand, rootState.currentCombo,
    rootState.players[myIdx].passed, rootState.isFirstLead, rootState.firstLeadCard
  );
  if (!legalsAtRoot.length) return null;

  // Force-play cheap: prune pure pass from root if cheap legals exist
  const rootCheap = cheapLegals(legalsAtRoot);
  const allowPassAtRoot = rootState.currentCombo && rootCheap.length === 0;

  const root = new MCTSNode(rootState, rootState.currentPlayer, undefined, null);

  for (let i = 0; i < iterations; i++) {
    let node = root;
    let s = cloneState(rootState);

    // Selection
    while (node.untried == null && node.children.length > 0 && !s.roundOver) {
      let best = null;
      let bestU = -Infinity;
      const C = 1.35;
      for (const child of node.children) {
        if (!child.visits) { best = child; break; }
        const u = (child.wins / child.visits) + C * Math.sqrt(Math.log(node.visits + 1) / child.visits);
        if (u > bestU) { bestU = u; best = child; }
      }
      node = best;
      if (node.passed || node.move == null) {
        if (node.passed) s = pass(s, node.player);
      } else if (node.move) {
        s = applyPlay(s, node.player, node.move);
      }
    }

    // Expansion
    if (!s.roundOver) {
      if (node.untried === null) {
        const curP = s.currentPlayer;
        let leg = getLegalPlays(
          s.players[curP].hand, s.currentCombo, s.players[curP].passed,
          s.isFirstLead, s.firstLeadCard
        );
        // Cap branching: keep top-N by heuristic + pass
        if (leg.length > 10) {
          leg = heuristicOrder(leg, s, curP).slice(0, 10);
        }
        node.untried = leg.slice();
        const isRoot = node === root;
        const canPass = s.currentCombo && (
          (isRoot && allowPassAtRoot) ||
          (!isRoot && cheapLegals(leg).length === 0)
        );
        if (canPass) node.untried.push(null);
      }
      if (node.untried && node.untried.length) {
        const mv = node.untried.pop();
        const curP = s.currentPlayer;
        const child = new MCTSNode(null, curP, mv, node);
        let newS;
        if (mv == null) {
          newS = pass(cloneState(s), curP);
          child.passed = true;
        } else {
          newS = applyPlay(cloneState(s), curP, mv);
          child.passed = false;
        }
        child.state = newS;
        node.children.push(child);
        node = child;
        s = newS;
      }
    }

    // Simulation
    const outcome = fastRollout(s, myIdx, fast ? 28 : 55);

    // Backprop
    let cur = node;
    while (cur) {
      cur.visits++;
      cur.wins += outcome;
      cur = cur.parent;
    }
  }

  // Pick best child by visit-weighted win rate (require some visits)
  let bestChild = null;
  let bestV = -1;
  for (const ch of root.children) {
    if (!ch.visits) continue;
    // Slight prior against pass when cheap plays exist (shouldn't be expanded)
    let v = ch.wins / ch.visits;
    if ((ch.passed || ch.move == null) && rootCheap.length) v -= 0.5;
    if (v > bestV) {
      bestV = v;
      bestChild = ch;
    }
  }

  if (bestChild) {
    if (bestChild.passed || bestChild.move == null) {
      // Only allow pass if still no cheap
      if (rootCheap.length) return rootCheap[0] || legalsAtRoot[0];
      return null;
    }
    return bestChild.move;
  }
  return getExpertMove(rootState, myIdx) || legalsAtRoot[0];
}

// ─── Public API ───

/**
 * getAIMove(state, myIdx, opts) → cards[] | null
 * null = pass (only when combating and policy says so)
 */
function getAIMove(state, myIdx, opts = {}) {
  const difficulty = opts.difficulty || 'hard';
  let iters = difficulty === 'easy' ? 0 : (difficulty === 'medium' ? 80 : 220);
  if (opts.iterations != null) iters = opts.iterations;
  if (isFastEnv()) {
    iters = Math.min(iters, opts.iterations != null ? opts.iterations : 24);
  }

  const hand = state.players[myIdx].hand;
  const cur = state.currentCombo;
  const hp = state.players[myIdx].passed;
  const legals = getLegalPlays(hand, cur, hp, state.isFirstLead, state.firstLeadCard);

  if (!legals.length) return null;

  // FREE LEAD: always play (never null)
  if (!cur) {
    if (iters >= 40 && !isFastEnv()) {
      try {
        const mv = runMCTS(state, myIdx, iters);
        if (mv && mv.length) return mv;
      } catch (e) { /* fall through */ }
    }
    return pickBestPlay(state, myIdx, legals) || legals[0];
  }

  // Combating: hard rule — play cheap beats
  const cheap = cheapLegals(legals);
  if (cheap.length > 0) {
    if (iters >= 50 && !isFastEnv()) {
      try {
        const mv = runMCTS(state, myIdx, iters);
        // If MCTS returns pass or expensive when cheap exists, override
        if (mv && mv.length && !playIsExpensive(mv)) return mv;
        if (mv && playIsExpensive(mv)) {
          // only accept expensive if it wins immediately
          if (mv.length === hand.length) return mv;
        }
      } catch (e) { /* fall through */ }
    }
    return pickBestPlay(state, myIdx, cheap) || cheap[0];
  }

  // Only expensive legals
  if (shouldPassStrategically(state, myIdx, legals)) {
    // Double-check with ranking
    const ranked = rankActions(state, myIdx);
    if (ranked.length && ranked[0].play == null) return null;
    if (ranked.length && ranked[0].play) return ranked[0].play;
    return null;
  }

  if (iters >= 40 && !isFastEnv()) {
    try {
      const mv = runMCTS(state, myIdx, iters);
      if (mv !== undefined) return mv;
    } catch (e) { /* fall through */ }
  }

  return pickBestPlay(state, myIdx, legals) || legals[0];
}

function aiChoosesNonTrivial(state, myIdx) {
  const mv = getAIMove(state, myIdx, { difficulty: 'hard' });
  return mv == null || (mv && mv.length > 0);
}

// ─── Lightweight self-play TD (optional, improves leaf features) ───

let learnedWeights = [1.2, 0.9, 1.1, 0.8, 1.0, 0.7, 1.3];

function extractFeatures(state, myIdx) {
  const me = state.players[myIdx];
  const handLen = me.hand.length / 13;
  const has2 = me.hand.some(c => c.rank === 12) ? 1 : 0;
  const leadCtrl = (state.currentCombo == null && state.currentPlayer === myIdx) ? 1 : 0;
  const pairs = countPairs(me.hand);
  const omin = oppMinHand(state, myIdx);
  const oppThreat = omin <= 3 ? (4 - omin) / 4 : 0;
  const lowCards = me.hand.filter(c => c.rank < 5).length / 13;
  return [handLen, has2, leadCtrl, pairs / 6, oppThreat, lowCards, 1];
}

function countPairs(hand) {
  const by = {};
  hand.forEach(c => { by[c.rank] = (by[c.rank] || 0) + 1; });
  return Object.values(by).filter(n => n >= 2).length;
}

function learnedScore(state, myIdx) {
  // Lower better for compatibility with older tests
  const f = extractFeatures(state, myIdx);
  let s = 0;
  for (let i = 0; i < f.length; i++) s += f[i] * (learnedWeights[i] || 0);
  return s;
}

function selfPlayLearn(numGames) {
  numGames = numGames || 6;
  let wins = 0;
  for (let g = 0; g < numGames; g++) {
    let s = engine.createGameState(3, 500 + g * 3);
    let steps = 0;
    while (!s.roundOver && steps < 100) {
      const cp = s.currentPlayer;
      const leg = engine.getLegalPlays(
        s.players[cp].hand, s.currentCombo, s.players[cp].passed, s.isFirstLead, s.firstLeadCard
      );
      if (!leg.length) {
        s = engine.pass(s, cp);
      } else {
        const mv = getExpertMove(s, cp);
        if (mv == null && s.currentCombo) s = engine.pass(s, cp);
        else s = engine.applyPlay(s, cp, mv || leg[0]);
      }
      s.isFirstLead = false;
      steps++;
    }
    const winner = s.finishOrder && s.finishOrder[0];
    if (winner === 0) wins++;
    const f = extractFeatures(s, 0);
    const myWin = winner === 0 ? 1 : 0;
    for (let i = 0; i < learnedWeights.length; i++) {
      // Nudge: lower handLen weight on wins
      const target = (i === 0) ? (myWin ? 1.4 : 0.9) : (myWin ? 1.05 : 0.95);
      learnedWeights[i] += 0.02 * (target - learnedWeights[i]) * (f[i] || 0.1);
    }
  }
  learnedWeights = learnedWeights.map(w => Math.max(0.15, Math.min(3, w)));
  return { games: numGames, winsSeen: wins, weights: learnedWeights.slice() };
}

try { selfPlayLearn(4); } catch (e) {}

// ─── Baseline for strength tests ───

/** Always play lowest legal (by top card then size). Never strategic pass if any legal. */
function getLowestLegalMove(state, myIdx) {
  const hand = state.players[myIdx].hand;
  const cur = state.currentCombo;
  const hp = state.players[myIdx].passed;
  const legals = getLegalPlays(hand, cur, hp, state.isFirstLead, state.firstLeadCard);
  if (!legals.length) return null;
  return legals.slice().sort((a, b) => {
    const ta = topRank(a), tb = topRank(b);
    if (ta !== tb) return ta - tb;
    return a.length - b.length;
  })[0];
}

const TienLenAI = {
  getAIMove,
  getExpertMove,
  runMCTS,
  aiChoosesNonTrivial,
  scorePosition: (s, i) => -evaluatePosition(s, i), // lower better for old API
  evaluatePosition,
  estimateActionWinProb,
  rankActions,
  scorePlay,
  shouldPassStrategically,
  cheapLegals,
  playIsExpensive,
  getLowestLegalMove,
  valueToWinProb,
  getLearnedWeights: () => learnedWeights.slice(),
  selfPlayLearn
};

if (typeof module !== 'undefined' && module.exports) module.exports = TienLenAI;
if (typeof window !== 'undefined') window.TienLenAI = TienLenAI;
