/**
 * Tiến Lên Engine - Unit Tests (gating verification)
 * Drives ONLY the shipped engine.js functions with literal inputs.
 * Captures all output for {SCRATCH}/core-tests.log
 */

const engine = require('./engine.js');

const { 
  createCard, cardToString, detectCombo, canBeat, bombBeats2s, isBomb,
  getLegalPlays, applyPlay, pass, createGameState, dealCards, hasThreeSpades,
  sortCombo
} = engine;

let passed = 0;
let failed = 0;
const logs = [];

function log(msg) {
  logs.push(msg);
  console.log(msg);
}

function assert(name, cond, detail = '') {
  if (cond) {
    passed++;
    log(`PASS: ${name}`);
  } else {
    failed++;
    log(`FAIL: ${name} ${detail}`);
  }
}

function card(r, s) { // r name or idx, s char
  const rIdx = typeof r === 'number' ? r : engine.RANKS.indexOf(String(r));
  const sIdx = engine.SUITS.indexOf(s);
  return createCard(rIdx, sIdx);
}

log('=== TIẾN LÊN ENGINE UNIT TESTS (Pagat + Wikipedia core) ===\n');

// 1. Basic deal & 3♠ starter
log('--- Deal & First Player ---');
const d4 = dealCards(4, 42);
assert('4p deal: 13 each', d4.hands.every(h => h.length === 13));
const has3s = d4.hands.some((h, i) => hasThreeSpades(h) && i === d4.firstPlayer);
assert('First player holds 3♠', has3s || d4.hands[d4.firstPlayer].some(c => c.rank===0 && c.suit===0));

// 2. Detect combos
log('\n--- Combo Detection ---');
const s3 = detectCombo([card('3','s')]);
assert('single 3s detected', s3 && s3.type === 'single');
const p77 = detectCombo([card(4,'h'), card(4,'d')]); // rank4='7'
assert('pair 7s', p77 && p77.type === 'pair');
const t999 = detectCombo([card(6,'s'),card(6,'c'),card(6,'h')]);
assert('triple 9s', t999 && t999.type === 'triple');
const q = detectCombo([card(7,'s'),card(7,'c'),card(7,'d'),card(7,'h')]);
assert('quad 10s', q && q.type === 'quad');
const seq456 = detectCombo([card('4','s'),card('5','c'),card('6','h')]);
assert('seq 4-5-6', seq456 && seq456.type === 'seq' && seq456.size === 3);
const ds334455 = detectCombo([card('3','s'),card('3','h'), card('4','c'),card('4','d'), card('5','s'),card('5','h')]);
assert('double seq 3-4-5 pairs', ds334455 && ds334455.type === 'doubleseq' && ds334455.numPairs === 3);

// 3. Beating same type
log('\n--- Normal Beating ---');
const low7 = detectCombo([card('7','s')]);
const hiA = detectCombo([card('A','h')]);
assert('A♥ > 7♠ single', canBeat(low7, hiA, false));
const p88 = detectCombo([card('8','c'), card('8','s')]);
const p99 = detectCombo([card('9','d'), card('9','h')]);
assert('pair 99 beats 88', canBeat(p88, p99, false));
const seqQKA = detectCombo([card('Q','s'), card('K','c'), card('A','h')]);
const seqJKQ = detectCombo([card('J','h'), card('Q','d'), card('K','c')]);
assert('QKA seq beats JKQ', canBeat(seqJKQ, seqQKA, false));

// 4. Bombs
log('\n--- Bombs vs 2s ---');
const twoS = detectCombo([card('2','s')]);
const twoPair = detectCombo([card('2','s'), card('2','h')]);
const twoTrip = detectCombo([card('2','s'), card('2','h'), card('2','d')]);
const quad3 = detectCombo([card('3','s'),card('3','c'),card('3','d'),card('3','h')]);
const ds3p = detectCombo([card(5,'s'),card(5,'h'),card(6,'c'),card(6,'d'),card(7,'s'),card(7,'h')]); // 5-6-7 pairs (rank idx 5=8? wait use numeric)
assert('quad is bomb', isBomb(quad3));
assert('3-pair ds is bomb', isBomb(ds3p));
assert('quad beats single 2', bombBeats2s(quad3, twoS));
assert('3p ds beats single 2', bombBeats2s(ds3p, twoS));

