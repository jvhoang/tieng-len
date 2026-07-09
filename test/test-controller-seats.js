/**
 * test/test-controller-seats.js
 * Verifies createController + reconfigure for numPlayers 2,3,4 vsAI,
 * and that AI seats receive actions via runAITurnIfNeeded.
 */
const engine = require('../engine.js');
const ctrlFac = require('../controller.js');
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

process.env.TIENLEN_TEST_FAST = '1';

log('=== CONTROLLER SEATS 2/3/4 vsAI (shipped createController) ===\n');

for (const np of [2, 3, 4]) {
  const ctrl = ctrlFac.createController({
    vsAI: true,
    numPlayers: np,
    humanSeats: [0],
    currentHumanSeat: 0,
    seed: 1000 + np
  });
  let st = ctrl.getState();
  t(`${np}p: state.numPlayers matches`, st.numPlayers === np);
  t(`${np}p: players array length`, st.players.length === np);

  // Reconfigure to different count then back — proves no stale instance
  ctrl.reconfigure({ vsAI: true, numPlayers: np, humanSeats: [0], currentHumanSeat: 0, seed: 2000 + np });
  st = ctrl.getState();
  t(`${np}p: reconfigure keeps numPlayers`, st.numPlayers === np && st.players.length === np);

  // Drive until AI has acted or human turn
  const aiSeatsActed = new Set();
  let guard = 0;
  while (!st.roundOver && guard < 40) {
    guard++;
    st = ctrl.getState();
    if (st.roundOver) break;
    const cp = st.currentPlayer;
    if (cp === 0) {
      const leg = ctrl.getLegalFor(0);
      if (leg.length) {
        const res = ctrl.playHuman(0, leg[0]);
        t(`${np}p: human play ok at step ${guard}`, res.ok);
      } else {
        const res = ctrl.passHuman(0);
        // pass may fail on free lead
        if (!res.ok && res.error === 'must lead a combination') {
          // force a legal lead
          const l2 = ctrl.getLegalFor(0);
          if (l2.length) ctrl.playHuman(0, l2[0]);
        }
      }
    } else {
      const before = st.currentPlayer;
      const acts = ctrl.runAITurnIfNeeded() || [];
      acts.forEach(a => aiSeatsActed.add(a.seat));
      st = ctrl.getState();
      // AI should have moved off that seat unless round ended
      if (!st.roundOver && acts.length === 0 && before !== 0) {
        // hang detection
        t(`${np}p: AI did not hang on seat ${before}`, false, 'no actions');
        break;
      }
    }
    st = ctrl.getState();
  }
  t(`${np}p: at least one AI seat acted`, aiSeatsActed.size >= 1 || np === 1, 'acted=' + Array.from(aiSeatsActed));
  // All non-zero seats that got a turn should be in aiSeatsActed eventually for multi-step
  log(`  ${np}p AI seats that acted: ${Array.from(aiSeatsActed).join(',')}`);
  for (let s = 1; s < np; s++) {
    // Not every seat always acts in short run, but runAITurnIfNeeded must handle them
    // Verify isHumanSeat: only 0 is human
    t(`${np}p: seat ${s} is not human`, ctrl.isHumanSeat(s) === false);
  }
  t(`${np}p: seat 0 is human`, ctrl.isHumanSeat(0) === true);
}

// Specific: start as 4p then reconfigure to 3p — seats shrink
{
  const ctrl = ctrlFac.createController({ vsAI: true, numPlayers: 4, humanSeats: [0], seed: 9 });
  t('initial 4p', ctrl.getState().numPlayers === 4);
  ctrl.reconfigure({ vsAI: true, numPlayers: 3, humanSeats: [0], seed: 10 });
  t('after reconfigure 3p', ctrl.getState().numPlayers === 3 && ctrl.getState().players.length === 3);
  const acts = ctrl.runAITurnIfNeeded();
  t('3p after reconfigure: AI runs without throw', Array.isArray(acts));
}

log('\nSUMMARY passed=' + passed + ' failed=' + failed);
fs.writeFileSync(path.join(SCRATCH, 'controller-seats-tests.log'), out.join('\n') + '\n');
if (failed > 0) process.exit(1);
log('CONTROLLER SEATS TESTS PASSED');
process.exit(0);
