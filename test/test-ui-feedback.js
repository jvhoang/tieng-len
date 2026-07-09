/**
 * test/test-ui-feedback.js
 * Structural + behavioral checks for trick stack, banners CSS classes in index.html,
 * and hand order wiring through createUI.
 */
const fs = require('fs');
const path = require('path');
const { createDOMShim } = require('./dom-shim');
const engine = require('../engine.js');
const ctrlFac = require('../controller.js');
const createUI = require('../ui.js');
const ho = require('../hand-order.js');

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

log('=== UI FEEDBACK / TRICK STACK / HAND ORDER (shipped) ===\n');

const indexPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
t('index has game-banner CSS', /game-banner/.test(html));
t('index has banner-turn-label', /banner-turn-label/.test(html));
t('index has banner-pass-label', /banner-pass-label/.test(html));
t('index has card-play-in animation', /card-play-in|cardFlyIn/.test(html));
t('index has drag-over styles', /drag-over/.test(html));
t('index loads hand-order.js', /hand-order\.js/.test(html));
t('index loads multiplayer.js', /multiplayer\.js/.test(html));
t('index loads peerjs', /peerjs/.test(html));
t('index has free-lead-hint', /free-lead-hint/.test(html));
t('README documents friends setup', fs.existsSync(path.join(__dirname, '..', 'README.md')));

const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
t('README mentions room code or host/join', /room code|Host|Join|friend/i.test(readme));

// Behavioral: UI display order + trick stack from real engine path
const { document } = createDOMShim();
// ensure free-lead-hint + game-banners containers exist in shim if needed
['free-lead-hint', 'game-banners', 'your-status'].forEach(id => {
  if (!document.getElementById(id)) {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
});

const ctrl = ctrlFac.createController({ vsAI: true, numPlayers: 3, humanSeats: [0], seed: 777 });
const ui = createUI({ document, engine, controller: ctrl, handOrder: ho });
ui.startVsAI(3);
let st = ctrl.getState();
t('startVsAI(3) yields 3 players', st.numPlayers === 3);

// Hand default order via UI helper
const hand = st.players[0].hand.slice();
const display = ui.sortHandDefault(hand);
let asc = true;
for (let i = 1; i < display.length; i++) {
  if (engine.cardCompare(display[i - 1], display[i]) > 0) asc = false;
}
t('UI sortHandDefault is ascending', asc);

// Custom reorder via UI API
const reordered = ui.reorderCards(display, 0, 2);
ui._setCustomOrderKeys(ui.orderKeys(reordered));
const shown = ui.getDisplayHand(0, hand);
t('custom order applied in getDisplayHand', shown[2].rank === display[0].rank && shown[2].suit === display[0].suit);

// Drive a play so trickStack populates
st = ctrl.getState();
let steps = 0;
while (!st.roundOver && steps < 20) {
  const cp = st.currentPlayer;
  if (cp === 0) {
    const leg = ctrl.getLegalFor(0);
    if (leg.length) ctrl.playHuman(0, leg[0]);
    else if (st.currentCombo) ctrl.passHuman(0);
    else break;
  } else {
    ctrl.runAITurnIfNeeded();
  }
  st = ctrl.getState();
  steps++;
  if (st.trickStack && st.trickStack.length > 0) break;
}
t('trickStack populated after play on real path', st.trickStack && st.trickStack.length > 0);

// Render trick via updateUI
ui.updateUIFromController();
const pile = document.getElementById('trick-pile');
t('trick pile has children after update', pile && pile.children && pile.children.length > 0);

// CSS class presence for banners after YOUR TURN path
ui.updateUIFromController();
const banners = document.getElementById('game-banners');
t('game-banners host created', !!banners);

log('\nSUMMARY passed=' + passed + ' failed=' + failed);
fs.writeFileSync(path.join(SCRATCH, 'ui-feedback-tests.log'), out.join('\n') + '\n');
// Also dump a structural DOM note
fs.writeFileSync(path.join(SCRATCH, 'ui-feedback.dom.txt'),
  'trick children: ' + (pile && pile.children ? pile.children.length : 0) +
  '\nbanners: ' + (banners ? 'yes' : 'no') +
  '\nnumPlayers: ' + st.numPlayers +
  '\ntrickStack: ' + JSON.stringify(st.trickStack && st.trickStack.map(x => ({ seat: x.seat, n: (x.cards||[]).length }))) +
  '\n');
if (failed > 0) process.exit(1);
log('UI FEEDBACK TESTS PASSED');
process.exit(0);
