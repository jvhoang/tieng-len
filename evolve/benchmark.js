/**
 * Head-to-head benchmark harness for Tiến Lên AI versions.
 *
 * Usage:
 *   node evolve/benchmark.js
 *   TIENLEN_BENCH_GAMES=200 node evolve/benchmark.js
 *   TIENLEN_BENCH_MODE=search-vs-expert node evolve/benchmark.js
 *
 * Metrics: first-place rate, mean place, mean cards left (loser), CI (Wilson).
 */
'use strict';

const path = require('path');
const fs = require('fs');
const engine = require('../engine.js');
const ai = require('../ai.js');

function wilsonCI(wins, n, z) {
  z = z || 1.96;
  if (n <= 0) return { lo: 0, hi: 1, p: 0 };
  const p = wins / n;
  const den = 1 + z * z / n;
  const centre = p + z * z / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n);
  return {
    p: p,
    lo: Math.max(0, (centre - margin) / den),
    hi: Math.min(1, (centre + margin) / den)
  };
}

/**
 * policies: array of 4 functions (state, seat) => cards|null
 * Seat assignment rotates so each policy plays each seat equally.
 */
function playGame(policies, seed, seatMap) {
  let state = engine.createGameState(policies.length, seed);
  state.isFirstLead = true;
  let steps = 0;
  const maxSteps = 220;
  while (!state.roundOver && steps < maxSteps) {
    const cp = state.currentPlayer;
    const policyIdx = seatMap[cp];
    const fn = policies[policyIdx];
    let choice = null;
    try {
      choice = fn(state, cp);
    } catch (e) {
      choice = null;
    }
    const legals = engine.getLegalPlays(
      state.players[cp].hand, state.currentCombo, state.players[cp].passed,
      state.isFirstLead, state.firstLeadCard
    );
    if (!legals.length) {
      state = engine.passFast ? engine.passFast(state, cp) : engine.pass(state, cp);
    } else if (choice == null) {
      if (!state.currentCombo) {
        const play = legals[0];
        state = engine.applyPlayFast ? engine.applyPlayFast(state, cp, play) : engine.applyPlay(state, cp, play);
      } else {
        // cheap safety
        const cheap = legals.filter(function (pl) {
          const hasTwo = pl.some(function (c) { return c.rank === 12; });
          const com = engine.detectCombo(pl);
          const bomb = com && (com.type === 'quad' || (com.type === 'doubleseq' && com.numPairs >= 3));
          return !hasTwo && !bomb;
        });
        if (cheap.length) {
          state = engine.applyPlayFast
            ? engine.applyPlayFast(state, cp, cheap[0])
            : engine.applyPlay(state, cp, cheap[0]);
        } else {
          state = engine.passFast ? engine.passFast(state, cp) : engine.pass(state, cp);
        }
      }
    } else {
      const sig = choice.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; }).join(',');
      const ok = legals.some(function (l) {
        return l.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; }).join(',') === sig;
      });
      const play = ok ? choice : legals[0];
      state = engine.applyPlayFast
        ? engine.applyPlayFast(state, cp, play)
        : engine.applyPlay(state, cp, play);
    }
    state.isFirstLead = false;
    steps++;
  }
  // Places for each policy index
  const places = new Array(policies.length).fill(policies.length); // default last
  const order = state.finishOrder || [];
  for (let p = 0; p < order.length; p++) {
    const seat = order[p];
    const pol = seatMap[seat];
    places[pol] = p + 1;
  }
  if (state.loser != null && state.loser >= 0) {
    places[seatMap[state.loser]] = policies.length;
  }
  return {
    places: places,
    finishOrder: order.slice(),
    loser: state.loser,
    steps: steps,
    cardsLeft: state.players.map(function (p) { return p.hand.length; })
  };
}

