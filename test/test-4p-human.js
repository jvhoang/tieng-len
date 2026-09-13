/**
 * test/test-4p-human.js
 * Failing 4-player human behavior:
 *   - Hotseat: first lead may not be seat 0; south (#hand-0) must show the
 *     acting human; after a play the next human can take the device and act.
 *   - Pass-around + free lead with 4 human seats (engine + controller).
 *   - Mixed 4p (humans + AI) does not freeze on a non-zero human seat.
 *   - P2P local-bus sync for 4 peers (host authority).
 * Does not touch AI ranking or play-log ingest.
 */
const fs = require('fs');
const path = require('path');
const { createDOMShim } = require('./dom-shim');
const { document } = createDOMShim();
const engine = require('../engine.js');
const ctrlFac = require('../controller.js');
const createUI = require('../ui.js');
const mpMod = require('../multiplayer.js');

const SCRATCH = process.env.TIENLEN_SCRATCH ||
  path.join(__dirname, '..', 'scratch');
if (!fs.existsSync(SCRATCH)) fs.mkdirSync(SCRATCH, { recursive: true });

const out = [];
const log = (m) => { out.push(m); console.log(m); };
let passed = 0, failed = 0;
function t(name, c, d) {
  if (c) { passed++; log('PASS: ' + name); }
  else { failed++; log('FAIL: ' + name + (d ? ' ' + d : '')); }
}

function cardSig(cards) {
  return (cards || []).map(c => c.rank * 4 + c.suit).sort((a, b) => a - b).join(',');
}

function faceUpCardsIn(el) {
  if (!el || !el.querySelectorAll) return [];
  const nodes = el.querySelectorAll('.card') || [];
  const outCards = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.classList && n.classList.contains('card-back')) continue;
    try {
      const c = JSON.parse(n.dataset.card || 'null');
      if (c && typeof c.rank === 'number') outCards.push(c);
    } catch (_) {}
  }
  return outCards;
}

function clickFaceUpMatching(handEl, cards) {
  const nodes = handEl && handEl.querySelectorAll ? handEl.querySelectorAll('.card') : [];
  let n = 0;
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    if (typeof el.onclick !== 'function') continue;
    try {
      const c = JSON.parse(el.dataset.card || '{}');
      if (cards.some(pc => pc.rank === c.rank && pc.suit === c.suit)) {
        el.onclick.call(el, { target: el });
        n++;
      }
    } catch (_) {}
  }
  return n;
}

function playLegalOrPass(ctrl, seat) {
  const st = ctrl.getState();
  if (st.roundOver) return { ok: false, error: 'round over' };
  if (st.currentPlayer !== seat) return { ok: false, error: 'not your turn' };
  const leg = ctrl.getLegalFor(seat) || [];
  if (leg.length) return ctrl.playHuman(seat, leg[0]);
  if (st.currentCombo) return ctrl.passHuman(seat);
  return { ok: false, error: 'no legal lead' };
}

log('=== 4-PLAYER HUMAN / HOTSEAT / P2P ===\n');

