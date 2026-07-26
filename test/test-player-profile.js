/**
 * Node tests for player-profile: username validation + leaderboard.
 */
'use strict';

const assert = require('assert');
const profile = require('../player-profile.js');

let passed = 0;
let failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log('PASS:', msg); }
  else { failed++; console.log('FAIL:', msg); }
}

console.log('=== player-profile format ===');
{
  ok(profile.validateFormat('').ok === false, 'empty rejected');
  ok(profile.validateFormat('ab').ok === false, 'too short rejected');
  ok(profile.validateFormat('1abc').ok === false, 'leading digit rejected');
  ok(profile.validateFormat('admin').ok === false, 'reserved rejected');
  ok(profile.validateFormat('AI').ok === false, 'reserved AI rejected');
  ok(profile.validateFormat('DragonAce').ok === true, 'valid DragonAce');
  ok(profile.validateFormat('john_v2').ok === true, 'valid underscore');
  ok(profile.validateFormat('x-Y9_z').ok === true, 'valid mixed');
  ok(profile.validateFormat('a'.repeat(21)).ok === false, 'too long rejected');
}

console.log('=== player-profile uniqueness ===');
{
  const taken = profile.collectTakenUsernames([
    { username: 'Alice' },
    { username: 'bob' },
    { env: { username: 'Carol' } }
  ]);
  ok(!!taken.alice && !!taken.bob && !!taken.carol, 'collectTakenUsernames keys');
  const clash = profile.validateUsername('ALICE', { takenMap: taken });
  ok(clash.ok === false, 'case-insensitive clash');
  const free = profile.validateUsername('Zed99', { takenMap: taken });
  ok(free.ok === true && free.username === 'Zed99', 'free name ok');
  // allowSelf
  const self = profile.validateUsername('Alice', { takenMap: taken, allowSelf: 'Alice' });
  ok(self.ok === true, 'allowSelf keeps own name');
}

console.log('=== player-profile leaderboard ===');
{
  const games = [
    {
      username: 'Ace', mode: 'vsAI', vsAI: true, numPlayers: 2,
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', label: 'L2s444', stamped: '2026-07-26' },
      humanWon: true, endedAt: '2026-07-26T01:00:00Z', complete: true
    },
    {
      username: 'Ace', mode: 'vsAI', vsAI: true, numPlayers: 2,
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', label: 'L2s444', stamped: '2026-07-26' },
      humanWon: true, endedAt: '2026-07-26T01:10:00Z', complete: true
    },
    {
      username: 'Ace', mode: 'vsAI', vsAI: true, numPlayers: 2,
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', label: 'L2s444', stamped: '2026-07-26' },
      humanWon: false, endedAt: '2026-07-26T01:20:00Z', complete: true
    },
    {
      username: 'Bob', mode: 'vsAI', vsAI: true, numPlayers: 4,
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', label: 'L2s444', stamped: '2026-07-26' },
      result: { humanWon: true }, endedAt: '2026-07-26T02:00:00Z', complete: true
    },
    {
      username: 'Bob', mode: 'vsAI', vsAI: true, numPlayers: 4,
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', label: 'L2s444', stamped: '2026-07-26' },
      result: { humanWon: true }, endedAt: '2026-07-26T02:10:00Z', complete: true
    },
    {
      username: 'Bob', mode: 'vsAI', vsAI: true, numPlayers: 4,
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', label: 'L2s444', stamped: '2026-07-26' },
      result: { humanWon: true }, endedAt: '2026-07-26T02:20:00Z', complete: true
    },
    // older AI build — excluded when latestAiOnly
    {
      username: 'Old', mode: 'vsAI', vsAI: true, numPlayers: 2,
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s100', label: 'old', stamped: '2026-01-01' },
      humanWon: true, endedAt: '2026-01-02T00:00:00Z', complete: true
    },
    {
      username: 'Old', mode: 'vsAI', vsAI: true, numPlayers: 2,
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s100', label: 'old', stamped: '2026-01-01' },
      humanWon: true, endedAt: '2026-01-03T00:00:00Z', complete: true
    },
    {
      username: 'Old', mode: 'vsAI', vsAI: true, numPlayers: 2,
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s100', label: 'old', stamped: '2026-01-01' },
      humanWon: true, endedAt: '2026-01-04T00:00:00Z', complete: true
    },
    // easy — excluded
    {
      username: 'Noob', mode: 'vsAI', vsAI: true, numPlayers: 2,
      aiDifficulty: 'easy', aiBuild: { id: 'v1.0-sh-L2s444', stamped: '2026-07-26' },
      humanWon: true, endedAt: '2026-07-26T03:00:00Z', complete: true
    }
  ];

  const all = profile.buildLeaderboard(games, { modeFilter: 'all', minGames: 3, latestAiOnly: true });
  ok(all.meta.latestAiBuildId === 'v1.0-sh-L2s444', 'detects latest AI build');
  ok(all.rows.length === 2, 'two ranked players on latest GM (Ace + Bob)');
  ok(all.rows[0].username === 'Bob' && all.rows[0].winRate === 1, 'Bob ranks first 100% WR multi');
  ok(all.rows[1].username === 'Ace' && Math.abs(all.rows[1].winRate - 2 / 3) < 1e-9, 'Ace second ~66%');

  const onev1 = profile.buildLeaderboard(games, { modeFilter: '1v1', minGames: 3, latestAiOnly: true });
  ok(onev1.rows.length === 1 && onev1.rows[0].username === 'Ace', '1v1 only Ace');

  const multi = profile.buildLeaderboard(games, { modeFilter: 'multi', minGames: 3, latestAiOnly: true });
  ok(multi.rows.length === 1 && multi.rows[0].username === 'Bob', 'multi only Bob');

  const allBuilds = profile.buildLeaderboard(games, { modeFilter: 'all', minGames: 3, latestAiOnly: false });
  ok(allBuilds.rows.some(function (r) { return r.username === 'Old'; }), 'Old included when latestAiOnly false');
}

console.log('=== player-profile localStorage (memory shim) ===');
{
  // Node has no localStorage — get/set should no-op safely
  const before = profile.getUsername();
  ok(typeof before === 'string', 'getUsername returns string without localStorage');
  profile.setUsername('TempUser');
  // Without localStorage, hasUsername may still be false — that's OK
  ok(true, 'setUsername does not throw without localStorage');
}

console.log('\n=== RESULT: ' + passed + ' passed, ' + failed + ' failed ===');
if (failed) process.exit(1);
