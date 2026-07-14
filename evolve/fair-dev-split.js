'use strict';
/**
 * Internal DEV split (anti-seed11 overfit) — design on first half of DEV seeds,
 * check on second half. Does NOT touch DEV_VAL or holdouts.
 *
 *   FREEZE=v91 CHALL=p_xxx node evolve/fair-dev-split.js
 *
 * DEV seed0=20260711, GAMES_DESIGN=12 → seats 24 games on g=0..11
 * DEV check GAMES_CHECK=13 → seats 26 games on g=12..24
 * Gate interest: design Δid≥+2 and check Δid≥+1 (and check WR ≥ design−0.08)
 * Full DEV (≥32/50) still required before DEV_VAL.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const freeze = process.env.FREEZE || 'v91';
const chall = process.env.CHALL || freeze;
const ms = process.env.MS || '150';
const trials = process.env.TRIALS || '12';
const soft = process.env.SOFT || '4';
const branch = process.env.BRANCH || '12';
const seed0 = 20260711;
const gamesDesign = parseInt(process.env.GAMES_DESIGN || '12', 10);
const gamesCheck = parseInt(process.env.GAMES_CHECK || '13', 10);
const dualJs = path.join(__dirname, 'lean-fair-dual-n20.js');

function run(tag, startG, games, outName) {
  const env = Object.assign({}, process.env, {
    FREEZE: freeze,
    CHALL: tag,
    SEED: String(seed0),
    START_G: String(startG),
    GAMES: String(games),
    BOTH_SEATS: '1',
    MS: String(ms),
    TRIALS: String(trials),
    SOFT: String(soft),
    BRANCH: String(branch),
    OUT: outName
  });
  const r = spawnSync(process.execPath, [dualJs], {
    cwd: path.join(__dirname, '..'),
    env: env,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
  const jp = path.join(__dirname, outName);
  if (!fs.existsSync(jp)) {
    console.error((r.stderr || '').slice(-800));
    throw new Error('missing ' + jp + ' status=' + r.status);
  }
  return JSON.parse(fs.readFileSync(jp, 'utf8'));
}

function summarize(label, idj, chj) {
  const n = chj.games;
  const idW = idj.liveWins;
  const chW = chj.liveWins;
  const d = chW - idW;
  const wr = chj.liveWinRate;
  return {
    label: label,
    n: n,
    idWins: idW,
    chWins: chW,
    wr: wr,
    delta: d,
    passInterest: d >= 2 && chW >= Math.ceil(n * 0.55)
  };
}

console.log('=== Fair DEV internal split ===');
console.log('freeze=' + freeze + ' chall=' + chall + ' design g=0..' + (gamesDesign - 1) +
  ' check g=' + gamesDesign + '..' + (gamesDesign + gamesCheck - 1));

// Include chall in all OUT names so parallel probe screens never clobber identity duals.
const tag = chall + '-vs-' + freeze;
const idDes = run(freeze, 0, gamesDesign, 'split-id-' + tag + '-des-n' + (gamesDesign * 2) + '.json');
const chDes = run(chall, 0, gamesDesign, 'split-ch-' + tag + '-des-n' + (gamesDesign * 2) + '.json');
const des = summarize('DESIGN g0-' + (gamesDesign - 1), idDes, chDes);

const idChk = run(freeze, gamesDesign, gamesCheck, 'split-id-' + tag + '-chk-n' + (gamesCheck * 2) + '.json');
const chChk = run(chall, gamesDesign, gamesCheck, 'split-ch-' + tag + '-chk-n' + (gamesCheck * 2) + '.json');
const chk = summarize('CHECK  g' + gamesDesign + '-' + (gamesDesign + gamesCheck - 1), idChk, chChk);

// combined full DEV (for reporting only; selection still uses full fair-eval-holdout)
const fullN = des.n + chk.n;
const fullCh = des.chWins + chk.chWins;
const fullId = des.idWins + chk.idWins;
const full = {
  label: 'FULL DEV (design+check)',
  n: fullN,
  idWins: fullId,
  chWins: fullCh,
  wr: fullCh / fullN,
  delta: fullCh - fullId
};

const checkOk = chk.delta >= 1 && chk.wr + 1e-9 >= des.wr - 0.08;
const interest = des.passInterest && checkOk;

console.log(
  des.label + '  id=' + des.idWins + '/' + des.n +
  ' ch=' + des.chWins + '/' + des.n + '=' + des.wr.toFixed(3) +
  ' Δ' + (des.delta >= 0 ? '+' : '') + des.delta +
  (des.passInterest ? '  interest' : '  weak')
);
console.log(
  chk.label + '  id=' + chk.idWins + '/' + chk.n +
  ' ch=' + chk.chWins + '/' + chk.n + '=' + chk.wr.toFixed(3) +
  ' Δ' + (chk.delta >= 0 ? '+' : '') + chk.delta +
  (checkOk ? '  check_ok' : '  check_FAIL')
);
console.log(
  full.label + '  id=' + full.idWins + '/' + full.n +
  ' ch=' + full.chWins + '/' + full.n + '=' + full.wr.toFixed(3) +
  ' Δ' + (full.delta >= 0 ? '+' : '') + full.delta +
  (full.chWins >= 32 && full.delta >= 2 ? '  full_DEV_sig' : '  full_n.s.')
);
console.log(interest ? 'SPLIT GATE: PASS (may run full DEV for significance)' : 'SPLIT GATE: FAIL (discard / redesign)');

const out = {
  protocol: 'fair-dev-internal-split-v1',
  freeze: freeze,
  chall: chall,
  seed0: seed0,
  gamesDesign: gamesDesign,
  gamesCheck: gamesCheck,
  design: des,
  check: chk,
  full: full,
  splitPass: interest,
  note: 'Does not burn DEV_VAL or holdout. Full DEV ≥32 still required before DEV_VAL.'
};
const outPath = path.join(__dirname, 'split-latest-' + chall + '-vs-' + freeze + '.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('wrote ' + outPath);
process.exit(interest ? 0 : 2);
