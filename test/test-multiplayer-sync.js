/**
 * test/test-multiplayer-sync.js
 * Logic-level host→guest sync on the real controller path (no network).
 * Uses multiplayer.createLocalBus + real playHuman/passHuman/applyRemoteState.
 */
const engine = require('../engine.js');
const ctrlFac = require('../controller.js');
const mpMod = require('../multiplayer.js');
const fs = require('fs');
const path = require('path');

const SCRATCH = process.env.TIENLEN_SCRATCH ||
  '/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-788f87ebb8d7/implementer';
if (!fs.existsSync(SCRATCH)) fs.mkdirSync(SCRATCH, { recursive: true });
const out = [];
const log = (m) => { out.push(m); console.log(m); };
let passed = 0, failed = 0;
function t(name, c, d) {
  if (c) { passed++; log('PASS: ' + name); }
  else { failed++; log('FAIL: ' + name + (d ? ' ' + d : '')); }
}

log('=== MULTIPLAYER LOGIC SYNC (shipped controller + multiplayer) ===\n');

// Room code helpers
t('parseRoomCode strips prefix', mpMod.parseRoomCode('tienglen-AB12C') === 'AB12C' || mpMod.parseRoomCode('TIENGLEN-AB12C') === 'AB12C');
t('makeRoomId prefixes', mpMod.makeRoomId('XY9K2').indexOf('tienglen-') === 0);
t('randomCode length 5', mpMod.randomCode(5).length === 5);

// Host controller (authority)
const host = ctrlFac.createController({
  vsAI: false,
  numPlayers: 2,
  humanSeats: [0, 1],
  currentHumanSeat: 0,
  seed: 4242
});

// Guest controller receives state snapshots
const guest = ctrlFac.createController({
  vsAI: false,
  numPlayers: 2,
  humanSeats: [0, 1],
  currentHumanSeat: 1,
  seed: 1
});

const mp = mpMod.createMultiplayer({ controller: host });
const bus = mp.createLocalBus();

// Sync guest to host initial state
guest.applyRemoteState(host.getState());
let hs = host.getState();
let gs = guest.getState();
t('guest sees same currentPlayer after sync', gs.currentPlayer === hs.currentPlayer);
t('guest sees same combo after sync', JSON.stringify(gs.currentCombo) === JSON.stringify(hs.currentCombo));

// Host plays a legal move for current player
const cp = hs.currentPlayer;
const leg = host.getLegalFor(cp);
t('host has legals for current', leg.length > 0);
const res = bus.hostApply({ type: 'play', seat: cp, cards: leg[0] });
t('hostApply play ok', res && res.ok);

// Guest receives full state
const guestView = bus.guestReceive();
t('guestReceive has state', !!guestView);
guest.applyRemoteState(guestView);
gs = guest.getState();
hs = host.getState();
t('after play, guest currentPlayer matches host', gs.currentPlayer === hs.currentPlayer);
t('after play, guest combo matches host', JSON.stringify(gs.currentCombo) === JSON.stringify(hs.currentCombo));
t('after play, host hand reduced', hs.players[cp].hand.length < 13 || hs.players[cp].finished);

// Pass path
const cp2 = hs.currentPlayer;
if (hs.currentCombo) {
  const pr = bus.hostApply({ type: 'pass', seat: cp2 });
  t('hostApply pass ok', pr && pr.ok);
  guest.applyRemoteState(bus.guestReceive());
  gs = guest.getState();
  hs = host.getState();
  t('after pass, guest currentPlayer matches host', gs.currentPlayer === hs.currentPlayer);
} else {
  t('skip pass (free lead)', true);
}

// UI structural: friends lobby helpers exist on multiplayer module
t('multiplayer exports createMultiplayer', typeof mpMod.createMultiplayer === 'function');
t('ROOM_PREFIX defined', typeof mpMod.ROOM_PREFIX === 'string');

log('\nSUMMARY passed=' + passed + ' failed=' + failed);
fs.writeFileSync(path.join(SCRATCH, 'multiplayer-sync-tests.log'), out.join('\n') + '\n');
if (failed > 0) process.exit(1);
log('MULTIPLAYER SYNC TESTS PASSED');
process.exit(0);
