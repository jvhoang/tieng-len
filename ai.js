/**
 * Tiến Lên AI - Hybrid Expert + MCTS + self-play ML (with empty-leg guard)
 */
const engine = (typeof require === 'function') ? require('./engine.js') : (window.TienLenEngine || {});
const { detectCombo, getLegalPlays, applyPlay, pass, cardCompare, getTopCard, cloneState: engineClone } = engine;
function cloneState(s) { return engineClone ? engineClone(s) : JSON.parse(JSON.stringify(s)); }
function scorePosition(state, myIdx) {
  const me = state.players[myIdx];
  let score = me.hand.length * 10;
  const has2sOut = state.players.some((p, i) => i !== myIdx && !p.finished && p.hand.some(c => c.rank === 12));
  if (has2sOut) score -= me.hand.filter(c => c.rank === 12).length * 3;
  if (state.currentLeader === myIdx || state.currentPlayer === myIdx) score -= 4;
  const highCount = me.hand.filter(c => c.rank >= 10).length;
  score += highCount * 0.8;
  state.players.forEach((p, i) => { if (i !== myIdx && !p.finished) score += (13 - p.hand.length) * 0.5; });
  try { if (typeof learnedScore === 'function') score = score * 0.6 + learnedScore(state, myIdx) * 0.4; } catch(_) {}
  return score;
}
function heuristicOrder(legals, state, myIdx) { return legals.slice().sort((a, b) => { const ca = detectCombo(a), cb = detectCombo(b); const cur = state.currentCombo; const facing2 = cur && cur.cards.every(c => c.rank === 12); if (facing2) { const ba = (ca.type==='quad' || (ca.type==='doubleseq'&&ca.numPairs>=3)); const bb = (cb.type==='quad' || (cb.type==='doubleseq'&&cb.numPairs>=3)); if (ba && !bb) return -1; if (!ba && bb) return 1; } if (!cur) return a.length - b.length || (ca.top.rank - cb.top.rank); const ta = ca ? ca.top.rank : 99, tb = cb ? cb.top.rank : 99; return ta - tb; }); }
function getExpertMove(state, myIdx) {
  const hand = state.players[myIdx].hand; const cur = state.currentCombo; const hp = state.players[myIdx].passed;
  let legals = getLegalPlays(hand, cur, hp, state.isFirstLead, state.firstLeadCard);
  if (legals.length === 0) return null;
  legals = heuristicOrder(legals, state, myIdx);
  if (legals.length === 1) return legals[0];
  if (cur && cur.cards.every(c=>c.rank===12)) { const bombs = legals.filter(p => { const c=detectCombo(p); return (c.type==='quad') || (c.type==='doubleseq'&&c.numPairs>=3); }); if (bombs.length) return bombs[0]; }
  if (typeof learnedScore === 'function' && legals.length > 1) { try { legals = legals.slice().sort((a,b) => { const na = engine.applyPlay ? engine.applyPlay(cloneState(state), myIdx, a) : state; const nb = engine.applyPlay ? engine.applyPlay(cloneState(state), myIdx, b) : state; return learnedScore(na, myIdx) - learnedScore(nb, myIdx); }); } catch(e){} }
  if (!cur) { const singles = legals.filter(p=>p.length===1); if (singles.length) return singles[singles.length-1]; }
  return legals[0];
}
class MCTSNode { constructor(state, playerIdx, move=null, parent=null){ this.state=state; this.player=playerIdx; this.move=move; this.parent=parent; this.children=[]; this.visits=0; this.wins=0; this.untried=null; } }
function rolloutPolicy(state, myIdx) { let s = cloneState(state); let steps=0; while (!s.roundOver && steps < 50) { const cp = s.currentPlayer; const leg = getLegalPlays(s.players[cp].hand, s.currentCombo, s.players[cp].passed, s.isFirstLead, s.firstLeadCard); if (leg.length===0) { s = pass(s, cp); } else { const ch = getExpertMove(s, cp) || leg[0]; s = applyPlay(s, cp, ch); } s.isFirstLead=false; steps++; } const winner = (s.finishOrder && s.finishOrder.length) ? s.finishOrder[0] : null; return (winner === myIdx) ? 1 : 0; }
function runMCTS(rootState, myIdx, iterations=500) {
  const root = new MCTSNode(rootState, rootState.currentPlayer);
  const legalsAtRoot = getLegalPlays(rootState.players[myIdx].hand, rootState.currentCombo, rootState.players[myIdx].passed, rootState.isFirstLead, rootState.firstLeadCard);
  if (!legalsAtRoot.length) return null;
  for (let i=0; i<iterations; i++) {
    let node = root; let s=cloneState(rootState);
    while (node.untried==null && node.children.length>0 && !s.roundOver) {
      let best=null, bestU=-Infinity; const C=1.4;
      for (const ch of node.children) { if (!ch.visits) {best=ch;break;} const u = (ch.wins/ch.visits) + C*Math.sqrt(Math.log(node.visits)/ch.visits); if (u>bestU){bestU=u;best=ch;} }
      node=best; if (node.move) s = applyPlay(s, node.player, node.move);
    }
    if (!s.roundOver) {
      if (node.untried===null) node.untried = getLegalPlays(s.players[s.currentPlayer].hand, s.currentCombo, s.players[s.currentPlayer].passed, s.isFirstLead, s.firstLeadCard);
      if (node.untried && node.untried.length) {
        const mv = node.untried.pop();
        const ns = applyPlay(cloneState(s), s.currentPlayer, mv);
        const ch = new MCTSNode(ns, s.currentPlayer, mv, node);
        node.children.push(ch); node=ch; s=ns;
      }
    }
    const outcome = rolloutPolicy(s, myIdx);
    let cur=node; while(cur){ cur.visits++; cur.wins += outcome; cur=cur.parent; }
  }
  let best=null, bestV=-1;
  for (const ch of root.children){ const v=ch.visits?(ch.wins/ch.visits):0; if(v>bestV||best===null){bestV=v;best=ch;} }
  return (best&&best.move) ? best.move : getExpertMove(rootState,myIdx) || legalsAtRoot[0];
}
function getAIMove(state, myIdx, opts={}) {
  const it = (opts.difficulty==='easy'?40:(opts.difficulty==='medium'?200:500));
  try { const m=runMCTS(state,myIdx,it); if(m) return m; }catch(e){}
  return getExpertMove(state,myIdx);
}
function aiChoosesNonTrivial(state,myIdx){ const mv=getAIMove(state,myIdx,{difficulty:'hard'}); return !!(mv&&mv.length); }
const TienLenAI = { getAIMove, getExpertMove, runMCTS, aiChoosesNonTrivial, scorePosition };
if (typeof module!=='undefined'&&module.exports) module.exports=TienLenAI;
if (typeof window!=='undefined') window.TienLenAI=TienLenAI;
let learnedWeights = [1.0,1.5,0.8,1.2,0.6,0.9];
function extractFeatures(state, myIdx) {
  const me = state.players[myIdx]; const handLen = me.hand.length / 13;
  const has2 = me.hand.some(c => c.rank === 12) ? 1 : 0;
  const leadCtrl = (state.currentLeader === myIdx || state.currentPlayer === myIdx) ? 1 : 0;
  const bombPot = (me.hand.filter(c => c.rank <= 3).length >= 3 || me.hand.some(c=>c.rank===12)) ? 1 : 0;
  let highP = 0; state.players.forEach((p,i) => { if (i!==myIdx && !p.finished) highP += p.hand.filter(c=>c.rank>8).length; });
  const highPressure = Math.min(1, highP / 8);
  const lowShed = me.hand.filter(c => c.rank < 4).length > 0 ? 1 : 0;
  return [handLen, has2, leadCtrl, bombPot, highPressure, lowShed];
}
function learnedScore(state, myIdx) { const f = extractFeatures(state, myIdx); let s = 0; for (let i=0; i<f.length; i++) s += f[i] * learnedWeights[i]; return s; }
function selfPlayLearn(numGames=2) {
  for (let g=0; g<numGames; g++) {
    let s = engine.createGameState(4, 900+g);
    let steps=0;
    while (!s.roundOver && steps < 40) {
      const cp = s.currentPlayer;
      const leg = engine.getLegalPlays(s.players[cp].hand, s.currentCombo, s.players[cp].passed, s.isFirstLead, s.firstLeadCard);
      if (leg.length === 0) { s = engine.pass(s, cp); } else {
        let choice = leg[0];
        if (leg.length > 1 && typeof learnedScore === 'function') {
          choice = leg.reduce((best, pl) => {
            const ns = engine.applyPlay(engine.cloneState ? engine.cloneState(s) : JSON.parse(JSON.stringify(s)), cp, pl);
            const sc = learnedScore(ns, cp);
            const bsc = best ? learnedScore(best.ns, cp) : Infinity;
            return sc < bsc ? {pl, ns} : (best || {pl, ns});
          }, null).pl;
        }
        s = engine.applyPlay(s, cp, choice);
      }
      s.isFirstLead = false; steps++;
    }
    const f = extractFeatures(s, 0);
    for (let i=0; i<learnedWeights.length; i++) learnedWeights[i] += 0.01 * ((i===0 ? -0.1 : 0.03) * f[i]);
  }
  learnedWeights = learnedWeights.map(w => Math.max(0.1, Math.min(3, w)));
  return learnedWeights.slice();
}
try { selfPlayLearn(2); } catch(e){}