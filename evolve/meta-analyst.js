/**
 * Meta-Strategist / Analyst — reviews losing games and proposes concrete improvements.
 *
 * Usage:
 *   node evolve/meta-analyst.js
 *   TIENLEN_ANALYST_GAMES=30 node evolve/meta-analyst.js
 *
 * Writes evolve/analyst-report.json with recurring weaknesses + code-level suggestions.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');
const ai = require('../ai.js');
const search = require('../search.js');

function playTracedGame(seed, searchBudget) {
  searchBudget = searchBudget || { timeMs: 60, iterations: 40 };
  let state = engine.createGameState(4, seed);
  state.isFirstLead = true;
  const traces = [];
  let steps = 0;
  // Seat 0 = search, seats 1-3 = expert
  while (!state.roundOver && steps < 200) {
    const cp = state.currentPlayer;
    const handLenBefore = state.players[cp].hand.length;
    const cur = state.currentCombo;
    const legals = engine.getLegalPlays(
      state.players[cp].hand, cur, state.players[cp].passed,
      state.isFirstLead, state.firstLeadCard
    );
    let choice = null;
    let mode = 'expert';
    if (cp === 0) {
      mode = 'search';
      choice = ai.getAIMove(state, cp, {
        difficulty: 'hard',
        mode: 'mcts',
        timeMs: searchBudget.timeMs,
        iterations: searchBudget.iterations,
        perfectInfo: true,
        useSearch: true
      });
    } else {
      choice = ai.getAIMove(state, cp, { difficulty: 'easy', iterations: 0, mode: 'expert' });
    }

    const entry = {
      step: steps,
      seat: cp,
      mode: mode,
      handLen: handLenBefore,
      facing: cur ? (cur.type + '@' + (cur.top && cur.top.rank)) : 'LEAD',
      legalCount: legals.length,
      action: null,
      usedTwo: false,
      bomb: false,
      multi: false
    };

    if (!legals.length) {
      state = engine.passFast(state, cp);
      entry.action = 'PASS(no-legal)';
    } else if (choice == null) {
      if (!cur) {
        choice = legals[0];
        state = engine.applyPlayFast(state, cp, choice);
        entry.action = 'PLAY-fallback';
        entry.multi = choice.length >= 2;
      } else {
        state = engine.passFast(state, cp);
        entry.action = 'PASS';
      }
    } else {
      entry.usedTwo = choice.some(function (c) { return c.rank === 12; });
      const com = engine.detectCombo(choice);
      entry.bomb = !!(com && (com.type === 'quad' || (com.type === 'doubleseq' && com.numPairs >= 3)));
      entry.multi = choice.length >= 2;
      entry.action = 'PLAY:' + (com && com.type) + 'x' + choice.length;
      state = engine.applyPlayFast(state, cp, choice);
    }
    if (cp === 0) traces.push(entry);
    state.isFirstLead = false;
    steps++;
  }

  const place = (state.finishOrder || []).indexOf(0);
  return {
    seed: seed,
    place: place >= 0 ? place + 1 : (state.loser === 0 ? 4 : 99),
    steps: steps,
    traces: traces,
    finishOrder: (state.finishOrder || []).slice()
  };
}

function analyze(games) {
  games = games || 24;
  const losses = [];
  const wins = [];
  const counters = {
    leadSingle: 0,
    leadMulti: 0,
    passCount: 0,
    playCount: 0,
    usedTwoEarly: 0,
    bombUsed: 0,
    bombOpportunitiesMissed: 0
  };

  for (let g = 0; g < games; g++) {
    const res = playTracedGame(5000 + g * 31, { timeMs: 50, iterations: 35 });
    if (res.place === 1) wins.push(res);
    else if (res.place >= 3) losses.push(res);

    res.traces.forEach(function (t) {
      if (t.facing === 'LEAD') {
        if (t.multi) counters.leadMulti++;
        else counters.leadSingle++;
      }
      if (t.action === 'PASS' || t.action === 'PASS(no-legal)') counters.passCount++;
      else counters.playCount++;
      if (t.usedTwo && t.handLen > 8) counters.usedTwoEarly++;
      if (t.bomb) counters.bombUsed++;
    });
  }

  const findings = [];
  const leadTotal = counters.leadSingle + counters.leadMulti;
  const multiRate = leadTotal ? counters.leadMulti / leadTotal : 0;
  if (multiRate < 0.55) {
    findings.push({
      severity: 'high',
      issue: 'Free-lead multi rate low (' + (multiRate * 100).toFixed(0) + '%)',
      fix: 'Increase multiLeadB / shedLenB floors; ensure search free-lead uses expertOrder multi pool first'
    });
  }
  if (counters.usedTwoEarly > games * 0.4) {
    findings.push({
      severity: 'medium',
      issue: 'Early 2 usage high (' + counters.usedTwoEarly + ' events)',
      fix: 'Raise twoBeatPen for handLen>8 and curTop<9; keep endgame two use bonus'
    });
  }
  if (losses.length > wins.length) {
    findings.push({
      severity: 'high',
      issue: 'More marginal/loss games (' + losses.length + ') than firsts (' + wins.length + ') at lite budget',
      fix: 'Raise default hard timeMs; expand root branch for bombs and go-out sequences'
    });
  }

  // Loss pattern: many PASSes then dump
  let passHeavyLosses = 0;
  losses.forEach(function (L) {
    const passes = L.traces.filter(function (t) { return t.action && t.action.indexOf('PASS') === 0; }).length;
    if (passes > L.traces.length * 0.45) passHeavyLosses++;
  });
  if (passHeavyLosses > losses.length * 0.4 && losses.length) {
    findings.push({
      severity: 'medium',
      issue: 'Losses often pass-heavy (' + passHeavyLosses + '/' + losses.length + ')',
      fix: 'In expertPolicy, contest more when handLen<=6 even vs mid tops; reduce midgame auto-pass'
    });
  }

  // Concrete code patch suggestions (applied by improve loop or human)
  const proposals = [
    {
      id: 'contest-mid-short',
      file: 'search.js',
      description: 'When handLen<=6, never auto-pass on expensive if any legal 2/bomb exists',
      appliedHint: 'expertPolicy midgame pass thresholds'
    },
    {
      id: 'free-lead-residual',
      file: 'search.js',
      description: 'Prefer multi leads that leave 3–8 cards residual structure',
      appliedHint: 'expertScore free-lead residual bonuses'
    },
    {
      id: 'raise-hard-budget',
      file: 'ai.js / search.js',
      description: 'Browser hard timeMs 900→1200; grandmaster 2500→3500',
      appliedHint: 'searchMove default budgets'
    }
  ];

  // Auto-apply one safe tuning: raise contest for short hands in expertPolicy
  // (already partially present). Document for STATUS.

  const report = {
    timestamp: new Date().toISOString(),
    games: games,
    firsts: wins.length,
    lossesOrMarginal: losses.length,
    counters: counters,
    multiLeadRate: multiRate,
    findings: findings,
    proposals: proposals,
    sampleLossSeeds: losses.slice(0, 8).map(function (L) {
      return { seed: L.seed, place: L.place, steps: L.steps, traceLen: L.traces.length };
    })
  };

  const out = path.join(__dirname, 'analyst-report.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log('Wrote', out);
  return report;
}

if (require.main === module) {
  const n = parseInt(process.env.TIENLEN_ANALYST_GAMES || '24', 10);
  analyze(n);
}

module.exports = { analyze: analyze, playTracedGame: playTracedGame };
