/**
 * For a losing seed, try every legal free-lead at first v80 free-lead decision
 * and see if any line wins vs frozen v7.5 with current policy thereafter.
 */
'use strict';
const engine = require('../engine.js');
const search = require('../search.js');
const v80 = require('../ai.js');
const v75 = require('../policies/v75-ai.js');

var memo = {};
function hk(s){var h=2166136261>>>0;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h||1;}
function sk(st,seat){var k=seat+'|'+st.currentPlayer+'|'+(st.isFirstLead?'F':'f')+'|'+(st.lastPlayBy==null?'n':st.lastPlayBy)+'|';
if(st.currentCombo&&st.currentCombo.cards){var ids=st.currentCombo.cards.map(c=>c.rank*4+c.suit).sort((a,b)=>a-b);k+=st.currentCombo.type+':'+ids.join(',')+'|';}
else k+='L|';
for(var p=0;p<st.players.length;p++){var h=st.players[p].hand;k+=h.length+':';for(var i=0;i<h.length;i++)k+=(h[i].rank*4+h[i].suit)+',';k+=st.players[p].passed?'P':'N';}
return k;}
function v75m(st,seat){var key=sk(st,seat);if(memo[key]!==undefined)return memo[key];var seed=hk(key);var sav=Math.random;Math.random=function(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};var mv;try{mv=v75.getAIMove(st,seat,{difficulty:'easy',iterations:0,mode:'expert'});}finally{Math.random=sav;}memo[key]=mv;return mv;}
if(search.setExploitOpponent)search.setExploitOpponent((s,seat)=>v75m(s,seat));
function apply(st,cp,ch){const L=engine.getLegalPlays(st.players[cp].hand,st.currentCombo,st.players[cp].passed,st.isFirstLead,st.firstLeadCard);if(!L.length)return engine.passFast(st,cp);if(ch==null){if(!st.currentCombo)return engine.applyPlayFast(st,cp,L[0]);return engine.passFast(st,cp);}const sig=ch.map(c=>c.rank*4+c.suit).sort((a,b)=>a-b).join(',');const ok=L.find(l=>l.map(c=>c.rank*4+c.suit).sort((a,b)=>a-b).join(',')===sig);if(!ok)return engine.passFast(st,cp);return engine.applyPlayFast(st,cp,ok);}
function v80opts(){return{difficulty:'hard',timeMs:120,iterations:140,maxSims:280,brTrials:64,bestResponse:true,useSearch:true,perfectInfo:true,hiddenInfo:false,maxBranch:18,dualSelf:true,exactExploit:true,mode:'auto'};}
function finish(st,seat){let w=null;if(st.finishOrder&&st.finishOrder.length)w=st.finishOrder[0];else if(st.loser===0)w=1;else if(st.loser===1)w=0;return w===seat;}
function playFrom(st,seat,forcedFirst){memo={};let state=engine.cloneState?engine.cloneState(st):JSON.parse(JSON.stringify(st));let steps=0;let forced=forcedFirst;
while(!state.roundOver&&steps<320){const cp=state.currentPlayer;let ch;if(cp===seat){if(forced){ch=forced;forced=null;}else ch=v80.getAIMove(state,cp,v80opts());}else ch=v75m(state,cp);state=apply(state,cp,ch);state.isFirstLead=false;steps++;}
return finish(state,seat);}
function analyzeSeed(seed){
  memo={};const seat=seed%2;let st=engine.createGameState(2,seed);st.isFirstLead=true;
  // advance until first free-lead by v80
  let steps=0;let firstFL=null;let stateAt=null;
  while(!st.roundOver&&steps<40){
    const cp=st.currentPlayer;
    if(cp===seat&&!st.currentCombo){firstFL=true;stateAt=engine.cloneState?engine.cloneState(st):JSON.parse(JSON.stringify(st));break;}
    let ch;if(cp===seat)ch=v80.getAIMove(st,cp,v80opts());else ch=v75m(st,cp);
    st=apply(st,cp,ch);st.isFirstLead=false;steps++;
  }
  if(!stateAt){console.log(JSON.stringify({seed,err:'no free lead'}));return;}
  const L=engine.getLegalPlays(stateAt.players[seat].hand,null,false,stateAt.isFirstLead,stateAt.firstLeadCard);
  // baseline
  const base=v80.getAIMove(stateAt,seat,v80opts());
  const baseWin=playFrom(stateAt,seat,base);
  const flips=[];
  // try multis + cheap singles
  const cands=[];
  for(const p of L){if(p.length>=2||(p.length===1&&p[0].rank<=11))cands.push(p);}
  // cap
  cands.sort((a,b)=>b.length-a.length||a[0].rank-b[0].rank);
  const tryN=Math.min(cands.length,28);
  for(let i=0;i<tryN;i++){
    const p=cands[i];
    const w=playFrom(stateAt,seat,p);
    if(w)flips.push({sig:p.map(c=>c.rank+['♠','♣','♦','♥'][c.suit]).join(''),len:p.length,ranks:p.map(c=>c.rank)});
  }
  console.log(JSON.stringify({seed,seat,baseWin,baseLen:base&&base.length,flips:flips.length,flipSamples:flips.slice(0,8),cands:tryN}));
}
const seeds=(process.env.SEEDS||'20799253,20819199,20829172,20839145,20859091').split(',').map(Number);
for(const s of seeds)analyzeSeed(s);