// ---------------------------------------------------------------------------
// Controller: 4 humans play → pass-around → free lead → finish
// ---------------------------------------------------------------------------
log('--- 4 human seats: deal, turns, pass, free lead, finish ---');
{
  const SEED = 20260913;
  const ctrl = ctrlFac.createController({
    vsAI: false,
    numPlayers: 4,
    humanSeats: [0, 1, 2, 3],
    currentHumanSeat: 0,
    seed: SEED,
    mode: 'hotseat',
    logging: false
  });
  let st = ctrl.getState();
  t('4p deal: 4 players × 13', st.numPlayers === 4 && st.players.length === 4 &&
    st.players.every(p => p.hand && p.hand.length === 13));
  t('4p first lead exists', typeof st.currentPlayer === 'number' && st.currentCombo == null);
  t('all four seats are human',
    [0, 1, 2, 3].every(s => ctrl.isHumanSeat(s)));
  t('no AI will auto-act (vsAI false)', (ctrl.runAITurnIfNeeded() || []).length === 0);

  // Drive a full pass-around so the leader gets a free lead again
  const opener = st.currentPlayer;
  let res = playLegalOrPass(ctrl, opener);
  t('opener can lead', !!(res && res.ok), res && res.error);
  st = ctrl.getState();
  t('after lead, combo is on the pile', !!st.currentCombo);
  t('turn advanced to next active seat', st.currentPlayer !== opener || st.roundOver);

  // Remaining 3 seats pass (or play if they must / want — prefer pass to test free-lead)
  let passGuard = 0;
  while (st.currentCombo && !st.roundOver && passGuard < 6) {
    passGuard++;
    const cp = st.currentPlayer;
    const pr = ctrl.passHuman(cp);
    t('seat ' + cp + ' can pass while pile is live', !!(pr && pr.ok), pr && pr.error);
    st = ctrl.getState();
  }
  t('after the other three pass, pile clears (free lead)',
    !st.roundOver && st.currentCombo == null,
    'combo=' + JSON.stringify(st.currentCombo && st.currentCombo.type));
  t('free-lead seat is the last player who played (opener)',
    st.currentPlayer === opener, 'cp=' + st.currentPlayer + ' opener=' + opener);
  t('passed flags reset on free lead',
    st.players.every(p => !p.passed || p.finished));

  // Finish the round with legal plays / passes (no AI)
  let steps = 0;
  while (!st.roundOver && steps < 400) {
    steps++;
    const r = playLegalOrPass(ctrl, st.currentPlayer);
    if (!r || !r.ok) {
      t('4-human drive did not stick', false, r && r.error);
      break;
    }
    st = ctrl.getState();
  }
  t('4 humans finish a full round', st.roundOver === true, 'steps=' + steps);
  t('finishOrder + loser cover all 4 seats',
    ((st.finishOrder || []).length + (typeof st.loser === 'number' ? 1 : 0)) === 4);
}

// ---------------------------------------------------------------------------
// Mixed 4p: humans on 0 and 2, AI on 1 and 3 — must not freeze
// ---------------------------------------------------------------------------
log('\n--- Mixed 4p (human seats 0 + 2) ---');
{
  const ctrl = ctrlFac.createController({
    vsAI: true,
    numPlayers: 4,
    humanSeats: [0, 2],
    currentHumanSeat: 0,
    seed: 424242,
    mode: 'vsAI',
    logging: false
  });
  t('mixed: 0 and 2 human, 1 and 3 AI',
    ctrl.isHumanSeat(0) && !ctrl.isHumanSeat(1) &&
    ctrl.isHumanSeat(2) && !ctrl.isHumanSeat(3));

  let st = ctrl.getState();
  let steps = 0;
  let human2Acted = false;
  while (!st.roundOver && steps < 80) {
    steps++;
    const cp = st.currentPlayer;
    if (ctrl.isHumanSeat(cp)) {
      const r = playLegalOrPass(ctrl, cp);
      t('mixed: human seat ' + cp + ' can act', !!(r && r.ok), r && r.error);
      if (cp === 2 && r && r.ok) human2Acted = true;
    } else {
      const acts = ctrl.runAITurnIfNeeded() || [];
      if (!acts.length && !ctrl.getState().roundOver) {
        t('mixed: AI did not hang on seat ' + cp, false);
        break;
      }
    }
    st = ctrl.getState();
  }
  t('mixed: game progressed without hang', steps > 2 && (st.roundOver || steps >= 8));
  // Seat 2 must be able to act when it is their turn (the freeze we are fixing)
  if (!human2Acted) {
    // If the short run never reached seat 2, force a crafted turn
    st = engine.createGameState(4, 7);
    st.isFirstLead = false;
    st.firstLeadCard = null;
    st.currentCombo = engine.detectCombo([{ rank: 4, suit: 0 }]);
    st.lastPlayBy = 1;
    st.currentPlayer = 2;
    st.currentLeader = 1;
    st.roundOver = false;
    st.players[0].passed = true;
    st.players[1].passed = false;
    st.players[2].passed = false;
    st.players[2].hand = [{ rank: 5, suit: 1 }, { rank: 8, suit: 2 }];
    st.players[3].passed = true;
    ctrl.applyRemoteState(st);
    const r2 = playLegalOrPass(ctrl, 2);
    t('mixed: seat 2 playHuman succeeds on their turn', !!(r2 && r2.ok), r2 && r2.error);
  } else {
    t('mixed: seat 2 (non-south human) acted in play', true);
  }
}

