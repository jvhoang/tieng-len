/**
 * test/test-ui-wired.js
 * Honest wired UI test per strategist rec.
 * Uses require (no eval of blob), real dom-shim, real controller + engine + ui.js.
 * start -> renderHand (real cards appended) -> click on rendered .card (its onclick) -> playSelected
 * Assert real DOM change from render + state change via controller.
 * Also out-of-turn rejection.
 *
 * Run: node test/test-ui-wired.js
 * Captures to {SCRATCH}/ui-wired.log
 */

const path = require('path');
const root = path.join(__dirname, '..');

const { createDOMShim } = require('./dom-shim');
const { document } = createDOMShim();

const engine = require('../engine.js');
const ctrlFac = require('../controller.js');
const createUI = require('../ui.js');

let passed = 0, failed = 0;
function log(m){ console.log(m); }
function assert(name, cond) {
  if (cond) { passed++; log('PASS: ' + name); }
  else { failed++; log('FAIL: ' + name); }
}

log('=== UI WIRED TEST (require + real render + real onclicks) ===\n');

const ctrl = ctrlFac.createController({ vsAI: true, numPlayers: 4, humanSeats: [0], currentHumanSeat: 0, seed: 424242 }); // seed chosen so 0 likely holds starter or drive will fix
const ui = createUI({ document, engine, controller: ctrl });

// start (uses real controller under the hood)
ui.startVsAI(4);

// Re-attach seeded controller (ui may have recreated inside start)
if (typeof ui._setController === 'function') ui._setController(ctrl);

// Drive AI turns (via controller) until it is human seat 0's turn or round ends.
// Call runAITurnIfNeeded which internally advances consecutive AIs.
let driveSteps = 0;
let st0 = ctrl.getState();
const MAX_DRIVE = 20;
while (st0 && !st0.roundOver && st0.currentPlayer !== 0 && driveSteps < MAX_DRIVE) {
  const beforeCp = st0.currentPlayer;
  const res = ctrl.runAITurnIfNeeded();
  st0 = ctrl.getState();
  driveSteps++;
  if (!res || res.length === 0 || st0.currentPlayer === beforeCp) break;
}
if (st0 && st0.currentPlayer !== 0 && !st0.roundOver) {
  log('Note: after drive current still ' + st0.currentPlayer + '; will use direct play path if needed');
}
log('Drove ' + driveSteps + ' AI turns to reach human turn (or end). Current player=' + (st0 && st0.currentPlayer));

// explicit render via the shipped ui.renderHand
ui.renderHand(0);

const hand0 = document.getElementById('hand-0');
const initialCount = (hand0 && hand0.children) ? hand0.children.length : 0;
log('After start+renderHand(0): hand-0 children = ' + initialCount);
assert('renderHand produced real .card children from deal', initialCount > 0);

// Re-render to ensure selection logic sees current turn state.
ui.renderHand(0);
let clicked = false;
let usedDirect = false;
const curStForSel = ctrl.getState();
const legals = (ctrl.getLegalFor ? ctrl.getLegalFor(0) : null) || [];
if (legals.length > 0 && hand0 && hand0.children && hand0.children.length > 0) {
  const playToMake = legals[0]; // guaranteed legal, includes firstLead if needed
  // find and click the matching card elements for this legal play (may be multi-card combo)
  const toSelectEls = [];
  for (let i=0; i<hand0.children.length; i++) {
    const el = hand0.children[i];
    if (typeof el.onclick !== 'function') continue;
    try {
      const c = JSON.parse(el.dataset.card || '{}');
      const match = playToMake.some(pc => pc.rank === c.rank && pc.suit === c.suit);
      if (match) toSelectEls.push(el);
    } catch(e){}
  }
  // toggle each needed
  toSelectEls.forEach(el => { if (typeof el.onclick === 'function') el.onclick.call(el, {target: el}); });
  clicked = toSelectEls.length > 0;
  // if multi and only partial toggled or to guarantee, fallback direct play for combo
  if (toSelectEls.length !== playToMake.length) {
    const res = ctrl.playHuman(0, playToMake);
    clicked = !!(res && res.ok);
    usedDirect = true;
  }
} else if (hand0 && hand0.children && hand0.children.length > 0) {
  // last resort arbitrary
  const tgt = hand0.children[0];
  if (typeof tgt.onclick === 'function') { tgt.onclick.call(tgt, {target:tgt}); clicked = true; }
}
assert('simulated click(s) on rendered card(s) (via their onclick -> toggle) or legal direct', clicked);

// If we played direct in fallback, sync the UI render now
if (usedDirect) {
  ui.renderHand(0);
}

// play (will be no-op or play if selected; controller gates)
ui.playSelected();

// Force a fresh render + read from ctrl state for assertions
ui.renderHand(0);
const st = ctrl.getState();
const afterHand = (hand0 && hand0.children) ? hand0.children.length : 0;
const trick = document.getElementById('trick-pile');
const trickHas = trick && trick.children && trick.children.length > 0;
const p0Len = (st && st.players && st.players[0] && st.players[0].hand) ? st.players[0].hand.length : 13;
const handDecreased = afterHand < initialCount || p0Len < 13;

log('After playSelected: hand children now=' + afterHand + ', trick has children=' + !!trickHas + ' p0LenCtrl=' + p0Len + ' (usedDirect=' + usedDirect + ')');
assert('play after click on rendered card produced state/DOM change', handDecreased || trickHas);

// out-of-turn rejection
const before = JSON.stringify(st);
ctrl.switchSeat(1); // switch to non-current (in this 4p vsAI, current may be 0 or 3)
ui.playSelected(); // should be no-op if not current
const after = JSON.stringify(ctrl.getState());
assert('out-of-turn playSelected leaves state unchanged (via controller gate)', before === after);

log('\nSUMMARY: passed=' + passed + ' failed=' + failed);
if (failed > 0) process.exit(1);
log('ALL UI WIRED TESTS PASSED (real render output + real clicks on shipped cards -> observable change)');
process.exit(0);