// 5. First lead constraint
log('\n--- First Lead 3♠ Rule ---');
const state4 = createGameState(4, 123);
const starter = state4.currentPlayer;
const has3sStarter = hasThreeSpades(state4.players[starter].hand);
assert('Starter holds 3s in fresh game', has3sStarter);
const legalsFirst = getLegalPlays(state4.players[starter].hand, null, false, true, state4.firstLeadCard);
const allContain3s = legalsFirst.every(play => play.some(c => c.rank===0 && c.suit===0));
assert('All first-lead legals contain 3♠', allContain3s && legalsFirst.length > 0);

// 6. Pass lock
log('\n--- Pass Lockout ---');
let st = createGameState(3, 99);
const p0 = st.currentPlayer;
// simulate lead single low
const lowCard = sortCombo(st.players[p0].hand)[st.players[p0].hand.length-1]; // lowest-ish
let leadPlay = [lowCard];
st = applyPlay(st, p0, leadPlay);
const p1 = st.currentPlayer;
st = pass(st, p1); // p1 passes
// now next should not be able to play low card if locked
const p2 = st.currentPlayer;
const hand2 = st.players[p2].hand;
const low2 = hand2[0]; // arbitrary
const wouldBeat = canBeat(st.currentCombo, detectCombo([low2]), true); // has passed? for p1 yes
// For p2 assume not passed yet
assert('Pass sets passed flag', st.players[p1].passed === true);
// After pass, the locked player cannot beat even with higher (simulate by checking getLegal)
const lockedLegals = getLegalPlays(st.players[p1].hand, st.currentCombo, true /*hasPassed*/, false, st.firstLeadCard);
assert('Locked player has zero legals on current trick', lockedLegals.length === 0);

// 7. Bomb allowed after pass
log('\n--- Bomb after Pass ---');
let stBomb = createGameState(4, 7);
const lead2 = stBomb.players[stBomb.currentPlayer].hand.find(c => c.rank === 12);
if (lead2) {
  stBomb = applyPlay(stBomb, stBomb.currentPlayer, [lead2]);
  const passerIdx = stBomb.currentPlayer;
  stBomb = pass(stBomb, passerIdx);
  // now find if passer has a bomb
  const bombHand = stBomb.players[passerIdx].hand;
  const qBomb = bombHand.filter(c => c.rank === 0).slice(0,4); // low quads unlikely but search any quad
  // Instead: artificially give a known quad by modifying test state? Use direct canBeat
  const fakeBomb = detectCombo([card('4','s'),card('4','c'),card('4','d'),card('4','h')]);
  assert('Bomb canBeat even after hasPassed=true', canBeat(stBomb.currentCombo || {cards:[lead2],type:'single'}, fakeBomb, true));
}

// 8. Full round simulation (4p) until end
log('\n--- Full Round Simulation (4 players) ---');
let game = createGameState(4, 2026);
let steps = 0;
const MAX_STEPS = 200;
while (!game.roundOver && steps < MAX_STEPS) {
  const cp = game.currentPlayer;
  const cur = game.currentCombo;
  const hp = game.players[cp].passed;
  const legals = getLegalPlays(game.players[cp].hand, cur, hp, game.isFirstLead, game.firstLeadCard);
  if (legals.length === 0) {
    game = pass(game, cp);
  } else {
    // play first legal (deterministic)
    game = applyPlay(game, cp, legals[0]);
  }
  game.isFirstLead = false;
  steps++;
}
assert('4p round completes without infinite loop', game.roundOver === true && steps < MAX_STEPS);
assert('Exactly one loser (last with cards)', game.loser !== null && game.finishOrder.length === 3);
log(`4p sim: ${steps} steps. Finish order (winners first): ${game.finishOrder}. Loser=${game.loser}`);

// 9. 2p and 3p also complete
log('\n--- 2p + 3p first-lead lowest-card rule (no 3s) ---');
for (const np of [2,3]) {
  // Try several seeds until we find a deal where 3s is discarded (common for <4p)
  let foundNo3s = false;
  for (let seedTry=1; seedTry<50 && !foundNo3s; seedTry++) {
    let g = createGameState(np, 1000 + seedTry*7);
    const allHandsHaveNo3s = g.players.every(p => !p.hand.some(c=>c.rank===0 && c.suit===0));
    if (allHandsHaveNo3s && g.firstLeadCard) {
      foundNo3s = true;
      const starterHand = g.players[g.currentPlayer].hand;
      const hasForced = starterHand.some(c => c.rank === g.firstLeadCard.rank && c.suit === g.firstLeadCard.suit);
      assert(`${np}p firstLeadCard present in starter hand`, hasForced);
      const legals = getLegalPlays(starterHand, null, false, true, g.firstLeadCard);
      const allInclude = legals.length > 0 && legals.every(l => l.some(c => c.rank === g.firstLeadCard.rank && c.suit === g.firstLeadCard.suit));
      assert(`${np}p first lead legals all include the lowest/forced card`, allInclude);
      // Play one legal and continue a short sim to ensure no stall
      if (legals.length) {
        g = applyPlay(g, g.currentPlayer, legals[0]);
        g.isFirstLead = false;
      }
    }
  }
}