function makeSeatMaps(nPolicies, nPlayers, gameIdx) {
  // Rotate which policy sits where
  const map = [];
  for (let s = 0; s < nPlayers; s++) {
    map[s] = (s + gameIdx) % nPolicies;
  }
  // If fewer policies than players, fill with last policy (usually weak baseline)
  if (nPolicies < nPlayers) {
    for (let s = 0; s < nPlayers; s++) {
      map[s] = Math.min(map[s], nPolicies - 1);
    }
  }
  return map;
}

function runBenchmark(config) {
  const games = config.games || 100;
  const nPlayers = config.nPlayers || 4;
  const policies = config.policies;
  const names = config.names || policies.map(function (_, i) { return 'P' + i; });
  const baseSeed = config.seed || 42;

  const stats = names.map(function (name) {
    return {
      name: name,
      firsts: 0,
      placeSum: 0,
      games: 0,
      cardsWhenLose: 0,
      loseCount: 0
    };
  });

  const t0 = Date.now();
  for (let g = 0; g < games; g++) {
    const seatMap = makeSeatMaps(policies.length, nPlayers, g);
    // Ensure all seats filled: if 2 policies in 4p, alternate pairs
    if (policies.length === 2 && nPlayers === 4) {
      // search/expert on even seats vs odd — better: 2 copies each
      seatMap[0] = 0;
      seatMap[1] = 1;
      seatMap[2] = 0;
      seatMap[3] = 1;
      if (g % 2 === 1) {
        seatMap[0] = 1; seatMap[1] = 0; seatMap[2] = 1; seatMap[3] = 0;
      }
    }
    const result = playGame(policies, baseSeed + g * 17, seatMap);
    for (let pi = 0; pi < policies.length; pi++) {
      // average place across seats that used this policy
      let placeSum = 0;
      let count = 0;
      let first = false;
      for (let s = 0; s < nPlayers; s++) {
        if (seatMap[s] === pi) {
          // place of this seat
          const seatPlace = result.places[pi]; // wait - places is by policy not seat
          // recompute seat place from finishOrder
        }
      }
    }
    // Fix place accounting per policy: mean over seats that policy occupied
    const seatPlaces = new Array(nPlayers);
    for (let s = 0; s < nPlayers; s++) {
      const fo = result.finishOrder.indexOf(s);
      if (fo >= 0) seatPlaces[s] = fo + 1;
      else if (result.loser === s) seatPlaces[s] = nPlayers;
      else seatPlaces[s] = nPlayers;
    }
    const polAgg = names.map(function () { return { places: [], firsts: 0 }; });
    for (let s = 0; s < nPlayers; s++) {
      const pi = seatMap[s];
      polAgg[pi].places.push(seatPlaces[s]);
      if (seatPlaces[s] === 1) polAgg[pi].firsts++;
    }
    for (let pi = 0; pi < policies.length; pi++) {
      if (!polAgg[pi].places.length) continue;
      const meanPlace = polAgg[pi].places.reduce(function (a, b) { return a + b; }, 0) / polAgg[pi].places.length;
      stats[pi].placeSum += meanPlace;
      stats[pi].games++;
      // first if any copy finished first (for 2v2: count if at least one first)
      if (polAgg[pi].firsts > 0) stats[pi].firsts++;
    }
  }
  const ms = Date.now() - t0;

  const report = {
    games: games,
    nPlayers: nPlayers,
    ms: ms,
    gamesPerSec: games / (ms / 1000),
    results: stats.map(function (s) {
      const ci = wilsonCI(s.firsts, s.games);
      return {
        name: s.name,
        firstRate: s.games ? s.firsts / s.games : 0,
        firsts: s.firsts,
        games: s.games,
        meanPlace: s.games ? s.placeSum / s.games : 0,
        ci95: ci
      };
    })
  };
  return report;
}

// ─── Built-in policies ───

