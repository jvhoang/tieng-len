/**
 * Freeze live ai.js + search.js into policies/<tag>-ai.js + policies/<tag>-search.js
 * Usage: node evolve/freeze-live.js v87hf
 */
'use strict';
const fs = require('fs');
const path = require('path');
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

ai = ai.replace(/require\(['"]\.\/engine\.js['"]\)/g, "require('../engine.js')");
ai = ai.replace(/require\(['"]\.\/genome\.js['"]\)/g, "require('../genome.js')");
ai = ai.replace(/require\(['"]\.\/search\.js['"]\)/g, "require('./" + tag + "-search.js')");

search = search.replace(/require\(['"]\.\/engine\.js['"]\)/g, "require('../engine.js')");
// Point frozen internal policy loads at policies/ siblings
search = search.replace(/require\(['"]\.\/policies\//g, "require('./");
search = search.replace(/require\(['"]\.\.\/policies\//g, "require('./");

const aiOut = path.join(root, 'policies', tag + '-ai.js');
const seOut = path.join(root, 'policies', tag + '-search.js');
fs.writeFileSync(aiOut, ai);
fs.writeFileSync(seOut, search);
console.log('froze', aiOut, seOut);