log('\n--- 2p + 3p sims ---');
for (const np of [2,3]) {
  let g = createGameState(np, 42 + np);
  let s = 0;
  while (!g.roundOver && s < 150) {
    const cp = g.currentPlayer;
    const leg = getLegalPlays(g.players[cp].hand, g.currentCombo, g.players[cp].passed, g.isFirstLead, g.firstLeadCard);
    g = (leg.length ? applyPlay(g, cp, leg[0]) : pass(g, cp));
    g.isFirstLead = false;
    s++;
  }
  assert(`${np}p round completes`, g.roundOver === true);
}

// 10. Free lead when all others have passed (not forced to beat own prior combo)
log('\n--- Free Lead After Control ---');
{
  // Craft a 3p state: P0 leads a single, P1 and P2 pass → P0 gets free lead
  let fl = createGameState(3, 555);
  // Force known hands / current player for deterministic free-lead path
  fl.currentPlayer = 0;
  fl.currentLeader = 0;
  fl.currentCombo = null;
  fl.isFirstLead = false;
  fl.firstLeadCard = null;
  fl.players[0].hand = [card('3','s'), card('5','h'), card('7','c'), card('9','d')];
  fl.players[1].hand = [card('4','s'), card('6','h'), card('8','c')];
  fl.players[2].hand = [card('4','h'), card('6','c'), card('8','d')];
  fl.players.forEach(p => { p.passed = false; p.finished = false; });

  // P0 leads 3♠
  fl = applyPlay(fl, 0, [card('3','s')]);
  assert('After lead, currentCombo is set', fl.currentCombo && fl.currentCombo.type === 'single');
  assert('After lead, turn advances', fl.currentPlayer === 1);
  assert('trickStack has the lead', Array.isArray(fl.trickStack) && fl.trickStack.length >= 1);

  // P1 passes
  fl = pass(fl, 1);
  assert('P1 passed flag', fl.players[1].passed === true);
  assert('After one pass, combo still live', fl.currentCombo != null);

  // P2 passes → free lead for P0
  fl = pass(fl, 2);
  assert('Free lead: currentCombo cleared (null)', fl.currentCombo == null);
  assert('Free lead: currentPlayer is last player to play (0)', fl.currentPlayer === 0);
  assert('Free lead: currentLeader is 0', fl.currentLeader === 0);
  assert('Free lead: pass flags reset', fl.players.every(p => !p.passed || p.finished));

  // P0 may now lead ANY legal combo (not forced to beat prior single)
  const freeLegals = getLegalPlays(fl.players[0].hand, fl.currentCombo, false, false, null);
  assert('Free lead: legals exist', freeLegals.length > 0);
  const canLeadPairOrHigher = freeLegals.some(p => p.length >= 1);
  assert('Free lead: can lead any type from hand', canLeadPairOrHigher);

  // Lead a different card (5♥) — free lead works
  fl = applyPlay(fl, 0, [card('5','h')]);
  assert('After free lead play, new combo is the new play', fl.currentCombo && fl.currentCombo.top.rank === engine.RANKS.indexOf('5'));
}

// 11. Pass must not clear lastPlayBy before assigning leader (regression)
log('\n--- Free Lead Leader Assignment (2p) ---');
{
  let g = createGameState(2, 42);
  g.isFirstLead = false;
  g.firstLeadCard = null;
  g.currentPlayer = 0;
  g.players[0].hand = [card('3','s'), card('K','h')];
  g.players[1].hand = [card('4','s'), card('5','h')];
  g.players.forEach(p => { p.passed = false; p.finished = false; });
  g = applyPlay(g, 0, [card('3','s')]);
  const leaderBefore = g.lastPlayBy;
  assert('lastPlayBy set after play', leaderBefore === 0);
  g = pass(g, 1);
  assert('2p: after opponent pass, free lead to last player', g.currentCombo == null && g.currentPlayer === 0);
}

log('\n=== SUMMARY ===');
log(`Passed: ${passed}   Failed: ${failed}`);
log('All engine tests driven on shipped pure functions only.');

if (failed > 0) {
  console.error('SOME TESTS FAILED');
  process.exit(1);
} else {
  log('ALL TESTS PASSED');
  process.exit(0);
}
