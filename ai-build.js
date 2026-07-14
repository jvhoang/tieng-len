/**
 * ai-build.js — zero-dependency build identity for the title screen.
 * Auto-synced by evolve/ship-rung.sh from AI_BUILD.
 */
(function (root) {
  var BUILD = {
    id: 'v9.3',
    stamped: '2026-07-14T00:27:00Z',
    label: 'Grandmaster v9.3'
  };
  root.TIENLEN_AI_BUILD = BUILD;
  root.TienLenAI = root.TienLenAI || {};
  root.TienLenAI.AI_BUILD = BUILD;
  if (typeof module === 'object' && module.exports) module.exports = BUILD;
}(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this)));
