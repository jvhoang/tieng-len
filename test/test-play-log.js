/**
 * Node tests for play-log store + controller integration.
 */
'use strict';

const assert = require('assert');
const engine = require('../engine.js');
const playLogMod = require('../play-log.js');
const controllerFac = require('../controller.js');

let passed = 0;
let failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log('PASS:', msg); }
  else { failed++; console.log('FAIL:', msg); }
}

console.log('=== play-log basic store ===');
{
  const mem = playLogMod.createMemoryStorage();
  const pl = playLogMod.createPlayLog({ storage: mem, maxGames: 5 });
  const st = engine.createGameState(2, 42);
  st.isFirstLead = true;
  const id = pl.startGame(st, {
    mode: 'vsAI',
    vsAI: true,
    numPlayers: 2,
    humanSeats: [0],
    aiDifficulty: 'hard',
    aiBuild: { id: 'test', label: 'Test AI' },
    seed: 42
  });
  ok(!!id, 'startGame returns id');
  ok(pl.getActive() && pl.getActive().id === id, 'active game set');
  ok(pl.getActive().deal.hands.length === 2, 'deal has 2 hands');
  ok(pl.getActive().deal.hands[0].length === 13, '13 cards dealt');

  const before = JSON.parse(JSON.stringify(st));
  const seat = st.currentPlayer;
  const legals = engine.getLegalPlays(
    st.players[seat].hand, st.currentCombo, false, true, st.firstLeadCard
  );
  ok(legals.length > 0, 'first lead has legals');
  const play = legals[0];
  const after = engine.applyPlay(st, seat, play);
  pl.logAction({
    type: 'play',
    seat: seat,
    actor: seat === 0 ? 'human' : 'ai',
    cards: play,
    combo: engine.detectCombo(play),
    beforeState: before,
    afterState: after,
    legals: legals,
    humanThinkMs: 1234,
    ai: null
  });
  const g1 = pl.getGame(id);
  ok(g1 && g1.events.length >= 2, 'events recorded (start + play)');
  ok(g1.events.some(function (e) { return e.type === 'play' && e.humanThinkMs === 1234; }),
    'human think time stored');

  // Force end
  after.roundOver = true;
  after.finishOrder = [0];
  after.loser = 1;
  pl.logAction({
    type: 'pass',
    seat: 1,
    actor: 'ai',
    beforeState: after,
    afterState: after,
    legals: [],
    ai: { thinkMs: 50, stats: { mode: 'test' } }
  });
  // manually finalize if not auto
  if (pl.getActive()) pl.finalizeActive({ fromState: after });
  const g2 = pl.getGame(id);
  ok(g2 && g2.endedAt, 'game finalized');
  ok(g2.result && g2.result.humanWon === true, 'humanWon true when seat 0 wins');
  ok(pl.listGames().length === 1, 'index has 1 game');
  const exp = JSON.parse(pl.exportAll());
  ok(exp.count === 1 && exp.games[0].id === id, 'exportAll works');
}

console.log('=== controller logs a mini vs-AI game ===');
{
  const mem = playLogMod.createMemoryStorage();
  const pl = playLogMod.createPlayLog({ storage: mem, maxGames: 10 });
  const ctrl = controllerFac.createController({
    vsAI: true,
    numPlayers: 2,
    humanSeats: [0],
    currentHumanSeat: 0,
    seed: 99,
    beginGame: true,
    playLog: pl,
    mode: 'vsAI',
    aiDifficulty: 'easy'
  });
  ok(pl.getActive() != null || pl.listGames().length >= 1, 'logging started with beginGame');
  // Run AI if computer opens
  ctrl.runAITurnIfNeeded();
  let st = ctrl.getState();
  let steps = 0;
  while (!st.roundOver && steps < 80) {
    const cp = st.currentPlayer;
    if (ctrl.isHumanSeat(cp)) {
      const legals = ctrl.getLegalFor(cp);
      if (!legals.length) {
        if (st.currentCombo) ctrl.passHuman(cp);
        else break;
      } else if (!st.currentCombo) {
        ctrl.playHuman(cp, legals[0]);
      } else {
        // play cheapest or pass
        const cheap = legals.filter(function (l) {
          return !l.some(function (c) { return c.rank === 12; });
        });
        if (cheap.length) ctrl.playHuman(cp, cheap[0]);
        else ctrl.passHuman(cp);
      }
      ctrl.afterHumanAction();
    } else {
      ctrl.runAITurnIfNeeded();
    }
    st = ctrl.getState();
    steps++;
  }
  ok(st.roundOver || steps >= 80, 'game progressed');
  // Ensure finalization if over
  if (st.roundOver && pl.getActive()) {
    pl.finalizeActive({ fromState: st });
  }
  const games = pl.listGames();
  ok(games.length >= 1, 'at least one logged game');
  const full = pl.getGame(games[0].id);
  ok(full && full.deal && full.deal.hands.length === 2, 'full deal stored');
  const plays = (full.events || []).filter(function (e) { return e.type === 'play' || e.type === 'pass'; });
  ok(plays.length > 0, 'move events present (' + plays.length + ')');
  const hasHuman = plays.some(function (e) { return e.actor === 'human'; });
  const hasAi = plays.some(function (e) { return e.actor === 'ai'; });
  ok(hasHuman, 'human actions logged');
  ok(hasAi, 'ai actions logged');
}