function policyExpert(state, seat) {
  return ai.getAIMove(state, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' });
}

function policySearchLite(state, seat) {
  return ai.getAIMove(state, seat, {
    difficulty: 'hard',
    mode: 'mcts',
    timeMs: 80,
    iterations: 60,
    perfectInfo: true,
    useSearch: true
  });
}

function policySearchHard(state, seat) {
  return ai.getAIMove(state, seat, {
    difficulty: 'hard',
    mode: 'mcts',
    timeMs: 250,
    iterations: 200,
    perfectInfo: true,
    useSearch: true
  });
}

function policyLowest(state, seat) {
  return ai.getLowestLegalMove(state, seat);
}

function policyRandom(state, seat) {
  const legals = engine.getLegalPlays(
    state.players[seat].hand, state.currentCombo, state.players[seat].passed,
    state.isFirstLead, state.firstLeadCard
  );
  if (!legals.length) return null;
  if (!state.currentCombo) return legals[Math.floor(Math.random() * legals.length)];
  if (Math.random() < 0.25) return null;
  return legals[Math.floor(Math.random() * legals.length)];
}

function policyGenomeChampion(state, seat) {
  return ai.getAIMove(state, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' });
}

// ─── CLI ───

function main() {
  const games = parseInt(process.env.TIENLEN_BENCH_GAMES || '80', 10);
  const mode = process.env.TIENLEN_BENCH_MODE || 'search-vs-expert';
  const seed = parseInt(process.env.TIENLEN_BENCH_SEED || '20260710', 10);

  console.log('=== Tiến Lên AI Benchmark ===');
  console.log('mode=%s games=%d seed=%d', mode, games, seed);

  let policies;
  let names;
  if (mode === 'search-vs-expert') {
    policies = [policySearchLite, policyExpert];
    names = ['search-lite', 'expert-genome'];
  } else if (mode === 'search-vs-lowest') {
    policies = [policySearchLite, policyLowest];
    names = ['search-lite', 'lowest-legal'];
  } else if (mode === 'expert-vs-lowest') {
    policies = [policyExpert, policyLowest];
    names = ['expert', 'lowest-legal'];
  } else if (mode === 'search-hard-vs-expert') {
    policies = [policySearchHard, policyExpert];
    names = ['search-hard', 'expert-genome'];
  } else if (mode === 'four-way') {
    policies = [policySearchLite, policyExpert, policyLowest, policyRandom];
    names = ['search', 'expert', 'lowest', 'random'];
  } else {
    policies = [policySearchLite, policyExpert];
    names = ['search-lite', 'expert-genome'];
  }

  const report = runBenchmark({
    games: games,
    nPlayers: 4,
    policies: policies,
    names: names,
    seed: seed
  });

  console.log(JSON.stringify(report, null, 2));

  const outDir = path.join(__dirname, '..', '..');
  // Write to SCRATCH if available, else local
  const localOut = path.join(__dirname, 'last-benchmark.json');
  fs.writeFileSync(localOut, JSON.stringify(report, null, 2));
  console.log('Wrote', localOut);

  // Gate: search should beat expert when both present
  if (names[0].indexOf('search') >= 0 && names[1].indexOf('expert') >= 0) {
    const a = report.results[0];
    const b = report.results[1];
    console.log('\nHead-to-head first-rate: ' + a.name + '=' + (a.firstRate * 100).toFixed(1) +
      '% vs ' + b.name + '=' + (b.firstRate * 100).toFixed(1) + '%');
    console.log('Mean place: ' + a.name + '=' + a.meanPlace.toFixed(2) +
      ' vs ' + b.name + '=' + b.meanPlace.toFixed(2));
    if (a.firstRate + 0.02 < b.firstRate && a.meanPlace > b.meanPlace + 0.05) {
      console.log('GATE WARN: search not yet clearly stronger — need more budget or expert fix');
      process.exitCode = 2;
    } else if (a.firstRate >= b.firstRate || a.meanPlace <= b.meanPlace) {
      console.log('GATE OK: search competitive/stronger vs expert');
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  runBenchmark: runBenchmark,
  playGame: playGame,
  policyExpert: policyExpert,
  policySearchLite: policySearchLite,
  policySearchHard: policySearchHard,
  policyLowest: policyLowest,
  policyRandom: policyRandom,
  wilsonCI: wilsonCI
};
