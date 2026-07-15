'use strict';
/**
 * One-shot CERT harness (H6). Call only AFTER freezing model SHA.
 *
 * Usage:
 *   CHALL=milestone-L0-v1 FREEZE=v60 GAMES=100 \
 *     node evolve/cert-run.js
 *
 * Ship thresholds enforced when SHIP_GATE=1 (default off for dry-run plumbing).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const REG = path.join(ROOT, 'evolve', 'eval-registry', 'cert');
const CHALL = process.env.CHALL || 'milestone-L0-v1';
const FREEZE = process.env.FREEZE || 'v60';
const GAMES = parseInt(process.env.GAMES || '300', 10); // deal seeds; both seats → 2*GAMES games
const SHIP_GATE = process.env.SHIP_GATE === '1';
const TRIALS = parseInt(process.env.TRIALS || '20', 10);
const W_MAX = Math.max(1, Math.floor((os.cpus().length || 2) / 2));

function ban(s) {
  return s === 20260801 || s === 20260802 || s === 20260711 || s === 20260712;
}
function genSeeds(n) {
  const out = [];
  const seen = Object.create(null);
  while (out.length < n) {
    const s = 2000000000 + (crypto.randomBytes(4).readUInt32BE(0) % 900000000);
    if (ban(s) || seen[s]) continue;
    seen[s] = 1;
    out.push(s);
  }
  return out;
}
function wilson(wins, n, z) {
  z = z == null ? 1.96 : z;
  if (n <= 0) return { lo: 0, hi: 1, wr: 0 };
  const ph = wins / n;
  const den = 1 + (z * z) / n;
  const center = (ph + (z * z) / (2 * n)) / den;
  const half = (z * Math.sqrt((ph * (1 - ph) + (z * z) / (4 * n)) / n)) / den;
  return { lo: center - half, hi: center + half, wr: ph };
}

function main() {
  try { fs.mkdirSync(REG); } catch (e) {
    if (e.code !== 'EEXIST') {
      try { fs.mkdirSync(path.dirname(REG)); } catch (e2) { if (e2.code !== 'EEXIST') throw e2; }
      try { fs.mkdirSync(REG); } catch (e3) { if (e3.code !== 'EEXIST') throw e3; }
    }
  }
  const freezeSha = process.env.FREEZE_SHA || 'UNSET';
  const stamped = new Date().toISOString();
  if (SHIP_GATE && freezeSha === 'UNSET') {
    console.error('SHIP_GATE=1 requires FREEZE_SHA=git-commit after model freeze');
    process.exit(3);
  }

  const seeds = genSeeds(GAMES);
  // 3 blocks
  const blockSize = Math.floor(seeds.length / 3);
  const blocks = [
    seeds.slice(0, blockSize),
    seeds.slice(blockSize, 2 * blockSize),
    seeds.slice(2 * blockSize)
  ];
  const seedSet = {
    protocol: 'cert-oneshot-v1',
    stamped: stamped,
    freezeSha: freezeSha,
    chall: CHALL,
    freeze: FREEZE,
    bothSeats: true,
    A: seeds,
    B: [],
    blocks: blocks.map(function (b, i) { return { id: i, seeds: b }; }),
    note: 'Generated at cert time AFTER model freeze. Do not residual-pack. One shot only.'
  };
  const stampFile = stamped.replace(/[:.]/g, '-');
  const seedPath = path.join(REG, 'cert-' + stampFile + '-seeds.json');
  fs.writeFileSync(seedPath, JSON.stringify(seedSet, null, 2));

  const outPath = path.join(REG, 'cert-' + stampFile + '-vs-' + FREEZE + '.json');
  const env = Object.assign({}, process.env, {
    CHALL: CHALL,
    FREEZE: FREEZE,
    SEED_SET: seedPath,
    OUT: outPath,
    GAMES: String(GAMES),
    BOTH_SEATS: '1',
    SKIP_IDENTITY: process.env.SKIP_IDENTITY || '0',
    SOFT: '0',
    MS: process.env.MS || '0',
    TRIALS: String(TRIALS)
  });
  console.log(JSON.stringify({
    certStart: true,
    freezeSha: freezeSha,
    nSeeds: seeds.length,
    expectedGames: seeds.length * 2,
    wMax: W_MAX,
    seedPath: seedPath
  }));

  const r = spawnSync(process.execPath, [path.join(ROOT, 'evolve', 'fresh-seed-fair-dual.js')], {
    cwd: ROOT,
    env: env,
    encoding: 'utf8',
    maxBuffer: 80 * 1024 * 1024
  });
  if (!fs.existsSync(outPath)) {
    console.error('CERT dual failed', r.status, (r.stderr || '').slice(-800), (r.stdout || '').slice(-800));
    process.exit(1);
  }
  const dual = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  const per = (dual.chall && dual.chall.A && dual.chall.A.perGame) || [];
  // also B if any
  const perB = (dual.chall && dual.chall.B && dual.chall.B.perGame) || [];
  const all = per.concat(perB);
  let wins = 0;
  for (const g of all) if (g.liveWin) wins++;
  const n = all.length;
  const w = wilson(wins, n);

  // per-block WR using seed membership
  const blockStats = blocks.map(function (bseeds, i) {
    const set = Object.create(null);
    for (const s of bseeds) set[s] = 1;
    let bw = 0, bn = 0;
    for (const g of all) {
      if (set[g.seed]) {
        bn++;
        if (g.liveWin) bw++;
      }
    }
    return { block: i, wins: bw, games: bn, wr: bn ? bw / bn : 0, wilson: wilson(bw, bn) };
  });

  const shipOk =
    n >= 600 &&
    w.wr >= 0.9 &&
    w.lo > 0.87 &&
    blockStats.every(function (b) { return b.wr >= 0.88; });

  const report = {
    protocol: 'cert-oneshot-v1',
    stamped: stamped,
    freezeSha: freezeSha,
    certAfterFreeze: freezeSha !== 'UNSET',
    chall: CHALL,
    freeze: FREEZE,
    seedPath: seedPath,
    dualPath: outPath,
    nGames: n,
    wins: wins,
    wr: w.wr,
    wilson: w,
    blocks: blockStats,
    shipGate: SHIP_GATE,
    shipOk: shipOk,
    shipThresholds: {
      minGames: 600,
      minWR: 0.9,
      minWilsonLB: 0.87,
      minBlockWR: 0.88
    },
    forbid: 'Never residual-pack CERT seeds. Fail ⇒ new SHA + new CERT seeds.',
    wMax: W_MAX,
    dualExit: r.status
  };
  const reportPath = path.join(REG, 'cert-' + stampFile + '-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('=== CERT RESULT ===');
  console.log(JSON.stringify({
    reportPath: reportPath,
    wr: w.wr,
    wilsonLB: w.lo,
    nGames: n,
    blocks: blockStats.map(function (b) { return { i: b.block, wr: b.wr }; }),
    shipOk: shipOk
  }, null, 2));

  if (SHIP_GATE && !shipOk) process.exit(2);
  process.exit(0);
}

main();
