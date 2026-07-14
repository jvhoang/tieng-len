#!/usr/bin/env node
/**
 * Read-only combat residual pattern census (human events).
 * Input: john_uploads/tienlen-playlogs-1784002833123.json
 * Focus: actor=human; patterns 1–3 require currentComboBefore non-null;
 *         pattern 4 is free-lead (currentComboBefore null).
 * Writes: evolve/_tmp_combat_residual_census.out
 */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');

const { detectCombo, cardToString, RANKS } = engine;

const LOG = path.join(__dirname, '../john_uploads/tienlen-playlogs-1784002833123.json');
const OUT = path.join(__dirname, '_tmp_combat_residual_census.out');

const lines = [];
function log() {
  const s = Array.prototype.slice.call(arguments).join(' ');
  lines.push(s);
  console.log(s);
}

function rankName(r) {
  return RANKS[r] != null ? RANKS[r] : String(r);
}

function cardsStr(cards) {
  if (!cards || !cards.length) return 'PASS';
  return cards.map(cardToString).join(' ');
}

function handStr(hand) {
  if (!hand) return '';
  return hand
    .slice()
    .sort(function (a, b) {
      return a.rank - b.rank || a.suit - b.suit;
    })
    .map(cardToString)
    .join(' ');
}

function byRankCounts(hand) {
  var m = {};
  for (var i = 0; i < hand.length; i++) {
    m[hand[i].rank] = (m[hand[i].rank] || 0) + 1;
  }
  return m;
}

function structureBreakCost(hand, play) {
  var byRank = byRankCounts(hand);
  var cost = 0;
  var playRanks = {};
  for (var j = 0; j < play.length; j++) {
    playRanks[play[j].rank] = (playRanks[play[j].rank] || 0) + 1;
  }
  var keys = Object.keys(playRanks);
  for (var k = 0; k < keys.length; k++) {
    var rk = +keys[k];
    var used = playRanks[rk];
    var left = (byRank[rk] || 0) - used;
    var had = byRank[rk] || 0;
    if (had >= 2 && left === 1 && used === 1) cost += 8;
    if (had === 2 && used === 1) cost += 5;
    if (had >= 3 && left > 0 && left < 3 && used < had) cost += 4;
    if (left === 0) {
      if (byRank[rk - 1] && byRank[rk + 1]) cost += 3;
      else if (byRank[rk - 1] || byRank[rk + 1]) cost += 1;
    }
  }
  if (play.length === 1 && (byRank[play[0].rank] || 0) >= 2) cost += 12;
  if (play.length === 1) {
    var pr0 = play[0].rank;
    var nbrL = byRank[pr0 - 1] || 0;
    var nbrR = byRank[pr0 + 1] || 0;
    if (nbrL && nbrR) cost += 10;
    else if (nbrL || nbrR) cost += 4;
  }
  return cost;
}

function isSinglePlay(cards) {
  return cards && cards.length === 1;
}

function legalSingles(legals) {
  var out = [];
  for (var i = 0; i < legals.length; i++) {
    if (legals[i] && legals[i].length === 1) out.push(legals[i]);
  }
  return out;
}

function comboType(cards) {
  var c = detectCombo(cards);
  return c ? c.type : null;
}

function comboTopRank(cards) {
  var c = detectCombo(cards);
  if (!c || !c.top) return null;
  return c.top.rank;
}

function curTypeOf(cur) {
  if (!cur) return 'free';
  return cur.type || 'unknown';
}

function curTopRank(cur) {
  if (!cur || !cur.top) return null;
  return cur.top.rank;
}

function handHasTwo(hand) {
  for (var i = 0; i < hand.length; i++) if (hand[i].rank === 12) return true;
  return false;
}

function handLenBucket(n) {
  if (n <= 4) return '1-4';
  if (n <= 7) return '5-7';
  if (n <= 10) return '8-10';
  return '11-13';
}

function inc(map, key, n) {
  n = n == null ? 1 : n;
  map[key] = (map[key] || 0) + n;
}

function sortKeys(map) {
  return Object.keys(map).sort(function (a, b) {
    return map[b] - map[a] || (a < b ? -1 : 1);
  });
}

function printTable(title, map, total) {
  log('\n### ' + title);
  log('| key | n | pct |');
  log('|-----|--:|----:|');
  var keys = sortKeys(map);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var n = map[k];
    var pct = total ? ((100 * n) / total).toFixed(1) : '';
    log('| ' + k + ' | ' + n + ' | ' + pct + '% |');
  }
  if (!keys.length) log('| (none) | 0 | |');
}

function pct(n, d) {
  if (!d) return 'n/a';
  return ((100 * n) / d).toFixed(1) + '%';
}

