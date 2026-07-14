#!/usr/bin/env node
/**
 * Read-only human pattern census for gold pass/trash themes.
 * Input: john_uploads/tienlen-playlogs-1784002833123.json
 * Writes: evolve/_tmp_human_gold_patterns.out
 */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');

const { detectCombo, cardToString, RANKS } = engine;

const LOG = path.join(__dirname, '../john_uploads/tienlen-playlogs-1784002833123.json');
const OUT = path.join(__dirname, '_tmp_human_gold_patterns.out');

const lines = [];
function log() {
  const s = Array.prototype.slice.call(arguments).join(' ');
  lines.push(s);
  console.log(s);
}

function structureBreakCost(hand, play) {
  var byRank = {};
  for (var i = 0; i < hand.length; i++) {
    byRank[hand[i].rank] = (byRank[hand[i].rank] || 0) + 1;
  }
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
  for (i = 0; i < hand.length; i++) {
    var c = hand[i];
    if (byRank[c.rank] === 1 && !inSeq[c.rank] && c.rank <= 9) trash.push(c);
  }
  trash.sort(function (a, b) { return a.rank - b.rank || a.suit - b.suit; });
  var lowPairs = [];
  for (r = 0; r <= 9; r++) {
    if ((byRank[r] || 0) >= 2) lowPairs.push(r);
  }
  return { byRank: byRank, trash: trash, trashCount: trash.length, lowPairs: lowPairs, hasLowPair: lowPairs.length > 0 };
}

function playHasTwo(play) {
  if (!play) return false;
  for (var i = 0; i < play.length; i++) if (play[i].rank === 12) return true;
  return false;
}

