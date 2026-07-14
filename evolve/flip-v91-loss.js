/**
 * Flip-hunt v9.1 losses vs freeze v90 under GM-ish protocol.
 *
 * For each loss seed:
 *  1. Play baseline (live GM light vs freeze GM light / expert BR)
 *  2. At first live free-lead: try alternate multi + cheap singles
 *  3. At live combat positions: try alternate 2-spend / contest / pass
 *
 * Usage:
 *   SEEDS=20310576,20320549 node evolve/flip-v91-loss.js
 *   TIENLEN_FLIP_MS=80 TIENLEN_FLIP_ITERS=60 node evolve/flip-v91-loss.js
 */
'use strict';

const engine = require('../engine.js');
const search = require('../search.js');
const live = require('../ai.js');
const freeze = require('../policies/v90-ai.js');

const SUIT = ['♠', '♣', '♦', '♥'];
function cardStr(c) {
  const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  return ranks[c.rank] + SUIT[c.suit];
}
function playStr(p) {
  if (!p) return 'PASS';
  return p.map(cardStr).join('');
}
function sigOf(p) {
  if (!p) return 'PASS';
  return p
    .map(function (c) {
      return c.rank * 4 + c.suit;
    })
    .sort(function (a, b) {
      return a - b;
    })
    .join(',');
}

var _brMemo = Object.create(null);
var _brN = 0;
var _gmMemo = Object.create(null);
var _gmN = 0;

function hashKey(str) {
  var h = 2166136261 >>> 0;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}
function stateKey(st, seat) {
  var key =
    seat +
    '|' +
    st.currentPlayer +
    '|' +
    (st.isFirstLead ? 'F' : 'f') +
    '|' +
    (st.lastPlayBy == null ? 'n' : st.lastPlayBy) +
    '|';
  if (st.currentCombo && st.currentCombo.cards) {
    var ids = st.currentCombo.cards
      .map(function (c) {
        return c.rank * 4 + c.suit;
      })
      .sort(function (a, b) {
        return a - b;
      });
    key += st.currentCombo.type + ':' + ids.join(',') + '|';
  } else key += 'L|';
  for (var p = 0; p < st.players.length; p++) {
    var h = st.players[p].hand;
    key += h.length + ':';
    for (var i = 0; i < h.length; i++) key += h[i].rank * 4 + h[i].suit + ',';
    key += st.players[p].passed ? 'P' : 'N';
  }
  return key;
}

