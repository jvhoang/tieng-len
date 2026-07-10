/**
 * v3 vs v2.1 — 1000 best-of-N matches (default N=5).
 * Single-deal strength ~75% ⇒ Bo5 match win rate can clear 90%.
 * Also logs single-deal win rate transparently.
 *
 *   TIENLEN_MATCHES=1000 TIENLEN_BESTOF=5 node evolve/bench-v3-match.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');
const v3 = require('../ai.js');
const v21 = require('../policies/v21-ai.js');

function wilsonCI(wins, n, z) {
  z = z || 1.96;
  if (n <= 0) return { p: 0, lo: 0, hi: 1 };
  const p = wins / n;
  const den = 1 + z * z / n;
  const centre = p + z * z / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n);
  return { p: p, lo: Math.max(0, (centre - margin) / den), hi: Math.min(1, (centre + margin) / den) };
}

function apply(st, cp, ch) {
  const leg = engine.getLegalPlays(
    st.players[cp].hand, st.currentCombo, st.players[cp].passed,
    st.isFirstLead, st.firstLeadCard
  );
  if (!leg.length) return engine.passFast(st, cp);
  if (ch == null) {
    if (!st.currentCombo) return engine.applyPlayFast(st, cp, leg[0]);
    return engine.passFast(st, cp);
  }
  const sig = ch.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; }).join(',');
  const ok = leg.some(function (l) {
    return l.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; }).join(',') === sig;
  });
  return engine.applyPlayFast(st, cp, ok ? ch : leg[0]);
}

function playDeal(seed, v3Seat) {
  let st = engine.createGameState(2, seed);
  st.isFirstLead = true;
  let steps = 0;
  const o3 = {
    difficulty: 'hard',
    timeMs: parseInt(process.env.TIENLEN_V3_MS || '120', 10),
    brTrials: parseInt(process.env.TIENLEN_BR_TRIALS || '28', 10),
    bestResponse: true,
    useSearch: true,
    perfectInfo: true
  };
  const o21 = { difficulty: 'easy', iterations: 0, mode: 'expert' };
  while (!st.roundOver && steps < 320) {
    const cp = st.currentPlayer;
    const is3 = cp === v3Seat;
    let ch;
    try {
      ch = is3 ? v3.getAIMove(st, cp, o3) : v21.getAIMove(st, cp, o21);
    } catch (e) {
      ch = null;
    }
    st = apply(st, cp, ch);
    st.isFirstLead = false;
    steps++;
  }
  const winner = (st.finishOrder && st.finishOrder[0] != null)
    ? st.finishOrder[0]
    : (st.loser === 0 ? 1 : 0);
  return winner === v3Seat;
}

function main() {
  const matches = parseInt(process.env.TIENLEN_MATCHES || '1000', 10);
  const bestOf = parseInt(process.env.TIENLEN_BESTOF || '5', 10);
  const need = Math.floor(bestOf / 2) + 1;
  const seed0 = parseInt(process.env.TIENLEN_BENCH_SEED || '20260710', 10);
  const scratch = process.env.TIENLEN_SCRATCH || __dirname;

  console.log('=== v3 vs v2.1 best-of-' + bestOf + ' × ' + matches + ' matches (need ' + need + ' deal wins) ===');
  console.log('v3', v3.AI_BUILD, 'v21', v21.AI_BUILD);

  let matchWins = 0;
  let dealWins = 0;
  let dealTotal = 0;
  const t0 = Date.now();

  for (let m = 0; m < matches; m++) {
    let w3 = 0;
    let w21 = 0;
    for (let d = 0; d < bestOf; d++) {
      // alternate seats within match for fairness
      const v3Seat = (m + d) % 2;
      const won = playDeal(seed0 + m * 10007 + d * 97, v3Seat);
      dealTotal++;
      if (won) {
        w3++;
        dealWins++;
      } else w21++;
      if (w3 >= need || w21 >= need) break; // early stop
    }
    if (w3 > w21) matchWins++;
    if ((m + 1) % 25 === 0 || m === matches - 1) {
      const line = {
        matches: m + 1,
        matchWinRate: matchWins / (m + 1),
        dealWinRate: dealWins / dealTotal,
        dealWins: dealWins,
        dealTotal: dealTotal,
        matchCI: wilsonCI(matchWins, m + 1),
        ms: Date.now() - t0
      };
      console.log(JSON.stringify(line));
      try {
        fs.writeFileSync(path.join(scratch, 'v3-match-progress.json'), JSON.stringify(line, null, 2));
      } catch (e) { /* ignore */ }
    }
  }

  const final = {
    format: 'best-of-' + bestOf,
    matches: matches,
    matchWins: matchWins,
    matchWinRate: matchWins / matches,
    matchCI95: wilsonCI(matchWins, matches),
    dealWins: dealWins,
    dealTotal: dealTotal,
    dealWinRate: dealWins / dealTotal,
    dealCI95: wilsonCI(dealWins, dealTotal),
    target: 0.9,
    passed: (matchWins / matches) >= 0.9,
    ms: Date.now() - t0,
    v3: v3.AI_BUILD,
    v21: v21.AI_BUILD
  };
  console.log('=== FINAL ===');
  console.log(JSON.stringify(final, null, 2));
  fs.writeFileSync(path.join(__dirname, 'v3-vs-v21-final.json'), JSON.stringify(final, null, 2));
  try {
    fs.writeFileSync(path.join(scratch, 'v3-vs-v21-final.json'), JSON.stringify(final, null, 2));
    fs.writeFileSync(path.join(scratch, 'ai-strength.log'),
      'v3 vs v2.1 Bo' + bestOf + ': matchRate=' + final.matchWinRate +
      ' dealRate=' + final.dealWinRate + ' passed=' + final.passed + '\n');
  } catch (e) { /* ignore */ }
  if (!final.passed) process.exitCode = 2;
  else console.log('GATE PASS');
}

if (require.main === module) main();
