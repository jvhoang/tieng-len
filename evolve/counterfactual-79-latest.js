/**
 * Counterfactual: ALL completed 1v1 (2p) human play-logs vs LIVE latest AI
 * sitting in the human seat with HIDDEN INFO only.
 *
 * Uses playlog-index.json built by evolve/refresh-playlogs-all.js (all play-log
 * issues, not a fixed 79). Output filenames keep "79" aliases for compatibility
 * plus counterfactual-all-latest* names.
 *
 *   TIENLEN_CF_ISSUES_DIR=... TIENLEN_SCRATCH=... node evolve/counterfactual-79-latest.js
 *   # prefer: node evolve/refresh-playlogs-all.js first
 */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');
const ai = require('../ai.js'); // LIVE latest

const SCRATCH = process.env.TIENLEN_SCRATCH || path.join(__dirname);
const ISSUES_DIR = process.env.TIENLEN_CF_ISSUES_DIR || path.join(SCRATCH, 'issues');
const INDEX = path.join(SCRATCH, 'playlog-index.json');
const OUT_FULL = path.join(SCRATCH, 'counterfactual-all-latest.json');
const OUT_FULL_LEGACY = path.join(SCRATCH, 'counterfactual-79-latest.json');
const OUT_SUMMARY = path.join(__dirname, 'counterfactual-all-latest-summary.json');
const OUT_SUMMARY_LEGACY = path.join(__dirname, 'counterfactual-79-latest-summary.json');
const OUT_FEATURES = path.join(SCRATCH, 'human-action-features.jsonl');

function parseIssueFile(fp, n) {
  const issue = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let data = issue.log || issue;
  if (issue.body) {
    const body = issue.body || '';
    const m = body.match(/```json\s*([\s\S]*?)```/);
    if (m) data = JSON.parse(m[1].trim());
    else {
      const i0 = body.indexOf('{');
      const i1 = body.lastIndexOf('}');
      if (i0 >= 0 && i1 > i0) data = JSON.parse(body.slice(i0, i1 + 1));
    }
  }
  return { issue: n, title: issue.title, data: data };
}

function cardSig(cards) {
  if (!cards || !cards.length) return 'PASS';
  return cards.map(function (c) { return c.rank * 4 + c.suit; }).sort(function (a, b) { return a - b; }).join(',');
}

function samePlay(a, b) {
  return cardSig(a) === cardSig(b);
}

function cloneCards(hand) {
  return (hand || []).map(function (c) { return { rank: c.rank, suit: c.suit }; });
}

function rebuildStateFromDeal(data) {
  const deal = data.deal || {};
  const hands = deal.hands;
  const n = data.numPlayers || (hands && hands.length) || 2;
  let st = engine.createGameState(n, data.seed || 1);
  if (hands && hands.length === n) {
    for (let i = 0; i < n; i++) {
      st.players[i].hand = cloneCards(hands[i]);
      st.players[i].passed = false;
      st.players[i].finished = false;
    }
  }
  st.isFirstLead = true;
  st.firstLeadCard = data.deal && data.deal.firstLeadCard
    ? data.deal.firstLeadCard
    : (st.firstLeadCard || null);
  if (data.openingSnapshot && data.openingSnapshot.currentPlayer != null) {
    st.currentPlayer = data.openingSnapshot.currentPlayer;
  }
  return st;
}

function applyEvent(st, e) {
  if (e.type === 'pass' || (e.type === 'play' && (!e.cards || !e.cards.length))) {
    return engine.passFast ? engine.passFast(st, e.seat) : engine.pass(st, e.seat);
  }
  if (e.type === 'play' && e.cards && e.cards.length) {
    return engine.applyPlayFast
      ? engine.applyPlayFast(st, e.seat, e.cards)
      : engine.applyPlay(st, e.seat, e.cards);
  }
  return st;
}

function handFeatures(hand) {
  let twos = 0, aces = 0, pairs = 0, control = 0;
  const byRank = {};
  for (let i = 0; i < hand.length; i++) {
    const r = hand[i].rank;
    byRank[r] = (byRank[r] || 0) + 1;
    if (r === 12) twos++;
    if (r === 11) aces++;
    if (r >= 10) control++;
  }
  Object.keys(byRank).forEach(function (r) {
    if (byRank[r] >= 2) pairs++;
  });
  return { twos: twos, aces: aces, pairs: pairs, control: control, handLen: hand.length };
}

