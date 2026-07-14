/**
 * Tiến Lên AI — Grandmaster competitive player
 *
 * Architecture (pure static JS, browser + Node):
 *  1. Legal generator from engine (never illegal).
 *  2. Expert heuristic ranks moves (structure, multi-leads, conserve 2s/bombs).
 *  3. Search core (search.js): flat MC + UCT MCTS + optional determinization.
 *  4. Genome weights still tune eval/pass thresholds for evolution baselines.
 *
 * Pass discipline: NEVER pass when a cheap (non-2, non-bomb) legal beat exists.
 * Free lead: ALWAYS multi when safe multi exists (never search-noise singles).
 * Hard mode: real search with time budget (browser ~0.8–1.5s).
 */

/** Shown on title screen — bump when shipping AI behavior changes. */
const AI_BUILD = {
  id: "v9.1-probe-mbnest_ovk",
  stamped: "2026-07-13T02:50:38Z",
  label: "Grandmaster v9.1-probe mbnest_ovk"
};

// Publish build identity IMMEDIATELY (before any later init that might throw).
// Title screen reads these even if the rest of the AI module fails to finish loading.
if (typeof window !== 'undefined') {
  window.TIENLEN_AI_BUILD = AI_BUILD;
  window.TienLenAI = window.TienLenAI || {};
  window.TienLenAI.AI_BUILD = AI_BUILD;
}

// Prefer Node only when real CommonJS is present. Do NOT use bare
// `typeof require === 'function'` — some browsers/extensions define a stub
// `require` that throws on './engine.js' and would abort this script before
// `window.TienLenAI` is fully assigned.
const _isNodeCjs = (typeof module === 'object' && module && module.exports &&
  typeof require === 'function');
const engine = _isNodeCjs ? require('../engine.js') : ((typeof window !== 'undefined' && window.TienLenEngine) || {});
const genomeMod = _isNodeCjs
  ? require('../genome.js')
  : (typeof window !== 'undefined' ? window.TienLenGenome : null);
const searchMod = _isNodeCjs
  ? require('./p_mbnest_ovk-search.js')
  : (typeof window !== 'undefined' ? window.TienLenSearch : null);
const {
  detectCombo, getLegalPlays, applyPlay, pass, cardCompare, cloneState: engineClone
} = engine;

function cloneState(s) {
  return engineClone ? engineClone(s) : JSON.parse(JSON.stringify(s));
}

// Active policy genome (evolved champion becomes default)
let _activeGenome = genomeMod
  ? genomeMod.getChampion()
  : null;

function defaultGenome() {
  if (genomeMod) return genomeMod.getChampion();
  return {
    handLenW: 18, pairB: 2.5, tripB: 4, quadB: 8, seqB: 3, twoHold: 6, isoHighPen: 1.2,
    freeLeadB: 8, leaderB: 4, threat1: 35, threat2: 18, threat3: 8, threat5: 2, fewerCardsB: 1.5,
    oneCardFreeB: 80, multiLeadB: 4, shedLenB: 2.5, topLeadCost: 0.5, twoLeadMid: 40, twoLeadLate: 8,
    singleHighPen: 6, singleTwoLeadPen: 25, lowMultiB: 5, afterLenCost: 1.2, beatTopCost: 0.9,
    beatLenCost: 0.1, twoBeatPen: 30, bombBeatPen: 50, bombVs2B: 20, endgameShed: 2, endgameTwoUse: 12,
    shortHandB: 5, passHandMin: 4, passOppMin: 2, passMargin: 0.08, winProbEdge: 0.02, gen: 0, id: 'fallback'
  };
}

function G(g) {
  return g || _activeGenome || defaultGenome();
}

function setActiveGenome(g) {
  _activeGenome = genomeMod ? genomeMod.normalizeGenome(g) : Object.assign({}, g);
  return _activeGenome;
}

