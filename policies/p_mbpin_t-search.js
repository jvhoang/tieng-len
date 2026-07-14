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
    // v9.1: stronger sequence / multi-combo break (user: don't dump low single from a run
    // when a true loose single exists — exact-endgame was ignoring soft costs on ties)
    if (play.length === 1) {
      var pr0 = play[0].rank;
      var nbrL = byRank[pr0 - 1] || 0;
      var nbrR = byRank[pr0 + 1] || 0;
      if (nbrL && nbrR) cost += 10; // interior of a run
      else if (nbrL || nbrR) cost += 4; // edge of a run / connector
    }
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
        if (gap > 2 && com.top.rank >= 9 && !usesTwo) score += gap * 0.8;
        // v9.1: hard preference — never climb with a structure-breaking single when a
        // true loose (trash / non-break) single beat exists (user hint observation)
        var sbc = structureBreakCost(hand, play);
        if (sbc >= 8) {
          var hasLooseBeat = false;
          // cheap scan: any other single legal with lower structure cost that also beats
          // (orderLegals compares pairwise; extra penalty makes break lose to loose)
          score += 18 + sbc * 0.5; // v9.1 no-break-multi
        }
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
    var hand = state.players[myIdx].hand;
    var cur = state.currentCombo;
    return legals.slice().sort(function (a, b) {
      if (!a && b) return 1;
      if (a && !b) return -1;
      if (!a && !b) return 0;
      if (cur && a && b) {
        function top(p){var t=-1;for(var i=0;i<p.length;i++)if(p[i].rank>t)t=p[i].rank;return t;}
        var ta=top(a), tb=top(b);
        if (ta !== tb) return ta - tb; // min-beat first
        var ca = structureBreakCost(hand, a), cb = structureBreakCost(hand, b);
        if (ca !== cb) return ca - cb;
      }
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

    // TWO_OMIN2: reclaim with 2 vs mid tops when opp nearly out (human H_2_E_non2)
    if (
      cur.type === 'single' &&
      curTop >= 7 &&
      curTop <= 10 &&
      twoSingles.length &&
      omin <= 2 &&
      handLen >= 3 &&
      handLen <= 10
    ) {
      twoSingles.sort(function (a, b) { return a[0].suit - b[0].suit; });
      return { play: twoSingles[0] };
    }
    // probe-TWO: broader 2-tempo vs mid tops when short race / trash or control remains
    if (
      cur.type === 'single' &&
      curTop >= 8 &&
      curTop <= 10 &&
      twoSingles.length &&
      omin <= 3 &&
      handLen >= 4 &&
      handLen <= 9 &&
      (infoC.trashCount >= 1 || infoC.control >= 2)
    ) {
      twoSingles.sort(function (a, b) { return a[0].suit - b[0].suit; });
      return { play: twoSingles[0] };
    }

    // v9.1 combat pass: deep mid multi fold (tuned: handLen≥11 so ladder vs freeze not over-passive)
    // Keep force-contest when short hand, short opp, high tops, or singles/bombs.
    if (
      handLen >= 11 &&
      omin >= 7 &&
      curTop < 8 &&
      cur.type !== 'single' &&
      !playIsBomb(cur.cards || [])
    ) {
      return { pass: true }; // v9.1 pass disc (ladder-tuned)
    }

    var cheap = cheapLegals(leg);
    if (cheap.length) return { play: orderLegals(cheap, state, cp)[0] };

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
        var onlyHighNon2 = non2.every(function (p) {
          return p.length === 1 && p[0].rank >= 10;
        });
        if (onlyHighNon2) {
          twoSingles.sort(function (a, b) { return a[0].suit - b[0].suit; });
          return { play: twoSingles[0] };
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
    // probe-TWO: contest more mid-tops; soft-pass only when long + weak
    // Merge: keep residual pass-disc only for longer/weaker bands than TWO contest.
    if (handLen <= 7 && leg.length) {
      return { play: orderLegals(leg, state, cp)[0] };
    }
    if (handLen >= 10 && curTop < 9 && omin >= 7) return { pass: true }; // TWO soft-pass
    if (handLen >= 9 && curTop < 9 && omin >= 7) return { pass: true }; // residual v9.1 (tighter omin)
    if (handLen >= 8 && curTop < 10 && omin <= 4 && leg.length) {
      return { play: orderLegals(leg, state, cp)[0] };
    }

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

    // (3) v5 free lead: multi-always when multi exists (human 21:10 + BR self).
    // Hybrid only when dual-self exploit scoring enables _exploitFlMode.
    var trashPlays = [];
    for (i = 0; i < leg.length; i++) {
      if (isTrashSinglePlay(leg[i], info)) trashPlays.push(leg[i]);
    }
    trashPlays.sort(function (a, b) {
      return a[0].rank - b[0].rank || a[0].suit - b[0].suit;
    });

    if (multi.length) {
      // v8.5 free-lead: if 2p and we can see opp hand, prefer unanswerable multi first
      if (state.players.length === 2) {
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
            // Prefer longer unanswerable multi (shed more under free control)
            unans.sort(function (a, b) {
              if (a.length !== b.length) return b.length - a.length;
              return topRank(a) - topRank(b);
            });
            return unans[0];
          }
          if (forceExp.length && handLen <= 11) {
            forceExp.sort(function (a, b) {
              if (a.length !== b.length) return b.length - a.length;
              return topRank(a) - topRank(b);
            });
            return forceExp[0];
          }
        }
      }
      // v7.5 multi-always core + mild length preference among low multi
      var lowMulti = multi.filter(function (p) { return topRank(p) <= 8; });
      var pool = lowMulti.length ? lowMulti : multi;
      pool = pool.slice().sort(function (a, b) {
        var la = a.length, lb = b.length;
        var ta = topRank(a), tb = topRank(b);
        if (la !== lb && Math.abs(ta - tb) <= 1) return lb - la;
        return expertScore(a, state, cp) - expertScore(b, state, cp);
      });
      var multiPick = pool[0];
      // FL_HYBRID_STRONG: human trash-first when deep + control and multi top high
      if (
        trashPlays.length >= 1 &&
        (info.twos >= 1 || info.control >= 2) &&
        handLen >= 9 &&
        multiPick &&
        (topRank(multiPick) > 6 || multiPick.length >= 4)
      ) {
        return trashPlays[0];
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

    var curTopG = cur.top ? cur.top.rank : 0;
    // Facing Ace: prefer 2 over Ace-climb BEFORE cheap-path (human-log #43–#72)
    // Must run before cheapLegals returns a higher-suit Ace.
    if (curTopG >= 11 && leg.length) {
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
      if (proposed && proposed.length && isLegalPlay(proposed) && !playIsExpensive(proposed)) {
        return proposed;
      }
      return orderLegals(cheap, state, myIdx)[0];
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
    var strongSelf = opts.strongSelf === true || (opts.strongSelf !== false && (opts.timeMs == null || opts.timeMs >= 600));
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
      // BR_FL_PIN_TRASH_SHORT: force trash + short multi into BR root set before maxBranch
      var infoBr = analyzeHand(hand);
      var pins = [];
      var ominBr = oppMinHand(state, myIdx);
      if (ominBr > 2 && hand.length >= 9) {
        for (var pi = 0; pi < mergedBR.length; pi++) {
          var pp = mergedBR[pi];
          if (isTrashSinglePlay(pp, infoBr)) pins.push(pp);
        }
      }
      var seenP = {}, pinned = [];
      function takePin(arr, lim) {
        for (var i = 0; i < arr.length && pinned.length < lim; i++) {
          var sg = playSig(arr[i]);
          if (!seenP[sg]) { seenP[sg] = 1; pinned.push(arr[i]); }
        }
      }
      takePin(pins, 4);
      // Prefer multi among remaining, then pin-rest
      mergedBR.sort(function (a, b) {
        if (a.length !== b.length) return b.length - a.length;
        return topRank(a) - topRank(b);
      });
      takePin(mergedBR, maxBranch);
      leg = pinned.length ? pinned : mergedBR;
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
      // Combat residual soft-tie: prefer structure-preserving cheap answers among near-equal rates
      if (act && cur) {
        multiTie -= Math.min(0.01, structureBreakCost(root.players[myIdx].hand, act) * 0.0005);
        if (!playIsExpensive(act)) multiTie += 0.0015;
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
    if (total > 18) return null; // v8.6 keep 18 — 20 hung some deals

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
    // Honor explicit bestResponse:false (hidden dual freeze seat / BR-off probes).
    if (opts.bestResponse === false) {
      // skip BR root
    } else if (opts.bestResponse || (state.players.length === 2 && difficulty !== 'easy' && difficulty !== 'medium') || opts._softExploit) {
      var ominBR = oppMinHand(state, myIdx);
      var freeBR = !cur;
      var brTrials = opts.brTrials;
      if (brTrials == null) {
        if (opts.inBrowser) brTrials = freeBR || ominBR <= 2 ? 18 : 10;
        else brTrials = freeBR || ominBR <= 2 ? 96 : 56;
      }
      // Extra trials when recovering from soft exploit — skip if dual set brTrials.
      if (opts._softExploit && !opts.inBrowser && opts.brTrials == null) {
        brTrials = Math.max(brTrials, freeBR ? 140 : 90);
      }
      var brTime = timeMs != null ? timeMs : (opts.inBrowser ? 800 : 2500);
      // Dual budgets pass explicit timeMs — do not inflate to 1100/1800.
      if (!opts.inBrowser && (freeBR || ominBR <= 2 || opts._softExploit)) {
        if (timeMs == null || timeMs <= 0) {
          brTime = Math.max(brTime, opts._softExploit ? 1800 : 1100);
        } else {
          var cap = opts._softExploit ? Math.min(timeMs * 1.5, timeMs + 200) : timeMs;
          brTime = Math.min(Math.max(brTime, 1), cap);
        }
      }
      var useStrongSelf = opts.strongSelf === true ||
        (opts.strongSelf !== false && (opts.inBrowser || brTime >= 600));
      var brBranch = maxBranch != null ? maxBranch : (freeBR ? 22 : 16);
      var br = bestResponseMove(state, myIdx, {
        trials: brTrials,
        timeMs: brTime,
        maxBranch: brBranch,
        perfectInfo: perfectInfo,
        oppModel: 'strong',
        strongSelf: useStrongSelf,
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
      : (perfectInfo ? 1 : (timeMs != null && timeMs < 400 ? 4 : (difficulty === 'grandmaster' ? 12 : 8)));
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
