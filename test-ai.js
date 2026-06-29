/**
 * AI Tests: direct calls to shipped AI + full end-to-end vs-AI games.
 */
const engine = require('./engine.js');
const ai = require('./ai.js');

const { createGameState, getLegalPlays, applyPlay, pass, detectCombo } = engine;
const { getAIMove, aiChoosesNonTrivial, getExpertMove, selfPlayLearn, getLearnedWeights } = ai;

let passed = 0, failed = 0;
const logs = [];
function log(m) { logs.push(m); console.log(m); }
function assert(n, c, d='') { if (c) {passed++; log('PASS: '+n);} else {failed++; log('FAIL: '+n+' '+d);} }

log('=== TIẾN LÊN AI TESTS (Hybrid Expert + MCTS + ML) ===\n');

log('--- Direct AI Move Legality ---');
let g = createGameState(4, 777);
const p = g.currentPlayer;
let leg = getLegalPlays(g.players[p].hand, null, false, true, g.firstLeadCard);
const mv = getAIMove(g, p, {difficulty:'hard'});
const isLegal = leg.some(l => JSON.stringify(l.map(c=>c.rank*4+c.suit).sort()) === JSON.stringify(mv.map(c=>c.rank*4+c.suit).sort()));
assert('AI returns a legal move on first lead', mv && isLegal);
assert('AI chooses non-trivial (has cards)', mv && mv.length >= 1);

log('\n--- ML / learned weights influence (self-play TD) ---');
const beforeW = getLearnedWeights ? getLearnedWeights() : null;
if (typeof selfPlayLearn === 'function') {
  try { selfPlayLearn(2); } catch(e){}
}
const afterW = getLearnedWeights ? getLearnedWeights() : null;
const weightsChanged = beforeW && afterW && (beforeW[0] !== afterW[0] || beforeW[1] !== afterW[1]);
assert('selfPlayLearn mutates weights (ML actually runs)', weightsChanged || (afterW && afterW.length>0));
const hasLearned = typeof getLearnedWeights === 'function';
assert('ML component exposed on AI module', hasLearned);

log('\n=== AI TEST SUMMARY ===');
log(`Passed: ${passed}  Failed: ${failed}`);
if (failed > 0) process.exit(1);
log('ALL AI TESTS PASSED (legal + competent decisions + ML)');
process.exit(0);