function analyzeOne(n, data) {
  const result = data.result || {};
  const humanSeats = data.humanSeats || [0];
  const aiSeats = data.aiSeats || [1];
  const events = data.events || [];
  const humanSeat = humanSeats[0];

  let outcome = 'unknown';
  if (result.humanWon === true || result.winner === humanSeat) outcome = 'human-win';
  else if (result.humanWon === false || (aiSeats.indexOf(result.winner) >= 0)) outcome = 'ai-win';
  else if (result.abandoned || (data.tags || []).indexOf('abandoned') >= 0) outcome = 'abandoned';

  if (outcome === 'abandoned') {
    return { issue: n, outcome: outcome, humanActions: [], skipped: true, reason: 'abandoned' };
  }
  if (!data.deal || !data.deal.hands) {
    return { issue: n, outcome: outcome, humanActions: [], skipped: true, reason: 'no-deal-hands' };
  }

  let st = rebuildStateFromDeal(data);
  const rows = [];
  let humanActionIdx = 0;
  const featureRows = [];

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.type !== 'play' && e.type !== 'pass') continue;
    if (e.seat == null) continue;

    if (e.actor === 'human' || humanSeats.indexOf(e.seat) >= 0) {
      const humanPlay = (e.type === 'pass' || !e.cards || !e.cards.length) ? null : e.cards;
      let alt = null;
      let err = null;
      let mode = null;
      const free = st.currentCombo == null;
      const hf = handFeatures(st.players[e.seat].hand);
      const legals = engine.getLegalPlays(
        st.players[e.seat].hand, st.currentCombo, st.players[e.seat].passed,
        st.isFirstLead, st.firstLeadCard
      );
      const legalMulti = legals.filter(function (p) { return p && p.length >= 2; }).length;
      const legalSingles = legals.filter(function (p) { return p && p.length === 1; }).length;
      const oppMin = st.players.reduce(function (m, p, idx) {
        if (idx === e.seat || p.finished) return m;
        return Math.min(m, p.hand.length);
      }, 99);

      try {
        alt = ai.getAIMove(st, e.seat, {
          difficulty: 'hard',
          useSearch: true,
          perfectInfo: false,
          hiddenInfo: true,
          timeMs: parseInt(process.env.TIENLEN_CF_MS || '40', 10),
          iterations: parseInt(process.env.TIENLEN_CF_ITERS || '28', 10),
          determinizations: parseInt(process.env.TIENLEN_CF_DETS || '6', 10),
          seed: (n * 10007 + i * 17) >>> 0
        });
        if (ai.getLastSearchStats) {
          const stt = ai.getLastSearchStats();
          mode = stt && stt.mode;
        }
      } catch (ex) {
        err = String(ex && ex.message || ex);
      }

      const match = samePlay(humanPlay, alt);
      const humanHasTwo = humanPlay && humanPlay.some(function (c) { return c.rank === 12; });
      const altHasTwo = alt && alt.some(function (c) { return c.rank === 12; });
      const humanLen = humanPlay ? humanPlay.length : 0;
      const altLen = alt ? alt.length : 0;

      // Action class labels for predictor
      let humanClass = 'pass';
      if (humanPlay) {
        if (humanLen >= 4) humanClass = 'bomb_or_long';
        else if (humanLen === 3) humanClass = 'triple';
        else if (humanLen === 2) humanClass = 'pair';
        else if (humanHasTwo) humanClass = 'single_two';
        else if (humanPlay[0].rank >= 11) humanClass = 'single_high';
        else if (humanPlay[0].rank <= 5) humanClass = 'single_trash';
        else humanClass = 'single_mid';
      }
      let altClass = 'pass';
      if (alt) {
        if (altLen >= 4) altClass = 'bomb_or_long';
        else if (altLen === 3) altClass = 'triple';
        else if (altLen === 2) altClass = 'pair';
        else if (altHasTwo) altClass = 'single_two';
        else if (alt[0].rank >= 11) altClass = 'single_high';
        else if (alt[0].rank <= 5) altClass = 'single_trash';
        else altClass = 'single_mid';
      }

      const row = {
        issue: n,
        eventI: e.i != null ? e.i : i,
        humanActionIdx: humanActionIdx++,
        freeLead: free,
        humanSig: cardSig(humanPlay),
        altSig: cardSig(alt),
        match: match,
        humanPass: humanPlay == null,
        altPass: alt == null,
        humanTwo: !!humanHasTwo,
        altTwo: !!altHasTwo,
        humanLen: humanLen,
        altLen: altLen,
        humanClass: humanClass,
        altClass: altClass,
        handSize: hf.handLen,
        oppMin: oppMin,
        twos: hf.twos,
        aces: hf.aces,
        pairs: hf.pairs,
        control: hf.control,
        legalCount: legals.length,
        legalMulti: legalMulti,
        legalSingles: legalSingles,
        curType: st.currentCombo ? st.currentCombo.type : null,
        curTop: st.currentCombo && st.currentCombo.top ? st.currentCombo.top.rank : null,
        mode: mode,
        err: err
      };
      rows.push(row);

      featureRows.push({
        issue: n,
        freeLead: free ? 1 : 0,
        handSize: hf.handLen,
        oppMin: oppMin === 99 ? 0 : oppMin,
        twos: hf.twos,
        aces: hf.aces,
        pairs: hf.pairs,
        control: hf.control,
        legalCount: legals.length,
        legalMulti: legalMulti,
        legalSingles: legalSingles,
        curTop: row.curTop == null ? -1 : row.curTop,
        humanClass: humanClass,
        altClass: altClass,
        match: match ? 1 : 0,
        humanSig: row.humanSig,
        altSig: row.altSig
      });
    }

    try {
      st = applyEvent(st, e);
      st.isFirstLead = false;
    } catch (exApply) {
      return {
        issue: n,
        outcome: outcome,
        humanActions: rows,
        featureRows: featureRows,
        skipped: false,
        applyError: String(exApply && exApply.message || exApply),
        partial: true
      };
    }
  }

  if (st.finishOrder && st.finishOrder.length) {
    if (st.finishOrder[0] === humanSeat) outcome = 'human-win';
    else outcome = 'ai-win';
  }

  return {
    issue: n,
    outcome: outcome,
    humanActions: rows,
    featureRows: featureRows,
    skipped: false,
    humanActionCount: rows.length,
    matchCount: rows.filter(function (r) { return r.match; }).length,
    differCount: rows.filter(function (r) { return !r.match; }).length
  };
}

