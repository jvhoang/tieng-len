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
ok('ui adds red class for diamonds/hearts', /isRed \? 'red' : 'black'/.test(ui) && /classList\.add\(rc\)/.test(ui));
ok('no Chinese card-back glyph', html.indexOf('龍') < 0);
ok('poker-pattern card back', /repeating-linear-gradient/.test(html));
ok('midnight blue token', /#0b1224/.test(html));
ok('teal accent', /#2dd4bf|#1a6b6b/.test(html));
ok('violet hint', /#6d5a9c/.test(html));
ok('fixed action bar class', /action-bar-fixed/.test(html));
ok('fixed position style', /position:\s*fixed/.test(html));
ok('Play/Pass/Hint action buttons', /id="btn-play"/.test(html) && /id="btn-pass"/.test(html) && /id="btn-hint"/.test(html));
ok('Clear replaced by Hint in action bar', !/id="btn-clear"/.test(html) && /requestHint\(\)/.test(html));
ok('hand-fan markup', /hand-fan/.test(html));
ok('fan overlap in ui.js', /marginLeft/.test(ui) && /overlapPx/.test(ui));
ok('viewport-fit human fan', /needOverlap|avail - cardW/.test(ui));
ok('no human hand rotation (avoids edge clip)', /transform = 'none'/.test(ui) || /transform = \"none\"/.test(ui));
ok('corner-tl rank+suit on card face', /corner-tl/.test(html) && /suit-tl/.test(html) && /corner-tl/.test(ui));
ok('suit under rank in createCardEl', /suit-tl/.test(ui) && /rank/.test(ui));
ok('title-screen AI difficulty select', /id="title-ai-difficulty"/.test(html));
ok('title default grandmaster selected', /title-ai-difficulty[\s\S]*?grandmaster" selected/.test(html) ||
  /id="title-ai-difficulty"[\s\S]*?<option value="grandmaster" selected>/.test(html));
ok('game-screen default grandmaster', /id="ai-difficulty"[\s\S]*?<option value="grandmaster" selected>/.test(html));
ok('hint uses hiddenInfo', /hiddenInfo:\s*true/.test(html) && /perfectInfo:\s*false/.test(html));
ok('hint free-lead fallback', /pickFreeLeadHard/.test(html));
ok('hint explains why', /explainHintWhy|Why.*hidden-info/.test(html));
ok('v7.5 branding', /v7\.5/.test(html));
ok('old maroon lacquer not primary', !/linear-gradient\(145deg, #2c0f0a/.test(html));

// Critical: broken inline glue kills startVsAI + history (regression from hint rewrite)
(function checkInlineGlueSyntax() {
  const idx = html.lastIndexOf('<script>');
  const end = html.indexOf('</script>', idx);
  ok('has main inline glue script', idx >= 0 && end > idx);
  if (idx < 0 || end <= idx) return;
  const code = html.slice(idx + 8, end);
  try {
    // eslint-disable-next-line no-new-func
    new Function(code);
    ok('inline glue script parses (start game + history wiring)', true);
  } catch (e) {
    ok('inline glue script parses (start game + history wiring)', false, e && e.message);
  }
})();

console.log('Passed:', passed, 'Failed:', failed);
if (failed) process.exit(1);
console.log('ALL UI THEME TESTS PASSED');
