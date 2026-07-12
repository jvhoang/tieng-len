/**
 * play-log.js — Extensive live-game recording for human-vs-AI analysis.
 *
 * Local cache: localStorage (offline / crash safety).
 * Public remote: GitHub Issues on a public repo (auto-publish on game end).
 *   - Read is public (no token) for anyone viewing History.
 *   - Write needs a fine-grained PAT once (Issues: Read/Write on that repo).
 *
 * Schema is reconstruction-friendly: full deal + ordered events + outcome.
 *
 * Storage layout (local):
 *   tienlen_playlog_v1_index  → [{ id, summary fields... }]
 *   tienlen_playlog_v1_game_<id> → full game record
 *   tienlen_playlog_v1_remote_cfg → { provider, owner, repo, label, token }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TienLenPlayLog = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCHEMA_VERSION = 1;
  var INDEX_KEY = 'tienlen_playlog_v1_index';
  var GAME_PREFIX = 'tienlen_playlog_v1_game_';
  var REMOTE_CFG_KEY = 'tienlen_playlog_v1_remote_cfg';
  // Local cache cap. Was 80 — that silently dropped newest GitHub issues when
  // fetch mirrored into localStorage (see fetchPublicGames rebuild). Keep high
  // enough for full public history; still bounds quota.
  var MAX_GAMES = 500;
  var MAX_LEGALS_STORED = 24;
  var REMOTE_PAGE_SIZE = 100;
  var REMOTE_MAX_PAGES = 30;
  var ISSUE_MARKER = '<!-- TIENLEN_PLAYLOG_V1 -->';
  var DEFAULT_REMOTE = {
    provider: 'github',
    owner: 'jvhoang',
    repo: 'tieng-len',
    label: 'play-log',
    token: '',
    autoPublish: true
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function uid() {
    return 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function clone(x) {
    return x == null ? x : JSON.parse(JSON.stringify(x));
  }

  function cardKey(c) {
    return c ? (c.rank * 4 + c.suit) : -1;
  }

  function cardsSig(cards) {
    if (!cards || !cards.length) return '';
    return cards.map(cardKey).sort(function (a, b) { return a - b; }).join(',');
  }

  // ─── Storage adapter ───

  function createMemoryStorage() {
    var map = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; },
      setItem: function (k, v) { map[k] = String(v); },
      removeItem: function (k) { delete map[k]; },
      key: function (i) { return Object.keys(map)[i] || null; },
      get length() { return Object.keys(map).length; }
    };
  }

  function defaultStorage() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var probe = '__tienlen_pl_probe__';
        localStorage.setItem(probe, '1');
        localStorage.removeItem(probe);
        return localStorage;
      }
    } catch (e) { /* private mode */ }
    return createMemoryStorage();
  }

  // ─── Core store ───

  function issueTitle(rec) {
    var r = rec.result || {};
    var outcome = r.abandoned ? 'abandoned'
      : (r.humanWon === true ? 'human-win' : (r.humanWon === false ? 'ai-win' : 'incomplete'));
    var when = (rec.endedAt || rec.startedAt || '').slice(0, 19);
    return 'playlog | ' + (rec.numPlayers || '?') + 'p | ' + outcome + ' | ' + when + ' | ' + rec.id;
  }

  function encodeIssueBody(rec) {
    return ISSUE_MARKER + '\n\n' +
      '**Mode:** ' + (rec.mode || '') +
      ' · **AI:** ' + ((rec.aiBuild && (rec.aiBuild.label || rec.aiBuild.id)) || rec.aiDifficulty || '') +
      ' · **Human won:** ' + String(rec.result && rec.result.humanWon) +
      '\n\n```json\n' + JSON.stringify(rec) + '\n```\n';
  }

  function decodeIssueBody(body) {
    if (!body || body.indexOf(ISSUE_MARKER) < 0) return null;
    var m = body.match(/```json\s*([\s\S]*?)\s*```/);
    if (!m) return null;
    try {
      return JSON.parse(m[1]);
    } catch (e) {
      return null;
    }
  }

  function createPlayLog(opts) {
    opts = opts || {};
    var storage = opts.storage || defaultStorage();
    var maxGames = opts.maxGames != null ? opts.maxGames : MAX_GAMES;
    var active = null; // in-progress game record
    var t0 = 0;
    var fetchFn = opts.fetch || (typeof fetch === 'function' ? fetch.bind(typeof window !== 'undefined' ? window : globalThis) : null);
    var lastPublishStatus = { ok: null, at: null, message: '', gameId: null };
    var remoteCache = {}; // id -> full game from GitHub

    function readIndex() {
      try {
        var raw = storage.getItem(INDEX_KEY);
        if (!raw) return [];
        var arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
      } catch (e) {
        return [];
      }
    }

    function writeIndex(idx) {
      storage.setItem(INDEX_KEY, JSON.stringify(idx));
    }

    function gameKey(id) {
      return GAME_PREFIX + id;
    }

    function gameSortKey(s) {
      // Prefer endedAt, then startedAt; newest first when sorting desc
      return s.endedAt || s.startedAt || '';
    }

    function sortIndexNewestFirst(idx) {
      idx.sort(function (a, b) {
        var ka = gameSortKey(a);
        var kb = gameSortKey(b);
        if (ka === kb) {
          var na = a.remoteIssueNumber || 0;
          var nb = b.remoteIssueNumber || 0;
          return nb - na;
        }
        return ka < kb ? 1 : (ka > kb ? -1 : 0);
      });
      return idx;
    }

    /**
     * Cap index by dropping OLDEST (not arbitrary end-of-array).
     * Fixes bug where reverse-order unshift + pop() deleted the newest games.
     */
    function trimIndexKeepNewest(idx) {
      sortIndexNewestFirst(idx);
      while (idx.length > maxGames) {
        var drop = idx.pop(); // oldest at end after sort
        if (drop && drop.id) {
          try { storage.removeItem(gameKey(drop.id)); } catch (e2) { /* ignore */ }
        }
      }
      return idx;
    }

    function saveGame(rec) {
      storage.setItem(gameKey(rec.id), JSON.stringify(rec));
      var idx = readIndex().filter(function (e) { return e.id !== rec.id; });
      idx.unshift(summarize(rec));
      trimIndexKeepNewest(idx);
      writeIndex(idx);
      return rec.id;
    }

    /**
     * Bulk-merge full game records into local cache without reverse-order bug.
     * Rebuilds index sorted newest-first and keeps up to maxGames.
     */
    function mergeGamesIntoIndex(recs) {
      if (!recs || !recs.length) return readIndex();
      var byId = Object.create(null);
      var idx = readIndex();
      var i;
      for (i = 0; i < idx.length; i++) {
        if (idx[i] && idx[i].id) byId[idx[i].id] = idx[i];
      }
      for (i = 0; i < recs.length; i++) {
        var rec = recs[i];
        if (!rec || !rec.id) continue;
        try {
          storage.setItem(gameKey(rec.id), JSON.stringify(rec));
        } catch (eQ) { /* quota — still keep summary if possible */ }
        byId[rec.id] = summarize(rec);
      }
      var merged = [];
      for (var id in byId) {
        if (Object.prototype.hasOwnProperty.call(byId, id)) merged.push(byId[id]);
      }
      trimIndexKeepNewest(merged);
      writeIndex(merged);
      return merged;
    }

    function summarize(rec) {
      var r = rec.result || {};
      return {
        id: rec.id,
        schemaVersion: rec.schemaVersion,
        startedAt: rec.startedAt,
        endedAt: rec.endedAt || null,
        mode: rec.mode,
        numPlayers: rec.numPlayers,
        aiDifficulty: rec.aiDifficulty,
        aiBuildId: rec.aiBuild && rec.aiBuild.id,
        aiBuildLabel: rec.aiBuild && rec.aiBuild.label,
        humanWon: r.humanWon != null ? r.humanWon : null,
        winner: r.winner != null ? r.winner : null,
        loser: r.loser != null ? r.loser : null,
        finishOrder: r.finishOrder || null,
        eventCount: (rec.events && rec.events.length) || 0,
        durationMs: r.durationMs != null ? r.durationMs : null,
        seed: rec.seed,
        complete: !!rec.endedAt,
        public: !!rec._public,
        remoteIssueUrl: rec._remoteIssueUrl || null,
        remoteIssueNumber: rec._remoteIssueNumber || null,
        source: rec._source || 'local'
      };
    }

    // ─── Remote (public GitHub Issues) ───

    function getRemoteConfig() {
      try {
        var raw = storage.getItem(REMOTE_CFG_KEY);
        var cfg = raw ? JSON.parse(raw) : {};
        var out = Object.assign({}, DEFAULT_REMOTE, cfg || {});
        // Allow page-level override without re-prompt (optional)
        try {
          if (typeof window !== 'undefined' && window.TIENLEN_REMOTE_LOG) {
            out = Object.assign({}, out, window.TIENLEN_REMOTE_LOG);
          }
        } catch (eW) { /* ignore */ }
        return out;
      } catch (e) {
        return Object.assign({}, DEFAULT_REMOTE);
      }
    }

    function setRemoteConfig(partial) {
      var cur = getRemoteConfig();
      var next = Object.assign({}, cur, partial || {});
      // Never persist window-only secrets into empty wipe accidentally
      storage.setItem(REMOTE_CFG_KEY, JSON.stringify({
        provider: next.provider || 'github',
        owner: next.owner || DEFAULT_REMOTE.owner,
        repo: next.repo || DEFAULT_REMOTE.repo,
        label: next.label || DEFAULT_REMOTE.label,
        token: next.token || '',
        autoPublish: next.autoPublish !== false
      }));
      return getRemoteConfig();
    }

    function hasPublishAuth() {
      var cfg = getRemoteConfig();
      return !!(cfg.token && cfg.owner && cfg.repo);
    }

    function githubHeaders(cfg, withAuth) {
      var h = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };
      if (withAuth && cfg.token) h.Authorization = 'Bearer ' + cfg.token;
      return h;
    }

    function ensureLabel(cfg) {
      if (!fetchFn || !cfg.token) return Promise.resolve();
      var url = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/labels/' + encodeURIComponent(cfg.label);
      return fetchFn(url, { headers: githubHeaders(cfg, true) }).then(function (res) {
        if (res.status === 200) return;
        // create label
        return fetchFn('https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/labels', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, githubHeaders(cfg, true)),
          body: JSON.stringify({
            name: cfg.label,
            color: 'c9a227',
            description: 'Tiến Lên live play logs (auto-published for AI analysis)'
          })
        }).then(function () { return; }).catch(function () { return; });
      }).catch(function () { return; });
    }

    /**
     * Publish a finished game to public GitHub Issues.
     * Idempotent: if rec already has remoteIssueNumber, PATCH that issue.
     */
    function publishGame(rec) {
      var cfg = getRemoteConfig();
      if (!cfg.autoPublish) {
        lastPublishStatus = { ok: false, at: nowIso(), message: 'autoPublish disabled', gameId: rec && rec.id };
        return Promise.resolve({ ok: false, skipped: true, reason: 'disabled' });
      }
      if (!cfg.token) {
        lastPublishStatus = { ok: false, at: nowIso(), message: 'No GitHub token — set one in History to publish publicly', gameId: rec && rec.id };
        return Promise.resolve({ ok: false, error: 'no-token', needsAuth: true });
      }
      if (!fetchFn) {
        lastPublishStatus = { ok: false, at: nowIso(), message: 'fetch unavailable', gameId: rec && rec.id };
        return Promise.resolve({ ok: false, error: 'no-fetch' });
      }
      var body = encodeIssueBody(rec);
      var title = issueTitle(rec);
      var base = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + '/issues';

      return ensureLabel(cfg).then(function () {
        if (rec._remoteIssueNumber) {
          return fetchFn(base + '/' + rec._remoteIssueNumber, {
            method: 'PATCH',
            headers: Object.assign({ 'Content-Type': 'application/json' }, githubHeaders(cfg, true)),
            body: JSON.stringify({ title: title, body: body, labels: [cfg.label] })
          });
        }
        return fetchFn(base, {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, githubHeaders(cfg, true)),
          body: JSON.stringify({ title: title, body: body, labels: [cfg.label] })
        });
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            var msg = (data && data.message) || ('HTTP ' + res.status);
            lastPublishStatus = { ok: false, at: nowIso(), message: msg, gameId: rec.id };
            return { ok: false, error: msg, status: res.status };
          }
          rec._public = true;
          rec._source = 'github';
          rec._remoteIssueNumber = data.number;
          rec._remoteIssueUrl = data.html_url;
          try { saveGame(rec); } catch (eS) { /* ignore */ }
          remoteCache[rec.id] = rec;
          lastPublishStatus = {
            ok: true,
            at: nowIso(),
            message: 'Published as issue #' + data.number,
            gameId: rec.id,
            url: data.html_url
          };
          return { ok: true, number: data.number, url: data.html_url, record: rec };
        });
      }).catch(function (err) {
        var msg = String(err && err.message || err);
        lastPublishStatus = { ok: false, at: nowIso(), message: msg, gameId: rec && rec.id };
        return { ok: false, error: msg };
      });
    }

    /**
     * Pull ALL public play-log issues (paginated; no token required for public repos).
     * Returns array of full game records; merges into local index newest-first
     * without dropping recent games (previous bug: MAX_GAMES=80 + reverse unshift).
     */
    function fetchPublicGames() {
      var cfg = getRemoteConfig();
      if (!fetchFn) return Promise.resolve([]);

      function fetchPage(page) {
        var url = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo +
          '/issues?labels=' + encodeURIComponent(cfg.label) +
          '&state=all&per_page=' + REMOTE_PAGE_SIZE +
          '&page=' + page +
          '&sort=created&direction=desc';
        return fetchFn(url, { headers: githubHeaders(cfg, !!cfg.token) }).then(function (res) {
          if (!res.ok) throw new Error('GitHub list failed HTTP ' + res.status);
          return res.json();
        });
      }

      function fetchAllPages(page, acc) {
        if (page > REMOTE_MAX_PAGES) return Promise.resolve(acc);
        return fetchPage(page).then(function (issues) {
          if (!Array.isArray(issues) || !issues.length) return acc;
          for (var i = 0; i < issues.length; i++) acc.push(issues[i]);
          if (issues.length < REMOTE_PAGE_SIZE) return acc;
          return fetchAllPages(page + 1, acc);
        });
      }

      return fetchAllPages(1, []).then(function (issues) {
        var games = [];
        for (var i = 0; i < issues.length; i++) {
          var iss = issues[i];
          if (iss.pull_request) continue;
          var rec = decodeIssueBody(iss.body || '');
          if (!rec || !rec.id) continue;
          rec._public = true;
          rec._source = 'github';
          rec._remoteIssueNumber = iss.number;
          rec._remoteIssueUrl = iss.html_url;
          // Prefer GitHub issue timestamps when body times are missing
          if (!rec.endedAt && iss.created_at) rec.endedAt = iss.created_at;
          if (!rec.startedAt && iss.created_at) rec.startedAt = iss.created_at;
          remoteCache[rec.id] = rec;
          games.push(rec);
        }
        // Bulk merge (keeps newest); do NOT call saveGame per-issue (old reverse+pop bug)
        try { mergeGamesIntoIndex(games); } catch (eM) { /* quota */ }
        lastPublishStatus = {
          ok: true,
          at: nowIso(),
          message: 'Synced ' + games.length + ' public play-logs from GitHub',
          gameId: null
        };
        return games;
      }).catch(function (err) {
        lastPublishStatus = {
          ok: false,
          at: nowIso(),
          message: 'Fetch public logs failed: ' + String(err && err.message || err),
          gameId: null
        };
        return [];
      });
    }

    function listGamesMerged() {
      // Newest first; mark public when known from remoteCache
      var idx = sortIndexNewestFirst(readIndex().slice());
      return idx.map(function (s) {
        var copy = Object.assign({}, s);
        if (remoteCache[copy.id]) {
          copy.public = true;
          copy.source = 'github';
          copy.remoteIssueUrl = remoteCache[copy.id]._remoteIssueUrl || copy.remoteIssueUrl;
          copy.remoteIssueNumber = remoteCache[copy.id]._remoteIssueNumber || copy.remoteIssueNumber;
        }
        return copy;
      });
    }

    function getPublishStatus() {
      return Object.assign({}, lastPublishStatus);
    }

    function testRemoteConnection() {
      var cfg = getRemoteConfig();
      if (!fetchFn) return Promise.resolve({ ok: false, error: 'no-fetch' });
      if (!cfg.token) return Promise.resolve({ ok: false, error: 'no-token', needsAuth: true });
      var url = 'https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo;
      return fetchFn(url, { headers: githubHeaders(cfg, true) }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) return { ok: false, error: (data && data.message) || ('HTTP ' + res.status) };
          return ensureLabel(cfg).then(function () {
            return { ok: true, repo: data.full_name, private: data.private };
          });
        });
      }).catch(function (e) {
        return { ok: false, error: String(e && e.message || e) };
      });
    }

    function handSnapshot(state) {
      if (!state || !state.players) return [];
      return state.players.map(function (p) {
        return {
          seat: p.id != null ? p.id : null,
          hand: clone(p.hand || []),
          handSize: (p.hand && p.hand.length) || 0,
          passed: !!p.passed,
          finished: !!p.finished
        };
      });
    }

    function handSizes(state) {
      if (!state || !state.players) return [];
      return state.players.map(function (p) {
        return (p.hand && p.hand.length) || 0;
      });
    }

    function capLegals(legals) {
      if (!legals || !legals.length) return [];
      var out = [];
      var n = Math.min(legals.length, MAX_LEGALS_STORED);
      for (var i = 0; i < n; i++) out.push(clone(legals[i]));
      return out;
    }

    function envMeta() {
      var meta = {
        schemaVersion: SCHEMA_VERSION,
        capturedAt: nowIso()
      };
      try {
        if (typeof location !== 'undefined') {
          meta.href = location.href;
          meta.origin = location.origin;
        }
      } catch (e1) { /* ignore */ }
      try {
        if (typeof navigator !== 'undefined') {
          meta.userAgent = navigator.userAgent;
          meta.language = navigator.language;
        }
      } catch (e2) { /* ignore */ }
      try {
        if (typeof screen !== 'undefined') {
          meta.screen = { w: screen.width, h: screen.height };
        }
      } catch (e3) { /* ignore */ }
      return meta;
    }

    /**
     * Begin a new game record from a fresh deal state.
     * cfg: { mode, vsAI, numPlayers, humanSeats, aiDifficulty, aiBuild, seed, siteBuild }
     */
    function startGame(state, cfg) {
      cfg = cfg || {};
      // Finalize previous unfinished active game as abandoned
      if (active && !active.endedAt) {
        finalizeActive({ abandoned: true, reason: 'superseded' });
      }
      t0 = Date.now();
      var humanSeats = Array.isArray(cfg.humanSeats) ? cfg.humanSeats.slice() : [0];
      var n = state.numPlayers || (state.players && state.players.length) || 4;
      var aiSeats = [];
      for (var s = 0; s < n; s++) {
        if (humanSeats.indexOf(s) < 0) aiSeats.push(s);
      }
      active = {
        schemaVersion: SCHEMA_VERSION,
        id: uid(),
        startedAt: nowIso(),
        endedAt: null,
        mode: cfg.mode || (cfg.vsAI !== false ? 'vsAI' : 'hotseat'),
        vsAI: cfg.vsAI !== false,
        numPlayers: n,
        humanSeats: humanSeats,
        aiSeats: aiSeats,
        aiDifficulty: cfg.aiDifficulty || 'hard',
        aiBuild: cfg.aiBuild ? clone(cfg.aiBuild) : null,
        seed: state.seed != null ? state.seed : (cfg.seed != null ? cfg.seed : null),
        siteBuild: cfg.siteBuild || null,
        env: envMeta(),
        deal: {
          hands: state.players.map(function (p) { return clone(p.hand || []); }),
          firstPlayer: state.currentPlayer,
          firstLeadCard: clone(state.firstLeadCard),
          isFirstLead: !!state.isFirstLead
        },
        // Full seat snapshots at start for analysis (includes AI hands — local research data)
        openingSnapshot: handSnapshot(state),
        events: [],
        result: null,
        tags: cfg.tags || [],
        notes: cfg.notes || ''
      };
      pushEvent({
        type: 'game_start',
        actor: 'system',
        seat: null,
        handSizes: handSizes(state),
        currentPlayer: state.currentPlayer,
        isFirstLead: !!state.isFirstLead,
        firstLeadCard: clone(state.firstLeadCard)
      });
      // Persist in-progress so crash mid-game still keeps partial log
      saveGame(active);
      return active.id;
    }

    function pushEvent(partial) {
      if (!active) return null;
      var ev = Object.assign({
        i: active.events.length,
        t: Date.now() - t0,
        wall: nowIso()
      }, partial || {});
      active.events.push(ev);
      return ev;
    }

    /**
     * Log a play or pass after it was applied.
     * opts: {
     *   type: 'play'|'pass',
     *   seat, actor: 'human'|'ai',
     *   cards, combo,
     *   beforeState, afterState,
     *   legals (array),
     *   ai: { stats, thinkMs, fallbackUsed, choice, error },
     *   humanThinkMs,
     *   note
     * }
     */
    function logAction(opts) {
      if (!active || !opts) return null;
      var before = opts.beforeState || null;
      var after = opts.afterState || null;
      var seat = opts.seat;
      var handBefore = null;
      if (before && before.players && before.players[seat]) {
        handBefore = clone(before.players[seat].hand);
      }
      var legals = opts.legals || null;
      var ev = pushEvent({
        type: opts.type,
        seat: seat,
        actor: opts.actor || 'unknown',
        cards: opts.cards ? clone(opts.cards) : null,
        cardsSig: opts.cards ? cardsSig(opts.cards) : (opts.type === 'pass' ? 'PASS' : null),
        combo: opts.combo ? clone(opts.combo) : null,
        handBefore: handBefore,
        handSizesBefore: before ? handSizes(before) : null,
        handSizesAfter: after ? handSizes(after) : null,
        currentComboBefore: before ? clone(before.currentCombo) : null,
        currentComboAfter: after ? clone(after.currentCombo) : null,
        currentPlayerBefore: before ? before.currentPlayer : null,
        currentPlayerAfter: after ? after.currentPlayer : null,
        isFirstLead: before ? !!before.isFirstLead : null,
        passedFlagsBefore: before ? before.players.map(function (p) { return !!p.passed; }) : null,
        finishedFlagsAfter: after ? after.players.map(function (p) { return !!p.finished; }) : null,
        legalsCount: legals ? legals.length : null,
        legals: legals ? capLegals(legals) : null,
        publicHistoryLen: before && before.publicHistory ? before.publicHistory.length : null,
        humanThinkMs: opts.humanThinkMs != null ? opts.humanThinkMs : null,
        ai: opts.ai ? clone(opts.ai) : null,
        note: opts.note || null,
        roundOver: after ? !!after.roundOver : false,
        finishOrder: after && after.finishOrder ? after.finishOrder.slice() : null
      });
      // Persist every action so mid-game crash still keeps full trail
      try { saveGame(active); } catch (e) { /* quota */ }
      if (after && after.roundOver) {
        finalizeActive({ fromState: after });
      }
      return ev;
    }

    function logSystem(type, data) {
      return pushEvent(Object.assign({ type: type, actor: 'system' }, data || {}));
    }

    function finalizeActive(extra) {
      extra = extra || {};
      if (!active || active.endedAt) return active;
      var st = extra.fromState || null;
      var finishOrder = st && st.finishOrder ? st.finishOrder.slice() : (active.result && active.result.finishOrder) || [];
      var loser = st && st.loser != null ? st.loser : null;
      var winner = finishOrder.length ? finishOrder[0] : (loser != null ? (loser === 0 ? 1 : 0) : null);
      var humanWon = null;
      if (winner != null && active.humanSeats) {
        humanWon = active.humanSeats.indexOf(winner) >= 0;
      }
      active.endedAt = nowIso();
      active.result = {
        finishOrder: finishOrder,
        loser: loser,
        winner: winner,
        humanWon: humanWon,
        abandoned: !!extra.abandoned,
        reason: extra.reason || null,
        steps: active.events.filter(function (e) {
          return e.type === 'play' || e.type === 'pass';
        }).length,
        durationMs: Date.now() - t0,
        eventCount: active.events.length
      };
      pushEvent({
        type: 'game_end',
        actor: 'system',
        result: clone(active.result)
      });
      try { saveGame(active); } catch (e) { /* ignore */ }
      var done = active;
      active = null;
      // Public auto-publish (async; local already saved)
      try {
        publishGame(done).then(function (res) {
          if (typeof opts.onPublish === 'function') {
            try { opts.onPublish(res, done); } catch (eP) { /* ignore */ }
          }
        });
      } catch (ePub) { /* ignore */ }
      return done;
    }

    function getActive() {
      return active ? clone(active) : null;
    }

    function listGames() {
      return sortIndexNewestFirst(readIndex().slice());
    }

    function getGame(id) {
      if (remoteCache[id]) return clone(remoteCache[id]);
      try {
        var raw = storage.getItem(gameKey(id));
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }

    function deleteGame(id) {
      try { storage.removeItem(gameKey(id)); } catch (e) { /* ignore */ }
      writeIndex(readIndex().filter(function (e) { return e.id !== id; }));
      if (active && active.id === id) active = null;
      return true;
    }

    function clearAll() {
      var idx = readIndex();
      for (var i = 0; i < idx.length; i++) {
        try { storage.removeItem(gameKey(idx[i].id)); } catch (e) { /* ignore */ }
      }
      writeIndex([]);
      active = null;
      return true;
    }

    function exportGame(id) {
      var g = getGame(id);
      return g ? JSON.stringify(g, null, 2) : null;
    }

    function exportAll() {
      var idx = readIndex();
      var games = [];
      for (var i = 0; i < idx.length; i++) {
        var g = getGame(idx[i].id);
        if (g) games.push(g);
      }
      return JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        exportedAt: nowIso(),
        count: games.length,
        games: games
      }, null, 2);
    }

    function importBundle(json) {
      var data = typeof json === 'string' ? JSON.parse(json) : json;
      var games = data.games || (data.id ? [data] : []);
      var n = 0;
      for (var i = 0; i < games.length; i++) {
        var g = games[i];
        if (!g || !g.id) continue;
        saveGame(g);
        n++;
      }
      return n;
    }

    function stats() {
      var idx = readIndex();
      var complete = idx.filter(function (g) { return g.complete; });
      var humanWins = complete.filter(function (g) { return g.humanWon === true; }).length;
      var aiWins = complete.filter(function (g) { return g.humanWon === false; }).length;
      return {
        total: idx.length,
        complete: complete.length,
        humanWins: humanWins,
        aiWins: aiWins,
        humanWinRate: complete.length ? humanWins / complete.length : null,
        active: !!active
      };
    }

    return {
      SCHEMA_VERSION: SCHEMA_VERSION,
      startGame: startGame,
      logAction: logAction,
      logSystem: logSystem,
      finalizeActive: finalizeActive,
      getActive: getActive,
      listGames: listGames,
      listGamesMerged: listGamesMerged,
      getGame: getGame,
      deleteGame: deleteGame,
      clearAll: clearAll,
      exportGame: exportGame,
      exportAll: exportAll,
      importBundle: importBundle,
      stats: stats,
      summarize: summarize,
      cardsSig: cardsSig,
      // remote / public
      getRemoteConfig: getRemoteConfig,
      setRemoteConfig: setRemoteConfig,
      hasPublishAuth: hasPublishAuth,
      publishGame: publishGame,
      fetchPublicGames: fetchPublicGames,
      getPublishStatus: getPublishStatus,
      testRemoteConnection: testRemoteConnection,
      encodeIssueBody: encodeIssueBody,
      decodeIssueBody: decodeIssueBody,
      issueTitle: issueTitle,
      mergeGamesIntoIndex: mergeGamesIntoIndex,
      // test helpers
      _createMemoryStorage: createMemoryStorage,
      _readIndex: readIndex,
      _maxGames: maxGames
    };
  }

  // Singleton for browser convenience
  var _default = null;
  function getDefault() {
    if (!_default) _default = createPlayLog();
    return _default;
  }

  return {
    SCHEMA_VERSION: SCHEMA_VERSION,
    DEFAULT_REMOTE: DEFAULT_REMOTE,
    createPlayLog: createPlayLog,
    getDefault: getDefault,
    createMemoryStorage: createMemoryStorage,
    encodeIssueBody: encodeIssueBody,
    decodeIssueBody: decodeIssueBody
  };
}));
