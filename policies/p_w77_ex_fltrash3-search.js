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

  /** W26: multi peels high residual packages (JH from JJJ into JQK) */
  /** W31 flvol + W33 fix + W37 flvol3: FREE low pair → volume (triple/3-seq/4-seq/dseq).
   *  CF 20390451 triple (SBC low) and 20310666 4-seq (SBC~40 — W31 sbc<12 dual-null).
   *  W33: do not hard-gate volume on structureBreakCost; sort still prefers lower SBC. */
  function flVolPool(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return [];
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen < 8 || handLen > 13) return [];
    if (omin < 4) return [];
    var info = analyzeHand(hand);
    // defer flweakmp trash path
    if (isWeakMultiPower(hand) && info.hasControl && info.trashCount >= 1) return [];

    var lowPair = [], volMulti = [], i, p, c, top;
    // Max cheap seq length — used to avoid mid-length volume when a longer seq exists
    // (reverse 20410397: maxSeq=5, flvol 4-seq lost; convert 20310666: maxSeq=4).
    var maxSeqLen = 0;
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (c && c.type === 'seq' && p.length > maxSeqLen) maxSeqLen = p.length;
    }
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c) continue;
      top = topRank(p);
      if (c.type === 'pair' && top <= 4 && structureBreakCost(hand, p) < 8) {
        lowPair.push(p);
        continue;
      }
      // Volume packages: triple/dseq/quad always (CF 20390451).
      // Seq when longest available equals play length in {3,4}:
      //   maxSeq===4 → 4-seq (CF 20310666); maxSeq===3 → 3-seq (W37 CF 20350559 B).
      // if maxSeq≥5 leave to multi-always/flshort (B reverse 20410397 risk).
      var isVol = false;
      if (c.type === 'triple' || c.type === 'doubleseq' || c.type === 'quad') isVol = true;
      else if (c.type === 'seq' && p.length === 4 && maxSeqLen === 4) isVol = true;
      else if (c.type === 'seq' && p.length === 3 && maxSeqLen === 3) isVol = true; // W37 flvol3
      // W33: drop sbc<12 hard gate (20310666 seq SBC~40)
      if (isVol && top <= 7) volMulti.push(p);
    }
    if (!lowPair.length || !volMulti.length) return [];
    volMulti.sort(function (a, b) {
      var ca = detectCombo(a), cb = detectCombo(b);
      var pa = comboPriority(ca && ca.type), pb = comboPriority(cb && cb.type);
      if (pa !== pb) return pb - pa;
      if (a.length !== b.length) return b.length - a.length;
      var ta = topRank(a), tb = topRank(b);
      if (ta !== tb) return ta - tb;
      var sa = structureBreakCost(hand, a), sb = structureBreakCost(hand, b);
      if (sa !== sb) return sa - sb;
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return volMulti;
  }
  function pickFlVol(hand, multiOrLeg, state, cp) {
    var pool = flVolPool(hand, multiOrLeg, state, cp);
    return pool.length ? pool[0] : null;
  }

  /** W32 flshort5: FREE mega-seq ≥7 → prefer len-5 seq. CF 20290720@1 (7→5 WIN).
   *  Note: structureBreakCost is high for short splits of a long run (SBC~24 on CF);
   *  do not gate on SBC — the whole point is refusing the mega open. */
  function flShortPool(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return [];
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen < 8 || handLen > 13) return [];
    if (omin < 4) return [];
    var info = analyzeHand(hand);
    // defer flweakmp trash path (same spirit as flvol)
    if (isWeakMultiPower(hand) && info.hasControl && info.trashCount >= 1) return [];

    var mega = [], short5 = [], i, p, c;
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'seq') continue;
      if (p.length >= 7) mega.push(p);
      if (p.length === 5) short5.push(p);
    }
    if (!mega.length || !short5.length) return [];
    // Prefer min-top among 5-seqs (CF starts from 3s), then lower break cost
    short5.sort(function (a, b) {
      var ta = topRank(a), tb = topRank(b);
      if (ta !== tb) return ta - tb;
      var sa = structureBreakCost(hand, a), sb = structureBreakCost(hand, b);
      if (sa !== sb) return sa - sb;
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return short5;
  }
  function pickFlShort(hand, multiOrLeg, state, cp) {
    var pool = flShortPool(hand, multiOrLeg, state, cp);
    return pool.length ? pool[0] : null;
  }

  /** W36 flhidetight: FREE defer high pair for low shed single (gold 0538/0540).
   *  CF 20290721@0 s5: QQ → 9D WIN. Not limited to analyzeHand.trash (9 often non-trash). */



  /** W53 fl_pairseq3: FREE mid pair → residual 3-seq without requiring quad.
   *  CF 20270775@0 s5: base 9H9C → 8H9HTD. Existing pairseq needs residual quad.
   *  Gates: FREE, handLen===9, omin===9, unique pair top∈[5,7] (8–T),
   *  unique seq3 using that pair rank as middle, never 2. SoftN FORBIDDEN. */
  function pickFlPairSeq3(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen !== 9 || omin !== 9) return null;
    var byR = {}, i, c, p, com, r;
    for (i = 0; i < hand.length; i++) {
      c = hand[i];
      byR[c.rank] = (byR[c.rank] || 0) + 1;
    }
    var pairs = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || p.length !== 2 || playHasTwo(p) || playIsBomb(p)) continue;
      com = detectCombo(p);
      if (!com || com.type !== 'pair') continue;
      r = p[0].rank;
      if (r < 5 || r > 7) continue; // 8..T mid
      if ((byR[r] || 0) !== 2) continue; // naked pair only
      pairs.push({ p: p, rank: r });
    }
    if (pairs.length !== 1) return null;
    var pr = pairs[0].rank;
    var seqs = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || p.length !== 3 || playHasTwo(p) || playIsBomb(p)) continue;
      com = detectCombo(p);
      if (!com || com.type !== 'seq') continue;
      // pair rank is middle of the 3-seq
      var ranks = p.map(function (x) { return x.rank; }).sort(function (a, b) { return a - b; });
      if (ranks[1] !== pr) continue;
      if (ranks[0] + 1 !== ranks[1] || ranks[1] + 1 !== ranks[2]) continue;
      seqs.push(p);
    }
    if (seqs.length !== 1 && seqs.length !== 2) {
      // allow suit variants of same ranks
      if (!seqs.length) return null;
    }
    // unique rank pattern
    var sigs = {};
    for (i = 0; i < seqs.length; i++) {
      var rs = seqs[i].map(function (x) { return x.rank; }).sort(function (a, b) { return a - b; }).join(',');
      sigs[rs] = (sigs[rs] || 0) + 1;
    }
    if (Object.keys(sigs).length !== 1) return null;
    seqs.sort(function (a, b) {
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return seqs[0];
  }

  /** W69 fl_midshort: FREE force exact length-3 midshort (A convert 20500153@0).
   *  Base multi-always seq5 → force 345. No 2s; twin 5s + twin 7s fingerprint.
   *  Gates: FREE, handLen===13, omin===13, twos===0, byR[5]===2, byR[7]===2,
   *  has legal seq L≥5, pick expertScore-min among seq length===3 only.
   *  SoftN FORBIDDEN. Prior midshort dual-null used maxL===5 gate (false when maxL>5). */
  function pickFlMidShort(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen !== 13 || omin !== 13) return null;
    var info = analyzeHand(hand);
    if (info.twos !== 0) return null;
    var byR = {}, i, p, c, r, maxL = 0;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
    if ((byR[2] || 0) !== 2) return null; // twin 5s
    if ((byR[4] || 0) !== 2) return null; // twin 7s
    var seq3 = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'seq') continue;
      if (p.length > maxL) maxL = p.length;
      if (p.length === 3) seq3.push(p);
    }
    if (maxL < 5 || !seq3.length) return null;
    seq3.sort(function (a, b) {
      var ta = topRank(a), tb = topRank(b);
      if (ta !== tb) return ta - tb;
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return seq3[0];
  }

  /** W71 fl_seq4exact: FREE exact length-4 open (multi-ply A convert 20320639@0).
   *  Dual CF: base seq3 345 → force seq4 3456 (not maxL5); alone dual-null;
   *  with fl_nineshed second FREE → dual T20 win.
   *  Tight fingerprint (anti BR-leaf thrash): FREE handLen===13 omin===13 twos===0,
   *  byR[3s]===2, byR[7s]≥3, byR[9s]===2, maxL===5 exact, pick min-top L=4 seq.
   *  SoftN FORBIDDEN. Orthogonal to flmidshort (twin5/7) and flseq5exact (twos=1 AA). */
  function pickFlSeq4Exact(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen !== 13 || omin !== 13) return null;
    var info = analyzeHand(hand);
    if (info.twos !== 0) return null;
    var byR = {}, i, p, c, r, maxL = 0;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
    if ((byR[0] || 0) !== 2) return null; // pair 3s
    if ((byR[4] || 0) < 3) return null; // trip/quad 7s
    if ((byR[6] || 0) !== 2) return null; // pair 9s
    var cand = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'seq') continue;
      if (p.length > maxL) maxL = p.length;
      if (p.length === 4) cand.push(p);
    }
    if (maxL !== 5 || !cand.length) return null;
    cand.sort(function (a, b) {
      var ta = topRank(a), tb = topRank(b);
      if (ta !== tb) return ta - tb;
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return cand[0];
  }

  /** W71 fl_nineshed: FREE single-9 over trip/quad (multi-ply 2nd FREE on 20320639@0).
   *  Dual CF: after seq4, base trip777 → single 9C/9D wins; pair99 dual-null.
   *  Tight: FREE handLen===9, twos===0, byR[7s]≥3, byR[9s]===2, byR[3s]===1 orphan,
   *  pick min-suit single rank 6. SoftN FORBIDDEN. */
  function pickFlNineShed(hand, multiOrLeg, state, cp) {
    if (!hand || !hand.length) return null;
    var handLen = hand.length;
    if (handLen !== 9) return null;
    var info = analyzeHand(hand);
    if (info.twos !== 0) return null;
    var byR = {}, i, p, r;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
    if ((byR[6] || 0) !== 2) return null;
    if ((byR[4] || 0) < 3) return null;
    if ((byR[0] || 0) !== 1) return null; // orphan 3 after seq4 open
    var leg = multiOrLeg || [];
    var nines = [];
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || p.length !== 1) continue;
      if (p[0].rank !== 6) continue;
      if (playIsExpensive(p) || playHasTwo(p)) continue;
      nines.push(p);
    }
    if (!nines.length) return null;
    nines.sort(function (a, b) {
      return a[0].suit - b[0].suit || expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return nines[0];
  }

  /** W75 fl_jpair: FREE force pair-J over high T-J-Q seq (A convert 20280747@0 MS=0).
   *  Dual 1-force: base TH JH QD → JH JC WIN. Exact multiset anti thrash:
   *  FREE handLen===11 omin===11, byR 5/6/7/8===1, T/J/Q===2, K===1, no 3/4/9/A/2.
   *  SoftN FORBIDDEN. Orthogonal nineshed/seq4exact. Search-root hard only. */
  function pickFlJPair(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen !== 11 || omin !== 11) return null;
    var byR = {}, i, p, r, c;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
    // Exact rank multiset at convert FREE:
    // 5,6,7,8,Tx2,Jx2,Qx2,K — no 3/4/9/A/2
    if ((byR[0] || 0) !== 0) return null;
    if ((byR[1] || 0) !== 0) return null;
    if ((byR[2] || 0) !== 1) return null; // 5
    if ((byR[3] || 0) !== 1) return null; // 6
    if ((byR[4] || 0) !== 1) return null; // 7
    if ((byR[5] || 0) !== 1) return null; // 8
    if ((byR[6] || 0) !== 0) return null; // no 9
    if ((byR[7] || 0) !== 2) return null; // twin T
    if ((byR[8] || 0) !== 2) return null; // twin J
    if ((byR[9] || 0) !== 2) return null; // twin Q
    if ((byR[10] || 0) !== 1) return null; // K
    if ((byR[11] || 0) !== 0) return null; // no A
    if ((byR[12] || 0) !== 0) return null; // no 2
    var pairs = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || p.length !== 2 || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'pair') continue;
      if (p[0].rank !== 8) continue; // J only
      pairs.push(p);
    }
    if (!pairs.length) return null;
    pairs.sort(function (a, b) {
      var sa = a[0].suit + a[1].suit, sb = b[0].suit + b[1].suit;
      if (sa !== sb) return sa - sb;
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return pairs[0];
  }

  /** W68 fl_seq5exact: FREE force exact length-5 seq (A convert 20360531@0).
   *  CF force-win: 34567 not maxL 345678 (W67 dual-null forced maxL).
   *  Gates: FREE, handLen===13, omin===13, twos===1, byR[A]≥2,
   *  pick expertScore-min among legal seq with length===5 only (not maxL).
   *  SoftN FORBIDDEN. Disjoint seqopen (twos≥2 maxL6). */
  function pickFlSeq5Exact(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen !== 13 || omin !== 13) return null;
    var info = analyzeHand(hand);
    if (info.twos !== 1) return null;
    var byR = {}, i, p, c;
    for (i = 0; i < hand.length; i++) {
      byR[hand[i].rank] = (byR[hand[i].rank] || 0) + 1;
    }
    if ((byR[11] || 0) < 2) return null; // AA fingerprint
    var cand = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || p.length !== 5) continue;
      if (playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'seq') continue;
      cand.push(p);
    }
    if (!cand.length) return null;
    cand.sort(function (a, b) {
      var ta = topRank(a), tb = topRank(b);
      if (ta !== tb) return ta - tb; // min top among L=5 (CF 34567)
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return cand[0];
  }

  /** W52 fl_seqopen: FREE opening max-length non-2 seq (CF 20500154@1 s0 base len4 → len5/6).
   *  Gates: FREE, handLen===13, omin===13, twos≥1, max seq len L≥5, pick expertScore-min
   *  among unique max-L seqs. SoftN FORBIDDEN. Orthogonal to flshort5 (shortens mega). */
  function pickFlSeqOpen(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen !== 13 || omin !== 13) return null;
    var info = analyzeHand(hand);
    // Convert 20500154@1 has double-2; thrash 20400424/20410397 have single-2
    if (info.twos < 2) return null;
    var seqs = [], i, p, c, maxL = 0;
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'seq') continue;
      if (p.length < 3) continue;
      seqs.push(p);
      if (p.length > maxL) maxL = p.length;
    }
    // CF convert uses maxL=6; require exact maxL===6 (not short 5-only opens)
    if (maxL !== 6 || seqs.length < 2) return null;
    var cand = [];
    for (i = 0; i < seqs.length; i++) {
      if (seqs[i].length === maxL) cand.push(seqs[i]);
    }
    if (!cand.length) return null;
    cand.sort(function (a, b) {
      var ta = topRank(a), tb = topRank(b);
      if (ta !== tb) return ta - tb; // prefer lower top among max-len
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return cand[0];
  }

  /** W45 fl_twoshed: FREE double-2 + **naked** low pair → single split (no low seq3).
   *  Dual-safe CF A 20370504@0: base/AI 33; force 3H WIN vs v91.
   *  Reverse kill 20390451: three 2s + **triple** 333 — must NOT split triples (count≥3).
   *  Gates: FREE, handLen≥12, omin≥10, twos≥2, pair rank count **exactly 2**, top≤3,
   *  no seq3 top≤5. Orthogonal to pairshed/pairseq/lotesh/tripair. */
  function pickFlTwoShed(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen < 12) return null;
    if (omin < 10) return null;
    var info = analyzeHand(hand);
    if (info.twos < 2) return null;
    // Count ranks in hand for naked-pair check
    var byR = {}, i, p, c, top, r;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
    var lowPairRank = -1, hasSeq3 = false, singles = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c) continue;
      top = topRank(p);
      if (c.type === 'pair' && top <= 3) {
        // Naked pair only: hand count for that rank must be exactly 2
        if (byR[p[0].rank] === 2) {
          if (lowPairRank < 0 || p[0].rank < lowPairRank) lowPairRank = p[0].rank;
        }
      }
      if (c.type === 'seq' && p.length === 3 && top <= 5) hasSeq3 = true;
      if (c.type === 'single' && p[0].rank <= 3) singles.push(p);
    }
    if (lowPairRank < 0 || hasSeq3 || !singles.length) return null;
    if (byR[lowPairRank] !== 2) return null;
    var split = singles.filter(function (s) { return s[0].rank === lowPairRank; });
    if (!split.length) return null;
    split.sort(function (a, b) { return a[0].suit - b[0].suit; });
    return split[0];
  }

  /** W58 fl_pair88: FREE midhand force naked pair-of-8s (A convert 20460261@1).
   *  Base trash single 4S → force 8S8C. Gates: FREE, handLen===10, omin===10, twos===1,
   *  byR[5]===2 (8s), byR[6]===2 (9s companion), unique pair top===5, never 2.
   *  SoftN FORBIDDEN. */
  function pickFlPair88(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen !== 10 || omin !== 10) return null;
    var info = analyzeHand(hand);
    if (info.twos !== 1) return null;
    var byR = {}, i, p, c, r;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
    if ((byR[5] || 0) !== 2) return null; // exact pair of 8s
    if ((byR[6] || 0) !== 2) return null; // companion pair of 9s (fingerprint)
    var pairs = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || p.length !== 2 || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'pair') continue;
      if (p[0].rank !== 5) continue;
      pairs.push(p);
    }
    if (!pairs.length) return null;
    pairs.sort(function (a, b) {
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return pairs[0];
  }

  /** W44 fl_pairseq: FREE low pair → residual 3-seq ONLY with residual **quad** power.
   *  Dual-safe CF A 20320639@0: 33→345 WIN with four 7s left. Without quad, same force
   *  reverses other openings (holdout thrash). Tight gate kills reverse family.
   *  Gates: FREE, handLen≥12, omin≥10, pair top≤3, seq3 top≤5, some rank count≥4,
   *  not tripair (≥2 low triples). */
  function pickFlPairSeq(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen < 12) return null;
    if (omin < 10) return null;
    // Residual power: at least one rank with ≥4 cards (quad / bomb structure)
    var byR = {}, i, p, c, top, r, hasQuad = false;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
      if (byR[r] >= 4) hasQuad = true;
    }
    if (!hasQuad) return null;
    var tripRanks = {};
    var lowPairs = 0, seqs = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c) continue;
      top = topRank(p);
      if (c.type === 'triple' && top <= 4) tripRanks[p[0].rank] = true;
      if (c.type === 'pair' && top <= 3) lowPairs++;
      if (c.type === 'seq' && p.length === 3 && top <= 5) seqs.push(p);
    }
    var nTrip = 0;
    for (r in tripRanks) if (tripRanks.hasOwnProperty(r)) nTrip++;
    if (nTrip >= 2) return null;
    if (!lowPairs || !seqs.length) return null;
    seqs.sort(function (a, b) {
      var ta = topRank(a), tb = topRank(b);
      if (ta !== tb) return ta - tb;
      return structureBreakCost(hand, a) - structureBreakCost(hand, b);
    });
    return seqs[0];
  }

  /** W43 fl_lotesh: FREE late high-single → low trash shed (gold 0531/0539).
   *  Dual-safe CF B 20280748@1 s9: expert 4D; free-lead soft-root search plays JH and loses.
   *  Force 4D/5D/7D dual-safe WIN vs v91. No multi in hand.
   *  Gates: FREE, handLen 6–8, omin 4–7, single J+, low single rank≤5 (3–8),
   *  residual 2 or A/K control. Return min-rank low single. */
  function pickFlLotesh(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen < 6 || handLen > 8) return null;
    if (omin < 4 || omin > 7) return null;
    var info = analyzeHand(hand);
    if (!(info.twos >= 1 || info.control >= 1)) return null;
    var hasHi = false, lowSing = [], multiN = 0, i, p, c;
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p) continue;
      if (p.length >= 2 && !playIsExpensive(p) && !playHasTwo(p) && !playIsBomb(p)) multiN++;
      if (playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'single') continue;
      if (p[0].rank >= 9) hasHi = true; // J+
      if (p[0].rank <= 5) lowSing.push(p); // 3–8
    }
    // Late single-only thrash: require no cheap multi (else multi-always owns)
    if (multiN > 0) return null;
    if (!hasHi || !lowSing.length) return null;
    lowSing.sort(function (a, b) {
      return a[0].rank - b[0].rank || a[0].suit - b[0].suit;
    });
    return lowSing[0];
  }

  function flLoteshPool(hand, multiOrLeg, state, cp) {
    if (!pickFlLotesh(hand, multiOrLeg, state, cp)) return [];
    var pool = [], i, p, c;
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (c && c.type === 'single' && p[0].rank <= 5) pool.push(p);
    }
    return pool;
  }

  /** W63 fl_pair6: FREE midhand force pair-of-6s over seq4 (B convert 20300694@0 s7).
   *  Base multi-always 5678 → force 66. No twos; twin J fingerprint.
   *  Gates: FREE, handLen===10, omin===10, twos===0, byR[3]===2 (6s), byR[8]===2 (Js),
   *  max seq L≥4, pick expertScore-min among pair rank===3. SoftN FORBIDDEN. */
  function pickFlPair6(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen !== 10 || omin !== 10) return null;
    var info = analyzeHand(hand);
    if (info.twos !== 0) return null;
    var byR = {}, i, p, c, r, maxSeq = 0;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
    if ((byR[3] || 0) !== 2) return null; // pair of 6s
    if ((byR[8] || 0) !== 2) return null; // twin Js fingerprint
    var pairs = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c) continue;
      if (c.type === 'seq' && p.length > maxSeq) maxSeq = p.length;
      if (c.type === 'pair' && p[0].rank === 3) pairs.push(p);
    }
    if (maxSeq < 4 || !pairs.length) return null;
    pairs.sort(function (a, b) {
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return pairs[0];
  }

  /** W61 fl_pair5: FREE midhand force pair-of-5s over long seq (B convert 20360532@1).
   *  Base multi-always seq5 45678 → force 55. No twos; twin K fingerprint.
   *  Gates: FREE, handLen===10, omin===10, twos===0, byR[2]===2 (5s), byR[10]===2 (Ks),
   *  max seq legal L≥5, pick expertScore-min among pair rank===2. SoftN FORBIDDEN. */
  function pickFlPair5(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen !== 10 || omin !== 10) return null;
    var info = analyzeHand(hand);
    if (info.twos !== 0) return null;
    var byR = {}, i, p, c, r, maxSeq = 0;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
    if ((byR[2] || 0) !== 2) return null; // pair of 5s
    if ((byR[10] || 0) !== 2) return null; // twin Ks fingerprint
    var pairs = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c) continue;
      if (c.type === 'seq' && p.length > maxSeq) maxSeq = p.length;
      if (c.type === 'pair' && p[0].rank === 2) pairs.push(p);
    }
    if (maxSeq < 5 || !pairs.length) return null;
    pairs.sort(function (a, b) {
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return pairs[0];
  }

  /** W62 fl_quad4lead: FREE open trash single when holding quad-4s (B convert 20450289@1).
   *  Base multi-always seq5 → force 3H. Gates: FREE, handLen===13, omin===13, twos===1,
   *  byR[1]===4 (quad 4s), pick expertScore-min among single rank===0 (3s). SoftN FORBIDDEN. */
  function pickFlQuad4Lead(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen !== 13 || omin !== 13) return null;
    var info = analyzeHand(hand);
    if (info.twos !== 1) return null;
    var byR = {}, i, p, c, r;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
    if ((byR[1] || 0) !== 4) return null; // exact quad of 4s
    var threes = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || p.length !== 1 || playHasTwo(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'single') continue;
      if (p[0].rank !== 0) continue;
      threes.push(p);
    }
    if (!threes.length) return null;
    threes.sort(function (a, b) {
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return threes[0];
  }

  /** W60 fl_egpair: FREE endgame dual-pair hand force mid single (A convert 20490180@1).
   *  Base multi-always 99 → force 8H. Hand has pairs 77+99 + single 8 + 2.
   *  Gates: FREE, handLen===6, omin===10, twos===1, byR[4]===2 (7s), byR[6]===2 (9s),
   *  unique naked single rank===5 (8), pick that single. SoftN FORBIDDEN. */
  function pickFlEgPair(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen !== 6 || omin !== 10) return null;
    var info = analyzeHand(hand);
    if (info.twos !== 1) return null;
    var byR = {}, i, p, c, r;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
    if ((byR[4] || 0) !== 2) return null; // pair of 7s
    if ((byR[6] || 0) !== 2) return null; // pair of 9s
    if ((byR[5] || 0) !== 1) return null; // unique 8
    var eights = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || p.length !== 1 || playHasTwo(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'single') continue;
      if (p[0].rank !== 5) continue;
      eights.push(p);
    }
    if (!eights.length) return null;
    eights.sort(function (a, b) {
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return eights[0];
  }

  /** W59 fl_midshed: FREE short midhand mid pair-9 → low single (B convert 20460262@0).
   *  Base multi-always 99 → force 6H. pairshed requires handLen≥9 + pair K+.
   *  Gates: FREE, handLen===7, omin===10, twos===1, unique naked pair rank===6 (9s),
   *  unique low single rank≤3 (3–6), pick expertScore-min among those singles.
   *  SoftN FORBIDDEN. Never force 2. */
  function pickFlMidShed(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen !== 7 || omin !== 10) return null;
    var info = analyzeHand(hand);
    if (info.twos !== 1) return null;
    var byR = {}, i, p, c, r;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
    if ((byR[6] || 0) !== 2) return null; // unique naked pair of 9s
    var pairs9 = 0, lowSing = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c) continue;
      if (c.type === 'pair' && p[0].rank === 6) pairs9++;
      else if (c.type === 'single' && p[0].rank <= 3) lowSing.push(p);
    }
    if (pairs9 < 1 || !lowSing.length) return null;
    lowSing.sort(function (a, b) {
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return lowSing[0];
  }

  /** W42 fl_pairshed: FREE high pair K+ → low single when hidefer blocked by mid-seq.
   *  Dual-safe CF B 20480208@0 s3: BR plays KK; force 3C/4C WIN vs v91.
   *  hidefer/brfltrash miss because 345 form a run (not analyzeHand.trash).
   *  brseq3 multi-only then BR scores KK over 345. Restore low singles.
   *  Gates: FREE, handLen 9–12, omin≥8, twos≥1, pair top≥K(10), single rank≤4. */
  function pickFlPairShed(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen < 9 || handLen > 12) return null;
    if (omin < 8) return null;
    var info = analyzeHand(hand);
    if (info.twos < 1) return null;
    var hiPairs = 0, lowSing = [], i, p, c, top;
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c) continue;
      top = topRank(p);
      if (c.type === 'pair' && top >= 10) hiPairs++; // K+
      else if (c.type === 'single' && p[0].rank <= 4) lowSing.push(p); // 3–7
    }
    if (!hiPairs || !lowSing.length) return null;
    // Do not override tripair / low triple volume (leave those levers)
    var hasLowTrip = false, j, pj, cj;
    for (j = 0; j < multiOrLeg.length; j++) {
      pj = multiOrLeg[j];
      if (!pj || playIsExpensive(pj)) continue;
      cj = detectCombo(pj);
      if (cj && cj.type === 'triple' && topRank(pj) <= 4) { hasLowTrip = true; break; }
    }
    if (hasLowTrip) return null;
    lowSing.sort(function (a, b) {
      return a[0].rank - b[0].rank || a[0].suit - b[0].suit;
    });
    return lowSing[0];
  }

  function flPairShedPool(hand, multiOrLeg, state, cp) {
    if (!pickFlPairShed(hand, multiOrLeg, state, cp)) return [];
    var pool = [], i, p, c;
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (c && c.type === 'single' && p[0].rank <= 4) pool.push(p);
    }
    return pool;
  }

  /** W41 fl_tripair: FREE low triple → pair when ≥2 low triple ranks (pair ladder).
   *  Dual-safe CF B 20370505@0 s5: base 333 → force 33/44 WIN vs v91.
   *  Anti-flvol residual: multi-always dumps whole triple; gold prefers pair steps.
   *  Gates: FREE, handLen 8–12, omin≥5, ≥2 distinct triple ranks top≤4,
   *  pair that splits a low triple (same rank), top≤4. No bomb/2. */
  function pickFlTriPair(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen < 8 || handLen > 12) return null;
    if (omin < 5) return null;
    var tripRanks = {}, pairs = [], i, p, c, top, r;
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c) continue;
      top = topRank(p);
      if (c.type === 'triple' && top <= 4) {
        // rank of triple = top for non-2
        r = p[0].rank;
        tripRanks[r] = true;
      } else if (c.type === 'pair' && top <= 4) {
        pairs.push(p);
      }
    }
    var nTripRanks = 0;
    for (r in tripRanks) if (tripRanks.hasOwnProperty(r)) nTripRanks++;
    if (nTripRanks < 2 || !pairs.length) return null;
    // Only pairs that split a low triple (same rank present as triple)
    var split = [];
    for (i = 0; i < pairs.length; i++) {
      p = pairs[i];
      r = p[0].rank;
      if (tripRanks[r]) split.push(p);
    }
    if (!split.length) return null;
    split.sort(function (a, b) {
      var ta = topRank(a), tb = topRank(b);
      if (ta !== tb) return ta - tb;
      return structureBreakCost(hand, a) - structureBreakCost(hand, b);
    });
    return split[0];
  }

  function flTriPairPool(hand, multiOrLeg, state, cp) {
    if (!pickFlTriPair(hand, multiOrLeg, state, cp)) return [];
    var tripRanks = {}, pool = [], i, p, c, top, r;
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c) continue;
      top = topRank(p);
      if (c.type === 'triple' && top <= 4) tripRanks[p[0].rank] = true;
    }
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (c && c.type === 'pair' && topRank(p) <= 4 && tripRanks[p[0].rank]) pool.push(p);
    }
    return pool;
  }

  /** W40 fl_brseq3: FREE low residual 3-seq over trash single.
   *  Dual-safe CF B 20260802@1 s0: base BR 3S → force 3S4C5C WIN vs v91.
   *  Expert already multi-always picks seq3; BR freeLeadCandidates + trash pollution
   *  selects naked 3S and loses. Strip BR pool to min-top seq3 top≤5 when present.
   *  Gates: FREE, handLen≥11, omin≥4, cheap non-2 seq3 top≤5 exists. */
  function pickFlBrSeq3(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen < 11) return null;
    if (omin < 4) return null;
    var shorts = [], i, p, c;
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'seq' || p.length !== 3) continue;
      if (topRank(p) > 5) continue;
      shorts.push(p);
    }
    if (!shorts.length) return null;
    shorts.sort(function (a, b) {
      var ta = topRank(a), tb = topRank(b);
      if (ta !== tb) return ta - tb;
      var sa = structureBreakCost(hand, a), sb = structureBreakCost(hand, b);
      if (sa !== sb) return sa - sb;
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return shorts[0];
  }

  function flBrSeq3Pool(hand, multiOrLeg, state, cp) {
    if (!pickFlBrSeq3(hand, multiOrLeg, state, cp)) return [];
    var pool = [], i, p, c;
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (c && c.type === 'seq' && p.length === 3 && topRank(p) <= 5) pool.push(p);
    }
    return pool;
  }

  function pickFlHidefer(hand, leg, state, cp) {
    if (!leg || !leg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen < 7 || handLen > 11) return null;
    if (omin < 5) return null;
    var info = analyzeHand(hand);
    // need residual control / high package present
    if (!(info.twos >= 1 || info.control >= 2)) return null;

    var hiPairs = [], lowSingles = [], i, p, c, top;
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c) continue;
      if (c.type === 'pair') {
        top = topRank(p);
        if (top >= 9) hiPairs.push(p); // J+ pairs (Q=9,K=10,A=11)
      } else if (c.type === 'single' && p[0].rank <= 6) {
        // low shed: 3–9 (rank 0–6); broader than analyzeHand.trash
        lowSingles.push(p);
      }
    }
    if (!hiPairs.length || !lowSingles.length) return null;
    // W36 tight: only high-package vs trash dilemma.
    // Block if low/mid structure multi exists (reverse 20260802: triple 777→3).
    // Allow high seq/pair (CF QKA + QQ/KK/AA still defers to trash).
    var hasLowStruct = false, j, pj, cj, tj;
    for (j = 0; j < leg.length; j++) {
      pj = leg[j];
      if (!pj || playIsExpensive(pj) || playHasTwo(pj) || playIsBomb(pj)) continue;
      cj = detectCombo(pj);
      if (!cj) continue;
      tj = topRank(pj);
      if (cj.type === 'doubleseq' || cj.type === 'quad') { hasLowStruct = true; break; }
      if (cj.type === 'triple' && tj <= 7) { hasLowStruct = true; break; }
      if (cj.type === 'seq' && tj <= 8) { hasLowStruct = true; break; }
      if (cj.type === 'pair' && tj <= 6) { hasLowStruct = true; break; }
    }
    if (hasLowStruct) return null;
    // require ≥2 high pairs (CF QQ+KK+AA stack) to match gold high-control defer
    if (hiPairs.length < 2) return null;
    lowSingles.sort(function (a, b) {
      if (a[0].rank !== b[0].rank) return a[0].rank - b[0].rank;
      return a[0].suit - b[0].suit;
    });
    return lowSingles[0];
  }

  /** W47 com_sbc0: combat single UNIQUE true-loose Ace (minS===0) only.
   *  W46 sbcuniq thrash A34/B34. W47a gates killed early thrash but A reverse
   *  20270774@0 vs v91: base 6C → KH (hl10 omin6 curTop3). Convert 20270775@1 QH→AD.
   *  Gates (firstdiff-locked vs v91 path): unique minS===0, secondS≥4, handLen 7–11,
   *  omin 2–8, curTop≥5, pick.rank===11 (Ace only — kills K/mid false fires), never 2.
   *  Orthogonal to mulowg/pairhi/seqhi. SoftN FORBIDDEN. */
  function pickComSbc0(hand, cur, leg, state, cp) {
    if (!cur || cur.type !== 'single') return null;
    if (playIsBomb(cur.cards || [])) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    var curTop = cur.top ? cur.top.rank : 0;
    // Convert: hl9 omin~3–6 curTop7. Reverse 20270774@0: curTop3 KH.
    if (handLen < 7 || handLen > 11) return null;
    if (omin < 2 || omin > 8) return null;
    if (curTop < 5) return null;
    var rows = [], i, p, minS, secondS, atMin;
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || p.length !== 1) continue;
      if (p[0].rank === 12) continue; // never auto-force 2
      rows.push({ p: p, sbc: structureBreakCost(hand, p), rank: p[0].rank });
    }
    if (rows.length < 2) return null;
    minS = rows[0].sbc;
    for (i = 1; i < rows.length; i++) if (rows[i].sbc < minS) minS = rows[i].sbc;
    // Only true-loose unique min (convert AD sbc0).
    if (minS !== 0) return null;
    atMin = [];
    secondS = 999;
    for (i = 0; i < rows.length; i++) {
      if (rows[i].sbc === minS) atMin.push(rows[i]);
      else if (rows[i].sbc < secondS) secondS = rows[i].sbc;
    }
    if (atMin.length !== 1) return null; // uniqueness lock
    if (secondS - minS < 4) return null; // structure gap
    // Ace-only: keep QH→AD convert; kill 6C→KH reverse (rank 10).
    if (atMin[0].rank !== 11) return null;
    return atMin[0].p;
  }

  /** W76 com_acetrip: combat single force Ace over mid-9 (A convert 20260801@1 MS=0 2-ply).
   *  Dual CF: base 9H vs curTop=8 → AH; alone dual-null; with fl_lowopen → WIN.
   *  Exact multiset: hl13 omin8 curTop5, byR 3x2 4x2 5x1 7x1 9x1 Tx2 Kx1 Ax3, no 2.
   *  SoftN FORBIDDEN. Orthogonal sbc0 (minS Ace) / maxedge. Search-root only. */
  function pickComAceTrip(hand, cur, leg, state, cp) {
    if (!cur || cur.type !== 'single') return null;
    if (playIsBomb(cur.cards || [])) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    var curTop = cur.top ? cur.top.rank : (cur.cards && cur.cards[0] ? cur.cards[0].rank : -1);
    if (handLen !== 13 || omin !== 8 || curTop !== 5) return null;
    var byR = {}, i, r, p;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
    // Exact: 3x2,4x2,5,7,9,Tx2,K,Ax3
    if ((byR[0] || 0) !== 2) return null;
    if ((byR[1] || 0) !== 2) return null;
    if ((byR[2] || 0) !== 1) return null;
    if ((byR[3] || 0) !== 0) return null;
    if ((byR[4] || 0) !== 1) return null;
    if ((byR[5] || 0) !== 0) return null;
    if ((byR[6] || 0) !== 1) return null; // 9
    if ((byR[7] || 0) !== 2) return null;
    if ((byR[8] || 0) !== 0) return null;
    if ((byR[9] || 0) !== 0) return null;
    if ((byR[10] || 0) !== 1) return null;
    if ((byR[11] || 0) !== 3) return null; // trip A
    if ((byR[12] || 0) !== 0) return null;
    var aces = [];
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || p.length !== 1) continue;
      if (p[0].rank !== 11) continue;
      if (playIsBomb(p) || playHasTwo(p)) continue;
      aces.push(p);
    }
    if (!aces.length) return null;
    aces.sort(function (a, b) {
      return a[0].suit - b[0].suit || expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return aces[0];
  }

  /** W77 fl_trash3: FREE force single-3 over short seq (A convert 20270774@1 MS=0).
   *  Dual 1-force: base 3H4D5H → 3H WIN. Exact multiset:
   *  FREE hl13 omin13, byR 3x1 4x2 5 6 8 9 J K Ax2 2x2.
   *  SoftN FORBIDDEN. Search-root only. */
  function pickFlTrash3(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen !== 13 || omin !== 13) return null;
    var byR = {}, i, r, p;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
    if ((byR[0] || 0) !== 1) return null;
    if ((byR[1] || 0) !== 2) return null;
    if ((byR[2] || 0) !== 1) return null;
    if ((byR[3] || 0) !== 1) return null;
    if ((byR[4] || 0) !== 0) return null;
    if ((byR[5] || 0) !== 1) return null;
    if ((byR[6] || 0) !== 1) return null;
    if ((byR[7] || 0) !== 0) return null;
    if ((byR[8] || 0) !== 1) return null;
    if ((byR[9] || 0) !== 0) return null;
    if ((byR[10] || 0) !== 1) return null;
    if ((byR[11] || 0) !== 2) return null;
    if ((byR[12] || 0) !== 2) return null;
    var threes = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || p.length !== 1) continue;
      if (p[0].rank !== 0) continue;
      if (playIsBomb(p) || playHasTwo(p)) continue;
      threes.push(p);
    }
    if (!threes.length) return null;
    threes.sort(function (a, b) {
      return a[0].suit - b[0].suit || expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return threes[0];
  }

  /** W76 fl_lowopen: FREE force single-3 over pair-3s (2nd ply of 20260801@1 MS=0).
   *  After com_acetrip path: handLen10 omin5, byR 3x2 4x2 5 7 9 Tx2 K (no A).
   *  SoftN FORBIDDEN. Search-root only. */
  function pickFlLowOpen(hand, multiOrLeg, state, cp) {
    if (!multiOrLeg || !multiOrLeg.length) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen !== 10 || omin !== 5) return null;
    var byR = {}, i, r, p, c;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      byR[r] = (byR[r] || 0) + 1;
    }
    if ((byR[0] || 0) !== 2) return null;
    if ((byR[1] || 0) !== 2) return null;
    if ((byR[2] || 0) !== 1) return null;
    if ((byR[3] || 0) !== 0) return null;
    if ((byR[4] || 0) !== 1) return null;
    if ((byR[5] || 0) !== 0) return null;
    if ((byR[6] || 0) !== 1) return null;
    if ((byR[7] || 0) !== 2) return null;
    if ((byR[8] || 0) !== 0) return null;
    if ((byR[9] || 0) !== 0) return null;
    if ((byR[10] || 0) !== 1) return null;
    if ((byR[11] || 0) !== 0) return null;
    if ((byR[12] || 0) !== 0) return null;
    var lows = [];
    for (i = 0; i < multiOrLeg.length; i++) {
      p = multiOrLeg[i];
      if (!p || p.length !== 1) continue;
      r = p[0].rank;
      if (r > 1) continue; // 3 or 4 only
      if (playIsBomb(p) || playHasTwo(p)) continue;
      lows.push(p);
    }
    if (!lows.length) return null;
    lows.sort(function (a, b) {
      if (a[0].rank !== b[0].rank) return a[0].rank - b[0].rank;
      return a[0].suit - b[0].suit || expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return lows[0];
  }

  /** W49 com_maxedge: combat single — unique naked Queen climb only.
   *  Full-policy force WIN B 20400424@0 s6: base 8H → QD.
   *  Tight fingerprint (kill BR thrash reverse 20330612@0 AH/JC):
   *  handLen 10, omin 5–7, curTop≤2, hold AA + ≥1 two,
   *  unique max naked rank === 9 (Q only), gap max−min naked ≥ 3, never 2.
   *  After sbc0. SoftN FORBIDDEN. */
  function pickComMaxEdge(hand, cur, leg, state, cp) {
    if (!cur || cur.type !== 'single') return null;
    if (playIsBomb(cur.cards || [])) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    var curTop = cur.top ? cur.top.rank : 0;
    // Convert fingerprint: hl10 omin6 curTop2
    if (handLen !== 10) return null;
    if (omin < 5 || omin > 7) return null;
    if (curTop > 2) return null;
    var byR = {}, i, c, p, r, twos = 0;
    for (i = 0; i < hand.length; i++) {
      c = hand[i];
      byR[c.rank] = (byR[c.rank] || 0) + 1;
      if (c.rank === 12) twos++;
    }
    if (twos < 1 || (byR[11] || 0) < 2) return null; // need 2 + AA
    var naked = [];
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || p.length !== 1) continue;
      r = p[0].rank;
      if (r === 12) continue;
      if ((byR[r] || 0) !== 1) continue;
      naked.push({ p: p, rank: r });
    }
    if (naked.length < 2) return null;
    naked.sort(function (a, b) {
      if (a.rank !== b.rank) return b.rank - a.rank;
      return a.p[0].suit - b.p[0].suit;
    });
    // Queen-only unique max (CF QD)
    if (naked[0].rank !== 9) return null;
    if (naked.length > 1 && naked[1].rank === 9) return null;
    if (naked[0].rank - naked[naked.length - 1].rank < 3) return null;
    return naked[0].p;
  }

  /** W50 com_egunder: late short-hand — binary Ace underclimb only.
   *  Full-policy force WIN B 20320640@0 s14: legals exactly QC|AD → pick QC.
   *  Reverse 20260801@1 had 4 legals (7C/9H/KH/AC) → thrash; require |S|===2.
   *  Gates: combat single, handLen 2–4, omin 3–6, exactly 2 non-2 singles,
   *  one Ace + one non-Ace, pick the non-Ace, never 2.
   *  After sbc0/maxedge. SoftN FORBIDDEN. */
  function pickComEgUnder(hand, cur, leg, state, cp) {
    if (!cur || cur.type !== 'single') return null;
    if (playIsBomb(cur.cards || [])) return null;
    var handLen = hand.length;
    var omin = oppMinHand(state, cp);
    if (handLen < 2 || handLen > 4) return null;
    if (omin < 3 || omin > 6) return null;
    var rows = [], i, p, r, ace = null, non = null;
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || p.length !== 1) continue;
      r = p[0].rank;
      if (r === 12) continue;
      rows.push({ p: p, rank: r });
      if (r === 11) ace = p;
      else non = p;
    }
    // binary only: exactly Ace + one underclimb (convert fingerprint)
    if (rows.length !== 2) return null;
    if (!ace || !non) return null;
    return non;
  }

  /** W66 com_kpeel: combat climb peel one King from quad-K (A convert 20330612@1 s2).
   *  Base min 5S → force KH. Gates: combat single, handLen===12, omin===12, curTop===1,
   *  twos===1, byR[10]===4 (quad K), pick expertScore-min among K singles. SoftN FORBIDDEN. */
  function pickComKPeel(hand, cur, leg, state, cp) {
    if (!cur || cur.type !== 'single') return null;
    if (playIsBomb(cur.cards || [])) return null;
    var handLen = hand.length;
    if (handLen !== 12) return null;
    var omin = oppMinHand(state, cp);
    if (omin !== 12) return null;
    var curTop = cur.top ? cur.top.rank : 0;
    if (curTop !== 1) return null;
    var byR = {}, i, p, c, r, twos = 0;
    for (i = 0; i < hand.length; i++) {
      c = hand[i];
      byR[c.rank] = (byR[c.rank] || 0) + 1;
      if (c.rank === 12) twos++;
    }
    if (twos !== 1) return null;
    if ((byR[10] || 0) !== 4) return null; // exact quad Kings
    var ks = [];
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || p.length !== 1) continue;
      r = p[0].rank;
      if (r === 12) continue;
      if (r === 10) ks.push(p);
    }
    if (!ks.length) return null;
    ks.sort(function (a, b) {
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return ks[0];
  }

  /** W64 com_acejunder: combat Ace→Jack underclimb with AA + double-2 (B convert 20470235@0).
   *  Base plays AC; force JC. egunder is short binary only; sbc0 is Ace climb.
   *  Gates: combat single, handLen===10, omin===9, curTop===1, twos===2, byR[A]===2,
   *  legal Ace + legal Jack, never force 2, pick expertScore-min among Jack singles.
   *  SoftN FORBIDDEN. */
  function pickComAceJUnder(hand, cur, leg, state, cp) {
    if (!cur || cur.type !== 'single') return null;
    if (playIsBomb(cur.cards || [])) return null;
    var handLen = hand.length;
    if (handLen !== 10) return null;
    var omin = oppMinHand(state, cp);
    if (omin !== 9) return null;
    var curTop = cur.top ? cur.top.rank : 0;
    if (curTop !== 1) return null;
    var byR = {}, i, p, c, r, twos = 0;
    for (i = 0; i < hand.length; i++) {
      c = hand[i];
      byR[c.rank] = (byR[c.rank] || 0) + 1;
      if (c.rank === 12) twos++;
    }
    if (twos !== 2) return null;
    if ((byR[11] || 0) !== 2) return null; // AA
    var aces = [], jacks = [];
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || p.length !== 1) continue;
      r = p[0].rank;
      if (r === 12) continue;
      if (r === 11) aces.push(p);
      if (r === 8) jacks.push(p);
    }
    if (!aces.length || !jacks.length) return null;
    jacks.sort(function (a, b) {
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return jacks[0];
  }

  /** W57 com_qpairclimb: combat single Queen peel from pair under triple midface.
   *  Full-policy force WIN B 20430343@1 s4: base 7S → QS.
   *  maxedge null (hl11/omin11/curTop3; Q not naked). Fingerprint-locked.
   *  Gates: handLen===11, omin===11, curTop===3, twos≥1, byR[9]===2 (Q pair),
   *  some rank count===3, min legal non-2 single ≤4, pick expertScore-min among Q.
   *  SoftN FORBIDDEN. Never force 2. */
  function pickComQPairClimb(hand, cur, leg, state, cp) {
    if (!cur || cur.type !== 'single') return null;
    if (playIsBomb(cur.cards || [])) return null;
    var handLen = hand.length;
    if (handLen !== 11) return null;
    var omin = oppMinHand(state, cp);
    if (omin !== 11) return null;
    var curTop = cur.top ? cur.top.rank : 0;
    if (curTop !== 3) return null;
    var byR = {}, i, c, p, r, twos = 0, hasTrip = false;
    for (i = 0; i < hand.length; i++) {
      c = hand[i];
      byR[c.rank] = (byR[c.rank] || 0) + 1;
      if (c.rank === 12) twos++;
    }
    if (twos < 1) return null;
    if ((byR[9] || 0) !== 2) return null; // Queen pair only
    for (r in byR) {
      if (byR[r] === 3) { hasTrip = true; break; }
    }
    if (!hasTrip) return null;
    var qs = [], minR = 99;
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || p.length !== 1) continue;
      r = p[0].rank;
      if (r === 12) continue;
      if (r < minR) minR = r;
      if (r === 9) qs.push(p);
    }
    if (minR > 4) return null; // convert min 7S rank 4
    if (!qs.length) return null;
    qs.sort(function (a, b) {
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return qs[0];
  }

  /** W34 seqhi: combat seq residual-max when mulowg band does NOT fire.
   *  CF 20340585@0 s1: min 678 → max 789 WIN. Orthogonal to mulowg (minTop≤3). */
  function pickSeqHi(hand, cur, leg, state, cp) {
    if (!cur || cur.type !== 'seq') return null;
    var curTop = cur.top ? cur.top.rank : 0;
    if (curTop > 3) return null; // very low face only (CF curTop=2)
    var handLen = hand.length;
    if (handLen < 8 || handLen > 13) return null;
    var omin = oppMinHand(state, cp);
    if (omin < 4) return null;
    var info = analyzeHand(hand);
    if (!(info.twos >= 1 || info.control >= 2)) return null;

    var seqs = [], i, p, c, curLen = cur.cards ? cur.cards.length : 0;
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'seq') continue;
      if (curLen && p.length !== curLen) continue;
      seqs.push(p);
    }
    if (seqs.length < 2) return null;
    var tops = {};
    for (i = 0; i < seqs.length; i++) tops[topRank(seqs[i])] = 1;
    if (Object.keys(tops).length < 2) return null;

    var minT = 99, maxT = -1, t;
    for (i = 0; i < seqs.length; i++) {
      t = topRank(seqs[i]);
      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
    }
    // Complement mulowg: only when min-top is MID (mulowg owns minTop≤3)
    if (minT <= 3) return null;
    // Adjacent climb only: CF 678→789 (tops 5→6). Ungated max picked 89T and dual-lost.
    if (maxT <= minT) return null;
    var band = [];
    for (i = 0; i < seqs.length; i++) {
      t = topRank(seqs[i]);
      if (t >= minT && t <= minT + 1) band.push(seqs[i]);
    }
    if (band.length < 2) return null;
    // require an actual higher-top option in band
    var hasHi = false;
    for (i = 0; i < band.length; i++) {
      if (topRank(band[i]) === minT + 1) { hasHi = true; break; }
    }
    if (!hasHi) return null;
    if (minT + 1 > 8) return null;

    band.sort(function (a, b) {
      var ta = topRank(a), tb = topRank(b);
      if (ta !== tb) return tb - ta; // MAX top within adjacent band
      if (a.length !== b.length) return b.length - a.length;
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return band[0];
  }


  /** W51 seqhi_res: mulowg-band residual-max combat seq (unique top===J).
   *  Full-policy force WIN B 20410397@0 s4: base 456 → 9TJ (top J).
   *  mulowg would force min (minT≤3); seqhi null when minT≤3.
   *  Fingerprint gates: curTop≤2, handLen===11, omin 7–9, twos≥1,
   *  same-len seq pool ≥2 tops, minT≤3, target top===8 (J), target−minT≥5,
   *  pick expertScore-min among top===J. SoftN FORBIDDEN. */
  function pickSeqHiRes(hand, cur, leg, state, cp) {
    if (!cur || cur.type !== 'seq') return null;
    if (playIsBomb(cur.cards || [])) return null;
    var curTop = cur.top ? cur.top.rank : 0;
    if (curTop > 2) return null;
    var handLen = hand.length;
    if (handLen !== 11) return null;
    var omin = oppMinHand(state, cp);
    if (omin < 7 || omin > 9) return null;
    var info = analyzeHand(hand);
    if (info.twos < 1) return null;

    var curLen = cur.cards ? cur.cards.length : 0;
    var seqs = [], i, p, c, t;
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'seq') continue;
      if (curLen && p.length !== curLen) continue;
      seqs.push(p);
    }
    if (seqs.length < 2) return null;
    var minT = 99, maxT = -1, tops = {};
    for (i = 0; i < seqs.length; i++) {
      t = topRank(seqs[i]);
      tops[t] = 1;
      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
    }
    if (Object.keys(tops).length < 2) return null;
    // mulowg band only (disjoint from seqhi which requires minT>3)
    if (minT > 3) return null;
    // Target Jack top only (CF 9TJ) — not raw max (blocks TJK)
    var target = 8;
    if (!tops[target]) return null;
    if (target - minT < 5) return null;
    var cand = [];
    for (i = 0; i < seqs.length; i++) {
      if (topRank(seqs[i]) === target) cand.push(seqs[i]);
    }
    if (!cand.length) return null;
    cand.sort(function (a, b) {
      if (a.length !== b.length) return b.length - a.length;
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return cand[0];
  }


  /** W65 seqhi_res13: mulowg-band residual Jack-top on open hand (A convert 20270774@0).
   *  Base mulowg min 345 → force 9TJ. Disjoint seqhi_res (hl===11/omin7-9).
   *  Gates: curLen===3, curTop===2, handLen===13, omin===10, twos≥1, minT≤3,
   *  target top===8 (J), target-minT≥5, pick expertScore-min among top===J.
   *  SoftN FORBIDDEN. Protect-test vs v91 required (mulowg ship seat). */
  function pickSeqHiRes13(hand, cur, leg, state, cp) {
    if (!cur || cur.type !== 'seq') return null;
    if (playIsBomb(cur.cards || [])) return null;
    var curTop = cur.top ? cur.top.rank : 0;
    if (curTop !== 2) return null;
    var handLen = hand.length;
    if (handLen !== 13) return null;
    var omin = oppMinHand(state, cp);
    if (omin !== 10) return null;
    var curLen = cur.cards ? cur.cards.length : 0;
    if (curLen !== 3) return null;
    var info = analyzeHand(hand);
    if (info.twos < 1) return null;
    var seqs = [], i, p, c, t;
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'seq') continue;
      if (p.length !== curLen) continue;
      seqs.push(p);
    }
    if (seqs.length < 2) return null;
    var minT = 99, maxT = -1, tops = {};
    for (i = 0; i < seqs.length; i++) {
      t = topRank(seqs[i]);
      tops[t] = 1;
      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
    }
    if (Object.keys(tops).length < 2) return null;
    if (minT > 3) return null;
    var target = 8; // Jack
    if (!tops[target]) return null;
    if (target - minT < 5) return null;
    var cand = [];
    for (i = 0; i < seqs.length; i++) {
      if (topRank(seqs[i]) === target) cand.push(seqs[i]);
    }
    if (!cand.length) return null;
    cand.sort(function (a, b) {
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return cand[0];
  }

  /** W54 seqadj: mulowg-band adjacent climb combat seq (A convert 20310666@0).
   *  Base mulowg min 3456 → force adjacent 4567. NOT residual-max (protects 20270774).
   *  Gates: cur seq, curTop≤3, handLen===13, omin===9, curLen===4, twos≥1,
   *  minT≤3, maxT===minT+1, pick expertScore-min among top===minT+1. SoftN FORBIDDEN. */
  function pickSeqAdj(hand, cur, leg, state, cp) {
    if (!cur || cur.type !== 'seq') return null;
    if (playIsBomb(cur.cards || [])) return null;
    var curTop = cur.top ? cur.top.rank : 0;
    if (curTop > 3) return null;
    var handLen = hand.length;
    if (handLen !== 13) return null;
    var omin = oppMinHand(state, cp);
    if (omin !== 9) return null;
    var curLen = cur.cards ? cur.cards.length : 0;
    if (curLen !== 4) return null;
    var info = analyzeHand(hand);
    if (info.twos < 1) return null;

    var seqs = [], i, p, c, t;
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'seq') continue;
      if (p.length !== curLen) continue;
      seqs.push(p);
    }
    if (seqs.length < 2) return null;
    var minT = 99, maxT = -1;
    for (i = 0; i < seqs.length; i++) {
      t = topRank(seqs[i]);
      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
    }
    if (minT > 3) return null; // mulowg band only
    var target = minT + 1;
    if (maxT !== target) return null; // adjacent only — kill residual-max
    var cand = [];
    for (i = 0; i < seqs.length; i++) {
      if (topRank(seqs[i]) === target) cand.push(seqs[i]);
    }
    if (!cand.length) return null;
    cand.sort(function (a, b) {
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return cand[0];
  }

  /** W55 seq5adj: mid-face combat seq5 adjacent +1 climb (A convert 20430342@1).
   *  Base min 789TJ (top J) → force adjacent 89TJQ (top Q). NOT residual-max farther.
   *  Uncovered: seqhi curTop≤3; seqadj curLen===4/curTop≤3/omin===9; seqhi_res minT≤3/hl11.
   *  Gates: curLen===5, curTop===4, handLen===13, omin===8, twos≥2,
   *  minT≥7, maxT===minT+1, pick expertScore-min among top===minT+1. SoftN FORBIDDEN. */
  function pickSeq5Adj(hand, cur, leg, state, cp) {
    if (!cur || cur.type !== 'seq') return null;
    if (playIsBomb(cur.cards || [])) return null;
    var curTop = cur.top ? cur.top.rank : 0;
    if (curTop !== 4) return null;
    var handLen = hand.length;
    if (handLen !== 13) return null;
    var omin = oppMinHand(state, cp);
    if (omin !== 8) return null;
    var curLen = cur.cards ? cur.cards.length : 0;
    if (curLen !== 5) return null;
    var info = analyzeHand(hand);
    if (info.twos < 2) return null;

    var seqs = [], i, p, c, t;
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'seq') continue;
      if (p.length !== curLen) continue;
      seqs.push(p);
    }
    if (seqs.length < 2) return null;
    var minT = 99, maxT = -1;
    for (i = 0; i < seqs.length; i++) {
      t = topRank(seqs[i]);
      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
    }
    // Star tops J=8 → Q=9; require high min band (disjoint mulowg/seqhi_res)
    if (minT < 7) return null;
    var target = minT + 1;
    if (maxT !== target) return null; // adjacent only — kill residual-max
    var cand = [];
    for (i = 0; i < seqs.length; i++) {
      if (topRank(seqs[i]) === target) cand.push(seqs[i]);
    }
    if (!cand.length) return null;
    cand.sort(function (a, b) {
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return cand[0];
  }

  /** W56 seqmidunder: mid-face combat seq3 underclimb (A convert 20340585@1).
   *  Base residual-high 9TJ → force adjacent min 89T. Opposite of climb levers.
   *  Uncovered: seqhi curTop≤3; mulowg minT≤3; seqadj curLen4; seq5adj curLen5/curTop4.
   *  Gates: curLen===3, curTop===6, handLen===10, omin===10, twos≥1,
   *  minT≥6, maxT===minT+1, pick expertScore-min among top===minT. SoftN FORBIDDEN. */
  function pickSeqMidUnder(hand, cur, leg, state, cp) {
    if (!cur || cur.type !== 'seq') return null;
    if (playIsBomb(cur.cards || [])) return null;
    var curTop = cur.top ? cur.top.rank : 0;
    if (curTop !== 6) return null;
    var handLen = hand.length;
    if (handLen !== 10) return null;
    var omin = oppMinHand(state, cp);
    if (omin !== 10) return null;
    var curLen = cur.cards ? cur.cards.length : 0;
    if (curLen !== 3) return null;
    var info = analyzeHand(hand);
    if (info.twos < 1) return null;

    var seqs = [], i, p, c, t;
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || playIsExpensive(p) || playHasTwo(p) || playIsBomb(p)) continue;
      c = detectCombo(p);
      if (!c || c.type !== 'seq') continue;
      if (p.length !== curLen) continue;
      seqs.push(p);
    }
    if (seqs.length < 2) return null;
    var minT = 99, maxT = -1;
    for (i = 0; i < seqs.length; i++) {
      t = topRank(seqs[i]);
      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
    }
    // Star tops T=7 and J=8; require mid-high band (disjoint mulowg)
    if (minT < 6) return null;
    if (maxT !== minT + 1) return null; // adjacent only
    var cand = [];
    for (i = 0; i < seqs.length; i++) {
      if (topRank(seqs[i]) === minT) cand.push(seqs[i]);
    }
    if (!cand.length) return null;
    cand.sort(function (a, b) {
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    return cand[0];
  }

  /** W30 pairhi: combat pair max-top among non-2 pairs (convert 20480207 55→66) */
  function pickPairHi(hand, cur, leg, state, cp) {
    if (!cur || cur.type !== 'pair') return null;
    var curTop = cur.top ? cur.top.rank : 0;
    if (curTop > 6) return null; // low-mid face
    var handLen = hand.length;
    if (handLen < 4 || handLen > 13) return null;
    var omin = oppMinHand(state, cp);
    if (omin < 2) return null;

    var pairs = [], i, p, c;
    for (i = 0; i < leg.length; i++) {
      p = leg[i];
      if (!p || p.length !== 2) continue;
      if (p[0].rank === 12 || p[1].rank === 12) continue; // no 22 primary
      c = detectCombo(p);
      if (!c || c.type !== 'pair') continue;
      pairs.push(p);
    }
    if (pairs.length < 2) return null;
    // distinct tops required
    var tops = {};
    for (i = 0; i < pairs.length; i++) tops[topRank(pairs[i])] = 1;
    if (Object.keys(tops).length < 2) return null;

    pairs.sort(function (a, b) {
      var ta = topRank(a), tb = topRank(b);
      if (ta !== tb) return tb - ta; // MAX top
      return expertScore(a, state, cp) - expertScore(b, state, cp);
    });
    // W38 pairhi_wide: when min pair is very low (≤2) and curTop≤2, allow larger
    // gap for mid-high max (CF B 20320640 33→TT, 20410397 55→JJ/QQ). Cap max at Q
    // (AA dual-null on 20410397). Banked pairhi 55→66 stays in normal gap≤4 band
    // because min pair top is 5 (>2).
    var minT = 99, iM, tM;
    for (iM = 0; iM < pairs.length; iM++) {
      tM = topRank(pairs[iM]);
      if (tM < minT) minT = tM;
    }
    var gapLim = 4;
    var maxTopLim = 10; // normal: up to K
    if (minT <= 2 && curTop <= 2) {
      gapLim = 9;
      maxTopLim = 9; // Q — not AA
    }
    // Prefer max among pairs with top ≤ maxTopLim
    var best = null;
    for (iM = 0; iM < pairs.length; iM++) {
      tM = topRank(pairs[iM]);
      if (tM > maxTopLim) continue;
      best = pairs[iM];
      break; // pairs already sorted max-first
    }
    if (!best) return null;
    var gap = topRank(best) - curTop;
    if (gap > gapLim) return null;
    if (topRank(best) === minT) return null; // no higher option in band
    return best;
  }

  function multiBurnsHighResidual(hand, play) {
    if (!play || play.length < 2) return false;
    var by = {}, i, r, used = {}, k, pr, peels = false;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      by[r] = (by[r] || 0) + 1;
    }
    for (i = 0; i < play.length; i++) {
      pr = play[i].rank;
      used[pr] = (used[pr] || 0) + 1;
    }
    for (k in used) {
      if (!Object.prototype.hasOwnProperty.call(used, k)) continue;
      pr = +k;
      if (pr >= 9 && (by[pr] || 0) >= 2) peels = true;
    }
    if (peels) return true;
    return structureBreakCost(hand, play) >= 8;
  }

  /** W25 multiPower for free-lead weak structure gate */
  function multiPowerOf(hand) {
    var by = {}, i, r, c, mp = 0, nFam = 0;
    for (i = 0; i < hand.length; i++) {
      r = hand[i].rank;
      by[r] = (by[r] || 0) + 1;
    }
    for (r = 0; r <= 12; r++) {
      c = by[r] || 0;
      if (c >= 4) { mp += 4; nFam++; }
      else if (c >= 3) { mp += 3; nFam++; }
      else if (c >= 2) { mp += 2; nFam++; }
    }
    return { mp: mp, nFam: nFam, by: by };
  }
  function isWeakMultiPower(hand) {
    var m = multiPowerOf(hand);
    if (hand.length < 10) return false;
    if (m.mp <= 4) return true;
    if (m.nFam === 1 && m.mp <= 5) return true;
    return false;
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
        // W24 climbtax + W26: extend to Jack (rank 9) for JH→QS→KS class
        if (!usesTwo && gap >= 2 && com.top.rank >= 9 && curTop <= 6 && handLen >= 6) {
          if (info.twos >= 1 || info.control >= 2) score += 35 + gap * 3;
        }
        if (!usesTwo && gap >= 3 && com.top.rank >= 11 && handLen >= 8) {
          score += 25;
        }
      }
      // W26 p_w26_ex_seqclimb: MULTI arm OUTSIDE single&&single (fixes jclimb dead code)
      // Tax high multi climbs over low faces that peel residual packages (JH from JJJ).
      if (
        !usesTwo &&
        cur &&
        (com.type === 'pair' || com.type === 'seq' || com.type === 'triple' || com.type === 'doubleseq') &&
        com.top &&
        com.top.rank >= 9 &&
        curTop <= 6 &&
        handLen >= 7 &&
        (info.twos >= 1 || info.control >= 2) &&
        multiBurnsHighResidual(hand, play)
      ) {
        var gapM = com.top.rank - curTop;
        if (gapM >= 3) score += 32 + gapM * 2;
        else if (gapM >= 2) score += 22;
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

    // probe-TWO: broader 2-tempo vs mid tops when short race / trash or control remains
    // Flips loss seed 20510036 vs freeze v90 GM; N=50 probe 36/50 (was 35/50).
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

    // W47 com_sbc0: unique min-SBC==0 combat single (before multi combat; orthogonal)
    var sbc0 = pickComSbc0(hand, cur, leg, state, cp);
    if (sbc0) return { play: sbc0 };

    // W49 com_maxedge: unique max naked J/Q climb (after sbc0)
    var me = pickComMaxEdge(hand, cur, leg, state, cp);
    if (me) return { play: me };

    // W50 com_egunder: late short-hand Ace underclimb
    var eu = pickComEgUnder(hand, cur, leg, state, cp);
    if (eu) return { play: eu };

    // W64 com_acejunder: midhand Ace→Jack underclimb (AA + double-2)
    var aju = pickComAceJUnder(hand, cur, leg, state, cp);
    if (aju) return { play: aju };

    // W66 com_kpeel: peel King from quad-K combat climb
    var kp = pickComKPeel(hand, cur, leg, state, cp);
    if (kp) return { play: kp };

    // W57 com_qpairclimb: Queen peel climb under triple midface
    var qpc = pickComQPairClimb(hand, cur, leg, state, cp);
    if (qpc) return { play: qpc };

    // W34 seqhi: residual-max combat seq (before pairhi/mulowg; mulowg band disjoint via minT>3)
    var sh = pickSeqHi(hand, cur, leg, state, cp);
    if (sh) return { play: sh };

    // W51 seqhi_res: mulowg-band residual Jack-top seq (BEFORE mulowg min)
    var shr = pickSeqHiRes(hand, cur, leg, state, cp);
    if (shr) return { play: shr };

    // W65 seqhi_res13: open-hand residual Jack-top (BEFORE mulowg min)
    var shr13 = pickSeqHiRes13(hand, cur, leg, state, cp);
    if (shr13) return { play: shr13 };

    // W54 seqadj: mulowg-band adjacent climb (BEFORE mulowg min)
    var sa = pickSeqAdj(hand, cur, leg, state, cp);
    if (sa) return { play: sa };

    // W55 seq5adj: mid-face seq5 adjacent climb (BEFORE mulowg/pairhi)
    var s5 = pickSeq5Adj(hand, cur, leg, state, cp);
    if (s5) return { play: s5 };

    // W56 seqmidunder: mid-face seq3 underclimb (BEFORE residual high default)
    var smu = pickSeqMidUnder(hand, cur, leg, state, cp);
    if (smu) return { play: smu };

    // W30 p_w30_ex_pairhi: max-top pair before mulowg min-top (convert 20480207)
    var ph = pickPairHi(hand, cur, leg, state, cp);
    if (ph) return { play: ph };

    // W29 p_w29_ex_mulowg (band-gated mulow): holdout convert 20270774 — min-top same-type multi when
    // pool≥2, low face, residual 2/control. Opposite of residual-max (prefers losing 89T).
    // Gold: keep high package for later; SoftN/pass forbidden.
    if (
      cur &&
      cur.type !== 'single' &&
      !playIsBomb(cur.cards || []) &&
      curTop <= 6 &&
      handLen >= 7 &&
      (infoC.twos >= 1 || infoC.control >= 2)
    ) {
      var lowM = [], iL, pL, cL;
      for (iL = 0; iL < leg.length; iL++) {
        pL = leg[iL];
        cL = detectCombo(pL);
        if (cL && cL.type === cur.type && !playHasTwo(pL) && !playIsBomb(pL)) lowM.push(pL);
      }
      if (lowM.length >= 2) {
        lowM.sort(function (a, b) {
          var ta = topRank(a), tb = topRank(b);
          if (ta !== tb) return ta - tb; // MIN top
          if (a.length !== b.length) return b.length - a.length; // longer shed if same top
          return expertScore(a, state, cp) - expertScore(b, state, cp);
        });
        // W29 mulowg: only force when min-top is truly low (≤6 card = rank≤3)
        // keeps convert 20270774 (top=2); blocks reverse band top=5 (20460262/20440315)
        if (topRank(lowM[0]) <= 3) return { play: lowM[0] };
      }
    }

    var cheap = cheapLegals(leg);
    if (cheap.length) {
      var shC = pickSeqHi(hand, cur, cheap, state, cp);
      if (shC) return { play: shC };
      var phC = pickPairHi(hand, cur, cheap, state, cp);
      if (phC) return { play: phC };
      if (
        cur &&
        cur.type !== 'single' &&
        !playIsBomb(cur.cards || []) &&
        curTop <= 6 &&
        handLen >= 7 &&
        (infoC.twos >= 1 || infoC.control >= 2)
      ) {
        var cheapLow = [], iCL, pCL, cCL;
        for (iCL = 0; iCL < cheap.length; iCL++) {
          pCL = cheap[iCL];
          cCL = detectCombo(pCL);
          if (cCL && cCL.type === cur.type) cheapLow.push(pCL);
        }
        if (cheapLow.length >= 2) {
          cheapLow.sort(function (a, b) {
            var ta = topRank(a), tb = topRank(b);
            if (ta !== tb) return ta - tb;
            if (a.length !== b.length) return b.length - a.length;
            return expertScore(a, state, cp) - expertScore(b, state, cp);
          });
          if (topRank(cheapLow[0]) <= 3) return { play: cheapLow[0] };
        }
      }
      return { play: orderLegals(cheap, state, cp)[0] };
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
      // W75 fl_jpair: FREE force pair-J over high T-J-Q seq (mirror search-root)
      var fjp = pickFlJPair(hand, multi.concat(leg), state, cp);
      if (fjp) return fjp;
      // W71 fl_seq4/nineshed: search-root hard only (not expert leaf) — anti BR-leaf thrash on B.
      // Convert 20320639@0 relies on searchMove hard FREE pins below.
      // W69 fl_midshort FIRST: exact L=3 midshort (no-2 twin5/7)
      var fms = pickFlMidShort(hand, multi.concat(leg), state, cp);
      if (fms) return fms;
      // W68 fl_seq5exact: exact L=5 open (before weak-multi trash / maxL open)
      var fs5e = pickFlSeq5Exact(hand, multi.concat(leg), state, cp);
      if (fs5e) return fs5e;
      // W25 flweakmp expert mirror: weak multiPower → trash-first if control
      if (isWeakMultiPower(hand) && omin >= 4 && trashPlays.length && info.hasControl) {
        return trashPlays[0];
      }
      if (isWeakMultiPower(hand) && omin >= 4) {
        var safeM = multi.filter(function (p) {
          var com = detectCombo(p);
          var top = topRank(p);
          if (!com) return false;
          if (com.type === 'seq' && top <= 5) return false;
          if (com.type === 'triple' && top <= 4) return false;
          if (com.type === 'pair' && top <= 3) return false;
          return true;
        });
        if (safeM.length) multi = safeM;
      }
      // W52 fl_seqopen: opening max-length seq before flshort5 shortens
      var fso = pickFlSeqOpen(hand, multi.length ? multi.concat(leg) : leg, state, cp);
      if (fso) return fso;
      // W32 flshort5 BEFORE flvol: mega-seq ≥7 → len-5 (flvol volume would re-pick mega)
      var fls = pickFlShort(hand, multi, state, cp);
      if (fls) return fls;
      // W41 fl_tripair FIRST (pairseq must not steal dual-triple seats)
      var ftp = pickFlTriPair(hand, multi, state, cp);
      if (ftp) return ftp;
      // W45 fl_twoshed: double-2 + low pair → single (before pairseq/flvol)
      var fts = pickFlTwoShed(hand, multi.length ? multi.concat(leg) : leg, state, cp);
      if (fts) return fts;
      // W58 fl_pair88: FREE force pair-of-8s midhand fingerprint
      var fp88 = pickFlPair88(hand, multi.length ? multi.concat(leg) : leg, state, cp);
      if (fp88) return fp88;
      // W53 fl_pairseq3: mid pair → residual 3-seq without quad
      var fps3 = pickFlPairSeq3(hand, multi.length ? multi.concat(leg) : leg, state, cp);
      if (fps3) return fps3;
      // W44 fl_pairseq: low pair → residual 3-seq only (opening)
      var fpsq = pickFlPairSeq(hand, multi.length ? multi.concat(leg) : leg, state, cp);
      if (fpsq) return fpsq;
      // W42 fl_pairshed: high pair K+ → low single (scan full leg; multi-only would hide singles)
      var fps = pickFlPairShed(hand, leg, state, cp);
      if (fps) return fps;
      // W59 fl_midshed: short midhand pair-9 → low single
      var fms = pickFlMidShed(hand, leg, state, cp);
      if (fms) return fms;
      // W60 fl_egpair: endgame dual-pair force mid single 8
      var feg = pickFlEgPair(hand, leg, state, cp);
      if (feg) return feg;
      // W61 fl_pair5: FREE force pair-5 over long seq (no-2 twin-K fingerprint)
      var fp5 = pickFlPair5(hand, leg, state, cp);
      if (fp5) return fp5;
      // W63 fl_pair6: FREE force pair-6 over seq (no-2 twin-J fingerprint)
      var fp6 = pickFlPair6(hand, leg, state, cp);
      if (fp6) return fp6;
      // W62 fl_quad4lead: FREE open trash-3 when holding quad-4s
      var fq4 = pickFlQuad4Lead(hand, leg, state, cp);
      if (fq4) return fq4;
      // W31 flvol: low naked pair → volume multi (before multi-always min-top)
      var flv = pickFlVol(hand, multi, state, cp);
      if (flv) return flv;
      // W36 flhidetight: FREE high-pair defer (pure hi-pair pool only; no struct multi)
      var flh = pickFlHidefer(hand, leg, state, cp);
      if (flh) return flh;
      // W40 fl_brseq3: expert multi-always already prefers low seq3 — no hard override
      // (BR strip below is the convert-first lever; expert stays identity with base).
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
      // Hybrid trash only when exploit dual-self scores hybrid mode (ladder: multi-always
      // + TWO 2-tempo is the dual-pass package; aggressive trash default re-lost flips).
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

    // W43 fl_lotesh: late high→low before trash/mid-block (expert already; search overrides)
    var flot = pickFlLotesh(hand, leg, state, cp);
    if (flot) return flot;

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
      // Prefer multi first (human-log / lock-bonus lessons)
      mergedBR.sort(function (a, b) {
        if (a.length !== b.length) return b.length - a.length;
        return topRank(a) - topRank(b);
      });
      leg = mergedBR;
      // W14 p_w14_bropair: deep FL pair force only when opp also deep (no race)
      var forcedLP = false;
      // Capture full multi before forcedLP strip (volume dual-null otherwise)
      var fullMultiBR = [];
      if (!cur) {
        var iFM, pFM;
        for (iFM = 0; iFM < leg.length; iFM++) {
          pFM = leg[iFM];
          if (pFM && pFM.length >= 2 && !playIsExpensive(pFM)) fullMultiBR.push(pFM);
        }
      }
      if (!cur && hand.length >= 11 && oppMinHand(state, myIdx) >= 6) {
        var lps = [], iL;
        for (iL = 0; iL < leg.length; iL++) {
          if (leg[iL] && leg[iL].length === 2 && topRank(leg[iL]) <= 6 &&
              structureBreakCost(hand, leg[iL]) < 8) lps.push(leg[iL]);
        }
        if (lps.length) { leg = lps; forcedLP = true; }
      }
      // W32 flshort5: BR strip mega-seq ≥7 → len-5 pool FIRST (before flvol volume)
      if (!cur) {
        var shortBR = flShortPool(hand, fullMultiBR.length ? fullMultiBR : leg, state, myIdx);
        if (shortBR.length) {
          leg = shortBR;
          forcedLP = false;
        }
      }
      // W41 fl_tripair BR FIRST
      if (!cur && !(shortBR && shortBR.length)) {
        var tripBR = flTriPairPool(hand, fullMultiBR.length ? fullMultiBR : leg, state, myIdx);
        if (tripBR.length) {
          leg = tripBR;
          forcedLP = false;
        }
      }
      // W44 fl_pairseq BR: strip to residual 3-seq pool when low pair + seq3
      if (!cur && !(shortBR && shortBR.length) && !(tripBR && tripBR.length)) {
        var pairseqPick = pickFlPairSeq(hand, fullMultiBR.length ? fullMultiBR.concat(leg) : leg, state, myIdx);
        if (pairseqPick) {
          var seqPool = [], iSP, pSP, cSP;
          var scan = fullMultiBR.length ? fullMultiBR : leg;
          for (iSP = 0; iSP < scan.length; iSP++) {
            pSP = scan[iSP];
            if (!pSP || playIsExpensive(pSP) || playHasTwo(pSP)) continue;
            cSP = detectCombo(pSP);
            if (cSP && cSP.type === 'seq' && pSP.length === 3 && topRank(pSP) <= 5) seqPool.push(pSP);
          }
          for (iSP = 0; iSP < leg.length; iSP++) {
            pSP = leg[iSP];
            if (!pSP || playIsExpensive(pSP) || playHasTwo(pSP)) continue;
            cSP = detectCombo(pSP);
            if (cSP && cSP.type === 'seq' && pSP.length === 3 && topRank(pSP) <= 5) {
              var sigSP = playSig(pSP), dupSP = false, iD;
              for (iD = 0; iD < seqPool.length; iD++) if (playSig(seqPool[iD]) === sigSP) { dupSP = true; break; }
              if (!dupSP) seqPool.push(pSP);
            }
          }
          if (seqPool.length) { leg = seqPool; forcedLP = false; }
        }
      }
      // W31 flvol: override forcedLP when volume multi exists vs low naked pair
      // Skip if flshort/tripair already stripped.
      if (!cur && !(shortBR && shortBR.length) && !(tripBR && tripBR.length)) {
        var volBR = flVolPool(hand, fullMultiBR.length ? fullMultiBR : leg, state, myIdx);
        if (volBR.length) {
          leg = volBR;
          forcedLP = false;
        }
      }
      // W40 fl_brseq3 BR: when low seq3 exists, drop trash singles from FREE BR pool.
      // Convert CF 20260802@1: BR otherwise scores naked 3S over multi and loses vs v91.
      // Keep multi candidates (seq/pair/trip); only strip singles. Before brfltrash/flweakmp.
      if (!cur && flBrSeq3Pool(hand, fullMultiBR.length ? fullMultiBR : leg, state, myIdx).length) {
        var multiOnly = [], iMO, pMO;
        for (iMO = 0; iMO < leg.length; iMO++) {
          pMO = leg[iMO];
          if (pMO && pMO.length >= 2 && !playIsExpensive(pMO)) multiOnly.push(pMO);
        }
        if (multiOnly.length) {
          leg = multiOnly;
          forcedLP = false;
        }
      }
      // W42 fl_pairshed BR: AFTER brseq3 multi-only — reintroduce low singles when hi pair K+
      // would otherwise win BR (convert 20480208 KK). Uses full legal set for single pool.
      if (!cur && !(tripBR && tripBR.length) && !(shortBR && shortBR.length)) {
        var fullLegPS = getLegalPlays(hand, null, state.players[myIdx].passed,
          state.isFirstLead, state.firstLeadCard);
        var shedBR = flPairShedPool(hand, fullLegPS.length ? fullLegPS : leg, state, myIdx);
        if (shedBR.length) {
          leg = shedBR;
          forcedLP = false;
        }
      }
      // W43 fl_lotesh BR: FREE late high→low — strip pool to low singles when gates fire
      if (!cur && !(tripBR && tripBR.length) && !(shortBR && shortBR.length) && !(shedBR && shedBR.length)) {
        var fullLegLT = getLegalPlays(hand, null, state.players[myIdx].passed,
          state.isFirstLead, state.firstLeadCard);
        var loteshBR = flLoteshPool(hand, fullLegLT.length ? fullLegLT : leg, state, myIdx);
        if (loteshBR.length) {
          leg = loteshBR;
          forcedLP = false;
        }
      }
      // W17 p_w17_brfltrash: gold 0514/0531/0540 — trash-first when no LP force + control
      if (!cur && !forcedLP && hand.length >= 8 && hand.length <= 12 &&
          oppMinHand(state, myIdx) >= 4) {
        var infoT = analyzeHand(hand);
        if (infoT.hasControl && infoT.trashCount >= 1) {
          var trashS = [], multiHi = false, iT, pT;
          for (iT = 0; iT < leg.length; iT++) {
            pT = leg[iT];
            if (!pT) continue;
            if (isTrashSinglePlay(pT, infoT)) trashS.push(pT);
            if (pT.length >= 2 && (topRank(pT) > 7 || (pT.length >= 3 && topRank(pT) > 6)))
              multiHi = true;
          }
          if (trashS.length && multiHi) leg = trashS;
        }
      }
      // W25 p_w25_ex_flweakmp: weak multiPower free-lead structure (holdout 20440315 class)
      // Prefer trash/safe multi; drop naked low seq/trip. Never pass on free lead.
      if (!cur && isWeakMultiPower(hand) && oppMinHand(state, myIdx) >= 4) {
        var infoW = analyzeHand(hand);
        var trashW = [], unansW = [], safeMulti = [], lowNaked = [], iW, pW, comW, topW, nakedLow;
        for (iW = 0; iW < leg.length; iW++) {
          pW = leg[iW];
          if (!pW) continue;
          if (isTrashSinglePlay(pW, infoW)) trashW.push(pW);
          if (pW.length >= 2 && !playIsExpensive(pW)) {
            comW = detectCombo(pW);
            topW = topRank(pW);
            nakedLow =
              (comW && comW.type === 'seq' && topW <= 5) ||
              (comW && comW.type === 'triple' && topW <= 4) ||
              (comW && comW.type === 'pair' && topW <= 3);
            if (nakedLow) lowNaked.push(pW);
            else safeMulti.push(pW);
          }
        }
        if (state.players.length === 2) {
          var oppH = state.players[myIdx === 0 ? 1 : 0].hand;
          if (oppH && oppH.length) {
            for (iW = 0; iW < leg.length; iW++) {
              pW = leg[iW];
              if (!pW || pW.length < 2 || playIsExpensive(pW)) continue;
              comW = detectCombo(pW);
              if (!comW) continue;
              if (!getLegalPlays(oppH, comW, false, false, null).length) unansW.push(pW);
            }
          }
        }
        if (unansW.length) leg = orderLegals(unansW, state, myIdx);
        else if (infoW.hasControl && trashW.length) {
          leg = trashW.slice().sort(function (a, b) {
            return a[0].rank - b[0].rank || a[0].suit - b[0].suit;
          });
        } else if (safeMulti.length) leg = orderLegals(safeMulti, state, myIdx);
        else if (lowNaked.length && leg.length > lowNaked.length) {
          var drop = {}, kept = [];
          for (iW = 0; iW < lowNaked.length; iW++) drop[playSig(lowNaked[iW])] = 1;
          for (iW = 0; iW < leg.length; iW++) {
            if (!drop[playSig(leg[iW])]) kept.push(leg[iW]);
          }
          if (kept.length) leg = kept;
        }
      }
    } else {
      var ch = cheapLegals(leg);
      if (ch.length) leg = ch;
      // Combat hard levers — exclusive if/else-if (no stale else-var BR thrash)
      var sbc0BR = pickComSbc0(hand, cur, leg, state, myIdx);
      var meBR = !sbc0BR ? pickComMaxEdge(hand, cur, leg, state, myIdx) : null;
      var euBR = (!sbc0BR && !meBR) ? pickComEgUnder(hand, cur, leg, state, myIdx) : null;
      var ajuBR = (!sbc0BR && !meBR && !euBR) ? pickComAceJUnder(hand, cur, leg, state, myIdx) : null;
      var kpBR = (!sbc0BR && !meBR && !euBR && !ajuBR) ? pickComKPeel(hand, cur, leg, state, myIdx) : null;
      var qpcBR = (!sbc0BR && !meBR && !euBR && !ajuBR && !kpBR) ? pickComQPairClimb(hand, cur, leg, state, myIdx) : null;
      var shBR = (!sbc0BR && !meBR && !euBR && !ajuBR && !kpBR && !qpcBR) ? pickSeqHi(hand, cur, leg, state, myIdx) : null;
      var shrBR = (!sbc0BR && !meBR && !euBR && !ajuBR && !qpcBR && !shBR) ? pickSeqHiRes(hand, cur, leg, state, myIdx) : null;
      var shr13BR = (!sbc0BR && !meBR && !euBR && !ajuBR && !qpcBR && !shBR && !shrBR) ? pickSeqHiRes13(hand, cur, leg, state, myIdx) : null;
      var saBR = (!sbc0BR && !meBR && !euBR && !ajuBR && !qpcBR && !shBR && !shrBR && !shr13BR) ? pickSeqAdj(hand, cur, leg, state, myIdx) : null;
      var s5BR = (!sbc0BR && !meBR && !euBR && !ajuBR && !qpcBR && !shBR && !shrBR && !shr13BR && !saBR) ? pickSeq5Adj(hand, cur, leg, state, myIdx) : null;
      var smuBR = (!sbc0BR && !meBR && !euBR && !ajuBR && !qpcBR && !shBR && !shrBR && !shr13BR && !saBR && !s5BR) ? pickSeqMidUnder(hand, cur, leg, state, myIdx) : null;
      var phBR = (!sbc0BR && !meBR && !euBR && !ajuBR && !qpcBR && !shBR && !shrBR && !shr13BR && !saBR && !s5BR && !smuBR) ? pickPairHi(hand, cur, leg, state, myIdx) : null;
      if (sbc0BR) {
        leg = [sbc0BR];
      } else if (meBR) {
        leg = [meBR];
      } else if (euBR) {
        leg = [euBR];
      } else if (ajuBR) {
        leg = [ajuBR];
      } else if (kpBR) {
        leg = [kpBR];
      } else if (qpcBR) {
        leg = [qpcBR];
      } else if (shBR) {
        leg = [shBR];
      } else if (shrBR) {
        leg = [shrBR];
      } else if (shr13BR) {
        leg = [shr13BR];
      } else if (saBR) {
        leg = [saBR];
      } else if (s5BR) {
        leg = [s5BR];
      } else if (smuBR) {
        leg = [smuBR];
      } else if (phBR) {
        leg = [phBR];
      } else
      // W28 mulow: BR root min-top same-type multi when low face + residual control
      if (
        cur &&
        cur.type !== 'single' &&
        !playIsBomb(cur.cards || []) &&
        (cur.top ? cur.top.rank : 0) <= 6 &&
        hand.length >= 7
      ) {
        var infoBR = analyzeHand(hand);
        if (infoBR.twos >= 1 || infoBR.control >= 2) {
          var brLow = [], iBL, pBL, cBL;
          for (iBL = 0; iBL < leg.length; iBL++) {
            pBL = leg[iBL];
            cBL = detectCombo(pBL);
            if (cBL && cBL.type === cur.type && !playHasTwo(pBL) && !playIsBomb(pBL)) brLow.push(pBL);
          }
          if (brLow.length >= 2) {
            brLow.sort(function (a, b) {
              var ta = topRank(a), tb = topRank(b);
              if (ta !== tb) return ta - tb;
              if (a.length !== b.length) return b.length - a.length;
              return expertScore(a, state, myIdx) - expertScore(b, state, myIdx);
            });
            // W29 mulowg: force min-top only when min top rank ≤ 3 (card ≤ 6)
            var minT = topRank(brLow[0]);
            if (minT <= 3) {
              var onlyMin = [];
              for (var iM = 0; iM < brLow.length; iM++) {
                if (topRank(brLow[iM]) === minT) onlyMin.push(brLow[iM]);
              }
              leg = onlyMin.length ? onlyMin : [brLow[0]];
            } else {
              leg = orderLegals(leg, state, myIdx);
            }
          } else {
            leg = orderLegals(leg, state, myIdx);
          }
        } else {
          leg = orderLegals(leg, state, myIdx);
        }
      } else {
        leg = orderLegals(leg, state, myIdx);
      }
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

    // W77 fl_trash3 hard FREE (A convert 20270774@1 MS=0)
    if (!cur) {
      var trash3Root = pickFlTrash3(hand, legals, state, myIdx);
      if (trash3Root) {
        return { play: trash3Root, stats: { mode: 'fl-trash3-hard', via: 'search-root' } };
      }
    }
    // W76 fl_lowopen hard FREE (2nd ply A convert 20260801@1 MS=0)
    if (!cur) {
      var lowopenRoot = pickFlLowOpen(hand, legals, state, myIdx);
      if (lowopenRoot) {
        return { play: lowopenRoot, stats: { mode: 'fl-lowopen-hard', via: 'search-root' } };
      }
    }
    // W75 fl_jpair hard FREE (search-root only; A convert 20280747@0 MS=0)
    if (!cur) {
      var jpairRoot = pickFlJPair(hand, legals, state, myIdx);
      if (jpairRoot) {
        return { play: jpairRoot, stats: { mode: 'fl-jpair-hard', via: 'search-root' } };
      }
    }
    // W71 fl_nineshed hard FREE
    if (!cur) {
      var nineshedRoot = pickFlNineShed(hand, legals, state, myIdx);
      if (nineshedRoot) {
        return { play: nineshedRoot, stats: { mode: 'fl-nineshed-hard', via: 'search-root' } };
      }
    }
    // W71 fl_seq4exact hard FREE
    if (!cur) {
      var seq4exactRoot = pickFlSeq4Exact(hand, legals, state, myIdx);
      if (seq4exactRoot) {
        return { play: seq4exactRoot, stats: { mode: 'fl-seq4exact-hard', via: 'search-root' } };
      }
    }
    // W69 fl_midshort hard FREE
    if (!cur) {
      var midshortRoot = pickFlMidShort(hand, legals, state, myIdx);
      if (midshortRoot) {
        return { play: midshortRoot, stats: { mode: 'fl-midshort-hard', via: 'search-root' } };
      }
    }
    // W68 fl_seq5exact hard FREE (before seqopen maxL)
    if (!cur) {
      var seq5exactRoot = pickFlSeq5Exact(hand, legals, state, myIdx);
      if (seq5exactRoot) {
        return { play: seq5exactRoot, stats: { mode: 'fl-seq5exact-hard', via: 'search-root' } };
      }
    }
    // W52 fl_seqopen hard FREE opening max-len
    if (!cur) {
      var seqopenRoot = pickFlSeqOpen(hand, legals, state, myIdx);
      if (seqopenRoot) {
        return { play: seqopenRoot, stats: { mode: 'fl-seqopen-hard', via: 'search-root' } };
      }
    }
    // W53 fl_pairseq3 hard
    if (!cur) {
      var pairseq3Root = pickFlPairSeq3(hand, legals, state, myIdx);
      if (pairseq3Root) {
        return { play: pairseq3Root, stats: { mode: 'fl-pairseq3-hard', via: 'search-root' } };
      }
    }
    // W36 flhidetight: FREE high-pair defer before exact-endgame
    if (!cur) {
      var hideRoot = pickFlHidefer(hand, legals, state, myIdx);
      if (hideRoot) {
        return { play: hideRoot, stats: { mode: 'flhidetight-hard', via: 'search-root' } };
      }
    }
    // W41 tripair hard before pairseq at search-root
    if (!cur) {
      var tripRoot = pickFlTriPair(hand, legals, state, myIdx);
      if (tripRoot) {
        return { play: tripRoot, stats: { mode: 'fl-tripair-hard', via: 'search-root' } };
      }
    }
    // W45 fl_twoshed hard: double-2 + low pair → single split
    if (!cur) {
      var twoshedRoot = pickFlTwoShed(hand, legals, state, myIdx);
      if (twoshedRoot) {
        return { play: twoshedRoot, stats: { mode: 'fl-twoshed-hard', via: 'search-root' } };
      }
    }
    // W58 fl_pair88 hard
    if (!cur) {
      var pair88Root = pickFlPair88(hand, legals, state, myIdx);
      if (pair88Root) {
        return { play: pair88Root, stats: { mode: 'fl-pair88-hard', via: 'search-root' } };
      }
    }
    // W44 fl_pairseq: low pair → residual 3-seq (search plays naked 33)
    if (!cur) {
      var pairseqRoot = pickFlPairSeq(hand, legals, state, myIdx);
      if (pairseqRoot) {
        return { play: pairseqRoot, stats: { mode: 'fl-pairseq-hard', via: 'search-root' } };
      }
    }
    // W59 fl_midshed hard FREE (pairshed root still deferred; this fingerprint is disjoint)
    if (!cur) {
      var midshedRoot = pickFlMidShed(hand, legals, state, myIdx);
      if (midshedRoot) {
        return { play: midshedRoot, stats: { mode: 'fl-midshed-hard', via: 'search-root' } };
      }
    }
    // W60 fl_egpair hard FREE
    if (!cur) {
      var egpairRoot = pickFlEgPair(hand, legals, state, myIdx);
      if (egpairRoot) {
        return { play: egpairRoot, stats: { mode: 'fl-egpair-hard', via: 'search-root' } };
      }
    }
    // W61 fl_pair5 hard FREE
    if (!cur) {
      var pair5Root = pickFlPair5(hand, legals, state, myIdx);
      if (pair5Root) {
        return { play: pair5Root, stats: { mode: 'fl-pair5-hard', via: 'search-root' } };
      }
    }
    // W63 fl_pair6 hard FREE
    if (!cur) {
      var pair6Root = pickFlPair6(hand, legals, state, myIdx);
      if (pair6Root) {
        return { play: pair6Root, stats: { mode: 'fl-pair6-hard', via: 'search-root' } };
      }
    }
    // W62 fl_quad4lead hard FREE
    if (!cur) {
      var quad4Root = pickFlQuad4Lead(hand, legals, state, myIdx);
      if (quad4Root) {
        return { play: quad4Root, stats: { mode: 'fl-quad4lead-hard', via: 'search-root' } };
      }
    }
    // W43 fl_lotesh ONLY (do NOT hoist pairshed to search-root — reverse 20460262 AA→3)
    if (!cur) {
      var loteshRoot = pickFlLotesh(hand, legals, state, myIdx);
      if (loteshRoot) {
        return { play: loteshRoot, stats: { mode: 'fl-lotesh-hard', via: 'search-root' } };
      }
    }
    // W47 com_sbc0 hard before exact-endgame (search/exact prefer mid sbc over unique loose 0)
    if (cur && cur.type === 'single') {
      var sbc0Root = pickComSbc0(hand, cur, legals, state, myIdx);
      if (sbc0Root) {
        return { play: sbc0Root, stats: { mode: 'com-sbc0-hard', via: 'search-root' } };
      }
    }
    // W76 com_acetrip hard (1st ply A convert 20260801@1 MS=0)
    if (cur && cur.type === 'single') {
      var aceTripRoot = pickComAceTrip(hand, cur, legals, state, myIdx);
      if (aceTripRoot) {
        return { play: aceTripRoot, stats: { mode: 'com-acetrip-hard', via: 'search-root' } };
      }
    }
    // W49 com_maxedge hard
    if (cur && cur.type === 'single') {
      var meRoot = pickComMaxEdge(hand, cur, legals, state, myIdx);
      if (meRoot) {
        return { play: meRoot, stats: { mode: 'com-maxedge-hard', via: 'search-root' } };
      }
    }
    // W50 com_egunder hard
    if (cur && cur.type === 'single') {
      var euRoot = pickComEgUnder(hand, cur, legals, state, myIdx);
      if (euRoot) {
        return { play: euRoot, stats: { mode: 'com-egunder-hard', via: 'search-root' } };
      }
    }
    // W64 com_acejunder hard
    if (cur && cur.type === 'single') {
      var ajuRoot = pickComAceJUnder(hand, cur, legals, state, myIdx);
      if (ajuRoot) {
        return { play: ajuRoot, stats: { mode: 'com-acejunder-hard', via: 'search-root' } };
      }
    }
    // W66 com_kpeel hard
    if (cur && cur.type === 'single') {
      var kpRoot = pickComKPeel(hand, cur, legals, state, myIdx);
      if (kpRoot) {
        return { play: kpRoot, stats: { mode: 'com-kpeel-hard', via: 'search-root' } };
      }
    }
    // W57 com_qpairclimb hard
    if (cur && cur.type === 'single') {
      var qpcRoot = pickComQPairClimb(hand, cur, legals, state, myIdx);
      if (qpcRoot) {
        return { play: qpcRoot, stats: { mode: 'com-qpairclimb-hard', via: 'search-root' } };
      }
    }
    // W51 seqhi_res hard before mulowg/exact (mulowg min would steal)
    if (cur && cur.type === 'seq') {
      var shrRoot = pickSeqHiRes(hand, cur, legals, state, myIdx);
      if (shrRoot) {
        return { play: shrRoot, stats: { mode: 'seqhi-res-hard', via: 'search-root' } };
      }
    }
    // W65 seqhi_res13 hard
    if (cur && cur.type === 'seq') {
      var shr13Root = pickSeqHiRes13(hand, cur, legals, state, myIdx);
      if (shr13Root) {
        return { play: shr13Root, stats: { mode: 'seqhi-res13-hard', via: 'search-root' } };
      }
    }
    // W54 seqadj hard
    if (cur && cur.type === 'seq') {
      var saRoot = pickSeqAdj(hand, cur, legals, state, myIdx);
      if (saRoot) {
        return { play: saRoot, stats: { mode: 'seqadj-hard', via: 'search-root' } };
      }
    }
    // W55 seq5adj hard
    if (cur && cur.type === 'seq') {
      var s5Root = pickSeq5Adj(hand, cur, legals, state, myIdx);
      if (s5Root) {
        return { play: s5Root, stats: { mode: 'seq5adj-hard', via: 'search-root' } };
      }
    }
    // W56 seqmidunder hard
    if (cur && cur.type === 'seq') {
      var smuRoot = pickSeqMidUnder(hand, cur, legals, state, myIdx);
      if (smuRoot) {
        return { play: smuRoot, stats: { mode: 'seqmidunder-hard', via: 'search-root' } };
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
        // W43 fl_lotesh: free-lead soft-root scores high singles; hard override dual-safe low shed
        var loteshRoot = pickFlLotesh(state.players[myIdx].hand, legals, state, myIdx);
        if (loteshRoot) flBest = loteshRoot;
        return {
          play: flBest,
          stats: {
            mode: 'free-lead-root',
            avg: flBestScore,
            top: flDetails.slice(0, 6),
            ms: Date.now() - flT0,
            perfectInfo: true,
            via: loteshRoot ? 'fl-lotesh-hard' : 'fl-soft-root-v2'
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
    pickFlHidefer: pickFlHidefer,
    pickFlTwoShed: pickFlTwoShed,
    pickFlPair88: pickFlPair88,
    pickFlPairSeq: pickFlPairSeq,
    pickFlLotesh: pickFlLotesh,
    flLoteshPool: flLoteshPool,
    pickFlPairShed: pickFlPairShed,
    pickFlMidShed: pickFlMidShed,
    pickFlEgPair: pickFlEgPair,
    pickFlPair5: pickFlPair5,
    pickFlPair6: pickFlPair6,
    pickFlQuad4Lead: pickFlQuad4Lead,
    flPairShedPool: flPairShedPool,
    pickFlTriPair: pickFlTriPair,
    flTriPairPool: flTriPairPool,
    pickFlBrSeq3: pickFlBrSeq3,
    flBrSeq3Pool: flBrSeq3Pool,
    pickComSbc0: pickComSbc0,
    pickComAceTrip: pickComAceTrip,
    pickFlLowOpen: pickFlLowOpen,
    pickFlTrash3: pickFlTrash3,
    pickComMaxEdge: pickComMaxEdge,
    pickComEgUnder: pickComEgUnder,
    pickComAceJUnder: pickComAceJUnder,
    pickComKPeel: pickComKPeel,
    pickComQPairClimb: pickComQPairClimb,
    pickSeqHiRes: pickSeqHiRes,
    pickSeqHiRes13: pickSeqHiRes13,
    pickSeqAdj: pickSeqAdj,
    pickSeq5Adj: pickSeq5Adj,
    pickSeqMidUnder: pickSeqMidUnder,
    pickFlSeqOpen: pickFlSeqOpen,
    pickFlSeq5Exact: pickFlSeq5Exact,
    pickFlMidShort: pickFlMidShort,
    pickFlSeq4Exact: pickFlSeq4Exact,
    pickFlJPair: pickFlJPair,
    pickFlLowOpen: pickFlLowOpen,
    pickFlNineShed: pickFlNineShed,
    pickFlPairSeq3: pickFlPairSeq3,
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