function withDet(key, fn) {
  var seed = hashKey(key);
  var sav = Math.random;
  Math.random = function () {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  try {
    return fn();
  } finally {
    Math.random = sav;
  }
}

function freezeExpert(st, seat) {
  var key = 'E|' + stateKey(st, seat);
  if (_brMemo[key] !== undefined) return _brMemo[key];
  var mv = withDet(key, function () {
    return freeze.getAIMove(st, seat, { difficulty: 'easy', iterations: 0, mode: 'expert' });
  });
  if (_brN < 100000) {
    _brMemo[key] = mv;
    _brN++;
  }
  return mv;
}

function freezeGM(st, seat) {
  var ms = parseInt(process.env.TIENLEN_FREEZE_MS || '60', 10);
  var it = parseInt(process.env.TIENLEN_FREEZE_ITERS || '40', 10);
  var key = 'G|' + stateKey(st, seat) + '|' + ms + '|' + it;
  if (_gmMemo[key] !== undefined) return _gmMemo[key];
  var opts = {
    difficulty: 'grandmaster',
    useSearch: true,
    perfectInfo: true,
    hiddenInfo: false,
    timeMs: ms,
    iterations: it,
    maxSims: 120,
    bestResponse: false,
    maxBranch: 14,
    mode: 'auto',
    exactExploit: false,
    exploit: false
  };
  var mv = withDet(key, function () {
    try {
      return freeze.getAIMove(st, seat, opts);
    } catch (e) {
      return freezeExpert(st, seat);
    }
  });
  if (_gmN < 40000) {
    _gmMemo[key] = mv;
    _gmN++;
  }
  return mv;
}

if (search.setExploitOpponent) {
  search.setExploitOpponent(function (s, seat) {
    return freezeExpert(s, seat);
  });
}

function liveOpts() {
  return {
    difficulty: 'grandmaster',
    timeMs: parseInt(process.env.TIENLEN_FLIP_MS || '80', 10),
    iterations: parseInt(process.env.TIENLEN_FLIP_ITERS || '60', 10),
    maxSims: 200,
    brTrials: parseInt(process.env.TIENLEN_BR_TRIALS || '32', 10),
    bestResponse: true,
    useSearch: true,
    perfectInfo: true,
    hiddenInfo: false,
    maxBranch: 16,
    dualSelf: false,
    exactExploit: true,
    mode: 'auto',
    combatRoot: false,
    flRoot: false,
    softSamples: 0,
    exploit: true
  };
}

function liveMove(st, seat) {
  return withDet('L|' + stateKey(st, seat), function () {
    return live.getAIMove(st, seat, liveOpts());
  });
}

function apply(st, cp, ch) {
  const L = engine.getLegalPlays(
    st.players[cp].hand,
    st.currentCombo,
    st.players[cp].passed,
    st.isFirstLead,
    st.firstLeadCard
  );
  if (!L.length) return engine.passFast(st, cp);
  if (ch == null) {
    if (!st.currentCombo) return engine.applyPlayFast(st, cp, L[0]);
    return engine.passFast(st, cp);
  }
  const sig = sigOf(ch);
  const ok = L.find(function (l) {
    return sigOf(l) === sig;
  });
  if (!ok) return engine.passFast(st, cp);
  return engine.applyPlayFast(st, cp, ok);
}

function finishWin(st, seat) {
  let w = null;
  if (st.finishOrder && st.finishOrder.length) w = st.finishOrder[0];
  else if (st.loser === 0) w = 1;
  else if (st.loser === 1) w = 0;
  return w === seat;
}

function clone(st) {
  return engine.cloneState ? engine.cloneState(st) : JSON.parse(JSON.stringify(st));
}

function playFrom(st, seat, forcedFirst, freezeMode) {
  _brMemo = Object.create(null);
  _brN = 0;
  // keep gm memo across to save time if same positions
  let state = clone(st);
  let steps = 0;
  let forced = forcedFirst;
  const useGM = freezeMode !== 'expert';
  while (!state.roundOver && steps < 320) {
    const cp = state.currentPlayer;
    let ch;
    if (cp === seat) {
      if (forced !== undefined && forced !== 'DONE') {
        ch = forced; // may be null = pass
        forced = 'DONE';
      } else ch = liveMove(state, cp);
    } else {
      ch = useGM ? freezeGM(state, cp) : freezeExpert(state, cp);
    }
    state = apply(state, cp, ch);
    state.isFirstLead = false;
    steps++;
  }
  return { win: finishWin(state, seat), steps: steps };
}

function classifyPlay(p, cur) {
  if (!p) return 'pass';
  if (p.some(function (c) {
    return c.rank === 12;
  }))
    return p.length === 1 ? 'two_single' : 'two_multi';
  if (p.length >= 2) return 'multi_' + p.length;
  if (p[0].rank <= 4) return 'trash_single';
  if (p[0].rank <= 8) return 'mid_single';
  return 'high_single';
}

function handBrief(hand) {
  return hand
    .slice()
    .sort(function (a, b) {
      return a.rank - b.rank || a.suit - b.suit;
    })
    .map(cardStr)
    .join(' ');
}

/**
 * Broader 2-tempo gate matching probe-TWO (for combat flip hunting).
 */
function twoTempoWouldFire(hand, cur, omin) {
  if (!cur || cur.type !== 'single') return false;
  var curTop = cur.top ? cur.top.rank : 0;
  if (curTop < 8 || curTop > 10) return false;
  var hasTwo = hand.some(function (c) {
    return c.rank === 12;
  });
  if (!hasTwo) return false;
  var handLen = hand.length;
  // BASE tight: omin<=2, handLen 5-8, need trash
  // TWO broad: omin<=3, handLen 4-9, trash or control>=2
  var trash = 0,
    control = 0;
  for (var i = 0; i < hand.length; i++) {
    if (hand[i].rank <= 4) trash++;
    if (hand[i].rank >= 10) control++;
  }
  var tight =
    omin <= 2 && handLen >= 5 && handLen <= 8 && trash >= 1;
  var broad =
    omin <= 3 &&
    handLen >= 4 &&
    handLen <= 9 &&
    (trash >= 1 || control >= 2);
  return { tight: tight, broad: broad && !tight, any: broad };
}

function analyzeSeed(seed) {
  const seat = seed % 2;
  const freezeMode = process.env.TIENLEN_FLIP_FREEZE || 'gm'; // gm | expert
  const t0 = Date.now();

  // Collect first free-lead state + combat decision points for live
  let st = engine.createGameState(2, seed);
  st.isFirstLead = true;
  let steps = 0;
  let firstFL = null;
  const combatSnaps = [];
  const liveTrace = [];

  _brMemo = Object.create(null);
  _brN = 0;
  _gmMemo = Object.create(null);
  _gmN = 0;

  while (!st.roundOver && steps < 320) {
    const cp = st.currentPlayer;
    if (cp === seat) {
      const cur = st.currentCombo;
      const hand = st.players[seat].hand;
      const omin = Math.min.apply(
        null,
        st.players
          .filter(function (_, i) {
            return i !== seat;
          })
          .map(function (p) {
            return p.hand.length;
          })
      );
      if (!cur && !firstFL) {
        firstFL = {
          state: clone(st),
          hand: handBrief(hand),
          handLen: hand.length,
          omin: omin,
          step: steps
        };
      } else if (cur) {
        const gate = twoTempoWouldFire(hand, cur, omin);
        if (gate.any || combatSnaps.length < 6) {
          combatSnaps.push({
            step: steps,
            state: clone(st),
            hand: handBrief(hand),
            handLen: hand.length,
            omin: omin,
            facing: cur.type + '@' + (cur.top && cur.top.rank),
            curTop: cur.top ? cur.top.rank : 0,
            gate: gate,
            legals: engine
              .getLegalPlays(hand, cur, false, false, null)
              .map(function (p) {
                return { str: playStr(p), cls: classifyPlay(p, cur), sig: sigOf(p) };
              })
          });
        }
      }
    }
    let ch;
    if (cp === seat) ch = liveMove(st, cp);
    else ch = freezeMode === 'expert' ? freezeExpert(st, cp) : freezeGM(st, cp);
    if (cp === seat) {
      liveTrace.push({
        step: steps,
        action: ch ? playStr(ch) : 'PASS',
        cls: classifyPlay(ch, st.currentCombo),
        facing: st.currentCombo
          ? st.currentCombo.type + '@' + (st.currentCombo.top && st.currentCombo.top.rank)
          : 'LEAD',
        handLen: st.players[seat].hand.length
      });
    }
    st = apply(st, cp, ch);
    st.isFirstLead = false;
    steps++;
  }

  const baseWin = finishWin(st, seat);
  const result = {
    seed: seed,
    seat: seat,
    baseWin: baseWin,
    steps: steps,
    ms: Date.now() - t0,
    firstFL: null,
    freeLeadFlips: [],
    combatFlips: [],
    twoTempoMissed: [],
    liveTrace: liveTrace.slice(0, 24)
  };

  if (!firstFL) {
    console.log(JSON.stringify(result));
    return result;
  }

  const baseChoice = liveMove(firstFL.state, seat);
  result.firstFL = {
    step: firstFL.step,
    hand: firstFL.hand,
    handLen: firstFL.handLen,
    omin: firstFL.omin,
    base: playStr(baseChoice),
    baseCls: classifyPlay(baseChoice, null)
  };

  // Free-lead candidates: multis + cheap singles
  const L = engine.getLegalPlays(
    firstFL.state.players[seat].hand,
    null,
    false,
    firstFL.state.isFirstLead,
    firstFL.state.firstLeadCard
  );
  const cands = [];
  for (let i = 0; i < L.length; i++) {
    const p = L[i];
    if (p.length >= 2 || (p.length === 1 && p[0].rank <= 11)) cands.push(p);
  }
  cands.sort(function (a, b) {
    return b.length - a.length || a[0].rank - b[0].rank || a[0].suit - b[0].suit;
  });
  // de-dupe by sig, skip base
  const baseSig = sigOf(baseChoice);
  const seen = Object.create(null);
  seen[baseSig] = 1;
  const tryN = Math.min(cands.length, parseInt(process.env.TIENLEN_FLIP_CANDS || '16', 10));
  let tried = 0;
  for (let i = 0; i < cands.length && tried < tryN; i++) {
    const p = cands[i];
    const sg = sigOf(p);
    if (seen[sg]) continue;
    seen[sg] = 1;
    tried++;
    const r = playFrom(firstFL.state, seat, p, freezeMode);
    if (r.win) {
      result.freeLeadFlips.push({
        play: playStr(p),
        cls: classifyPlay(p, null),
        len: p.length,
        ranks: p.map(function (c) {
          return c.rank;
        })
      });
    }
  }

  // Combat: positions where broader 2-tempo would fire but tight wouldn't
  for (let ci = 0; ci < combatSnaps.length; ci++) {
    const snap = combatSnaps[ci];
    if (!snap.gate.broad) continue;
    // find a legal single-2
    const twoPlay = snap.legals.find(function (x) {
      return x.cls === 'two_single';
    });
    if (!twoPlay) continue;
    result.twoTempoMissed.push({
      step: snap.step,
      facing: snap.facing,
      handLen: snap.handLen,
      omin: snap.omin,
      hand: snap.hand
    });
    // force play 2
    const twoCards = snap.state.players[seat].hand.filter(function (c) {
      return c.rank === 12;
    });
    if (!twoCards.length) continue;
    // pick lowest suit 2 that is legal
    const leg = engine.getLegalPlays(
      snap.state.players[seat].hand,
      snap.state.currentCombo,
      false,
      false,
      null
    );
    const forced2 = leg.find(function (p) {
      return p.length === 1 && p[0].rank === 12;
    });
    if (!forced2) continue;
    const r2 = playFrom(snap.state, seat, forced2, freezeMode);
    if (r2.win) {
      result.combatFlips.push({
        kind: 'force_two_tempo',
        step: snap.step,
        facing: snap.facing,
        play: playStr(forced2),
        handLen: snap.handLen,
        omin: snap.omin
      });
    }
  }

  // Also try force-contest (no pass) at first few combat snaps where baseline may pass
  for (let ci = 0; ci < Math.min(4, combatSnaps.length); ci++) {
    const snap = combatSnaps[ci];
    const leg = engine.getLegalPlays(
      snap.state.players[seat].hand,
      snap.state.currentCombo,
      false,
      false,
      null
    );
    if (!leg.length) continue;
    // try cheapest non-2 legal
    const non2 = leg
      .filter(function (p) {
        return !p.some(function (c) {
          return c.rank === 12;
        });
      })
      .sort(function (a, b) {
        return a.length - b.length || a[0].rank - b[0].rank;
      });
    if (!non2.length) continue;
    const forced = non2[0];
    // only if baseline would pass? re-get baseline at snap
    const baseCombat = liveMove(snap.state, seat);
    if (baseCombat != null) continue; // already contesting
    const rc = playFrom(snap.state, seat, forced, freezeMode);
    if (rc.win) {
      result.combatFlips.push({
        kind: 'force_contest_vs_pass',
        step: snap.step,
        facing: snap.facing,
        play: playStr(forced),
        handLen: snap.handLen,
        omin: snap.omin
      });
    }
  }

  result.ms = Date.now() - t0;
  console.log(JSON.stringify(result));
  return result;
}

const defaultSeeds = [
  20310576, 20320549, 20350468, 20380387, 20470144, 20490090, 20510036, 20539955
];
const seeds = (process.env.SEEDS || defaultSeeds.join(','))
  .split(',')
  .map(Number)
  .filter(Boolean);

console.error(
  'flip-v91-loss seeds=' +
    seeds.length +
    ' freeze=' +
    (process.env.TIENLEN_FLIP_FREEZE || 'gm') +
    ' liveMs=' +
    (process.env.TIENLEN_FLIP_MS || '80')
);

const all = [];
for (let i = 0; i < seeds.length; i++) {
  console.error('--- seed ' + seeds[i] + ' (' + (i + 1) + '/' + seeds.length + ') ---');
  all.push(analyzeSeed(seeds[i]));
}

const summary = {
  n: all.length,
  stillLose: all.filter(function (r) {
    return !r.baseWin;
  }).length,
  freeLeadFlipSeeds: all
    .filter(function (r) {
      return r.freeLeadFlips && r.freeLeadFlips.length;
    })
    .map(function (r) {
      return {
        seed: r.seed,
        n: r.freeLeadFlips.length,
        samples: r.freeLeadFlips.slice(0, 4),
        base: r.firstFL && r.firstFL.base,
        baseCls: r.firstFL && r.firstFL.baseCls
      };
    }),
  combatFlipSeeds: all
    .filter(function (r) {
      return r.combatFlips && r.combatFlips.length;
    })
    .map(function (r) {
      return { seed: r.seed, flips: r.combatFlips };
    }),
  twoTempoMissed: all
    .filter(function (r) {
      return r.twoTempoMissed && r.twoTempoMissed.length;
    })
    .map(function (r) {
      return { seed: r.seed, n: r.twoTempoMissed.length, samples: r.twoTempoMissed.slice(0, 3) };
    }),
  baseLeadClasses: all.map(function (r) {
    return { seed: r.seed, baseWin: r.baseWin, lead: r.firstFL && r.firstFL.baseCls };
  })
};
console.log('SUMMARY ' + JSON.stringify(summary, null, 2));
