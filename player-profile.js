/**
 * player-profile.js — required username (honor system) + leaderboard helpers.
 * Usernames are NOT unique: same name on different browsers merges stats.
 * Pure browser/Node-friendly; no DOM required for core API.
 */
(function (root, factory) {
  if (typeof window !== 'undefined') {
    root.TienLenPlayerProfile = factory();
    if (typeof module === 'object' && module.exports) {
      try { module.exports = root.TienLenPlayerProfile; } catch (_) {}
    }
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TienLenPlayerProfile = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var USER_KEY = 'tienlen_player_username_v1';
  var RESERVED = {
    admin: 1, ai: 1, bot: 1, computer: 1, guest: 1, system: 1, null: 1,
    undefined: 1, you: 1, player: 1, anonymous: 1, tienlen: 1, gm: 1
  };
  var USER_RE = /^[a-zA-Z][a-zA-Z0-9_-]{2,19}$/;

  function normalize(name) {
    return String(name || '').trim();
  }

  function normalizeKey(name) {
    return normalize(name).toLowerCase();
  }

  function getUsername() {
    try {
      if (typeof localStorage === 'undefined') return '';
      return normalize(localStorage.getItem(USER_KEY) || '');
    } catch (e) {
      return '';
    }
  }

  function setUsername(name) {
    var n = normalize(name);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(USER_KEY, n);
    } catch (e) { /* ignore */ }
    return n;
  }

  function clearUsername() {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(USER_KEY);
    } catch (e) { /* ignore */ }
  }

  function hasUsername() {
    return !!getUsername();
  }

  /**
   * Validate format. Returns { ok, error }.
   */
  function validateFormat(name) {
    var n = normalize(name);
    if (!n) return { ok: false, error: 'Username is required' };
    if (n.length < 3) return { ok: false, error: 'At least 3 characters' };
    if (n.length > 20) return { ok: false, error: 'Max 20 characters' };
    if (!USER_RE.test(n)) {
      return { ok: false, error: 'Start with a letter; use letters, numbers, _ or -' };
    }
    if (RESERVED[normalizeKey(n)]) {
      return { ok: false, error: 'That name is reserved' };
    }
    return { ok: true, username: n };
  }

  /**
   * Collect usernames seen in playlogs (case-insensitive keys).
   * Kept for analytics / UI hints; not used to block sign-in (honor system).
   * map: { lowerName: displayName }
   */
  function collectTakenUsernames(gamesOrSummaries) {
    var taken = Object.create(null);
    var list = gamesOrSummaries || [];
    for (var i = 0; i < list.length; i++) {
      var g = list[i];
      if (!g) continue;
      var u = g.username || (g.player && g.player.username) || null;
      if (!u && g.env && g.env.username) u = g.env.username;
      if (!u) continue;
      var k = normalizeKey(u);
      if (k && !taken[k]) taken[k] = normalize(u);
    }
    return taken;
  }

  /**
   * Validate format only. Usernames are reusable across browsers (honor system);
   * public playlogs + leaderboard merge by case-insensitive name.
   * opts.takenMap is ignored (kept for API compatibility).
   */
  function validateUsername(name, opts) {
    opts = opts || {};
    var fmt = validateFormat(name);
    if (!fmt.ok) return fmt;
    return { ok: true, username: fmt.username };
  }

  /**
   * Build leaderboard rows from full playlog games.
   * Ranking: GM (grandmaster) vs AI games only, by mode bucket.
   *
   * modeFilter: 'all' | '1v1' | 'multi'
   * Returns { rows, meta }
   */
  function buildLeaderboard(games, opts) {
    opts = opts || {};
    var modeFilter = opts.modeFilter || 'all';
    var minGames = opts.minGames != null ? opts.minGames : 3;
    var onlyGm = opts.onlyGrandmaster !== false;
    var latestAiOnly = opts.latestAiOnly !== false;

    var list = games || [];
    // Find latest AI build id among GM vsAI completes
    var latestBuild = null;
    var latestStamp = '';
    var i, g, diff, vsAI, complete, nP, buildId, stamped;
    for (i = 0; i < list.length; i++) {
      g = list[i];
      if (!g || !g.username) continue;
      diff = String(g.aiDifficulty || '').toLowerCase();
      vsAI = g.vsAI !== false && (g.mode === 'vsAI' || g.mode == null || String(g.mode).indexOf('vsAI') >= 0 || String(g.mode).indexOf('ai') >= 0);
      if (!vsAI) continue;
      if (onlyGm && diff !== 'grandmaster' && diff !== 'gm') continue;
      complete = g.complete || (g.result && (g.result.humanWon === true || g.result.humanWon === false)) ||
        g.humanWon === true || g.humanWon === false;
      if (!complete) continue;
      buildId = (g.aiBuild && (g.aiBuild.id || g.aiBuild.label)) || g.aiBuildId || g.aiBuildLabel || 'unknown';
      stamped = (g.aiBuild && g.aiBuild.stamped) || g.endedAt || g.startedAt || '';
      if (!latestBuild || String(stamped) > String(latestStamp)) {
        latestBuild = String(buildId);
        latestStamp = String(stamped);
      }
    }

    // Aggregate by username + mode bucket (+ optional ai build)
    var map = Object.create(null);
    for (i = 0; i < list.length; i++) {
      g = list[i];
      if (!g || !g.username) continue;
      var uname = normalize(g.username);
      diff = String(g.aiDifficulty || '').toLowerCase();
      vsAI = g.vsAI !== false && (
        g.mode === 'vsAI' || g.mode == null ||
        String(g.mode).indexOf('vsAI') >= 0 ||
        String(g.mode).indexOf('ai') >= 0 ||
        String(g.mode).toLowerCase() === 'vs computer'
      );
      // hotseat human-only: skip
      if (g.mode === 'hotseat' || g.mode === 'live' || g.mode === 'online') {
        // multiplayer human games don't count for "vs AI" leaderboard
        if (g.vsAI === false) continue;
      }
      if (!vsAI && g.vsAI !== true) {
        // if mode unclear but aiSeats present
        if (!(g.aiSeats && g.aiSeats.length)) continue;
      }
      if (onlyGm && diff && diff !== 'grandmaster' && diff !== 'gm' && diff !== 'hard') {
        // allow hard only if not onlyGm... we stick to GM
        if (onlyGm && diff !== 'grandmaster' && diff !== 'gm') continue;
      }
      if (onlyGm && diff !== 'grandmaster' && diff !== 'gm') continue;

      nP = g.numPlayers || 2;
      var modeBucket = nP <= 2 ? '1v1' : 'multi';
      if (modeFilter === '1v1' && modeBucket !== '1v1') continue;
      if (modeFilter === 'multi' && modeBucket !== 'multi') continue;

      buildId = (g.aiBuild && g.aiBuild.id) || g.aiBuildId || 'unknown';
      if (latestAiOnly && latestBuild && String(buildId) !== String(latestBuild)) continue;

      var humanWon = g.humanWon;
      if (humanWon == null && g.result) humanWon = g.result.humanWon;
      if (humanWon !== true && humanWon !== false) continue;

      var key = normalizeKey(uname) + '|' + modeBucket + '|' + buildId;
      if (!map[key]) {
        map[key] = {
          username: uname,
          mode: modeBucket,
          numPlayers: nP,
          aiBuildId: buildId,
          aiBuildLabel: (g.aiBuild && g.aiBuild.label) || g.aiBuildLabel || buildId,
          games: 0,
          wins: 0,
          losses: 0,
          lastPlayed: g.endedAt || g.startedAt || null
        };
      }
      var row = map[key];
      row.games++;
      if (humanWon === true) row.wins++;
      else row.losses++;
      var t = g.endedAt || g.startedAt;
      if (t && (!row.lastPlayed || String(t) > String(row.lastPlayed))) row.lastPlayed = t;
    }

    var rows = [];
    for (var k in map) {
      if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
      var r = map[k];
      if (r.games < minGames) continue;
      r.winRate = r.games ? r.wins / r.games : 0;
      rows.push(r);
    }
    rows.sort(function (a, b) {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.games !== a.games) return b.games - a.games;
      return String(a.username).localeCompare(String(b.username));
    });

    return {
      rows: rows,
      meta: {
        latestAiBuildId: latestBuild,
        latestAiStamp: latestStamp,
        minGames: minGames,
        modeFilter: modeFilter,
        onlyGrandmaster: onlyGm,
        latestAiOnly: latestAiOnly,
        totalGamesScanned: list.length
      }
    };
  }

  return {
    USER_KEY: USER_KEY,
    getUsername: getUsername,
    setUsername: setUsername,
    clearUsername: clearUsername,
    hasUsername: hasUsername,
    validateFormat: validateFormat,
    validateUsername: validateUsername,
    collectTakenUsernames: collectTakenUsernames,
    normalize: normalize,
    normalizeKey: normalizeKey,
    buildLeaderboard: buildLeaderboard
  };
}));
