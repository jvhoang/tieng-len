/**
 * Counterfactual: for each human action in completed play-logs #1–#72,
 * ask shipped v7.0 getAIMove from the human seat with HIDDEN INFO only
 * (perfectInfo false — no peeking at opponent private hands).
 *
 *   node evolve/counterfactual-v70-vs-human.js
 *   TIENLEN_CF_ISSUES_DIR=... TIENLEN_SCRATCH=...
 */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../engine.js');
// Use frozen v7.0 for counterfactual (immutable), not live v7.5+
const ai = require('../policies/v70-ai.js');

const SCRATCH = process.env.TIENLEN_SCRATCH || path.join(__dirname);
const ISSUES_DIR = process.env.TIENLEN_CF_ISSUES_DIR ||
  path.join(SCRATCH, 'issues');
const OUT_JSON = path.join(SCRATCH, 'counterfactual-1-72.json');
const OUT_REPO = path.join(__dirname, 'counterfactual-1-72-summary.json');

function parseIssueFile(fp, n) {
  const issue = JSON.parse(fs.readFileSync(fp, 'utf8'));
  // may be full github issue or already {log:...}
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
  return hand.map(function (c) { return { rank: c.rank, suit: c.suit }; });
}

function rebuildStateFromDeal(data) {
  const deal = data.deal || {};
  const hands = deal.hands;
  const n = data.numPlayers || (hands && hands.length) || 2;
  // seed optional
  let st = engine.createGameState(n, data.seed || 1);
  // overwrite hands from deal
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
  // who starts
  if (typeof data.openingSnapshot !== 'undefined' && data.openingSnapshot && data.openingSnapshot.currentPlayer != null) {
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

function analyzeOne(n, data) {
  const result = data.result || {};
  const winner = result.winner;
  const humanSeats = data.humanSeats || [0];
  const aiSeats = data.aiSeats || [1];
  const events = data.events || [];
  const humanSeat = humanSeats[0];

  let outcome = 'unknown';
  if (winner === humanSeat) outcome = 'human-win';
  else if (aiSeats.indexOf(winner) >= 0) outcome = 'ai-win';
  else if (result.status === 'abandoned' || (data.tags || []).indexOf('abandoned') >= 0) {
    outcome = 'abandoned';
  }

  if (outcome === 'abandoned' || outcome === 'unknown') {
    // title fallback not available here
    if (!events.length || !result.finishOrder) {
      return { issue: n, outcome: outcome === 'unknown' ? 'incomplete' : outcome, humanActions: [], skipped: true };
    }
  }

  // Must have deal hands for faithful replay
  if (!data.deal || !data.deal.hands) {
    return { issue: n, outcome: outcome, humanActions: [], skipped: true, reason: 'no-deal-hands' };
  }

  let st = rebuildStateFromDeal(data);
  const rows = [];
  let humanActionIdx = 0;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.type !== 'play' && e.type !== 'pass') continue;
    if (e.seat == null) continue;

    // Before applying human action, counterfactual
    if (e.actor === 'human' || humanSeats.indexOf(e.seat) >= 0) {
      const humanPlay = (e.type === 'pass' || !e.cards || !e.cards.length) ? null : e.cards;
      // Snapshot for AI: use full engine state but HIDDEN info path (no perfect peek)
      let alt = null;
      let err = null;
      let mode = null;
      try {
        // Force deterministic-ish seed from issue+i
        alt = ai.getAIMove(st, e.seat, {
          difficulty: 'hard',
          useSearch: true,
          perfectInfo: false,
          hiddenInfo: true,
          timeMs: 60,
          iterations: 40,
          determinizations: 8,
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
      const free = st.currentCombo == null;
      const humanHasTwo = humanPlay && humanPlay.some(function (c) { return c.rank === 12; });
      const altHasTwo = alt && alt.some(function (c) { return c.rank === 12; });

      rows.push({
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
        handSize: st.players[e.seat].hand.length,
        oppMin: st.players.reduce(function (m, p, idx) {
          if (idx === e.seat || p.finished) return m;
          return Math.min(m, p.hand.length);
        }, 99),
        curType: st.currentCombo ? st.currentCombo.type : null,
        curTop: st.currentCombo && st.currentCombo.top ? st.currentCombo.top.rank : null,
        mode: mode,
        err: err
      });
    }

    // Advance state
    try {
      st = applyEvent(st, e);
      st.isFirstLead = false;
    } catch (exApply) {
      return {
        issue: n,
        outcome: outcome,
        humanActions: rows,
        skipped: false,
        applyError: String(exApply && exApply.message || exApply),
        partial: true
      };
    }
  }

  // Re-detect outcome from finish if needed
  if (st.finishOrder && st.finishOrder.length) {
    if (st.finishOrder[0] === humanSeat) outcome = 'human-win';
    else outcome = 'ai-win';
  }

  return {
    issue: n,
    outcome: outcome,
    humanActions: rows,
    skipped: false,
    humanActionCount: rows.length,
    matchCount: rows.filter(function (r) { return r.match; }).length,
    differCount: rows.filter(function (r) { return !r.match; }).length
  };
}

function main() {
  console.log('AI under test', ai.AI_BUILD);
  const results = [];
  let completed = 0;
  let abandoned = 0;
  let totalHuman = 0;
  let totalMatch = 0;
  let totalDiffer = 0;

  for (let n = 1; n <= 72; n++) {
    const fp = path.join(ISSUES_DIR, 'raw-' + n + '.json');
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
      abandoned++;
      results.push({ issue: n, outcome: 'abandoned', skipped: true, humanActions: [] });
      continue;
    }
    const r = analyzeOne(n, parsed.data);
    if (r.outcome === 'abandoned' || r.skipped) {
      if (r.outcome === 'abandoned') abandoned++;
      results.push(r);
      continue;
    }
    completed++;
    totalHuman += r.humanActionCount || 0;
    totalMatch += r.matchCount || 0;
    totalDiffer += r.differCount || 0;
    results.push(r);
    if (n % 10 === 0) {
      console.log('processed through #' + n + ' humanActs=' + totalHuman + ' differ=' + totalDiffer);
    }
  }

  // Aggregate difference patterns
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
    }).length
  };

  const summary = {
    aiBuild: ai.AI_BUILD,
    method: 'getAIMove human-seat hiddenInfo=true perfectInfo=false',
    issues: { from: 1, to: 72 },
    completedGames: completed,
    abandonedOrSkipped: 72 - completed,
    totalHumanActions: totalHuman,
    matchCount: totalMatch,
    differCount: totalDiffer,
    matchRate: totalHuman ? totalMatch / totalHuman : 0,
    differPatterns: byPattern,
    perGame: results.map(function (r) {
      return {
        issue: r.issue,
        outcome: r.outcome,
        skipped: r.skipped,
        humanActions: r.humanActionCount || 0,
        match: r.matchCount || 0,
        differ: r.differCount || 0,
        reason: r.reason || null
      };
    }),
    differSample: differs.slice(0, 80)
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify({ summary: summary, results: results }, null, 2));
  fs.writeFileSync(OUT_REPO, JSON.stringify(summary, null, 2));
  console.log('=== SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2).slice(0, 2500));
  console.log('Wrote', OUT_JSON, OUT_REPO);
  return summary;
}

if (require.main === module) main();
module.exports = { main: main, analyzeOne: analyzeOne, cardSig: cardSig, samePlay: samePlay };
