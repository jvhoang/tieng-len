/**
 * vs-AI ranked forfeit: mid-game exit confirm, no free mulligan,
 * confirmed leave / new deal counts as a leaderboard loss.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { createDOMShim } = require('./dom-shim');
const engine = require('../engine.js');
const ctrlFac = require('../controller.js');
const createUI = require('../ui.js');
const playLogMod = require('../play-log.js');
const profile = require('../player-profile.js');

let passed = 0;
let failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log('PASS:', msg); }
  else { failed++; console.log('FAIL:', msg); }
}

function makeUi(opts) {
  opts = opts || {};
  const { document } = createDOMShim();
  const mem = playLogMod.createMemoryStorage();
  const pl = playLogMod.createPlayLog({ storage: mem, maxGames: 20 });
  const vsAI = opts.vsAI !== false;
  const ctrl = ctrlFac.createController({
    vsAI: vsAI,
    numPlayers: opts.numPlayers || 2,
    humanSeats: vsAI ? [0] : [0, 1],
    currentHumanSeat: 0,
    seed: opts.seed != null ? opts.seed : 4242,
    beginGame: true,
    playLog: pl,
    mode: vsAI ? 'vsAI' : 'hotseat',
    aiDifficulty: 'grandmaster'
  });
  const ui = createUI({ document, engine, controller: ctrl });
  return { document, pl, ctrl, ui };
}

console.log('=== shipped Exit / New Round path ===');
{
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok(/onclick="exitToMenu\(\)"/.test(html), 'Exit button calls exitToMenu');
  ok(/requestExitToMenu/.test(html), 'page wires ranked leave confirm');
  ok(/requestNewRound/.test(html), 'page wires new-deal confirm');
  ok(/leave-confirm-overlay/.test(html), 'index has leave-confirm styles');
  ok(/Leaving an unfinished vs-AI deal counts as a loss/.test(html),
    'leaderboard copy mentions unfinished vs-AI is a loss');
}

console.log('=== mid-game exit confirmation ===');
{
  const { document, pl, ctrl, ui } = makeUi();
  ok(!!pl.getActive(), 'deal is live after start');
  ok(ctrl.hasUnfinishedRankedGame(), 'ranked vsAI game is unfinished');
  ok(ui.needsLeaveConfirm(), 'exit requires confirmation');

  const asked = ui.requestExitToMenu();
  ok(asked && asked.pending === true, 'exit waits for confirm');
  ok(!!pl.getActive(), 'active deal unchanged until confirm');
  const overlay = document.getElementById('leave-confirm-overlay');
  ok(overlay && overlay.classList.contains('show'), 'warning overlay is shown');
  const body = document.getElementById('leave-confirm-body');
  ok(body && /leaderboard/i.test(body.textContent), 'warning mentions the leaderboard');
  ok(body && /loss/i.test(body.textContent), 'warning says it counts as a loss');

  document.getElementById('leave-confirm-stay').click();
  ok(!!pl.getActive(), 'cancel keeps them in the game');
  ok(ctrl.hasUnfinishedRankedGame(), 'cancel does not forfeit');
  ok(overlay.classList.contains('hidden'), 'overlay hides on cancel');

  ui.requestExitToMenu();
  document.getElementById('leave-confirm-go').click();
  ok(!pl.getActive(), 'confirm ends the deal');
  const games = pl.listGames();
  ok(games.length >= 1, 'forfeit is stored');
  const rec = pl.getGame(games[0].id);
  ok(rec && rec.result && rec.result.forfeit === true, 'confirmed exit is a forfeit');
  ok(rec.result.humanWon === false, 'forfeit is a human loss');
  ok(!ctrl.hasUnfinishedRankedGame(), 'no ranked live game after confirm');
}

console.log('=== no free mulligan after seeing the hand ===');
{
  const { document, pl, ui } = makeUi({ seed: 99 });
  const id1 = pl.getActive().id;
  const asked = ui.requestNewRound();
  ok(asked && asked.pending === true, 'new deal mid-game asks first');
  ok(pl.getActive().id === id1, 'same hand until they confirm');
  document.getElementById('leave-confirm-stay').click();
  ok(pl.getActive().id === id1, 'no free restart on cancel');

  ui.requestNewRound();
  const body = document.getElementById('leave-confirm-body');
  ok(body && /no free redo/i.test(body.textContent), 'new-deal copy says no free redo');
  document.getElementById('leave-confirm-go').click();
  ok(pl.getActive() && pl.getActive().id !== id1, 'new deal starts only after confirm');
  const prior = pl.getGame(id1);
  ok(prior && prior.result && prior.result.forfeit && prior.result.humanWon === false,
    'prior deal is a forfeit loss — not a discarded mulligan');
}

console.log('=== hotseat does not require ranked forfeit confirm ===');
{
  const { pl, ctrl, ui } = makeUi({ vsAI: false, numPlayers: 2, seed: 5 });
  ok(!!pl.getActive(), 'hotseat still logs');
  ok(!ctrl.hasUnfinishedRankedGame(), 'hotseat is not a ranked live game');
  ok(!ui.needsLeaveConfirm(), 'no leaderboard-loss warning for hotseat');
  const r = ui.requestExitToMenu();
  ok(r && r.skipped === true, 'hotseat exit skips confirm');
}

console.log('=== forfeit aggregation drops win rate ===');
{
  const { pl, ctrl } = makeUi({ seed: 3 });
  const id = pl.getActive().id;
  ctrl.forfeitActive('exit');
  const rec = pl.getGame(id);
  rec.username = 'Pat';
  rec.aiDifficulty = 'grandmaster';
  rec.aiBuild = { id: 'v1.0-sh-L2s444', label: 'L2s444', stamped: '2026-07-26' };
  const wins = [];
  for (let i = 0; i < 2; i++) {
    wins.push({
      username: 'Pat', mode: 'vsAI', vsAI: true, numPlayers: 2, humanSeats: [0],
      aiDifficulty: 'grandmaster',
      aiBuild: rec.aiBuild,
      humanWon: true,
      result: { humanWon: true, humanPlacement: 1, abandoned: false },
      endedAt: '2026-07-26T09:0' + i + ':00Z',
      complete: true
    });
  }
  const board = profile.buildLeaderboard(wins.concat([rec]), {
    modeFilter: '1v1', minGames: 3, latestAiOnly: true
  });
  ok(board.rows[0] && board.rows[0].losses === 1 && board.rows[0].wins === 2,
    'UI forfeit record counts as the third-game loss');
}

console.log('\n=== RESULT: ' + passed + ' passed, ' + failed + ' failed ===');
if (failed) process.exit(1);
console.log('ALL VSAI FORFEIT TESTS PASSED');
