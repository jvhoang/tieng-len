/**
 * test/test-ui-stage.js
 * Center staging UX: tap-to-stage, tap-to-unstage, Play disabled until a
 * legal staged combo exists, illegal staged set does not commit.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { createDOMShim } = require('./dom-shim');
const { document } = createDOMShim();

const engine = require('../engine.js');
const ctrlFac = require('../controller.js');
const createUI = require('../ui.js');

const SCRATCH = process.env.TIENLEN_SCRATCH ||
  '/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-788f87ebb8d7/implementer';
if (!fs.existsSync(SCRATCH)) fs.mkdirSync(SCRATCH, { recursive: true });
const out = [];
function log(m) { out.push(m); console.log(m); }

let passed = 0, failed = 0;
function t(name, cond, detail) {
  if (cond) { passed++; log('PASS: ' + name); }
  else { failed++; log('FAIL: ' + name + (detail ? ' — ' + detail : '')); }
}

log('=== UI CENTER STAGING (tap / unstage / Play gate) ===\n');

const FIXED_SEED = 424242;
const ctrl = ctrlFac.createController({
  vsAI: true,
  numPlayers: 4,
  humanSeats: [0],
  currentHumanSeat: 0,
  seed: FIXED_SEED
});
const ui = createUI({ document, engine, controller: ctrl });
ui.startVsAI(4);
if (typeof ui._setController === 'function') ui._setController(ctrl);
ctrl.reconfigure({
  vsAI: true,
  numPlayers: 4,
  humanSeats: [0],
  currentHumanSeat: 0,
  seed: FIXED_SEED
});

function driveToHumanWithLegals(maxSteps) {
  let steps = 0;
  let st = ctrl.getState();
  while (st && !st.roundOver && steps < maxSteps) {
    const cp = st.currentPlayer;
    if (cp === 0) {
      const leg = ctrl.getLegalFor(0) || [];
      if (leg.length > 0) return { ok: true, steps, legals: leg };
      if (st.currentCombo) {
        const pr = ctrl.passHuman(0);
        if (!pr || !pr.ok) return { ok: false, steps, reason: 'pass failed' };
        ctrl.runAITurnIfNeeded();
      } else {
        return { ok: false, steps, reason: 'free lead but 0 legals' };
      }
    } else {
      ctrl.runAITurnIfNeeded();
    }
    st = ctrl.getState();
    steps++;
  }
  st = ctrl.getState();
  const leg = (st && st.currentPlayer === 0) ? (ctrl.getLegalFor(0) || []) : [];
  return { ok: leg.length > 0, steps, legals: leg, roundOver: st && st.roundOver };
}

function handCards() {
  const hand0 = document.getElementById('hand-0');
  return (hand0 && hand0.querySelectorAll) ? Array.from(hand0.querySelectorAll('.card')) : [];
}

function stageCards() {
  const area = document.getElementById('stage-area');
  return (area && area.querySelectorAll) ? Array.from(area.querySelectorAll('.card')) : [];
}

function clickMatching(els, cards) {
  let n = 0;
  els.forEach((el) => {
    if (typeof el.onclick !== 'function') return;
    try {
      const c = JSON.parse(el.dataset.card || '{}');
      if (cards.some(pc => pc.rank === c.rank && pc.suit === c.suit)) {
        el.onclick.call(el, { target: el });
        n++;
      }
    } catch (_) {}
  });
  return n;
}

const driven = driveToHumanWithLegals(60);
log('Drove to human with legals: ok=' + driven.ok + ' steps=' + driven.steps +
  ' legals=' + ((driven.legals && driven.legals.length) || 0));
t('reached human turn with legal plays', !!(driven.ok && driven.legals && driven.legals.length));

ui.updateUIFromController();
ui.renderHand(0);
if (ui.renderStage) ui.renderStage();

const playToMake = (driven.legals && driven.legals[0]) || [];
const beforeHandCount = handCards().length;
const beforeEngineLen = ctrl.getState().players[0].hand.length;
const bp = document.getElementById('btn-play');

t('Play disabled with empty stage', !!(bp && bp.disabled));
const beforeEmpty = JSON.stringify(ctrl.getState());
ui.playSelected();
t('Play no-ops when nothing is staged', JSON.stringify(ctrl.getState()) === beforeEmpty);
t('empty stage leaves engine hand unchanged', ctrl.getState().players[0].hand.length === beforeEngineLen);

const stagedN = clickMatching(handCards(), playToMake);
t('tap-to-stage wired on hand cards', stagedN === playToMake.length, 'clicked=' + stagedN + ' want=' + playToMake.length);
t('staged set matches intended combo', (ui._getStaged ? ui._getStaged() : ui._getSelected()).length === playToMake.length);
t('staged cards leave the hand fan', handCards().length === beforeHandCount - playToMake.length,
  'hand=' + handCards().length + ' before=' + beforeHandCount);
t('staged cards render in the center', stageCards().length === playToMake.length,
  'stage=' + stageCards().length);

const legal = ui.isValidPlaySelection(0);
t('legal staged combo enables Play', legal && bp && !bp.disabled);
t('status mentions PLAY to commit', /PLAY to commit|staged/i.test(
  (document.getElementById('selection-info') || {}).innerHTML || ''
) || /PLAY to commit|staged/i.test(
  (document.getElementById('action-bar-status') || {}).textContent || ''
));

// Unstage one card via tap on the center, then restage it
const firstStaged = stageCards()[0];
t('staged card is tappable', !!(firstStaged && typeof firstStaged.onclick === 'function'));
if (firstStaged && typeof firstStaged.onclick === 'function') {
  firstStaged.onclick.call(firstStaged, { target: firstStaged });
}
t('tap on staged card unstages it', (ui._getStaged ? ui._getStaged() : ui._getSelected()).length === playToMake.length - 1);
t('unstaged card returns to the hand fan', handCards().length === beforeHandCount - playToMake.length + 1);

const returnBtn = document.getElementById('btn-unstage-all');
if (returnBtn && typeof returnBtn.onclick === 'function') {
  returnBtn.onclick();
} else {
  ui.clearSelection();
}
t('Return to hand / clear unstages remaining cards', (ui._getStaged ? ui._getStaged() : ui._getSelected()).length === 0);
t('hand fan restored after unstage-all', handCards().length === beforeHandCount);

// Illegal staged set: two different ranks (never a combo; cannot be a legal play)
ui.clearSelection();
const liveHand = ctrl.getState().players[0].hand.slice();
const illegalPair = (function findNonCombo() {
  for (let i = 0; i < liveHand.length; i++) {
    for (let j = i + 1; j < liveHand.length; j++) {
      if (liveHand[i].rank === liveHand[j].rank) continue;
      const set = [liveHand[i], liveHand[j]];
      if (!engine.detectCombo(set)) return set;
    }
  }
  return null;
})();
t('found two off-rank cards that are not a combo', !!(illegalPair && illegalPair.length === 2));
clickMatching(handCards(), illegalPair || []);
t('illegal staged set disables Play', !ui.isValidPlaySelection(0) && bp.disabled);
const info = (document.getElementById('selection-info') || {}).innerHTML || '';
const bar = (document.getElementById('action-bar-status') || {}).textContent || '';
t('illegal stage shows invalid feedback', /not a legal play|not a combo/i.test(info + ' ' + bar), info + ' | ' + bar);
const beforeIllegal = JSON.stringify(ctrl.getState());
ui.playSelected();
t('Play no-ops on illegal staged set', JSON.stringify(ctrl.getState()) === beforeIllegal);
t('illegal Play leaves cards staged for correction', (ui._getStaged ? ui._getStaged() : ui._getSelected()).length === 2);

// Restage the legal combo and commit
ui.clearSelection();
clickMatching(handCards(), playToMake);
t('restaged legal combo is valid', ui.isValidPlaySelection(0));
const beforeCommit = ctrl.getState().players[0].hand.length;
ui.playSelected();
const afterCommit = ctrl.getState().players[0].hand.length;
t('Play commits staged legal combo (hand reduced)', afterCommit === beforeCommit - playToMake.length,
  'before=' + beforeCommit + ' after=' + afterCommit);
t('stage clears after a committed Play', (ui._getStaged ? ui._getStaged() : ui._getSelected()).length === 0);

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
t('index copy tells players to stage then PLAY', /STAGE A COMBO ON THE CENTER/.test(html));
t('index has Return-to-hand styling', /stage-return-btn/.test(html));

log('\nSUMMARY: passed=' + passed + ' failed=' + failed);
fs.writeFileSync(path.join(SCRATCH, 'ui-stage.log'), out.join('\n') + '\n');
if (failed > 0) process.exit(1);
log('ALL UI STAGING TESTS PASSED');
process.exit(0);
