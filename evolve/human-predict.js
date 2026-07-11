/**
 * Train/eval human next-move class predictor from CF feature JSONL.
 *   TIENLEN_SCRATCH=... node evolve/human-predict.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const scratch = process.env.TIENLEN_SCRATCH || path.join(__dirname);
const featPath = path.join(scratch, 'human-action-features.jsonl');
if (!fs.existsSync(featPath)) {
  console.error('missing', featPath);
  process.exit(1);
}
const lines = fs.readFileSync(featPath, 'utf8').trim().split('\n').filter(Boolean).map(function (l) {
  return JSON.parse(l);
});
const CLASSES = ['pass', 'single_trash', 'single_mid', 'single_high', 'single_two', 'pair', 'triple', 'bomb_or_long'];
function classIdx(c) {
  const i = CLASSES.indexOf(c);
  return i < 0 ? 0 : i;
}
const issues = [];
const seen = {};
lines.forEach(function (r) {
  if (!seen[r.issue]) { seen[r.issue] = 1; issues.push(r.issue); }
});
issues.sort(function (a, b) { return a - b; });
const cut = Math.floor(issues.length * 0.8);
const trainIssues = {};
const testIssues = {};
issues.slice(0, cut).forEach(function (i) { trainIssues[i] = 1; });
issues.slice(cut).forEach(function (i) { testIssues[i] = 1; });
const train = lines.filter(function (r) { return trainIssues[r.issue]; });
const test = lines.filter(function (r) { return testIssues[r.issue]; });

function heurPredict(f) {
  if (f.freeLead) {
    if (f.legalMulti > 0 && f.handSize >= 6) return f.legalMulti >= 3 ? 'triple' : 'pair';
    if (f.twos >= 1 && f.handSize <= 6) return 'single_high';
    if (f.handSize <= 4) return 'single_mid';
    return 'single_trash';
  }
  if (f.legalCount === 0) return 'pass';
  if (f.handSize >= 8 && f.oppMin >= 5 && f.legalMulti === 0 && f.curTop >= 8) return 'pass';
  if (f.twos >= 1 && f.oppMin <= 3 && f.curTop >= 6) return 'single_two';
  if (f.legalMulti > 0 && f.curTop < 0) return 'pair';
  if (f.curTop >= 0 && f.legalSingles > 0) {
    if (f.curTop <= 5) return 'single_trash';
    if (f.curTop <= 9) return 'single_mid';
    return 'single_high';
  }
  if (f.legalMulti > 0) return 'pair';
  return 'single_mid';
}

const freq = {};
train.forEach(function (r) { freq[r.humanClass] = (freq[r.humanClass] || 0) + 1; });
const majority = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; })[0];

function featurize(f) {
  return [
    1, f.freeLead, f.handSize / 13, f.oppMin / 13, f.twos / 2, f.aces / 2,
    f.pairs / 4, f.control / 6, f.legalCount / 20, f.legalMulti / 8,
    f.legalSingles / 10, (f.curTop + 1) / 13
  ];
}
const D = 12;
const K = CLASSES.length;
const W = [];
for (let k = 0; k < K; k++) {
  const row = [];
  for (let d = 0; d < D; d++) row.push(0);
  W.push(row);
}
function scores(x) {
  return W.map(function (w) {
    let s = 0;
    for (let i = 0; i < D; i++) s += w[i] * x[i];
    return s;
  });
}
function softmax(sc) {
  let m = sc[0];
  for (let i = 1; i < sc.length; i++) if (sc[i] > m) m = sc[i];
  const e = sc.map(function (s) { return Math.exp(s - m); });
  let z = 0;
  for (let i = 0; i < e.length; i++) z += e[i];
  return e.map(function (v) { return v / z; });
}
const lr = 0.15;
for (let ep = 0; ep < 40; ep++) {
  for (let i = train.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = train[i]; train[i] = train[j]; train[j] = t;
  }
  for (let ti = 0; ti < train.length; ti++) {
    const r = train[ti];
    const x = featurize(r);
    const y = classIdx(r.humanClass);
    const p = softmax(scores(x));
    for (let k = 0; k < K; k++) {
      const g = p[k] - (k === y ? 1 : 0);
      for (let d = 0; d < D; d++) W[k][d] -= lr * g * x[d];
    }
  }
}
function logPredict(f) {
  const p = softmax(scores(featurize(f)));
  let bi = 0;
  for (let i = 1; i < p.length; i++) if (p[i] > p[bi]) bi = i;
  return CLASSES[bi];
}
function evalSet(set, predFn) {
  let ok = 0;
  set.forEach(function (r) { if (predFn(r) === r.humanClass) ok++; });
  return { n: set.length, acc: set.length ? ok / set.length : 0, ok: ok };
}

const res = {
  majority: evalSet(test, function () { return majority; }),
  heuristic: evalSet(test, heurPredict),
  logistic: evalSet(test, logPredict),
  aiAlt: evalSet(test, function (f) { return f.altClass; }),
  trainLogistic: evalSet(train, logPredict),
  testIssues: issues.slice(cut),
  trainIssues: issues.slice(0, cut)
};
const log = [
  '=== Human next-move predictor eval ===',
  'test acts: ' + res.logistic.n,
  'majority baseline acc: ' + (res.majority.acc * 100).toFixed(1) + '%',
  'heuristic acc: ' + (res.heuristic.acc * 100).toFixed(1) + '%',
  'logistic SGD acc: ' + (res.logistic.acc * 100).toFixed(1) + '% (train ' + (res.trainLogistic.acc * 100).toFixed(1) + '%)',
  'AI-alt class match human: ' + (res.aiAlt.acc * 100).toFixed(1) + '%'
].join('\n');
console.log(log);
fs.writeFileSync(path.join(scratch, 'human-predict-eval.log'), log + '\n');
fs.writeFileSync(path.join(scratch, 'human-predict-eval.json'), JSON.stringify(res, null, 2));
fs.writeFileSync(path.join(__dirname, 'human-predict-eval-summary.json'), JSON.stringify(res, null, 2));
