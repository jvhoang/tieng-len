/**
 * Node tests for player-profile: username validation + leaderboard.
 */
'use strict';

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
  ok(profile.validateFormat('JVH').ok === true, 'JVH valid');
}

console.log('=== player-profile reuse (honor system, not unique) ===');
{
  const taken = profile.collectTakenUsernames([
    { username: 'Alice' },
    { username: 'bob' },
    { env: { username: 'Carol' } },
    { username: 'JVH' }
  ]);
  ok(!!taken.alice && !!taken.bob && !!taken.carol && !!taken.jvh, 'collectTakenUsernames keys');
  const clash = profile.validateUsername('ALICE', { takenMap: taken });
  ok(clash.ok === true && clash.username === 'ALICE', 'reuse allowed — not unique');
  const jvh = profile.validateUsername('JVH', { takenMap: taken });
  ok(jvh.ok === true && jvh.username === 'JVH', 'JVH reusable on another browser');
  ok(profile.normalizeKey('JVH') === profile.normalizeKey('jvh'), 'case-insensitive merge key');
}

console.log('=== placement helpers ===');
{
  ok(profile.humanPlacement({
    numPlayers: 4, humanSeats: [0],
    result: { finishOrder: [2, 0, 1], loser: 3 }
  }) === 2, '4p human 2nd from finishOrder+loser');
  ok(profile.humanPlacement({
    numPlayers: 4, humanSeats: [0],
    result: { finishOrder: [0, 1, 3], loser: 2, humanWon: true }
  }) === 1, '4p human 1st');
  ok(profile.humanPlacement({
    numPlayers: 2, humanSeats: [0], humanWon: false
  }) === 2, '1v1 loss → 2nd');
  ok(profile.modeBucketFor(2) === '1v1' && profile.modeBucketFor(3) === '3p' && profile.modeBucketFor(4) === '4p',
    'mode buckets 1v1/3p/4p');
}

