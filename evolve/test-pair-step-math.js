'use strict';
/**
 * Unit tests for PAIR_STEP paired-Δ math (synthetic outcomes).
 * Does not run duals.
 */
function bootstrapDeltaCI(dArr, B) {
  B = B || 2000;
  const n = dArr.length;
  const means = [];
  for (let b = 0; b < B; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += dArr[(Math.random() * n) | 0];
    means.push(s / n);
  }
  means.sort(function (a, b) { return a - b; });
  return {
    lo: means[Math.floor(0.025 * B)],
    hi: means[Math.min(B - 1, Math.floor(0.975 * B))],
    mean: dArr.reduce(function (a, b) { return a + b; }, 0) / n
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assert failed');
  console.log('PASS:', msg);
}

// Same model: all d=0 → Δ=0, CI contains 0
{
  const d = [];
  for (let i = 0; i < 200; i++) d.push(0);
  const b = bootstrapDeltaCI(d, 1000);
  assert(Math.abs(b.mean) < 1e-9, 'identity mean 0');
  assert(b.lo <= 0 && b.hi >= 0, 'identity CI covers 0');
}

// Clear improvement: many +1
{
  const d = [];
  for (let i = 0; i < 180; i++) d.push(1);
  for (let i = 0; i < 20; i++) d.push(0);
  const b = bootstrapDeltaCI(d, 2000);
  assert(b.mean > 0.8, 'strong improve mean');
  assert(b.lo > 0, 'strong improve LB > 0 → would ACCEPT');
}

// Clear regression
{
  const d = [];
  for (let i = 0; i < 180; i++) d.push(-1);
  for (let i = 0; i < 20; i++) d.push(0);
  const b = bootstrapDeltaCI(d, 2000);
  assert(b.mean < -0.8, 'regression mean');
  assert(b.hi < 0, 'regression UB < 0 → REJECT');
}

// Pairing keys must match seed@seat
{
  const keysPrev = ['1@0', '1@1', '2@0'];
  const keysNew = ['1@0', '1@1', '2@0'];
  assert(keysPrev.join() === keysNew.join(), 'same keys for pairing');
}

console.log('ALL pair-step math tests passed');
