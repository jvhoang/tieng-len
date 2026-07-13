#!/usr/bin/env bash
# Isolated dual probe — mirrors evolve/bench-ladder.js protocol.
# Usage: PROBE_NAME=X GAMES=20 bash evolve/run-isolated-probe.sh /path/to/probe-dir
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROBE_DIR="${1:?probe dir}"
NAME="${PROBE_NAME:-$(basename "$PROBE_DIR")}"
GAMES="${GAMES:-20}"
SEED="${SEED:-20260711}"
SCRATCH="${SCRATCH:-$ROOT/evolve}"

for f in engine.js genome.js; do
  [ -e "$PROBE_DIR/$f" ] || ln -sfn "$ROOT/$f" "$PROBE_DIR/$f"
done
[ -e "$PROBE_DIR/policies" ] || ln -sfn "$ROOT/policies" "$PROBE_DIR/policies"

cat > "$PROBE_DIR/run-dual.js" << 'JS'
'use strict';
/** Mirrors evolve/bench-ladder.js play2p + exploit BR + applyFast */
const fs = require('fs');
const path = require('path');
const engine = require('./engine.js');
const live = require('./ai.js');
const search = require('./search.js');
const freeze = require('./policies/v91-ai.js');

const games = parseInt(process.env.TIENLEN_BENCH_GAMES || '20', 10);
const seed0 = parseInt(process.env.TIENLEN_BENCH_SEED || '20260711', 10);
const target = parseFloat(process.env.TIENLEN_TARGET || '0.70');

var _oppMemo = Object.create(null);
var _oppMemoN = 0;
var _brMemo = Object.create(null);
var _brMemoN = 0;
function _hashKey(str) {
  var h = 2166136261 >>> 0;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}
function _stateKey(state, seat) {
  var key = seat + '|' + state.currentPlayer + '|' +
    (state.isFirstLead ? 'F' : 'f') + '|' +
    (state.lastPlayBy == null ? 'n' : state.lastPlayBy) + '|';
  if (state.currentCombo && state.currentCombo.cards) {
    var cc = state.currentCombo.cards;
    var ids = [];
    for (var ci = 0; ci < cc.length; ci++) ids.push(cc[ci].rank * 4 + cc[ci].suit);
    ids.sort(function (a, b) { return a - b; });
    key += state.currentCombo.type + ':' + ids.join(',') + '|';
  } else key += 'L|';
  for (var p = 0; p < state.players.length; p++) {
    var h = state.players[p].hand;
    key += h.length + ':';
    for (var i = 0; i < h.length; i++) key += (h[i].rank * 4 + h[i].suit) + ',';
    key += state.players[p].passed ? 'P' : 'N';
  }
  return key;
}

function liveOpts() {
  return {
    difficulty: 'grandmaster',
    timeMs: parseInt(process.env.TIENLEN_V8_MS || '280', 10),
    iterations: parseInt(process.env.TIENLEN_V8_ITERS || '200', 10),
    maxSims: parseInt(process.env.TIENLEN_V8_SIMS || '480', 10),
    brTrials: parseInt(process.env.TIENLEN_BR_TRIALS || '96', 10),
    bestResponse: true,
    useSearch: true,
    perfectInfo: true,
    hiddenInfo: false,
    maxBranch: parseInt(process.env.TIENLEN_V8_BRANCH || '24', 10),
    dualSelf: process.env.TIENLEN_DUAL_SELF === '1',
    exactExploit: true,
    exploit: true,
    mode: 'auto'
  };
}
function freezeOpts() {
  return {
    difficulty: 'grandmaster',
    useSearch: true,
    perfectInfo: true,
    hiddenInfo: false,
    timeMs: parseInt(process.env.TIENLEN_FREEZE_MS || '120', 10),
    iterations: parseInt(process.env.TIENLEN_FREEZE_ITERS || '80', 10),
    maxSims: parseInt(process.env.TIENLEN_FREEZE_SIMS || '160', 10),
    bestResponse: false,
    maxBranch: 16,
    exactExploit: true,
    exploit: false,
    mode: 'auto'
  };
}