// ---------------------------------------------------------------------------
// UI hotseat: south zone shows the acting human; handoff after each turn
// ---------------------------------------------------------------------------
log('\n--- Hotseat UI: table rotation + pass-the-device ---');
{
  // Seed where first player is not 0 (3♠ not in seat 0) — the family-night freeze
  let seedUsed = null;
  let first = 0;
  let ctrl = null;
  for (let seed = 1000; seed < 1400; seed++) {
    const trial = ctrlFac.createController({
      vsAI: false, numPlayers: 4, humanSeats: [0, 1, 2, 3],
      currentHumanSeat: 0, seed, mode: 'hotseat', logging: false
    });
    if (trial.getState().currentPlayer !== 0) {
      ctrl = trial;
      seedUsed = seed;
      first = trial.getState().currentPlayer;
      break;
    }
  }
  t('found 4p deal where first lead is not P0', !!ctrl && first !== 0,
    'first=' + first + ' seed=' + seedUsed);
  if (!ctrl) {
    ctrl = ctrlFac.createController({
      vsAI: false, numPlayers: 4, humanSeats: [0, 1, 2, 3],
      currentHumanSeat: 0, seed: 1001, mode: 'hotseat', logging: false
    });
    first = ctrl.getState().currentPlayer;
  }

  const ui = createUI({ document, engine, controller: ctrl });
  ui.startHotseat(4);
  if (typeof ui._setController === 'function') ui._setController(ctrl);
  ctrl.reconfigure({
    vsAI: false,
    numPlayers: 4,
    humanSeats: [0, 1, 2, 3],
    currentHumanSeat: 0,
    seed: seedUsed != null ? seedUsed : 1001,
    mode: 'hotseat',
    logging: false
  });
  first = ctrl.getState().currentPlayer;
  if (typeof ui.updateUIFromController === 'function') ui.updateUIFromController();

  t('UI exposes claimHotseatTurn', typeof ui.claimHotseatTurn === 'function');
  t('UI exposes visualSlotForSeat', typeof ui.visualSlotForSeat === 'function');
  t('UI exposes getCurrentHumanSeat', typeof ui.getCurrentHumanSeat === 'function');
  t('UI exposes isHotseatHandoffVisible', typeof ui.isHotseatHandoffVisible === 'function');

  // Before claim: if first !== 0, south must not show P0's face-up cards as if
  // it were P0's turn (game looks stuck). Overlay should offer the real leader.
  const overlayVisible = typeof ui.isHotseatHandoffVisible === 'function' &&
    ui.isHotseatHandoffVisible();
  if (first !== 0) {
    t('handoff overlay shown when first lead is not P0', overlayVisible);
    t('playSelected rejected until the leader claims the device', (() => {
      const before = JSON.stringify(ctrl.getState());
      ui.playSelected();
      return JSON.stringify(ctrl.getState()) === before;
    })());
  }

  if (typeof ui.claimHotseatTurn === 'function') {
    ui.claimHotseatTurn(first);
  } else if (ctrl.switchSeat) {
    ctrl.switchSeat(first);
    if (ui.updateUIFromController) ui.updateUIFromController();
  }

  t('after claim, current human seat is the leader',
    typeof ui.getCurrentHumanSeat === 'function'
      ? ui.getCurrentHumanSeat() === first
      : ctrl._getInternals().currentHumanSeat === first,
    'want P' + first);

  if (typeof ui.visualSlotForSeat === 'function') {
    t('leader maps to visual south (slot 0)', ui.visualSlotForSeat(first) === 0);
    t('next seat maps to visual slot 1',
      ui.visualSlotForSeat((first + 1) % 4) === 1);
  }

  if (ui.renderHand) ui.renderHand(first);
  if (ui.updateUIFromController) ui.updateUIFromController();
  const hand0 = document.getElementById('hand-0');
  const southCards = faceUpCardsIn(hand0);
  const leaderHand = ctrl.getState().players[first].hand;
  t('south #hand-0 shows the leader\'s face-up cards (not seat 0)',
    southCards.length > 0 && cardSig(southCards) === cardSig(leaderHand),
    'south=' + southCards.length + ' leaderHand=' + leaderHand.length +
    ' sigMatch=' + (cardSig(southCards) === cardSig(leaderHand)));

  // Play a legal combo from the south hand via real UI clicks
  const leg = ctrl.getLegalFor(first) || [];
  t('leader has a legal opening play', leg.length > 0);
  if (leg.length) {
    const nClicked = clickFaceUpMatching(hand0, leg[0]);
    t('clicked leader cards in #hand-0', nClicked === leg[0].length,
      'clicked=' + nClicked + ' need=' + leg[0].length);
    const beforeLen = ctrl.getState().players[first].hand.length;
    ui.playSelected();
    const afterLen = ctrl.getState().players[first].hand.length;
    t('playSelected plays as the claimed seat (not stuck on P0)',
      afterLen < beforeLen, 'before=' + beforeLen + ' after=' + afterLen);
  }

  const stAfter = ctrl.getState();
  const next = stAfter.currentPlayer;
  if (typeof ui.updateUIFromController === 'function') ui.updateUIFromController();
  const overlay2Vis = typeof ui.isHotseatHandoffVisible === 'function' &&
    ui.isHotseatHandoffVisible();
  if (next !== first && !stAfter.roundOver) {
    t('after a hotseat play, overlay offers the next seat', overlay2Vis);
    if (typeof ui.claimHotseatTurn === 'function') ui.claimHotseatTurn(next);
    if (ui.updateUIFromController) ui.updateUIFromController();
    const south2 = faceUpCardsIn(document.getElementById('hand-0'));
    t('next player\'s cards now live in #hand-0',
      south2.length > 0 && cardSig(south2) === cardSig(ctrl.getState().players[next].hand));
    // Next player can pass or play
    const rNext = playLegalOrPass(ctrl, next);
    t('next human can pass or play', !!(rNext && rNext.ok), rNext && rNext.error);
  }
}

