/**
 * Tiến Lên Search — Grandmaster core
 *
 * Flat Monte Carlo + UCT MCTS with:
 *  - Expert rollout policy (structure-aware)
 *  - Multi-player place utilities (1st/2nd/3rd/4th)
 *  - Optional determinization for hidden-info
 *  - Time budgets suitable for browser (hard ~1–3s)
 *
 * Pure JS, Node v10+ and browser. Depends on engine (+ optional AI helpers).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../engine.js'));
  } else {
    root.TienLenSearch = factory(root.TienLenEngine);
  }
}(typeof self !== 'undefined' ? self : this, function (engine) {

  var detectCombo = engine.detectCombo;
  var getLegalPlays = engine.getLegalPlays;
  var cloneStateFast = engine.cloneStateFast || engine.cloneState;
  var applyPlayFast = engine.applyPlayFast || engine.applyPlay;
  var passFast = engine.passFast || engine.pass;
  var cardCompare = engine.cardCompare;

  // ─── Place utility (higher = better for the maximizing player) ───
  var PLACE_SCORE = [1.0, 0.55, 0.25, 0.0]; // 1st..4th

  function placeUtility(state, myIdx) {
    if (state.players[myIdx].finished) {
      var order = state.finishOrder || [];
      var place = order.indexOf(myIdx);
      if (place < 0) return 0.4;
      return PLACE_SCORE[Math.min(place, 3)] || 0;
    }
    if (state.roundOver && state.loser === myIdx) return 0;
    // Incomplete: estimate from remaining cards + finish slots
    var n = state.players.length;
    var finished = (state.finishOrder || []).length;
    var myLen = state.players[myIdx].hand.length;
    var worse = 0;
    var better = 0;
    for (var i = 0; i < n; i++) {
      if (i === myIdx || state.players[i].finished) continue;
      if (state.players[i].hand.length < myLen) better++;
      else if (state.players[i].hand.length > myLen) worse++;
    }
    // Soft rank estimate among remaining
    var remainingSlots = n - finished;
    var estPlace = finished + better; // rough
    var base = PLACE_SCORE[Math.min(estPlace, 3)] || 0.1;
    // Prefer fewer cards left
    base += Math.max(0, (8 - myLen) * 0.015);
    base += worse * 0.02;
    return Math.max(0, Math.min(1, base));
  }

  function finalUtility(state, myIdx) {
    var nP = state.players.length;
    if (state.players[myIdx].finished) {
      var place = (state.finishOrder || []).indexOf(myIdx);
      if (place < 0) return 0.35;
      // 2p: hard win/loss (soft place scores dilute search signal)
      if (nP === 2) return place === 0 ? 1 : 0;
      return PLACE_SCORE[Math.min(place, 3)] || 0;
    }
    if (state.roundOver) {
      if (nP === 2) return state.loser === myIdx ? 0 : 1;
      return 0;
    }
    return placeUtility(state, myIdx);
  }

  // ─── Play helpers ───
  function playSig(play) {
    if (play == null) return 'PASS';
    var ids = [];
    for (var i = 0; i < play.length; i++) ids.push(play[i].rank * 4 + play[i].suit);
    ids.sort(function (a, b) { return a - b; });
    return ids.join(',');
  }

  function playHasTwo(play) {
    if (!play) return false;
    for (var i = 0; i < play.length; i++) if (play[i].rank === 12) return true;
    return false;
  }

  function isBombCombo(com) {
    if (!com) return false;
    return com.type === 'quad' || (com.type === 'doubleseq' && com.numPairs >= 3);
  }

  function playIsBomb(play) {
    return isBombCombo(detectCombo(play));
  }

  function playIsExpensive(play) {
    return playHasTwo(play) || playIsBomb(play);
  }

  function cheapLegals(legals) {
    var out = [];
    for (var i = 0; i < legals.length; i++) {
      if (!playIsExpensive(legals[i])) out.push(legals[i]);
    }
    return out;
  }

  function comboPriority(type) {
    if (type === 'quad') return 6;
    if (type === 'doubleseq') return 5;
    if (type === 'triple') return 4;
    if (type === 'seq') return 3;
    if (type === 'pair') return 2;
    return 1;
  }

  function topRank(play) {
    var c = detectCombo(play);
    return c && c.top ? c.top.rank : 99;
  }

  function oppMinHand(state, myIdx) {
    var m = 99;
    for (var i = 0; i < state.players.length; i++) {
      if (i !== myIdx && !state.players[i].finished) {
        m = Math.min(m, state.players[i].hand.length);
      }
    }
    return m;
  }

  /**
   * Structure cost: how much a play damages remaining hand flexibility.
   * Higher cost = worse (breaks pairs/seqs). Gold: never smash structure for min-beat.
   */
  function structureBreakCost(hand, play) {
    var byRank = {};
    for (var i = 0; i < hand.length; i++) {
      var r = hand[i].rank;
      byRank[r] = (byRank[r] || 0) + 1;
    }
    var cost = 0;
    var playRanks = {};
    for (var j = 0; j < play.length; j++) {
      var pr = play[j].rank;
      playRanks[pr] = (playRanks[pr] || 0) + 1;
    }
    var keys = Object.keys(playRanks);
    for (var k = 0; k < keys.length; k++) {
      var rk = +keys[k];
      var used = playRanks[rk];
      var left = (byRank[rk] || 0) - used;
      var had = byRank[rk] || 0;
      // Breaking a pair into a single — expensive, but less than breaking runs
      if (had >= 2 && left === 1 && used === 1) cost += 3.5;
      // Breaking a pair entirely when not playing the full pair
      if (had >= 2 && used === 1 && left === 0) cost += 3;
      // Breaking a triple
      if (had >= 3 && left > 0 && left < 3 && used < had) cost += 5;
      // Breaking sequence links
      if (left === 0 || (had >= 2 && left === 1)) {
        if (byRank[rk - 1] && byRank[rk + 1]) cost += 4;
        else if (byRank[rk - 1] || byRank[rk + 1]) cost += 1.5;
      }
    }
    // Full multi that is a clean combo from hand is low structure cost (already accounted)
    return cost;
  }

  function countTwos(hand) {
    var n = 0;
    for (var i = 0; i < hand.length; i++) if (hand[i].rank === 12) n++;
    return n;
  }

  function isLooseSingle(hand, play) {
    if (!play || play.length !== 1) return false;
    var r = play[0].rank;
    var cnt = 0;
    for (var i = 0; i < hand.length; i++) if (hand[i].rank === r) cnt++;
    return cnt === 1;
  }

  /** True if singleton rank is the bottom of a 3+ consecutive run (don't peel). */
  function handHasRunStart(hand, rank) {
    var by = {};
    for (var i = 0; i < hand.length; i++) by[hand[i].rank] = (by[hand[i].rank] || 0) + 1;
    if ((by[rank] || 0) !== 1) return false; // only singleton peels are "run starts"
    return !!(by[rank + 1] && by[rank + 2]);
  }

  /**
   * Hand structure analysis for trash/control planning (general features).
   * trash: isolated singles rank≤9 not inside a ≥3 run.
   */
  function analyzeHand(hand) {
    var byRank = {};
    var i, r;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byRank[r] = (byRank[r] || 0) + 1;
    }
    var ranks = Object.keys(byRank).map(Number).sort(function (a, b) { return a - b; });
    var inSeq = {};
    for (var len = 3; len <= ranks.length; len++) {
      for (var st = 0; st <= ranks.length - len; st++) {
        var ok = true;
        for (var k = 1; k < len; k++) {
          if (ranks[st + k] !== ranks[st] + k) { ok = false; break; }
        }
        if (!ok) continue;
        for (k = 0; k < len; k++) inSeq[ranks[st + k]] = true;
      }
    }
    var trash = [];
    var control = 0;
    var twos = 0;
    for (i = 0; i < hand.length; i++) {
      var c = hand[i];
      if (c.rank === 12) twos++;
      if (c.rank >= 10) control++;
      if (byRank[c.rank] === 1 && !inSeq[c.rank] && c.rank <= 9) trash.push(c);
    }
    trash.sort(function (a, b) { return a.rank - b.rank || a.suit - b.suit; });
    return {
      byRank: byRank,
      trash: trash,
      trashCount: trash.length,
      twos: twos,
      control: control,
      hasControl: twos >= 1 || control >= 2
    };
  }

  function isTrashSinglePlay(play, handInfo) {
    if (!play || play.length !== 1) return false;
    var c = play[0];
    for (var i = 0; i < handInfo.trash.length; i++) {
      if (handInfo.trash[i].rank === c.rank && handInfo.trash[i].suit === c.suit) return true;
    }
    return false;
  }

  /**
   * Expert move score for ordering / rollouts. Lower is better.
   * Superhuman goal: gold structure/control prior (general features, not byR fingerprints).
   */
  function expertScore(play, state, myIdx) {
    var hand = state.players[myIdx].hand;
    var cur = state.currentCombo;
    var com = detectCombo(play);
    if (!com) return 1e9;

    var score = 0;
    var usesTwo = playHasTwo(play);
    var bomb = isBombCombo(com);
    var facing2 = cur && cur.cards.every(function (c) { return c.rank === 12; });
    var afterLen = hand.length - play.length;
    var omin = oppMinHand(state, myIdx);
    var twos = countTwos(hand);
    var sbreak = structureBreakCost(hand, play);

    if (afterLen === 0) return -10000; // go out immediately

    score += afterLen * 0.8;
    score += sbreak * 6.5; // gold: structure >> min-top

    if (!cur) {
      // Free lead
      score -= comboPriority(com.type) * 12;
      score -= play.length * 4;
      score += topRank(play) * 0.35;

      // Prefer doubleseq lock packages (gold 0506/0507)
      if (com.type === 'doubleseq' && play.length >= 6) score -= 55;

      // Trash-first singles when have control (2s) and loose low trash (gold 0514/0531/0540)
      if (com.type === 'single' && isLooseSingle(hand, play)) {
        // Trash-first only for true low deadwood (3–6), not mid 7–9 (gold 0514 vs 0517)
        if (play[0].rank <= 3 && (twos >= 1 || hand.length >= 7)) score -= 34;
        else if (play[0].rank <= 5 && twos >= 1 && hand.length >= 8) score -= 10;
        else if (play[0].rank >= 6 && play[0].rank <= 8) score += 8; // mid loose: prefer multi first
        else score += 4;
        if (play[0].rank >= 10) score += 24;
        if (play[0].rank === 12) {
          // Free-lead lone 2: only vs very short opp/hand (gold 0499)
          if (omin <= 2 && hand.length <= 4) score -= 55;
          else if (omin <= 2 && hand.length <= 5) score -= 25;
          else score += 60;
        }
      } else if (com.type === 'pair') {
        // Low pairs good free-lead (gold P3); high pairs later
        if (topRank(play) <= 4) score -= 26;
        else if (topRank(play) <= 7) score -= 12;
        else if (topRank(play) >= 10) score += 22;
        if (topRank(play) === 12) {
          // pair of 2s free-lead only when short hand (gold 0518)
          if (hand.length <= 4) score -= 60;
          else score += 45;
        }
        // Don't free-lead mid pair when a lone 2 is better vs short opp (0499: 2 over 66)
        if (topRank(play) <= 6 && twos >= 1 && omin <= 2 && hand.length <= 4) score += 35;
        // Series 4/5: low-pair open when deep + control-backed (0526/0535/0542/0561)
        if (hand.length >= 9 && topRank(play) <= 6) {
          var hiPairs = 0;
          var byP = {};
          for (var pi = 0; pi < hand.length; pi++) {
            byP[hand[pi].rank] = (byP[hand[pi].rank] || 0) + 1;
          }
          for (var pr = 9; pr <= 11; pr++) if ((byP[pr] || 0) >= 2) hiPairs++;
          if (twos >= 1 || hiPairs >= 1) score -= 18;
        }
      } else {
        // multi: prefer mid length residual
        if (play.length >= 3 && play.length <= 6) score -= 12;
        if (topRank(play) <= 9) score -= 8;
        // Control-backed deep hand: tax mid multi that risks control when low pair exists
        if (hand.length >= 9 && twos >= 1 && com.type === 'seq' && play.length >= 3 && play.length <= 5) {
          var hasLowPair = false;
          var byM = {};
          for (var mi = 0; mi < hand.length; mi++) byM[hand[mi].rank] = (byM[hand[mi].rank] || 0) + 1;
          for (var lr = 0; lr <= 6; lr++) if ((byM[lr] || 0) >= 2) { hasLowPair = true; break; }
          if (hasLowPair && topRank(play) >= 7 && topRank(play) <= 10) score += 14;
        }
        // Prefer residual that keeps a clean high run edge (gold 0517: 10-J-Q-K)
        if (com.type === 'seq' && play.length === 4) {
          var lo = 99;
          for (var qi = 0; qi < play.length; qi++) lo = Math.min(lo, play[qi].rank);
          if (lo >= 6 && lo <= 8 && topRank(play) >= 9) score -= 55; // TJQK-like
          if (lo >= 3 && lo <= 5 && topRank(play) <= 8) score -= 20;
          if (lo >= 3 && lo <= 5 && topRank(play) <= 8 && omin <= 1) score -= 45; // 6789 vs 1-card
        }
        // Combat multi: prefer seq that preserves lower pairs (gold 0519 TJQ over 9TJ)
        if (cur && com.type === 'seq' && play.length === 3) {
          var lo2 = 99;
          for (var qj = 0; qj < play.length; qj++) lo2 = Math.min(lo2, play[qj].rank);
          if (lo2 >= 7 && sbreak < 4) score -= 25;
          if (lo2 <= 6 && sbreak >= 4) score += 15;
        }
        if (com.type === 'seq' && play.length >= 5 && omin > 2) score += 8;
        // Free-lead long multi vs 1-card opp is excellent (0521)
        if (omin <= 1 && play.length >= 4) score -= 55;
        if (omin <= 1 && com.type === 'single' && play[0].rank < 10) score += 20;
      }
      if (usesTwo && com.type === 'single') {
        if (!(omin <= 2 && hand.length <= 5)) score += 40;
      }
      if (bomb) score += 40;
    } else {
      // Combat
      var curTop = cur.top ? cur.top.rank : 0;
      score += topRank(play) * 0.5;
      score += play.length * 0.1;

      // Prefer loose min-beats over structure smashes (gold 0498/0502/0505/0520b)
      if (com.type === 'single' && cur.type === 'single') {
        var gap2 = com.top.rank - curTop;
        if (isLooseSingle(hand, play)) {
          score -= 18;
          // Prefer moderate min-beats, but keep high loose A/K as better than mid that breaks runs
          if (gap2 >= 1 && gap2 <= 3) score -= 12;
          else if (gap2 >= 4 && gap2 <= 6) score -= 4;
          // Gold 0498: prefer loose A over mid loose that is weaker control? Actually prefer A over 8 when both loose
          // Use residual quality: higher loose as "control reserve" is OK when structure break would be worse
          if (com.top.rank === 11 && sbreak < 2) score -= 20; // A as clean beat
          if (com.top.rank === 10 && sbreak < 2 && curTop <= 5) score -= 14; // K
          // Prefer not to peel run starts (gold 0520b: 7 not 6 from 6789)
          if (handHasRunStart(hand, com.top.rank)) score += 22;
          // Prefer card from a pair over singleton run-start when both beat
          var cntR = 0;
          for (var ci = 0; ci < hand.length; ci++) if (hand[ci].rank === com.top.rank) cntR++;
          if (cntR >= 2 && gap2 >= 1) score -= 40; // pair-split min-beat (0520b/P1)
          if (cntR >= 2 && handHasRunStart(hand, com.top.rank - 1)) score -= 12; // preserves lower run
        } else {
          score += 12; // structure smash penalty
        }
        if (gap2 > 6 && com.top.rank >= 9 && !usesTwo) score += gap2 * 0.5;
        if (!usesTwo && sbreak >= 4) score += 10;
      }

      // 2-budget (gold): spend 2 vs high tops / omin=1 / when non-2 alts smash high structure
      if (usesTwo && !facing2) {
        var pen = 50;
        if (curTop >= 10) pen = -12;
        else if (curTop === 9) pen = -6; // vs Q: 2 preferred over K-from-JQK (0500/P5)
        else if (curTop >= 8) pen = 12;
        if (omin <= 1) pen = -40;
        else if (omin <= 2 && curTop >= 9) pen = Math.min(pen, -4);
        if (hand.length <= 4) pen = Math.min(pen, 2);
        if (play.length === 2 && com.type === 'pair') pen += 20;
        if (play.length === 1) pen -= 4; // single 2 better than pair-2 for control beats
        score += pen;
      } else if (!usesTwo && com.type === 'single' && cur && cur.type === 'single') {
        // Penalize K/A peel from JQK when 2 available (0500)
        var tw = countTwos(hand);
        if (tw >= 1 && com.top.rank >= 9 && curTop >= 8 && sbreak >= 3) score += 25;
        if (tw >= 1 && com.top.rank >= 10 && curTop === 9) score += 30;
      }

      if (bomb && !facing2) score += 50;
      if (facing2 && bomb) score -= 35;

      // Pass-friendly: high multi as only answer is scored worse so pass can win when we filter
      if (com.type === 'seq' && play.length >= 3 && sbreak >= 4) score += 20;
      if (com.type === 'pair' && topRank(play) >= 10 && sbreak >= 4) score += 12;
    }

    if (omin <= 1) {
      score -= play.length * 5;
      if (usesTwo) score -= 30;
      if (com.type === 'seq' && play.length >= 4) score -= 20;
    } else if (omin <= 2) {
      score -= play.length * 2;
      if (usesTwo) score -= 10;
    }
    if (hand.length <= 3) score -= 10;

    return score;
  }

  function orderLegals(legals, state, myIdx) {
    return legals.slice().sort(function (a, b) {
      return expertScore(a, state, myIdx) - expertScore(b, state, myIdx);
    });
  }

  /**
   * Expert policy move for rollouts (and fair fallback).
   * Returns { play: cards } or { pass: true }.
   */
  function expertPolicy(state, cp) {
    var hand = state.players[cp].hand;
    var cur = state.currentCombo;
    var leg = getLegalPlays(hand, cur, state.players[cp].passed, state.isFirstLead, state.firstLeadCard);
    if (!leg.length) return { pass: true };

    // Immediate go-out
    for (var i = 0; i < leg.length; i++) {
      if (leg[i].length === hand.length) return { play: leg[i] };
    }

    var omin = oppMinHand(state, cp);
    var handLen = hand.length;
    var twos = countTwos(hand);

    if (!cur) {
      var pool = leg;
      if (state.isFirstLead && state.firstLeadCard) {
        var fl = [];
        var fr = state.firstLeadCard.rank;
        var fs = state.firstLeadCard.suit;
        for (var fi = 0; fi < leg.length; fi++) {
          for (var fj = 0; fj < leg[fi].length; fj++) {
            if (leg[fi][fj].rank === fr && leg[fi][fj].suit === fs) {
              fl.push(leg[fi]);
              break;
            }
          }
        }
        if (fl.length) pool = fl;
      }
      return { play: pickFreeLeadHard(pool, state, cp) };
    }

    var curTop = cur.top ? cur.top.rank : 0;

    // Bombs vs 2s
    if (cur.cards.every(function (c) { return c.rank === 12; })) {
      var bombs = [];
      for (var b = 0; b < leg.length; b++) if (playIsBomb(leg[b])) bombs.push(leg[b]);
      if (bombs.length) return { play: orderLegals(bombs, state, cp)[0] };
    }

    // HARD: vs Ace single always spend 2 if held (before any safe Ace-climb)
    if (cur.type === 'single' && curTop === 11) {
      for (var a2 = 0; a2 < leg.length; a2++) {
        if (leg[a2].length === 1 && leg[a2][0].rank === 12) return { play: leg[a2] };
      }
    }

    var ordered = orderLegals(leg, state, cp);
    var best = ordered[0];
    var bestBreak = structureBreakCost(hand, best);

    var twoPlays = [];
    for (var t = 0; t < leg.length; t++) if (playHasTwo(leg[t])) twoPlays.push(leg[t]);

    // HARD gold 0520b/P1: if lowest legal single is a run-start singleton,
    // prefer a nearby pair-split single instead (7 from 77 over 6 from 6789).
    // Do NOT auto-climb A/K when single-2 held vs high combat (2-for-control).
    if (cur.type === 'single' && omin > 1) {
      var singles = [];
      var hasSingleTwoEarly = false;
      for (var p1 = 0; p1 < leg.length; p1++) {
        if (leg[p1].length === 1 && leg[p1][0].rank === 12) hasSingleTwoEarly = true;
        if (leg[p1].length === 1 && !playHasTwo(leg[p1])) singles.push(leg[p1]);
      }
      singles.sort(function (a, b) { return a[0].rank - b[0].rank; });
      if (singles.length) {
        var low = singles[0];
        var lowR = low[0].rank;
        var lowCnt = 0;
        for (var h1 = 0; h1 < hand.length; h1++) if (hand[h1].rank === lowR) lowCnt++;
        if (lowCnt === 1 && handHasRunStart(hand, lowR)) {
          var deferHighClimb = hasSingleTwoEarly && curTop >= 9;
          if (!deferHighClimb) {
            // Prefer high loose A then K first (gold 0502) on low/mid combat only
            for (var prefR = 11; prefR >= 10; prefR--) {
              for (var p3 = 0; p3 < singles.length; p3++) {
                if (singles[p3][0].rank === prefR) return { play: singles[p3] };
              }
            }
          }
          // Prefer nearby pair-split first (0520b: 7 from 77), else mid loose (0505: 8)
          var nearPair = null;
          var midNR = null;
          for (var p2 = 0; p2 < singles.length; p2++) {
            var r2 = singles[p2][0].rank;
            if (handHasRunStart(hand, r2) || r2 >= 12) continue;
            var c2 = 0;
            for (var h2 = 0; h2 < hand.length; h2++) if (hand[h2].rank === r2) c2++;
            if (c2 >= 2 && r2 === lowR + 1 && !nearPair) nearPair = singles[p2];
            if (r2 >= 5 && r2 <= 9 && (c2 === 1 || c2 >= 3) && !midNR) midNR = singles[p2];
          }
          if (nearPair) return { play: nearPair };
          if (midNR) return { play: midNR };
        }
      }
    }

    // Combat seq answers (gold 0519) — only when seq is a good residual; else may pass (0510)
    if (cur.type === 'seq' || (cur.size && cur.size >= 3)) {
      var seqAns = [];
      for (var sa = 0; sa < leg.length; sa++) {
        var sac = detectCombo(leg[sa]);
        if (sac && sac.type === 'seq' && leg[sa].length >= 3) seqAns.push(leg[sa]);
      }
      if (seqAns.length) {
        seqAns.sort(function (a, b) {
          var loA = 99, loB = 99;
          for (var ia = 0; ia < a.length; ia++) loA = Math.min(loA, a[ia].rank);
          for (var ib = 0; ib < b.length; ib++) loB = Math.min(loB, b[ib].rank);
          var pref = function (lo) { return Math.abs(lo - 7); };
          return pref(loA) - pref(loB) || expertScore(a, state, cp) - expertScore(b, state, cp);
        });
        var bestSeq = seqAns[0];
        // Gold 0510: pass rather than QKA when holding low pairs + 2s and deep
        var loS = 99;
        for (var ls = 0; ls < bestSeq.length; ls++) loS = Math.min(loS, bestSeq[ls].rank);
        if (loS >= 9 && twos >= 1 && handLen >= 9 && omin >= 5) {
          return { pass: true };
        }
        return { play: bestSeq };
      }
    }

    // Hard: omin=1 → prefer single 2 if legal (gold 0520a)
    if (omin <= 1) {
      for (var z = 0; z < twoPlays.length; z++) {
        if (twoPlays[z].length === 1) return { play: twoPlays[z] };
      }
      if (twoPlays.length) return { play: orderLegals(twoPlays, state, cp)[0] };
      // else longest/high multi to clear pressure
      return { play: ordered[0] };
    }

    // Prefer structure-safe non-2 beats (exclude high-run peels when 2 held — gold 0500/P5)
    var safe = [];
    for (var s = 0; s < leg.length; s++) {
      if (playHasTwo(leg[s])) continue;
      var brk = structureBreakCost(hand, leg[s]);
      // allow pair-split singles only when a run-start alternative exists (0520b)
      var isPairSplitSingle = false;
      if (leg[s].length === 1 && brk >= 3 && brk < 10) {
        var hasRunAlt = false;
        for (var ra = 0; ra < leg.length; ra++) {
          if (leg[ra].length === 1 && handHasRunStart(hand, leg[ra][0].rank) &&
              leg[ra][0].rank !== leg[s][0].rank) {
            hasRunAlt = true;
            break;
          }
        }
        isPairSplitSingle = hasRunAlt;
      }
      if (brk >= 3 && !isPairSplitSingle) continue;
      var sc0 = detectCombo(leg[s]);
      if (sc0 && sc0.type === 'single' && sc0.top.rank >= 9 && twos >= 1 && curTop >= 8) {
        var byTmp = {};
        for (var hi = 0; hi < hand.length; hi++) byTmp[hand[hi].rank] = 1;
        if (sc0.top.rank >= 9 && (byTmp[sc0.top.rank - 1] || byTmp[sc0.top.rank - 2])) continue;
      }
      safe.push(leg[s]);
    }
    // Collect single-2 answers before safe return
    var singleTwos = [];
    for (var u0 = 0; u0 < twoPlays.length; u0++) {
      if (twoPlays[u0].length === 1) singleTwos.push(twoPlays[u0]);
    }
    // 2-for-control (author gold 0563/0569/0574/0584/0593/0604): vs high single,
    // spend single 2 BEFORE safe non-2 return (was killing 2-tempo forever).
    if (singleTwos.length && cur.type === 'single' && curTop >= 9) {
      var hasTrueTrashAns = false;
      for (var st0 = 0; st0 < safe.length; st0++) {
        if (safe[st0].length === 1 && safe[st0][0].rank <= 6 &&
            structureBreakCost(hand, safe[st0]) < 2) {
          hasTrueTrashAns = true;
          break;
        }
      }
      var minSafeSbc = 99;
      for (var ss = 0; ss < safe.length; ss++) {
        minSafeSbc = Math.min(minSafeSbc, structureBreakCost(hand, safe[ss]));
      }
      if (!hasTrueTrashAns || omin <= 3 || handLen <= 8 || minSafeSbc >= 2) {
        return { play: singleTwos[0] };
      }
    }

    if (safe.length) {
      var refined = safe.slice();
      if (cur.type === 'single' && omin > 1) {
        var pairSplits = [];
        var nonRun = [];
        for (var rs = 0; rs < safe.length; rs++) {
          if (safe[rs].length !== 1) continue;
          var rr = safe[rs][0].rank;
          var cnt = 0;
          for (var h = 0; h < hand.length; h++) if (hand[h].rank === rr) cnt++;
          if (cnt >= 2) pairSplits.push(safe[rs]);
          else if (!handHasRunStart(hand, rr)) nonRun.push(safe[rs]);
        }
        // Prefer non-run loose singles over pair-splits when available (0498 A);
        // among loose, use expertScore (0512 prefers 10 over A via scoring).
        // Prefer pair-split over run-start only when no good loose (0520b).
        if (nonRun.length) {
          refined = nonRun;
        } else if (pairSplits.length) {
          pairSplits.sort(function (a, b) { return a[0].rank - b[0].rank; });
          refined = [pairSplits[0]];
        }
      }
      var sb = orderLegals(refined.length ? refined : safe, state, cp)[0];
      var scom = detectCombo(sb);
      if (scom && scom.type === 'pair' && topRank(sb) >= 9 && handLen >= 9 && omin >= 5 && curTop <= 9) {
        if (twos >= 1) return { pass: true };
      }
      return { play: sb };
    }

    // Only 2s / structure smashes left
    // Never open pair-of-2s midgame when deep (gold 0511)
    // singleTwos already collected above
    // Pair-of-2s is almost never correct midgame with deep hand (gold 0511)
    if (twoPlays.length && handLen >= 8 && omin >= 4) {
      var onlyPairTwos = true;
      for (var w = 0; w < twoPlays.length; w++) {
        if (twoPlays[w].length === 1) { onlyPairTwos = false; break; }
      }
      // Also check non-two structure smashes — if those are only alts, still pass
      if (onlyPairTwos && curTop <= 11) return { pass: true };
    }
    // vs Q/K/A: if best non-2 smashes structure, spend single 2 (0500/P5/0513)
    if (singleTwos.length && cur.type === 'single' && curTop >= 9) {
      var bestNon2 = null;
      var bestNon2Break = 0;
      for (var x = 0; x < ordered.length; x++) {
        if (!playHasTwo(ordered[x])) {
          bestNon2 = ordered[x];
          bestNon2Break = structureBreakCost(hand, ordered[x]);
          break;
        }
      }
      if (!bestNon2 || bestNon2Break >= 3 || (bestNon2 && bestNon2[0] && bestNon2[0].rank >= 10)) {
        return { play: singleTwos[0] };
      }
    }
    if (curTop >= 10 || omin <= 2 || handLen <= 6) {
      if (singleTwos.length) return { play: singleTwos[0] };
      for (var v = 0; v < twoPlays.length; v++) {
        if (twoPlays[v].length === 1) return { play: twoPlays[v] };
        if (twoPlays[v].length === 2 && handLen <= 5) return { play: twoPlays[v] };
      }
    }
    // Pass only when every non-2 legal is a heavy structure smash (not when safe mid singles exist)
    if (handLen >= 8 && omin >= 5 && curTop <= 8 && twos >= 1) {
      var anyCheap = false;
      for (var ac = 0; ac < leg.length; ac++) {
        if (!playHasTwo(leg[ac]) && structureBreakCost(hand, leg[ac]) < 4) {
          anyCheap = true;
          break;
        }
      }
      if (!anyCheap) return { pass: true };
    }

    // Midgame pass when best is expensive high multi only
    if (handLen > 9 && omin > 5 && curTop < 8 && bestBreak >= 8) {
      return { pass: true };
    }

    // Prefer single 2 over Ace-climb vs Ace (always)
    if (cur.type === 'single' && curTop === 11) {
      for (var at = 0; at < leg.length; at++) {
        if (leg[at].length === 1 && leg[at][0].rank === 12) return { play: leg[at] };
      }
    }
    if (cur.type === 'single' && curTop === 11 && singleTwos.length) {
      return { play: singleTwos[0] };
    }

    return { play: ordered[0] };
  }

  /**
   * Free-lead hard pick — dual-strength multi bias (v60 lineage) + gold doubleseq/control.
   * General features only; no seed fingerprints.
   */
  function pickFreeLeadHard(legals, state, myIdx) {
    if (!legals || !legals.length) return null;
    var hand = state.players[myIdx].hand;
    var handLen = hand.length;
    var omin = oppMinHand(state, myIdx);
    var info = analyzeHand(hand);
    var multi = [];
    var dseqAll = [];
    var i;
    for (i = 0; i < legals.length; i++) {
      if (legals[i].length === handLen) return legals[i];
      var comi = detectCombo(legals[i]);
      // Include doubleseq even if classified bomb (3+ pairs) — gold 0506/0507
      if (comi && comi.type === 'doubleseq' && legals[i].length >= 6) {
        dseqAll.push(legals[i]);
      }
      if (legals[i].length >= 2 && !playHasTwo(legals[i]) && !(comi && comi.type === 'quad')) {
        multi.push(legals[i]);
      }
    }

    // Gold: doubleseq lock packages first (control + rare hard-to-beat)
    if (dseqAll.length) return orderLegals(dseqAll, state, myIdx)[0];

    // Full-straight extend (gold 0553/0566): prefer longest seq when residual is
    // tiny (≤2 cards) — definite control lead, leave one trash for finish.
    {
      var longSeqs = [];
      for (i = 0; i < multi.length; i++) {
        var cLs = detectCombo(multi[i]);
        if (cLs && cLs.type === 'seq' && multi[i].length >= 6) {
          var resid = handLen - multi[i].length;
          if (resid <= 2) longSeqs.push(multi[i]);
        }
      }
      if (longSeqs.length) {
        longSeqs.sort(function (a, b) { return b.length - a.length || topRank(b) - topRank(a); });
        return longSeqs[0];
      }
    }

    // Short hand + pair-of-2s: lead 22 for near-sure control then trash (gold 0518)
    if (handLen <= 4 && info.twos >= 2) {
      for (i = 0; i < legals.length; i++) {
        if (legals[i].length === 2 && playHasTwo(legals[i]) &&
            legals[i][0].rank === 12 && legals[i][1].rank === 12) {
          return legals[i];
        }
      }
    }

    // Short hand + 2: lock free-lead with single 2 when opp short (gold 0499 sure-win 2)
    if (handLen <= 4 && info.twos >= 1 && omin <= 2) {
      for (i = 0; i < legals.length; i++) {
        if (legals[i].length === 1 && legals[i][0].rank === 12) return legals[i];
      }
    }

    // One-card opponent: no gift low singles — multi or highest single / 2
    // Author gold 0558/0597/0601: omin=1 free lead → highest single (not trash).
    if (omin <= 1) {
      if (multi.length) {
        multi.sort(function (a, b) {
          return b.length - a.length || expertScore(a, state, myIdx) - expertScore(b, state, myIdx);
        });
        return multi[0];
      }
      var highs = [];
      for (i = 0; i < legals.length; i++) {
        if (legals[i].length === 1) highs.push(legals[i]);
      }
      if (highs.length) {
        highs.sort(function (a, b) { return b[0].rank - a[0].rank || b[0].suit - a[0].suit; });
        return highs[0];
      }
      return orderLegals(legals, state, myIdx)[0];
    }

    // Gold 0517: high 4-seq control lead when holding 2s
    if (info.twos >= 1 && handLen >= 6) {
      var hiSeq = [];
      for (i = 0; i < multi.length; i++) {
        var hc = detectCombo(multi[i]);
        if (hc && hc.type === 'seq' && multi[i].length === 4) {
          var lo3 = 99;
          for (var hx = 0; hx < multi[i].length; hx++) lo3 = Math.min(lo3, multi[i][hx].rank);
          if (lo3 >= 6 && topRank(multi[i]) >= 9) hiSeq.push(multi[i]);
        }
      }
      if (hiSeq.length) return orderLegals(hiSeq, state, myIdx)[0];
    }

    // Trash-first with control when deep (gold 0514/0531/0540): shed deadwood
    // Prefer trash when has 2 + low trash — before mid pairs / mid multi
    if (info.hasControl && handLen >= 7 && info.trashCount >= 1 && info.twos >= 1) {
      var trashPlays = [];
      for (i = 0; i < legals.length; i++) {
        if (isTrashSinglePlay(legals[i], info) && legals[i][0].rank <= 6) trashPlays.push(legals[i]);
      }
      trashPlays.sort(function (a, b) {
        return a[0].rank - b[0].rank || a[0].suit - b[0].suit;
      });
      if (trashPlays.length) return trashPlays[0];
    }

    // Control-backed low-pair pin (Series 4/5): prefer pair top≤6 when deep + 2s/high pairs
    if (info.hasControl && handLen >= 9) {
      var lowPairs = [];
      for (i = 0; i < multi.length; i++) {
        if (multi[i].length === 2 && topRank(multi[i]) <= 6 && !playHasTwo(multi[i])) {
          lowPairs.push(multi[i]);
        }
      }
      if (lowPairs.length) return orderLegals(lowPairs, state, myIdx)[0];
    }

    // Multi-first + BR-distill residual (L2s85): among low multi, max teacher logit + V
    if (multi.length) {
      var lowMulti = multi.filter(function (p) { return topRank(p) <= 8; });
      var pool = lowMulti.length ? lowMulti : multi;
      if (typeof valueEval === 'function' && typeof applyPlayFast === 'function') {
        var bestP = pool[0];
        var bestV = -1e99;
        var bi;
        for (bi = 0; bi < pool.length && bi < 14; bi++) {
          try {
            var stA = applyPlayFast(state, myIdx, pool[bi]);
            stA.isFirstLead = false;
            var vv = valueEval(stA, myIdx);
            vv -= structureBreakCost(hand, pool[bi]) * 0.02;
            if (typeof brdLogit === 'function') vv += 0.16 * brdLogit(state, myIdx, pool[bi]);
            if (vv > bestV) { bestV = vv; bestP = pool[bi]; }
          } catch (eV2) { /* skip */ }
        }
        return bestP;
      }
      if (lowMulti.length) return orderLegals(lowMulti, state, myIdx)[0];
      return orderLegals(multi, state, myIdx)[0];
    }

    // Remaining trash / singles
    if (info.hasControl && info.trashCount >= 1) {
      var t2 = [];
      for (i = 0; i < legals.length; i++) {
        if (isTrashSinglePlay(legals[i], info)) t2.push(legals[i]);
      }
      t2.sort(function (a, b) {
        return a[0].rank - b[0].rank || a[0].suit - b[0].suit;
      });
      if (t2.length) return t2[0];
    }

    return orderLegals(legals, state, myIdx)[0];
  }

  /** Policy guards: never return illegal; force 2 vs ace; veto high free-lead singles when multi exists. */
  function enforcePolicyGuards(state, myIdx, play) {
    var hand = state.players[myIdx].hand;
    var cur = state.currentCombo;
    var leg = getLegalPlays(hand, cur, state.players[myIdx].passed, state.isFirstLead, state.firstLeadCard);
    if (!leg.length) return null;
    // Guard: vs Ace single, ALWAYS prefer 2 if held (test + gold)
    if (cur && cur.type === 'single' && cur.top && cur.top.rank === 11) {
      for (var j = 0; j < leg.length; j++) {
        if (leg[j].length === 1 && leg[j][0].rank === 12) return leg[j];
      }
    }
    // Also if play was Ace-climb while 2 held, replace
    if (cur && cur.type === 'single' && cur.top && cur.top.rank === 11 && play && play.length === 1 && play[0].rank === 11) {
      for (var j2 = 0; j2 < leg.length; j2++) {
        if (leg[j2].length === 1 && leg[j2][0].rank === 12) return leg[j2];
      }
    }
    // Free-lead: veto early high singles when multi exists
    if (!cur && play && play.length === 1 && play[0].rank >= 9) {
      var multi = [];
      for (var m = 0; m < leg.length; m++) {
        if (leg[m].length >= 2 && !playHasTwo(leg[m])) multi.push(leg[m]);
      }
      if (multi.length) return orderLegals(multi, state, myIdx)[0];
    }
    if (play && play.length) {
      var sig = playSig(play);
      for (var i = 0; i < leg.length; i++) {
        if (playSig(leg[i]) === sig) return play;
      }
    }
    var dec = expertPolicy(state, myIdx);
    if (dec && dec.pass) return null;
    if (dec && dec.play) return dec.play;
    return orderLegals(leg, state, myIdx)[0];
  }

  function exactEndgameMove(state, myIdx) {
    // Lightweight exact-ish: if hand tiny, pick go-out or best expert
    var hand = state.players[myIdx].hand;
    if (hand.length > 6) return null;
    var leg = getLegalPlays(hand, state.currentCombo, state.players[myIdx].passed, state.isFirstLead, state.firstLeadCard);
    for (var i = 0; i < leg.length; i++) {
      if (leg[i].length === hand.length) return { play: leg[i] };
    }
    return expertPolicy(state, myIdx);
  }

  function handHasNonBombBeater(hand, againstComboOrCards) {
    // Test helper: true if hand has a legal non-bomb beat of against combo/cards
    var combo = againstComboOrCards;
    if (againstComboOrCards && Array.isArray(againstComboOrCards)) {
      combo = detectCombo(againstComboOrCards);
    } else if (againstComboOrCards && againstComboOrCards.cards && !againstComboOrCards.type) {
      combo = detectCombo(againstComboOrCards.cards);
    }
    if (!combo || !combo.type) return false;
    var leg = getLegalPlays(hand, combo, false, false, null);
    for (var i = 0; i < leg.length; i++) {
      var c = detectCombo(leg[i]);
      if (c && !isBombCombo(c)) return true;
    }
    return false;
  }

  function applyDecision(state, cp, dec) {
    if (dec.pass) return passFast(state, cp);
    return applyPlayFast(state, cp, dec.play);
  }

  function rollout(state, myIdx, maxSteps, rng) {
    var s = cloneStateFast(state);
    var steps = 0;
    maxSteps = maxSteps || 80;
    while (!s.roundOver && steps < maxSteps) {
      var cp = s.currentPlayer;
      var dec = expertPolicy(s, cp);
      // occasional noise for diversity
      if (rng && rng() < 0.08) {
        var hand = s.players[cp].hand;
        var leg = getLegalPlays(hand, s.currentCombo, s.players[cp].passed, s.isFirstLead, s.firstLeadCard);
        if (leg.length) {
          if (!s.currentCombo) {
            dec = { play: leg[Math.floor(rng() * Math.min(leg.length, 4))] };
          } else {
            var ch = cheapLegals(leg);
            if (ch.length && rng() < 0.7) {
              dec = { play: ch[Math.floor(rng() * Math.min(ch.length, 3))] };
            } else if (rng() < 0.3) {
              dec = { pass: true };
            }
          }
        }
      }
      s = applyDecision(s, cp, dec);
      s.isFirstLead = false;
      steps++;
    }
    return finalUtility(s, myIdx);
  }

  // ─── Determinization ───

  function cardId(c) {
    return c.rank * 4 + c.suit;
  }

  function shuffleInPlace(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  /**
   * Sample plausible opponent hands: fix my hand, redistrib other cards by hand sizes.
   * When perfectInfo=true, return clone as-is.
   */
  function determinize(state, myIdx, rng, perfectInfo) {
    if (perfectInfo) return cloneStateFast(state);
    var s = cloneStateFast(state);
    var pool = [];
    var sizes = [];
    for (var i = 0; i < s.players.length; i++) {
      if (i === myIdx) {
        sizes.push(s.players[i].hand.length);
        continue;
      }
      sizes.push(s.players[i].hand.length);
      for (var j = 0; j < s.players[i].hand.length; j++) {
        pool.push(s.players[i].hand[j]);
      }
    }
    shuffleInPlace(pool, rng);
    var off = 0;
    for (var p = 0; p < s.players.length; p++) {
      if (p === myIdx) continue;
      var need = sizes[p];
      s.players[p].hand = pool.slice(off, off + need);
      off += need;
    }
    return s;
  }

  function seededRandom(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // ─── Flat Monte Carlo ───

  function flatMonteCarlo(rootState, myIdx, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var timeMs = opts.timeMs != null ? opts.timeMs : 0;
    var maxSims = opts.maxSims != null ? opts.maxSims : 200;
    var perfectInfo = opts.perfectInfo !== false; // vs-AI default: see all hands
    var samples = opts.determinizations || (perfectInfo ? 1 : 24);
    var rolloutSteps = opts.rolloutSteps || 70;

    var hand = rootState.players[myIdx].hand;
    var cur = rootState.currentCombo;
    var legals = getLegalPlays(hand, cur, rootState.players[myIdx].passed,
      rootState.isFirstLead, rootState.firstLeadCard);
    if (!legals.length) return { play: null, stats: { sims: 0 } };

    // Cap branching: free-lead uses freeLeadCandidates (+ BRD when available);
    // combat still expert-ordered (cheap/safe first).
    var candidates;
    if (!cur) {
      candidates = freeLeadCandidates(legals, rootState, myIdx);
    } else {
      candidates = orderLegals(legals, rootState, myIdx);
    }
    var maxBranch = opts.maxBranch || 12;
    if (candidates.length > maxBranch) candidates = candidates.slice(0, maxBranch);

    var allowPass = !!cur && cheapLegals(legals).length === 0;
    var actions = candidates.map(function (p) { return p; });
    if (allowPass) actions.push(null);

    // Go-out forced
    for (var g = 0; g < legals.length; g++) {
      if (legals[g].length === hand.length) {
        return { play: legals[g], stats: { sims: 0, forced: 'go-out' } };
      }
    }

    var scores = {};
    var counts = {};
    for (var a = 0; a < actions.length; a++) {
      var sig = playSig(actions[a]);
      scores[sig] = 0;
      counts[sig] = 0;
    }

    var t0 = Date.now();
    var sims = 0;
    var done = false;
    while (!done) {
      for (var si = 0; si < samples && !done; si++) {
        var det = determinize(rootState, myIdx, rng, perfectInfo);
        for (var ai = 0; ai < actions.length && !done; ai++) {
          var act = actions[ai];
          var next;
          if (act == null) next = passFast(det, myIdx);
          else next = applyPlayFast(det, myIdx, act);
          next.isFirstLead = false;
          var u = rollout(next, myIdx, rolloutSteps, rng);
          var sg = playSig(act);
          scores[sg] += u;
          counts[sg] += 1;
          sims++;
          if (timeMs > 0 && (Date.now() - t0) >= timeMs) done = true;
          if (sims >= maxSims) done = true;
        }
      }
      if (timeMs <= 0) done = true; // one full pass when no time budget and maxSims large
      if (sims >= maxSims) done = true;
      if (timeMs > 0 && (Date.now() - t0) >= timeMs) done = true;
      // if time budget, keep looping samples until time out
      if (timeMs <= 0) break;
    }

    var best = actions[0];
    var bestAvg = -1;
    var details = [];
    for (var bi = 0; bi < actions.length; bi++) {
      var sgg = playSig(actions[bi]);
      var avg = counts[sgg] ? scores[sgg] / counts[sgg] : 0;
      details.push({ sig: sgg, avg: avg, n: counts[sgg], play: actions[bi] });
      if (avg > bestAvg) {
        bestAvg = avg;
        best = actions[bi];
      }
    }
    details.sort(function (x, y) { return y.avg - x.avg; });

    return {
      play: best,
      stats: { sims: sims, ms: Date.now() - t0, top: details.slice(0, 5), avg: bestAvg }
    };
  }

  // ─── UCT MCTS (perfect info on a determinized world) ───

  function MCTSNode(player, move, parent) {
    this.player = player;
    this.move = move; // cards | null | undefined (root)
    this.parent = parent;
    this.children = [];
    this.untried = null;
    this.visits = 0;
    this.value = 0; // mean utility for root maximizer, updated via backprop
  }

  /**
   * UCT selection with multi-player adversarial semantics.
   * Stored values are always root maximizer (myIdx) utilities.
   * When the chooser at this node is myIdx → maximize; otherwise minimize
   * (opponents act against us, not cooperatively).
   */
  function uctSelect(node, C, myIdx) {
    var best = null;
    var bestU = -Infinity;
    // Children of a node share the same chooser (player who is to move)
    var chooser = node.player;
    if (node.children.length && typeof node.children[0].player === 'number') {
      chooser = node.children[0].player;
    }
    var maximize = (chooser === myIdx);
    for (var i = 0; i < node.children.length; i++) {
      var ch = node.children[i];
      if (!ch.visits) return ch;
      var mean = ch.value / ch.visits; // myIdx utility
      var explore = C * Math.sqrt(Math.log(node.visits + 1) / ch.visits);
      // Opponents minimize our utility; we maximize it
      var exploit = maximize ? mean : (1 - mean);
      var u = exploit + explore;
      // slight prior for expert-ordered first children
      u += 0.02 / (i + 1);
      if (u > bestU) {
        bestU = u;
        best = ch;
      }
    }
    return best;
  }

  function runMCTSOnState(rootState, myIdx, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var iterations = opts.iterations != null ? opts.iterations : 200;
    var timeMs = opts.timeMs != null ? opts.timeMs : 0;
    var C = opts.uctC != null ? opts.uctC : 1.25;
    var maxBranch = opts.maxBranch || 10;
    var rolloutSteps = opts.rolloutSteps || 60;

    var rootLegals = getLegalPlays(
      rootState.players[myIdx].hand, rootState.currentCombo,
      rootState.players[myIdx].passed, rootState.isFirstLead, rootState.firstLeadCard
    );
    if (!rootLegals.length) return { play: null, stats: { iters: 0 } };

    // Force go-out
    for (var g = 0; g < rootLegals.length; g++) {
      if (rootLegals[g].length === rootState.players[myIdx].hand.length) {
        return { play: rootLegals[g], stats: { iters: 0, forced: 'go-out' } };
      }
    }

    var rootCheap = cheapLegals(rootLegals);
    var allowPassRoot = !!rootState.currentCombo && rootCheap.length === 0;

    var root = new MCTSNode(rootState.currentPlayer, undefined, null);
    // Store state only on path via separate variable
    var t0 = Date.now();
    var iters = 0;

    while (iters < iterations) {
      if (timeMs > 0 && (Date.now() - t0) >= timeMs) break;
      iters++;

      var node = root;
      var s = cloneStateFast(rootState);
      var path = [node];

      // Selection (adversarial at opponent nodes)
      while (node.untried == null && node.children.length > 0 && !s.roundOver) {
        node = uctSelect(node, C, myIdx);
        path.push(node);
        if (node.move == null) s = passFast(s, node.player);
        else s = applyPlayFast(s, node.player, node.move);
        s.isFirstLead = false;
      }

      // Expansion
      if (!s.roundOver) {
        if (node.untried === null) {
          var curP = s.currentPlayer;
          var leg = getLegalPlays(
            s.players[curP].hand, s.currentCombo, s.players[curP].passed,
            s.isFirstLead, s.firstLeadCard
          );
          // Opponent nodes: prefer moves that hurt us (go-out, high pressure) via reverse order bias
          if (curP === myIdx) {
            leg = orderLegals(leg, s, curP);
          } else {
            leg = orderLegals(leg, s, curP);
            // Also surface go-out first for opponents (adversarial)
            leg.sort(function (a, b) {
              var aOut = a.length === s.players[curP].hand.length ? 1 : 0;
              var bOut = b.length === s.players[curP].hand.length ? 1 : 0;
              if (aOut !== bOut) return bOut - aOut;
              return 0;
            });
          }
          if (leg.length > maxBranch) leg = leg.slice(0, maxBranch);
          node.untried = leg.slice();
          // Store who is to move from this node (for UCT chooser)
          node.player = curP;
          var isRoot = node === root;
          var canPass = s.currentCombo && (
            (isRoot && allowPassRoot) ||
            (!isRoot && cheapLegals(leg).length === 0 && s.players[curP].hand.length > 4)
          );
          if (canPass) node.untried.push(null);
        }
        if (node.untried && node.untried.length) {
          // Prefer expanding expert-first (shift for best first)
          var mv = node.untried.shift();
          var curP2 = s.currentPlayer;
          var child = new MCTSNode(curP2, mv, node);
          if (mv == null) s = passFast(s, curP2);
          else s = applyPlayFast(s, curP2, mv);
          s.isFirstLead = false;
          node.children.push(child);
          node = child;
          path.push(node);
        }
      }

      // Simulation
      var outcome = rollout(s, myIdx, rolloutSteps, rng);

      // Backprop: always accumulate myIdx utility; selection handles min/max by player
      for (var pi = 0; pi < path.length; pi++) {
        path[pi].visits++;
        path[pi].value += outcome;
      }
    }

    // Root action selection: most visits with utility tie-break
    var bestChild = null;
    var bestScore = -1;
    for (var ci = 0; ci < root.children.length; ci++) {
      var ch = root.children[ci];
      if (!ch.visits) continue;
      var sc = ch.visits + (ch.value / ch.visits) * 0.01;
      if (ch.move == null && rootCheap.length) sc -= 1000;
      if (sc > bestScore) {
        bestScore = sc;
        bestChild = ch;
      }
    }

    if (!bestChild) {
      var fallback = expertPolicy(rootState, myIdx);
      return {
        play: fallback.pass ? null : fallback.play,
        stats: { iters: iters, ms: Date.now() - t0, fallback: true }
      };
    }

    var topKids = root.children.slice().filter(function (c) { return c.visits; })
      .sort(function (a, b) { return b.visits - a.visits; })
      .slice(0, 5)
      .map(function (c) {
        return {
          sig: playSig(c.move),
          visits: c.visits,
          avg: c.value / c.visits,
          play: c.move
        };
      });

    return {
      play: bestChild.move,
      stats: {
        iters: iters,
        ms: Date.now() - t0,
        top: topKids,
        avg: bestChild.value / bestChild.visits
      }
    };
  }

  /**
   * Determinized MCTS: sample worlds, run short MCTS each, average root action values.
   */
  function determinizedMCTS(rootState, myIdx, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var perfectInfo = opts.perfectInfo !== false;
    var timeMs = opts.timeMs != null ? opts.timeMs : 800;
    var detN = perfectInfo ? 1 : (opts.determinizations || 16);
    var itersPer = opts.iterationsPerDet != null ? opts.iterationsPerDet : (perfectInfo ? 250 : 40);
    var t0 = Date.now();

    var hand = rootState.players[myIdx].hand;
    var legals = getLegalPlays(hand, rootState.currentCombo, rootState.players[myIdx].passed,
      rootState.isFirstLead, rootState.firstLeadCard);
    if (!legals.length) return { play: null, stats: { dets: 0 } };

    for (var g = 0; g < legals.length; g++) {
      if (legals[g].length === hand.length) {
        return { play: legals[g], stats: { forced: 'go-out' } };
      }
    }

    // Aggregate
    var agg = {}; // sig -> { sum, n, play }
    var dets = 0;
    var totalIters = 0;

    for (var d = 0; d < detN; d++) {
      if (timeMs > 0 && (Date.now() - t0) >= timeMs) break;
      var remaining = timeMs > 0 ? Math.max(20, timeMs - (Date.now() - t0)) : 0;
      var detState = determinize(rootState, myIdx, rng, perfectInfo);
      var perTime = perfectInfo ? remaining : Math.floor(remaining / Math.max(1, detN - d));
      var res = runMCTSOnState(detState, myIdx, {
        rng: rng,
        iterations: itersPer,
        timeMs: perfectInfo ? (timeMs || 0) : perTime,
        maxBranch: opts.maxBranch || 10,
        rolloutSteps: opts.rolloutSteps || 55,
        uctC: opts.uctC
      });
      dets++;
      totalIters += (res.stats && res.stats.iters) || 0;
      if (res.stats && res.stats.top) {
        for (var ti = 0; ti < res.stats.top.length; ti++) {
          var t = res.stats.top[ti];
          if (!agg[t.sig]) agg[t.sig] = { sum: 0, n: 0, play: t.play, visits: 0 };
          agg[t.sig].sum += t.avg * t.visits;
          agg[t.sig].visits += t.visits;
          agg[t.sig].n += 1;
          agg[t.sig].play = t.play;
        }
      } else {
        var sg = playSig(res.play);
        if (!agg[sg]) agg[sg] = { sum: 0, n: 0, play: res.play, visits: 0 };
        agg[sg].sum += (res.stats && res.stats.avg != null) ? res.stats.avg : 0.5;
        agg[sg].n += 1;
        agg[sg].visits += 1;
      }
      if (perfectInfo) break; // one world
    }

    var bestPlay = null;
    var bestV = -1;
    var details = [];
    var keys = Object.keys(agg);
    for (var ki = 0; ki < keys.length; ki++) {
      var k = keys[ki];
      var a = agg[k];
      var avg = a.visits ? a.sum / a.visits : (a.n ? a.sum / a.n : 0);
      details.push({ sig: k, avg: avg, n: a.n, visits: a.visits, play: a.play });
      if (avg > bestV) {
        bestV = avg;
        bestPlay = a.play;
      }
    }
    details.sort(function (x, y) { return y.avg - x.avg; });

    if (bestPlay === undefined || (bestPlay == null && !rootState.currentCombo)) {
      var fb = expertPolicy(rootState, myIdx);
      bestPlay = fb.pass ? null : fb.play;
    }

    // Safety: free lead never pass
    if (!rootState.currentCombo && bestPlay == null) {
      bestPlay = orderLegals(legals, rootState, myIdx)[0];
    }
    // Safety: never pass cheap
    if (bestPlay == null && rootState.currentCombo) {
      var ch = cheapLegals(legals);
      if (ch.length) bestPlay = orderLegals(ch, rootState, myIdx)[0];
    }

    return {
      play: bestPlay,
      stats: {
        dets: dets,
        iters: totalIters,
        ms: Date.now() - t0,
        top: details.slice(0, 6),
        avg: bestV
      }
    };
  }

  /**
   * Main entry: choose search mode from difficulty / budget.
   * opts:
   *   difficulty: easy|medium|hard|grandmaster
   *   timeMs, iterations, perfectInfo, hiddenInfo
   *   mode: 'expert'|'mc'|'mcts'|'auto'
   *
   * Default: imperfect-info (determinization). Pass perfectInfo:true only for debug.
   */
  function freeLeadCandidates(leg, state, cp) {
    var info = analyzeHand(state.players[cp].hand);
    var omin = oppMinHand(state, cp);
    var out = [];
    var i;
    for (i = 0; i < leg.length; i++) {
      var p = leg[i];
      if (p.length === state.players[cp].hand.length) {
        out.push(p);
        continue;
      }
      var com = detectCombo(p);
      // Prefer doubleseq packages in root set (gold/control)
      if (com && com.type === 'doubleseq' && p.length >= 6) {
        out.push(p);
        continue;
      }
      if (omin === 1) {
        // Author 0558/0597/0601: multi first, else any single (prefer high at sort)
        if (p.length >= 2 && !playHasTwo(p)) out.push(p);
        else if (p.length === 1) out.push(p);
        continue;
      }
      if (p.length >= 2 && !playHasTwo(p) && !(com && com.type === 'quad')) {
        out.push(p);
        continue;
      }
      if (isTrashSinglePlay(p, info) && info.hasControl && state.players[cp].hand.length >= 7) {
        out.push(p);
        continue;
      }
    }
    if (!out.length) {
      for (i = 0; i < leg.length; i++) {
        if (!playIsExpensive(leg[i])) out.push(leg[i]);
      }
    }
    // L2s5 pin low pairs / trash into root before branch cap (dual strength)
    var info2 = analyzeHand(state.players[cp].hand);
    if (info2.hasControl && state.players[cp].hand.length >= 8) {
      for (i = 0; i < leg.length; i++) {
        var p2 = leg[i];
        if (p2.length === 2 && !playHasTwo(p2) && topRank(p2) <= 5) {
          if (out.indexOf(p2) < 0) out.push(p2);
        }
        if (isTrashSinglePlay(p2, info2) && p2[0].rank <= 5) {
          if (out.indexOf(p2) < 0) out.push(p2);
        }
      }
    }
    if (!out.length) out = leg.slice();
    // Kill-point fix (DEEP-DIVE §2a/§6.2): do not pure-expert sort as the only prior.
    // Gold pins already applied; rank by BR-teacher when available, else expertScore.
    if (typeof brdLogit === 'function') {
      return out.slice().sort(function (a, b) {
        var da = brdLogit(state, cp, a);
        var db = brdLogit(state, cp, b);
        if (Math.abs(db - da) > 1e-9) return db - da;
        // tie-break: longer multi, then lower expertScore (expertScore lower = better)
        if (b.length !== a.length) return b.length - a.length;
        return expertScore(a, state, cp) - expertScore(b, state, cp);
      });
    }
    return orderLegals(out, state, cp);
  }

  function endgamePick(state, myIdx) {
    var handLen = state.players[myIdx].hand.length;
    var total = 0;
    for (var i = 0; i < state.players.length; i++) {
      if (!state.players[i].finished) total += state.players[i].hand.length;
    }
    // True endgame only — midgame hands with omin=1 must not short-circuit BR
    // (gold 0520a: 9-card hand vs 1-card opp was incorrectly endgame-picked).
    if (handLen > 6 || total > 12) return null;

    var leg = getLegalPlays(
      state.players[myIdx].hand, state.currentCombo,
      state.players[myIdx].passed, state.isFirstLead, state.firstLeadCard
    );
    if (!leg.length) return null;

    // omin=1 combat: prefer single-2 if legal (gold 0520a / 0558)
    var ominEg = oppMinHand(state, myIdx);
    var curEg = state.currentCombo;
    if (curEg && curEg.type === 'single' && ominEg <= 1) {
      for (var e2 = 0; e2 < leg.length; e2++) {
        if (leg[e2].length === 1 && leg[e2][0].rank === 12) return leg[e2];
      }
    }

    if (!state.currentCombo) leg = freeLeadCandidates(leg, state, myIdx);
    else {
      var cheap = cheapLegals(leg);
      if (cheap.length) leg = cheap;
      // Keep single-2 in endgame combat branch (2-for-control / omin1)
      var fullEg = getLegalPlays(
        state.players[myIdx].hand, state.currentCombo,
        state.players[myIdx].passed, state.isFirstLead, state.firstLeadCard
      );
      for (var e2c = 0; e2c < fullEg.length; e2c++) {
        if (fullEg[e2c].length === 1 && fullEg[e2c][0].rank === 12) {
          var has2eg = false;
          for (var he = 0; he < leg.length; he++) {
            if (leg[he].length === 1 && leg[he][0].rank === 12) { has2eg = true; break; }
          }
          if (!has2eg) leg = [fullEg[e2c]].concat(leg);
        }
      }
    }
    leg = orderLegals(leg, state, myIdx);
    if (leg.length > 12) leg = leg.slice(0, 12);

    var best = leg[0];
    var bestU = -1;
    var rng = Math.random;
    for (var c = 0; c < leg.length; c++) {
      var next = applyPlayFast(state, myIdx, leg[c]);
      next.isFirstLead = false;
      var u = 0;
      var trials = handLen <= 4 ? 24 : 12;
      for (var t = 0; t < trials; t++) {
        u += rollout(next, myIdx, 100, rng);
      }
      u /= trials;
      if (leg[c].length === state.players[myIdx].hand.length) u = 1;
      if (u > bestU) {
        bestU = u;
        best = leg[c];
      }
    }
    return best;
  }

  var _injectedOppPolicy = null;
  function setExploitOpponent(fn) {
    _injectedOppPolicy = typeof fn === 'function' ? fn : null;
  }

  function opponentPolicyStrong(state, cp) {
    if (_injectedOppPolicy) {
      try {
        var mv = _injectedOppPolicy(state, cp);
        if (mv == null) return { pass: true };
        return { play: mv };
      } catch (eInj) { /* fall through */ }
    }
    return opponentPolicyV21(state, cp);
  }

  function opponentPolicyV21(state, cp) {
    var hand = state.players[cp].hand;
    var cur = state.currentCombo;
    var leg = getLegalPlays(hand, cur, state.players[cp].passed, state.isFirstLead, state.firstLeadCard);
    if (!leg.length) return { pass: true };
    var i;
    for (i = 0; i < leg.length; i++) {
      if (leg[i].length === hand.length) return { play: leg[i] };
    }
    if (!cur) {
      var multi = [];
      for (var m = 0; m < leg.length; m++) {
        if (leg[m].length >= 2 && !playHasTwo(leg[m])) multi.push(leg[m]);
      }
      if (multi.length) return { play: orderLegals(multi, state, cp)[0] };
      var cheapS = [];
      for (i = 0; i < leg.length; i++) {
        if (!playIsExpensive(leg[i])) cheapS.push(leg[i]);
      }
      if (cheapS.length) return { play: orderLegals(cheapS, state, cp)[0] };
      return { play: leg[0] };
    }
    var cheap = cheapLegals(leg);
    if (cheap.length) return { play: orderLegals(cheap, state, cp)[0] };
    var curTop = cur.top ? cur.top.rank : 0;
    if (curTop >= 11 || hand.length <= 6) return { play: orderLegals(leg, state, cp)[0] };
    if (hand.length > 8 && curTop < 9) return { pass: true };
    return { play: orderLegals(leg, state, cp)[0] };
  }

  /* VALUE_NET_START — linear TRAIN value (AlphaZero-lite features) */
  var VALUE_W = [0.850323,-3.343534,1.799391,1.523945,1.498918,-1.57339,-0.573825,0.362528,-0.568548,0.487795,0.731693,0.240293,-0.121663];
  var VALUE_LAMBDA = 0.22; // blend into BR rate
  // L2s85: offline high-trials BR distill scorer (TRAIN SoftN=0 BR_TRIALS=36 teacher)
  var BRD_W = [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,-0.0,-0.0,-0.0,-0.0,1.303906,-4.200862,0.032786,-0.567582,0.239831,0.524989,-1.951978,-1.945305,0.000473,1.123915,2.772895,-2.290995,-0.567582,0.239831,0.524989,0];
  function brdLogit(state, myIdx, cards) {
    if (!cards || !cards.length) return -9;
    var hand = state.players[myIdx].hand;
    var by = {};
    var twos = 0, control = 0, pairs = 0, trash = 0, i, r;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      by[r] = (by[r] || 0) + 1;
      if (r === 12) twos++;
      if (r >= 10) control++;
    }
    var keys = Object.keys(by);
    for (i = 0; i < keys.length; i++) {
      r = +keys[i];
      if (by[r] >= 2) pairs++;
      if (by[r] === 1 && r <= 9) trash++;
    }
    var handLen = hand.length;
    var omin = oppMinHand(state, myIdx);
    var len = cards.length;
    var top = 0, hasTwo = false;
    for (i = 0; i < cards.length; i++) {
      if (cards[i].rank > top) top = cards[i].rank;
      if (cards[i].rank === 12) hasTwo = true;
    }
    var typ = len === 1 ? 'single' : len === 2 ? 'pair' : len === 3 ? 'triple' : len === 4 ? 'quad_or_seq' : 'long';
    var sbc = structureBreakCost(hand, cards);
    var free = !state.currentCombo;
    var isTrashSingle = len === 1 && top <= 6 && (by[top] === 1);
    var isLowPair = len === 2 && top <= 6 && !hasTwo;
    var isLowMulti = len >= 2 && top <= 8 && !hasTwo;
    var f = [1, handLen/13, omin/13, Math.min(2,twos)/2, Math.min(4,control)/4, Math.min(6,trash)/6, Math.min(6,pairs)/6, free?1:0, handLen>=10?1:0, handLen<=5?1:0, omin<=1?1:0, omin<=2?1:0, len/13, top/12, hasTwo?1:0, isTrashSingle?1:0, isLowPair?1:0, isLowMulti?1:0, typ==='single'?1:0, typ==='pair'?1:0, typ==='triple'?1:0, typ==='quad_or_seq'?1:0, typ==='long'?1:0, Math.min(8,sbc)/8, free&&isTrashSingle?1:0, free&&isLowPair?1:0, free&&isLowMulti?1:0, !free&&isTrashSingle?1:0];
    var s = 0;
    for (i = 0; i < BRD_W.length && i < f.length; i++) s += BRD_W[i] * f[i];
    return s;
  }
  function valueSigmoid(x) {
    if (x > 20) return 1;
    if (x < -20) return 0;
    return 1 / (1 + Math.exp(-x));
  }
  function valueFeatures(state, myIdx) {
    var hand = state.players[myIdx].hand;
    var handLen = hand.length;
    var omin = oppMinHand(state, myIdx);
    var by = {};
    var twos = 0, control = 0, trash = 0, pairs = 0, i, r;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      by[r] = (by[r] || 0) + 1;
      if (r === 12) twos++;
      if (r >= 10) control++;
    }
    var keys = Object.keys(by);
    for (i = 0; i < keys.length; i++) {
      r = +keys[i];
      if (by[r] >= 2) pairs++;
      if (by[r] === 1 && r <= 9) trash++;
    }
    var curTop = state.currentCombo && state.currentCombo.top ? state.currentCombo.top.rank : -1;
    var freeLead = !state.currentCombo;
    return [
      1,
      handLen / 13,
      omin / 13,
      Math.min(2, twos) / 2,
      Math.min(4, control) / 4,
      Math.min(6, trash) / 6,
      Math.min(6, pairs) / 6,
      curTop >= 0 ? 1 : 0,
      Math.max(0, curTop) / 12,
      freeLead ? 1 : 0,
      handLen >= 10 ? 1 : 0,
      handLen >= 6 && handLen <= 9 ? 1 : 0,
      handLen <= 5 ? 1 : 0
    ];
  }
  function valueEval(state, myIdx) {
    var f = valueFeatures(state, myIdx);
    var s = 0;
    for (var i = 0; i < VALUE_W.length; i++) s += VALUE_W[i] * f[i];
    return valueSigmoid(s);
  }
  /* VALUE_NET_END */

  function dualRolloutPolicy(state, cp) {

    var hand = state.players[cp].hand;
    var cur = state.currentCombo;
    var leg = getLegalPlays(hand, cur, state.players[cp].passed, state.isFirstLead, state.firstLeadCard);
    if (!leg.length) return { pass: true };
    var i;
    for (i = 0; i < leg.length; i++) {
      if (leg[i].length === hand.length) return { play: leg[i] };
    }
    var omin = oppMinHand(state, cp);
    var handLen = hand.length;
    if (!cur) {
      return { play: pickFreeLeadHard(leg, state, cp) };
    }
    var curTop = cur.top ? cur.top.rank : 0;
    // omin≤1 combat: prefer single 2 / highest single / long multi (Series 4/5 convert)
    if (omin <= 1) {
      for (i = 0; i < leg.length; i++) {
        if (leg[i].length === 1 && leg[i][0].rank === 12) return { play: leg[i] };
      }
      var highs = [];
      for (i = 0; i < leg.length; i++) {
        if (leg[i].length === 1 && leg[i][0].rank >= 10) highs.push(leg[i]);
      }
      if (highs.length) {
        highs.sort(function (a, b) { return b[0].rank - a[0].rank; });
        return { play: highs[0] };
      }
      var multis = leg.filter(function (p) { return p.length >= 2 && !playHasTwo(p); });
      if (multis.length) {
        multis.sort(function (a, b) { return b.length - a.length; });
        return { play: multis[0] };
      }
    }
    // Structure-safe "cheap": exclude high sbc peels that gold would reject
    var safe = [];
    for (i = 0; i < leg.length; i++) {
      if (playHasTwo(leg[i]) || playIsBomb(leg[i])) continue;
      if (structureBreakCost(hand, leg[i]) >= 5) continue;
      safe.push(leg[i]);
    }
    // 2-for-control before safe return (mirror expert): high single → seize free lead
    if (cur.type === 'single' && curTop >= 9) {
      for (i = 0; i < leg.length; i++) {
        if (leg[i].length === 1 && leg[i][0].rank === 12) {
          var hasTrashAns = false;
          for (var tsi = 0; tsi < safe.length; tsi++) {
            if (safe[tsi].length === 1 && safe[tsi][0].rank <= 6 &&
                structureBreakCost(hand, safe[tsi]) < 2) {
              hasTrashAns = true;
              break;
            }
          }
          if (!hasTrashAns || omin <= 3 || handLen <= 8) return { play: leg[i] };
        }
      }
    }
    if (safe.length) return { play: orderLegals(safe, state, cp)[0] };
    var cheap = cheapLegals(leg);
    if (cheap.length) return { play: orderLegals(cheap, state, cp)[0] };
    if (cur.cards && cur.cards.every(function (c) { return c.rank === 12; })) {
      var bombs = [];
      for (var b = 0; b < leg.length; b++) if (playIsBomb(leg[b])) bombs.push(leg[b]);
      if (bombs.length) return { play: orderLegals(bombs, state, cp)[0] };
    }
    var non2 = [];
    for (var ni = 0; ni < leg.length; ni++) {
      if (!playHasTwo(leg[ni]) && !playIsBomb(leg[ni])) non2.push(leg[ni]);
    }
    // Pass when deep and all non-2 answers smash structure (gold 0501/0510/0550)
    if (handLen >= 9 && omin >= 4 && non2.length) {
      var minSbc = 99;
      for (i = 0; i < non2.length; i++) {
        minSbc = Math.min(minSbc, structureBreakCost(hand, non2[i]));
      }
      if (minSbc >= 5 && curTop <= 10) return { pass: true };
    }
    if (non2.length) return { play: orderLegals(non2, state, cp)[0] };
    if (handLen <= 5 || omin <= 2 || curTop >= 10) {
      return { play: orderLegals(leg, state, cp)[0] };
    }
    if (handLen <= 7 && (omin <= 3 || curTop >= 9)) {
      return { play: orderLegals(leg, state, cp)[0] };
    }
    if (handLen >= 8 && curTop < 10) return { pass: true };
    return { play: orderLegals(leg, state, cp)[0] };
  }

  function bestResponseMove(state, myIdx, opts) {
    opts = opts || {};
    var trials = opts.trials != null ? opts.trials : 24;
    var maxBranch = opts.maxBranch || 12;
    var timeMs = opts.timeMs || 0;
    var perfectInfo = opts.perfectInfo === true;
    var rng = opts.rng || Math.random;
    var t0 = Date.now();

    var hand = state.players[myIdx].hand;
    var cur = state.currentCombo;
    var leg = getLegalPlays(hand, cur, state.players[myIdx].passed,
      state.isFirstLead, state.firstLeadCard);
    if (!leg.length) return { play: null, stats: { mode: 'br-none' } };

    for (var g = 0; g < leg.length; g++) {
      if (leg[g].length === hand.length) {
        return { play: leg[g], stats: { mode: 'br-out' } };
      }
    }

    if (!cur) {
      // L2s112/L2s204: free-lead nested budget; deeper when hand is full (plan-critical)
      if (trials > 0 && trials < 50) trials = Math.min(50, Math.floor(trials * 2.0) + 6);
      if (hand.length >= 11 && trials > 0) trials = Math.min(60, Math.floor(trials * 1.25));
      if (maxBranch < 18) maxBranch = 18;
      // freeLeadCandidates already ranks by BRD (or expert fallback). Do NOT
      // orderLegals here — that wiped teacher order before maxBranch (kill-point).
      leg = freeLeadCandidates(leg, state, myIdx);
      // Idempotent FINAL BRD sort (guarantees teacher prior even if flc changes).
      if (typeof brdLogit === 'function') {
        leg = leg.slice().sort(function (a, b) {
          return brdLogit(state, myIdx, b) - brdLogit(state, myIdx, a);
        });
      }
      // L2s201/L2s204 P0-B2: free-lead diversity — multis + mid singles (≤T) enter BR.
      // 0213 transferred with ≤7; expand mid free-lead without progressive/BRD churn.
      var fullFL = getLegalPlays(hand, cur, state.players[myIdx].passed,
        state.isFirstLead, state.firstLeadCard);
      var seenFl = Object.create(null);
      var sfi;
      for (sfi = 0; sfi < leg.length; sfi++) seenFl[playSig(leg[sfi])] = 1;
      var extrasFl = [];
      for (sfi = 0; sfi < fullFL.length; sfi++) {
        var px = fullFL[sfi];
        if (playIsExpensive(px)) continue;
        if (seenFl[playSig(px)]) continue;
        if (px.length >= 2 || (px.length === 1 && px[0].rank <= 9)) extrasFl.push(px);
      }
      if (typeof brdLogit === 'function' && extrasFl.length > 1) {
        extrasFl.sort(function (a, b) {
          return brdLogit(state, myIdx, b) - brdLogit(state, myIdx, a);
        });
      }
      for (sfi = 0; sfi < Math.min(5, extrasFl.length); sfi++) leg.push(extrasFl[sfi]);
      if (maxBranch < 22) maxBranch = 22;
    } else {
      // Include structure-safe answers (not only pure cheap) so gold combat roots exist
      var ch = cheapLegals(leg);
      var safeRoot = ch.length ? ch.slice() : [];
      if (!safeRoot.length) {
        for (var sr = 0; sr < leg.length; sr++) {
          if (!playHasTwo(leg[sr]) && structureBreakCost(hand, leg[sr]) < 5) safeRoot.push(leg[sr]);
        }
      }
      if (safeRoot.length) leg = safeRoot;
      // K5/G7 dual-path: NEVER drop single-2 from combat branch. Cheap-only root
      // previously wiped 2-for-control candidates (S6 / 0513 / 0500 dual fails).
      var fullLegCombat = getLegalPlays(hand, cur, state.players[myIdx].passed,
        state.isFirstLead, state.firstLeadCard);
      var curTopBr = cur && cur.top ? cur.top.rank : (cur && cur.cards && cur.cards[0] ? cur.cards[0].rank : 0);
      for (var t2i = 0; t2i < fullLegCombat.length; t2i++) {
        var t2p = fullLegCombat[t2i];
        if (t2p.length === 1 && t2p[0].rank === 12) {
          var already2 = false;
          for (var a2c = 0; a2c < leg.length; a2c++) {
            if (leg[a2c].length === 1 && leg[a2c][0].rank === 12) { already2 = true; break; }
          }
          if (!already2) leg = [t2p].concat(leg);
        }
      }
      leg = orderLegals(leg, state, myIdx);
      // Prefer single-2 early in branch vs high singles (author 2-for-control)
      if (cur && cur.type === 'single' && curTopBr >= 9) {
        leg = leg.slice().sort(function (a, b) {
          var a2 = a.length === 1 && a[0].rank === 12 ? 1 : 0;
          var b2 = b.length === 1 && b[0].rank === 12 ? 1 : 0;
          return b2 - a2;
        });
      }
    }
    if (leg.length > maxBranch) leg = leg.slice(0, maxBranch);

    var fullLegForPass = getLegalPlays(hand, cur, state.players[myIdx].passed,
      state.isFirstLead, state.firstLeadCard);
    var allowPass = !!cur && cheapLegals(fullLegForPass).length === 0;
    // G7 plan-pass: if gold-aligned expert says pass, always evaluate pass even when
    // cheap beats exist (0501/0510/0550). Soft prior — not hard force.
    var expertPin = null;
    try { expertPin = expertPolicy(state, myIdx); } catch (ePin) { expertPin = null; }
    if (expertPin && expertPin.pass && cur) allowPass = true;
    // Plan-pass: soft bias usually; narrow hard pin only for high multi dumps
    // (IMG0510 QKA-style: sbc≥12, len≥3) where short BR rates are pure noise.
    // Broader hard pins dual-cliffed on PAIR 0114 (−3.75pp).
    var planPassBias = 0;
    if (cur && expertPin && expertPin.pass) {
      var ominPin = oppMinHand(state, myIdx);
      var minSmash = 99;
      var anyCheapPin = false;
      var anyHighMultiSmash = false;
      for (var sp = 0; sp < fullLegForPass.length; sp++) {
        var scp = structureBreakCost(hand, fullLegForPass[sp]);
        if (!playHasTwo(fullLegForPass[sp]) && scp < 4) anyCheapPin = true;
        if (scp < minSmash) minSmash = scp;
        if (fullLegForPass[sp].length >= 3 && scp >= 12) anyHighMultiSmash = true;
      }
      if (!anyCheapPin && anyHighMultiSmash && hand.length >= 10 && ominPin >= 5) {
        return { play: null, stats: { mode: 'best-response-det', planPass: true, reason: 'high-multi-structure-pass' } };
      }
      if (!anyCheapPin && minSmash >= 8 && hand.length >= 9 && ominPin >= 5) {
        planPassBias = 0.18;
      }
    }
    // omin=1 combat: soft prefer single-2 (gold 0520a) without hard pin dual risk
    var omin1TwoBias = 0;
    if (cur && cur.type === 'single' && expertPin && expertPin.play &&
        expertPin.play.length === 1 && expertPin.play[0].rank === 12) {
      var omin1 = oppMinHand(state, myIdx);
      if (omin1 <= 1) omin1TwoBias = 0.15;
    }
    var actions = leg.slice();
    if (allowPass) actions.push(null);
    // Inject expert play into action set if missing (structure / 2-for-control pin)
    if (expertPin && expertPin.play && expertPin.play.length) {
      var epSig = playSig(expertPin.play);
      var hasEp = false;
      for (var ep = 0; ep < actions.length; ep++) {
        if (actions[ep] && playSig(actions[ep]) === epSig) { hasEp = true; break; }
      }
      if (!hasEp) actions.unshift(expertPin.play);
    }

    var bestPlay = actions[0];
    var bestRate = -1;
    var details = [];
    var selfPol = opts.selfPolicy === 'gold' ? expertPolicy : dualRolloutPolicy;
    var expertSig = expertPin && expertPin.play ? playSig(expertPin.play) : (expertPin && expertPin.pass ? 'PASS' : null);

    var freeLeadRoot = !cur;
    // L2s141: progressive free-lead (no residual) + conditional top-2 MC hybrid.
    // Combines 0137 progressive architecture with 0157 MC signal; residual omitted
    // (plateau overfit risk). Combat path unchanged.
    function runBrTrials(act, nTry) {
      var wins = 0;
      var t;
      for (t = 0; t < nTry; t++) {
        var root = perfectInfo ? cloneStateFast(state) : determinize(state, myIdx, rng, false);
        var s;
        if (act == null) s = passFast(root, myIdx);
        else s = applyPlayFast(root, myIdx, act);
        s.isFirstLead = false;
        var steps = 0;
        var freeOppStrong = freeLeadRoot ? (t % 2 === 0) : (opts.oppModel === 'strong');
        var selfPolT = (freeLeadRoot && (t % 3 === 0) && selfPol !== expertPolicy)
          ? expertPolicy
          : selfPol;
        while (!s.roundOver && steps < 200) {
          var cp = s.currentPlayer;
          var oppPol = freeOppStrong ? opponentPolicyStrong(s, cp) : opponentPolicyV21(s, cp);
          var dec = (cp === myIdx) ? selfPolT(s, cp) : oppPol;
          s = applyDecision(s, cp, dec);
          s.isFirstLead = false;
          steps++;
        }
        if (finalUtility(s, myIdx) >= 0.99) wins++;
      }
      return wins / Math.max(1, nTry);
    }
    for (var ai = 0; ai < actions.length; ai++) {
      if (timeMs > 0 && (Date.now() - t0) >= timeMs) break;
      var act = actions[ai];
      var nTry = freeLeadRoot ? Math.max(6, Math.floor(trials * 0.55)) : trials;
      var rate = runBrTrials(act, nTry);
      // Value blend: prefer actions that improve TRAIN linear V (general features)
      var vRoot = valueEval(state, myIdx);
      var vAfter = vRoot;
      try {
        var stV = act == null ? passFast(state, myIdx) : applyPlayFast(state, myIdx, act);
        stV.isFirstLead = false;
        vAfter = valueEval(stV, myIdx);
      } catch (eV) { vAfter = vRoot; }
      var brdA = 0;
      try { if (act != null && typeof brdLogit === 'function') brdA = brdLogit(state, myIdx, act); } catch (eB) { brdA = 0; }
      // squash teacher logit contribution
      var brdTerm = (freeLeadRoot ? 0.13 : 0.10) * (1 / (1 + Math.exp(-brdA)) - 0.5);
      var rateV = rate + VALUE_LAMBDA * (vAfter - vRoot) + brdTerm;
      // Soft expert-pin prior (dual-safe scale after PAIR 0114 cliff)
      if (expertSig) {
        var actSig = act == null ? 'PASS' : playSig(act);
        if (actSig === expertSig) rateV += 0.06;
      }
      if (act == null && planPassBias) rateV += planPassBias;
      // Soft 2-for-control prior: single-2 vs high singles (even if expert pin missed)
      if (act && act.length === 1 && act[0].rank === 12 && cur && cur.type === 'single') {
        var cTop2 = cur.top ? cur.top.rank : (cur.cards && cur.cards[0] ? cur.cards[0].rank : 0);
        if (cTop2 >= 9) rateV += 0.05;
        else if (cTop2 >= 7) rateV += 0.02;
        if (omin1TwoBias) rateV += omin1TwoBias;
      }
      // Soft residual tie-break: structure cost (Series 1–5 never smash for min-rate noise)
      var sbc = act == null ? 0 : structureBreakCost(hand, act);
      details.push({ sig: playSig(act), rate: rate, rateV: rateV, n: nTry, sbc: sbc, act: act });
      if (rateV > bestRate + 0.03) {
        bestRate = rateV;
        bestPlay = act;
      } else if (Math.abs(rateV - bestRate) <= 0.03) {
        var bestSbc = bestPlay == null ? 0 : structureBreakCost(hand, bestPlay);
        if (rateV > bestRate || (rateV === bestRate && sbc < bestSbc)) {
          bestRate = rateV;
          bestPlay = act;
        } else if (Math.abs(rateV - bestRate) < 1e-9 && sbc < bestSbc) {
          bestPlay = act;
        }
      }
    }
    // Progressive deep refine top-3 (free-lead only)
    if (freeLeadRoot && details.length >= 2 && trials >= 10) {
      details.sort(function (a, b) { return b.rateV - a.rateV || b.rate - a.rate || a.sbc - b.sbc; });
      var deepN2 = Math.max(10, Math.floor(trials * 0.80));
      var topK2 = Math.min(3, details.length);
      for (var dj = 0; dj < topK2; dj++) {
        if (timeMs > 0 && (Date.now() - t0) >= timeMs) break;
        var scoutRate = details[dj].rate;
        var scoutExtras = details[dj].rateV - scoutRate;
        var deepRate2 = runBrTrials(details[dj].act, deepN2);
        var blendR = 0.35 * scoutRate + 0.65 * deepRate2;
        details[dj].rate = blendR;
        details[dj].rateV = blendR + scoutExtras;
        details[dj].n = (details[dj].n || 0) + deepN2;
      }
      details.sort(function (a, b) { return b.rateV - a.rateV || b.rate - a.rate || a.sbc - b.sbc; });
      bestPlay = details[0].act;
      bestRate = details[0].rateV;
      // Conditional MC hybrid only when top-2 nearly tied (0157 signal, less noise)
      var gap01 = Math.abs((details[0].rateV || 0) - (details[1].rateV || 0));
      if (gap01 <= 0.06) {
        try {
          var mc = flatMonteCarlo(state, myIdx, {
            rng: rng,
            maxSims: Math.max(36, trials * 2),
            determinizations: Math.max(6, Math.floor(trials / 3)),
            maxBranch: maxBranch,
            perfectInfo: false,
            timeMs: 0,
            rolloutSteps: 50
          });
          if (mc && mc.stats && mc.stats.top) {
            var mcMap = {};
            for (var mi = 0; mi < mc.stats.top.length; mi++) {
              var mt = mc.stats.top[mi];
              if (mt && mt.sig != null) mcMap[mt.sig] = mt.avg != null ? mt.avg : 0.5;
            }
            for (var di = 0; di < Math.min(2, details.length); di++) {
              var mAvg = mcMap[details[di].sig];
              if (mAvg == null) continue;
              var ex = details[di].rateV - details[di].rate;
              var br2 = 0.72 * details[di].rate + 0.28 * mAvg;
              details[di].rate = br2;
              details[di].rateV = br2 + ex;
            }
            details.sort(function (a, b) { return b.rateV - a.rateV || b.rate - a.rate || a.sbc - b.sbc; });
            bestPlay = details[0].act;
            bestRate = details[0].rateV;
          }
        } catch (eMc) { /* keep progressive BR */ }
      }
    } else {
      details.sort(function (a, b) { return b.rateV - a.rateV || b.rate - a.rate || a.sbc - b.sbc; });
    }
    // Free-lead multi-length soft tie-break: when rateV nearly tied, prefer longer
    // non-2 multi (gold doubleseq / full-straight control packages).
    if (freeLeadRoot && details.length >= 2) {
      var d0 = details[0];
      var d1 = details[1];
      if (d0 && d1 && Math.abs((d0.rateV || 0) - (d1.rateV || 0)) <= 0.05) {
        var a0 = d0.act, a1 = d1.act;
        if (a0 && a1 && a1.length > a0.length && a1.length >= 4 && !playHasTwo(a1)) {
          bestPlay = a1;
          bestRate = d1.rateV;
        }
      }
    }
    return {
      play: bestPlay,
      stats: {
        mode: perfectInfo ? 'best-response' : 'best-response-det',
        avg: bestRate,
        top: details.slice(0, 5).map(function (d) {
          return { sig: d.sig, rate: d.rate, rateV: d.rateV, n: d.n, sbc: d.sbc };
        }),
        ms: Date.now() - t0,
        trials: trials,
        perfectInfo: perfectInfo,
        freeLeadMixedOpp: freeLeadRoot
      }
    };
  }

  function searchMove(state, myIdx, opts) {
    opts = opts || {};
    var difficulty = opts.difficulty || 'hard';
    // Default imperfect-info: sample opponent hands (det-mcts). Opt-in to perfectInfo.
    var perfectInfo = opts.perfectInfo === true;
    var hiddenInfo = opts.hiddenInfo === true || !perfectInfo;
    if (opts.perfectInfo === false) perfectInfo = false;
    if (opts.hiddenInfo === false && opts.perfectInfo !== true) {
      perfectInfo = false;
    }
    if (opts.perfectInfo === true) {
      perfectInfo = true;
      hiddenInfo = false;
    } else {
      perfectInfo = false;
      hiddenInfo = true;
    }
    var rng = opts.rng || (opts.seed != null ? seededRandom(opts.seed) : Math.random);

    var hand = state.players[myIdx].hand;
    var cur = state.currentCombo;
    var legals = getLegalPlays(hand, cur, state.players[myIdx].passed,
      state.isFirstLead, state.firstLeadCard);
    if (!legals.length) return { play: null, stats: { mode: 'none' } };

    for (var i = 0; i < legals.length; i++) {
      if (legals[i].length === hand.length) {
        return { play: legals[i], stats: { mode: 'forced-out' } };
      }
    }

    // Budgets (before BR)
    var timeMs = opts.timeMs;
    var maxSims = opts.maxSims;
    var iterations = opts.iterations;
    var maxBranch = opts.maxBranch || 12;
    if (timeMs == null && iterations == null && maxSims == null) {
      if (difficulty === 'medium') {
        timeMs = 180;
        maxSims = 100;
      } else if (difficulty === 'grandmaster') {
        timeMs = 3500;
        iterations = 900;
      } else {
        timeMs = opts.inBrowser ? 1200 : 1800;
        iterations = opts.inBrowser ? 220 : 450;
      }
    }

    var exact = exactEndgameMove(state, myIdx);
    if (exact && exact.play) {
      return { play: exact.play, stats: { mode: 'exact-endgame' } };
    }
    var eg = endgamePick(state, myIdx);
    if (eg) {
      return { play: eg, stats: { mode: 'endgame' } };
    }

    // Best-response MC (2p hard+, or when dual sets bestResponse:true)
    if (opts.bestResponse || (state.players.length === 2 && difficulty !== 'easy' && difficulty !== 'medium')) {
      var ominBR = oppMinHand(state, myIdx);
      var freeBR = !cur;
      var brTrials = opts.brTrials;
      if (brTrials == null) {
        if (opts.inBrowser) brTrials = freeBR || ominBR <= 2 ? 18 : 10;
        else brTrials = freeBR || ominBR <= 2 ? 55 : 22;
      }
      var brTime = timeMs != null ? timeMs : (opts.inBrowser ? 800 : 2500);
      if (!opts.inBrowser && (freeBR || ominBR <= 2)) brTime = Math.max(brTime, 800);
      // Duals pass timeMs=0 with fixed trials — respect trials budget only
      if (opts.timeMs === 0) brTime = 0;
      var br = bestResponseMove(state, myIdx, {
        trials: brTrials,
        timeMs: brTime,
        maxBranch: freeBR ? 16 : 12,
        perfectInfo: perfectInfo,
        rng: rng,
        oppModel: opts.exploit ? 'strong' : 'v21'
      });
      if (br && br.play !== undefined) {
        if (br.play == null && !cur) {
          br.play = pickFreeLeadHard(legals, state, myIdx);
        }
        if (!cur && br.play && br.play.length === 1 && ominBR === 1 && br.play[0].rank < 10) {
          br.play = pickFreeLeadHard(legals, state, myIdx);
        }
        br.stats = br.stats || {};
        br.stats.perfectInfo = perfectInfo;
        return br;
      }
    }

    var mode = opts.mode || 'auto';
    if (mode === 'auto') {
      if (difficulty === 'easy') mode = 'expert';
      else if (difficulty === 'medium') mode = perfectInfo ? 'mc' : 'mcts';
      else mode = 'mcts';
    }

    if (mode === 'expert') {
      var dec = expertPolicy(state, myIdx);
      return {
        play: dec.pass ? null : dec.play,
        stats: { mode: 'expert' }
      };
    }

    if (mode === 'mc') {
      var mc = flatMonteCarlo(state, myIdx, {
        rng: rng,
        timeMs: timeMs || 0,
        maxSims: maxSims || 120,
        perfectInfo: perfectInfo,
        determinizations: opts.determinizations || (perfectInfo ? 1 : 12),
        maxBranch: maxBranch,
        rolloutSteps: 65
      });
      mc.stats = mc.stats || {};
      mc.stats.mode = 'mc';
      return mc;
    }

    var detN = opts.determinizations != null
      ? opts.determinizations
      : (perfectInfo ? 1 : (difficulty === 'grandmaster' ? 24 : 12));
    var mcts = determinizedMCTS(state, myIdx, {
      rng: rng,
      timeMs: timeMs || 0,
      perfectInfo: perfectInfo,
      determinizations: detN,
      iterationsPerDet: iterations || (perfectInfo ? 300 : 40),
      maxBranch: opts.maxBranch || 10,
      rolloutSteps: 60,
      uctC: opts.uctC
    });
    mcts.stats = mcts.stats || {};
    mcts.stats.mode = perfectInfo ? 'mcts' : 'det-mcts';
    mcts.stats.perfectInfo = perfectInfo;
    mcts.stats.determinizations = detN;
    return mcts;
  }

  /**
   * Adversarial preference check for tests: given two candidate outcomes for an
   * opponent, prefer the one with lower utility for myIdx.
   */
  function opponentPrefersLowerUtility(utilA, utilB) {
    return utilA < utilB;
  }

  return {
    searchMove: searchMove,
    flatMonteCarlo: flatMonteCarlo,
    runMCTSOnState: runMCTSOnState,
    determinizedMCTS: determinizedMCTS,
    expertPolicy: expertPolicy,
    expertScore: expertScore,
    rollout: rollout,
    determinize: determinize,
    placeUtility: placeUtility,
    orderLegals: orderLegals,
    playSig: playSig,
    cheapLegals: cheapLegals,
    seededRandom: seededRandom,
    uctSelect: uctSelect,
    opponentPrefersLowerUtility: opponentPrefersLowerUtility,
    handHasNonBombBeater: handHasNonBombBeater,
    structureBreakCost: structureBreakCost,
    pickFreeLeadHard: pickFreeLeadHard,
    enforcePolicyGuards: enforcePolicyGuards,
    exactEndgameMove: exactEndgameMove,
    endgamePick: endgamePick,
    bestResponseMove: bestResponseMove,
    setExploitOpponent: setExploitOpponent,
    freeLeadCandidates: freeLeadCandidates,
    dualRolloutPolicy: dualRolloutPolicy,
    analyzeHand: analyzeHand
  };
}));
