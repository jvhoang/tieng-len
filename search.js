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
    module.exports = factory(require('./engine.js'));
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
      // 2p: hard win/loss (soft place scores dilute search signal badly)
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
   * Higher cost = worse (breaks pairs/seqs).
   */
  // Experimental policy levers (seed-duel / ladder probes). Empty = live default.
  // PATCH: MIDGAP | SOFTPASS11 | TWO7 | TRASHFL | STRUCT
  var _PATCH = (typeof process !== 'undefined' && process.env && process.env.TIENLEN_PATCH) || '';
  var _P = {
    midGap: _PATCH.indexOf('MIDGAP') >= 0,
    softPass11: _PATCH.indexOf('SOFTPASS11') >= 0,
    two7: _PATCH.indexOf('TWO7') >= 0,
    trashFL: _PATCH.indexOf('TRASHFL') >= 0,
    struct: _PATCH.indexOf('STRUCT') >= 0,
    combatV91: _PATCH.indexOf('COMBATV91') >= 0,
    flV91: _PATCH.indexOf('FLV91') >= 0
  };

  /**
   * Narrow structure-pass (gold 0510 / harsh pair-back smash only).
   * Human GM: pass when the only "cheap" answer burns the plan (high pair-backs
   * for mid pairs), not whenever structure cost is middling.
   */
  function shouldStructurePass(hand, safe, safeCost, cur, info, omin, handLen) {
    if (!safe || !cur || !info) return false;
    if (handLen < 10 || omin < 5) return false;
    var curTop = cur.top ? cur.top.rank : 0;
    if (curTop > 10) return false;
    var midPairs = 0;
    var prk;
    for (prk = 0; prk <= 7; prk++) {
      if ((info.byRank[prk] || 0) >= 2) midPairs++;
    }
    var highPairBreaks = 0;
    var sRanks = {};
    var si;
    for (si = 0; si < safe.length; si++) {
      sRanks[safe[si].rank] = (sRanks[safe[si].rank] || 0) + 1;
    }
    for (prk = 9; prk <= 11; prk++) {
      // Break pair into single (Q/K/A pair-back destroyed)
      if ((info.byRank[prk] || 0) >= 2 && (sRanks[prk] || 0) === 1) highPairBreaks++;
    }
    // Gold 0510: mid pairs + answer is high seq that tears Q/K pair-backs
    if (cur.type === 'seq' && midPairs >= 2 && highPairBreaks >= 1) {
      var sc = detectCombo(safe);
      if (sc && sc.type === 'seq' && safe.length >= 3) return true;
    }
    // Gold 0501: mid pair answered by high pair (QQ+) while holding 2s → pass
    if (
      (cur.type === 'pair' || cur.type === 'triple') &&
      info.twos >= 1 &&
      curTop <= 9 &&
      handLen >= 10 &&
      omin >= 5
    ) {
      var safeComP = detectCombo(safe);
      if (safeComP && safeComP.type === 'pair' && topRank(safe) >= 9) return true;
      if (highPairBreaks >= 1 || safeCost >= 34) return true;
    }
    return false;
  }

  function residualMaxRun(hand, play) {
    if (!play || !play.length) return 0;
    var used = {};
    var i;
    for (i = 0; i < play.length; i++) used[play[i].rank * 4 + play[i].suit] = 1;
    var leftRanks = {};
    for (i = 0; i < hand.length; i++) {
      if (!used[hand[i].rank * 4 + hand[i].suit]) {
        leftRanks[hand[i].rank] = (leftRanks[hand[i].rank] || 0) + 1;
      }
    }
    var ranks = Object.keys(leftRanks).map(Number).sort(function (a, b) { return a - b; });
    var maxRun = 1, run = 1, ri;
    for (ri = 1; ri < ranks.length; ri++) {
      if (ranks[ri] === ranks[ri - 1] + 1) {
        run++;
        if (run > maxRun) maxRun = run;
      } else run = 1;
    }
    return ranks.length ? maxRun : 0;
  }

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
      // Breaking a pair into a single (humans punish this hard) — user IMG_0498/0501
      if (had >= 2 && left === 1 && used === 1) cost += 11; // ladder-soft pair-break
      if (had === 2 && used === 1) cost += 7;
      // Breaking a triple
      if (had >= 3 && left > 0 && left < 3 && used < had) cost += 5;
      // Breaking sequence spine (only count real ≥3 chains; not mere 7-8 couples)
      if (left === 0) {
        var chainN = 1;
        var tn;
        for (tn = rk - 1; byRank[tn]; tn--) chainN++;
        for (tn = rk + 1; byRank[tn]; tn++) chainN++;
        if (chainN >= 3) {
          if (byRank[rk - 1] && byRank[rk + 1]) cost += 12; // interior of ≥3 run
          else if (byRank[rk - 1] || byRank[rk + 1]) cost += 3; // edge of ≥3 run
        }
      }
    }
    if (play.length === 1 && (byRank[play[0].rank] || 0) >= 2) cost += 14;
    // Sequence interior / edge: single from a real ≥3 run (user IMG_0500/0502/0504/0505)
    // Do NOT punish mere 2-card connectors (7-8 alone is not a straight).
    if (play.length === 1) {
      var pr0 = play[0].rank;
      var chain = 1;
      var t;
      for (t = pr0 - 1; byRank[t]; t--) chain++;
      for (t = pr0 + 1; byRank[t]; t++) chain++;
      if (chain >= 3) {
        var nbrL = byRank[pr0 - 1] || 0;
        var nbrR = byRank[pr0 + 1] || 0;
        // Interior run-break must lose to loose/extra singles (gold 0500/02/04/05).
        // Dual harm came from over-pass / forced doubleseq, not from this ranking.
        if (nbrL && nbrR) cost += 24; // interior run — prefer loose/2 (IMG0500)
        else cost += 8;
        if (chain >= 4) cost += 5;
        else cost += 3;
        // Prefer shedding from triple/quad over pure run singles
        if ((byRank[pr0] || 0) >= 3) cost -= 8;
      }
    }
    // Multi play that splits a longer same-type residual (user IMG_0503)
    if (play.length >= 3) {
      var comP = detectCombo(play);
      if (comP && comP.type === 'seq') {
        // Prefer not taking the low end of a longer chain when higher parallel seq exists
        var low = 99, hi = -1, pi;
        for (pi = 0; pi < play.length; pi++) {
          if (play[pi].rank < low) low = play[pi].rank;
          if (play[pi].rank > hi) hi = play[pi].rank;
        }
        if (byRank[low - 1] || byRank[hi + 1]) cost += 6;
      }
    }
    return cost;
  }

  /**
   * Residual hand quality after a play (higher = better). Used to pick among
   * equal-structure multi answers (e.g. 9-10-J-Q leaves 7-8-9 vs 7-8-9-10 leaves trash 9).
   */
  function residualQuality(hand, play) {
    if (!play || !play.length) return 0;
    var used = {};
    var ui;
    for (ui = 0; ui < play.length; ui++) {
      used[play[ui].rank * 4 + play[ui].suit] = 1;
    }
    var left = [];
    for (ui = 0; ui < hand.length; ui++) {
      if (!used[hand[ui].rank * 4 + hand[ui].suit]) left.push(hand[ui]);
    }
    if (!left.length) return 100; // emptied
    var info = analyzeHand(left);
    var byRank = info.byRank;
    var ranks = Object.keys(byRank).map(Number).sort(function (a, b) { return a - b; });
    var maxRun = 1, run = 1, ri;
    for (ri = 1; ri < ranks.length; ri++) {
      if (ranks[ri] === ranks[ri - 1] + 1) {
        run++;
        if (run > maxRun) maxRun = run;
      } else run = 1;
    }
    var pairs = 0;
    for (ri = 0; ri < ranks.length; ri++) {
      if (byRank[ranks[ri]] >= 2) pairs++;
    }
    // Prefer low trash, long runs, pairs; mild preference for higher leftover singles (J > 9)
    var highLoose = 0;
    for (ui = 0; ui < left.length; ui++) {
      var c = left[ui];
      if (byRank[c.rank] === 1 && c.rank >= 8 && c.rank <= 11) highLoose += (c.rank - 7);
    }
    // Stronger pair preservation (gold 0517: keep 99 over loose 9 after long seq)
    return maxRun * 5 + pairs * 5.5 - info.trashCount * 5 + highLoose * 0.5 - left.length * 0.15;
  }

  /**
   * Pick best legal among pool: minimize structure break, then maximize residual,
   * then expertScore (minimal beat among safe plays).
   */
  function pickStructureSafe(pool, state, myIdx) {
    if (!pool || !pool.length) return null;
    var hand = state.players[myIdx].hand;
    // User IMG_0503/0519: among equal-length sequences, residual structure dominates
    var seqLen = 0;
    var allSameSeq = true;
    var allSingles = true;
    var si;
    for (si = 0; si < pool.length; si++) {
      var comS = detectCombo(pool[si]);
      if (!comS || comS.type !== 'seq') { allSameSeq = false; }
      else {
        if (!seqLen) seqLen = pool[si].length;
        else if (pool[si].length !== seqLen) { allSameSeq = false; }
      }
      if (!pool[si] || pool[si].length !== 1) allSingles = false;
    }
    var best = pool[0];
    var bestSc = structureBreakCost(hand, best);
    var bestRes = residualQuality(hand, best);
    var bestRun = residualMaxRun(hand, best);
    var bestExp = expertScore(best, state, myIdx);
    var i;
    for (i = 1; i < pool.length; i++) {
      var p = pool[i];
      var sc = structureBreakCost(hand, p);
      var res = residualQuality(hand, p);
      var run = residualMaxRun(hand, p);
      var exp = expertScore(p, state, myIdx);
      var better = false;
      if (allSameSeq) {
        // P4: residual first (0503/0519); lower top only when residual nearly tied
        var pTopS = topRank(p);
        var bTopS = topRank(best);
        if (res > bestRes + 0.3) better = true;
        else if (res < bestRes - 0.3) better = false;
        else if (pTopS < bTopS) better = true; // keep high control multi
        else if (pTopS === bTopS && sc < bestSc - 0.5) better = true;
        else if (pTopS === bTopS && Math.abs(sc - bestSc) < 0.5 && exp < bestExp) better = true;
      } else if (allSingles) {
        // P1/P5 dual-safe: residual run → quality → min top; 2 only if non-2 smashes
        var pTop = p[0].rank;
        var bTop = best[0].rank;
        var ominS = oppMinHand(state, myIdx);
        if (ominS <= 1) {
          if (pTop === 12 && bTop !== 12) better = true;
          else if (pTop !== 12 && bTop === 12) better = false;
          else if (run > bestRun) better = true;
          else if (run === bestRun && pTop < bTop) better = true;
        } else if (pTop === 12 && bTop < 12) {
          // 0500: 2 when best non-2 smashes (sc≥12 includes K edge of JQK)
          if (bestSc >= 12) better = true;
        } else if (pTop < 12 && bTop === 12) {
          if (sc < 12) better = true; // clean non-2 over 2
        } else if (pTop < 12 && bTop < 12) {
          // residual maxRun first (0520b: 7 keeps 6789)
          if (run > bestRun) better = true;
          else if (run < bestRun) better = false;
          else if (res > bestRes + 0.4) better = true;
          else if (res < bestRes - 0.4) better = false;
          // P1 min top when residual close — but not if it costs much more structure
          else if (pTop < bTop && sc <= bestSc + 25) better = true;
          else if (pTop === bTop && sc < bestSc - 0.5) better = true;
          else if (pTop === bTop && Math.abs(sc - bestSc) < 0.5 && exp < bestExp) better = true;
        }
      } else {
        if (sc < bestSc - 0.5) better = true;
        else if (Math.abs(sc - bestSc) < 0.5 && res > bestRes + 0.25) better = true;
        else if (Math.abs(sc - bestSc) < 0.5 && Math.abs(res - bestRes) < 0.25 &&
                 p.length === best.length && topRank(p) < topRank(best)) better = true;
        else if (Math.abs(sc - bestSc) < 0.5 && Math.abs(res - bestRes) < 0.25 && exp < bestExp) better = true;
      }
      if (better) {
        best = p;
        bestSc = sc;
        bestRes = res;
        bestRun = run;
        bestExp = exp;
      }
    }
    return best;
  }

  /**
   * Hand structure analysis for trash/control planning.
   * trashRanks: low isolated singles not in a pair and not inside a ≥3 run.
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
    var trash = []; // card objects that are trash singles
    var control = 0; // count of A/K/2
    var twos = 0;
    for (i = 0; i < hand.length; i++) {
      var c = hand[i];
      if (c.rank === 12) twos++;
      if (c.rank >= 10) control++;
      // Trash: isolated single, rank ≤9, not in a playable 3+ sequence chain
      if (byRank[c.rank] === 1 && !inSeq[c.rank] && c.rank <= 9) {
        trash.push(c);
      }
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
   * v3: trash-shed, control aggression, no-gift vs 1-card opponents.
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
    var handLen = hand.length;
    var info = analyzeHand(hand);

    if (afterLen === 0) return -100000; // go out immediately

    score += afterLen * 1.0;
    score += structureBreakCost(hand, play) * (_P.struct ? 3.4 : 2.2);

    if (!cur) {
      // FREE LEAD
      // Endgame: opponent has 1 card — NEVER gift a low single they can beat
      if (omin === 1) {
        if (com.type === 'single') {
          if (com.top.rank < 10) score += 200; // almost forbidden
          if (com.top.rank === 12) score -= 40; // lead 2 to lock
          else if (com.top.rank >= 10) score -= 15;
        } else {
          score -= play.length * 8; // multi pressure / volume
          score += topRank(play) * 0.3;
        }
      } else if (com.type === 'single' && isTrashSinglePlay(play, info)) {
        // Trash shed: good with control, but prefer low multi volume first (v5)
        if (handLen >= 8 && info.hasControl && info.trashCount >= 2) {
          score -= 30 - com.top.rank * 1.5;
        } else if (handLen >= 9 && info.twos >= 1) {
          score -= 22 - com.top.rank;
        } else {
          score += 30; // without control: don't dump random singles
        }
      } else if (com.type === 'single') {
        score += 55;
        if (com.top.rank >= 10) score += 18;
        if (com.top.rank === 12) score += 40;
      } else {
        // Multi: strong preference for low volume free-leads (human multi bias)
        score -= comboPriority(com.type) * 12;
        if (play.length === 2) score -= 16;
        else if (play.length === 3) score -= 18;
        else if (play.length === 4) score -= 14;
        else if (play.length >= 5) score -= 8 - (play.length - 5);
        score += topRank(play) * 0.9;
        if (topRank(play) <= 8) score -= 18;
        if (com.type === 'pair') score -= 5;
        if (topRank(play) <= 6) score -= 8;
      }
      if (usesTwo && afterLen > 1) score += 50;
      if (bomb && afterLen > 0) score += 35;

      // Aggressive control: midgame with control + trash — slight preference for
      // leading medium singles (8-9) to fish control is handled via MC later
    } else {
      score += topRank(play) * 0.85;
      score += play.length * 0.15;
      var curTop = cur.top ? cur.top.rank : 0;
      if (usesTwo && !facing2) {
        var pen = 28;
        if (curTop >= 10) pen *= 0.15;
        else if (curTop >= 8) pen *= 0.45;
        if (omin <= 3) pen *= 0.25;
        if (handLen <= 4) pen *= 0.3;
        // Aggressive: contest more when we have trash remaining (need lead back)
        if (info.trashCount >= 2 && curTop >= 9) pen *= 0.5;
        score += pen;
      }
      if (bomb && !facing2) score += 55;
      if (facing2 && bomb) score -= 30;
      if (cur.type === 'single' && com.type === 'single') {
        var gap = com.top.rank - cur.top.rank;
        // Mild overkill only — harsh gap penalties gutted dual WR (P1-P5 probe 0.48)
        if (_P.midGap) {
          if (gap > 1 && com.top.rank >= 8 && !usesTwo) score += gap * 1.6;
        } else if (gap > 2 && com.top.rank >= 9 && !usesTwo) score += gap * 0.8;
      }
      // P4 mild multi lower-top preference (tie-break scale only)
      if (play && play.length >= 2 && cur && com && cur.type === com.type) {
        score += topRank(play) * 0.12;
      }
      // P5 mild: save 2 vs low mid when deep
      if (usesTwo && !facing2 && cur.type === 'single') {
        if (curTop < 8 && omin >= 5 && handLen >= 8) score += 8;
      }
      // Structure dominates combat ranking (user screenshots Jul 2026)
      var sbcC = structureBreakCost(hand, play);
      if (sbcC > 0) score += sbcC * 2.5;
      // Residual quality among multi answers
      if (play && play.length >= 2) score -= residualQuality(hand, play) * 0.8;
      // If omin==1 and we can beat, prefer beating over pass (handled in policy)
    }

    if (omin <= 2) {
      score -= play.length * 3.5;
      if (usesTwo) score -= 16;
    }
    if (handLen <= 3) score -= 10;

    return score;
  }

  function orderLegals(legals, state, myIdx) {
    var hand = state.players[myIdx].hand;
    var cur = state.currentCombo;
    var ominO = oppMinHand(state, myIdx);
    return legals.slice().sort(function (a, b) {
      // Structure first (dual-critical); min-beat only among near-equal structure
      var sa = structureBreakCost(hand, a);
      var sb = structureBreakCost(hand, b);
      if (Math.abs(sa - sb) > 0.5) return sa - sb;
      // Combat singles: non-2 first (unless omin<=1), then lower top (P1)
      if (cur && a && b && a.length === 1 && b.length === 1) {
        var ta = a[0].rank, tb = b[0].rank;
        if (ominO > 1) {
          if (ta === 12 && tb !== 12) return 1;
          if (tb === 12 && ta !== 12) return -1;
        }
        if (ta !== tb) return ta - tb;
      }
      // Multi: residual then lower top (P4)
      if (a && b && a.length >= 2 && b.length >= 2) {
        var ra = residualQuality(hand, a);
        var rb = residualQuality(hand, b);
        if (Math.abs(ra - rb) > 0.2) return rb - ra;
        if (a.length === b.length) {
          var ta2 = topRank(a), tb2 = topRank(b);
          if (ta2 !== tb2) return ta2 - tb2;
        }
      }
      return expertScore(a, state, myIdx) - expertScore(b, state, myIdx);
    });
  }

  /** P5: spend single 2 only when needed (not for clean non-2 beats). */
  function shouldSpendTwoNow(state, myIdx, cur, omin, handLen, info, non2Pool) {
    if (!cur || cur.type !== 'single') return false;
    var curTop = cur.top ? cur.top.rank : 0;
    if (omin <= 1) return true;
    if (curTop >= 11) return true;
    if (handLen <= 3) return true;
    var hand = state.players[myIdx].hand;
    var hasSafeNon2 = false;
    var minNon2Sc = 1e9;
    var ni;
    for (ni = 0; ni < (non2Pool || []).length; ni++) {
      var p = non2Pool[ni];
      if (!p || p.length !== 1 || p[0].rank >= 12) continue;
      var psc = structureBreakCost(hand, p);
      if (psc < minNon2Sc) minNon2Sc = psc;
      // sc < 12 = truly clean (loose single / low edge). K edge of JQK is sc=14 → not safe.
      if (psc < 12) { hasSafeNon2 = true; break; }
    }
    // Safe non-2 → save 2. Structure-smash only (0500) → spend 2.
    if (hasSafeNon2 && curTop <= 10 && omin >= 2) return false;
    if (!hasSafeNon2 && curTop >= 8) return true;
    if (minNon2Sc >= 12 && curTop >= 8) return true;
    if (omin <= 2 && curTop >= 8) return true;
    return false;
  }

  /**
   * Expert policy move for rollouts (and fallback).
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

    if (!cur) {
      return { play: pickFreeLeadHard(leg, state, cp) };
    }

    var omin = oppMinHand(state, cp);
    var handLen = hand.length;
    var curTop = cur.top ? cur.top.rank : 0;
    var infoC = analyzeHand(hand);

    // Legal single-2 answers
    var twoSingles = [];
    for (var ti = 0; ti < leg.length; ti++) {
      if (leg[ti].length === 1 && leg[ti][0].rank === 12) twoSingles.push(leg[ti]);
    }

    // v7 FIRST: facing Ace + hold 2 + remaining hand → play 2 (before cheap path)
    // human-log #43–#72: Ace-climb let humans reclaim with 2s
    if (
      cur.type === 'single' &&
      curTop >= 11 &&
      twoSingles.length &&
      (handLen >= 3 || omin <= 3)
    ) {
      twoSingles.sort(function (a, b) { return a[0].suit - b[0].suit; });
      return { play: twoSingles[0] };
    }

    // Playlog gold (IMG_0520 actual): vs 1-card opp, single-beat with 2 for sure control
    // (safer than residual mid). Screenshot residual 7-vs-6 still applies when omin>1.
    if (cur.type === 'single' && omin <= 1 && twoSingles.length && handLen >= 3) {
      twoSingles.sort(function (a, b) { return a[0].suit - b[0].suit; });
      return { play: twoSingles[0] };
    }

    // P5 / probe-TWO: 2-tempo vs mid when race/trash, gated by shouldSpendTwoNow
    if (
      cur.type === 'single' &&
      curTop >= (_P.two7 ? 7 : 8) &&
      curTop <= 10 &&
      twoSingles.length &&
      omin <= 3 &&
      handLen >= 4 &&
      handLen <= 9 &&
      (infoC.trashCount >= 1 || infoC.control >= 2)
    ) {
      var non2Probe = [];
      for (var np = 0; np < leg.length; np++) {
        if (!playHasTwo(leg[np]) && !playIsBomb(leg[np])) non2Probe.push(leg[np]);
      }
      if (shouldSpendTwoNow(state, cp, cur, omin, handLen, infoC, non2Probe)) {
        twoSingles.sort(function (a, b) { return a[0].suit - b[0].suit; });
        return { play: twoSingles[0] };
      }
    }

    // P2 dual-safe soft-pass: deep mid pairs only (0501-adjacent). Never fold seqs.
    if (
      handLen >= 11 &&
      (cur.type === 'pair' || cur.type === 'triple') &&
      !playIsBomb(cur.cards || []) &&
      (
        (omin >= 7 && curTop < 8) ||
        (_P.softPass11 && omin >= 5 && curTop < 10)
      )
    ) {
      return { pass: true };
    }

    var cheap = cheapLegals(leg);
    if (cheap.length) {
      var pool = cheap.slice();
      var minC = 1e9, ci;
      for (ci = 0; ci < cheap.length; ci++) {
        var csc0 = structureBreakCost(hand, cheap[ci]);
        if (csc0 < minC) minC = csc0;
      }
      // Include 2s when all cheap answers smash structure (user IMG_0500)
      if (twoSingles.length && minC >= 14 && cur.type === 'single' && curTop >= 8) {
        for (ci = 0; ci < twoSingles.length; ci++) pool.push(twoSingles[ci]);
      }
      var safe = pickStructureSafe(pool, state, cp);
      var safeCost = safe ? structureBreakCost(hand, safe) : 0;
      // Gold structure-pass is NARROW (over-pass killed dual WR):
      // 0501: soft-pass mid pair already handles deep mid pairs.
      // 0510: pass high seq that burns Q/K pair-backs while holding mid pairs to back.
      // Default: play structure-safe beat — never fold a cheap safe answer.
      if (!_P.combatV91 && safe && shouldStructurePass(hand, safe, safeCost, cur, infoC, omin, handLen)) {
        return { pass: true };
      }
      if (
        !_P.combatV91 &&
        twoSingles.length &&
        safeCost >= 14 &&
        cur.type === 'single' &&
        curTop >= 8 &&
        !(safe && safe.length === 1 && safe[0].rank === 12)
      ) {
        // P5: spend 2 when structure-smashing (0500); shouldSpendTwoNow may still save
        if (shouldSpendTwoNow(state, cp, cur, omin, handLen, infoC, cheap) || safeCost >= 14) {
          twoSingles.sort(function (a, b) { return a[0].suit - b[0].suit; });
          return { play: twoSingles[0] };
        }
      }
      // COMBATV91: v9.1-style cheap path via orderLegals (structure via expertScore only)
      if (_P.combatV91) return { play: orderLegals(cheap, state, cp)[0] };
      return { play: safe };
    }

    // User IMG_0511: only 2-pair/2-bomb answers left — pass to save 2s for weak singles
    if (!cheapLegals(leg).length) {
      var onlyTwoAns = true;
      var ti2;
      for (ti2 = 0; ti2 < leg.length; ti2++) {
        if (!playHasTwo(leg[ti2]) && !playIsBomb(leg[ti2])) { onlyTwoAns = false; break; }
      }
      // Gold 0511: pass 22 vs AA only when several weak singles need 2-cover later
      if (
        onlyTwoAns &&
        handLen >= 10 &&
        omin >= 4 &&
        curTop >= 11 &&
        infoC.trashCount >= 2
      ) {
        return { pass: true };
      }
    }

    // Bombs vs 2s
    if (cur.cards.every(function (c) { return c.rank === 12; })) {
      var bombs = [];
      for (var b = 0; b < leg.length; b++) if (playIsBomb(leg[b])) bombs.push(leg[b]);
      if (bombs.length) return { play: orderLegals(bombs, state, cp)[0] };
    }

    // Prefer non-2 answers; optional 2 vs K when only high answers remain
    var non2 = [];
    for (var ni = 0; ni < leg.length; ni++) {
      if (!playHasTwo(leg[ni]) && !playIsBomb(leg[ni])) non2.push(leg[ni]);
    }
    if (non2.length) {
      if (
        cur.type === 'single' &&
        curTop >= 10 &&
        twoSingles.length &&
        handLen >= 6 &&
        (infoC.trashCount >= 1 || infoC.twos >= 1)
      ) {
        var onlyAcesNon2 = non2.every(function (p) {
          return p.length === 1 && p[0].rank >= 11;
        });
        var onlyHighNon2 = non2.every(function (p) {
          return p.length === 1 && p[0].rank >= 10;
        });
        // Ace → 2; face Q with clean K → K (P5 save 2); only-high smash → 2
        if (onlyAcesNon2) {
          twoSingles.sort(function (a, b) { return a[0].suit - b[0].suit; });
          return { play: twoSingles[0] };
        }
        if (onlyHighNon2) {
          if (shouldSpendTwoNow(state, cp, cur, omin, handLen, infoC, non2)) {
            twoSingles.sort(function (a, b) { return a[0].suit - b[0].suit; });
            return { play: twoSingles[0] };
          }
          return { play: orderLegals(non2, state, cp)[0] };
        }
      }
      // v8.5: mild climb only vs 1-card opp (force out), not general midgame waste
      if (
        cur.type === 'single' &&
        omin === 1 &&
        handLen <= 7 &&
        curTop <= 9
      ) {
        var climbs = non2.filter(function (p) {
          return p.length === 1 && p[0].rank >= curTop + 2 && p[0].rank <= 11;
        });
        if (climbs.length) {
          climbs.sort(function (a, b) {
            return b[0].rank - a[0].rank || b[0].suit - a[0].suit;
          });
          return { play: climbs[0] };
        }
      }
      return { play: orderLegals(non2, state, cp)[0] };
    }

    // Pure 2 / bomb answers only — never pass vs Ace
    if (curTop >= 11 && twoSingles.length) {
      twoSingles.sort(function (a, b) { return a[0].suit - b[0].suit; });
      return { play: twoSingles[0] };
    }
    if (handLen <= 5 || omin <= 2 || curTop >= 10) {
      return { play: orderLegals(leg, state, cp)[0] };
    }
    if (handLen <= 7 && (omin <= 3 || curTop >= 9)) {
      return { play: orderLegals(leg, state, cp)[0] };
    }
    // Contest when short / race; soft-pass only deep + weak mid (dual + P2 balance)
    if (handLen <= 7 && leg.length) {
      return { play: orderLegals(leg, state, cp)[0] };
    }
    if (handLen >= 8 && curTop < 10 && omin <= 4 && leg.length) {
      return { play: orderLegals(leg, state, cp)[0] };
    }
    if (handLen >= 10 && curTop < 9 && omin >= 7) return { pass: true };
    if (handLen >= 9 && curTop < 9 && omin >= 7) return { pass: true };

    return { play: orderLegals(leg, state, cp)[0] };
  }

  /** Root free-lead candidate set for MC/MCTS (includes trash shed options). */
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
      if (omin === 1) {
        // only multi or high singles
        if (p.length >= 2 && !playIsExpensive(p)) out.push(p);
        else if (p.length === 1 && p[0].rank >= 10) out.push(p);
        continue;
      }
      if (p.length >= 2 && !playIsExpensive(p)) {
        out.push(p);
        continue;
      }
      if (isTrashSinglePlay(p, info) && info.hasControl && state.players[cp].hand.length >= 7) {
        out.push(p);
        continue;
      }
    }
    if (!out.length) {
      // fallback: all non-expensive
      for (i = 0; i < leg.length; i++) {
        if (!playIsExpensive(leg[i])) out.push(leg[i]);
      }
    }
    if (!out.length) out = leg.slice();
    return orderLegals(out, state, cp);
  }

  /**
   * Free lead v3:
   *  1) Go-out if possible
   *  2) If opp has 1 card: never gift low single — lead 2/A/K or multi
   *  3) Early + control + trash: shed lowest trash single (avoid late stuck)
   *  4) Else low multi (pairs/short seqs)
   *  5) Else lowest cheap single
   */
  function pickFreeLeadHard(leg, state, cp) {
    var hand = state.players[cp].hand;
    var info = analyzeHand(hand);
    var omin = oppMinHand(state, cp);
    var handLen = hand.length;
    var multi = [];
    var dseqAll = []; // doubleseq is bomb-classed (≥3 pairs) but excellent free leads
    var i;
    for (i = 0; i < leg.length; i++) {
      if (leg[i].length < 2) continue;
      var comL0 = detectCombo(leg[i]);
      if (comL0 && comL0.type === 'doubleseq') {
        dseqAll.push(leg[i]);
        multi.push(leg[i]); // include even if expensive/bomb-classed
      } else if (!playIsExpensive(leg[i])) {
        multi.push(leg[i]);
      }
    }

    // Sort multi by residual plan quality (gold 0517/0521)
    function rankFreeMulti(a, b) {
      // Gold 0517: with pair-of-2s, prefer high control multi (seq top≥9) before low pairs
      if (info.twos >= 2) {
        var ca = detectCombo(a);
        var cb = detectCombo(b);
        var aCtrl = ca && ca.type === 'seq' && topRank(a) >= 9;
        var bCtrl = cb && cb.type === 'seq' && topRank(b) >= 9;
        if (aCtrl !== bCtrl) return aCtrl ? -1 : 1;
        if (aCtrl && bCtrl) {
          // Prefer residual that keeps mid pairs (10-J-Q-K over 9-10-J-Q-K),
          // but longer/higher multi wins when residual close (include K in control).
          var ra0 = residualQuality(hand, a);
          var rb0 = residualQuality(hand, b);
          if (a.length !== b.length && Math.abs(ra0 - rb0) < 3.5) return b.length - a.length;
          if (Math.abs(ra0 - rb0) > 0.5) return rb0 - ra0;
          return topRank(b) - topRank(a);
        }
      }
      var ra = residualQuality(hand, a);
      var rb = residualQuality(hand, b);
      if (Math.abs(ra - rb) > 0.4) return rb - ra;
      var sa = structureBreakCost(hand, a);
      var sb = structureBreakCost(hand, b);
      if (Math.abs(sa - sb) > 0.5) return sa - sb;
      if (a.length !== b.length) return b.length - a.length;
      return topRank(a) - topRank(b);
    }

    // (2) One-card opponent: no gift — multi they cannot answer (gold 0521: 6789 not 77/2)
    if (omin === 1) {
      for (i = 0; i < leg.length; i++) {
        if (leg[i].length === handLen) return leg[i];
      }
      if (dseqAll.length) {
        dseqAll.sort(rankFreeMulti);
        return dseqAll[0];
      }
      if (multi.length) {
        multi.sort(rankFreeMulti);
        return multi[0];
      }
      // No multi: high control single (2 best)
      var highs1 = leg.filter(function (p) {
        return p.length === 1 && p[0].rank >= 10;
      });
      if (highs1.length) {
        highs1.sort(function (a, b) { return b[0].rank - a[0].rank || b[0].suit - a[0].suit; });
        return highs1[0];
      }
      var allS1 = leg.filter(function (p) { return p.length === 1; });
      if (allS1.length) {
        allS1.sort(function (a, b) { return b[0].rank - a[0].rank; });
        return allS1[0];
      }
      return orderLegals(leg, state, cp)[0];
    }

    // (3) Free lead plan
    var trashPlays = [];
    for (i = 0; i < leg.length; i++) {
      if (isTrashSinglePlay(leg[i], info)) trashPlays.push(leg[i]);
    }
    trashPlays.sort(function (a, b) {
      return a[0].rank - b[0].rank || a[0].suit - b[0].suit;
    });

    // Gold 0518: short hand + pair of 2s → lead 22 for sure control, then trash
    if (handLen <= 4 && info.twos >= 2) {
      var pair2Lead = [];
      for (i = 0; i < leg.length; i++) {
        if (
          leg[i].length === 2 &&
          leg[i][0].rank === 12 &&
          leg[i][1].rank === 12
        ) pair2Lead.push(leg[i]);
      }
      if (pair2Lead.length) return pair2Lead[0];
    }

    // P3: if residual multi ranking would lead high pair (AA/KK), prefer low pair (≤5)
    // instead — human dumps volume early. Only intercept pure high-pair leads (not seqs).
    if (handLen >= 10 && info.twos < 2 && multi.length) {
      var multiP3 = multi.slice().sort(rankFreeMulti);
      var topP3 = multiP3[0];
      var comP3 = detectCombo(topP3);
      if (comP3 && comP3.type === 'pair' && topRank(topP3) >= 10) {
        var lowPairs = [];
        for (i = 0; i < multi.length; i++) {
          var comLP = detectCombo(multi[i]);
          if (comLP && comLP.type === 'pair' && topRank(multi[i]) <= 5) lowPairs.push(multi[i]);
        }
        if (lowPairs.length) {
          lowPairs.sort(function (a, b) { return topRank(a) - topRank(b); });
          return lowPairs[0];
        }
      }
    }

    // User IMG_0499: opp exactly 2 cards + hold 2 → lead 2 (they may beat multi).
    // Do NOT do this for omin===1 (multi is unanswerable — gold 0521).
    if (omin === 2 && info.twos >= 1 && handLen <= 5) {
      var twoLead = [];
      for (i = 0; i < leg.length; i++) {
        if (leg[i].length === 1 && leg[i][0].rank === 12) twoLead.push(leg[i]);
      }
      if (twoLead.length) {
        twoLead.sort(function (a, b) { return a[0].suit - b[0].suit; });
        return twoLead[0];
      }
    }

    // Gold 0506/0507: doubleseq free-lead when it is the plan — not always.
    // 0507 first-lead: 334455 with 3♠. 0506: 667788 leaves finishing 345 run.
    // Always-force burned bombs early and lost dual tempo.
    if (dseqAll.length) {
      dseqAll.sort(function (a, b) {
        if (a.length !== b.length) return b.length - a.length;
        return topRank(a) - topRank(b);
      });
      if (state.isFirstLead) {
        var with3 = dseqAll.filter(function (p) {
          for (var zi = 0; zi < p.length; zi++) {
            if (p[zi].rank === 0 && p[zi].suit === 0) return true;
          }
          return false;
        });
        if (with3.length) return with3[0];
      }
      var bestD = dseqAll[0];
      var resD = residualQuality(hand, bestD);
      var runAfter = residualMaxRun(hand, bestD);
      // Prefer dseq when residual keeps a finishing ≥3 run (0506) or clears most of hand
      if (runAfter >= 3 || bestD.length >= handLen - 3) return bestD;
      // Or residual clearly better than best plain multi
      var plainMulti = [];
      for (i = 0; i < multi.length; i++) {
        var cm = detectCombo(multi[i]);
        if (!cm || cm.type !== 'doubleseq') plainMulti.push(multi[i]);
      }
      if (!plainMulti.length) return bestD;
      plainMulti.sort(function (a, b) {
        if (a.length !== b.length) return b.length - a.length;
        return residualQuality(hand, b) - residualQuality(hand, a);
      });
      var resP = residualQuality(hand, plainMulti[0]);
      if (resD > resP + 0.5) return bestD;
      // else fall through — search/multi ranking may prefer plain seq
    }

    if (multi.length) {
      // Residual-first multi ranking (gold 0517)
      var multiRanked = multi.slice().sort(rankFreeMulti);
      var multiPick = multiRanked[0];

      // Gold 0514: trash before high multi when we do NOT hold pair-of-2s.
      // Gold 0517: with 22, lead residual high multi first (10-J-Q-K), trash last.
      // twos>=2 means absolute control backup — multi-first is correct.
      if (
        trashPlays.length >= 1 &&
        info.twos < 2 &&
        (info.twos >= 1 || info.control >= 2) &&
        handLen >= 8 &&
        handLen <= 12 &&
        omin >= 4
      ) {
        var highMultiPlan = multi.filter(function (p) {
          var tp = topRank(p);
          var cm = detectCombo(p);
          return tp >= 8 && cm && (cm.type === 'seq' || cm.type === 'doubleseq' || tp >= 9);
        });
        if (highMultiPlan.length) return trashPlays[0];
      }

      // v8.5: 2p perfect-info unanswerable multi (after trash-first plan).
      // Skip when holding 22 — residual control multi plan dominates (gold 0517).
      if (state.players.length === 2 && info.twos < 2) {
        var oppI = cp === 0 ? 1 : 0;
        var oppHand = state.players[oppI] && state.players[oppI].hand;
        if (oppHand && oppHand.length) {
          var unans = [];
          var forceExp = [];
          var mi;
          for (mi = 0; mi < multi.length; mi++) {
            var mp = multi[mi];
            var com = detectCombo(mp);
            if (!com) continue;
            var oleg = getLegalPlays(oppHand, com, false, false, null);
            if (!oleg.length) unans.push(mp);
            else if (!cheapLegals(oleg).length) forceExp.push(mp);
          }
          if (unans.length) {
            unans.sort(rankFreeMulti);
            return unans[0];
          }
          if (forceExp.length && handLen <= 11) {
            forceExp.sort(rankFreeMulti);
            return forceExp[0];
          }
        }
      }

      // Mild low-multi preference when residual close — NOT when holding 22
      // (gold 0517: keep high control multi over low pair 99)
      var lowMulti = multi.filter(function (p) { return topRank(p) <= 8; });
      if (lowMulti.length && info.twos < 2) {
        lowMulti.sort(rankFreeMulti);
        if (residualQuality(hand, lowMulti[0]) >= residualQuality(hand, multiPick) - 1.0) {
          multiPick = lowMulti[0];
        }
      }
      if (
        _exploitFlMode === 'hybrid' &&
        trashPlays.length >= 2 &&
        (info.twos >= 1 || info.control >= 2) &&
        handLen >= 7 &&
        multiPick &&
        topRank(multiPick) > 6
      ) {
        return trashPlays[0];
      }
      return multiPick;
    }

    // No multi: dump trash if any — but never lonely 3-5 open midgame without control
    // (human-log #35: free-lead 4s surrendered structure)
    if (trashPlays.length) {
      if (
        (handLen <= 8 && trashPlays[0][0].rank <= 5 && info.twos === 0) ||
        (handLen >= 10 && trashPlays[0][0].rank <= 4 && info.control < 2)
      ) {
        var cheapS0 = [];
        for (i = 0; i < leg.length; i++) {
          if (!playIsExpensive(leg[i]) && !(leg[i].length === 1 && leg[i][0].rank <= 5)) {
            cheapS0.push(leg[i]);
          }
        }
        if (cheapS0.length) return orderLegals(cheapS0, state, cp)[0];
      }
      return trashPlays[0];
    }

    // (5) Lowest cheap single
    var cheapS = [];
    for (i = 0; i < leg.length; i++) {
      if (!playIsExpensive(leg[i])) cheapS.push(leg[i]);
    }
    if (cheapS.length) return orderLegals(cheapS, state, cp)[0];
    return orderLegals(leg, state, cp)[0];
  }

  /**
   * Shallow perfect-info endgame: when few cards remain, try each legal root move
   * and finish with expert rollouts — pick max place utility.
   */
  function endgamePick(state, myIdx) {
    var handLen = state.players[myIdx].hand.length;
    var total = 0;
    for (var i = 0; i < state.players.length; i++) {
      if (!state.players[i].finished) total += state.players[i].hand.length;
    }
    // Only true endgame — shallow solver is noisy midgame
    if (handLen > 4 && total > 10) return null;

    var leg = getLegalPlays(
      state.players[myIdx].hand, state.currentCombo,
      state.players[myIdx].passed, state.isFirstLead, state.firstLeadCard
    );
    if (!leg.length) return null;

    if (!state.currentCombo) {
      leg = freeLeadCandidates(leg, state, myIdx);
    } else {
      var cheap = cheapLegals(leg);
      if (cheap.length) leg = cheap;
    }

    // Cap candidates
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

  /**
   * Hard post-filters applied after search. Fixes human-exploited bugs:
   * free-lead singles when multi exists; passing cheap beats; folding Ace with answers.
   */
  function enforcePolicyGuards(state, myIdx, proposed) {
    var hand = state.players[myIdx].hand;
    var cur = state.currentCombo;
    var leg = getLegalPlays(hand, cur, state.players[myIdx].passed, state.isFirstLead, state.firstLeadCard);
    if (!leg.length) return null;

    var g;
    for (g = 0; g < leg.length; g++) {
      if (leg[g].length === hand.length) return leg[g];
    }

    function isLegalPlay(play) {
      if (!play || !play.length) return false;
      var sig = playSig(play);
      for (var i = 0; i < leg.length; i++) {
        if (playSig(leg[i]) === sig) return true;
      }
      return false;
    }

    if (!cur) {
      // v3 free-lead guards: go-out, no-gift vs 1-card, allow strategic trash singles
      var hard = pickFreeLeadHard(leg, state, myIdx);
      var ominG = oppMinHand(state, myIdx);
      var infoG = analyzeHand(hand);
      var hardCom = hard ? detectCombo(hard) : null;

      // User IMG_0499: short opp + 2 → always free-lead 2 (sure), never multi
      if (ominG <= 2 && infoG.twos >= 1 && hand.length <= 5) {
        if (hard && hard.length === 1 && hard[0].rank === 12) return hard;
        if (proposed && proposed.length === 1 && proposed[0].rank === 12 && isLegalPlay(proposed)) {
          return proposed;
        }
      }

      // Prefer hard free-lead plan when residual/structure clearly better than search
      if (hard && proposed && isLegalPlay(proposed)) {
        var resH0 = residualQuality(hand, hard);
        var resPr0 = residualQuality(hand, proposed);
        var runH0 = residualMaxRun(hand, hard);
        var runPr0 = residualMaxRun(hand, proposed);
        // Gold 0518: hard 22 over proposed trash single
        if (hard.length === 2 && hard[0].rank === 12 && hard[1].rank === 12 &&
            proposed.length === 1 && proposed[0].rank < 12) {
          return hard;
        }
        // Gold 0514: hard trash over high multi
        if (hard.length === 1 && isTrashSinglePlay(hard, infoG) && proposed.length >= 2 &&
            topRank(proposed) >= 8) {
          return hard;
        }
        // Gold 0517/0521: residual multi plan
        if (hard.length >= 2 && resH0 > resPr0 + 0.4) return hard;
        if (hard.length >= 2 && runH0 > runPr0) return hard;
        if (hardCom && hardCom.type === 'doubleseq') {
          var propComFL = detectCombo(proposed);
          if (!propComFL || propComFL.type !== 'doubleseq') {
            if (runH0 >= 3 || resH0 > resPr0 + 0.5 || state.isFirstLead) return hard;
          } else if (proposed.length < hard.length) return hard;
        }
      } else if (hardCom && hardCom.type === 'doubleseq' && (!proposed || !isLegalPlay(proposed))) {
        return hard;
      }

      // If proposed is legal and matches strategy constraints, keep it
      if (proposed && isLegalPlay(proposed)) {
        if (ominG === 1 && proposed.length === 1 && proposed[0].rank < 10) {
          return hard; // veto gift
        }
        // omin=1: multi over 2 (gold 0521)
        if (ominG === 1 && proposed.length === 1 && hard && hard.length >= 2) {
          return hard;
        }
        // Block high singles (K/A) early when multi or trash exist — keep 2 free-leads
        if (proposed.length === 1 && proposed[0].rank >= 10 && proposed[0].rank < 12 && hand.length > 5) {
          var multiG = leg.filter(function (p) {
            return p.length >= 2 && !playIsExpensive(p);
          });
          if (multiG.length || infoG.trashCount > 0) return hard;
        }
        // Short opp omin=2: hard 2 over multi
        if (ominG === 2 && proposed.length >= 2 && hard && hard.length === 1 && hard[0].rank === 12) {
          return hard;
        }
        if (hard && hard.length >= 2 && proposed.length >= 2 && hard.length > proposed.length + 1) {
          return hard;
        }
        return proposed;
      }
      return hard;
    }

    var curTopG = cur.top ? cur.top.rank : 0;
    // Facing Ace SINGLE: prefer 2 over Ace-climb (human-log #43–#72)
    // Do NOT apply to pair/trip of Aces — user IMG_0511: pass rather than burn 22.
    if (cur.type === 'single' && curTopG >= 11 && leg.length) {
      var twoAns = [];
      for (var t2 = 0; t2 < leg.length; t2++) {
        if (leg[t2].length === 1 && leg[t2][0].rank === 12) twoAns.push(leg[t2]);
      }
      if (twoAns.length && hand.length >= 3) {
        if (proposed && proposed.length === 1 && proposed[0].rank === 12 && isLegalPlay(proposed)) {
          return proposed;
        }
        if (!proposed || !proposed.length || !playHasTwo(proposed)) {
          twoAns.sort(function (a, b) { return a[0].suit - b[0].suit; });
          return twoAns[0];
        }
      }
      if (proposed && proposed.length && isLegalPlay(proposed)) return proposed;
      return orderLegals(leg, state, myIdx)[0];
    }

    var cheap = cheapLegals(leg);
    if (cheap.length) {
      // Expand pool with 2s when all cheap answers smash structure (user IMG_0500)
      var poolG = cheap.slice();
      var minCheapSc = 1e9;
      var cgi;
      for (cgi = 0; cgi < cheap.length; cgi++) {
        var csc = structureBreakCost(hand, cheap[cgi]);
        if (csc < minCheapSc) minCheapSc = csc;
      }
      var twoG = [];
      for (var tg = 0; tg < leg.length; tg++) {
        if (leg[tg].length === 1 && leg[tg][0].rank === 12) twoG.push(leg[tg]);
      }
      // P5: include 2s when cheap answers smash (0500 K-from-run sc≈14)
      if (twoG.length && minCheapSc >= 14 && curTopG >= 8) {
        for (tg = 0; tg < twoG.length; tg++) poolG.push(twoG[tg]);
      }
      var safeG = pickStructureSafe(poolG, state, myIdx);
      var scSafe = safeG ? structureBreakCost(hand, safeG) : 0;
      // Prefer 2 when still structure-breaking
      if (twoG.length && scSafe >= 14 && curTopG >= 8 && !(safeG && safeG.length === 1 && safeG[0].rank === 12)) {
        twoG.sort(function (a, b) { return a[0].suit - b[0].suit; });
        safeG = twoG[0];
        scSafe = 0;
      }
      // Narrow structure-pass (gold 0510); default structure-safe beat
      var infoPass = analyzeHand(hand);
      if (
        safeG &&
        shouldStructurePass(hand, safeG, scSafe, cur, infoPass, oppMinHand(state, myIdx), hand.length)
      ) {
        return null;
      }
      return safeG;
    }

    // Gold 0511: save 22 for weak singles only when deep + several trash singles
    if (!cheap.length) {
      var only2G = true;
      var og;
      for (og = 0; og < leg.length; og++) {
        if (!playHasTwo(leg[og]) && !playIsBomb(leg[og])) { only2G = false; break; }
      }
      var info2 = analyzeHand(hand);
      if (
        only2G &&
        hand.length >= 10 &&
        oppMinHand(state, myIdx) >= 4 &&
        curTopG >= 11 &&
        info2.trashCount >= 2
      ) {
        return null;
      }
    }

    var curTop = curTopG;
    if (curTop >= 11 && leg.length) {
      if (proposed && proposed.length && isLegalPlay(proposed)) return proposed;
      return orderLegals(leg, state, myIdx)[0];
    }
    if (cur.cards.every(function (c) { return c.rank === 12; })) {
      var bombs = [];
      for (var b = 0; b < leg.length; b++) if (playIsBomb(leg[b])) bombs.push(leg[b]);
      if (bombs.length) {
        if (proposed && isLegalPlay(proposed) && playIsBomb(proposed)) return proposed;
        return orderLegals(bombs, state, myIdx)[0];
      }
    }

    if (proposed === null || proposed === undefined) {
      var dec = expertPolicy(state, myIdx);
      return dec.pass ? null : dec.play;
    }
    if (isLegalPlay(proposed)) return proposed;
    return orderLegals(leg, state, myIdx)[0];
  }

  function applyDecision(state, cp, dec) {
    if (dec.pass) return passFast(state, cp);
    return applyPlayFast(state, cp, dec.play);
  }

  // Optional live frozen modules for accurate best-response (Node bench)
  var _v21Live = null;
  var _v30Live = null;
  var _v40Live = null;
  function getV21Live() {
    if (_v21Live !== null) return _v21Live || null;
    _v21Live = false;
    if (typeof require === 'function') {
      try {
        _v21Live = require('./v21-ai.js');
      } catch (e1) {
        try { _v21Live = require('./v21-ai.js'); } catch (e2) { _v21Live = false; }
      }
    }
    return _v21Live || null;
  }
  function getV30Live() {
    if (_v30Live !== null) return _v30Live || null;
    _v30Live = false;
    if (typeof require === 'function') {
      try {
        _v30Live = require('./v30-ai.js');
      } catch (e1) {
        try { _v30Live = require('./v30-ai.js'); } catch (e2) { _v30Live = false; }
      }
    }
    return _v30Live || null;
  }
  function getV40Live() {
    if (_v40Live !== null) return _v40Live || null;
    _v40Live = false;
    if (typeof require === 'function') {
      try {
        _v40Live = require('./v40-ai.js');
      } catch (e1) {
        try { _v40Live = require('./v40-ai.js'); } catch (e2) { _v40Live = false; }
      }
    }
    return _v40Live || null;
  }

  // Injected by bench for true best-response vs frozen policy (avoids require cycle).
  var _injectedOppPolicy = null;
  function setExploitOpponent(fn) {
    _injectedOppPolicy = typeof fn === 'function' ? fn : null;
  }

  /**
   * Opponent for exploit playouts.
   * Prefer injected frozen-v4 callback (bench); else multi-always model.
   */
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

  /**
   * Opponent model ≈ v2.1: free-lead multi-always when multi exists (no trash shed).
   * Prefers live frozen module when available for accurate exploit.
   */
  function opponentPolicyV21(state, cp) {
    var live = getV21Live();
    if (live && typeof live.getAIMove === 'function') {
      try {
        var mv = live.getAIMove(state, cp, { difficulty: 'easy', iterations: 0, mode: 'expert' });
        if (mv == null) return { pass: true };
        return { play: mv };
      } catch (e) { /* fall through to heuristic model */ }
    }
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
        if (leg[m].length >= 2 && !playIsExpensive(leg[m])) multi.push(leg[m]);
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

  function rollout(state, myIdx, maxSteps, rng) {
    var s = cloneStateFast(state);
    var steps = 0;
    maxSteps = maxSteps || 90;
    while (!s.roundOver && steps < maxSteps) {
      var cp = s.currentPlayer;
      var dec = (cp === myIdx) ? expertPolicy(s, cp) : opponentPolicyV21(s, cp);
      s = applyDecision(s, cp, dec);
      s.isFirstLead = false;
      steps++;
    }
    return finalUtility(s, myIdx);
  }

  /**
   * Best-response MC against v2.1-style opponent model.
   * For each root candidate, run full playouts (self=expert, opp=v21 model);
   * pick max hard win rate. Under hidden info, each trial re-determinizes.
   */
  function bestResponseMove(state, myIdx, opts) {
    opts = opts || {};
    var trials = opts.trials != null ? opts.trials : 24;
    var maxBranch = opts.maxBranch || 12;
    var timeMs = opts.timeMs || 0;
    var perfectInfo = opts.perfectInfo === true;
    var rng = opts.rng || Math.random;
    var strongSelf = opts.strongSelf !== false; // v8.6: shallowSelf for self by default
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
      // v8.6: free-lead candidates + lock/unanswerable multis + mid singles
      var fl = freeLeadCandidates(leg, state, myIdx);
      var extraBR = [];
      var ebi;
      for (ebi = 0; ebi < leg.length; ebi++) {
        if (leg[ebi].length >= 2 && !playIsExpensive(leg[ebi])) extraBR.push(leg[ebi]);
        else if (leg[ebi].length === 1 && leg[ebi][0].rank <= 11) extraBR.push(leg[ebi]);
      }
      var seenBR = {};
      var mergedBR = [];
      function addBR(arr) {
        for (var i = 0; i < arr.length; i++) {
          var sg = playSig(arr[i]);
          if (!seenBR[sg]) { seenBR[sg] = 1; mergedBR.push(arr[i]); }
        }
      }
      addBR(fl);
      addBR(extraBR);
      // Prefer multi first (human-log / lock-bonus lessons)
      mergedBR.sort(function (a, b) {
        if (a.length !== b.length) return b.length - a.length;
        return topRank(a) - topRank(b);
      });
      leg = mergedBR;
    } else {
      var ch = cheapLegals(leg);
      if (ch.length) leg = ch;
      leg = orderLegals(leg, state, myIdx);
    }
    if (leg.length > maxBranch) leg = leg.slice(0, maxBranch);

    var allowPass = !!cur && cheapLegals(
      getLegalPlays(hand, cur, state.players[myIdx].passed, state.isFirstLead, state.firstLeadCard)
    ).length === 0;
    var actions = leg.slice();
    if (allowPass) actions.push(null);

    var bestPlay = actions[0];
    var bestRate = -1;
    var details = [];

    for (var ai = 0; ai < actions.length; ai++) {
      if (timeMs > 0 && (Date.now() - t0) >= timeMs) break;
      var act = actions[ai];
      var wins = 0;
      var nTry = trials;
      for (var t = 0; t < nTry; t++) {
        var root = perfectInfo ? state : determinize(state, myIdx, rng, false);
        var s;
        if (act == null) s = passFast(root, myIdx);
        else s = applyPlayFast(root, myIdx, act);
        s.isFirstLead = false;
        // full playout
        var steps = 0;
        while (!s.roundOver && steps < 200) {
          var cp = s.currentPlayer;
          // Self: shallowSelf (v8.6) or expert. Opp: injected frozen when set.
          var oppPol = (_injectedOppPolicy || opts.oppModel === 'strong')
            ? opponentPolicyStrong(s, cp)
            : opponentPolicyV21(s, cp);
          var dec = (cp === myIdx)
            ? (strongSelf ? shallowSelfPick(s, myIdx) : expertPolicy(s, cp))
            : oppPol;
          s = applyDecision(s, cp, dec);
          s.isFirstLead = false;
          steps++;
        }
        var u = finalUtility(s, myIdx);
        if (u >= 0.99) wins++;
      }
      var rate = wins / nTry;
      // Soft multi free-lead tie-break among equal rates
      // Prefer short multi (pair/triple) over long dumps — CF multiVsSingle / short-multi
      var multiTie = 0;
      if (act && act.length >= 2 && !cur) {
        multiTie = 0.005 * Math.min(10, Math.max(0, 8 - act.length) + 2); // v9.1 short multi
      }
      var score = rate + multiTie;
      details.push({ sig: playSig(act), rate: rate, n: nTry, score: score });
      if (score > bestRate) {
        bestRate = score;
        bestPlay = act;
      }
    }
    details.sort(function (a, b) { return (b.score != null ? b.score : b.rate) - (a.score != null ? a.score : a.rate); });
    return {
      play: bestPlay,
      stats: {
        mode: perfectInfo ? 'best-response' : 'best-response-det',
        avg: details.length ? details[0].rate : bestRate,
        top: details.slice(0, 5),
        ms: Date.now() - t0,
        trials: trials,
        perfectInfo: perfectInfo,
        strongSelf: strongSelf
      }
    };
  }

  // Free-lead mode for optional dual-self exploit: 'multi' | 'hybrid'
  var _exploitFlMode = 'multi';

  /**
   * Fast leaf playout: self = expertPolicy, opp = injected frozen expert.
   */
  function exploitPlayoutLeaf(state, myIdx, maxSteps) {
    var s = cloneStateFast(state);
    var steps = 0;
    maxSteps = maxSteps || 260;
    while (!s.roundOver && steps < maxSteps) {
      var cp = s.currentPlayer;
      var dec = (cp === myIdx) ? expertPolicy(s, cp) : opponentPolicyStrong(s, cp);
      s = applyDecision(s, cp, dec);
      s.isFirstLead = false;
      steps++;
    }
    if (s.players[myIdx].finished) {
      return (s.finishOrder || []).indexOf(myIdx) === 0 ? 1 : 0;
    }
    if (s.roundOver) return s.loser === myIdx ? 0 : 1;
    // Incomplete: soft race signal (do not treat as hard loss)
    return 0.25 + leafEval2p(s, myIdx) * 0.25;
  }

  /**
   * Shallow self: try top free-lead/combat candidates; pick any that wins vs
   * frozen opp under leaf playouts. Falls back to expertPolicy.
   * (This is the key v4 strength that beat v3 — restored for v5 vs v4.)
   */
  function shallowSelfPick(state, myIdx) {
    var hand = state.players[myIdx].hand;
    var cur = state.currentCombo;
    // Nest on free leads always (capped); combat only when short
    if (cur && hand.length > 9) return expertPolicy(state, myIdx);
    var leg = getLegalPlays(hand, cur, state.players[myIdx].passed,
      state.isFirstLead, state.firstLeadCard);
    if (!leg.length) return { pass: true };
    var i;
    for (i = 0; i < leg.length; i++) {
      if (leg[i].length === hand.length) return { play: leg[i] };
    }
    if (!cur) leg = freeLeadCandidates(leg, state, myIdx);
    else {
      var ch = cheapLegals(leg);
      if (ch.length) leg = ch;
    }
    leg = orderLegals(leg, state, myIdx);
    // v8.5: broader shallow nest; also try expensive answers when short/opp short
    var cap = cur ? 10 : 14;
    if (!cur) {
      // free lead already ordered
    } else if (hand.length <= 7 || oppMinHand(state, myIdx) <= 3) {
      // include expensive when racing
      leg = orderLegals(
        getLegalPlays(hand, cur, state.players[myIdx].passed, state.isFirstLead, state.firstLeadCard),
        state, myIdx
      );
      cap = 12;
    }
    if (leg.length > cap) leg = leg.slice(0, cap);
    var fallback = expertPolicy(state, myIdx);
    for (i = 0; i < leg.length; i++) {
      var n = applyPlayFast(state, myIdx, leg[i]);
      n.isFirstLead = false;
      if (exploitPlayoutLeaf(n, myIdx, 200) >= 0.99) return { play: leg[i] };
    }
    return fallback;
  }

  /**
   * Deep exploit playout: self uses shallowSelfPick (1-ply forced wins),
   * opp = frozen v4 expert. Stronger self model than pure expertPolicy.
   */
  function exploitPlayout(state, myIdx, maxSteps) {
    var s = cloneStateFast(state);
    var steps = 0;
    maxSteps = maxSteps || 260;
    while (!s.roundOver && steps < maxSteps) {
      var cp = s.currentPlayer;
      var dec = (cp === myIdx) ? shallowSelfPick(s, myIdx) : opponentPolicyStrong(s, cp);
      s = applyDecision(s, cp, dec);
      s.isFirstLead = false;
      steps++;
    }
    if (s.players[myIdx].finished) {
      return (s.finishOrder || []).indexOf(myIdx) === 0 ? 1 : 0;
    }
    if (s.roundOver) return s.loser === myIdx ? 0 : 1;
    return 0.3 + leafEval2p(s, myIdx) * 0.4;
  }

  /**
   * True best-response root search vs frozen Grandmaster v4.0 expert model.
   * Two-stage scoring: expert leaf first, then shallowSelf deep playout.
   * multiBonus prefers multi free-leads (human-log lesson) as soft tie-break.
   */
  function exploitMove(state, myIdx, opts) {
    opts = opts || {};
    var maxBranch = opts.maxBranch || 16;
    var timeMs = opts.timeMs != null ? opts.timeMs : 0;
    var t0 = Date.now();
    var hand = state.players[myIdx].hand;
    var cur = state.currentCombo;
    var leg = getLegalPlays(hand, cur, state.players[myIdx].passed,
      state.isFirstLead, state.firstLeadCard);
    if (!leg.length) return { play: null, stats: { mode: 'exploit-none' } };

    var g;
    for (g = 0; g < leg.length; g++) {
      if (leg[g].length === hand.length) {
        return { play: leg[g], stats: { mode: 'exploit-out' } };
      }
    }

    // Broad candidate set: free-lead candidates + all non-expensive multi + trash/mid singles
    if (!cur) {
      var fl = freeLeadCandidates(leg, state, myIdx);
      var extra = [];
      var ei;
      for (ei = 0; ei < leg.length; ei++) {
        if (leg[ei].length >= 2 && !playIsExpensive(leg[ei])) extra.push(leg[ei]);
        else if (leg[ei].length === 1 && leg[ei][0].rank <= 11) extra.push(leg[ei]);
      }
      var seen = {};
      var merged = [];
      function addAll(arr) {
        for (var i = 0; i < arr.length; i++) {
          var sg = playSig(arr[i]);
          if (!seen[sg]) { seen[sg] = 1; merged.push(arr[i]); }
        }
      }
      addAll(fl);
      addAll(extra);
      // Prefer multi first so lock-bonus multi opens get scored early
      merged.sort(function (a, b) {
        if (a.length !== b.length) return b.length - a.length;
        return topRank(a) - topRank(b);
      });
      leg = merged;
    } else {
      var ch = cheapLegals(leg);
      if (ch.length) leg = ch;
      leg = orderLegals(leg, state, myIdx);
    }
    var branchCap = cur ? maxBranch : Math.max(maxBranch, 24);
    if (leg.length > branchCap) leg = leg.slice(0, branchCap);

    var actions = leg.slice();
    if (cur) {
      var full = getLegalPlays(hand, cur, state.players[myIdx].passed, false, null);
      if (cheapLegals(full).length === 0) actions.push(null);
    }

    function scoreActions(acts) {
      var bestPlay = acts[0];
      var bestScore = -1;
      var details = [];
      var anyWin = false;
      var ai;
      for (ai = 0; ai < acts.length; ai++) {
        var act = acts[ai];
        var next;
        if (act == null) next = passFast(state, myIdx);
        else next = applyPlayFast(state, myIdx, act);
        next.isFirstLead = false;
        // Prefer lines that win with pure expert follow-up (robust),
        // else lines that win with shallow-self follow-up.
        var leaf = exploitPlayoutLeaf(next, myIdx, 220);
        var deep = leaf;
        if (leaf < 0.99) deep = exploitPlayout(next, myIdx, 220);
        // dual free-lead self model — also try hybrid trash-shed playouts
        if (!cur && leaf < 0.99) {
          var savedM = _exploitFlMode;
          _exploitFlMode = 'hybrid';
          try {
            var deepH = exploitPlayout(next, myIdx, 220);
            if (deepH > deep) deep = deepH;
          } finally {
            _exploitFlMode = savedM;
          }
        }
        var win = deep >= 0.99 ? 1 : 0;
        if (win) anyWin = true;
        var shed = act ? act.length : 0;
        // multi free-lead soft bonus — prefer short multi wins (CF short-multi preference)
        var multiBonus = 0;
        if (act && act.length >= 2 && !cur) {
          var trM = topRank(act);
          multiBonus = 0.018 + Math.min(0.008, Math.max(0, 5 - act.length) * 0.002); // v9.1 short multi
          if (trM <= 7 && act.length >= 2 && act.length <= 4) multiBonus += 0.006;
        }
        // v8.5 perfect-info free-lead: strong bonus if real opp cannot answer cleanly
        var lockBonus = 0;
        if (!cur && act && act.length && state.players.length === 2) {
          var opp = myIdx === 0 ? 1 : 0;
          if (next.players[opp] && next.players[opp].hand && next.currentCombo) {
            var oppLeg = getLegalPlays(
              next.players[opp].hand, next.currentCombo, false, false, null
            );
            if (!oppLeg.length) {
              lockBonus = 0.11; // unanswerable lead — free control v8.7
            } else {
              var oppCheap = cheapLegals(oppLeg);
              if (!oppCheap.length) lockBonus = 0.07; // forces 2/bomb v8.7
              else {
                var minTop = 99;
                var oi2;
                for (oi2 = 0; oi2 < oppCheap.length; oi2++) {
                  var tq = topRank(oppCheap[oi2]);
                  if (tq < minTop) minTop = tq;
                }
                if (minTop >= 10) lockBonus = 0.03;
                else if (minTop >= 8) lockBonus = 0.018;
                else if (minTop >= 6) lockBonus = 0.008;
              }
              // Extra: if opp residual after cheapest answer is still long, less urgency
              // Prefer leads that leave opp with fewer cards after answering
              var bestOppShed = 0;
              for (oi2 = 0; oi2 < oppCheap.length; oi2++) {
                if (oppCheap[oi2].length > bestOppShed) bestOppShed = oppCheap[oi2].length;
              }
              if (bestOppShed >= 3) lockBonus += 0.01; // forces multi from opp
            }
          }
        }
        var pos = leafEval2p(next, myIdx);
        var score = (leaf >= 0.99 ? 1.0 : (deep >= 0.99 ? 0.95 : 0))
          + pos * 0.0025
          + multiBonus
          + lockBonus
          + shed * 0.00003;
        // Among forced wins, prefer multi (structure) then shorter residual hand
        if (win && act && act.length >= 2 && !cur) {
          score += 0.018 + Math.min(0.014, act.length * 0.002); // v8.8 multi win
        }
        if (!win) {
          var soft = typeof deep === 'number' ? deep : 0;
          if (soft < 0.05) soft = pos * 0.45;
          score += soft * 0.03;
          // Prefer lines that leave fewer cards when both lose
          score += shed * 0.0005;
        }
        details.push({ sig: playSig(act), win: win, score: score, leaf: leaf, deep: deep });
        if (score > bestScore) {
          bestScore = score;
          bestPlay = act;
        }
      }
      details.sort(function (a, b) { return b.score - a.score; });
      return { bestPlay: bestPlay, bestScore: bestScore, details: details, anyWin: anyWin };
    }

    var primary = scoreActions(actions);

    // If every primary candidate loses, expand to full legal set (incl. 2s/bombs)
    if (!primary.anyWin) {
      var fullLeg = getLegalPlays(hand, cur, state.players[myIdx].passed,
        state.isFirstLead, state.firstLeadCard);
      fullLeg = orderLegals(fullLeg, state, myIdx);
      if (fullLeg.length > 24) fullLeg = fullLeg.slice(0, 24);
      var expanded = fullLeg.slice();
      if (cur) expanded.push(null);
      var seenP = {};
      var i;
      for (i = 0; i < actions.length; i++) seenP[playSig(actions[i])] = 1;
      var newActs = [];
      for (i = 0; i < expanded.length; i++) {
        if (!seenP[playSig(expanded[i])]) newActs.push(expanded[i]);
      }
      if (newActs.length) {
        var secondary = scoreActions(newActs);
        if (secondary.bestScore > primary.bestScore) primary = secondary;
      }
    }

    // v8.2 dual-self free-lead: always take max(multi-mode, hybrid-mode) soft score
    if (!cur && opts.dualSelf !== false) {
      var savedFl = _exploitFlMode;
      _exploitFlMode = 'hybrid';
      try {
        var hybridActs = freeLeadCandidates(
          getLegalPlays(hand, cur, state.players[myIdx].passed, state.isFirstLead, state.firstLeadCard),
          state, myIdx
        );
        hybridActs = orderLegals(hybridActs, state, myIdx);
        if (hybridActs.length > 18) hybridActs = hybridActs.slice(0, 18);
        var hybrid = scoreActions(hybridActs);
        if (hybrid.bestScore > primary.bestScore + 1e-9) primary = hybrid;
      } finally {
        _exploitFlMode = savedFl;
      }
    }

    // v8.6: when no forced win, multi-sample soft win-rate over top candidates
    // (single playout is high-variance; N samples ranks soft lines more reliably)
    if (!primary.anyWin && state.players.length === 2 && opts.softSamples !== 0) {
      var softN = opts.softSamples != null ? opts.softSamples : 6;
      if (opts.inBrowser) softN = Math.min(softN, 3);
      var topSoft = primary.details.slice(0, Math.min(10, primary.details.length));
      var softBest = primary.bestPlay;
      var softBestRate = -1;
      var softDetails = [];
      var fullForSoft = getLegalPlays(hand, cur, state.players[myIdx].passed,
        state.isFirstLead, state.firstLeadCard);
      var softPool = fullForSoft.slice();
      if (cur) softPool.push(null);
      var si;
      for (si = 0; si < topSoft.length; si++) {
        if (timeMs > 0 && (Date.now() - t0) >= timeMs * 0.95) break;
        var row = topSoft[si];
        var actS = null;
        var foundAct = false;
        if (row.sig === 'PASS') {
          actS = null;
          foundAct = true;
        } else {
          var li2;
          for (li2 = 0; li2 < softPool.length; li2++) {
            if (playSig(softPool[li2]) === row.sig) {
              actS = softPool[li2];
              foundAct = true;
              break;
            }
          }
          // Also try actions array (may include free-lead subset)
          if (!foundAct) {
            for (li2 = 0; li2 < actions.length; li2++) {
              if (playSig(actions[li2]) === row.sig) {
                actS = actions[li2];
                foundAct = true;
                break;
              }
            }
          }
        }
        if (!foundAct) continue;
        var w = 0;
        var tiS;
        for (tiS = 0; tiS < softN; tiS++) {
          var nS;
          if (actS == null) nS = passFast(state, myIdx);
          else nS = applyPlayFast(state, myIdx, actS);
          nS.isFirstLead = false;
          if (exploitPlayout(nS, myIdx, 200) >= 0.99) w++;
        }
        var rateS = w / softN;
        // keep lock/multi bonuses as tiny tie-breaks
        var bonusS = 0;
        if (actS && actS.length >= 2 && !cur) bonusS = 0.002 + Math.min(0.004, actS.length * 0.0005);
        var scoreS = rateS + bonusS;
        softDetails.push({ sig: row.sig, rate: rateS, score: scoreS, n: softN });
        if (scoreS > softBestRate) {
          softBestRate = scoreS;
          softBest = actS;
        }
      }
      if (softBestRate >= 0) {
        primary.bestPlay = softBest;
        // Map soft rate into comparable soft score space used by callers
        primary.bestScore = softBestRate;
        primary.details = softDetails.sort(function (a, b) { return b.score - a.score; });
        primary._softSampled = true;
      }
    }

    return {
      play: primary.bestPlay,
      stats: {
        mode: primary.anyWin ? 'exploit-v80' : 'exploit-v80-soft',
        avg: primary.bestScore,
        top: primary.details.slice(0, 6),
        ms: Date.now() - t0,
        candidates: primary.details.length,
        anyWin: primary.anyWin,
        softSampled: !!primary._softSampled
      }
    };
  }

  /**
   * Leaf eval for depth-limited 2p minimax (higher = better for myIdx).
   * Combines hard terminal outcomes with structure/control heuristics.
   */
  function leafEval2p(state, myIdx) {
    if (state.players[myIdx].finished) {
      var place = (state.finishOrder || []).indexOf(myIdx);
      return place === 0 ? 1 : 0;
    }
    if (state.roundOver) return state.loser === myIdx ? 0 : 1;
    var opp = myIdx === 0 ? 1 : 0;
    var myLen = state.players[myIdx].hand.length;
    var oppLen = state.players[opp].hand.length;
    var info = analyzeHand(state.players[myIdx].hand);
    var oinfo = analyzeHand(state.players[opp].hand);
    // Base: card race
    var e = 0.5 + (oppLen - myLen) * 0.056; // v9.1 race+
    e += (info.twos - oinfo.twos) * 0.06;
    e += (info.control - oinfo.control) * 0.028; // v9.1 ctrl
    e += (oinfo.trashCount - info.trashCount) * 0.018; // v9.1 trash
    // Lead is valuable
    if (state.currentCombo == null && state.currentPlayer === myIdx) e += 0.045; // v9.1 lead
    if (state.currentCombo == null && state.currentPlayer === opp) e -= 0.045; // v9.1 lead
    // Short-hand threat
    if (oppLen === 1) e -= 0.10; // v9.1 1card
    if (myLen === 1) e += 0.1;
    if (oppLen === 2) e -= 0.03;
    return Math.max(0, Math.min(1, e));
  }

  function genActions2p(state, cp, maxBranch, broad) {
    var hand = state.players[cp].hand;
    var cur = state.currentCombo;
    var leg = getLegalPlays(hand, cur, state.players[cp].passed, state.isFirstLead, state.firstLeadCard);
    var actions = [];
    var i;
    if (!leg.length) return [null];
    for (i = 0; i < leg.length; i++) {
      if (leg[i].length === hand.length) return [leg[i]]; // only go-out matters
    }
    if (!cur) {
      if (broad) {
        // Exact exploit: consider all non-2/bomb free leads (not just freeLeadCandidates)
        var broadLeg = [];
        for (i = 0; i < leg.length; i++) {
          if (!playIsExpensive(leg[i])) broadLeg.push(leg[i]);
        }
        if (!broadLeg.length) broadLeg = leg.slice();
        leg = broadLeg;
      } else {
        leg = freeLeadCandidates(leg, state, cp);
      }
    } else {
      var ch = cheapLegals(leg);
      if (ch.length) leg = ch;
      else if (broad) {
        // include expensive when only those remain
        leg = leg.slice();
      }
    }
    leg = orderLegals(leg, state, cp);
    maxBranch = maxBranch || 10;
    if (leg.length > maxBranch) leg = leg.slice(0, maxBranch);
    for (i = 0; i < leg.length; i++) actions.push(leg[i]);
    if (cur) {
      var full = getLegalPlays(hand, cur, state.players[cp].passed, false, null);
      if (cheapLegals(full).length === 0) actions.push(null);
    }
    return actions;
  }

  function handLenBudget(state, myIdx) {
    var total = 0;
    var i;
    for (i = 0; i < state.players.length; i++) {
      if (!state.players[i].finished) total += state.players[i].hand.length;
    }
    // Deeper tree when few cards; wider when many
    if (total <= 10) return 18;
    if (total <= 16) return 14;
    if (total <= 20) return 12;
    return 10;
  }

  /**
   * Exact forced-win check vs FIXED opponent (v3.0 expert). Memoized DFS.
   * Self branches; opp is deterministic. Returns 1 / 0 / -1 (timeout).
   */
  function exactExploitValue(state, myIdx, memo, depth, t0, timeMs) {
    if (state.players[myIdx].finished) {
      return (state.finishOrder || []).indexOf(myIdx) === 0 ? 1 : 0;
    }
    if (state.roundOver) return state.loser === myIdx ? 0 : 1;
    if (depth > 90) return 0;
    if (timeMs > 0 && (Date.now() - t0) > timeMs) return -1;

    var key = '';
    var p;
    for (p = 0; p < 2; p++) {
      var ids = state.players[p].hand.map(function (c) { return c.rank * 4 + c.suit; });
      ids.sort(function (a, b) { return a - b; });
      key += ids.join('.') + (state.players[p].passed ? 'P' : 'N') + '|';
    }
    key += state.currentPlayer + '|' + (state.currentCombo ? playSig(state.currentCombo.cards) : 'L')
      + '|' + (state.lastPlayBy == null ? 'n' : state.lastPlayBy);
    if (memo[key] != null) return memo[key];

    var cp = state.currentPlayer;
    var val;
    if (cp !== myIdx) {
      var odec = opponentPolicyStrong(state, cp);
      var onext = applyDecision(state, cp, odec);
      onext.isFirstLead = false;
      val = exactExploitValue(onext, myIdx, memo, depth + 1, t0, timeMs);
    } else {
      // Broad action set so we do not miss forced wins
      var acts = genActions2p(state, myIdx, handLenBudget(state, myIdx), true);
      // Try expert move first (often on PV)
      try {
        var exp = expertPolicy(state, myIdx);
        var expPlay = exp.pass ? null : exp.play;
        var expSig = playSig(expPlay);
        acts.sort(function (x, y) {
          if (playSig(x) === expSig) return -1;
          if (playSig(y) === expSig) return 1;
          return 0;
        });
      } catch (eSort) { /* ignore */ }
      val = 0;
      var anyTimedOut = false;
      var a;
      for (a = 0; a < acts.length; a++) {
        if (timeMs > 0 && (Date.now() - t0) > timeMs) { anyTimedOut = true; break; }
        var n;
        if (acts[a] == null) n = passFast(state, myIdx);
        else n = applyPlayFast(state, myIdx, acts[a]);
        n.isFirstLead = false;
        var v = exactExploitValue(n, myIdx, memo, depth + 1, t0, timeMs);
        if (v < 0) {
          // Timeout on this branch — try other actions; do not abort whole node
          anyTimedOut = true;
          continue;
        }
        if (v >= 0.99) { val = 1; break; }
      }
      // Only surface timeout if we found no win and every path timed out / incomplete
      if (val < 0.99 && anyTimedOut && val === 0) {
        // keep val=0 (no proven win) rather than -1 so root can try other moves
      }
    }
    if (val >= 0) memo[key] = val;
    return val;
  }

  /**
   * Root move via exact best-response to frozen v3.0. Falls back to null if
   * no forced win found or time exhausted without a clear answer.
   */
  function exactExploitMove(state, myIdx, opts) {
    opts = opts || {};
    if (state.players.length !== 2) return null;
    var timeMs = opts.timeMs != null ? opts.timeMs : 1200;
    var t0 = Date.now();
    var memo = {};
    var acts = genActions2p(state, myIdx, 20, true);
    if (!acts.length) return null;
    var hand = state.players[myIdx].hand;
    var g;
    for (g = 0; g < acts.length; g++) {
      if (acts[g] && acts[g].length === hand.length) {
        return { play: acts[g], stats: { mode: 'exact-exploit-out' } };
      }
    }
    var best = null;
    var bestV = -1;
    var a;
    // Prefer short wins: order by expert score so forced wins found faster
    for (a = 0; a < acts.length; a++) {
      if (timeMs > 0 && (Date.now() - t0) >= timeMs) break;
      var n;
      if (acts[a] == null) n = passFast(state, myIdx);
      else n = applyPlayFast(state, myIdx, acts[a]);
      n.isFirstLead = false;
      var remain = timeMs > 0 ? Math.max(80, timeMs - (Date.now() - t0)) : 0;
      var v = exactExploitValue(n, myIdx, memo, 0, t0, remain);
      if (v < 0) {
        // timeout — soft leaf only if no forced win found yet
        if (bestV < 0.99) v = exploitPlayoutLeaf(n, myIdx, 180) * 0.5;
        else continue;
      }
      if (v > bestV) {
        bestV = v;
        best = acts[a];
      }
      if (v >= 0.99) {
        return {
          play: acts[a],
          stats: {
            mode: 'exact-exploit',
            avg: 1,
            ms: Date.now() - t0,
            memo: Object.keys(memo).length
          }
        };
      }
    }
    if (bestV >= 0.99) {
      return {
        play: best,
        stats: { mode: 'exact-exploit', avg: bestV, ms: Date.now() - t0, memo: Object.keys(memo).length }
      };
    }
    // No forced win proven — return best soft if clearly better than 0, else null
    if (best != null && bestV >= 0.4) {
      return {
        play: best,
        stats: { mode: 'exact-exploit-soft', avg: bestV, ms: Date.now() - t0, memo: Object.keys(memo).length }
      };
    }
    return null;
  }

  /**
   * Perfect-info 2p alpha-beta with iterative deepening.
   * Dominates pure expert when depth ≥ 4–6 on mid/late hands.
   */
  function alphaBetaMove(state, myIdx, opts) {
    opts = opts || {};
    if (state.players.length !== 2) return null;
    var timeMs = opts.timeMs != null ? opts.timeMs : 400;
    var maxDepth = opts.maxDepth != null ? opts.maxDepth : 8;
    var maxBranch = opts.maxBranch || 10;
    var t0 = Date.now();
    var nodes = 0;
    var aborted = false;

    function ab(st, depth, alpha, beta, ply) {
      nodes++;
      if (nodes & 1023) {
        if (timeMs > 0 && (Date.now() - t0) >= timeMs) aborted = true;
      }
      if (aborted) return leafEval2p(st, myIdx);

      if (st.players[myIdx].finished) {
        var place = (st.finishOrder || []).indexOf(myIdx);
        return place === 0 ? 1 : 0;
      }
      if (st.roundOver) return st.loser === myIdx ? 0 : 1;
      if (depth <= 0) return leafEval2p(st, myIdx);

      var cp = st.currentPlayer;
      var maximizing = cp === myIdx;
      var acts = genActions2p(st, cp, maxBranch);
      var best = maximizing ? -1 : 2;
      var a;
      for (a = 0; a < acts.length; a++) {
        if (aborted) break;
        var next;
        if (acts[a] == null) next = passFast(st, cp);
        else next = applyPlayFast(st, cp, acts[a]);
        next.isFirstLead = false;
        var v = ab(next, depth - 1, alpha, beta, ply + 1);
        if (maximizing) {
          if (v > best) best = v;
          if (v > alpha) alpha = v;
        } else {
          if (v < best) best = v;
          if (v < beta) beta = v;
        }
        if (beta <= alpha) break;
      }
      if (best === -1 || best === 2) return leafEval2p(st, myIdx);
      return best;
    }

    var rootActs = genActions2p(state, myIdx, maxBranch + 4);
    if (!rootActs.length) return { play: null, stats: { mode: 'ab-none' } };
    if (rootActs.length === 1 && rootActs[0] && rootActs[0].length === state.players[myIdx].hand.length) {
      return { play: rootActs[0], stats: { mode: 'ab-out' } };
    }

    var bestPlay = rootActs[0];
    var bestVal = -1;
    var reachedDepth = 0;
    var d;
    for (d = 2; d <= maxDepth; d += 2) {
      if (timeMs > 0 && (Date.now() - t0) >= timeMs * 0.92) break;
      aborted = false;
      var localBest = rootActs[0];
      var localVal = -1;
      var ordered = rootActs.slice();
      // Move ordering: try previous best first
      if (bestPlay) {
        ordered.sort(function (x, y) {
          if (playSig(x) === playSig(bestPlay)) return -1;
          if (playSig(y) === playSig(bestPlay)) return 1;
          return 0;
        });
      }
      var ri;
      for (ri = 0; ri < ordered.length; ri++) {
        if (timeMs > 0 && (Date.now() - t0) >= timeMs) { aborted = true; break; }
        var act = ordered[ri];
        var nx;
        if (act == null) nx = passFast(state, myIdx);
        else nx = applyPlayFast(state, myIdx, act);
        nx.isFirstLead = false;
        var vv = ab(nx, d - 1, -0.01, 1.01, 1);
        if (vv > localVal) {
          localVal = vv;
          localBest = act;
        }
      }
      if (!aborted || d === 2) {
        bestPlay = localBest;
        bestVal = localVal;
        reachedDepth = d;
      }
      if (bestVal >= 0.999) break;
    }

    return {
      play: bestPlay,
      stats: {
        mode: 'alpha-beta',
        avg: bestVal,
        depth: reachedDepth,
        nodes: nodes,
        ms: Date.now() - t0
      }
    };
  }

  /**
   * Exact 2p endgame minimax on place utility when few cards remain.
   * Returns best play for myIdx or null if position too large.
   */
  function exactEndgameMove(state, myIdx) {
    if (state.players.length !== 2) return null;
    var total = 0;
    for (var i = 0; i < 2; i++) {
      if (!state.players[i].finished) total += state.players[i].hand.length;
    }
    // ladder v8.6: deeper exact endgame (20 cards) for late midgame
    if (total > 18) return null; // v8.6 keep 18 — 20 hurt ladder WR

    var memo = {};
    function key(st) {
      var parts = [];
      for (var p = 0; p < 2; p++) {
        var ids = st.players[p].hand.map(function (c) { return c.rank * 4 + c.suit; });
        ids.sort(function (a, b) { return a - b; });
        parts.push(ids.join('.'));
        parts.push(st.players[p].passed ? '1' : '0');
      }
      parts.push(st.currentPlayer);
      parts.push(st.currentCombo ? playSig(st.currentCombo.cards) : 'L');
      parts.push(st.lastPlayBy == null ? 'n' : String(st.lastPlayBy));
      return parts.join('|');
    }

    function value(st) {
      if (st.players[myIdx].finished) {
        var place = (st.finishOrder || []).indexOf(myIdx);
        return place === 0 ? 1 : 0.4;
      }
      if (st.roundOver) return st.loser === myIdx ? 0 : 1;
      var k = key(st);
      if (memo[k] != null) return memo[k];
      var cp = st.currentPlayer;
      var leg = getLegalPlays(
        st.players[cp].hand, st.currentCombo, st.players[cp].passed,
        st.isFirstLead, st.firstLeadCard
      );
      var best;
      if (cp === myIdx) {
        best = -1;
        if (!leg.length) {
          best = value(passFast(st, cp));
        } else {
          if (!st.currentCombo) leg = freeLeadCandidates(leg, st, cp);
          else {
            var chp = cheapLegals(leg);
            if (chp.length) leg = chp;
          }
          if (leg.length > 14) leg = orderLegals(leg, st, cp).slice(0, 14);
          for (var a = 0; a < leg.length; a++) {
            var v = value(applyPlayFast(st, cp, leg[a]));
            if (v > best) best = v;
          }
          if (st.currentCombo && cheapLegals(getLegalPlays(
            st.players[cp].hand, st.currentCombo, st.players[cp].passed, false, null
          )).length === 0) {
            var vp = value(passFast(st, cp));
            if (vp > best) best = vp;
          }
        }
      } else {
        // v8.6: when bench injects frozen expert, model opp with that policy
        // (single deterministic line) rather than pure adversarial multi-always.
        if (_injectedOppPolicy) {
          var odec = opponentPolicyStrong(st, cp);
          var onx = applyDecision(st, cp, odec);
          onx.isFirstLead = false;
          best = value(onx);
        } else {
          // opponent minimizes our value (adversarial fallback)
          best = 2;
          if (!leg.length) {
            best = value(passFast(st, cp));
          } else {
            if (!st.currentCombo) {
              var multi = leg.filter(function (p) { return p.length >= 2 && !playIsExpensive(p); });
              if (multi.length) leg = multi;
            }
            if (leg.length > 14) leg = orderLegals(leg, st, cp).slice(0, 14);
            for (var b = 0; b < leg.length; b++) {
              var v2 = value(applyPlayFast(st, cp, leg[b]));
              if (v2 < best) best = v2;
            }
            if (st.currentCombo) {
              var vp2 = value(passFast(st, cp));
              if (vp2 < best) best = vp2;
            }
          }
        }
      }
      memo[k] = best;
      return best;
    }

    var rootLeg = getLegalPlays(
      state.players[myIdx].hand, state.currentCombo,
      state.players[myIdx].passed, state.isFirstLead, state.firstLeadCard
    );
    if (!rootLeg.length) return null;
    if (!state.currentCombo) rootLeg = freeLeadCandidates(rootLeg, state, myIdx);
    else {
      // Prefer structure-preserving beats first so equal exact values keep pairs/runs
      var rootCheap = cheapLegals(rootLeg);
      if (rootCheap.length) rootLeg = rootCheap;
    }
    // v9.1: order by expertScore (structure, minimal non-breaking beat) then exact value
    rootLeg = orderLegals(rootLeg, state, myIdx);
    var bestP = null;
    var bestV = -1;
    for (var r = 0; r < rootLeg.length; r++) {
      var vv = value(applyPlayFast(state, myIdx, rootLeg[r]));
      if (vv > bestV) {
        bestV = vv;
        bestP = rootLeg[r];
      }
      // equal value: keep earlier orderLegals pick (lower structure break)
    }
    if (state.currentCombo) {
      var vpass = value(passFast(state, myIdx));
      if (vpass > bestV) return null; // pass better
    }
    return bestP;
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
   * Reconstruct cards each seat played after history index `fromIdx` (inclusive).
   * Used so pass-range checks use the hand as it existed at pass time.
   */
  function cardsPlayedBySeatAfter(history, seat, fromIdx) {
    var out = [];
    if (!history) return out;
    for (var i = fromIdx + 1; i < history.length; i++) {
      var e = history[i];
      if (!e || e.type !== 'play' || e.seat !== seat || !e.cards) continue;
      for (var j = 0; j < e.cards.length; j++) out.push(e.cards[j]);
    }
    return out;
  }

  /**
   * True if `hand` (cards held at pass time) could legally make a non-bomb beat of `against`.
   * Passing with a non-bomb beater available is inconsistent (bombs may be sandbagged).
   */
  function handHasNonBombBeater(hand, against) {
    if (!against || !hand || !hand.length) return false;
    var legals = getLegalPlays(hand, against, false, false, null);
    for (var i = 0; i < legals.length; i++) {
      var com = detectCombo(legals[i]);
      if (com && !isBombCombo(com)) return true;
    }
    return false;
  }

  /**
   * History-consistent assignment: no opponent seat may hold a non-bomb beater
   * of a combo they publicly passed on (bombs-after-pass exception preserved).
   */
  function sampleConsistentWithHistory(state, assignmentHands, myIdx) {
    var hist = state.publicHistory;
    if (!hist || !hist.length) return true;
    for (var hi = 0; hi < hist.length; hi++) {
      var ev = hist[hi];
      if (!ev || ev.type !== 'pass' || !ev.against) continue;
      var seat = ev.seat;
      if (seat === myIdx) continue;
      if (seat < 0 || seat >= assignmentHands.length) continue;
      // Hand at pass time = remaining sample + cards this seat later played.
      var handThen = assignmentHands[seat].slice();
      var later = cardsPlayedBySeatAfter(hist, seat, hi);
      for (var k = 0; k < later.length; k++) handThen.push(later[k]);
      if (handHasNonBombBeater(handThen, ev.against)) return false;
    }
    return true;
  }

  /**
   * Sample plausible opponent hands: fix my hand, redistrib other cards by hand sizes.
   * When perfectInfo=true, return clone as-is.
   * Otherwise: rejection sampling for pass/play publicHistory constraints.
   */
  function determinize(state, myIdx, rng, perfectInfo) {
    if (perfectInfo) return cloneStateFast(state);
    var maxTries = 80;
    var sizes = [];
    var poolBase = [];
    for (var i = 0; i < state.players.length; i++) {
      sizes.push(state.players[i].hand.length);
      if (i === myIdx) continue;
      for (var j = 0; j < state.players[i].hand.length; j++) {
        poolBase.push(state.players[i].hand[j]);
      }
    }

    var best = null;
    for (var attempt = 0; attempt < maxTries; attempt++) {
      var s = cloneStateFast(state);
      var pool = poolBase.slice();
      shuffleInPlace(pool, rng);
      var off = 0;
      var assignment = new Array(s.players.length);
      for (var p = 0; p < s.players.length; p++) {
        if (p === myIdx) {
          assignment[p] = s.players[p].hand;
          continue;
        }
        var need = sizes[p];
        s.players[p].hand = pool.slice(off, off + need);
        assignment[p] = s.players[p].hand;
        off += need;
      }
      if (sampleConsistentWithHistory(state, assignment, myIdx)) return s;
      best = s; // keep last sample as fallback if all rejected
    }
    return best || cloneStateFast(state);
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

    // Cap branching with expert order; free lead: multi + trash singles (+ no-gift filter)
    var candidates = orderLegals(legals, rootState, myIdx);
    if (!cur) {
      candidates = freeLeadCandidates(legals, rootState, myIdx);
    }
    var maxBranch = opts.maxBranch || 12;
    if (candidates.length > maxBranch) candidates = candidates.slice(0, maxBranch);

    var allowPass = !!cur && cheapLegals(legals).length === 0;
    if (allowPass && cur && cur.top && cur.top.rank >= 11 && legals.length) allowPass = false;
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
    if (allowPassRoot && rootState.currentCombo && rootState.currentCombo.top &&
        rootState.currentCombo.top.rank >= 11 && rootLegals.length) {
      allowPassRoot = false;
    }
    // Free lead: multi + strategic trash / no-gift candidates
    if (!rootState.currentCombo) {
      rootLegals = freeLeadCandidates(rootLegals, rootState, myIdx);
    }

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
          if (!s.currentCombo) {
            leg = freeLeadCandidates(leg, s, curP);
          }
          if (curP === myIdx) {
            leg = orderLegals(leg, s, curP);
          } else {
            leg = orderLegals(leg, s, curP);
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
  function searchMove(state, myIdx, opts) {
    opts = opts || {};
    var difficulty = opts.difficulty || 'hard';
    // Default imperfect-info: sample opponent hands (det-mcts). Opt-in to perfectInfo.
    var perfectInfo = opts.perfectInfo === true;
    var hiddenInfo = opts.hiddenInfo === true || !perfectInfo;
    if (opts.perfectInfo === false) perfectInfo = false;
    if (opts.hiddenInfo === false && opts.perfectInfo !== true) {
      // explicit hiddenInfo:false without perfectInfo still uses det for safety
      perfectInfo = false;
    }
    // Resolve: perfectInfo true only when explicitly requested
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

    // Always go out if possible
    for (var i = 0; i < legals.length; i++) {
      if (legals[i].length === hand.length) {
        return { play: legals[i], stats: { mode: 'forced-out' } };
      }
    }

    // Budgets (needed before best-response)
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

    // Exact 2p endgame when few cards left
    var exact = exactEndgameMove(state, myIdx);
    if (exact) {
      return { play: exact, stats: { mode: 'exact-endgame' } };
    }
    // Shallow endgame MC
    var eg = endgamePick(state, myIdx);
    if (eg) {
      return { play: eg, stats: { mode: 'endgame' } };
    }

    // v4 primary: exact best-response vs frozen v3.0, then playout exploit.
    if (
      perfectInfo &&
      state.players.length === 2 &&
      difficulty !== 'easy' &&
      opts.exploit !== false
    ) {
      var ominEx = oppMinHand(state, myIdx);
      // Exact forced-win search — only late game (reliable + fast). Early game
      // uses playout exploit; full-tree exact early was harming win rate.
      var totalCards = 0;
      for (var tci = 0; tci < state.players.length; tci++) {
        if (!state.players[tci].finished) totalCards += state.players[tci].hand.length;
      }
      // Exact BR endgame vs injected frozen expert
      // v8.5: exact BR always in 2p perfect-info (budget scales with card count)
      if (opts.exactExploit !== false) {
        var exactMs = opts.exactExploitMs != null ? opts.exactExploitMs
          : (totalCards <= 12
            ? (opts.inBrowser ? 200 : 400)
            : (totalCards <= 16
              ? (opts.inBrowser ? 140 : 280)
              : (totalCards <= 20
                ? (opts.inBrowser ? 80 : 160)
                : (totalCards <= 24
                  ? (opts.inBrowser ? 50 : 100)
                  : (opts.inBrowser ? 30 : 60)))));
        // Free lead gets a bit more time to prove unanswerable multi opens
        if (!cur && !opts.inBrowser) exactMs = Math.max(exactMs, 220);
        var exExact = exactExploitMove(state, myIdx, { timeMs: exactMs });
        if (exExact && exExact.play !== undefined && exExact.stats &&
            (exExact.stats.mode === 'exact-exploit' || exExact.stats.mode === 'exact-exploit-out' ||
             (exExact.stats.avg != null && exExact.stats.avg >= 0.99))) {
          if (exExact.play == null && !cur) {
            exExact.play = pickFreeLeadHard(legals, state, myIdx);
          }
          if (!cur && exExact.play && exExact.play.length === 1 && ominEx === 1 && exExact.play[0].rank < 10) {
            exExact.play = pickFreeLeadHard(legals, state, myIdx);
          }
          exExact.stats.perfectInfo = true;
          return exExact;
        }
      }
      // v8.6 dual free-lead mode root: max of multi-always vs hybrid exploit scores
      var savedFlRoot = _exploitFlMode;
      var exMulti = null;
      var exHybrid = null;
      var softNRoot = opts.softSamples != null
        ? opts.softSamples
        : (opts.inBrowser ? 2 : 3);
      var exploitBudget = opts.inBrowser ? 400 : 900;
      try {
        _exploitFlMode = 'multi';
        exMulti = exploitMove(state, myIdx, {
          maxBranch: opts.maxBranch || (!cur ? 22 : 16),
          dualSelf: false,
          softSamples: softNRoot,
          timeMs: exploitBudget
        });
        // hybrid dual only when dualSelf enabled
        if (!cur && opts.dualSelf !== false) {
          _exploitFlMode = 'hybrid';
          exHybrid = exploitMove(state, myIdx, {
            maxBranch: opts.maxBranch || 22,
            dualSelf: false,
            softSamples: softNRoot,
            timeMs: Math.max(400, exploitBudget * 0.55)
          });
        }
      } finally {
        _exploitFlMode = savedFlRoot;
      }
      // Pick better of multi vs hybrid
      var ex = exMulti;
      function exScore(e) {
        if (!e || e.play === undefined) return -1;
        if (e.stats && e.stats.anyWin) return 2 + (e.stats.avg || 0);
        if (e.stats && e.stats.mode === 'exploit-out') return 3;
        return e.stats && e.stats.avg != null ? e.stats.avg : 0;
      }
      if (exHybrid && exScore(exHybrid) > exScore(exMulti)) ex = exHybrid;
      if (ex && ex.play !== undefined) {
        if (ex.play == null && !cur) {
          ex.play = pickFreeLeadHard(legals, state, myIdx);
        }
        if (!cur && ex.play && ex.play.length === 1 && ominEx === 1 && ex.play[0].rank < 10) {
          ex.play = pickFreeLeadHard(legals, state, myIdx);
        }
        // Prefer multi among free-lead forced wins
        if (!cur && ex.stats && ex.stats.anyWin && ex.stats.top && ex.stats.top.length) {
          var bestSig = null;
          var bestL = -1;
          var ti;
          for (ti = 0; ti < ex.stats.top.length; ti++) {
            var row = ex.stats.top[ti];
            if (!row || !row.win) continue;
            var ln = row.sig && row.sig !== 'PASS' ? String(row.sig).split(',').length : 0;
            if (ln > bestL) { bestL = ln; bestSig = row.sig; }
          }
          if (bestSig && bestSig !== 'PASS' && bestL >= 2) {
            for (var li = 0; li < legals.length; li++) {
              if (playSig(legals[li]) === bestSig) { ex.play = legals[li]; break; }
            }
          }
        }
        ex.stats = ex.stats || {};
        ex.stats.perfectInfo = true;
        if (ex.play == null && !cur) {
          ex.play = pickFreeLeadHard(legals, state, myIdx);
        }
        // Commit hard forced wins — but free-lead single-playout "wins" are noisy
        // (false positives skip soft fl-root and lose games like seed 20799253).
        if (ex.stats.mode === 'exploit-out') {
          return ex;
        }
        if (ex.stats.anyWin || (ex.stats.avg != null && ex.stats.avg >= 0.93)) {
          if (!cur && !opts.inBrowser && ex.play) {
            // Verify free-lead forced win with multi-sample before committing
            var verN = 6;
            var verW = 0;
            var vi;
            for (vi = 0; vi < verN; vi++) {
              var vn = applyPlayFast(state, myIdx, ex.play);
              vn.isFirstLead = false;
              if (exploitPlayout(vn, myIdx, 220) >= 0.99) verW++;
            }
            ex.stats.verify = { n: verN, wins: verW };
            if (verW < verN) {
              // Unstable forced win — fall through to free-lead soft root
              ex.stats.anyWin = false;
              ex.stats.avg = verW / verN;
              ex.stats.mode = 'exploit-v80-soft-unverified';
              opts._softExploit = ex;
            } else {
              return ex;
            }
          } else {
            return ex;
          }
        } else {
          opts._softExploit = ex;
        }
      }
    }
    // v8.7 free-lead soft root: rank free-lead candidates by robust score.
    // ShallowSelf playouts false-positive multi wins; use expert leaf + 1-ply
    // opp response + lock bonus (seed 20799253 trash-single flip).
    if (
      !cur &&
      perfectInfo &&
      state.players.length === 2 &&
      difficulty !== 'easy' &&
      opts._softExploit &&
      opts.flRoot !== false &&
      !opts.inBrowser
    ) {

      var flActs = [];
      var flSeen = {};
      function flAdd(arr) {
        for (var fi = 0; fi < arr.length; fi++) {
          var fsg = playSig(arr[fi]);
          if (!flSeen[fsg]) { flSeen[fsg] = 1; flActs.push(arr[fi]); }
        }
      }
      flAdd(freeLeadCandidates(legals, state, myIdx));
      for (var fli = 0; fli < legals.length; fli++) {
        if (legals[fli].length >= 2 && !playIsExpensive(legals[fli])) flAdd([legals[fli]]);
        else if (legals[fli].length === 1 && legals[fli][0].rank <= 10) flAdd([legals[fli]]);
      }
      flActs.sort(function (a, b) {
        if (a.length !== b.length) return b.length - a.length;
        return topRank(a) - topRank(b);
      });
      if (flActs.length > 20) flActs = flActs.slice(0, 20);
      var flBest = null;
      var flBestScore = -1;
      var flDetails = [];
      var flT0 = Date.now();
      var flOpp = myIdx === 0 ? 1 : 0;
      var flHandLen = state.players[myIdx].hand.length;
      var flInfo = analyzeHand(state.players[myIdx].hand);
      for (var fla = 0; fla < flActs.length; fla++) {
        if (Date.now() - flT0 > 900) break; // ladder speed
        var fact = flActs[fla];
        var fn = applyPlayFast(state, myIdx, fact);
        fn.isFirstLead = false;
        // Lock / unanswerable bonus (perfect-info)
        var lockB = 0;
        if (fn.players[flOpp] && fn.currentCombo) {
          var oleg = getLegalPlays(fn.players[flOpp].hand, fn.currentCombo, false, false, null);
          if (!oleg.length) lockB = 0.12;
          else if (!cheapLegals(oleg).length) lockB = 0.06;
        }
        // Expert-only leaf (no shallowSelf optimism)
        var leafR = exploitPlayoutLeaf(fn, myIdx, 220);
        // 1-ply: let frozen opp answer, then expert leaf
        var onePlyR = leafR;
        if (leafR < 0.99 && !fn.roundOver && fn.currentPlayer === flOpp) {
          var odec = opponentPolicyStrong(fn, flOpp);
          var fn2 = applyDecision(fn, flOpp, odec);
          fn2.isFirstLead = false;
          onePlyR = exploitPlayoutLeaf(fn2, myIdx, 220);
        }
        // Deep shallowSelf as secondary signal (discounted)
        var deepR = leafR >= 0.99 ? 1 : exploitPlayout(fn, myIdx, 200);
        // Composite: trust expert leaf hardest; require deep agree for multi forced-win claims
        var hard = 0;
        if (leafR >= 0.99) hard = 1.0;
        else if (onePlyR >= 0.99) hard = 0.95;
        else if (deepR >= 0.99 && leafR >= 0.4) hard = 0.85; // deep alone not enough
        var soft = 0;
        if (!hard) {
          // Residual structure after lead — trash shed can preserve pairs/control
          var resInfo = analyzeHand(fn.players[myIdx].hand);
          function pairCount(info) {
            var n = 0;
            var keys = Object.keys(info.byRank || {});
            for (var pi = 0; pi < keys.length; pi++) {
              if (info.byRank[keys[pi]] >= 2) n++;
            }
            return n;
          }
          var structGain = (pairCount(resInfo) - pairCount(flInfo)) * 0.01
            + (resInfo.control - flInfo.control) * 0.008
            + (flInfo.trashCount - resInfo.trashCount) * 0.015;
          // Hybrid free-lead when no hard win: prefer trash/low singles early
          // (seed 20799253: 0♦ wins, long multi loses under full AI follow-up)
          var hybridB = 0;
          if (fact.length === 1) {
            var rnk = fact[0].rank;
            if (rnk <= 4 && flHandLen >= 10) hybridB = 0.055 - rnk * 0.004;
            else if (rnk <= 6 && flHandLen >= 11) hybridB = 0.03;
            else if (rnk <= 8) hybridB = 0.01;
          } else if (fact.length === 2) {
            hybridB = 0.025; // pair shed
          } else if (fact.length === 3) {
            hybridB = flHandLen <= 9 ? 0.03 : 0.012;
          } else {
            // long multi early dumps structure — only good when short or lock
            hybridB = flHandLen <= 8 ? 0.02 : (0.005 - (fact.length - 3) * 0.004);
          }
          soft = Math.max(leafR, onePlyR * 0.9, deepR * 0.5) * 0.4
            + leafEval2p(fn, myIdx) * 0.08
            + lockB
            + structGain
            + hybridB;
        }
        var fscore = hard + soft;
        flDetails.push({
          sig: playSig(fact), leaf: leafR, onePly: onePlyR, deep: deepR,
          lock: lockB, score: fscore, len: fact.length
        });
        if (fscore > flBestScore) {
          flBestScore = fscore;
          flBest = fact;
        }
      }
      flDetails.sort(function (a, b) { return b.score - a.score; });

      if (flBest) {
        var ominFL = oppMinHand(state, myIdx);
        if (flBest.length === 1 && ominFL === 1 && flBest[0].rank < 10) {
          flBest = pickFreeLeadHard(legals, state, myIdx);
        }
        return {
          play: flBest,
          stats: {
            mode: 'free-lead-root',
            avg: flBestScore,
            top: flDetails.slice(0, 6),
            ms: Date.now() - flT0,
            perfectInfo: true,
            via: 'fl-soft-root-v2'
          }
        };
      }
    }

    // v8.5 ladder: combat soft root — rank cheap answers + pass with expert leaf
    // + 1-ply frozen opp (mirrors free-lead soft root for mid-trick decisions).
    if (
      cur &&
      perfectInfo &&
      state.players.length === 2 &&
      difficulty !== 'easy' &&
      opts._softExploit &&
      opts.combatRoot !== false &&
      !opts.inBrowser
    ) {
      var cActs = [];
      var cSeen = {};
      function cAdd(arr) {
        for (var ci = 0; ci < arr.length; ci++) {
          var csg = playSig(arr[ci]);
          if (!cSeen[csg]) { cSeen[csg] = 1; cActs.push(arr[ci]); }
        }
      }
      var cCheap = cheapLegals(legals);
      if (cCheap.length) cAdd(cCheap);
      else cAdd(legals);
      // Allow pass when no cheap answers or hand long / mid multi fold (v9.1 CF)
      var cAllowPass = cCheap.length === 0 ||
        (state.players[myIdx].hand.length >= 8 && oppMinHand(state, myIdx) >= 5) ||
        (state.players[myIdx].hand.length >= 10 &&
          oppMinHand(state, myIdx) >= 6 &&
          state.currentCombo &&
          state.currentCombo.type !== 'single');
      if (cAllowPass) cActs.push(null);
      if (cActs.length > 16) {
        cActs = orderLegals(cActs.filter(function (a) { return a != null; }), state, myIdx).slice(0, 15);
        if (cAllowPass) cActs.push(null);
      }
      var cBest = undefined;
      var cBestScore = -1;
      var cDetails = [];
      var cT0 = Date.now();
      var cOpp = myIdx === 0 ? 1 : 0;
      var cHandLen = state.players[myIdx].hand.length;
      var cOmin = oppMinHand(state, myIdx);
      for (var ca = 0; ca < cActs.length; ca++) {
        if (Date.now() - cT0 > 700) break; // ladder speed
        var cact = cActs[ca];
        var cn;
        if (cact == null) cn = passFast(state, myIdx);
        else cn = applyPlayFast(state, myIdx, cact);
        cn.isFirstLead = false;
        var cleaf = exploitPlayoutLeaf(cn, myIdx, 200);
        var cone = cleaf;
        if (cleaf < 0.99 && !cn.roundOver && cn.currentPlayer === cOpp) {
          var cod = opponentPolicyStrong(cn, cOpp);
          var cn2 = applyDecision(cn, cOpp, cod);
          cn2.isFirstLead = false;
          cone = exploitPlayoutLeaf(cn2, myIdx, 200);
        }
        var cdeep = cleaf >= 0.99 ? 1 : exploitPlayout(cn, myIdx, 180);
        var chard = 0;
        if (cleaf >= 0.99) chard = 1.0;
        else if (cone >= 0.99) chard = 0.95;
        else if (cdeep >= 0.99 && cleaf >= 0.35) chard = 0.85;
        var csoft = 0;
        if (!chard) {
          csoft = Math.max(cleaf, cone * 0.9, cdeep * 0.45) * 0.4
            + leafEval2p(cn, myIdx) * 0.08;
          // Prefer cheap non-2 answers; pass only when not short race
          if (cact == null) {
            csoft += (cOmin >= 5 && cHandLen >= 9) ? 0.02 : -0.04;
          } else {
            csoft += cact.length * 0.001;
            if (!playIsExpensive(cact)) csoft += 0.012;
            else if (cOmin <= 2 || cHandLen <= 5) csoft += 0.008;
            else csoft -= 0.015;
          }
        }
        var cscore = chard + csoft;
        cDetails.push({
          sig: playSig(cact), leaf: cleaf, onePly: cone, deep: cdeep, score: cscore
        });
        if (cscore > cBestScore) {
          cBestScore = cscore;
          cBest = cact;
        }
      }
      cDetails.sort(function (a, b) { return b.score - a.score; });
      if (cBest !== undefined && cBestScore >= 0) {
        return {
          play: cBest,
          stats: {
            mode: 'combat-root',
            avg: cBestScore,
            top: cDetails.slice(0, 6),
            ms: Date.now() - cT0,
            perfectInfo: true,
            via: 'combat-soft-root-v85'
          }
        };
      }
    }

    // Best-response MC FIRST on soft path (v8.6): models frozen expert, not
    // adversarial minimax. Alpha-beta early-return in v8.5 skipped BR and cost ~1%.
    if (opts.bestResponse || (state.players.length === 2 && difficulty !== 'easy' && difficulty !== 'medium') || opts._softExploit) {
      var ominBR = oppMinHand(state, myIdx);
      var freeBR = !cur;
      var brTrials = opts.brTrials;
      if (brTrials == null) {
        if (opts.inBrowser) brTrials = freeBR || ominBR <= 2 ? 18 : 10;
        else brTrials = freeBR || ominBR <= 2 ? 96 : 56;
      }
      // Extra trials when recovering from soft exploit — BR vs frozen is the soft solver
      if (opts._softExploit && !opts.inBrowser) {
        brTrials = Math.max(brTrials, freeBR ? 140 : 90);
      }
      var brTime = timeMs != null ? timeMs : (opts.inBrowser ? 800 : 2500);
      if (!opts.inBrowser && (freeBR || ominBR <= 2 || opts._softExploit)) {
        brTime = Math.max(brTime, opts._softExploit ? 1800 : 1100);
      }
      var br = bestResponseMove(state, myIdx, {
        trials: brTrials,
        timeMs: brTime,
        maxBranch: freeBR ? 22 : 16,
        perfectInfo: perfectInfo,
        oppModel: 'strong',
        strongSelf: true,
        rng: rng
      });
      if (br && br.play !== undefined) {
        if (br.play == null && !cur) {
          br.play = pickFreeLeadHard(legals, state, myIdx);
        }
        // Guard: no gift
        if (!cur && br.play && br.play.length === 1 && ominBR === 1 && br.play[0].rank < 10) {
          br.play = pickFreeLeadHard(legals, state, myIdx);
        }
        br.stats = br.stats || {};
        br.stats.perfectInfo = perfectInfo;
        if (opts._softExploit) {
          br.stats.via = 'soft-exploit-then-br';
          // v8.6 dual-root ensemble: when soft and BR disagree, re-score both with
          // deep exploit playouts vs frozen expert and keep higher empirical win rate.
          var softExE = opts._softExploit;
          if (softExE.play == null && !cur) softExE.play = pickFreeLeadHard(legals, state, myIdx);
          var sigBr = playSig(br.play);
          var sigSoft = playSig(softExE.play);
          if (sigBr !== sigSoft) {
            var ensN = opts.inBrowser ? 4 : 12;
            function ensRate(act) {
              var w = 0;
              var ti;
              for (ti = 0; ti < ensN; ti++) {
                var n0;
                if (act == null) n0 = passFast(state, myIdx);
                else n0 = applyPlayFast(state, myIdx, act);
                n0.isFirstLead = false;
                if (exploitPlayout(n0, myIdx, 220) >= 0.99) w++;
              }
              return w / ensN;
            }
            var rBr = ensRate(br.play);
            var rSoft = ensRate(softExE.play);
            br.stats.ensemble = { n: ensN, br: rBr, soft: rSoft, brSig: sigBr, softSig: sigSoft };
            // Prefer multi free-lead on exact ties
            if (rSoft > rBr + 0.04) {
              softExE.stats = softExE.stats || {};
              softExE.stats.via = 'ensemble-soft';
              softExE.stats.ensemble = br.stats.ensemble;
              return softExE;
            }
            if (Math.abs(rSoft - rBr) <= 0.04 && !cur) {
              var softMulti = softExE.play && softExE.play.length >= 2;
              var brMulti = br.play && br.play.length >= 2;
              if (softMulti && !brMulti) {
                softExE.stats = softExE.stats || {};
                softExE.stats.via = 'ensemble-soft-multi-tie';
                softExE.stats.ensemble = br.stats.ensemble;
                return softExE;
              }
              if (softMulti && brMulti && softExE.play.length > br.play.length) {
                softExE.stats = softExE.stats || {};
                softExE.stats.via = 'ensemble-soft-longer-multi';
                softExE.stats.ensemble = br.stats.ensemble;
                return softExE;
              }
            }
            br.stats.via = 'ensemble-br';
            br.stats.avg = rBr; // empirical
          } else {
            // Same play — use max of reported soft rate / BR rate as confidence
            br.stats.via = 'soft-br-agree';
          }
        }
        return br;
      }
    }

    // Perfect-info alpha-beta only if BR unavailable (tertiary, not soft-primary)
    if (
      perfectInfo &&
      state.players.length === 2 &&
      difficulty !== 'easy' &&
      opts.alphaBeta === true
    ) {
      var abTime = timeMs != null ? Math.max(timeMs, opts.inBrowser ? 200 : 400) : (opts.inBrowser ? 600 : 900);
      var ab = alphaBetaMove(state, myIdx, {
        timeMs: abTime,
        maxDepth: opts.abDepth != null ? opts.abDepth : (opts.inBrowser ? 6 : 12),
        maxBranch: !cur ? 16 : 14
      });
      if (ab && ab.play !== undefined) {
        var ominAB = oppMinHand(state, myIdx);
        if (ab.play == null && !cur) {
          ab.play = pickFreeLeadHard(legals, state, myIdx);
        }
        if (!cur && ab.play && ab.play.length === 1 && ominAB === 1 && ab.play[0].rank < 10) {
          ab.play = pickFreeLeadHard(legals, state, myIdx);
        }
        ab.stats = ab.stats || {};
        ab.stats.perfectInfo = true;
        ab.stats.via = 'ab-tertiary';
        return ab;
      }
    }

    // Soft exploit fallback if BR failed entirely
    if (opts._softExploit && opts._softExploit.play !== undefined) {
      var softFb = opts._softExploit;
      if (softFb.play == null && !cur) softFb.play = pickFreeLeadHard(legals, state, myIdx);
      softFb.stats = softFb.stats || {};
      softFb.stats.via = 'soft-exploit-fallback';
      return softFb;
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
        maxBranch: opts.maxBranch || 12,
        rolloutSteps: 65
      });
      mc.stats = mc.stats || {};
      mc.stats.mode = 'mc';
      return mc;
    }

    // MCTS / determinized (default for hard)
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
    enforcePolicyGuards: enforcePolicyGuards,
    pickFreeLeadHard: pickFreeLeadHard,
    freeLeadCandidates: freeLeadCandidates,
    analyzeHand: analyzeHand,
    endgamePick: endgamePick,
    exactEndgameMove: exactEndgameMove,
    bestResponseMove: bestResponseMove,
    exploitMove: exploitMove,
    exploitPlayout: exploitPlayout,
    exactExploitMove: exactExploitMove,
    alphaBetaMove: alphaBetaMove,
    leafEval2p: leafEval2p,
    opponentPolicyV21: opponentPolicyV21,
    opponentPolicyStrong: opponentPolicyStrong,
    setExploitOpponent: setExploitOpponent,
    rollout: rollout,
    determinize: determinize,
    sampleConsistentWithHistory: sampleConsistentWithHistory,
    handHasNonBombBeater: handHasNonBombBeater,
    placeUtility: placeUtility,
    orderLegals: orderLegals,
    playSig: playSig,
    cheapLegals: cheapLegals,
    seededRandom: seededRandom,
    uctSelect: uctSelect,
    opponentPrefersLowerUtility: opponentPrefersLowerUtility,
    POLICY_VERSION: 'v2-guarded'
  };
}));
