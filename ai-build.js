/**
 * ai-build.js — zero-dependency build identity for the title screen.
 * Auto-synced by evolve/ship-rung.sh from AI_BUILD.
 */
(function (root) {
  var BUILD = {
    id: 'v9.1',
    stamped: '2026-07-13T02:50:38Z',
    label: 'Grandmaster v9.1'
  };
  root.TIENLEN_AI_BUILD = BUILD;
  root.TienLenAI = root.TienLenAI || {};
  root.TienLenAI.AI_BUILD = BUILD;
  if (typeof module === 'object' && module.exports) module.exports = BUILD;
}(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this)));