console.log('=== player-profile leaderboard 1v1 + 3p/4p placement ===');
{
  const games = [
    // Ace 1v1 2W-1L on latest
    {
      username: 'Ace', mode: 'vsAI', vsAI: true, numPlayers: 2, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', label: 'L2s444', stamped: '2026-07-26' },
      humanWon: true, result: { humanWon: true, finishOrder: [0, 1], humanPlacement: 1 },
      endedAt: '2026-07-26T01:00:00Z', complete: true
    },
    {
      username: 'Ace', mode: 'vsAI', vsAI: true, numPlayers: 2, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', label: 'L2s444', stamped: '2026-07-26' },
      humanWon: true, result: { humanWon: true, finishOrder: [0, 1], humanPlacement: 1 },
      endedAt: '2026-07-26T01:10:00Z', complete: true
    },
    {
      username: 'Ace', mode: 'vsAI', vsAI: true, numPlayers: 2, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', label: 'L2s444', stamped: '2026-07-26' },
      humanWon: false, result: { humanWon: false, finishOrder: [1, 0], humanPlacement: 2 },
      endedAt: '2026-07-26T01:20:00Z', complete: true
    },
    // JVH 4p — three games with placements (should show on 4p board, min 1)
    {
      username: 'JVH', mode: 'vsAI', vsAI: true, numPlayers: 4, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', label: 'L2s444', stamped: '2026-07-26' },
      result: { humanWon: false, finishOrder: [1, 0, 2], loser: 3, humanPlacement: 2 },
      endedAt: '2026-07-26T02:00:00Z', complete: true
    },
    {
      username: 'JVH', mode: 'vsAI', vsAI: true, numPlayers: 4, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s337', label: 'L2s337', stamped: '2026-07-20' },
      result: { humanWon: true, finishOrder: [0, 2, 1], loser: 3, humanPlacement: 1 },
      endedAt: '2026-07-26T02:10:00Z', complete: true
    },
    {
      username: 'JVH', mode: 'vsAI', vsAI: true, numPlayers: 4, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s337', label: 'L2s337', stamped: '2026-07-20' },
      result: { humanWon: false, finishOrder: [2, 1, 0], loser: 3, humanPlacement: 3 },
      endedAt: '2026-07-26T02:20:00Z', complete: true
    },
    // Sam 3p better avg place than JVH would be on 3p
    {
      username: 'Sam', mode: 'vsAI', vsAI: true, numPlayers: 3, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', stamped: '2026-07-26' },
      result: { humanWon: true, finishOrder: [0, 1], loser: 2, humanPlacement: 1 },
      endedAt: '2026-07-26T03:00:00Z', complete: true
    },
    {
      username: 'Sam', mode: 'vsAI', vsAI: true, numPlayers: 3, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', stamped: '2026-07-26' },
      result: { humanWon: false, finishOrder: [1, 0], loser: 2, humanPlacement: 2 },
      endedAt: '2026-07-26T03:10:00Z', complete: true
    },
    // Bob 4p always 1st — better avg than JVH
    {
      username: 'Bob', mode: 'vsAI', vsAI: true, numPlayers: 4, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', stamped: '2026-07-26' },
      result: { humanWon: true, finishOrder: [0, 1, 2], loser: 3, humanPlacement: 1 },
      endedAt: '2026-07-26T04:00:00Z', complete: true
    },
    {
      username: 'Bob', mode: 'vsAI', vsAI: true, numPlayers: 4, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', stamped: '2026-07-26' },
      result: { humanWon: true, finishOrder: [0, 2, 1], loser: 3, humanPlacement: 1 },
      endedAt: '2026-07-26T04:10:00Z', complete: true
    },
    // older 1v1 only when latestAiOnly false
    {
      username: 'Old', mode: 'vsAI', vsAI: true, numPlayers: 2, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s100', stamped: '2026-01-01' },
      humanWon: true, endedAt: '2026-01-02T00:00:00Z', complete: true
    },
    {
      username: 'Old', mode: 'vsAI', vsAI: true, numPlayers: 2, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s100', stamped: '2026-01-01' },
      humanWon: true, endedAt: '2026-01-03T00:00:00Z', complete: true
    },
    {
      username: 'Old', mode: 'vsAI', vsAI: true, numPlayers: 2, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s100', stamped: '2026-01-01' },
      humanWon: true, endedAt: '2026-01-04T00:00:00Z', complete: true
    },
    // abandoned multi — excluded
    {
      username: 'JVH', mode: 'vsAI', vsAI: true, numPlayers: 4, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', stamped: '2026-07-26' },
      result: { abandoned: true }, endedAt: '2026-07-26T05:00:00Z', complete: true
    }
  ];

  const onev1 = profile.buildLeaderboard(games, { modeFilter: '1v1', minGames: 3, latestAiOnly: true });
  ok(onev1.rows.length === 1 && onev1.rows[0].username === 'Ace', '1v1 only Ace on latest');
  ok(Math.abs(onev1.rows[0].winRate - 2 / 3) < 1e-9, 'Ace ~66% WR');
  ok(onev1.rows[0].winRateLo != null && onev1.rows[0].winRateLo < onev1.rows[0].winRate,
    'Ace has Wilson LB below raw WR');
  ok(onev1.rows[0].placeCounts[1] === 2 && onev1.rows[0].placeCounts[2] === 1, 'Ace 2×1st 1×2nd');
  ok(onev1.meta.rankBy === 'wilsonLB95', '1v1 ranks by Wilson 95% LB');

  // Wilson: tiny perfect record ranks below larger solid sample (same latest build)
  const wGames = [];
  for (let i = 0; i < 3; i++) {
    wGames.push({
      username: 'Lucky', mode: 'vsAI', vsAI: true, numPlayers: 2, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', stamped: '2026-07-26' },
      humanWon: true, endedAt: '2026-07-26T06:0' + i + ':00Z', complete: true
    });
  }
  for (let j = 0; j < 20; j++) {
    wGames.push({
      username: 'Steady', mode: 'vsAI', vsAI: true, numPlayers: 2, humanSeats: [0],
      aiDifficulty: 'grandmaster', aiBuild: { id: 'v1.0-sh-L2s444', stamped: '2026-07-26' },
      humanWon: j < 14, endedAt: '2026-07-26T07:' + String(j).padStart(2, '0') + ':00Z', complete: true
    });
  }
  const wBoard = profile.buildLeaderboard(wGames, { modeFilter: '1v1', minGames: 3, latestAiOnly: true });
  ok(wBoard.rows.length === 2, 'Wilson board has Lucky + Steady');
  const lucky = wBoard.rows.find(function (r) { return r.username === 'Lucky'; });
  const steady = wBoard.rows.find(function (r) { return r.username === 'Steady'; });
  ok(lucky && steady && lucky.winRate > steady.winRate, 'Lucky higher raw WR');
  ok(steady.winRateLo > lucky.winRateLo, 'Steady higher Wilson LB than Lucky 3-0');
  ok(wBoard.rows[0].username === 'Steady', 'Steady ranks #1 by Wilson LB not raw %');

  // Direct wilson helper
  const w3 = profile.wilsonInterval(3, 3, 1.96);
  const w14 = profile.wilsonInterval(14, 20, 1.96);
  ok(w3.wr === 1 && w3.lo < 0.9, '3/3 Wilson LB well below 100%');
  ok(w14.lo > w3.lo, '14/20 LB > 3/3 LB');

  const four = profile.buildLeaderboard(games, { modeFilter: '4p' });
  ok(four.meta.latestAiOnly === false, '4p defaults latestAiOnly false');
  ok(four.meta.minGames === 1, '4p defaults minGames 1');
  const jvh4 = four.rows.find(function (r) { return r.username === 'JVH'; });
  ok(!!jvh4, 'JVH appears on 4p board');
  ok(jvh4.games === 3, 'JVH 3 finished 4p games (abandoned excluded)');
  // places 2, 1, 3 → avg 2.0
  ok(Math.abs(jvh4.avgPlacement - 2) < 1e-9, 'JVH avg placement 2.0');
  ok(jvh4.placeCounts[1] === 1 && jvh4.placeCounts[2] === 1 && jvh4.placeCounts[3] === 1,
    'JVH place counts 1st/2nd/3rd');
  ok(four.rows[0].username === 'Bob', 'Bob ranks first on 4p (avg 1.0)');
  ok(four.rows[0].avgPlacement === 1, 'Bob avg place 1');

  const three = profile.buildLeaderboard(games, { modeFilter: '3p' });
  ok(three.rows.length === 1 && three.rows[0].username === 'Sam', '3p only Sam');
  ok(Math.abs(three.rows[0].avgPlacement - 1.5) < 1e-9, 'Sam avg 1.5');

  // multi filter includes 3p+4p as separate rows
  const multi = profile.buildLeaderboard(games, { modeFilter: 'multi' });
  ok(multi.rows.some(function (r) { return r.username === 'JVH' && r.mode === '4p'; }), 'multi filter has JVH 4p');
  ok(multi.rows.some(function (r) { return r.username === 'Sam' && r.mode === '3p'; }), 'multi filter has Sam 3p');
  ok(!multi.rows.some(function (r) { return r.mode === '1v1'; }), 'multi filter excludes 1v1');
}

console.log('=== player-profile localStorage (memory shim) ===');
{
  const before = profile.getUsername();
  ok(typeof before === 'string', 'getUsername returns string without localStorage');
  profile.setUsername('TempUser');
  ok(true, 'setUsername does not throw without localStorage');
}

console.log('\n=== RESULT: ' + passed + ' passed, ' + failed + ' failed ===');
if (failed) process.exit(1);