function main() {
  var raw = JSON.parse(fs.readFileSync(LOG, 'utf8'));
  var games = raw.games || [];
  log('Source:', LOG);
  log('games:', games.length, 'exportedAt:', raw.exportedAt);
  log('Scope: actor=human; P1–P3 combat (currentComboBefore non-null); P4 free-lead');

  // ---------- Pattern 1 ----------
  // Human plays single with lower structure-break than alternative singles
  // Approx: single from rank with hand count==1 preferred over count>=2
  var p1 = {
    combatSinglePlays: 0,
    situationsMultiSingleLegal: 0, // >=2 distinct single legals
    playedLowerSbc: 0,
    playedStrictMinSbc: 0,
    playedHigherSbcWhenAlt: 0,
    // count==1 preferred over count>=2 when both exist among legals
    bothLoneAndBreakLegal: 0,
    choseLone: 0, // count==1
    choseBreak: 0, // count>=2
    byHandLen: {},
    byCurType: {},
    byDeltaSbc: {}, // playedSbc - minAltSbc buckets when alt exists
    examplesLone: [],
    examplesBreak: [],
    examplesLowerSbc: [],
  };

  // ---------- Pattern 2 ----------
  // Human passes when pair/seq legal and hand has rank 12 (2s)
  var p2 = {
    combatWithTwoInHand: 0,
    combatPassWithTwo: 0,
    passWithPairLegalAndTwo: 0,
    passWithSeqLegalAndTwo: 0,
    passWithPairOrSeqLegalAndTwo: 0,
    playDespitePairOrSeqAndTwo: 0,
    // denominators for rates
    combatSituationsPairOrSeqLegalAndTwo: 0,
    combatPassAnyAndTwo: 0,
    byCurType: {},
    byHandLen: {},
    byLegalKinds: {}, // which of pair/seq present
    examples: [],
  };

  // ---------- Pattern 3 ----------
  // Human plays single rank>=10 when cheaper lower single exists
  var p3 = {
    combatSinglePlays: 0,
    highSinglePlays: 0, // played rank>=10 single
    highWhenLowerLegal: 0, // and a lower-rank single legal exists
    highWhenCheaperLowerExists: 0, // lower single with strictly lower sbc
    highWhenAnyLowerExists_minLowerRank: {},
    highVsCheaperDelta: {},
    // opposite: played low when high also legal
    lowWhenHighLegal: 0,
    byHandLen: {},
    byCurTop: {},
    examples: [],
  };

  // ---------- Pattern 4 ----------
  // Free-lead: human low pair top<=5 vs multi top>=8
  var p4 = {
    freeLeads: 0,
    pairLeads: 0,
    multiLeads: 0, // seq/triple/quad/doubleseq
    lowPairTopLe5: 0, // pair with top.rank <= 5 (3..8 ranks? rank 0=3 ... rank5=8)
    multiTopGe8: 0, // multi top.rank >= 8 (J+)
    // when both styles available from hand structure?
    handHasLowPairLe5: 0,
    handHasHighMultiGe8: 0,
    bothAvailable: 0,
    choseLowPairWhenBoth: 0,
    choseHighMultiWhenBoth: 0,
    choseOtherWhenBoth: 0,
    allLowPairByTop: {},
    allMultiByTop: {},
    byHandLen: {},
    examplesLowPair: [],
    examplesHighMulti: [],
    examplesBothChoice: [],
  };

  // Denominators
  var humanCombat = 0;
  var humanCombatPlay = 0;
  var humanCombatPass = 0;
  var humanFreeLead = 0;

  function handHasPairWithTopLe5(hand) {
    var br = byRankCounts(hand);
    for (var r = 0; r <= 5; r++) {
      if ((br[r] || 0) >= 2) return true;
    }
    return false;
  }

  function handHasMultiTopGe8(hand) {
    // Approximate: presence of a seq length>=3 whose top rank >= 8,
    // or triple/quad with rank >= 8, or doubleseq with top >= 8.
    // Build from cards using greedy detect on subsets is expensive;
    // use rank-set continuity for seq + triple/quad counts.
    var br = byRankCounts(hand);
    // triples/quads
    for (var r = 8; r <= 12; r++) {
      if ((br[r] || 0) >= 3) return true;
    }
    // singles sequences: need one card per consecutive rank, top >= 8, len >= 3
    // Find runs of ranks with count>=1 (2s often break seqs in Tiến lên — engine may exclude 2 from seq)
    // Use same ranks present (rank 0-11 typically for seq)
    var present = [];
    for (r = 0; r <= 11; r++) if ((br[r] || 0) >= 1) present.push(r);
    var runStart = 0;
    for (var i = 1; i <= present.length; i++) {
      if (i === present.length || present[i] !== present[i - 1] + 1) {
        var len = i - runStart;
        if (len >= 3) {
          var top = present[i - 1];
          if (top >= 8) return true;
        }
        runStart = i;
      }
    }
    // doubleseq: consecutive ranks with count>=2, len pairs >= 3, top >= 8
    var dPresent = [];
    for (r = 0; r <= 11; r++) if ((br[r] || 0) >= 2) dPresent.push(r);
    runStart = 0;
    for (i = 1; i <= dPresent.length; i++) {
      if (i === dPresent.length || dPresent[i] !== dPresent[i - 1] + 1) {
        len = i - runStart;
        if (len >= 3) {
          top = dPresent[i - 1];
          if (top >= 8) return true;
        }
        runStart = i;
      }
    }
    return false;
  }

  for (var gi = 0; gi < games.length; gi++) {
    var g = games[gi];
    var seed = g.seed;
    var events = g.events || [];
    for (var ei = 0; ei < events.length; ei++) {
      var e = events[ei];
      if (e.actor !== 'human') continue;
      if (e.type !== 'play' && e.type !== 'pass') continue;

      var hand = e.handBefore || [];
      var handLen = hand.length;
      var cur = e.currentComboBefore || null;
      var legals = e.legals || [];
      var isCombat = !!cur;
      var isFL = !cur;
      var br = byRankCounts(hand);

      // ===== Pattern 4 free-lead =====
      if (isFL && e.type === 'play' && e.cards && e.cards.length) {
        humanFreeLead++;
        p4.freeLeads++;
        var com = e.combo || detectCombo(e.cards);
        var type = com ? com.type : comboType(e.cards);
        var topR = com && com.top ? com.top.rank : comboTopRank(e.cards);
        var hasLP = handHasPairWithTopLe5(hand);
        var hasHM = handHasMultiTopGe8(hand);
        if (hasLP) p4.handHasLowPairLe5++;
        if (hasHM) p4.handHasHighMultiGe8++;

        var isPair = type === 'pair';
        var isMulti =
          type === 'seq' || type === 'triple' || type === 'quad' || type === 'doubleseq';

        if (isPair) {
          p4.pairLeads++;
          inc(p4.allLowPairByTop, 'top=' + rankName(topR));
          if (topR != null && topR <= 5) {
            p4.lowPairTopLe5++;
            if (p4.examplesLowPair.length < 12) {
              p4.examplesLowPair.push({
                seed: seed,
                handLen: handLen,
                cards: cardsStr(e.cards),
                hand: handStr(hand),
                top: rankName(topR),
              });
            }
          }
        }
        if (isMulti) {
          p4.multiLeads++;
          inc(p4.allMultiByTop, 'top=' + rankName(topR) + ' type=' + type);
          if (topR != null && topR >= 8) {
            p4.multiTopGe8++;
            if (p4.examplesHighMulti.length < 12) {
              p4.examplesHighMulti.push({
                seed: seed,
                handLen: handLen,
                cards: cardsStr(e.cards),
                hand: handStr(hand),
                top: rankName(topR),
                type: type,
              });
            }
          }
        }

        if (hasLP && hasHM) {
          p4.bothAvailable++;
          inc(p4.byHandLen, handLenBucket(handLen));
          var choice;
          if (isPair && topR != null && topR <= 5) {
            p4.choseLowPairWhenBoth++;
            choice = 'low_pair_top<=5';
          } else if (isMulti && topR != null && topR >= 8) {
            p4.choseHighMultiWhenBoth++;
            choice = 'multi_top>=8';
          } else {
            p4.choseOtherWhenBoth++;
            choice = 'other:' + (type || '?') + (topR != null ? ' top=' + rankName(topR) : '');
          }
          if (p4.examplesBothChoice.length < 20) {
            p4.examplesBothChoice.push({
              seed: seed,
              handLen: handLen,
              cards: cardsStr(e.cards),
              hand: handStr(hand),
              choice: choice,
            });
          }
        }
      }

      if (!isCombat) continue;

      humanCombat++;
      if (e.type === 'pass') humanCombatPass++;
      else humanCombatPlay++;

      // ===== Pattern 2: pass when pair/seq legal + hand has 2s =====
      var hasTwo = handHasTwo(hand);
      if (hasTwo) {
        p2.combatWithTwoInHand++;
        var pairLegal = false;
        var seqLegal = false;
        for (var li = 0; li < legals.length; li++) {
          var lt = comboType(legals[li]);
          if (lt === 'pair') pairLegal = true;
          if (lt === 'seq') seqLegal = true;
        }
        var pairOrSeq = pairLegal || seqLegal;
        if (pairOrSeq) p2.combatSituationsPairOrSeqLegalAndTwo++;

        if (e.type === 'pass') {
          p2.combatPassWithTwo++;
          p2.combatPassAnyAndTwo++;
          if (pairLegal) p2.passWithPairLegalAndTwo++;
          if (seqLegal) p2.passWithSeqLegalAndTwo++;
          if (pairOrSeq) {
            p2.passWithPairOrSeqLegalAndTwo++;
            var kinds =
              (pairLegal ? 'pair' : '') + (pairLegal && seqLegal ? '+' : '') + (seqLegal ? 'seq' : '');
            inc(p2.byCurType, curTypeOf(cur));
            inc(p2.byHandLen, handLenBucket(handLen));
            inc(p2.byLegalKinds, kinds || 'none');
            if (p2.examples.length < 20) {
              var sampleLegals = legals.slice(0, 6).map(function (p) {
                return cardsStr(p) + '/' + (comboType(p) || '?');
              });
              p2.examples.push({
                seed: seed,
                handLen: handLen,
                cards: 'PASS',
                hand: handStr(hand),
                curType: curTypeOf(cur),
                curTop: rankName(curTopRank(cur)),
                kinds: kinds,
                legals: sampleLegals.join(' | '),
              });
            }
          }
        } else if (pairOrSeq && e.type === 'play') {
          p2.playDespitePairOrSeqAndTwo++;
        }
      }

      // ===== Pattern 1 & 3: combat single plays =====
      if (e.type !== 'play' || !isSinglePlay(e.cards)) continue;

      p1.combatSinglePlays++;
      p3.combatSinglePlays++;

      var singles = legalSingles(legals);
      // Ensure played is among consideration
      var played = e.cards;
      var playedRank = played[0].rank;
      var playedCount = br[playedRank] || 0;
      var playedSbc = structureBreakCost(hand, played);

      // alt singles: other single legals (by rank/suit identity)
      var alts = [];
      for (var si = 0; si < singles.length; si++) {
        var s = singles[si];
        if (s[0].rank === played[0].rank && s[0].suit === played[0].suit) continue;
        alts.push(s);
      }

      if (singles.length >= 2) {
        p1.situationsMultiSingleLegal++;
        var minSbc = playedSbc;
        var minAlt = Infinity;
        for (si = 0; si < alts.length; si++) {
          var sc = structureBreakCost(hand, alts[si]);
          if (sc < minAlt) minAlt = sc;
          if (sc < minSbc) minSbc = sc;
        }
        // also include played in global min
        var globalMin = Math.min(playedSbc, minAlt === Infinity ? playedSbc : minAlt);
        if (playedSbc === globalMin) p1.playedStrictMinSbc++;
        if (alts.length && playedSbc < minAlt) {
          p1.playedLowerSbc++;
          var delta = playedSbc - minAlt; // negative
          var db =
            delta <= -12 ? '<=-12' : delta <= -8 ? '-11..-8' : delta <= -4 ? '-7..-4' : delta < 0 ? '-3..-1' : '0';
          inc(p1.byDeltaSbc, 'played_vs_minAlt=' + db);
          inc(p1.byHandLen, handLenBucket(handLen));
          inc(p1.byCurType, curTypeOf(cur));
          if (p1.examplesLowerSbc.length < 15) {
            var altSample = alts
              .slice()
              .sort(function (a, b) {
                return structureBreakCost(hand, a) - structureBreakCost(hand, b);
              })
              .slice(0, 4)
              .map(function (p) {
                return (
                  cardsStr(p) +
                  ' sbc=' +
                  structureBreakCost(hand, p) +
                  ' cnt=' +
                  (br[p[0].rank] || 0)
                );
              });
            p1.examplesLowerSbc.push({
              seed: seed,
              handLen: handLen,
              cards: cardsStr(played),
              hand: handStr(hand),
              playedSbc: playedSbc,
              minAlt: minAlt,
              cnt: playedCount,
              curType: curTypeOf(cur),
              curTop: rankName(curTopRank(cur)),
              alts: altSample.join(' | '),
            });
          }
        } else if (alts.length && playedSbc > minAlt) {
          p1.playedHigherSbcWhenAlt++;
          inc(p1.byDeltaSbc, 'played_vs_minAlt=' + (playedSbc - minAlt >= 12 ? '>=+12' : playedSbc - minAlt >= 8 ? '+8..+11' : playedSbc - minAlt >= 4 ? '+4..+7' : '+1..+3'));
        } else if (alts.length) {
          inc(p1.byDeltaSbc, 'played_vs_minAlt=0');
        }

        // lone (count==1) vs break (count>=2) among single legals
        var anyLone = false;
        var anyBreak = false;
        for (si = 0; si < singles.length; si++) {
          var cnt = br[singles[si][0].rank] || 0;
          if (cnt === 1) anyLone = true;
          if (cnt >= 2) anyBreak = true;
        }
        if (anyLone && anyBreak) {
          p1.bothLoneAndBreakLegal++;
          if (playedCount === 1) {
            p1.choseLone++;
            if (p1.examplesLone.length < 12) {
              p1.examplesLone.push({
                seed: seed,
                handLen: handLen,
                cards: cardsStr(played),
                hand: handStr(hand),
                playedSbc: playedSbc,
                cnt: playedCount,
                curType: curTypeOf(cur),
                curTop: rankName(curTopRank(cur)),
                alts: alts
                  .slice(0, 5)
                  .map(function (p) {
                    return cardsStr(p) + ' cnt=' + (br[p[0].rank] || 0) + ' sbc=' + structureBreakCost(hand, p);
                  })
                  .join(' | '),
              });
            }
          } else if (playedCount >= 2) {
            p1.choseBreak++;
            if (p1.examplesBreak.length < 8) {
              p1.examplesBreak.push({
                seed: seed,
                handLen: handLen,
                cards: cardsStr(played),
                hand: handStr(hand),
                playedSbc: playedSbc,
                cnt: playedCount,
                curType: curTypeOf(cur),
                curTop: rankName(curTopRank(cur)),
              });
            }
          }
        }
      }

      // ===== Pattern 3 =====
      var high = playedRank >= 10; // J,Q,K,A,2 = 10..12? rank 10=A? RANKS: 0=3 ... 9=Q? Wait
      // RANKS = ['3','4','5','6','7','8','9','10','J','Q','K','A','2']
      // index: 0=3, 7=10, 8=J, 9=Q, 10=K, 11=A, 12=2
      // "rank>=10" means K, A, 2 (indices 10,11,12) — OR user might mean face cards 10+ as card name
      // User said "single rank>=10" — in this codebase rank is 0-indexed so rank>=10 = K/A/2.
      // But colloquially "rank 10+" often means the card 10 and up (index>=7).
      // Gold notes talk about high singles K/A/2 and also 10/J/Q. I'll use rank index >= 7 (card 10+)
      // AND also report rank index >= 10 (K+) as a sub-breakdown.
      // Re-read: "Human plays single rank>=10 when cheaper lower single exists"
      // In engine, ranks are numeric indices. Card "10" has rank 7. So "rank>=10" as code means K+.
      // I'll implement code rank >= 10 (K/A/2) as primary per literal, and also report face (rank>=7) as secondary table.

      if (playedRank >= 10) {
        p3.highSinglePlays++;
        var lowerLegals = [];
        var cheaperLower = [];
        for (si = 0; si < singles.length; si++) {
          if (singles[si][0].rank < playedRank) {
            lowerLegals.push(singles[si]);
            var ls = structureBreakCost(hand, singles[si]);
            if (ls < playedSbc) cheaperLower.push(singles[si]);
          }
        }
        if (lowerLegals.length) {
          p3.highWhenLowerLegal++;
          var minLower = Infinity;
          for (si = 0; si < lowerLegals.length; si++) {
            if (lowerLegals[si][0].rank < minLower) minLower = lowerLegals[si][0].rank;
          }
          inc(p3.highWhenAnyLowerExists_minLowerRank, 'minLower=' + rankName(minLower));
        }
        if (cheaperLower.length) {
          p3.highWhenCheaperLowerExists++;
          inc(p3.byHandLen, handLenBucket(handLen));
          inc(p3.byCurTop, 'faceTop=' + rankName(curTopRank(cur)));
          var minCheap = Infinity;
          for (si = 0; si < cheaperLower.length; si++) {
            var csc = structureBreakCost(hand, cheaperLower[si]);
            if (csc < minCheap) minCheap = csc;
          }
          var d3 = playedSbc - minCheap;
          inc(p3.highVsCheaperDelta, 'sbcDelta=+' + (d3 >= 12 ? '12+' : d3 >= 8 ? '8-11' : d3 >= 4 ? '4-7' : '1-3'));
          if (p3.examples.length < 15) {
            p3.examples.push({
              seed: seed,
              handLen: handLen,
              cards: cardsStr(played),
              hand: handStr(hand),
              playedSbc: playedSbc,
              curType: curTypeOf(cur),
              curTop: rankName(curTopRank(cur)),
              cheaper: cheaperLower
                .slice(0, 5)
                .map(function (p) {
                  return cardsStr(p) + ' sbc=' + structureBreakCost(hand, p);
                })
                .join(' | '),
            });
          }
        }
      } else {
        // low single played when high single also legal
        var anyHigh = false;
        for (si = 0; si < singles.length; si++) {
          if (singles[si][0].rank >= 10) {
            anyHigh = true;
            break;
          }
        }
        if (anyHigh) p3.lowWhenHighLegal++;
      }
    }
  }

  // Also secondary face-high (>= card 10, rank index >= 7)
  var p3b = {
    highFacePlays: 0,
    highWhenCheaperLower: 0,
    examples: [],
  };
  // re-scan lightweight for face threshold
  for (gi = 0; gi < games.length; gi++) {
    g = games[gi];
    seed = g.seed;
    events = g.events || [];
    for (ei = 0; ei < events.length; ei++) {
      e = events[ei];
      if (e.actor !== 'human' || e.type !== 'play') continue;
      if (!e.currentComboBefore) continue;
      if (!isSinglePlay(e.cards)) continue;
      hand = e.handBefore || [];
      br = byRankCounts(hand);
      singles = legalSingles(e.legals || []);
      played = e.cards;
      playedRank = played[0].rank;
      playedSbc = structureBreakCost(hand, played);
      if (playedRank < 7) continue; // card 10+
      p3b.highFacePlays++;
      cheaperLower = [];
      for (si = 0; si < singles.length; si++) {
        if (singles[si][0].rank < playedRank) {
          ls = structureBreakCost(hand, singles[si]);
          if (ls < playedSbc) cheaperLower.push(singles[si]);
        }
      }
      if (cheaperLower.length) {
        p3b.highWhenCheaperLower++;
        if (p3b.examples.length < 8) {
          p3b.examples.push({
            seed: seed,
            handLen: hand.length,
            cards: cardsStr(played),
            hand: handStr(hand),
            playedSbc: playedSbc,
            cheaper: cheaperLower
              .slice(0, 4)
              .map(function (p) {
                return cardsStr(p) + ' sbc=' + structureBreakCost(hand, p);
              })
              .join(' | '),
          });
        }
      }
    }
  }

  // ========== REPORT ==========
  log('\n========== BASE RATES ==========');
  log('human combat decisions:', humanCombat, '(play', humanCombatPlay + ', pass', humanCombatPass + ')');
  log('human free-lead plays:', humanFreeLead);

  log('\n========== P1: lower structure-break single / prefer lone (count==1) over break ==========');
  log('combat single plays:', p1.combatSinglePlays);
  log('combat single with >=2 single legals:', p1.situationsMultiSingleLegal);
  log('played strict min SBC among singles:', p1.playedStrictMinSbc, pct(p1.playedStrictMinSbc, p1.situationsMultiSingleLegal));
  log('played SBC < min alt SBC:', p1.playedLowerSbc, pct(p1.playedLowerSbc, p1.situationsMultiSingleLegal));
  log('played SBC > min alt SBC:', p1.playedHigherSbcWhenAlt, pct(p1.playedHigherSbcWhenAlt, p1.situationsMultiSingleLegal));
  log('both lone(count==1) AND break(count>=2) single legals:', p1.bothLoneAndBreakLegal);
  log('  chose lone (count==1):', p1.choseLone, pct(p1.choseLone, p1.bothLoneAndBreakLegal));
  log('  chose break (count>=2):', p1.choseBreak, pct(p1.choseBreak, p1.bothLoneAndBreakLegal));
  printTable('P1a played vs minAlt SBC delta (multi-single situations with alts)', p1.byDeltaSbc, p1.situationsMultiSingleLegal);
  printTable('P1b lower-Sbc choice by handLen', p1.byHandLen, p1.playedLowerSbc);
  printTable('P1c lower-Sbc choice by cur.type', p1.byCurType, p1.playedLowerSbc);

  log('\n### P1 examples: chose LONE single when break also legal');
  p1.examplesLone.slice(0, 5).forEach(function (ex, i) {
    log(
      i +
        1 +
        ') seed=' +
        ex.seed +
        ' handLen=' +
        ex.handLen +
        ' cards=' +
        ex.cards +
        ' cnt=' +
        ex.cnt +
        ' sbc=' +
        ex.playedSbc +
        ' cur=' +
        ex.curType +
        '/' +
        ex.curTop
    );
    log('   hand: ' + ex.hand);
    log('   alts: ' + ex.alts);
  });

  log('\n### P1 examples: played LOWER sbc than alt singles');
  p1.examplesLowerSbc.slice(0, 5).forEach(function (ex, i) {
    log(
      i +
        1 +
        ') seed=' +
        ex.seed +
        ' handLen=' +
        ex.handLen +
        ' cards=' +
        ex.cards +
        ' sbc=' +
        ex.playedSbc +
        ' minAlt=' +
        ex.minAlt +
        ' cnt=' +
        ex.cnt
    );
    log('   hand: ' + ex.hand);
    log('   alts: ' + ex.alts);
  });

  log('\n========== P2: PASS when pair/seq legal and hand has 2 (rank 12) ==========');
  log('combat with 2 in hand:', p2.combatWithTwoInHand);
  log('combat pass with 2 in hand:', p2.combatPassWithTwo, pct(p2.combatPassWithTwo, p2.combatWithTwoInHand));
  log('combat situations: pair|seq legal AND 2 in hand:', p2.combatSituationsPairOrSeqLegalAndTwo);
  log('  of those, PASS:', p2.passWithPairOrSeqLegalAndTwo, pct(p2.passWithPairOrSeqLegalAndTwo, p2.combatSituationsPairOrSeqLegalAndTwo));
  log('  of those, PLAY:', p2.playDespitePairOrSeqAndTwo, pct(p2.playDespitePairOrSeqAndTwo, p2.combatSituationsPairOrSeqLegalAndTwo));
  log('pass + pair legal + 2:', p2.passWithPairLegalAndTwo);
  log('pass + seq legal + 2:', p2.passWithSeqLegalAndTwo);
  printTable('P2a pass+pair|seq+2 by cur.type', p2.byCurType, p2.passWithPairOrSeqLegalAndTwo);
  printTable('P2b pass+pair|seq+2 by handLen', p2.byHandLen, p2.passWithPairOrSeqLegalAndTwo);
  printTable('P2c pass+pair|seq+2 by legal kinds', p2.byLegalKinds, p2.passWithPairOrSeqLegalAndTwo);

  log('\n### P2 examples: PASS with pair/seq legal and 2 in hand');
  p2.examples.slice(0, 5).forEach(function (ex, i) {
    log(
      i +
        1 +
        ') seed=' +
        ex.seed +
        ' handLen=' +
        ex.handLen +
        ' cards=PASS cur=' +
        ex.curType +
        '/' +
        ex.curTop +
        ' kinds=' +
        ex.kinds
    );
    log('   hand: ' + ex.hand);
    log('   legals: ' + ex.legals);
  });

  log('\n========== P3: play single rank>=10 (K/A/2) when cheaper lower single exists ==========');
  log('combat single plays:', p3.combatSinglePlays);
  log('high single plays (rank idx >=10 → K/A/2):', p3.highSinglePlays, pct(p3.highSinglePlays, p3.combatSinglePlays));
  log('  of high: lower-rank single also legal:', p3.highWhenLowerLegal, pct(p3.highWhenLowerLegal, p3.highSinglePlays));
  log('  of high: cheaper (lower sbc) lower single exists:', p3.highWhenCheaperLowerExists, pct(p3.highWhenCheaperLowerExists, p3.highSinglePlays));
  log('low single when high also legal:', p3.lowWhenHighLegal);
  printTable('P3a high+cheaperLower by handLen', p3.byHandLen, p3.highWhenCheaperLowerExists);
  printTable('P3b high+cheaperLower by curTop', p3.byCurTop, p3.highWhenCheaperLowerExists);
  printTable('P3c high when any lower legal — min lower rank', p3.highWhenAnyLowerExists_minLowerRank, p3.highWhenLowerLegal);
  printTable('P3d sbc delta high vs cheaper lower', p3.highVsCheaperDelta, p3.highWhenCheaperLowerExists);

  log('\n### P3 examples: high single (K/A/2) with cheaper lower single available');
  p3.examples.slice(0, 5).forEach(function (ex, i) {
    log(
      i +
        1 +
        ') seed=' +
        ex.seed +
        ' handLen=' +
        ex.handLen +
        ' cards=' +
        ex.cards +
        ' sbc=' +
        ex.playedSbc +
        ' cur=' +
        ex.curType +
        '/' +
        ex.curTop
    );
    log('   hand: ' + ex.hand);
    log('   cheaperLower: ' + ex.cheaper);
  });

  log('\n--- P3 secondary: face high (card 10+, rank idx >=7) ---');
  log('face-high single plays:', p3b.highFacePlays);
  log('face-high with cheaper lower single:', p3b.highWhenCheaperLower, pct(p3b.highWhenCheaperLower, p3b.highFacePlays));
  p3b.examples.slice(0, 3).forEach(function (ex, i) {
    log(
      i +
        1 +
        ') seed=' +
        ex.seed +
        ' handLen=' +
        ex.handLen +
        ' cards=' +
        ex.cards +
        ' sbc=' +
        ex.playedSbc
    );
    log('   hand: ' + ex.hand);
    log('   cheaper: ' + ex.cheaper);
  });

  log('\n========== P4: free-lead low pair top<=5 vs multi top>=8 ==========');
  log('free-lead plays:', p4.freeLeads);
  log('pair leads:', p4.pairLeads, pct(p4.pairLeads, p4.freeLeads));
  log('  of which low pair top<=5 (ranks 3–8):', p4.lowPairTopLe5, pct(p4.lowPairTopLe5, p4.pairLeads));
  log('multi leads (seq/triple/quad/doubleseq):', p4.multiLeads, pct(p4.multiLeads, p4.freeLeads));
  log('  of which multi top>=8 (J+):', p4.multiTopGe8, pct(p4.multiTopGe8, p4.multiLeads));
  log('FL hands with low-pair structure (top<=5):', p4.handHasLowPairLe5);
  log('FL hands with high-multi structure (top>=8):', p4.handHasHighMultiGe8);
  log('FL both structures available:', p4.bothAvailable);
  log('  chose low pair top<=5:', p4.choseLowPairWhenBoth, pct(p4.choseLowPairWhenBoth, p4.bothAvailable));
  log('  chose multi top>=8:', p4.choseHighMultiWhenBoth, pct(p4.choseHighMultiWhenBoth, p4.bothAvailable));
  log('  chose other:', p4.choseOtherWhenBoth, pct(p4.choseOtherWhenBoth, p4.bothAvailable));
  printTable('P4a low-pair leads by top (all pairs)', p4.allLowPairByTop, p4.pairLeads);
  printTable('P4b multi leads by top+type', p4.allMultiByTop, p4.multiLeads);
  printTable('P4c both-available by handLen', p4.byHandLen, p4.bothAvailable);

  log('\n### P4 examples: low pair top<=5 free-lead');
  p4.examplesLowPair.slice(0, 5).forEach(function (ex, i) {
    log(i + 1 + ') seed=' + ex.seed + ' handLen=' + ex.handLen + ' cards=' + ex.cards + ' top=' + ex.top);
    log('   hand: ' + ex.hand);
  });

  log('\n### P4 examples: multi top>=8 free-lead');
  p4.examplesHighMulti.slice(0, 5).forEach(function (ex, i) {
    log(
      i +
        1 +
        ') seed=' +
        ex.seed +
        ' handLen=' +
        ex.handLen +
        ' cards=' +
        ex.cards +
        ' type=' +
        ex.type +
        ' top=' +
        ex.top
    );
    log('   hand: ' + ex.hand);
  });

  log('\n### P4 examples: both low-pair & high-multi structure available');
  p4.examplesBothChoice.slice(0, 8).forEach(function (ex, i) {
    log(i + 1 + ') seed=' + ex.seed + ' handLen=' + ex.handLen + ' choice=' + ex.choice + ' cards=' + ex.cards);
    log('   hand: ' + ex.hand);
  });

  // Condensed 5 concrete examples overall (mix of strongest residual signals)
  log('\n========== 5 CONCRETE RESIDUAL EXAMPLES (mixed) ==========');
  var mixed = [];
  p1.examplesLone.slice(0, 2).forEach(function (ex) {
    mixed.push({
      pattern: 'P1_lone_over_break',
      seed: ex.seed,
      handLen: ex.handLen,
      cards: ex.cards,
      hand: ex.hand,
      note: 'cnt=1 sbc=' + ex.playedSbc + ' cur=' + ex.curType + '/' + ex.curTop,
    });
  });
  p2.examples.slice(0, 2).forEach(function (ex) {
    mixed.push({
      pattern: 'P2_pass_pairseq_with_2',
      seed: ex.seed,
      handLen: ex.handLen,
      cards: 'PASS',
      hand: ex.hand,
      note: 'cur=' + ex.curType + '/' + ex.curTop + ' kinds=' + ex.kinds,
    });
  });
  p3.examples.slice(0, 1).forEach(function (ex) {
    mixed.push({
      pattern: 'P3_high_when_cheaper_lower',
      seed: ex.seed,
      handLen: ex.handLen,
      cards: ex.cards,
      hand: ex.hand,
      note: 'sbc=' + ex.playedSbc + ' cheaper=[' + ex.cheaper + ']',
    });
  });
  // fill with P4 if needed
  var i;
  for (i = 0; mixed.length < 5 && i < p4.examplesBothChoice.length; i++) {
    var ex4 = p4.examplesBothChoice[i];
    mixed.push({
      pattern: 'P4_FL_both_struct',
      seed: ex4.seed,
      handLen: ex4.handLen,
      cards: ex4.cards,
      hand: ex4.hand,
      note: ex4.choice,
    });
  }
  mixed.slice(0, 5).forEach(function (ex, idx) {
    log(
      idx +
        1 +
        ') [' +
        ex.pattern +
        '] seed=' +
        ex.seed +
        ' handLen=' +
        ex.handLen +
        ' cards=' +
        ex.cards
    );
    log('   hand: ' + ex.hand);
    log('   note: ' + ex.note);
  });

  fs.writeFileSync(OUT, lines.join('\n') + '\n');
  log('\nWrote', OUT);
}

main();
