'use strict';
/**
 * Structural + behavioral: intentional GM pass must not be cheap-forced.
 * DEEP-DIVE §2c / §6.3
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ctrl = fs.readFileSync(path.join(__dirname, '..', 'controller.js'), 'utf8');

// cheap-force must be gated on error / missing stats — not every null pass
assert(
  /cheap-force-error-only|aiMeta\.error \|\| !aiMeta\.stats/.test(ctrl),
  'cheap-force must only run on error/missing search stats'
);
assert(
  !/fallbackReason = 'cheap-force';\n            \}\n          \}\n\n          \/\/ null from AI = strategic pass only when no cheap/.test(ctrl),
  'old unconditional cheap-force block should be gone'
);

// Product GM must not force expert+iterations 0
assert(
  !/mode:\s*usePerfect \? 'mcts' : \(aiDifficulty === 'grandmaster' \? 'expert'/.test(ctrl),
  'product GM must not force mode expert'
);
assert(
  /bestResponse:\s*isGM \|\| isHard \|\| usePerfect/.test(ctrl),
  'product GM uses bestResponse for hard/GM'
);

console.log('OK test-controller-pass-noforce (structural)');
