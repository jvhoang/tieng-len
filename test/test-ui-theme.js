/**
 * Structural UI theme tests — drives shipped index.html + ui.js content.
 * node test/test-ui-theme.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');

let passed = 0, failed = 0;
function ok(name, cond, extra) {
  if (cond) { passed++; console.log('PASS:', name); }
  else { failed++; console.log('FAIL:', name, extra || ''); }
}

ok('red suit CSS present', /dc2626|\.card\.red/.test(html));
ok('ui adds red class for diamonds/hearts', /classList\.add\(isRed \? 'red'/.test(ui));
ok('no Chinese card-back glyph', html.indexOf('龍') < 0);
ok('poker-pattern card back', /repeating-linear-gradient/.test(html));
ok('midnight blue token', /#0b1224/.test(html));
ok('teal accent', /#2dd4bf|#1a6b6b/.test(html));
ok('violet hint', /#6d5a9c/.test(html));
ok('fixed action bar class', /action-bar-fixed/.test(html));
ok('fixed position style', /position:\s*fixed/.test(html));
ok('Play/Pass/Clear buttons', /id="btn-play"/.test(html) && /id="btn-pass"/.test(html) && /id="btn-clear"/.test(html));
ok('hand-fan markup', /hand-fan/.test(html));
ok('fan overlap in ui.js', /marginLeft/.test(ui) && /-1[6-9]px|-20px|-18px/.test(ui));
ok('v7.5 branding', /v7\.5/.test(html));
ok('old maroon lacquer not primary', !/linear-gradient\(145deg, #2c0f0a/.test(html));

console.log('Passed:', passed, 'Failed:', failed);
if (failed) process.exit(1);
console.log('ALL UI THEME TESTS PASSED');