function getActiveGenome() {
  return Object.assign({}, G());
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

/** Mirror search structure cost lightly for scorePlay ordering. */
function structureBreakPenalty(hand, play) {
  const byRank = {};
  hand.forEach(c => { byRank[c.rank] = (byRank[c.rank] || 0) + 1; });
  let cost = 0;
  const used = {};
  play.forEach(c => { used[c.rank] = (used[c.rank] || 0) + 1; });
  Object.keys(used).forEach(rk => {
    const r = +rk;
    const u = used[r];
    const had = byRank[r] || 0;
    const left = had - u;
    if (had >= 2 && left === 1 && u === 1) cost += 6;
    if (play.length === 1 && had >= 2) cost += 10;
  });
  return cost;
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
 * Genome-parameterized for evolution.
 */
function evaluatePosition(state, myIdx, genome) {
  const g = G(genome);
  const me = state.players[myIdx];
  if (me.finished) {
    const order = state.finishOrder || [];
    const place = order.indexOf(myIdx);
    if (place === 0) return 1000;
    if (place > 0) return 500 - place * 50;
    return 200;
  }
  if (state.roundOver && state.loser === myIdx) return -500;

  let v = 0;
  const handLen = me.hand.length;
  v -= handLen * g.handLenW;

  const byRank = {};
  me.hand.forEach(c => { byRank[c.rank] = (byRank[c.rank] || 0) + 1; });
  let pairs = 0, trips = 0, quads = 0;
  Object.keys(byRank).forEach(r => {
    const n = byRank[r];
    if (n >= 2) pairs++;
    if (n >= 3) trips++;
    if (n >= 4) quads++;
  });
  v += pairs * g.pairB + trips * g.tripB + quads * g.quadB;

  const ranks = Object.keys(byRank).map(Number).sort((a, b) => a - b);
  let run = 1, bestRun = 1;
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] === ranks[i - 1] + 1) { run++; bestRun = Math.max(bestRun, run); }
    else run = 1;
  }
  if (bestRun >= 3) v += (bestRun - 2) * g.seqB;

  const twos = me.hand.filter(c => c.rank === 12).length;
  v += twos * g.twoHold;

  me.hand.forEach(c => {
    if (c.rank >= 10 && c.rank < 12 && (byRank[c.rank] || 0) === 1) v -= g.isoHighPen;
  });

  if (state.currentCombo == null && state.currentPlayer === myIdx) v += g.freeLeadB;
  if (state.currentLeader === myIdx && state.currentCombo == null) v += g.leaderB;

  state.players.forEach((p, i) => {
    if (i === myIdx || p.finished) return;
    const oh = p.hand.length;
    if (oh <= 1) v -= g.threat1;
    else if (oh <= 2) v -= g.threat2;
    else if (oh <= 3) v -= g.threat3;
    else if (oh <= 5) v -= g.threat5;
    if (handLen < oh) v += g.fewerCardsB;
  });

  if (handLen === 1 && state.currentCombo == null) v += g.oneCardFreeB;
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
function estimateActionWinProb(state, myIdx, play /* null = pass */, genome) {
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

  if (next.players[myIdx].finished) {
    const place = (next.finishOrder || []).indexOf(myIdx);
    if (place === 0) return 0.98;
    return 0.7 - place * 0.1;
  }
  if (next.roundOver && next.loser === myIdx) return 0.05;

  const evalV = evaluatePosition(next, myIdx, genome);
  let p = valueToWinProb(evalV);

  // Evolution / tests / browser: skip rollouts (eval ranking is enough & fast)
  const inBrowser = (typeof window !== 'undefined' && typeof document !== 'undefined');
  const evolveFast = (typeof process !== 'undefined' && process.env && process.env.TIENLEN_EVOLVE);
  const rollouts = (isFastEnv() || inBrowser || evolveFast) ? 0 : 2;
  if (rollouts > 0) {
    let wins = 0;
    for (let r = 0; r < rollouts; r++) {
      wins += fastRollout(next, myIdx, 40 + r, genome);
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
function scorePlay(play, state, myIdx, genome) {
  const g = G(genome);
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

  if (afterLen === 0) return -1000;

  score += afterLen * g.afterLenCost;

  if (!cur) {
    // FREE LEAD: multi > single; prefer LOW short multi (pair/triple/short seq), not mega-dumps
    score -= comboPriority(com.type) * (g.multiLeadB + 8);
    if (play.length === 2) score -= (g.shedLenB + 8);
    else if (play.length === 3) score -= (g.shedLenB + 10);
    else if (play.length === 4) score -= (g.shedLenB + 6);
    else if (play.length >= 5) score -= (g.shedLenB + 2) - (play.length - 4) * 2;
    score += topRank(play) * (g.topLeadCost + 0.8);
    if (usesTwo) score += afterLen > 2 ? g.twoLeadMid : g.twoLeadLate;
    if (com.type === 'single') {
      score += 40 + g.singleHighPen;
      if (com.top.rank >= 10) score += g.singleHighPen + 12;
      if (com.top.rank === 12) score += g.singleTwoLeadPen + 25;
    } else {
      if (topRank(play) <= 7) score -= (g.lowMultiB + 12);
      else if (topRank(play) <= 9) score -= (g.lowMultiB + 4);
      if (com.type === 'pair') score -= 5;
      // structure: avoid plays that leave broken pairs
      score += structureBreakPenalty(hand, play) * 2;
    }
  } else {
    score += topRank(play) * g.beatTopCost;
    score += play.length * g.beatLenCost;
    // 2s: don't always refuse — use when facing high tops or short hands
    if (usesTwo && !facing2) {
      const curTop = cur.top ? cur.top.rank : 0;
      let pen = g.twoBeatPen;
      if (curTop >= 10) pen *= 0.25; // K/A/2 territory — 2s are fair game
      else if (curTop >= 8) pen *= 0.55;
      if (omin <= 3) pen *= 0.35;
      if (hand.length <= 4) pen *= 0.4;
      score += pen;
    }
    if (bomb && !facing2) score += g.bombBeatPen;
    if (facing2 && bomb) score -= g.bombVs2B;
    if (cur.type === 'single' && com.type === 'single') {
      const gap = com.top.rank - cur.top.rank;
      if (gap > 3 && com.top.rank >= 10 && !usesTwo) score += gap;
    }
  }

  if (omin <= 2) {
    score -= play.length * g.endgameShed;
    if (usesTwo) score -= g.endgameTwoUse;
  }
  if (hand.length <= 3) score -= g.shortHandB;

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
function shouldPassStrategically(state, myIdx, legals, genome) {
  if (!state.currentCombo) return false;
  if (!legals || !legals.length) return true;
  const g = G(genome);

  const cheap = cheapLegals(legals);
  // ALWAYS play a cheap beat when available
  if (cheap.length > 0) return false;

  const me = state.players[myIdx];
  const omin = oppMinHand(state, myIdx);

  if (omin <= g.passOppMin || me.hand.length <= g.passHandMin) return false;

  if (state.currentCombo.cards.every(c => c.rank === 12)) {
    if (legals.some(playIsBomb)) return false;
  }

  // Contest policy: never fold Ace/2; never fold K if non-2 beat or short hand
  const curTop = state.currentCombo.top ? state.currentCombo.top.rank : 0;
  if (curTop >= 11 && legals.length > 0) return false;
  if (curTop >= 10) {
    if (legals.some(p => !playHasTwo(p))) return false;
    if (me.hand.length <= 8 || omin <= 4) return false;
  }
  if (me.hand.length <= 5 && legals.length > 0) return false;

  // Fast path during evolution
  if (typeof process !== 'undefined' && process.env && process.env.TIENLEN_EVOLVE) {
    // Only pass pure-2 responses to low junk when hand is still deep
    if (curTop < 8 && me.hand.length > g.passHandMin + 2) return true;
    return false; // default: play something (including 2s) rather than chronic pass
  }

  const passP = estimateActionWinProb(state, myIdx, null, genome);
  let bestPlayP = 0;
  for (const pl of legals.slice(0, 6)) {
    bestPlayP = Math.max(bestPlayP, estimateActionWinProb(state, myIdx, pl, genome));
  }
  return passP > bestPlayP + g.passMargin;
}

function heuristicOrder(legals, state, myIdx, genome) {
  return legals.slice().sort((a, b) => scorePlay(a, state, myIdx, genome) - scorePlay(b, state, myIdx, genome));
}

// ─── Expert policy ───

function getExpertMove(state, myIdx, genome) {
  const g = G(genome);
  const hand = state.players[myIdx].hand;
  const cur = state.currentCombo;
  const hp = state.players[myIdx].passed;
  let legals = getLegalPlays(hand, cur, hp, state.isFirstLead, state.firstLeadCard);
  if (!legals.length) return null;

  if (!cur) {
    return pickBestPlay(state, myIdx, legals, g);
  }

  if (shouldPassStrategically(state, myIdx, legals, g)) {
    return null;
  }

  if (cur.cards.every(c => c.rank === 12)) {
    const bombs = legals.filter(playIsBomb);
    if (bombs.length) {
      bombs.sort((a, b) => scorePlay(a, state, myIdx, g) - scorePlay(b, state, myIdx, g));
      return bombs[0];
    }
  }

  return pickBestPlay(state, myIdx, legals, g);
}

/**
 * Free-lead hard preference: if any non-expensive multi-card legal exists,
 * never open with a single (unless multi would empty? always prefer multi).
 * This is NOT evolvable away — fixes chronic single-only leading.
 * Also prefers go-out and structure-preserving multi plays via search expert when present.
 */
/**
 * Prefer any multi over any single (used when free-lead fallbacks hit legals[0]).
 * getLegalPlays emits singles first — never use legals[0] raw on free lead.
 */
function preferNonSingleLegal(legals) {
  if (!legals || !legals.length) return null;
  const multiSafe = legals.filter(p => p.length >= 2 && !playIsExpensive(p));
  if (multiSafe.length) {
    return multiSafe.slice().sort((a, b) => {
      // low top, then prefer pairs, then shorter multi (2–4)
      const ta = topRank(a), tb = topRank(b);
      if (ta !== tb) return ta - tb;
      if (a.length !== b.length) {
        // prefer length 2–4
        const sa = a.length <= 4 ? a.length : 10 - a.length;
        const sb = b.length <= 4 ? b.length : 10 - b.length;
        return sb - sa;
      }
      return 0;
    })[0];
  }
  const multiAny = legals.filter(p => p.length >= 2);
  if (multiAny.length) return multiAny[0];
  const cheapS = legals.filter(p => !playIsExpensive(p));
  if (cheapS.length) {
    return cheapS.slice().sort((a, b) => topRank(a) - topRank(b) || a.length - b.length)[0];
  }
  return legals[0];
}

/**
 * v3 free-lead guard (not pure multi-only):
 * - Never gift low single when opp has 1 card
 * - Never lead K/A/2 early when multi or trash-shed better
 * - Allow trash singles / multi from pickFreeLeadHard
 */
function forceMultiFreeLead(legals, proposed, state, myIdx) {
  if (searchMod && searchMod.pickFreeLeadHard) {
    const hard = searchMod.pickFreeLeadHard(legals, state, myIdx);
    if (!proposed) return hard;
    // Veto gift leads
    const omin = oppMinHand(state, myIdx);
    if (omin === 1 && proposed.length === 1 && proposed[0].rank < 10) return hard;
    // Veto early high singles when better options
    if (proposed.length === 1 && proposed[0].rank >= 10 && state.players[myIdx].hand.length > 5) {
      const multi = legals.filter(p => p.length >= 2 && !playIsExpensive(p));
      if (multi.length) return hard;
    }
    // Accept legal proposed if it matches hard preference class
    const sig = proposed.map(c => c.rank * 4 + c.suit).sort((a, b) => a - b).join(',');
    const ok = legals.some(l => l.map(c => c.rank * 4 + c.suit).sort((a, b) => a - b).join(',') === sig);
    if (ok) {
      // Prefer hard when proposed is single-non-trash mid multi-available
      if (proposed.length === 1 && multiAvailable(legals) && proposed[0].rank > 8) return hard;
      return proposed;
    }
    return hard;
  }
  return preferNonSingleLegal(legals) || (legals && legals[0]);
}

function multiAvailable(legals) {
  return (legals || []).some(p => p.length >= 2 && !playIsExpensive(p));
}

function pickFreeLead(state, myIdx, legals, genome) {
  const g = G(genome);
  if (!legals.length) return null;
  // Immediate empty
  for (let i = 0; i < legals.length; i++) {
    if (legals[i].length === state.players[myIdx].hand.length) return legals[i];
  }
  // HARD: multi-only when non-expensive multi exists (never single-open)
  let pick = null;
  if (searchMod && searchMod.pickFreeLeadHard) {
    pick = searchMod.pickFreeLeadHard(legals, state, myIdx);
  } else {
    const multi = legals.filter(p => p.length >= 2 && !playIsExpensive(p));
    const pool = multi.length ? multi : legals.filter(p => !playIsExpensive(p));
    const use = pool.length ? pool : legals;
    pick = heuristicOrder(use, state, myIdx, g)[0] || legals[0];
  }
  return forceMultiFreeLead(legals, pick, state, myIdx);
}

/**
 * Rank legals by estimated P(win), break ties with scorePlay.
 * Free lead uses multi-card hard preference. Evolve uses scorePlay-only (fast).
 */
function pickBestPlay(state, myIdx, legals, genome) {
  if (!legals.length) return null;
  if (legals.length === 1) return legals[0];
  const g = G(genome);

  // Free lead: multi-card first (always)
  if (!state.currentCombo) {
    return pickFreeLead(state, myIdx, legals, g);
  }

  const ordered = heuristicOrder(legals, state, myIdx, g);
  const evolveFast = (typeof process !== 'undefined' && process.env && process.env.TIENLEN_EVOLVE);
  if (evolveFast) return ordered[0];

  // Beating: prefer scorePlay among top candidates; light winProb only as tie-break
  // so multi-card structure isn't abandoned for weak eval noise
  const candidates = ordered.slice(0, Math.min(10, ordered.length));
  let best = candidates[0];
  let bestScore = scorePlay(best, state, myIdx, g);
  let bestP = estimateActionWinProb(state, myIdx, best, g);
  const edge = g.winProbEdge || 0.02;

  for (let i = 1; i < candidates.length; i++) {
    const pl = candidates[i];
    const sc = scorePlay(pl, state, myIdx, g);
    // Primary: lower scorePlay (minimal beat, multi when useful)
    if (sc < bestScore - 0.5) {
      best = pl;
      bestScore = sc;
      bestP = estimateActionWinProb(state, myIdx, pl, g);
      continue;
    }
    if (Math.abs(sc - bestScore) <= 0.5) {
      const p = estimateActionWinProb(state, myIdx, pl, g);
      if (p > bestP + edge) {
        best = pl;
        bestScore = sc;
        bestP = p;
      }
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

function fastRollout(state, myIdx, maxSteps, genome) {
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
  return valueToWinProb(evaluatePosition(s, myIdx, genome));
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
 * Last search diagnostics (browser debug / tests).
 */
let _lastSearchStats = null;

function getLastSearchStats() {
  return _lastSearchStats ? Object.assign({}, _lastSearchStats) : null;
}

/**
 * getAIMove(state, myIdx, opts) → cards[] | null
 * opts.genome — optional policy params (evolution / testing)
 * opts.difficulty — easy|medium|hard|grandmaster
 * opts.timeMs / iterations / mode / hiddenInfo / perfectInfo / useSearch
 * null = pass (only when combating and policy says so)
 */
function getAIMove(state, myIdx, opts = {}) {
  const genome = opts.genome ? G(opts.genome) : G();
  const difficulty = opts.difficulty || 'hard';
  const inBrowser = (typeof window !== 'undefined' && typeof document !== 'undefined');
  const evolveFast = (typeof process !== 'undefined' && process.env && process.env.TIENLEN_EVOLVE);
  let iters = difficulty === 'easy' ? 0
    : (difficulty === 'medium' ? 48
      : (difficulty === 'grandmaster' ? 600
        : (inBrowser ? 200 : 400)));
  if (opts.iterations != null) iters = opts.iterations;
  if (isFastEnv() || evolveFast) {
    iters = Math.min(iters, opts.iterations != null ? opts.iterations : (evolveFast ? 0 : 24));
  }

  const eng = (typeof window !== 'undefined' && window.TienLenEngine) ? window.TienLenEngine : engine;
  const legalFn = eng.getLegalPlays || getLegalPlays;
  const hand = state.players[myIdx].hand;
  const cur = state.currentCombo;
  const hp = state.players[myIdx].passed;
  const legals = legalFn(hand, cur, hp, state.isFirstLead, state.firstLeadCard);

  if (!legals.length) return null;

  // Immediate go-out always
  for (let gi = 0; gi < legals.length; gi++) {
    if (legals[gi].length === hand.length) return legals[gi];
  }

  // Evolution / easy / forced expert
  const forceExpert = evolveFast || difficulty === 'easy' || iters === 0 || opts.mode === 'expert';
  if (forceExpert) {
    let mv;
    if (!cur) {
      mv = pickFreeLead(state, myIdx, legals, genome);
      if (searchMod && searchMod.enforcePolicyGuards) mv = searchMod.enforcePolicyGuards(state, myIdx, mv);
      mv = forceMultiFreeLead(legals, mv, state, myIdx);
    } else {
      const cheap = cheapLegals(legals);
      if (cheap.length) mv = pickBestPlay(state, myIdx, cheap, genome) || cheap[0];
      else if (shouldPassStrategically(state, myIdx, legals, genome)) mv = null;
      else mv = pickBestPlay(state, myIdx, legals, genome) || legals[0];
      if (searchMod && searchMod.enforcePolicyGuards) {
        mv = searchMod.enforcePolicyGuards(state, myIdx, mv);
      }
    }
    // Endgame solvers can override — re-apply combat guards (Ace+2, never pass vs Ace)
    if (searchMod && searchMod.exactEndgameMove) {
      const ex = searchMod.exactEndgameMove(state, myIdx);
      if (ex) mv = ex;
    }
    if (searchMod && searchMod.endgamePick) {
      const eg = searchMod.endgamePick(state, myIdx);
      if (eg) mv = eg;
    }
    if (cur && searchMod && searchMod.enforcePolicyGuards) {
      mv = searchMod.enforcePolicyGuards(state, myIdx, mv);
    }
    return mv == null ? null : mv;
  }

  // ─── Search path (free lead + combat) — MC/MCTS with v3 policy rollouts ───
  const useSearch = opts.useSearch !== false && searchMod && typeof searchMod.searchMove === 'function'
    && !isFastEnv();

  if (useSearch) {
    try {
      const wantPerfect = opts.perfectInfo === true && opts.hiddenInfo !== true;
      // Free lead: use MC with more sims; combat: MCTS
      const freeLead = !cur;
      // v3: more simulation budget — free-lead MC is critical for trash/control tradeoffs
      const searchOpts = {
        difficulty: difficulty,
        inBrowser: inBrowser,
        iterations: opts.iterations != null ? opts.iterations : (freeLead ? 100 : (inBrowser ? 220 : 400)),
        timeMs: opts.timeMs != null ? opts.timeMs : (freeLead ? (inBrowser ? 500 : 800) : (inBrowser ? 1000 : 1600)),
        maxSims: opts.maxSims != null ? opts.maxSims : (freeLead ? 160 : 100),
        mode: opts.mode || (freeLead ? 'mc' : 'mcts'),
        perfectInfo: wantPerfect,
        hiddenInfo: !wantPerfect,
        determinizations: opts.determinizations != null ? opts.determinizations : (wantPerfect ? 1 : 16),
        seed: opts.seed,
        maxBranch: opts.maxBranch != null ? opts.maxBranch : (freeLead ? 16 : 12),
        exploit: opts.exploit,
        exactExploit: opts.exactExploit,
        exactExploitMs: opts.exactExploitMs != null ? opts.exactExploitMs : opts.timeMs,
        exploitTrials: opts.exploitTrials,
        deepExact: opts.deepExact,
        dualSelf: opts.dualSelf,
        bestResponse: opts.bestResponse,
        alphaBeta: opts.alphaBeta,
        brTrials: opts.brTrials,
        strongSelf: opts.strongSelf
      };
      const result = searchMod.searchMove(state, myIdx, searchOpts);
      _lastSearchStats = result && result.stats ? result.stats : null;
      if (_lastSearchStats) {
        _lastSearchStats.policyVersion = AI_BUILD.id;
        _lastSearchStats.stamped = AI_BUILD.stamped;
      }

      let mv = result ? result.play : undefined;
      const exploitMode = _lastSearchStats && (
        _lastSearchStats.mode === 'exploit-v30' ||
        _lastSearchStats.mode === 'exploit-v40' ||
        _lastSearchStats.mode === 'exploit-v51' ||
        _lastSearchStats.mode === 'exploit-v60' ||
        _lastSearchStats.mode === 'exploit-v70' ||
        _lastSearchStats.mode === 'exploit-v80' ||
        _lastSearchStats.mode === 'exploit-v80-soft' ||
        _lastSearchStats.mode === 'exact-exploit' ||
        _lastSearchStats.mode === 'exact-exploit-out' ||
        _lastSearchStats.mode === 'exact-exploit-soft' ||
        _lastSearchStats.mode === 'exact-endgame' ||
        _lastSearchStats.mode === 'alpha-beta' ||
        _lastSearchStats.mode === 'best-response' ||
        _lastSearchStats.mode === 'best-response-det'
      );

      if (searchMod.enforcePolicyGuards) {
        // Free lead + exploit: only hard no-gift (keep search free-lead choice).
        // Combat: ALWAYS full guards — Ace+2 / never pass vs Ace (human-log #43–#72).
        // exact-endgame/exploit previously skipped combat guards → Ace-climb regression.
        if (exploitMode && !cur) {
          const omin = oppMinHand(state, myIdx);
          if (mv && mv.length === 1 && omin === 1 && mv[0].rank < 10) {
            mv = searchMod.pickFreeLeadHard
              ? searchMod.pickFreeLeadHard(legals, state, myIdx)
              : mv;
          }
        } else {
          mv = searchMod.enforcePolicyGuards(state, myIdx, mv);
        }
      }
      if (!cur && !exploitMode) {
        mv = forceMultiFreeLead(legals, mv, state, myIdx);
      } else if (mv == null && cur) {
        const cheapS = cheapLegals(legals);
        if (cheapS.length) mv = pickBestPlay(state, myIdx, cheapS, genome) || cheapS[0];
      }

      if (mv != null && mv.length) {
        const sig = mv.map(c => c.rank * 4 + c.suit).sort((a, b) => a - b).join(',');
        const ok = legals.some(l => l.map(c => c.rank * 4 + c.suit).sort((a, b) => a - b).join(',') === sig);
        if (!ok) {
          mv = !cur
            ? (pickFreeLead(state, myIdx, legals, genome) || preferNonSingleLegal(legals))
            : (searchMod.enforcePolicyGuards
              ? searchMod.enforcePolicyGuards(state, myIdx, null)
              : (pickBestPlay(state, myIdx, legals, genome) || legals[0]));
        }
      }

      if (!cur && (mv == null || !mv.length)) {
        mv = pickFreeLead(state, myIdx, legals, genome) || preferNonSingleLegal(legals) || legals[0];
      }

      return mv == null ? null : mv;
    } catch (e) {
      try { console.warn('[TiengLen] search failed, expert fallback', e); } catch (_) {}
      _lastSearchStats = { error: String(e && e.message || e), stamped: AI_BUILD.stamped };
    }
  }

  // Free lead fallback if search skipped
  if (!cur) {
    let lead = pickFreeLead(state, myIdx, legals, genome);
    if (searchMod && searchMod.enforcePolicyGuards) lead = searchMod.enforcePolicyGuards(state, myIdx, lead);
    return forceMultiFreeLead(legals, lead, state, myIdx) || preferNonSingleLegal(legals) || legals[0];
  }

  // ─── Expert / legacy MCTS fallback (combat) ───

  const cheap = cheapLegals(legals);
  if (cheap.length > 0) {
    if (iters >= 80 && !isFastEnv() && !inBrowser && !searchMod) {
      try {
        const mv = runMCTS(state, myIdx, iters);
        if (mv && mv.length && !playIsExpensive(mv)) return mv;
        if (mv && playIsExpensive(mv) && mv.length === hand.length) return mv;
      } catch (e) { /* fall through */ }
    }
    return pickBestPlay(state, myIdx, cheap, genome) || cheap[0];
  }

  if (shouldPassStrategically(state, myIdx, legals, genome)) {
    return null;
  }

  if (iters >= 80 && !isFastEnv() && !inBrowser && !searchMod) {
    try {
      const mv = runMCTS(state, myIdx, iters);
      if (mv !== undefined && mv !== null) return mv;
    } catch (e) { /* fall through */ }
  }

  return pickBestPlay(state, myIdx, legals, genome) || legals[0];
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
  AI_BUILD,
  getAIMove,
  getExpertMove,
  runMCTS,
  aiChoosesNonTrivial,
  scorePosition: (s, i, g) => -evaluatePosition(s, i, g),
  evaluatePosition,
  estimateActionWinProb,
  rankActions,
  scorePlay,
  shouldPassStrategically,
  cheapLegals,
  playIsExpensive,
  pickFreeLead,
  forceMultiFreeLead,
  preferNonSingleLegal,
  getLowestLegalMove,
  valueToWinProb,
  setActiveGenome,
  getActiveGenome,
  getLearnedWeights: () => learnedWeights.slice(),
  selfPlayLearn,
  getLastSearchStats,
  search: searchMod
};

if (typeof module !== 'undefined' && module.exports) module.exports = TienLenAI;
if (typeof window !== 'undefined') window.TienLenAI = TienLenAI;