// ---------------------------------------------------------------------------
// vs AI 4p regression: south is still seat 0 (1v1 path uses same renderer)
// ---------------------------------------------------------------------------
log('\n--- vsAI 4p south stays seat 0 (no rotation leak) ---');
{
  const ctrl = ctrlFac.createController({
    vsAI: true, numPlayers: 4, humanSeats: [0], currentHumanSeat: 0,
    seed: 99, logging: false
  });
  const ui = createUI({ document, engine, controller: ctrl });
  ui.startVsAI(4);
  if (ui._setController) ui._setController(ctrl);
  ctrl.reconfigure({
    vsAI: true, numPlayers: 4, humanSeats: [0], currentHumanSeat: 0,
    seed: 99, mode: 'vsAI', logging: false
  });
  if (ui.updateUIFromController) ui.updateUIFromController();
  if (ui.renderHand) ui.renderHand(0);
  const south = faceUpCardsIn(document.getElementById('hand-0'));
  t('vsAI 4p: #hand-0 shows seat 0',
    south.length > 0 && cardSig(south) === cardSig(ctrl.getState().players[0].hand));
  if (typeof ui.visualSlotForSeat === 'function') {
    t('vsAI: seat 0 is visual 0', ui.visualSlotForSeat(0) === 0);
    t('vsAI: seat 1 is visual 1', ui.visualSlotForSeat(1) === 1);
  }
  t('vsAI: no hotseat overlay',
    typeof ui.isHotseatHandoffVisible !== 'function' || ui.isHotseatHandoffVisible() === false);
}

