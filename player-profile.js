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
   * Complete finishOrder: winners first, loser last, then any missing seats.
   */
  function completeFinishOrder(finishOrder, loser, numPlayers) {
    var order = Array.isArray(finishOrder) ? finishOrder.slice() : [];
    var n = numPlayers != null ? numPlayers : Math.max(order.length, 2);
    if (loser != null && order.indexOf(loser) < 0) order.push(loser);
    var s;
    for (s = 0; s < n; s++) {
      if (order.indexOf(s) < 0) order.push(s);
    }
    return order;
  }

  /**
   * Human placement 1..n (1 = first to finish). null if unknown.
   */
  function humanPlacement(g) {
    if (!g) return null;
    if (g.humanPlacement != null && g.humanPlacement >= 1) return Number(g.humanPlacement);
    if (g.result && g.result.humanPlacement != null && g.result.humanPlacement >= 1) {
      return Number(g.result.humanPlacement);
    }
    var n = g.numPlayers || 2;
    var humanSeats = g.humanSeats;
    if (!humanSeats && g.result && g.result.humanSeats) humanSeats = g.result.humanSeats;
    if (!Array.isArray(humanSeats) || !humanSeats.length) humanSeats = [0];
    var seat = humanSeats[0];
    var fo = (g.result && g.result.finishOrder) || g.finishOrder || null;
    var loser = g.result && g.result.loser != null ? g.result.loser : g.loser;
    if (fo && fo.length) {
      var order = completeFinishOrder(fo, loser, n);
      var idx = order.indexOf(seat);
      if (idx >= 0) return idx + 1;
    }
    var hw = g.humanWon;
    if (hw == null && g.result) hw = g.result.humanWon;
    if (hw === true) return 1;
    if (hw === false && n <= 2) return 2;
    // multi without order: if we only know they lost first place, cannot rank
    return null;
  }

  function modeBucketFor(numPlayers) {
    var n = numPlayers || 2;
    if (n <= 2) return '1v1';
    if (n === 3) return '3p';
    if (n >= 4) return '4p';
    return '1v1';
  }

  function isVsAIGame(g) {
    if (!g) return false;
    if (g.vsAI === false) return false;
    if (g.vsAI === true) return true;
    var mode = String(g.mode || '').toLowerCase();
    if (mode === 'hotseat' || mode === 'live' || mode === 'online') return false;
    if (mode.indexOf('vsai') >= 0 || mode.indexOf('ai') >= 0 || mode === 'vs computer') return true;
    if (g.aiSeats && g.aiSeats.length) return true;
    // default product playlogs are vs AI when mode unset
    return mode === '' || mode === 'vsai' || g.mode == null;
  }

  function isGmDifficulty(diff) {
    var d = String(diff || '').toLowerCase();
    // empty/missing treated as grandmaster (product default)
    return !d || d === 'grandmaster' || d === 'gm';
  }

  function isCompleteGame(g) {
    if (!g) return false;
    if (g.result && g.result.abandoned) return false;
    if (g.abandoned) return false;
    if (g.complete) return true;
    if (g.endedAt) return true;
    if (g.result && (g.result.humanWon === true || g.result.humanWon === false)) return true;
    if (g.humanWon === true || g.humanWon === false) return true;
    if (g.result && g.result.finishOrder && g.result.finishOrder.length) return true;
    return false;
  }

  /**
   * Build leaderboard rows from full playlog games.
   * - 1v1: rank by win rate (also show 1st/2nd counts)
   * - 3p / 4p: rank by best (lowest) average placement; show #1st..#4th
   *
   * modeFilter: 'all' | '1v1' | '3p' | '4p' | 'multi' (multi = 3p+4p combined view as separate rows)
   * Returns { rows, meta }
   */
  function buildLeaderboard(games, opts) {
    opts = opts || {};
    var modeFilter = opts.modeFilter || 'all';
    if (modeFilter === 'multi') modeFilter = 'multi'; // 3p+4p both included as distinct mode buckets
    var onlyGm = opts.onlyGrandmaster !== false;
    // 1v1 defaults to latest AI only; multi defaults to all GM builds so sparse family play shows up
    var isMultiFilter = modeFilter === '3p' || modeFilter === '4p' || modeFilter === 'multi';
    var latestAiOnly = opts.latestAiOnly != null
      ? !!opts.latestAiOnly
      : !isMultiFilter;
    var minGames = opts.minGames != null
      ? opts.minGames
      : (isMultiFilter ? 1 : 3);

    var list = games || [];
    var latestBuild = null;
    var latestStamp = '';
    var i, g, diff, nP, buildId, stamped, place, modeBucket, humanWon, uname, key, row, t;

    for (i = 0; i < list.length; i++) {
      g = list[i];
      if (!g || !g.username) continue;
      if (!isVsAIGame(g)) continue;
      if (onlyGm && !isGmDifficulty(g.aiDifficulty)) continue;
      if (!isCompleteGame(g)) continue;
      buildId = (g.aiBuild && (g.aiBuild.id || g.aiBuild.label)) || g.aiBuildId || g.aiBuildLabel || 'unknown';
      stamped = (g.aiBuild && g.aiBuild.stamped) || g.endedAt || g.startedAt || '';
      if (!latestBuild || String(stamped) > String(latestStamp)) {
        latestBuild = String(buildId);
        latestStamp = String(stamped);
      }
    }

    var map = Object.create(null);
    for (i = 0; i < list.length; i++) {
      g = list[i];
      if (!g || !g.username) continue;
      uname = normalize(g.username);
      if (!isVsAIGame(g)) continue;
      if (onlyGm && !isGmDifficulty(g.aiDifficulty)) continue;
      if (!isCompleteGame(g)) continue;

      nP = g.numPlayers || 2;
      modeBucket = modeBucketFor(nP);
      if (modeFilter === '1v1' && modeBucket !== '1v1') continue;
      if (modeFilter === '3p' && modeBucket !== '3p') continue;
      if (modeFilter === '4p' && modeBucket !== '4p') continue;
      if (modeFilter === 'multi' && modeBucket === '1v1') continue;
      // 'all' keeps every bucket

      buildId = (g.aiBuild && (g.aiBuild.id || g.aiBuild.label)) || g.aiBuildId || g.aiBuildLabel || 'unknown';
      if (latestAiOnly && latestBuild && String(buildId) !== String(latestBuild)) continue;

      place = humanPlacement(g);
      humanWon = g.humanWon;
      if (humanWon == null && g.result) humanWon = g.result.humanWon;
      // Multi needs a known placement; 1v1 can use win/loss alone
      if (modeBucket !== '1v1' && place == null) continue;
      if (modeBucket === '1v1' && humanWon !== true && humanWon !== false && place == null) continue;

      // Aggregate by username + mode (merge all builds when not latest-only; still label latest-ish)
      key = normalizeKey(uname) + '|' + modeBucket + (latestAiOnly ? ('|' + buildId) : '');
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
          placementSum: 0,
          placementCount: 0,
          placeCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
          lastPlayed: g.endedAt || g.startedAt || null
        };
      }
      row = map[key];
      row.games++;
      if (humanWon === true || place === 1) row.wins++;
      else if (humanWon === false || (place != null && place > 1)) row.losses++;
      if (place != null && place >= 1) {
        row.placementSum += place;
        row.placementCount++;
        if (place <= 4) row.placeCounts[place] = (row.placeCounts[place] || 0) + 1;
        else row.placeCounts[4] = (row.placeCounts[4] || 0) + 1; // cap display at 4th+
      }
      t = g.endedAt || g.startedAt;
      if (t && (!row.lastPlayed || String(t) > String(row.lastPlayed))) row.lastPlayed = t;
      // Prefer newest build label when merging builds
      if (g.aiBuild && g.aiBuild.stamped && (!row._stamp || String(g.aiBuild.stamped) > String(row._stamp))) {
        row._stamp = g.aiBuild.stamped;
        row.aiBuildId = buildId;
        row.aiBuildLabel = (g.aiBuild && g.aiBuild.label) || g.aiBuildLabel || buildId;
      }
    }

    var rows = [];
    for (var k in map) {
      if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
      row = map[k];
      if (row.games < minGames) continue;
      row.winRate = row.games ? row.wins / row.games : 0;
      row.avgPlacement = row.placementCount ? (row.placementSum / row.placementCount) : null;
      delete row._stamp;
      rows.push(row);
    }

    rows.sort(function (a, b) {
      var aMulti = a.mode === '3p' || a.mode === '4p';
      var bMulti = b.mode === '3p' || b.mode === '4p';
      // Within multi filters / mixed all: multi rows by avg placement, 1v1 by WR
      if (aMulti && bMulti) {
        var ap = a.avgPlacement != null ? a.avgPlacement : 99;
        var bp = b.avgPlacement != null ? b.avgPlacement : 99;
        if (ap !== bp) return ap - bp; // lower (better) first
        if (b.placeCounts[1] !== a.placeCounts[1]) return b.placeCounts[1] - a.placeCounts[1];
        if (b.games !== a.games) return b.games - a.games;
        return String(a.username).localeCompare(String(b.username));
      }
      if (aMulti !== bMulti) return aMulti ? 1 : -1; // 1v1 section first in 'all'
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
        totalGamesScanned: list.length,
        rankBy: isMultiFilter ? 'avgPlacement' : (modeFilter === 'all' ? 'mixed' : 'winRate')
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
    completeFinishOrder: completeFinishOrder,
    humanPlacement: humanPlacement,
    modeBucketFor: modeBucketFor,
    buildLeaderboard: buildLeaderboard
  };
}));
