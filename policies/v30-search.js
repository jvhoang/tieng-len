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
      // Breaking a pair into a single (humans punish this hard)
      if (had >= 2 && left === 1 && used === 1) cost += 8;
      if (had === 2 && used === 1) cost += 5;
      // Breaking a triple
      if (had >= 3 && left > 0 && left < 3 && used < had) cost += 4;
      // Breaking potential sequence links
      if (left === 0) {
        if (byRank[rk - 1] && byRank[rk + 1]) cost += 3;
        else if (byRank[rk - 1] || byRank[rk + 1]) cost += 1;
      }
    }
    if (play.length === 1 && (byRank[play[0].rank] || 0) >= 2) cost += 12;
    return cost;
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
    score += structureBreakCost(hand, play) * 2.2;

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
        // Trash shed early is GOOD when we have control to recapture
        if (handLen >= 7 && info.hasControl) {
          score -= 35 - com.top.rank * 1.5; // lower trash better
        } else if (handLen >= 9 && info.twos >= 1) {
          score -= 28 - com.top.rank;
        } else {
          score += 25; // mid/late without control: don't dump random singles
        }
      } else if (com.type === 'single') {
        score += 55;
        if (com.top.rank >= 10) score += 18;
        if (com.top.rank === 12) score += 40;
      } else {
        // Multi: prefer low, short, that may clear trash-adjacent structure
        score -= comboPriority(com.type) * 10;
        if (play.length === 2) score -= 12;
        else if (play.length === 3) score -= 14;
        else if (play.length === 4) score -= 10;
        else if (play.length >= 5) score -= 4 - (play.length - 5);
        score += topRank(play) * 1.1;
        if (topRank(play) <= 7) score -= 14;
        if (com.type === 'pair') score -= 3;
        // Bonus if multi uses only low ranks (trash management via multi)
        if (topRank(play) <= 6) score -= 6;
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
        if (gap > 2 && com.top.rank >= 9 && !usesTwo) score += gap * 0.8;
      }
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
    return legals.slice().sort(function (a, b) {
      return expertScore(a, state, myIdx) - expertScore(b, state, myIdx);
    });
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

    var cheap = cheapLegals(leg);
    if (cheap.length) return { play: orderLegals(cheap, state, cp)[0] };

    // Bombs vs 2s
    if (cur.cards.every(function (c) { return c.rank === 12; })) {
      var bombs = [];
      for (var b = 0; b < leg.length; b++) if (playIsBomb(leg[b])) bombs.push(leg[b]);
      if (bombs.length) return { play: orderLegals(bombs, state, cp)[0] };
    }

    var omin = oppMinHand(state, cp);
    var handLen = hand.length;
    var curTop = cur.top ? cur.top.rank : 0;

    // Prefer non-2 answers; contest highs; rarely pass (folders exploit pass)
    var non2 = [];
    for (var ni = 0; ni < leg.length; ni++) {
      if (!playHasTwo(leg[ni]) && !playIsBomb(leg[ni])) non2.push(leg[ni]);
    }
    if (non2.length) return { play: orderLegals(non2, state, cp)[0] };

    var infoC = analyzeHand(hand);
    // Aggressive control: contest whenever we hold trash (need lead) or short/threat
    if (handLen <= 9 || omin <= 4 || curTop >= 8 || infoC.trashCount >= 1) {
      return { play: orderLegals(leg, state, cp)[0] };
    }
    // Only pass pure-2 responses to very low junk with deep clean hand
    if (handLen > 10 && curTop < 7 && infoC.trashCount === 0) return { pass: true };

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
    var i;
    for (i = 0; i < leg.length; i++) {
      if (leg[i].length >= 2 && !playIsExpensive(leg[i])) multi.push(leg[i]);
    }

    // (2) One-card opponent: no gift
    if (omin === 1) {
      // Prefer multi that empties or high control single
      var go = null;
      for (i = 0; i < leg.length; i++) {
        if (leg[i].length === handLen) return leg[i];
      }
      if (multi.length) return orderLegals(multi, state, cp)[0];
      var highs = leg.filter(function (p) {
        return p.length === 1 && p[0].rank >= 10;
      });
      if (highs.length) {
        highs.sort(function (a, b) { return b[0].rank - a[0].rank || b[0].suit - a[0].suit; });
        return highs[0];
      }
      // last resort: highest single available
      var allS = leg.filter(function (p) { return p.length === 1; });
      if (allS.length) {
        allS.sort(function (a, b) { return b[0].rank - a[0].rank; });
        return allS[0];
      }
      return orderLegals(leg, state, cp)[0];
    }

    // (3) Hybrid free lead (v3):
    // Prefer low multi that clears volume; inject trash singles when we have
    // control AND ≥2 trash (stuck risk). Single trash first only then.
    var trashPlays = [];
    for (i = 0; i < leg.length; i++) {
      if (isTrashSinglePlay(leg[i], info)) trashPlays.push(leg[i]);
    }
    trashPlays.sort(function (a, b) {
      return a[0].rank - b[0].rank || a[0].suit - b[0].suit;
    });

    // Low multi first when available (volume)
    if (multi.length) {
      var lowMulti = multi.filter(function (p) { return topRank(p) <= 8; });
      var multiPick = lowMulti.length
        ? orderLegals(lowMulti, state, cp)[0]
        : orderLegals(multi, state, cp)[0];
      // If ≥2 trash and control, dump one trash before keeping multi structure
      // (unless multi top is very low — multi is also trash clearing)
      if (
        trashPlays.length >= 2 &&
        (info.twos >= 1 || info.control >= 2) &&
        handLen >= 7 &&
        topRank(multiPick) > 6
      ) {
        return trashPlays[0];
      }
      return multiPick;
    }

    // No multi: dump trash if any
    if (trashPlays.length) return trashPlays[0];

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

      // If proposed is legal and matches strategy constraints, keep it
      if (proposed && isLegalPlay(proposed)) {
        if (ominG === 1 && proposed.length === 1 && proposed[0].rank < 10) {
          return hard; // veto gift
        }
        // Block high singles (K/A/2) early when multi or trash exist
        if (proposed.length === 1 && proposed[0].rank >= 10 && hand.length > 5) {
          var multiG = leg.filter(function (p) {
            return p.length >= 2 && !playIsExpensive(p);
          });
          if (multiG.length || infoG.trashCount > 0) return hard;
        }
        // Allow trash single / multi / low single from pick
        return proposed;
      }
      return hard;
    }

    var cheap = cheapLegals(leg);
    if (cheap.length) {
      if (proposed && proposed.length && isLegalPlay(proposed) && !playIsExpensive(proposed)) {
        return proposed;
      }
      return orderLegals(cheap, state, myIdx)[0];
    }

    var curTop = cur.top ? cur.top.rank : 0;
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

  // Optional live frozen v2.1 module for accurate best-response (Node bench)
  var _v21Live = null;
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
   * For each root candidate, run full playouts (self=v3 expert, opp=v21 model);
   * pick max hard win rate. Strong vs fixed multi-always free-lead policies.
   */
  function bestResponseMove(state, myIdx, opts) {
    opts = opts || {};
    var trials = opts.trials != null ? opts.trials : 24;
    var maxBranch = opts.maxBranch || 12;
    var timeMs = opts.timeMs || 0;
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

    if (!cur) leg = freeLeadCandidates(leg, state, myIdx);
    else {
      var ch = cheapLegals(leg);
      if (ch.length) leg = ch;
    }
    leg = orderLegals(leg, state, myIdx);
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
        var s;
        if (act == null) s = passFast(state, myIdx);
        else s = applyPlayFast(state, myIdx, act);
        s.isFirstLead = false;
        // full playout
        var steps = 0;
        while (!s.roundOver && steps < 200) {
          var cp = s.currentPlayer;
          var dec = (cp === myIdx) ? expertPolicy(s, cp) : opponentPolicyV21(s, cp);
          s = applyDecision(s, cp, dec);
          s.isFirstLead = false;
          steps++;
        }
        var u = finalUtility(s, myIdx);
        if (u >= 0.99) wins++;
      }
      var rate = wins / nTry;
      details.push({ sig: playSig(act), rate: rate, n: nTry });
      if (rate > bestRate) {
        bestRate = rate;
        bestPlay = act;
      }
    }
    details.sort(function (a, b) { return b.rate - a.rate; });
    return {
      play: bestPlay,
      stats: {
        mode: 'best-response',
        avg: bestRate,
        top: details.slice(0, 5),
        ms: Date.now() - t0,
        trials: trials
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
    if (total > 14) return null;

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
        // opponent minimizes our value (adversarial)
        best = 2;
        if (!leg.length) {
          best = value(passFast(st, cp));
        } else {
          if (!st.currentCombo) {
            // model v2.1 multi-always
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
      memo[k] = best;
      return best;
    }

    var rootLeg = getLegalPlays(
      state.players[myIdx].hand, state.currentCombo,
      state.players[myIdx].passed, state.isFirstLead, state.firstLeadCard
    );
    if (!rootLeg.length) return null;
    if (!state.currentCombo) rootLeg = freeLeadCandidates(rootLeg, state, myIdx);
    var bestP = null;
    var bestV = -1;
    for (var r = 0; r < rootLeg.length; r++) {
      var vv = value(applyPlayFast(state, myIdx, rootLeg[r]));
      if (vv > bestV) {
        bestV = vv;
        bestP = rootLeg[r];
      }
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

    // Best-response vs v2.1-style (2p hard+): more trials on free lead / short hands
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
      var br = bestResponseMove(state, myIdx, {
        trials: brTrials,
        timeMs: brTime,
        maxBranch: freeBR ? 16 : 12
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
    opponentPolicyV21: opponentPolicyV21,
    rollout: rollout,
    determinize: determinize,
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