function playIsBomb(play) {
  var com = detectCombo(play);
  if (!com) return false;
  return com.type === 'quad' || (com.type === 'doubleseq' && com.numPairs >= 3);
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

function isPairBreakApprox(hand, play) {
  if (!play || play.length !== 1) return false;
  var byRank = {};
  for (var i = 0; i < hand.length; i++) {
    byRank[hand[i].rank] = (byRank[hand[i].rank] || 0) + 1;
  }
  return (byRank[play[0].rank] || 0) >= 2;
}

function handLenBucket(n) {
  if (n <= 4) return '1-4';
  if (n <= 7) return '5-7';
  if (n <= 10) return '8-10';
  return '11-13';
}

function sbcBucket(c) {
  if (c === 0) return '0';
  if (c <= 4) return '1-4';
  if (c <= 8) return '5-8';
  if (c <= 15) return '9-15';
  return '16+';
}

function cardsStr(cards) {
  if (!cards || !cards.length) return 'PASS';
  return cards.map(cardToString).join(' ');
}

function rankName(r) {
  return RANKS[r] != null ? RANKS[r] : String(r);
}

function curTypeOf(cur) {
  if (!cur) return 'free';
  return cur.type || 'unknown';
}

function curTopOf(cur) {
  if (!cur || !cur.top) return null;
  return cur.top.rank;
}

function minSbcAmong(hand, plays) {
  var min = Infinity;
  var best = null;
  for (var i = 0; i < plays.length; i++) {
    var c = structureBreakCost(hand, plays[i]);
    if (c < min) { min = c; best = plays[i]; }
  }
  return { min: min === Infinity ? null : min, play: best };
}

function isPairBreakApproxStats(hand, plays) {
  var anyNonBreak = false, anyBreak = false;
  for (var i = 0; i < plays.length; i++) {
    if (isPairBreakApprox(hand, plays[i])) anyBreak = true;
    else anyNonBreak = true;
  }
  return { anyNonBreak: anyNonBreak, anyBreak: anyBreak, allBreak: anyBreak && !anyNonBreak };
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
}

function main() {
  var raw = JSON.parse(fs.readFileSync(LOG, 'utf8'));
  var games = raw.games || [];
  log('games:', games.length, 'exportedAt:', raw.exportedAt);

  var humanPassTotal = 0;
  var humanPassWithLegal = 0;
  var humanPassWithCheap = 0;
  var passByCurType = {};
  var passByHandLen = {};
  var passByMinSbc = {};
  var passByCurTypeHand = {};
  var passByPairBreak = {};
  var passByCurTop = {};
  var passExamples = [];
  var cross = {};

  var flTotal = 0;
  var flByClass = {};
  var flWhenBoth = 0;
  var flWhenBothByChoice = {};
  var flExamples = [];

  var twoPlays = 0;
  var twoByCurTop = {};
  var twoByCurType = {};
  var twoByHandLen = {};
  var twoFreeLead = 0;
  var twoExamples = [];

  var combatDecisions = 0;
  var combatPass = 0;
  var combatPlayWithCheap = 0;
  var pbStats = { cheapestIsPairBreak: 0, hasAnyNonPB: 0, allPB: 0, hasSbc0: 0 };

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
      var isFL = !cur;

      if (e.type === 'play' && e.cards && playHasTwo(e.cards)) {
        twoPlays++;
        var ct = curTopOf(cur);
        var ctKey = isFL ? 'FREE' : rankName(ct);
        inc(twoByCurTop, ctKey);
        inc(twoByCurType, isFL ? 'free' : curTypeOf(cur));
        inc(twoByHandLen, handLenBucket(handLen));
        if (isFL) twoFreeLead++;
        if (twoExamples.length < 15) {
          twoExamples.push({
            seed: seed, handLen: handLen,
            curType: isFL ? 'free' : curTypeOf(cur),
            curTop: ctKey, cards: cardsStr(e.cards),
            combo: e.combo ? e.combo.type : (detectCombo(e.cards) && detectCombo(e.cards).type)
          });
        }
      }

      if (e.type === 'play' && isFL) {
        flTotal++;
        var com = e.combo || detectCombo(e.cards);
        var info = analyzeHand(hand);
        var cls;
        if (com && com.type === 'pair') cls = 'pair';
        else if (com && (com.type === 'seq' || com.type === 'triple' || com.type === 'quad' || com.type === 'doubleseq'))
          cls = 'multi';
        else if (com && com.type === 'single') {
          var isTrash = false;
          if (e.cards && e.cards.length === 1) {
            for (var ti = 0; ti < info.trash.length; ti++) {
              if (info.trash[ti].rank === e.cards[0].rank && info.trash[ti].suit === e.cards[0].suit) {
                isTrash = true; break;
              }
            }
          }
          cls = isTrash ? 'trash_single' : 'other_single';
        } else cls = 'other';
        inc(flByClass, cls);

        if (info.trashCount > 0 && info.hasLowPair) {
          flWhenBoth++;
          inc(flWhenBothByChoice, cls);
          if (flExamples.length < 20) {
            flExamples.push({
              seed: seed, handLen: handLen, choice: cls, cards: cardsStr(e.cards),
              trashCount: info.trashCount,
              lowPairs: info.lowPairs.map(rankName).join(','),
              trash: info.trash.map(cardToString).join(' ')
            });
          }
        }
      }

      if (!isFL) {
        combatDecisions++;
        var cheap = cheapLegals(legals);
        if (e.type === 'play' && cheap.length) combatPlayWithCheap++;
        if (e.type === 'pass') {
          combatPass++;
          humanPassTotal++;
          if (legals.length) humanPassWithLegal++;
          if (cheap.length) {
            humanPassWithCheap++;
            var ctype = curTypeOf(cur);
            var hb = handLenBucket(handLen);
            var ms = minSbcAmong(hand, cheap);
            var pb = isPairBreakApproxStats(hand, cheap);
            inc(passByCurType, ctype);
            inc(passByHandLen, hb);
            inc(passByMinSbc, ms.min != null ? sbcBucket(ms.min) : 'n/a');
            inc(passByCurTypeHand, ctype + ' | ' + hb);
            inc(passByCurTop, rankName(curTopOf(cur)));
            inc(cross, ctype + ' | sbc=' + (ms.min != null ? sbcBucket(ms.min) : '?'));

            var pbKey;
            if (ms.min === 0) pbKey = 'has_sbc0_cheap';
            else if (ms.min != null && ms.min < 8) pbKey = 'has_low_sbc_cheap(<8)';
            else pbKey = 'min_sbc>=8';
            inc(passByPairBreak, pbKey);

            if (ms.play && isPairBreakApprox(hand, ms.play)) pbStats.cheapestIsPairBreak++;
            if (pb.anyNonBreak) pbStats.hasAnyNonPB++;
            if (pb.allBreak) pbStats.allPB++;
            if (ms.min === 0) pbStats.hasSbc0++;

            if (passExamples.length < 20) {
              passExamples.push({
                seed: seed, handLen: handLen, curType: ctype,
                curTop: rankName(curTopOf(cur)),
                curSize: cur && cur.size,
                cheapN: cheap.length, minSbc: ms.min,
                minSbcPlay: cardsStr(ms.play),
                cheapSample: cheap.slice(0, 4).map(function (p) {
                  return cardsStr(p) + ' sbc=' + structureBreakCost(hand, p) + (isPairBreakApprox(hand, p) ? ' PB' : '');
                })
              });
            }
          }
        }
      }
    }
  }

  log('\n========== SUMMARY ==========');
  log('human combat decisions (play|pass vs cur):', combatDecisions);
  log('human combat passes:', combatPass);
  log('human pass with any legal:', humanPassWithLegal);
  log('human pass WITH CHEAP legal:', humanPassWithCheap);
  log('human combat play with cheap available:', combatPlayWithCheap);
  log('pass-with-cheap rate among combat decisions:', ((100 * humanPassWithCheap) / combatDecisions).toFixed(2) + '%');
  log('pass-with-cheap rate among combat passes:', combatPass ? ((100 * humanPassWithCheap) / combatPass).toFixed(1) + '%' : 'n/a');

  printTable('1a PASS-with-cheap by cur.type', passByCurType, humanPassWithCheap);
  printTable('1b PASS-with-cheap by handLen bucket', passByHandLen, humanPassWithCheap);
  printTable('1c PASS-with-cheap by min structureBreakCost of cheapest legal', passByMinSbc, humanPassWithCheap);
  printTable('1d PASS-with-cheap by (cur.type | handLen)', passByCurTypeHand, humanPassWithCheap);
  printTable('1e PASS-with-cheap by curTop rank', passByCurTop, humanPassWithCheap);
  printTable('1f PASS-with-cheap structure quality', passByPairBreak, humanPassWithCheap);
  printTable('1g PASS-with-cheap cur.type × minSbc', cross, humanPassWithCheap);

  log('\n### 1h pair-break approx on pass-with-cheap');
  log(JSON.stringify(pbStats, null, 2));

  log('\n### 1i Concrete PASS-with-cheap examples');
  passExamples.slice(0, 12).forEach(function (ex, i) {
    log((i + 1) + ') seed=' + ex.seed + ' handLen=' + ex.handLen + ' cur=' + ex.curType +
      ' top=' + ex.curTop + ' size=' + ex.curSize + ' cheapN=' + ex.cheapN +
      ' minSbc=' + ex.minSbc + ' minPlay=' + ex.minSbcPlay);
    log('   cheapSample: ' + ex.cheapSample.join(' | '));
  });

  log('\n========== FREE-LEAD ==========');
  log('human free-lead plays:', flTotal);
  printTable('2a FL class (all free-leads)', flByClass, flTotal);
  log('FL situations with BOTH low pair (rank<=9) AND trash singles:', flWhenBoth);
  printTable('2b When hand has trash+lowPair: choice', flWhenBothByChoice, flWhenBoth);

  log('\n### 2c Free-lead examples (both trash+lowPair)');
  var byC = {};
  flExamples.forEach(function (ex) { (byC[ex.choice] = byC[ex.choice] || []).push(ex); });
  var shown = 0;
  ['trash_single', 'pair', 'multi', 'other_single'].forEach(function (ch) {
    var arr = byC[ch] || [];
    for (var i = 0; i < Math.min(3, arr.length) && shown < 12; i++) {
      var ex = arr[i];
      log((++shown) + ') seed=' + ex.seed + ' handLen=' + ex.handLen + ' choice=' + ex.choice +
        ' cards=' + ex.cards + ' trash=[' + ex.trash + '] lowPairs=[' + ex.lowPairs + ']');
    }
  });

  log('\n========== PLAYS OF 2 (rank 12) ==========');
  log('human plays containing a 2:', twoPlays, '(free-lead:', twoFreeLead + ')');
  printTable('3a by curTop (FREE or rank name)', twoByCurTop, twoPlays);
  printTable('3b by cur.type', twoByCurType, twoPlays);
  printTable('3c by handLen bucket', twoByHandLen, twoPlays);
  log('\n### 3d Concrete 2-play examples');
  twoExamples.slice(0, 12).forEach(function (ex, i) {
    log((i + 1) + ') seed=' + ex.seed + ' handLen=' + ex.handLen + ' curType=' + ex.curType +
      ' curTop=' + ex.curTop + ' cards=' + ex.cards + ' combo=' + ex.combo);
  });

  fs.writeFileSync(OUT, lines.join('\n') + '\n');
  log('\nWrote', OUT);
}

main();
