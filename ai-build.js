/**
 * ai-build.js — zero-dependency build identity for the title screen.
 * Keep in sync with AI_BUILD in ai.js (ship-rung regenerates this file).
 */
(function (root) {
  var BUILD = {
    id: 'v8.9',
    stamped: '2026-07-12T18:32:28Z',
    label: 'Grandmaster v8.9'
  };
  root.TIENLEN_AI_BUILD = BUILD;
  root.TienLenAI = root.TienLenAI || {};
  root.TienLenAI.AI_BUILD = BUILD;
  if (typeof module === 'object' && module.exports) module.exports = BUILD;
}(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this)));
