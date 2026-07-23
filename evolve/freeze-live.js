/**
 * Freeze live ai.js + search.js into policies/<tag>-ai.js + policies/<tag>-search.js
 *
 * Rewrites BOTH classic require('./x.js') and browser-safe _loadNode('./x.js')
 * so dual workers load policies/<tag>-search.js (not live ./search.js).
 *
 *   node evolve/freeze-live.js p_l2s402 [optional-AI_BUILD-id]
 *
 * Exits non-zero if frozen ai still points at live ./search.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = require('./policy-path-rewrite');
const root = path.join(__dirname, '..');
const tag = process.argv[2] || 'v87hf';
const id = process.argv[3] || null;

let ai = fs.readFileSync(path.join(root, 'ai.js'), 'utf8');
let search = fs.readFileSync(path.join(root, 'search.js'), 'utf8');

// Keep or override AI_BUILD id for freeze identity
if (id) {
  ai = ai.replace(
    /const AI_BUILD = \{[\s\S]*?\n\};/,
    'const AI_BUILD = {\n  id: ' + JSON.stringify(id) + ',\n  stamped: ' +
      JSON.stringify(new Date().toISOString()) + ',\n  label: ' +
      JSON.stringify('Freeze ' + id) + '\n};'
  );
}

ai = P.liveToFreezeAi(ai, tag);
search = P.liveToFreezeSearch(search);

try {
  P.assertFrozenAi(ai, tag);
} catch (e) {
  console.error('freeze-live VALIDATION FAILED:', e.message);
  process.exit(2);
}

const aiOut = path.join(root, 'policies', tag + '-ai.js');
const seOut = path.join(root, 'policies', tag + '-search.js');
fs.writeFileSync(aiOut, ai);
fs.writeFileSync(seOut, search);
console.log('froze', aiOut, seOut);
console.log(JSON.stringify({ ok: true, tag: tag, searchLoad: tag + '-search.js' }));