function freezeExpertMove(state, seat) {
  var key = 'E|' + _stateKey(state, seat);
  if (_brMemo[key] !== undefined) return _brMemo[key];
  var seed = _hashKey(key);
  var saved = Math.random;
  Math.random = function () {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  var mv;
  try {
    mv = freeze.getAIMove(state, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' });
  } finally {
    Math.random = saved;
  }
  if (_brMemoN < 80000) { _brMemo[key] = mv; _brMemoN++; }
  return mv;
}

if (search.setExploitOpponent) {
  search.setExploitOpponent(function (state, seat) {
    return freezeExpertMove(state, seat);
  });
}

function apply(state, cp, choice) {
  const legals = engine.getLegalPlays(
    state.players[cp].hand, state.currentCombo, state.players[cp].passed,
    state.isFirstLead, state.firstLeadCard
  );
  if (!legals.length) return engine.passFast(state, cp);
  if (choice == null) {
    if (!state.currentCombo) return engine.applyPlayFast(state, cp, legals[0]);
    return engine.passFast(state, cp);
  }
  const sig = choice.map(function (c) { return c.rank * 4 + c.suit; })
    .sort(function (a, b) { return a - b; }).join(',');
  const ok = legals.some(function (l) {
    return l.map(function (c) { return c.rank * 4 + c.suit; })
      .sort(function (a, b) { return a - b; }).join(',') === sig;
  });
  return engine.applyPlayFast(state, cp, ok ? choice : legals[0]);
}

function freezeMove(state, seat) {
  var opts = freezeOpts();
  var key = 'G|' + _stateKey(state, seat) + '|' + opts.timeMs + '|' + opts.iterations;
  if (_oppMemo[key] !== undefined) return _oppMemo[key];
  var seed2 = _hashKey(key);
  var saved2 = Math.random;
  Math.random = function () {
    seed2 = (Math.imul(seed2, 1664525) + 1013904223) >>> 0;
    return seed2 / 4294967296;
  };
  var mv2;
  try {
    mv2 = freeze.getAIMove(state, seat, opts);
  } catch (e) {
    mv2 = freeze.getAIMove(state, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' });
  } finally {
    Math.random = saved2;
  }
  if (_oppMemoN < 40000) { _oppMemo[key] = mv2; _oppMemoN++; }
  return mv2;
}

function liveMove(state, seat) {
  try {
    return live.getAIMove(state, seat, liveOpts());
  } catch (e) {
    return null;
  }
}

function play2p(seed) {
  _oppMemo = Object.create(null); _oppMemoN = 0;
  _brMemo = Object.create(null); _brMemoN = 0;
  const liveSeat = seed % 2;
  let state = engine.createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  const t0 = Date.now();
  while (!state.roundOver && steps < 320) {
    const cp = state.currentPlayer;
    const choice = cp === liveSeat ? liveMove(state, cp) : freezeMove(state, cp);
    state = apply(state, cp, choice);
    state.isFirstLead = false;
    steps++;
  }
  let winner;
  if (state.finishOrder && state.finishOrder.length) winner = state.finishOrder[0];
  else if (state.loser === 0) winner = 1;
  else if (state.loser === 1) winner = 0;
  else winner = null;
  return { liveWin: winner === liveSeat, steps: steps, liveSeat: liveSeat, ms: Date.now() - t0 };
}

const per = [];
let liveWins = 0;
const tAll = Date.now();
console.log('=== isolated probe', process.env.PROBE_NAME || '?', 'games=' + games, 'seed0=' + seed0);
console.log('live', live.AI_BUILD);
console.log('live opts', liveOpts());
for (let g = 0; g < games; g++) {
  const seed = seed0 + g * 9973;
  const r = play2p(seed);
  if (r.liveWin) liveWins++;
  per.push({ g, seed, liveWin: !!r.liveWin, liveSeat: r.liveSeat, steps: r.steps, ms: r.ms });
  if ((g + 1) % 5 === 0 || g === games - 1) {
    console.log(JSON.stringify({ games: g + 1, liveWins, liveWinRate: liveWins / (g + 1), ms: Date.now() - tAll }));
  }
}
const out = {
  probe: process.env.PROBE_NAME || null,
  games, liveWins, freezeWins: games - liveWins,
  liveWinRate: liveWins / games, target,
  passed: liveWins / games > target,
  seed0, ms: Date.now() - tAll,
  live: live.AI_BUILD || null,
  liveOpts: liveOpts(),
  perGame: per,
  lossSeeds: per.filter(x => !x.liveWin).map(x => x.seed)
};
const outPath = process.env.TIENLEN_BENCH_OUT || 'probe-out.json';
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('=== FINAL ===');
console.log(JSON.stringify({ probe: out.probe, liveWins, liveWinRate: out.liveWinRate, passed: out.passed }, null, 2));
process.exit(out.passed ? 0 : 1);
JS

cd "$PROBE_DIR"
export TIENLEN_BENCH_GAMES="$GAMES" TIENLEN_BENCH_SEED="$SEED" TIENLEN_TARGET=0.70
export TIENLEN_BENCH_OUT="$SCRATCH/probes/${NAME}-n${GAMES}-v2.json"
export PROBE_NAME="$NAME"
export TIENLEN_V8_MS="${TIENLEN_V8_MS:-280}" TIENLEN_V8_ITERS="${TIENLEN_V8_ITERS:-200}"
export TIENLEN_V8_SIMS="${TIENLEN_V8_SIMS:-480}" TIENLEN_BR_TRIALS="${TIENLEN_BR_TRIALS:-96}"
export TIENLEN_V8_BRANCH="${TIENLEN_V8_BRANCH:-24}"
export TIENLEN_FREEZE_MS="${TIENLEN_FREEZE_MS:-120}"
node run-dual.js 2>&1 | tee "$SCRATCH/probes/${NAME}-n${GAMES}-v2.log"
echo "WROTE $SCRATCH/probes/${NAME}-n${GAMES}-v2.json"