function main() {
  console.log('AI under test', ai.AI_BUILD);
  console.log('ISSUES_DIR', ISSUES_DIR);

  let issueNums = null;
  if (fs.existsSync(INDEX)) {
    const idx = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
    issueNums = idx.completed2p || null;
  }
  if (!issueNums || !issueNums.length) {
    // Scan ALL issue files present (no fixed upper bound)
    issueNums = [];
    try {
      const files = fs.readdirSync(ISSUES_DIR);
      const seen = Object.create(null);
      for (let fi = 0; fi < files.length; fi++) {
        const m = files[fi].match(/^(?:raw|issue)-(\d+)\.json$/);
        if (!m) continue;
        const n = parseInt(m[1], 10);
        if (!seen[n]) {
          seen[n] = 1;
          issueNums.push(n);
        }
      }
      issueNums.sort(function (a, b) { return a - b; });
    } catch (e) { /* empty */ }
  }
  console.log('CF issue count (completed2p index or scan)', issueNums.length);

  const results = [];
  let completed = 0;
  let totalHuman = 0;
  let totalMatch = 0;
  let totalDiffer = 0;
  const allFeatures = [];

  for (let ki = 0; ki < issueNums.length; ki++) {
    const n = issueNums[ki];
    let fp = path.join(ISSUES_DIR, 'raw-' + n + '.json');
    if (!fs.existsSync(fp)) fp = path.join(ISSUES_DIR, 'issue-' + n + '.json');
    if (!fs.existsSync(fp)) {
      results.push({ issue: n, skipped: true, reason: 'missing-file' });
      continue;
    }
    let parsed;
    try {
      parsed = parseIssueFile(fp, n);
    } catch (e) {
      results.push({ issue: n, skipped: true, reason: 'parse-error', err: String(e) });
      continue;
    }
    const title = parsed.title || '';
    if (title.indexOf('abandoned') >= 0) {
      results.push({ issue: n, outcome: 'abandoned', skipped: true, humanActions: [] });
      continue;
    }
    if (title.indexOf('4p') >= 0 || (parsed.data && parsed.data.numPlayers === 4)) {
      results.push({ issue: n, outcome: 'not-2p', skipped: true, humanActions: [] });
      continue;
    }

    const r = analyzeOne(n, parsed.data);
    if (r.featureRows) {
      for (let fi = 0; fi < r.featureRows.length; fi++) allFeatures.push(r.featureRows[fi]);
    }
    if (r.skipped) {
      results.push(r);
      continue;
    }
    completed++;
    totalHuman += r.humanActionCount || 0;
    totalMatch += r.matchCount || 0;
    totalDiffer += r.differCount || 0;
    results.push(r);
    if (completed % 10 === 0 || completed === issueNums.length) {
      console.log('processed ' + completed + '/' + issueNums.length +
        ' humanActs=' + totalHuman + ' match=' + totalMatch + ' differ=' + totalDiffer);
    }
  }

  const differs = [];
  results.forEach(function (r) {
    (r.humanActions || []).forEach(function (a) {
      if (!a.match) differs.push(a);
    });
  });

  const byPattern = {
    humanTwoAltNot: differs.filter(function (d) { return d.humanTwo && !d.altTwo; }).length,
    altTwoHumanNot: differs.filter(function (d) { return d.altTwo && !d.humanTwo; }).length,
    humanPassAltPlay: differs.filter(function (d) { return d.humanPass && !d.altPass; }).length,
    humanPlayAltPass: differs.filter(function (d) { return !d.humanPass && d.altPass; }).length,
    freeLeadDiffer: differs.filter(function (d) { return d.freeLead; }).length,
    combatDiffer: differs.filter(function (d) { return !d.freeLead; }).length,
    multiVsSingle: differs.filter(function (d) {
      const hM = d.humanSig !== 'PASS' && d.humanSig.split(',').length >= 2;
      const aM = d.altSig !== 'PASS' && d.altSig.split(',').length >= 2;
      return hM !== aM;
    }).length,
    classDisagree: differs.filter(function (d) { return d.humanClass !== d.altClass; }).length
  };

  // Class confusion human vs AI
  const classPairs = {};
  differs.forEach(function (d) {
    const k = d.humanClass + '→' + d.altClass;
    classPairs[k] = (classPairs[k] || 0) + 1;
  });

  const summary = {
    aiBuild: ai.AI_BUILD,
    corpus: 'all-completed-1v1-playlogs',
    method: 'getAIMove human-seat hiddenInfo=true perfectInfo=false',
    issueList: issueNums,
    issueListCount: issueNums.length,
    completedGames: completed,
    totalHumanActions: totalHuman,
    matchCount: totalMatch,
    differCount: totalDiffer,
    matchRate: totalHuman ? totalMatch / totalHuman : 0,
    differPatterns: byPattern,
    classDisagreeTop: Object.keys(classPairs).sort(function (a, b) {
      return classPairs[b] - classPairs[a];
    }).slice(0, 25).map(function (k) { return { pair: k, n: classPairs[k] }; }),
    perGame: results.map(function (r) {
      return {
        issue: r.issue,
        outcome: r.outcome,
        skipped: r.skipped,
        humanActions: r.humanActionCount || 0,
        match: r.matchCount || 0,
        differ: r.differCount || 0,
        reason: r.reason || null,
        applyError: r.applyError || null
      };
    }),
    differSample: differs.slice(0, 100)
  };

  const payload = JSON.stringify({ summary: summary, results: results }, null, 2);
  fs.writeFileSync(OUT_FULL, payload);
  fs.writeFileSync(OUT_FULL_LEGACY, payload);
  const sumStr = JSON.stringify(summary, null, 2);
  fs.writeFileSync(OUT_SUMMARY, sumStr);
  fs.writeFileSync(OUT_SUMMARY_LEGACY, sumStr);
  fs.writeFileSync(OUT_FEATURES, allFeatures.map(function (f) { return JSON.stringify(f); }).join('\n') + '\n');

  console.log('=== SUMMARY ===');
  console.log(JSON.stringify({
    corpus: summary.corpus,
    completedGames: completed,
    issueListCount: issueNums.length,
    totalHumanActions: totalHuman,
    matchRate: summary.matchRate,
    differPatterns: byPattern,
    classDisagreeTop: summary.classDisagreeTop.slice(0, 12)
  }, null, 2));
  console.log('wrote', OUT_FULL);
  console.log('wrote', OUT_SUMMARY);
  console.log('wrote', OUT_FEATURES);
}

main();
