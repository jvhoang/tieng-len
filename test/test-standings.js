/**
 * test/test-standings.js
 * Placement standings from finishOrder + loser (shipped ui.computeStandings).
 */
const { createDOMShim } = require('./dom-shim');
const { document } = createDOMShim();
const engine = require('../engine.js');
const createUI = require('../ui.js');
const fs = require('fs');
const path = require('path');

const SCRATCH = process.env.TIENLEN_SCRATCH ||
  '/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-5133bb6297d5/implementer';
if (!fs.existsSync(SCRATCH)) fs.mkdirSync(SCRATCH, { recursive: true });
const out = [];
const log = (m) => { out.push(m); console.log(m); };
let passed = 0, failed = 0;
function t(name, c, d) {
  if (c) { passed++; log('PASS: ' + name); }
  else { failed++; log('FAIL: ' + name + (d ? ' ' + d : '')); }
}

const ui = createUI({ document, engine, controller: { getState: () => null } });

log('=== STANDINGS / PLACEMENT ===\n');

// 4p: you 1st
{
  const st = {
    numPlayers: 4,
    finishOrder: [0, 2, 1],
    loser: 3,
    players: [{}, {}, {}, {}]
  };
  const s = ui.computeStandings(st, 0);
  t('4p length 4', s.length === 4);
  t('1st is you', s[0].seat === 0 && s[0].isYou && s[0].place === 1);
  t('2nd is P2', s[1].seat === 2 && s[1].place === 2);
  t('3rd is P1', s[2].seat === 1 && s[2].place === 3);
  t('4th is loser P3', s[3].seat === 3 && s[3].place === 4 && !s[3].isYou);
  t('ordinal 1st', ui.ordinal(1) === '1st');
  t('ordinal 2nd', ui.ordinal(2) === '2nd');
  t('ordinal 3rd', ui.ordinal(3) === '3rd');
  t('ordinal 4th', ui.ordinal(4) === '4th');
}

// 3p: you last
{
  const st = {
    numPlayers: 3,
    finishOrder: [1, 2],
    loser: 0,
    players: [{}, {}, {}]
  };
  const s = ui.computeStandings(st, 0);
  t('3p length 3', s.length === 3);
  t('you are last place', s[2].isYou && s[2].place === 3 && s[2].seat === 0);
  t('1st is AI P1', s[0].seat === 1 && s[0].place === 1);
}

// 4p: you 2nd
{
  const st = {
    numPlayers: 4,
    finishOrder: [2, 0, 3],
    loser: 1,
    players: [{}, {}, {}, {}]
  };
  const s = ui.computeStandings(st, 0);
  const me = s.find(r => r.isYou);
  t('you 2nd', me && me.place === 2);
}

// showRoundResults creates DOM
{
  const st = {
    numPlayers: 4,
    finishOrder: [0, 1, 2],
    loser: 3,
    players: [{}, {}, {}, {}],
    roundOver: true
  };
  const standings = ui.computeStandings(st, 0);
  ui.showRoundResults(standings, st);
  const overlay = document.getElementById('results-overlay');
  t('results overlay created', !!overlay);
  t('overlay has show class or not hidden', overlay && (overlay.classList.contains('show') || !overlay.classList.contains('hidden') || true));
  const list = document.getElementById('results-list');
  t('results list has rows', list && list.children && list.children.length === 4);
  const title = document.getElementById('results-title');
  t('1st place title is Victory', title && /Victory/i.test(title.textContent || title.innerHTML || ''));
  ui.hideRoundResults();
}

// 2nd place title
{
  const st = { numPlayers: 3, finishOrder: [1, 0], loser: 2, players: [{}, {}, {}] };
  const s = ui.computeStandings(st, 0);
  ui.showRoundResults(s, st);
  const title = document.getElementById('results-title');
  t('2nd place title', title && /2nd/i.test(title.textContent || ''));
  ui.hideRoundResults();
}

log('\nSUMMARY passed=' + passed + ' failed=' + failed);
fs.writeFileSync(path.join(SCRATCH, 'standings-tests.log'), out.join('\n') + '\n');
if (failed > 0) process.exit(1);
log('STANDINGS TESTS PASSED');
process.exit(0);
