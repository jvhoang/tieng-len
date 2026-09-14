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

console.log('=== vsAI supersede is a ranked forfeit; hotseat stays abandoned ===');
{
  const mem = playLogMod.createMemoryStorage();
  const pl = playLogMod.createPlayLog({ storage: mem, maxGames: 10 });
  const st1 = engine.createGameState(2, 7);
  st1.isFirstLead = true;
  const id1 = pl.startGame(st1, {
    mode: 'vsAI', vsAI: true, numPlayers: 2, humanSeats: [0],
    aiDifficulty: 'grandmaster', username: 'John'
  });
  ok(!!pl.getActive(), 'first vsAI deal is live before any play');
  const st2 = engine.createGameState(2, 8);
  st2.isFirstLead = true;
  const id2 = pl.startGame(st2, {
    mode: 'vsAI', vsAI: true, numPlayers: 2, humanSeats: [0],
    aiDifficulty: 'grandmaster', username: 'John'
  });
  ok(id1 !== id2, 'new deal gets a new id');
  const old = pl.getGame(id1);
  ok(old && old.endedAt, 'prior vsAI deal finalized on supersede');
  ok(old.result && old.result.forfeit === true, 'supersede is a forfeit');
  ok(old.result.humanWon === false, 'forfeit is a human loss');
  ok(old.result.abandoned === true, 'History can still show they left');
  ok(old.result.humanPlacement === 2, '1v1 forfeit is last place');
  ok(playLogMod.issueTitle(old).indexOf('forfeit') >= 0, 'issue title says forfeit');
  const compact = playLogMod.compactPlayLog(old);
  ok(compact.result && compact.result.forfeit === true && compact.result.humanWon === false,
    'compact ingest payload keeps forfeit loss');
  ok(pl.getActive() && pl.getActive().id === id2, 'new deal is active — no free mulligan');

  const memH = playLogMod.createMemoryStorage();
  const plH = playLogMod.createPlayLog({ storage: memH, maxGames: 10 });
  const h1 = engine.createGameState(4, 3);
  const hid1 = plH.startGame(h1, { mode: 'hotseat', vsAI: false, numPlayers: 4, humanSeats: [0, 1, 2, 3] });
  const h2 = engine.createGameState(4, 4);
  plH.startGame(h2, { mode: 'hotseat', vsAI: false, numPlayers: 4, humanSeats: [0, 1, 2, 3] });
  const hot = plH.getGame(hid1);
  ok(hot && hot.result && hot.result.abandoned === true, 'hotseat supersede still abandoned');
  ok(!hot.result.forfeit, 'hotseat abandon is not a ranked forfeit');
}

