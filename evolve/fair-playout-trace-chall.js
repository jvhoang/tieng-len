'use strict';
// Same as fair-playout-trace but FOLLOW chall moves for live seat (real dual path)
const engine = require('../engine.js');
const freezeTag = process.env.FREEZE || 'v91';
const challTag = process.env.CHALL || freezeTag;
const live = require('../policies/' + challTag + '-ai.js');
const freeze = require('../policies/' + freezeTag + '-ai.js');
const liveSearch = require('../policies/' + challTag + '-search.js');
const freezeSearch = require('../policies/' + freezeTag + '-search.js');
const seed = parseInt(process.env.SEED || '20270684', 10);
const liveSeat = parseInt(process.env.SEAT || '0', 10);
const ms = parseInt(process.env.MS || '150', 10);
const trials = parseInt(process.env.TRIALS || '12', 10);
const soft = parseInt(process.env.SOFT || '0', 10);
function injectOpp(sm, fm) {
  if (!sm.setExploitOpponent) return;
  sm.setExploitOpponent(function (s, seat) {
    if (fm && typeof fm.expertPolicy === 'function') {
      var dec = fm.expertPolicy(s, seat);
      return dec && dec.pass ? null : (dec && dec.play != null ? dec.play : null);
    }
    return null;
  });
}
injectOpp(liveSearch, freezeSearch); injectOpp(freezeSearch, freezeSearch);
function seatOpts() {
  return { difficulty:'grandmaster', useSearch:true, perfectInfo:false, hiddenInfo:true, timeMs:ms, iterations:60, maxSims:120, brTrials:trials, bestResponse:true, exactExploit:false, exploit:true, softSamples:soft, maxBranch:12, mode:'auto', strongSelf:false };
}
function playSig(play) {
  if (play == null || play.pass) return 'PASS';
  const cards = play.play || play;
  if (!Array.isArray(cards)) return 'PASS';
  return cards.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a,b){return a-b;}).join(',');
}
function cardLabel(c) { return ('3456789TJQKA2'[c.rank]||'?')+('SHDC'[c.suit]||'?'); }
function playLabel(play) {
  if (play == null || play.pass) return 'PASS';
  const cards = play.play || play;
  if (!Array.isArray(cards)) return 'PASS';
  return cards.map(cardLabel).join(' ');
}
function apply(state, cp, choice) {
  const legals = engine.getLegalPlays(state.players[cp].hand, state.currentCombo, state.players[cp].passed, state.isFirstLead, state.firstLeadCard);
  if (!legals.length) return engine.passFast(state, cp);
  if (choice == null || choice.pass) {
    if (!state.currentCombo) return engine.applyPlayFast(state, cp, legals[0]);
    return engine.passFast(state, cp);
  }
  const play = choice.play || choice;
  if (!Array.isArray(play)) return engine.passFast(state, cp);
  const sig = playSig(play);
  const ok = legals.find(function (l) { return playSig(l) === sig; });
  return engine.applyPlayFast(state, cp, ok || legals[0]);
}
function hashKey(str) { var h=2166136261>>>0; for (var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0;} return h||1; }
function withDetRng(key, fn) {
  var s=hashKey(key), saved=Math.random;
  Math.random=function(){s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296;};
  try { return fn(); } finally { Math.random=saved; }
}
const opts=seatOpts();
let state=engine.createGameState(2, seed); state.isFirstLead=true;
const rows=[]; let steps=0;
while (!state.roundOver && steps<240) {
  const cp=state.currentPlayer;
  const key=String(seed)+'|'+steps+'|'+cp;
  let mv, row={step:steps, seat:cp, live:cp===liveSeat};
  if (cp===liveSeat) {
    const fz=withDetRng(key, function(){ return freeze.getAIMove(state,cp,opts); });
    const ch=withDetRng(key, function(){ return live.getAIMove(state,cp,opts); });
    row.phase=state.currentCombo?(state.currentCombo.type||'combat'):'FREE';
    row.handLen=state.players[cp].hand.length;
    row.omin=state.players[1-cp].hand.length;
    row.freeze=playLabel(fz); row.chall=playLabel(ch);
    row.diff=playSig(fz)!==playSig(ch);
    row.hand=state.players[cp].hand.map(cardLabel).join(' ');
    mv=ch; // FOLLOW CHALL
  } else {
    mv=withDetRng(key, function(){ return freeze.getAIMove(state,cp,opts); });
    row.freeze=playLabel(mv); row.chall='(opp)';
  }
  rows.push(row);
  state=apply(state,cp,mv); state.isFirstLead=false; steps++;
}
let winner=null;
if (state.finishOrder&&state.finishOrder.length) winner=state.finishOrder[0];
else if (state.loser===0) winner=1; else if (state.loser===1) winner=0;
console.log(JSON.stringify({seed,liveSeat,chall:challTag,winner,liveWin:winner===liveSeat,steps,diffs:rows.filter(r=>r.diff),rows},null,2));