// ---------------------------------------------------------------------------
// P2P: 4-player host authority + guest snapshot after each seat acts
// ---------------------------------------------------------------------------
log('\n--- 4-peer local-bus sync ---');
{
  const host = ctrlFac.createController({
    vsAI: false, numPlayers: 4, humanSeats: [0, 1, 2, 3],
    currentHumanSeat: 0, seed: 7777, mode: 'online', logging: false
  });
  const guests = [1, 2, 3].map(seat => ctrlFac.createController({
    vsAI: false, numPlayers: 4, humanSeats: [0, 1, 2, 3],
    currentHumanSeat: seat, seed: 1, mode: 'online', logging: false
  }));
  const mp = mpMod.createMultiplayer({ controller: host });
  const bus = mp.createLocalBus();

  guests.forEach(g => g.applyRemoteState(host.getState()));
  t('all 3 guests match host currentPlayer after initial sync',
    guests.every(g => g.getState().currentPlayer === host.getState().currentPlayer));
  t('all guests see 4 hands of 13',
    guests.every(g => g.getState().players.length === 4 &&
      g.getState().players.every(p => p.hand.length === 13)));

  function syncGuests() {
    const snap = bus.guestReceive();
    guests.forEach(g => { if (snap) g.applyRemoteState(snap); });
  }

  // Walk 8 actions around the table (play or pass)
  let acts = 0;
  let st = host.getState();
  while (!st.roundOver && acts < 8) {
    const cp = st.currentPlayer;
    const r = playLegalOrPass(host, cp);
    // Also exercise hostApply path for at least one action
    if (acts === 0 && r && r.ok) {
      // already applied via playLegalOrPass; mark guest view from getState
      const fake = bus.hostApply({ type: 'pass', seat: -1 }); // invalid — ignore
      void fake;
    }
    t('host accepts action from seat ' + cp, !!(r && r.ok), r && r.error);
    // Push host snapshot as if broadcast
    const view = host.getState();
    guests.forEach(g => g.applyRemoteState(view));
    st = host.getState();
    t('after seat ' + cp + ', every guest currentPlayer matches host',
      guests.every(g => g.getState().currentPlayer === st.currentPlayer));
    t('after seat ' + cp + ', guest combo matches host',
      guests.every(g => JSON.stringify(g.getState().currentCombo) ===
        JSON.stringify(st.currentCombo)));
    acts++;
  }
  t('completed 8 synced 4p actions (or round ended)', acts >= 1);

  // Room helpers still accept 4p codes
  t('makeRoomId works', mpMod.makeRoomId('4PLAY').indexOf('tienglen-') === 0);
}

// hostGame must assign 4 human seats in one configure (no leftover AI-only table)
log('\n--- hostGame configures all 4 seats as human ---');
{
  const host = ctrlFac.createController({
    vsAI: false, numPlayers: 4, humanSeats: [0], seed: 3, logging: false
  });
  const mp = mpMod.createMultiplayer({
    controller: host,
    PeerClass: function FakePeer() {
      this.on = function () {};
      this.destroy = function () {};
    }
  });
  // Call the configure path without waiting on Peer open: hostGame throws
  // if we don't handle the promise. Use internals via a local reconfigure
  // equivalent — the shipped hostGame body is what we assert by invoking
  // it and inspecting controller seats after the sync setup.
  let assigned = null;
  try {
    const p = mp.hostGame({ numPlayers: 4, displayName: 'Host', seed: 3 });
    if (p && typeof p.catch === 'function') p.catch(function () {});
  } catch (_) {}
  assigned = host._getInternals();
  t('after hostGame(4), all seats are human',
    assigned && assigned.humanSeats && assigned.humanSeats.length === 4 &&
    assigned.humanSeats.join(',') === '0,1,2,3',
    assigned && assigned.humanSeats && assigned.humanSeats.join(','));
  t('after hostGame(4), vsAI is false (no phantom AI on empty chairs)',
    assigned && assigned.vsAI === false);
  t('after hostGame(4), table is 4 players',
    host.getState().numPlayers === 4 && host.getState().players.length === 4);
}

log('\nSUMMARY passed=' + passed + ' failed=' + failed);
fs.writeFileSync(path.join(SCRATCH, '4p-human-tests.log'), out.join('\n') + '\n');
if (failed > 0) process.exit(1);
log('4P HUMAN TESTS PASSED');
process.exit(0);