console.log('=== unfinished vsAI leftover (refresh) becomes a forfeit ===');
{
  const mem = playLogMod.createMemoryStorage();
  const pl1 = playLogMod.createPlayLog({ storage: mem, maxGames: 10 });
  const st = engine.createGameState(2, 11);
  const orphanId = pl1.startGame(st, {
    mode: 'vsAI', vsAI: true, numPlayers: 2, humanSeats: [0],
    aiDifficulty: 'grandmaster', username: 'Jeannie'
  });
  ok(pl1.getActive() && !pl1.getActive().endedAt, 'crash snapshot is unfinished');
  const pl2 = playLogMod.createPlayLog({ storage: mem, maxGames: 10 });
  const swept = pl2.forfeitUnfinishedVsAI('orphaned');
  ok(swept.length === 1 && swept[0].id === orphanId, 'orphan sweep finds the leftover deal');
  const rec = pl2.getGame(orphanId);
  ok(rec && rec.result && rec.result.forfeit && rec.result.humanWon === false,
    'refresh leftover is a ranked forfeit loss');
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
  // Local index is capped; listGamesMerged may union remoteCache (by design for History UX)
  const listed = pl.listGames();
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
  // publish without token or ingest → needsAuth
  pl.setRemoteConfig({ token: '', ingestUrl: '', autoPublish: true, owner: 'jvhoang', repo: 'tieng-len' });
  var chain = Promise.resolve();
  if (global.__playLogFetchTest) chain = global.__playLogFetchTest;
  chain.then(function () {
    return pl.publishGame(sample);
  }).then(function (res) {
    ok(res && res.needsAuth === true, 'publish without token reports needsAuth');
    const compact = playLogMod.compactPlayLog(sample, 'secret');
    ok(compact && compact.id === 'g_test_remote' && compact._compact === true, 'compactPlayLog keeps id');
    ok(compact.k === 'secret', 'compactPlayLog stamps ingest key');
    const decodedCompact = playLogMod.decodeIssueBody(playLogMod.encodeIssueBody(compact));
    ok(decodedCompact && decodedCompact.result && decodedCompact.result.humanWon === true,
      'compact encode/decode preserves result');
  }).then(function () {
    console.log('=== revoked token must not block public fetch ===');
    const issues = [{
      number: 9,
      html_url: 'https://github.com/jvhoang/tieng-len/issues/9',
      created_at: '2026-09-01T00:00:00.000Z',
      body: playLogMod.encodeIssueBody({
        schemaVersion: 1,
        id: 'g_after_revoke',
        startedAt: '2026-09-01T00:00:00.000Z',
        endedAt: '2026-09-01T00:05:00.000Z',
        mode: 'vsAI',
        vsAI: true,
        numPlayers: 2,
        username: 'Jeannie',
        aiDifficulty: 'grandmaster',
        aiBuild: { id: 'v1.0-sh-L2s444', label: 'L2s444', stamped: '2026-07-26T02:00:00.000Z' },
        events: [],
        result: { humanWon: true, winner: 0, loser: 1, humanPlacement: 1 }
      })
    }];
    const calls = [];
    const fetch401 = function (url, opts) {
      const auth = !!(opts && opts.headers && opts.headers.Authorization);
      calls.push({ url: String(url), auth: auth, method: (opts && opts.method) || 'GET' });
      if (auth) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: function () { return Promise.resolve({ message: 'Bad credentials' }); }
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: function () { return Promise.resolve(issues); }
      });
    };
    const pl401 = playLogMod.createPlayLog({
      storage: playLogMod.createMemoryStorage(),
      fetch: fetch401
    });
    pl401.setRemoteConfig({
      owner: 'jvhoang', repo: 'tieng-len', label: 'play-log',
      token: 'ghp_revoked_example', autoPublish: true
    });
    return pl401.fetchPublicGames().then(function (games) {
      ok(calls.some(function (c) { return c.auth; }), 'first list attempt may send token');
      ok(calls.some(function (c) { return !c.auth && c.url.indexOf('/issues') >= 0; }),
        'retries public list without Authorization after 401');
      ok(games.length === 1 && games[0].id === 'g_after_revoke',
        'revoked token still syncs public play-logs');
    }).then(function () {
      console.log('=== ingest mailbox publish without PAT ===');
      const posted = [];
      const fetchIngest = function (url, opts) {
        posted.push({
          url: String(url),
          method: (opts && opts.method) || 'GET',
          headers: (opts && opts.headers) || {},
          body: opts && opts.body
        });
        return Promise.resolve({
          ok: true,
          status: 200,
          json: function () { return Promise.resolve({ id: 'ntfy-1' }); }
        });
      };
      const plIn = playLogMod.createPlayLog({
        storage: playLogMod.createMemoryStorage(),
        fetch: fetchIngest
      });
      plIn.setRemoteConfig({
        owner: 'jvhoang', repo: 'tieng-len', label: 'play-log',
        token: '', autoPublish: true,
        ingestUrl: 'https://ntfy.sh/tieng-len-test',
        ingestKey: 'k-test'
      });
      return plIn.publishGame(sample).then(function (res) {
        ok(res && res.ok === true && res.queued === true, 'publish without PAT queues ingest');
        ok(posted.length === 1 && posted[0].method === 'PUT', 'ntfy ingest uses PUT');
        ok(String(posted[0].body).indexOf('g_test_remote') >= 0,
          'small playlogs send compact JSON as the ntfy body');
        ok(String(posted[0].body).indexOf('k-test') >= 0, 'ingest key included for Actions');
      });
    }).then(function () {
      console.log('=== recover unpublished local games (Jeannie iPhone fixture) ===');
      function finished(id, extra) {
        extra = extra || {};
        return Object.assign({
          schemaVersion: 1,
          id: id,
          username: 'Jeannie',
          startedAt: extra.startedAt || '2026-09-01T12:00:00.000Z',
          endedAt: extra.endedAt || '2026-09-01T12:04:00.000Z',
          mode: 'vsAI',
          vsAI: true,
          numPlayers: 2,
          humanSeats: [0],
          aiDifficulty: 'grandmaster',
          aiBuild: { id: 'v1.0-sh-L2s444', label: 'L2s444', stamped: '2026-07-26T02:00:00.000Z' },
          events: [{ i: 0, type: 'game_start' }],
          result: { humanWon: true, winner: 0, loser: 1, humanPlacement: 1, abandoned: false }
        }, extra);
      }
      const alreadyRemote = finished('g_jeannie_already_on_github', {
        startedAt: '2026-08-20T12:00:00.000Z',
        endedAt: '2026-08-20T12:04:00.000Z'
      });
      const localNewA = finished('g_jeannie_post_825_a', {
        startedAt: '2026-09-02T15:00:00.000Z',
        endedAt: '2026-09-02T15:06:00.000Z'
      });
      const localNewB = finished('g_jeannie_post_825_b', {
        startedAt: '2026-09-03T15:00:00.000Z',
        endedAt: '2026-09-03T15:06:00.000Z',
        result: { humanWon: false, winner: 1, loser: 0, humanPlacement: 2, abandoned: false }
      });
      const abandoned = finished('g_jeannie_abandoned', {
        endedAt: '2026-09-04T15:00:00.000Z',
        result: { abandoned: true, humanWon: null }
      });
      const forfeited = finished('g_jeannie_forfeit', {
        endedAt: '2026-09-04T16:00:00.000Z',
        result: {
          abandoned: true, forfeit: true, reason: 'exit',
          humanWon: false, winner: 1, loser: 0, humanPlacement: 2
        }
      });
      const postedFlush = [];
      const fetchFlush = function (url, opts) {
        const u = String(url);
        const auth = !!(opts && opts.headers && opts.headers.Authorization);
        if (/\/issues\?/.test(u) && (!opts || !opts.method || opts.method === 'GET')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: function () {
              return Promise.resolve([{
                number: 486,
                html_url: 'https://github.com/jvhoang/tieng-len/issues/486',
                created_at: alreadyRemote.endedAt,
                title: playLogMod.issueTitle(alreadyRemote),
                body: playLogMod.encodeIssueBody(alreadyRemote)
              }]);
            }
          });
        }
        postedFlush.push({ url: u, method: (opts && opts.method) || 'GET', body: opts && opts.body, auth: auth });
        return Promise.resolve({
          ok: true,
          status: 200,
          json: function () { return Promise.resolve({ id: 'ntfy-' + postedFlush.length }); }
        });
      };
      const mem = playLogMod.createMemoryStorage();
      const plRec = playLogMod.createPlayLog({ storage: mem, fetch: fetchFlush });
      plRec.setRemoteConfig({
        owner: 'jvhoang', repo: 'tieng-len', label: 'play-log',
        token: '', autoPublish: true,
        ingestUrl: 'https://ntfy.sh/tieng-len-test',
        ingestKey: 'k-test'
      });
      plRec.mergeGamesIntoIndex([alreadyRemote, localNewA, localNewB, abandoned, forfeited]);
      mem.setItem('tienlen_playlog_v1_game_' + localNewA.id, JSON.stringify(localNewA));
      mem.setItem('tienlen_playlog_v1_game_' + localNewB.id, JSON.stringify(localNewB));
      mem.setItem('tienlen_playlog_v1_game_' + abandoned.id, JSON.stringify(abandoned));
      mem.setItem('tienlen_playlog_v1_game_' + forfeited.id, JSON.stringify(forfeited));
      mem.setItem('tienlen_playlog_v1_game_' + alreadyRemote.id, JSON.stringify(alreadyRemote));
      const before = plRec.listUnpublishedLocalGames();
      ok(before.some(function (g) { return g.id === 'g_jeannie_post_825_a'; }), 'lists unpublished A');
      ok(before.some(function (g) { return g.id === 'g_jeannie_post_825_b'; }), 'lists unpublished B');
      ok(!before.some(function (g) { return g.id === 'g_jeannie_abandoned'; }), 'skips abandoned');
      ok(before.some(function (g) { return g.id === 'g_jeannie_forfeit'; }), 'lists forfeit so it can rank');
      return plRec.flushUnpublishedLocalGames({ delayMs: 0, includeQueued: false }).then(function (res) {
        ok(res.queued === 3, 'flush queues 3 unpublished including forfeit (got ' + res.queued + ')');
        ok(res.ids.indexOf('g_jeannie_post_825_a') >= 0 && res.ids.indexOf('g_jeannie_post_825_b') >= 0 &&
          res.ids.indexOf('g_jeannie_forfeit') >= 0,
          'queued both post-8/25 Jeannie games plus forfeit');
        ok(!res.ids.some(function (id) { return id === 'g_jeannie_already_on_github'; }),
          'does not re-queue game already on GitHub');
        const bodies = postedFlush.map(function (p) { return String(p.body || ''); }).join('\n');
        ok(bodies.indexOf('g_jeannie_post_825_a') >= 0 && bodies.indexOf('g_jeannie_post_825_b') >= 0,
          'mailbox PUTs include both new game ids');
        ok(bodies.indexOf('g_jeannie_already_on_github') < 0, 'mailbox does not PUT already-published id');
        return plRec.flushUnpublishedLocalGames({ delayMs: 0, fetchFirst: false, includeQueued: false });
      }).then(function (res2) {
        ok(res2.queued === 0, 'second flush is a no-op (dedupe / ingest mark)');
        const again = plRec.listUnpublishedLocalGames({ includeQueued: false });
        ok(again.length === 0, 'queued locals no longer listed as unpublished');
      });
    });
  }).then(function () {
    console.log('=== SUMMARY ===');
    console.log('Passed:', passed, 'Failed:', failed);
    if (failed) process.exit(1);
    console.log('ALL PLAY-LOG TESTS PASSED');
  }).catch(function (e) {
    console.log('FAIL: async play-log tests', e);
    process.exit(1);
  });
}