console.log('=== history cap keeps NEWEST (not oldest) ===');
{
  // Regression: old MAX_GAMES=80 + reverse unshift dropped newest GitHub games.
  const mem = playLogMod.createMemoryStorage();
  const pl = playLogMod.createPlayLog({ storage: mem, maxGames: 5 });
  const recs = [];
  for (let i = 1; i <= 12; i++) {
    const day = 10 + Math.floor(i / 3);
    const hour = String(i).padStart(2, '0');
    recs.push({
      schemaVersion: 1,
      id: 'g_hist_' + i,
      startedAt: '2026-07-' + day + 'T' + hour + ':00:00.000Z',
      endedAt: '2026-07-' + day + 'T' + hour + ':05:00.000Z',
      mode: 'vsAI',
      numPlayers: 2,
      events: [],
      result: { humanWon: i % 2 === 0 },
      _public: true,
      _source: 'github',
      _remoteIssueNumber: i
    });
  }
  // Simulate fetch order: newest first (as GitHub API returns)
  const newestFirst = recs.slice().reverse();
  pl.mergeGamesIntoIndex(newestFirst);
  const listed = pl.listGamesMerged();
  ok(listed.length === 5, 'capped at maxGames=5 (got ' + listed.length + ')');
  const ids = listed.map(function (g) { return g.id; });
  ok(ids.indexOf('g_hist_12') >= 0, 'keeps newest game g_hist_12');
  ok(ids.indexOf('g_hist_11') >= 0, 'keeps g_hist_11');
  ok(ids.indexOf('g_hist_1') < 0, 'drops oldest g_hist_1');
  ok(listed[0].id === 'g_hist_12', 'list sorted newest-first first item is g_hist_12');
}

console.log('=== fetchPublicGames pagination + no newest-drop ===');
{
  const mem = playLogMod.createMemoryStorage();
  // Mock fetch: page1 = 100 issues newest, page2 = 3 older
  const issues = [];
  for (let n = 103; n >= 1; n--) {
    // Monotonic timestamps so issue 103 is strictly newest
    const started = new Date(Date.UTC(2026, 6, 1) + n * 3600 * 1000).toISOString();
    const rec = {
      schemaVersion: 1,
      id: 'g_issue_' + n,
      startedAt: started,
      endedAt: started,
      mode: 'vsAI',
      numPlayers: 2,
      events: [{ i: 0, type: 'game_start' }],
      result: { humanWon: true, winner: 0 }
    };
    const body = playLogMod.encodeIssueBody(rec);
    issues.push({
      number: n,
      html_url: 'https://github.com/jvhoang/tieng-len/issues/' + n,
      body: body,
      created_at: started
    });
  }
  const fetchMock = function (url) {
    const m = String(url).match(/[?&]page=(\d+)/);
    const page = m ? parseInt(m[1], 10) : 1;
    const start = (page - 1) * 100;
    const slice = issues.slice(start, start + 100);
    return Promise.resolve({
      ok: true,
      status: 200,
      json: function () { return Promise.resolve(slice); }
    });
  };
  const pl = playLogMod.createPlayLog({
    storage: mem,
    maxGames: 500,
    fetch: fetchMock
  });
  pl.setRemoteConfig({ owner: 'jvhoang', repo: 'tieng-len', label: 'play-log', token: '' });
  // Synchronous wait via deasync-free: chain into existing async test below
  global.__playLogFetchTest = pl.fetchPublicGames().then(function (games) {
    ok(games.length === 103, 'fetched all 103 paginated issues (got ' + games.length + ')');
    const listed = pl.listGamesMerged();
    ok(listed.length === 103, 'index has all 103 (got ' + listed.length + ')');
    ok(listed[0].id === 'g_issue_103' || listed[0].remoteIssueNumber === 103,
      'newest issue first in list');
    const has103 = listed.some(function (g) { return g.id === 'g_issue_103'; });
    ok(has103, 'includes issue 103 (post-7/11 games)');
  });
}

console.log('=== GitHub issue encode/decode ===');
{
  const pl = playLogMod.createPlayLog({ storage: playLogMod.createMemoryStorage() });
  const sample = {
    schemaVersion: 1,
    id: 'g_test_remote',
    startedAt: '2026-07-10T00:00:00.000Z',
    endedAt: '2026-07-10T00:05:00.000Z',
    mode: 'vsAI',
    numPlayers: 2,
    humanSeats: [0],
    aiDifficulty: 'hard',
    events: [{ i: 0, type: 'game_start' }],
    result: { humanWon: true, winner: 0, loser: 1 }
  };
  const body = pl.encodeIssueBody(sample);
  ok(body.indexOf('TIENLEN_PLAYLOG_V1') >= 0, 'issue body has marker');
  const decoded = pl.decodeIssueBody(body);
  ok(decoded && decoded.id === 'g_test_remote', 'decode round-trip id');
  ok(decoded.result && decoded.result.humanWon === true, 'decode preserves result');
  ok(pl.issueTitle(sample).indexOf('human-win') >= 0, 'issue title encodes outcome');
  // publish without token → needsAuth
  pl.setRemoteConfig({ token: '', autoPublish: true, owner: 'jvhoang', repo: 'tieng-len' });
  var chain = Promise.resolve();
  if (global.__playLogFetchTest) chain = global.__playLogFetchTest;
  chain.then(function () {
    return pl.publishGame(sample);
  }).then(function (res) {
    ok(res && res.needsAuth === true, 'publish without token reports needsAuth');
    console.log('=== SUMMARY ===');
    console.log('Passed:', passed, 'Failed:', failed);
    if (failed) process.exit(1);
    console.log('ALL PLAY-LOG TESTS PASSED');
  }).catch(function (e) {
    console.log('FAIL: async play-log tests', e);
    process.exit(1);
  });
}
