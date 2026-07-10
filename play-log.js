/**
 * play-log.js — Extensive live-game recording for human-vs-AI analysis.
 *
 * Pure JS, browser + Node. Persistence defaults to localStorage (GitHub Pages safe).
 * Schema is reconstruction-friendly: full deal + ordered events + outcome.
 *
 * Storage layout:
 *   tienlen_playlog_v1_index  → [{ id, summary fields... }]
 *   tienlen_playlog_v1_game_<id> → full game record
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
  var MAX_GAMES = 80; // localStorage quota safety
  var MAX_LEGALS_STORED = 24;

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

  function createPlayLog(opts) {
    opts = opts || {};
    var storage = opts.storage || defaultStorage();
    var maxGames = opts.maxGames != null ? opts.maxGames : MAX_GAMES;
    var active = null; // in-progress game record
    var t0 = 0;

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

    function saveGame(rec) {
      storage.setItem(gameKey(rec.id), JSON.stringify(rec));
      var idx = readIndex().filter(function (e) { return e.id !== rec.id; });
      idx.unshift(summarize(rec));
      while (idx.length > maxGames) {
        var drop = idx.pop();
        try { storage.removeItem(gameKey(drop.id)); } catch (e2) { /* ignore */ }
      }
      writeIndex(idx);
      return rec.id;
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
        complete: !!rec.endedAt
      };
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
      return done;
    }

    function getActive() {
      return active ? clone(active) : null;
    }

    function listGames() {
      return readIndex();
    }

    function getGame(id) {
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
      getGame: getGame,
      deleteGame: deleteGame,
      clearAll: clearAll,
      exportGame: exportGame,
      exportAll: exportAll,
      importBundle: importBundle,
      stats: stats,
      summarize: summarize,
      cardsSig: cardsSig,
      // test helpers
      _createMemoryStorage: createMemoryStorage,
      _readIndex: readIndex
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
    createPlayLog: createPlayLog,
    getDefault: getDefault,
    createMemoryStorage: createMemoryStorage
  };
}));
